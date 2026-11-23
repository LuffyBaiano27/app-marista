import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, useColorScheme,
  useWindowDimensions, Modal, FlatList, RefreshControl, ActivityIndicator,
  TextInput, Alert, Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { cores } from '../../constants/colors';
import { useRouter } from 'expo-router';
import { useDemoProfile, type DemoProfile } from '../../contexts/demoProfileContext';
import { collection, getDocs, addDoc, query, where, serverTimestamp } from 'firebase/firestore';
import { db } from '../../config/firebase';

const PERFIS_DEMONSTRATIVOS: Record<DemoProfile, { nome: string; cargo: string }> = {
  admin: { nome: 'Marina', cargo: 'Administradora' },
  coordenador: { nome: 'Camila', cargo: 'Coordenadora' },
  professor: { nome: 'Luffy Baiano', cargo: 'Professor' },
};

const ID_PROFESSOR_DEMONSTRATIVO = 'prof_1';

const INDICADORES_COORDENACAO = [
  { id: 'chamadas', titulo: 'Chamadas acompanhadas', valor: '18', icone: 'checkmark-done' as const },
  { id: 'avaliacoes', titulo: 'Avaliações pendentes', valor: '4', icone: 'document-text' as const },
];

const DIAS_SEMANA = [
  { id: 1, nome: 'Segunda' }, { id: 2, nome: 'Terça' },
  { id: 3, nome: 'Quarta' }, { id: 4, nome: 'Quinta' }, { id: 5, nome: 'Sexta' },
];

const TURNOS = ['Matutino', 'Vespertino', 'Noturno'] as const;

const FRASES = [
  "A educação é a arma mais poderosa que você pode usar para mudar o mundo. - Nelson Mandela",
  "Educação não transforma o mundo. Educação muda as pessoas. - Paulo Freire",
];

const alerta = (titulo: string, msg: string) =>
  Platform.OS === 'web' ? window.alert(`${titulo}\n\n${msg}`) : Alert.alert(titulo, msg);

const gerarSenhaInicial = (nome: string, cpf: string) => {
  const primeiroNome = nome.trim().split(/\s+/)[0].normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const digitosCpf = cpf.replace(/\D/g, '');
  return `${primeiroNome.slice(0, 4) || 'user'}@${digitosCpf.slice(0, 4) || '2026'}`;
};

export default function DashboardScreen() {
  const router = useRouter();
  const { perfil } = useDemoProfile();
  const { width: larguraTela } = useWindowDimensions();
  const tema = useColorScheme() === 'dark' ? cores.dark : cores.light;
  const perfilDemonstrativo = PERFIS_DEMONSTRATIVOS[perfil];
  const larguraColunaDia = Math.min(240, Math.max(190, larguraTela * 0.62));

  const [saudacaoTempo, setSaudacaoTempo] = useState('Olá');
  const [fraseMotivacional, setFraseMotivacional] = useState(FRASES[0]);

  // ESTADOS FIREBASE
  const [todasTurmas, setTodasTurmas] = useState<any[]>([]);
  const [totalEquipeAtiva, setTotalEquipeAtiva] = useState(0);
  const [chamadosPendentes, setChamadosPendentes] = useState(0);
  const [chamadasRealizadasHoje, setChamadasRealizadasHoje] = useState<string[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [sincronizando, setSincronizando] = useState(false);
  const [ultimaSinc, setUltimaSinc] = useState('');

  // MODAIS
  const [modalNotificacoes, setModalNotificacoes] = useState(false);
  const [modalUsuario, setModalUsuario] = useState(false);
  const [modalTurma, setModalTurma] = useState(false);
  const [salvando, setSalvando] = useState(false);

  // FORM: NOVO USUÁRIO
  const [formUser, setFormUser] = useState({
    nome: '',
    email: '',
    cpf: '',
    role: 'professor' as 'professor' | 'coordenador',
    disciplina: '',
  });

  // FORM: NOVA TURMA
  const [formTurma, setFormTurma] = useState({
    nome: '',
    turno: 'Matutino' as (typeof TURNOS)[number],
  });

  const [notificacoes] = useState([
    { id: '1', titulo: 'Notificação demonstrativa', mensagem: 'Esta é uma notificação de exemplo.', lida: false, tipo: 'sucesso' },
  ]);
  const totalNaoLidas = notificacoes.filter(n => !n.lida).length;

  const getDataDeHoje = () => new Date().toISOString().split('T')[0];

  const buscarDadosDoFirebase = async (manual = false) => {
    if (manual) setSincronizando(true);
    setCarregando(true);
    try {
      const turmasRef = collection(db, 'turmas');
      const qTurmas = perfil === 'professor'
        ? query(turmasRef, where('professorId', '==', ID_PROFESSOR_DEMONSTRATIVO))
        : query(turmasRef);
      const turmasSnap = await getDocs(qTurmas);
      setTodasTurmas(turmasSnap.docs.map(d => ({ id: d.id, ...d.data() })));

      const qChamadas = query(collection(db, 'chamadas'), where('dataChamadaFormatada', '==', getDataDeHoje()));
      const chamadasSnap = await getDocs(qChamadas);
      setChamadasRealizadasHoje(chamadasSnap.docs.map(d => d.data().turmaId));

      if (perfil === 'admin') {
        try {
          const usersSnap = await getDocs(collection(db, 'usuarios'));
          const todosUsers = usersSnap.docs.map(d => ({ id: d.id, ...d.data() })) as any[];
          const equipeAtiva = todosUsers.filter(
            u => (u.role === 'professor' || u.role === 'coordenador') && u.ativo !== false
          );
          setTotalEquipeAtiva(equipeAtiva.length);
        } catch {
          setTotalEquipeAtiva(0);
        }
        try {
          const chSnap = await getDocs(query(collection(db, 'chamados_suporte'), where('status', '==', 'pendente')));
          setChamadosPendentes(chSnap.size);
        } catch {
          setChamadosPendentes(0);
        }
      }

      const agora = new Date();
      setUltimaSinc(`${String(agora.getHours()).padStart(2, '0')}:${String(agora.getMinutes()).padStart(2, '0')}`);
    } catch (error) {
      console.error('Erro ao buscar dados no Firebase:', error);
    } finally {
      setCarregando(false);
      setSincronizando(false);
    }
  };

  useEffect(() => {
    const hora = new Date().getHours();
    setSaudacaoTempo(hora >= 5 && hora < 12 ? 'Bom dia' : hora >= 12 && hora < 18 ? 'Boa tarde' : 'Boa noite');
    setFraseMotivacional(FRASES[Math.floor(Math.random() * FRASES.length)]);
    void buscarDadosDoFirebase();
  }, [perfil]);

  const salvarNovoUsuario = async () => {
    const { nome, email, cpf, role, disciplina } = formUser;
    if (!nome.trim() || !email.trim() || cpf.replace(/\D/g, '').length < 11) {
      return alerta('Campos obrigatórios', 'Preencha nome completo, e-mail válido e CPF (11 dígitos).');
    }
    if (role === 'professor' && !disciplina.trim()) {
      return alerta('Campos obrigatórios', 'Informe a disciplina ministrada pelo professor.');
    }
    const senhaGerada = gerarSenhaInicial(nome, cpf);
    setSalvando(true);
    try {
      await addDoc(collection(db, 'usuarios'), {
        nome: nome.trim(),
        email: email.trim().toLowerCase(),
        cpf: cpf.replace(/\D/g, ''),
        role,
        ...(role === 'professor' ? { disciplina: disciplina.trim() } : {}),
        ativo: true,
        senhaInicialGerada: senhaGerada,
        criadoPor: perfilDemonstrativo.nome,
        criadoEm: serverTimestamp(),
      });
      setModalUsuario(false);
      setFormUser({ nome: '', email: '', cpf: '', role: 'professor', disciplina: '' });
      void buscarDadosDoFirebase();
      alerta(
        'Usuário cadastrado!',
        `Nome: ${nome.trim()}\nCargo: ${role.toUpperCase()}${role === 'professor' ? `\nDisciplina: ${disciplina.trim()}` : ''}\nSenha inicial: ${senhaGerada}`
      );
    } catch {
      alerta('Erro ao salvar', 'Não foi possível gravar o usuário no Firestore. Verifique as permissões.');
    } finally {
      setSalvando(false);
    }
  };

  const salvarNovaTurma = async () => {
    const { nome, turno } = formTurma;
    if (!nome.trim()) {
      return alerta('Campos obrigatórios', 'Preencha o nome da turma / série.');
    }
    setSalvando(true);
    try {
      await addDoc(collection(db, 'turmas'), {
        nome: nome.trim(),
        turno,
        alunos: 0,
        criadoPor: perfilDemonstrativo.nome,
        criadoEm: serverTimestamp(),
      });
      setModalTurma(false);
      setFormTurma({ nome: '', turno: 'Matutino' });
      void buscarDadosDoFirebase();
      alerta('Turma cadastrada!', `${nome.trim()} (${turno}) criada com sucesso.`);
    } catch {
      alerta('Erro ao salvar', 'Não foi possível gravar a turma no Firestore. Verifique as permissões.');
    } finally {
      setSalvando(false);
    }
  };

  const exportarRelatorioCSV = () => {
    if (todasTurmas.length === 0) return alerta('Relatório vazio', 'Nenhuma turma cadastrada para exportar.');
    const cabecalho = 'Turma,Turno,Alunos\n';
    const linhas = todasTurmas
      .map(t => `"${t.nome || ''}","${t.turno || ''}",${t.alunos ?? 0}`)
      .join('\n');
    const csv = cabecalho + linhas;

    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `relatorio-violeta-${getDataDeHoje()}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } else {
      alerta('Relatório Gerado', `Total exportável: ${todasTurmas.length} turmas e ${totalEquipeAtiva} usuários.`);
    }
  };

  const diaAtual = new Date().getDay();
  const diaBusca = diaAtual === 0 || diaAtual === 6 ? 1 : diaAtual;
  const turmasVisiveis = perfil === 'professor' ? todasTurmas.filter(t => t.professorId === ID_PROFESSOR_DEMONSTRATIVO) : todasTurmas;
  const turmasDeHojePendentes = turmasVisiveis
    .filter(t => t.diaId === diaBusca && !chamadasRealizadasHoje.includes(t.id))
    .sort((a, b) => (a.horario || '').localeCompare(b.horario || ''));

  const obterCorMateria = (materia: string) => {
    const paleta: Record<string, { bg: string; text: string }> = {
      'Matemática': { bg: '#FFCC80', text: '#E65100' },
      'Física': { bg: '#90CAF9', text: '#0D47A1' },
      'História': { bg: '#A5D6A7', text: '#1B5E20' },
    };
    return paleta[materia] || { bg: tema.botaoPrimario + '20', text: tema.botaoPrimario };
  };

  const kpisAdmin = [
    { id: 'turmas', titulo: 'Turmas', valor: String(todasTurmas.length), status: 'Ativas', corPill: tema.botaoPrimario, icone: 'people-outline' as const },
    { id: 'equipe', titulo: 'Prof. / Coord.', valor: String(totalEquipeAtiva), status: 'Vinculados', corPill: '#2E7D32', icone: 'person-outline' as const },
    { id: 'chamados', titulo: 'Chamados', valor: String(chamadosPendentes), status: chamadosPendentes > 0 ? 'Pendentes' : 'Em dia', corPill: chamadosPendentes > 0 ? '#EF6C00' : '#2E7D32', icone: 'construct-outline' as const },
  ];

  return (
    <View style={[styles.container, { backgroundColor: tema.fundoBase }]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={carregando} onRefresh={() => void buscarDadosDoFirebase(true)} tintColor={tema.botaoPrimario} />}
      >
        {/* HEADER */}
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.tituloSaudacao, { color: tema.textoPrincipal }]}>
              {saudacaoTempo}, {perfilDemonstrativo.cargo} {perfilDemonstrativo.nome.split(' ')[0]}!
            </Text>
            <View style={[styles.badgeDemonstracao, { backgroundColor: tema.inputBackground }]}>
              <Text style={[styles.textoBadgeDemonstracao, { color: tema.textoSecundario }]}>Modo demonstração</Text>
            </View>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity style={styles.iconButton} onPress={() => setModalNotificacoes(true)}>
              <Ionicons name="notifications-outline" size={24} color={tema.textoPrincipal} />
              {totalNaoLidas > 0 && <View style={styles.notificationBadge}><Text style={styles.badgeText}>{totalNaoLidas}</Text></View>}
            </TouchableOpacity>
            <TouchableOpacity style={[styles.avatar, { backgroundColor: tema.inputBackground, borderColor: tema.borda }]} onPress={() => router.push('/perfil')}>
              <Ionicons name="person" size={20} color={tema.botaoPrimario} />
            </TouchableOpacity>
          </View>
        </View>

        {/* BANNER */}
        <View style={[styles.banner, { backgroundColor: tema.fundoTopo }]}>
          <Text style={[styles.textoBanner, { color: tema.textoLogo }]}>"{fraseMotivacional.split(' - ')[0]}"</Text>
          <Text style={[styles.assinaturaBanner, { color: tema.textoLogo, opacity: 0.8 }]}>{fraseMotivacional.split(' - ')[1]}</Text>
          <Ionicons name="school" size={60} color={tema.textoLogo} style={styles.watermark} />
        </View>

        {/* ==================== VISÃO ADMINISTRADOR ==================== */}
        {perfil === 'admin' && (
          <View>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: tema.textoPrincipal }]}>Resumo administrativo</Text>
            </View>

            <View style={styles.gradeIndicadores}>
              {kpisAdmin.map(kpi => (
                <View key={kpi.id} style={[styles.cardIndicador, { backgroundColor: tema.inputBackground, borderColor: tema.borda }]}>
                  <Ionicons name={kpi.icone} size={22} color={tema.botaoPrimario} />
                  <Text style={[styles.valorIndicador, { color: tema.textoPrincipal }]}>{kpi.valor}</Text>
                  <Text style={[styles.tituloIndicador, { color: tema.textoSecundario }]}>{kpi.titulo}</Text>
                  <View style={[styles.pillStatus, { backgroundColor: kpi.corPill + '20' }]}>
                    <Text style={[styles.textoPillStatus, { color: kpi.corPill }]}>{kpi.status}</Text>
                  </View>
                </View>
              ))}
            </View>

            <TouchableOpacity
              onPress={() => void buscarDadosDoFirebase(true)}
              disabled={sincronizando}
              activeOpacity={0.7}
              style={[styles.barraStatus, { backgroundColor: tema.inputBackground, borderColor: tema.borda }]}
            >
              <View style={[styles.pontoOnline, { backgroundColor: sincronizando ? '#EF6C00' : '#2E7D32' }]} />
              <Text style={[styles.textoStatusSistema, { color: tema.textoSecundario }]}>
                {sincronizando
                  ? 'Sincronizando com o Firebase...'
                  : `Firebase Conectado • ${ultimaSinc ? `Sincronizado às ${ultimaSinc}` : 'Aguardando sincronização'}`}
              </Text>
              {sincronizando
                ? <ActivityIndicator size="small" color={tema.botaoPrimario} />
                : <Ionicons name="refresh" size={16} color={tema.textoSecundario} />}
            </TouchableOpacity>

            <View style={[styles.sectionHeader, { marginTop: 24 }]}>
              <Text style={[styles.sectionTitle, { color: tema.textoPrincipal }]}>Ações rápidas</Text>
            </View>
            <View style={styles.rowAcoes}>
              <TouchableOpacity
                style={[styles.btnAcaoRapida, { backgroundColor: tema.botaoPrimario }]}
                onPress={() => setModalUsuario(true)}
              >
                <Ionicons name="person-add-outline" size={18} color="#FFF" />
                <Text style={styles.textoBtnAcao}>Novo Usuário</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.btnAcaoRapida, { backgroundColor: tema.inputBackground, borderColor: tema.botaoPrimario, borderWidth: 1 }]}
                onPress={() => setModalTurma(true)}
              >
                <Ionicons name="add-circle-outline" size={18} color={tema.botaoPrimario} />
                <Text style={[styles.textoBtnAcao, { color: tema.botaoPrimario }]}>Nova Turma</Text>
              </TouchableOpacity>
            </View>

            <View style={[styles.sectionHeader, { marginTop: 26 }]}>
              <Text style={[styles.sectionTitle, { color: tema.textoPrincipal }]}>Gestão e auditoria</Text>
            </View>

            <TouchableOpacity style={[styles.atalho, { backgroundColor: tema.inputBackground, borderColor: tema.borda }]} onPress={() => router.push('/historico?aba=auditoria')}>
              <Ionicons name="shield-checkmark-outline" size={22} color={tema.botaoPrimario} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.textoAtalho, { color: tema.textoPrincipal }]}>Histórico de Auditoria</Text>
                <Text style={[styles.subAtalho, { color: tema.textoSecundario }]}>Logs do sistema e chamados encerrados</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={tema.icone} />
            </TouchableOpacity>

            <TouchableOpacity style={[styles.atalho, { backgroundColor: tema.inputBackground, borderColor: tema.borda }]} onPress={() => router.push('/historico?aba=alunos')}>
              <Ionicons name="school-outline" size={22} color={tema.botaoPrimario} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.textoAtalho, { color: tema.textoPrincipal }]}>Diretório de Alunos</Text>
                <Text style={[styles.subAtalho, { color: tema.textoSecundario }]}>Controle de fluxo e vínculo por turma</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={tema.icone} />
            </TouchableOpacity>

            <TouchableOpacity style={[styles.atalho, { backgroundColor: tema.inputBackground, borderColor: tema.borda }]} onPress={exportarRelatorioCSV}>
              <Ionicons name="download-outline" size={22} color={tema.botaoPrimario} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.textoAtalho, { color: tema.textoPrincipal }]}>Exportar Relatório (CSV)</Text>
                <Text style={[styles.subAtalho, { color: tema.textoSecundario }]}>Resumo da base de turmas e usuários</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={tema.icone} />
            </TouchableOpacity>
          </View>
        )}

        {/* ==================== VISÃO COORDENADOR ==================== */}
        {perfil === 'coordenador' && (
          <View>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: tema.textoPrincipal }]}>Acompanhamento pedagógico</Text>
            </View>
            <View style={styles.gradeIndicadores}>
              {INDICADORES_COORDENACAO.map(indicador => (
                <View key={indicador.id} style={[styles.cardIndicador, { backgroundColor: tema.inputBackground, borderColor: tema.borda }]}>
                  <Ionicons name={indicador.icone} size={20} color={tema.botaoPrimario} />
                  <Text style={[styles.valorIndicador, { color: tema.textoPrincipal }]}>{indicador.valor}</Text>
                  <Text style={[styles.tituloIndicador, { color: tema.textoSecundario }]}>{indicador.titulo}</Text>
                </View>
              ))}
            </View>
            <View style={[styles.sectionHeader, { marginTop: 25 }]}>
              <Text style={[styles.sectionTitle, { color: tema.textoPrincipal }]}>Turmas disponíveis para acompanhamento</Text>
            </View>
            {carregando && todasTurmas.length === 0 ? (
              <ActivityIndicator size="large" color={tema.botaoPrimario} style={{ marginVertical: 20 }} />
            ) : todasTurmas.length === 0 ? (
              <Text style={[styles.avisoDemonstrativo, { color: tema.textoSecundario }]}>Nenhuma turma disponível.</Text>
            ) : (
              todasTurmas.map(turma => (
                <View key={turma.id} style={[styles.atalho, { backgroundColor: tema.inputBackground, borderColor: tema.borda }]}>
                  <Ionicons name="people" size={20} color={tema.botaoPrimario} />
                  <View style={styles.infoTurma}>
                    <Text style={[styles.nomeTurma, { color: tema.textoPrincipal }]}>{turma.nome}</Text>
                    <Text style={[styles.materiaTurma, { color: tema.textoSecundario }]}>
                      {turma.turno || 'Turno regular'} • {turma.alunos ?? 0} alunos
                    </Text>
                  </View>
                </View>
              ))
            )}
            <TouchableOpacity style={[styles.atalho, { backgroundColor: tema.inputBackground, borderColor: tema.borda }]} onPress={() => router.push('/(tabs)/avaliacoes')}>
              <Ionicons name="document-text" size={20} color={tema.botaoPrimario} />
              <Text style={[styles.textoAtalho, { color: tema.textoPrincipal }]}>Acessar avaliações</Text>
              <Ionicons name="chevron-forward" size={18} color={tema.icone} />
            </TouchableOpacity>
          </View>
        )}

        {/* ==================== VISÃO PROFESSOR ==================== */}
        {perfil === 'professor' && (
          <>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: tema.textoPrincipal }]}>Meu Cronograma</Text>
            </View>
            {carregando && todasTurmas.length === 0 ? (
              <View style={{ marginVertical: 40, alignItems: 'center' }}>
                <ActivityIndicator size="large" color={tema.botaoPrimario} />
                <Text style={{ marginTop: 10, color: tema.textoSecundario }}>Montando grelha...</Text>
              </View>
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scrollMatrizContainer}>
                {DIAS_SEMANA.map(dia => {
                  const aulasDoDia = turmasVisiveis.filter(t => t.diaId === dia.id).sort((a, b) => (a.horario || '').localeCompare(b.horario || ''));
                  const isHoje = dia.id === diaBusca;
                  return (
                    <View key={dia.id} style={[styles.colunaDia, { width: larguraColunaDia, borderColor: isHoje ? tema.botaoPrimario : tema.borda, backgroundColor: isHoje ? tema.botaoPrimario + '08' : tema.inputBackground }]}>
                      <View style={[styles.cabecalhoDia, { backgroundColor: isHoje ? tema.botaoPrimario : 'transparent', borderBottomColor: tema.borda, borderBottomWidth: isHoje ? 0 : 1 }]}>
                        <Text style={[styles.textoDiaNome, { color: isHoje ? '#FFF' : tema.textoPrincipal }]}>{dia.nome}</Text>
                      </View>
                      <View style={styles.corpoColuna}>
                        {aulasDoDia.length === 0 ? (
                          <Text style={{ textAlign: 'center', fontSize: 13, fontStyle: 'italic', color: tema.textoSecundario, marginTop: 40 }}>Livre</Text>
                        ) : aulasDoDia.map(aula => {
                          const cor = obterCorMateria(aula.disciplina);
                          const concluida = chamadasRealizadasHoje.includes(aula.id);
                          return (
                            <View key={aula.id} style={[styles.blocoAula, { backgroundColor: cor.bg }]}>
                              <Text style={[styles.blocoMateria, { color: cor.text }]} numberOfLines={2}>
                                {aula.disciplina} {concluida && <Ionicons name="checkmark-circle" size={12} color={cor.text} />}
                              </Text>
                              <Text style={[styles.blocoTurma, { color: cor.text }]}>{aula.nome}</Text>
                              <View style={styles.blocoRodape}>
                                <Text style={[styles.blocoHorario, { color: cor.text }]}>{aula.horario}</Text>
                                {aula.professorNome && <Text style={[styles.blocoProf, { color: cor.text }]} numberOfLines={1}>{aula.professorNome.split(' ')[0]}</Text>}
                              </View>
                            </View>
                          );
                        })}
                      </View>
                    </View>
                  );
                })}
              </ScrollView>
            )}

            <View style={[styles.sectionHeader, { marginTop: 40 }]}>
              <Text style={[styles.sectionTitle, { color: tema.textoPrincipal }]}>Pendentes Para Hoje</Text>
              <TouchableOpacity onPress={() => router.push('/(tabs)/turmas')}>
                <Text style={[styles.btnVerTodas, { color: tema.botaoPrimario }]}>Ver grade completa {'>'}</Text>
              </TouchableOpacity>
            </View>

            {carregando ? (
              <Text style={{ textAlign: 'center', marginTop: 20, color: tema.textoSecundario }}>Procurando turmas...</Text>
            ) : turmasDeHojePendentes.length === 0 ? (
              <View style={{ alignItems: 'center', marginTop: 20 }}>
                <Ionicons name="checkmark-circle-outline" size={40} color="#2E7D32" />
                <Text style={{ textAlign: 'center', marginTop: 10, color: '#2E7D32', fontWeight: 'bold' }}>Tudo pronto!</Text>
                <Text style={{ textAlign: 'center', color: tema.textoSecundario }}>Você não tem chamadas pendentes hoje.</Text>
              </View>
            ) : (
              turmasDeHojePendentes.map(turma => (
                <TouchableOpacity
                  key={turma.id}
                  style={[styles.cardTurma, { backgroundColor: tema.inputBackground, borderColor: tema.borda }]}
                  activeOpacity={0.7}
                  onPress={() => router.push(`/chamada?id=${turma.id}`)}
                >
                  <View style={[styles.iconeTurmaBg, { backgroundColor: tema.botaoPrimario + '20' }]}><Ionicons name="people" size={24} color={tema.botaoPrimario} /></View>
                  <View style={styles.infoTurma}>
                    <Text style={[styles.nomeTurma, { color: tema.textoPrincipal }]}>{turma.nome}</Text>
                    <Text style={[styles.materiaTurma, { color: tema.textoSecundario }]}>{turma.disciplina}</Text>
                    <View style={styles.detalhesTurmaMinimalista}>
                      <Ionicons name="time" size={14} color={tema.botaoPrimario} />
                      <Text style={[styles.textoHorarioDestaque, { color: tema.botaoPrimario }]}>{turma.horario} • {turma.turno}</Text>
                    </View>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={tema.icone} />
                </TouchableOpacity>
              ))
            )}
          </>
        )}
      </ScrollView>

      {/* ==================== MODAL: NOVO USUÁRIO ==================== */}
      <Modal visible={modalUsuario} transparent animationType="slide" onRequestClose={() => setModalUsuario(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalFormContent, { backgroundColor: tema.fundoBase, borderColor: tema.borda }]}>
            <View style={[styles.modalHeader, { borderBottomColor: tema.borda }]}>
              <Text style={[styles.modalTitle, { color: tema.textoPrincipal }]}>Cadastrar Novo Usuário</Text>
              <TouchableOpacity onPress={() => setModalUsuario(false)}><Ionicons name="close" size={24} color={tema.textoPrincipal} /></TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={{ padding: 20 }}>
              <Text style={[styles.labelInput, { color: tema.textoPrincipal }]}>Nome Completo</Text>
              <TextInput
                value={formUser.nome}
                onChangeText={v => setFormUser({ ...formUser, nome: v })}
                placeholder="Ex: Carlos Eduardo Silva"
                placeholderTextColor={tema.textoSecundario}
                style={[styles.input, { backgroundColor: tema.inputBackground, color: tema.textoPrincipal, borderColor: tema.borda }]}
              />

              <Text style={[styles.labelInput, { color: tema.textoPrincipal }]}>E-mail Institucional</Text>
              <TextInput
                value={formUser.email}
                onChangeText={v => setFormUser({ ...formUser, email: v })}
                keyboardType="email-address"
                autoCapitalize="none"
                placeholder="usuario@violeta.com"
                placeholderTextColor={tema.textoSecundario}
                style={[styles.input, { backgroundColor: tema.inputBackground, color: tema.textoPrincipal, borderColor: tema.borda }]}
              />

              <Text style={[styles.labelInput, { color: tema.textoPrincipal }]}>CPF</Text>
              <TextInput
                value={formUser.cpf}
                onChangeText={v => setFormUser({ ...formUser, cpf: v })}
                keyboardType="numeric"
                maxLength={14}
                placeholder="000.000.000-00"
                placeholderTextColor={tema.textoSecundario}
                style={[styles.input, { backgroundColor: tema.inputBackground, color: tema.textoPrincipal, borderColor: tema.borda }]}
              />

              <Text style={[styles.labelInput, { color: tema.textoPrincipal }]}>Cargo (Role)</Text>
              <View style={styles.rowChips}>
                {(['professor', 'coordenador'] as const).map(role => {
                  const ativo = formUser.role === role;
                  return (
                    <TouchableOpacity
                      key={role}
                      onPress={() => setFormUser({ ...formUser, role })}
                      style={[styles.chip, { borderColor: ativo ? tema.botaoPrimario : tema.borda, backgroundColor: ativo ? tema.botaoPrimario + '20' : tema.inputBackground }]}
                    >
                      <Text style={{ color: ativo ? tema.botaoPrimario : tema.textoPrincipal, fontWeight: 'bold', textTransform: 'capitalize' }}>{role}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {formUser.role === 'professor' && (
                <>
                  <Text style={[styles.labelInput, { color: tema.textoPrincipal }]}>Disciplina / Matéria</Text>
                  <TextInput
                    value={formUser.disciplina}
                    onChangeText={v => setFormUser({ ...formUser, disciplina: v })}
                    placeholder="Ex: Matemática, Física, História..."
                    placeholderTextColor={tema.textoSecundario}
                    style={[styles.input, { backgroundColor: tema.inputBackground, color: tema.textoPrincipal, borderColor: tema.borda }]}
                  />
                </>
              )}

              {!!formUser.nome && formUser.cpf.replace(/\D/g, '').length >= 4 && (
                <View style={[styles.boxSenhaGerada, { backgroundColor: tema.inputBackground, borderColor: tema.borda }]}>
                  <Ionicons name="key-outline" size={16} color={tema.botaoPrimario} />
                  <Text style={{ color: tema.textoSecundario, fontSize: 12, marginLeft: 8 }}>
                    Senha automática: <Text style={{ color: tema.textoPrincipal, fontWeight: 'bold' }}>{gerarSenhaInicial(formUser.nome, formUser.cpf)}</Text>
                  </Text>
                </View>
              )}

              <TouchableOpacity
                style={[styles.btnSalvarModal, { backgroundColor: tema.botaoPrimario }]}
                onPress={salvarNovoUsuario}
                disabled={salvando}
              >
                <Text style={styles.textoBtnAcao}>{salvando ? 'Salvando...' : 'Criar Usuário'}</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ==================== MODAL: NOVA TURMA ==================== */}
      <Modal visible={modalTurma} transparent animationType="slide" onRequestClose={() => setModalTurma(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalFormContent, { backgroundColor: tema.fundoBase, borderColor: tema.borda }]}>
            <View style={[styles.modalHeader, { borderBottomColor: tema.borda }]}>
              <Text style={[styles.modalTitle, { color: tema.textoPrincipal }]}>Cadastrar Nova Turma</Text>
              <TouchableOpacity onPress={() => setModalTurma(false)}><Ionicons name="close" size={24} color={tema.textoPrincipal} /></TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={{ padding: 20 }}>
              <Text style={[styles.labelInput, { color: tema.textoPrincipal }]}>Nome da Turma / Série</Text>
              <TextInput
                value={formTurma.nome}
                onChangeText={v => setFormTurma({ ...formTurma, nome: v })}
                placeholder="Ex: 1º Ano Médio, 7º Ano B..."
                placeholderTextColor={tema.textoSecundario}
                style={[styles.input, { backgroundColor: tema.inputBackground, color: tema.textoPrincipal, borderColor: tema.borda }]}
              />

              <Text style={[styles.labelInput, { color: tema.textoPrincipal }]}>Turno</Text>
              <View style={styles.rowChips}>
                {TURNOS.map(t => {
                  const sel = formTurma.turno === t;
                  return (
                    <TouchableOpacity
                      key={t}
                      onPress={() => setFormTurma({ ...formTurma, turno: t })}
                      style={[styles.chip, { borderColor: sel ? tema.botaoPrimario : tema.borda, backgroundColor: sel ? tema.botaoPrimario + '20' : tema.inputBackground }]}
                    >
                      <Text style={{ color: sel ? tema.botaoPrimario : tema.textoPrincipal, fontSize: 12, fontWeight: 'bold' }}>{t}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <TouchableOpacity
                style={[styles.btnSalvarModal, { backgroundColor: tema.botaoPrimario }]}
                onPress={salvarNovaTurma}
                disabled={salvando}
              >
                <Text style={styles.textoBtnAcao}>{salvando ? 'Salvando...' : 'Criar Turma'}</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ==================== MODAL: NOTIFICAÇÕES ==================== */}
      <Modal visible={modalNotificacoes} transparent animationType="fade" onRequestClose={() => setModalNotificacoes(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setModalNotificacoes(false)}>
          <TouchableOpacity activeOpacity={1} style={[styles.modalContent, { backgroundColor: tema.fundoBase }]}>
            <View style={[styles.modalHeader, { borderBottomColor: tema.borda }]}><Text style={[styles.modalTitle, { color: tema.textoPrincipal }]}>Notificações</Text></View>
            <FlatList
              data={notificacoes}
              keyExtractor={item => item.id}
              contentContainerStyle={{ padding: 20 }}
              renderItem={({ item }) => (
                <View style={[styles.cardNotificacao, { backgroundColor: item.lida ? tema.inputBackground : tema.botaoPrimario + '15', borderColor: tema.borda }]}>
                  <Ionicons name="checkmark-circle" size={24} color="#2E7D32" style={{ marginRight: 15, marginTop: 2 }} />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.tituloNotificacao, { color: tema.textoPrincipal }]}>{item.titulo}</Text>
                    <Text style={[styles.mensagemNotificacao, { color: tema.textoSecundario }]}>{item.mensagem}</Text>
                  </View>
                </View>
              )}
            />
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 }, scrollContent: { padding: 20, paddingTop: 50, paddingBottom: 30 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 25 },
  headerActions: { flexDirection: 'row', alignItems: 'center' },
  iconButton: { marginRight: 15, position: 'relative', padding: 5 },
  notificationBadge: { position: 'absolute', top: 0, right: 0, minWidth: 16, height: 16, borderRadius: 8, backgroundColor: '#DB4437', borderWidth: 1, borderColor: '#FFF', justifyContent: 'center', alignItems: 'center' },
  badgeText: { color: '#FFF', fontSize: 9, fontWeight: 'bold' },
  tituloSaudacao: { fontSize: 20, fontWeight: 'bold' },
  badgeDemonstracao: { alignSelf: 'flex-start', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 4, marginTop: 6 },
  textoBadgeDemonstracao: { fontSize: 11, fontWeight: '600' },
  avisoDemonstrativo: { fontSize: 12, marginTop: -8, marginBottom: 15, lineHeight: 17 },
  avatar: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, justifyContent: 'center', alignItems: 'center' },
  banner: { width: '100%', padding: 20, borderRadius: 15, marginBottom: 25, position: 'relative', overflow: 'hidden', elevation: 3 },
  textoBanner: { fontSize: 15, fontWeight: 'bold', fontStyle: 'italic', marginBottom: 10, zIndex: 2, lineHeight: 22 },
  assinaturaBanner: { fontSize: 12, fontWeight: '600', zIndex: 2, alignSelf: 'flex-end' },
  watermark: { position: 'absolute', left: -10, bottom: -15, opacity: 0.2, transform: [{ rotate: '15deg' }] },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold' }, btnVerTodas: { fontSize: 14, fontWeight: '600' },

  gradeIndicadores: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  cardIndicador: { flexGrow: 1, flexBasis: '30%', minWidth: 95, borderWidth: 1, borderRadius: 12, padding: 14, alignItems: 'center' },
  valorIndicador: { fontSize: 22, fontWeight: 'bold', marginTop: 8 },
  tituloIndicador: { fontSize: 11, textAlign: 'center', marginTop: 2 },
  pillStatus: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, marginTop: 8 },
  textoPillStatus: { fontSize: 10, fontWeight: 'bold' },
  barraStatus: { flexDirection: 'row', alignItems: 'center', paddingVertical: 11, paddingHorizontal: 14, borderRadius: 12, borderWidth: 1, marginTop: 12, gap: 8 },
  pontoOnline: { width: 8, height: 8, borderRadius: 4 },
  textoStatusSistema: { flex: 1, fontSize: 12, fontWeight: '500' },
  rowAcoes: { flexDirection: 'row', gap: 10 },
  btnAcaoRapida: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', height: 46, borderRadius: 12, gap: 8 },
  textoBtnAcao: { color: '#FFF', fontSize: 14, fontWeight: 'bold' },
  atalho: { flexDirection: 'row', alignItems: 'center', padding: 15, borderRadius: 12, borderWidth: 1, marginBottom: 10, gap: 14 },
  textoAtalho: { fontSize: 14, fontWeight: '600' },
  subAtalho: { fontSize: 11, marginTop: 2 },

  scrollMatrizContainer: { flexGrow: 0, gap: 10, paddingBottom: 10 },
  colunaDia: { flexShrink: 0, borderRadius: 16, borderWidth: 1, overflow: 'hidden' },
  cabecalhoDia: { paddingVertical: 12, alignItems: 'center' }, textoDiaNome: { fontSize: 14, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 0.5 },
  corpoColuna: { padding: 8, minHeight: 180 }, blocoAula: { padding: 12, borderRadius: 12, marginBottom: 10, elevation: 2 },
  blocoMateria: { fontSize: 13, fontWeight: 'bold', marginBottom: 4 }, blocoTurma: { fontSize: 12, fontWeight: '700', marginBottom: 6 },
  blocoRodape: { flexDirection: 'column', alignItems: 'flex-start', gap: 3 }, blocoHorario: { fontSize: 11, fontWeight: 'bold', opacity: 0.8 },
  blocoProf: { fontSize: 10, fontWeight: 'bold', opacity: 0.7 },
  cardTurma: { flexDirection: 'row', alignItems: 'center', padding: 15, borderRadius: 12, borderWidth: 1, marginBottom: 12 },
  iconeTurmaBg: { width: 50, height: 50, borderRadius: 25, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  infoTurma: { flex: 1 }, nomeTurma: { fontSize: 16, fontWeight: 'bold' }, materiaTurma: { fontSize: 14, marginBottom: 5 },
  detalhesTurmaMinimalista: { flexDirection: 'row', alignItems: 'center', marginTop: 4 }, textoHorarioDestaque: { fontSize: 13, fontWeight: 'bold', marginLeft: 6 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalContent: { height: '70%', borderTopLeftRadius: 25, borderTopRightRadius: 25, elevation: 10 },
  modalFormContent: { maxHeight: '88%', borderTopLeftRadius: 25, borderTopRightRadius: 25, borderWidth: 1 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1 },
  modalTitle: { fontSize: 18, fontWeight: 'bold' },
  labelInput: { fontSize: 13, fontWeight: 'bold', marginBottom: 6 },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, height: 46, marginBottom: 14, fontSize: 14 },
  rowChips: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  chip: { flex: 1, height: 42, borderWidth: 1, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  boxSenhaGerada: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 10, borderWidth: 1, marginBottom: 16 },
  btnSalvarModal: { height: 48, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginTop: 6, marginBottom: 10 },
  cardNotificacao: { flexDirection: 'row', padding: 15, borderRadius: 12, borderWidth: 1, marginBottom: 12 },
  tituloNotificacao: { fontSize: 15, fontWeight: 'bold', marginBottom: 4 }, mensagemNotificacao: { fontSize: 13, lineHeight: 18 },
});