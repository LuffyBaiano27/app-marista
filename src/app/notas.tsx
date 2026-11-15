import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, useColorScheme } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { cores } from '../constants/colors';
import { useAuth } from '../contexts/authContext';
import { nomesPerfis } from '../types/usuario';

export default function NotasScreen() {
  const router = useRouter();
  const tema = useColorScheme() === 'dark' ? cores.dark : cores.light;
  const { dadosPerfil } = useAuth();
  return <View style={[styles.container, { backgroundColor: tema.fundoBase }]}>
    <View style={[styles.header, { backgroundColor: tema.fundoTopo }]}><View style={styles.headerRow}>
      <TouchableOpacity style={styles.btnVoltar} onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)/avaliacoes')}><Ionicons name="arrow-back" size={24} color={tema.textoLogo} /></TouchableOpacity>
      <View><Text style={[styles.titulo, { color: tema.textoLogo }]}>Notas</Text><Text style={{ color: tema.textoLogo }}>{dadosPerfil ? nomesPerfis[dadosPerfil.role] : 'Perfil indisponível'}</Text></View>
    </View></View>
    <View style={{ padding: 20 }}><Text style={{ color: tema.textoPrincipal }}>Lançamento e consulta de notas ainda não integrados. A demonstração foi desativada até a definição dos dados reais e das permissões acadêmicas.</Text></View>
  </View>;
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingTop: 40, paddingBottom: 20, paddingHorizontal: 20, borderBottomLeftRadius: 20, borderBottomRightRadius: 20, elevation: 5 },
  barraTestes: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15, paddingHorizontal: 10, opacity: 0.5 },
  textoTeste: { color: '#FFF', fontSize: 10, fontWeight: 'bold' },
  headerRow: { flexDirection: 'row', alignItems: 'center' },
  btnVoltar: { marginRight: 15 },
  titulo: { fontSize: 20, fontWeight: 'bold' },
  subtituloRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 2, paddingRight: 10 },
  subtitulo: { fontSize: 13 },
  prazoContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 15 },
  avisoPrazo: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  textoAvisoPrazo: { color: '#FFF', fontSize: 11, fontWeight: 'bold', marginLeft: 4 },
  btnEncerrarCoord: { borderWidth: 1, borderColor: '#FFF', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  textoEncerrarCoord: { color: '#FFF', fontSize: 11, fontWeight: 'bold' },
  listContent: { padding: 20, paddingBottom: 40 },
  cardAluno: { borderWidth: 1, borderRadius: 12, marginBottom: 12, overflow: 'hidden' },
  alunoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 15 },
  alunoInfo: { flex: 1 },
  nomeAluno: { fontSize: 16, fontWeight: 'bold' },
  textoAlerta: { fontSize: 11, color: '#E65100', fontWeight: 'bold', marginTop: 4 },
  notaArea: { flexDirection: 'row', alignItems: 'center' },
  
  /* ESTILOS ATUALIZADOS PARA REMOVER A CAIXA CINZA */
  inputNotaContainer: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 },
  inputNota: { fontSize: 16, fontWeight: 'bold', minWidth: 35, textAlign: 'center' },
  displayNotaContainer: { flexDirection: 'row', alignItems: 'baseline' }, // baseline alinha os números pelo chão
  textoNota: { fontSize: 22, fontWeight: 'bold' }, // Aumentei a fonte para dar peso visual ao invés da caixa
  textoMaximo: { fontSize: 14, fontWeight: '600' },
  btnIcone: { marginLeft: 12, padding: 4 }, // Ícone um pouco mais espaçado
  
  areaExpandida: { borderTopWidth: 1, padding: 15, backgroundColor: 'rgba(0,0,0,0.02)' },
  labelMotivo: { fontSize: 12, fontWeight: 'bold', marginBottom: 6 },
  inputJustificativa: { borderWidth: 1, borderRadius: 8, padding: 10, height: 70, textAlignVertical: 'top', fontSize: 13 },
  btnEnviarPequeno: { alignSelf: 'flex-end', marginTop: 10, paddingHorizontal: 15, paddingVertical: 8, borderRadius: 6 },
  textoBotaoBranco: { color: '#FFF', fontSize: 12, fontWeight: 'bold' },
  boxLeitura: { padding: 10, borderWidth: 1, borderRadius: 8, marginBottom: 10 },
  textoLeitura: { fontSize: 13, fontStyle: 'italic' },
  rowBotoesAcao: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', marginTop: 5 },
  btnAcaoCoord: { borderWidth: 1, paddingHorizontal: 15, paddingVertical: 8, borderRadius: 6, marginLeft: 10 },
  textoBtnAcaoCoord: { fontSize: 12, fontWeight: 'bold' }
});