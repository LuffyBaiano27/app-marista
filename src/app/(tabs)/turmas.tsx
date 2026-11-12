import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, useColorScheme, TextInput, KeyboardAvoidingView, Platform, RefreshControl, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { cores } from '../../constants/colors';
import { useRouter } from 'expo-router';

// FIREBASE
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../../config/firebase'; 

const USUARIO_LOGADO = { id: 'prof_1', nome: 'Luffy Baiano', cargo: 'Admin' };

export default function TurmasScreen() {
  const router = useRouter();
  const isDarkMode = useColorScheme() === 'dark';
  const tema = isDarkMode ? cores.dark : cores.light;

  const [busca, setBusca] = useState('');
  
  // ESTADOS FIREBASE
  const [turmas, setTurmas] = useState<any[]>([]);
  const [chamadasRealizadasHoje, setChamadasRealizadasHoje] = useState<any>({}); // Dicionário: { turmaId: dataHoraFormatada }
  const [carregando, setCarregando] = useState(true);

  const hoje = new Date();
  const diaAtual = hoje.getDay(); 
  
  const dataFormatada = hoje.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });
  const dataHeader = dataFormatada.charAt(0).toUpperCase() + dataFormatada.slice(1);
  const getDataDeHoje = () => hoje.toISOString().split('T')[0];

  const diasDaSemanaNomes = { 1: 'Segunda-feira', 2: 'Terça-feira', 3: 'Quarta-feira', 4: 'Quinta-feira', 5: 'Sexta-feira' };

  const buscarDadosTurmas = async () => {
    setCarregando(true);
    try {
      // 1. Busca Turmas
      const turmasRef = collection(db, 'turmas');
      let qTurmas;
      if (USUARIO_LOGADO.cargo === 'Admin' || USUARIO_LOGADO.cargo === 'Coordenador') {
        qTurmas = query(turmasRef); 
      } else {
        qTurmas = query(turmasRef, where('professorId', '==', USUARIO_LOGADO.id));
      }
      
      const turmasSnap = await getDocs(qTurmas);
      const turmasBanco: any[] = [];
      turmasSnap.forEach((doc) => {
        const dados = doc.data();
        turmasBanco.push({ 
          id: doc.id, 
          diaSemana: diasDaSemanaNomes[dados.diaId as keyof typeof diasDaSemanaNomes] || 'Indefinido',
          ...dados 
        });
      });
      
      turmasBanco.sort((a, b) => {
        if (a.diaId !== b.diaId) return a.diaId - b.diaId;
        return a.horario.localeCompare(b.horario);
      });

      // 2. Busca Chamadas de HOJE para descobrir o Status real
      const chamadasRef = collection(db, 'chamadas');
      const qChamadas = query(chamadasRef, where('dataChamadaFormatada', '==', getDataDeHoje()));
      const chamadasSnap = await getDocs(qChamadas);
      
      const chamadasHojeDic: any = {};
      chamadasSnap.forEach((doc) => {
        const dados = doc.data();
        // Guarda a hora para exibir na UI
        const horaRealizada = new Date(dados.dataChamada).toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'});
        chamadasHojeDic[dados.turmaId] = horaRealizada;
      });

      setChamadasRealizadasHoje(chamadasHojeDic);
      setTurmas(turmasBanco);

    } catch (error) {
      console.error("Erro ao buscar grade de turmas:", error);
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    buscarDadosTurmas();
  }, []);

  const turmasFiltradas = turmas.filter(t => 
    t.nome.toLowerCase().includes(busca.toLowerCase()) || 
    t.diaSemana.toLowerCase().includes(busca.toLowerCase()) ||
    t.horario.includes(busca) ||
    (t.professorNome && t.professorNome.toLowerCase().includes(busca.toLowerCase())) 
  );

  const renderTurma = ({ item }: { item: any }) => {
    // A MÁGICA AQUI: O status é derivado se a turma tiver registo hoje!
    const horaRealizada = chamadasRealizadasHoje[item.id];
    const isRealizada = !!horaRealizada; 

    const diaBusca = (diaAtual === 0 || diaAtual === 6) ? 1 : diaAtual;
    const isDiaDaAula = item.diaId === diaBusca; 
    const isBloqueado = !isRealizada && !isDiaDaAula;

    return (
      <View style={[styles.cardTurma, { backgroundColor: tema.inputBackground, borderColor: tema.borda }]}>
        <View style={styles.corpoCard}>
          <View style={[styles.iconeTurmaBg, { backgroundColor: tema.botaoPrimario + '20' }]}>
            <Ionicons name="people" size={24} color={tema.botaoPrimario} />
          </View>
          
          <View style={styles.infoTurma}>
            <View style={styles.linhaTitulo}>
              <Text style={[styles.nomeTurma, { color: tema.textoPrincipal }]}>{item.nome}</Text>
              <View style={[styles.badgeStatus, { backgroundColor: isRealizada ? '#E8F5E9' : '#FFF3E0', borderColor: isRealizada ? '#A5D6A7' : '#FFCC80' }]}>
                <Text style={[styles.textoBadge, { color: isRealizada ? '#2E7D32' : '#EF6C00' }]}>
                  {isRealizada ? 'REALIZADA' : 'PENDENTE'}
                </Text>
              </View>
            </View>
            
            <Text style={[styles.materiaTurma, { color: tema.textoSecundario }]}>{item.disciplina || item.materia}</Text>
            
            <View style={styles.detalhesGrade}>
              {item.alunos && (
                <View style={styles.detalheRow}>
                  <Ionicons name="person" size={12} color={tema.textoSecundario} />
                  <Text style={[styles.textoDetalhe, { color: tema.textoSecundario }]}> {item.alunos} alunos</Text>
                </View>
              )}
              <View style={styles.detalheRow}>
                <Ionicons name="time" size={14} color={tema.botaoPrimario} />
                <Text style={[styles.textoHorario, { color: tema.botaoPrimario }]}> {item.diaSemana} • {item.horario}</Text>
              </View>
              {item.professorNome && (
                <View style={[styles.detalheRow, { marginTop: 2 }]}>
                  <Ionicons name="person-circle-outline" size={14} color={tema.textoSecundario} />
                  <Text style={[styles.textoProf, { color: tema.textoSecundario }]}> Prof. {item.professorNome}</Text>
                </View>
              )}
            </View>
          </View>
        </View>

        <TouchableOpacity 
          style={[styles.rodapeAcao, { borderTopColor: tema.borda }]}
          disabled={isBloqueado} 
          onPress={() => router.push(`/chamada?id=${item.id}`)}
        >
          {isRealizada ? (
            <>
              <Text style={[styles.textoAcao, { color: tema.botaoPrimario }]}>
                Consulta <Text style={{ fontStyle: 'italic', fontSize: 11 }}>(Realizada hoje às {horaRealizada})</Text>
              </Text>
              <Ionicons name="chevron-forward" size={18} color={tema.botaoPrimario} />
            </>
          ) : isBloqueado ? (
            <>
              <Text style={[styles.textoAcao, { color: tema.textoSecundario }]}>Fora do dia da aula</Text>
              <Ionicons name="lock-closed" size={16} color={tema.textoSecundario} />
            </>
          ) : (
            <>
              <Text style={[styles.textoAcao, { color: tema.botaoPrimario }]}>Fazer chamada</Text>
              <Ionicons name="chevron-forward" size={18} color={tema.botaoPrimario} />
            </>
          )}
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView style={[styles.container, { backgroundColor: tema.fundoBase }]} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={[styles.header, { backgroundColor: tema.fundoTopo }]}>
        <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'}}>
          <Text style={[styles.tituloHeader, { color: tema.textoLogo }]}>Grade de Aulas</Text>
          <Text style={{color: tema.textoLogo, opacity: 0.5, fontSize: 12}}>Modo: {USUARIO_LOGADO.cargo}</Text>
        </View>
        <Text style={[styles.subtituloData, { color: tema.textoLogo }]}>{dataHeader}</Text>
        
        <View style={[styles.searchContainer, { backgroundColor: tema.inputBackground, borderColor: tema.borda }]}>
          <Ionicons name="search" size={20} color={tema.textoSecundario} style={styles.searchIcon} />
          <TextInput 
            style={[styles.searchInput, { color: tema.textoPrincipal }]}
            placeholder="Buscar turma, professor ou horário..." 
            placeholderTextColor={tema.textoSecundario} 
            value={busca}
            onChangeText={setBusca}
          />
        </View>
      </View>

      {carregando ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={tema.botaoPrimario} />
          <Text style={{ marginTop: 10, color: tema.textoSecundario }}>Carregando Grade...</Text>
        </View>
      ) : (
        <FlatList 
          data={turmasFiltradas} 
          keyExtractor={(item) => item.id}
          renderItem={renderTurma}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={carregando} onRefresh={buscarDadosTurmas} tintColor={tema.botaoPrimario} />}
          ListEmptyComponent={<Text style={{ textAlign: 'center', marginTop: 20, color: tema.textoSecundario }}>Nenhuma turma encontrada.</Text>}
        />
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingTop: 50, paddingBottom: 20, paddingHorizontal: 20, elevation: 5, borderBottomLeftRadius: 20, borderBottomRightRadius: 20 },
  tituloHeader: { fontSize: 24, fontWeight: 'bold' },
  subtituloData: { fontSize: 13, opacity: 0.8, marginBottom: 20, marginTop: 2 },
  searchContainer: { flexDirection: 'row', alignItems: 'center', height: 45, borderRadius: 10, borderWidth: 1, paddingHorizontal: 10 },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, height: '100%', fontSize: 14 },
  
  listContent: { padding: 20, paddingBottom: 40 },
  cardTurma: { borderWidth: 1, borderRadius: 12, marginBottom: 15, overflow: 'hidden' },
  corpoCard: { flexDirection: 'row', padding: 15 },
  iconeTurmaBg: { width: 45, height: 45, borderRadius: 22.5, justifyContent: 'center', alignItems: 'center', marginRight: 15, marginTop: 5 },
  infoTurma: { flex: 1 },
  linhaTitulo: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  nomeTurma: { fontSize: 16, fontWeight: 'bold' },
  badgeStatus: { borderWidth: 1, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12 },
  textoBadge: { fontSize: 10, fontWeight: 'bold' },
  materiaTurma: { fontSize: 13, marginBottom: 8 },
  detalhesGrade: { gap: 2 },
  detalheRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 2 },
  textoDetalhe: { fontSize: 12 },
  textoHorario: { fontSize: 12, fontWeight: 'bold' },
  textoProf: { fontSize: 12, fontStyle: 'italic' },
  
  rodapeAcao: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 12, borderTopWidth: 1 },
  textoAcao: { fontSize: 13, fontWeight: 'bold' }
});