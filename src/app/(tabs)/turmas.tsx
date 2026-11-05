import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, useColorScheme, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { cores } from '../../constants/colors';
import { useRouter } from 'expo-router';

export default function TurmasScreen() {
  const router = useRouter();
  const isDarkMode = useColorScheme() === 'dark';
  const tema = isDarkMode ? cores.dark : cores.light;

  const [busca, setBusca] = useState('');
  const hoje = new Date();
  const diaAtual = hoje.getDay(); 
  
  const dataFormatada = hoje.toLocaleDateString('pt-BR', { 
    weekday: 'long', 
    day: 'numeric', 
    month: 'long' 
  });
  const dataHeader = dataFormatada.charAt(0).toUpperCase() + dataFormatada.slice(1);

  const [turmas, setTurmas] = useState([
    { 
      id: '1', nome: '6º Ano A', materia: 'Matemática', alunos: 32, 
      diaSemana: 'Segunda-feira', horario: '07:00 às 07:50', status: 'pendente', 
      diaId: 1, 
      dataRealizada: null 
    },
    { 
      id: '2', nome: '7º Ano B', materia: 'Matemática', alunos: 28, 
      diaSemana: 'Terça-feira', horario: '07:50 às 08:40', status: 'realizada', 
      diaId: 2, 
      dataRealizada: '26/10 às 08:45' 
    },
    { 
      id: '3', nome: '8º Ano A', materia: 'Matemática', alunos: 30, 
      diaSemana: 'Quarta-feira', horario: '09:00 às 09:50', status: 'pendente', 
      diaId: 3, 
      dataRealizada: null 
    },
  ]);

  const turmasFiltradas = turmas.filter(t => t.nome.toLowerCase().includes(busca.toLowerCase()) || t.diaSemana.toLowerCase().includes(busca.toLowerCase()));

  const renderTurma = ({ item }: { item: any }) => {
    const isRealizada = item.status === 'realizada';
    const isDiaDaAula = item.diaId === diaAtual; 
    const isBloqueado = !isRealizada && !isDiaDaAula;

    return (
      <View style={[styles.cardTurma, { backgroundColor: tema.inputBackground, borderColor: tema.borda }]}>
        <View style={styles.corpoCard}>
          <View style={[styles.iconeTurmaBg, { backgroundColor: tema.botaoPrimario + '20' }]}>
            <Ionicons name="people" size={24} color={tema.botaoPrimario} />
          </View>
          
          <View style={styles.infoTurma}>
            <View style={styles.linhaTitulo}>
              <Text style={[styles.nomeTurma, { color: tema.textoPrincipal }]}>{item.nome}</Text>
              
              <View style={[styles.badgeStatus, { backgroundColor: isRealizada ? '#E8F5E9' : '#FFF3E0', borderColor: isRealizada ? '#A5D6A7' : '#FFCC80' }]}>
                <Text style={[styles.textoBadge, { color: isRealizada ? '#2E7D32' : '#EF6C00' }]}>
                  {isRealizada ? 'REALIZADA' : 'PENDENTE'}
                </Text>
              </View>
            </View>
            
            <Text style={[styles.materiaTurma, { color: tema.textoSecundario }]}>{item.materia}</Text>
            
            <View style={styles.detalheRow}>
              <Ionicons name="person" size={12} color={tema.textoSecundario} />
              <Text style={[styles.textoDetalhe, { color: tema.textoSecundario }]}> {item.alunos} alunos</Text>
            </View>
            
            <View style={styles.detalheRow}>
              <Ionicons name="time" size={14} color={tema.botaoPrimario} />
              <Text style={[styles.textoHorario, { color: tema.botaoPrimario }]}> {item.diaSemana} • {item.horario}</Text>
            </View>
          </View>
        </View>

        <TouchableOpacity 
          style={[styles.rodapeAcao, { borderTopColor: tema.borda }]}
          disabled={isBloqueado} 
          onPress={() => router.push('/chamada')}
        >
          {isRealizada ? (
            <>
              <Text style={[styles.textoAcao, { color: tema.botaoPrimario }]}>
                Ver detalhes <Text style={{ fontStyle: 'italic', fontSize: 11 }}>(Chamada realizada {item.dataRealizada})</Text>
              </Text>
              <Ionicons name="chevron-forward" size={18} color={tema.botaoPrimario} />
            </>
          ) : isBloqueado ? (
            <>
              <Text style={[styles.textoAcao, { color: tema.textoSecundario }]}>Fora do dia da aula</Text>
              <Ionicons name="lock-closed" size={16} color={tema.textoSecundario} />
            </>
          ) : (
            <>
              <Text style={[styles.textoAcao, { color: tema.botaoPrimario }]}>Fazer chamada</Text>
              <Ionicons name="chevron-forward" size={18} color={tema.botaoPrimario} />
            </>
          )}
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView style={[styles.container, { backgroundColor: tema.fundoBase }]} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={[styles.header, { backgroundColor: tema.fundoTopo }]}>
        <Text style={[styles.tituloHeader, { color: tema.textoLogo }]}>Grade de Aulas</Text>
        <Text style={[styles.subtituloData, { color: tema.textoLogo }]}>{dataHeader}</Text>
        
        <View style={[styles.searchContainer, { backgroundColor: tema.inputBackground, borderColor: tema.borda }]}>
          <Ionicons name="search" size={20} color={tema.textoSecundario} style={styles.searchIcon} />
          <TextInput 
            style={[styles.searchInput, { color: tema.textoPrincipal }]}
            placeholder="Buscar turma, dia ou horário..." 
            placeholderTextColor={tema.textoSecundario} 
            value={busca}
            onChangeText={setBusca}
          />
        </View>
      </View>

      <FlatList 
        data={turmasFiltradas} 
        keyExtractor={(item) => item.id}
        renderItem={renderTurma}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingTop: 50, paddingBottom: 20, paddingHorizontal: 20, elevation: 5, borderBottomLeftRadius: 20, borderBottomRightRadius: 20 },
  tituloHeader: { fontSize: 24, fontWeight: 'bold' },
  subtituloData: { fontSize: 13, opacity: 0.8, marginBottom: 20, marginTop: 2 },
  searchContainer: { flexDirection: 'row', alignItems: 'center', height: 45, borderRadius: 10, borderWidth: 1, paddingHorizontal: 10 },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, height: '100%', fontSize: 14 },
  
  listContent: { padding: 20, paddingBottom: 40 },
  cardTurma: { borderWidth: 1, borderRadius: 12, marginBottom: 15, overflow: 'hidden' },
  corpoCard: { flexDirection: 'row', padding: 15 },
  iconeTurmaBg: { width: 45, height: 45, borderRadius: 22.5, justifyContent: 'center', alignItems: 'center', marginRight: 15, marginTop: 5 },
  infoTurma: { flex: 1 },
  linhaTitulo: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  nomeTurma: { fontSize: 16, fontWeight: 'bold' },
  badgeStatus: { borderWidth: 1, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12 },
  textoBadge: { fontSize: 10, fontWeight: 'bold' },
  materiaTurma: { fontSize: 13, marginBottom: 8 },
  detalheRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  textoDetalhe: { fontSize: 12 },
  textoHorario: { fontSize: 12, fontWeight: 'bold' },
  
  rodapeAcao: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 12, borderTopWidth: 1 },
  textoAcao: { fontSize: 13, fontWeight: 'bold' }
});