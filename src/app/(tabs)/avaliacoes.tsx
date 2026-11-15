import React from 'react';
import { View, Text, StyleSheet, FlatList, useColorScheme, KeyboardAvoidingView, Platform, ActivityIndicator, RefreshControl, TouchableOpacity } from 'react-native';
import { cores } from '../../constants/colors';
import { useAuth } from '../../contexts/authContext';
import { nomesPerfis } from '../../types/usuario';
import { db } from '../../config/firebase';
import { listarTurmasAutorizadas, type IdentidadeGrade } from '../../services/turmas';
import { useLeituraAcademica } from '../../hooks/use-leitura-academica';

const consultar = (identidade: IdentidadeGrade, vigente: () => boolean) => listarTurmasAutorizadas(db, identidade, vigente);

export default function AvaliacoesScreen() {
  const tema = useColorScheme() === 'dark' ? cores.dark : cores.light;
  const { dadosPerfil } = useAuth();
  const { dados, erro, carregando, atualizar } = useLeituraAcademica(consultar);
  const titulo = dadosPerfil?.role === 'professor' ? 'Suas turmas' : dadosPerfil?.role === 'coordenador' ? 'Turmas sob sua coordenação' : 'Turmas da instituição';
  return (
    <KeyboardAvoidingView style={[styles.container, { backgroundColor: tema.fundoBase }]} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={[styles.header, { backgroundColor: tema.fundoTopo }]}>
        <Text style={[styles.titulo, { color: tema.textoLogo }]}>Gestão de Avaliações</Text>
        <Text style={[styles.subtitulo, { color: tema.textoLogo }]}>{dadosPerfil ? nomesPerfis[dadosPerfil.role] : 'Perfil indisponível'}</Text>
      </View>
      {carregando ? <View style={{ padding: 20 }}><ActivityIndicator /><Text style={{ color: tema.textoPrincipal }}>Verificando acesso...</Text></View>
        : erro ? <View style={{ padding: 20 }}><Text accessibilityRole="alert" style={{ color: tema.textoPrincipal }}>{erro.mensagem}</Text><TouchableOpacity onPress={() => { void atualizar(); }}><Text style={{ color: tema.botaoPrimario }}>Tentar novamente</Text></TouchableOpacity></View>
        : <FlatList data={dados?.turmas ?? []} keyExtractor={item => item.id} contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={carregando} onRefresh={atualizar} />}
          ListHeaderComponent={<View><Text style={{ color: tema.textoSecundario, marginBottom: 15 }}>As avaliações anteriores eram demonstrativas. Avaliações e lançamento de notas estão indisponíveis até a definição e integração dos dados reais.</Text><Text style={[styles.sectionTitle, { color: tema.textoPrincipal }]}>{titulo}</Text>{!!dados?.turmasInvalidas && <Text style={{ color: tema.textoSecundario }}>Algumas turmas possuem dados inválidos.</Text>}</View>}
          ListEmptyComponent={<Text style={{ color: tema.textoSecundario }}>Nenhuma turma vinculada disponível.</Text>}
          renderItem={({ item }) => <View style={[styles.card, { backgroundColor: tema.inputBackground, borderColor: tema.borda }]}><Text style={[styles.cardTitle, { color: tema.textoPrincipal }]}>{item.nome}</Text><Text style={[styles.cardSub, { color: tema.textoSecundario }]}>{item.disciplina}</Text><Text style={{ color: tema.textoSecundario }}>Avaliações ainda não integradas</Text></View>} />}
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