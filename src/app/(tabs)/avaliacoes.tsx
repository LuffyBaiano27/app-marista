import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Keyboard, KeyboardAvoidingView, Modal, Platform, RefreshControl, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { addDoc, collection, deleteDoc, doc, getDocs, serverTimestamp, updateDoc } from 'firebase/firestore';
import { useDemoProfile } from '../../contexts/demoProfileContext';
import { db } from '../../config/firebase';
import { FeedbackToast, type EstadoFeedback, type TipoFeedback } from '../../components/FeedbackToast';

// === TIPOS E CONSTANTES ===
type StatusAvaliacao = 'pendente' | 'andamento' | 'concluido';
type FiltroStatus = 'Todos' | StatusAvaliacao;
type FiltroPrazoProf = 'todas' | 'aberto' | 'fechado';

interface AvaliacaoItem {
  id: string;
  titulo: string;
  bimestre: string;
  turmaId?: string;
  turma: string;
  materia: string;
  professorId?: string;
  professor: string;
  prazo: string;
  valorMaximo: number;
  status: StatusAvaliacao;
  statusPrazo: 'aberto' | 'fechado';
}

const ID_PROFESSOR_DEMO = 'prof_1';
const BIMESTRES = ['1º Bim', '2º Bim', '3º Bim', '4º Bim'] as const;
const FILTROS_BIMESTRE = ['Todos', ...BIMESTRES] as const;
const FILTROS_STATUS: { valor: FiltroStatus; label: string }[] = [
  { valor: 'Todos', label: 'Todos' },
  { valor: 'pendente', label: 'Pendente' },
  { valor: 'andamento', label: 'Em andamento' },
  { valor: 'concluido', label: 'Concluído' },
];
const FORM_AVALIACAO_INICIAL = {
  titulo: '',
  bimestre: '1º Bim' as (typeof BIMESTRES)[number],
  prazo: '',
  valorMaximo: '10',
  turmaId: '',
  turmaNome: '',
  professorId: '',
  professorNome: '',
  materia: '',
};

// === HELPERS ===
const extrairSerie = (nomeTurma: string) => {
  const limpo = String(nomeTurma || '').trim();
  if (!limpo) return 'Outros';
  return limpo.replace(/\s+[A-Z]$/i, '').trim() || limpo;
};

const formatarDataInput = (valor: string) => {
  const nums = valor.replace(/\D/g, '').slice(0, 8);
  if (nums.length <= 2) return nums;
  if (nums.length <= 4) return `${nums.slice(0, 2)}/${nums.slice(2)}`;
  return `${nums.slice(0, 2)}/${nums.slice(2, 4)}/${nums.slice(4)}`;
};

export default function AvaliacoesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { perfil, temaAtivo: tema } = useDemoProfile();
  const isCoord = perfil === 'coordenador';
  const isProf = perfil === 'professor';
  const bottomInset = Platform.OS === 'web' ? 0 : insets.bottom;

  // === ESTADOS ===
  const [alturaTeclado, setAlturaTeclado] = useState(0);
  const [avaliacoes, setAvaliacoes] = useState<AvaliacaoItem[]>([]);
  const [turmasBanco, setTurmasBanco] = useState<any[]>([]);
  const [professoresBanco, setProfessoresBanco] = useState<any[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [ocupado, setOcupado] = useState(false);
  const [busca, setBusca] = useState('');
  const [bimestreFiltro, setBimestreFiltro] = useState<(typeof FILTROS_BIMESTRE)[number]>('Todos');
  const [statusFiltro, setStatusFiltro] = useState<FiltroStatus>('Todos');
  const [prazoFiltroProf, setPrazoFiltroProf] = useState<FiltroPrazoProf>('todas');
  const [serieFiltro, setSerieFiltro] = useState('Todas');
  const [pastasAbertas, setPastasAbertas] = useState<string[]>([]);
  const [excluindoId, setExcluindoId] = useState<string | null>(null);
  const [modalFiltro, setModalFiltro] = useState(false);
  const [modalNovaAv, setModalNovaAv] = useState(false);
  const [dropTurmaAberto, setDropTurmaAberto] = useState(false);
  const [dropProfAberto, setDropProfAberto] = useState(false);
  const [formAv, setFormAv] = useState(FORM_AVALIACAO_INICIAL);
  const [feedback, setFeedback] = useState<EstadoFeedback>({ visivel: false, tipo: 'sucesso', titulo: '', mensagem: '' });

  const notificar = useCallback((tipo: TipoFeedback, titulo: string, mensagem: string) => {
    setFeedback({ visivel: true, tipo, titulo, mensagem });
  }, []);
  const fecharFeedback = useCallback(() => setFeedback(prev => ({ ...prev, visivel: false })), []);

  // === AJUSTE DO TECLADO EM MODAIS ===
  useEffect(() => {
    const eventoMostrar = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const eventoEsconder = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const subShow = Keyboard.addListener(eventoMostrar, e => {
      setAlturaTeclado(e.endCoordinates?.height || 0);
    });
    const subHide = Keyboard.addListener(eventoEsconder, () => {
      setAlturaTeclado(0);
    });
    return () => {
      subShow.remove();
      subHide.remove();
    };
  }, []);

  // === CARREGAMENTO DE DADOS (FIRESTORE) ===
  const buscarDadosAvaliacoes = useCallback(async () => {
    setCarregando(true);
    try {
      const avSnap = await getDocs(collection(db, 'avaliacoes'));
      let listaAv: AvaliacaoItem[] = avSnap.docs.map(d => {
        const data = d.data() as any;
        const st: StatusAvaliacao = data.status === 'concluido' || data.status === 'andamento' ? data.status : 'pendente';
        return {
          id: d.id,
          titulo: String(data.titulo || 'Avaliação'),
          bimestre: String(data.bimestre || '1º Bim'),
          turmaId: data.turmaId || '',
          turma: String(data.turma || 'Sem turma'),
          materia: String(data.materia || 'Disciplina'),
          professorId: data.professorId || '',
          professor: String(data.professor || 'Não atribuído'),
          prazo: String(data.prazo || 'Sem prazo'),
          valorMaximo: Number(data.valorMaximo) > 0 ? Number(data.valorMaximo) : 10,
          status: st,
          statusPrazo: data.statusPrazo === 'fechado' || st === 'concluido' ? 'fechado' : 'aberto',
        };
      });

      if (isProf) {
        listaAv = listaAv.filter(a => a.professorId === ID_PROFESSOR_DEMO || a.professor.toLowerCase().includes('luffy'));
        listaAv.sort((a, b) => (a.statusPrazo !== b.statusPrazo ? (a.statusPrazo === 'aberto' ? -1 : 1) : a.turma.localeCompare(b.turma, 'pt-BR')));
      } else {
        listaAv.sort((a, b) => a.turma.localeCompare(b.turma, 'pt-BR'));
      }
      setAvaliacoes(listaAv);

      if (isCoord) {
        const [turmasSnap, usersSnap] = await Promise.all([getDocs(collection(db, 'turmas')), getDocs(collection(db, 'usuarios'))]);
        setTurmasBanco(turmasSnap.docs.map(d => ({ id: d.id, ...(d.data() as any) })).sort((a, b) => String(a.nome || '').localeCompare(String(b.nome || ''), 'pt-BR')));
        setProfessoresBanco(
          usersSnap.docs
            .map(d => ({ id: d.id, ...(d.data() as any) }))
            .filter(u => {
              const cargo = String(u.role ?? u.perfil ?? '').toLowerCase();
              return cargo.includes('prof') && u.ativo !== false && u.situacao !== 'Inativo';
            })
            .sort((a, b) => String(a.nome || '').localeCompare(String(b.nome || ''), 'pt-BR'))
        );
      }
    } catch (error: any) {
      notificar('erro', 'Erro ao carregar avaliações', error?.message || 'Falha ao consultar o Firestore.');
    } finally {
      setCarregando(false);
    }
  }, [isCoord, isProf, notificar]);

  useFocusEffect(useCallback(() => { void buscarDadosAvaliacoes(); }, [buscarDadosAvaliacoes]));

  // === FILTROS E KPIS ===
  const seriesDisponiveis = useMemo(() => {
    const setSeries = new Set<string>();
    avaliacoes.forEach(a => setSeries.add(extrairSerie(a.turma)));
    if (isCoord) turmasBanco.forEach(t => { if (t.nome) setSeries.add(extrairSerie(t.nome)); });
    return ['Todas', ...Array.from(setSeries).sort((a, b) => a.localeCompare(b, 'pt-BR'))];
  }, [avaliacoes, turmasBanco, isCoord]);

  const avaliacoesFiltradas = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return avaliacoes.filter(a => {
      if (bimestreFiltro !== 'Todos' && a.bimestre !== bimestreFiltro) return false;
      if (serieFiltro !== 'Todas' && extrairSerie(a.turma) !== serieFiltro) return false;
      if (isProf) {
        if (prazoFiltroProf !== 'todas' && a.statusPrazo !== prazoFiltroProf) return false;
      } else if (statusFiltro !== 'Todos' && a.status !== statusFiltro) {
        return false;
      }
      if (!termo) return true;
      return [a.titulo, a.turma, a.materia, a.professor].some(v => v.toLowerCase().includes(termo));
    });
  }, [avaliacoes, busca, bimestreFiltro, statusFiltro, prazoFiltroProf, serieFiltro, isProf]);

  const kpis = useMemo(() => ({
    concluidas: avaliacoesFiltradas.filter(a => a.status === 'concluido').length,
    andamento: avaliacoesFiltradas.filter(a => a.status === 'andamento').length,
    pendentes: avaliacoesFiltradas.filter(a => a.status === 'pendente').length,
    abertasProf: avaliacoes.filter(a => a.statusPrazo === 'aberto').length,
    fechadasProf: avaliacoes.filter(a => a.statusPrazo === 'fechado').length,
  }), [avaliacoesFiltradas, avaliacoes]);

  const temFiltroAtivo = bimestreFiltro !== 'Todos' || serieFiltro !== 'Todas' || (!isProf && statusFiltro !== 'Todos');
  const limparFiltros = () => { setBimestreFiltro('Todos'); setStatusFiltro('Todos'); setSerieFiltro('Todas'); };
  const togglePasta = (id: string) => { setExcluindoId(null); setPastasAbertas(prev => (prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])); };
  const abrirModalNovaAvaliacao = () => { setFormAv(FORM_AVALIACAO_INICIAL); setDropTurmaAberto(false); setDropProfAberto(false); setModalNovaAv(true); };

  // === AÇÕES FIRESTORE ===
  const salvarNovaAvaliacao = async () => {
    const valorNum = Number(formAv.valorMaximo.replace(',', '.'));
    if (!formAv.titulo.trim()) return notificar('aviso', 'Campo obrigatório', 'Informe o título da avaliação.');
    if (!formAv.turmaId) return notificar('aviso', 'Selecione a turma', 'Escolha uma turma cadastrada.');
    if (!formAv.professorId) return notificar('aviso', 'Selecione o professor', 'Escolha o professor responsável.');
    if (!formAv.materia.trim()) return notificar('aviso', 'Campo obrigatório', 'Informe a disciplina da avaliação.');
    if (!valorNum || valorNum <= 0) return notificar('aviso', 'Valor inválido', 'Informe um valor numérico maior que zero para a prova.');
    if (formAv.prazo.replace(/\D/g, '').length < 8) return notificar('aviso', 'Prazo inválido', 'Informe a data limite no formato DD/MM/AAAA.');
    setOcupado(true);
    try {
      await addDoc(collection(db, 'avaliacoes'), {
        titulo: formAv.titulo.trim(),
        bimestre: formAv.bimestre,
        prazo: formAv.prazo.trim(),
        valorMaximo: valorNum,
        turmaId: formAv.turmaId,
        turma: formAv.turmaNome,
        professorId: formAv.professorId,
        professor: formAv.professorNome,
        materia: formAv.materia.trim(),
        status: 'pendente',
        statusPrazo: 'aberto',
        criadoPor: 'Camila',
        criadoEm: serverTimestamp(),
      });
      setModalNovaAv(false);
      setFormAv(FORM_AVALIACAO_INICIAL);
      void buscarDadosAvaliacoes();
      notificar('sucesso', 'Avaliação agendada!', `${formAv.titulo.trim()} • ${formAv.turmaNome} (Valor ${valorNum.toFixed(1)}).`);
    } catch (error: any) {
      notificar('erro', 'Erro ao agendar', error?.message || 'Não foi possível salvar no Firestore.');
    } finally {
      setOcupado(false);
    }
  };

  const alternarEncerramento = async (item: AvaliacaoItem) => {
    const encerrar = item.status !== 'concluido';
    const novoStatus: StatusAvaliacao = encerrar ? 'concluido' : 'andamento';
    const novoPrazo: 'aberto' | 'fechado' = encerrar ? 'fechado' : 'aberto';
    setOcupado(true);
    try {
      await updateDoc(doc(db, 'avaliacoes', item.id), { status: novoStatus, statusPrazo: novoPrazo });
      setAvaliacoes(prev => prev.map(a => (a.id === item.id ? { ...a, status: novoStatus, statusPrazo: novoPrazo } : a)));
      notificar('sucesso', encerrar ? 'Avaliação encerrada' : 'Avaliação reaberta', `${item.titulo} (${item.turma}) atualizada.`);
    } catch (error: any) {
      notificar('erro', 'Erro ao atualizar', error?.message || 'Falha ao atualizar status.');
    } finally {
      setOcupado(false);
    }
  };

  const cobrarProfessor = async (item: AvaliacaoItem) => {
    setOcupado(true);
    try {
      await addDoc(collection(db, 'comunicados'), {
        titulo: `Lembrete de Notas: ${item.titulo}`,
        destinatario: item.professor,
        destinatarioId: item.professorId || '',
        privado: true,
        mensagem: `Olá ${item.professor}, lembrete para concluir o lançamento de notas de ${item.materia} (${item.turma}) até ${item.prazo}.`,
        autor: 'Coordenadora Camila',
        criadoEm: serverTimestamp(),
      });
      notificar('sucesso', 'Lembrete privado enviado!', `Cobrança registrada exclusivamente para ${item.professor}.`);
    } catch (error: any) {
      notificar('erro', 'Erro ao cobrar', error?.message || 'Não foi possível registrar o lembrete.');
    } finally {
      setOcupado(false);
    }
  };

  const excluirAvaliacao = async (item: AvaliacaoItem) => {
    if (excluindoId !== item.id) return setExcluindoId(item.id);
    setOcupado(true);
    try {
      await deleteDoc(doc(db, 'avaliacoes', item.id));
      setAvaliacoes(prev => prev.filter(a => a.id !== item.id));
      setExcluindoId(null);
      notificar('sucesso', 'Avaliação excluída', `${item.titulo} (${item.turma}) removida.`);
    } catch (error: any) {
      notificar('erro', 'Erro ao excluir', error?.message || 'Não foi possível excluir a avaliação.');
    } finally {
      setOcupado(false);
    }
  };

  const abrirPlanilhaNotas = (item: AvaliacaoItem) => {
    router.push({
      pathname: '/notas',
      params: {
        avaliacaoId: item.id,
        avaliacao: item.titulo,
        turma: item.turma,
        materia: item.materia,
        status: item.statusPrazo,
        valorMaximo: String(item.valorMaximo),
      },
    });
  };

  const toastProps = { feedback, onFechar: fecharFeedback, fundoCard: tema.fundoTopo, textoPrincipal: tema.textoPrincipal, textoSecundario: tema.textoSecundario };
  const estiloOverlayTeclado = { paddingBottom: alturaTeclado > 0 ? alturaTeclado : 0 };
  const estiloScrollModal = { padding: 20, paddingBottom: alturaTeclado > 0 ? 150 : 28 + bottomInset };

  // === RENDERIZADORES ===
  const renderCardProfessor = ({ item }: { item: AvaliacaoItem }) => {
    const isOpen = item.statusPrazo === 'aberto';
    const corStatus = isOpen ? '#2E7D32' : '#C62828';
    return (
      <TouchableOpacity style={[styles.cardProf, { backgroundColor: tema.inputBackground, borderColor: tema.borda, borderLeftColor: corStatus }]} activeOpacity={0.78} onPress={() => abrirPlanilhaNotas(item)}>
        <View style={styles.cardHeader}>
          <Text style={[styles.cardTitle, { color: tema.textoPrincipal }]} numberOfLines={1}>{item.turma} • {item.materia}</Text>
          <View style={[styles.pillStatus, { backgroundColor: corStatus + '20' }]}>
            <Text style={{ color: corStatus, fontSize: 11, fontWeight: '800' }}>{isOpen ? 'Prazo Aberto' : 'Encerrado'}</Text>
          </View>
        </View>
        <Text style={[styles.cardSub, { color: tema.textoSecundario }]}>{item.titulo} • {item.bimestre} • Valor {item.valorMaximo.toFixed(1)}</Text>
        <View style={styles.linhaRodapeProf}>
          <View style={styles.infoMini}>
            <Ionicons name="calendar-outline" size={14} color={isOpen ? tema.botaoPrimario : tema.textoSecundario} />
            <Text style={[styles.infoText, { color: isOpen ? tema.botaoPrimario : tema.textoSecundario, fontWeight: '700' }]}>Até {item.prazo}</Text>
          </View>
          <View style={[styles.btnAcaoProfMini, { backgroundColor: isOpen ? tema.botaoPrimario : 'transparent', borderColor: isOpen ? tema.botaoPrimario : tema.borda }]}>
            <Ionicons name={isOpen ? 'create-outline' : 'eye-outline'} size={14} color={isOpen ? tema.textoBotao : tema.textoPrincipal} />
            <Text style={{ color: isOpen ? tema.textoBotao : tema.textoPrincipal, fontSize: 12, fontWeight: '700' }}>{isOpen ? 'Lançar Notas' : 'Ver / Retificar'}</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderPastaCoordenador = ({ item }: { item: AvaliacaoItem }) => {
    const aberta = pastasAbertas.includes(item.id);
    const confirmandoExclusao = excluindoId === item.id;
    const statusCor = item.status === 'concluido' ? '#2E7D32' : item.status === 'andamento' ? tema.botaoPrimario : '#EF6C00';
    const statusTexto = item.status === 'concluido' ? 'Concluído' : item.status === 'andamento' ? 'Em andamento' : 'Pendente';
    return (
      <View style={{ marginBottom: 12 }}>
        <TouchableOpacity style={[styles.cardPasta, { backgroundColor: tema.inputBackground, borderColor: aberta ? tema.botaoPrimario : tema.borda }]} activeOpacity={0.75} onPress={() => togglePasta(item.id)}>
          <View style={styles.cardHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
              <Ionicons name={aberta ? 'folder-open' : 'folder'} size={20} color={tema.botaoPrimario} />
              <Text style={[styles.cardTitle, { color: tema.textoPrincipal }]} numberOfLines={1}>{item.turma} • {item.materia}</Text>
            </View>
            <View style={[styles.pillStatus, { backgroundColor: statusCor + '20' }]}>
              <Text style={{ color: statusCor, fontSize: 11, fontWeight: '800' }}>{statusTexto}</Text>
            </View>
          </View>
          <Text style={[styles.cardSub, { color: tema.textoSecundario, marginBottom: 6 }]}>{item.titulo} • {item.bimestre} • Valor {item.valorMaximo.toFixed(1)}</Text>
          <View style={styles.linhaRodapeCard}>
            <View style={styles.infoMini}>
              <Ionicons name="person-outline" size={14} color={tema.icone} />
              <Text style={[styles.infoText, { color: tema.textoSecundario }]}>{item.professor}</Text>
            </View>
            <View style={styles.infoMini}>
              <Ionicons name="calendar-outline" size={14} color={tema.botaoPrimario} />
              <Text style={[styles.infoText, { color: tema.botaoPrimario, fontWeight: '700' }]}>{item.prazo}</Text>
            </View>
          </View>
        </TouchableOpacity>
        {aberta && (
          <View style={[styles.conteudoPasta, { borderLeftColor: tema.borda }]}>
            <View style={styles.rowAcoesPasta}>
              <TouchableOpacity style={[styles.btnAcaoPasta, { backgroundColor: tema.botaoPrimario }]} onPress={() => abrirPlanilhaNotas(item)}>
                <Ionicons name="document-text-outline" size={15} color={tema.textoBotao} />
                <Text style={{ color: tema.textoBotao, fontSize: 12, fontWeight: '700' }}>Ver Notas</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.btnAcaoPasta, { backgroundColor: tema.inputBackground, borderColor: tema.borda, borderWidth: 1 }]} onPress={() => void cobrarProfessor(item)} disabled={ocupado}>
                <Ionicons name="notifications-outline" size={15} color={tema.botaoPrimario} />
                <Text style={{ color: tema.textoPrincipal, fontSize: 12, fontWeight: '700' }}>Cobrar Prof.</Text>
              </TouchableOpacity>
            </View>
            <View style={[styles.rowAcoesPasta, { marginTop: 8 }]}>
              <TouchableOpacity style={[styles.btnAcaoPasta, { backgroundColor: tema.inputBackground, borderColor: tema.borda, borderWidth: 1 }]} onPress={() => void alternarEncerramento(item)} disabled={ocupado}>
                <Ionicons name={item.status === 'concluido' ? 'lock-open-outline' : 'checkmark-done-outline'} size={15} color={item.status === 'concluido' ? '#EF6C00' : '#2E7D32'} />
                <Text style={{ color: tema.textoPrincipal, fontSize: 12, fontWeight: '700' }}>{item.status === 'concluido' ? 'Reabrir' : 'Encerrar'}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.btnAcaoPasta, { backgroundColor: confirmandoExclusao ? '#C6282820' : tema.inputBackground, borderColor: confirmandoExclusao ? '#C62828' : tema.borda, borderWidth: 1 }]} onPress={() => void excluirAvaliacao(item)} disabled={ocupado}>
                <Ionicons name={confirmandoExclusao ? 'checkmark-circle' : 'trash-outline'} size={15} color="#C62828" />
                <Text style={{ color: '#C62828', fontSize: 12, fontWeight: '700' }}>{confirmandoExclusao ? 'Confirmar' : 'Excluir'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
    );
  };

  // === INTERFACE ===
  return (
    <KeyboardAvoidingView style={[styles.container, { backgroundColor: tema.fundoBase }]} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      {/* Cabeçalho e Busca */}
      <View style={[styles.header, { backgroundColor: tema.fundoTopo }]}>
        <View style={styles.headerTopRow}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.titulo, { color: tema.textoLogo }]}>Gestão de Avaliações</Text>
            <Text style={[styles.subtitulo, { color: tema.textoLogo, opacity: 0.85 }]}>
              {isProf ? 'Lançamento de notas e prazos das suas turmas' : isCoord ? 'Prazos, status por turma e cobrança docente' : 'Acompanhamento geral das avaliações'}
            </Text>
          </View>
          {isCoord ? (
            <TouchableOpacity style={[styles.btnAddTopo, { backgroundColor: tema.botaoPrimario }]} onPress={abrirModalNovaAvaliacao}>
              <Ionicons name="add" size={18} color={tema.textoBotao} />
              <Text style={{ color: tema.textoBotao, fontSize: 12, fontWeight: '700' }}>Nova</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.badgePerfil}>
              <Text style={[styles.perfilAtivo, { color: tema.textoLogo }]}>{perfil === 'admin' ? 'Administrador' : 'Professor'}</Text>
            </View>
          )}
        </View>
        <View style={styles.rowBuscaFiltro}>
          <View style={[styles.searchContainer, { flex: 1, backgroundColor: tema.inputBackground, borderColor: tema.borda }]}>
            <Ionicons name="search" size={18} color={tema.textoSecundario} style={{ marginRight: 8 }} />
            <TextInput
              style={[styles.searchInput, { color: tema.textoPrincipal }]}
              placeholder={isProf ? 'Buscar avaliação, turma ou matéria...' : 'Buscar turma, matéria ou professor...'}
              placeholderTextColor={tema.textoSecundario}
              value={busca}
              onChangeText={setBusca}
            />
          </View>
          <TouchableOpacity style={[styles.btnFiltroHeader, { backgroundColor: temFiltroAtivo ? tema.botaoPrimario : tema.inputBackground, borderColor: temFiltroAtivo ? tema.botaoPrimario : tema.borda }]} onPress={() => setModalFiltro(true)} accessibilityLabel="Filtrar avaliações">
            <Ionicons name="options-outline" size={20} color={temFiltroAtivo ? tema.textoBotao : tema.textoPrincipal} />
          </TouchableOpacity>
        </View>
        {temFiltroAtivo && (
          <View style={styles.barraFiltroAtivo}>
            <Text style={{ color: tema.textoLogo, fontSize: 12, opacity: 0.9 }}>
              Filtro: <Text style={{ fontWeight: '700' }}>{bimestreFiltro} • {serieFiltro}{!isProf ? ` • ${statusFiltro}` : ''}</Text>
            </Text>
            <TouchableOpacity onPress={limparFiltros}><Text style={{ color: tema.botaoPrimario, fontSize: 12, fontWeight: 'bold' }}>Limpar</Text></TouchableOpacity>
          </View>
        )}
      </View>

      {/* Lista Principal (Professor ou Coordenador) */}
      <FlatList
        data={avaliacoesFiltradas}
        keyExtractor={item => item.id}
        renderItem={isProf ? renderCardProfessor : renderPastaCoordenador}
        contentContainerStyle={[styles.listContent, { paddingBottom: 40 + bottomInset }]}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={carregando} onRefresh={() => void buscarDadosAvaliacoes()} tintColor={tema.botaoPrimario} />}
        ListHeaderComponent={
          isProf ? (
            <View>
              <View style={styles.resumoRow}>
                {[
                  { label: 'Abertas', valor: kpis.abertasProf, cor: '#2E7D32', icone: 'lock-open-outline' as const },
                  { label: 'Encerradas', valor: kpis.fechadasProf, cor: '#C62828', icone: 'lock-closed-outline' as const },
                  { label: 'Total', valor: avaliacoes.length, cor: tema.botaoPrimario, icone: 'document-text-outline' as const },
                ].map(kpi => (
                  <View key={kpi.label} style={[styles.cardResumo, { backgroundColor: tema.inputBackground, borderColor: tema.borda }]}>
                    <Ionicons name={kpi.icone} size={20} color={kpi.cor} />
                    <Text style={[styles.valorResumo, { color: tema.textoPrincipal }]}>{kpi.valor}</Text>
                    <Text style={[styles.labelResumo, { color: tema.textoSecundario }]}>{kpi.label}</Text>
                  </View>
                ))}
              </View>
              <View style={styles.rowFiltrosProf}>
                {([
                  { key: 'todas', label: 'Todas' },
                  { key: 'aberto', label: `Abertas (${kpis.abertasProf})` },
                  { key: 'fechado', label: `Encerradas (${kpis.fechadasProf})` },
                ] as const).map(f => {
                  const ativo = prazoFiltroProf === f.key;
                  return (
                    <TouchableOpacity key={f.key} onPress={() => setPrazoFiltroProf(f.key)} style={[styles.chipFiltroProf, { backgroundColor: ativo ? tema.botaoPrimario : tema.inputBackground, borderColor: ativo ? tema.botaoPrimario : tema.borda }]}>
                      <Text style={{ color: ativo ? tema.textoBotao : tema.textoPrincipal, fontSize: 12, fontWeight: '700' }}>{f.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          ) : (
            <View style={styles.resumoRow}>
              {[
                { label: 'Concluídas', valor: kpis.concluidas, cor: '#2E7D32', icone: 'checkmark-done-outline' as const },
                { label: 'Andamento', valor: kpis.andamento, cor: tema.botaoPrimario, icone: 'sync-outline' as const },
                { label: 'Pendentes', valor: kpis.pendentes, cor: '#EF6C00', icone: 'time-outline' as const },
              ].map(kpi => (
                <View key={kpi.label} style={[styles.cardResumo, { backgroundColor: tema.inputBackground, borderColor: tema.borda }]}>
                  <Ionicons name={kpi.icone} size={20} color={kpi.cor} />
                  <Text style={[styles.valorResumo, { color: tema.textoPrincipal }]}>{kpi.valor}</Text>
                  <Text style={[styles.labelResumo, { color: tema.textoSecundario }]}>{kpi.label}</Text>
                </View>
              ))}
            </View>
          )
        }
        ListEmptyComponent={
          carregando ? (
            <ActivityIndicator size="large" color={tema.botaoPrimario} style={{ marginTop: 30 }} />
          ) : (
            <View style={{ alignItems: 'center', marginTop: 30 }}>
              <Ionicons name="document-text-outline" size={40} color={tema.textoSecundario} />
              <Text style={{ color: tema.textoPrincipal, fontWeight: '700', fontSize: 15, marginTop: 10 }}>Nenhuma avaliação encontrada</Text>
              <Text style={{ color: tema.textoSecundario, fontSize: 12, marginTop: 4, textAlign: 'center' }}>
                {isProf ? 'As avaliações agendadas pela coordenação para você aparecerão aqui.' : 'Toque em "+ Nova" no topo para agendar uma avaliação.'}
              </Text>
            </View>
          )
        }
      />

      {/* Modal: Filtros */}
      <Modal visible={modalFiltro} transparent animationType="slide" onRequestClose={() => setModalFiltro(false)}>
        <View style={[styles.modalOverlay, estiloOverlayTeclado]}>
          <View style={[styles.modalConteudo, { backgroundColor: tema.fundoBase, borderColor: tema.borda }]}>
            <View style={[styles.modalHeader, { borderBottomColor: tema.borda }]}>
              <Text style={[styles.modalTitulo, { color: tema.textoPrincipal }]}>Filtrar Avaliações</Text>
              <TouchableOpacity onPress={() => setModalFiltro(false)}><Ionicons name="close" size={24} color={tema.textoSecundario} /></TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={estiloScrollModal} showsVerticalScrollIndicator={false}>
              <Text style={[styles.labelCampo, { color: tema.textoSecundario }]}>Bimestre</Text>
              <View style={styles.rowChips}>
                {FILTROS_BIMESTRE.map(b => {
                  const sel = bimestreFiltro === b;
                  return (
                    <TouchableOpacity key={b} onPress={() => setBimestreFiltro(b)} style={[styles.chip, { backgroundColor: sel ? tema.botaoPrimario + '20' : tema.inputBackground, borderColor: sel ? tema.botaoPrimario : tema.borda }]}>
                      <Text style={{ color: sel ? tema.botaoPrimario : tema.textoPrincipal, fontSize: 11, fontWeight: '700' }}>{b}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              {!isProf && (
                <>
                  <Text style={[styles.labelCampo, { color: tema.textoSecundario }]}>Status</Text>
                  <View style={styles.rowChips}>
                    {FILTROS_STATUS.map(st => {
                      const sel = statusFiltro === st.valor;
                      return (
                        <TouchableOpacity key={st.valor} onPress={() => setStatusFiltro(st.valor)} style={[styles.chip, { backgroundColor: sel ? tema.botaoPrimario + '20' : tema.inputBackground, borderColor: sel ? tema.botaoPrimario : tema.borda }]}>
                          <Text style={{ color: sel ? tema.botaoPrimario : tema.textoPrincipal, fontSize: 11, fontWeight: '700' }}>{st.label}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </>
              )}
              <Text style={[styles.labelCampo, { color: tema.textoSecundario }]}>Série</Text>
              {seriesDisponiveis.map(s => {
                const sel = serieFiltro === s;
                return (
                  <TouchableOpacity key={s} onPress={() => setSerieFiltro(s)} style={[styles.itemListaModal, { backgroundColor: sel ? tema.botaoPrimario + '18' : tema.inputBackground, borderColor: sel ? tema.botaoPrimario : tema.borda }]}>
                    <Text style={{ color: sel ? tema.botaoPrimario : tema.textoPrincipal, fontWeight: sel ? '700' : '500', fontSize: 14 }}>{s}</Text>
                    {sel && <Ionicons name="checkmark-circle" size={18} color={tema.botaoPrimario} />}
                  </TouchableOpacity>
                );
              })}
              <View style={styles.rowAcoesModal}>
                <TouchableOpacity style={[styles.btnSecundario, { backgroundColor: tema.inputBackground, borderColor: tema.borda }]} onPress={limparFiltros}>
                  <Text style={{ color: tema.textoPrincipal, fontWeight: '700', fontSize: 13 }}>Limpar</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.btnPrimario, { backgroundColor: tema.botaoPrimario }]} onPress={() => setModalFiltro(false)}>
                  <Text style={{ color: tema.textoBotao, fontWeight: '700', fontSize: 14 }}>Aplicar</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Modal: Nova Avaliação (Coordenador) */}
      <Modal visible={modalNovaAv} transparent animationType="slide" onRequestClose={() => setModalNovaAv(false)}>
        <View style={[styles.modalOverlay, estiloOverlayTeclado]}>
          <View style={[styles.modalConteudo, { backgroundColor: tema.fundoBase, borderColor: tema.borda }]}>
            <View style={[styles.modalHeader, { borderBottomColor: tema.borda }]}>
              <Text style={[styles.modalTitulo, { color: tema.textoPrincipal }]}>Nova Avaliação</Text>
              <TouchableOpacity onPress={() => setModalNovaAv(false)}><Ionicons name="close" size={24} color={tema.textoSecundario} /></TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={estiloScrollModal} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              <Text style={[styles.labelCampo, { color: tema.textoSecundario }]}>Título da Avaliação *</Text>
              <TextInput value={formAv.titulo} onChangeText={v => setFormAv(prev => ({ ...prev, titulo: v }))} placeholder="Ex: 1ª Av. Bimestral" placeholderTextColor={tema.textoSecundario} style={[styles.inputModal, { backgroundColor: tema.inputBackground, color: tema.textoPrincipal, borderColor: tema.borda }]} />
              <Text style={[styles.labelCampo, { color: tema.textoSecundario }]}>Bimestre *</Text>
              <View style={styles.rowChips}>
                {BIMESTRES.map(b => {
                  const sel = formAv.bimestre === b;
                  return (
                    <TouchableOpacity key={b} onPress={() => setFormAv(prev => ({ ...prev, bimestre: b }))} style={[styles.chip, { backgroundColor: sel ? tema.botaoPrimario + '20' : tema.inputBackground, borderColor: sel ? tema.botaoPrimario : tema.borda }]}>
                      <Text style={{ color: sel ? tema.botaoPrimario : tema.textoPrincipal, fontSize: 11, fontWeight: '700' }}>{b}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              <Text style={[styles.labelCampo, { color: tema.textoSecundario }]}>Turma *</Text>
              <TouchableOpacity style={[styles.dropdownTrigger, { backgroundColor: tema.inputBackground, borderColor: dropTurmaAberto ? tema.botaoPrimario : tema.borda }]} onPress={() => { setDropTurmaAberto(!dropTurmaAberto); setDropProfAberto(false); }}>
                <Text style={{ color: formAv.turmaNome ? tema.textoPrincipal : tema.textoSecundario, fontSize: 14 }}>{formAv.turmaNome || 'Selecionar turma...'}</Text>
                <Ionicons name={dropTurmaAberto ? 'chevron-up' : 'chevron-down'} size={18} color={tema.textoSecundario} />
              </TouchableOpacity>
              {dropTurmaAberto && (
                <View style={[styles.dropdownLista, { backgroundColor: tema.inputBackground, borderColor: tema.borda }]}>
                  {turmasBanco.map(t => (
                    <TouchableOpacity key={t.id} style={[styles.dropdownItem, { borderBottomColor: tema.borda }]} onPress={() => { setFormAv(prev => ({ ...prev, turmaId: t.id, turmaNome: t.nome })); setDropTurmaAberto(false); }}>
                      <Text style={{ color: tema.textoPrincipal, fontWeight: '600', fontSize: 14 }}>{t.nome} ({t.turno || 'Matutino'})</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
              <Text style={[styles.labelCampo, { color: tema.textoSecundario, marginTop: 8 }]}>Professor Responsável *</Text>
              <TouchableOpacity style={[styles.dropdownTrigger, { backgroundColor: tema.inputBackground, borderColor: dropProfAberto ? tema.botaoPrimario : tema.borda }]} onPress={() => { setDropProfAberto(!dropProfAberto); setDropTurmaAberto(false); }}>
                <Text style={{ color: formAv.professorNome ? tema.textoPrincipal : tema.textoSecundario, fontSize: 14 }}>{formAv.professorNome || 'Selecionar professor...'}</Text>
                <Ionicons name={dropProfAberto ? 'chevron-up' : 'chevron-down'} size={18} color={tema.textoSecundario} />
              </TouchableOpacity>
              {dropProfAberto && (
                <View style={[styles.dropdownLista, { backgroundColor: tema.inputBackground, borderColor: tema.borda }]}>
                  {professoresBanco.map(p => (
                    <TouchableOpacity key={p.id} style={[styles.dropdownItem, { borderBottomColor: tema.borda }]} onPress={() => { setFormAv(prev => ({ ...prev, professorId: p.id, professorNome: p.nome, materia: p.disciplina || prev.materia })); setDropProfAberto(false); }}>
                      <View>
                        <Text style={{ color: tema.textoPrincipal, fontWeight: '600', fontSize: 14 }}>{p.nome}</Text>
                        {!!p.disciplina && <Text style={{ color: tema.textoSecundario, fontSize: 11 }}>{p.disciplina}</Text>}
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
              <Text style={[styles.labelCampo, { color: tema.textoSecundario, marginTop: 8 }]}>Disciplina / Matéria *</Text>
              <TextInput value={formAv.materia} onChangeText={v => setFormAv(prev => ({ ...prev, materia: v }))} placeholder="Ex: Matemática, Física..." placeholderTextColor={tema.textoSecundario} style={[styles.inputModal, { backgroundColor: tema.inputBackground, color: tema.textoPrincipal, borderColor: tema.borda }]} />
              <Text style={[styles.labelCampo, { color: tema.textoSecundario }]}>Valor da Prova *</Text>
              <TextInput value={formAv.valorMaximo} onChangeText={v => setFormAv(prev => ({ ...prev, valorMaximo: v.replace(/[^0-9.,]/g, '') }))} keyboardType="numeric" maxLength={5} placeholder="Ex: 10 ou 5.0" placeholderTextColor={tema.textoSecundario} style={[styles.inputModal, { backgroundColor: tema.inputBackground, color: tema.textoPrincipal, borderColor: tema.borda }]} />
              <Text style={[styles.labelCampo, { color: tema.textoSecundario }]}>Prazo de Lançamento *</Text>
              <TextInput value={formAv.prazo} onChangeText={v => setFormAv(prev => ({ ...prev, prazo: formatarDataInput(v) }))} keyboardType="numeric" maxLength={10} placeholder="DD/MM/AAAA" placeholderTextColor={tema.textoSecundario} style={[styles.inputModal, { backgroundColor: tema.inputBackground, color: tema.textoPrincipal, borderColor: tema.borda }]} />
              <TouchableOpacity style={[styles.btnSalvarFull, { backgroundColor: tema.botaoPrimario }]} onPress={() => void salvarNovaAvaliacao()} disabled={ocupado}>
                <Text style={{ color: tema.textoBotao, fontWeight: '700', fontSize: 14 }}>{ocupado ? 'Salvando...' : 'Agendar Avaliação'}</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
          <FeedbackToast {...toastProps} />
        </View>
      </Modal>

      <FeedbackToast {...toastProps} />
    </KeyboardAvoidingView>
  );
}

// === ESTILOS ===
const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingTop: 56, paddingBottom: 20, paddingHorizontal: 20, borderBottomLeftRadius: 22, borderBottomRightRadius: 22, elevation: 5 },
  headerTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10 },
  btnAddTopo: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, gap: 4 },
  titulo: { fontSize: 22, fontWeight: 'bold' },
  subtitulo: { fontSize: 13, marginTop: 3 },
  badgePerfil: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10, backgroundColor: 'rgba(124, 124, 255, 0.18)', borderWidth: 1, borderColor: 'rgba(165, 158, 196, 0.25)' },
  perfilAtivo: { fontSize: 11, fontWeight: 'bold' },
  rowBuscaFiltro: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 14 },
  searchContainer: { flexDirection: 'row', alignItems: 'center', height: 44, borderRadius: 10, borderWidth: 1, paddingHorizontal: 12 },
  searchInput: { flex: 1, height: '100%', fontSize: 14 },
  btnFiltroHeader: { width: 44, height: 44, borderRadius: 10, borderWidth: 1, justifyContent: 'center', alignItems: 'center' },
  barraFiltroAtivo: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, paddingHorizontal: 2 },
  listContent: { padding: 20, paddingBottom: 40 },
  resumoRow: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  cardResumo: { flex: 1, borderWidth: 1, borderRadius: 12, padding: 12, alignItems: 'center' },
  valorResumo: { fontSize: 22, fontWeight: 'bold', marginTop: 4 },
  labelResumo: { fontSize: 11, marginTop: 2, textAlign: 'center' },
  rowFiltrosProf: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  chipFiltroProf: { borderWidth: 1, borderRadius: 16, paddingHorizontal: 12, paddingVertical: 6 },
  cardProf: { borderWidth: 1, borderLeftWidth: 4, borderRadius: 14, padding: 14, marginBottom: 12 },
  linhaRodapeProf: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 },
  btnAcaoProfMini: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
  cardPasta: { borderWidth: 1, borderRadius: 14, padding: 14 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6, gap: 8 },
  cardTitle: { fontSize: 15, fontWeight: 'bold', flex: 1 },
  pillStatus: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  cardSub: { fontSize: 13, marginBottom: 10, fontWeight: '600' },
  linhaRodapeCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 },
  infoMini: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  infoText: { fontSize: 12 },
  conteudoPasta: { paddingLeft: 14, paddingTop: 10, borderLeftWidth: 2, marginLeft: 14, marginTop: 4 },
  rowAcoesPasta: { flexDirection: 'row', gap: 8 },
  btnAcaoPasta: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', height: 38, borderRadius: 10, gap: 6 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
  modalConteudo: { maxHeight: '88%', borderTopLeftRadius: 22, borderTopRightRadius: 22, borderWidth: 1 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1 },
  modalTitulo: { fontSize: 18, fontWeight: 'bold' },
  labelCampo: { fontSize: 12, fontWeight: '700', marginBottom: 6 },
  inputModal: { borderWidth: 1, borderRadius: 10, height: 44, paddingHorizontal: 12, fontSize: 14, marginBottom: 12 },
  rowChips: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  chip: { flex: 1, height: 38, borderWidth: 1, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  itemListaModal: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 11, marginBottom: 8 },
  dropdownTrigger: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, height: 44, marginBottom: 6 },
  dropdownLista: { borderWidth: 1, borderRadius: 10, marginBottom: 12, overflow: 'hidden' },
  dropdownItem: { paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1 },
  rowAcoesModal: { flexDirection: 'row', gap: 10, marginTop: 12 },
  btnSecundario: { flex: 1, height: 44, borderWidth: 1, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  btnPrimario: { flex: 1.4, height: 44, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  btnSalvarFull: { width: '100%', height: 46, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginTop: 8 },
});