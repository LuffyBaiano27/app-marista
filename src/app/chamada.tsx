import React, { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, KeyboardAvoidingView, Modal, Platform, RefreshControl, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { addDoc, collection, doc, getDoc, getDocs, query, serverTimestamp, where } from 'firebase/firestore';
import { useDemoProfile } from '../contexts/demoProfileContext';
import { db } from '../config/firebase';
import { FeedbackToast, type EstadoFeedback, type TipoFeedback } from '../components/FeedbackToast';

// === TIPOS E HELPERS ===
type StatusPresenca = 'presente' | 'falta' | 'justificada';

interface AlunoChamada {
  id: string;
  nome: string;
  matricula?: string;
  status: StatusPresenca;
  obs: string;
  mostrarObs: boolean;
}

const obterIniciais = (nome: string) => {
  const partes = nome.trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return 'AL';
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
  return `${partes[0][0]}${partes[partes.length - 1][0]}`.toUpperCase();
};

const getDataDeHoje = () => new Date().toISOString().split('T')[0];

export default function ChamadaScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const aulaId = String(id || '');
  const { perfil, temaAtivo: tema } = useDemoProfile();
  const isAdmin = perfil === 'admin';

  // === ESTADOS ===
  const [aulaInfo, setAulaInfo] = useState<any>(null);
  const [alunos, setAlunos] = useState<AlunoChamada[]>([]);
  const [conteudoMinistrado, setConteudoMinistrado] = useState('');
  const [busca, setBusca] = useState('');
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [chamadaConcluida, setChamadaConcluida] = useState(false);
  const [horaAssinatura, setHoraAssinatura] = useState('');
  const [modalAssinatura, setModalAssinatura] = useState(false);
  const [senhaConfirmacao, setSenhaConfirmacao] = useState('');
  const [feedback, setFeedback] = useState<EstadoFeedback>({ visivel: false, tipo: 'sucesso', titulo: '', mensagem: '' });

  const notificar = useCallback((tipo: TipoFeedback, titulo: string, mensagem: string) => {
    setFeedback({ visivel: true, tipo, titulo, mensagem });
  }, []);
  const fecharFeedback = useCallback(() => setFeedback(prev => ({ ...prev, visivel: false })), []);

  // === CARREGAMENTO DO DIÁRIO (FIRESTORE) ===
  const buscarDadosChamada = useCallback(async () => {
    if (!aulaId) return setCarregando(false);
    setCarregando(true);
    try {
      let dadosAula: any = null;
      const gradeSnap = await getDoc(doc(db, 'grade_aulas', aulaId));
      if (gradeSnap.exists()) {
        dadosAula = { id: gradeSnap.id, ...gradeSnap.data() };
      } else {
        const turmaSnap = await getDoc(doc(db, 'turmas', aulaId));
        if (turmaSnap.exists()) dadosAula = { id: turmaSnap.id, ...turmaSnap.data() };
      }
      setAulaInfo(dadosAula);

      const chamadasSnap = await getDocs(
        query(collection(db, 'chamadas'), where('turmaId', '==', aulaId), where('dataChamadaFormatada', '==', getDataDeHoje()))
      );

      if (!chamadasSnap.empty) {
        const chamadaSalva = chamadasSnap.docs[0].data() as any;
        setChamadaConcluida(true);
        setConteudoMinistrado(String(chamadaSalva.conteudoMinistrado || ''));
        if (chamadaSalva.dataChamada) {
          setHoraAssinatura(new Date(chamadaSalva.dataChamada).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }));
        }
        if (Array.isArray(chamadaSalva.alunos)) {
          setAlunos(
            chamadaSalva.alunos.map((a: any) => {
              let st: StatusPresenca = 'presente';
              if (a.status === 'falta' || a.status === 'justificada' || a.status === 'presente') st = a.status;
              else if (Array.isArray(a.presencas) && a.presencas.some((p: boolean) => !p)) st = 'falta';
              return { id: String(a.id), nome: String(a.nome || 'Aluno'), matricula: a.matricula || '', status: st, obs: String(a.obs || ''), mostrarObs: false };
            })
          );
        }
      } else {
        setChamadaConcluida(false);
        setHoraAssinatura('');
        const alunosSnap = await getDocs(collection(db, 'alunos'));
        const turmaRealId = dadosAula?.turmaId || aulaId;
        const nomeTurma = String(dadosAula?.nome || dadosAula?.turmaNome || '');
        const listaAlunos: AlunoChamada[] = alunosSnap.docs
          .map(d => ({ id: d.id, ...(d.data() as any) }))
          .filter(a => a.turmaId === turmaRealId || (nomeTurma && (a.turmaNome === nomeTurma || a.turma === nomeTurma)))
          .map(a => ({ id: a.id, nome: String(a.nome || 'Aluno sem nome'), matricula: typeof a.matricula === 'string' ? a.matricula : '', status: 'presente' as StatusPresenca, obs: '', mostrarObs: false }))
          .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
        setAlunos(listaAlunos);
      }
    } catch (error: any) {
      notificar('erro', 'Erro ao carregar diário', error?.message || 'Falha ao consultar o Firestore.');
    } finally {
      setCarregando(false);
    }
  }, [aulaId, notificar]);

  useFocusEffect(useCallback(() => { void buscarDadosChamada(); }, [buscarDadosChamada]));

  // === AÇÕES DE FREQUÊNCIA E ASSINATURA ===
  const alterarStatus = (alunoId: string, novoStatus: StatusPresenca) => {
    if (chamadaConcluida && !isAdmin) return;
    setAlunos(prev => prev.map(a => (a.id === alunoId ? { ...a, status: novoStatus } : a)));
  };
  const toggleMostrarObs = (alunoId: string) => setAlunos(prev => prev.map(a => (a.id === alunoId ? { ...a, mostrarObs: !a.mostrarObs } : a)));
  const setObservacao = (alunoId: string, texto: string) => {
    if (chamadaConcluida && !isAdmin) return;
    setAlunos(prev => prev.map(a => (a.id === alunoId ? { ...a, obs: texto } : a)));
  };

  const resumo = useMemo(() => ({
    presentes: alunos.filter(a => a.status === 'presente').length,
    faltas: alunos.filter(a => a.status === 'falta').length,
    justificadas: alunos.filter(a => a.status === 'justificada').length,
  }), [alunos]);

  const alunosFiltrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return termo ? alunos.filter(a => a.nome.toLowerCase().includes(termo)) : alunos;
  }, [alunos, busca]);

  const confirmarAssinatura = async () => {
    if (senhaConfirmacao.trim().length < 4) {
      return notificar('aviso', 'Senha obrigatória', 'Digite sua senha (mínimo 4 caracteres) para assinar o diário.');
    }
    setSalvando(true);
    try {
      const agora = new Date();
      await addDoc(collection(db, 'chamadas'), {
        turmaId: aulaId,
        turmaRealId: aulaInfo?.turmaId || aulaId,
        turmaNome: aulaInfo?.nome || aulaInfo?.turmaNome || 'Turma',
        disciplina: aulaInfo?.disciplina || aulaInfo?.materia || 'Disciplina',
        professorNome: aulaInfo?.professorNome || 'Luffy Baiano',
        horario: aulaInfo?.horario || '',
        conteudoMinistrado: conteudoMinistrado.trim(),
        dataChamada: agora.toISOString(),
        dataChamadaFormatada: getDataDeHoje(),
        assinaturaProf: true,
        totalPresentes: resumo.presentes,
        totalFaltas: resumo.faltas,
        totalJustificadas: resumo.justificadas,
        criadoEm: serverTimestamp(),
        alunos: alunos.map(a => ({
          id: a.id,
          nome: a.nome,
          matricula: a.matricula || '',
          status: a.status,
          presencas: [a.status !== 'falta'],
          obs: a.obs.trim(),
        })),
      });
      setChamadaConcluida(true);
      setHoraAssinatura(agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }));
      setModalAssinatura(false);
      setSenhaConfirmacao('');
      notificar('sucesso', 'Diário Assinado!', 'Frequência registrada e bloqueada com sucesso.');
    } catch (error: any) {
      notificar('erro', 'Erro ao salvar chamada', error?.message || 'Falha ao gravar no Firestore.');
    } finally {
      setSalvando(false);
    }
  };

  const toastProps = { feedback, onFechar: fecharFeedback, fundoCard: tema.fundoTopo, textoPrincipal: tema.textoPrincipal, textoSecundario: tema.textoSecundario };

  // === RENDERIZADOR DE ALUNO ===
  const renderAluno = ({ item }: { item: AlunoChamada }) => {
    const corBorda = item.status === 'falta' ? '#C62828' : item.status === 'justificada' ? '#EF6C00' : tema.borda;
    const bloqueado = chamadaConcluida && !isAdmin;
    return (
      <View style={[styles.cardAluno, { backgroundColor: tema.inputBackground, borderColor: corBorda }]}>
        <View style={styles.linhaPrincipal}>
          <View style={[styles.avatarIniciais, { backgroundColor: tema.botaoPrimario + '20' }]}>
            <Text style={{ color: tema.botaoPrimario, fontSize: 12, fontWeight: '800' }}>{obterIniciais(item.nome)}</Text>
          </View>
          <View style={styles.infoAluno}>
            <Text style={[styles.nomeAluno, { color: tema.textoPrincipal }]} numberOfLines={1}>{item.nome}</Text>
            {!!item.matricula && <Text style={{ color: tema.textoSecundario, fontSize: 11 }}>Mat. {item.matricula}</Text>}
          </View>
          <View style={styles.areaBotoes}>
            {([
              { key: 'presente', label: 'P', cor: '#2E7D32' },
              { key: 'falta', label: 'F', cor: '#C62828' },
              { key: 'justificada', label: 'J', cor: '#EF6C00' },
            ] as const).map(op => {
              const ativo = item.status === op.key;
              return (
                <TouchableOpacity
                  key={op.key}
                  disabled={bloqueado}
                  onPress={() => alterarStatus(item.id, op.key)}
                  style={[styles.btnStatusPill, { backgroundColor: ativo ? op.cor : tema.fundoBase, borderColor: ativo ? op.cor : tema.borda, opacity: bloqueado && !ativo ? 0.35 : 1 }]}
                >
                  <Text style={{ color: ativo ? '#FFF' : tema.textoSecundario, fontSize: 12, fontWeight: '800' }}>{op.label}</Text>
                </TouchableOpacity>
              );
            })}
            <TouchableOpacity style={styles.btnObsIcon} onPress={() => toggleMostrarObs(item.id)}>
              <Ionicons name={item.obs ? 'chatbox-ellipses' : 'chatbox-ellipses-outline'} size={20} color={item.obs ? tema.botaoPrimario : tema.textoSecundario} />
            </TouchableOpacity>
          </View>
        </View>
        {item.mostrarObs && (
          <View style={[styles.areaObs, { borderTopColor: tema.borda }]}>
            <TextInput
              editable={!bloqueado}
              style={[styles.inputObs, { color: tema.textoPrincipal, backgroundColor: tema.fundoBase, borderColor: tema.borda }]}
              placeholder="Observação do aluno (ex: atraso, atestado...)"
              placeholderTextColor={tema.textoSecundario}
              value={item.obs}
              onChangeText={text => setObservacao(item.id, text)}
              multiline
            />
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
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.back()} style={styles.btnVoltar} accessibilityLabel="Voltar">
            <Ionicons name="arrow-back" size={24} color={tema.textoLogo} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={[styles.titulo, { color: tema.textoLogo }]} numberOfLines={1}>
              {aulaInfo ? `${aulaInfo.nome || aulaInfo.turmaNome} • ${aulaInfo.disciplina || aulaInfo.materia || ''}` : 'Registro de Frequência'}
            </Text>
            <Text style={[styles.subtitulo, { color: tema.textoLogo, opacity: 0.85 }]}>
              {aulaInfo?.horario ? `${aulaInfo.horario} • ${aulaInfo.turno || 'Matutino'}` : 'Diário de Classe Digital'}
            </Text>
          </View>
        </View>
        <View style={[styles.statusContainer, { backgroundColor: chamadaConcluida ? 'rgba(124, 124, 255, 0.22)' : '#2E7D32' }]}>
          <Ionicons name={chamadaConcluida ? 'lock-closed' : 'document-text-outline'} size={15} color="#FFF" />
          <Text style={styles.textoStatus}>
            {chamadaConcluida ? `Diário Assinado e Fechado${horaAssinatura ? ` (${horaAssinatura})` : ''}` : 'Diário Aberto • Marque P (Presente), F (Falta) ou J (Justificada)'}
          </Text>
        </View>
        <View style={[styles.searchContainer, { backgroundColor: tema.inputBackground, borderColor: tema.borda }]}>
          <Ionicons name="search" size={18} color={tema.textoSecundario} style={{ marginRight: 8 }} />
          <TextInput style={[styles.searchInput, { color: tema.textoPrincipal }]} placeholder="Buscar aluno..." placeholderTextColor={tema.textoSecundario} value={busca} onChangeText={setBusca} />
        </View>
      </View>

      {/* Lista de Alunos */}
      {carregando ? (
        <View style={styles.centro}>
          <ActivityIndicator size="large" color={tema.botaoPrimario} />
          <Text style={{ marginTop: 10, color: tema.textoSecundario }}>Sincronizando diário...</Text>
        </View>
      ) : (
        <FlatList
          data={alunosFiltrados}
          keyExtractor={item => item.id}
          renderItem={renderAluno}
          contentContainerStyle={[styles.listContent, !chamadaConcluida && { paddingBottom: 115 }]}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={carregando} onRefresh={() => void buscarDadosChamada()} tintColor={tema.botaoPrimario} />}
          ListHeaderComponent={
            <View>
              <View style={styles.resumoRow}>
                {[
                  { label: 'Presentes', valor: resumo.presentes, cor: '#2E7D32', icone: 'checkmark-circle-outline' as const },
                  { label: 'Faltas', valor: resumo.faltas, cor: '#C62828', icone: 'close-circle-outline' as const },
                  { label: 'Justificadas', valor: resumo.justificadas, cor: '#EF6C00', icone: 'document-text-outline' as const },
                ].map(kpi => (
                  <View key={kpi.label} style={[styles.cardResumo, { backgroundColor: tema.inputBackground, borderColor: tema.borda }]}>
                    <Ionicons name={kpi.icone} size={18} color={kpi.cor} />
                    <Text style={[styles.valorResumo, { color: tema.textoPrincipal }]}>{kpi.valor}</Text>
                    <Text style={[styles.labelResumo, { color: tema.textoSecundario }]}>{kpi.label}</Text>
                  </View>
                ))}
              </View>
              <View style={[styles.cardConteudo, { backgroundColor: tema.inputBackground, borderColor: tema.borda }]}>
                <Text style={[styles.labelConteudo, { color: tema.textoSecundario }]}>Conteúdo Ministrado (Diário de Classe)</Text>
                <TextInput
                  editable={!chamadaConcluida || isAdmin}
                  value={conteudoMinistrado}
                  onChangeText={setConteudoMinistrado}
                  placeholder="Ex: Equações de 2º grau e exercícios em sala..."
                  placeholderTextColor={tema.textoSecundario}
                  multiline
                  style={[styles.inputConteudo, { color: tema.textoPrincipal, backgroundColor: tema.fundoBase, borderColor: tema.borda }]}
                />
              </View>
            </View>
          }
          ListEmptyComponent={
            <View style={{ alignItems: 'center', marginTop: 30 }}>
              <Ionicons name="people-outline" size={38} color={tema.textoSecundario} />
              <Text style={{ color: tema.textoPrincipal, fontWeight: '700', fontSize: 15, marginTop: 10 }}>Nenhum aluno encontrado</Text>
              <Text style={{ color: tema.textoSecundario, fontSize: 12, marginTop: 4, textAlign: 'center' }}>Não há alunos matriculados nesta turma ainda.</Text>
            </View>
          }
        />
      )}

      {/* Rodapé Fixo de Assinatura */}
      {!chamadaConcluida && !carregando && alunos.length > 0 && (
        <View style={[styles.rodapeFixo, { backgroundColor: tema.fundoTopo, borderTopColor: tema.borda }]}>
          <View style={{ flex: 1 }}>
            <Text style={{ color: tema.textoLogo, fontSize: 13, fontWeight: '700' }}>{resumo.presentes} presente(s) • {resumo.faltas} falta(s)</Text>
            <Text style={{ color: tema.textoLogo, fontSize: 11, opacity: 0.75 }}>Pronto para assinatura digital</Text>
          </View>
          <TouchableOpacity style={[styles.btnConcluir, { backgroundColor: tema.botaoPrimario }]} onPress={() => setModalAssinatura(true)} activeOpacity={0.8}>
            <Ionicons name="shield-checkmark-outline" size={18} color={tema.textoBotao} />
            <Text style={{ color: tema.textoBotao, fontSize: 13, fontWeight: '800' }}>Assinar Diário</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Modal: Assinatura Eletrônica */}
      <Modal visible={modalAssinatura} transparent animationType="fade" onRequestClose={() => setModalAssinatura(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCardCentro, { backgroundColor: tema.fundoBase, borderColor: tema.borda }]}>
            <View style={[styles.modalHeader, { borderBottomColor: tema.borda }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Ionicons name="shield-checkmark" size={20} color={tema.botaoPrimario} />
                <Text style={[styles.tituloModal, { color: tema.textoPrincipal }]}>Assinatura Eletrônica</Text>
              </View>
              <TouchableOpacity onPress={() => setModalAssinatura(false)}><Ionicons name="close" size={22} color={tema.textoSecundario} /></TouchableOpacity>
            </View>
            <View style={{ padding: 20 }}>
              <View style={[styles.boxResumoModal, { backgroundColor: tema.inputBackground, borderColor: tema.borda }]}>
                <Text style={{ color: tema.textoPrincipal, fontWeight: '700', fontSize: 14 }}>{aulaInfo?.nome || 'Turma'} • {aulaInfo?.disciplina || aulaInfo?.materia || ''}</Text>
                <Text style={{ color: tema.textoSecundario, fontSize: 12, marginTop: 4 }}>Presentes: {resumo.presentes} • Faltas: {resumo.faltas} • Justificadas: {resumo.justificadas}</Text>
              </View>
              <Text style={[styles.labelConteudo, { color: tema.textoPrincipal, marginTop: 14 }]}>Confirme sua senha docente *</Text>
              <TextInput
                style={[styles.inputSenhaModal, { backgroundColor: tema.inputBackground, color: tema.textoPrincipal, borderColor: tema.borda }]}
                placeholder="Digite sua senha de acesso..."
                placeholderTextColor={tema.textoSecundario}
                secureTextEntry
                value={senhaConfirmacao}
                onChangeText={setSenhaConfirmacao}
              />
              <View style={styles.modalBotoes}>
                <TouchableOpacity style={[styles.btnCancelar, { backgroundColor: tema.inputBackground, borderColor: tema.borda }]} onPress={() => setModalAssinatura(false)} disabled={salvando}>
                  <Text style={{ color: tema.textoPrincipal, fontWeight: '700', fontSize: 13 }}>Revisar</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.btnConfirmar, { backgroundColor: '#2E7D32' }]} onPress={() => void confirmarAssinatura()} disabled={salvando}>
                  <Ionicons name="checkmark-done" size={16} color="#FFF" />
                  <Text style={{ color: '#FFF', fontWeight: '700', fontSize: 13 }}>{salvando ? 'Assinando...' : 'Assinar e Fechar'}</Text>
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

// === ESTILOS ===
const styles = StyleSheet.create({
  container: { flex: 1 },
  centro: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { paddingTop: 50, paddingBottom: 18, paddingHorizontal: 20, borderBottomLeftRadius: 20, borderBottomRightRadius: 20, elevation: 5 },
  headerRow: { flexDirection: 'row', alignItems: 'center' },
  btnVoltar: { marginRight: 12, padding: 4 },
  titulo: { fontSize: 19, fontWeight: 'bold' },
  subtitulo: { fontSize: 12, marginTop: 2 },
  statusContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 12, paddingVertical: 7, paddingHorizontal: 10, borderRadius: 10, gap: 6 },
  textoStatus: { color: '#FFF', fontSize: 11, fontWeight: 'bold' },
  searchContainer: { flexDirection: 'row', alignItems: 'center', height: 42, borderRadius: 10, borderWidth: 1, paddingHorizontal: 12, marginTop: 12 },
  searchInput: { flex: 1, height: '100%', fontSize: 14 },
  listContent: { padding: 20, paddingBottom: 40 },
  resumoRow: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  cardResumo: { flex: 1, borderWidth: 1, borderRadius: 12, padding: 12, alignItems: 'center' },
  valorResumo: { fontSize: 20, fontWeight: 'bold', marginTop: 4 },
  labelResumo: { fontSize: 11, marginTop: 2 },
  cardConteudo: { borderWidth: 1, borderRadius: 12, padding: 12, marginBottom: 16 },
  labelConteudo: { fontSize: 12, fontWeight: '700', marginBottom: 6 },
  inputConteudo: { borderWidth: 1, borderRadius: 8, padding: 10, minHeight: 54, textAlignVertical: 'top', fontSize: 13 },
  cardAluno: { borderWidth: 1, borderRadius: 12, marginBottom: 10, overflow: 'hidden' },
  linhaPrincipal: { flexDirection: 'row', alignItems: 'center', padding: 12, gap: 10 },
  avatarIniciais: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  infoAluno: { flex: 1 },
  nomeAluno: { fontSize: 14, fontWeight: 'bold' },
  areaBotoes: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  btnStatusPill: { width: 32, height: 32, borderRadius: 8, borderWidth: 1, justifyContent: 'center', alignItems: 'center' },
  btnObsIcon: { padding: 4, marginLeft: 2 },
  areaObs: { padding: 12, borderTopWidth: 1 },
  inputObs: { borderWidth: 1, borderRadius: 8, padding: 10, minHeight: 54, textAlignVertical: 'top', fontSize: 13 },
  rodapeFixo: { position: 'absolute', left: 0, right: 0, bottom: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, paddingVertical: 14, borderTopWidth: 1, gap: 12, elevation: 10 },
  btnConcluir: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, height: 42, borderRadius: 10 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.68)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalCardCentro: { width: '100%', maxWidth: 420, borderRadius: 18, borderWidth: 1, overflow: 'hidden' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 18, borderBottomWidth: 1 },
  tituloModal: { fontSize: 16, fontWeight: 'bold' },
  boxResumoModal: { borderWidth: 1, borderRadius: 12, padding: 12 },
  inputSenhaModal: { borderWidth: 1, borderRadius: 10, height: 44, paddingHorizontal: 12, fontSize: 14 },
  modalBotoes: { flexDirection: 'row', gap: 10, marginTop: 18 },
  btnCancelar: { flex: 1, height: 44, borderWidth: 1, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  btnConfirmar: { flex: 1.4, flexDirection: 'row', gap: 6, height: 44, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
});