import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, useWindowDimensions, Modal, FlatList, RefreshControl, ActivityIndicator, TextInput, Platform, Image, Keyboard } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { collection, getDocs, addDoc, setDoc, updateDoc, doc, increment, query, where, serverTimestamp } from 'firebase/firestore';
import { useDemoProfile, type DemoProfile } from '../../contexts/demoProfileContext';
import { auth, db, criarContaAuthSemDeslogar } from '../../config/firebase';
import { FeedbackToast, type EstadoFeedback, type TipoFeedback } from '../../components/FeedbackToast';

// === CONSTANTES E FORMULÁRIOS INICIAIS ===
const ICONE_VIOLETA = require('../../../assets/images/icon.png');
const PERFIS_DEMONSTRATIVOS: Record<DemoProfile, { nome: string; cargo: string }> = {
  admin: { nome: 'Marina', cargo: 'Administradora' },
  coordenador: { nome: 'Camila', cargo: 'Coordenadora' },
  professor: { nome: 'Luffy Baiano', cargo: 'Professor' },
};
const ID_PROFESSOR_DEMONSTRATIVO = 'prof_1';
const DIAS_SEMANA = [
  { id: 1, nome: 'Segunda' }, { id: 2, nome: 'Terça' }, { id: 3, nome: 'Quarta' }, { id: 4, nome: 'Quinta' }, { id: 5, nome: 'Sexta' },
];
const TURNOS = ['Matutino', 'Vespertino', 'Noturno'] as const;
const FRASES = [
  'A educação é a arma mais poderosa que você pode usar para mudar o mundo. - Nelson Mandela',
  'Educação não transforma o mundo. Educação muda as pessoas. - Paulo Freire',
];
const CORES_MATERIA: Record<string, { bg: string; text: string }> = {
  Matemática: { bg: '#FFCC80', text: '#E65100' },
  Física: { bg: '#C7D2FE', text: '#312E81' },
  História: { bg: '#A5D6A7', text: '#1B5E20' },
};
const FORM_ALUNO_INICIAL = {
  nome: '', dataNascimento: '', matricula: '', responsavelNome: '', responsavelTelefone: '', observacoes: '',
  serieSelecionada: '', turnoSelecionado: '', turmaId: '', turmaNome: '',
};
const FORM_GRADE_INICIAL = { professorId: '', professorNome: '', disciplina: '', turmaId: '', turmaNome: '', turno: 'Matutino', diaId: 1, horaInicio: '', horaFim: '' };
const FORM_COMUNICADO_INICIAL = { titulo: '', destinatario: 'Todos os Professores', mensagem: '' };

// === HELPERS DE FORMATAÇÃO E VALIDAÇÃO ===
const gerarSenhaInicial = (nome: string, cpf: string) => {
  const prefixo = nome.trim().split(/\s+/)[0].normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().slice(0, 4) || 'user';
  const sufixo = cpf.replace(/\D/g, '').slice(0, 4) || '2026';
  return `${prefixo}@${sufixo}`;
};
const extrairSerie = (nomeTurma: string) => {
  const limpo = String(nomeTurma || '').trim();
  return limpo ? limpo.replace(/\s+[A-Z]$/i, '').trim() || limpo : 'Outros';
};
const formatarDataInput = (valor: string) => {
  const nums = valor.replace(/\D/g, '').slice(0, 8);
  if (nums.length <= 2) return nums;
  if (nums.length <= 4) return `${nums.slice(0, 2)}/${nums.slice(2)}`;
  return `${nums.slice(0, 2)}/${nums.slice(2, 4)}/${nums.slice(4)}`;
};
const formatarTelefoneInput = (valor: string) => {
  const nums = valor.replace(/\D/g, '').slice(0, 11);
  if (nums.length <= 2) return nums;
  if (nums.length <= 7) return `(${nums.slice(0, 2)}) ${nums.slice(2)}`;
  return `(${nums.slice(0, 2)}) ${nums.slice(2, 7)}-${nums.slice(7)}`;
};
const formatarHoraInput = (valor: string) => {
  const nums = valor.replace(/\D/g, '').slice(0, 4);
  return nums.length <= 2 ? nums : `${nums.slice(0, 2)}:${nums.slice(2)}`;
};
const validarHora24 = (horaStr: string) => {
  if (!/^\d{2}:\d{2}$/.test(horaStr)) return null;
  const [h, m] = horaStr.split(':').map(Number);
  return h < 0 || h > 23 || m < 0 || m > 59 ? null : h * 60 + m;
};
const obterTurnoPorHora = (horaStr: string) => {
  const mins = validarHora24(horaStr);
  if (mins === null) return null;
  const h = Math.floor(mins / 60);
  return h >= 18 ? 'Noturno' : h >= 12 ? 'Vespertino' : 'Matutino';
};
const getDataDeHoje = () => new Date().toISOString().split('T')[0];

export default function DashboardScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { perfil, perfilReal, usuarioLogado, temaAtivo: tema } = useDemoProfile();
  const { width: larguraTela } = useWindowDimensions();
  const perfilDemo = {
    ...PERFIS_DEMONSTRATIVOS[perfil],
    ...(perfil === perfilReal && usuarioLogado ? { nome: usuarioLogado.nome } : {}),
  };
  const larguraColunaDia = Math.min(240, Math.max(190, larguraTela * 0.62));
  const bottomInset = Platform.OS === 'web' ? 0 : insets.bottom;

  // === ESTADOS ===
  const [alturaTeclado, setAlturaTeclado] = useState(0);
  const [saudacaoTempo, setSaudacaoTempo] = useState('Olá');
  const [fraseMotivacional, setFraseMotivacional] = useState(FRASES[0]);
  const [todasTurmas, setTodasTurmas] = useState<any[]>([]);
  const [professoresAtivosLista, setProfessoresAtivosLista] = useState<any[]>([]);
  const [gradeHojeCoord, setGradeHojeCoord] = useState<any[]>([]);
  const [comunicados, setComunicados] = useState<any[]>([]);
  const [notificacoesLidasIds, setNotificacoesLidasIds] = useState<string[]>([]);
  const [totalEquipeAtiva, setTotalEquipeAtiva] = useState(0);
  const [totalProfessoresAtivos, setTotalProfessoresAtivos] = useState(0);
  const [totalAlunosBase, setTotalAlunosBase] = useState(0);
  const [chamadosPendentes, setChamadosPendentes] = useState(0);
  const [chamadasRealizadasHoje, setChamadasRealizadasHoje] = useState<string[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [sincronizando, setSincronizando] = useState(false);
  const [ultimaSinc, setUltimaSinc] = useState('');
  const [salvando, setSalvando] = useState(false);

  // Modais e dropdowns
  const [modalNotificacoes, setModalNotificacoes] = useState(false);
  const [modalUsuario, setModalUsuario] = useState(false);
  const [modalTurma, setModalTurma] = useState(false);
  const [modalAlunoCoord, setModalAlunoCoord] = useState(false);
  const [modalGradeCoord, setModalGradeCoord] = useState(false);
  const [modalComunicadoCoord, setModalComunicadoCoord] = useState(false);
  const [modalAlertasCoord, setModalAlertasCoord] = useState(false);
  const [dropdownSerieAberto, setDropdownSerieAberto] = useState(false);
  const [dropdownSalaAberto, setDropdownSalaAberto] = useState(false);
  const [dropdownProfAberto, setDropdownProfAberto] = useState(false);
  const [dropdownTurmaGradeAberto, setDropdownTurmaGradeAberto] = useState(false);
  const [dropdownDestinatarioAberto, setDropdownDestinatarioAberto] = useState(false);

  // Formulários e feedback
  const [formUser, setFormUser] = useState({ nome: '', email: '', cpf: '', role: 'professor' as 'professor' | 'coordenador', disciplina: '' });
  const [formTurma, setFormTurma] = useState({ nome: '', turno: 'Matutino' as (typeof TURNOS)[number] });
  const [formAluno, setFormAluno] = useState(FORM_ALUNO_INICIAL);
  const [formGrade, setFormGrade] = useState(FORM_GRADE_INICIAL);
  const [formComunicado, setFormComunicado] = useState(FORM_COMUNICADO_INICIAL);
  const [feedback, setFeedback] = useState<EstadoFeedback>({ visivel: false, tipo: 'sucesso', titulo: '', mensagem: '' });

  const notificar = useCallback((tipo: TipoFeedback, titulo: string, mensagem: string) => {
    setFeedback({ visivel: true, tipo, titulo, mensagem });
  }, []);
  const fecharFeedback = useCallback(() => setFeedback(prev => ({ ...prev, visivel: false })), []);
  const totalNaoLidas = comunicados.filter(c => !notificacoesLidasIds.includes(c.id)).length;
  const diaAtual = new Date().getDay();
  const diaBusca = diaAtual === 0 || diaAtual === 6 ? 1 : diaAtual;
  const marcarTodasComoLidas = () => setNotificacoesLidasIds(comunicados.map(c => c.id));

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

  // === SINCRONIZAÇÃO COM O FIRESTORE ===
  const buscarDadosDoFirebase = useCallback(async (manual = false) => {
    if (!auth.currentUser) return;
    if (manual) setSincronizando(true);
    setCarregando(true);
    try {
      const qTurmas = perfil === 'professor' ? query(collection(db, 'grade_aulas')) : query(collection(db, 'turmas'));
      const [turmasSnap, chamadasSnap] = await Promise.all([
        getDocs(qTurmas),
        getDocs(query(collection(db, 'chamadas'), where('dataChamadaFormatada', '==', getDataDeHoje()))),
      ]);
      const listaTurmas = turmasSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      setTodasTurmas(listaTurmas);
      setChamadasRealizadasHoje(chamadasSnap.docs.map(d => d.data().turmaId));

      try {
        const comSnap = await getDocs(collection(db, 'comunicados'));
        const listaCom = comSnap.docs
          .map(d => {
            const data = d.data() as any;
            return {
              id: d.id,
              titulo: String(data.titulo || 'Comunicado'),
              mensagem: String(data.mensagem || ''),
              autor: String(data.autor || 'Coordenação'),
              destinatario: String(data.destinatario || 'Todos'),
              destinatarioId: String(data.destinatarioId || ''),
              privado: Boolean(data.privado),
              tipo: String(data.tipo || 'geral'),
              criadoEmMs: data.criadoEm?.toMillis ? data.criadoEm.toMillis() : 0,
            };
          })
          .filter(c => {
            const ehGeral = !c.privado && (c.destinatario === 'Todos' || c.destinatario === 'Todos os Professores' || c.tipo === 'calendario');
            if (ehGeral) return true;
            if (perfil === 'professor') {
              const bateId = Boolean(c.destinatarioId) && c.destinatarioId === ID_PROFESSOR_DEMONSTRATIVO;
              const bateNome = c.destinatario.trim().toLowerCase() === perfilDemo.nome.trim().toLowerCase();
              return bateId || bateNome;
            }
            return false;
          })
          .sort((a, b) => b.criadoEmMs - a.criadoEmMs);
        setComunicados(listaCom);
      } catch {
        setComunicados([]);
      }

      if (perfil === 'admin') {
        try {
          const usersSnap = await getDocs(collection(db, 'usuarios'));
          const equipeAtiva = usersSnap.docs.map(d => d.data() as any).filter(u => {
            const cargo = String(u.role ?? u.perfil ?? '').toLowerCase();
            return (cargo.includes('prof') || cargo.includes('coord')) && u.ativo !== false && u.situacao !== 'Inativo';
          });
          setTotalEquipeAtiva(equipeAtiva.length);
        } catch { setTotalEquipeAtiva(0); }
        try {
          const chSnap = await getDocs(query(collection(db, 'chamados_suporte'), where('status', '==', 'pendente')));
          setChamadosPendentes(chSnap.size);
        } catch { setChamadosPendentes(0); }
      }

      if (perfil === 'coordenador') {
        try {
          const usersSnap = await getDocs(collection(db, 'usuarios'));
          const profsAtivos = usersSnap.docs.map(d => ({ id: d.id, ...(d.data() as any) })).filter(u => {
            const cargo = String(u.role ?? u.perfil ?? '').toLowerCase();
            return cargo.includes('prof') && u.ativo !== false && u.situacao !== 'Inativo';
          });
          setProfessoresAtivosLista(profsAtivos);
          setTotalProfessoresAtivos(profsAtivos.length);
        } catch {
          setProfessoresAtivosLista([]);
          setTotalProfessoresAtivos(0);
        }
        try {
          const alunosSnap = await getDocs(collection(db, 'alunos'));
          const somaTurmas = listaTurmas.reduce((acc, t: any) => acc + (Number(t.alunos) || 0), 0);
          setTotalAlunosBase(Math.max(alunosSnap.size, somaTurmas));
        } catch {
          setTotalAlunosBase(listaTurmas.reduce((acc, t: any) => acc + (Number(t.alunos) || 0), 0));
        }
        try {
          const gradeSnap = await getDocs(query(collection(db, 'grade_aulas'), where('diaId', '==', diaBusca)));
          setGradeHojeCoord(gradeSnap.docs.map(d => ({ id: d.id, ...d.data() })));
        } catch { setGradeHojeCoord([]); }
      }

      const agora = new Date();
      setUltimaSinc(`${String(agora.getHours()).padStart(2, '0')}:${String(agora.getMinutes()).padStart(2, '0')}`);
    } catch (error: any) {
      notificar('erro', 'Erro ao sincronizar', error?.message || 'Não foi possível buscar os dados no Firebase.');
    } finally {
      setCarregando(false);
      setSincronizando(false);
    }
  }, [perfil, perfilDemo.nome, diaBusca, notificar]);

  useEffect(() => {
    const hora = new Date().getHours();
    setSaudacaoTempo(hora >= 5 && hora < 12 ? 'Bom dia' : hora >= 12 && hora < 18 ? 'Boa tarde' : 'Boa noite');
    setFraseMotivacional(FRASES[Math.floor(Math.random() * FRASES.length)]);
  }, [perfil]);

  useFocusEffect(useCallback(() => { void buscarDadosDoFirebase(); }, [buscarDadosDoFirebase]));

  // === DADOS DERIVADOS E ALOCAÇÃO ===
  const seriesDisponiveis = useMemo(() => {
    const setSeries = new Set<string>();
    todasTurmas.forEach(t => { if (t.nome) setSeries.add(extrairSerie(t.nome)); });
    return Array.from(setSeries).sort((a, b) => a.localeCompare(b, 'pt-BR'));
  }, [todasTurmas]);

  const turnosDisponiveisDaSerie = useMemo(() => {
    if (!formAluno.serieSelecionada) return new Set<string>();
    return new Set(todasTurmas.filter(t => extrairSerie(t.nome) === formAluno.serieSelecionada).map(t => String(t.turno || 'Matutino')));
  }, [todasTurmas, formAluno.serieSelecionada]);

  const salasFiltradas = useMemo(() => {
    if (!formAluno.serieSelecionada || !formAluno.turnoSelecionado) return [];
    return todasTurmas
      .filter(t => extrairSerie(t.nome) === formAluno.serieSelecionada && String(t.turno || 'Matutino') === formAluno.turnoSelecionado)
      .sort((a, b) => String(a.nome || '').localeCompare(String(b.nome || ''), 'pt-BR'));
  }, [todasTurmas, formAluno.serieSelecionada, formAluno.turnoSelecionado]);

  const aulasPendentesHojeCoord = useMemo(() => gradeHojeCoord.filter(g => !chamadasRealizadasHoje.includes(g.id)), [gradeHojeCoord, chamadasRealizadasHoje]);
  const turmasSemAlunosCoord = useMemo(() => todasTurmas.filter(t => (Number(t.alunos) || 0) === 0), [todasTurmas]);

  const abrirModalNovoAlunoCoord = () => { setFormAluno(FORM_ALUNO_INICIAL); setDropdownSerieAberto(false); setDropdownSalaAberto(false); setModalAlunoCoord(true); };
  const abrirModalGradeCoord = () => { setFormGrade(FORM_GRADE_INICIAL); setDropdownProfAberto(false); setDropdownTurmaGradeAberto(false); setModalGradeCoord(true); };
  const abrirModalComunicadoCoord = () => { setFormComunicado(FORM_COMUNICADO_INICIAL); setDropdownDestinatarioAberto(false); setModalComunicadoCoord(true); };

  const selecionarSerie = (serie: string) => {
    const turnos = Array.from(new Set(todasTurmas.filter(t => extrairSerie(t.nome) === serie).map(t => String(t.turno || 'Matutino'))));
    const turnoAuto = turnos.length === 1 ? turnos[0] : '';
    const salasAuto = turnoAuto ? todasTurmas.filter(t => extrairSerie(t.nome) === serie && String(t.turno || 'Matutino') === turnoAuto) : [];
    const salaUnica = salasAuto.length === 1 ? salasAuto[0] : null;
    setFormAluno(prev => ({ ...prev, serieSelecionada: serie, turnoSelecionado: turnoAuto, turmaId: salaUnica ? salaUnica.id : '', turmaNome: salaUnica ? salaUnica.nome : '' }));
    setDropdownSerieAberto(false);
    setDropdownSalaAberto(false);
  };

  const selecionarTurnoAluno = (turno: string) => {
    const salas = todasTurmas.filter(t => extrairSerie(t.nome) === formAluno.serieSelecionada && String(t.turno || 'Matutino') === turno);
    const salaUnica = salas.length === 1 ? salas[0] : null;
    setFormAluno(prev => ({ ...prev, turnoSelecionado: turno, turmaId: salaUnica ? salaUnica.id : '', turmaNome: salaUnica ? salaUnica.nome : '' }));
    setDropdownSalaAberto(false);
  };

  // === AÇÕES DE CADASTRO E EXPORTAÇÃO ===
  const salvarAlunoCoordenacao = async () => {
    if (!formAluno.nome.trim()) return notificar('aviso', 'Campo obrigatório', 'Informe o nome completo do aluno.');
    if (formAluno.dataNascimento.replace(/\D/g, '').length < 8) return notificar('aviso', 'Data de nascimento', 'Informe a data de nascimento completa (DD/MM/AAAA).');
    if (!formAluno.responsavelNome.trim() || formAluno.responsavelTelefone.replace(/\D/g, '').length < 10) return notificar('aviso', 'Dados do responsável', 'Informe o nome e o telefone de contato do responsável.');
    if (!formAluno.turmaId || !formAluno.turmaNome.trim()) return notificar('aviso', 'Selecione a turma', 'Escolha a série, o turno e a sala do aluno.');
    setSalvando(true);
    try {
      const matriculaFinal = formAluno.matricula.trim() || `MAT${Date.now().toString().slice(-6)}`;
      await addDoc(collection(db, 'alunos'), {
        nome: formAluno.nome.trim(),
        dataNascimento: formAluno.dataNascimento.trim(),
        matricula: matriculaFinal,
        responsavelNome: formAluno.responsavelNome.trim(),
        responsavelTelefone: formAluno.responsavelTelefone.trim(),
        observacoes: formAluno.observacoes.trim(),
        serie: formAluno.serieSelecionada,
        turno: formAluno.turnoSelecionado,
        turmaId: formAluno.turmaId,
        turmaNome: formAluno.turmaNome.trim(),
        turma: formAluno.turmaNome.trim(),
        ativo: true,
        cadastradoPor: perfilDemo.nome,
        criadoEm: serverTimestamp(),
      });
      await updateDoc(doc(db, 'turmas', formAluno.turmaId), { alunos: increment(1) });
      setModalAlunoCoord(false);
      setFormAluno(FORM_ALUNO_INICIAL);
      void buscarDadosDoFirebase();
      notificar('sucesso', 'Aluno matriculado!', `${formAluno.nome.trim()} vinculado à sala ${formAluno.turmaNome.trim()}.`);
    } catch (error: any) {
      notificar('erro', 'Erro ao matricular aluno', error?.message || 'Não foi possível salvar o aluno no Firestore.');
    } finally { setSalvando(false); }
  };

  const salvarGradeCoordenacao = async () => {
    if (!formGrade.professorId) return notificar('aviso', 'Selecione o professor', 'Escolha um professor ativo da base.');
    if (!formGrade.disciplina.trim()) return notificar('aviso', 'Disciplina obrigatória', 'Informe a matéria da aula.');
    if (!formGrade.turmaId) return notificar('aviso', 'Selecione a turma', 'Escolha a sala para alocar na grade.');
    const minInicio = validarHora24(formGrade.horaInicio);
    const minFim = validarHora24(formGrade.horaFim);
    if (minInicio === null || minFim === null) return notificar('aviso', 'Horário inválido', 'Preencha início e término no formato 24h (ex: 07:00 até 07:50).');
    if (minFim <= minInicio) return notificar('aviso', 'Horário inválido', 'O horário de término deve ser maior que o de início.');
    const turnoCalculado = obterTurnoPorHora(formGrade.horaInicio) || formGrade.turno;
    const horarioFormatado = `${formGrade.horaInicio} às ${formGrade.horaFim}`;
    setSalvando(true);
    try {
      await addDoc(collection(db, 'grade_aulas'), {
        professorId: formGrade.professorId,
        professorNome: formGrade.professorNome,
        disciplina: formGrade.disciplina.trim(),
        turmaId: formGrade.turmaId,
        nome: formGrade.turmaNome,
        turno: turnoCalculado,
        diaId: formGrade.diaId,
        horario: horarioFormatado,
        criadoPor: perfilDemo.nome,
        criadoEm: serverTimestamp(),
      });
      setModalGradeCoord(false);
      setFormGrade(FORM_GRADE_INICIAL);
      void buscarDadosDoFirebase();
      notificar('sucesso', 'Aula alocada na grade!', `${formGrade.disciplina.trim()} • ${formGrade.turmaNome} (${horarioFormatado} • ${turnoCalculado}).`);
    } catch (error: any) {
      notificar('erro', 'Erro ao montar grade', error?.message || 'Não foi possível gravar na coleção grade_aulas.');
    } finally { setSalvando(false); }
  };

  const salvarComunicadoCoordenacao = async () => {
    if (!formComunicado.titulo.trim() || !formComunicado.mensagem.trim()) {
      return notificar('aviso', 'Campos obrigatórios', 'Preencha o título e a mensagem do comunicado.');
    }
    setSalvando(true);
    try {
      await addDoc(collection(db, 'comunicados'), {
        titulo: formComunicado.titulo.trim(),
        destinatario: formComunicado.destinatario,
        mensagem: formComunicado.mensagem.trim(),
        autor: `${perfilDemo.cargo} ${perfilDemo.nome}`,
        criadoEm: serverTimestamp(),
      });
      setModalComunicadoCoord(false);
      setFormComunicado(FORM_COMUNICADO_INICIAL);
      void buscarDadosDoFirebase();
      notificar('sucesso', 'Comunicado publicado!', `Enviado para: ${formComunicado.destinatario}.`);
    } catch (error: any) {
      notificar('erro', 'Erro ao publicar', error?.message || 'Não foi possível salvar o comunicado no Firestore.');
    } finally { setSalvando(false); }
  };

  const salvarNovoUsuario = async () => {
    const { nome, email, cpf, role, disciplina } = formUser;
    if (!nome.trim() || !email.trim() || cpf.replace(/\D/g, '').length < 11) {
      return notificar('aviso', 'Campos obrigatórios', 'Preencha nome completo, e-mail válido e CPF (11 dígitos).');
    }
    if (role === 'professor' && !disciplina.trim()) {
      return notificar('aviso', 'Campos obrigatórios', 'Informe a disciplina ministrada pelo professor.');
    }
    const emailLimpo = email.trim().toLowerCase();
    const senhaGerada = gerarSenhaInicial(nome, cpf);
    setSalvando(true);
    try {
      const uid = await criarContaAuthSemDeslogar(emailLimpo, senhaGerada);
      await setDoc(doc(db, 'usuarios', uid), {
        nome: nome.trim(),
        email: emailLimpo,
        cpf: cpf.replace(/\D/g, ''),
        role,
        ...(role === 'professor' ? { disciplina: disciplina.trim() } : {}),
        ativo: true,
        senhaInicialGerada: senhaGerada,
        criadoPor: perfilDemo.nome,
        criadoEm: serverTimestamp(),
      });
      setModalUsuario(false);
      setFormUser({ nome: '', email: '', cpf: '', role: 'professor', disciplina: '' });
      void buscarDadosDoFirebase();
      notificar('sucesso', 'Usuário cadastrado!', `${nome.trim()} (${role.toUpperCase()}) • Senha inicial: ${senhaGerada}`);
    } catch (error: any) {
      const msg =
        error?.code === 'auth/email-already-in-use'
          ? 'Este e-mail já está cadastrado na autenticação.'
          : error?.code === 'auth/weak-password'
            ? 'A senha gerada precisa ter pelo menos 6 caracteres.'
            : error?.message || 'Não foi possível criar o usuário.';
      notificar('erro', 'Erro ao salvar usuário', msg);
    } finally {
      setSalvando(false);
    }
  };

  const salvarNovaTurma = async () => {
    const { nome, turno } = formTurma;
    if (!nome.trim()) return notificar('aviso', 'Campos obrigatórios', 'Preencha o nome da turma / série.');
    setSalvando(true);
    try {
      await addDoc(collection(db, 'turmas'), { nome: nome.trim(), turno, alunos: 0, criadoPor: perfilDemo.nome, criadoEm: serverTimestamp() });
      setModalTurma(false);
      setFormTurma({ nome: '', turno: 'Matutino' });
      void buscarDadosDoFirebase();
      notificar('sucesso', 'Turma cadastrada!', `${nome.trim()} (${turno}) criada com sucesso.`);
    } catch (error: any) {
      notificar('erro', 'Erro ao salvar turma', error?.message || 'Não foi possível gravar a turma no Firestore.');
    } finally { setSalvando(false); }
  };

  const exportarRelatorioCSV = () => {
    if (todasTurmas.length === 0) return notificar('aviso', 'Relatório vazio', 'Nenhuma turma cadastrada para exportar.');
    const csv = 'Turma,Turno,Alunos\n' + todasTurmas.map(t => `"${t.nome || ''}","${t.turno || ''}",${t.alunos ?? 0}`).join('\n');
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `relatorio-violeta-${getDataDeHoje()}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      notificar('sucesso', 'Relatório exportado', `CSV baixado com ${todasTurmas.length} turma(s).`);
    } else {
      notificar('sucesso', 'Relatório Gerado', `Total exportável: ${todasTurmas.length} turmas e ${totalEquipeAtiva} usuários.`);
    }
  };

  // === DADOS DOS PAINÉIS ===
  const turmasVisiveis = perfil === 'professor'
    ? todasTurmas.filter(t => t.professorId === ID_PROFESSOR_DEMONSTRATIVO || String(t.professorNome || '').toLowerCase().includes('luffy'))
    : todasTurmas;
  const turmasDeHojePendentes = turmasVisiveis
    .filter(t => t.diaId === diaBusca && !chamadasRealizadasHoje.includes(t.id))
    .sort((a, b) => (a.horario || '').localeCompare(b.horario || ''));

  const kpisAdmin = [
    { id: 'turmas', titulo: 'Turmas', valor: String(todasTurmas.length), status: 'Ativas', corPill: tema.botaoPrimario, icone: 'people-outline' as const },
    { id: 'equipe', titulo: 'Prof. / Coord.', valor: String(totalEquipeAtiva), status: 'Vinculados', corPill: '#2E7D32', icone: 'person-outline' as const },
    { id: 'chamados', titulo: 'Chamados', valor: String(chamadosPendentes), status: chamadosPendentes > 0 ? 'Pendentes' : 'Em dia', corPill: chamadosPendentes > 0 ? '#EF6C00' : '#2E7D32', icone: 'construct-outline' as const },
  ];
  const kpisCoordenador = [
    { id: 'alunos', titulo: 'Alunos', valor: String(totalAlunosBase), status: 'Matriculados', corPill: tema.botaoPrimario, icone: 'school-outline' as const },
    { id: 'turmas', titulo: 'Turmas', valor: String(todasTurmas.length), status: 'Ativas', corPill: '#2E7D32', icone: 'layers-outline' as const },
    { id: 'professores', titulo: 'Professores', valor: String(totalProfessoresAtivos), status: 'Docentes', corPill: '#6366F1', icone: 'people-outline' as const },
  ];
  const atalhosAdmin = [
    { key: 'auditoria', icone: 'shield-checkmark-outline' as const, titulo: 'Histórico de Auditoria', sub: 'Logs administrativos e ações do sistema', onPress: () => router.push('/historico?aba=auditoria') },
    { key: 'encerrados', icone: 'checkmark-done-circle-outline' as const, titulo: 'Chamados Encerrados', sub: 'Arquivo de tickets concluídos pela TI', onPress: () => router.push('/historico?aba=chamados') },
    { key: 'csv', icone: 'download-outline' as const, titulo: 'Exportar Relatório (CSV)', sub: 'Resumo da base de turmas e usuários', onPress: exportarRelatorioCSV },
  ];
  const totalAlertasCoord = aulasPendentesHojeCoord.length + turmasSemAlunosCoord.length;
  const atalhosCoordenador = [
    { key: 'diarios', icone: 'book-outline' as const, titulo: 'Diários e Boletins', sub: 'Consultar chamadas assinadas e desempenho das turmas', onPress: () => router.push('/historico') },
    { key: 'comunicado', icone: 'megaphone-outline' as const, titulo: 'Publicar Comunicado Oficial', sub: 'Disparar aviso para docentes ou série específica', onPress: abrirModalComunicadoCoord },
    { key: 'alertas', icone: 'warning-outline' as const, titulo: 'Alertas Pedagógicos', sub: totalAlertasCoord > 0 ? `${totalAlertasCoord} ponto(s) de atenção encontrados hoje` : 'Nenhum alerta pendente no momento', onPress: () => setModalAlertasCoord(true) },
  ];
  const toastProps = { feedback, onFechar: fecharFeedback, fundoCard: tema.fundoTopo, textoPrincipal: tema.textoPrincipal, textoSecundario: tema.textoSecundario };
  const [fraseCitacao, fraseAutor] = fraseMotivacional.split(' - ');
  const estiloOverlayTeclado = { paddingBottom: alturaTeclado > 0 ? alturaTeclado : 0 };
  const estiloScrollModal = { padding: 20, paddingBottom: alturaTeclado > 0 ? 150 : 28 + bottomInset };

  // === INTERFACE ===
  return (
    <View style={[styles.container, { backgroundColor: tema.fundoBase }]}>
      <Image source={ICONE_VIOLETA} style={styles.bgWatermark} resizeMode="cover" pointerEvents="none" />
      <ScrollView contentContainerStyle={[styles.scrollContent, { paddingBottom: 30 + bottomInset }]} showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={carregando} onRefresh={() => void buscarDadosDoFirebase(true)} tintColor={tema.botaoPrimario} />}>
        {/* Cabeçalho e Saudação */}
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.tituloSaudacao, { color: tema.textoPrincipal }]}>{saudacaoTempo}, {perfilDemo.nome.split(' ')[0]}!</Text>
            <View style={[styles.badgeDemonstracao, { backgroundColor: tema.inputBackground, borderColor: tema.borda, borderWidth: 1 }]}>
              <Text style={[styles.textoBadgeDemonstracao, { color: tema.textoSecundario }]}>Modo demonstração</Text>
            </View>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity style={styles.iconButton} onPress={() => setModalNotificacoes(true)}>
              <Ionicons name="notifications-outline" size={24} color={tema.textoPrincipal} />
              {totalNaoLidas > 0 && <View style={styles.notificationBadge}><Text style={styles.badgeText}>{totalNaoLidas > 9 ? '9+' : totalNaoLidas}</Text></View>}
            </TouchableOpacity>
            <TouchableOpacity style={[styles.avatar, { backgroundColor: tema.inputBackground, borderColor: tema.borda }]} onPress={() => router.push('/perfil')}>
              <Ionicons name="person" size={20} color={tema.botaoPrimario} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Banner Motivacional (Identidade VIOLETA) */}
        <View style={[styles.banner, { backgroundColor: tema.fundoTopo }]}>
          <Text style={[styles.textoBanner, { color: tema.textoLogo }]}>"{fraseCitacao}"</Text>
          <Text style={[styles.assinaturaBanner, { color: tema.textoLogo, opacity: 0.85 }]}>{fraseAutor}</Text>
          <Ionicons name="school" size={60} color={tema.textoLogo} style={styles.watermark} />
        </View>

        {/* Visão Administrador */}
        {perfil === 'admin' && (
          <View>
            <View style={styles.sectionHeader}><Text style={[styles.sectionTitle, { color: tema.textoPrincipal }]}>Resumo administrativo</Text></View>
            <View style={styles.gradeIndicadores}>
              {kpisAdmin.map(kpi => (
                <View key={kpi.id} style={[styles.cardIndicador, { backgroundColor: tema.inputBackground, borderColor: tema.borda }]}>
                  <Ionicons name={kpi.icone} size={22} color={tema.botaoPrimario} />
                  <Text style={[styles.valorIndicador, { color: tema.textoPrincipal }]}>{kpi.valor}</Text>
                  <Text style={[styles.tituloIndicador, { color: tema.textoSecundario }]}>{kpi.titulo}</Text>
                  <View style={[styles.pillStatus, { backgroundColor: kpi.corPill + '20' }]}><Text style={[styles.textoPillStatus, { color: kpi.corPill }]}>{kpi.status}</Text></View>
                </View>
              ))}
            </View>
            <TouchableOpacity onPress={() => void buscarDadosDoFirebase(true)} disabled={sincronizando} activeOpacity={0.7} style={[styles.barraStatus, { backgroundColor: tema.inputBackground, borderColor: tema.borda }]}>
              <View style={[styles.pontoOnline, { backgroundColor: sincronizando ? '#EF6C00' : '#2E7D32' }]} />
              <Text style={[styles.textoStatusSistema, { color: tema.textoSecundario }]}>
                {sincronizando ? 'Sincronizando com o Firebase...' : `Firebase Conectado • ${ultimaSinc ? `Sincronizado às ${ultimaSinc}` : 'Aguardando sincronização'}`}
              </Text>
              {sincronizando ? <ActivityIndicator size="small" color={tema.botaoPrimario} /> : <Ionicons name="refresh" size={16} color={tema.textoSecundario} />}
            </TouchableOpacity>
            <View style={[styles.sectionHeader, { marginTop: 24 }]}><Text style={[styles.sectionTitle, { color: tema.textoPrincipal }]}>Ações rápidas</Text></View>
            <View style={styles.rowAcoes}>
              <TouchableOpacity style={[styles.btnAcaoRapida, { backgroundColor: tema.botaoPrimario }]} onPress={() => setModalUsuario(true)}>
                <Ionicons name="person-add-outline" size={18} color={tema.textoBotao} />
                <Text style={[styles.textoBtnAcao, { color: tema.textoBotao }]}>Novo Usuário</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.btnAcaoRapida, { backgroundColor: tema.inputBackground, borderColor: tema.botaoPrimario, borderWidth: 1 }]} onPress={() => setModalTurma(true)}>
                <Ionicons name="add-circle-outline" size={18} color={tema.botaoPrimario} />
                <Text style={[styles.textoBtnAcao, { color: tema.botaoPrimario }]}>Nova Turma</Text>
              </TouchableOpacity>
            </View>
            <View style={[styles.sectionHeader, { marginTop: 26 }]}><Text style={[styles.sectionTitle, { color: tema.textoPrincipal }]}>Gestão e auditoria</Text></View>
            {atalhosAdmin.map(item => (
              <TouchableOpacity key={item.key} style={[styles.atalho, { backgroundColor: tema.inputBackground, borderColor: tema.borda }]} onPress={item.onPress}>
                <Ionicons name={item.icone} size={22} color={tema.botaoPrimario} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.textoAtalho, { color: tema.textoPrincipal }]}>{item.titulo}</Text>
                  <Text style={[styles.subAtalho, { color: tema.textoSecundario }]}>{item.sub}</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={tema.icone} />
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Visão Coordenador */}
        {perfil === 'coordenador' && (
          <View>
            <View style={styles.sectionHeader}><Text style={[styles.sectionTitle, { color: tema.textoPrincipal }]}>Painel da coordenação</Text></View>
            <View style={styles.gradeIndicadores}>
              {kpisCoordenador.map(kpi => (
                <View key={kpi.id} style={[styles.cardIndicador, { backgroundColor: tema.inputBackground, borderColor: tema.borda }]}>
                  <Ionicons name={kpi.icone} size={22} color={tema.botaoPrimario} />
                  <Text style={[styles.valorIndicador, { color: tema.textoPrincipal }]}>{kpi.valor}</Text>
                  <Text style={[styles.tituloIndicador, { color: tema.textoSecundario }]}>{kpi.titulo}</Text>
                  <View style={[styles.pillStatus, { backgroundColor: kpi.corPill + '20' }]}><Text style={[styles.textoPillStatus, { color: kpi.corPill }]}>{kpi.status}</Text></View>
                </View>
              ))}
            </View>
            <TouchableOpacity onPress={() => void buscarDadosDoFirebase(true)} disabled={sincronizando} activeOpacity={0.7} style={[styles.barraStatus, { backgroundColor: tema.inputBackground, borderColor: tema.borda }]}>
              <View style={[styles.pontoOnline, { backgroundColor: sincronizando ? '#EF6C00' : '#2E7D32' }]} />
              <Text style={[styles.textoStatusSistema, { color: tema.textoSecundario }]}>
                {sincronizando ? 'Sincronizando dados acadêmicos...' : `Base Acadêmica • ${ultimaSinc ? `Sincronizado às ${ultimaSinc}` : 'Pronto para sincronizar'}`}
              </Text>
              {sincronizando ? <ActivityIndicator size="small" color={tema.botaoPrimario} /> : <Ionicons name="refresh" size={16} color={tema.textoSecundario} />}
            </TouchableOpacity>
            <View style={[styles.sectionHeader, { marginTop: 24 }]}><Text style={[styles.sectionTitle, { color: tema.textoPrincipal }]}>Ações da coordenação</Text></View>
            <View style={styles.rowAcoes}>
              <TouchableOpacity style={[styles.btnAcaoRapida, { backgroundColor: tema.botaoPrimario }]} onPress={abrirModalNovoAlunoCoord}>
                <Ionicons name="person-add-outline" size={18} color={tema.textoBotao} />
                <Text style={[styles.textoBtnAcao, { color: tema.textoBotao }]}>Cadastrar Aluno</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.btnAcaoRapida, { backgroundColor: tema.inputBackground, borderColor: tema.botaoPrimario, borderWidth: 1 }]} onPress={abrirModalGradeCoord}>
                <Ionicons name="calendar-outline" size={18} color={tema.botaoPrimario} />
                <Text style={[styles.textoBtnAcao, { color: tema.botaoPrimario }]}>Montar Grade</Text>
              </TouchableOpacity>
            </View>
            <View style={[styles.sectionHeader, { marginTop: 26 }]}><Text style={[styles.sectionTitle, { color: tema.textoPrincipal }]}>Controle acadêmico</Text></View>
            {atalhosCoordenador.map(item => (
              <TouchableOpacity key={item.key} style={[styles.atalho, { backgroundColor: tema.inputBackground, borderColor: tema.borda }]} onPress={item.onPress}>
                <Ionicons name={item.icone} size={22} color={item.key === 'alertas' && totalAlertasCoord > 0 ? '#EF6C00' : tema.botaoPrimario} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.textoAtalho, { color: tema.textoPrincipal }]}>{item.titulo}</Text>
                  <Text style={[styles.subAtalho, { color: tema.textoSecundario }]}>{item.sub}</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={tema.icone} />
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Visão Professor */}
        {perfil === 'professor' && (
          <>
            <View style={styles.sectionHeader}><Text style={[styles.sectionTitle, { color: tema.textoPrincipal }]}>Meu Cronograma</Text></View>
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
                        <Text style={[styles.textoDiaNome, { color: isHoje ? tema.textoBotao : tema.textoPrincipal }]}>{dia.nome}</Text>
                      </View>
                      <View style={styles.corpoColuna}>
                        {aulasDoDia.length === 0 ? (
                          <Text style={{ textAlign: 'center', fontSize: 13, fontStyle: 'italic', color: tema.textoSecundario, marginTop: 40 }}>Livre</Text>
                        ) : aulasDoDia.map(aula => {
                          const cor = CORES_MATERIA[aula.disciplina] || { bg: tema.botaoPrimario + '20', text: tema.botaoPrimario };
                          const concluida = chamadasRealizadasHoje.includes(aula.id);
                          return (
                            <View key={aula.id} style={[styles.blocoAula, { backgroundColor: cor.bg }]}>
                              <Text style={[styles.blocoMateria, { color: cor.text }]} numberOfLines={2}>{aula.disciplina} {concluida && <Ionicons name="checkmark-circle" size={12} color={cor.text} />}</Text>
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
              <TouchableOpacity onPress={() => router.push('/(tabs)/turmas')}><Text style={[styles.btnVerTodas, { color: tema.botaoPrimario }]}>Ver grade completa {'>'}</Text></TouchableOpacity>
            </View>
            {carregando ? (
              <Text style={{ textAlign: 'center', marginTop: 20, color: tema.textoSecundario }}>Procurando turmas...</Text>
            ) : turmasDeHojePendentes.length === 0 ? (
              <View style={{ alignItems: 'center', marginTop: 20 }}>
                <Ionicons name="checkmark-circle-outline" size={40} color="#2E7D32" />
                <Text style={{ textAlign: 'center', marginTop: 10, color: '#2E7D32', fontWeight: 'bold' }}>Tudo pronto!</Text>
                <Text style={{ textAlign: 'center', color: tema.textoSecundario }}>Você não tem chamadas pendentes hoje.</Text>
              </View>
            ) : turmasDeHojePendentes.map(turma => (
              <TouchableOpacity key={turma.id} style={[styles.cardTurma, { backgroundColor: tema.inputBackground, borderColor: tema.borda }]} activeOpacity={0.7} onPress={() => router.push(`/chamada?id=${turma.id}`)}>
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
            ))}
          </>
        )}
      </ScrollView>

      {/* Modal: Cadastrar Aluno (Coordenador) */}
      <Modal visible={modalAlunoCoord} transparent animationType="slide" onRequestClose={() => setModalAlunoCoord(false)}>
        <View style={[styles.modalOverlay, estiloOverlayTeclado]}>
          <View style={[styles.modalFormContent, { backgroundColor: tema.fundoBase, borderColor: tema.borda }]}>
            <View style={[styles.modalHeader, { borderBottomColor: tema.borda }]}>
              <Text style={[styles.modalTitle, { color: tema.textoPrincipal }]}>Cadastrar Aluno na Turma</Text>
              <TouchableOpacity onPress={() => setModalAlunoCoord(false)}><Ionicons name="close" size={24} color={tema.textoPrincipal} /></TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={estiloScrollModal} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              <Text style={[styles.subSecaoModal, { color: tema.botaoPrimario }]}>1. Dados do Aluno</Text>
              <Text style={[styles.labelInput, { color: tema.textoPrincipal }]}>Nome Completo *</Text>
              <TextInput value={formAluno.nome} onChangeText={v => setFormAluno(prev => ({ ...prev, nome: v }))} placeholder="Ex: Lucas Andrade Souza" placeholderTextColor={tema.textoSecundario} style={[styles.input, { backgroundColor: tema.inputBackground, color: tema.textoPrincipal, borderColor: tema.borda }]} />
              <View style={styles.rowDupla}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.labelInput, { color: tema.textoPrincipal }]}>Data de Nascimento *</Text>
                  <TextInput value={formAluno.dataNascimento} onChangeText={v => setFormAluno(prev => ({ ...prev, dataNascimento: formatarDataInput(v) }))} keyboardType="numeric" maxLength={10} placeholder="DD/MM/AAAA" placeholderTextColor={tema.textoSecundario} style={[styles.input, { backgroundColor: tema.inputBackground, color: tema.textoPrincipal, borderColor: tema.borda }]} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.labelInput, { color: tema.textoPrincipal }]}>Matrícula (opcional)</Text>
                  <TextInput value={formAluno.matricula} onChangeText={v => setFormAluno(prev => ({ ...prev, matricula: v }))} placeholder="Auto se vazio" placeholderTextColor={tema.textoSecundario} style={[styles.input, { backgroundColor: tema.inputBackground, color: tema.textoPrincipal, borderColor: tema.borda }]} />
                </View>
              </View>
              <Text style={[styles.subSecaoModal, { color: tema.botaoPrimario, marginTop: 4 }]}>2. Responsável Legal</Text>
              <Text style={[styles.labelInput, { color: tema.textoPrincipal }]}>Nome do Responsável *</Text>
              <TextInput value={formAluno.responsavelNome} onChangeText={v => setFormAluno(prev => ({ ...prev, responsavelNome: v }))} placeholder="Ex: Maria Andrade" placeholderTextColor={tema.textoSecundario} style={[styles.input, { backgroundColor: tema.inputBackground, color: tema.textoPrincipal, borderColor: tema.borda }]} />
              <Text style={[styles.labelInput, { color: tema.textoPrincipal }]}>Telefone / WhatsApp *</Text>
              <TextInput value={formAluno.responsavelTelefone} onChangeText={v => setFormAluno(prev => ({ ...prev, responsavelTelefone: formatarTelefoneInput(v) }))} keyboardType="phone-pad" maxLength={15} placeholder="(71) 99999-9999" placeholderTextColor={tema.textoSecundario} style={[styles.input, { backgroundColor: tema.inputBackground, color: tema.textoPrincipal, borderColor: tema.borda }]} />
              <Text style={[styles.subSecaoModal, { color: tema.botaoPrimario, marginTop: 4 }]}>3. Alocação (Série → Turno → Sala)</Text>
              <Text style={[styles.labelInput, { color: tema.textoPrincipal }]}>Série *</Text>
              <TouchableOpacity style={[styles.dropdownTrigger, { backgroundColor: tema.inputBackground, borderColor: dropdownSerieAberto ? tema.botaoPrimario : tema.borda }]} onPress={() => { setDropdownSerieAberto(!dropdownSerieAberto); setDropdownSalaAberto(false); }} activeOpacity={0.75}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Ionicons name="folder-outline" size={18} color={tema.botaoPrimario} />
                  <Text style={{ color: formAluno.serieSelecionada ? tema.textoPrincipal : tema.textoSecundario, fontSize: 14, fontWeight: formAluno.serieSelecionada ? '600' : '400' }}>{formAluno.serieSelecionada || 'Selecionar série...'}</Text>
                </View>
                <Ionicons name={dropdownSerieAberto ? 'chevron-up' : 'chevron-down'} size={18} color={tema.textoSecundario} />
              </TouchableOpacity>
              {dropdownSerieAberto && (
                <View style={[styles.dropdownLista, { backgroundColor: tema.inputBackground, borderColor: tema.borda }]}>
                  {seriesDisponiveis.length === 0 ? (
                    <Text style={{ color: tema.textoSecundario, padding: 12, fontSize: 13 }}>Nenhuma série cadastrada no banco.</Text>
                  ) : seriesDisponiveis.map(serie => {
                    const sel = formAluno.serieSelecionada === serie;
                    return (
                      <TouchableOpacity key={serie} style={[styles.dropdownItem, { borderBottomColor: tema.borda, backgroundColor: sel ? tema.botaoPrimario + '18' : 'transparent' }]} onPress={() => selecionarSerie(serie)}>
                        <Text style={{ color: sel ? tema.botaoPrimario : tema.textoPrincipal, fontWeight: sel ? '700' : '500', fontSize: 14 }}>{serie}</Text>
                        {sel && <Ionicons name="checkmark" size={18} color={tema.botaoPrimario} />}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}
              {!!formAluno.serieSelecionada && (
                <>
                  <Text style={[styles.labelInput, { color: tema.textoPrincipal, marginTop: 10 }]}>Turno *</Text>
                  <View style={styles.rowChips}>
                    {TURNOS.map(turno => {
                      const disponivel = turnosDisponiveisDaSerie.has(turno);
                      const sel = formAluno.turnoSelecionado === turno;
                      return (
                        <TouchableOpacity key={turno} disabled={!disponivel} onPress={() => selecionarTurnoAluno(turno)} style={[styles.chip, { borderColor: sel ? tema.botaoPrimario : tema.borda, backgroundColor: sel ? tema.botaoPrimario + '20' : tema.inputBackground, opacity: disponivel ? 1 : 0.35 }]}>
                          <Text style={{ color: sel ? tema.botaoPrimario : disponivel ? tema.textoPrincipal : tema.textoSecundario, fontSize: 12, fontWeight: '700' }}>{turno}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </>
              )}
              {!!formAluno.serieSelecionada && !!formAluno.turnoSelecionado && (
                <>
                  <Text style={[styles.labelInput, { color: tema.textoPrincipal }]}>Sala Disponível *</Text>
                  <TouchableOpacity style={[styles.dropdownTrigger, { backgroundColor: tema.inputBackground, borderColor: dropdownSalaAberto ? tema.botaoPrimario : tema.borda }]} onPress={() => setDropdownSalaAberto(!dropdownSalaAberto)} activeOpacity={0.75}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Ionicons name="school-outline" size={18} color={tema.botaoPrimario} />
                      <Text style={{ color: formAluno.turmaNome ? tema.textoPrincipal : tema.textoSecundario, fontSize: 14, fontWeight: formAluno.turmaNome ? '600' : '400' }}>
                        {formAluno.turmaNome ? `${formAluno.turmaNome} (${formAluno.turnoSelecionado})` : 'Selecionar sala...'}
                      </Text>
                    </View>
                    <Ionicons name={dropdownSalaAberto ? 'chevron-up' : 'chevron-down'} size={18} color={tema.textoSecundario} />
                  </TouchableOpacity>
                  {dropdownSalaAberto && (
                    <View style={[styles.dropdownLista, { backgroundColor: tema.inputBackground, borderColor: tema.borda }]}>
                      {salasFiltradas.map(sala => {
                        const sel = formAluno.turmaId === sala.id;
                        return (
                          <TouchableOpacity key={sala.id} style={[styles.dropdownItem, { borderBottomColor: tema.borda, backgroundColor: sel ? tema.botaoPrimario + '18' : 'transparent' }]} onPress={() => { setFormAluno(prev => ({ ...prev, turmaId: sala.id, turmaNome: sala.nome })); setDropdownSalaAberto(false); }}>
                            <View>
                              <Text style={{ color: sel ? tema.botaoPrimario : tema.textoPrincipal, fontWeight: sel ? '700' : '600', fontSize: 14 }}>{sala.nome}</Text>
                              <Text style={{ color: tema.textoSecundario, fontSize: 11 }}>{sala.alunos ?? 0} aluno(s) matriculado(s)</Text>
                            </View>
                            {sel && <Ionicons name="checkmark" size={18} color={tema.botaoPrimario} />}
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  )}
                </>
              )}
              <Text style={[styles.labelInput, { color: tema.textoPrincipal, marginTop: 12 }]}>Observações / Saúde (opcional)</Text>
              <TextInput value={formAluno.observacoes} onChangeText={v => setFormAluno(prev => ({ ...prev, observacoes: v }))} placeholder="Ex: Alergia alimentar, necessidade pedagógica..." placeholderTextColor={tema.textoSecundario} multiline numberOfLines={2} style={[styles.input, { height: 70, paddingTop: 10, textAlignVertical: 'top', backgroundColor: tema.inputBackground, color: tema.textoPrincipal, borderColor: tema.borda }]} />
              <TouchableOpacity style={[styles.btnSalvarModal, { backgroundColor: tema.botaoPrimario }]} onPress={() => void salvarAlunoCoordenacao()} disabled={salvando}>
                <Text style={[styles.textoBtnAcao, { color: tema.textoBotao }]}>{salvando ? 'Salvando...' : 'Matricular Aluno'}</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
          <FeedbackToast {...toastProps} />
        </View>
      </Modal>

      {/* Modal: Montar Grade de Aulas (Coordenador) */}
      <Modal visible={modalGradeCoord} transparent animationType="slide" onRequestClose={() => setModalGradeCoord(false)}>
        <View style={[styles.modalOverlay, estiloOverlayTeclado]}>
          <View style={[styles.modalFormContent, { backgroundColor: tema.fundoBase, borderColor: tema.borda }]}>
            <View style={[styles.modalHeader, { borderBottomColor: tema.borda }]}>
              <Text style={[styles.modalTitle, { color: tema.textoPrincipal }]}>Montar Grade de Aulas</Text>
              <TouchableOpacity onPress={() => setModalGradeCoord(false)}><Ionicons name="close" size={24} color={tema.textoPrincipal} /></TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={estiloScrollModal} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              <Text style={[styles.labelInput, { color: tema.textoPrincipal }]}>Professor *</Text>
              <TouchableOpacity style={[styles.dropdownTrigger, { backgroundColor: tema.inputBackground, borderColor: dropdownProfAberto ? tema.botaoPrimario : tema.borda }]} onPress={() => { setDropdownProfAberto(!dropdownProfAberto); setDropdownTurmaGradeAberto(false); }}>
                <Text style={{ color: formGrade.professorNome ? tema.textoPrincipal : tema.textoSecundario, fontSize: 14 }}>{formGrade.professorNome || 'Selecionar professor...'}</Text>
                <Ionicons name={dropdownProfAberto ? 'chevron-up' : 'chevron-down'} size={18} color={tema.textoSecundario} />
              </TouchableOpacity>
              {dropdownProfAberto && (
                <View style={[styles.dropdownLista, { backgroundColor: tema.inputBackground, borderColor: tema.borda }]}>
                  {professoresAtivosLista.length === 0 ? (
                    <Text style={{ color: tema.textoSecundario, padding: 12, fontSize: 13 }}>Nenhum professor ativo encontrado.</Text>
                  ) : professoresAtivosLista.map(p => (
                    <TouchableOpacity key={p.id} style={[styles.dropdownItem, { borderBottomColor: tema.borda }]} onPress={() => { setFormGrade(prev => ({ ...prev, professorId: p.id, professorNome: p.nome, disciplina: p.disciplina || prev.disciplina })); setDropdownProfAberto(false); }}>
                      <View>
                        <Text style={{ color: tema.textoPrincipal, fontWeight: '600', fontSize: 14 }}>{p.nome}</Text>
                        {!!p.disciplina && <Text style={{ color: tema.textoSecundario, fontSize: 11 }}>{p.disciplina}</Text>}
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
              <Text style={[styles.labelInput, { color: tema.textoPrincipal, marginTop: 8 }]}>Disciplina / Matéria *</Text>
              <TextInput value={formGrade.disciplina} onChangeText={v => setFormGrade(prev => ({ ...prev, disciplina: v }))} placeholder="Ex: Matemática, Física..." placeholderTextColor={tema.textoSecundario} style={[styles.input, { backgroundColor: tema.inputBackground, color: tema.textoPrincipal, borderColor: tema.borda }]} />
              <Text style={[styles.labelInput, { color: tema.textoPrincipal }]}>Turma / Sala *</Text>
              <TouchableOpacity style={[styles.dropdownTrigger, { backgroundColor: tema.inputBackground, borderColor: dropdownTurmaGradeAberto ? tema.botaoPrimario : tema.borda }]} onPress={() => { setDropdownTurmaGradeAberto(!dropdownTurmaGradeAberto); setDropdownProfAberto(false); }}>
                <Text style={{ color: formGrade.turmaNome ? tema.textoPrincipal : tema.textoSecundario, fontSize: 14 }}>{formGrade.turmaNome ? `${formGrade.turmaNome} (${formGrade.turno})` : 'Selecionar turma...'}</Text>
                <Ionicons name={dropdownTurmaGradeAberto ? 'chevron-up' : 'chevron-down'} size={18} color={tema.textoSecundario} />
              </TouchableOpacity>
              {dropdownTurmaGradeAberto && (
                <View style={[styles.dropdownLista, { backgroundColor: tema.inputBackground, borderColor: tema.borda }]}>
                  {todasTurmas.map(t => (
                    <TouchableOpacity key={t.id} style={[styles.dropdownItem, { borderBottomColor: tema.borda }]} onPress={() => { setFormGrade(prev => ({ ...prev, turmaId: t.id, turmaNome: t.nome, turno: t.turno || 'Matutino' })); setDropdownTurmaGradeAberto(false); }}>
                      <Text style={{ color: tema.textoPrincipal, fontWeight: '600', fontSize: 14 }}>{t.nome} • {t.turno || 'Matutino'}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
              <Text style={[styles.labelInput, { color: tema.textoPrincipal, marginTop: 8 }]}>Dia da Semana *</Text>
              <View style={styles.rowChips}>
                {DIAS_SEMANA.map(d => {
                  const sel = formGrade.diaId === d.id;
                  return (
                    <TouchableOpacity key={d.id} onPress={() => setFormGrade(prev => ({ ...prev, diaId: d.id }))} style={[styles.chip, { borderColor: sel ? tema.botaoPrimario : tema.borda, backgroundColor: sel ? tema.botaoPrimario + '20' : tema.inputBackground }]}>
                      <Text style={{ color: sel ? tema.botaoPrimario : tema.textoPrincipal, fontSize: 11, fontWeight: '700' }}>{d.nome.slice(0, 3)}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              <View style={styles.linhaLabelHora}>
                <Text style={[styles.labelInput, { color: tema.textoPrincipal, marginBottom: 0 }]}>Horário da Aula (24h) *</Text>
                {!!obterTurnoPorHora(formGrade.horaInicio) && (
                  <View style={[styles.pillStatus, { backgroundColor: tema.botaoPrimario + '20', marginTop: 0 }]}>
                    <Text style={[styles.textoPillStatus, { color: tema.botaoPrimario }]}>{obterTurnoPorHora(formGrade.horaInicio)}</Text>
                  </View>
                )}
              </View>
              <View style={styles.rowHorario}>
                <TextInput value={formGrade.horaInicio} onChangeText={v => setFormGrade(prev => ({ ...prev, horaInicio: formatarHoraInput(v) }))} keyboardType="numeric" maxLength={5} placeholder="07:00" placeholderTextColor={tema.textoSecundario} style={[styles.inputHora, { backgroundColor: tema.inputBackground, color: tema.textoPrincipal, borderColor: tema.borda }]} />
                <Text style={[styles.textoAte, { color: tema.textoSecundario }]}>até</Text>
                <TextInput value={formGrade.horaFim} onChangeText={v => setFormGrade(prev => ({ ...prev, horaFim: formatarHoraInput(v) }))} keyboardType="numeric" maxLength={5} placeholder="07:50" placeholderTextColor={tema.textoSecundario} style={[styles.inputHora, { backgroundColor: tema.inputBackground, color: tema.textoPrincipal, borderColor: tema.borda }]} />
              </View>
              <TouchableOpacity style={[styles.btnSalvarModal, { backgroundColor: tema.botaoPrimario }]} onPress={() => void salvarGradeCoordenacao()} disabled={salvando}>
                <Text style={[styles.textoBtnAcao, { color: tema.textoBotao }]}>{salvando ? 'Salvando...' : 'Alocar na Grade'}</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
          <FeedbackToast {...toastProps} />
        </View>
      </Modal>

      {/* Modal: Publicar Comunicado Oficial (Coordenador) */}
      <Modal visible={modalComunicadoCoord} transparent animationType="slide" onRequestClose={() => setModalComunicadoCoord(false)}>
        <View style={[styles.modalOverlay, estiloOverlayTeclado]}>
          <View style={[styles.modalFormContent, { backgroundColor: tema.fundoBase, borderColor: tema.borda }]}>
            <View style={[styles.modalHeader, { borderBottomColor: tema.borda }]}>
              <Text style={[styles.modalTitle, { color: tema.textoPrincipal }]}>Publicar Comunicado Oficial</Text>
              <TouchableOpacity onPress={() => setModalComunicadoCoord(false)}><Ionicons name="close" size={24} color={tema.textoPrincipal} /></TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={estiloScrollModal} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              <Text style={[styles.labelInput, { color: tema.textoPrincipal }]}>Destinatário</Text>
              <TouchableOpacity style={[styles.dropdownTrigger, { backgroundColor: tema.inputBackground, borderColor: dropdownDestinatarioAberto ? tema.botaoPrimario : tema.borda }]} onPress={() => setDropdownDestinatarioAberto(!dropdownDestinatarioAberto)} activeOpacity={0.75}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Ionicons name="people-outline" size={18} color={tema.botaoPrimario} />
                  <Text style={{ color: tema.textoPrincipal, fontSize: 14, fontWeight: '600' }}>{formComunicado.destinatario}</Text>
                </View>
                <Ionicons name={dropdownDestinatarioAberto ? 'chevron-up' : 'chevron-down'} size={18} color={tema.textoSecundario} />
              </TouchableOpacity>
              {dropdownDestinatarioAberto && (
                <View style={[styles.dropdownLista, { backgroundColor: tema.inputBackground, borderColor: tema.borda }]}>
                  {['Todos os Professores', ...seriesDisponiveis].map(dest => {
                    const sel = formComunicado.destinatario === dest;
                    return (
                      <TouchableOpacity key={dest} style={[styles.dropdownItem, { borderBottomColor: tema.borda, backgroundColor: sel ? tema.botaoPrimario + '18' : 'transparent' }]} onPress={() => { setFormComunicado(prev => ({ ...prev, destinatario: dest })); setDropdownDestinatarioAberto(false); }}>
                        <Text style={{ color: sel ? tema.botaoPrimario : tema.textoPrincipal, fontWeight: sel ? '700' : '500', fontSize: 14 }}>{dest}</Text>
                        {sel && <Ionicons name="checkmark" size={18} color={tema.botaoPrimario} />}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}
              <Text style={[styles.labelInput, { color: tema.textoPrincipal, marginTop: 8 }]}>Título do Comunicado *</Text>
              <TextInput value={formComunicado.titulo} onChangeText={v => setFormComunicado(prev => ({ ...prev, titulo: v }))} placeholder="Ex: Fechamento de notas do 1º Bimestre" placeholderTextColor={tema.textoSecundario} style={[styles.input, { backgroundColor: tema.inputBackground, color: tema.textoPrincipal, borderColor: tema.borda }]} />
              <Text style={[styles.labelInput, { color: tema.textoPrincipal }]}>Mensagem *</Text>
              <TextInput value={formComunicado.mensagem} onChangeText={v => setFormComunicado(prev => ({ ...prev, mensagem: v }))} placeholder="Escreva o comunicado para a equipe..." placeholderTextColor={tema.textoSecundario} multiline numberOfLines={4} style={[styles.input, { height: 100, paddingTop: 10, textAlignVertical: 'top', backgroundColor: tema.inputBackground, color: tema.textoPrincipal, borderColor: tema.borda }]} />
              <TouchableOpacity style={[styles.btnSalvarModal, { backgroundColor: tema.botaoPrimario }]} onPress={() => void salvarComunicadoCoordenacao()} disabled={salvando}>
                <Text style={[styles.textoBtnAcao, { color: tema.textoBotao }]}>{salvando ? 'Publicando...' : 'Publicar Comunicado'}</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
          <FeedbackToast {...toastProps} />
        </View>
      </Modal>

      {/* Modal: Alertas Pedagógicos (Coordenador) */}
      <Modal visible={modalAlertasCoord} transparent animationType="slide" onRequestClose={() => setModalAlertasCoord(false)}>
        <View style={[styles.modalOverlay, estiloOverlayTeclado]}>
          <View style={[styles.modalFormContent, { backgroundColor: tema.fundoBase, borderColor: tema.borda }]}>
            <View style={[styles.modalHeader, { borderBottomColor: tema.borda }]}>
              <Text style={[styles.modalTitle, { color: tema.textoPrincipal }]}>Alertas Pedagógicos</Text>
              <TouchableOpacity onPress={() => setModalAlertasCoord(false)}><Ionicons name="close" size={24} color={tema.textoPrincipal} /></TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={estiloScrollModal} showsVerticalScrollIndicator={false}>
              {totalAlertasCoord === 0 ? (
                <View style={{ alignItems: 'center', paddingVertical: 30 }}>
                  <Ionicons name="checkmark-circle-outline" size={44} color="#2E7D32" />
                  <Text style={{ color: '#2E7D32', fontWeight: 'bold', fontSize: 16, marginTop: 10 }}>Tudo em dia!</Text>
                  <Text style={{ color: tema.textoSecundario, fontSize: 13, marginTop: 4, textAlign: 'center' }}>Nenhuma pendência de chamada hoje ou turma vazia.</Text>
                </View>
              ) : (
                <>
                  {aulasPendentesHojeCoord.length > 0 && (
                    <>
                      <Text style={[styles.subSecaoModal, { color: '#EF6C00' }]}>Chamadas Pendentes Hoje ({aulasPendentesHojeCoord.length})</Text>
                      {aulasPendentesHojeCoord.map(aula => (
                        <View key={aula.id} style={[styles.cardAlerta, { backgroundColor: tema.inputBackground, borderColor: tema.borda }]}>
                          <Ionicons name="time-outline" size={20} color="#EF6C00" />
                          <View style={{ flex: 1 }}>
                            <Text style={{ color: tema.textoPrincipal, fontWeight: '700', fontSize: 14 }}>{aula.nome} • {aula.disciplina}</Text>
                            <Text style={{ color: tema.textoSecundario, fontSize: 12 }}>{aula.professorNome || 'Sem professor'} • {aula.horario}</Text>
                          </View>
                        </View>
                      ))}
                    </>
                  )}
                  {turmasSemAlunosCoord.length > 0 && (
                    <>
                      <Text style={[styles.subSecaoModal, { color: tema.botaoPrimario, marginTop: 12 }]}>Turmas Sem Alunos ({turmasSemAlunosCoord.length})</Text>
                      {turmasSemAlunosCoord.map(t => (
                        <View key={t.id} style={[styles.cardAlerta, { backgroundColor: tema.inputBackground, borderColor: tema.borda }]}>
                          <Ionicons name="school-outline" size={20} color={tema.botaoPrimario} />
                          <View style={{ flex: 1 }}>
                            <Text style={{ color: tema.textoPrincipal, fontWeight: '700', fontSize: 14 }}>{t.nome}</Text>
                            <Text style={{ color: tema.textoSecundario, fontSize: 12 }}>{t.turno || 'Matutino'} • 0 alunos matriculados</Text>
                          </View>
                        </View>
                      ))}
                    </>
                  )}
                </>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Modal: Cadastrar Novo Usuário (Admin) */}
      <Modal visible={modalUsuario} transparent animationType="slide" onRequestClose={() => setModalUsuario(false)}>
        <View style={[styles.modalOverlay, estiloOverlayTeclado]}>
          <View style={[styles.modalFormContent, { backgroundColor: tema.fundoBase, borderColor: tema.borda }]}>
            <View style={[styles.modalHeader, { borderBottomColor: tema.borda }]}>
              <Text style={[styles.modalTitle, { color: tema.textoPrincipal }]}>Cadastrar Novo Usuário</Text>
              <TouchableOpacity onPress={() => setModalUsuario(false)}><Ionicons name="close" size={24} color={tema.textoPrincipal} /></TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={estiloScrollModal} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              <Text style={[styles.labelInput, { color: tema.textoPrincipal }]}>Nome Completo</Text>
              <TextInput value={formUser.nome} onChangeText={v => setFormUser({ ...formUser, nome: v })} placeholder="Ex: Carlos Eduardo Silva" placeholderTextColor={tema.textoSecundario} style={[styles.input, { backgroundColor: tema.inputBackground, color: tema.textoPrincipal, borderColor: tema.borda }]} />
              <Text style={[styles.labelInput, { color: tema.textoPrincipal }]}>E-mail Institucional</Text>
              <TextInput value={formUser.email} onChangeText={v => setFormUser({ ...formUser, email: v })} keyboardType="email-address" autoCapitalize="none" placeholder="usuario@violeta.com" placeholderTextColor={tema.textoSecundario} style={[styles.input, { backgroundColor: tema.inputBackground, color: tema.textoPrincipal, borderColor: tema.borda }]} />
              <Text style={[styles.labelInput, { color: tema.textoPrincipal }]}>CPF</Text>
              <TextInput value={formUser.cpf} onChangeText={v => setFormUser({ ...formUser, cpf: v })} keyboardType="numeric" maxLength={14} placeholder="000.000.000-00" placeholderTextColor={tema.textoSecundario} style={[styles.input, { backgroundColor: tema.inputBackground, color: tema.textoPrincipal, borderColor: tema.borda }]} />
              <Text style={[styles.labelInput, { color: tema.textoPrincipal }]}>Cargo (Role)</Text>
              <View style={styles.rowChips}>
                {(['professor', 'coordenador'] as const).map(role => {
                  const ativo = formUser.role === role;
                  return (
                    <TouchableOpacity key={role} onPress={() => setFormUser({ ...formUser, role })} style={[styles.chip, { borderColor: ativo ? tema.botaoPrimario : tema.borda, backgroundColor: ativo ? tema.botaoPrimario + '20' : tema.inputBackground }]}>
                      <Text style={{ color: ativo ? tema.botaoPrimario : tema.textoPrincipal, fontWeight: 'bold', textTransform: 'capitalize' }}>{role}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              {formUser.role === 'professor' && (
                <>
                  <Text style={[styles.labelInput, { color: tema.textoPrincipal }]}>Disciplina / Matéria</Text>
                  <TextInput value={formUser.disciplina} onChangeText={v => setFormUser({ ...formUser, disciplina: v })} placeholder="Ex: Matemática, Física, História..." placeholderTextColor={tema.textoSecundario} style={[styles.input, { backgroundColor: tema.inputBackground, color: tema.textoPrincipal, borderColor: tema.borda }]} />
                </>
              )}
              {!!formUser.nome && formUser.cpf.replace(/\D/g, '').length >= 4 && (
                <View style={[styles.boxSenhaGerada, { backgroundColor: tema.inputBackground, borderColor: tema.borda }]}>
                  <Ionicons name="key-outline" size={16} color={tema.botaoPrimario} />
                  <Text style={{ color: tema.textoSecundario, fontSize: 12, marginLeft: 8 }}>Senha automática: <Text style={{ color: tema.textoPrincipal, fontWeight: 'bold' }}>{gerarSenhaInicial(formUser.nome, formUser.cpf)}</Text></Text>
                </View>
              )}
              <TouchableOpacity style={[styles.btnSalvarModal, { backgroundColor: tema.botaoPrimario }]} onPress={() => void salvarNovoUsuario()} disabled={salvando}>
                <Text style={[styles.textoBtnAcao, { color: tema.textoBotao }]}>{salvando ? 'Salvando...' : 'Criar Usuário'}</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
          <FeedbackToast {...toastProps} />
        </View>
      </Modal>

      {/* Modal: Cadastrar Nova Turma (Admin) */}
      <Modal visible={modalTurma} transparent animationType="slide" onRequestClose={() => setModalTurma(false)}>
        <View style={[styles.modalOverlay, estiloOverlayTeclado]}>
          <View style={[styles.modalFormContent, { backgroundColor: tema.fundoBase, borderColor: tema.borda }]}>
            <View style={[styles.modalHeader, { borderBottomColor: tema.borda }]}>
              <Text style={[styles.modalTitle, { color: tema.textoPrincipal }]}>Cadastrar Nova Turma</Text>
              <TouchableOpacity onPress={() => setModalTurma(false)}><Ionicons name="close" size={24} color={tema.textoPrincipal} /></TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={estiloScrollModal} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              <Text style={[styles.labelInput, { color: tema.textoPrincipal }]}>Nome da Turma / Série</Text>
              <TextInput value={formTurma.nome} onChangeText={v => setFormTurma({ ...formTurma, nome: v })} placeholder="Ex: 1º Ano Médio, 7º Ano B..." placeholderTextColor={tema.textoSecundario} style={[styles.input, { backgroundColor: tema.inputBackground, color: tema.textoPrincipal, borderColor: tema.borda }]} />
              <Text style={[styles.labelInput, { color: tema.textoPrincipal }]}>Turno</Text>
              <View style={styles.rowChips}>
                {TURNOS.map(t => {
                  const sel = formTurma.turno === t;
                  return (
                    <TouchableOpacity key={t} onPress={() => setFormTurma({ ...formTurma, turno: t })} style={[styles.chip, { borderColor: sel ? tema.botaoPrimario : tema.borda, backgroundColor: sel ? tema.botaoPrimario + '20' : tema.inputBackground }]}>
                      <Text style={{ color: sel ? tema.botaoPrimario : tema.textoPrincipal, fontSize: 12, fontWeight: 'bold' }}>{t}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              <TouchableOpacity style={[styles.btnSalvarModal, { backgroundColor: tema.botaoPrimario }]} onPress={() => void salvarNovaTurma()} disabled={salvando}>
                <Text style={[styles.textoBtnAcao, { color: tema.textoBotao }]}>{salvando ? 'Salvando...' : 'Criar Turma'}</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
          <FeedbackToast {...toastProps} />
        </View>
      </Modal>

      {/* Modal: Comunicados e Avisos */}
      <Modal visible={modalNotificacoes} transparent animationType="fade" onRequestClose={() => setModalNotificacoes(false)}>
        <TouchableOpacity style={[styles.modalOverlay, estiloOverlayTeclado]} activeOpacity={1} onPress={() => setModalNotificacoes(false)}>
          <TouchableOpacity activeOpacity={1} style={[styles.modalContent, { backgroundColor: tema.fundoBase }]}>
            <View style={[styles.modalHeader, { borderBottomColor: tema.borda }]}>
              <Text style={[styles.modalTitle, { color: tema.textoPrincipal }]}>Comunicados e Avisos</Text>
              {totalNaoLidas > 0 && (
                <TouchableOpacity onPress={marcarTodasComoLidas}><Text style={{ color: tema.botaoPrimario, fontSize: 12, fontWeight: '700' }}>Marcar lidas</Text></TouchableOpacity>
              )}
            </View>
            <FlatList
              data={comunicados}
              keyExtractor={item => item.id}
              contentContainerStyle={{ padding: 20, paddingBottom: 28 + bottomInset }}
              ListEmptyComponent={
                <View style={{ alignItems: 'center', paddingVertical: 40 }}>
                  <Ionicons name="notifications-off-outline" size={38} color={tema.textoSecundario} />
                  <Text style={{ color: tema.textoPrincipal, fontWeight: '700', fontSize: 15, marginTop: 10 }}>Nenhum comunicado</Text>
                  <Text style={{ color: tema.textoSecundario, fontSize: 12, marginTop: 4 }}>Os avisos da coordenação e pausas aparecerão aqui.</Text>
                </View>
              }
              renderItem={({ item }) => {
                const lida = notificacoesLidasIds.includes(item.id);
                const isCalendario = item.tipo === 'calendario';
                return (
                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => { if (!lida) setNotificacoesLidasIds(prev => [...prev, item.id]); }}
                    style={[styles.cardNotificacao, { backgroundColor: lida ? tema.inputBackground : tema.botaoPrimario + '15', borderColor: lida ? tema.borda : tema.botaoPrimario }]}
                  >
                    <Ionicons name={isCalendario ? 'calendar' : 'megaphone'} size={22} color={isCalendario ? '#EF6C00' : tema.botaoPrimario} style={{ marginRight: 14, marginTop: 2 }} />
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.tituloNotificacao, { color: tema.textoPrincipal }]}>{item.titulo}</Text>
                      <Text style={[styles.mensagemNotificacao, { color: tema.textoSecundario }]}>{item.mensagem}</Text>
                      <Text style={{ color: tema.textoSecundario, fontSize: 11, marginTop: 6, opacity: 0.8 }}>{item.autor} • Para: {item.destinatario}</Text>
                    </View>
                  </TouchableOpacity>
                );
              }}
            />
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      <FeedbackToast {...toastProps} />
    </View>
  );
}

// === ESTILOS ===
const styles = StyleSheet.create({
  container: { flex: 1 },
  bgWatermark: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, width: '100%', height: '100%', opacity: 0.15 },
  scrollContent: { padding: 20, paddingTop: 50, paddingBottom: 30 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 25 },
  headerActions: { flexDirection: 'row', alignItems: 'center' },
  iconButton: { marginRight: 15, position: 'relative', padding: 5 },
  notificationBadge: { position: 'absolute', top: 0, right: 0, minWidth: 16, height: 16, borderRadius: 8, backgroundColor: '#DB4437', borderWidth: 1, borderColor: '#FFF', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 3 },
  badgeText: { color: '#FFF', fontSize: 9, fontWeight: 'bold' },
  tituloSaudacao: { fontSize: 20, fontWeight: 'bold' },
  badgeDemonstracao: { alignSelf: 'flex-start', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 4, marginTop: 6 },
  textoBadgeDemonstracao: { fontSize: 11, fontWeight: '600' },
  avatar: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, justifyContent: 'center', alignItems: 'center' },
  banner: { width: '100%', padding: 20, borderRadius: 15, marginBottom: 25, position: 'relative', overflow: 'hidden', elevation: 3, borderWidth: 1, borderColor: 'rgba(124, 124, 255, 0.28)' },
  textoBanner: { fontSize: 15, fontWeight: 'bold', fontStyle: 'italic', marginBottom: 10, zIndex: 2, lineHeight: 22 },
  assinaturaBanner: { fontSize: 12, fontWeight: '600', zIndex: 2, alignSelf: 'flex-end' },
  watermark: { position: 'absolute', left: -10, bottom: -15, opacity: 0.2, transform: [{ rotate: '15deg' }] },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold' },
  btnVerTodas: { fontSize: 14, fontWeight: '600' },
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
  textoBtnAcao: { fontSize: 14, fontWeight: 'bold' },
  atalho: { flexDirection: 'row', alignItems: 'center', padding: 15, borderRadius: 12, borderWidth: 1, marginBottom: 10, gap: 14 },
  textoAtalho: { fontSize: 14, fontWeight: '600' },
  subAtalho: { fontSize: 11, marginTop: 2 },
  scrollMatrizContainer: { flexGrow: 0, gap: 10, paddingBottom: 10 },
  colunaDia: { flexShrink: 0, borderRadius: 16, borderWidth: 1, overflow: 'hidden' },
  cabecalhoDia: { paddingVertical: 12, alignItems: 'center' },
  textoDiaNome: { fontSize: 14, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 0.5 },
  corpoColuna: { padding: 8, minHeight: 180 },
  blocoAula: { padding: 12, borderRadius: 12, marginBottom: 10, elevation: 2 },
  blocoMateria: { fontSize: 13, fontWeight: 'bold', marginBottom: 4 },
  blocoTurma: { fontSize: 12, fontWeight: '700', marginBottom: 6 },
  blocoRodape: { flexDirection: 'column', alignItems: 'flex-start', gap: 3 },
  blocoHorario: { fontSize: 11, fontWeight: 'bold', opacity: 0.8 },
  blocoProf: { fontSize: 10, fontWeight: 'bold', opacity: 0.7 },
  cardTurma: { flexDirection: 'row', alignItems: 'center', padding: 15, borderRadius: 12, borderWidth: 1, marginBottom: 12 },
  iconeTurmaBg: { width: 50, height: 50, borderRadius: 25, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  infoTurma: { flex: 1 },
  nomeTurma: { fontSize: 16, fontWeight: 'bold' },
  materiaTurma: { fontSize: 14, marginBottom: 5 },
  detalhesTurmaMinimalista: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  textoHorarioDestaque: { fontSize: 13, fontWeight: 'bold', marginLeft: 6 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalContent: { height: '70%', borderTopLeftRadius: 25, borderTopRightRadius: 25, elevation: 10 },
  modalFormContent: { maxHeight: '90%', borderTopLeftRadius: 25, borderTopRightRadius: 25, borderWidth: 1 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1 },
  modalTitle: { fontSize: 18, fontWeight: 'bold' },
  subSecaoModal: { fontSize: 12, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 10 },
  labelInput: { fontSize: 13, fontWeight: 'bold', marginBottom: 6 },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, height: 46, marginBottom: 12, fontSize: 14 },
  linhaLabelHora: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  rowHorario: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  inputHora: { flex: 1, borderWidth: 1, borderRadius: 10, height: 46, textAlign: 'center', fontSize: 16, fontWeight: '700' },
  textoAte: { fontSize: 14, fontWeight: '700' },
  rowDupla: { flexDirection: 'row', gap: 10 },
  rowChips: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  chip: { flex: 1, height: 42, borderWidth: 1, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  dropdownTrigger: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, height: 46, marginBottom: 6 },
  dropdownLista: { borderWidth: 1, borderRadius: 10, marginBottom: 12, overflow: 'hidden' },
  dropdownItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1 },
  cardAlerta: { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderRadius: 12, padding: 12, marginBottom: 10 },
  boxSenhaGerada: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 10, borderWidth: 1, marginBottom: 16 },
  btnSalvarModal: { height: 48, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginTop: 6, marginBottom: 10 },
  cardNotificacao: { flexDirection: 'row', padding: 15, borderRadius: 12, borderWidth: 1, marginBottom: 12 },
  tituloNotificacao: { fontSize: 15, fontWeight: 'bold', marginBottom: 4 },
  mensagemNotificacao: { fontSize: 13, lineHeight: 18 },
});