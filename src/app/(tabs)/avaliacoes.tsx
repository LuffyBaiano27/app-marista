import React, { useState } from 'react';
import { 
  View, Text, StyleSheet, FlatList, TouchableOpacity, useColorScheme, Platform, KeyboardAvoidingView 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { cores } from '../../constants/colors';
import { useRouter } from 'expo-router';

export default function AvaliacoesScreen() {
  const router = useRouter();
  const isDarkMode = useColorScheme() === 'dark';
  const tema = isDarkMode ? cores.dark : cores.light;

  const [tipoUsuario, setTipoUsuario] = useState<'professor' | 'coordenador'>('professor');

  const avaliacoesProfessor = [
    { id: '1', titulo: '1ª Avaliação Bimestral', turma: '6º Ano A', materia: 'Matemática', periodo: '15/09 a 22/09', status: 'aberto' },
    { id: '2', titulo: 'Teste Mensal', turma: '7º Ano B', materia: 'Matemática', periodo: '10/09 a 14/09', status: 'fechado' },
  ];

  // Adicionado a propriedade 'materia' no mock do coordenador
  const acompanhamentoCoordenador = [
    { id: '1', turma: '6º Ano A', avaliacao: '1ª Av. Bimestral', materia: 'Matemática', professor: 'Prof. João', status: 'andamento' },
    { id: '2', turma: '7º Ano B', avaliacao: '1ª Av. Bimestral', materia: 'Física', professor: 'Prof. Carlos', status: 'concluido' },
    { id: '3', turma: '8º Ano A', avaliacao: '1ª Av. Bimestral', materia: 'Química', professor: 'Profª Ana', status: 'pendente' },
  ];

  return (
    <KeyboardAvoidingView style={[styles.container, { backgroundColor: tema.fundoBase }]} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      
      <View style={[styles.header, { backgroundColor: tema.fundoTopo }]}>
        <View style={styles.headerTopRow}>
          <View>
            <Text style={[styles.titulo, { color: tema.textoLogo }]}>Gestão de Avaliações</Text>
            <Text style={[styles.subtitulo, { color: tema.textoLogo, opacity: 0.8 }]}>
              {tipoUsuario === 'professor' ? 'Lançamento de notas e prazos' : 'Painel de acompanhamento geral'}
            </Text>
          </View>
          <TouchableOpacity style={[styles.btnAlternar, { backgroundColor: tema.fundoBase + '30' }]} onPress={() => setTipoUsuario(tipoUsuario === 'professor' ? 'coordenador' : 'professor')}>
            <Text style={[styles.textoAlternar, { color: tema.textoLogo }]}>Mudar para {tipoUsuario === 'professor' ? 'Coordenador' : 'Professor'}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {tipoUsuario === 'professor' ? (
        <FlatList
          data={avaliacoesProfessor}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={<Text style={[styles.sectionTitle, { color: tema.textoPrincipal }]}>Prazos de Lançamento Ativos</Text>}
          renderItem={({ item }) => {
            const isOpen = item.status === 'aberto';
            return (
              <TouchableOpacity 
                style={[styles.card, { backgroundColor: tema.inputBackground, borderColor: tema.borda }]}
                activeOpacity={0.7}
                // ENVIANDO PARÂMETROS PARA A TELA DE NOTAS
                onPress={() => router.push({ pathname: '/notas', params: { avaliacao: item.titulo, turma: item.turma, materia: item.materia, status: item.status, visao: 'professor' } })}
              >
                <View style={styles.cardHeader}>
                  <Text style={[styles.cardTitle, { color: tema.textoPrincipal }]}>{item.titulo}</Text>
                  <View style={[styles.badge, { backgroundColor: isOpen ? '#E8F5E9' : '#FFEBEE' }]}>
                    <Text style={[styles.badgeText, { color: isOpen ? '#2E7D32' : '#C62828' }]}>{isOpen ? 'Período Aberto' : 'Encerrado'}</Text>
                  </View>
                </View>
                <Text style={[styles.cardSub, { color: tema.textoSecundario }]}>{item.turma} • {item.materia}</Text>
                <View style={styles.infoRow}>
                  <Ionicons name="calendar-outline" size={16} color={tema.textoSecundario} />
                  <Text style={[styles.infoText, { color: tema.textoSecundario }]}> Prazo: {item.periodo}</Text>
                </View>
                <View style={[styles.actionButton, { backgroundColor: isOpen ? tema.botaoPrimario : tema.borda }]}>
                  <Text style={[styles.actionButtonText, { color: isOpen ? tema.textoBotao : tema.textoSecundario }]}>{isOpen ? 'Acessar Planilha' : 'Ver Solicitações'}</Text>
                </View>
              </TouchableOpacity>
            );
          }}
        />
      ) : (
        <FlatList
          data={acompanhamentoCoordenador}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={<Text style={[styles.sectionTitle, { color: tema.textoPrincipal }]}>Status de Lançamento por Professor</Text>}
          renderItem={({ item }) => {
            const statusCor = item.status === 'concluido' ? '#2E7D32' : item.status === 'andamento' ? '#1565C0' : '#E65100';
            const statusTexto = item.status === 'concluido' ? 'Concluído' : item.status === 'andamento' ? 'Em andamento' : 'Pendente';

            return (
              <TouchableOpacity 
                style={[styles.card, { backgroundColor: tema.inputBackground, borderColor: tema.borda }]}
                activeOpacity={0.7}
                // ENVIANDO PARÂMETROS PARA A TELA DE NOTAS
                onPress={() => router.push({ pathname: '/notas', params: { avaliacao: item.avaliacao, turma: item.turma, materia: item.materia, status: 'aberto', visao: 'coordenador' } })}
              >
                <View style={styles.cardHeader}>
                  <Text style={[styles.cardTitle, { color: tema.textoPrincipal }]}>{item.turma}</Text>
                  <Text style={[{ color: statusCor, fontWeight: 'bold', fontSize: 13 }]}>{statusTexto}</Text>
                </View>
                {/* Adicionado a matéria na visualização do coordenador */}
                <Text style={[styles.cardSub, { color: tema.textoSecundario }]}>{item.avaliacao} • {item.materia}</Text>
                <View style={styles.infoRow}>
                  <Ionicons name="person-outline" size={16} color={tema.textoSecundario} />
                  <Text style={[styles.infoText, { color: tema.textoSecundario }]}> Responsável: {item.professor}</Text>
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
  header: { paddingTop: 60, paddingBottom: 20, paddingHorizontal: 20, borderBottomLeftRadius: 20, borderBottomRightRadius: 20, elevation: 5 },
  headerTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  titulo: { fontSize: 22, fontWeight: 'bold' },
  subtitulo: { fontSize: 13, marginTop: 2 },
  btnAlternar: { paddingVertical: 6, paddingHorizontal: 10, borderRadius: 8 },
  textoAlternar: { fontSize: 11, fontWeight: 'bold' },
  listContent: { padding: 20, paddingBottom: 40 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 15 },
  card: { borderWidth: 1, borderRadius: 12, padding: 15, marginBottom: 14 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  cardTitle: { fontSize: 16, fontWeight: 'bold' },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  badgeText: { fontSize: 11, fontWeight: 'bold' },
  cardSub: { fontSize: 14, marginBottom: 10, fontWeight: '600' },
  infoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  infoText: { fontSize: 13, marginLeft: 6 },
  actionButton: { height: 42, borderRadius: 8, justifyContent: 'center', alignItems: 'center', marginTop: 10 },
  actionButtonText: { fontSize: 14, fontWeight: 'bold' }
});