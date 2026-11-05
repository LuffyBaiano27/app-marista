import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, useColorScheme, ScrollView, Alert, Modal, TextInput, KeyboardAvoidingView, Platform, FlatList, Switch } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { cores } from '../constants/colors';
import { useRouter } from 'expo-router';

export default function PerfilScreen() {
  const router = useRouter();
  const isDarkMode = useColorScheme() === 'dark';
  const tema = isDarkMode ? cores.dark : cores.light;

  const [cargoUsuario, setCargoUsuario] = useState('Professor'); 

  const usuario = {
    nome: 'Luffy Baiano',
    email: 'admin@violeta.com',
    cargo: cargoUsuario, 
    iniciais: 'LB'
  };

  // ESTADOS DOS MODAIS GERAIS
  const [modalDados, setModalDados] = useState(false);
  const [modalPrivacidade, setModalPrivacidade] = useState(false);
  const [modalVersao, setModalVersao] = useState(false);
  const [modalAjuda, setModalAjuda] = useState(false);
  const [modalAviso, setModalAviso] = useState(false);
  const [modalAdminChamados, setModalAdminChamados] = useState(false);
  
  // FORMULÁRIOS E SEGURANÇA
  const [formDados, setFormDados] = useState({
    nome: usuario.nome,
    dataNascimento: '15/04/1992',
    endereco: 'Rua das Orquídeas, 123 - Salvador, BA'
  });
  const [formSenha, setFormSenha] = useState({ atual: '', nova: '', confirmacao: '' });
  const [autenticacaoDoisFatores, setAutenticacaoDoisFatores] = useState(false);

  const [textoChamado, setTextoChamado] = useState('');
  const [tituloAviso, setTituloAviso] = useState('');
  const [mensagemAviso, setMensagemAviso] = useState('');
  const [chamadoSelecionado, setChamadoSelecionado] = useState<any>(null);

  // MOCK DE CHAMADOS PARA O ADMIN VER
  const [chamados, setChamados] = useState([
    { id: '1', solicitante: 'Carlos Eduardo (Professor)', data: '03/11/2026', hora: '08:15', descricao: 'Não consigo lançar a nota da aluna Ana Carolina.', status: 'pendente' },
    { id: '2', solicitante: 'Mariana (Coordenadora)', data: '02/11/2026', hora: '14:30', descricao: 'O aplicativo fecha sozinho nos comunicados.', status: 'pendente' },
  ]);

  const handleVoltar = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)');
    }
  };

  const handleLogout = () => {
    Alert.alert("Encerrar Sessão", "Deseja sair do sistema Violeta?", [
      { text: "Cancelar", style: "cancel" },
      { text: "Sair", style: "destructive", onPress: () => router.replace('/') }
    ]);
  };

  const handleSalvarDados = () => {
    Alert.alert("Sucesso", "Seus dados foram atualizados no sistema.");
    setModalDados(false);
  };

  const handleAlertaDesenvolvimento = (recurso: string) => {
    Alert.alert("Em Desenvolvimento", `Módulo: ${recurso}`);
  };

  const resolverChamado = (id: string) => {
    setChamados(prev => prev.map(c => c.id === id ? { ...c, status: 'resolvido' } : c));
    setChamadoSelecionado(null);
    Alert.alert("Sucesso", "Chamado finalizado e arquivado!");
  };

  const MenuOption = ({ icone, titulo, subtitulo = null, corIcone = tema.textoSecundario, danger = false, onPress }: any) => (
    <TouchableOpacity style={[styles.menuItem, { borderBottomColor: tema.borda }]} activeOpacity={0.7} onPress={onPress}>
      <View style={[styles.iconContainer, { backgroundColor: danger ? '#FFEBEE' : tema.inputBackground }]}>
        <Ionicons name={icone} size={20} color={danger ? '#C62828' : corIcone} />
      </View>
      <View style={styles.menuTextContainer}>
        <Text style={[styles.menuTitle, { color: danger ? '#C62828' : tema.textoPrincipal }]}>{titulo}</Text>
        {subtitulo && <Text style={[styles.menuSubtitle, { color: tema.textoSecundario }]}>{subtitulo}</Text>}
      </View>
      <Ionicons name="chevron-forward" size={18} color={tema.textoSecundario} opacity={0.5} />
    </TouchableOpacity>
  );

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView style={[styles.container, { backgroundColor: tema.fundoBase }]} showsVerticalScrollIndicator={false}>
        
        <View style={[styles.header, { backgroundColor: tema.fundoTopo }]}>
          <View style={styles.headerTopRow}>
            <TouchableOpacity onPress={handleVoltar} style={styles.btnVoltar}>
              <Ionicons name="arrow-back" size={26} color={tema.textoLogo} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setCargoUsuario(cargoUsuario === 'Professor' ? 'Coordenador' : cargoUsuario === 'Coordenador' ? 'Admin' : 'Professor')} style={styles.btnToggleCargo}>
              <Text style={{ color: '#FFF', fontSize: 10, fontWeight: 'bold' }}>Simular Perfil</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.avatarContainer}><Text style={styles.avatarText}>{usuario.iniciais}</Text></View>
          <Text style={[styles.nomeUsuario, { color: tema.textoLogo }]}>{usuario.nome}</Text>
          <View style={[styles.badgeCargo, { backgroundColor: cargoUsuario === 'Admin' ? '#D32F2F' : cargoUsuario === 'Coordenador' ? '#E65100' : 'rgba(255,255,255,0.2)' }]}>
            <Text style={styles.textoBadge}>{usuario.cargo}</Text>
          </View>
          <Text style={[styles.emailUsuario, { color: tema.textoLogo }]}>{usuario.email}</Text>
        </View>

        {/* VISÃO EXCLUSIVA DO ADMIN */}
        {cargoUsuario === 'Admin' ? (
          <>
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: '#D32F2F' }]}>Infraestrutura e Permissões</Text>
              <View style={[styles.cardMenu, { backgroundColor: tema.inputBackground, borderColor: '#D32F2F' }]}>
                <MenuOption icone="shield-checkmark" titulo="Controle de Acessos" subtitulo="Aprovar/bloquear usuários" corIcone="#D32F2F" onPress={() => handleAlertaDesenvolvimento('ACL e Usuários')} />
                <MenuOption icone="list-circle" titulo="Logs de Auditoria" subtitulo="Rastrear exclusões e alterações" corIcone="#D32F2F" onPress={() => handleAlertaDesenvolvimento('Auditoria do Sistema')} />
                <MenuOption icone="business" titulo="Dados da Instituição" subtitulo="Ano letivo, feriados e regras" corIcone="#D32F2F" onPress={() => handleAlertaDesenvolvimento('Configurações Globais')} />
              </View>
            </View>
            
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: '#2E7D32' }]}>Banco de Dados</Text>
              <View style={[styles.cardMenu, { backgroundColor: tema.inputBackground, borderColor: '#2E7D32' }]}>
                <MenuOption icone="server" titulo="[DEV] Sincronizar Turmas" subtitulo="Injetar carga de dados inicial" corIcone="#2E7D32" onPress={() => handleAlertaDesenvolvimento('Injeção Firestore')} />
                <MenuOption icone="cloud-download" titulo="Backup do Sistema" subtitulo="Exportar base completa" corIcone="#2E7D32" onPress={() => handleAlertaDesenvolvimento('Backup')} />
              </View>
            </View>
          </>
        ) : (
          /* VISÃO PROFESSOR / COORDENADOR */
          <>
            {cargoUsuario === 'Coordenador' && (
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: '#E65100' }]}>Gestão Acadêmica</Text>
                <View style={[styles.cardMenu, { backgroundColor: tema.inputBackground, borderColor: '#E65100' }]}>
                  <MenuOption icone="megaphone" titulo="Comunicados Oficiais" subtitulo="Mural de professores" corIcone="#E65100" onPress={() => setModalAviso(true)} />
                  <MenuOption icone="lock-open" titulo="Gestão de Prazos" subtitulo="Bloquear diários de classe" corIcone="#E65100" onPress={() => handleAlertaDesenvolvimento('Prazos')} />
                </View>
              </View>
            )}

            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: tema.textoSecundario }]}>Sua Conta</Text>
              <View style={[styles.cardMenu, { backgroundColor: tema.inputBackground, borderColor: tema.borda }]}>
                <MenuOption icone="person" titulo="Meus Dados" corIcone={tema.botaoPrimario} onPress={() => setModalDados(true)} />
                <MenuOption icone="shield-checkmark" titulo="Segurança e Privacidade" corIcone={tema.botaoPrimario} onPress={() => setModalPrivacidade(true)} />
              </View>
            </View>
          </>
        )}

        {/* COMUM A TODOS */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: tema.textoSecundario }]}>Sistema Violeta</Text>
          <View style={[styles.cardMenu, { backgroundColor: tema.inputBackground, borderColor: tema.borda }]}>
            {cargoUsuario === 'Admin' ? (
              <MenuOption icone="construct" titulo="Gerenciar Chamados" subtitulo="Resolver tickets da TI" corIcone="#D32F2F" onPress={() => { setChamadoSelecionado(null); setModalAdminChamados(true); }} />
            ) : (
              <MenuOption icone="help-buoy" titulo="Central de Suporte" subtitulo="Abrir chamado técnico" onPress={() => setModalAjuda(true)} />
            )}
            <MenuOption icone="information-circle" titulo="Sobre o Aplicativo" subtitulo="Créditos e Versão" onPress={() => setModalVersao(true)} />
          </View>
        </View>

        <View style={[styles.section, { marginTop: 10, marginBottom: 40 }]}>
          <View style={[styles.cardMenu, { backgroundColor: tema.inputBackground, borderColor: tema.borda }]}>
            <MenuOption icone="log-out" titulo="Encerrar Sessão" danger={true} onPress={handleLogout} />
          </View>
        </View>
      </ScrollView>

      {/* MODAL: MEUS DADOS */}
      <Modal visible={modalDados} transparent={true} animationType="slide">
        <View style={styles.modalOverlayFull}>
          <View style={[styles.modalContentFull, { backgroundColor: tema.fundoBase }]}>
            <View style={[styles.modalHeader, { borderBottomColor: tema.borda }]}>
              <Text style={[styles.modalTitle, { color: tema.textoPrincipal }]}>Meus Dados</Text>
              <TouchableOpacity onPress={() => setModalDados(false)} style={styles.btnFecharModal}>
                <Ionicons name="close" size={24} color={tema.textoSecundario} />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.modalBody}>
              <View style={styles.avatarEdicaoContainer}>
                <View style={styles.avatarEdicao}><Text style={styles.avatarText}>{usuario.iniciais}</Text></View>
                <TouchableOpacity style={styles.btnAlterarFoto}>
                  <Ionicons name="camera" size={16} color="#FFF" />
                </TouchableOpacity>
              </View>

              <Text style={[styles.inputLabel, { color: tema.textoPrincipal }]}>Nome de Exibição:</Text>
              <TextInput style={[styles.input, { backgroundColor: tema.inputBackground, borderColor: tema.borda, color: tema.textoPrincipal }]} value={formDados.nome} onChangeText={(t) => setFormDados({...formDados, nome: t})} />

              <Text style={[styles.inputLabel, { color: tema.textoPrincipal, marginTop: 15 }]}>E-mail de Cadastro (Bloqueado):</Text>
              <TextInput style={[styles.input, styles.inputDisabled, { backgroundColor: tema.inputBackground, borderColor: tema.borda, color: tema.textoSecundario }]} value={usuario.email} editable={false} selectTextOnFocus={false} />

              <Text style={[styles.inputLabel, { color: tema.textoPrincipal, marginTop: 15 }]}>Data de Nascimento:</Text>
              <TextInput style={[styles.input, { backgroundColor: tema.inputBackground, borderColor: tema.borda, color: tema.textoPrincipal }]} value={formDados.dataNascimento} onChangeText={(t) => setFormDados({...formDados, dataNascimento: t})} />

              <Text style={[styles.inputLabel, { color: tema.textoPrincipal, marginTop: 15 }]}>Endereço Completo:</Text>
              <TextInput style={[styles.inputAreaEnd, { backgroundColor: tema.inputBackground, borderColor: tema.borda, color: tema.textoPrincipal }]} value={formDados.endereco} multiline onChangeText={(t) => setFormDados({...formDados, endereco: t})} />

              <TouchableOpacity style={[styles.btnAcaoLargo, { backgroundColor: tema.botaoPrimario }]} onPress={handleSalvarDados}>
                <Ionicons name="save-outline" size={20} color="#FFF" style={{ marginRight: 8 }} />
                <Text style={styles.textoBtnLargo}>Salvar Alterações</Text>
              </TouchableOpacity>
              <View style={{ height: 40 }} />
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* MODAL: PRIVACIDADE E SEGURANÇA */}
      <Modal visible={modalPrivacidade} transparent={true} animationType="slide">
        <View style={styles.modalOverlayFull}>
          <View style={[styles.modalContentFull, { backgroundColor: tema.fundoBase }]}>
            <View style={[styles.modalHeader, { borderBottomColor: tema.borda }]}>
              <Text style={[styles.modalTitle, { color: tema.textoPrincipal }]}>Segurança e Privacidade</Text>
              <TouchableOpacity onPress={() => setModalPrivacidade(false)} style={styles.btnFecharModal}><Ionicons name="close" size={24} color={tema.textoSecundario} /></TouchableOpacity>
            </View>
            
            <ScrollView style={styles.modalBody}>
              <Text style={[styles.topicoSeguranca, { color: tema.botaoPrimario }]}>Credenciais</Text>
              <TextInput style={[styles.input, { backgroundColor: tema.inputBackground, borderColor: tema.borda, color: tema.textoPrincipal }]} placeholder="Senha Atual" secureTextEntry placeholderTextColor={tema.textoSecundario} />
              <TextInput style={[styles.input, { backgroundColor: tema.inputBackground, borderColor: tema.borda, color: tema.textoPrincipal, marginTop: 10 }]} placeholder="Nova Senha" secureTextEntry placeholderTextColor={tema.textoSecundario} />
              <TouchableOpacity style={[styles.btnAcaoLargo, { backgroundColor: tema.botaoPrimario, marginTop: 15 }]}>
                <Text style={styles.textoBtnLargo}>Atualizar Senha</Text>
              </TouchableOpacity>

              <Text style={[styles.topicoSeguranca, { color: tema.botaoPrimario, marginTop: 30 }]}>Proteção Adicional</Text>
              <View style={[styles.linhaSeguranca, { borderColor: tema.borda, backgroundColor: tema.inputBackground }]}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.tituloLinha, { color: tema.textoPrincipal }]}>Autenticação em 2 Fatores</Text>
                  <Text style={[styles.subtituloLinha, { color: tema.textoSecundario }]}>Exigir código via E-mail ao logar.</Text>
                </View>
                <Switch value={autenticacaoDoisFatores} onValueChange={setAutenticacaoDoisFatores} trackColor={{ false: '#ccc', true: tema.botaoPrimario }} />
              </View>

              <Text style={[styles.topicoSeguranca, { color: tema.botaoPrimario, marginTop: 30 }]}>Sessões Ativas</Text>
              <View style={[styles.cardSessao, { borderColor: tema.borda, backgroundColor: tema.inputBackground }]}>
                <Ionicons name="phone-portrait" size={24} color="#2E7D32" style={{ marginRight: 15 }} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.tituloLinha, { color: tema.textoPrincipal }]}>Este Dispositivo</Text>
                  <Text style={[styles.subtituloLinha, { color: tema.textoSecundario }]}>Salvador, BA • Ativo agora</Text>
                </View>
              </View>

              <Text style={[styles.topicoSeguranca, { color: tema.botaoPrimario, marginTop: 30 }]}>Privacidade (LGPD)</Text>
              <TouchableOpacity style={[styles.btnTransparente, { borderColor: tema.borda }]}>
                <Ionicons name="cloud-download-outline" size={20} color={tema.textoPrincipal} style={{ marginRight: 10 }} />
                <Text style={{ color: tema.textoPrincipal, fontWeight: 'bold' }}>Solicitar cópia dos meus dados</Text>
              </TouchableOpacity>
              
              <View style={{ height: 50 }} />
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* MODAL: ABRIR CHAMADO (Suporte) */}
      <Modal visible={modalAjuda} transparent={true} animationType="slide">
        <TouchableOpacity style={styles.modalOverlayHalf} activeOpacity={1} onPress={() => setModalAjuda(false)}>
          <TouchableOpacity activeOpacity={1} style={[styles.modalContentHalf, { backgroundColor: tema.fundoBase }]}>
            <View style={[styles.modalHeader, { borderBottomColor: tema.borda }]}>
              <Text style={[styles.modalTitle, { color: tema.textoPrincipal }]}>Abrir Chamado</Text>
              <TouchableOpacity onPress={() => setModalAjuda(false)} style={styles.btnFecharModal}><Ionicons name="close" size={24} color={tema.textoSecundario} /></TouchableOpacity>
            </View>
            <View style={styles.modalBody}>
              <Text style={[styles.inputLabel, { color: tema.textoPrincipal }]}>Descreva o problema ou solicitação:</Text>
              <TextInput style={[styles.inputArea, { backgroundColor: tema.inputBackground, borderColor: tema.borda, color: tema.textoPrincipal }]} placeholder="Ex: Erro ao fechar o diário..." placeholderTextColor={tema.textoSecundario} multiline value={textoChamado} onChangeText={setTextoChamado} />
              <TouchableOpacity style={[styles.btnAcaoLargo, { backgroundColor: tema.botaoPrimario }]} onPress={() => { Alert.alert("Sucesso", "Chamado enviado para a TI."); setModalAjuda(false); setTextoChamado(''); }}>
                <Text style={styles.textoBtnLargo}>Enviar Ticket</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* MODAL: COMUNICADOS (Coordenador) */}
      <Modal visible={modalAviso} transparent={true} animationType="slide">
        <TouchableOpacity style={styles.modalOverlayHalf} activeOpacity={1} onPress={() => setModalAviso(false)}>
          <TouchableOpacity activeOpacity={1} style={[styles.modalContentHalf, { backgroundColor: tema.fundoBase }]}>
            <View style={[styles.modalHeader, { borderBottomColor: tema.borda }]}>
              <Text style={[styles.modalTitle, { color: tema.textoPrincipal }]}>Novo Comunicado Geral</Text>
              <TouchableOpacity onPress={() => setModalAviso(false)} style={styles.btnFecharModal}><Ionicons name="close" size={24} color={tema.textoSecundario} /></TouchableOpacity>
            </View>
            <View style={styles.modalBody}>
              <Text style={[styles.inputLabel, { color: tema.textoPrincipal }]}>Título do Aviso:</Text>
              <TextInput style={[styles.input, { backgroundColor: tema.inputBackground, borderColor: tema.borda, color: tema.textoPrincipal }]} value={tituloAviso} onChangeText={setTituloAviso} />
              <Text style={[styles.inputLabel, { color: tema.textoPrincipal, marginTop: 15 }]}>Mensagem:</Text>
              <TextInput style={[styles.inputArea, { backgroundColor: tema.inputBackground, borderColor: tema.borda, color: tema.textoPrincipal }]} multiline value={mensagemAviso} onChangeText={setMensagemAviso} />
              <TouchableOpacity style={[styles.btnAcaoLargo, { backgroundColor: '#E65100' }]} onPress={() => { Alert.alert("Enviado", "Mural atualizado com sucesso."); setModalAviso(false); setTituloAviso(''); setMensagemAviso(''); }}>
                <Text style={styles.textoBtnLargo}>Publicar Aviso</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* MODAL: GERENCIAR CHAMADOS (Admin) */}
      <Modal visible={modalAdminChamados} transparent={true} animationType="slide">
        <View style={styles.modalOverlayFull}>
          <View style={[styles.modalContentFull, { backgroundColor: tema.fundoBase }]}>
            <View style={[styles.modalHeader, { borderBottomColor: tema.borda }]}>
              {chamadoSelecionado ? (
                <TouchableOpacity onPress={() => setChamadoSelecionado(null)} style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Ionicons name="arrow-back" size={24} color={tema.textoPrincipal} />
                  <Text style={[styles.modalTitle, { color: tema.textoPrincipal, marginLeft: 10 }]}>Voltar</Text>
                </TouchableOpacity>
              ) : (
                <Text style={[styles.modalTitle, { color: tema.textoPrincipal }]}>Tickets da TI</Text>
              )}
              <TouchableOpacity onPress={() => setModalAdminChamados(false)} style={styles.btnFecharModal}><Ionicons name="close" size={24} color={tema.textoSecundario} /></TouchableOpacity>
            </View>

            {chamadoSelecionado ? (
              <View style={styles.modalBody}>
                <Text style={{ color: tema.textoSecundario, marginBottom: 15 }}>Aberto em: {chamadoSelecionado.data} às {chamadoSelecionado.hora}</Text>
                <Text style={[styles.inputLabel, { color: tema.textoPrincipal }]}>Solicitante:</Text>
                <Text style={{ color: tema.textoSecundario, marginBottom: 15 }}>{chamadoSelecionado.solicitante}</Text>
                <Text style={[styles.inputLabel, { color: tema.textoPrincipal }]}>Descrição do Problema:</Text>
                <View style={{ borderWidth: 1, borderColor: tema.borda, borderRadius: 10, padding: 15, backgroundColor: tema.inputBackground }}>
                  <Text style={{ color: tema.textoPrincipal }}>{chamadoSelecionado.descricao}</Text>
                </View>
                {chamadoSelecionado.status === 'pendente' && (
                  <TouchableOpacity style={[styles.btnAcaoLargo, { backgroundColor: '#2E7D32', marginTop: 30 }]} onPress={() => resolverChamado(chamadoSelecionado.id)}>
                    <Text style={styles.textoBtnLargo}>Marcar como Resolvido</Text>
                  </TouchableOpacity>
                )}
              </View>
            ) : (
              <FlatList
                data={chamados}
                keyExtractor={(item) => item.id}
                contentContainerStyle={{ padding: 20 }}
                renderItem={({ item }) => (
                  <TouchableOpacity style={{ borderWidth: 1, borderColor: tema.borda, borderRadius: 12, padding: 15, marginBottom: 12, backgroundColor: tema.inputBackground, opacity: item.status === 'resolvido' ? 0.6 : 1 }} onPress={() => setChamadoSelecionado(item)}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 5 }}>
                      <Ionicons name={item.status === 'resolvido' ? "checkmark-circle" : "warning"} size={20} color={item.status === 'resolvido' ? '#2E7D32' : '#E65100'} style={{ marginRight: 8 }} />
                      <Text style={{ color: tema.textoPrincipal, fontSize: 16, fontWeight: 'bold' }}>{item.solicitante}</Text>
                    </View>
                    <Text style={{ color: tema.textoSecundario, fontSize: 12 }}>{item.data}</Text>
                  </TouchableOpacity>
                )}
              />
            )}
          </View>
        </View>
      </Modal>

      {/* MODAL: VERSÃO DO APLICATIVO */}
      <Modal visible={modalVersao} transparent={true} animationType="fade">
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setModalVersao(false)}>
          <View style={[styles.modalVersaoContent, { backgroundColor: tema.fundoBase, borderColor: tema.borda }]}>
            
            <Ionicons name="layers" size={65} color={tema.botaoPrimario} style={{ marginBottom: 15 }} />
            
            <Text style={[styles.versaoAppNome, { color: tema.textoPrincipal }]}>VIOLETA</Text>
            <Text style={[styles.versaoTagline, { color: tema.textoSecundario }]}>Gestão Educacional</Text>
            
            <View style={[styles.versaoBadge, { backgroundColor: tema.inputBackground, borderColor: tema.borda }]}>
              <Text style={[styles.versaoAppNumero, { color: tema.textoPrincipal }]}>Build 1.0.0 (Beta)</Text>
            </View>
            
            <View style={[styles.versaoLinha, { borderBottomColor: tema.borda }]} />
            
            <Text style={[styles.tituloCreditos, { color: tema.textoSecundario }]}>DESENVOLVIDO POR</Text>
            <Text style={[styles.nomeCredito, { color: tema.textoPrincipal, fontWeight: '800' }]}>Larissa Alves</Text>
            <Text style={[styles.nomeCredito, { color: tema.textoPrincipal, fontWeight: '800' }]}>Aryane</Text>
            <Text style={[styles.nomeCredito, { color: tema.botaoPrimario, fontWeight: '900', marginTop: 4 }]}>LuffyBaiano</Text>
            
            <View style={{ marginTop: 25, alignItems: 'center' }}>
              <Text style={[styles.versaoCreditosMenor, { color: tema.textoSecundario }]}>Salvador, BA - 2026</Text>
              <Text style={[styles.versaoDireitos, { color: tema.textoSecundario }]}>© Todos os direitos reservados.</Text>
            </View>
            
          </View>
        </TouchableOpacity>
      </Modal>

    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { alignItems: 'center', paddingTop: 50, paddingBottom: 30, borderBottomLeftRadius: 30, borderBottomRightRadius: 30, elevation: 5 },
  headerTopRow: { width: '100%', flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 20, marginBottom: 10 },
  btnVoltar: { padding: 5 },
  btnToggleCargo: { padding: 5, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 8 },
  avatarContainer: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#FFF', justifyContent: 'center', alignItems: 'center', marginBottom: 15, elevation: 3 },
  avatarText: { fontSize: 32, fontWeight: 'bold', color: '#1565C0' },
  nomeUsuario: { fontSize: 22, fontWeight: 'bold', marginBottom: 5 },
  badgeCargo: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12, marginBottom: 8 },
  textoBadge: { color: '#FFF', fontSize: 12, fontWeight: 'bold' },
  emailUsuario: { fontSize: 14, opacity: 0.8 },
  
  section: { paddingHorizontal: 20, marginTop: 25 },
  sectionTitle: { fontSize: 12, fontWeight: '900', textTransform: 'uppercase', marginBottom: 8, marginLeft: 5, letterSpacing: 1 },
  cardMenu: { borderWidth: 1, borderRadius: 16, overflow: 'hidden' },
  menuItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 15, paddingHorizontal: 15, borderBottomWidth: StyleSheet.hairlineWidth },
  iconContainer: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  menuTextContainer: { flex: 1 },
  menuTitle: { fontSize: 15, fontWeight: 'bold' },
  menuSubtitle: { fontSize: 12, marginTop: 2 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center' },
  modalOverlayFull: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', paddingTop: 40 },
  modalContentFull: { flex: 1, borderTopLeftRadius: 25, borderTopRightRadius: 25, elevation: 10 },
  
  modalOverlayHalf: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalContentHalf: { borderTopLeftRadius: 25, borderTopRightRadius: 25, elevation: 10, paddingBottom: Platform.OS === 'ios' ? 40 : 20 },
  
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1 },
  modalTitle: { fontSize: 18, fontWeight: 'bold' },
  btnFecharModal: { padding: 5 },
  modalBody: { padding: 20 },
  
  // FORM PRIVACIDADE E SEGURANÇA
  topicoSeguranca: { fontSize: 13, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 15 },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 15, height: 50, fontSize: 15 },
  btnAcaoLargo: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', height: 50, borderRadius: 10, marginTop: 25 },
  textoBtnLargo: { color: '#FFF', fontSize: 15, fontWeight: 'bold' },
  linhaSeguranca: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 15, borderWidth: 1, borderRadius: 12 },
  tituloLinha: { fontSize: 15, fontWeight: 'bold' },
  subtituloLinha: { fontSize: 12, marginTop: 2 },
  cardSessao: { flexDirection: 'row', alignItems: 'center', padding: 15, borderWidth: 1, borderRadius: 12 },
  btnTransparente: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', height: 50, borderRadius: 10, borderWidth: 1 },

  // FORM MEUS DADOS E CHAMADOS
  inputLabel: { fontSize: 14, fontWeight: 'bold', marginBottom: 6 },
  inputDisabled: { opacity: 0.6 },
  inputAreaEnd: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 15, paddingTop: 15, height: 80, fontSize: 15, textAlignVertical: 'top' },
  inputArea: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 15, paddingTop: 15, height: 120, fontSize: 15, textAlignVertical: 'top' },
  avatarEdicaoContainer: { alignSelf: 'center', marginBottom: 25, position: 'relative' },
  avatarEdicao: { width: 100, height: 100, borderRadius: 50, backgroundColor: '#FFF', justifyContent: 'center', alignItems: 'center', elevation: 3 },
  btnAlterarFoto: { position: 'absolute', bottom: 0, right: 0, backgroundColor: '#1565C0', width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center', borderWidth: 3, borderColor: '#FFF' },

  // MODAL SOBRE
  modalVersaoContent: { width: '85%', borderRadius: 25, padding: 35, alignItems: 'center', elevation: 15, borderWidth: 1 },
  versaoAppNome: { fontSize: 28, fontWeight: '900', letterSpacing: 3, marginBottom: 2 },
  versaoTagline: { fontSize: 12, fontStyle: 'italic', marginBottom: 15, letterSpacing: 1 },
  versaoBadge: { paddingHorizontal: 15, paddingVertical: 6, borderRadius: 20, borderWidth: 1, marginBottom: 20 },
  versaoAppNumero: { fontSize: 12, fontWeight: 'bold' },
  versaoLinha: { width: '40%', borderBottomWidth: 2, marginBottom: 25, opacity: 0.5 },
  tituloCreditos: { fontSize: 10, fontWeight: 'bold', letterSpacing: 2, marginBottom: 10 },
  nomeCredito: { fontSize: 16, marginBottom: 2, letterSpacing: 0.5 },
  versaoCreditosMenor: { fontSize: 11, marginBottom: 5 },
  versaoDireitos: { fontSize: 10, fontStyle: 'italic' },
});