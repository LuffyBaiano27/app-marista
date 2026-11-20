import React, { useCallback, useState } from 'react';
import {
  Alert,
  FlatList,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useColorScheme,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { cores } from '../../constants/colors';
import { useDemoProfile } from '../../contexts/demoProfileContext';
import { collection, doc, getDocs, query, updateDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';

export default function ChamadosScreen() {
  const router = useRouter();
  const { perfil } = useDemoProfile();
  const isDarkMode = useColorScheme() === 'dark';
  const tema = isDarkMode ? cores.dark : cores.light;

  const [chamados, setChamados] = useState<any[]>([]);
  const [chamadoSelecionado, setChamadoSelecionado] = useState<any>(null);

  const buscarChamados = useCallback(async () => {
    try {
      const q = query(collection(db, 'chamados_suporte'));
      const snap = await getDocs(q);
      const lista: any[] = [];
      snap.forEach(d => lista.push({ id: d.id, ...d.data() }));

      lista.sort((a, b) => {
        if (a.status !== b.status) return a.status === 'pendente' ? -1 : 1;
        return b.timestamp - a.timestamp;
      });

      setChamados(lista);
    } catch (error) {
      console.error('Erro ao buscar chamados:', error);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (perfil === 'admin') void buscarChamados();
    }, [buscarChamados, perfil])
  );

  const resolverChamado = async (id: string) => {
    try {
      await updateDoc(doc(db, 'chamados_suporte', id), { status: 'resolvido' });
      setChamados(prev => prev.map(chamado => chamado.id === id ? { ...chamado, status: 'resolvido' } : chamado));
      setChamadoSelecionado(null);
      if (Platform.OS === 'web') window.alert('Sucesso!\nChamado finalizado e arquivado!');
      else Alert.alert('Sucesso', 'Chamado finalizado e arquivado!');
    } catch (error) {
      if (Platform.OS === 'web') window.alert('Erro ao resolver chamado.');
      else Alert.alert('Erro', 'Não foi possível resolver o chamado.');
    }
  };

  if (perfil !== 'admin') {
    return (
      <View style={[styles.acessoRestrito, { backgroundColor: tema.fundoBase }]}>
        <Text style={[styles.textoAcessoRestrito, { color: tema.textoPrincipal }]}>
          Chamados está disponível no perfil Administrador demonstrativo.
        </Text>
        <TouchableOpacity style={[styles.botaoVoltar, { backgroundColor: tema.botaoPrimario }]} onPress={() => router.navigate('/perfil')}>
          <Text style={styles.textoBotaoVoltar}>Voltar ao Perfil</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: tema.fundoBase }]}>
      <View style={[styles.header, { backgroundColor: tema.fundoTopo }]}>
        <TouchableOpacity
          onPress={() => router.navigate('/perfil')}
          style={styles.botaoVoltar}
          accessibilityRole="button"
          accessibilityLabel="Voltar ao Perfil"
        >
          <Ionicons name="arrow-back" size={24} color={tema.textoLogo} />
        </TouchableOpacity>
        <View style={styles.headerTexto}>
          <Text style={[styles.titulo, { color: tema.textoLogo }]}>Chamados</Text>
          <Text style={[styles.subtitulo, { color: tema.textoLogo }]}>Tickets da TI</Text>
        </View>
      </View>

      {chamadoSelecionado ? (
        <View style={styles.detalheChamado}>
          <View style={styles.linhaDetalhe}>
            <TouchableOpacity
              onPress={() => setChamadoSelecionado(null)}
              style={styles.botaoVoltarDetalhe}
              accessibilityRole="button"
              accessibilityLabel="Voltar à lista de chamados"
            >
              <Ionicons name="arrow-back" size={22} color={tema.textoPrincipal} />
              <Text style={[styles.textoVoltarDetalhe, { color: tema.textoPrincipal }]}>Lista de chamados</Text>
            </TouchableOpacity>
          </View>
          <Text style={[styles.textoSecundario, { color: tema.textoSecundario }]}>
            Aberto em: {chamadoSelecionado.data} às {chamadoSelecionado.hora}
          </Text>
          <Text style={[styles.rotulo, { color: tema.textoPrincipal }]}>Solicitante:</Text>
          <Text style={[styles.textoSecundario, { color: tema.textoSecundario }]}>{chamadoSelecionado.solicitante}</Text>
          <Text style={[styles.rotulo, { color: tema.textoPrincipal }]}>Descrição do Problema:</Text>
          <View style={[styles.descricao, { borderColor: tema.borda, backgroundColor: tema.inputBackground }]}>
            <Text style={{ color: tema.textoPrincipal }}>{chamadoSelecionado.descricao}</Text>
          </View>
          {chamadoSelecionado.status === 'pendente' && (
            <TouchableOpacity
              style={[styles.botaoAcao, { backgroundColor: '#2E7D32' }]}
              onPress={() => resolverChamado(chamadoSelecionado.id)}
            >
              <Text style={styles.textoBotaoAcao}>Marcar como Resolvido</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <FlatList
          data={chamados}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.lista}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.card, { borderColor: tema.borda, backgroundColor: tema.inputBackground, opacity: item.status === 'resolvido' ? 0.6 : 1 }]}
              onPress={() => setChamadoSelecionado(item)}
              accessibilityRole="button"
              accessibilityLabel={`Ver chamado de ${item.solicitante}`}
            >
              <View style={styles.linhaChamado}>
                <Ionicons
                  name={item.status === 'resolvido' ? 'checkmark-circle' : 'warning'}
                  size={20}
                  color={item.status === 'resolvido' ? '#2E7D32' : '#E65100'}
                  style={styles.iconeChamado}
                />
                <Text style={[styles.solicitante, { color: tema.textoPrincipal }]}>{item.solicitante}</Text>
              </View>
              <Text style={[styles.textoSecundario, { color: tema.textoSecundario }]}>{item.data} às {item.hora}</Text>
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <Text style={[styles.listaVazia, { color: tema.textoSecundario }]}>Nenhum chamado aberto.</Text>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingTop: 50, paddingBottom: 20, paddingHorizontal: 20, borderBottomLeftRadius: 20, borderBottomRightRadius: 20, elevation: 5 },
  botaoVoltar: { padding: 8, marginRight: 10 },
  headerTexto: { flex: 1 },
  titulo: { fontSize: 22, fontWeight: 'bold' },
  subtitulo: { fontSize: 12, opacity: 0.8, marginTop: 3 },
  lista: { padding: 20, flexGrow: 1 },
  card: { borderWidth: 1, borderRadius: 12, padding: 15, marginBottom: 12 },
  linhaChamado: { flexDirection: 'row', alignItems: 'center', marginBottom: 5 },
  iconeChamado: { marginRight: 8 },
  solicitante: { flex: 1, fontSize: 16, fontWeight: 'bold' },
  textoSecundario: { fontSize: 12 },
  listaVazia: { textAlign: 'center', marginTop: 20 },
  detalheChamado: { padding: 20 },
  linhaDetalhe: { marginBottom: 20 },
  botaoVoltarDetalhe: { flexDirection: 'row', alignItems: 'center' },
  textoVoltarDetalhe: { fontSize: 15, fontWeight: '600', marginLeft: 8 },
  rotulo: { fontSize: 14, fontWeight: 'bold', marginTop: 18, marginBottom: 6 },
  descricao: { borderWidth: 1, borderRadius: 10, padding: 15 },
  botaoAcao: { height: 48, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginTop: 30 },
  textoBotaoAcao: { color: '#FFF', fontSize: 14, fontWeight: 'bold' },
  acessoRestrito: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  textoAcessoRestrito: { fontSize: 16, textAlign: 'center', marginBottom: 20 },
  textoBotaoVoltar: { color: '#FFF', fontSize: 14, fontWeight: 'bold' },
});
