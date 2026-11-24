import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, KeyboardAvoidingView, Platform, RefreshControl, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { useDemoProfile } from '../../contexts/demoProfileContext';
import { db } from '../../config/firebase';

const ID_PROFESSOR_DEMONSTRATIVO = 'prof_1';
const LOGS_SISTEMA_FALLBACK = [
  { id: 'log_1', tipo: 'usuario', titulo: 'Usuário Cadastrado', detalhe: 'Rafael Nunes (Professor) vinculado à base por Marina Andrade', dataFormatada: 'Ontem, 14:15' },
  { id: 'log_2', tipo: 'turma', titulo: 'Turma Cadastrada', detalhe: '6º Ano A (Matutino) criada por Marina Andrade', dataFormatada: 'Ontem, 10:30' },
];
const CHAMADOS_ENCERRADOS_FALLBACK = [
  { id: 'ch_1', titulo: 'Erro ao sincronizar turma 6º Ano A', detalhe: 'Resolvido por Marina Andrade', dataFormatada: 'Hoje, 18:40' },
];
const BOLETINS_DEMO = [
  { id: 'b1', aluno: 'Ana Carolina', turma: '1º Ano Médio', disciplina: 'Matemática', notas: { un1: 8.5, un2: null, un3: null, un4: null } },
  { id: 'b2', aluno: 'Carlos Eduardo', turma: '1º Ano Médio', disciplina: 'Matemática', notas: { un1: 5.5, un2: null, un3: null, un4: null } },
  { id: 'b3', aluno: 'Mariana Silva', turma: '9º Ano C', disciplina: 'Física', notas: { un1: 9.0, un2: 8.5, un3: null, un4: null } },
  { id: 'b4', aluno: 'João Pedro', turma: '6º Ano A', disciplina: 'Matemática', notas: { un1: 7.0, un2: 7.5, un3: 8.0, un4: null } },
];

const formatarData = (dataInput: any) => {
  if (!dataInput) return 'Recente';
  const dataObjeto = dataInput?.toDate ? dataInput.toDate() : new Date(dataInput);
  if (isNaN(dataObjeto.getTime())) return 'Recente';
  const hoje = new Date();
  const ontem = new Date(hoje);
  ontem.setDate(ontem.getDate() - 1);
  const hora = dataObjeto.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  if (dataObjeto.toDateString() === hoje.toDateString()) return `Hoje, ${hora}`;
  if (dataObjeto.toDateString() === ontem.toDateString()) return `Ontem, ${hora}`;
  return `${dataObjeto.toLocaleDateString('pt-BR')} às ${hora}`;
};

export default function HistoricoScreen() {
  const router = useRouter();
  const { aba } = useLocalSearchParams<{ aba?: string }>();
  const { perfil, temaAtivo: tema } = useDemoProfile();
  const isAdmin = perfil === 'admin';

  const [abaAtiva, setAbaAtiva] = useState<string>(isAdmin ? 'auditoria' : 'frequencia');
  const [busca, setBusca] = useState('');
  const [historicoChamadas, setHistoricoChamadas] = useState<any[]>([]);
  const [logsSistema, setLogsSistema] = useState<any[]>([]);
  const [chamadosEncerrados, setChamadosEncerrados] = useState<any[]>([]);
  const [turmasProfessorDemo, setTurmasProfessorDemo] = useState<{ ids: string[]; nomes: string[] }>({ ids: [], nomes: [] });
  const [carregando, setCarregando] = useState(true);
  const [turmasExpandidas, setTurmasExpandidas] = useState<string[]>([]);

  useEffect(() => {
    setAbaAtiva(isAdmin ? (aba === 'chamados' ? 'chamados' : 'auditoria') : 'frequencia');
    setBusca('');
  }, [isAdmin, aba]);

  const buscarDados = useCallback(async () => {
    setCarregando(true);
    try {
      const turmasSnap = await getDocs(collection(db, 'turmas'));
      const dicTurmas: Record<string, string> = {};
      const turmasAtribuidas: { ids: string[]; nomes: string[] } = { ids: [], nomes: [] };
      const logsMontados: any[] = [];

      turmasSnap.forEach(docSnap => {
        const turma = docSnap.data();
        dicTurmas[docSnap.id] = turma.nome;
        if (turma.professorId === ID_PROFESSOR_DEMONSTRATIVO) {
          turmasAtribuidas.ids.push(docSnap.id);
          if (typeof turma.nome === 'string') turmasAtribuidas.nomes.push(turma.nome);
        }
        if (turma.criadoPor) {
          logsMontados.push({
            id: `turma_${docSnap.id}`, tipo: 'turma', titulo: 'Turma Cadastrada',
            detalhe: `${turma.nome} (${turma.turno || 'Turno regular'}) criada por ${turma.criadoPor}`,
            dataFormatada: formatarData(turma.criadoEm),
          });
        }
      });
      setTurmasProfessorDemo(turmasAtribuidas);

      if (isAdmin) {
        try {
          const uSnap = await getDocs(collection(db, 'usuarios'));
          uSnap.forEach(docSnap => {
            const u = docSnap.data();
            if (u.criadoPor) {
              logsMontados.push({
                id: `user_${docSnap.id}`, tipo: 'usuario', titulo: 'Usuário Cadastrado',
                detalhe: `${u.nome} (${u.role || 'usuário'}) cadastrado por ${u.criadoPor}`,
                dataFormatada: formatarData(u.criadoEm),
              });
            }
          });
        } catch {}

        const encerrados: any[] = [];
        try {
          const chSnap = await getDocs(collection(db, 'chamados_suporte'));
          chSnap.forEach(docSnap => {
            const c = docSnap.data();
            if (['encerrado', 'resolvido', 'concluido'].includes(c.status)) {
              encerrados.push({
                id: `chamado_${docSnap.id}`,
                titulo: c.descricao || c.titulo || 'Ticket de suporte',
                detalhe: `Encerrado por ${c.encerradoPor || 'Administrador'}`,
                dataFormatada: formatarData(c.encerradoEm || c.atualizadoEm),
              });
            }
          });
        } catch {}

        setLogsSistema(logsMontados.length > 0 ? logsMontados : LOGS_SISTEMA_FALLBACK);
        setChamadosEncerrados(encerrados.length > 0 ? encerrados : CHAMADOS_ENCERRADOS_FALLBACK);
      } else {
        const chamadasSnap = await getDocs(query(collection(db, 'chamadas'), orderBy('dataChamada', 'desc')));
        const registrosMontados: any[] = [];
        chamadasSnap.forEach(docSnap => {
          const dados = docSnap.data();
          let presentes = 0, faltas = 0;
          dados.alunos?.forEach((aluno: any) => {
            if (aluno.presencas?.some((p: boolean) => p === false)) faltas++;
            else presentes++;
          });
          registrosMontados.push({
            id: docSnap.id, turmaId: dados.turmaId,
            turmaNome: dicTurmas[dados.turmaId] || 'Turma não encontrada',
            dataFormatada: formatarData(dados.dataChamada), presentes, faltas,
          });
        });
        setHistoricoChamadas(registrosMontados);
      }
    } catch (error) {
      console.error('Erro ao buscar histórico:', error);
    } finally {
      setCarregando(false);
    }
  }, [isAdmin]);

  useEffect(() => { void buscarDados(); }, [buscarDados]);

  const voltarTela = () => (router.canGoBack() ? router.back() : router.push('/(tabs)'));
  const isBuscando = busca.trim().length > 0;
  const termo = busca.toLowerCase();

  const logsFiltrados = logsSistema.filter(l => [l.titulo, l.detalhe, l.dataFormatada].some(v => v?.toLowerCase().includes(termo)));
  const chamadosFiltrados = chamadosEncerrados.filter(c => [c.titulo, c.detalhe, c.dataFormatada].some(v => v?.toLowerCase().includes(termo)));

  const chamadasFiltradas = (perfil === 'professor' ? historicoChamadas.filter(i => turmasProfessorDemo.ids.includes(i.turmaId)) : historicoChamadas)
    .filter(i => i.turmaNome.toLowerCase().includes(termo) || i.dataFormatada.toLowerCase().includes(termo));

  const boletinsDoPerfil = perfil === 'professor' ? BOLETINS_DEMO.filter(b => turmasProfessorDemo.nomes.includes(b.turma)) : BOLETINS_DEMO;
  const boletinsFiltrados = boletinsDoPerfil.filter(b =>
    b.aluno.toLowerCase().includes(termo) || b.turma.toLowerCase().includes(termo) || b.disciplina.toLowerCase().includes(termo)
  );
  const turmasUnicas = Array.from(new Set(boletinsDoPerfil.map(b => b.turma)));
  const toggleTurma = (nome: string) => setTurmasExpandidas(prev => (prev.includes(nome) ? prev.filter(t => t !== nome) : [...prev, nome]));

  const renderCabecalhoCard = (icone: keyof typeof Ionicons.glyphMap, cor: string, titulo: string, data: string) => (
    <View style={[styles.linhaCabecalho, { marginBottom: 8 }]}>
      <View style={[styles.linhaTitulo, { flex: 1, marginRight: 8 }]}>
        <Ionicons name={icone} size={18} color={cor} style={{ marginRight: 8 }} />
        <Text style={[styles.tituloAtividade, { color: tema.textoPrincipal, flex: 1 }]} numberOfLines={2}>{titulo}</Text>
      </View>
      <Text style={[styles.textoData, { color: tema.textoSecundario }]}>{data}</Text>
    </View>
  );

  const renderLogSistema = ({ item }: { item: any }) => (
    <View style={[styles.cardItem, { backgroundColor: tema.inputBackground, borderColor: tema.borda, marginBottom: 12 }]}>
      {renderCabecalhoCard(item.tipo === 'usuario' ? 'person-add-outline' : 'layers-outline', tema.botaoPrimario, item.titulo, item.dataFormatada)}
      <Text style={[styles.textoDetalhe, { color: tema.textoSecundario, paddingLeft: 26 }]}>{item.detalhe}</Text>
    </View>
  );

  const renderChamadoEncerrado = ({ item }: { item: any }) => (
    <View style={[styles.cardItem, { backgroundColor: tema.inputBackground, borderColor: tema.borda, marginBottom: 12 }]}>
      {renderCabecalhoCard('checkmark-done-circle-outline', '#2E7D32', item.titulo, item.dataFormatada)}
      <View style={styles.rodapeChamado}>
        <Text style={[styles.textoDetalhe, { color: tema.textoSecundario, flex: 1 }]}>{item.detalhe}</Text>
        <View style={[styles.pillEncerrado, { backgroundColor: '#2E7D3220' }]}>
          <Text style={{ color: '#2E7D32', fontSize: 10, fontWeight: 'bold' }}>Encerrado</Text>
        </View>
      </View>
    </View>
  );

  const renderChamada = ({ item }: { item: any }) => (
    <TouchableOpacity style={[styles.cardItem, { backgroundColor: tema.inputBackground, borderColor: tema.borda, marginBottom: 12 }]} activeOpacity={0.7} onPress={() => router.push(`/chamada?id=${item.turmaId}`)}>
      {renderCabecalhoCard('checkmark-circle-outline', '#2E7D32', 'Diário Assinado', item.dataFormatada)}
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
            <View style={[styles.iconePessoa, { backgroundColor: tema.botaoPrimario + '20' }]}><Ionicons name="person" size={16} color={tema.botaoPrimario} /></View>
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
              <Text style={[styles.valorNota, { color: item.notas[`un${un}`] ? tema.textoPrincipal : tema.textoSecundario }]}>{item.notas[`un${un}`] ? item.notas[`un${un}`].toFixed(1) : '-'}</Text>
            </View>
          ))}
        </View>
      </View>
    );
  };

  const renderPasta = ({ item }: { item: any }) => {
    if (isBuscando) return renderBoletim(item, true);
    const isExpanded = turmasExpandidas.includes(item);
    const alunosDaTurma = boletinsDoPerfil.filter(b => b.turma === item);
    return (
      <View style={{ marginBottom: 14 }}>
        <TouchableOpacity style={[styles.cardPasta, { backgroundColor: tema.inputBackground, borderColor: tema.borda }]} activeOpacity={0.7} onPress={() => toggleTurma(item)}>
          <View style={styles.linhaTitulo}>
            <Ionicons name={isExpanded ? 'folder-open' : 'folder'} size={22} color={tema.botaoPrimario} style={{ marginRight: 12 }} />
            <Text style={[styles.tituloPasta, { color: tema.textoPrincipal }]}>{item}</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={{ color: tema.textoSecundario, fontSize: 12, marginRight: 8, fontWeight: 'bold' }}>{alunosDaTurma.length} {alunosDaTurma.length === 1 ? 'aluno' : 'alunos'}</Text>
            <Ionicons name={isExpanded ? 'chevron-down' : 'chevron-forward'} size={20} color={tema.textoSecundario} />
          </View>
        </TouchableOpacity>
        {isExpanded && <View style={[styles.conteudoPasta, { borderLeftColor: tema.borda }]}>{alunosDaTurma.map(aluno => renderBoletim(aluno, false))}</View>}
      </View>
    );
  };

  const abaPrimaria = abaAtiva === 'auditoria' || abaAtiva === 'frequencia';
  const listaAtual = isAdmin
    ? (abaAtiva === 'auditoria' ? logsFiltrados : chamadosFiltrados)
    : (abaAtiva === 'frequencia' ? chamadasFiltradas : isBuscando ? boletinsFiltrados : turmasUnicas);
  const renderAtual = isAdmin
    ? (abaAtiva === 'auditoria' ? renderLogSistema : renderChamadoEncerrado)
    : (abaAtiva === 'frequencia' ? renderChamada : renderPasta);

  return (
    <KeyboardAvoidingView style={[styles.container, { backgroundColor: tema.fundoBase }]} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={[styles.header, { backgroundColor: tema.fundoTopo }]}>
        <View style={styles.topoCabecalho}>
          <TouchableOpacity onPress={voltarTela} style={styles.btnVoltar} activeOpacity={0.7} accessibilityLabel="Voltar">
            <Ionicons name="arrow-back" size={24} color={tema.textoLogo} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={[styles.tituloHeader, { color: tema.textoLogo }]}>{isAdmin ? 'Central de Auditoria' : 'Central de Consultas'}</Text>
            <Text style={[styles.subtituloHeader, { color: tema.textoLogo }]}>
              {isAdmin ? 'Logs administrativos e histórico de chamados encerrados' : perfil === 'coordenador' ? 'Acompanhamento pedagógico de frequência e desempenho' : 'Diários e notas das turmas atribuídas'}
            </Text>
          </View>
        </View>

        <View style={styles.badgeDemonstracao}><Text style={styles.textoBadgeDemonstracao}>Modo demonstração</Text></View>

        <View style={styles.tabContainer}>
          <TouchableOpacity style={[styles.tabButton, abaPrimaria && { backgroundColor: 'rgba(255,255,255,0.22)' }]} onPress={() => { setAbaAtiva(isAdmin ? 'auditoria' : 'frequencia'); setBusca(''); }}>
            <Text style={[styles.tabText, { color: tema.textoLogo, opacity: abaPrimaria ? 1 : 0.65 }]}>{isAdmin ? 'Log de Auditoria' : 'Diários de Classe'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.tabButton, !abaPrimaria && { backgroundColor: 'rgba(255,255,255,0.22)' }]} onPress={() => { setAbaAtiva(isAdmin ? 'chamados' : 'notas'); setBusca(''); }}>
            <Text style={[styles.tabText, { color: tema.textoLogo, opacity: !abaPrimaria ? 1 : 0.65 }]}>{isAdmin ? 'Chamados Encerrados' : 'Alunos e Notas'}</Text>
          </TouchableOpacity>
        </View>

        <View style={[styles.searchContainer, { backgroundColor: tema.inputBackground, borderColor: tema.borda }]}>
          <Ionicons name="search" size={20} color={tema.textoSecundario} style={styles.searchIcon} />
          <TextInput
            style={[styles.searchInput, { color: tema.textoPrincipal }]}
            placeholder={isAdmin ? (abaAtiva === 'auditoria' ? 'Pesquisar por ação ou responsável...' : 'Pesquisar por chamado ou responsável...') : (abaAtiva === 'frequencia' ? 'Pesquisar por turma ou data...' : 'Pesquisar por nome, turma ou matéria...')}
            placeholderTextColor={tema.textoSecundario}
            value={busca}
            onChangeText={setBusca}
          />
        </View>
      </View>

      {carregando ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={tema.botaoPrimario} />
          <Text style={{ marginTop: 10, color: tema.textoSecundario }}>Carregando registros...</Text>
        </View>
      ) : (
        <FlatList
          data={listaAtual}
          keyExtractor={(item, index) => item.id || index.toString()}
          renderItem={renderAtual}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={carregando} onRefresh={() => void buscarDados()} tintColor={tema.botaoPrimario} />}
          ListEmptyComponent={
            <View style={{ alignItems: 'center', marginTop: 40 }}>
              <Ionicons name="search-outline" size={50} color={tema.borda} />
              <Text style={{ textAlign: 'center', marginTop: 15, color: tema.textoSecundario, fontSize: 16 }}>{busca.trim() ? 'Nenhum resultado encontrado para a pesquisa.' : 'Nenhum registro disponível.'}</Text>
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
  topoCabecalho: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  btnVoltar: { paddingTop: 3, paddingRight: 4 },
  tituloHeader: { fontSize: 24, fontWeight: 'bold' },
  subtituloHeader: { fontSize: 13, opacity: 0.85, marginBottom: 15, marginTop: 2 },
  badgeDemonstracao: { alignSelf: 'flex-start', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 4, marginBottom: 15, backgroundColor: 'rgba(255,255,255,0.16)' },
  textoBadgeDemonstracao: { color: '#FFF', fontSize: 11, fontWeight: '600' },
  tabContainer: { flexDirection: 'row', backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: 10, padding: 4, marginBottom: 15 },
  tabButton: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 8 },
  tabText: { fontSize: 13, fontWeight: 'bold' },
  searchContainer: { flexDirection: 'row', alignItems: 'center', height: 45, borderRadius: 10, borderWidth: 1, paddingHorizontal: 10 },
  searchIcon: { marginRight: 8 }, searchInput: { flex: 1, height: '100%', fontSize: 14 },
  listContent: { padding: 20, paddingBottom: 40 },
  cardItem: { borderWidth: 1, borderRadius: 12, padding: 15, overflow: 'hidden' },
  linhaCabecalho: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  linhaTitulo: { flexDirection: 'row', alignItems: 'center' },
  tituloAtividade: { fontSize: 15, fontWeight: 'bold' },
  textoData: { fontSize: 11, fontStyle: 'italic', marginTop: 3 },
  corpoCard: { paddingLeft: 26 },
  textoTurma: { fontSize: 13, fontWeight: '700', marginBottom: 4 },
  textoDetalhe: { fontSize: 13, lineHeight: 18 },
  rodapeChamado: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingLeft: 26, marginTop: 4, gap: 10 },
  pillEncerrado: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  iconePessoa: { width: 34, height: 34, borderRadius: 17, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  badgeMedia: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  textoMedia: { fontSize: 12, fontWeight: 'bold' },
  gradeNotas: { flexDirection: 'row', justifyContent: 'space-between', paddingTop: 12, marginTop: 5, borderTopWidth: 1 },
  colunaNota: { alignItems: 'center', flex: 1 },
  labelUnidade: { fontSize: 11, marginBottom: 4 },
  valorNota: { fontSize: 14, fontWeight: 'bold' },
  cardPasta: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1, borderRadius: 12, padding: 15 },
  tituloPasta: { fontSize: 16, fontWeight: 'bold' },
  conteudoPasta: { paddingLeft: 15, paddingTop: 10, borderLeftWidth: 2, marginLeft: 15, marginTop: 5 },
});