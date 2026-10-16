import React from 'react';
import { 
  View, Text, StyleSheet, FlatList, useColorScheme, Platform, KeyboardAvoidingView 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { cores } from '../../constants/colors';

export default function HistoricoScreen() {
  const isDarkMode = useColorScheme() === 'dark';
  const tema = isDarkMode ? cores.dark : cores.light;

  // Dados Mockados para o Log de Atividades
  const logsAtividade = [
    { id: '1', acao: 'Chamada registrada', turma: '6º Ano A', data: 'Hoje, 08:05', icone: 'checkmark-circle-outline', corIcone: '#2E7D32', detalhes: 'Validada com 32 alunos presentes e 0 faltas.' },
    { id: '2', acao: 'Avaliação lançada', turma: '7º Ano B', data: 'Hoje, 10:30', icone: 'document-text-outline', corIcone: tema.botaoPrimario, detalhes: 'Prova do 1º Bimestre registrada.' },
    { id: '3', acao: 'Chamada registrada', turma: '8º Ano A', data: 'Ontem, 09:15', icone: 'checkmark-circle-outline', corIcone: '#2E7D32', detalhes: 'Validada com 28 alunos presentes e 2 faltas.' },
    { id: '4', acao: 'Edição de chamada', turma: '6º Ano A', data: 'Ontem, 11:00', icone: 'create-outline', corIcone: '#F57C00', detalhes: 'Justificativa de falta inserida (Atestado Médico).' },
  ];

  const renderLog = ({ item }: { item: any }) => (
    <View style={[styles.logCard, { backgroundColor: tema.inputBackground, borderColor: tema.borda }]}>
      <View style={styles.logHeader}>
        <View style={styles.acaoContainer}>
          <Ionicons name={item.icone} size={20} color={item.corIcone} style={styles.iconeLog} />
          <Text style={[styles.textoAcao, { color: tema.textoPrincipal }]}>{item.acao}</Text>
        </View>
        <Text style={[styles.textoData, { color: tema.textoSecundario }]}>{item.data}</Text>
      </View>
      
      <View style={styles.logBody}>
        <Text style={[styles.textoTurma, { color: tema.textoPrincipal }]}>Turma: {item.turma}</Text>
        <Text style={[styles.textoDetalhes, { color: tema.textoSecundario }]}>{item.detalhes}</Text>
      </View>
    </View>
  );

  return (
    <KeyboardAvoidingView style={[styles.container, { backgroundColor: tema.fundoBase }]} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      
      {/* CABEÇALHO */}
      <View style={[styles.header, { backgroundColor: tema.fundoTopo }]}>
        <Text style={[styles.titulo, { color: tema.textoLogo }]}>Histórico de Atividades</Text>
        <Text style={[styles.subtitulo, { color: tema.textoLogo, opacity: 0.8 }]}>Seus últimos registros no sistema</Text>
      </View>

      <FlatList
        data={logsAtividade}
        keyExtractor={(item) => item.id}
        renderItem={renderLog}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingTop: 60, paddingBottom: 20, paddingHorizontal: 20, borderBottomLeftRadius: 20, borderBottomRightRadius: 20, elevation: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4 },
  titulo: { fontSize: 24, fontWeight: 'bold' },
  subtitulo: { fontSize: 14, marginTop: 4 },
  listContent: { padding: 20, paddingBottom: 40 },
  logCard: { borderWidth: 1, borderRadius: 12, padding: 15, marginBottom: 16 },
  logHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  acaoContainer: { flexDirection: 'row', alignItems: 'center' },
  iconeLog: { marginRight: 8 },
  textoAcao: { fontSize: 16, fontWeight: 'bold' },
  textoData: { fontSize: 12, fontWeight: '600' },
  logBody: { paddingLeft: 28 },
  textoTurma: { fontSize: 14, fontWeight: '600', marginBottom: 4 },
  textoDetalhes: { fontSize: 13, lineHeight: 18 }
});