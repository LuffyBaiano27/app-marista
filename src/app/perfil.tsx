import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, useColorScheme, ScrollView, Alert, Platform, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { cores } from '../constants/colors';
import { useRouter } from 'expo-router';
import { db } from '../config/firebase';
import { useAuth } from '../contexts/authContext';
import { nomesPerfis, type IdentidadeUsuario } from '../types/usuario';
import { useLeituraAcademica } from '../hooks/use-leitura-academica';
import { listarChamadosSuporte } from '../services/suporte';
import { FUSO_ACADEMICO } from '../utils/calendario';

const consultar = (identidade: IdentidadeUsuario, vigente: () => boolean) => listarChamadosSuporte(db, identidade, vigente);

export default function PerfilScreen() {
  const router = useRouter();
  const tema = useColorScheme() === 'dark' ? cores.dark : cores.light;
  const { usuario, dadosPerfil, encerrarSessao } = useAuth();
  const { dados, erro, carregando, atualizar } = useLeituraAcademica(consultar);
  const [saindo, setSaindo] = useState(false);
  const [erroLogout, setErroLogout] = useState<string | null>(null);
  const nome = dadosPerfil?.nome || usuario?.displayName?.trim() || 'Nome não informado';
  const partes = nome.split(/\s+/).filter(Boolean);
  const iniciais = dadosPerfil?.nome ? `${partes[0][0]}${partes.length > 1 ? partes[partes.length - 1][0] : ''}`.toUpperCase() : '?';
  const admin = dadosPerfil?.ativo === true && dadosPerfil.role === 'admin';
  const sair = async () => {
    if (saindo) return;
    setSaindo(true); setErroLogout(null);
    try { await encerrarSessao(); }
    catch { setSaindo(false); setErroLogout('Não foi possível encerrar a sessão. Tente novamente.'); }
  };
  const confirmarSaida = () => {
    if (Platform.OS === 'web') {
      if (window.confirm('Deseja sair do sistema Violeta?')) void sair();
    } else Alert.alert('Encerrar sessão', 'Deseja sair do sistema Violeta?', [
      { text: 'Cancelar', style: 'cancel' }, { text: 'Sair', style: 'destructive', onPress: () => { void sair(); } },
    ]);
  };
  return (
    <ScrollView style={[styles.container, { backgroundColor: tema.fundoBase }]}>
      <View style={[styles.header, { backgroundColor: tema.fundoTopo }]}>
        <View style={styles.headerTopRow}><TouchableOpacity accessibilityLabel="Voltar" onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')} style={styles.btnVoltar}><Ionicons name="arrow-back" size={26} color={tema.textoLogo} /></TouchableOpacity></View>
        <View style={styles.avatarContainer}><Text style={styles.avatarText}>{iniciais}</Text></View>
        <Text style={[styles.nomeUsuario, { color: tema.textoLogo }]}>{nome}</Text>
        <Text style={{ color: tema.textoLogo }}>{dadosPerfil ? nomesPerfis[dadosPerfil.role] : 'Perfil indisponível'}</Text>
        <Text style={[styles.emailUsuario, { color: tema.textoLogo }]}>{usuario?.email || 'E-mail não informado'}</Text>
      </View>
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: tema.textoPrincipal }]}>Sua conta</Text>
        <View style={[styles.cardMenu, { padding: 16, backgroundColor: tema.inputBackground, borderColor: tema.borda }]}>
          <Text style={{ color: tema.textoSecundario }}>Os dados acima representam sua conta autenticada. Edição de cadastro e alteração de senha não estão disponíveis nesta versão.</Text>
        </View>
      </View>
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: tema.textoPrincipal }]}>{admin ? 'Gerenciar chamados' : 'Seus chamados de suporte'}</Text>
        <Text style={{ color: tema.textoSecundario, marginBottom: 12 }}>Envio e resolução de chamados estarão disponíveis após a validação de segurança da etapa F2.</Text>
        <View style={{ flexDirection: 'row', gap: 12, marginBottom: 16 }}>
          <TouchableOpacity disabled accessibilityState={{ disabled: true }} style={[styles.menuItem, { opacity: 0.5, borderBottomColor: tema.borda }]}><Text style={{ color: tema.textoSecundario }}>Novo chamado indisponível</Text></TouchableOpacity>
          <TouchableOpacity onPress={() => { void atualizar(); }} disabled={carregando} style={styles.menuItem}><Text style={{ color: tema.botaoPrimario }}>Atualizar</Text></TouchableOpacity>
        </View>
        {carregando ? <ActivityIndicator /> : erro ? <Text accessibilityRole="alert" style={{ color: tema.textoPrincipal }}>{erro.mensagem}</Text>
          : <>
            {!!dados?.invalidos && <Text style={{ color: tema.textoSecundario }}>Alguns chamados possuem dados inválidos e não puderam ser exibidos.</Text>}
            {!dados?.chamados.length && <Text style={{ color: tema.textoSecundario }}>Nenhum chamado encontrado.</Text>}
            {dados?.chamados.map(chamado => <View key={chamado.id} style={[styles.cardMenu, { padding: 16, marginBottom: 12, backgroundColor: tema.inputBackground, borderColor: tema.borda }]}>
              <Text style={{ color: tema.textoPrincipal }}>{chamado.descricao}</Text>
              <Text style={{ color: tema.textoSecundario }}>{chamado.status === 'pendente' ? 'Pendente' : 'Resolvido'}</Text>
              <Text style={{ color: tema.textoSecundario }}>{chamado.criadoEmMs === null ? 'Data não informada' : new Date(chamado.criadoEmMs).toLocaleString('pt-BR', { timeZone: FUSO_ACADEMICO })}</Text>
              {admin && <Text style={{ color: tema.textoSecundario }}>{chamado.solicitanteUid ? `Solicitante UID: ${chamado.solicitanteUid}` : 'Solicitante não identificado no registro legado'}</Text>}
              {admin && chamado.status === 'pendente' && <TouchableOpacity disabled accessibilityState={{ disabled: true }} style={{ marginTop: 10, opacity: 0.5 }}><Text style={{ color: tema.textoSecundario }}>Resolução indisponível até a F2</Text></TouchableOpacity>}
            </View>)}
          </>}
      </View>
      <View style={styles.section}><Text style={[styles.sectionTitle, { color: tema.textoPrincipal }]}>Sistema Violeta</Text><Text style={{ color: tema.textoSecundario }}>Gestão educacional. Funções administrativas de provisionamento não são disponibilizadas pelo aplicativo.</Text></View>
      <View style={[styles.section, { marginBottom: 40 }]}>
        {erroLogout && <Text accessibilityRole="alert" style={{ color: tema.textoPrincipal }}>{erroLogout}</Text>}
        <TouchableOpacity style={styles.menuItem} disabled={saindo} onPress={confirmarSaida}><Text style={{ color: '#C62828' }}>{saindo ? 'Encerrando sessão...' : 'Encerrar sessão'}</Text></TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { alignItems: 'center', paddingTop: 50, paddingBottom: 30, borderBottomLeftRadius: 30, borderBottomRightRadius: 30, elevation: 5 },
  headerTopRow: { width: '100%', flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 20, marginBottom: 10 },
  btnVoltar: { padding: 5 },
  avatarContainer: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#FFF', justifyContent: 'center', alignItems: 'center', marginBottom: 15 },
  avatarText: { fontSize: 32, fontWeight: 'bold', color: '#1565C0' },
  nomeUsuario: { fontSize: 22, fontWeight: 'bold', marginBottom: 5 },
  badgeCargo: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12, marginBottom: 8 },
  textoBadge: { color: '#FFF', fontSize: 12, fontWeight: 'bold' }, emailUsuario: { fontSize: 14, opacity: 0.8 },
  section: { paddingHorizontal: 20, marginTop: 25 }, sectionTitle: { fontSize: 12, fontWeight: '900', marginBottom: 8, marginLeft: 5 },
  cardMenu: { borderWidth: 1, borderRadius: 16, overflow: 'hidden' },
  menuItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 15, paddingHorizontal: 15, borderBottomWidth: StyleSheet.hairlineWidth },
  iconContainer: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  menuTextContainer: { flex: 1 }, menuTitle: { fontSize: 15, fontWeight: 'bold' }, menuSubtitle: { fontSize: 12, marginTop: 2 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center' },
  modalOverlayFull: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', paddingTop: 40 },
  modalContentFull: { flex: 1, borderTopLeftRadius: 25, borderTopRightRadius: 25 },
  modalOverlayHalf: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalContentHalf: { borderTopLeftRadius: 25, borderTopRightRadius: 25, paddingBottom: 40 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1 },
  modalTitle: { fontSize: 18, fontWeight: 'bold' }, btnFecharModal: { padding: 5 }, modalBody: { padding: 20 },
  topicoSeguranca: { fontSize: 13, fontWeight: '900', marginBottom: 15 }, input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 15, height: 50 },
  btnAcaoLargo: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', height: 50, borderRadius: 10, marginTop: 25 },
  textoBtnLargo: { color: '#FFF', fontSize: 15, fontWeight: 'bold' }, linhaSeguranca: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 15, borderWidth: 1, borderRadius: 12 },
  tituloLinha: { fontSize: 15, fontWeight: 'bold' }, subtituloLinha: { fontSize: 12, marginTop: 2 }, cardSessao: { flexDirection: 'row', alignItems: 'center', padding: 15, borderWidth: 1, borderRadius: 12 },
  inputLabel: { fontSize: 14, fontWeight: 'bold', marginBottom: 6 }, inputDisabled: { opacity: 0.6 }, inputAreaEnd: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 15, paddingTop: 15, height: 80 },
  inputArea: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 15, paddingTop: 15, height: 120 }, avatarEdicaoContainer: { alignSelf: 'center', marginBottom: 25 },
  avatarEdicao: { width: 100, height: 100, borderRadius: 50, backgroundColor: '#FFF', justifyContent: 'center', alignItems: 'center' },
  btnAlterarFoto: { position: 'absolute', bottom: 0, right: 0, backgroundColor: '#1565C0', width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center', borderWidth: 3, borderColor: '#FFF' },
  btnPreferencia: { flex: 1, alignItems: 'center', paddingVertical: 12, borderWidth: 1, marginHorizontal: 4, borderRadius: 8 },
  modalVersaoContent: { width: '85%', borderRadius: 25, padding: 35, alignItems: 'center', borderWidth: 1 }, 
  versaoAppNome: { fontSize: 28, fontWeight: '900', letterSpacing: 3, marginBottom: 2 },
  versaoTagline: { fontSize: 12, fontStyle: 'italic', marginBottom: 15, letterSpacing: 1 },
  versaoBadge: { paddingHorizontal: 15, paddingVertical: 6, borderRadius: 20, borderWidth: 1, marginBottom: 20 },
  versaoAppNumero: { fontSize: 12, fontWeight: 'bold' },
  versaoLinha: { width: '40%', borderBottomWidth: 2, marginBottom: 25, opacity: 0.5 },
  tituloCreditos: { fontSize: 10, fontWeight: 'bold', letterSpacing: 2, marginBottom: 10 },
  nomeCredito: { fontSize: 16, marginBottom: 2, letterSpacing: 0.5 },
  versaoCreditosMenor: { fontSize: 11, marginBottom: 5 },
  versaoDireitos: { fontSize: 10, fontStyle: 'italic' }
});