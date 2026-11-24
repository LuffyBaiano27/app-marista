import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, KeyboardAvoidingView, Modal, Platform, RefreshControl, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { collection, deleteDoc, doc, getDocs, updateDoc } from 'firebase/firestore';
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

const FILTROS_PERFIL: FiltroPerfil[] = ['Todos', 'Administrador', 'Coordenador', 'Professor'];
const FILTROS_SITUACAO: FiltroSituacao[] = ['Todas', 'Ativo', 'Inativo'];

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

  const [usuarios, setUsuarios] = useState<UsuarioItem[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [ocupado, setOcupado] = useState(false);
  const [busca, setBusca] = useState('');
  const [perfilFiltro, setPerfilFiltro] = useState<FiltroPerfil>('Todos');
  const [situacaoFiltro, setSituacaoFiltro] = useState<FiltroSituacao>('Todas');
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
    } catch (error: any) {
      notificar('erro', 'Erro ao carregar usuários', error?.message || 'Falha ao consultar a coleção usuarios.');
    } finally {
      setCarregando(false);
    }
  }, [notificar]);

  useEffect(() => { void buscarUsuarios(); }, [buscarUsuarios]);

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

  const atualizarUsuarioLocal = (atualizado: UsuarioItem) => {
    setUsuarios(prev => prev.map(u => (u.id === atualizado.id ? atualizado : u)));
    setSelecionado(prev => (prev?.id === atualizado.id ? atualizado : prev));
  };

  const usuariosFiltrados = useMemo(() => {
    const termo = busca.trim().toLocaleLowerCase('pt-BR');
    return usuarios.filter(u =>
      u.nome.toLocaleLowerCase('pt-BR').includes(termo) &&
      (perfil === 'coordenador' ? u.perfil === 'Professor' : perfilFiltro === 'Todos' || u.perfil === perfilFiltro) &&
      (situacaoFiltro === 'Todas' || u.situacao === situacaoFiltro)
    );
  }, [busca, perfil, perfilFiltro, situacaoFiltro, usuarios]);

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
    if (!formEdicao.nome.trim() || !formEdicao.email.trim()) {
      return notificar('aviso', 'Campos obrigatórios', 'Preencha nome e e-mail do usuário.');
    }
    if (formEdicao.perfil === 'Professor' && !formEdicao.disciplina.trim()) {
      return notificar('aviso', 'Campos obrigatórios', 'Informe a disciplina ministrada pelo professor.');
    }
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
            <Text style={[styles.titulo, { color: tema.textoLogo }]}>{perfil === 'coordenador' ? 'Professores' : 'Gestão de Usuários'}</Text>
            <Text style={[styles.subtitulo, { color: tema.textoLogo }]}>Base sincronizada com o Firebase</Text>
          </View>
        </View>
      </View>

      <View style={styles.filtros}>
        <View style={[styles.buscaContainer, { backgroundColor: tema.inputBackground, borderColor: tema.borda }]}>
          <Ionicons name="search" size={20} color={tema.textoSecundario} style={{ marginRight: 8 }} />
          <TextInput style={[styles.inputBusca, { color: tema.textoPrincipal }]} placeholder="Pesquisar por nome" placeholderTextColor={tema.textoSecundario} value={busca} onChangeText={setBusca} accessibilityLabel="Pesquisar usuários por nome" />
        </View>

        {perfil === 'admin' && (
          <>
            <Text style={[styles.rotuloFiltro, { color: tema.textoSecundario }]}>Perfil</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.listaFiltros}>
              {FILTROS_PERFIL.map(filtro => (
                <TouchableOpacity key={filtro} style={[styles.chipFiltro, { backgroundColor: perfilFiltro === filtro ? tema.botaoPrimario : tema.inputBackground, borderColor: tema.borda }]} onPress={() => setPerfilFiltro(filtro)} accessibilityRole="button" accessibilityState={{ selected: perfilFiltro === filtro }}>
                  <Text style={[styles.textoChip, { color: perfilFiltro === filtro ? tema.textoBotao : tema.textoPrincipal }]}>{filtro}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </>
        )}

        <Text style={[styles.rotuloFiltro, { color: tema.textoSecundario }]}>Situação</Text>
        <View style={styles.listaFiltros}>
          {FILTROS_SITUACAO.map(filtro => (
            <TouchableOpacity key={filtro} style={[styles.chipFiltro, { backgroundColor: situacaoFiltro === filtro ? tema.botaoPrimario : tema.inputBackground, borderColor: tema.borda }]} onPress={() => setSituacaoFiltro(filtro)} accessibilityRole="button" accessibilityState={{ selected: situacaoFiltro === filtro }}>
              <Text style={[styles.textoChip, { color: situacaoFiltro === filtro ? tema.textoBotao : tema.textoPrincipal }]}>{filtro}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <FlatList
        data={usuariosFiltrados}
        keyExtractor={item => item.id}
        renderItem={renderUsuario}
        contentContainerStyle={styles.listaUsuarios}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={carregando} onRefresh={() => void buscarUsuarios()} tintColor={tema.botaoPrimario} />}
        ListEmptyComponent={
          carregando
            ? <ActivityIndicator size="large" color={tema.botaoPrimario} style={{ marginTop: 30 }} />
            : <Text style={[styles.listaVazia, { color: tema.textoSecundario }]}>Nenhum usuário encontrado.</Text>
        }
      />

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
                          <TouchableOpacity
                            key={acao.key}
                            style={[styles.btnAcaoLista, { backgroundColor: acao.destaqueExclusao ? '#C6282820' : tema.inputBackground, borderColor: acao.destaqueExclusao ? '#C62828' : tema.borda }]}
                            onPress={acao.onPress}
                            disabled={ocupado}
                          >
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
  titulo: { fontSize: 22, fontWeight: 'bold' },
  subtitulo: { fontSize: 12, opacity: 0.8, marginTop: 3 },
  filtros: { paddingHorizontal: 20, paddingTop: 18 },
  buscaContainer: { flexDirection: 'row', alignItems: 'center', height: 46, borderWidth: 1, borderRadius: 10, paddingHorizontal: 12 },
  inputBusca: { flex: 1, height: '100%', fontSize: 15 },
  rotuloFiltro: { fontSize: 12, fontWeight: '700', marginTop: 16, marginBottom: 8 },
  listaFiltros: { flexDirection: 'row', gap: 8, paddingRight: 4 },
  chipFiltro: { borderWidth: 1, borderRadius: 18, paddingHorizontal: 12, paddingVertical: 8 },
  textoChip: { fontSize: 12, fontWeight: '600' },
  listaUsuarios: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 32, flexGrow: 1 },
  cardUsuario: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 12, padding: 12, marginBottom: 10 },
  iconeUsuario: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  infoUsuario: { flex: 1 },
  nomeUsuario: { fontSize: 15, fontWeight: '700' },
  perfilUsuario: { fontSize: 12, marginTop: 3 },
  badgeSituacao: { borderRadius: 12, paddingHorizontal: 8, paddingVertical: 5 },
  textoSituacao: { fontSize: 10, fontWeight: '700' },
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
  linhaCargos: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  chipCargo: { flex: 1, height: 40, borderWidth: 1, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  linhaAcoesDuplas: { flexDirection: 'row', gap: 10, marginTop: 8 },
  btnSecundario: { flex: 1, height: 44, borderWidth: 1, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  btnPrimarioModal: { flex: 1.4, height: 44, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
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