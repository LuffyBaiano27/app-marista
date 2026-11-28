import React, { useState, useCallback, useMemo } from 'react';
import {View,Text,StyleSheet,FlatList,TouchableOpacity,TextInput,KeyboardAvoidingView,Platform,RefreshControl,ActivityIndicator,Modal,ScrollView, useWindowDimensions,} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, increment, query, where, serverTimestamp } from 'firebase/firestore';
import { useDemoProfile, type DemoProfile } from '../../contexts/demoProfileContext';
import { db } from '../../config/firebase';
import { FeedbackToast, type EstadoFeedback, type TipoFeedback } from '../../components/FeedbackToast';

// === TIPOS E CONSTANTES ===
type FiltroDiaProf = 'todos' | 'hoje' | 1 | 2 | 3 | 4 | 5;

const ID_PROFESSOR_DEMONSTRATIVO = 'prof_1';
const NOMES_PERFIS: Record<DemoProfile, string> = { admin: 'Administrador', coordenador: 'Coordenador', professor: 'Professor' };
const DIAS_SEMANA: Record<number, string> = { 1: 'Segunda-feira', 2: 'Terça-feira', 3: 'Quarta-feira', 4: 'Quinta-feira', 5: 'Sexta-feira' };
const FILTROS_DIA_PROF: { key: FiltroDiaProf; label: string }[] = [
  { key: 'todos', label: 'Todas' },
  { key: 'hoje', label: 'Hoje' },
  { key: 1, label: 'Seg' },
  { key: 2, label: 'Ter' },
  { key: 3, label: 'Qua' },
  { key: 4, label: 'Qui' },
  { key: 5, label: 'Sex' },
];
const TURNOS = ['Matutino', 'Vespertino', 'Noturno'] as const;
const FILTROS_TURNO = ['Todos', ...TURNOS] as const;
const ALUNOS_SIMULADOS: Record<string, string[]> = {
  '1º Ano Médio': ['Ana Carolina', 'Carlos Eduardo', 'Beatriz Souza'],
  '2º Ano Médio': ['Gabriel Martins', 'Fernanda Lima', 'Lucas Oliveira'],
  '6º Ano A': ['João Pedro', 'Sophia Mendes'],
  '9º Ano C': ['Mariana Silva', 'Matheus Costa', 'Letícia Rocha'],
};

// === HELPERS ===
const extrairSerie = (nomeTurma: string) => {
  const limpo = String(nomeTurma || '').trim();
  return limpo ? limpo.replace(/\s+[A-Z]$/i, '').trim() || limpo : 'Outros';
};

const obterIniciais = (nome: string) => {
  const partes = nome.trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return 'AL';
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
  return `${partes[0][0]}${partes[partes.length - 1][0]}`.toUpperCase();
};

export default function TurmasScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const isTelaPequena = width < 380;
  const paddingLateral = isTelaPequena ? 16 : 20;
  const paddingTopo = Platform.OS === 'web' ? 24 : Math.max(insets.top + 12, 24);
  const paddingBaseModal = Platform.OS === 'web' ? 24 : Math.max(insets.bottom + 14, 24);

  const { perfil, temaAtivo: tema } = useDemoProfile();
  const isAdmin = perfil === 'admin';
  const isCoord = perfil === 'coordenador';
  const isProf = perfil === 'professor';

  // === ESTADOS ===
  const [busca, setBusca] = useState('');
  const [turnoFiltro, setTurnoFiltro] = useState<(typeof FILTROS_TURNO)[number]>('Todos');
  const [diaFiltroProf, setDiaFiltroProf] = useState<FiltroDiaProf>('todos');
  const [serieFiltroCoord, setSerieFiltroCoord] = useState<string>('Todas');
  const [turmaFiltroCoord, setTurmaFiltroCoord] = useState<string>('');
  const [serieExpandidaFiltro, setSerieExpandidaFiltro] = useState<string | null>(null);
  const [modalFiltroCoord, setModalFiltroCoord] = useState(false);
  const [turmaAlunosModal, setTurmaAlunosModal] = useState<any | null>(null);
  const [turmas, setTurmas] = useState<any[]>([]);
  const [alunosPorTurma, setAlunosPorTurma] = useState<Record<string, any[]>>({});
  const [totalProfessoresCoord, setTotalProfessoresCoord] = useState(0);
  const [chamadasRealizadasHoje, setChamadasRealizadasHoje] = useState<Record<string, string>>({});
  const [turmasExpandidas, setTurmasExpandidas] = useState<string[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);

  // Modais de CRUD e Transferência
  const [modalFormTurma, setModalFormTurma] = useState(false);
  const [turmaEditandoId, setTurmaEditandoId] = useState<string | null>(null);
  const [formTurma, setFormTurma] = useState({ nome: '', turno: 'Matutino' as (typeof TURNOS)[number] });
  const [confirmarExclusao, setConfirmarExclusao] = useState(false);
  const [alunoTransferir, setAlunoTransferir] = useState<{ aluno: any; turmaOrigem: any } | null>(null);
  const [turmaDestinoId, setTurmaDestinoId] = useState('');
  const [feedback, setFeedback] = useState<EstadoFeedback>({ visivel: false, tipo: 'sucesso', titulo: '', mensagem: '' });

  const notificar = useCallback((tipo: TipoFeedback, titulo: string, mensagem: string) => {
    setFeedback({ visivel: true, tipo, titulo, mensagem });
  }, []);
  const fecharFeedback = useCallback(() => setFeedback(prev => ({ ...prev, visivel: false })), []);

  const hoje = new Date();
  const diaAtual = hoje.getDay();
  const diaBusca = diaAtual === 0 || diaAtual === 6 ? 1 : diaAtual;
  const dataFormatada = hoje.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });
  const dataHeader = dataFormatada.charAt(0).toUpperCase() + dataFormatada.slice(1);
  const getDataDeHoje = () => new Date().toISOString().split('T')[0];

  const voltar = () => (router.canGoBack() ? router.back() : router.replace('/(tabs)'));
  const toggleTurma = (id: string) => setTurmasExpandidas(prev => (prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]));

  // === CARREGAMENTO DE DADOS (FIRESTORE) ===
  const buscarDadosTurmas = useCallback(async () => {
    setCarregando(true);
    try {
      const qTurmas = isAdmin || isCoord ? query(collection(db, 'turmas')) : query(collection(db, 'grade_aulas'));
      const [turmasSnap, chamadasSnap, alunosSnap] = await Promise.all([
        getDocs(qTurmas),
        getDocs(query(collection(db, 'chamadas'), where('dataChamadaFormatada', '==', getDataDeHoje()))),
        getDocs(collection(db, 'alunos')),
      ]);

      const mapaAlunos: Record<string, any[]> = {};
      alunosSnap.forEach(docSnap => {
        const a = docSnap.data();
        const itemAluno = { id: docSnap.id, nome: a.nome || 'Aluno sem nome', matricula: a.matricula || '', responsavelNome: a.responsavelNome || '', turmaId: a.turmaId || '' };
        [a.turmaId, a.turmaNome, a.turma].filter(Boolean).forEach(chave => {
          mapaAlunos[chave] = [...(mapaAlunos[chave] || []), itemAluno];
        });
      });
      setAlunosPorTurma(mapaAlunos);

      const turmasBanco: any[] = turmasSnap.docs.map(d => {
        const dados = d.data();
        return { id: d.id, diaSemana: DIAS_SEMANA[dados.diaId] || 'Indefinido', ...dados };
      });

      if (isAdmin || isCoord) {
        if (isCoord) {
          try {
            const usersSnap = await getDocs(collection(db, 'usuarios'));
            const profsAtivos = usersSnap.docs.filter(d => {
              const u = d.data() as any;
              return String(u.role ?? u.perfil ?? '').toLowerCase().includes('prof') && u.ativo !== false && u.situacao !== 'Inativo';
            });
            setTotalProfessoresCoord(profsAtivos.length);
          } catch { setTotalProfessoresCoord(0); }
        }
        const unicas = turmasBanco.filter((t, idx, arr) => arr.findIndex(x => x.nome === t.nome && (x.turno || 'Matutino') === (t.turno || 'Matutino')) === idx);
        unicas.sort((a, b) => String(a.nome || '').localeCompare(String(b.nome || ''), 'pt-BR'));
        setTurmas(unicas);
      } else {
        const aulasProf = turmasBanco.filter(t => t.professorId === ID_PROFESSOR_DEMONSTRATIVO || String(t.professorNome || '').toLowerCase().includes('luffy'));
        aulasProf.sort((a, b) => {
          const aHoje = a.diaId === diaBusca ? 0 : 1;
          const bHoje = b.diaId === diaBusca ? 0 : 1;
          return aHoje !== bHoje ? aHoje - bHoje : (a.diaId || 0) - (b.diaId || 0) || String(a.horario || '').localeCompare(String(b.horario || ''));
        });
        setTurmas(aulasProf);
      }

      const chamadasHojeDic: Record<string, string> = {};
      chamadasSnap.forEach(d => {
        const dados = d.data();
        chamadasHojeDic[dados.turmaId] = new Date(dados.dataChamada).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
      });
      setChamadasRealizadasHoje(chamadasHojeDic);
    } catch (error: any) {
      notificar('erro', 'Erro ao buscar turmas', error?.message || 'Falha ao consultar o Firestore.');
    } finally {
      setCarregando(false);
    }
  }, [isAdmin, isCoord, diaBusca, notificar]);

  useFocusEffect(useCallback(() => { void buscarDadosTurmas(); }, [buscarDadosTurmas]));

  // === FILTROS, ALUNOS E KPIS ===
  const obterAlunosDaTurma = useCallback((turma: any) => {
    const porTurmaId = turma.turmaId ? (alunosPorTurma[turma.turmaId] || []) : [];
    const porId = alunosPorTurma[turma.id] || [];
    const porNome = alunosPorTurma[turma.nome] || [];
    const reais = [...porTurmaId, ...porId, ...porNome].filter((a, idx, arr) => arr.findIndex(x => x.id === a.id) === idx);
    reais.sort((a, b) => String(a.nome || '').localeCompare(String(b.nome || ''), 'pt-BR'));
    if (isCoord || isProf || reais.length > 0) return reais;
    return (ALUNOS_SIMULADOS[turma.nome] || []).map((nome, i) => ({ id: `${turma.id}_sim_${i}`, nome }));
  }, [alunosPorTurma, isCoord, isProf]);

  const turmasPorTurnoCoord = useMemo(() => turmas.filter(t => turnoFiltro === 'Todos' || (t.turno || 'Matutino') === turnoFiltro), [turmas, turnoFiltro]);

  const seriesComSalasCoord = useMemo(() => {
    const mapa = new Map<string, any[]>();
    turmasPorTurnoCoord.forEach(t => {
      if (!t.nome) return;
      const serie = extrairSerie(t.nome);
      mapa.set(serie, [...(mapa.get(serie) || []), t]);
    });
    return Array.from(mapa.entries()).sort((a, b) => a[0].localeCompare(b[0], 'pt-BR')).map(([serie, salas]) => ({ serie, salas }));
  }, [turmasPorTurnoCoord]);

  const salaSelecionadaObj = useMemo(() => turmas.find(t => t.id === turmaFiltroCoord) || null, [turmas, turmaFiltroCoord]);
  const temFiltroAtivoCoord = serieFiltroCoord !== 'Todas' || turnoFiltro !== 'Todos' || !!turmaFiltroCoord;
  const limparFiltrosCoord = () => { setSerieFiltroCoord('Todas'); setTurmaFiltroCoord(''); setTurnoFiltro('Todos'); setSerieExpandidaFiltro(null); };
  const selecionarTurnoFiltroCoord = (t: (typeof FILTROS_TURNO)[number]) => { setTurnoFiltro(t); setTurmaFiltroCoord(''); };
  const selecionarSeriePastaFiltro = (serie: string, qtdSalas: number) => {
    setSerieFiltroCoord(serie);
    setTurmaFiltroCoord('');
    setSerieExpandidaFiltro(qtdSalas > 1 ? (prev => (prev === serie ? null : serie)) : null);
  };

  // === AÇÕES DE CRUD E TRANSFERÊNCIA ===
  const abrirCriarTurma = () => { setTurmaEditandoId(null); setFormTurma({ nome: '', turno: 'Matutino' }); setConfirmarExclusao(false); setModalFormTurma(true); };
  const abrirEditarTurma = (turma: any) => {
    setTurmaEditandoId(turma.id);
    setFormTurma({ nome: turma.nome || '', turno: TURNOS.includes(turma.turno) ? turma.turno : 'Matutino' });
    setConfirmarExclusao(false);
    setModalFormTurma(true);
  };

  const salvarTurma = async () => {
    if (!formTurma.nome.trim()) return notificar('aviso', 'Campo obrigatório', 'Informe o nome da turma.');
    setSalvando(true);
    try {
      if (turmaEditandoId) {
        await updateDoc(doc(db, 'turmas', turmaEditandoId), { nome: formTurma.nome.trim(), turno: formTurma.turno });
        setModalFormTurma(false);
        void buscarDadosTurmas();
        notificar('sucesso', 'Turma atualizada', `${formTurma.nome.trim()} (${formTurma.turno}) salva.`);
      } else {
        await addDoc(collection(db, 'turmas'), { nome: formTurma.nome.trim(), turno: formTurma.turno, alunos: 0, criadoPor: 'Marina', criadoEm: serverTimestamp() });
        setModalFormTurma(false);
        void buscarDadosTurmas();
        notificar('sucesso', 'Turma criada', `${formTurma.nome.trim()} (${formTurma.turno}) cadastrada.`);
      }
    } catch (error: any) {
      notificar('erro', 'Erro ao salvar', error?.message || 'Não foi possível salvar a turma no Firestore.');
    } finally { setSalvando(false); }
  };

  const excluirTurma = async (turma: any) => {
    const totalAlunos = obterAlunosDaTurma(turma).length;
    if (totalAlunos > 0) return notificar('aviso', 'Exclusão bloqueada', `${turma.nome} possui ${totalAlunos} aluno(s) vinculado(s). Remova ou realoque antes de excluir.`);
    if (!confirmarExclusao) return setConfirmarExclusao(true);
    setSalvando(true);
    try {
      await deleteDoc(doc(db, 'turmas', turma.id));
      setModalFormTurma(false);
      void buscarDadosTurmas();
      notificar('sucesso', 'Turma excluída', `${turma.nome} foi removida.`);
    } catch (error: any) {
      notificar('erro', 'Erro ao excluir', error?.message || 'Não foi possível excluir a turma.');
    } finally { setSalvando(false); }
  };

  const confirmarTransferenciaAluno = async () => {
    if (!alunoTransferir || !turmaDestinoId) return notificar('aviso', 'Selecione a turma', 'Escolha a turma de destino para transferir o aluno.');
    const destino = turmas.find(t => t.id === turmaDestinoId);
    if (!destino) return;
    setSalvando(true);
    try {
      const { aluno, turmaOrigem } = alunoTransferir;
      await updateDoc(doc(db, 'alunos', aluno.id), {
        turmaId: destino.id,
        turmaNome: destino.nome,
        turma: destino.nome,
        serie: extrairSerie(destino.nome),
        turno: destino.turno || 'Matutino',
      });
      await Promise.all([
        updateDoc(doc(db, 'turmas', turmaOrigem.id), { alunos: increment(-1) }),
        updateDoc(doc(db, 'turmas', destino.id), { alunos: increment(1) }),
      ]);
      setAlunoTransferir(null);
      setTurmaDestinoId('');
      void buscarDadosTurmas();
      notificar('sucesso', 'Aluno transferido!', `${aluno.nome} movido para ${destino.nome} (${destino.turno || 'Matutino'}).`);
    } catch (error: any) {
      notificar('erro', 'Erro na transferência', error?.message || 'Não foi possível transferir o aluno.');
    } finally { setSalvando(false); }
  };

  const turmasFiltradas = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return turmas.filter(t => {
      if ((isAdmin || isCoord) && turnoFiltro !== 'Todos' && (t.turno || 'Matutino') !== turnoFiltro) return false;
      if (isCoord && turmaFiltroCoord && t.id !== turmaFiltroCoord) return false;
      if (isCoord && !turmaFiltroCoord && serieFiltroCoord !== 'Todas' && extrairSerie(t.nome) !== serieFiltroCoord) return false;
      if (isProf) {
        if (diaFiltroProf === 'hoje' && t.diaId !== diaBusca) return false;
        if (typeof diaFiltroProf === 'number' && t.diaId !== diaFiltroProf) return false;
      }
      if (!termo) return true;
      if (isAdmin) return [t.nome, t.turno].some(v => String(v || '').toLowerCase().includes(termo));
      if (isCoord) {
        const alunosDaSala = obterAlunosDaTurma(t);
        return [t.nome, t.turno].some(v => String(v || '').toLowerCase().includes(termo)) || alunosDaSala.some(a => String(a.nome || '').toLowerCase().includes(termo));
      }
      return [t.nome, t.disciplina, t.materia, t.diaSemana, t.horario].some(v => String(v || '').toLowerCase().includes(termo));
    });
  }, [busca, isAdmin, isCoord, isProf, turnoFiltro, diaFiltroProf, diaBusca, serieFiltroCoord, turmaFiltroCoord, turmas, obterAlunosDaTurma]);

  const totalAlunosVinculados = useMemo(() => turmasFiltradas.reduce((acc, t) => acc + obterAlunosDaTurma(t).length, 0), [turmasFiltradas, obterAlunosDaTurma]);
  const totalTurmasComAlunos = useMemo(() => turmasFiltradas.filter(t => obterAlunosDaTurma(t).length > 0).length, [turmasFiltradas, obterAlunosDaTurma]);
  const kpisProf = useMemo(() => {
    const aulasHoje = turmas.filter(t => t.diaId === diaBusca);
    return { aulasHoje: aulasHoje.length, pendentesHoje: aulasHoje.filter(t => !chamadasRealizadasHoje[t.id]).length, totalSemana: turmas.length };
  }, [turmas, diaBusca, chamadasRealizadasHoje]);

  const toastProps = { feedback, onFechar: fecharFeedback, fundoCard: tema.fundoTopo, textoPrincipal: tema.textoPrincipal, textoSecundario: tema.textoSecundario };

  // === RENDERIZADORES POR PERFIL ===
  const renderPastaAdmin = ({ item }: { item: any }) => {
    const isExpanded = turmasExpandidas.includes(item.id);
    const alunos = obterAlunosDaTurma(item);
    return (
      <View style={{ marginBottom: 14 }}>
        <TouchableOpacity style={[styles.cardPasta, { backgroundColor: tema.inputBackground, borderColor: tema.borda }]} activeOpacity={0.75} onPress={() => toggleTurma(item.id)}>
          <View style={styles.linhaTituloPasta}>
            <Ionicons name={isExpanded ? 'folder-open' : 'folder'} size={22} color={tema.botaoPrimario} style={{ marginRight: 12 }} />
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={[styles.tituloPasta, { color: tema.textoPrincipal }]} numberOfLines={1}>{item.nome}</Text>
              <Text style={{ color: tema.textoSecundario, fontSize: 11, marginTop: 2 }}>{item.turno || 'Matutino'}</Text>
            </View>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', flexShrink: 0 }}>
            <Text style={{ color: tema.textoSecundario, fontSize: 12, marginRight: 10, fontWeight: 'bold' }}>{alunos.length} {alunos.length === 1 ? 'aluno' : 'alunos'}</Text>
            <TouchableOpacity onPress={() => abrirEditarTurma(item)} style={{ padding: 4, marginRight: 6 }} accessibilityLabel="Editar turma">
              <Ionicons name="create-outline" size={18} color={tema.textoSecundario} />
            </TouchableOpacity>
            <Ionicons name={isExpanded ? 'chevron-down' : 'chevron-forward'} size={20} color={tema.textoSecundario} />
          </View>
        </TouchableOpacity>
        {isExpanded && (
          <View style={[styles.conteudoPasta, { borderLeftColor: tema.borda }]}>
            {alunos.length === 0 ? (
              <Text style={{ color: tema.textoSecundario, fontSize: 13, fontStyle: 'italic', paddingVertical: 8 }}>Nenhum aluno vinculado.</Text>
            ) : alunos.map(aluno => (
              <View key={aluno.id} style={[styles.cardAlunoClean, { backgroundColor: tema.inputBackground, borderColor: tema.borda }]}>
                <View style={[styles.iconePessoa, { backgroundColor: tema.botaoPrimario + '20' }]}><Ionicons name="person" size={16} color={tema.botaoPrimario} /></View>
                <Text style={[styles.nomeAlunoClean, { color: tema.textoPrincipal, flex: 1 }]} numberOfLines={1}>{aluno.nome}</Text>
              </View>
            ))}
          </View>
        )}
      </View>
    );
  };

  const renderPastaCoord = ({ item }: { item: any }) => {
    const isExpanded = turmasExpandidas.includes(item.id);
    const alunos = obterAlunosDaTurma(item);
    return (
      <View style={{ marginBottom: 14 }}>
        <TouchableOpacity style={[styles.cardPasta, { backgroundColor: tema.inputBackground, borderColor: tema.borda }]} activeOpacity={0.75} onPress={() => toggleTurma(item.id)}>
          <View style={styles.linhaTituloPasta}>
            <Ionicons name={isExpanded ? 'folder-open' : 'folder'} size={22} color={tema.botaoPrimario} style={{ marginRight: 12 }} />
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={[styles.tituloPasta, { color: tema.textoPrincipal }]} numberOfLines={1}>{item.nome}</Text>
              <Text style={{ color: tema.textoSecundario, fontSize: 11, marginTop: 2 }} numberOfLines={1}>{extrairSerie(item.nome)} • {item.turno || 'Matutino'}</Text>
            </View>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', flexShrink: 0 }}>
            <Text style={{ color: tema.textoSecundario, fontSize: 12, marginRight: 8, fontWeight: 'bold' }}>{alunos.length} {alunos.length === 1 ? 'aluno' : 'alunos'}</Text>
            <Ionicons name={isExpanded ? 'chevron-down' : 'chevron-forward'} size={20} color={tema.textoSecundario} />
          </View>
        </TouchableOpacity>
        {isExpanded && (
          <View style={[styles.conteudoPasta, { borderLeftColor: tema.borda }]}>
            {alunos.length === 0 ? (
              <Text style={{ color: tema.textoSecundario, fontSize: 13, fontStyle: 'italic', paddingVertical: 8 }}>Nenhum aluno matriculado nesta sala.</Text>
            ) : alunos.map(aluno => (
              <View key={aluno.id} style={[styles.cardAlunoClean, { backgroundColor: tema.inputBackground, borderColor: tema.borda }]}>
                <View style={[styles.iconePessoa, { backgroundColor: tema.botaoPrimario + '20' }]}><Ionicons name="person" size={16} color={tema.botaoPrimario} /></View>
                <View style={{ flex: 1, minWidth: 0, marginRight: 8 }}>
                  <Text style={[styles.nomeAlunoClean, { color: tema.textoPrincipal }]} numberOfLines={1}>{aluno.nome}</Text>
                  {!!aluno.matricula && <Text style={{ color: tema.textoSecundario, fontSize: 11 }}>Mat. {aluno.matricula}</Text>}
                </View>
                <TouchableOpacity style={[styles.btnTransferir, { borderColor: tema.botaoPrimario, backgroundColor: tema.botaoPrimario + '15', flexShrink: 0 }]} onPress={() => { setAlunoTransferir({ aluno, turmaOrigem: item }); setTurmaDestinoId(''); }}>
                  <Ionicons name="swap-horizontal" size={14} color={tema.botaoPrimario} />
                  <Text style={{ color: tema.botaoPrimario, fontSize: 11, fontWeight: '700' }}>Transferir</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}
      </View>
    );
  };

  const renderTurmaDocente = ({ item }: { item: any }) => {
    const horaRealizada = chamadasRealizadasHoje[item.id];
    const isRealizada = !!horaRealizada;
    const isHoje = item.diaId === diaBusca;
    const isBloqueado = !isRealizada && !isHoje;
    const alunosDaSala = obterAlunosDaTurma(item);
    const corBordaLateral = isRealizada ? '#2E7D32' : isHoje ? tema.botaoPrimario : tema.borda;
    return (
      <View style={[styles.cardTurma, { backgroundColor: tema.inputBackground, borderColor: tema.borda, borderLeftWidth: 4, borderLeftColor: corBordaLateral }]}>
        <View style={styles.corpoCard}>
          <View style={[styles.iconeTurmaBg, { backgroundColor: (isHoje ? tema.botaoPrimario : tema.textoSecundario) + '20' }]}>
            <Ionicons name="people" size={22} color={isHoje ? tema.botaoPrimario : tema.textoSecundario} />
          </View>
          <View style={styles.infoTurma}>
            <View style={styles.linhaTitulo}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1, flexWrap: 'wrap' }}>
                <Text style={[styles.nomeTurma, { color: tema.textoPrincipal }]}>{item.nome}</Text>
                {isHoje && (
                  <View style={[styles.badgeHoje, { backgroundColor: tema.botaoPrimario }]}>
                    <Text style={{ color: tema.textoBotao, fontSize: 9, fontWeight: '800' }}>AULA HOJE</Text>
                  </View>
                )}
              </View>
              <View style={[styles.badgeStatus, { backgroundColor: isRealizada ? '#2E7D3220' : '#EF6C0020', borderColor: isRealizada ? '#2E7D32' : '#EF6C00', flexShrink: 0 }]}>
                <Text style={[styles.textoBadge, { color: isRealizada ? '#2E7D32' : '#EF6C00' }]}>{isRealizada ? 'REALIZADA' : 'PENDENTE'}</Text>
              </View>
            </View>
            <Text style={[styles.materiaTurma, { color: tema.textoSecundario }]}>{item.disciplina || item.materia} • {item.turno || 'Matutino'}</Text>
            <View style={styles.detalhesGrade}>
              <View style={styles.detalheRow}>
                <Ionicons name="time-outline" size={14} color={tema.botaoPrimario} />
                <Text style={[styles.textoHorario, { color: tema.botaoPrimario }]}> {item.diaSemana} • {item.horario}</Text>
              </View>
              <View style={styles.detalheRow}>
                <Ionicons name="school-outline" size={13} color={tema.textoSecundario} />
                <Text style={[styles.textoDetalhe, { color: tema.textoSecundario }]}> {alunosDaSala.length} {alunosDaSala.length === 1 ? 'aluno matriculado' : 'alunos matriculados'}</Text>
              </View>
            </View>
          </View>
        </View>
        <View style={[styles.rodapeAcaoDuplo, { borderTopColor: tema.borda }]}>
          <TouchableOpacity style={styles.btnRodapeSec} onPress={() => setTurmaAlunosModal(item)}>
            <Ionicons name="people-outline" size={16} color={tema.textoPrincipal} />
            <Text style={{ color: tema.textoPrincipal, fontSize: 12, fontWeight: '700' }}>Ver Alunos</Text>
          </TouchableOpacity>
          <View style={[styles.divisorRodape, { backgroundColor: tema.borda }]} />
          <TouchableOpacity style={[styles.btnRodapePrim, { opacity: isBloqueado ? 0.55 : 1 }]} disabled={isBloqueado} onPress={() => router.push(`/chamada?id=${item.id}`)}>
            <Ionicons name={isRealizada ? 'checkmark-done-outline' : isBloqueado ? 'lock-closed-outline' : 'checkbox-outline'} size={16} color={isRealizada ? '#2E7D32' : isBloqueado ? tema.textoSecundario : tema.botaoPrimario} />
            <Text style={{ color: isRealizada ? '#2E7D32' : isBloqueado ? tema.textoSecundario : tema.botaoPrimario, fontSize: 12, fontWeight: '700' }} numberOfLines={1}>
              {isRealizada ? `Chamada (${horaRealizada})` : isBloqueado ? 'Fora do dia' : 'Fazer Chamada'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  // === INTERFACE ===
  return (
    <KeyboardAvoidingView style={[styles.container, { backgroundColor: tema.fundoBase }]} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      {/* Cabeçalho, Filtros e Busca */}
      <View style={[styles.header, { backgroundColor: tema.fundoTopo, paddingTop: paddingTopo, paddingHorizontal: paddingLateral }]}>
        <View style={styles.topoLinha}>
          <View style={styles.topoEsquerda}>
            {isAdmin && (
              <TouchableOpacity onPress={voltar} style={styles.btnVoltar} accessibilityLabel="Voltar">
                <Ionicons name="arrow-back" size={22} color={tema.textoLogo} />
              </TouchableOpacity>
            )}
            <Text
              style={[styles.tituloHeader, { color: tema.textoLogo, fontSize: isTelaPequena ? 19 : 22 }]}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {isAdmin ? 'Turmas Cadastradas' : isCoord ? 'Turmas e Alunos' : 'Grade de Aulas'}
            </Text>
          </View>
          {isAdmin ? (
            <TouchableOpacity
              style={[
                styles.btnAddTopo,
                {
                  backgroundColor: tema.botaoPrimario,
                  paddingHorizontal: isTelaPequena ? 9 : 12,
                  paddingVertical: isTelaPequena ? 6 : 7,
                },
              ]}
              onPress={abrirCriarTurma}
            >
              <Ionicons name="add" size={isTelaPequena ? 16 : 18} color={tema.textoBotao} />
              <Text style={{ color: tema.textoBotao, fontSize: isTelaPequena ? 11 : 12, fontWeight: '700' }} numberOfLines={1}>
                Nova Turma
              </Text>
            </TouchableOpacity>
          ) : (
            <Text style={{ color: tema.textoLogo, opacity: 0.75, fontSize: 12, flexShrink: 0 }}>{NOMES_PERFIS[perfil]}</Text>
          )}
        </View>
        <Text style={[styles.subtituloData, { color: tema.textoLogo }]}>{dataHeader}</Text>
        <Text style={[styles.subtituloPerfil, { color: tema.textoLogo }]}>
          {isAdmin ? 'Controle de turmas e alunos vinculados' : isCoord ? 'Dashboard por série, pastas de alunos e transferências' : 'Suas aulas da semana, alunos e chamadas'} · Modo demonstração
        </Text>
        {isAdmin && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filtrosTurno}>
            {FILTROS_TURNO.map(t => {
              const ativo = turnoFiltro === t;
              return (
                <TouchableOpacity key={t} onPress={() => setTurnoFiltro(t)} style={[styles.chipTurno, { backgroundColor: ativo ? tema.botaoPrimario : tema.inputBackground, borderColor: ativo ? tema.botaoPrimario : tema.borda }]}>
                  <Text style={{ color: ativo ? tema.textoBotao : tema.textoPrincipal, fontSize: 12, fontWeight: '600' }}>{t}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}
        {isProf && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filtrosTurno}>
            {FILTROS_DIA_PROF.map(d => {
              const ativo = diaFiltroProf === d.key;
              return (
                <TouchableOpacity key={String(d.key)} onPress={() => setDiaFiltroProf(d.key)} style={[styles.chipTurno, { backgroundColor: ativo ? tema.botaoPrimario : tema.inputBackground, borderColor: ativo ? tema.botaoPrimario : tema.borda }]}>
                  <Text style={{ color: ativo ? tema.textoBotao : tema.textoPrincipal, fontSize: 12, fontWeight: '700' }}>{d.label}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}
        <View style={styles.rowBuscaFiltro}>
          <View style={[styles.searchContainer, { flex: 1, backgroundColor: tema.inputBackground, borderColor: tema.borda }]}>
            <Ionicons name="search" size={20} color={tema.textoSecundario} style={styles.searchIcon} />
            <TextInput style={[styles.searchInput, { color: tema.textoPrincipal }]} placeholder={isAdmin ? 'Buscar turma ou turno...' : isCoord ? 'Buscar turma, turno ou aluno...' : 'Buscar turma, matéria ou horário...'} placeholderTextColor={tema.textoSecundario} value={busca} onChangeText={setBusca} />
          </View>
          {isCoord && (
            <TouchableOpacity style={[styles.btnFiltroHeader, { backgroundColor: temFiltroAtivoCoord ? tema.botaoPrimario : tema.inputBackground, borderColor: temFiltroAtivoCoord ? tema.botaoPrimario : tema.borda }]} onPress={() => setModalFiltroCoord(true)} accessibilityLabel="Filtrar séries e turnos">
              <Ionicons name="options-outline" size={20} color={temFiltroAtivoCoord ? tema.textoBotao : tema.textoPrincipal} />
            </TouchableOpacity>
          )}
        </View>
        {isCoord && temFiltroAtivoCoord && (
          <View style={styles.barraFiltroAtivo}>
            <Text style={{ color: tema.textoLogo, fontSize: 12, opacity: 0.9, flex: 1, marginRight: 8 }} numberOfLines={1}>
              Filtro: <Text style={{ fontWeight: 'bold' }}>{salaSelecionadaObj ? salaSelecionadaObj.nome : serieFiltroCoord} • {turnoFiltro}</Text>
            </Text>
            <TouchableOpacity onPress={limparFiltrosCoord}><Text style={{ color: tema.botaoPrimario, fontSize: 12, fontWeight: 'bold' }}>Limpar</Text></TouchableOpacity>
          </View>
        )}
      </View>

      {/* Lista Principal */}
      {carregando ? (
        <View style={styles.centro}>
          <ActivityIndicator size="large" color={tema.botaoPrimario} />
          <Text style={{ marginTop: 10, color: tema.textoSecundario }}>{isAdmin || isCoord ? 'Carregando turmas...' : 'Carregando Grade...'}</Text>
        </View>
      ) : (
        <FlatList
          data={turmasFiltradas}
          keyExtractor={item => item.id}
          renderItem={isAdmin ? renderPastaAdmin : isCoord ? renderPastaCoord : renderTurmaDocente}
          contentContainerStyle={[styles.listContent, { paddingHorizontal: paddingLateral }]}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={carregando} onRefresh={() => void buscarDadosTurmas()} tintColor={tema.botaoPrimario} />}
          ListHeaderComponent={
            isAdmin ? (
              <View style={[styles.resumoRow, { gap: isTelaPequena ? 8 : 10 }]}>
                {[
                  { icone: 'layers-outline' as const, valor: turmasFiltradas.length, label: 'Turmas Cadastradas', pill: 'Total', cor: tema.botaoPrimario },
                  { icone: 'folder-outline' as const, valor: totalTurmasComAlunos, label: 'Turmas com Alunos', pill: 'Ativas', cor: tema.botaoPrimario },
                  { icone: 'school-outline' as const, valor: totalAlunosVinculados, label: 'Alunos Vinculados', pill: 'Ativos', cor: '#2E7D32' },
                ].map(card => (
                  <View key={card.label} style={[styles.cardResumo, { backgroundColor: tema.inputBackground, borderColor: tema.borda, padding: isTelaPequena ? 10 : 14 }]}>
                    <Ionicons name={card.icone} size={isTelaPequena ? 18 : 20} color={tema.botaoPrimario} />
                    <Text style={[styles.valorResumo, { color: tema.textoPrincipal, fontSize: isTelaPequena ? 19 : 22 }]}>{card.valor}</Text>
                    <Text style={[styles.labelResumo, { color: tema.textoSecundario }]} numberOfLines={2}>{card.label}</Text>
                    <View style={[styles.pillResumo, { backgroundColor: card.cor + '20' }]}><Text style={{ color: card.cor, fontSize: 10, fontWeight: 'bold' }}>{card.pill}</Text></View>
                  </View>
                ))}
              </View>
            ) : isCoord ? (
              <View style={[styles.resumoRow, { gap: isTelaPequena ? 8 : 10 }]}>
                {[
                  { icone: 'school-outline' as const, valor: totalAlunosVinculados, label: salaSelecionadaObj ? `Alunos (${salaSelecionadaObj.nome})` : serieFiltroCoord === 'Todas' ? 'Alunos em Geral' : `Alunos (${serieFiltroCoord})`, pill: 'Matriculados', cor: '#2E7D32' },
                  { icone: 'people-outline' as const, valor: totalProfessoresCoord, label: 'Professores', pill: 'Ativos', cor: '#6366F1' },
                  { icone: 'layers-outline' as const, valor: turmasFiltradas.length, label: 'Turmas', pill: turnoFiltro === 'Todos' ? 'Geral' : turnoFiltro, cor: tema.botaoPrimario },
                ].map(card => (
                  <View key={card.label} style={[styles.cardResumo, { backgroundColor: tema.inputBackground, borderColor: tema.borda, padding: isTelaPequena ? 10 : 14 }]}>
                    <Ionicons name={card.icone} size={isTelaPequena ? 18 : 20} color={tema.botaoPrimario} />
                    <Text style={[styles.valorResumo, { color: tema.textoPrincipal, fontSize: isTelaPequena ? 19 : 22 }]}>{card.valor}</Text>
                    <Text style={[styles.labelResumo, { color: tema.textoSecundario }]} numberOfLines={2}>{card.label}</Text>
                    <View style={[styles.pillResumo, { backgroundColor: card.cor + '20' }]}><Text style={{ color: card.cor, fontSize: 10, fontWeight: 'bold' }}>{card.pill}</Text></View>
                  </View>
                ))}
              </View>
            ) : (
              <View style={[styles.resumoRow, { gap: isTelaPequena ? 8 : 10 }]}>
                {[
                  { icone: 'today-outline' as const, valor: kpisProf.aulasHoje, label: 'Aulas Hoje', pill: 'Dia', cor: tema.botaoPrimario },
                  { icone: 'time-outline' as const, valor: kpisProf.pendentesHoje, label: 'Chamadas', pill: kpisProf.pendentesHoje > 0 ? 'Pendentes' : 'Em dia', cor: kpisProf.pendentesHoje > 0 ? '#EF6C00' : '#2E7D32' },
                  { icone: 'calendar-outline' as const, valor: kpisProf.totalSemana, label: 'Na Semana', pill: 'Grade', cor: '#6366F1' },
                ].map(card => (
                  <View key={card.label} style={[styles.cardResumo, { backgroundColor: tema.inputBackground, borderColor: tema.borda, padding: isTelaPequena ? 10 : 14 }]}>
                    <Ionicons name={card.icone} size={isTelaPequena ? 18 : 20} color={card.cor} />
                    <Text style={[styles.valorResumo, { color: tema.textoPrincipal, fontSize: isTelaPequena ? 19 : 22 }]}>{card.valor}</Text>
                    <Text style={[styles.labelResumo, { color: tema.textoSecundario }]} numberOfLines={2}>{card.label}</Text>
                    <View style={[styles.pillResumo, { backgroundColor: card.cor + '20' }]}><Text style={{ color: card.cor, fontSize: 10, fontWeight: 'bold' }}>{card.pill}</Text></View>
                  </View>
                ))}
              </View>
            )
          }
          ListEmptyComponent={
            <View style={{ alignItems: 'center', marginTop: 30 }}>
              <Ionicons name="calendar-outline" size={38} color={tema.textoSecundario} />
              <Text style={{ color: tema.textoPrincipal, fontWeight: '700', fontSize: 15, marginTop: 10 }}>Nenhuma turma encontrada</Text>
              <Text style={{ textAlign: 'center', marginTop: 4, color: tema.textoSecundario, fontSize: 12 }}>
                {isProf ? 'Nenhuma aula alocada para este filtro ou dia da semana.' : 'Tente ajustar os filtros de busca.'}
              </Text>
            </View>
          }
        />
      )}

      {/* Modal: Lista de Alunos da Turma (Professor) */}
      <Modal visible={turmaAlunosModal !== null} transparent animationType="slide" onRequestClose={() => setTurmaAlunosModal(null)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalConteudo, { backgroundColor: tema.fundoBase, borderColor: tema.borda, paddingBottom: paddingBaseModal }]}>
            <View style={[styles.modalHeader, { borderBottomColor: tema.borda }]}>
              <View style={{ flex: 1, marginRight: 10 }}>
                <Text style={[styles.modalTitulo, { color: tema.textoPrincipal }]}>{turmaAlunosModal?.nome || 'Turma'}</Text>
                <Text style={{ color: tema.textoSecundario, fontSize: 12, marginTop: 2 }}>
                  {turmaAlunosModal?.disciplina || turmaAlunosModal?.materia} • {turmaAlunosModal?.diaSemana} ({turmaAlunosModal?.horario})
                </Text>
              </View>
              <TouchableOpacity onPress={() => setTurmaAlunosModal(null)}><Ionicons name="close" size={24} color={tema.textoSecundario} /></TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={{ padding: 20 }}>
              {turmaAlunosModal && obterAlunosDaTurma(turmaAlunosModal).length === 0 ? (
                <View style={{ alignItems: 'center', paddingVertical: 30 }}>
                  <Ionicons name="people-outline" size={38} color={tema.textoSecundario} />
                  <Text style={{ color: tema.textoPrincipal, fontWeight: '700', fontSize: 14, marginTop: 8 }}>Nenhum aluno matriculado</Text>
                  <Text style={{ color: tema.textoSecundario, fontSize: 12, marginTop: 4, textAlign: 'center' }}>Os alunos matriculados pela coordenação nesta turma aparecerão aqui.</Text>
                </View>
              ) : (
                turmaAlunosModal && obterAlunosDaTurma(turmaAlunosModal).map((aluno: any) => (
                  <View key={aluno.id} style={[styles.cardAlunoClean, { backgroundColor: tema.inputBackground, borderColor: tema.borda }]}>
                    <View style={[styles.iconePessoa, { backgroundColor: tema.botaoPrimario + '20' }]}>
                      <Text style={{ color: tema.botaoPrimario, fontSize: 11, fontWeight: '800' }}>{obterIniciais(aluno.nome)}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.nomeAlunoClean, { color: tema.textoPrincipal }]}>{aluno.nome}</Text>
                      {!!aluno.matricula && <Text style={{ color: tema.textoSecundario, fontSize: 11 }}>Mat. {aluno.matricula}</Text>}
                    </View>
                  </View>
                ))
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Modal: Filtros de Série e Turno (Coordenador) */}
      <Modal visible={modalFiltroCoord} transparent animationType="slide" onRequestClose={() => setModalFiltroCoord(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalConteudo, { backgroundColor: tema.fundoBase, borderColor: tema.borda, paddingBottom: paddingBaseModal }]}>
            <View style={[styles.modalHeader, { borderBottomColor: tema.borda }]}>
              <Text style={[styles.modalTitulo, { color: tema.textoPrincipal }]}>Filtrar Turmas</Text>
              <TouchableOpacity onPress={() => setModalFiltroCoord(false)}><Ionicons name="close" size={24} color={tema.textoSecundario} /></TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={{ padding: 20 }}>
              <Text style={[styles.labelCampo, { color: tema.textoSecundario }]}>Turno</Text>
              <View style={styles.linhaTurnosModal}>
                {FILTROS_TURNO.map(t => {
                  const sel = turnoFiltro === t;
                  return (
                    <TouchableOpacity key={t} onPress={() => selecionarTurnoFiltroCoord(t)} style={[styles.chipTurnoModal, { backgroundColor: sel ? tema.botaoPrimario + '20' : tema.inputBackground, borderColor: sel ? tema.botaoPrimario : tema.borda }]}>
                      <Text style={{ color: sel ? tema.botaoPrimario : tema.textoPrincipal, fontSize: 11, fontWeight: '700' }}>{t}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              <Text style={[styles.labelCampo, { color: tema.textoSecundario }]}>Série / Sala (Pastas)</Text>
              <TouchableOpacity onPress={() => { setSerieFiltroCoord('Todas'); setTurmaFiltroCoord(''); setSerieExpandidaFiltro(null); }} style={[styles.itemFiltroLista, { backgroundColor: serieFiltroCoord === 'Todas' ? tema.botaoPrimario + '18' : tema.inputBackground, borderColor: serieFiltroCoord === 'Todas' ? tema.botaoPrimario : tema.borda }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <Ionicons name="layers-outline" size={18} color={serieFiltroCoord === 'Todas' ? tema.botaoPrimario : tema.textoSecundario} />
                  <Text style={{ color: serieFiltroCoord === 'Todas' ? tema.botaoPrimario : tema.textoPrincipal, fontWeight: serieFiltroCoord === 'Todas' ? '700' : '500', fontSize: 14 }}>Todas as séries</Text>
                </View>
                {serieFiltroCoord === 'Todas' && <Ionicons name="checkmark-circle" size={18} color={tema.botaoPrimario} />}
              </TouchableOpacity>
              {seriesComSalasCoord.map(({ serie, salas }) => {
                const temVariasSalas = salas.length > 1;
                const serieSelecionada = serieFiltroCoord === serie;
                const aberta = serieExpandidaFiltro === serie && temVariasSalas;
                return (
                  <View key={serie} style={{ marginBottom: 8 }}>
                    <TouchableOpacity onPress={() => selecionarSeriePastaFiltro(serie, salas.length)} style={[styles.itemFiltroLista, { marginBottom: 0, backgroundColor: serieSelecionada ? tema.botaoPrimario + '18' : tema.inputBackground, borderColor: serieSelecionada ? tema.botaoPrimario : tema.borda }]}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                        <Ionicons name={aberta ? 'folder-open' : 'folder'} size={18} color={serieSelecionada ? tema.botaoPrimario : tema.textoSecundario} />
                        <View>
                          <Text style={{ color: serieSelecionada ? tema.botaoPrimario : tema.textoPrincipal, fontWeight: serieSelecionada ? '700' : '500', fontSize: 14 }}>{serie}</Text>
                          {temVariasSalas && <Text style={{ color: tema.textoSecundario, fontSize: 11 }}>{salas.length} salas disponíveis</Text>}
                        </View>
                      </View>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        {serieSelecionada && !turmaFiltroCoord && <Ionicons name="checkmark-circle" size={18} color={tema.botaoPrimario} />}
                        {temVariasSalas && <Ionicons name={aberta ? 'chevron-down' : 'chevron-forward'} size={18} color={tema.textoSecundario} />}
                      </View>
                    </TouchableOpacity>
                    {aberta && (
                      <View style={[styles.subPastaFiltro, { borderLeftColor: tema.borda }]}>
                        <TouchableOpacity onPress={() => { setSerieFiltroCoord(serie); setTurmaFiltroCoord(''); }} style={[styles.subItemFiltro, { backgroundColor: serieSelecionada && !turmaFiltroCoord ? tema.botaoPrimario + '15' : tema.inputBackground, borderColor: serieSelecionada && !turmaFiltroCoord ? tema.botaoPrimario : tema.borda }]}>
                          <Text style={{ color: serieSelecionada && !turmaFiltroCoord ? tema.botaoPrimario : tema.textoPrincipal, fontSize: 13, fontWeight: '600' }}>Todas de {serie}</Text>
                          {serieSelecionada && !turmaFiltroCoord && <Ionicons name="checkmark" size={16} color={tema.botaoPrimario} />}
                        </TouchableOpacity>
                        {salas.map(sala => {
                          const salaSel = turmaFiltroCoord === sala.id;
                          return (
                            <TouchableOpacity key={sala.id} onPress={() => { setSerieFiltroCoord(serie); setTurmaFiltroCoord(sala.id); }} style={[styles.subItemFiltro, { backgroundColor: salaSel ? tema.botaoPrimario + '18' : tema.inputBackground, borderColor: salaSel ? tema.botaoPrimario : tema.borda }]}>
                              <View>
                                <Text style={{ color: salaSel ? tema.botaoPrimario : tema.textoPrincipal, fontSize: 13, fontWeight: salaSel ? '700' : '500' }}>{sala.nome}</Text>
                                <Text style={{ color: tema.textoSecundario, fontSize: 11 }}>{sala.turno || 'Matutino'}</Text>
                              </View>
                              {salaSel && <Ionicons name="checkmark-circle" size={17} color={tema.botaoPrimario} />}
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    )}
                  </View>
                );
              })}
              <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
                <TouchableOpacity style={[styles.btnSecundarioFiltro, { backgroundColor: tema.inputBackground, borderColor: tema.borda }]} onPress={limparFiltrosCoord}>
                  <Text style={{ color: tema.textoPrincipal, fontWeight: '700', fontSize: 13 }}>Limpar</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.btnSalvar, { flex: 1.5, backgroundColor: tema.botaoPrimario }]} onPress={() => setModalFiltroCoord(false)}>
                  <Text style={{ color: tema.textoBotao, fontWeight: '700', fontSize: 14 }}>Aplicar Filtros</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Modal: Criar / Editar Turma (Admin) */}
      <Modal visible={modalFormTurma} transparent animationType="slide" onRequestClose={() => setModalFormTurma(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalConteudo, { backgroundColor: tema.fundoBase, borderColor: tema.borda, paddingBottom: paddingBaseModal }]}>
            <View style={[styles.modalHeader, { borderBottomColor: tema.borda }]}>
              <Text style={[styles.modalTitulo, { color: tema.textoPrincipal }]}>{turmaEditandoId ? 'Editar Turma' : 'Nova Turma'}</Text>
              <TouchableOpacity onPress={() => setModalFormTurma(false)}><Ionicons name="close" size={24} color={tema.textoSecundario} /></TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={{ padding: 20 }}>
              <Text style={[styles.labelCampo, { color: tema.textoSecundario }]}>Nome da Turma / Série</Text>
              <TextInput value={formTurma.nome} onChangeText={v => setFormTurma(prev => ({ ...prev, nome: v }))} placeholder="Ex: 6º Ano A" placeholderTextColor={tema.textoSecundario} style={[styles.inputModal, { backgroundColor: tema.inputBackground, color: tema.textoPrincipal, borderColor: tema.borda }]} />
              <Text style={[styles.labelCampo, { color: tema.textoSecundario }]}>Turno</Text>
              <View style={styles.linhaTurnosModal}>
                {TURNOS.map(t => {
                  const sel = formTurma.turno === t;
                  return (
                    <TouchableOpacity key={t} onPress={() => setFormTurma(prev => ({ ...prev, turno: t }))} style={[styles.chipTurnoModal, { backgroundColor: sel ? tema.botaoPrimario + '20' : tema.inputBackground, borderColor: sel ? tema.botaoPrimario : tema.borda }]}>
                      <Text style={{ color: sel ? tema.botaoPrimario : tema.textoPrincipal, fontSize: 12, fontWeight: '700' }}>{t}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              <TouchableOpacity style={[styles.btnSalvar, { backgroundColor: tema.botaoPrimario }]} onPress={() => void salvarTurma()} disabled={salvando}>
                <Text style={{ color: tema.textoBotao, fontWeight: '700', fontSize: 14 }}>{salvando ? 'Salvando...' : turmaEditandoId ? 'Salvar alterações' : 'Criar turma'}</Text>
              </TouchableOpacity>
              {turmaEditandoId && (
                <TouchableOpacity style={[styles.btnExcluir, { backgroundColor: confirmarExclusao ? '#C6282820' : tema.inputBackground, borderColor: confirmarExclusao ? '#C62828' : tema.borda }]} onPress={() => { const atual = turmas.find(t => t.id === turmaEditandoId); if (atual) void excluirTurma(atual); }} disabled={salvando}>
                  <Ionicons name="trash-outline" size={18} color="#C62828" />
                  <Text style={{ color: '#C62828', fontWeight: '700', fontSize: 13 }}>{confirmarExclusao ? 'Confirmar exclusão da turma' : 'Excluir turma'}</Text>
                </TouchableOpacity>
              )}
            </ScrollView>
          </View>
          <FeedbackToast {...toastProps} />
        </View>
      </Modal>

      {/* Modal: Transferir Aluno (Coordenador) */}
      <Modal visible={alunoTransferir !== null} transparent animationType="slide" onRequestClose={() => setAlunoTransferir(null)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalConteudo, { backgroundColor: tema.fundoBase, borderColor: tema.borda, paddingBottom: paddingBaseModal }]}>
            <View style={[styles.modalHeader, { borderBottomColor: tema.borda }]}>
              <Text style={[styles.modalTitulo, { color: tema.textoPrincipal }]}>Transferir Aluno</Text>
              <TouchableOpacity onPress={() => setAlunoTransferir(null)}><Ionicons name="close" size={24} color={tema.textoSecundario} /></TouchableOpacity>
            </View>
            {alunoTransferir && (
              <ScrollView contentContainerStyle={{ padding: 20 }}>
                <Text style={{ color: tema.textoPrincipal, fontSize: 15, fontWeight: '700', marginBottom: 4 }}>{alunoTransferir.aluno.nome}</Text>
                <Text style={{ color: tema.textoSecundario, fontSize: 12, marginBottom: 16 }}>Sala atual: {alunoTransferir.turmaOrigem.nome} ({alunoTransferir.turmaOrigem.turno || 'Matutino'})</Text>
                <Text style={[styles.labelCampo, { color: tema.textoSecundario }]}>Selecione a nova sala *</Text>
                {turmas.filter(t => t.id !== alunoTransferir.turmaOrigem.id).map(t => {
                  const sel = turmaDestinoId === t.id;
                  return (
                    <TouchableOpacity key={t.id} onPress={() => setTurmaDestinoId(t.id)} style={[styles.cardAlunoClean, { backgroundColor: sel ? tema.botaoPrimario + '20' : tema.inputBackground, borderColor: sel ? tema.botaoPrimario : tema.borda }]}>
                      <Ionicons name="school-outline" size={18} color={sel ? tema.botaoPrimario : tema.textoSecundario} style={{ marginRight: 10 }} />
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: sel ? tema.botaoPrimario : tema.textoPrincipal, fontWeight: '700', fontSize: 14 }}>{t.nome}</Text>
                        <Text style={{ color: tema.textoSecundario, fontSize: 11 }}>{t.turno || 'Matutino'} • {obterAlunosDaTurma(t).length} aluno(s)</Text>
                      </View>
                      {sel && <Ionicons name="checkmark-circle" size={20} color={tema.botaoPrimario} />}
                    </TouchableOpacity>
                  );
                })}
                <TouchableOpacity style={[styles.btnSalvar, { backgroundColor: tema.botaoPrimario, marginTop: 10 }]} onPress={() => void confirmarTransferenciaAluno()} disabled={salvando}>
                  <Text style={{ color: tema.textoBotao, fontWeight: '700', fontSize: 14 }}>{salvando ? 'Transferindo...' : 'Confirmar Transferência'}</Text>
                </TouchableOpacity>
              </ScrollView>
            )}
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
  centro: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { paddingBottom: 18, elevation: 5, borderBottomLeftRadius: 20, borderBottomRightRadius: 20 },
  topoLinha: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10 },
  topoEsquerda: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1, minWidth: 0 },
  btnVoltar: { padding: 2, flexShrink: 0 },
  btnAddTopo: { flexDirection: 'row', alignItems: 'center', borderRadius: 10, gap: 4, flexShrink: 0 },
  tituloHeader: { fontWeight: 'bold', flex: 1 },
  subtituloData: { fontSize: 13, opacity: 0.8, marginBottom: 2, marginTop: 4 },
  subtituloPerfil: { fontSize: 11, opacity: 0.75, marginBottom: 14 },
  filtrosTurno: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  chipTurno: { borderWidth: 1, borderRadius: 16, paddingHorizontal: 12, paddingVertical: 6 },
  rowBuscaFiltro: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  searchContainer: { flexDirection: 'row', alignItems: 'center', height: 45, borderRadius: 10, borderWidth: 1, paddingHorizontal: 10 },
  btnFiltroHeader: { width: 45, height: 45, borderRadius: 10, borderWidth: 1, justifyContent: 'center', alignItems: 'center' },
  barraFiltroAtivo: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, paddingHorizontal: 4 },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, height: '100%', fontSize: 14 },
  listContent: { paddingVertical: 20, paddingBottom: 40 },
  resumoRow: { flexDirection: 'row', marginBottom: 18 },
  cardResumo: { flex: 1, borderWidth: 1, borderRadius: 12, alignItems: 'center' },
  valorResumo: { fontWeight: 'bold', marginTop: 6 },
  labelResumo: { fontSize: 11, marginTop: 2, textAlign: 'center' },
  pillResumo: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, marginTop: 8 },
  cardPasta: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1, borderRadius: 12, padding: 15 },
  linhaTituloPasta: { flexDirection: 'row', alignItems: 'center', flex: 1, minWidth: 0, marginRight: 10 },
  tituloPasta: { fontSize: 16, fontWeight: 'bold' },
  conteudoPasta: { paddingLeft: 15, paddingTop: 10, borderLeftWidth: 2, marginLeft: 15, marginTop: 5 },
  cardAlunoClean: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 12, padding: 12, marginBottom: 8 },
  iconePessoa: { width: 34, height: 34, borderRadius: 17, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  nomeAlunoClean: { fontSize: 15, fontWeight: '600' },
  btnTransferir: { flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 5 },
  cardTurma: { borderWidth: 1, borderRadius: 12, marginBottom: 14, overflow: 'hidden' },
  corpoCard: { flexDirection: 'row', padding: 15, alignItems: 'center' },
  iconeTurmaBg: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', marginRight: 14 },
  infoTurma: { flex: 1 },
  linhaTitulo: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 6 },
  nomeTurma: { fontSize: 16, fontWeight: 'bold' },
  badgeHoje: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  badgeStatus: { borderWidth: 1, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12 },
  textoBadge: { fontSize: 10, fontWeight: 'bold' },
  materiaTurma: { fontSize: 13, marginTop: 2 },
  detalhesGrade: { gap: 2, marginTop: 6 },
  detalheRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 2 },
  textoDetalhe: { fontSize: 12 },
  textoHorario: { fontSize: 12, fontWeight: 'bold' },
  rodapeAcaoDuplo: { flexDirection: 'row', alignItems: 'center', borderTopWidth: 1, height: 42 },
  btnRodapeSec: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, height: '100%' },
  btnRodapePrim: { flex: 1.2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, height: '100%' },
  divisorRodape: { width: 1, height: '55%' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
  modalConteudo: { maxHeight: '85%', borderTopLeftRadius: 22, borderTopRightRadius: 22, borderWidth: 1 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1 },
  modalTitulo: { fontSize: 18, fontWeight: 'bold' },
  labelCampo: { fontSize: 12, fontWeight: '700', marginBottom: 6 },
  inputModal: { borderWidth: 1, borderRadius: 10, height: 44, paddingHorizontal: 12, fontSize: 14, marginBottom: 14 },
  linhaTurnosModal: { flexDirection: 'row', gap: 8, marginBottom: 18 },
  chipTurnoModal: { flex: 1, height: 40, borderWidth: 1, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  itemFiltroLista: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, marginBottom: 8 },
  subPastaFiltro: { paddingLeft: 14, marginLeft: 14, marginTop: 6, borderLeftWidth: 2, gap: 6 },
  subItemFiltro: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10 },
  btnSecundarioFiltro: { flex: 1, height: 46, borderWidth: 1, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  btnSalvar: { height: 46, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  btnExcluir: { flexDirection: 'row', height: 44, borderWidth: 1, borderRadius: 10, justifyContent: 'center', alignItems: 'center', gap: 8, marginTop: 10 },
});