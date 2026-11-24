import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Platform, KeyboardAvoidingView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useDemoProfile } from '../../contexts/demoProfileContext';

export default function AvaliacoesScreen() {
  const router = useRouter();
  const { perfil, temaAtivo: tema } = useDemoProfile();

  const avaliacoesProfessor = [
    { id: '1', titulo: '1ª Avaliação Bimestral', turma: '6º Ano A', materia: 'Matemática', periodo: '15/09 a 22/09', status: 'fechado' },
    { id: '2', titulo: 'Teste Mensal', turma: '7º Ano B', materia: 'Matemática', periodo: '10/09 a 14/09', status: 'fechado' },
  ];

  const acompanhamentoCoordenador = [
    { id: '1', turma: '6º Ano A', avaliacao: '1ª Av. Bimestral', materia: 'Matemática', professor: 'Prof. Luffy Baiano', statusPrazo: 'fechado', status: 'andamento' },
    { id: '2', turma: '7º Ano B', avaliacao: '1ª Av. Bimestral', materia: 'Física', professor: 'Prof. Carlos', statusPrazo: 'aberto', status: 'concluido' },
    { id: '3', turma: '8º Ano A', avaliacao: '1ª Av. Bimestral', materia: 'Química', professor: 'Profª Ana', statusPrazo: 'aberto', status: 'pendente' },
  ];

  return (
    <KeyboardAvoidingView style={[styles.container, { backgroundColor: tema.fundoBase }]} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={[styles.header, { backgroundColor: tema.fundoTopo }]}>
        <View style={styles.headerTopRow}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.titulo, { color: tema.textoLogo }]}>Gestão de Avaliações</Text>
            <Text style={[styles.subtitulo, { color: tema.textoLogo, opacity: 0.85 }]}>
              {perfil === 'professor' ? 'Lançamento de notas e prazos' : perfil === 'coordenador' ? 'Acompanhamento pedagógico por professor' : 'Acompanhamento geral das avaliações'}
            </Text>
          </View>
          <View style={[styles.badgePerfil, { backgroundColor: 'rgba(255,255,255,0.16)' }]}>
            <Text style={[styles.perfilAtivo, { color: tema.textoLogo }]}>
              {perfil === 'admin' ? 'Administrador' : perfil === 'coordenador' ? 'Coordenador' : 'Professor'}
            </Text>
          </View>
        </View>
      </View>

      {perfil === 'professor' ? (
        <FlatList
          data={avaliacoesProfessor}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={<Text style={[styles.sectionTitle, { color: tema.textoPrincipal }]}>Prazos de Lançamento Ativos</Text>}
          renderItem={({ item }) => {
            const isOpen = item.status === 'aberto';
            return (
              <TouchableOpacity
                style={[styles.card, { backgroundColor: tema.inputBackground, borderColor: tema.borda }]}
                activeOpacity={0.75}
                onPress={() => router.push({ pathname: '/notas', params: { avaliacao: item.titulo, turma: item.turma, materia: item.materia, status: item.status } })}
              >
                <View style={styles.cardHeader}>
                  <Text style={[styles.cardTitle, { color: tema.textoPrincipal }]}>{item.titulo}</Text>
                  <View style={[styles.badge, { backgroundColor: isOpen ? '#E8F5E9' : '#FFEBEE' }]}>
                    <Text style={[styles.badgeText, { color: isOpen ? '#2E7D32' : '#C62828' }]}>{isOpen ? 'Período Aberto' : 'Encerrado'}</Text>
                  </View>
                </View>
                <Text style={[styles.cardSub, { color: tema.textoSecundario }]}>{item.turma} • {item.materia}</Text>
                <View style={styles.infoRow}>
                  <Ionicons name="calendar-outline" size={16} color={tema.icone} />
                  <Text style={[styles.infoText, { color: tema.textoSecundario }]}>Prazo: {item.periodo}</Text>
                </View>
                <View style={[styles.actionButton, { backgroundColor: isOpen ? tema.botaoPrimario : tema.fundoBase, borderColor: tema.borda, borderWidth: isOpen ? 0 : 1 }]}>
                  <Text style={[styles.actionButtonText, { color: isOpen ? tema.textoBotao : tema.textoPrincipal }]}>{isOpen ? 'Acessar Planilha' : 'Ver Solicitações'}</Text>
                </View>
              </TouchableOpacity>
            );
          }}
        />
      ) : (
        <FlatList
          data={acompanhamentoCoordenador}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <Text style={[styles.sectionTitle, { color: tema.textoPrincipal }]}>
              {perfil === 'admin' ? 'Visão geral das avaliações' : 'Status de Lançamento por Professor'}
            </Text>
          }
          renderItem={({ item }) => {
            const statusCor = item.status === 'concluido' ? '#2E7D32' : item.status === 'andamento' ? tema.botaoPrimario : '#E65100';
            const statusTexto = item.status === 'concluido' ? 'Concluído' : item.status === 'andamento' ? 'Em andamento' : 'Pendente';
            return (
              <TouchableOpacity
                style={[styles.card, { backgroundColor: tema.inputBackground, borderColor: tema.borda }]}
                activeOpacity={0.75}
                onPress={() => router.push({ pathname: '/notas', params: { avaliacao: item.avaliacao, turma: item.turma, materia: item.materia, status: item.statusPrazo } })}
              >
                <View style={styles.cardHeader}>
                  <Text style={[styles.cardTitle, { color: tema.textoPrincipal }]}>{item.turma}</Text>
                  <Text style={{ color: statusCor, fontWeight: '800', fontSize: 13 }}>{statusTexto}</Text>
                </View>
                <Text style={[styles.cardSub, { color: tema.textoSecundario }]}>{item.avaliacao} • {item.materia}</Text>
                <View style={styles.infoRow}>
                  <Ionicons name="person-outline" size={16} color={tema.icone} />
                  <Text style={[styles.infoText, { color: tema.textoSecundario }]}>Responsável: {item.professor}</Text>
                </View>
              </TouchableOpacity>
            );
          }}
        />
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingTop: 56, paddingBottom: 20, paddingHorizontal: 20, borderBottomLeftRadius: 22, borderBottomRightRadius: 22, elevation: 5 },
  headerTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10 },
  titulo: { fontSize: 22, fontWeight: 'bold' },
  subtitulo: { fontSize: 13, marginTop: 3 },
  badgePerfil: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 },
  perfilAtivo: { fontSize: 11, fontWeight: 'bold' },
  listContent: { padding: 20, paddingBottom: 40 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 14 },
  card: { borderWidth: 1, borderRadius: 14, padding: 15, marginBottom: 14 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6, gap: 8 },
  cardTitle: { fontSize: 16, fontWeight: 'bold', flex: 1 },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10 },
  badgeText: { fontSize: 11, fontWeight: 'bold' },
  cardSub: { fontSize: 14, marginBottom: 10, fontWeight: '600' },
  infoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  infoText: { fontSize: 13, marginLeft: 6 },
  actionButton: { height: 42, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginTop: 8 },
  actionButtonText: { fontSize: 14, fontWeight: 'bold' },
});