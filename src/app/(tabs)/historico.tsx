import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, useColorScheme, TextInput, KeyboardAvoidingView, Platform, RefreshControl, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { cores } from '../../constants/colors';
import { db } from '../../config/firebase';
import { useLeituraAcademica } from '../../hooks/use-leitura-academica';
import { buscarHistoricoAutorizado } from '../../services/chamadas';
import type { IdentidadeGrade } from '../../services/turmas';

const consultar = (identidade: IdentidadeGrade, vigente: () => boolean) => buscarHistoricoAutorizado(db, identidade, vigente);

export default function HistoricoScreen() {
  const router = useRouter();
  const tema = useColorScheme() === 'dark' ? cores.dark : cores.light;
  const [abaAtiva, setAbaAtiva] = useState('frequencia');
  const [busca, setBusca] = useState('');
  const { dados, carregando, erro, atualizar } = useLeituraAcademica(consultar);
  const texto = busca.toLocaleLowerCase();
  const chamadas = (dados?.chamadas ?? []).filter(c => `${c.turmaNome} ${c.dataFormatada}`.toLocaleLowerCase().includes(texto));
  const turmas = (dados?.turmas ?? []).filter(t => `${t.nome} ${t.disciplina}`.toLocaleLowerCase().includes(texto));

  return (
    <KeyboardAvoidingView style={[styles.container, { backgroundColor: tema.fundoBase }]} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={[styles.header, { backgroundColor: tema.fundoTopo }]}>
        <Text style={[styles.tituloHeader, { color: tema.textoLogo }]}>Central de Consultas</Text>
        <Text style={[styles.subtituloHeader, { color: tema.textoLogo }]}>Auditoria de faltas e desempenho</Text>
        <View style={styles.tabContainer}>
          {['frequencia', 'notas'].map(aba => (
            <TouchableOpacity key={aba} style={[styles.tabButton, abaAtiva === aba && { backgroundColor: 'rgba(255,255,255,0.2)' }]} onPress={() => { setAbaAtiva(aba); setBusca(''); }}>
              <Text style={[styles.tabText, { color: tema.textoLogo }]}>{aba === 'frequencia' ? 'Diários de Classe' : 'Alunos e Notas'}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <View style={[styles.searchContainer, { backgroundColor: tema.inputBackground, borderColor: tema.borda }]}>
          <Ionicons name="search" size={20} color={tema.textoSecundario} style={styles.searchIcon} />
          <TextInput style={[styles.searchInput, { color: tema.textoPrincipal }]} placeholder={abaAtiva === 'frequencia' ? 'Pesquisar por turma ou data...' : 'Pesquisar por turma ou matéria...'} placeholderTextColor={tema.textoSecundario} value={busca} onChangeText={setBusca} />
        </View>
      </View>
      {carregando ? <View style={{ padding: 30 }}><ActivityIndicator /><Text style={{ color: tema.textoPrincipal }}>Consultando registros autorizados...</Text></View>
        : erro ? <View style={{ padding: 20 }}><Text accessibilityRole="alert" style={{ color: tema.textoPrincipal }}>{erro.mensagem}</Text><TouchableOpacity onPress={() => { void atualizar(); }}><Text style={{ color: tema.botaoPrimario }}>Tentar novamente</Text></TouchableOpacity></View>
        : abaAtiva === 'frequencia' ? (
          <FlatList data={chamadas} keyExtractor={item => item.id} contentContainerStyle={styles.listContent}
            refreshControl={<RefreshControl refreshing={carregando} onRefresh={atualizar} />}
            ListHeaderComponent={(dados?.turmasInvalidas || dados?.chamadasInvalidas) ? <Text style={{ color: tema.textoSecundario }}>Alguns registros inválidos não puderam ser exibidos.</Text> : undefined}
            ListEmptyComponent={<Text style={{ color: tema.textoSecundario }}>{dados?.turmas.length ? 'Nenhum diário encontrado.' : 'Nenhuma turma vinculada disponível.'}</Text>}
            renderItem={({ item }) => (
              <TouchableOpacity style={[styles.cardItem, { backgroundColor: tema.inputBackground, borderColor: tema.borda, marginBottom: 15 }]}
                onPress={() => router.push({ pathname: '/chamada', params: { id: item.turmaId, chamadaId: item.id } })}>
                <View style={styles.linhaCabecalho}><Text style={[styles.tituloAtividade, { color: tema.textoPrincipal }]}>Diário registrado</Text><Text style={[styles.textoData, { color: tema.textoSecundario }]}>{item.dataFormatada}</Text></View>
                <Text style={[styles.textoTurma, { color: tema.textoPrincipal }]}>{item.turmaNome}</Text>
                <Text style={{ color: tema.textoSecundario }}>{item.presentes} presentes sem falta e {item.faltas} alunos com falta.</Text>
              </TouchableOpacity>
            )} />
        ) : (
          <FlatList data={turmas} keyExtractor={item => item.id} contentContainerStyle={styles.listContent}
            refreshControl={<RefreshControl refreshing={carregando} onRefresh={atualizar} />}
            ListHeaderComponent={<Text style={{ color: tema.textoSecundario, marginBottom: 15 }}>Os boletins anteriores eram demonstrativos. Alunos e notas ainda não estão integrados; somente suas turmas autorizadas são apresentadas.</Text>}
            ListEmptyComponent={<Text style={{ color: tema.textoSecundario }}>Nenhuma turma autorizada encontrada.</Text>}
            renderItem={({ item }) => <View style={[styles.cardPasta, { backgroundColor: tema.inputBackground, borderColor: tema.borda, marginBottom: 15 }]}><View><Text style={[styles.tituloPasta, { color: tema.textoPrincipal }]}>{item.nome}</Text><Text style={{ color: tema.textoSecundario }}>{item.disciplina} • Notas indisponíveis</Text></View></View>} />
        )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingTop: 50, paddingBottom: 20, paddingHorizontal: 20, elevation: 5, borderBottomLeftRadius: 20, borderBottomRightRadius: 20 },
  tituloHeader: { fontSize: 24, fontWeight: 'bold' },
  subtituloHeader: { fontSize: 13, opacity: 0.8, marginBottom: 15, marginTop: 2 },
  
  tabContainer: { flexDirection: 'row', backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: 10, padding: 4, marginBottom: 15 },
  tabButton: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 8 },
  tabText: { fontSize: 13, fontWeight: 'bold' },
  
  searchContainer: { flexDirection: 'row', alignItems: 'center', height: 45, borderRadius: 10, borderWidth: 1, paddingHorizontal: 10 },
  searchIcon: { marginRight: 8 }, searchInput: { flex: 1, height: '100%', fontSize: 14 },
  
  listContent: { padding: 20, paddingBottom: 40 },
  cardItem: { borderWidth: 1, borderRadius: 12, padding: 15, overflow: 'hidden' },
  linhaCabecalho: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 },
  linhaTitulo: { flexDirection: 'row', alignItems: 'center' },
  tituloAtividade: { fontSize: 15, fontWeight: 'bold' },
  textoData: { fontSize: 11, fontStyle: 'italic', marginTop: 3 },
  
  corpoCard: { paddingLeft: 26 },
  textoTurma: { fontSize: 13, fontWeight: '700', marginBottom: 4 }, textoDetalhe: { fontSize: 13 },
  
  iconePessoa: { width: 34, height: 34, borderRadius: 17, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  badgeMedia: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  textoMedia: { fontSize: 12, fontWeight: 'bold' },
  
  gradeNotas: { flexDirection: 'row', justifyContent: 'space-between', paddingTop: 12, marginTop: 5, borderTopWidth: 1 },
  colunaNota: { alignItems: 'center', flex: 1 },
  labelUnidade: { fontSize: 11, marginBottom: 4 },
  valorNota: { fontSize: 14, fontWeight: 'bold' },

  // ESTILOS DAS PASTAS
  cardPasta: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1, borderRadius: 12, padding: 15 },
  tituloPasta: { fontSize: 16, fontWeight: 'bold' },
  conteudoPasta: { paddingLeft: 15, paddingTop: 10, borderLeftWidth: 2, borderLeftColor: 'rgba(0,0,0,0.05)', marginLeft: 15, marginTop: 5 }
});