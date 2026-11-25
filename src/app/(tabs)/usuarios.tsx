import React, { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, KeyboardAvoidingView, Modal, Platform, RefreshControl, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { addDoc, collection, deleteDoc, doc, getDocs, serverTimestamp, updateDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useDemoProfile } from '../../contexts/demoProfileContext';
import { FeedbackToast, type EstadoFeedback, type TipoFeedback } from '../../components/FeedbackToast';

type PerfilUsuario = 'Administrador' | 'Coordenador' | 'Professor';
type FiltroPerfil = 'Todos' | PerfilUsuario;
type SituacaoUsuario = 'Ativo' | 'Inativo';
type FiltroSituacao = 'Todas' | SituacaoUsuario;

interface UsuarioItem {
  id: string;
  nome: string;
  email: string;
  perfil: PerfilUsuario;
  situacao: SituacaoUsuario;
  disciplina?: string;
  cpf?: string;
  senhaInicialGerada?: string;
}

interface AulaGradeItem {
  id: string;
  professorId?: string;
  professorNome?: string;
  disciplina?: string;
  nome?: string;
  turno?: string;
  diaId?: number;
  horario?: string;
}

const FILTROS_PERFIL: FiltroPerfil[] = ['Todos', 'Administrador', 'Coordenador', 'Professor'];
const FILTROS_SITUACAO: FiltroSituacao[] = ['Todas', 'Ativo', 'Inativo'];
const DIAS_SEMANA: Record<number, string> = { 1: 'Segunda', 2: 'Terça', 3: 'Quarta', 4: 'Quinta', 5: 'Sexta' };
const FILTROS_DIA = [
  { id: 0, nome: 'Todos' },
  { id: 1, nome: 'Seg' },
  { id: 2, nome: 'Ter' },
  { id: 3, nome: 'Qua' },
  { id: 4, nome: 'Qui' },
  { id: 5, nome: 'Sex' },
];
const FILTROS_TURNO = ['Todos', 'Matutino', 'Vespertino', 'Noturno'] as const;

const normalizarPerfil = (raw: unknown): PerfilUsuario => {
  const valor = String(raw || '').toLowerCase();
  if (valor.includes('admin')) return 'Administrador';
  if (valor.includes('coord')) return 'Coordenador';
  return 'Professor';
};

const gerarSenhaPadrao = (nome: string, cpf?: string, senhaSalva?: string) => {
  if (senhaSalva?.trim()) return senhaSalva.trim();
  const primeiroNome = nome.trim().split(/\s+/)[0].normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const digitosCpf = (cpf || '').replace(/\D/g, '');
  return `${primeiroNome.slice(0, 4) || 'user'}@${digitosCpf.slice(0, 4) || '2026'}`;
};

export default function UsuariosScreen() {
  const router = useRouter();
  const { perfil, temaAtivo: tema } = useDemoProfile();
  const isAdmin = perfil === 'admin';
  const isCoord = perfil === 'coordenador';

  const [usuarios, setUsuarios] = useState<UsuarioItem[]>([]);
  const [gradeAulas, setGradeAulas] = useState<AulaGradeItem[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [ocupado, setOcupado] = useState(false);
  const [busca, setBusca] = useState('');
  const [perfilFiltro, setPerfilFiltro] = useState<FiltroPerfil>('Todos');
  const [situacaoFiltro, setSituacaoFiltro] = useState<FiltroSituacao>('Todas');
  const [diaFiltroCoord, setDiaFiltroCoord] = useState<number>(0);
  const [turnoFiltroCoord, setTurnoFiltroCoord] = useState<(typeof FILTROS_TURNO)[number]>('Todos');
  const [modalFiltroCoord, setModalFiltroCoord] = useState(false);
  const [pastasExpandidas, setPastasExpandidas] = useState<string[]>([]);
  const [aulaExcluindoId, setAulaExcluindoId] = useState<string | null>(null);
  const [modalNovoProf, setModalNovoProf] = useState(false);
  const [formNovoProf, setFormNovoProf] = useState({ nome: '', email: '', cpf: '', disciplina: '' });

  const [selecionado, setSelecionado] = useState<UsuarioItem | null>(null);
  const [editando, setEditando] = useState(false);
  const [etapaExclusao, setEtapaExclusao] = useState<0 | 1>(0);
  const [senhaExibida, setSenhaExibida] = useState<string | null>(null);
  const [formEdicao, setFormEdicao] = useState<{ nome: string; email: string; perfil: 'Professor' | 'Coordenador'; disciplina: string }>({
    nome: '', email: '', perfil: 'Professor', disciplina: '',
  });
  const [feedback, setFeedback] = useState<EstadoFeedback>({ visivel: false, tipo: 'sucesso', titulo: '', mensagem: '' });

  const notificar = useCallback((tipo: TipoFeedback, titulo: string, mensagem: string) => {
    setFeedback({ visivel: true, tipo, titulo, mensagem });
  }, []);
  const fecharFeedback = useCallback(() => setFeedback(prev => ({ ...prev, visivel: false })), []);

  const buscarUsuarios = useCallback(async () => {
    setCarregando(true);
    try {
      const snap = await getDocs(collection(db, 'usuarios'));
      const doBanco: UsuarioItem[] = snap.docs.map(d => {
        const data = d.data();
        return {
          id: d.id,
          nome: String(data.nome || 'Sem nome'),
          email: String(data.email || ''),
          perfil: normalizarPerfil(data.role ?? data.perfil),
          situacao: data.ativo === false || data.situacao === 'Inativo' ? 'Inativo' : 'Ativo',
          disciplina: typeof data.disciplina === 'string' ? data.disciplina : '',
          cpf: typeof data.cpf === 'string' ? data.cpf : '',
          senhaInicialGerada: typeof data.senhaInicialGerada === 'string' ? data.senhaInicialGerada : undefined,
        };
      });
      setUsuarios(doBanco);

      if (isCoord) {
        try {
          const gradeSnap = await getDocs(collection(db, 'grade_aulas'));
          const aulasBanco: AulaGradeItem[] = gradeSnap.docs.map(d => ({ id: d.id, ...(d.data() as any) }));
          aulasBanco.sort((a, b) => (a.diaId || 0) - (b.diaId || 0) || String(a.horario || '').localeCompare(String(b.horario || '')));
          setGradeAulas(aulasBanco);
        } catch { setGradeAulas([]); }
      }
    } catch (error: any) {
      notificar('erro', 'Erro ao carregar usuários', error?.message || 'Falha ao consultar a coleção usuarios.');
    } finally { setCarregando(false); }
  }, [isCoord, notificar]);

  useFocusEffect(
    useCallback(() => {
      void buscarUsuarios();
    }, [buscarUsuarios])
  );

  const sincronizarFormEdicao = (u: UsuarioItem) => {
    setFormEdicao({
      nome: u.nome,
      email: u.email,
      perfil: u.perfil === 'Coordenador' ? 'Coordenador' : 'Professor',
      disciplina: u.disciplina || '',
    });
  };

  const abrirModal = (usuario: UsuarioItem) => {
    setSelecionado(usuario);
    setEditando(false);
    setEtapaExclusao(0);
    setSenhaExibida(null);
    sincronizarFormEdicao(usuario);
  };

  const fecharModal = () => {
    setSelecionado(null);
    setEditando(false);
    setEtapaExclusao(0);
    setSenhaExibida(null);
  };

  const togglePastaProfessor = (id: string) => {
    setAulaExcluindoId(null);
    setPastasExpandidas(prev => (prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]));
  };

  const obterAulasDoProfessor = useCallback((prof: UsuarioItem) => {
    const nomeNorm = prof.nome.trim().toLowerCase();
    return gradeAulas.filter(aula => {
      const bateProf = aula.professorId === prof.id || String(aula.professorNome || '').trim().toLowerCase() === nomeNorm;
      if (!bateProf) return false;
      if (diaFiltroCoord !== 0 && aula.diaId !== diaFiltroCoord) return false;
      if (turnoFiltroCoord !== 'Todos' && (aula.turno || 'Matutino') !== turnoFiltroCoord) return false;
      return true;
    });
  }, [gradeAulas, diaFiltroCoord, turnoFiltroCoord]);

  const excluirAulaGrade = async (aula: AulaGradeItem) => {
    if (aulaExcluindoId !== aula.id) {
      setAulaExcluindoId(aula.id);
      return;
    }
    setOcupado(true);
    try {
      await deleteDoc(doc(db, 'grade_aulas', aula.id));
      setGradeAulas(prev => prev.filter(a => a.id !== aula.id));
      setAulaExcluindoId(null);
      notificar('sucesso', 'Aula removida', `${aula.nome || 'Turma'} • ${aula.horario || ''} removida da grade.`);
    } catch (error: any) {
      notificar('erro', 'Erro ao remover aula', error?.message || 'Não foi possível excluir a aula da grade.');
    } finally { setOcupado(false); }
  };

  const salvarNovoProfessorCoord = async () => {
    const { nome, email, cpf, disciplina } = formNovoProf;
    if (!nome.trim() || !email.trim() || cpf.replace(/\D/g, '').length < 11) {
      return notificar('aviso', 'Campos obrigatórios', 'Preencha nome completo, e-mail válido e CPF (11 dígitos).');
    }
    if (!disciplina.trim()) {
      return notificar('aviso', 'Disciplina obrigatória', 'Informe a matéria ministrada pelo professor.');
    }
    const senhaGerada = gerarSenhaPadrao(nome, cpf);
    setOcupado(true);
    try {
      await addDoc(collection(db, 'usuarios'), {
        nome: nome.trim(),
        email: email.trim().toLowerCase(),
        cpf: cpf.replace(/\D/g, ''),
        role: 'professor',
        perfil: 'Professor',
        disciplina: disciplina.trim(),
        ativo: true,
        situacao: 'Ativo',
        senhaInicialGerada: senhaGerada,
        criadoPor: 'Camila',
        criadoEm: serverTimestamp(),
      });
      setModalNovoProf(false);
      setFormNovoProf({ nome: '', email: '', cpf: '', disciplina: '' });
      void buscarUsuarios();
      notificar('sucesso', 'Professor cadastrado!', `${nome.trim()} (${disciplina.trim()}) • Senha inicial: ${senhaGerada}`);
    } catch (error: any) {
      notificar('erro', 'Erro ao cadastrar', error?.message || 'Não foi possível salvar o professor no Firestore.');
    } finally { setOcupado(false); }
  };

  const atualizarUsuarioLocal = (atualizado: UsuarioItem) => {
    setUsuarios(prev => prev.map(u => (u.id === atualizado.id ? atualizado : u)));
    setSelecionado(prev => (prev?.id === atualizado.id ? atualizado : prev));
  };

  const usuariosFiltrados = useMemo(() => {
    const termo = busca.trim().toLocaleLowerCase('pt-BR');
    return usuarios.filter(u => {
      const bateTexto = u.nome.toLocaleLowerCase('pt-BR').includes(termo) ||
        (isCoord && String(u.disciplina || '').toLocaleLowerCase('pt-BR').includes(termo));
      const batePerfil = isCoord ? u.perfil === 'Professor' : perfilFiltro === 'Todos' || u.perfil === perfilFiltro;
      const bateSituacao = situacaoFiltro === 'Todas' || u.situacao === situacaoFiltro;
      return bateTexto && batePerfil && bateSituacao;
    });
  }, [busca, isCoord, perfilFiltro, situacaoFiltro, usuarios]);

  const temFiltroAtivoCoord = situacaoFiltro !== 'Todas' || diaFiltroCoord !== 0 || turnoFiltroCoord !== 'Todos';

  const limparFiltrosCoord = () => {
    setSituacaoFiltro('Todas');
    setDiaFiltroCoord(0);
    setTurnoFiltroCoord('Todos');
  };

  const voltar = () => (router.canGoBack() ? router.back() : router.replace('/(tabs)'));

  const bloquearAdmin = (u: UsuarioItem) => {
    if (u.perfil !== 'Administrador') return false;
    notificar('aviso', 'Ação bloqueada', 'Contas de Administrador são protegidas contra inativação, alteração ou exclusão.');
    return true;
  };

  const alternarSituacao = async (usuario: UsuarioItem) => {
    if (bloquearAdmin(usuario)) return;
    const novaSituacao: SituacaoUsuario = usuario.situacao === 'Ativo' ? 'Inativo' : 'Ativo';
    setOcupado(true);
    try {
      await updateDoc(doc(db, 'usuarios', usuario.id), { ativo: novaSituacao === 'Ativo', situacao: novaSituacao });
      atualizarUsuarioLocal({ ...usuario, situacao: novaSituacao });
      notificar('sucesso', 'Situação atualizada', `${usuario.nome} agora está ${novaSituacao}.`);
    } catch (error: any) {
      notificar('erro', 'Erro ao atualizar', error?.message || 'Não foi possível alterar a situação do usuário.');
    } finally { setOcupado(false); }
  };

  const salvarEdicao = async () => {
    if (!selecionado || bloquearAdmin(selecionado)) return;
    if (!formEdicao.nome.trim() || !formEdicao.email.trim()) return notificar('aviso', 'Campos obrigatórios', 'Preencha nome e e-mail do usuário.');
    if (formEdicao.perfil === 'Professor' && !formEdicao.disciplina.trim()) return notificar('aviso', 'Campos obrigatórios', 'Informe a disciplina ministrada pelo professor.');
    const nomeLimpo = formEdicao.nome.trim();
    const emailLimpo = formEdicao.email.trim().toLowerCase();
    const discLimpa = formEdicao.perfil === 'Professor' ? formEdicao.disciplina.trim() : '';
    setOcupado(true);
    try {
      await updateDoc(doc(db, 'usuarios', selecionado.id), {
        nome: nomeLimpo,
        email: emailLimpo,
        perfil: formEdicao.perfil,
        role: formEdicao.perfil === 'Coordenador' ? 'coordenador' : 'professor',
        disciplina: discLimpa,
      });
      atualizarUsuarioLocal({ ...selecionado, nome: nomeLimpo, email: emailLimpo, perfil: formEdicao.perfil, disciplina: discLimpa || undefined });
      setEditando(false);
      notificar('sucesso', 'Dados salvos', `As informações de ${nomeLimpo} foram atualizadas.`);
    } catch (error: any) {
      notificar('erro', 'Erro ao salvar', error?.message || 'Não foi possível salvar as alterações no Firestore.');
    } finally { setOcupado(false); }
  };

  const redefinirSenha = async (usuario: UsuarioItem) => {
    const senha = gerarSenhaPadrao(usuario.nome, usuario.cpf, usuario.senhaInicialGerada);
    setOcupado(true);
    try {
      await updateDoc(doc(db, 'usuarios', usuario.id), { senhaInicialGerada: senha });
      atualizarUsuarioLocal({ ...usuario, senhaInicialGerada: senha });
      setSenhaExibida(senha);
      notificar('sucesso', 'Senha redefinida', `Senha inicial de ${usuario.nome}: ${senha}`);
    } catch (error: any) {
      notificar('erro', 'Erro ao redefinir', error?.message || 'Não foi possível atualizar a senha inicial.');
    } finally { setOcupado(false); }
  };

  const excluirUsuario = async (usuario: UsuarioItem) => {
    if (bloquearAdmin(usuario)) return;
    if (etapaExclusao === 0) return setEtapaExclusao(1);
    setOcupado(true);
    try {
      await deleteDoc(doc(db, 'usuarios', usuario.id));
      setUsuarios(prev => prev.filter(u => u.id !== usuario.id));
      fecharModal();
      notificar('sucesso', 'Usuário excluído', `${usuario.nome} foi removido da gestão de usuários.`);
    } catch (error: any) {
      notificar('erro', 'Erro ao excluir', error?.message || 'Não foi possível excluir o usuário.');
    } finally { setOcupado(false); }
  };

  const toastProps = {
    feedback,
    onFechar: fecharFeedback,
    fundoCard: tema.fundoTopo,
    textoPrincipal: tema.textoPrincipal,
    textoSecundario: tema.textoSecundario,
  };

  const renderUsuario = ({ item }: { item: UsuarioItem }) => (
    <TouchableOpacity
      style={[styles.cardUsuario, { backgroundColor: tema.inputBackground, borderColor: tema.borda }]}
      onPress={() => abrirModal(item)}
      activeOpacity={0.75}
      accessibilityRole="button"
      accessibilityLabel={`Ver dados de ${item.nome}`}
    >
      <View style={[styles.iconeUsuario, { backgroundColor: tema.botaoPrimario + '20' }]}>
        <Ionicons name="person" size={21} color={tema.botaoPrimario} />
      </View>
      <View style={styles.infoUsuario}>
        <Text style={[styles.nomeUsuario, { color: tema.textoPrincipal }]}>{item.nome}</Text>
        <Text style={[styles.perfilUsuario, { color: tema.textoSecundario }]}>
          {item.perfil}{item.perfil === 'Professor' && item.disciplina ? ` • ${item.disciplina}` : ''}
        </Text>
      </View>
      <View style={[styles.badgeSituacao, { backgroundColor: item.situacao === 'Ativo' ? '#E8F5E9' : '#FFEBEE' }]}>
        <Text style={[styles.textoSituacao, { color: item.situacao === 'Ativo' ? '#2E7D32' : '#C62828' }]}>{item.situacao}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={tema.icone} style={{ marginLeft: 8 }} />
    </TouchableOpacity>
  );

  const renderPastaProfessorCoord = ({ item }: { item: UsuarioItem }) => {
    const aberta = pastasExpandidas.includes(item.id);
    const aulas = obterAulasDoProfessor(item);
    return (
      <View style={{ marginBottom: 12 }}>
        <TouchableOpacity
          style={[styles.cardUsuario, { marginBottom: 0, backgroundColor: tema.inputBackground, borderColor: aberta ? tema.botaoPrimario : tema.borda }]}
          onPress={() => togglePastaProfessor(item.id)}
          activeOpacity={0.75}
        >
          <View style={[styles.iconeUsuario, { backgroundColor: tema.botaoPrimario + '20' }]}>
            <Ionicons name={aberta ? 'folder-open' : 'folder'} size={20} color={tema.botaoPrimario} />
          </View>
          <View style={styles.infoUsuario}>
            <Text style={[styles.nomeUsuario, { color: tema.textoPrincipal }]}>{item.nome}</Text>
            <Text style={[styles.perfilUsuario, { color: tema.textoSecundario }]}>
              {item.disciplina || 'Sem disciplina'} • {aulas.length} {aulas.length === 1 ? 'aula' : 'aulas'}
            </Text>
          </View>
          <View style={[styles.badgeSituacao, { backgroundColor: item.situacao === 'Ativo' ? '#E8F5E9' : '#FFEBEE', marginRight: 6 }]}>
            <Text style={[styles.textoSituacao, { color: item.situacao === 'Ativo' ? '#2E7D32' : '#C62828' }]}>{item.situacao}</Text>
          </View>
          <TouchableOpacity onPress={() => abrirModal(item)} style={{ padding: 4, marginRight: 4 }} accessibilityLabel="Ver dados do professor">
            <Ionicons name="information-circle-outline" size={20} color={tema.textoSecundario} />
          </TouchableOpacity>
          <Ionicons name={aberta ? 'chevron-down' : 'chevron-forward'} size={18} color={tema.icone} />
        </TouchableOpacity>
        {aberta && (
          <View style={[styles.conteudoPastaProf, { borderLeftColor: tema.borda }]}>
            {aulas.length === 0 ? (
              <Text style={{ color: tema.textoSecundario, fontSize: 12, fontStyle: 'italic', paddingVertical: 8 }}>
                Nenhuma turma alocada na grade{diaFiltroCoord !== 0 || turnoFiltroCoord !== 'Todos' ? ' para o filtro atual' : ''}.
              </Text>
            ) : aulas.map(aula => {
              const confirmando = aulaExcluindoId === aula.id;
              return (
                <View key={aula.id} style={[styles.cardAulaProf, { backgroundColor: tema.inputBackground, borderColor: confirmando ? '#C62828' : tema.borda }]}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: tema.textoPrincipal, fontWeight: '700', fontSize: 14 }}>
                      {aula.nome || 'Turma'} • {aula.disciplina || item.disciplina || 'Matéria'}
                    </Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
                      <Ionicons name="calendar-outline" size={13} color={tema.botaoPrimario} />
                      <Text style={{ color: tema.botaoPrimario, fontSize: 12, fontWeight: '700' }}>
                        {DIAS_SEMANA[aula.diaId || 1] || 'Dia'} • {aula.horario || 'Horário não definido'}
                      </Text>
                    </View>
                  </View>
                  <View style={[styles.pillTurnoAula, { backgroundColor: tema.botaoPrimario + '18' }]}>
                    <Text style={{ color: tema.botaoPrimario, fontSize: 10, fontWeight: '700' }}>{aula.turno || 'Matutino'}</Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => void excluirAulaGrade(aula)}
                    disabled={ocupado}
                    style={{ padding: 6, borderRadius: 8, backgroundColor: confirmando ? '#C6282820' : 'transparent' }}
                    accessibilityLabel="Excluir aula da grade"
                  >
                    <Ionicons name={confirmando ? 'checkmark-circle' : 'trash-outline'} size={18} color="#C62828" />
                  </TouchableOpacity>
                </View>
              );
            })}
          </View>
        )}
      </View>
    );
  };

  if (perfil === 'professor') {
    return (
      <View style={[styles.acessoRestrito, { backgroundColor: tema.fundoBase }]}>
        <Ionicons name="lock-closed-outline" size={42} color={tema.textoSecundario} />
        <Text style={[styles.textoAcessoRestrito, { color: tema.textoPrincipal }]}>Esta tela não está disponível no perfil Professor demonstrativo.</Text>
        <TouchableOpacity style={[styles.botaoVoltar, { backgroundColor: tema.botaoPrimario }]} onPress={voltar}>
          <Text style={[styles.textoBotaoVoltar, { color: tema.textoBotao }]}>Voltar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const acoesAdmin = selecionado ? [
    {
      key: 'status',
      icone: selecionado.situacao === 'Ativo' ? ('pause-circle-outline' as const) : ('play-circle-outline' as const),
      cor: selecionado.situacao === 'Ativo' ? '#EF6C00' : '#2E7D32',
      label: selecionado.situacao === 'Ativo' ? 'Inativar usuário' : 'Ativar usuário',
      onPress: () => void alternarSituacao(selecionado),
      destaqueExclusao: false,
    },
    {
      key: 'editar',
      icone: 'create-outline' as const,
      cor: tema.botaoPrimario,
      label: 'Editar dados e cargo',
      onPress: () => { setEtapaExclusao(0); setEditando(true); },
      destaqueExclusao: false,
    },
    {
      key: 'senha',
      icone: 'key-outline' as const,
      cor: tema.botaoPrimario,
      label: 'Redefinir senha inicial',
      onPress: () => void redefinirSenha(selecionado),
      destaqueExclusao: false,
    },
    {
      key: 'excluir',
      icone: 'trash-outline' as const,
      cor: '#C62828',
      label: etapaExclusao === 1 ? 'Confirmar exclusão definitiva' : 'Excluir usuário',
      onPress: () => void excluirUsuario(selecionado),
      destaqueExclusao: etapaExclusao === 1,
    },
  ] : [];

  return (
    <KeyboardAvoidingView style={[styles.container, { backgroundColor: tema.fundoBase }]} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={[styles.header, { backgroundColor: tema.fundoTopo }]}>
        <View style={styles.headerLinha}>
          <TouchableOpacity onPress={voltar} style={styles.botaoVoltarHeader} accessibilityRole="button" accessibilityLabel="Voltar">
            <Ionicons name="arrow-back" size={24} color={tema.textoLogo} />
          </TouchableOpacity>
          <View style={styles.headerTexto}>
            <Text style={[styles.titulo, { color: tema.textoLogo }]}>{isCoord ? 'Professores' : 'Gestão de Usuários'}</Text>
            <Text style={[styles.subtitulo, { color: tema.textoLogo }]}>
              {isCoord ? 'Toque no docente para ver turmas, dias e horários' : 'Base sincronizada com o Firebase'}
            </Text>
          </View>
          {isCoord && (
            <TouchableOpacity style={[styles.btnAddTopo, { backgroundColor: tema.botaoPrimario }]} onPress={() => setModalNovoProf(true)}>
              <Ionicons name="add" size={18} color={tema.textoBotao} />
              <Text style={{ color: tema.textoBotao, fontSize: 12, fontWeight: '700' }}>Novo Prof.</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      <View style={styles.filtros}>
        <View style={styles.rowBuscaFiltro}>
          <View style={[styles.buscaContainer, { flex: 1, backgroundColor: tema.inputBackground, borderColor: tema.borda }]}>
            <Ionicons name="search" size={20} color={tema.textoSecundario} style={{ marginRight: 8 }} />
            <TextInput
              style={[styles.inputBusca, { color: tema.textoPrincipal }]}
              placeholder={isCoord ? 'Pesquisar professor ou matéria...' : 'Pesquisar por nome'}
              placeholderTextColor={tema.textoSecundario}
              value={busca}
              onChangeText={setBusca}
              accessibilityLabel="Pesquisar usuários por nome"
            />
          </View>
          {isCoord && (
            <TouchableOpacity
              style={[styles.btnFiltroHeader, { backgroundColor: temFiltroAtivoCoord ? tema.botaoPrimario : tema.inputBackground, borderColor: temFiltroAtivoCoord ? tema.botaoPrimario : tema.borda }]}
              onPress={() => setModalFiltroCoord(true)}
              accessibilityLabel="Filtrar professores e horários"
            >
              <Ionicons name="options-outline" size={20} color={temFiltroAtivoCoord ? tema.textoBotao : tema.textoPrincipal} />
            </TouchableOpacity>
          )}
        </View>

        {isCoord && temFiltroAtivoCoord && (
          <View style={styles.barraFiltroAtivo}>
            <Text style={{ color: tema.textoSecundario, fontSize: 12 }}>
              Filtro: <Text style={{ color: tema.textoPrincipal, fontWeight: '700' }}>
                {situacaoFiltro} • {diaFiltroCoord === 0 ? 'Todos os dias' : DIAS_SEMANA[diaFiltroCoord]} • {turnoFiltroCoord}
              </Text>
            </Text>
            <TouchableOpacity onPress={limparFiltrosCoord}>
              <Text style={{ color: tema.botaoPrimario, fontSize: 12, fontWeight: 'bold' }}>Limpar</Text>
            </TouchableOpacity>
          </View>
        )}

        {isAdmin && (
          <>
            <Text style={[styles.rotuloFiltro, { color: tema.textoSecundario }]}>Perfil</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.listaFiltros}>
              {FILTROS_PERFIL.map(filtro => (
                <TouchableOpacity key={filtro} style={[styles.chipFiltro, { backgroundColor: perfilFiltro === filtro ? tema.botaoPrimario : tema.inputBackground, borderColor: tema.borda }]} onPress={() => setPerfilFiltro(filtro)} accessibilityRole="button" accessibilityState={{ selected: perfilFiltro === filtro }}>
                  <Text style={[styles.textoChip, { color: perfilFiltro === filtro ? tema.textoBotao : tema.textoPrincipal }]}>{filtro}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <Text style={[styles.rotuloFiltro, { color: tema.textoSecundario }]}>Situação</Text>
            <View style={styles.listaFiltros}>
              {FILTROS_SITUACAO.map(filtro => (
                <TouchableOpacity key={filtro} style={[styles.chipFiltro, { backgroundColor: situacaoFiltro === filtro ? tema.botaoPrimario : tema.inputBackground, borderColor: tema.borda }]} onPress={() => setSituacaoFiltro(filtro)} accessibilityRole="button" accessibilityState={{ selected: situacaoFiltro === filtro }}>
                  <Text style={[styles.textoChip, { color: situacaoFiltro === filtro ? tema.textoBotao : tema.textoPrincipal }]}>{filtro}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}
      </View>

      <FlatList
        data={usuariosFiltrados}
        keyExtractor={item => item.id}
        renderItem={isCoord ? renderPastaProfessorCoord : renderUsuario}
        contentContainerStyle={styles.listaUsuarios}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={carregando} onRefresh={() => void buscarUsuarios()} tintColor={tema.botaoPrimario} />}
        ListEmptyComponent={
          carregando
            ? <ActivityIndicator size="large" color={tema.botaoPrimario} style={{ marginTop: 30 }} />
            : <Text style={[styles.listaVazia, { color: tema.textoSecundario }]}>{isCoord ? 'Nenhum professor encontrado.' : 'Nenhum usuário encontrado.'}</Text>
        }
      />

      <Modal visible={modalFiltroCoord} transparent animationType="slide" onRequestClose={() => setModalFiltroCoord(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalConteudo, { backgroundColor: tema.fundoBase, borderColor: tema.borda }]}>
            <View style={[styles.modalHeader, { borderBottomColor: tema.borda }]}>
              <Text style={[styles.modalTitulo, { color: tema.textoPrincipal }]}>Filtrar Professores e Grade</Text>
              <TouchableOpacity onPress={() => setModalFiltroCoord(false)}><Ionicons name="close" size={24} color={tema.textoSecundario} /></TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={styles.detalhesUsuario}>
              <Text style={[styles.labelCampo, { color: tema.textoSecundario }]}>Situação do Professor</Text>
              <View style={styles.linhaCargos}>
                {FILTROS_SITUACAO.map(s => {
                  const sel = situacaoFiltro === s;
                  return (
                    <TouchableOpacity key={s} onPress={() => setSituacaoFiltro(s)} style={[styles.chipCargo, { backgroundColor: sel ? tema.botaoPrimario + '20' : tema.inputBackground, borderColor: sel ? tema.botaoPrimario : tema.borda }]}>
                      <Text style={{ color: sel ? tema.botaoPrimario : tema.textoPrincipal, fontWeight: '700', fontSize: 12 }}>{s}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              <Text style={[styles.labelCampo, { color: tema.textoSecundario }]}>Dia da Semana (Aulas na Pasta)</Text>
              <View style={styles.linhaCargos}>
                {FILTROS_DIA.map(d => {
                  const sel = diaFiltroCoord === d.id;
                  return (
                    <TouchableOpacity key={d.id} onPress={() => setDiaFiltroCoord(d.id)} style={[styles.chipCargo, { backgroundColor: sel ? tema.botaoPrimario + '20' : tema.inputBackground, borderColor: sel ? tema.botaoPrimario : tema.borda }]}>
                      <Text style={{ color: sel ? tema.botaoPrimario : tema.textoPrincipal, fontWeight: '700', fontSize: 11 }}>{d.nome}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              <Text style={[styles.labelCampo, { color: tema.textoSecundario }]}>Turno das Aulas</Text>
              <View style={styles.linhaCargos}>
                {FILTROS_TURNO.map(t => {
                  const sel = turnoFiltroCoord === t;
                  return (
                    <TouchableOpacity key={t} onPress={() => setTurnoFiltroCoord(t)} style={[styles.chipCargo, { backgroundColor: sel ? tema.botaoPrimario + '20' : tema.inputBackground, borderColor: sel ? tema.botaoPrimario : tema.borda }]}>
                      <Text style={{ color: sel ? tema.botaoPrimario : tema.textoPrincipal, fontWeight: '700', fontSize: 11 }}>{t}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              <View style={styles.linhaAcoesDuplas}>
                <TouchableOpacity style={[styles.btnSecundario, { backgroundColor: tema.inputBackground, borderColor: tema.borda }]} onPress={limparFiltrosCoord}>
                  <Text style={{ color: tema.textoPrincipal, fontWeight: '600' }}>Limpar</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.btnPrimarioModal, { backgroundColor: tema.botaoPrimario }]} onPress={() => setModalFiltroCoord(false)}>
                  <Text style={{ color: tema.textoBotao, fontWeight: '700' }}>Aplicar Filtros</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal visible={modalNovoProf} transparent animationType="slide" onRequestClose={() => setModalNovoProf(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalConteudo, { backgroundColor: tema.fundoBase, borderColor: tema.borda }]}>
            <View style={[styles.modalHeader, { borderBottomColor: tema.borda }]}>
              <Text style={[styles.modalTitulo, { color: tema.textoPrincipal }]}>Cadastrar Professor</Text>
              <TouchableOpacity onPress={() => setModalNovoProf(false)}><Ionicons name="close" size={24} color={tema.textoSecundario} /></TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={styles.detalhesUsuario} keyboardShouldPersistTaps="handled">
              <Text style={[styles.labelCampo, { color: tema.textoSecundario }]}>Nome Completo *</Text>
              <TextInput value={formNovoProf.nome} onChangeText={v => setFormNovoProf(prev => ({ ...prev, nome: v }))} placeholder="Ex: Rafael Nunes" placeholderTextColor={tema.textoSecundario} style={[styles.inputModal, { backgroundColor: tema.inputBackground, color: tema.textoPrincipal, borderColor: tema.borda }]} />
              <Text style={[styles.labelCampo, { color: tema.textoSecundario }]}>Disciplina / Matéria *</Text>
              <TextInput value={formNovoProf.disciplina} onChangeText={v => setFormNovoProf(prev => ({ ...prev, disciplina: v }))} placeholder="Ex: Matemática, Física, História..." placeholderTextColor={tema.textoSecundario} style={[styles.inputModal, { backgroundColor: tema.inputBackground, color: tema.textoPrincipal, borderColor: tema.borda }]} />
              <Text style={[styles.labelCampo, { color: tema.textoSecundario }]}>E-mail Institucional *</Text>
              <TextInput value={formNovoProf.email} onChangeText={v => setFormNovoProf(prev => ({ ...prev, email: v }))} autoCapitalize="none" keyboardType="email-address" placeholder="professor@violeta.com" placeholderTextColor={tema.textoSecundario} style={[styles.inputModal, { backgroundColor: tema.inputBackground, color: tema.textoPrincipal, borderColor: tema.borda }]} />
              <Text style={[styles.labelCampo, { color: tema.textoSecundario }]}>CPF *</Text>
              <TextInput value={formNovoProf.cpf} onChangeText={v => setFormNovoProf(prev => ({ ...prev, cpf: v }))} keyboardType="numeric" maxLength={14} placeholder="000.000.000-00" placeholderTextColor={tema.textoSecundario} style={[styles.inputModal, { backgroundColor: tema.inputBackground, color: tema.textoPrincipal, borderColor: tema.borda }]} />
              {!!formNovoProf.nome && formNovoProf.cpf.replace(/\D/g, '').length >= 4 && (
                <View style={[styles.boxSenha, { backgroundColor: tema.inputBackground, borderColor: tema.borda, marginTop: 4, marginBottom: 14 }]}>
                  <Ionicons name="key-outline" size={18} color={tema.botaoPrimario} />
                  <Text style={{ color: tema.textoSecundario, fontSize: 12, marginLeft: 8 }}>
                    Senha automática: <Text style={{ color: tema.textoPrincipal, fontWeight: '700' }}>{gerarSenhaPadrao(formNovoProf.nome, formNovoProf.cpf)}</Text>
                  </Text>
                </View>
              )}
              <TouchableOpacity style={[styles.btnSalvarFull, { backgroundColor: tema.botaoPrimario }]} onPress={() => void salvarNovoProfessorCoord()} disabled={ocupado}>
                <Text style={{ color: tema.textoBotao, fontWeight: '700', fontSize: 14 }}>{ocupado ? 'Salvando...' : 'Cadastrar Professor'}</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
          <FeedbackToast {...toastProps} />
        </View>
      </Modal>

      <Modal visible={selecionado !== null} transparent animationType="slide" onRequestClose={fecharModal}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalConteudo, { backgroundColor: tema.fundoBase, borderColor: tema.borda }]}>
            <View style={[styles.modalHeader, { borderBottomColor: tema.borda }]}>
              <Text style={[styles.modalTitulo, { color: tema.textoPrincipal }]}>{editando ? 'Editar usuário' : 'Dados do usuário'}</Text>
              <TouchableOpacity onPress={fecharModal} accessibilityRole="button" accessibilityLabel="Fechar dados do usuário">
                <Ionicons name="close" size={24} color={tema.textoSecundario} />
              </TouchableOpacity>
            </View>
            {selecionado && (
              <ScrollView contentContainerStyle={styles.detalhesUsuario} keyboardShouldPersistTaps="handled">
                {editando ? (
                  <>
                    <Text style={[styles.labelCampo, { color: tema.textoSecundario }]}>Nome</Text>
                    <TextInput value={formEdicao.nome} onChangeText={v => setFormEdicao(prev => ({ ...prev, nome: v }))} style={[styles.inputModal, { backgroundColor: tema.inputBackground, color: tema.textoPrincipal, borderColor: tema.borda }]} placeholder="Nome completo" placeholderTextColor={tema.textoSecundario} />
                    <Text style={[styles.labelCampo, { color: tema.textoSecundario }]}>E-mail</Text>
                    <TextInput value={formEdicao.email} onChangeText={v => setFormEdicao(prev => ({ ...prev, email: v }))} autoCapitalize="none" keyboardType="email-address" style={[styles.inputModal, { backgroundColor: tema.inputBackground, color: tema.textoPrincipal, borderColor: tema.borda }]} placeholder="email@violeta.com" placeholderTextColor={tema.textoSecundario} />
                    <Text style={[styles.labelCampo, { color: tema.textoSecundario }]}>Cargo</Text>
                    <View style={styles.linhaCargos}>
                      {(['Professor', 'Coordenador'] as const).map(cargo => {
                        const ativo = formEdicao.perfil === cargo;
                        return (
                          <TouchableOpacity key={cargo} onPress={() => setFormEdicao(prev => ({ ...prev, perfil: cargo }))} style={[styles.chipCargo, { backgroundColor: ativo ? tema.botaoPrimario + '20' : tema.inputBackground, borderColor: ativo ? tema.botaoPrimario : tema.borda }]}>
                            <Text style={{ color: ativo ? tema.botaoPrimario : tema.textoPrincipal, fontWeight: '700', fontSize: 13 }}>{cargo}</Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                    {formEdicao.perfil === 'Professor' && (
                      <>
                        <Text style={[styles.labelCampo, { color: tema.textoSecundario }]}>Disciplina</Text>
                        <TextInput value={formEdicao.disciplina} onChangeText={v => setFormEdicao(prev => ({ ...prev, disciplina: v }))} style={[styles.inputModal, { backgroundColor: tema.inputBackground, color: tema.textoPrincipal, borderColor: tema.borda }]} placeholder="Ex: Matemática, Física..." placeholderTextColor={tema.textoSecundario} />
                      </>
                    )}
                    <View style={styles.linhaAcoesDuplas}>
                      <TouchableOpacity style={[styles.btnSecundario, { backgroundColor: tema.inputBackground, borderColor: tema.borda }]} onPress={() => { setEditando(false); sincronizarFormEdicao(selecionado); }} disabled={ocupado}>
                        <Text style={{ color: tema.textoPrincipal, fontWeight: '600' }}>Cancelar</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={[styles.btnPrimarioModal, { backgroundColor: tema.botaoPrimario }]} onPress={() => void salvarEdicao()} disabled={ocupado}>
                        <Text style={{ color: tema.textoBotao, fontWeight: '700' }}>{ocupado ? 'Salvando...' : 'Salvar alterações'}</Text>
                      </TouchableOpacity>
                    </View>
                  </>
                ) : (
                  <>
                    {[
                      { rotulo: 'Nome', valor: selecionado.nome },
                      { rotulo: 'E-mail', valor: selecionado.email },
                      { rotulo: 'Perfil', valor: selecionado.perfil },
                      ...(selecionado.perfil === 'Professor' ? [{ rotulo: 'Disciplina', valor: selecionado.disciplina || 'Não informada' }] : []),
                      { rotulo: 'Situação', valor: selecionado.situacao },
                    ].map(campo => (
                      <View key={campo.rotulo}>
                        <Text style={[styles.detalheRotulo, { color: tema.textoSecundario }]}>{campo.rotulo}</Text>
                        <Text style={[styles.detalheValor, { color: tema.textoPrincipal }]}>{campo.valor}</Text>
                      </View>
                    ))}
                    {senhaExibida && (
                      <View style={[styles.boxSenha, { backgroundColor: tema.inputBackground, borderColor: tema.borda }]}>
                        <Ionicons name="key-outline" size={18} color={tema.botaoPrimario} />
                        <View style={{ flex: 1, marginLeft: 10 }}>
                          <Text style={{ color: tema.textoSecundario, fontSize: 11 }}>Senha inicial redefinida</Text>
                          <Text style={{ color: tema.textoPrincipal, fontSize: 14, fontWeight: '700', marginTop: 2 }}>{senhaExibida}</Text>
                        </View>
                      </View>
                    )}
                    {isAdmin && (
                      <View style={styles.blocoAcoesAdmin}>
                        {selecionado.perfil === 'Administrador' ? (
                          <View style={[styles.avisoProtecao, { backgroundColor: tema.inputBackground, borderColor: tema.borda }]}>
                            <Ionicons name="shield-checkmark-outline" size={18} color={tema.botaoPrimario} />
                            <Text style={[styles.textoProtecao, { color: tema.textoSecundario }]}>Conta de Administrador protegida contra inativação, alteração ou exclusão.</Text>
                          </View>
                        ) : acoesAdmin.map(acao => (
                          <TouchableOpacity key={acao.key} style={[styles.btnAcaoLista, { backgroundColor: acao.destaqueExclusao ? '#C6282820' : tema.inputBackground, borderColor: acao.destaqueExclusao ? '#C62828' : tema.borda }]} onPress={acao.onPress} disabled={ocupado}>
                            <Ionicons name={acao.icone} size={20} color={acao.cor} />
                            <Text style={[styles.textoAcaoLista, { color: acao.key === 'excluir' ? '#C62828' : tema.textoPrincipal }]}>{acao.label}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    )}
                    <Text style={[styles.avisoDemonstrativo, { color: tema.textoSecundario }]}>
                      Alterações sincronizadas diretamente com a coleção de usuários.
                    </Text>
                  </>
                )}
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

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingTop: 50, paddingBottom: 20, paddingHorizontal: 20, borderBottomLeftRadius: 20, borderBottomRightRadius: 20, elevation: 5 },
  headerLinha: { flexDirection: 'row', alignItems: 'center' },
  botaoVoltarHeader: { padding: 6, marginRight: 10 },
  headerTexto: { flex: 1 },
  btnAddTopo: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, gap: 4 },
  titulo: { fontSize: 22, fontWeight: 'bold' },
  subtitulo: { fontSize: 12, opacity: 0.8, marginTop: 3 },
  filtros: { paddingHorizontal: 20, paddingTop: 18 },
  rowBuscaFiltro: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  buscaContainer: { flexDirection: 'row', alignItems: 'center', height: 46, borderWidth: 1, borderRadius: 10, paddingHorizontal: 12 },
  btnFiltroHeader: { width: 46, height: 46, borderRadius: 10, borderWidth: 1, justifyContent: 'center', alignItems: 'center' },
  barraFiltroAtivo: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, paddingHorizontal: 2 },
  inputBusca: { flex: 1, height: '100%', fontSize: 15 },
  rotuloFiltro: { fontSize: 12, fontWeight: '700', marginTop: 16, marginBottom: 8 },
  listaFiltros: { flexDirection: 'row', gap: 8, paddingRight: 4 },
  chipFiltro: { borderWidth: 1, borderRadius: 18, paddingHorizontal: 12, paddingVertical: 8 },
  textoChip: { fontSize: 12, fontWeight: '600' },
  listaUsuarios: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 32, flexGrow: 1 },
  cardUsuario: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 12, padding: 12, marginBottom: 10 },
  iconeUsuario: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  infoUsuario: { flex: 1 },
  nomeUsuario: { fontSize: 15, fontWeight: '700' },
  perfilUsuario: { fontSize: 12, marginTop: 3 },
  badgeSituacao: { borderRadius: 12, paddingHorizontal: 8, paddingVertical: 5 },
  textoSituacao: { fontSize: 10, fontWeight: '700' },
  conteudoPastaProf: { paddingLeft: 14, paddingTop: 8, borderLeftWidth: 2, marginLeft: 16, marginTop: 4, gap: 8 },
  cardAulaProf: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 10, padding: 12, gap: 10 },
  pillTurnoAula: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  listaVazia: { textAlign: 'center', marginTop: 30, fontSize: 14 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
  modalConteudo: { maxHeight: '88%', borderTopLeftRadius: 22, borderTopRightRadius: 22, borderWidth: 1, paddingBottom: 24 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, borderBottomWidth: 1 },
  modalTitulo: { fontSize: 18, fontWeight: 'bold' },
  detalhesUsuario: { padding: 20 },
  detalheRotulo: { fontSize: 12, marginTop: 10 },
  detalheValor: { fontSize: 15, fontWeight: '600', marginTop: 3 },
  labelCampo: { fontSize: 12, fontWeight: '700', marginBottom: 6, marginTop: 4 },
  inputModal: { borderWidth: 1, borderRadius: 10, height: 44, paddingHorizontal: 12, fontSize: 14, marginBottom: 12 },
  linhaCargos: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  chipCargo: { flex: 1, height: 40, borderWidth: 1, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  linhaAcoesDuplas: { flexDirection: 'row', gap: 10, marginTop: 8 },
  btnSecundario: { flex: 1, height: 44, borderWidth: 1, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  btnPrimarioModal: { flex: 1.4, height: 44, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  btnSalvarFull: { width: '100%', height: 46, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginTop: 8 },
  boxSenha: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 10, padding: 12, marginTop: 14 },
  blocoAcoesAdmin: { marginTop: 18, gap: 8 },
  btnAcaoLista: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, height: 44, gap: 10 },
  textoAcaoLista: { fontSize: 14, fontWeight: '600' },
  avisoProtecao: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 10, padding: 12, gap: 10 },
  textoProtecao: { flex: 1, fontSize: 12, lineHeight: 17 },
  avisoDemonstrativo: { fontSize: 12, marginTop: 16 },
  acessoRestrito: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  textoAcessoRestrito: { fontSize: 16, textAlign: 'center', marginTop: 16, marginBottom: 20 },
  botaoVoltar: { paddingHorizontal: 24, paddingVertical: 12, borderRadius: 10 },
  textoBotaoVoltar: { fontSize: 14, fontWeight: 'bold' },
});