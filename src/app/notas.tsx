import React, { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, KeyboardAvoidingView, Modal, Platform, RefreshControl, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { collection, doc, getDoc, getDocs, query, serverTimestamp, setDoc, updateDoc, where } from 'firebase/firestore';
import { useDemoProfile } from '../contexts/demoProfileContext';
import { db } from '../config/firebase';
import { FeedbackToast, type EstadoFeedback, type TipoFeedback } from '../components/FeedbackToast';

type StatusNota = 'lancada' | 'aguardando' | 'recusado';
type FiltroNotasCoord = 'todos' | 'abaixo' | 'solicitacoes';

interface AlunoNotaItem {
  id: string;
  nome: string;
  matricula?: string;
  nota: string;
  rascunho?: boolean;
  status: StatusNota;
  justificativaProf: string;
  justificativaCoord: string;
}

const obterIniciais = (nome: string) => {
  const partes = nome.trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return 'AL';
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
  return `${partes[0][0]}${partes[partes.length - 1][0]}`.toUpperCase();
};

const gerarDocIdNota = (turma: string, avaliacao: string, alunoId: string) =>
  `${turma}_${avaliacao}_${alunoId}`.replace(/[^a-zA-Z0-9_-]/g, '_');

export default function NotasScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { perfil, temaAtivo: tema } = useDemoProfile();
  const isCoord = perfil === 'coordenador';
  const isProf = perfil === 'professor';

  const avaliacaoId = String(params.avaliacaoId || '');
  const tituloAvaliacao = String(params.avaliacao || 'Avaliação');
  const nomeTurma = String(params.turma || '');
  const nomeMateria = String(params.materia || '');
  const valorInicialParam = Number(params.valorMaximo) > 0 ? Number(params.valorMaximo) : 10;

  const [valorMaximoProva, setValorMaximoProva] = useState<number>(valorInicialParam);
  const [periodoAberto, setPeriodoAberto] = useState(params.status === 'aberto');
  const [alunos, setAlunos] = useState<AlunoNotaItem[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [salvandoRascunho, setSalvandoRascunho] = useState(false);
  const [statusRascunhoTexto, setStatusRascunhoTexto] = useState('Sincronizado com o banco');
  const [busca, setBusca] = useState('');
  const [filtroCoord, setFiltroCoord] = useState<FiltroNotasCoord>('todos');
  const [cardExpandido, setCardExpandido] = useState<string | null>(null);
  const [textoJustificativa, setTextoJustificativa] = useState('');
  const [textoRecusa, setTextoRecusa] = useState('');
  const [mostraInputRecusa, setMostraInputRecusa] = useState(false);

  const [modalConfirmarNotas, setModalConfirmarNotas] = useState(false);
  const [senhaAssinatura, setSenhaAssinatura] = useState('');
  const [feedback, setFeedback] = useState<EstadoFeedback>({ visivel: false, tipo: 'sucesso', titulo: '', mensagem: '' });

  const notificar = useCallback((tipo: TipoFeedback, titulo: string, mensagem: string) => {
    setFeedback({ visivel: true, tipo, titulo, mensagem });
  }, []);
  const fecharFeedback = useCallback(() => setFeedback(prev => ({ ...prev, visivel: false })), []);

  const buscarNotasDoBanco = useCallback(async () => {
    setCarregando(true);
    try {
      const [alunosSnap, notasSnap] = await Promise.all([
        getDocs(collection(db, 'alunos')),
        nomeTurma
          ? getDocs(query(collection(db, 'notas'), where('turma', '==', nomeTurma)))
          : getDocs(collection(db, 'notas')),
      ]);

      if (avaliacaoId) {
        const avSnap = await getDoc(doc(db, 'avaliacoes', avaliacaoId));
        if (avSnap.exists()) {
          const dadosAv = avSnap.data();
          setPeriodoAberto(dadosAv.statusPrazo !== 'fechado' && dadosAv.status !== 'concluido');
          if (Number(dadosAv.valorMaximo) > 0) {
            setValorMaximoProva(Number(dadosAv.valorMaximo));
          }
        }
      }

      const mapaNotas: Record<string, any> = {};
      notasSnap.forEach(d => {
        const data = d.data();
        if (String(data.avaliacao || '') === tituloAvaliacao) {
          mapaNotas[String(data.alunoId || '')] = data;
        }
      });

      const listaAlunos: AlunoNotaItem[] = alunosSnap.docs
        .map(d => ({ id: d.id, ...(d.data() as any) }))
        .filter(a => !nomeTurma || a.turmaNome === nomeTurma || a.turma === nomeTurma)
        .map(a => {
          const notaSalva = mapaNotas[a.id];
          const st: StatusNota = notaSalva?.status === 'aguardando' || notaSalva?.status === 'recusado' ? notaSalva.status : 'lancada';
          return {
            id: a.id,
            nome: String(a.nome || 'Aluno sem nome'),
            matricula: typeof a.matricula === 'string' ? a.matricula : '',
            nota: notaSalva?.nota !== undefined ? String(notaSalva.nota) : '',
            rascunho: Boolean(notaSalva?.rascunho),
            status: st,
            justificativaProf: String(notaSalva?.justificativaProf || ''),
            justificativaCoord: String(notaSalva?.justificativaCoord || ''),
          };
        })
        .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));

      setAlunos(listaAlunos);
      const temRascunho = listaAlunos.some(a => a.rascunho && a.nota !== '');
      setStatusRascunhoTexto(temRascunho ? 'Rascunho salvo (aguardando validação)' : 'Sincronizado com o banco');
    } catch (error: any) {
      notificar('erro', 'Erro ao carregar notas', error?.message || 'Não foi possível consultar o Firestore.');
    } finally { setCarregando(false); }
  }, [avaliacaoId, nomeTurma, tituloAvaliacao, notificar]);

  useFocusEffect(
    useCallback(() => {
      void buscarNotasDoBanco();
    }, [buscarNotasDoBanco])
  );

  const alternarPrazoFirestore = async () => {
    const proximoAberto = !periodoAberto;
    setPeriodoAberto(proximoAberto);
    if (!avaliacaoId) return;
    setSalvando(true);
    try {
      await updateDoc(doc(db, 'avaliacoes', avaliacaoId), {
        status: proximoAberto ? 'andamento' : 'concluido',
        statusPrazo: proximoAberto ? 'aberto' : 'fechado',
      });
      notificar('sucesso', proximoAberto ? 'Prazo reaberto' : 'Prazo encerrado', 'Status sincronizado com a tela de avaliações.');
    } catch (error: any) {
      setPeriodoAberto(!proximoAberto);
      notificar('erro', 'Erro ao atualizar prazo', error?.message || 'Falha ao gravar no Firestore.');
    } finally { setSalvando(false); }
  };

  const persistirNotaFirestore = async (aluno: AlunoNotaItem, comoRascunho = false) => {
    const docId = gerarDocIdNota(nomeTurma, tituloAvaliacao, aluno.id);
    await setDoc(doc(db, 'notas', docId), {
      alunoId: aluno.id,
      alunoNome: aluno.nome,
      turma: nomeTurma,
      materia: nomeMateria,
      avaliacao: tituloAvaliacao,
      avaliacaoId,
      valorMaximo: valorMaximoProva,
      nota: aluno.nota,
      rascunho: comoRascunho,
      status: aluno.status,
      justificativaProf: aluno.justificativaProf,
      justificativaCoord: aluno.justificativaCoord,
      atualizadoEm: serverTimestamp(),
    }, { merge: true });
  };

  const handleMudancaNota = (text: string, id: string) => {
    let valorDigitado = text.replace(',', '.').replace(/[^0-9.]/g, '');
    if (Number(valorDigitado) > valorMaximoProva) {
      valorDigitado = valorMaximoProva.toFixed(1);
      notificar('aviso', 'Limite excedido', `A nota máxima permitida é ${valorMaximoProva.toFixed(1)}.`);
    }
    setAlunos(prev => prev.map(a => (a.id === id ? { ...a, nota: valorDigitado, rascunho: true } : a)));
    setStatusRascunhoTexto('Editando...');
  };

  const salvarRascunhoIndividual = async (aluno: AlunoNotaItem) => {
    if (!isProf || !periodoAberto) return;
    setSalvandoRascunho(true);
    setStatusRascunhoTexto('Salvando rascunho...');
    try {
      await persistirNotaFirestore(aluno, true);
      if (avaliacaoId && aluno.nota !== '') {
        await updateDoc(doc(db, 'avaliacoes', avaliacaoId), { status: 'andamento' });
      }
      setStatusRascunhoTexto('Rascunho salvo automaticamente');
    } catch {
      setStatusRascunhoTexto('Erro ao salvar rascunho');
    } finally {
      setSalvandoRascunho(false);
    }
  };

  const salvarTodosRascunhos = async () => {
    setSalvandoRascunho(true);
    setStatusRascunhoTexto('Salvando rascunho...');
    try {
      await Promise.all(alunos.map(aluno => persistirNotaFirestore(aluno, true)));
      if (avaliacaoId) {
        const preenchidas = alunos.filter(a => a.nota !== '' && !Number.isNaN(Number(a.nota))).length;
        if (preenchidas > 0) {
          await updateDoc(doc(db, 'avaliacoes', avaliacaoId), { status: 'andamento' });
        }
      }
      setStatusRascunhoTexto('Rascunho salvo no banco');
      notificar('sucesso', 'Rascunho salvo!', 'Você pode sair e continuar preenchendo depois.');
    } catch (error: any) {
      setStatusRascunhoTexto('Erro ao salvar rascunho');
      notificar('erro', 'Erro ao salvar rascunho', error?.message || 'Falha ao gravar no Firestore.');
    } finally {
      setSalvandoRascunho(false);
    }
  };

  const abrirModalAssinaturaNotas = () => {
    const preenchidas = alunos.filter(a => a.nota !== '' && !Number.isNaN(Number(a.nota))).length;
    if (preenchidas === 0) {
      return notificar('aviso', 'Nenhuma nota preenchida', 'Digite pelo menos uma nota antes de validar o lançamento.');
    }
    setSenhaAssinatura('');
    setModalConfirmarNotas(true);
  };

  const confirmarELancarNotas = async () => {
    if (senhaAssinatura.trim().length < 4) {
      return notificar('aviso', 'Senha obrigatória', 'Informe sua senha (mínimo 4 caracteres) para validar e lançar as notas.');
    }
    setSalvando(true);
    try {
      await Promise.all(alunos.map(aluno => persistirNotaFirestore({ ...aluno, rascunho: false }, false)));

      if (avaliacaoId) {
        const preenchidas = alunos.filter(a => a.nota !== '' && !Number.isNaN(Number(a.nota))).length;
        const todasPreenchidas = alunos.length > 0 && preenchidas === alunos.length;
        await updateDoc(doc(db, 'avaliacoes', avaliacaoId), {
          status: todasPreenchidas ? 'concluido' : 'andamento',
          ultimaAtualizacaoNotas: serverTimestamp(),
        });
      }

      setAlunos(prev => prev.map(a => ({ ...a, rascunho: false })));
      setModalConfirmarNotas(false);
      setSenhaAssinatura('');
      setStatusRascunhoTexto('Notas lançadas oficialmente');
      notificar('sucesso', 'Notas lançadas com sucesso!', 'Planilha validada, assinada e sincronizada no banco de dados.');
    } catch (error: any) {
      notificar('erro', 'Erro ao lançar notas', error?.message || 'Não foi possível salvar no Firestore.');
    } finally { setSalvando(false); }
  };

  const enviarSolicitacaoProfessor = async (aluno: AlunoNotaItem) => {
    if (!textoJustificativa.trim()) return notificar('aviso', 'Justificativa obrigatória', 'Explique o motivo da alteração de nota.');
    setSalvando(true);
    try {
      const atualizado: AlunoNotaItem = { ...aluno, status: 'aguardando', justificativaProf: textoJustificativa.trim() };
      await persistirNotaFirestore(atualizado, false);
      setAlunos(prev => prev.map(a => (a.id === aluno.id ? atualizado : a)));
      setCardExpandido(null);
      setTextoJustificativa('');
      notificar('sucesso', 'Solicitação enviada', `Pedido de retificação de ${aluno.nome} enviado à coordenação.`);
    } catch (error: any) {
      notificar('erro', 'Erro ao enviar', error?.message || 'Não foi possível registrar a solicitação.');
    } finally { setSalvando(false); }
  };

  const responderSolicitacaoCoord = async (aluno: AlunoNotaItem, aprovar: boolean) => {
    if (!aprovar && !textoRecusa.trim()) return notificar('aviso', 'Motivo obrigatório', 'Informe o motivo da recusa para o professor.');
    setSalvando(true);
    try {
      const atualizado: AlunoNotaItem = {
        ...aluno,
        status: aprovar ? 'lancada' : 'recusado',
        justificativaCoord: aprovar ? 'Alteração autorizada pela coordenação.' : textoRecusa.trim(),
      };
      await persistirNotaFirestore(atualizado, false);
      setAlunos(prev => prev.map(a => (a.id === aluno.id ? atualizado : a)));
      setCardExpandido(null);
      setMostraInputRecusa(false);
      setTextoRecusa('');
      notificar('sucesso', aprovar ? 'Alteração autorizada' : 'Solicitação recusada', `Status de ${aluno.nome} atualizado no banco.`);
    } catch (error: any) {
      notificar('erro', 'Erro ao atualizar', error?.message || 'Falha ao salvar decisão.');
    } finally { setSalvando(false); }
  };

  const kpis = useMemo(() => {
    const comNota = alunos.filter(a => a.nota !== '' && !Number.isNaN(Number(a.nota)));
    const soma = comNota.reduce((acc, a) => acc + Number(a.nota), 0);
    const media = comNota.length > 0 ? (soma / comNota.length).toFixed(1) : '—';
    const mediaCorte = valorMaximoProva * 0.6;
    const acimaMedia = comNota.filter(a => Number(a.nota) >= mediaCorte).length;
    const solicitacoes = alunos.filter(a => a.status === 'aguardando').length;
    return { media, acimaMedia, solicitacoes, totalLancadas: comNota.length };
  }, [alunos, valorMaximoProva]);

  const alunosFiltrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    const mediaCorte = valorMaximoProva * 0.6;
    return alunos.filter(a => {
      if (termo && !a.nome.toLowerCase().includes(termo)) return false;
      if (isCoord && filtroCoord === 'solicitacoes') return a.status === 'aguardando';
      if (isCoord && filtroCoord === 'abaixo') return a.nota !== '' && Number(a.nota) < mediaCorte;
      return true;
    });
  }, [alunos, busca, isCoord, filtroCoord, valorMaximoProva]);

  const toastProps = {
    feedback,
    onFechar: fecharFeedback,
    fundoCard: tema.fundoTopo,
    textoPrincipal: tema.textoPrincipal,
    textoSecundario: tema.textoSecundario,
  };

  const renderAluno = ({ item }: { item: AlunoNotaItem }) => {
    const isAguardando = item.status === 'aguardando';
    const isRecusado = item.status === 'recusado';
    const isExpandido = cardExpandido === item.id;
    const temNota = item.nota !== '' && !Number.isNaN(Number(item.nota));
    const notaNum = temNota ? Number(item.nota) : 0;
    const percentual = temNota ? Math.min(100, Math.max(0, (notaNum / valorMaximoProva) * 100)) : 0;
    const corNota = !temNota ? tema.textoSecundario : percentual >= 70 ? '#2E7D32' : percentual >= 50 ? '#EF6C00' : '#C62828';

    return (
      <View style={[styles.cardAluno, { backgroundColor: tema.inputBackground, borderColor: isAguardando ? '#EF6C00' : tema.borda }]}>
        <View style={styles.alunoRow}>
          <View style={[styles.avatarIniciais, { backgroundColor: tema.botaoPrimario + '20' }]}>
            <Text style={{ color: tema.botaoPrimario, fontSize: 12, fontWeight: '800' }}>{obterIniciais(item.nome)}</Text>
          </View>
          <View style={styles.alunoInfo}>
            <Text style={[styles.nomeAluno, { color: tema.textoPrincipal }]} numberOfLines={1}>{item.nome}</Text>
            {!!item.matricula && <Text style={{ color: tema.textoSecundario, fontSize: 11 }}>Mat. {item.matricula}</Text>}
            {isProf && periodoAberto && item.rascunho && temNota && (
              <Text style={{ color: tema.botaoPrimario, fontSize: 10, fontWeight: '700', marginTop: 2 }}>Rascunho salvo</Text>
            )}
            {isAguardando && <Text style={styles.textoAlerta}>Solicitação em análise</Text>}
            {isRecusado && isProf && <Text style={[styles.textoAlerta, { color: '#C62828' }]}>Solicitação recusada</Text>}
          </View>

          <View style={styles.notaArea}>
            {periodoAberto && isProf ? (
              <View style={[styles.inputNotaContainer, { borderColor: temNota ? tema.botaoPrimario : tema.borda, backgroundColor: tema.fundoBase }]}>
                <TextInput
                  style={[styles.inputNota, { color: tema.textoPrincipal }]}
                  value={item.nota}
                  onChangeText={texto => handleMudancaNota(texto, item.id)}
                  onEndEditing={() => void salvarRascunhoIndividual(item)}
                  keyboardType="numeric"
                  maxLength={4}
                  placeholder="—"
                  placeholderTextColor={tema.textoSecundario}
                />
                <Text style={[styles.textoMaximo, { color: tema.textoSecundario }]}>/ {valorMaximoProva.toFixed(1)}</Text>
              </View>
            ) : (
              <View style={styles.displayNotaContainer}>
                <Text style={[styles.textoNota, { color: corNota }]}>
                  {temNota ? notaNum.toFixed(1) : '—'} <Text style={[styles.textoMaximo, { color: tema.textoSecundario }]}>/ {valorMaximoProva.toFixed(1)}</Text>
                </Text>
                {!periodoAberto && isProf && !isAguardando && (
                  <TouchableOpacity style={styles.btnIcone} onPress={() => { setCardExpandido(isExpandido ? null : item.id); setTextoJustificativa(''); }}>
                    <Ionicons name="pencil" size={16} color={tema.textoSecundario} />
                  </TouchableOpacity>
                )}
                {isCoord && isAguardando && (
                  <TouchableOpacity style={[styles.btnAnalisar, { backgroundColor: '#EF6C0020', borderColor: '#EF6C00' }]} onPress={() => { setCardExpandido(isExpandido ? null : item.id); setMostraInputRecusa(false); }}>
                    <Text style={{ color: '#EF6C00', fontSize: 11, fontWeight: '700' }}>Analisar</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>
        </View>

        <View style={[styles.barraProgressoFundo, { backgroundColor: tema.borda }]}>
          <View style={[styles.barraProgressoFill, { width: `${percentual}%`, backgroundColor: corNota }]} />
        </View>

        {isExpandido && (
          <View style={[styles.areaExpandida, { borderTopColor: tema.borda }]}>
            {isProf && !isAguardando && (
              <View>
                <Text style={[styles.labelMotivo, { color: tema.textoPrincipal }]}>Motivo da alteração de nota:</Text>
                <TextInput
                  style={[styles.inputJustificativa, { color: tema.textoPrincipal, borderColor: tema.borda, backgroundColor: tema.fundoBase }]}
                  placeholder="Escreva a justificativa para a coordenação..."
                  placeholderTextColor={tema.textoSecundario}
                  multiline
                  value={textoJustificativa}
                  onChangeText={setTextoJustificativa}
                />
                <TouchableOpacity style={[styles.btnEnviarPequeno, { backgroundColor: tema.botaoPrimario }]} onPress={() => void enviarSolicitacaoProfessor(item)} disabled={salvando}>
                  <Text style={styles.textoBotaoBranco}>{salvando ? 'Enviando...' : 'Enviar Solicitação'}</Text>
                </TouchableOpacity>
              </View>
            )}

            {isProf && isRecusado && (
              <View style={[styles.boxLeitura, { backgroundColor: '#FFEBEE', borderColor: '#FFCDD2' }]}>
                <Text style={[styles.labelMotivo, { color: '#C62828' }]}>Retificação Recusada:</Text>
                <Text style={[styles.textoLeitura, { color: '#C62828' }]}>{item.justificativaCoord}</Text>
              </View>
            )}

            {isCoord && isAguardando && (
              <View>
                <View style={[styles.boxLeitura, { backgroundColor: tema.fundoBase, borderColor: tema.borda }]}>
                  <Text style={[styles.labelMotivo, { color: tema.textoPrincipal }]}>Justificativa do Professor:</Text>
                  <Text style={[styles.textoLeitura, { color: tema.textoSecundario }]}>"{item.justificativaProf}"</Text>
                </View>
                {!mostraInputRecusa ? (
                  <View style={styles.rowBotoesAcao}>
                    <TouchableOpacity style={[styles.btnAcaoCoord, { borderColor: '#C62828' }]} onPress={() => setMostraInputRecusa(true)} disabled={salvando}>
                      <Text style={[styles.textoBtnAcaoCoord, { color: '#C62828' }]}>Recusar</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.btnAcaoCoord, { backgroundColor: '#2E7D32', borderColor: '#2E7D32' }]} onPress={() => void responderSolicitacaoCoord(item, true)} disabled={salvando}>
                      <Text style={[styles.textoBtnAcaoCoord, { color: '#FFF' }]}>Autorizar Alteração</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={{ marginTop: 8 }}>
                    <Text style={[styles.labelMotivo, { color: '#C62828' }]}>Motivo da Recusa:</Text>
                    <TextInput
                      style={[styles.inputJustificativa, { color: tema.textoPrincipal, borderColor: tema.borda, backgroundColor: tema.fundoBase }]}
                      placeholder="Explique ao professor por que a nota não pode ser alterada..."
                      placeholderTextColor={tema.textoSecundario}
                      multiline
                      value={textoRecusa}
                      onChangeText={setTextoRecusa}
                    />
                    <View style={styles.rowBotoesAcao}>
                      <TouchableOpacity onPress={() => setMostraInputRecusa(false)} style={{ marginRight: 14 }}>
                        <Text style={{ color: tema.textoSecundario, fontWeight: '600' }}>Cancelar</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={[styles.btnEnviarPequeno, { backgroundColor: '#C62828', marginTop: 0 }]} onPress={() => void responderSolicitacaoCoord(item, false)} disabled={salvando}>
                        <Text style={styles.textoBotaoBranco}>{salvando ? 'Salvando...' : 'Confirmar Recusa'}</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              </View>
            )}
          </View>
        )}
      </View>
    );
  };

  return (
    <KeyboardAvoidingView style={[styles.container, { backgroundColor: tema.fundoBase }]} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={[styles.header, { backgroundColor: tema.fundoTopo }]}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.back()} style={styles.btnVoltar} accessibilityLabel="Voltar">
            <Ionicons name="arrow-back" size={24} color={tema.textoLogo} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={[styles.titulo, { color: tema.textoLogo }]} numberOfLines={1}>{tituloAvaliacao}</Text>
            <Text style={[styles.subtitulo, { color: tema.textoLogo, opacity: 0.85 }]}>
              {nomeTurma} • {nomeMateria} • Valor {valorMaximoProva.toFixed(1)}
            </Text>
          </View>
        </View>

        <View style={styles.prazoContainer}>
          <View style={[styles.avisoPrazo, { backgroundColor: periodoAberto ? '#2E7D32' : '#C62828' }]}>
            <Ionicons name={periodoAberto ? 'lock-open' : 'lock-closed'} size={12} color="#FFF" />
            <Text style={styles.textoAvisoPrazo}>{periodoAberto ? 'Prazo Aberto' : 'Prazo Encerrado'}</Text>
          </View>
          {isCoord && (
            <TouchableOpacity style={[styles.btnEncerrarCoord, { borderColor: tema.textoLogo }]} onPress={() => void alternarPrazoFirestore()} disabled={salvando}>
              <Text style={[styles.textoEncerrarCoord, { color: tema.textoLogo }]}>{periodoAberto ? 'Encerrar Prazo' : 'Reabrir Prazo'}</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={[styles.searchContainer, { backgroundColor: tema.inputBackground, borderColor: tema.borda }]}>
          <Ionicons name="search" size={18} color={tema.textoSecundario} style={{ marginRight: 8 }} />
          <TextInput
            style={[styles.searchInput, { color: tema.textoPrincipal }]}
            placeholder="Buscar aluno..."
            placeholderTextColor={tema.textoSecundario}
            value={busca}
            onChangeText={setBusca}
          />
        </View>
      </View>

      <FlatList
        data={alunosFiltrados}
        keyExtractor={item => item.id}
        renderItem={renderAluno}
        contentContainerStyle={[styles.listContent, isProf && periodoAberto && { paddingBottom: 120 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={carregando} onRefresh={() => void buscarNotasDoBanco()} tintColor={tema.botaoPrimario} />}
        ListHeaderComponent={
          isCoord ? (
            <View>
              <View style={styles.resumoRow}>
                {[
                  { label: 'Média Turma', valor: kpis.media, cor: tema.botaoPrimario, icone: 'stats-chart-outline' as const },
                  { label: 'Acima Média', valor: String(kpis.acimaMedia), cor: '#2E7D32', icone: 'trending-up-outline' as const },
                  { label: 'Solicitações', valor: String(kpis.solicitacoes), cor: kpis.solicitacoes > 0 ? '#EF6C00' : tema.textoSecundario, icone: 'alert-circle-outline' as const },
                ].map(kpi => (
                  <View key={kpi.label} style={[styles.cardResumo, { backgroundColor: tema.inputBackground, borderColor: tema.borda }]}>
                    <Ionicons name={kpi.icone} size={18} color={kpi.cor} />
                    <Text style={[styles.valorResumo, { color: tema.textoPrincipal }]}>{kpi.valor}</Text>
                    <Text style={[styles.labelResumo, { color: tema.textoSecundario }]}>{kpi.label}</Text>
                  </View>
                ))}
              </View>
              <View style={styles.rowFiltros}>
                {([
                  { key: 'todos', label: 'Todos' },
                  { key: 'abaixo', label: 'Abaixo da média' },
                  { key: 'solicitacoes', label: `Solicitações (${kpis.solicitacoes})` },
                ] as const).map(f => {
                  const ativo = filtroCoord === f.key;
                  return (
                    <TouchableOpacity
                      key={f.key}
                      onPress={() => setFiltroCoord(f.key)}
                      style={[styles.chipFiltro, { backgroundColor: ativo ? tema.botaoPrimario : tema.inputBackground, borderColor: ativo ? tema.botaoPrimario : tema.borda }]}
                    >
                      <Text style={{ color: ativo ? tema.textoBotao : tema.textoPrincipal, fontSize: 12, fontWeight: '600' }}>{f.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          ) : undefined
        }
        ListEmptyComponent={
          carregando ? (
            <ActivityIndicator size="large" color={tema.botaoPrimario} style={{ marginTop: 30 }} />
          ) : (
            <View style={{ alignItems: 'center', marginTop: 30 }}>
              <Ionicons name="people-outline" size={38} color={tema.textoSecundario} />
              <Text style={{ color: tema.textoPrincipal, fontWeight: '700', fontSize: 15, marginTop: 10 }}>Nenhum aluno encontrado</Text>
              <Text style={{ color: tema.textoSecundario, fontSize: 12, marginTop: 4, textAlign: 'center' }}>
                {nomeTurma ? `Não há alunos matriculados em ${nomeTurma} para este filtro.` : 'Nenhum aluno disponível.'}
              </Text>
            </View>
          )
        }
      />

      {isProf && periodoAberto && alunos.length > 0 && (
        <View style={[styles.rodapeFixoProf, { backgroundColor: tema.fundoTopo, borderTopColor: tema.borda }]}>
          <View style={styles.infoRodapeProf}>
            <Text style={{ color: tema.textoLogo, fontSize: 13, fontWeight: '700' }}>
              {kpis.totalLancadas} de {alunos.length} preenchidas
            </Text>
            <Text style={{ color: tema.textoLogo, fontSize: 11, opacity: 0.78 }} numberOfLines={1}>
              {statusRascunhoTexto}
            </Text>
          </View>
          <View style={styles.rowBotoesRodape}>
            <TouchableOpacity
              style={[styles.btnRascunhoRodape, { borderColor: tema.textoLogo }]}
              onPress={() => void salvarTodosRascunhos()}
              disabled={salvandoRascunho || salvando}
            >
              <Ionicons name="save-outline" size={16} color={tema.textoLogo} />
              <Text style={{ color: tema.textoLogo, fontSize: 12, fontWeight: '700' }}>Rascunho</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.btnValidarLancar, { backgroundColor: tema.botaoPrimario }]}
              onPress={abrirModalAssinaturaNotas}
              disabled={salvando || salvandoRascunho}
            >
              <Ionicons name="shield-checkmark-outline" size={16} color={tema.textoBotao} />
              <Text style={{ color: tema.textoBotao, fontSize: 12, fontWeight: '800' }}>Validar e Lançar</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      <Modal visible={modalConfirmarNotas} transparent animationType="fade" onRequestClose={() => setModalConfirmarNotas(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCardCentro, { backgroundColor: tema.fundoBase, borderColor: tema.borda }]}>
            <View style={[styles.modalHeader, { borderBottomColor: tema.borda }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Ionicons name="shield-checkmark" size={20} color={tema.botaoPrimario} />
                <Text style={[styles.modalTitulo, { color: tema.textoPrincipal }]}>Assinar e Lançar Notas</Text>
              </View>
              <TouchableOpacity onPress={() => setModalConfirmarNotas(false)}>
                <Ionicons name="close" size={22} color={tema.textoSecundario} />
              </TouchableOpacity>
            </View>
            <View style={{ padding: 20 }}>
              <View style={[styles.boxResumoModal, { backgroundColor: tema.inputBackground, borderColor: tema.borda }]}>
                <Text style={{ color: tema.textoPrincipal, fontWeight: '700', fontSize: 14 }}>{tituloAvaliacao}</Text>
                <Text style={{ color: tema.textoSecundario, fontSize: 12, marginTop: 2 }}>
                  {nomeTurma} • {nomeMateria} • Valor {valorMaximoProva.toFixed(1)}
                </Text>
                <Text style={{ color: tema.botaoPrimario, fontSize: 12, fontWeight: '700', marginTop: 6 }}>
                  {kpis.totalLancadas} de {alunos.length} aluno(s) com nota lançada
                </Text>
                {kpis.totalLancadas < alunos.length && (
                  <Text style={{ color: '#EF6C00', fontSize: 11, marginTop: 4 }}>
                    Atenção: {alunos.length - kpis.totalLancadas} aluno(s) ainda estão sem nota (a avaliação ficará "Em andamento").
                  </Text>
                )}
              </View>

              <Text style={[styles.labelMotivo, { color: tema.textoPrincipal, marginTop: 14 }]}>Confirme sua senha docente *</Text>
              <TextInput
                value={senhaAssinatura}
                onChangeText={setSenhaAssinatura}
                placeholder="Digite sua senha de acesso..."
                placeholderTextColor={tema.textoSecundario}
                secureTextEntry
                style={[styles.inputSenhaModal, { backgroundColor: tema.inputBackground, color: tema.textoPrincipal, borderColor: tema.borda }]}
              />

              <View style={styles.rowAcoesModal}>
                <TouchableOpacity
                  style={[styles.btnSecModal, { backgroundColor: tema.inputBackground, borderColor: tema.borda }]}
                  onPress={() => setModalConfirmarNotas(false)}
                  disabled={salvando}
                >
                  <Text style={{ color: tema.textoPrincipal, fontWeight: '700', fontSize: 13 }}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.btnPrimModal, { backgroundColor: '#2E7D32' }]}
                  onPress={() => void confirmarELancarNotas()}
                  disabled={salvando}
                >
                  <Ionicons name="checkmark-done" size={16} color="#FFF" />
                  <Text style={{ color: '#FFF', fontWeight: '700', fontSize: 13 }}>
                    {salvando ? 'Salvando...' : 'Confirmar e Salvar'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
          <FeedbackToast {...toastProps} />
        </View>
      </Modal>

      <FeedbackToast {...toastProps} />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingTop: 50, paddingBottom: 18, paddingHorizontal: 20, borderBottomLeftRadius: 20, borderBottomRightRadius: 20, elevation: 5 },
  headerRow: { flexDirection: 'row', alignItems: 'center' },
  btnVoltar: { marginRight: 12, padding: 4 },
  titulo: { fontSize: 20, fontWeight: 'bold' },
  subtitulo: { fontSize: 12, marginTop: 2 },
  prazoContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 14 },
  avisoPrazo: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  textoAvisoPrazo: { color: '#FFF', fontSize: 11, fontWeight: 'bold', marginLeft: 5 },
  btnEncerrarCoord: { borderWidth: 1, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  textoEncerrarCoord: { fontSize: 11, fontWeight: 'bold' },
  searchContainer: { flexDirection: 'row', alignItems: 'center', height: 42, borderRadius: 10, borderWidth: 1, paddingHorizontal: 12, marginTop: 14 },
  searchInput: { flex: 1, height: '100%', fontSize: 14 },
  listContent: { padding: 20, paddingBottom: 40 },
  resumoRow: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  cardResumo: { flex: 1, borderWidth: 1, borderRadius: 12, padding: 12, alignItems: 'center' },
  valorResumo: { fontSize: 20, fontWeight: 'bold', marginTop: 4 },
  labelResumo: { fontSize: 11, marginTop: 2, textAlign: 'center' },
  rowFiltros: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  chipFiltro: { borderWidth: 1, borderRadius: 16, paddingHorizontal: 12, paddingVertical: 6 },
  cardAluno: { borderWidth: 1, borderRadius: 12, marginBottom: 12, overflow: 'hidden' },
  alunoRow: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12 },
  avatarIniciais: { width: 38, height: 38, borderRadius: 19, justifyContent: 'center', alignItems: 'center' },
  alunoInfo: { flex: 1 },
  nomeAluno: { fontSize: 15, fontWeight: 'bold' },
  textoAlerta: { fontSize: 11, color: '#EF6C00', fontWeight: 'bold', marginTop: 2 },
  notaArea: { flexDirection: 'row', alignItems: 'center' },
  inputNotaContainer: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  inputNota: { fontSize: 15, fontWeight: 'bold', minWidth: 34, textAlign: 'center' },
  displayNotaContainer: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  textoNota: { fontSize: 20, fontWeight: 'bold' },
  textoMaximo: { fontSize: 12, fontWeight: '600' },
  btnIcone: { padding: 4 },
  btnAnalisar: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  barraProgressoFundo: { height: 3, width: '100%' },
  barraProgressoFill: { height: 3 },
  areaExpandida: { borderTopWidth: 1, padding: 14 },
  labelMotivo: { fontSize: 12, fontWeight: 'bold', marginBottom: 6 },
  inputJustificativa: { borderWidth: 1, borderRadius: 8, padding: 10, height: 70, textAlignVertical: 'top', fontSize: 13 },
  btnEnviarPequeno: { alignSelf: 'flex-end', marginTop: 10, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8 },
  textoBotaoBranco: { color: '#FFF', fontSize: 12, fontWeight: 'bold' },
  boxLeitura: { padding: 10, borderWidth: 1, borderRadius: 8, marginBottom: 10 },
  textoLeitura: { fontSize: 13, fontStyle: 'italic' },
  rowBotoesAcao: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', marginTop: 6 },
  btnAcaoCoord: { borderWidth: 1, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, marginLeft: 10 },
  textoBtnAcaoCoord: { fontSize: 12, fontWeight: 'bold' },
  rodapeFixoProf: { position: 'absolute', left: 0, right: 0, bottom: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderTopWidth: 1, gap: 10, elevation: 10 },
  infoRodapeProf: { flex: 1 },
  rowBotoesRodape: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  btnRascunhoRodape: { flexDirection: 'row', alignItems: 'center', gap: 5, borderWidth: 1, paddingHorizontal: 10, height: 40, borderRadius: 10 },
  btnValidarLancar: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, height: 40, borderRadius: 10 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.68)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalCardCentro: { width: '100%', maxWidth: 420, borderRadius: 18, borderWidth: 1, overflow: 'hidden' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 18, borderBottomWidth: 1 },
  modalTitulo: { fontSize: 16, fontWeight: 'bold' },
  boxResumoModal: { borderWidth: 1, borderRadius: 12, padding: 12 },
  inputSenhaModal: { borderWidth: 1, borderRadius: 10, height: 44, paddingHorizontal: 12, fontSize: 14 },
  rowAcoesModal: { flexDirection: 'row', gap: 10, marginTop: 18 },
  btnSecModal: { flex: 1, height: 44, borderWidth: 1, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  btnPrimModal: { flex: 1.4, flexDirection: 'row', gap: 6, height: 44, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
});