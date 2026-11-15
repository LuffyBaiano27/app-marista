import React, { useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, useColorScheme, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { cores } from '../constants/colors';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { db } from '../config/firebase';
import { useCalendarioBahia } from '../hooks/use-calendario-bahia';
import { useLeituraAcademica } from '../hooks/use-leitura-academica';
import { buscarDiarioAutorizado } from '../services/chamadas';
import type { IdentidadeGrade } from '../services/turmas';

export default function ChamadaScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string | string[]; chamadaId?: string | string[] }>();
  const id = typeof params.id === 'string' ? params.id : '';
  const chamadaId = Array.isArray(params.chamadaId) ? '/' : params.chamadaId;
  const tema = useColorScheme() === 'dark' ? cores.dark : cores.light;
  const calendario = useCalendarioBahia();
  const dataConsulta = chamadaId === undefined ? calendario.data : '';
  const consultar = useCallback((identidade: IdentidadeGrade, vigente: () => boolean) => buscarDiarioAutorizado(db, identidade, id, chamadaId, vigente, dataConsulta), [id, chamadaId, dataConsulta]);
  const { dados, erro, carregando, atualizar } = useLeituraAcademica(consultar, JSON.stringify([id, chamadaId, dataConsulta]));
  const voltar = () => { if (router.canGoBack()) router.back(); else router.replace('/(tabs)/historico'); };
  return (
    <View style={[styles.container, { backgroundColor: tema.fundoBase }]}>
      <View style={[styles.header, { backgroundColor: tema.fundoTopo }]}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={voltar} style={styles.btnVoltar}><Ionicons name="arrow-back" size={26} color={tema.textoLogo} /></TouchableOpacity>
          <View style={{ flex: 1 }}><Text style={[styles.titulo, { color: tema.textoLogo }]}>Registro de Frequência</Text><Text style={[styles.subtitulo, { color: tema.textoLogo }]}>{dados ? `${dados.turma.nome} • ${dados.turma.disciplina}` : 'Consulta autorizada'}</Text></View>
        </View>
        <View style={[styles.statusContainer, { backgroundColor: 'rgba(255,255,255,0.2)' }]}><Ionicons name="lock-closed" size={16} color="#FFF" /><Text style={styles.textoStatus}>Somente leitura</Text></View>
      </View>
      {carregando ? <View style={{ padding: 20 }}><ActivityIndicator /><Text style={{ color: tema.textoPrincipal }}>Verificando acesso ao diário...</Text></View>
        : erro ? <View style={{ padding: 20 }}><Text accessibilityRole="alert" style={{ color: tema.textoPrincipal }}>{erro.mensagem}</Text><TouchableOpacity onPress={() => { void atualizar(); }}><Text style={{ color: tema.botaoPrimario }}>Tentar novamente</Text></TouchableOpacity></View>
        : <FlatList data={dados?.chamada?.alunos ?? []} keyExtractor={item => item.id} contentContainerStyle={styles.listContent}
          ListHeaderComponent={<View style={{ marginBottom: 20 }}><Text style={{ color: tema.textoPrincipal }}>Criação e assinatura de chamadas temporariamente indisponíveis. O contrato acadêmico está em definição.</Text>{dados?.chamada && <Text style={{ color: tema.textoSecundario }}>{dados.chamada.dataFormatada} • {dados.turma.horario}</Text>}</View>}
          ListEmptyComponent={<Text style={{ color: tema.textoSecundario }}>{dados?.chamada ? 'Este diário não contém alunos registrados.' : 'Nenhum diário com data confiável identificado para hoje nesta turma.'}</Text>}
          renderItem={({ item }) => <View style={[styles.cardAluno, { backgroundColor: tema.inputBackground, borderColor: tema.borda }]}>
            <Text style={[styles.nomeAluno, { color: tema.textoPrincipal }]}>{item.nome}</Text>
            <View style={[styles.areaBotoes, { marginVertical: 10 }]}>{item.presencas.map((presente, i) => <View key={i} style={{ marginRight: 12 }}><Text style={{ color: tema.textoSecundario }}>Aula {i + 1}</Text><Ionicons name={presente ? 'checkbox' : 'square-outline'} size={28} color={presente ? '#2E7D32' : '#C62828'} accessibilityLabel={presente ? 'Presente' : 'Ausente'} /></View>)}</View>
            {!!item.obs && <Text style={{ color: tema.textoSecundario }}>{item.obs}</Text>}
          </View>} />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingTop: 40, paddingBottom: 20, paddingHorizontal: 20, elevation: 5 },
  headerRow: { flexDirection: 'row', alignItems: 'center' },
  btnVoltar: { marginRight: 15 },
  titulo: { fontSize: 20, fontWeight: 'bold' },
  subtituloRow: { marginTop: 4 },
  subtitulo: { fontSize: 14, fontWeight: '600' },
  statusContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 15, paddingVertical: 8, borderRadius: 8 },
  textoStatus: { color: '#FFF', fontSize: 13, fontWeight: 'bold', marginLeft: 8 },
  
  colunasHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 10, borderBottomWidth: 1 },
  colunaAlunoTexto: { fontSize: 12, fontWeight: 'bold', flex: 1 },
  colunasAcoes: { flexDirection: 'row', alignItems: 'center', gap: 15 },
  colunaInfo: { alignItems: 'center', width: 60 },
  textoHorarioCol: { fontSize: 11, fontWeight: 'bold' },
  textoHoraMinuto: { fontSize: 9, marginTop: 2 },
  colunaObs: { width: 30, alignItems: 'center' },

  listContent: { padding: 15, paddingBottom: 120 },
  cardAluno: { borderWidth: 1, borderRadius: 12, marginBottom: 8, overflow: 'hidden' },
  linhaPrincipal: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 12 },
  infoAluno: { flex: 1, justifyContent: 'center' },
  nomeAluno: { fontSize: 15, fontWeight: 'bold' },
  badgeFalta: { fontSize: 11, fontWeight: 'bold', marginTop: 2 },
  
  areaBotoes: { flexDirection: 'row', alignItems: 'center', gap: 15 },
  checkboxContainer: { width: 60, alignItems: 'center', justifyContent: 'center' },
  btnAcaoExtra: { width: 30, alignItems: 'center', justifyContent: 'center' },
  
  areaObs: { paddingHorizontal: 12, paddingBottom: 12, borderTopWidth: 1, paddingTop: 12 },
  inputObs: { borderWidth: 1, borderRadius: 8, padding: 10, minHeight: 60, textAlignVertical: 'top', fontSize: 13 },
  
  rodapeContainer: { position: 'absolute', bottom: 0, width: '100%', padding: 20, borderTopLeftRadius: 20, borderTopRightRadius: 20, elevation: 10 },
  resumoRow: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 15 },
  textoResumo: { fontSize: 14, fontWeight: 'bold' },
  btnConcluir: { flexDirection: 'row', height: 50, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  textoBtnConcluir: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContent: { width: '100%', borderRadius: 20, padding: 25, alignItems: 'center', elevation: 10 },
  iconeSeguranca: { width: 80, height: 80, borderRadius: 40, justifyContent: 'center', alignItems: 'center', marginBottom: 15 },
  tituloModal: { fontSize: 20, fontWeight: 'bold', marginBottom: 10 },
  textoModal: { fontSize: 14, textAlign: 'center', lineHeight: 20, marginBottom: 20 },
  inputContainer: { flexDirection: 'row', alignItems: 'center', width: '100%', height: 50, borderWidth: 1, borderRadius: 10, paddingHorizontal: 15, marginBottom: 25 },
  inputSenha: { flex: 1, height: '100%', fontSize: 16 },
  modalBotoes: { flexDirection: 'row', width: '100%', justifyContent: 'space-between' },
  btnCancelar: { flex: 1, height: 45, justifyContent: 'center', alignItems: 'center', marginRight: 10 },
  btnConfirmar: { flex: 1, height: 45, justifyContent: 'center', alignItems: 'center', borderRadius: 8 }
});