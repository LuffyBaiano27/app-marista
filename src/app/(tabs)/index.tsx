import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, useColorScheme, Modal, FlatList, RefreshControl, Platform, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { cores } from '../../constants/colors';
import { useRouter } from 'expo-router';

import { useAuth } from '../../contexts/authContext';
import { useGradeTurmas } from '../../hooks/use-grade-turmas';
import { pendenciasDoDia } from '../../utils/calendario';
import { nomesPerfis } from '../../types/usuario';

export default function DashboardScreen() {
  const router = useRouter();
  const isDarkMode = useColorScheme() === 'dark';
  const tema = isDarkMode ? cores.dark : cores.light;


  const [fraseMotivacional, setFraseMotivacional] = useState('');
  
  const { dadosPerfil } = useAuth();
  const { turmas: todasTurmas, chamadasHoje, turmasInvalidas, carregando, erro, erroIndicadores, calendario, atualizar: buscarDadosDoFirebase } = useGradeTurmas();
  const chamadasRealizadasHoje = Object.keys(chamadasHoje);

  const [modalNotificacoes, setModalNotificacoes] = useState(false);
  const [notificacoes, setNotificacoes] = useState([
    { id: '1', titulo: 'Alteração Aprovada', mensagem: 'O coordenador aprovou sua solicitação de nota para a aluna Ana Carolina.', lida: false, tempo: 'Agora', tipo: 'sucesso' },
  ]);

  const totalNaoLidas = notificacoes.filter(n => !n.lida).length;
  const marcarComoLida = (id: string) => setNotificacoes(prev => prev.map(notif => notif.id === id ? { ...notif, lida: true } : notif));

  const frases = [
    "A educação é a arma mais poderosa que você pode usar para mudar o mundo. - Nelson Mandela",
    "Educação não transforma o mundo. Educação muda as pessoas. - Paulo Freire",
  ];

  useEffect(() => {
    setFraseMotivacional(frases[Math.floor(Math.random() * frases.length)]);
  }, []);

  const diaAtual = calendario.diaSemana;
  const saudacaoTempo = calendario.hora >= 5 && calendario.hora < 12 ? 'Bom dia'
    : calendario.hora >= 12 && calendario.hora < 18 ? 'Boa tarde' : 'Boa noite';
  const turmasDeHojePendentes = pendenciasDoDia(todasTurmas, chamadasHoje, diaAtual);
  const temAulaHoje = todasTurmas.some(t => t.diaId === diaAtual);

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
              {saudacaoTempo}, {dadosPerfil ? nomesPerfis[dadosPerfil.role] : ''} {dadosPerfil?.nome.split(/\s+/)[0]}! 👋
            </Text>
            <Text style={[styles.subtituloSaudacao, { color: tema.textoSecundario }]}>Que seja uma ótima aula!</Text>
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

        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: tema.textoPrincipal }]}>Meu Cronograma</Text>
        </View>
        
        {turmasInvalidas > 0 && <Text style={{ color: tema.textoSecundario }}>Algumas turmas possuem dados inválidos e não puderam ser exibidas.</Text>}
        {erro ? (
          <View style={{ paddingVertical: 20 }}>
            <Text accessibilityRole="alert" style={{ color: tema.textoPrincipal }}>{erro.mensagem}</Text>
            <TouchableOpacity onPress={() => { void buscarDadosDoFirebase(); }}><Text style={{ color: tema.botaoPrimario }}>Tentar novamente</Text></TouchableOpacity>
          </View>
        ) : carregando ? (
           <View style={{ marginVertical: 40, alignItems: 'center' }}>
             <ActivityIndicator size="large" color={tema.botaoPrimario} />
             <Text style={{ marginTop: 10, color: tema.textoSecundario }}>Montando grelha...</Text>
           </View>
        ) : todasTurmas.length === 0 ? (
          <Text style={{ color: tema.textoSecundario }}>Nenhuma turma vinculada disponível.</Text>
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scrollMatrizContainer}>
            {diasDaSemana.map((dia) => {
              const aulasDoDia = todasTurmas.filter(t => t.diaId === dia.id).sort((a,b) => a.horario.localeCompare(b.horario));
              const isHoje = dia.id === diaAtual;
              
              return (
                <View key={dia.id} style={[styles.colunaDia, { borderColor: isHoje ? tema.botaoPrimario : tema.borda, backgroundColor: isHoje ? tema.botaoPrimario + '08' : tema.inputBackground }]}>
                  <View style={[styles.cabecalhoDia, { backgroundColor: isHoje ? tema.botaoPrimario : 'transparent', borderBottomColor: tema.borda, borderBottomWidth: isHoje ? 0 : 1 }]}>
                    <Text style={[styles.textoDiaNome, { color: isHoje ? '#FFF' : tema.textoPrincipal }]}>{dia.nome}</Text>
                  </View>
                  <View style={styles.corpoColuna}>
                    {aulasDoDia.length === 0 ? (
                      <Text style={{ textAlign: 'center', fontSize: 13, fontStyle: 'italic', color: tema.textoSecundario, marginTop: 40 }}>Livre</Text>
                    ) : (
                      aulasDoDia.map(aula => {
                        const cor = obterCorMateria(aula.disciplina);
                        // Se a chamada já foi feita, mostramos um iconezinho de check na grade
                        const aulaConcluida = dia.id === diaAtual && chamadasRealizadasHoje.includes(aula.id);
                        return (
                          <View key={aula.id} style={[styles.blocoAula, { backgroundColor: cor.bg }]}>
                            <Text style={[styles.blocoMateria, { color: cor.text }]} numberOfLines={1}>
                              {aula.disciplina} {aulaConcluida && <Ionicons name="checkmark-circle" size={12} color={cor.text} />}
                            </Text>
                            <Text style={[styles.blocoTurma, { color: cor.text }]}>{aula.nome}</Text>
                            <View style={styles.blocoRodape}>
                              <Text style={[styles.blocoHorario, { color: cor.text }]}>{aula.horario.split(' ')[0]}</Text>
                              {dadosPerfil?.role !== 'professor' && aula.professorNome && (
                                <Text style={[styles.blocoProf, { color: cor.text }]} numberOfLines={1}>{aula.professorNome.split(' ')[0]}</Text>
                              )}
                            </View>
                          </View>
                        )
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

        <Text style={{ color: tema.textoSecundario, marginBottom: 12 }}>Criação e assinatura indisponíveis. Indicadores consideram apenas diários com data confiável.</Text>
        {erro ? null : erroIndicadores ? (
          <View><Text accessibilityRole="alert" style={{ color: tema.textoPrincipal }}>{erroIndicadores.mensagem}</Text><TouchableOpacity onPress={() => { void buscarDadosDoFirebase(); }}><Text style={{ color: tema.botaoPrimario }}>Tentar novamente</Text></TouchableOpacity></View>
        ) : carregando ? (
           <Text style={{ textAlign: 'center', marginTop: 20, color: tema.textoSecundario }}>Procurando turmas...</Text>
        ) : todasTurmas.length === 0 ? null : turmasDeHojePendentes.length === 0 ? (
           <View style={{alignItems: 'center', marginTop: 20}}>
             <Ionicons name="checkmark-circle-outline" size={40} color="#2E7D32" />
             <Text style={{ textAlign: 'center', marginTop: 10, color: '#2E7D32', fontWeight: 'bold' }}>{temAulaHoje ? 'Nenhuma pendência identificada' : 'Nenhuma aula prevista para hoje'}</Text>
             <Text style={{ textAlign: 'center', color: tema.textoSecundario }}>A grade semanal permanece disponível acima.</Text>
           </View>
        ) : (
          turmasDeHojePendentes.map((turma) => (
            <View
              key={turma.id} 
              style={[styles.cardTurma, { backgroundColor: tema.inputBackground, borderColor: tema.borda }]}
            >
              <View style={[styles.iconeTurmaBg, { backgroundColor: tema.botaoPrimario + '20' }]}><Ionicons name="people" size={24} color={tema.botaoPrimario} /></View>
              <View style={styles.infoTurma}>
                <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'}}>
                  <Text style={[styles.nomeTurma, { color: tema.textoPrincipal }]}>{turma.nome}</Text>
                </View>
                <Text style={[styles.materiaTurma, { color: tema.textoSecundario }]}>{turma.disciplina}</Text>
                <View style={styles.detalhesTurmaMinimalista}>
                  <Ionicons name="time" size={14} color={tema.botaoPrimario} />
                  <Text style={[styles.textoHorarioDestaque, { color: tema.botaoPrimario }]}>{turma.horario} • {turma.turno}</Text>
                </View>
              </View>
              <Ionicons name="lock-closed" size={20} color={tema.icone} />
            </View>
          ))
        )}
      </ScrollView>

      <Modal visible={modalNotificacoes} transparent={true} animationType="fade" onRequestClose={() => setModalNotificacoes(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setModalNotificacoes(false)}>
          <TouchableOpacity activeOpacity={1} style={[styles.modalContent, { backgroundColor: tema.fundoBase }]}>
            <View style={[styles.modalHeader, { borderBottomColor: tema.borda }]}><Text style={[styles.modalTitle, { color: tema.textoPrincipal }]}>Notificações</Text></View>
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
  tituloSaudacao: { fontSize: 20, fontWeight: 'bold' }, subtituloSaudacao: { fontSize: 13, marginTop: 2 },
  avatar: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, justifyContent: 'center', alignItems: 'center' },
  banner: { width: '100%', padding: 20, borderRadius: 15, marginBottom: 30, position: 'relative', overflow: 'hidden', elevation: 3 },
  textoBanner: { fontSize: 15, fontWeight: 'bold', fontStyle: 'italic', marginBottom: 10, zIndex: 2, lineHeight: 22 },
  assinaturaBanner: { fontSize: 12, fontWeight: '600', zIndex: 2, alignSelf: 'flex-end' },
  watermark: { position: 'absolute', left: -10, bottom: -15, opacity: 0.2, transform: [{ rotate: '15deg' }] },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold' }, btnVerTodas: { fontSize: 14, fontWeight: '600' },
  scrollMatrizContainer: { flexGrow: 1, gap: 10, paddingBottom: 10 },
  colunaDia: { flex: 1, minWidth: Platform.OS === 'web' ? 0 : 130, borderRadius: 16, borderWidth: 1, overflow: 'hidden' },
  cabecalhoDia: { paddingVertical: 12, alignItems: 'center' }, textoDiaNome: { fontSize: 14, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 0.5 },
  corpoColuna: { padding: 8, minHeight: 180 }, blocoAula: { padding: 12, borderRadius: 12, marginBottom: 10, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.2, shadowRadius: 2 },
  blocoMateria: { fontSize: 13, fontWeight: 'bold', marginBottom: 4 }, blocoTurma: { fontSize: 11, fontWeight: '700', marginBottom: 6 },
  blocoRodape: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, blocoHorario: { fontSize: 10, fontWeight: 'bold', opacity: 0.8 },
  blocoProf: { fontSize: 9, fontWeight: 'bold', opacity: 0.7 },
  cardTurma: { flexDirection: 'row', alignItems: 'center', padding: 15, borderRadius: 12, borderWidth: 1, marginBottom: 12 },
  iconeTurmaBg: { width: 50, height: 50, borderRadius: 25, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  infoTurma: { flex: 1 }, nomeTurma: { fontSize: 16, fontWeight: 'bold' }, materiaTurma: { fontSize: 14, marginBottom: 5 },
  detalhesTurmaMinimalista: { flexDirection: 'row', alignItems: 'center', marginTop: 4 }, textoHorarioDestaque: { fontSize: 13, fontWeight: 'bold', marginLeft: 6 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }, modalContent: { height: '70%', borderTopLeftRadius: 25, borderTopRightRadius: 25, elevation: 10 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1 }, modalTitle: { fontSize: 18, fontWeight: 'bold' }, btnFecharModal: { padding: 5 },
  cardNotificacao: { flexDirection: 'row', padding: 15, borderRadius: 12, borderWidth: 1, marginBottom: 12 }, tituloNotificacao: { fontSize: 15, fontWeight: 'bold', marginBottom: 4 }, mensagemNotificacao: { fontSize: 13, lineHeight: 18, marginBottom: 6 }
});