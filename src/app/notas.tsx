import React, { useState } from 'react';
import { 
  View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, useColorScheme, Platform, KeyboardAvoidingView, Alert 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { cores } from '../constants/colors';
import { useRouter, useLocalSearchParams } from 'expo-router';

export default function NotasScreen() {
  const router = useRouter();
  const params = useLocalSearchParams(); 
  
  const isDarkMode = useColorScheme() === 'dark';
  const tema = isDarkMode ? cores.dark : cores.light;

  const [tipoUsuario, setTipoUsuario] = useState<'professor' | 'coordenador'>((params.visao as any) || 'professor');
  const [periodoAberto, setPeriodoAberto] = useState(params.status === 'aberto');

  const valorMaximoProva = 8.0;

  const [alunos, setAlunos] = useState([
    { id: '1', nome: 'Ana Carolina', nota: '7.5', status: 'lancada', justificativaProf: '', justificativaCoord: '' },
    { id: '2', nome: 'Carlos Eduardo', nota: '6.0', status: 'aguardando', justificativaProf: 'O aluno apresentou atestado médico e entregou o trabalho substitutivo hoje.', justificativaCoord: '' },
    { id: '3', nome: 'Mariana Silva', nota: '5.0', status: 'recusado', justificativaProf: 'Gostaria de adicionar 1 ponto de participação.', justificativaCoord: 'Pontuação de participação já foi contabilizada na Avaliação Parcial 1.' },
  ]);

  const [cardExpandido, setCardExpandido] = useState<string | null>(null);
  const [textoJustificativa, setTextoJustificativa] = useState('');
  const [mostraInputRecusa, setMostraInputRecusa] = useState(false);

  const handleMudancaNota = (text: string, id: string) => {
    let valorDigitado = text.replace(',', '.');
    
    if (Number(valorDigitado) > valorMaximoProva) {
      valorDigitado = valorMaximoProva.toFixed(1).toString();
      Alert.alert("Limite excedido", `A nota máxima permitida é ${valorMaximoProva}`);
    }

    const novaLista = alunos.map(aluno => 
      aluno.id === id ? { ...aluno, nota: valorDigitado } : aluno
    );
    setAlunos(novaLista);
  };

  const renderAluno = ({ item }: { item: any }) => {
    const isAguardando = item.status === 'aguardando';
    const isRecusado = item.status === 'recusado';
    const isExpandido = cardExpandido === item.id;

    return (
      <View style={[styles.cardAluno, { backgroundColor: tema.inputBackground, borderColor: tema.borda }]}>
        <View style={styles.alunoRow}>
          <View style={styles.alunoInfo}>
            <Text style={[styles.nomeAluno, { color: tema.textoPrincipal }]}>{item.nome}</Text>
            {isAguardando && <Text style={styles.textoAlerta}>⚠️ Solicitação em análise</Text>}
            {isRecusado && tipoUsuario === 'professor' && <Text style={[styles.textoAlerta, { color: '#C62828' }]}>❌ Solicitação recusada</Text>}
          </View>
          
          <View style={styles.notaArea}>
            {/* REGRA VISUAL SÊNIOR: Se for Professor e tiver no prazo, mostra CAIXA DE INPUT. */}
            {periodoAberto && tipoUsuario === 'professor' ? (
              <View style={[styles.inputNotaContainer, { borderColor: tema.borda, backgroundColor: tema.fundoBase }]}>
                <TextInput
                  style={[styles.inputNota, { color: tema.textoPrincipal }]}
                  value={item.nota}
                  onChangeText={(texto) => handleMudancaNota(texto, item.id)}
                  keyboardType="numeric"
                  maxLength={4}
                />
                <Text style={[styles.textoMaximo, { color: tema.textoSecundario }]}>/ {valorMaximoProva.toFixed(1)}</Text>
              </View>
            ) : (
              /* REGRA VISUAL SÊNIOR: Se for Coordenador ou Professor com prazo fechado, mostra TEXTO LIMPO, sem caixas. */
              <View style={styles.displayNotaContainer}>
                <Text style={[styles.textoNota, { color: tema.textoPrincipal }]}>
                  {item.nota} <Text style={[styles.textoMaximo, { color: tema.textoSecundario }]}>/ {valorMaximoProva.toFixed(1)}</Text>
                </Text>
                
                {!periodoAberto && tipoUsuario === 'professor' && !isAguardando && (
                  <TouchableOpacity style={styles.btnIcone} onPress={() => { setCardExpandido(isExpandido ? null : item.id); setTextoJustificativa(''); }}>
                    <Ionicons name="pencil" size={16} color={tema.textoSecundario} />
                  </TouchableOpacity>
                )}
                {tipoUsuario === 'coordenador' && isAguardando && (
                  <TouchableOpacity style={styles.btnIcone} onPress={() => setCardExpandido(isExpandido ? null : item.id)}>
                    <Ionicons name="eye" size={18} color="#E65100" />
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>
        </View>

        {isExpandido && (
          <View style={[styles.areaExpandida, { borderTopColor: tema.borda }]}>
            {tipoUsuario === 'professor' && !isAguardando && (
              <View>
                <Text style={[styles.labelMotivo, { color: tema.textoPrincipal }]}>Motivo da alteração de nota:</Text>
                <TextInput
                  style={[styles.inputJustificativa, { color: tema.textoPrincipal, borderColor: tema.borda, backgroundColor: tema.inputBackground }]}
                  placeholder="Escreva a justificativa para a coordenação..."
                  placeholderTextColor={tema.textoSecundario}
                  multiline
                  value={textoJustificativa}
                  onChangeText={setTextoJustificativa}
                />
                <TouchableOpacity style={[styles.btnEnviarPequeno, { backgroundColor: tema.botaoPrimario }]}>
                  <Text style={styles.textoBotaoBranco}>Enviar Solicitação</Text>
                </TouchableOpacity>
              </View>
            )}

            {tipoUsuario === 'professor' && isRecusado && (
              <View style={[styles.boxLeitura, { backgroundColor: '#FFEBEE', borderColor: '#FFCDD2' }]}>
                <Text style={[styles.labelMotivo, { color: '#C62828' }]}>Retificação Recusada:</Text>
                <Text style={[styles.textoLeitura, { color: '#C62828' }]}>{item.justificativaCoord}</Text>
              </View>
            )}

            {tipoUsuario === 'coordenador' && isAguardando && (
              <View>
                <View style={[styles.boxLeitura, { backgroundColor: tema.fundoBase, borderColor: tema.borda }]}>
                  <Text style={[styles.labelMotivo, { color: tema.textoPrincipal }]}>Justificativa do Professor:</Text>
                  <Text style={[styles.textoLeitura, { color: tema.textoSecundario }]}>"{item.justificativaProf}"</Text>
                </View>
                
                {!mostraInputRecusa ? (
                  <View style={styles.rowBotoesAcao}>
                    <TouchableOpacity style={[styles.btnAcaoCoord, { borderColor: '#C62828' }]} onPress={() => setMostraInputRecusa(true)}>
                      <Text style={[styles.textoBtnAcaoCoord, { color: '#C62828' }]}>Recusar</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.btnAcaoCoord, { backgroundColor: '#2E7D32', borderColor: '#2E7D32' }]}>
                      <Text style={[styles.textoBtnAcaoCoord, { color: '#FFF' }]}>Autorizar Alteração</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={{ marginTop: 10 }}>
                    <Text style={[styles.labelMotivo, { color: '#C62828' }]}>Motivo da Recusa:</Text>
                    <TextInput
                      style={[styles.inputJustificativa, { color: tema.textoPrincipal, borderColor: tema.borda, backgroundColor: tema.inputBackground }]}
                      placeholder="Explique ao professor por que a nota não pode ser alterada..."
                      placeholderTextColor={tema.textoSecundario}
                      multiline
                    />
                    <View style={styles.rowBotoesAcao}>
                      <TouchableOpacity onPress={() => setMostraInputRecusa(false)} style={{ marginRight: 15 }}>
                        <Text style={{ color: tema.textoSecundario }}>Cancelar</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={[styles.btnEnviarPequeno, { backgroundColor: '#C62828' }]}>
                        <Text style={styles.textoBotaoBranco}>Confirmar Recusa</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              </View>
            )}
          </View>
        )}
      </View>
    );
  };

  return (
    <KeyboardAvoidingView style={[styles.container, { backgroundColor: tema.fundoBase }]} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      
      <View style={[styles.header, { backgroundColor: tema.fundoTopo }]}>
        <View style={styles.barraTestes}>
          <TouchableOpacity onPress={() => setTipoUsuario(tipoUsuario === 'professor' ? 'coordenador' : 'professor')}>
            <Text style={styles.textoTeste}>Visão: {tipoUsuario.toUpperCase()}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setPeriodoAberto(!periodoAberto)}>
            <Text style={styles.textoTeste}>Prazo: {periodoAberto ? 'ABERTO' : 'FECHADO'}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.back()} style={styles.btnVoltar}>
            <Ionicons name="arrow-back" size={24} color={tema.textoLogo} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={[styles.titulo, { color: tema.textoLogo }]}>{params.avaliacao || 'Avaliação'}</Text>
            <View style={styles.subtituloRow}>
              <Text style={[styles.subtitulo, { color: tema.textoLogo, opacity: 0.8 }]}>{params.turma} • {params.materia}</Text>
              <Text style={[styles.subtitulo, { color: tema.textoLogo, fontWeight: 'bold' }]}>Valor: {valorMaximoProva.toFixed(1)}</Text>
            </View>
          </View>
        </View>

        <View style={styles.prazoContainer}>
          <View style={[styles.avisoPrazo, { backgroundColor: periodoAberto ? '#2E7D32' : '#C62828' }]}>
            <Ionicons name={periodoAberto ? "lock-open" : "lock-closed"} size={12} color="#FFF" />
            <Text style={styles.textoAvisoPrazo}>{periodoAberto ? "Aberto" : "Encerrado"}</Text>
          </View>

          {tipoUsuario === 'coordenador' && (
            <TouchableOpacity 
              style={styles.btnEncerrarCoord} 
              onPress={() => setPeriodoAberto(!periodoAberto)}
            >
              <Text style={styles.textoEncerrarCoord}>{periodoAberto ? 'Encerrar Prazo' : 'Reabrir Prazo'}</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      <FlatList
        data={alunos}
        keyExtractor={(item) => item.id}
        renderItem={renderAluno}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />
    </KeyboardAvoidingView>
  );
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