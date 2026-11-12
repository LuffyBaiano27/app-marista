import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, useColorScheme, TextInput, KeyboardAvoidingView, Platform, RefreshControl, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { cores } from '../../constants/colors';
import { useRouter } from 'expo-router';

// FIREBASE
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '../../config/firebase'; 

const USUARIO_LOGADO = { id: 'prof_1', nome: 'Luffy Baiano', cargo: 'Admin' };

export default function HistoricoScreen() {
  const router = useRouter();
  const isDarkMode = useColorScheme() === 'dark';
  const tema = isDarkMode ? cores.dark : cores.light;

  const [abaAtiva, setAbaAtiva] = useState('frequencia'); // 'frequencia' ou 'notas'
  const [busca, setBusca] = useState('');
  
  const [historicoChamadas, setHistoricoChamadas] = useState<any[]>([]);
  const [carregando, setCarregando] = useState(true);

  // ESTADO PARA CONTROLAR AS PASTAS ABERTAS (Acordeão)
  const [turmasExpandidas, setTurmasExpandidas] = useState<string[]>([]);

  // MOCK TEMPORÁRIO DE NOTAS (Até criarmos a tela avaliacoes.tsx e ligarmos ao Firebase)
  const [boletins] = useState([
    { id: 'b1', aluno: 'Ana Carolina', turma: '1º Ano Médio', disciplina: 'Matemática', notas: { un1: 8.5, un2: null, un3: null, un4: null } },
    { id: 'b2', aluno: 'Carlos Eduardo', turma: '1º Ano Médio', disciplina: 'Matemática', notas: { un1: 5.5, un2: null, un3: null, un4: null } },
    { id: 'b3', aluno: 'Mariana Silva', turma: '9º Ano C', disciplina: 'Física', notas: { un1: 9.0, un2: 8.5, un3: null, un4: null } },
    { id: 'b4', aluno: 'João Pedro', turma: '6º Ano A', disciplina: 'Matemática', notas: { un1: 7.0, un2: 7.5, un3: 8.0, un4: null } },
  ]);

  const formatarData = (dataString: string) => {
    const dataObjeto = new Date(dataString);
    const hoje = new Date();
    const ontem = new Date(hoje);
    ontem.setDate(ontem.getDate() - 1);

    const isHoje = dataObjeto.getDate() === hoje.getDate() && dataObjeto.getMonth() === hoje.getMonth() && dataObjeto.getFullYear() === hoje.getFullYear();
    const isOntem = dataObjeto.getDate() === ontem.getDate() && dataObjeto.getMonth() === ontem.getMonth() && dataObjeto.getFullYear() === ontem.getFullYear();

    const hora = dataObjeto.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

    if (isHoje) return `Hoje, ${hora}`;
    if (isOntem) return `Ontem, ${hora}`;
    return `${dataObjeto.toLocaleDateString('pt-BR')} às ${hora}`;
  };

  const buscarHistoricoChamadas = async () => {
    setCarregando(true);
    try {
      const turmasSnap = await getDocs(collection(db, 'turmas'));
      const dicTurmas: any = {};
      turmasSnap.forEach(doc => { dicTurmas[doc.id] = doc.data().nome; });

      const chamadasRef = collection(db, 'chamadas');
      const q = query(chamadasRef, orderBy('dataChamada', 'desc'));
      const chamadasSnap = await getDocs(q);
      
      const registrosMontados: any[] = [];
      chamadasSnap.forEach((doc) => {
        const dados = doc.data();
        let presentes = 0;
        let faltas = 0;

        if (dados.alunos) {
          dados.alunos.forEach((aluno: any) => {
            const teveFalta = aluno.presencas.some((p: boolean) => p === false);
            if (teveFalta) faltas++;
            else presentes++;
          });
        }

        registrosMontados.push({
          id: doc.id, turmaId: dados.turmaId, turmaNome: dicTurmas[dados.turmaId] || 'Turma não encontrada',
          dataFormatada: formatarData(dados.dataChamada), presentes, faltas
        });
      });

      setHistoricoChamadas(registrosMontados);
    } catch (error) {
      console.error("Erro ao buscar histórico:", error);
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    buscarHistoricoChamadas();
  }, []);

  // ==========================================
  // LÓGICA DE FILTRAGEM E AGRUPAMENTO
  // ==========================================
  const chamadasFiltradas = historicoChamadas.filter(item => 
    item.turmaNome.toLowerCase().includes(busca.toLowerCase()) || item.dataFormatada.toLowerCase().includes(busca.toLowerCase())
  );

  const isBuscando = busca.trim().length > 0;
  
  // Lista Plana (Usada quando há pesquisa)
  const boletinsFiltrados = boletins.filter(item => 
    item.aluno.toLowerCase().includes(busca.toLowerCase()) || item.turma.toLowerCase().includes(busca.toLowerCase()) || item.disciplina.toLowerCase().includes(busca.toLowerCase())
  );

  // Lista Agrupada por Pastas (Usada quando NÃO há pesquisa)
  const turmasUnicas = Array.from(new Set(boletins.map(b => b.turma)));

  const toggleTurma = (turmaNome: string) => {
    if (turmasExpandidas.includes(turmaNome)) {
      setTurmasExpandidas(turmasExpandidas.filter(t => t !== turmaNome));
    } else {
      setTurmasExpandidas([...turmasExpandidas, turmaNome]);
    }
  };

  // ==========================================
  // RENDERIZADORES DOS CARDS
  // ==========================================
  const renderChamada = ({ item }: { item: any }) => (
    <TouchableOpacity 
      style={[styles.cardItem, { backgroundColor: tema.inputBackground, borderColor: tema.borda }]} 
      activeOpacity={0.7}
      onPress={() => router.push(`/chamada?id=${item.turmaId}`)}
    >
      <View style={styles.linhaCabecalho}>
        <View style={styles.linhaTitulo}>
          <Ionicons name="checkmark-circle-outline" size={18} color="#2E7D32" style={{ marginRight: 8 }} />
          <Text style={[styles.tituloAtividade, { color: tema.textoPrincipal }]}>Diário Assinado</Text>
        </View>
        <Text style={[styles.textoData, { color: tema.textoSecundario }]}>{item.dataFormatada}</Text>
      </View>
      <View style={styles.corpoCard}>
        <Text style={[styles.textoTurma, { color: tema.textoPrincipal }]}>{item.turmaNome}</Text>
        <Text style={[styles.textoDetalhe, { color: tema.textoSecundario }]}>Validado com {item.presentes} presentes e {item.faltas} faltas.</Text>
      </View>
    </TouchableOpacity>
  );

  const renderBoletim = (item: any, isFlat = true) => {
    const notasValidas = Object.values(item.notas).filter(n => n !== null) as number[];
    const media = notasValidas.length > 0 ? (notasValidas.reduce((a, b) => a + b, 0) / notasValidas.length).toFixed(1) : '-';
    const isAprovado = media !== '-' && parseFloat(media) >= 7.0;
    const isRecuperacao = media !== '-' && parseFloat(media) < 7.0;

    return (
      <View key={item.id} style={[styles.cardItem, { backgroundColor: tema.inputBackground, borderColor: tema.borda, marginBottom: isFlat ? 15 : 10 }]}>
        <View style={styles.linhaCabecalho}>
          <View style={styles.linhaTitulo}>
            <View style={[styles.iconePessoa, { backgroundColor: tema.botaoPrimario + '20' }]}>
              <Ionicons name="person" size={16} color={tema.botaoPrimario} />
            </View>
            <View>
              <Text style={[styles.tituloAtividade, { color: tema.textoPrincipal }]}>{item.aluno}</Text>
              <Text style={[styles.textoDetalhe, { color: tema.textoSecundario, fontSize: 11 }]}>{item.turma} • {item.disciplina}</Text>
            </View>
          </View>
          
          <View style={[styles.badgeMedia, { backgroundColor: isAprovado ? '#E8F5E9' : isRecuperacao ? '#FFEBEE' : tema.borda }]}>
            <Text style={[styles.textoMedia, { color: isAprovado ? '#2E7D32' : isRecuperacao ? '#C62828' : tema.textoSecundario }]}>Média: {media}</Text>
          </View>
        </View>

        <View style={[styles.gradeNotas, { borderTopColor: tema.borda }]}>
          {[1, 2, 3, 4].map(un => (
            <View key={un} style={styles.colunaNota}>
              <Text style={[styles.labelUnidade, { color: tema.textoSecundario }]}>Un {un}</Text>
              <Text style={[styles.valorNota, { color: item.notas[`un${un}`] ? tema.textoPrincipal : tema.textoSecundario }]}>
                {item.notas[`un${un}`] ? item.notas[`un${un}`].toFixed(1) : '-'}
              </Text>
            </View>
          ))}
        </View>
      </View>
    );
  };

  const renderPastaBoletim = ({ item }: { item: any }) => {
    if (isBuscando) {
      // Se estiver a pesquisar, 'item' é o objeto completo do aluno. Renderiza lista plana.
      return renderBoletim(item, true);
    } else {
      // Se NÃO estiver a pesquisar, 'item' é uma string (nome da turma). Renderiza a Pasta (Acordeão).
      const turmaNome = item;
      const isExpanded = turmasExpandidas.includes(turmaNome);
      const alunosDaTurma = boletins.filter(b => b.turma === turmaNome);

      return (
        <View style={{ marginBottom: 15 }}>
          <TouchableOpacity 
            style={[styles.cardPasta, { backgroundColor: tema.botaoPrimario + '15', borderColor: tema.botaoPrimario + '40' }]} 
            activeOpacity={0.7}
            onPress={() => toggleTurma(turmaNome)}
          >
            <View style={styles.linhaTitulo}>
              <Ionicons name={isExpanded ? "folder-open" : "folder"} size={22} color={tema.botaoPrimario} style={{ marginRight: 12 }} />
              <Text style={[styles.tituloPasta, { color: tema.textoPrincipal }]}>{turmaNome}</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={{ color: tema.textoSecundario, fontSize: 12, marginRight: 8, fontWeight: 'bold' }}>{alunosDaTurma.length} alunos</Text>
              <Ionicons name={isExpanded ? "chevron-down" : "chevron-forward"} size={20} color={tema.textoSecundario} />
            </View>
          </TouchableOpacity>

          {/* ITENS DENTRO DA PASTA EXPANDIDA */}
          {isExpanded && (
            <View style={styles.conteudoPasta}>
              {alunosDaTurma.map(aluno => renderBoletim(aluno, false))}
            </View>
          )}
        </View>
      );
    }
  };

  return (
    <KeyboardAvoidingView style={[styles.container, { backgroundColor: tema.fundoBase }]} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={[styles.header, { backgroundColor: tema.fundoTopo }]}>
        <Text style={[styles.tituloHeader, { color: tema.textoLogo }]}>Central de Consultas</Text>
        <Text style={[styles.subtituloHeader, { color: tema.textoLogo }]}>Auditoria de faltas e desempenho</Text>
        
        {/* ABAS INTERNAS (SEGMENTED CONTROL) */}
        <View style={styles.tabContainer}>
          <TouchableOpacity 
            style={[styles.tabButton, abaAtiva === 'frequencia' && { backgroundColor: 'rgba(255,255,255,0.2)' }]} 
            onPress={() => { setAbaAtiva('frequencia'); setBusca(''); }}
          >
            <Text style={[styles.tabText, { color: tema.textoLogo, opacity: abaAtiva === 'frequencia' ? 1 : 0.6 }]}>Diários de Classe</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.tabButton, abaAtiva === 'notas' && { backgroundColor: 'rgba(255,255,255,0.2)' }]} 
            onPress={() => { setAbaAtiva('notas'); setBusca(''); }}
          >
            <Text style={[styles.tabText, { color: tema.textoLogo, opacity: abaAtiva === 'notas' ? 1 : 0.6 }]}>Alunos e Notas</Text>
          </TouchableOpacity>
        </View>

        <View style={[styles.searchContainer, { backgroundColor: tema.inputBackground, borderColor: tema.borda }]}>
          <Ionicons name="search" size={20} color={tema.textoSecundario} style={styles.searchIcon} />
          <TextInput 
            style={[styles.searchInput, { color: tema.textoPrincipal }]}
            placeholder={abaAtiva === 'frequencia' ? "Pesquisar por turma ou data..." : "Pesquisar por nome, turma ou matéria..."}
            placeholderTextColor={tema.textoSecundario} 
            value={busca}
            onChangeText={setBusca}
          />
        </View>
      </View>

      {carregando && abaAtiva === 'frequencia' ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={tema.botaoPrimario} />
          <Text style={{ marginTop: 10, color: tema.textoSecundario }}>Sincronizando registros...</Text>
        </View>
      ) : (
        <FlatList 
          data={abaAtiva === 'frequencia' ? chamadasFiltradas : (isBuscando ? boletinsFiltrados : turmasUnicas)} 
          keyExtractor={(item, index) => item.id || index.toString()}
          renderItem={abaAtiva === 'frequencia' ? renderChamada : renderPastaBoletim}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={abaAtiva === 'frequencia' ? <RefreshControl refreshing={carregando} onRefresh={buscarHistoricoChamadas} tintColor={tema.botaoPrimario} /> : undefined}
          ListEmptyComponent={
            <View style={{ alignItems: 'center', marginTop: 40 }}>
              <Ionicons name="search-outline" size={50} color={tema.borda} />
              <Text style={{ textAlign: 'center', marginTop: 15, color: tema.textoSecundario, fontSize: 16 }}>Nenhum resultado encontrado.</Text>
            </View>
          }
        />
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingTop: 50, paddingBottom: 20, paddingHorizontal: 20, elevation: 5, borderBottomLeftRadius: 20, borderBottomRightRadius: 20 },
  tituloHeader: { fontSize: 24, fontWeight: 'bold' },
  subtituloHeader: { fontSize: 13, opacity: 0.8, marginBottom: 15, marginTop: 2 },
  
  tabContainer: { flexDirection: 'row', backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: 10, padding: 4, marginBottom: 15 },
  tabButton: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 8 },
  tabText: { fontSize: 13, fontWeight: 'bold' },
  
  searchContainer: { flexDirection: 'row', alignItems: 'center', height: 45, borderRadius: 10, borderWidth: 1, paddingHorizontal: 10 },
  searchIcon: { marginRight: 8 }, searchInput: { flex: 1, height: '100%', fontSize: 14 },
  
  listContent: { padding: 20, paddingBottom: 40 },
  cardItem: { borderWidth: 1, borderRadius: 12, padding: 15, overflow: 'hidden' },
  linhaCabecalho: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 },
  linhaTitulo: { flexDirection: 'row', alignItems: 'center' },
  tituloAtividade: { fontSize: 15, fontWeight: 'bold' },
  textoData: { fontSize: 11, fontStyle: 'italic', marginTop: 3 },
  
  corpoCard: { paddingLeft: 26 },
  textoTurma: { fontSize: 13, fontWeight: '700', marginBottom: 4 }, textoDetalhe: { fontSize: 13 },
  
  iconePessoa: { width: 34, height: 34, borderRadius: 17, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  badgeMedia: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  textoMedia: { fontSize: 12, fontWeight: 'bold' },
  
  gradeNotas: { flexDirection: 'row', justifyContent: 'space-between', paddingTop: 12, marginTop: 5, borderTopWidth: 1 },
  colunaNota: { alignItems: 'center', flex: 1 },
  labelUnidade: { fontSize: 11, marginBottom: 4 },
  valorNota: { fontSize: 14, fontWeight: 'bold' },

  // ESTILOS DAS PASTAS
  cardPasta: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1, borderRadius: 12, padding: 15 },
  tituloPasta: { fontSize: 16, fontWeight: 'bold' },
  conteudoPasta: { paddingLeft: 15, paddingTop: 10, borderLeftWidth: 2, borderLeftColor: 'rgba(0,0,0,0.05)', marginLeft: 15, marginTop: 5 }
});