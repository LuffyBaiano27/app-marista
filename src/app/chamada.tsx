import React, { useState } from 'react';
import { 
  View, Text, StyleSheet, FlatList, TouchableOpacity, useColorScheme, TextInput, KeyboardAvoidingView, Platform, Modal, Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { cores } from '../constants/colors';
import { useRouter } from 'expo-router';

export default function ChamadaScreen() {
  const router = useRouter();
  const isDarkMode = useColorScheme() === 'dark';
  const tema = isDarkMode ? cores.dark : cores.light;

  // MOCKS DA AULA
  const isAulaDupla = true;
  const isAdmin = false; 
  const horario1 = "07:00 às 07:50";
  const horario2 = "07:50 às 08:40";
  
  const [chamadaConcluida, setChamadaConcluida] = useState(false);
  const [modalAssinatura, setModalAssinatura] = useState(false);
  const [senhaConfirmacao, setSenhaConfirmacao] = useState('');

  // ESTADO DA LISTA DE ALUNOS
  const [alunos, setAlunos] = useState([
    { id: '1', nome: 'Ana Carolina', presencas: [true, true], obs: '', mostrarObs: false },
    { id: '2', nome: 'Carlos Eduardo', presencas: [true, true], obs: '', mostrarObs: false },
    { id: '3', nome: 'Mariana Silva', presencas: [true, true], obs: '', mostrarObs: false },
    { id: '4', nome: 'João Pedro', presencas: [true, true], obs: '', mostrarObs: false },
  ]);

  const alternarPresenca = (alunoId: string, aulaIndex: number) => {
    if (chamadaConcluida && !isAdmin) return; 
    setAlunos(prev => prev.map(aluno => {
      if (aluno.id === alunoId) {
        const novasPresencas = [...aluno.presencas];
        novasPresencas[aulaIndex] = !novasPresencas[aulaIndex];
        return { ...aluno, presencas: novasPresencas };
      }
      return aluno;
    }));
  };

  const toggleMostrarObs = (alunoId: string) => {
    if (chamadaConcluida && !isAdmin) return;
    setAlunos(prev => prev.map(a => a.id === alunoId ? { ...a, mostrarObs: !a.mostrarObs } : a));
  };

  const setObservacao = (alunoId: string, texto: string) => {
    setAlunos(prev => prev.map(a => a.id === alunoId ? { ...a, obs: texto } : a));
  };

  const confirmarAssinatura = () => {
    if (senhaConfirmacao.trim() === '') {
      Alert.alert("Erro", "Digite sua senha para assinar o diário.");
      return;
    }
    setChamadaConcluida(true);
    setModalAssinatura(false);
    Alert.alert("Diário Assinado", "A chamada foi registrada e bloqueada com sucesso.");
  };

  const renderAluno = ({ item }: { item: any }) => {
    const totalFaltas = item.presencas.filter((p: boolean) => !p).length;
    const isFaltou = totalFaltas > 0;

    return (
      <View style={[styles.cardAluno, { 
        backgroundColor: tema.inputBackground, 
        borderColor: isFaltou ? '#EF9A9A' : tema.borda,
        opacity: chamadaConcluida ? 0.6 : 1 
      }]}>
        <View style={styles.linhaPrincipal}>
          <View style={styles.infoAluno}>
            <Text style={[styles.nomeAluno, { color: tema.textoPrincipal }]}>{item.nome}</Text>
            {isFaltou && <Text style={[styles.badgeFalta, { color: '#C62828' }]}>{totalFaltas} Falta(s)</Text>}
          </View>
          
          <View style={styles.areaBotoes}>
            {/* CHECKBOX 1º HORÁRIO */}
            <TouchableOpacity 
              disabled={chamadaConcluida && !isAdmin}
              style={styles.checkboxContainer}
              onPress={() => alternarPresenca(item.id, 0)}
            >
              <Ionicons 
                name={item.presencas[0] ? "checkbox" : "square-outline"} 
                size={30} 
                color={item.presencas[0] ? '#2E7D32' : '#C62828'} 
              />
            </TouchableOpacity>

            {/* CHECKBOX 2º HORÁRIO */}
            {isAulaDupla && (
              <TouchableOpacity 
                disabled={chamadaConcluida && !isAdmin}
                style={styles.checkboxContainer}
                onPress={() => alternarPresenca(item.id, 1)}
              >
                <Ionicons 
                  name={item.presencas[1] ? "checkbox" : "square-outline"} 
                  size={30} 
                  color={item.presencas[1] ? '#2E7D32' : '#C62828'} 
                />
              </TouchableOpacity>
            )}

            <TouchableOpacity disabled={chamadaConcluida && !isAdmin} style={styles.btnAcaoExtra} onPress={() => toggleMostrarObs(item.id)}>
              <Ionicons name="chatbox-ellipses-outline" size={24} color={item.obs ? tema.botaoPrimario : tema.textoSecundario} />
            </TouchableOpacity>
          </View>
        </View>

        {item.mostrarObs && (
          <View style={[styles.areaObs, { borderTopColor: tema.borda }]}>
            <TextInput
              editable={!chamadaConcluida || isAdmin}
              style={[styles.inputObs, { color: tema.textoPrincipal, backgroundColor: tema.fundoBase, borderColor: tema.borda }]}
              placeholder="Ex: Chegou atrasado por causa do transporte..."
              placeholderTextColor={tema.textoSecundario}
              value={item.obs}
              onChangeText={(text) => setObservacao(item.id, text)}
              multiline
            />
          </View>
        )}
      </View>
    );
  };

  return (
    <KeyboardAvoidingView style={[styles.container, { backgroundColor: tema.fundoBase }]} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      
      <View style={[styles.header, { backgroundColor: tema.fundoTopo }]}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.back()} style={styles.btnVoltar}>
            <Ionicons name="arrow-back" size={26} color={tema.textoLogo} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={[styles.titulo, { color: tema.textoLogo }]}>Registro de Frequência</Text>
            <View style={styles.subtituloRow}>
              <Text style={[styles.subtitulo, { color: tema.textoLogo, opacity: 0.9 }]}>6º Ano A • Matemática</Text>
            </View>
          </View>
        </View>
        <View style={[styles.statusContainer, { backgroundColor: chamadaConcluida ? 'rgba(255,255,255,0.2)' : 'rgba(46, 125, 50, 0.8)' }]}>
          <Ionicons name={chamadaConcluida ? "lock-closed" : "document-text"} size={16} color="#FFF" />
          <Text style={styles.textoStatus}>{chamadaConcluida ? "Diário Assinado e Fechado" : "Diário Aberto - Preenchimento"}</Text>
        </View>
      </View>

      {/* CABEÇALHO DAS COLUNAS (HORÁRIOS) */}
      <View style={[styles.colunasHeader, { borderBottomColor: tema.borda }]}>
        <Text style={[styles.colunaAlunoTexto, { color: tema.textoSecundario }]}>Nome do Aluno</Text>
        <View style={styles.colunasAcoes}>
          <View style={styles.colunaInfo}>
            <Text style={[styles.textoHorarioCol, { color: tema.textoPrincipal }]}>1º Horário</Text>
            <Text style={[styles.textoHoraMinuto, { color: tema.textoSecundario }]}>{horario1}</Text>
          </View>
          {isAulaDupla && (
            <View style={styles.colunaInfo}>
              <Text style={[styles.textoHorarioCol, { color: tema.textoPrincipal }]}>2º Horário</Text>
              <Text style={[styles.textoHoraMinuto, { color: tema.textoSecundario }]}>{horario2}</Text>
            </View>
          )}
          <View style={styles.colunaObs}>
            <Text style={[styles.textoHorarioCol, { color: tema.textoPrincipal }]}>Obs</Text>
          </View>
        </View>
      </View>

      <FlatList
        data={alunos}
        keyExtractor={(item) => item.id}
        renderItem={renderAluno}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />

      {!chamadaConcluida && (
        <View style={[styles.rodapeContainer, { backgroundColor: tema.fundoTopo }]}>
          <View style={styles.resumoRow}>
            <Text style={[styles.textoResumo, { color: tema.textoLogo }]}>Presentes: {alunos.filter(a => isAulaDupla ? (a.presencas[0] || a.presencas[1]) : a.presencas[0]).length}</Text>
            <Text style={[styles.textoResumo, { color: tema.textoLogo }]}>Faltas totais: {alunos.filter(a => isAulaDupla ? (!a.presencas[0] && !a.presencas[1]) : !a.presencas[0]).length}</Text>
          </View>
          <TouchableOpacity style={[styles.btnConcluir, { backgroundColor: tema.botaoPrimario }]} onPress={() => setModalAssinatura(true)} activeOpacity={0.8}>
            <Ionicons name="finger-print" size={20} color="#FFF" style={{ marginRight: 8 }} />
            <Text style={styles.textoBtnConcluir}>Assinar Diário Digital</Text>
          </TouchableOpacity>
        </View>
      )}

      <Modal visible={modalAssinatura} transparent={true} animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: tema.fundoBase }]}>
            <View style={[styles.iconeSeguranca, { backgroundColor: tema.botaoPrimario + '20' }]}>
              <Ionicons name="shield-checkmark" size={40} color={tema.botaoPrimario} />
            </View>
            <Text style={[styles.tituloModal, { color: tema.textoPrincipal }]}>Assinatura Eletrônica</Text>
            <Text style={[styles.textoModal, { color: tema.textoSecundario }]}>Insira sua senha para concluir e bloquear este diário de classe.</Text>
            <View style={[styles.inputContainer, { backgroundColor: tema.inputBackground, borderColor: tema.borda }]}>
              <Ionicons name="lock-closed-outline" size={20} color={tema.icone} style={{ marginRight: 10 }} />
              <TextInput style={[styles.inputSenha, { color: tema.textoPrincipal }]} placeholder="Sua senha de acesso" placeholderTextColor={tema.textoSecundario} secureTextEntry value={senhaConfirmacao} onChangeText={setSenhaConfirmacao} />
            </View>
            <View style={styles.modalBotoes}>
              <TouchableOpacity style={styles.btnCancelar} onPress={() => setModalAssinatura(false)}>
                <Text style={{ color: tema.textoSecundario, fontWeight: 'bold' }}>Revisar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.btnConfirmar, { backgroundColor: tema.botaoPrimario }]} onPress={confirmarAssinatura}>
                <Text style={{ color: '#FFF', fontWeight: 'bold' }}>Assinar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

    </KeyboardAvoidingView>
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