import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, useColorScheme, ScrollView, Alert, Modal, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { cores } from '../../constants/colors';
import { useRouter } from 'expo-router';
import { useDemoProfile } from '../../contexts/demoProfileContext';

// FIREBASE
import { collection, addDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';

export default function PerfilScreen() {
  const router = useRouter();
  const isDarkMode = useColorScheme() === 'dark';
  const tema = isDarkMode ? cores.dark : cores.light;
  const { perfil, setPerfil } = useDemoProfile();

  const [sincronizando, setSincronizando] = useState(false);
  const nomesPerfis = {
    admin: 'Administrador',
    coordenador: 'Coordenador',
    professor: 'Professor',
  };

  const identidadesDemonstrativas = {
    admin: { nome: 'Marina Andrade', email: 'marina@violeta.com', iniciais: 'MA' },
    coordenador: { nome: 'Camila Rocha', email: 'camila@violeta.com', iniciais: 'CR' },
    professor: { nome: 'Luffy Baiano', email: 'luffy@violeta.com', iniciais: 'LB' },
  };

  const usuario = {
    ...identidadesDemonstrativas[perfil],
    cargo: nomesPerfis[perfil],
  };
  // Chamados mantêm a identificação original, independente do perfil demonstrativo exibido.
  const nomeSolicitanteChamado = 'Luffy Baiano';

  const [modalDados, setModalDados] = useState(false);
  const [modalPrivacidade, setModalPrivacidade] = useState(false);
  const [modalVersao, setModalVersao] = useState(false);
  const [modalAjuda, setModalAjuda] = useState(false);
  const [modalAviso, setModalAviso] = useState(false);
  
  // ESTADOS DO PERFIL
  const [formDados, setFormDados] = useState({
    nome: usuario.nome, dataNascimento: '27/09/2003', endereco: 'Salvador, BA'
  });
  
  // ESTADOS DE SEGURANÇA E PREFERÊNCIAS
  const [senhaAtual, setSenhaAtual] = useState('');
  const [novaSenha, setNovaSenha] = useState('');
  const [tamanhoFonte, setTamanhoFonte] = useState('Média'); // Pequena, Média, Grande

  // ESTADOS DE SUPORTE E AVISOS
  const [textoChamado, setTextoChamado] = useState('');
  const [tituloAviso, setTituloAviso] = useState('');
  const [mensagemAviso, setMensagemAviso] = useState('');

  const handleVoltar = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)');
  };

  const handleLogout = () => {
    if (Platform.OS === 'web') {
      if (window.confirm("Deseja sair do sistema Violeta?")) router.replace('/');
    } else {
      Alert.alert("Encerrar Sessão", "Deseja sair do sistema Violeta?", [
        { text: "Cancelar", style: "cancel" },
        { text: "Sair", style: "destructive", onPress: () => router.replace('/') }
      ]);
    }
  };

  const handleSalvarDados = () => {
    if (Platform.OS === 'web') window.alert("Sucesso!\nSeus dados foram atualizados no sistema.");
    else Alert.alert("Sucesso", "Seus dados foram atualizados no sistema.");
    setModalDados(false);
  };
  
  const handleSalvarPreferencias = () => {
    if (senhaAtual && !novaSenha) {
       Platform.OS === 'web' ? window.alert("Preencha a nova senha.") : Alert.alert("Aviso", "Preencha a nova senha.");
       return;
    }
    
    Platform.OS === 'web' ? window.alert("Sucesso!\nPreferências e segurança atualizadas.") : Alert.alert("Sucesso", "Preferências e segurança atualizadas.");
    setSenhaAtual('');
    setNovaSenha('');
    setModalPrivacidade(false);
  };

  const handleAlertaDesenvolvimento = (recurso: string) => {
    if (Platform.OS === 'web') window.alert(`Em Desenvolvimento\nMódulo: ${recurso}`);
    else Alert.alert("Em Desenvolvimento", `Módulo: ${recurso}`);
  };

  const handleEnviarChamado = async () => {
    if (!textoChamado.trim()) {
      Platform.OS === 'web' ? window.alert("Descreva o problema.") : Alert.alert("Atenção", "Descreva o problema.");
      return;
    }
    
    try {
      const agora = new Date();
      await addDoc(collection(db, 'chamados_suporte'), {
        solicitante: `${nomeSolicitanteChamado} (${usuario.cargo})`,
        data: agora.toLocaleDateString('pt-BR'),
        hora: agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        descricao: textoChamado,
        status: 'pendente',
        timestamp: agora.getTime()
      });
      
      if (Platform.OS === 'web') window.alert("Sucesso!\nChamado enviado para a TI.");
      else Alert.alert("Sucesso", "Chamado enviado para a TI.");
      
      setModalAjuda(false);
      setTextoChamado('');
    } catch (error: any) {
      Platform.OS === 'web' ? window.alert("Erro: " + error.message) : Alert.alert("Erro", error.message);
    }
  };

  const handleInjetarDados = async () => {
    if (sincronizando) return; 
    setSincronizando(true);

    const turmasMock = [
      { nome: '6º Ano A', disciplina: 'Matemática', alunos: 32, horario: '07:00 às 07:50', turno: 'Matutino', diaId: 1, status: 'pendente', professorNome: 'Luffy Baiano', professorId: 'prof_1' },
      { nome: '7º Ano B', disciplina: 'Matemática', alunos: 28, horario: '07:50 às 08:40', turno: 'Matutino', diaId: 2, status: 'pendente', professorNome: 'Luffy Baiano', professorId: 'prof_1' },
      { nome: '8º Ano A', disciplina: 'História', alunos: 30, horario: '09:00 às 09:50', turno: 'Matutino', diaId: 3, status: 'pendente', professorNome: 'Carlos Eduardo', professorId: 'prof_2' },
      { nome: '9º Ano C', disciplina: 'Física', alunos: 25, horario: '10:10 às 11:00', turno: 'Matutino', diaId: 1, status: 'pendente', professorNome: 'Mariana Silva', professorId: 'prof_3' },
      { nome: '1º Ano Médio', disciplina: 'Matemática', alunos: 35, horario: '11:00 às 11:50', turno: 'Matutino', diaId: 4, status: 'pendente', professorNome: 'Luffy Baiano', professorId: 'prof_1' },
      { nome: '2º Ano Médio', disciplina: 'Física', alunos: 30, horario: '14:00 às 14:50', turno: 'Vespertino', diaId: 5, status: 'pendente', professorNome: 'Mariana Silva', professorId: 'prof_3' }
    ];
  
    try {
      for (const turma of turmasMock) {
        await addDoc(collection(db, 'turmas'), turma);
      }
      if (Platform.OS === 'web') window.alert("Sucesso!\nTurmas inseridas com professores.");
      else Alert.alert("Sucesso!", "Turmas inseridas com professores.");
    } catch (error: any) {
      if (Platform.OS === 'web') window.alert("Erro\n" + error.message);
      else Alert.alert("Erro", error.message);
    } finally {
      setSincronizando(false); 
    }
  };

  const MenuOption = ({ icone, titulo, subtitulo = null, corIcone = tema.textoSecundario, danger = false, onPress, desativado = false }: any) => (
    <TouchableOpacity style={[styles.menuItem, { borderBottomColor: tema.borda, opacity: desativado ? 0.5 : 1 }]} activeOpacity={0.7} onPress={onPress} disabled={desativado}>
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
            <TouchableOpacity onPress={handleVoltar} style={styles.btnVoltar}><Ionicons name="arrow-back" size={26} color={tema.textoLogo} /></TouchableOpacity>
            <TouchableOpacity onPress={() => setPerfil(perfil === 'admin' ? 'coordenador' : perfil === 'coordenador' ? 'professor' : 'admin')} style={styles.btnToggleCargo}>
              <Text style={{ color: '#FFF', fontSize: 10, fontWeight: 'bold' }}>Simular Perfil</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.avatarContainer}><Text style={styles.avatarText}>{usuario.iniciais}</Text></View>
          <Text style={[styles.nomeUsuario, { color: tema.textoLogo }]}>{usuario.nome}</Text>
          <View style={[styles.badgeCargo, { backgroundColor: perfil === 'admin' ? '#D32F2F' : perfil === 'coordenador' ? '#E65100' : 'rgba(255,255,255,0.2)' }]}><Text style={styles.textoBadge}>{usuario.cargo}</Text></View>
          <Text style={[styles.emailUsuario, { color: tema.textoLogo }]}>{usuario.email}</Text>
        </View>

        {perfil === 'admin' ? (
          <>
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: '#D32F2F' }]}>Infraestrutura e Permissões</Text>
              <View style={[styles.cardMenu, { backgroundColor: tema.inputBackground, borderColor: '#D32F2F' }]}>
                <MenuOption icone="shield-checkmark" titulo="Controle de Acessos" subtitulo="Aprovar/bloquear usuários" corIcone="#D32F2F" onPress={() => router.push('/usuarios')} />
                <MenuOption icone="list-circle" titulo="Logs de Auditoria" subtitulo="Rastrear exclusões e alterações" corIcone="#D32F2F" onPress={() => handleAlertaDesenvolvimento('Auditoria do Sistema')} />
                <MenuOption icone="business" titulo="Dados da Instituição" subtitulo="Ano letivo, feriados e regras" corIcone="#D32F2F" onPress={() => handleAlertaDesenvolvimento('Configurações Globais')} />
              </View>
            </View>
            
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: '#2E7D32' }]}>Banco de Dados</Text>
              <View style={[styles.cardMenu, { backgroundColor: tema.inputBackground, borderColor: '#2E7D32' }]}>
                <MenuOption icone={sincronizando ? "sync" : "server"} titulo={sincronizando ? "Sincronizando..." : "[DEV] Sincronizar Turmas"} subtitulo={sincronizando ? "Aguarde..." : "Injetar carga inicial"} corIcone="#2E7D32" onPress={handleInjetarDados} desativado={sincronizando} />
                <MenuOption icone="cloud-download" titulo="Backup do Sistema" subtitulo="Exportar base completa" corIcone="#2E7D32" onPress={() => handleAlertaDesenvolvimento('Backup')} />
              </View>
            </View>
          </>
        ) : (
          <>
            {perfil === 'coordenador' && (
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: '#E65100' }]}>Gestão Acadêmica</Text>
                <View style={[styles.cardMenu, { backgroundColor: tema.inputBackground, borderColor: '#E65100' }]}>
                  <MenuOption icone="megaphone" titulo="Comunicados Oficiais" subtitulo="Mural de professores" corIcone="#E65100" onPress={() => setModalAviso(true)} />
                  <MenuOption icone="lock-open" titulo="Gestão de Prazos" subtitulo="Bloquear diários de classe" corIcone="#E65100" onPress={() => handleAlertaDesenvolvimento('Prazos')} />
                </View>
              </View>
            )}
          </>
        )}

        {/* VISÍVEL PARA TODOS OS CARGOS */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: tema.textoSecundario }]}>Sua Conta</Text>
          <View style={[styles.cardMenu, { backgroundColor: tema.inputBackground, borderColor: tema.borda }]}>
            <MenuOption
              icone="person"
              titulo="Meus Dados"
              corIcone={tema.botaoPrimario}
              onPress={() => {
                setFormDados((dados) => ({ ...dados, nome: usuario.nome }));
                setModalDados(true);
              }}
            />
            <MenuOption icone="shield-checkmark" titulo="Segurança e Preferências" corIcone={tema.botaoPrimario} onPress={() => setModalPrivacidade(true)} />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: tema.textoSecundario }]}>Sistema Violeta</Text>
          <View style={[styles.cardMenu, { backgroundColor: tema.inputBackground, borderColor: tema.borda }]}>
            {perfil === 'admin' ? (
              <MenuOption icone="construct" titulo="Gerenciar Chamados" subtitulo="Resolver tickets da TI" corIcone="#D32F2F" onPress={() => router.push('/chamados')} />
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
              <TouchableOpacity onPress={() => setModalDados(false)} style={styles.btnFecharModal}><Ionicons name="close" size={24} color={tema.textoSecundario} /></TouchableOpacity>
            </View>
            <ScrollView style={styles.modalBody}>
              <View style={styles.avatarEdicaoContainer}>
                <View style={styles.avatarEdicao}><Text style={styles.avatarText}>{usuario.iniciais}</Text></View>
                <TouchableOpacity style={styles.btnAlterarFoto}><Ionicons name="camera" size={16} color="#FFF" /></TouchableOpacity>
              </View>

              <Text style={[styles.inputLabel, { color: tema.textoPrincipal }]}>Nome de Exibição:</Text>
              <TextInput style={[styles.input, { backgroundColor: tema.inputBackground, borderColor: tema.borda, color: tema.textoPrincipal }]} value={formDados.nome} onChangeText={(t) => setFormDados({...formDados, nome: t})} />
              
              <Text style={[styles.inputLabel, { color: tema.textoPrincipal, marginTop: 15 }]}>E-mail de Cadastro (Bloqueado):</Text>
              <TextInput style={[styles.input, styles.inputDisabled, { backgroundColor: tema.inputBackground, borderColor: tema.borda, color: tema.textoSecundario }]} value={usuario.email} editable={false} />
              
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

      {/* MODAL: PRIVACIDADE E PREFERÊNCIAS */}
      <Modal visible={modalPrivacidade} transparent={true} animationType="slide">
        <View style={styles.modalOverlayFull}>
          <View style={[styles.modalContentFull, { backgroundColor: tema.fundoBase }]}>
            <View style={[styles.modalHeader, { borderBottomColor: tema.borda }]}>
              <Text style={[styles.modalTitle, { color: tema.textoPrincipal }]}>Segurança e Preferências</Text>
              <TouchableOpacity onPress={() => setModalPrivacidade(false)} style={styles.btnFecharModal}><Ionicons name="close" size={24} color={tema.textoSecundario} /></TouchableOpacity>
            </View>
            <ScrollView style={styles.modalBody}>
              <Text style={[styles.topicoSeguranca, { color: tema.botaoPrimario }]}>Alterar Senha</Text>
              <TextInput style={[styles.input, { backgroundColor: tema.inputBackground, borderColor: tema.borda, color: tema.textoPrincipal }]} placeholder="Senha Atual" secureTextEntry placeholderTextColor={tema.textoSecundario} value={senhaAtual} onChangeText={setSenhaAtual} />
              <TextInput style={[styles.input, { backgroundColor: tema.inputBackground, borderColor: tema.borda, color: tema.textoPrincipal, marginTop: 10 }]} placeholder="Nova Senha" secureTextEntry placeholderTextColor={tema.textoSecundario} value={novaSenha} onChangeText={setNovaSenha} />
              
              <Text style={[styles.topicoSeguranca, { color: tema.botaoPrimario, marginTop: 30 }]}>Preferências Visuais</Text>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15 }}>
                <TouchableOpacity style={[styles.btnPreferencia, { borderColor: tema.borda, backgroundColor: tamanhoFonte === 'Pequena' ? tema.botaoPrimario + '20' : tema.inputBackground }]} onPress={() => setTamanhoFonte('Pequena')}>
                  <Text style={{ color: tema.textoPrincipal, fontSize: 12 }}>Fonte Pequena</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.btnPreferencia, { borderColor: tema.borda, backgroundColor: tamanhoFonte === 'Média' ? tema.botaoPrimario + '20' : tema.inputBackground }]} onPress={() => setTamanhoFonte('Média')}>
                  <Text style={{ color: tema.textoPrincipal, fontSize: 14 }}>Fonte Média</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.btnPreferencia, { borderColor: tema.borda, backgroundColor: tamanhoFonte === 'Grande' ? tema.botaoPrimario + '20' : tema.inputBackground }]} onPress={() => setTamanhoFonte('Grande')}>
                  <Text style={{ color: tema.textoPrincipal, fontSize: 16 }}>Fonte Grande</Text>
                </TouchableOpacity>
              </View>

              <Text style={[styles.topicoSeguranca, { color: tema.botaoPrimario, marginTop: 30 }]}>Sessões Ativas</Text>
              <View style={[styles.cardSessao, { borderColor: tema.borda, backgroundColor: tema.inputBackground }]}>
                <Ionicons name="desktop-outline" size={24} color="#2E7D32" style={{ marginRight: 15 }} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.tituloLinha, { color: tema.textoPrincipal }]}>Este Dispositivo</Text>
                  <Text style={[styles.subtituloLinha, { color: tema.textoSecundario }]}>Salvador, BA • Ativo agora</Text>
                </View>
              </View>
              
              <TouchableOpacity style={[styles.btnAcaoLargo, { backgroundColor: tema.botaoPrimario, marginTop: 30 }]} onPress={handleSalvarPreferencias}>
                <Ionicons name="save-outline" size={20} color="#FFF" style={{ marginRight: 8 }} />
                <Text style={styles.textoBtnLargo}>Salvar Informações</Text>
              </TouchableOpacity>
              
              <View style={{ height: 50 }} />
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* MODAL: ABRIR CHAMADO */}
      <Modal visible={modalAjuda} transparent={true} animationType="slide">
        <TouchableOpacity style={styles.modalOverlayHalf} activeOpacity={1} onPress={() => setModalAjuda(false)}>
          <TouchableOpacity activeOpacity={1} style={[styles.modalContentHalf, { backgroundColor: tema.fundoBase }]}>
            <View style={[styles.modalHeader, { borderBottomColor: tema.borda }]}>
              <Text style={[styles.modalTitle, { color: tema.textoPrincipal }]}>Abrir Chamado</Text>
              <TouchableOpacity onPress={() => setModalAjuda(false)} style={styles.btnFecharModal}><Ionicons name="close" size={24} color={tema.textoSecundario} /></TouchableOpacity>
            </View>
            <View style={styles.modalBody}>
              <TextInput style={[styles.inputArea, { backgroundColor: tema.inputBackground, borderColor: tema.borda, color: tema.textoPrincipal }]} placeholder="Descreva o problema..." placeholderTextColor={tema.textoSecundario} multiline value={textoChamado} onChangeText={setTextoChamado} />
              <TouchableOpacity style={[styles.btnAcaoLargo, { backgroundColor: tema.botaoPrimario }]} onPress={handleEnviarChamado}><Text style={styles.textoBtnLargo}>Enviar Ticket</Text></TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* MODAL: AVISOS */}
      <Modal visible={modalAviso} transparent={true} animationType="slide">
        <TouchableOpacity style={styles.modalOverlayHalf} activeOpacity={1} onPress={() => setModalAviso(false)}>
          <TouchableOpacity activeOpacity={1} style={[styles.modalContentHalf, { backgroundColor: tema.fundoBase }]}>
            <View style={[styles.modalHeader, { borderBottomColor: tema.borda }]}>
              <Text style={[styles.modalTitle, { color: tema.textoPrincipal }]}>Novo Comunicado</Text>
              <TouchableOpacity onPress={() => setModalAviso(false)} style={styles.btnFecharModal}><Ionicons name="close" size={24} color={tema.textoSecundario} /></TouchableOpacity>
            </View>
            <View style={styles.modalBody}>
              <TextInput style={[styles.input, { backgroundColor: tema.inputBackground, borderColor: tema.borda, color: tema.textoPrincipal }]} value={tituloAviso} onChangeText={setTituloAviso} placeholder="Título" />
              <TextInput style={[styles.inputArea, { backgroundColor: tema.inputBackground, borderColor: tema.borda, color: tema.textoPrincipal, marginTop: 15 }]} multiline value={mensagemAviso} onChangeText={setMensagemAviso} placeholder="Mensagem" />
              <TouchableOpacity style={[styles.btnAcaoLargo, { backgroundColor: '#E65100' }]} onPress={() => { if (Platform.OS === 'web') window.alert("Publicado!"); else Alert.alert("Sucesso", "Publicado!"); setModalAviso(false); }}><Text style={styles.textoBtnLargo}>Publicar Aviso</Text></TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
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
  btnVoltar: { padding: 5 }, btnToggleCargo: { padding: 5, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 8 },
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