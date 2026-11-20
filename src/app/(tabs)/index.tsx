import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, useColorScheme, useWindowDimensions, Modal, FlatList, RefreshControl, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { cores } from '../../constants/colors';
import { useRouter } from 'expo-router';
import { useDemoProfile, type DemoProfile } from '../../contexts/demoProfileContext';

// FIREBASE
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../../config/firebase'; 

// Identidades e indicadores são dados locais de demonstração; turmas e chamadas continuam vindo do Firestore.
const PERFIS_DEMONSTRATIVOS: Record<DemoProfile, { nome: string; cargo: string }> = {
  admin: { nome: 'Marina', cargo: 'Administradora' },
  coordenador: { nome: 'Camila', cargo: 'Coordenadora' },
  professor: { nome: 'Luffy Baiano', cargo: 'Professor' },
};

const ID_PROFESSOR_DEMONSTRATIVO = 'prof_1';

const INDICADORES_ADMIN_DEMONSTRATIVOS = [
  { id: 'turmas', titulo: 'Turmas', valor: '12', icone: 'people' as const },
  { id: 'professores', titulo: 'Professores', valor: '8', icone: 'person' as const },
  { id: 'chamados', titulo: 'Chamados', valor: '3', icone: 'construct' as const },
];

const INDICADORES_COORDENACAO_DEMONSTRATIVOS = [
  { id: 'chamadas', titulo: 'Chamadas acompanhadas', valor: '18', icone: 'checkmark-done' as const },
  { id: 'avaliacoes', titulo: 'Avaliações pendentes', valor: '4', icone: 'document-text' as const },
];

export default function DashboardScreen() {
  const router = useRouter();
  const { perfil } = useDemoProfile();
  const { width: larguraTela } = useWindowDimensions();
  const isDarkMode = useColorScheme() === 'dark';
  const tema = isDarkMode ? cores.dark : cores.light;
  const perfilDemonstrativo = PERFIS_DEMONSTRATIVOS[perfil];
  const larguraColunaDia = Math.min(240, Math.max(190, larguraTela * 0.62));

  const [saudacaoTempo, setSaudacaoTempo] = useState('Olá');
  const [fraseMotivacional, setFraseMotivacional] = useState('');
  
  // ESTADOS FIREBASE
  const [todasTurmas, setTodasTurmas] = useState<any[]>([]); 
  const [chamadasRealizadasHoje, setChamadasRealizadasHoje] = useState<string[]>([]);
  const [carregando, setCarregando] = useState(false);
  
  const [modalNotificacoes, setModalNotificacoes] = useState(false);
  const [notificacoes, setNotificacoes] = useState([
    { id: '1', titulo: 'Notificação demonstrativa', mensagem: 'Esta é uma notificação de exemplo.', lida: false, tempo: 'Agora', tipo: 'sucesso' },
  ]);

  const totalNaoLidas = notificacoes.filter(n => !n.lida).length;
  const marcarComoLida = (id: string) => setNotificacoes(prev => prev.map(notif => notif.id === id ? { ...notif, lida: true } : notif));

  const frases = [
    "A educação é a arma mais poderosa que você pode usar para mudar o mundo. - Nelson Mandela",
    "Educação não transforma o mundo. Educação muda as pessoas. - Paulo Freire",
  ];

  const getDataDeHoje = () => new Date().toISOString().split('T')[0];

  const buscarDadosDoFirebase = async () => {
    setCarregando(true);
    try {
      // 1. Busca Turmas
      const turmasRef = collection(db, 'turmas');
      const qTurmas = perfil === 'professor'
        ? query(turmasRef, where('professorId', '==', ID_PROFESSOR_DEMONSTRATIVO))
        : query(turmasRef);
      
      const turmasSnap = await getDocs(qTurmas);
      const turmasBanco: any[] = [];
      turmasSnap.forEach((doc) => turmasBanco.push({ id: doc.id, ...doc.data() }));
      setTodasTurmas(turmasBanco);

      // 2. Busca Chamadas Realizadas HOJE
      const chamadasRef = collection(db, 'chamadas');
      const qChamadas = query(chamadasRef, where('dataChamadaFormatada', '==', getDataDeHoje()));
      const chamadasSnap = await getDocs(qChamadas);
      
      const chamadasHojeIds: string[] = [];
      chamadasSnap.forEach((doc) => {
        chamadasHojeIds.push(doc.data().turmaId);
      });
      setChamadasRealizadasHoje(chamadasHojeIds);

    } catch (error) {
      console.error("Erro ao buscar dados no Firebase:", error);
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    const hora = new Date().getHours();
    if (hora >= 5 && hora < 12) setSaudacaoTempo('Bom dia');
    else if (hora >= 12 && hora < 18) setSaudacaoTempo('Boa tarde');
    else setSaudacaoTempo('Boa noite');
    setFraseMotivacional(frases[Math.floor(Math.random() * frases.length)]);
    buscarDadosDoFirebase();
  }, [perfil]);

  // LÓGICA: Dia Atual
  const diaAtual = new Date().getDay(); 
  const diaBusca = (diaAtual === 0 || diaAtual === 6) ? 1 : diaAtual; 

  const turmasVisiveis = perfil === 'professor'
    ? todasTurmas.filter(t => t.professorId === ID_PROFESSOR_DEMONSTRATIVO)
    : todasTurmas;
  
  // LÓGICA "PARA HOJE": Pega as turmas do dia e REMOVE as que já tiveram chamada
  const turmasDeHojePendentes = turmasVisiveis
    .filter(t => t.diaId === diaBusca && !chamadasRealizadasHoje.includes(t.id))
    .sort((a,b) => a.horario.localeCompare(b.horario));

  const diasDaSemana = [
    { id: 1, nome: 'Segunda' }, { id: 2, nome: 'Terça' }, 
    { id: 3, nome: 'Quarta' }, { id: 4, nome: 'Quinta' }, { id: 5, nome: 'Sexta' }
  ];

  const obterCorMateria = (materia: string) => {
    const paleta: any = {
      'Matemática': { bg: '#FFCC80', text: '#E65100' },
      'Física': { bg: '#90CAF9', text: '#0D47A1' },
      'História': { bg: '#A5D6A7', text: '#1B5E20' },
    };
    return paleta[materia] || { bg: tema.botaoPrimario + '20', text: tema.botaoPrimario }; 
  };

  const renderNotificacao = ({ item }: { item: any }) => {
    const corIcone = item.tipo === 'sucesso' ? '#2E7D32' : item.tipo === 'erro' ? '#C62828' : tema.botaoPrimario;
    const iconeNome = item.tipo === 'sucesso' ? 'checkmark-circle' : item.tipo === 'erro' ? 'close-circle' : 'information-circle';

    return (
      <View style={[styles.cardNotificacao, { backgroundColor: item.lida ? tema.inputBackground : tema.botaoPrimario + '15', borderColor: tema.borda }]}>
        <Ionicons name={iconeNome} size={24} color={corIcone} style={{ marginRight: 15, marginTop: 2 }} />
        <View style={{ flex: 1 }}>
          <Text style={[styles.tituloNotificacao, { color: tema.textoPrincipal }]}>{item.titulo}</Text>
          <Text style={[styles.mensagemNotificacao, { color: tema.textoSecundario }]}>{item.mensagem}</Text>
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: tema.fundoBase }]}>
      <ScrollView 
        contentContainerStyle={styles.scrollContent} 
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={carregando} onRefresh={buscarDadosDoFirebase} tintColor={tema.botaoPrimario} />}
      >
        <View style={styles.header}>
          <View style={styles.headerTextContainer}>
            <Text style={[styles.tituloSaudacao, { color: tema.textoPrincipal }]}>
              {saudacaoTempo}, {perfilDemonstrativo.cargo} {perfilDemonstrativo.nome.split(' ')[0]}! 👋
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

        <View style={[styles.banner, { backgroundColor: tema.fundoTopo }]}>
          <Text style={[styles.textoBanner, { color: tema.textoLogo }]}>"{fraseMotivacional.split(' - ')[0]}"</Text>
          <Text style={[styles.assinaturaBanner, { color: tema.textoLogo, opacity: 0.8 }]}>{fraseMotivacional.split(' - ')[1]}</Text>
          <Ionicons name="school" size={60} color={tema.textoLogo} style={styles.watermark} />
        </View>

        {perfil === 'admin' && (
          <View>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: tema.textoPrincipal }]}>Resumo administrativo</Text>
            </View>
            <View style={styles.gradeIndicadores}>
              {INDICADORES_ADMIN_DEMONSTRATIVOS.map(indicador => (
                <View key={indicador.id} style={[styles.cardIndicador, { backgroundColor: tema.inputBackground, borderColor: tema.borda }]}>
                  <Ionicons name={indicador.icone} size={20} color={tema.botaoPrimario} />
                  <Text style={[styles.valorIndicador, { color: tema.textoPrincipal }]}>{indicador.valor}</Text>
                  <Text style={[styles.tituloIndicador, { color: tema.textoSecundario }]}>{indicador.titulo}</Text>
                </View>
              ))}
            </View>
            <View style={[styles.sectionHeader, { marginTop: 25 }]}>
              <Text style={[styles.sectionTitle, { color: tema.textoPrincipal }]}>Acessos disponíveis</Text>
            </View>
            <TouchableOpacity style={[styles.atalho, { backgroundColor: tema.inputBackground, borderColor: tema.borda }]} onPress={() => router.push('/usuarios')}>
              <Ionicons name="people" size={20} color={tema.botaoPrimario} />
              <Text style={[styles.textoAtalho, { color: tema.textoPrincipal }]}>Gerenciar usuários</Text>
              <Ionicons name="chevron-forward" size={18} color={tema.icone} />
            </TouchableOpacity>
            <TouchableOpacity style={[styles.atalho, { backgroundColor: tema.inputBackground, borderColor: tema.borda }]} onPress={() => router.push('/chamados')}>
              <Ionicons name="construct" size={20} color={tema.botaoPrimario} />
              <Text style={[styles.textoAtalho, { color: tema.textoPrincipal }]}>Gerenciar chamados</Text>
              <Ionicons name="chevron-forward" size={18} color={tema.icone} />
            </TouchableOpacity>
            <TouchableOpacity style={[styles.atalho, { backgroundColor: tema.inputBackground, borderColor: tema.borda }]} onPress={() => router.push('/(tabs)/turmas')}>
              <Ionicons name="people" size={20} color={tema.botaoPrimario} />
              <Text style={[styles.textoAtalho, { color: tema.textoPrincipal }]}>Ver grade de turmas</Text>
              <Ionicons name="chevron-forward" size={18} color={tema.icone} />
            </TouchableOpacity>
            <TouchableOpacity style={[styles.atalho, { backgroundColor: tema.inputBackground, borderColor: tema.borda }]} onPress={() => router.push('/historico')}>
              <Ionicons name="time" size={20} color={tema.botaoPrimario} />
              <Text style={[styles.textoAtalho, { color: tema.textoPrincipal }]}>Ver histórico</Text>
              <Ionicons name="chevron-forward" size={18} color={tema.icone} />
            </TouchableOpacity>
          </View>
        )}

        {perfil === 'coordenador' && (
          <View>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: tema.textoPrincipal }]}>Acompanhamento pedagógico</Text>
            </View>
            <View style={styles.gradeIndicadores}>
              {INDICADORES_COORDENACAO_DEMONSTRATIVOS.map(indicador => (
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
                      {turma.disciplina} • {turma.professorNome || 'Professor não informado'}
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
                {diasDaSemana.map((dia) => {
                  const aulasDoDia = turmasVisiveis.filter(t => t.diaId === dia.id).sort((a,b) => a.horario.localeCompare(b.horario));
                  const isHoje = dia.id === diaBusca;

                  return (
                    <View key={dia.id} style={[styles.colunaDia, { width: larguraColunaDia, borderColor: isHoje ? tema.botaoPrimario : tema.borda, backgroundColor: isHoje ? tema.botaoPrimario + '08' : tema.inputBackground }]}>
                      <View style={[styles.cabecalhoDia, { backgroundColor: isHoje ? tema.botaoPrimario : 'transparent', borderBottomColor: tema.borda, borderBottomWidth: isHoje ? 0 : 1 }]}>
                        <Text style={[styles.textoDiaNome, { color: isHoje ? '#FFF' : tema.textoPrincipal }]}>{dia.nome}</Text>
                      </View>
                      <View style={styles.corpoColuna}>
                        {aulasDoDia.length === 0 ? (
                          <Text style={{ textAlign: 'center', fontSize: 13, fontStyle: 'italic', color: tema.textoSecundario, marginTop: 40 }}>Livre</Text>
                        ) : (
                          aulasDoDia.map(aula => {
                            const cor = obterCorMateria(aula.disciplina);
                            const aulaConcluida = chamadasRealizadasHoje.includes(aula.id);
                            return (
                              <View key={aula.id} style={[styles.blocoAula, { backgroundColor: cor.bg }]}>
                                <Text style={[styles.blocoMateria, { color: cor.text }]} numberOfLines={2}>
                                  {aula.disciplina} {aulaConcluida && <Ionicons name="checkmark-circle" size={12} color={cor.text} />}
                                </Text>
                                <Text style={[styles.blocoTurma, { color: cor.text }]}>{aula.nome}</Text>
                                <View style={styles.blocoRodape}>
                                  <Text style={[styles.blocoHorario, { color: cor.text }]}>{aula.horario}</Text>
                                  {aula.professorNome && (
                                    <Text style={[styles.blocoProf, { color: cor.text }]} numberOfLines={1}>{aula.professorNome.split(' ')[0]}</Text>
                                  )}
                                </View>
                              </View>
                            );
                          })
                        )}
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
              turmasDeHojePendentes.map((turma) => (
                <TouchableOpacity
                  key={turma.id}
                  style={[styles.cardTurma, { backgroundColor: tema.inputBackground, borderColor: tema.borda }]}
                  activeOpacity={0.7}
                  onPress={() => router.push(`/chamada?id=${turma.id}`)}
                >
                  <View style={[styles.iconeTurmaBg, { backgroundColor: tema.botaoPrimario + '20' }]}><Ionicons name="people" size={24} color={tema.botaoPrimario} /></View>
                  <View style={styles.infoTurma}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text style={[styles.nomeTurma, { color: tema.textoPrincipal }]}>{turma.nome}</Text>
                    </View>
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

      <Modal visible={modalNotificacoes} transparent={true} animationType="fade" onRequestClose={() => setModalNotificacoes(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setModalNotificacoes(false)}>
          <TouchableOpacity activeOpacity={1} style={[styles.modalContent, { backgroundColor: tema.fundoBase }]}>
            <View style={[styles.modalHeader, { borderBottomColor: tema.borda }]}><Text style={[styles.modalTitle, { color: tema.textoPrincipal }]}>Notificações demonstrativas</Text></View>
            <FlatList data={notificacoes} keyExtractor={(item) => item.id} renderItem={renderNotificacao} contentContainerStyle={{ padding: 20 }} showsVerticalScrollIndicator={false} />
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 }, scrollContent: { padding: 20, paddingTop: 50, paddingBottom: 20 }, 
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 25 },
  headerTextContainer: { flex: 1 }, headerActions: { flexDirection: 'row', alignItems: 'center' },
  iconButton: { marginRight: 15, position: 'relative', padding: 5 },
  notificationBadge: { position: 'absolute', top: 0, right: 0, minWidth: 16, height: 16, borderRadius: 8, backgroundColor: '#DB4437', borderWidth: 1, borderColor: '#FFF', justifyContent: 'center', alignItems: 'center' },
  badgeText: { color: '#FFF', fontSize: 9, fontWeight: 'bold' },
  tituloSaudacao: { fontSize: 20, fontWeight: 'bold' },
  badgeDemonstracao: { alignSelf: 'flex-start', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 4, marginTop: 6 },
  textoBadgeDemonstracao: { fontSize: 11, fontWeight: '600' },
  avisoDemonstrativo: { fontSize: 12, marginTop: -8, marginBottom: 15, lineHeight: 17 },
  gradeIndicadores: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  cardIndicador: { flexGrow: 1, flexBasis: '30%', minWidth: 95, borderWidth: 1, borderRadius: 12, padding: 12, alignItems: 'center' },
  valorIndicador: { fontSize: 22, fontWeight: 'bold', marginTop: 8 },
  tituloIndicador: { fontSize: 11, textAlign: 'center', marginTop: 3 },
  atalho: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 12, borderWidth: 1, marginBottom: 10, gap: 12 },
  textoAtalho: { flex: 1, fontSize: 14, fontWeight: '600' },
  avatar: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, justifyContent: 'center', alignItems: 'center' },
  banner: { width: '100%', padding: 20, borderRadius: 15, marginBottom: 30, position: 'relative', overflow: 'hidden', elevation: 3 },
  textoBanner: { fontSize: 15, fontWeight: 'bold', fontStyle: 'italic', marginBottom: 10, zIndex: 2, lineHeight: 22 },
  assinaturaBanner: { fontSize: 12, fontWeight: '600', zIndex: 2, alignSelf: 'flex-end' },
  watermark: { position: 'absolute', left: -10, bottom: -15, opacity: 0.2, transform: [{ rotate: '15deg' }] },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold' }, btnVerTodas: { fontSize: 14, fontWeight: '600' },
  scrollMatrizContainer: { flexGrow: 0, gap: 10, paddingBottom: 10 },
  colunaDia: { flexShrink: 0, borderRadius: 16, borderWidth: 1, overflow: 'hidden' },
  cabecalhoDia: { paddingVertical: 12, alignItems: 'center' }, textoDiaNome: { fontSize: 14, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 0.5 },
  corpoColuna: { padding: 8, minHeight: 180 }, blocoAula: { padding: 12, borderRadius: 12, marginBottom: 10, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.2, shadowRadius: 2 },
  blocoMateria: { fontSize: 13, fontWeight: 'bold', marginBottom: 4 }, blocoTurma: { fontSize: 12, fontWeight: '700', marginBottom: 6 },
  blocoRodape: { flexDirection: 'column', alignItems: 'flex-start', gap: 3 }, blocoHorario: { fontSize: 11, fontWeight: 'bold', opacity: 0.8 },
  blocoProf: { fontSize: 10, fontWeight: 'bold', opacity: 0.7 },
  cardTurma: { flexDirection: 'row', alignItems: 'center', padding: 15, borderRadius: 12, borderWidth: 1, marginBottom: 12 },
  iconeTurmaBg: { width: 50, height: 50, borderRadius: 25, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  infoTurma: { flex: 1 }, nomeTurma: { fontSize: 16, fontWeight: 'bold' }, materiaTurma: { fontSize: 14, marginBottom: 5 },
  detalhesTurmaMinimalista: { flexDirection: 'row', alignItems: 'center', marginTop: 4 }, textoHorarioDestaque: { fontSize: 13, fontWeight: 'bold', marginLeft: 6 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }, modalContent: { height: '70%', borderTopLeftRadius: 25, borderTopRightRadius: 25, elevation: 10 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1 }, modalTitle: { fontSize: 18, fontWeight: 'bold' }, btnFecharModal: { padding: 5 },
  cardNotificacao: { flexDirection: 'row', padding: 15, borderRadius: 12, borderWidth: 1, marginBottom: 12 }, tituloNotificacao: { fontSize: 15, fontWeight: 'bold', marginBottom: 4 }, mensagemNotificacao: { fontSize: 13, lineHeight: 18, marginBottom: 6 }
});