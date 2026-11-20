import React, { useMemo, useState } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useColorScheme,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { cores } from '../../constants/colors';
import { useDemoProfile } from '../../contexts/demoProfileContext';

type PerfilUsuario = 'Administrador' | 'Coordenador' | 'Professor';
type FiltroPerfil = 'Todos' | PerfilUsuario;
type SituacaoUsuario = 'Ativo' | 'Inativo';
type FiltroSituacao = 'Todas' | SituacaoUsuario;

interface UsuarioDemonstrativo {
  id: string;
  nome: string;
  email: string;
  perfil: PerfilUsuario;
  situacao: SituacaoUsuario;
}

const USUARIOS_DEMONSTRATIVOS: UsuarioDemonstrativo[] = [
  { id: '1', nome: 'Marina Andrade', email: 'marina.andrade@violeta.demo', perfil: 'Administrador', situacao: 'Ativo' },
  { id: '2', nome: 'Camila Rocha', email: 'camila.rocha@violeta.demo', perfil: 'Coordenador', situacao: 'Ativo' },
  { id: '3', nome: 'Rafael Nunes', email: 'rafael.nunes@violeta.demo', perfil: 'Professor', situacao: 'Ativo' },
  { id: '4', nome: 'João Almeida', email: 'joao.almeida@violeta.demo', perfil: 'Professor', situacao: 'Inativo' },
  { id: '5', nome: 'Larissa Santos', email: 'larissa.santos@violeta.demo', perfil: 'Coordenador', situacao: 'Inativo' },
];

const FILTROS_PERFIL: FiltroPerfil[] = ['Todos', 'Administrador', 'Coordenador', 'Professor'];
const FILTROS_SITUACAO: FiltroSituacao[] = ['Todas', 'Ativo', 'Inativo'];

export default function UsuariosScreen() {
  const router = useRouter();
  const { perfil } = useDemoProfile();
  const isDarkMode = useColorScheme() === 'dark';
  const tema = isDarkMode ? cores.dark : cores.light;

  const [busca, setBusca] = useState('');
  const [perfilFiltro, setPerfilFiltro] = useState<FiltroPerfil>('Todos');
  const [situacaoFiltro, setSituacaoFiltro] = useState<FiltroSituacao>('Todas');
  const [usuarioSelecionado, setUsuarioSelecionado] = useState<UsuarioDemonstrativo | null>(null);

  const usuariosFiltrados = useMemo(() => {
    const termo = busca.trim().toLocaleLowerCase('pt-BR');

    return USUARIOS_DEMONSTRATIVOS.filter(usuario =>
      usuario.nome.toLocaleLowerCase('pt-BR').includes(termo) &&
      (perfil === 'coordenador'
        ? usuario.perfil === 'Professor'
        : perfilFiltro === 'Todos' || usuario.perfil === perfilFiltro) &&
      (situacaoFiltro === 'Todas' || usuario.situacao === situacaoFiltro)
    );
  }, [busca, perfil, perfilFiltro, situacaoFiltro]);

  const voltar = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)');
  };

  const renderUsuario = ({ item }: { item: UsuarioDemonstrativo }) => (
    <TouchableOpacity
      style={[styles.cardUsuario, { backgroundColor: tema.inputBackground, borderColor: tema.borda }]}
      onPress={() => setUsuarioSelecionado(item)}
      activeOpacity={0.75}
      accessibilityRole="button"
      accessibilityLabel={`Ver dados de ${item.nome}`}
    >
      <View style={[styles.iconeUsuario, { backgroundColor: tema.botaoPrimario + '20' }]}>
        <Ionicons name="person" size={21} color={tema.botaoPrimario} />
      </View>
      <View style={styles.infoUsuario}>
        <Text style={[styles.nomeUsuario, { color: tema.textoPrincipal }]}>{item.nome}</Text>
        <Text style={[styles.perfilUsuario, { color: tema.textoSecundario }]}>{item.perfil}</Text>
      </View>
      <View style={[styles.badgeSituacao, { backgroundColor: item.situacao === 'Ativo' ? '#E8F5E9' : '#FFEBEE' }]}>
        <Text style={[styles.textoSituacao, { color: item.situacao === 'Ativo' ? '#2E7D32' : '#C62828' }]}>
          {item.situacao}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={tema.icone} style={{ marginLeft: 8 }} />
    </TouchableOpacity>
  );

  if (perfil === 'professor') {
    return (
      <View style={[styles.acessoRestrito, { backgroundColor: tema.fundoBase }]}>
        <Ionicons name="lock-closed-outline" size={42} color={tema.textoSecundario} />
        <Text style={[styles.textoAcessoRestrito, { color: tema.textoPrincipal }]}>
          Esta tela não está disponível no perfil Professor demonstrativo.
        </Text>
        <TouchableOpacity style={[styles.botaoVoltar, { backgroundColor: tema.botaoPrimario }]} onPress={voltar}>
          <Text style={styles.textoBotaoVoltar}>Voltar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: tema.fundoBase }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={[styles.header, { backgroundColor: tema.fundoTopo }]}>
        <View style={styles.headerLinha}>
          <TouchableOpacity onPress={voltar} style={styles.botaoVoltarHeader} accessibilityRole="button" accessibilityLabel="Voltar">
            <Ionicons name="arrow-back" size={24} color={tema.textoLogo} />
          </TouchableOpacity>
          <View style={styles.headerTexto}>
            <Text style={[styles.titulo, { color: tema.textoLogo }]}>
              {perfil === 'coordenador' ? 'Professores' : 'Gestão de Usuários'}
            </Text>
            <Text style={[styles.subtitulo, { color: tema.textoLogo }]}>Modo demonstração</Text>
          </View>
        </View>
      </View>

      <View style={styles.filtros}>
        <View style={[styles.buscaContainer, { backgroundColor: tema.inputBackground, borderColor: tema.borda }]}>
          <Ionicons name="search" size={20} color={tema.textoSecundario} style={{ marginRight: 8 }} />
          <TextInput
            style={[styles.inputBusca, { color: tema.textoPrincipal }]}
            placeholder="Pesquisar por nome"
            placeholderTextColor={tema.textoSecundario}
            value={busca}
            onChangeText={setBusca}
            accessibilityLabel="Pesquisar usuários por nome"
          />
        </View>

        {perfil === 'admin' && (
          <>
            <Text style={[styles.rotuloFiltro, { color: tema.textoSecundario }]}>Perfil</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.listaFiltros}>
              {FILTROS_PERFIL.map(filtro => (
                <TouchableOpacity
                  key={filtro}
                  style={[styles.chipFiltro, { backgroundColor: perfilFiltro === filtro ? tema.botaoPrimario : tema.inputBackground, borderColor: tema.borda }]}
                  onPress={() => setPerfilFiltro(filtro)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: perfilFiltro === filtro }}
                >
                  <Text style={[styles.textoChip, { color: perfilFiltro === filtro ? tema.textoBotao : tema.textoPrincipal }]}>{filtro}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </>
        )}

        <Text style={[styles.rotuloFiltro, { color: tema.textoSecundario }]}>Situação</Text>
        <View style={styles.listaFiltros}>
          {FILTROS_SITUACAO.map(filtro => (
            <TouchableOpacity
              key={filtro}
              style={[styles.chipFiltro, { backgroundColor: situacaoFiltro === filtro ? tema.botaoPrimario : tema.inputBackground, borderColor: tema.borda }]}
              onPress={() => setSituacaoFiltro(filtro)}
              accessibilityRole="button"
              accessibilityState={{ selected: situacaoFiltro === filtro }}
            >
              <Text style={[styles.textoChip, { color: situacaoFiltro === filtro ? tema.textoBotao : tema.textoPrincipal }]}>{filtro}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <FlatList
        data={usuariosFiltrados}
        keyExtractor={item => item.id}
        renderItem={renderUsuario}
        contentContainerStyle={styles.listaUsuarios}
        keyboardShouldPersistTaps="handled"
        ListEmptyComponent={
          <Text style={[styles.listaVazia, { color: tema.textoSecundario }]}>Nenhum usuário encontrado.</Text>
        }
      />

      <Modal
        visible={usuarioSelecionado !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setUsuarioSelecionado(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalConteudo, { backgroundColor: tema.fundoBase }]}>
            <View style={[styles.modalHeader, { borderBottomColor: tema.borda }]}>
              <Text style={[styles.modalTitulo, { color: tema.textoPrincipal }]}>Dados do usuário</Text>
              <TouchableOpacity
                onPress={() => setUsuarioSelecionado(null)}
                accessibilityRole="button"
                accessibilityLabel="Fechar dados do usuário"
              >
                <Ionicons name="close" size={24} color={tema.textoSecundario} />
              </TouchableOpacity>
            </View>
            {usuarioSelecionado && (
              <View style={styles.detalhesUsuario}>
                <Text style={[styles.detalheRotulo, { color: tema.textoSecundario }]}>Nome</Text>
                <Text style={[styles.detalheValor, { color: tema.textoPrincipal }]}>{usuarioSelecionado.nome}</Text>
                <Text style={[styles.detalheRotulo, { color: tema.textoSecundario }]}>E-mail</Text>
                <Text style={[styles.detalheValor, { color: tema.textoPrincipal }]}>{usuarioSelecionado.email}</Text>
                <Text style={[styles.detalheRotulo, { color: tema.textoSecundario }]}>Perfil</Text>
                <Text style={[styles.detalheValor, { color: tema.textoPrincipal }]}>{usuarioSelecionado.perfil}</Text>
                <Text style={[styles.detalheRotulo, { color: tema.textoSecundario }]}>Situação</Text>
                <Text style={[styles.detalheValor, { color: tema.textoPrincipal }]}>{usuarioSelecionado.situacao}</Text>
                <Text style={[styles.avisoDemonstrativo, { color: tema.textoSecundario }]}>
                  Dados de exemplo. Nenhuma conta real é alterada.
                </Text>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingTop: 50, paddingBottom: 20, paddingHorizontal: 20, borderBottomLeftRadius: 20, borderBottomRightRadius: 20, elevation: 5 },
  headerLinha: { flexDirection: 'row', alignItems: 'center' },
  botaoVoltarHeader: { padding: 6, marginRight: 10 },
  headerTexto: { flex: 1 },
  titulo: { fontSize: 22, fontWeight: 'bold' },
  subtitulo: { fontSize: 12, opacity: 0.8, marginTop: 3 },
  filtros: { paddingHorizontal: 20, paddingTop: 18 },
  buscaContainer: { flexDirection: 'row', alignItems: 'center', height: 46, borderWidth: 1, borderRadius: 10, paddingHorizontal: 12 },
  inputBusca: { flex: 1, height: '100%', fontSize: 15 },
  rotuloFiltro: { fontSize: 12, fontWeight: '700', marginTop: 16, marginBottom: 8 },
  listaFiltros: { flexDirection: 'row', gap: 8, paddingRight: 4 },
  chipFiltro: { borderWidth: 1, borderRadius: 18, paddingHorizontal: 12, paddingVertical: 8 },
  textoChip: { fontSize: 12, fontWeight: '600' },
  listaUsuarios: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 32, flexGrow: 1 },
  cardUsuario: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 12, padding: 12, marginBottom: 10 },
  iconeUsuario: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  infoUsuario: { flex: 1 },
  nomeUsuario: { fontSize: 15, fontWeight: '700' },
  perfilUsuario: { fontSize: 12, marginTop: 3 },
  badgeSituacao: { borderRadius: 12, paddingHorizontal: 8, paddingVertical: 5 },
  textoSituacao: { fontSize: 10, fontWeight: '700' },
  listaVazia: { textAlign: 'center', marginTop: 30, fontSize: 14 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalConteudo: { borderTopLeftRadius: 22, borderTopRightRadius: 22, paddingBottom: 30 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, borderBottomWidth: 1 },
  modalTitulo: { fontSize: 18, fontWeight: 'bold' },
  detalhesUsuario: { padding: 20 },
  detalheRotulo: { fontSize: 12, marginTop: 12 },
  detalheValor: { fontSize: 15, fontWeight: '600', marginTop: 3 },
  avisoDemonstrativo: { fontSize: 12, marginTop: 22 },
  acessoRestrito: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  textoAcessoRestrito: { fontSize: 16, textAlign: 'center', marginTop: 16, marginBottom: 20 },
  botaoVoltar: { paddingHorizontal: 24, paddingVertical: 12, borderRadius: 10 },
  textoBotaoVoltar: { color: '#FFF', fontSize: 14, fontWeight: 'bold' },
});
