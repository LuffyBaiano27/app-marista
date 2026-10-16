import React, { useState } from 'react';
import { 
  View, Text, StyleSheet, TouchableOpacity, useColorScheme, ScrollView, Alert, Modal, TextInput, KeyboardAvoidingView, Platform 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { cores } from '../constants/colors';
import { useRouter } from 'expo-router';

export default function PerfilScreen() {
  const router = useRouter();
  const isDarkMode = useColorScheme() === 'dark';
  const tema = isDarkMode ? cores.dark : cores.light;

  // MOCK: Altere 'cargo' para 'Professor' e veja a opção de enviar aviso sumir magicamente!
  const usuario = {
    nome: 'Larissa Alves',
    email: 'larissa.coord@marista.com',
    cargo: 'Coordenador', 
    iniciais: 'LA'
  };

  // ESTADOS DO MODAL DE COMUNICADO
  const [modalAviso, setModalAviso] = useState(false);
  const [tituloAviso, setTituloAviso] = useState('');
  const [mensagemAviso, setMensagemAviso] = useState('');

  const handleLogout = () => {
    Alert.alert("Sair da Conta", "Tem certeza que deseja sair do sistema?", [
      { text: "Cancelar", style: "cancel" },
      { text: "Sair", style: "destructive", onPress: () => router.replace('/') }
    ]);
  };

  const handleEnviarAviso = () => {
    if (tituloAviso.trim() === '' || mensagemAviso.trim() === '') {
      Alert.alert("Campos Vazios", "Preencha o título e a mensagem para enviar o comunicado.");
      return;
    }
    
    // Futuramente: db.collection('notificacoes').add({...})
    Alert.alert("Sucesso!", "Comunicado enviado para todos os professores.");
    setModalAviso(false);
    setTituloAviso('');
    setMensagemAviso('');
  };

  const MenuOption = ({ icone, titulo, subtitulo = null, corIcone = tema.textoSecundario, danger = false, onPress }: any) => (
    <TouchableOpacity 
      style={[styles.menuItem, { borderBottomColor: tema.borda }]} 
      activeOpacity={0.7} 
      onPress={onPress || (danger ? handleLogout : undefined)}
    >
      <View style={[styles.iconContainer, { backgroundColor: danger ? '#FFEBEE' : tema.inputBackground }]}>
        <Ionicons name={icone} size={20} color={danger ? '#C62828' : corIcone} />
      </View>
      <View style={styles.menuTextContainer}>
        <Text style={[styles.menuTitle, { color: danger ? '#C62828' : tema.textoPrincipal }]}>{titulo}</Text>
        {subtitulo && <Text style={[styles.menuSubtitle, { color: tema.textoSecundario }]}>{subtitulo}</Text>}
      </View>
      {!danger && <Ionicons name="chevron-forward" size={18} color={tema.textoSecundario} opacity={0.5} />}
    </TouchableOpacity>
  );

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView style={[styles.container, { backgroundColor: tema.fundoBase }]} showsVerticalScrollIndicator={false}>
        
        {/* CABEÇALHO DO PERFIL */}
        <View style={[styles.header, { backgroundColor: tema.fundoTopo }]}>
          <View style={styles.headerTopRow}>
            <TouchableOpacity onPress={() => router.back()} style={styles.btnVoltar}>
              <Ionicons name="arrow-back" size={26} color={tema.textoLogo} />
            </TouchableOpacity>
          </View>
          <View style={styles.avatarContainer}>
            <Text style={styles.avatarText}>{usuario.iniciais}</Text>
          </View>
          <Text style={[styles.nomeUsuario, { color: tema.textoLogo }]}>{usuario.nome}</Text>
          <View style={[styles.badgeCargo, { backgroundColor: usuario.cargo === 'Coordenador' ? '#E65100' : 'rgba(255,255,255,0.2)' }]}>
            <Text style={styles.textoBadge}>{usuario.cargo}</Text>
          </View>
          <Text style={[styles.emailUsuario, { color: tema.textoLogo }]}>{usuario.email}</Text>
        </View>

        {/* ÁREA EXCLUSIVA DA COORDENAÇÃO (Só renderiza se for Coordenador) */}
        {usuario.cargo === 'Coordenador' && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: '#E65100' }]}>Painel da Coordenação</Text>
            <View style={[styles.cardMenu, { backgroundColor: tema.inputBackground, borderColor: '#E65100' }]}>
              <MenuOption 
                icone="megaphone-outline" 
                titulo="Emitir Comunicado Geral" 
                subtitulo="Enviar aviso para todos os professores" 
                corIcone="#E65100" 
                onPress={() => setModalAviso(true)}
              />
            </View>
          </View>
        )}

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: tema.textoSecundario }]}>Conta</Text>
          <View style={[styles.cardMenu, { backgroundColor: tema.inputBackground, borderColor: tema.borda }]}>
            <MenuOption icone="person-outline" titulo="Meus Dados" subtitulo="Informações pessoais e senha" corIcone={tema.botaoPrimario} />
            <MenuOption icone="shield-checkmark-outline" titulo="Privacidade e Segurança" corIcone={tema.botaoPrimario} />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: tema.textoSecundario }]}>Suporte e Sobre</Text>
          <View style={[styles.cardMenu, { backgroundColor: tema.inputBackground, borderColor: tema.borda }]}>
            <MenuOption icone="help-circle-outline" titulo="Central de Ajuda" />
            <MenuOption icone="information-circle-outline" titulo="Versão do Aplicativo" subtitulo="v1.0.0 (Beta)" />
          </View>
        </View>

        <View style={[styles.section, { marginTop: 10, marginBottom: 40 }]}>
          <View style={[styles.cardMenu, { backgroundColor: tema.inputBackground, borderColor: tema.borda }]}>
            <MenuOption icone="log-out-outline" titulo="Sair da Conta" danger={true} />
          </View>
        </View>

      </ScrollView>

      {/* MODAL DE EMISSÃO DE COMUNICADO (Exclusivo Coordenação) */}
      <Modal visible={modalAviso} transparent={true} animationType="slide" onRequestClose={() => setModalAviso(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setModalAviso(false)}>
          <TouchableOpacity activeOpacity={1} style={[styles.modalContent, { backgroundColor: tema.fundoBase }]}>
            
            <View style={[styles.modalHeader, { borderBottomColor: tema.borda }]}>
              <Text style={[styles.modalTitle, { color: tema.textoPrincipal }]}>Novo Comunicado</Text>
              <TouchableOpacity onPress={() => setModalAviso(false)} style={styles.btnFecharModal}>
                <Ionicons name="close" size={24} color={tema.textoSecundario} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <Text style={[styles.inputLabel, { color: tema.textoPrincipal }]}>Título do Aviso:</Text>
              <TextInput
                style={[styles.input, { backgroundColor: tema.inputBackground, borderColor: tema.borda, color: tema.textoPrincipal }]}
                placeholder="Ex: Prazos de Notas Fechando"
                placeholderTextColor={tema.textoSecundario}
                value={tituloAviso}
                onChangeText={setTituloAviso}
              />

              <Text style={[styles.inputLabel, { color: tema.textoPrincipal, marginTop: 15 }]}>Mensagem:</Text>
              <TextInput
                style={[styles.inputArea, { backgroundColor: tema.inputBackground, borderColor: tema.borda, color: tema.textoPrincipal }]}
                placeholder="Digite a mensagem para os professores..."
                placeholderTextColor={tema.textoSecundario}
                multiline
                value={mensagemAviso}
                onChangeText={setMensagemAviso}
              />

              <TouchableOpacity style={[styles.btnEnviarAviso, { backgroundColor: '#E65100' }]} onPress={handleEnviarAviso}>
                <Ionicons name="send" size={18} color="#FFF" style={{ marginRight: 8 }} />
                <Text style={styles.textoBtnEnviarAviso}>Enviar para Todos</Text>
              </TouchableOpacity>
            </View>

          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { alignItems: 'center', paddingTop: 50, paddingBottom: 30, borderBottomLeftRadius: 30, borderBottomRightRadius: 30, elevation: 5 },
  headerTopRow: { width: '100%', flexDirection: 'row', justifyContent: 'flex-start', paddingHorizontal: 20, marginBottom: 10 },
  btnVoltar: { padding: 5 },
  avatarContainer: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#FFF', justifyContent: 'center', alignItems: 'center', marginBottom: 15, elevation: 3 },
  avatarText: { fontSize: 32, fontWeight: 'bold', color: '#1565C0' },
  nomeUsuario: { fontSize: 22, fontWeight: 'bold', marginBottom: 5 },
  badgeCargo: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12, marginBottom: 8 },
  textoBadge: { color: '#FFF', fontSize: 12, fontWeight: 'bold' },
  emailUsuario: { fontSize: 14, opacity: 0.8 },
  
  section: { paddingHorizontal: 20, marginTop: 25 },
  sectionTitle: { fontSize: 13, fontWeight: 'bold', textTransform: 'uppercase', marginBottom: 8, marginLeft: 5 },
  cardMenu: { borderWidth: 1, borderRadius: 16, overflow: 'hidden' },
  menuItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 15, paddingHorizontal: 15, borderBottomWidth: StyleSheet.hairlineWidth },
  iconContainer: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  menuTextContainer: { flex: 1 },
  menuTitle: { fontSize: 16, fontWeight: '600' },
  menuSubtitle: { fontSize: 12, marginTop: 2 },

  // ESTILOS DO MODAL
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { borderTopLeftRadius: 25, borderTopRightRadius: 25, elevation: 10, paddingBottom: Platform.OS === 'ios' ? 40 : 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1 },
  modalTitle: { fontSize: 18, fontWeight: 'bold' },
  btnFecharModal: { padding: 5 },
  modalBody: { padding: 20 },
  inputLabel: { fontSize: 14, fontWeight: 'bold', marginBottom: 6 },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 15, height: 50, fontSize: 15 },
  inputArea: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 15, paddingTop: 15, height: 120, fontSize: 15, textAlignVertical: 'top' },
  btnEnviarAviso: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', height: 50, borderRadius: 10, marginTop: 20 },
  textoBtnEnviarAviso: { color: '#FFF', fontSize: 16, fontWeight: 'bold' }
});