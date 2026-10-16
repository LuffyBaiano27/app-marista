import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, useColorScheme, KeyboardAvoidingView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { cores } from '../../constants/colors';

export default function TurmasScreen() {
  const isDarkMode = useColorScheme() === 'dark';
  const tema = isDarkMode ? cores.dark : cores.light;
  const [busca, setBusca] = useState('');

  // Dados atualizados com dia da semana e quantidade de alunos
  const [turmas, setTurmas] = useState([
    { id: '1', nome: '6º Ano A', materia: 'Matemática', alunos: 32, dia: 'Segunda-feira', horario: '07:00 às 07:50', statusChamada: 'pendente' },
    { id: '2', nome: '7º Ano B', materia: 'Matemática', alunos: 28, dia: 'Terça-feira', horario: '07:50 às 08:40', statusChamada: 'realizada' },
    { id: '3', nome: '8º Ano A', materia: 'Matemática', alunos: 30, dia: 'Quarta-feira', horario: '09:00 às 09:50', statusChamada: 'pendente' },
    { id: '4', nome: '9º Ano C', materia: 'Matemática', alunos: 31, dia: 'Quinta-feira', horario: '10:10 às 11:00', statusChamada: 'pendente' },
  ]);

  // Filtro que busca por nome da turma, dia ou horário
  const turmasFiltradas = turmas.filter(turma => 
    turma.nome.toLowerCase().includes(busca.toLowerCase()) || 
    turma.dia.toLowerCase().includes(busca.toLowerCase()) ||
    turma.horario.includes(busca)
  );

  const renderCardTurma = ({ item }: { item: any }) => {
    const isRealizada = item.statusChamada === 'realizada';

    return (
      <TouchableOpacity 
        style={[styles.card, { backgroundColor: tema.inputBackground, borderColor: tema.borda }]}
        activeOpacity={0.7}
      >
        <View style={styles.cardContent}>
          {/* Ícone Redondo (Igual ao Index) */}
          <View style={[styles.iconeTurmaBg, { backgroundColor: tema.botaoPrimario + '20' }]}>
            <Ionicons name="people" size={24} color={tema.botaoPrimario} />
          </View>

          {/* Informações da Turma */}
          <View style={styles.infoTurma}>
            <View style={styles.infoHeader}>
              <Text style={[styles.nomeTurma, { color: tema.textoPrincipal }]}>{item.nome}</Text>
              <View style={[styles.badgeStatus, { backgroundColor: isRealizada ? '#E8F5E9' : '#FFF3E0' }]}>
                <Text style={[styles.textoStatus, { color: isRealizada ? '#2E7D32' : '#E65100' }]}>
                  {isRealizada ? 'Realizada' : 'Pendente'}
                </Text>
              </View>
            </View>

            <Text style={[styles.materiaTurma, { color: tema.textoSecundario }]}>{item.materia}</Text>
            
            <View style={styles.detalhesTurma}>
              <Ionicons name="person" size={12} color={tema.textoSecundario} />
              <Text style={[styles.textoDetalhe, { color: tema.textoSecundario }]}> {item.alunos} alunos</Text>
            </View>
            
            {/* Destaque Minimalista do Horário */}
            <View style={styles.detalhesTurmaMinimalista}>
              <Ionicons name="time" size={14} color={tema.botaoPrimario} />
              <Text style={[styles.textoHorarioDestaque, { color: tema.botaoPrimario }]}>
                {item.dia} • {item.horario}
              </Text>
            </View>
          </View>
        </View>

        {/* Rodapé de Ação */}
        <View style={[styles.cardFooter, { borderTopColor: tema.borda }]}>
          <Text style={[styles.textoAcao, { color: tema.botaoPrimario }]}>
            {isRealizada ? 'Ver detalhes' : 'Fazer chamada'}
          </Text>
          <Ionicons name="chevron-forward" size={18} color={tema.botaoPrimario} />
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <KeyboardAvoidingView style={[styles.container, { backgroundColor: tema.fundoBase }]} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      
      <View style={[styles.header, { backgroundColor: tema.fundoTopo }]}>
        <Text style={[styles.titulo, { color: tema.textoLogo }]}>Grade de Aulas</Text>
        <Text style={[styles.subtitulo, { color: tema.textoLogo, opacity: 0.8 }]}>Quinta-feira, 17 de Setembro</Text>
      </View>

      <View style={styles.searchContainer}>
        <View style={[styles.searchInputContainer, { backgroundColor: tema.inputBackground, borderColor: tema.borda }]}>
          <Ionicons name="search" size={20} color={tema.icone} style={styles.searchIcon} />
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
        renderItem={renderCardTurma}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <Text style={[styles.emptyText, { color: tema.textoSecundario }]}>Nenhuma turma encontrada.</Text>
        }
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingTop: 60, paddingBottom: 20, paddingHorizontal: 20, borderBottomLeftRadius: 20, borderBottomRightRadius: 20, elevation: 5 },
  titulo: { fontSize: 24, fontWeight: 'bold' },
  subtitulo: { fontSize: 14, marginTop: 4 },
  searchContainer: { padding: 20, paddingBottom: 10 },
  searchInputContainer: { flexDirection: 'row', alignItems: 'center', height: 50, borderWidth: 1, borderRadius: 10, paddingHorizontal: 15 },
  searchIcon: { marginRight: 10 },
  searchInput: { flex: 1, fontSize: 16 },
  listContent: { padding: 20, paddingBottom: 40 },
  card: { borderWidth: 1, borderRadius: 12, marginBottom: 16, overflow: 'hidden' },
  cardContent: { flexDirection: 'row', padding: 15, paddingBottom: 12 },
  iconeTurmaBg: { width: 50, height: 50, borderRadius: 25, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  infoTurma: { flex: 1 },
  infoHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 },
  nomeTurma: { fontSize: 16, fontWeight: 'bold' },
  badgeStatus: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  textoStatus: { fontSize: 11, fontWeight: 'bold', textTransform: 'uppercase' },
  materiaTurma: { fontSize: 14, marginBottom: 5 },
  detalhesTurma: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  textoDetalhe: { fontSize: 12 },
  detalhesTurmaMinimalista: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
  textoHorarioDestaque: { fontSize: 13, fontWeight: 'bold', marginLeft: 4 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 12, paddingHorizontal: 15, borderTopWidth: 1 },
  textoAcao: { fontSize: 14, fontWeight: 'bold' },
  emptyText: { textAlign: 'center', marginTop: 30, fontSize: 16 }
});