import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, Modal, TextInput, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { collection, getDocs, addDoc, setDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import { useDemoProfile, type ModoTema } from '../../contexts/demoProfileContext';
import { db } from '../../config/firebase';
import { FeedbackToast, type EstadoFeedback, type TipoFeedback } from '../../components/FeedbackToast';

type EtapaStatus = 'pendente' | 'rodando' | 'ok' | 'erro';
type TamanhoFonte = 'Pequena' | 'Média' | 'Grande';
interface EtapaIntegridade { id: string; titulo: string; detalhe: string; status: EtapaStatus; erro?: string; }
interface EventoCalendario { id: string; titulo: string; tipo: 'Férias' | 'Pausa / Recesso' | 'Feriado'; periodo: string; setor: 'Coordenação' | 'Infra'; }
interface SessaoAtiva { id: string; dispositivo: string; local: string; horario: string; atual?: boolean; }

const NOMES_PERFIS = { admin: 'Administrador', coordenador: 'Coordenador', professor: 'Professor' };
const IDENTIDADES_DEMO = {
  admin: { nome: 'Marina Andrade', email: 'marina@violeta.com', iniciais: 'MA' },
  coordenador: { nome: 'Camila Rocha', email: 'camila@violeta.com', iniciais: 'CR' },
  professor: { nome: 'Luffy Baiano', email: 'luffy@violeta.com', iniciais: 'LB' },
};
const ETAPAS_INICIAIS: EtapaIntegridade[] = [
  { id: 'ping', titulo: '1. Ping e comunicação Firestore', detalhe: 'Testando latência e acesso às coleções', status: 'pendente' },
  { id: 'colecoes', titulo: '2. Contagem das coleções base', detalhe: 'turmas, grade_aulas, alunos, usuarios e chamados', status: 'pendente' },
  { id: 'vinculos', titulo: '3. Reindexação e vínculos (turmaId)', detalhe: 'Verificando alunos órfãos e horários da grade', status: 'pendente' },
  { id: 'resumo', titulo: '4. Consolidação do diagnóstico', detalhe: 'Validando consistência geral do banco', status: 'pendente' },
];
const EVENTOS_PADRAO: EventoCalendario[] = [
  { id: 'ev_1', titulo: 'Recesso de Fim de Ano', tipo: 'Pausa / Recesso', periodo: '20/12/2026 a 31/01/2027', setor: 'Coordenação' },
  { id: 'ev_2', titulo: 'Janela de Manutenção de Servidores', tipo: 'Pausa / Recesso', periodo: 'Sábados (02:00 - 06:00)', setor: 'Infra' },
];
const SESSOES_INICIAIS: SessaoAtiva[] = [
  { id: 'sess_atual', dispositivo: 'Este Dispositivo (Web / Mobile)', local: 'Salvador, BA', horario: 'Ativo agora', atual: true },
  { id: 'sess_2', dispositivo: 'Chrome • Windows 11', local: 'Salvador, BA', horario: 'Hoje às 14:20' },
  { id: 'sess_3', dispositivo: 'Android • App Violeta', local: 'Salvador, BA', horario: 'Ontem às 19:05' },
];
const COLECOES_BACKUP = ['turmas', 'grade_aulas', 'alunos', 'usuarios', 'chamados_suporte', 'chamadas'] as const;
const FATOR_FONTE: Record<TamanhoFonte, number> = { Pequena: 0.9, Média: 1, Grande: 1.15 };
const esperar = (ms: number) => new Promise(res => setTimeout(res, ms));

export default function PerfilScreen() {
  const router = useRouter();
  const { perfil, setPerfil, modoTema, setModoTema, temaAtivo: tema } = useDemoProfile();

  const usuario = { ...IDENTIDADES_DEMO[perfil], cargo: NOMES_PERFIS[perfil] };
  const nomeSolicitanteChamado = 'Luffy Baiano';

  const [modalDados, setModalDados] = useState(false);
  const [modalPrivacidade, setModalPrivacidade] = useState(false);
  const [modalSessoes, setModalSessoes] = useState(false);
  const [modalVersao, setModalVersao] = useState(false);
  const [modalAjuda, setModalAjuda] = useState(false);
  const [modalAviso, setModalAviso] = useState(false);
  const [modalInstituicao, setModalInstituicao] = useState(false);
  const [modalIntegridade, setModalIntegridade] = useState(false);
  const [confirmarLimpezaTeste, setConfirmarLimpezaTeste] = useState(false);

  const [formDados, setFormDados] = useState({ nome: usuario.nome, dataNascimento: '27/09/2003', endereco: 'Salvador, BA' });
  const [senhaAtual, setSenhaAtual] = useState('');
  const [novaSenha, setNovaSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');
  const [tamanhoFonte, setTamanhoFonte] = useState<TamanhoFonte>('Média');
  const [alertasAtivos, setAlertasAtivos] = useState(true);
  const [sessoes, setSessoes] = useState<SessaoAtiva[]>(SESSOES_INICIAIS);

  const [textoChamado, setTextoChamado] = useState('');
  const [tituloAviso, setTituloAviso] = useState('');
  const [mensagemAviso, setMensagemAviso] = useState('');

  const [abaInstituicao, setAbaInstituicao] = useState<'calendario' | 'infra'>('calendario');
  const [anoLetivo, setAnoLetivo] = useState('2026');
  const [toleranciaChamadaMin, setToleranciaChamadaMin] = useState('15');
  const [modoManutencao, setModoManutencao] = useState(false);
  const [eventos, setEventos] = useState<EventoCalendario[]>(EVENTOS_PADRAO);
  const [novoEvento, setNovoEvento] = useState({ titulo: '', tipo: 'Pausa / Recesso' as EventoCalendario['tipo'], periodo: '' });
  const [salvandoInst, setSalvandoInst] = useState(false);

  const [verificandoIntegridade, setVerificandoIntegridade] = useState(false);
  const [etapasIntegridade, setEtapasIntegridade] = useState<EtapaIntegridade[]>(ETAPAS_INICIAIS);
  const [resumoIntegridade, setResumoIntegridade] = useState<string | null>(null);

  const [backupEmAndamento, setBackupEmAndamento] = useState(false);
  const [progressoBackup, setProgressoBackup] = useState(0);
  const [etapaBackupTexto, setEtapaBackupTexto] = useState('');
  const [ultimoBackupInfo, setUltimoBackupInfo] = useState<string | null>(null);
  const [limpandoTeste, setLimpandoTeste] = useState(false);
  const [feedback, setFeedback] = useState<EstadoFeedback>({ visivel: false, tipo: 'sucesso', titulo: '', mensagem: '' });

  const escalaFonte = FATOR_FONTE[tamanhoFonte];
  const tamFonte = useCallback((base: number) => Math.round(base * escalaFonte), [escalaFonte]);

  const notificar = useCallback((tipo: TipoFeedback, titulo: string, mensagem: string) => {
    setFeedback({ visivel: true, tipo, titulo, mensagem });
  }, []);
  const fecharFeedback = useCallback(() => setFeedback(prev => ({ ...prev, visivel: false })), []);
  const voltar = () => (router.canGoBack() ? router.back() : router.replace('/(tabs)'));

  const handleLogout = () => {
    if (Platform.OS === 'web') {
      if (window.confirm('Deseja sair do sistema Violeta?')) router.replace('/');
    } else {
      Alert.alert('Encerrar Sessão', 'Deseja sair do sistema Violeta?', [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Sair', style: 'destructive', onPress: () => router.replace('/') },
      ]);
    }
  };

  const handleSalvarDados = () => {
    setModalDados(false);
    notificar('sucesso', 'Dados atualizados', 'Seus dados foram atualizados no sistema.');
  };

  const handleSalvarPreferencias = () => {
    const querAlterarSenha = !!(senhaAtual || novaSenha || confirmarSenha);
    if (querAlterarSenha) {
      if (!senhaAtual.trim()) return notificar('aviso', 'Senha atual obrigatória', 'Informe sua senha atual.');
      if (novaSenha.length < 6) return notificar('aviso', 'Senha muito curta', 'A nova senha deve ter pelo menos 6 caracteres.');
      if (novaSenha !== confirmarSenha) return notificar('erro', 'Senhas não conferem', 'A confirmação de senha deve ser igual à nova senha.');
      setSessoes(prev => prev.filter(s => s.atual));
    }
    setSenhaAtual(''); setNovaSenha(''); setConfirmarSenha('');
    setModalPrivacidade(false);
    notificar(
      'sucesso',
      'Preferências salvas',
      querAlterarSenha
        ? 'Senha alterada e demais sessões desconectadas. Faça login novamente nos outros dispositivos.'
        : `Tema: ${modoTema} • Fonte: ${tamanhoFonte} aplicadas.`
    );
  };

  const encerrarSessaoIndividual = (id: string) => {
    setSessoes(prev => prev.filter(s => s.id !== id || s.atual));
    notificar('sucesso', 'Sessão encerrada', 'O dispositivo selecionado foi desconectado.');
  };

  const encerrarOutrasSessoes = () => {
    setSessoes(prev => prev.filter(s => s.atual));
    notificar('sucesso', 'Outras sessões encerradas', 'Apenas a sessão atual permanece ativa.');
  };

  const handleEnviarChamado = async () => {
    if (!textoChamado.trim()) return notificar('aviso', 'Atenção', 'Descreva o problema antes de enviar.');
    try {
      const agora = new Date();
      await addDoc(collection(db, 'chamados_suporte'), {
        solicitante: `${nomeSolicitanteChamado} (${usuario.cargo})`, data: agora.toLocaleDateString('pt-BR'),
        hora: agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        descricao: textoChamado.trim(), status: 'pendente', timestamp: agora.getTime(), criadoEm: serverTimestamp(),
      });
      setModalAjuda(false); setTextoChamado('');
      notificar('sucesso', 'Chamado enviado', 'Ticket encaminhado para a equipe de TI.');
    } catch (error: any) {
      notificar('erro', 'Erro ao enviar chamado', error?.message || 'Falha ao gravar no Firestore.');
    }
  };

  const handleAdicionarEvento = () => {
    if (!novoEvento.titulo.trim() || !novoEvento.periodo.trim()) {
      return notificar('aviso', 'Campos obrigatórios', 'Informe o título e o período/data.');
    }
    setEventos(prev => [{ id: `ev_${Date.now()}`, titulo: novoEvento.titulo.trim(), tipo: novoEvento.tipo, periodo: novoEvento.periodo.trim(), setor: perfil === 'coordenador' ? 'Coordenação' : 'Infra' }, ...prev]);
    setNovoEvento({ titulo: '', tipo: 'Pausa / Recesso', periodo: '' });
    notificar('sucesso', 'Evento adicionado', 'Item incluído no cronograma.');
  };

  const handleSalvarInstituicao = async () => {
    setSalvandoInst(true);
    try {
      await setDoc(doc(db, 'instituicao', 'config'), {
        anoLetivo: anoLetivo.trim() || '2026', toleranciaChamadaMin: Number(toleranciaChamadaMin) || 15,
        modoManutencao, calendarioEventos: eventos, atualizadoPor: `${usuario.nome} (${usuario.cargo})`, atualizadoEm: serverTimestamp(),
      }, { merge: true });
      setModalInstituicao(false);
      notificar('sucesso', 'Dados salvos', 'Calendário acadêmico e parâmetros sincronizados.');
    } catch (error: any) {
      notificar('erro', 'Erro ao salvar', error?.message || 'Falha ao gravar configurações.');
    } finally { setSalvandoInst(false); }
  };

  const setEtapaStatus = (id: string, status: EtapaStatus, detalhe?: string, erro?: string) =>
    setEtapasIntegridade(prev => prev.map(e => (e.id === id ? { ...e, status, detalhe: detalhe ?? e.detalhe, erro } : e)));

  const handleVerificarIntegridade = async () => {
    if (verificandoIntegridade) return;
    setVerificandoIntegridade(true); setResumoIntegridade(null);
    setEtapasIntegridade(ETAPAS_INICIAIS.map(e => ({ ...e, status: 'pendente', erro: undefined })));
    setModalIntegridade(true);
    const t0 = Date.now();
    try {
      setEtapaStatus('ping', 'rodando', 'Enviando ping ao Cloud Firestore...');
      const turmasSnap = await getDocs(collection(db, 'turmas'));
      const latencia = Date.now() - t0;
      setEtapaStatus('ping', 'ok', `Conexão OK • Latência: ${latencia}ms`);
      await esperar(200);

      setEtapaStatus('colecoes', 'rodando', 'Lendo coleções do banco...');
      const [gradeSnap, alunosSnap, usersSnap, chamadosSnap, chamadasSnap] = await Promise.all([
        getDocs(collection(db, 'grade_aulas')), getDocs(collection(db, 'alunos')), getDocs(collection(db, 'usuarios')),
        getDocs(collection(db, 'chamados_suporte')), getDocs(collection(db, 'chamadas')),
      ]);
      setEtapaStatus('colecoes', 'ok', `${turmasSnap.size} turmas · ${gradeSnap.size} aulas · ${alunosSnap.size} alunos · ${usersSnap.size} usuários`);
      await esperar(200);

      setEtapaStatus('vinculos', 'rodando', 'Checando integridade referencial de turmaId...');
      const idsTurmas = new Set(turmasSnap.docs.map(d => d.id));
      const nomesTurmas = new Set(turmasSnap.docs.map(d => String(d.data().nome || '').trim()));
      const alunosOrfaos = alunosSnap.docs.filter(d => !idsTurmas.has(d.data().turmaId) && !nomesTurmas.has(String(d.data().turmaNome || '').trim())).length;
      const aulasSemTurma = gradeSnap.docs.filter(d => !idsTurmas.has(d.data().turmaId) && !nomesTurmas.has(String(d.data().turmaNome || d.data().nome || '').trim())).length;

      if (alunosOrfaos > 0 || aulasSemTurma > 0) {
        setEtapaStatus('vinculos', 'erro', 'Vínculos inconsistentes encontrados', `${alunosOrfaos} aluno(s) órfão(s) e ${aulasSemTurma} aula(s) sem turma válida.`);
        setResumoIntegridade('Diagnóstico concluído com alertas de vínculo. Revise os registros sem turma correspondente.');
      } else {
        setEtapaStatus('vinculos', 'ok', `0 alunos órfãos · 0 aulas sem vínculo · ${chamadosSnap.size} chamados · ${chamadasSnap.size} chamadas`);
        await esperar(180);
        setEtapaStatus('resumo', 'ok', 'Banco íntegro e sincronizado sem erros');
        setResumoIntegridade(`Tudo validado com sucesso! Latência de ${latencia}ms e 100% dos vínculos íntegros.`);
      }
    } catch (error: any) {
      const msgErro = error?.message || 'Falha de comunicação com o Firestore.';
      setEtapasIntegridade(prev => {
        const atual = prev.find(e => e.status === 'rodando') || prev[0];
        return prev.map(e => (e.id === atual.id ? { ...e, status: 'erro', erro: msgErro } : e));
      });
      setResumoIntegridade(`Falha na verificação: ${msgErro}`);
    } finally { setVerificandoIntegridade(false); }
  };

  const salvarBackup = async (conteudoJson: string, nomeArquivo: string, resumoFallback: string) => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      const blob = new Blob([conteudoJson], { type: 'application/json;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = nomeArquivo; a.click();
      URL.revokeObjectURL(url);
      return `Backup ${nomeArquivo} baixado no navegador.`;
    }
    try {
      const fsMod = 'expo-file-system';
      const shareMod = 'expo-sharing';
      const FileSystem: any = await import(/* webpackIgnore: true */ fsMod);
      const Sharing: any = await import(/* webpackIgnore: true */ shareMod);
      const baseDir = FileSystem.cacheDirectory || FileSystem.documentDirectory;
      if (!baseDir) return `Pacote preparado em memória (${resumoFallback}).`;
      const destino = `${baseDir}${nomeArquivo}`;
      await FileSystem.writeAsStringAsync(destino, conteudoJson, { encoding: FileSystem.EncodingType?.UTF8 || 'utf8' });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(destino, { mimeType: 'application/json', dialogTitle: 'Salvar Backup do Sistema Violeta' });
        return `Backup pronto para salvar (${nomeArquivo}).`;
      }
      return `Backup salvo em ${destino}.`;
    } catch {
      return `Pacote preparado em memória (${resumoFallback}). Instale expo-file-system e expo-sharing para salvar no aparelho.`;
    }
  };

  const executarBackupEmSegundoPlano = async () => {
    if (backupEmAndamento) return;
    setBackupEmAndamento(true); setProgressoBackup(5);
    setEtapaBackupTexto('Iniciando backup em segundo plano...');
    try {
      const pacote: Record<string, any[]> = {};
      for (let i = 0; i < COLECOES_BACKUP.length; i++) {
        const col = COLECOES_BACKUP[i];
        setEtapaBackupTexto(`Exportando coleção "${col}"...`);
        const snap = await getDocs(collection(db, col));
        pacote[col] = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        setProgressoBackup(Math.min(88, Math.round(((i + 1) / COLECOES_BACKUP.length) * 82) + 5));
        await esperar(120);
      }
      setEtapaBackupTexto('Consolidando dados do sistema e alunos...');
      setProgressoBackup(95);
      const manifesto = {
        sistema: 'Violeta - Gestão Educacional', plataforma: Platform.OS,
        geradoEm: new Date().toISOString(), geradoPor: `${usuario.nome} (${usuario.cargo})`,
        totais: Object.fromEntries(Object.entries(pacote).map(([k, v]) => [k, v.length])),
      };
      const nomeArquivo = `backup-violeta-${new Date().toISOString().slice(0, 10)}.json`;
      const totalAlunos = pacote.alunos?.length ?? 0;
      const totalTurmas = pacote.turmas?.length ?? 0;
      const msg = await salvarBackup(JSON.stringify({ manifesto, dados: pacote }, null, 2), nomeArquivo, `${totalTurmas} turmas, ${totalAlunos} alunos`);
      setProgressoBackup(100);
      setEtapaBackupTexto('Backup concluído (100%)!');
      const horaFmt = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
      setUltimoBackupInfo(`Último backup às ${horaFmt} (${totalTurmas} turmas, ${totalAlunos} alunos) • ${nomeArquivo}`);
      notificar('sucesso', 'Backup concluído', msg);
    } catch (error: any) {
      setEtapaBackupTexto('Erro ao gerar backup.');
      notificar('erro', 'Erro no backup', error?.message || 'Não foi possível concluir o backup.');
    } finally { await esperar(800); setBackupEmAndamento(false); }
  };

  const executarLimpezaDadosTeste = async () => {
    if (limpandoTeste) return;
    setConfirmarLimpezaTeste(false);
    setLimpandoTeste(true);
    try {
      let removidos = 0;
      for (const col of ['turmas', 'chamados_suporte'] as const) {
        const snap = await getDocs(collection(db, col));
        for (const d of snap.docs) {
          const dados = d.data();
          const texto = `${dados.nome || ''} ${dados.titulo || ''} ${dados.descricao || ''}`.toLowerCase();
          if (texto.includes('[teste]') || texto.trim() === 'teste') {
            await deleteDoc(doc(db, col, d.id));
            removidos++;
          }
        }
      }
      notificar('sucesso', 'Limpeza concluída', `${removidos} registro(s) de teste removido(s).`);
    } catch (error: any) {
      notificar('erro', 'Erro na limpeza', error?.message || 'Não foi possível remover os registros de teste.');
    } finally { setLimpandoTeste(false); }
  };

  const toastProps = {
    feedback,
    onFechar: fecharFeedback,
    fundoCard: tema.fundoTopo,
    textoPrincipal: tema.textoPrincipal,
    textoSecundario: tema.textoSecundario,
  };

  const MenuOption = ({ icone, titulo, subtitulo = null, corIcone = tema.textoSecundario, danger = false, onPress, desativado = false }: any) => (
    <TouchableOpacity style={[styles.menuItem, { borderBottomColor: tema.borda, opacity: desativado ? 0.55 : 1 }]} activeOpacity={0.7} onPress={onPress} disabled={desativado}>
      <View style={[styles.iconContainer, { backgroundColor: danger ? '#FFEBEE' : tema.inputBackground }]}>
        <Ionicons name={icone} size={20} color={danger ? '#C62828' : corIcone} />
      </View>
      <View style={styles.menuTextContainer}>
        <Text style={[styles.menuTitle, { color: danger ? '#C62828' : tema.textoPrincipal, fontSize: tamFonte(15) }]}>{titulo}</Text>
        {subtitulo && <Text style={[styles.menuSubtitle, { color: tema.textoSecundario, fontSize: tamFonte(12) }]}>{subtitulo}</Text>}
      </View>
      <Ionicons name="chevron-forward" size={18} color={tema.textoSecundario} opacity={0.5} />
    </TouchableOpacity>
  );

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView style={[styles.container, { backgroundColor: tema.fundoBase }]} showsVerticalScrollIndicator={false}>
        <View style={[styles.header, { backgroundColor: tema.fundoTopo }]}>
          <View style={styles.headerTopRow}>
            <TouchableOpacity onPress={voltar} style={styles.btnVoltar}><Ionicons name="arrow-back" size={26} color={tema.textoLogo} /></TouchableOpacity>
            <TouchableOpacity onPress={() => setPerfil(perfil === 'admin' ? 'coordenador' : perfil === 'coordenador' ? 'professor' : 'admin')} style={styles.btnToggleCargo}>
              <Text style={{ color: '#FFF', fontSize: 10, fontWeight: 'bold' }}>Simular Perfil</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.avatarContainer}><Text style={styles.avatarText}>{usuario.iniciais}</Text></View>
          <Text style={[styles.nomeUsuario, { color: tema.textoLogo, fontSize: tamFonte(22) }]}>{usuario.nome}</Text>
          <View style={[styles.badgeCargo, { backgroundColor: perfil === 'admin' ? '#D32F2F' : perfil === 'coordenador' ? '#E65100' : 'rgba(255,255,255,0.2)' }]}>
            <Text style={styles.textoBadge}>{usuario.cargo}</Text>
          </View>
          <Text style={[styles.emailUsuario, { color: tema.textoLogo, fontSize: tamFonte(14) }]}>{usuario.email}</Text>
        </View>

        {perfil === 'admin' ? (
          <>
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: '#D32F2F' }]}>Infraestrutura e Permissões</Text>
              <View style={[styles.cardMenu, { backgroundColor: tema.inputBackground, borderColor: '#D32F2F' }]}>
                <MenuOption icone="shield-checkmark" titulo="Controle de Acessos" subtitulo="Aprovar/bloquear usuários" corIcone="#D32F2F" onPress={() => router.push('/usuarios')} />
                <MenuOption icone="list-circle" titulo="Logs de Auditoria" subtitulo="Rastrear exclusões e alterações" corIcone="#D32F2F" onPress={() => router.push('/historico?aba=auditoria')} />
                <MenuOption icone="business" titulo="Dados da Instituição" subtitulo="Cronograma (Coordenação) e regras (Infra)" corIcone="#D32F2F" onPress={() => setModalInstituicao(true)} />
              </View>
            </View>

            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: '#2E7D32' }]}>Banco de Dados</Text>
              <View style={[styles.cardMenu, { backgroundColor: tema.inputBackground, borderColor: '#2E7D32' }]}>
                <MenuOption icone={verificandoIntegridade ? 'pulse' : 'checkmark-done-circle'} titulo={verificandoIntegridade ? 'Verificando Integridade...' : 'Verificar Integridade e Vínculos'} subtitulo="Ping no banco, validação de etapas e reindexação" corIcone="#2E7D32" onPress={() => void handleVerificarIntegridade()} desativado={verificandoIntegridade} />
                <MenuOption icone={backupEmAndamento ? 'sync' : 'cloud-download'} titulo={backupEmAndamento ? `Gerando Backup (${progressoBackup}%)...` : 'Backup do Sistema'} subtitulo={ultimoBackupInfo || 'Exportar sistema, alunos e coleções em segundo plano'} corIcone="#2E7D32" onPress={() => void executarBackupEmSegundoPlano()} desativado={backupEmAndamento} />
                <MenuOption icone="trash-bin" titulo={limpandoTeste ? 'Limpando testes...' : 'Limpar Registros de Teste'} subtitulo="Remove itens marcados como [TESTE]" corIcone="#EF6C00" onPress={() => setConfirmarLimpezaTeste(true)} desativado={limpandoTeste} />
              </View>
              {backupEmAndamento && (
                <View style={[styles.cardProgressoBackup, { backgroundColor: tema.inputBackground, borderColor: tema.borda }]}>
                  <View style={styles.linhaProgressoTopo}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                      <ActivityIndicator size="small" color="#2E7D32" />
                      <Text style={{ color: tema.textoPrincipal, fontSize: tamFonte(12), fontWeight: '600' }} numberOfLines={1}>{etapaBackupTexto}</Text>
                    </View>
                    <Text style={{ color: '#2E7D32', fontSize: tamFonte(12), fontWeight: 'bold' }}>{progressoBackup}%</Text>
                  </View>
                  <View style={[styles.trilhaBarra, { backgroundColor: tema.borda }]}>
                    <View style={[styles.preenchimentoBarra, { width: `${progressoBackup}%`, backgroundColor: '#2E7D32' }]} />
                  </View>
                </View>
              )}
            </View>
          </>
        ) : (
          perfil === 'coordenador' && (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: '#E65100' }]}>Gestão Acadêmica</Text>
              <View style={[styles.cardMenu, { backgroundColor: tema.inputBackground, borderColor: '#E65100' }]}>
                <MenuOption icone="megaphone" titulo="Comunicados Oficiais" subtitulo="Mural de professores" corIcone="#E65100" onPress={() => setModalAviso(true)} />
                <MenuOption icone="calendar" titulo="Calendário e Pausas" subtitulo="Férias, recessos e feriados da coordenação" corIcone="#E65100" onPress={() => { setAbaInstituicao('calendario'); setModalInstituicao(true); }} />
              </View>
            </View>
          )
        )}

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: tema.textoSecundario }]}>Sua Conta</Text>
          <View style={[styles.cardMenu, { backgroundColor: tema.inputBackground, borderColor: tema.borda }]}>
            <MenuOption icone="person" titulo="Meus Dados" corIcone={tema.botaoPrimario} onPress={() => { setFormDados(d => ({ ...d, nome: usuario.nome })); setModalDados(true); }} />
            <MenuOption icone="shield-checkmark" titulo="Segurança e Preferências" corIcone={tema.botaoPrimario} onPress={() => setModalPrivacidade(true)} />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: tema.textoSecundario }]}>Sistema Violeta</Text>
          <View style={[styles.cardMenu, { backgroundColor: tema.inputBackground, borderColor: tema.borda }]}>
            {perfil === 'admin' ? (
              <MenuOption icone="construct" titulo="Gerenciar Chamados" subtitulo="Resolver tickets da TI" corIcone="#D32F2F" onPress={() => router.push('/chamados')} />
            ) : (
              <MenuOption icone="help-buoy" titulo="Central de Suporte" subtitulo="Abrir chamado técnico" onPress={() => setModalAjuda(true)} />
            )}
            <MenuOption icone="information-circle" titulo="Sobre o Aplicativo" subtitulo="Créditos e Versão" onPress={() => setModalVersao(true)} />
          </View>
        </View>

        <View style={[styles.section, { marginTop: 10, marginBottom: 40 }]}>
          <View style={[styles.cardMenu, { backgroundColor: tema.inputBackground, borderColor: tema.borda }]}>
            <MenuOption icone="log-out" titulo="Encerrar Sessão" danger onPress={handleLogout} />
          </View>
        </View>
      </ScrollView>

      {/* MODAL: SESSÕES ATIVAS */}
      <Modal visible={modalSessoes} transparent animationType="fade" onRequestClose={() => setModalSessoes(false)}>
        <View style={[styles.modalOverlay, styles.overlayDestaque]}>
          <View style={[styles.modalCardCentro, styles.cardDestaque, { backgroundColor: tema.fundoBase, borderColor: tema.botaoPrimario }]}>
            <View style={[styles.modalHeader, { borderBottomColor: tema.borda }]}>
              <Text style={[styles.modalTitle, { color: tema.textoPrincipal, fontSize: tamFonte(17) }]}>Sessões Ativas</Text>
              <View style={styles.headerSessoesDir}>
                {sessoes.some(s => !s.atual) && (
                  <TouchableOpacity onPress={encerrarOutrasSessoes} style={[styles.btnEncerrarOutras, { backgroundColor: '#C6282820', borderColor: '#C62828' }]}>
                    <Text style={{ color: '#C62828', fontSize: tamFonte(11), fontWeight: '700' }}>Encerrar outras</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity onPress={() => setModalSessoes(false)}>
                  <Ionicons name="close" size={24} color={tema.textoSecundario} />
                </TouchableOpacity>
              </View>
            </View>
            <ScrollView contentContainerStyle={{ padding: 18 }}>
              {sessoes.map(s => (
                <View key={s.id} style={[styles.cardSessao, { borderColor: tema.borda, backgroundColor: tema.inputBackground, marginBottom: 10, justifyContent: 'space-between' }]}>
                  <View style={{ flex: 1, marginRight: 10 }}>
                    <Text style={[styles.tituloLinha, { color: tema.textoPrincipal, fontSize: tamFonte(14) }]}>
                      {s.dispositivo} {s.atual ? '• Atual' : ''}
                    </Text>
                    <Text style={[styles.subtituloLinha, { color: tema.textoSecundario, fontSize: tamFonte(12) }]}>
                      {s.local} • {s.horario}
                    </Text>
                  </View>
                  {!s.atual && (
                    <TouchableOpacity onPress={() => encerrarSessaoIndividual(s.id)} style={[styles.btnSessaoPequeno, { borderColor: '#C62828', backgroundColor: '#C6282815' }]}>
                      <Text style={{ color: '#C62828', fontSize: tamFonte(11), fontWeight: '700' }}>Encerrar</Text>
                    </TouchableOpacity>
                  )}
                </View>
              ))}
            </ScrollView>
          </View>
          <FeedbackToast {...toastProps} />
        </View>
      </Modal>

      <Modal visible={confirmarLimpezaTeste} transparent animationType="fade" onRequestClose={() => setConfirmarLimpezaTeste(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCardCentro, { backgroundColor: tema.fundoBase, borderColor: tema.borda }]}>
            <View style={[styles.modalHeader, { borderBottomColor: tema.borda }]}>
              <Text style={[styles.modalTitle, { color: tema.textoPrincipal, fontSize: tamFonte(18) }]}>Limpar Registros de Teste</Text>
              <TouchableOpacity onPress={() => setConfirmarLimpezaTeste(false)}><Ionicons name="close" size={24} color={tema.textoSecundario} /></TouchableOpacity>
            </View>
            <View style={{ padding: 20 }}>
              <Text style={{ color: tema.textoSecundario, fontSize: tamFonte(13), lineHeight: 19 }}>
                Remover registros marcados como [TESTE] em turmas e chamados?
              </Text>
              <View style={{ flexDirection: 'row', gap: 10, marginTop: 18 }}>
                <TouchableOpacity style={[styles.btnSecModal, { borderColor: tema.borda, backgroundColor: tema.inputBackground }]} onPress={() => setConfirmarLimpezaTeste(false)}>
                  <Text style={{ color: tema.textoPrincipal, fontWeight: '700', fontSize: tamFonte(13) }}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.btnPrimModal, { backgroundColor: '#C62828' }]} onPress={() => void executarLimpezaDadosTeste()} disabled={limpandoTeste}>
                  <Text style={{ color: '#FFF', fontWeight: '700', fontSize: tamFonte(13) }}>Limpar</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
          <FeedbackToast {...toastProps} />
        </View>
      </Modal>

      <Modal visible={modalIntegridade} transparent animationType="fade" onRequestClose={() => setModalIntegridade(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCardCentro, { backgroundColor: tema.fundoBase, borderColor: tema.borda }]}>
            <View style={[styles.modalHeader, { borderBottomColor: tema.borda }]}>
              <Text style={[styles.modalTitle, { color: tema.textoPrincipal, fontSize: tamFonte(18) }]}>Diagnóstico de Integridade</Text>
              <TouchableOpacity onPress={() => setModalIntegridade(false)}><Ionicons name="close" size={24} color={tema.textoSecundario} /></TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={{ padding: 20 }}>
              {etapasIntegridade.map(etapa => (
                <View key={etapa.id} style={[styles.linhaEtapa, { backgroundColor: tema.inputBackground, borderColor: tema.borda }]}>
                  <View style={{ marginRight: 12, marginTop: 2 }}>
                    {etapa.status === 'ok' && <Ionicons name="checkmark-circle" size={22} color="#2E7D32" />}
                    {etapa.status === 'erro' && <Ionicons name="close-circle" size={22} color="#C62828" />}
                    {etapa.status === 'rodando' && <ActivityIndicator size="small" color={tema.botaoPrimario} />}
                    {etapa.status === 'pendente' && <Ionicons name="ellipse-outline" size={22} color={tema.textoSecundario} />}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: tema.textoPrincipal, fontWeight: '700', fontSize: tamFonte(13) }}>{etapa.titulo}</Text>
                    <Text style={{ color: tema.textoSecundario, fontSize: tamFonte(12), marginTop: 2 }}>{etapa.detalhe}</Text>
                    {!!etapa.erro && <Text style={{ color: '#C62828', fontSize: tamFonte(12), fontWeight: '600', marginTop: 4 }}>Erro: {etapa.erro}</Text>}
                  </View>
                </View>
              ))}
              {!!resumoIntegridade && (
                <View style={[styles.boxResultado, { backgroundColor: tema.inputBackground, borderColor: tema.borda }]}>
                  <Text style={{ color: tema.textoPrincipal, fontSize: tamFonte(13), lineHeight: 19 }}>{resumoIntegridade}</Text>
                </View>
              )}
              <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
                <TouchableOpacity style={[styles.btnSecModal, { borderColor: tema.borda, backgroundColor: tema.inputBackground }]} onPress={() => void handleVerificarIntegridade()} disabled={verificandoIntegridade}>
                  <Text style={{ color: tema.textoPrincipal, fontWeight: '700', fontSize: tamFonte(13) }}>Testar Novamente</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.btnPrimModal, { backgroundColor: tema.botaoPrimario }]} onPress={() => setModalIntegridade(false)}>
                  <Text style={{ color: '#FFF', fontWeight: '700', fontSize: tamFonte(13) }}>Concluir</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
          <FeedbackToast {...toastProps} />
        </View>
      </Modal>

      <Modal visible={modalInstituicao} transparent animationType="slide" onRequestClose={() => setModalInstituicao(false)}>
        <View style={styles.modalOverlayFull}>
          <View style={[styles.modalContentFull, { backgroundColor: tema.fundoBase }]}>
            <View style={[styles.modalHeader, { borderBottomColor: tema.borda }]}>
              <Text style={[styles.modalTitle, { color: tema.textoPrincipal, fontSize: tamFonte(18) }]}>Dados da Instituição</Text>
              <TouchableOpacity onPress={() => setModalInstituicao(false)} style={styles.btnFecharModal}><Ionicons name="close" size={24} color={tema.textoSecundario} /></TouchableOpacity>
            </View>
            <ScrollView style={styles.modalBody} keyboardShouldPersistTaps="handled">
              <View style={{ flexDirection: 'row', gap: 10, marginBottom: 18 }}>
                {(['calendario', 'infra'] as const).map(aba => {
                  const ativo = abaInstituicao === aba;
                  return (
                    <TouchableOpacity key={aba} onPress={() => setAbaInstituicao(aba)} style={[styles.chipAba, { backgroundColor: ativo ? tema.botaoPrimario : tema.inputBackground, borderColor: tema.borda }]}>
                      <Text style={{ color: ativo ? '#FFF' : tema.textoPrincipal, fontWeight: '700', fontSize: tamFonte(12) }}>
                        {aba === 'calendario' ? 'Cronograma / Pausas (Coord.)' : 'Parâmetros Técnicos (Infra)'}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              {abaInstituicao === 'calendario' ? (
                <>
                  <Text style={[styles.inputLabel, { color: tema.textoPrincipal, fontSize: tamFonte(14) }]}>Nova Pausa, Férias ou Feriado</Text>
                  <TextInput style={[styles.input, { backgroundColor: tema.inputBackground, borderColor: tema.borda, color: tema.textoPrincipal, fontSize: tamFonte(14), marginBottom: 10 }]} placeholder="Ex: Recesso Escolar / Férias de Julho" placeholderTextColor={tema.textoSecundario} value={novoEvento.titulo} onChangeText={v => setNovoEvento(p => ({ ...p, titulo: v }))} />
                  <TextInput style={[styles.input, { backgroundColor: tema.inputBackground, borderColor: tema.borda, color: tema.textoPrincipal, fontSize: tamFonte(14), marginBottom: 10 }]} placeholder="Período (Ex: 01/07/2027 a 30/07/2027)" placeholderTextColor={tema.textoSecundario} value={novoEvento.periodo} onChangeText={v => setNovoEvento(p => ({ ...p, periodo: v }))} />
                  <TouchableOpacity style={[styles.btnAddEvento, { borderColor: tema.botaoPrimario, backgroundColor: tema.botaoPrimario + '15' }]} onPress={handleAdicionarEvento}>
                    <Ionicons name="add-circle-outline" size={18} color={tema.botaoPrimario} />
                    <Text style={{ color: tema.botaoPrimario, fontWeight: '700', fontSize: tamFonte(13) }}>Adicionar ao Cronograma</Text>
                  </TouchableOpacity>
                  {eventos.map(ev => (
                    <View key={ev.id} style={[styles.cardSessao, { borderColor: tema.borda, backgroundColor: tema.inputBackground, marginTop: 10, justifyContent: 'space-between' }]}>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.tituloLinha, { color: tema.textoPrincipal, fontSize: tamFonte(15) }]}>{ev.titulo}</Text>
                        <Text style={[styles.subtituloLinha, { color: tema.textoSecundario, fontSize: tamFonte(12) }]}>{ev.periodo} • {ev.setor}</Text>
                      </View>
                      <TouchableOpacity onPress={() => setEventos(prev => prev.filter(x => x.id !== ev.id))}><Ionicons name="trash-outline" size={18} color="#C62828" /></TouchableOpacity>
                    </View>
                  ))}
                </>
              ) : (
                <>
                  <Text style={[styles.inputLabel, { color: tema.textoPrincipal, fontSize: tamFonte(14) }]}>Ano Letivo Vigente</Text>
                  <TextInput style={[styles.input, { backgroundColor: tema.inputBackground, borderColor: tema.borda, color: tema.textoPrincipal, fontSize: tamFonte(14), marginBottom: 14 }]} value={anoLetivo} onChangeText={setAnoLetivo} keyboardType="numeric" />
                  <Text style={[styles.inputLabel, { color: tema.textoPrincipal, fontSize: tamFonte(14) }]}>Tolerância para Chamada (minutos)</Text>
                  <TextInput style={[styles.input, { backgroundColor: tema.inputBackground, borderColor: tema.borda, color: tema.textoPrincipal, fontSize: tamFonte(14), marginBottom: 14 }]} value={toleranciaChamadaMin} onChangeText={setToleranciaChamadaMin} keyboardType="numeric" />
                  <TouchableOpacity style={[styles.cardSessao, { borderColor: tema.borda, backgroundColor: tema.inputBackground }]} onPress={() => setModoManutencao(m => !m)}>
                    <Ionicons name={modoManutencao ? 'construct' : 'checkmark-circle-outline'} size={22} color={modoManutencao ? '#EF6C00' : '#2E7D32'} style={{ marginRight: 12 }} />
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.tituloLinha, { color: tema.textoPrincipal, fontSize: tamFonte(15) }]}>Janela de Manutenção da Infra</Text>
                      <Text style={[styles.subtituloLinha, { color: tema.textoSecundario, fontSize: tamFonte(12) }]}>{modoManutencao ? 'Ativa: bloqueia alterações críticas' : 'Desativada: operação normal'}</Text>
                    </View>
                  </TouchableOpacity>
                </>
              )}
              <TouchableOpacity style={[styles.btnAcaoLargo, { backgroundColor: tema.botaoPrimario }]} onPress={() => void handleSalvarInstituicao()} disabled={salvandoInst}>
                <Ionicons name="save-outline" size={20} color="#FFF" style={{ marginRight: 8 }} />
                <Text style={[styles.textoBtnLargo, { fontSize: tamFonte(15) }]}>{salvandoInst ? 'Salvando...' : 'Salvar Configurações'}</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
          <FeedbackToast {...toastProps} />
        </View>
      </Modal>

      <Modal visible={modalDados} transparent animationType="slide">
        <View style={styles.modalOverlayFull}>
          <View style={[styles.modalContentFull, { backgroundColor: tema.fundoBase }]}>
            <View style={[styles.modalHeader, { borderBottomColor: tema.borda }]}>
              <Text style={[styles.modalTitle, { color: tema.textoPrincipal, fontSize: tamFonte(18) }]}>Meus Dados</Text>
              <TouchableOpacity onPress={() => setModalDados(false)} style={styles.btnFecharModal}><Ionicons name="close" size={24} color={tema.textoSecundario} /></TouchableOpacity>
            </View>
            <ScrollView style={styles.modalBody}>
              <View style={styles.avatarEdicaoContainer}>
                <View style={styles.avatarEdicao}><Text style={styles.avatarText}>{usuario.iniciais}</Text></View>
                <TouchableOpacity style={styles.btnAlterarFoto}><Ionicons name="camera" size={16} color="#FFF" /></TouchableOpacity>
              </View>
              <Text style={[styles.inputLabel, { color: tema.textoPrincipal, fontSize: tamFonte(14) }]}>Nome de Exibição:</Text>
              <TextInput style={[styles.input, { backgroundColor: tema.inputBackground, borderColor: tema.borda, color: tema.textoPrincipal, fontSize: tamFonte(14) }]} value={formDados.nome} onChangeText={t => setFormDados({ ...formDados, nome: t })} />
              <Text style={[styles.inputLabel, { color: tema.textoPrincipal, fontSize: tamFonte(14), marginTop: 15 }]}>E-mail de Cadastro (Bloqueado):</Text>
              <TextInput style={[styles.input, styles.inputDisabled, { backgroundColor: tema.inputBackground, borderColor: tema.borda, color: tema.textoSecundario, fontSize: tamFonte(14) }]} value={usuario.email} editable={false} />
              <Text style={[styles.inputLabel, { color: tema.textoPrincipal, fontSize: tamFonte(14), marginTop: 15 }]}>Data de Nascimento:</Text>
              <TextInput style={[styles.input, { backgroundColor: tema.inputBackground, borderColor: tema.borda, color: tema.textoPrincipal, fontSize: tamFonte(14) }]} value={formDados.dataNascimento} onChangeText={t => setFormDados({ ...formDados, dataNascimento: t })} />
              <Text style={[styles.inputLabel, { color: tema.textoPrincipal, fontSize: tamFonte(14), marginTop: 15 }]}>Endereço Completo:</Text>
              <TextInput style={[styles.inputAreaEnd, { backgroundColor: tema.inputBackground, borderColor: tema.borda, color: tema.textoPrincipal, fontSize: tamFonte(14) }]} value={formDados.endereco} multiline onChangeText={t => setFormDados({ ...formDados, endereco: t })} />
              <TouchableOpacity style={[styles.btnAcaoLargo, { backgroundColor: tema.botaoPrimario }]} onPress={handleSalvarDados}>
                <Ionicons name="save-outline" size={20} color="#FFF" style={{ marginRight: 8 }} /><Text style={[styles.textoBtnLargo, { fontSize: tamFonte(15) }]}>Salvar Alterações</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
          <FeedbackToast {...toastProps} />
        </View>
      </Modal>

      <Modal visible={modalPrivacidade} transparent animationType="slide">
        <View style={styles.modalOverlayFull}>
          <View style={[styles.modalContentFull, { backgroundColor: tema.fundoBase }]}>
            <View style={[styles.modalHeader, { borderBottomColor: tema.borda }]}>
              <Text style={[styles.modalTitle, { color: tema.textoPrincipal, fontSize: tamFonte(18) }]}>Segurança e Preferências</Text>
              <TouchableOpacity onPress={() => setModalPrivacidade(false)} style={styles.btnFecharModal}><Ionicons name="close" size={24} color={tema.textoSecundario} /></TouchableOpacity>
            </View>
            <ScrollView style={styles.modalBody} keyboardShouldPersistTaps="handled">
              <Text style={[styles.topicoSeguranca, { color: tema.botaoPrimario, fontSize: tamFonte(13) }]}>Alterar Senha</Text>
              <Text style={[styles.avisoSenha, { color: tema.textoSecundario, fontSize: tamFonte(12) }]}>
                Alterar senha irá desconectar todas as sessões, sendo necessário realizar login novamente.
              </Text>
              <TextInput style={[styles.input, { backgroundColor: tema.inputBackground, borderColor: tema.borda, color: tema.textoPrincipal, fontSize: tamFonte(14) }]} placeholder="Senha Atual" secureTextEntry placeholderTextColor={tema.textoSecundario} value={senhaAtual} onChangeText={setSenhaAtual} />
              <TextInput style={[styles.input, { backgroundColor: tema.inputBackground, borderColor: tema.borda, color: tema.textoPrincipal, fontSize: tamFonte(14), marginTop: 10 }]} placeholder="Nova Senha" secureTextEntry placeholderTextColor={tema.textoSecundario} value={novaSenha} onChangeText={setNovaSenha} />
              <TextInput style={[styles.input, { backgroundColor: tema.inputBackground, borderColor: tema.borda, color: tema.textoPrincipal, fontSize: tamFonte(14), marginTop: 10 }]} placeholder="Confirmar Nova Senha" secureTextEntry placeholderTextColor={tema.textoSecundario} value={confirmarSenha} onChangeText={setConfirmarSenha} />

              <Text style={[styles.topicoSeguranca, { color: tema.botaoPrimario, fontSize: tamFonte(13), marginTop: 26 }]}>Tema do Aplicativo</Text>
              <View style={styles.rowOpcoes}>
                {(['Sistema', 'Claro', 'Escuro'] as ModoTema[]).map(m => {
                  const ativo = modoTema === m;
                  return (
                    <TouchableOpacity key={m} style={[styles.btnPreferencia, { borderColor: ativo ? tema.botaoPrimario : tema.borda, backgroundColor: ativo ? tema.botaoPrimario + '20' : tema.inputBackground }]} onPress={() => setModoTema(m)}>
                      <Text style={{ color: ativo ? tema.botaoPrimario : tema.textoPrincipal, fontWeight: ativo ? '700' : '500', fontSize: tamFonte(13) }}>{m}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text style={[styles.topicoSeguranca, { color: tema.botaoPrimario, fontSize: tamFonte(13), marginTop: 26 }]}>Preferências Visuais (Fonte)</Text>
              <View style={styles.rowOpcoes}>
                {(['Pequena', 'Média', 'Grande'] as TamanhoFonte[]).map(tam => {
                  const ativo = tamanhoFonte === tam;
                  return (
                    <TouchableOpacity key={tam} style={[styles.btnPreferencia, { borderColor: ativo ? tema.botaoPrimario : tema.borda, backgroundColor: ativo ? tema.botaoPrimario + '20' : tema.inputBackground }]} onPress={() => setTamanhoFonte(tam)}>
                      <Text style={{ color: ativo ? tema.botaoPrimario : tema.textoPrincipal, fontWeight: ativo ? '700' : '500', fontSize: tamFonte(13) }}>Fonte {tam}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text style={[styles.topicoSeguranca, { color: tema.botaoPrimario, fontSize: tamFonte(13), marginTop: 26 }]}>Alertas e Sessão</Text>
              <TouchableOpacity style={[styles.cardSessao, { borderColor: tema.borda, backgroundColor: tema.inputBackground, marginBottom: 12 }]} onPress={() => setAlertasAtivos(a => !a)}>
                <Ionicons name={alertasAtivos ? 'notifications' : 'notifications-off'} size={24} color={alertasAtivos ? '#2E7D32' : tema.textoSecundario} style={{ marginRight: 14 }} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.tituloLinha, { color: tema.textoPrincipal, fontSize: tamFonte(15) }]}>Notificações do Sistema</Text>
                  <Text style={[styles.subtituloLinha, { color: tema.textoSecundario, fontSize: tamFonte(12) }]}>{alertasAtivos ? 'Notificações ligadas' : 'Notificações desligadas'}</Text>
                </View>
                <Ionicons name={alertasAtivos ? 'notifications' : 'notifications-off'} size={22} color={alertasAtivos ? '#2E7D32' : tema.textoSecundario} />
              </TouchableOpacity>

              <View style={[styles.cardSessao, { borderColor: tema.borda, backgroundColor: tema.inputBackground }]}>
                <Ionicons name="desktop-outline" size={24} color="#2E7D32" style={{ marginRight: 14 }} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.tituloLinha, { color: tema.textoPrincipal, fontSize: tamFonte(15) }]}>Este Dispositivo</Text>
                  <Text style={[styles.subtituloLinha, { color: tema.textoSecundario, fontSize: tamFonte(12) }]}>Salvador, BA • {sessoes.length} sessão(ões) ativa(s)</Text>
                </View>
              </View>

              <TouchableOpacity
                style={[styles.btnVerSessoes, { borderColor: tema.botaoPrimario, backgroundColor: tema.botaoPrimario + '15' }]}
                onPress={() => { setModalPrivacidade(false); setModalSessoes(true); }}
              >
                <Ionicons name="phone-portrait-outline" size={18} color={tema.botaoPrimario} />
                <Text style={{ color: tema.botaoPrimario, fontWeight: '700', fontSize: tamFonte(14) }}>Ver sessões ativas</Text>
              </TouchableOpacity>

              <TouchableOpacity style={[styles.btnAcaoLargo, { backgroundColor: tema.botaoPrimario, marginTop: 12 }]} onPress={handleSalvarPreferencias}>
                <Ionicons name="save-outline" size={20} color="#FFF" style={{ marginRight: 8 }} /><Text style={[styles.textoBtnLargo, { fontSize: tamFonte(15) }]}>Salvar Informações</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
          <FeedbackToast {...toastProps} />
        </View>
      </Modal>

      <Modal visible={modalAjuda} transparent animationType="slide">
        <TouchableOpacity style={styles.modalOverlayHalf} activeOpacity={1} onPress={() => setModalAjuda(false)}>
          <TouchableOpacity activeOpacity={1} style={[styles.modalContentHalf, { backgroundColor: tema.fundoBase }]}>
            <View style={[styles.modalHeader, { borderBottomColor: tema.borda }]}>
              <Text style={[styles.modalTitle, { color: tema.textoPrincipal, fontSize: tamFonte(18) }]}>Abrir Chamado</Text>
              <TouchableOpacity onPress={() => setModalAjuda(false)} style={styles.btnFecharModal}><Ionicons name="close" size={24} color={tema.textoSecundario} /></TouchableOpacity>
            </View>
            <View style={styles.modalBody}>
              <TextInput style={[styles.inputArea, { backgroundColor: tema.inputBackground, borderColor: tema.borda, color: tema.textoPrincipal, fontSize: tamFonte(14) }]} placeholder="Descreva o problema..." placeholderTextColor={tema.textoSecundario} multiline value={textoChamado} onChangeText={setTextoChamado} />
              <TouchableOpacity style={[styles.btnAcaoLargo, { backgroundColor: tema.botaoPrimario }]} onPress={() => void handleEnviarChamado()}><Text style={[styles.textoBtnLargo, { fontSize: tamFonte(15) }]}>Enviar Ticket</Text></TouchableOpacity>
            </View>
          </TouchableOpacity>
          <FeedbackToast {...toastProps} />
        </TouchableOpacity>
      </Modal>

      <Modal visible={modalAviso} transparent animationType="slide">
        <TouchableOpacity style={styles.modalOverlayHalf} activeOpacity={1} onPress={() => setModalAviso(false)}>
          <TouchableOpacity activeOpacity={1} style={[styles.modalContentHalf, { backgroundColor: tema.fundoBase }]}>
            <View style={[styles.modalHeader, { borderBottomColor: tema.borda }]}>
              <Text style={[styles.modalTitle, { color: tema.textoPrincipal, fontSize: tamFonte(18) }]}>Novo Comunicado</Text>
              <TouchableOpacity onPress={() => setModalAviso(false)} style={styles.btnFecharModal}><Ionicons name="close" size={24} color={tema.textoSecundario} /></TouchableOpacity>
            </View>
            <View style={styles.modalBody}>
              <TextInput style={[styles.input, { backgroundColor: tema.inputBackground, borderColor: tema.borda, color: tema.textoPrincipal, fontSize: tamFonte(14) }]} value={tituloAviso} onChangeText={setTituloAviso} placeholder="Título" placeholderTextColor={tema.textoSecundario} />
              <TextInput style={[styles.inputArea, { backgroundColor: tema.inputBackground, borderColor: tema.borda, color: tema.textoPrincipal, fontSize: tamFonte(14), marginTop: 15 }]} multiline value={mensagemAviso} onChangeText={setMensagemAviso} placeholder="Mensagem" placeholderTextColor={tema.textoSecundario} />
              <TouchableOpacity style={[styles.btnAcaoLargo, { backgroundColor: '#E65100' }]} onPress={() => { notificar('sucesso', 'Aviso publicado', 'Comunicado enviado ao mural.'); setModalAviso(false); }}>
                <Text style={[styles.textoBtnLargo, { fontSize: tamFonte(15) }]}>Publicar Aviso</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
          <FeedbackToast {...toastProps} />
        </TouchableOpacity>
      </Modal>

      <Modal visible={modalVersao} transparent animationType="fade">
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setModalVersao(false)}>
          <View style={[styles.modalVersaoContent, { backgroundColor: tema.fundoBase, borderColor: tema.borda }]}>
            <Ionicons name="layers" size={65} color={tema.botaoPrimario} style={{ marginBottom: 15 }} />
            <Text style={[styles.versaoAppNome, { color: tema.textoPrincipal }]}>VIOLETA</Text>
            <Text style={[styles.versaoTagline, { color: tema.textoSecundario }]}>Gestão Educacional</Text>
            <View style={[styles.versaoBadge, { backgroundColor: tema.inputBackground, borderColor: tema.borda }]}>
              <Text style={[styles.versaoAppNumero, { color: tema.textoPrincipal }]}>Build 1.0.0 (Beta)</Text>
            </View>
            <View style={[styles.versaoLinha, { borderBottomColor: tema.borda }]} />
            <Text style={[styles.tituloCreditos, { color: tema.textoSecundario }]}>DESENVOLVIDO POR</Text>
            <Text style={[styles.nomeCredito, { color: tema.textoPrincipal, fontWeight: '800' }]}>Larissa Alves</Text>
            <Text style={[styles.nomeCredito, { color: tema.textoPrincipal, fontWeight: '800' }]}>Aryane</Text>
            <Text style={[styles.nomeCredito, { color: tema.botaoPrimario, fontWeight: '900', marginTop: 4 }]}>LuffyBaiano</Text>
            <View style={{ marginTop: 25, alignItems: 'center' }}>
              <Text style={[styles.versaoCreditosMenor, { color: tema.textoSecundario }]}>Salvador, BA - 2026</Text>
              <Text style={[styles.versaoDireitos, { color: tema.textoSecundario }]}>© Todos os direitos reservados.</Text>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      <FeedbackToast {...toastProps} />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { alignItems: 'center', paddingTop: 50, paddingBottom: 30, borderBottomLeftRadius: 30, borderBottomRightRadius: 30, elevation: 5 },
  headerTopRow: { width: '100%', flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 20, marginBottom: 10 },
  btnVoltar: { padding: 5 }, btnToggleCargo: { padding: 5, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 8 },
  avatarContainer: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#FFF', justifyContent: 'center', alignItems: 'center', marginBottom: 15 },
  avatarText: { fontSize: 32, fontWeight: 'bold', color: '#1565C0' },
  nomeUsuario: { fontSize: 22, fontWeight: 'bold', marginBottom: 5 },
  badgeCargo: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12, marginBottom: 8 },
  textoBadge: { color: '#FFF', fontSize: 12, fontWeight: 'bold' }, emailUsuario: { fontSize: 14, opacity: 0.8 },
  section: { paddingHorizontal: 20, marginTop: 25 }, sectionTitle: { fontSize: 12, fontWeight: '900', marginBottom: 8, marginLeft: 5 },
  cardMenu: { borderWidth: 1, borderRadius: 16, overflow: 'hidden' },
  menuItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 15, paddingHorizontal: 15, borderBottomWidth: StyleSheet.hairlineWidth },
  iconContainer: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  menuTextContainer: { flex: 1 }, menuTitle: { fontSize: 15, fontWeight: 'bold' }, menuSubtitle: { fontSize: 12, marginTop: 2 },
  cardProgressoBackup: { borderWidth: 1, borderRadius: 12, padding: 12, marginTop: 10 },
  linhaProgressoTopo: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  trilhaBarra: { height: 7, borderRadius: 6, overflow: 'hidden' }, preenchimentoBarra: { height: '100%', borderRadius: 6 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center', padding: 18 },
  overlayDestaque: { zIndex: 9999, elevation: 30, backgroundColor: 'rgba(0,0,0,0.82)' },
  modalCardCentro: { width: '100%', maxHeight: '85%', borderRadius: 20, borderWidth: 1, overflow: 'hidden' },
  cardDestaque: { borderWidth: 1.5, shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.45, shadowRadius: 16, elevation: 32 },
  headerSessoesDir: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  linhaEtapa: { flexDirection: 'row', alignItems: 'flex-start', borderWidth: 1, borderRadius: 12, padding: 12, marginBottom: 10 },
  boxResultado: { borderWidth: 1, borderRadius: 12, padding: 12, marginTop: 4 },
  btnSecModal: { flex: 1, height: 44, borderWidth: 1, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  btnPrimModal: { flex: 1, height: 44, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  chipAba: { flex: 1, borderWidth: 1, borderRadius: 10, paddingVertical: 10, paddingHorizontal: 8, alignItems: 'center' },
  btnAddEvento: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderRadius: 10, height: 42, gap: 6 },
  modalOverlayFull: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', paddingTop: 40 },
  modalContentFull: { flex: 1, borderTopLeftRadius: 25, borderTopRightRadius: 25 },
  modalOverlayHalf: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalContentHalf: { borderTopLeftRadius: 25, borderTopRightRadius: 25, paddingBottom: 40 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1 },
  modalTitle: { fontSize: 18, fontWeight: 'bold' }, btnFecharModal: { padding: 5 }, modalBody: { padding: 20 },
  topicoSeguranca: { fontSize: 13, fontWeight: '900', marginBottom: 8 },
  avisoSenha: { lineHeight: 17, marginBottom: 12 },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 15, height: 50 },
  rowOpcoes: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  btnVerSessoes: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderRadius: 10, height: 46, gap: 8, marginTop: 18 },
  btnEncerrarOutras: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 },
  btnAcaoLargo: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', height: 50, borderRadius: 10, marginTop: 25, marginBottom: 20 },
  textoBtnLargo: { color: '#FFF', fontSize: 15, fontWeight: 'bold' },
  tituloLinha: { fontSize: 15, fontWeight: 'bold' }, subtituloLinha: { fontSize: 12, marginTop: 2 },
  cardSessao: { flexDirection: 'row', alignItems: 'center', padding: 15, borderWidth: 1, borderRadius: 12 },
  btnSessaoPequeno: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
  inputLabel: { fontSize: 14, fontWeight: 'bold', marginBottom: 6 }, inputDisabled: { opacity: 0.6 },
  inputAreaEnd: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 15, paddingTop: 15, height: 80 },
  inputArea: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 15, paddingTop: 15, height: 120 },
  avatarEdicaoContainer: { alignSelf: 'center', marginBottom: 25 },
  avatarEdicao: { width: 100, height: 100, borderRadius: 50, backgroundColor: '#FFF', justifyContent: 'center', alignItems: 'center' },
  btnAlterarFoto: { position: 'absolute', bottom: 0, right: 0, backgroundColor: '#1565C0', width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center', borderWidth: 3, borderColor: '#FFF' },
  btnPreferencia: { flex: 1, alignItems: 'center', paddingVertical: 12, borderWidth: 1, borderRadius: 8 },
  modalVersaoContent: { width: '85%', borderRadius: 25, padding: 35, alignItems: 'center', borderWidth: 1 },
  versaoAppNome: { fontSize: 28, fontWeight: '900', letterSpacing: 3, marginBottom: 2 },
  versaoTagline: { fontSize: 12, fontStyle: 'italic', marginBottom: 15, letterSpacing: 1 },
  versaoBadge: { paddingHorizontal: 15, paddingVertical: 6, borderRadius: 20, borderWidth: 1, marginBottom: 20 },
  versaoAppNumero: { fontSize: 12, fontWeight: 'bold' }, versaoLinha: { width: '40%', borderBottomWidth: 2, marginBottom: 25, opacity: 0.5 },
  tituloCreditos: { fontSize: 10, fontWeight: 'bold', letterSpacing: 2, marginBottom: 10 }, nomeCredito: { fontSize: 16, marginBottom: 2, letterSpacing: 0.5 },
  versaoCreditosMenor: { fontSize: 11, marginBottom: 5 }, versaoDireitos: { fontSize: 10, fontStyle: 'italic' },
});