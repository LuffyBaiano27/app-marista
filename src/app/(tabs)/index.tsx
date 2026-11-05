import React, { useState, useEffect } from 'react';
import { 
  View, Text, StyleSheet, ScrollView, TouchableOpacity, useColorScheme, Modal, FlatList 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { cores } from '../../constants/colors';
import { useRouter } from 'expo-router';

export default function DashboardScreen() {
  const router = useRouter();
  const isDarkMode = useColorScheme() === 'dark';
  const tema = isDarkMode ? cores.dark : cores.light;

  const [saudacaoTempo, setSaudacaoTempo] = useState('Olá');
  const [fraseMotivacional, setFraseMotivacional] = useState('');
  
  // ESTADOS DO MODAL DE NOTIFICAÇÕES
  const [modalNotificacoes, setModalNotificacoes] = useState(false);
  const [notificacoes, setNotificacoes] = useState([
    { id: '1', titulo: 'Alteração Aprovada', mensagem: 'O coordenador aprovou sua solicitação de nota para a aluna Ana Carolina.', lida: false, tempo: 'Agora', tipo: 'sucesso' },
    { id: '2', titulo: 'Solicitação Recusada', mensagem: 'A alteração de nota do aluno Carlos Eduardo foi recusada. Verifique os motivos.', lida: false, tempo: '2h atrás', tipo: 'erro' },
    { id: '3', titulo: 'Novo Prazo Aberto', mensagem: 'O prazo para lançamento de notas do 6º Ano A foi aberto.', lida: true, tempo: '1 dia atrás', tipo: 'info' },
  ]);

  const totalNaoLidas = notificacoes.filter(n => !n.lida).length;

  const marcarComoLida = (id: string) => {
    setNotificacoes(prev => prev.map(notif => 
      notif.id === id ? { ...notif, lida: true } : notif
    ));
  };

  const cargoUsuario = "Professor";
  const nomeUsuario = "João Marcelo"; 

  const frases = [
    "A educação é a arma mais poderosa que você pode usar para mudar o mundo. - Nelson Mandela",
    "Educação não transforma o mundo. Educação muda as pessoas. - Paulo Freire",
    "Só a educação liberta. - Epicteto",
  ];

  useEffect(() => {
    const hora = new Date().getHours();
    if (hora >= 5 && hora < 12) setSaudacaoTempo('Bom dia');
    else if (hora >= 12 && hora < 18) setSaudacaoTempo('Boa tarde');
    else setSaudacaoTempo('Boa noite');

    const fraseSorteada = frases[Math.floor(Math.random() * frases.length)];
    setFraseMotivacional(fraseSorteada);
  }, []);

  const turmasDeHoje = [
    { id: 1, nome: '6º Ano A', materia: 'Matemática', alunos: 32, horario: '07:00 às 07:50', turno: 'Matutino' },
    { id: 2, nome: '7º Ano B', materia: 'Matemática', alunos: 28, horario: '09:00 às 09:50', turno: 'Matutino' },
    { id: 3, nome: '1º Ano Médio', materia: 'Matemática', alunos: 35, horario: '14:00 às 14:50', turno: 'Vespertino' },
  ];

  // RENDERIZADOR DOS ITENS DA NOTIFICAÇÃO
  const renderNotificacao = ({ item }: { item: any }) => {
    const corIcone = item.tipo === 'sucesso' ? '#2E7D32' : item.tipo === 'erro' ? '#C62828' : tema.botaoPrimario;
    const iconeNome = item.tipo === 'sucesso' ? 'checkmark-circle' : item.tipo === 'erro' ? 'close-circle' : 'information-circle';

    return (
      <View style={[styles.cardNotificacao, { backgroundColor: item.lida ? tema.inputBackground : tema.botaoPrimario + '15', borderColor: tema.borda }]}>
        <Ionicons name={iconeNome} size={24} color={corIcone} style={{ marginRight: 15, marginTop: 2 }} />
        <View style={{ flex: 1 }}>
          <Text style={[styles.tituloNotificacao, { color: tema.textoPrincipal }]}>{item.titulo}</Text>
          <Text style={[styles.mensagemNotificacao, { color: tema.textoSecundario }]}>{item.mensagem}</Text>
          <Text style={[styles.tempoNotificacao, { color: tema.textoSecundario }]}>{item.tempo}</Text>
        </View>
        {!item.lida && (
          <TouchableOpacity onPress={() => marcarComoLida(item.id)} style={styles.btnMarcarLido}>
            <Ionicons name="checkmark-done" size={20} color={tema.botaoPrimario} />
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: tema.fundoBase }]}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* CABEÇALHO */}
        <View style={styles.header}>
          <View style={styles.headerTextContainer}>
            <Text style={[styles.tituloSaudacao, { color: tema.textoPrincipal }]}>
              {saudacaoTempo}, {cargoUsuario}, {nomeUsuario.split(' ')[0]}! 👋
            </Text>
            <Text style={[styles.subtituloSaudacao, { color: tema.textoSecundario }]}>Que seja uma ótima aula!</Text>
          </View>
          
          <View style={styles.headerActions}>
            {/* AÇÃO DO SININHO: Abre o modal */}
            <TouchableOpacity style={styles.iconButton} onPress={() => setModalNotificacoes(true)}>
              <Ionicons name="notifications-outline" size={24} color={tema.textoPrincipal} />
              {totalNaoLidas > 0 && (
                <View style={styles.notificationBadge}>
                  <Text style={styles.badgeText}>{totalNaoLidas}</Text>
                </View>
              )}
            </TouchableOpacity>
            
            {/* BOTÃO PERFIL */}
            <TouchableOpacity 
              style={[styles.avatar, { backgroundColor: tema.inputBackground, borderColor: tema.borda }]}
              activeOpacity={0.7}
              onPress={() => router.push('/perfil')}
            >
              <Ionicons name="person" size={20} color={tema.botaoPrimario} />
            </TouchableOpacity>
          </View>
        </View>

        {/* BANNER MOTIVACIONAL */}
        <View style={[styles.banner, { backgroundColor: tema.fundoTopo }]}>
          <Text style={[styles.textoBanner, { color: tema.textoLogo }]}>
            "{fraseMotivacional.split(' - ')[0]}"
          </Text>
          <Text style={[styles.assinaturaBanner, { color: tema.textoLogo, opacity: 0.8 }]}>
            {fraseMotivacional.split(' - ')[1]}
          </Text>
          <Ionicons name="school" size={60} color={tema.textoLogo} style={styles.watermark} />
        </View>

        {/* SEÇÃO: TURMAS DE HOJE */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: tema.textoPrincipal }]}>Turmas de hoje</Text>
          <TouchableOpacity onPress={() => router.push('/(tabs)/turmas')}>
            <Text style={[styles.btnVerTodas, { color: tema.botaoPrimario }]}>Ver todas {'>'}</Text>
          </TouchableOpacity>
        </View>

        {/* LISTA DE TURMAS */}
        {turmasDeHoje.map((turma) => (
          <TouchableOpacity 
            key={turma.id} 
            style={[styles.cardTurma, { backgroundColor: tema.inputBackground, borderColor: tema.borda }]}
            activeOpacity={0.7}
            onPress={() => router.push('/chamada')}
          >
            <View style={[styles.iconeTurmaBg, { backgroundColor: tema.botaoPrimario + '20' }]}>
              <Ionicons name="people" size={24} color={tema.botaoPrimario} />
            </View>
            <View style={styles.infoTurma}>
              <Text style={[styles.nomeTurma, { color: tema.textoPrincipal }]}>{turma.nome}</Text>
              <Text style={[styles.materiaTurma, { color: tema.textoSecundario }]}>{turma.materia}</Text>
              
              <View style={styles.detalhesTurmaMinimalista}>
                <Ionicons name="time" size={14} color={tema.botaoPrimario} />
                <Text style={[styles.textoHorarioDestaque, { color: tema.botaoPrimario }]}>
                  {turma.horario} • {turma.turno}
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color={tema.icone} />
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* POPUP (MODAL) DE NOTIFICAÇÕES */}
      <Modal
        visible={modalNotificacoes}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setModalNotificacoes(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay} 
          activeOpacity={1} 
          onPress={() => setModalNotificacoes(false)} // Fecha se clicar fora
        >
          <TouchableOpacity activeOpacity={1} style={[styles.modalContent, { backgroundColor: tema.fundoBase }]}>
            
            <View style={[styles.modalHeader, { borderBottomColor: tema.borda }]}>
              <Text style={[styles.modalTitle, { color: tema.textoPrincipal }]}>Notificações</Text>
              <TouchableOpacity onPress={() => setModalNotificacoes(false)} style={styles.btnFecharModal}>
                <Ionicons name="close" size={24} color={tema.textoSecundario} />
              </TouchableOpacity>
            </View>

            <FlatList
              data={notificacoes}
              keyExtractor={(item) => item.id}
              renderItem={renderNotificacao}
              contentContainerStyle={{ padding: 20 }}
              showsVerticalScrollIndicator={false}
              ListEmptyComponent={
                <Text style={{ textAlign: 'center', marginTop: 20, color: tema.textoSecundario }}>
                  Você não tem novas notificações.
                </Text>
              }
            />
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: 20, paddingTop: 50, paddingBottom: 20 }, 
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 25 },
  headerTextContainer: { flex: 1 },
  headerActions: { flexDirection: 'row', alignItems: 'center' },
  iconButton: { marginRight: 15, position: 'relative', padding: 5 },
  notificationBadge: { position: 'absolute', top: 0, right: 0, minWidth: 16, height: 16, borderRadius: 8, backgroundColor: '#DB4437', borderWidth: 1, borderColor: '#FFF', justifyContent: 'center', alignItems: 'center' },
  badgeText: { color: '#FFF', fontSize: 9, fontWeight: 'bold' },
  tituloSaudacao: { fontSize: 20, fontWeight: 'bold' },
  subtituloSaudacao: { fontSize: 13, marginTop: 2 },
  avatar: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, justifyContent: 'center', alignItems: 'center' },
  banner: { width: '100%', padding: 20, borderRadius: 15, marginBottom: 30, position: 'relative', overflow: 'hidden', elevation: 3 },
  textoBanner: { fontSize: 15, fontWeight: 'bold', fontStyle: 'italic', marginBottom: 10, zIndex: 2, lineHeight: 22 },
  assinaturaBanner: { fontSize: 12, fontWeight: '600', zIndex: 2, alignSelf: 'flex-end' },
  watermark: { position: 'absolute', left: -10, bottom: -15, opacity: 0.2, transform: [{ rotate: '15deg' }] },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold' },
  btnVerTodas: { fontSize: 14, fontWeight: '600' },
  cardTurma: { flexDirection: 'row', alignItems: 'center', padding: 15, borderRadius: 12, borderWidth: 1, marginBottom: 12 },
  iconeTurmaBg: { width: 50, height: 50, borderRadius: 25, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  infoTurma: { flex: 1 },
  nomeTurma: { fontSize: 16, fontWeight: 'bold' },
  materiaTurma: { fontSize: 14, marginBottom: 5 },
  detalhesTurmaMinimalista: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  textoHorarioDestaque: { fontSize: 13, fontWeight: 'bold', marginLeft: 6 },
  
  // ESTILOS DO MODAL
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { height: '70%', borderTopLeftRadius: 25, borderTopRightRadius: 25, elevation: 10 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1 },
  modalTitle: { fontSize: 18, fontWeight: 'bold' },
  btnFecharModal: { padding: 5 },
  cardNotificacao: { flexDirection: 'row', padding: 15, borderRadius: 12, borderWidth: 1, marginBottom: 12 },
  tituloNotificacao: { fontSize: 15, fontWeight: 'bold', marginBottom: 4 },
  mensagemNotificacao: { fontSize: 13, lineHeight: 18, marginBottom: 6 },
  tempoNotificacao: { fontSize: 11, fontStyle: 'italic' },
  btnMarcarLido: { justifyContent: 'center', alignItems: 'center', marginLeft: 10, paddingHorizontal: 5 }
});