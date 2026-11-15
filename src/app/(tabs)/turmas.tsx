import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, useColorScheme, TextInput, KeyboardAvoidingView, Platform, RefreshControl, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { cores } from '../../constants/colors';
import { useRouter } from 'expo-router';

import { useAuth } from '../../contexts/authContext';
import { useGradeTurmas } from '../../hooks/use-grade-turmas';
import { nomesPerfis } from '../../types/usuario';
import type { Turma } from '../../types/turma';

export default function TurmasScreen() {
  const router = useRouter();
  const isDarkMode = useColorScheme() === 'dark';
  const tema = isDarkMode ? cores.dark : cores.light;

  const [busca, setBusca] = useState('');
  
  const { dadosPerfil } = useAuth();
  const { turmas, chamadasHoje: chamadasRealizadasHoje, turmasInvalidas, diariosHoje, calendario, carregando, erro, erroIndicadores, atualizar: buscarDadosTurmas } = useGradeTurmas();

  const diaAtual = calendario.diaSemana;
  const dataHeader = calendario.cabecalho.charAt(0).toUpperCase() + calendario.cabecalho.slice(1);
  const turmasFiltradas = turmas.filter(t => 
    t.nome.toLowerCase().includes(busca.toLowerCase()) || 
    t.diaSemana.toLowerCase().includes(busca.toLowerCase()) ||
    t.horario.includes(busca) ||
    (t.professorNome && t.professorNome.toLowerCase().includes(busca.toLowerCase())) 
  );

  const renderTurma = ({ item }: { item: Turma }) => {
    // A MÁGICA AQUI: O status é derivado se a turma tiver registo hoje!
    const horaRealizada = chamadasRealizadasHoje[item.id];
    const isRealizada = !!horaRealizada; 

    const isDiaDaAula = item.diaId === diaAtual;
    const diarioId = diariosHoje[item.id];

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
                  {erroIndicadores ? 'INDICADOR INDISPONÍVEL' : isRealizada ? 'REGISTRADA HOJE' : isDiaDaAula ? 'SEM DIÁRIO IDENTIFICADO' : 'SEM AULA HOJE'}
                </Text>
              </View>
            </View>
            
            <Text style={[styles.materiaTurma, { color: tema.textoSecundario }]}>{item.disciplina}</Text>
            
            <View style={styles.detalhesGrade}>
              {item.alunos !== undefined && (
                <View style={styles.detalheRow}>
                  <Ionicons name="person" size={12} color={tema.textoSecundario} />
                  <Text style={[styles.textoDetalhe, { color: tema.textoSecundario }]}> {item.alunos} alunos</Text>
                </View>
              )}
              <View style={styles.detalheRow}>
                <Ionicons name="time" size={14} color={tema.botaoPrimario} />
                <Text style={[styles.textoHorario, { color: tema.botaoPrimario }]}> {item.diaSemana} • {item.horario}</Text>
              </View>
              {item.professorNome && (
                <View style={[styles.detalheRow, { marginTop: 2 }]}>
                  <Ionicons name="person-circle-outline" size={14} color={tema.textoSecundario} />
                  <Text style={[styles.textoProf, { color: tema.textoSecundario }]}> Prof. {item.professorNome}</Text>
                </View>
              )}
            </View>
          </View>
        </View>

        {diarioId ? (
          <TouchableOpacity style={[styles.rodapeAcao, { borderTopColor: tema.borda }]}
            onPress={() => router.push({ pathname: '/chamada', params: { id: item.id, chamadaId: diarioId } })}>
            <Text style={[styles.textoAcao, { color: tema.botaoPrimario }]}>Consultar diário • {horaRealizada}</Text>
            <Ionicons name="chevron-forward" size={18} color={tema.botaoPrimario} />
          </TouchableOpacity>
        ) : (
          <View style={[styles.rodapeAcao, { borderTopColor: tema.borda }]}>
            <Text style={[styles.textoAcao, { color: tema.textoSecundario }]}>{erroIndicadores ? 'Consulta diária indisponível' : isDiaDaAula ? 'Registro de chamada indisponível' : 'Sem aula prevista hoje'}</Text>
            <Ionicons name="lock-closed" size={16} color={tema.textoSecundario} />
          </View>
        )}
      </View>
    );
  };

  return (
    <KeyboardAvoidingView style={[styles.container, { backgroundColor: tema.fundoBase }]} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={[styles.header, { backgroundColor: tema.fundoTopo }]}>
        <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'}}>
          <Text style={[styles.tituloHeader, { color: tema.textoLogo }]}>Grade de Aulas</Text>
          <Text style={{color: tema.textoLogo, opacity: 0.5, fontSize: 12}}>Modo: {dadosPerfil ? nomesPerfis[dadosPerfil.role] : 'Indisponível'}</Text>
        </View>
        <Text style={[styles.subtituloData, { color: tema.textoLogo }]}>{dataHeader}</Text>
        
        <View style={[styles.searchContainer, { backgroundColor: tema.inputBackground, borderColor: tema.borda }]}>
          <Ionicons name="search" size={20} color={tema.textoSecundario} style={styles.searchIcon} />
          <TextInput 
            style={[styles.searchInput, { color: tema.textoPrincipal }]}
            placeholder="Buscar turma, professor ou horário..." 
            placeholderTextColor={tema.textoSecundario} 
            value={busca}
            onChangeText={setBusca}
          />
        </View>
      </View>

      <Text style={{ color: tema.textoSecundario, padding: 12 }}>Criação e assinatura indisponíveis. Diários anteriores permanecem no Histórico; registros sem data confiável não recebem status diário.</Text>
      {erroIndicadores && <Text accessibilityRole="alert" style={{ color: tema.textoPrincipal, padding: 12 }}>{erroIndicadores.mensagem}</Text>}
      {turmasInvalidas > 0 && <Text style={{ color: tema.textoSecundario, padding: 12 }}>Algumas turmas possuem dados inválidos e não puderam ser exibidas.</Text>}
      {erro ? (
        <View style={{ padding: 20 }}>
          <Text accessibilityRole="alert" style={{ color: tema.textoPrincipal }}>{erro.mensagem}</Text>
          <TouchableOpacity onPress={() => { void buscarDadosTurmas(); }}><Text style={{ color: tema.botaoPrimario }}>Tentar novamente</Text></TouchableOpacity>
        </View>
      ) : carregando ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={tema.botaoPrimario} />
          <Text style={{ marginTop: 10, color: tema.textoSecundario }}>Carregando Grade...</Text>
        </View>
      ) : (
        <FlatList 
          data={turmasFiltradas} 
          keyExtractor={(item) => item.id}
          renderItem={renderTurma}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={carregando} onRefresh={buscarDadosTurmas} tintColor={tema.botaoPrimario} />}
          ListEmptyComponent={<Text style={{ textAlign: 'center', marginTop: 20, color: tema.textoSecundario }}>Nenhuma turma encontrada.</Text>}
        />
      )}
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
  detalhesGrade: { gap: 2 },
  detalheRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 2 },
  textoDetalhe: { fontSize: 12 },
  textoHorario: { fontSize: 12, fontWeight: 'bold' },
  textoProf: { fontSize: 12, fontStyle: 'italic' },
  
  rodapeAcao: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 12, borderTopWidth: 1 },
  textoAcao: { fontSize: 13, fontWeight: 'bold' }
});