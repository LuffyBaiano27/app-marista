import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, KeyboardAvoidingView, Platform, RefreshControl, ActivityIndicator, Modal, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { collection, getDocs, addDoc, updateDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useDemoProfile } from '../../contexts/demoProfileContext';
import { FeedbackToast, type EstadoFeedback, type TipoFeedback } from '../../components/FeedbackToast';

type StatusChamado = 'pendente' | 'em_andamento' | 'resolvido';
type FiltroStatus = 'Todos' | 'Pendentes' | 'Em Andamento' | 'Resolvidos';

interface ChamadoItem {
  id: string;
  titulo: string;
  descricao: string;
  solicitante: string;
  categoria?: string;
  status: StatusChamado;
  dataFormatada: string;
  resolucao?: string;
  encerradoPor?: string;
  encerradoEmFormatado?: string;
}

const FILTROS_STATUS: FiltroStatus[] = ['Todos', 'Pendentes', 'Em Andamento', 'Resolvidos'];
const CATEGORIAS = ['Acesso / Senha', 'Sistema / Bug', 'Turmas / Diário', 'Infraestrutura'] as const;
const NOMES_PERFIS = { admin: 'Marina Andrade (Admin)', coordenador: 'Camila Rocha (Coordenadora)', professor: 'Luffy Baiano (Professor)' };
const ORDEM_STATUS: Record<StatusChamado, number> = { pendente: 0, em_andamento: 1, resolvido: 2 };
const CONFIG_STATUS: Record<StatusChamado, { label: string; cor: string; bg: string; icone: keyof typeof Ionicons.glyphMap }> = {
  pendente: { label: 'PENDENTE', cor: '#EF6C00', bg: '#FFF3E0', icone: 'alert-circle' },
  em_andamento: { label: 'EM ANDAMENTO', cor: '#1565C0', bg: '#E3F2FD', icone: 'time' },
  resolvido: { label: 'RESOLVIDO', cor: '#2E7D32', bg: '#E8F5E9', icone: 'checkmark-circle' },
};

const normalizarStatus = (raw: unknown): StatusChamado => {
  const s = String(raw || '').toLowerCase();
  if (['resolvido', 'encerrado', 'concluido'].includes(s)) return 'resolvido';
  return s === 'em_andamento' || s === 'andamento' ? 'em_andamento' : 'pendente';
};

const formatarDataHora = (valor: any, dataFallback?: string, horaFallback?: string) => {
  if (valor?.toDate) {
    const d = valor.toDate() as Date;
    return `${d.toLocaleDateString('pt-BR')} às ${d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
  }
  return dataFallback && horaFallback ? `${dataFallback} às ${horaFallback}` : dataFallback || 'Recente';
};

export default function ChamadosScreen() {
  const router = useRouter();
  const { perfil, temaAtivo: tema } = useDemoProfile();
  const isAdmin = perfil === 'admin';

  const [chamados, setChamados] = useState<ChamadoItem[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [busca, setBusca] = useState('');
  const [filtroStatus, setFiltroStatus] = useState<FiltroStatus>('Todos');
  const [selecionado, setSelecionado] = useState<ChamadoItem | null>(null);
  const [notaResolucao, setNotaResolucao] = useState('');
  const [modalNovo, setModalNovo] = useState(false);
  const [formNovo, setFormNovo] = useState({ titulo: '', descricao: '', categoria: CATEGORIAS[0] as (typeof CATEGORIAS)[number] });
  const [feedback, setFeedback] = useState<EstadoFeedback>({ visivel: false, tipo: 'sucesso', titulo: '', mensagem: '' });

  const notificar = useCallback((tipo: TipoFeedback, titulo: string, mensagem: string) => {
    setFeedback({ visivel: true, tipo, titulo, mensagem });
  }, []);
  const fecharFeedback = useCallback(() => setFeedback(prev => ({ ...prev, visivel: false })), []);
  const voltar = () => (router.canGoBack() ? router.back() : router.replace('/(tabs)'));

  const buscarChamados = useCallback(async () => {
    setCarregando(true);
    try {
      const snap = await getDocs(collection(db, 'chamados_suporte'));
      const lista: ChamadoItem[] = snap.docs.map(d => {
        const data = d.data() as any;
        return {
          id: d.id,
          titulo: String(data.titulo || data.categoria || 'Ticket de Suporte'),
          descricao: String(data.descricao || 'Sem descrição informada.'),
          solicitante: String(data.solicitante || 'Usuário não identificado'),
          categoria: typeof data.categoria === 'string' ? data.categoria : undefined,
          status: normalizarStatus(data.status),
          dataFormatada: formatarDataHora(data.criadoEm, data.data, data.hora),
          resolucao: typeof data.resolucao === 'string' ? data.resolucao : undefined,
          encerradoPor: typeof data.encerradoPor === 'string' ? data.encerradoPor : undefined,
          encerradoEmFormatado: data.encerradoEm ? formatarDataHora(data.encerradoEm) : undefined,
        };
      });
      lista.sort((a, b) => ORDEM_STATUS[a.status] - ORDEM_STATUS[b.status]);
      setChamados(lista);
    } catch (error: any) {
      notificar('erro', 'Erro ao carregar chamados', error?.message || 'Falha ao consultar a coleção chamados_suporte.');
    } finally {
      setCarregando(false);
    }
  }, [notificar]);

  useEffect(() => { void buscarChamados(); }, [buscarChamados]);

  const abrirDetalhes = (item: ChamadoItem) => {
    setSelecionado(item);
    setNotaResolucao(item.resolucao || '');
  };

  const criarChamado = async () => {
    if (!formNovo.titulo.trim() || !formNovo.descricao.trim()) {
      return notificar('aviso', 'Campos obrigatórios', 'Preencha o título e a descrição do problema.');
    }
    setSalvando(true);
    try {
      const agora = new Date();
      await addDoc(collection(db, 'chamados_suporte'), {
        titulo: formNovo.titulo.trim(),
        descricao: formNovo.descricao.trim(),
        categoria: formNovo.categoria,
        solicitante: NOMES_PERFIS[perfil],
        status: 'pendente',
        data: agora.toLocaleDateString('pt-BR'),
        hora: agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        criadoEm: serverTimestamp(),
      });
      setModalNovo(false);
      setFormNovo({ titulo: '', descricao: '', categoria: CATEGORIAS[0] });
      void buscarChamados();
      notificar('sucesso', 'Chamado aberto', 'Seu ticket foi registrado na fila da TI.');
    } catch (error: any) {
      notificar('erro', 'Erro ao abrir chamado', error?.message || 'Não foi possível gravar o ticket no Firestore.');
    } finally {
      setSalvando(false);
    }
  };

  const atualizarStatusChamado = async (novoStatus: StatusChamado) => {
    if (!selecionado) return;
    if (novoStatus === 'resolvido' && !notaResolucao.trim()) {
      return notificar('aviso', 'Resolução obrigatória', 'Descreva brevemente o que foi feito para resolver o chamado.');
    }
    setSalvando(true);
    try {
      const payload: Record<string, any> = { status: novoStatus, atualizadoEm: serverTimestamp() };
      if (novoStatus === 'resolvido') {
        payload.resolucao = notaResolucao.trim();
        payload.encerradoPor = NOMES_PERFIS[perfil];
        payload.encerradoEm = serverTimestamp();
      } else if (novoStatus === 'pendente') {
        payload.resolucao = '';
        payload.encerradoPor = '';
      }
      await updateDoc(doc(db, 'chamados_suporte', selecionado.id), payload);
      setSelecionado(null);
      void buscarChamados();
      notificar(
        'sucesso',
        novoStatus === 'resolvido' ? 'Chamado resolvido!' : novoStatus === 'em_andamento' ? 'Atendimento iniciado' : 'Chamado reaberto',
        novoStatus === 'resolvido' ? 'Ticket encerrado e registrado no histórico de auditoria.' : 'Status atualizado com sucesso.'
      );
    } catch (error: any) {
      notificar('erro', 'Erro ao atualizar', error?.message || 'Não foi possível atualizar o chamado no Firestore.');
    } finally {
      setSalvando(false);
    }
  };

  const chamadosFiltrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return chamados.filter(c => {
      if (filtroStatus === 'Pendentes' && c.status !== 'pendente') return false;
      if (filtroStatus === 'Em Andamento' && c.status !== 'em_andamento') return false;
      if (filtroStatus === 'Resolvidos' && c.status !== 'resolvido') return false;
      return !termo || c.titulo.toLowerCase().includes(termo) || c.descricao.toLowerCase().includes(termo) || c.solicitante.toLowerCase().includes(termo);
    });
  }, [busca, chamados, filtroStatus]);

  const resumo = useMemo(() => ([
    { icone: 'alert-circle-outline' as const, valor: chamados.filter(c => c.status === 'pendente').length, label: 'Pendentes', cor: '#EF6C00' },
    { icone: 'time-outline' as const, valor: chamados.filter(c => c.status === 'em_andamento').length, label: 'Andamento', cor: '#1565C0' },
    { icone: 'checkmark-done-outline' as const, valor: chamados.filter(c => c.status === 'resolvido').length, label: 'Resolvidos', cor: '#2E7D32' },
  ]), [chamados]);

  const toastProps = {
    feedback,
    onFechar: fecharFeedback,
    fundoCard: tema.fundoTopo,
    textoPrincipal: tema.textoPrincipal,
    textoSecundario: tema.textoSecundario,
  };

  const renderChamado = ({ item }: { item: ChamadoItem }) => {
    const cfg = CONFIG_STATUS[item.status];
    return (
      <TouchableOpacity style={[styles.cardChamado, { backgroundColor: tema.inputBackground, borderColor: tema.borda }]} activeOpacity={0.75} onPress={() => abrirDetalhes(item)}>
        <View style={styles.linhaTopoCard}>
          <View style={styles.rowFlex}>
            <Ionicons name={cfg.icone} size={18} color={cfg.cor} style={{ marginRight: 8 }} />
            <Text style={[styles.tituloCard, { color: tema.textoPrincipal }]} numberOfLines={1}>{item.titulo}</Text>
          </View>
          <View style={[styles.badgeStatus, { backgroundColor: cfg.bg }]}><Text style={[styles.textoBadge, { color: cfg.cor }]}>{cfg.label}</Text></View>
        </View>
        <Text style={[styles.descricaoPreview, { color: tema.textoSecundario }]} numberOfLines={2}>{item.descricao}</Text>
        <View style={[styles.rodapeCard, { borderTopColor: tema.borda }]}>
          <View style={styles.rowFlex}>
            <Ionicons name="person-circle-outline" size={15} color={tema.textoSecundario} style={{ marginRight: 5 }} />
            <Text style={[styles.metaCard, { color: tema.textoSecundario }]} numberOfLines={1}>{item.solicitante}</Text>
          </View>
          <Text style={[styles.metaData, { color: tema.textoSecundario }]}>{item.dataFormatada}</Text>
          <Ionicons name="chevron-forward" size={16} color={tema.textoSecundario} style={{ marginLeft: 6 }} />
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <KeyboardAvoidingView style={[styles.container, { backgroundColor: tema.fundoBase }]} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={[styles.header, { backgroundColor: tema.fundoTopo }]}>
        <View style={styles.topoLinha}>
          <View style={styles.rowHeaderEsq}>
            <TouchableOpacity onPress={voltar} accessibilityLabel="Voltar"><Ionicons name="arrow-back" size={24} color={tema.textoLogo} /></TouchableOpacity>
            <View>
              <Text style={[styles.tituloHeader, { color: tema.textoLogo }]}>Chamados de TI</Text>
              <Text style={[styles.subtituloHeader, { color: tema.textoLogo }]}>Central de suporte e tratativa técnica</Text>
            </View>
          </View>
          <TouchableOpacity style={[styles.btnAddTopo, { backgroundColor: tema.botaoPrimario }]} onPress={() => setModalNovo(true)}>
            <Ionicons name="add" size={18} color="#FFF" />
            <Text style={{ color: '#FFF', fontSize: 12, fontWeight: '700' }}>Novo</Text>
          </TouchableOpacity>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filtrosRow}>
          {FILTROS_STATUS.map(f => {
            const ativo = filtroStatus === f;
            return (
              <TouchableOpacity key={f} onPress={() => setFiltroStatus(f)} style={[styles.chipFiltro, { backgroundColor: ativo ? tema.botaoPrimario : tema.inputBackground, borderColor: tema.borda }]}>
                <Text style={{ color: ativo ? '#FFF' : tema.textoPrincipal, fontSize: 12, fontWeight: '600' }}>{f}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <View style={[styles.searchContainer, { backgroundColor: tema.inputBackground, borderColor: tema.borda }]}>
          <Ionicons name="search" size={20} color={tema.textoSecundario} style={{ marginRight: 8 }} />
          <TextInput style={[styles.searchInput, { color: tema.textoPrincipal }]} placeholder="Buscar por solicitante, título ou problema..." placeholderTextColor={tema.textoSecundario} value={busca} onChangeText={setBusca} />
        </View>
      </View>

      {carregando ? (
        <View style={styles.centro}>
          <ActivityIndicator size="large" color={tema.botaoPrimario} />
          <Text style={{ marginTop: 10, color: tema.textoSecundario }}>Carregando chamados...</Text>
        </View>
      ) : (
        <FlatList
          data={chamadosFiltrados}
          keyExtractor={item => item.id}
          renderItem={renderChamado}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={carregando} onRefresh={() => void buscarChamados()} tintColor={tema.botaoPrimario} />}
          ListHeaderComponent={
            <View style={styles.resumoRow}>
              {resumo.map(card => (
                <View key={card.label} style={[styles.cardResumo, { backgroundColor: tema.inputBackground, borderColor: tema.borda }]}>
                  <Ionicons name={card.icone} size={20} color={card.cor} />
                  <Text style={[styles.valorResumo, { color: tema.textoPrincipal }]}>{card.valor}</Text>
                  <Text style={[styles.labelResumo, { color: tema.textoSecundario }]}>{card.label}</Text>
                </View>
              ))}
            </View>
          }
          ListEmptyComponent={
            <View style={styles.vazioBox}>
              <Ionicons name="construct-outline" size={44} color={tema.borda} />
              <Text style={{ color: tema.textoSecundario, marginTop: 12, fontSize: 15 }}>Nenhum chamado encontrado.</Text>
            </View>
          }
        />
      )}

      <Modal visible={selecionado !== null} transparent animationType="slide" onRequestClose={() => setSelecionado(null)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalConteudo, { backgroundColor: tema.fundoBase, borderColor: tema.borda }]}>
            <View style={[styles.modalHeader, { borderBottomColor: tema.borda }]}>
              <Text style={[styles.modalTitulo, { color: tema.textoPrincipal }]}>Detalhes do Chamado</Text>
              <TouchableOpacity onPress={() => setSelecionado(null)}><Ionicons name="close" size={24} color={tema.textoSecundario} /></TouchableOpacity>
            </View>
            {selecionado && (
              <ScrollView contentContainerStyle={{ padding: 20 }} keyboardShouldPersistTaps="handled">
                <View style={styles.linhaStatusModal}>
                  <View style={[styles.badgeStatus, { backgroundColor: CONFIG_STATUS[selecionado.status].bg }]}>
                    <Text style={[styles.textoBadge, { color: CONFIG_STATUS[selecionado.status].cor }]}>{CONFIG_STATUS[selecionado.status].label}</Text>
                  </View>
                  <Text style={{ color: tema.textoSecundario, fontSize: 12 }}>Aberto em {selecionado.dataFormatada}</Text>
                </View>
                <Text style={[styles.tituloDetalhe, { color: tema.textoPrincipal }]}>{selecionado.titulo}</Text>
                <View style={[styles.boxInfo, { backgroundColor: tema.inputBackground, borderColor: tema.borda }]}>
                  <Text style={[styles.labelBox, { color: tema.textoSecundario }]}>Solicitante</Text>
                  <Text style={[styles.valorBox, { color: tema.textoPrincipal }]}>{selecionado.solicitante}</Text>
                </View>
                <View style={[styles.boxInfo, { backgroundColor: tema.inputBackground, borderColor: tema.borda }]}>
                  <Text style={[styles.labelBox, { color: tema.textoSecundario }]}>Descrição do Problema</Text>
                  <Text style={[styles.valorBox, { color: tema.textoPrincipal, lineHeight: 20 }]}>{selecionado.descricao}</Text>
                </View>
                {selecionado.status === 'resolvido' ? (
                  <>
                    <View style={[styles.boxAuditoria, { backgroundColor: '#2E7D3215', borderColor: '#2E7D3250' }]}>
                      <View style={styles.auditoriaTopo}>
                        <Ionicons name="shield-checkmark" size={18} color="#2E7D32" style={{ marginRight: 6 }} />
                        <Text style={{ color: '#2E7D32', fontWeight: '700', fontSize: 13 }}>Auditoria de Resolução</Text>
                      </View>
                      <Text style={{ color: tema.textoPrincipal, fontSize: 14, lineHeight: 20, marginBottom: 8 }}>{selecionado.resolucao || 'Resolvido sem observações adicionais.'}</Text>
                      <Text style={{ color: tema.textoSecundario, fontSize: 12 }}>Resolvido por: <Text style={{ color: tema.textoPrincipal, fontWeight: '600' }}>{selecionado.encerradoPor || 'Administrador'}</Text></Text>
                      {selecionado.encerradoEmFormatado && <Text style={{ color: tema.textoSecundario, fontSize: 12, marginTop: 2 }}>Encerrado em: {selecionado.encerradoEmFormatado}</Text>}
                    </View>
                    {isAdmin && (
                      <TouchableOpacity style={[styles.btnSecundario, { backgroundColor: tema.inputBackground, borderColor: tema.borda }]} onPress={() => void atualizarStatusChamado('pendente')} disabled={salvando}>
                        <Ionicons name="refresh-outline" size={18} color={tema.textoPrincipal} />
                        <Text style={{ color: tema.textoPrincipal, fontWeight: '600', fontSize: 14 }}>Reabrir chamado</Text>
                      </TouchableOpacity>
                    )}
                  </>
                ) : isAdmin ? (
                  <>
                    <Text style={[styles.labelCampo, { color: tema.textoSecundario }]}>Nota de Resolução Técnica</Text>
                    <TextInput value={notaResolucao} onChangeText={setNotaResolucao} placeholder="Descreva o procedimento feito para resolver o problema..." placeholderTextColor={tema.textoSecundario} multiline numberOfLines={4} textAlignVertical="top" style={[styles.textArea, { backgroundColor: tema.inputBackground, color: tema.textoPrincipal, borderColor: tema.borda }]} />
                    <View style={styles.linhaBotoesAcao}>
                      {selecionado.status === 'pendente' && (
                        <TouchableOpacity style={[styles.btnAndamento, { backgroundColor: '#1565C020', borderColor: '#1565C0' }]} onPress={() => void atualizarStatusChamado('em_andamento')} disabled={salvando}>
                          <Ionicons name="play-outline" size={18} color="#1565C0" />
                          <Text style={{ color: '#1565C0', fontWeight: '700', fontSize: 13 }}>Iniciar</Text>
                        </TouchableOpacity>
                      )}
                      <TouchableOpacity style={[styles.btnResolver, { backgroundColor: '#2E7D32' }]} onPress={() => void atualizarStatusChamado('resolvido')} disabled={salvando}>
                        <Ionicons name="checkmark-done" size={18} color="#FFF" />
                        <Text style={{ color: '#FFF', fontWeight: '700', fontSize: 14 }}>{salvando ? 'Salvando...' : 'Resolver Chamado'}</Text>
                      </TouchableOpacity>
                    </View>
                  </>
                ) : null}
              </ScrollView>
            )}
          </View>
          <FeedbackToast {...toastProps} />
        </View>
      </Modal>

      <Modal visible={modalNovo} transparent animationType="slide" onRequestClose={() => setModalNovo(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalConteudo, { backgroundColor: tema.fundoBase, borderColor: tema.borda }]}>
            <View style={[styles.modalHeader, { borderBottomColor: tema.borda }]}>
              <Text style={[styles.modalTitulo, { color: tema.textoPrincipal }]}>Abrir Novo Chamado</Text>
              <TouchableOpacity onPress={() => setModalNovo(false)}><Ionicons name="close" size={24} color={tema.textoSecundario} /></TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={{ padding: 20 }} keyboardShouldPersistTaps="handled">
              <Text style={[styles.labelCampo, { color: tema.textoSecundario }]}>Categoria</Text>
              <View style={styles.gridCategorias}>
                {CATEGORIAS.map(cat => {
                  const sel = formNovo.categoria === cat;
                  return (
                    <TouchableOpacity key={cat} onPress={() => setFormNovo(prev => ({ ...prev, categoria: cat }))} style={[styles.chipCat, { backgroundColor: sel ? tema.botaoPrimario + '20' : tema.inputBackground, borderColor: sel ? tema.botaoPrimario : tema.borda }]}>
                      <Text style={{ color: sel ? tema.botaoPrimario : tema.textoPrincipal, fontSize: 12, fontWeight: '600' }}>{cat}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              <Text style={[styles.labelCampo, { color: tema.textoSecundario }]}>Título / Assunto</Text>
              <TextInput value={formNovo.titulo} onChangeText={v => setFormNovo(prev => ({ ...prev, titulo: v }))} placeholder="Ex: Erro ao lançar chamada no 6º Ano A" placeholderTextColor={tema.textoSecundario} style={[styles.inputModal, { backgroundColor: tema.inputBackground, color: tema.textoPrincipal, borderColor: tema.borda }]} />
              <Text style={[styles.labelCampo, { color: tema.textoSecundario }]}>Descrição do Problema</Text>
              <TextInput value={formNovo.descricao} onChangeText={v => setFormNovo(prev => ({ ...prev, descricao: v }))} placeholder="Explique o que aconteceu..." placeholderTextColor={tema.textoSecundario} multiline numberOfLines={4} textAlignVertical="top" style={[styles.textArea, { backgroundColor: tema.inputBackground, color: tema.textoPrincipal, borderColor: tema.borda }]} />
              <TouchableOpacity style={[styles.btnResolver, { backgroundColor: tema.botaoPrimario }]} onPress={() => void criarChamado()} disabled={salvando}>
                <Text style={{ color: '#FFF', fontWeight: '700', fontSize: 14 }}>{salvando ? 'Enviando...' : 'Enviar Chamado'}</Text>
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

const styles = StyleSheet.create({
  container: { flex: 1 }, centro: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  rowFlex: { flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 8 },
  rowHeaderEsq: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  vazioBox: { alignItems: 'center', marginTop: 40 },
  auditoriaTopo: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  header: { paddingTop: 50, paddingBottom: 20, paddingHorizontal: 20, elevation: 5, borderBottomLeftRadius: 20, borderBottomRightRadius: 20 },
  topoLinha: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  tituloHeader: { fontSize: 22, fontWeight: 'bold' }, subtituloHeader: { fontSize: 12, opacity: 0.8, marginTop: 2 },
  btnAddTopo: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10, gap: 4 },
  filtrosRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  chipFiltro: { borderWidth: 1, borderRadius: 16, paddingHorizontal: 12, paddingVertical: 6 },
  searchContainer: { flexDirection: 'row', alignItems: 'center', height: 45, borderRadius: 10, borderWidth: 1, paddingHorizontal: 10 },
  searchInput: { flex: 1, height: '100%', fontSize: 14 },
  listContent: { padding: 20, paddingBottom: 40 },
  resumoRow: { flexDirection: 'row', gap: 10, marginBottom: 18 },
  cardResumo: { flex: 1, borderWidth: 1, borderRadius: 12, padding: 12, alignItems: 'center' },
  valorResumo: { fontSize: 20, fontWeight: 'bold', marginTop: 4 }, labelResumo: { fontSize: 11, marginTop: 2 },
  cardChamado: { borderWidth: 1, borderRadius: 12, padding: 14, marginBottom: 12 },
  linhaTopoCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  tituloCard: { fontSize: 15, fontWeight: 'bold', flex: 1 },
  badgeStatus: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 }, textoBadge: { fontSize: 10, fontWeight: 'bold' },
  descricaoPreview: { fontSize: 13, lineHeight: 18, marginBottom: 12 },
  rodapeCard: { flexDirection: 'row', alignItems: 'center', paddingTop: 10, borderTopWidth: 1 },
  metaCard: { fontSize: 12, fontWeight: '500' }, metaData: { fontSize: 11, fontStyle: 'italic' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalConteudo: { maxHeight: '88%', borderTopLeftRadius: 22, borderTopRightRadius: 22, borderWidth: 1, paddingBottom: 24 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1 },
  modalTitulo: { fontSize: 18, fontWeight: 'bold' },
  linhaStatusModal: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  tituloDetalhe: { fontSize: 18, fontWeight: 'bold', marginBottom: 14 },
  boxInfo: { borderWidth: 1, borderRadius: 12, padding: 14, marginBottom: 12 },
  labelBox: { fontSize: 11, fontWeight: '700', marginBottom: 4, textTransform: 'uppercase' }, valorBox: { fontSize: 14 },
  boxAuditoria: { borderWidth: 1, borderRadius: 12, padding: 14, marginBottom: 16 },
  labelCampo: { fontSize: 12, fontWeight: '700', marginBottom: 6, marginTop: 4 },
  inputModal: { borderWidth: 1, borderRadius: 10, height: 44, paddingHorizontal: 12, fontSize: 14, marginBottom: 14 },
  textArea: { borderWidth: 1, borderRadius: 10, minHeight: 96, padding: 12, fontSize: 14, marginBottom: 16 },
  linhaBotoesAcao: { flexDirection: 'row', gap: 10 },
  btnAndamento: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderRadius: 10, height: 46, paddingHorizontal: 16, gap: 6 },
  btnResolver: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderRadius: 10, height: 46, gap: 8 },
  btnSecundario: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderRadius: 10, height: 44, gap: 8 },
  gridCategorias: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
  chipCat: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8 },
});