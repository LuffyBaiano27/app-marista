import React, { useState, useEffect } from 'react';
import { 
  View, Text, StyleSheet, FlatList, TouchableOpacity, useColorScheme, TextInput, KeyboardAvoidingView, Platform, Modal, Alert, ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { cores } from '../constants/colors';
import { useRouter, useLocalSearchParams } from 'expo-router';

// FIREBASE
import { doc, getDoc, collection, addDoc, query, where, getDocs } from 'firebase/firestore';
import { db } from '../config/firebase';

export default function ChamadaScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams(); 
  const isDarkMode = useColorScheme() === 'dark';
  const tema = isDarkMode ? cores.dark : cores.light;

  // ESTADOS FIREBASE DA TURMA E DA CHAMADA
  const [turma, setTurma] = useState<any>(null);
  const [carregandoDados, setCarregandoDados] = useState(true);
  const [chamadaIdRealizada, setChamadaIdRealizada] = useState<string | null>(null);

  // MOCKS DA AULA 
  const isAulaDupla = true; 
  const isAdmin = false; 
  const horario1 = turma?.horario || "Carregando...";
  const horario2 = "08:40 às 09:30"; 
  
  const [chamadaConcluida, setChamadaConcluida] = useState(false);
  const [modalAssinatura, setModalAssinatura] = useState(false);
  const [senhaConfirmacao, setSenhaConfirmacao] = useState('');

  // ESTADO DA LISTA DE ALUNOS (Inicialmente mockado, mas será sobrescrito se houver chamada no banco)
  const [alunos, setAlunos] = useState([
    { id: '1', nome: 'Ana Carolina', presencas: [true, true], obs: '', mostrarObs: false },
    { id: '2', nome: 'Carlos Eduardo', presencas: [true, true], obs: '', mostrarObs: false },
    { id: '3', nome: 'Mariana Silva', presencas: [true, true], obs: '', mostrarObs: false },
    { id: '4', nome: 'João Pedro', presencas: [true, true], obs: '', mostrarObs: false },
  ]);

  // FUNÇÃO AUXILIAR PARA FORMATAR A DATA (YYYY-MM-DD)
  const getDataDeHoje = () => {
    const hoje = new Date();
    // Ajuste simples para o fuso horário (exemplo) ou usar biblioteca se necessário
    return hoje.toISOString().split('T')[0]; 
  };

  // BUSCAR DADOS DA TURMA E VERIFICAR SE JÁ HOUVE CHAMADA HOJE
  useEffect(() => {
    const buscarDadosBase = async () => {
      if (!id) return;
      setCarregandoDados(true);
      try {
        // 1. Buscar a Turma
        const docRef = doc(db, 'turmas', id as string);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          setTurma(docSnap.data());
        }

        // 2. Verificar se JÁ EXISTE uma chamada gravada HOJE para esta turma
        const dataHoje = getDataDeHoje();
        const chamadasRef = collection(db, 'chamadas');
        const q = query(chamadasRef, 
          where('turmaId', '==', id),
          where('dataChamadaFormatada', '==', dataHoje) // Usamos um formato simples YYYY-MM-DD
        );
        
        const querySnapshot = await getDocs(q);
        
        if (!querySnapshot.empty) {
          // Já existe uma chamada hoje! Vamos carregar os dados e bloquear a tela.
          const chamadaRealizada = querySnapshot.docs[0].data();
          setChamadaIdRealizada(querySnapshot.docs[0].id);
          setChamadaConcluida(true);
          
          // Mapeamos a estrutura do banco de volta para o estado local, garantindo que 'mostrarObs' fica falso por defeito
          if (chamadaRealizada.alunos && chamadaRealizada.alunos.length > 0) {
              setAlunos(chamadaRealizada.alunos.map((a: any) => ({
                  ...a,
                  mostrarObs: false // Apenas controle de UI
              })));
          }
        }
      } catch (error) {
        console.error("Erro ao buscar dados básicos:", error);
      } finally {
        setCarregandoDados(false);
      }
    };

    buscarDadosBase();
  }, [id]);

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

  const confirmarAssinatura = async () => {
    if (senhaConfirmacao.trim() === '') {
      if (Platform.OS === 'web') window.alert("Erro\nDigite sua senha para assinar o diário.");
      else Alert.alert("Erro", "Digite sua senha para assinar o diário.");
      return;
    }
    
    setCarregandoDados(true);
    try {
      // Cria um registro oficial na coleção 'chamadas'
      const novaChamadaData = {
        turmaId: id,
        disciplina: turma?.disciplina || 'Desconhecida',
        dataChamada: new Date().toISOString(),
        dataChamadaFormatada: getDataDeHoje(), // Facilita a query diária!
        assinaturaProf: true,
        alunos: alunos.map(a => ({
          id: a.id,
          nome: a.nome,
          presencas: a.presencas,
          obs: a.obs
        }))
      };

      await addDoc(collection(db, 'chamadas'), novaChamadaData);

      setChamadaConcluida(true);
      setModalAssinatura(false);
      
      if (Platform.OS === 'web') window.alert("Diário Assinado!\nA chamada foi registrada e bloqueada com sucesso.");
      else Alert.alert("Diário Assinado", "A chamada foi registrada e bloqueada com sucesso.");
      
    } catch (error: any) {
      console.error("Erro ao salvar chamada:", error);
      if (Platform.OS === 'web') window.alert("Erro\nFalha ao salvar a chamada.");
      else Alert.alert("Erro", "Falha ao salvar a chamada no banco de dados.");
    } finally {
        setCarregandoDados(false);
        setSenhaConfirmacao('');
    }
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
              {carregandoDados ? (
                <ActivityIndicator size="small" color={tema.textoLogo} style={{ alignSelf: 'flex-start' }} />
              ) : (
                <Text style={[styles.subtitulo, { color: tema.textoLogo, opacity: 0.9 }]}>
                  {turma ? `${turma.nome} • ${turma.disciplina || turma.materia}` : 'Turma não encontrada'}
                </Text>
              )}
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

      {carregandoDados ? (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
              <ActivityIndicator size="large" color={tema.botaoPrimario} />
              <Text style={{ marginTop: 10, color: tema.textoSecundario }}>Sincronizando diário...</Text>
          </View>
      ) : (
        <FlatList
          data={alunos}
          keyExtractor={(item) => item.id}
          renderItem={renderAluno}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}

      {(!chamadaConcluida && !carregandoDados) && (
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