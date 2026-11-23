import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, useColorScheme,
  TextInput, KeyboardAvoidingView, Platform, RefreshControl, ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { cores } from '../../constants/colors';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useDemoProfile } from '../../contexts/demoProfileContext';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '../../config/firebase';

const ID_PROFESSOR_DEMONSTRATIVO = 'prof_1';

const LOGS_AUDITORIA_FALLBACK = [
  {
    id: 'log_1',
    tipo: 'chamado',
    titulo: 'Chamado Encerrado',
    detalhe: 'Erro ao sincronizar turma 6º Ano A — Resolvido por Marina Andrade',
    dataFormatada: 'Hoje, 18:40',
  },
  {
    id: 'log_2',
    tipo: 'usuario',
    titulo: 'Usuário Cadastrado',
    detalhe: 'Rafael Nunes (Professor) vinculado à base por Marina Andrade',
    dataFormatada: 'Ontem, 14:15',
  },
];

export default function HistoricoScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ aba?: string }>();
  const { perfil } = useDemoProfile();
  const tema = useColorScheme() === 'dark' ? cores.dark : cores.light;
  const isAdmin = perfil === 'admin';

  // Para Admin: 'auditoria' | 'alunos' — Para Prof/Coord: 'frequencia' | 'notas'
  const [abaAtiva, setAbaAtiva] = useState<string>(isAdmin ? 'auditoria' : 'frequencia');
  const [busca, setBusca] = useState('');

  const [historicoChamadas, setHistoricoChamadas] = useState<any[]>([]);
  const [logsAuditoria, setLogsAuditoria] = useState<any[]>([]);
  const [turmasProfessorDemo, setTurmasProfessorDemo] = useState<{ ids: string[]; nomes: string[] }>({ ids: [], nomes: [] });
  const [carregando, setCarregando] = useState(true);
  const [turmasExpandidas, setTurmasExpandidas] = useState<string[]>([]);

  const [boletins] = useState([
    { id: 'b1', aluno: 'Ana Carolina', turma: '1º Ano Médio', disciplina: 'Matemática', status: 'Ativo', notas: { un1: 8.5, un2: null, un3: null, un4: null } },
    { id: 'b2', aluno: 'Carlos Eduardo', turma: '1º Ano Médio', disciplina: 'Matemática', status: 'Ativo', notas: { un1: 5.5, un2: null, un3: null, un4: null } },
    { id: 'b3', aluno: 'Mariana Silva', turma: '9º Ano C', disciplina: 'Física', status: 'Ativo', notas: { un1: 9.0, un2: 8.5, un3: null, un4: null } },
    { id: 'b4', aluno: 'João Pedro', turma: '6º Ano A', disciplina: 'Matemática', status: 'Ativo', notas: { un1: 7.0, un2: 7.5, un3: 8.0, un4: null } },
  ]);

  // Sincroniza aba inicial quando vem da Home (?aba=auditoria ou ?aba=alunos) ou troca de perfil
  useEffect(() => {
    if (isAdmin) {
      setAbaAtiva(params.aba === 'alunos' ? 'alunos' : 'auditoria');
    } else {
      setAbaAtiva('frequencia');
    }
    setBusca('');
  }, [isAdmin, params.aba]);

  const formatarData = (dataInput: any) => {
    if (!dataInput) return 'Recente';
    const dataObjeto = dataInput?.toDate ? dataInput.toDate() : new Date(dataInput);
    if (isNaN(dataObjeto.getTime())) return 'Recente';
    const hoje = new Date();
    const ontem = new Date(hoje);
    ontem.setDate(ontem.getDate() - 1);

    const isHoje = dataObjeto.toDateString() === hoje.toDateString();
    const isOntem = dataObjeto.toDateString() === ontem.toDateString();
    const hora = dataObjeto.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

    if (isHoje) return `Hoje, ${hora}`;
    if (isOntem) return `Ontem, ${hora}`;
    return `${dataObjeto.toLocaleDateString('pt-BR')} às ${hora}`;
  };

  const buscarDados = async () => {
    setCarregando(true);
    try {
      const turmasSnap = await getDocs(collection(db, 'turmas'));
      const dicTurmas: Record<string, string> = {};
      const turmasAtribuidas: { ids: string[]; nomes: string[] } = { ids: [], nomes: [] };
      const logsMontados: any[] = [];

      turmasSnap.forEach(doc => {
        const turma = doc.data();
        dicTurmas[doc.id] = turma.nome;
        if (turma.professorId === ID_PROFESSOR_DEMONSTRATIVO) {
          turmasAtribuidas.ids.push(doc.id);
          if (typeof turma.nome === 'string') turmasAtribuidas.nomes.push(turma.nome);
        }
        if (turma.criadoPor) {
          logsMontados.push({
            id: `turma_${doc.id}`,
            tipo: 'turma',
            titulo: 'Turma Cadastrada',
            detalhe: `${turma.nome} (${turma.turno || 'Turno regular'}) criada por ${turma.criadoPor}`,
            dataFormatada: formatarData(turma.criadoEm),
          });
        }
      });
      setTurmasProfessorDemo(turmasAtribuidas);

      if (isAdmin) {
        // Busca chamados encerrados para auditoria
        try {
          const chSnap = await getDocs(collection(db, 'chamados_suporte'));
          chSnap.forEach(doc => {
            const c = doc.data();
            if (c.status === 'encerrado' || c.status === 'resolvido' || c.status === 'concluido') {
              logsMontados.push({
                id: `chamado_${doc.id}`,
                tipo: 'chamado',
                titulo: 'Chamado Encerrado',
                detalhe: `${c.descricao || 'Ticket de suporte'} — Encerrado por ${c.encerradoPor || 'Administrador'}`,
                dataFormatada: formatarData(c.encerradoEm || c.atualizadoEm),
              });
            }
          });
        } catch {}

        // Busca cadastros recentes de usuários para auditoria
        try {
          const uSnap = await getDocs(collection(db, 'usuarios'));
          uSnap.forEach(doc => {
            const u = doc.data();
            if (u.criadoPor) {
              logsMontados.push({
                id: `user_${doc.id}`,
                tipo: 'usuario',
                titulo: 'Usuário Cadastrado',
                detalhe: `${u.nome} (${u.role || 'usuário'}) cadastrado por ${u.criadoPor}`,
                dataFormatada: formatarData(u.criadoEm),
              });
            }
          });
        } catch {}

        setLogsAuditoria(logsMontados.length > 0 ? logsMontados : LOGS_AUDITORIA_FALLBACK);
      } else {
        const chamadasSnap = await getDocs(query(collection(db, 'chamadas'), orderBy('dataChamada', 'desc')));
        const registrosMontados: any[] = [];
        chamadasSnap.forEach(doc => {
          const dados = doc.data();
          let presentes = 0;
          let faltas = 0;
          if (dados.alunos) {
            dados.alunos.forEach((aluno: any) => {
              if (aluno.presencas?.some((p: boolean) => p === false)) faltas++;
              else presentes++;
            });
          }
          registrosMontados.push({
            id: doc.id,
            turmaId: dados.turmaId,
            turmaNome: dicTurmas[dados.turmaId] || 'Turma não encontrada',
            dataFormatada: formatarData(dados.dataChamada),
            presentes,
            faltas,
          });
        });
        setHistoricoChamadas(registrosMontados);
      }
    } catch (error) {
      console.error('Erro ao buscar histórico:', error);
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    void buscarDados();
  }, [perfil]);

  const isBuscando = busca.trim().length > 0;
  const termo = busca.toLowerCase();

  // FILTROS
  const logsFiltrados = logsAuditoria.filter(
    l => l.titulo.toLowerCase().includes(termo) || l.detalhe.toLowerCase().includes(termo) || l.dataFormatada.toLowerCase().includes(termo)
  );

  const chamadasDoPerfil = perfil === 'professor'
    ? historicoChamadas.filter(item => turmasProfessorDemo.ids.includes(item.turmaId))
    : historicoChamadas;
  const chamadasFiltradas = chamadasDoPerfil.filter(
    item => item.turmaNome.toLowerCase().includes(termo) || item.dataFormatada.toLowerCase().includes(termo)
  );

  const boletinsDoPerfil = perfil === 'professor'
    ? boletins.filter(item => turmasProfessorDemo.nomes.includes(item.turma))
    : boletins;
  const boletinsFiltrados = boletinsDoPerfil.filter(
    item => item.aluno.toLowerCase().includes(termo) || item.turma.toLowerCase().includes(termo) || (!isAdmin && item.disciplina.toLowerCase().includes(termo))
  );

  const turmasUnicas = Array.from(new Set(boletinsDoPerfil.map(b => b.turma)));

  const toggleTurma = (turmaNome: string) => {
    setTurmasExpandidas(prev => prev.includes(turmaNome) ? prev.filter(t => t !== turmaNome) : [...prev, turmaNome]);
  };

  // ==================== RENDERIZADORES ====================
  const renderLogAuditoria = ({ item }: { item: any }) => {
    const icone = item.tipo === 'chamado' ? 'checkmark-done-circle-outline' : item.tipo === 'usuario' ? 'person-add-outline' : 'layers-outline';
    return (
      <View style={[styles.cardItem, { backgroundColor: tema.inputBackground, borderColor: tema.borda, marginBottom: 12 }]}>
        <View style={styles.linhaCabecalho}>
          <View style={styles.linhaTitulo}>
            <Ionicons name={icone} size={18} color={tema.botaoPrimario} style={{ marginRight: 8 }} />
            <Text style={[styles.tituloAtividade, { color: tema.textoPrincipal }]}>{item.titulo}</Text>
          </View>
          <Text style={[styles.textoData, { color: tema.textoSecundario }]}>{item.dataFormatada}</Text>
        </View>
        <Text style={[styles.textoDetalhe, { color: tema.textoSecundario, paddingLeft: 26 }]}>{item.detalhe}</Text>
      </View>
    );
  };

  const renderChamada = ({ item }: { item: any }) => (
    <TouchableOpacity
      style={[styles.cardItem, { backgroundColor: tema.inputBackground, borderColor: tema.borda, marginBottom: 12 }]}
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

  // Card de Aluno SEM notas (apenas para Admin)
  const renderAlunoAdmin = (item: any, isFlat = true) => (
    <View key={item.id} style={[styles.cardItem, { backgroundColor: tema.inputBackground, borderColor: tema.borda, marginBottom: isFlat ? 12 : 8 }]}>
      <View style={[styles.linhaCabecalho, { marginBottom: 0, alignItems: 'center' }]}>
        <View style={styles.linhaTitulo}>
          <View style={[styles.iconePessoa, { backgroundColor: tema.botaoPrimario + '20' }]}>
            <Ionicons name="person" size={16} color={tema.botaoPrimario} />
          </View>
          <View>
            <Text style={[styles.tituloAtividade, { color: tema.textoPrincipal }]}>{item.aluno}</Text>
            <Text style={[styles.textoDetalhe, { color: tema.textoSecundario, fontSize: 12 }]}>{item.turma}</Text>
          </View>
        </View>
        <View style={[styles.pillAtivo, { backgroundColor: '#2E7D3220' }]}>
          <Text style={{ color: '#2E7D32', fontSize: 11, fontWeight: 'bold' }}>{item.status || 'Ativo'}</Text>
        </View>
      </View>
    </View>
  );

  // Card de Boletim COM notas (Professor / Coordenador)
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

  const renderPasta = ({ item }: { item: any }) => {
    if (isBuscando) return isAdmin ? renderAlunoAdmin(item, true) : renderBoletim(item, true);

    const turmaNome = item;
    const isExpanded = turmasExpandidas.includes(turmaNome);
    const alunosDaTurma = boletinsDoPerfil.filter(b => b.turma === turmaNome);

    return (
      <View style={{ marginBottom: 14 }}>
        <TouchableOpacity
          style={[styles.cardPasta, { backgroundColor: tema.inputBackground, borderColor: tema.borda }]}
          activeOpacity={0.7}
          onPress={() => toggleTurma(turmaNome)}
        >
          <View style={styles.linhaTitulo}>
            <Ionicons name={isExpanded ? 'folder-open' : 'folder'} size={22} color={tema.botaoPrimario} style={{ marginRight: 12 }} />
            <Text style={[styles.tituloPasta, { color: tema.textoPrincipal }]}>{turmaNome}</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={{ color: tema.textoSecundario, fontSize: 12, marginRight: 8, fontWeight: 'bold' }}>
              {alunosDaTurma.length} {alunosDaTurma.length === 1 ? 'aluno' : 'alunos'}
            </Text>
            <Ionicons name={isExpanded ? 'chevron-down' : 'chevron-forward'} size={20} color={tema.textoSecundario} />
          </View>
        </TouchableOpacity>

        {isExpanded && (
          <View style={styles.conteudoPasta}>
            {alunosDaTurma.map(aluno => (isAdmin ? renderAlunoAdmin(aluno, false) : renderBoletim(aluno, false)))}
          </View>
        )}
      </View>
    );
  };

  const listaAtual = isAdmin
    ? (abaAtiva === 'auditoria' ? logsFiltrados : (isBuscando ? boletinsFiltrados : turmasUnicas))
    : (abaAtiva === 'frequencia' ? chamadasFiltradas : (isBuscando ? boletinsFiltrados : turmasUnicas));

  const renderAtual = isAdmin
    ? (abaAtiva === 'auditoria' ? renderLogAuditoria : renderPasta)
    : (abaAtiva === 'frequencia' ? renderChamada : renderPasta);

  return (
    <KeyboardAvoidingView style={[styles.container, { backgroundColor: tema.fundoBase }]} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={[styles.header, { backgroundColor: tema.fundoTopo }]}>
        <Text style={[styles.tituloHeader, { color: tema.textoLogo }]}>
          {isAdmin ? 'Central de Auditoria' : 'Central de Consultas'}
        </Text>
        <Text style={[styles.subtituloHeader, { color: tema.textoLogo }]}>
          {isAdmin
            ? 'Logs do sistema e controle de base de alunos'
            : perfil === 'coordenador'
              ? 'Acompanhamento pedagógico de frequência e desempenho'
              : 'Diários e notas das turmas atribuídas'}
        </Text>
        <View style={styles.badgeDemonstracao}>
          <Text style={styles.textoBadgeDemonstracao}>Modo demonstração</Text>
        </View>

        {/* ABAS INTERNAS */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tabButton, (abaAtiva === 'auditoria' || abaAtiva === 'frequencia') && { backgroundColor: 'rgba(255,255,255,0.2)' }]}
            onPress={() => { setAbaAtiva(isAdmin ? 'auditoria' : 'frequencia'); setBusca(''); }}
          >
            <Text style={[styles.tabText, { color: tema.textoLogo, opacity: (abaAtiva === 'auditoria' || abaAtiva === 'frequencia') ? 1 : 0.6 }]}>
              {isAdmin ? 'Log de Auditoria' : 'Diários de Classe'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabButton, (abaAtiva === 'alunos' || abaAtiva === 'notas') && { backgroundColor: 'rgba(255,255,255,0.2)' }]}
            onPress={() => { setAbaAtiva(isAdmin ? 'alunos' : 'notas'); setBusca(''); }}
          >
            <Text style={[styles.tabText, { color: tema.textoLogo, opacity: (abaAtiva === 'alunos' || abaAtiva === 'notas') ? 1 : 0.6 }]}>
              {isAdmin ? 'Alunos Cadastrados' : 'Alunos e Notas'}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={[styles.searchContainer, { backgroundColor: tema.inputBackground, borderColor: tema.borda }]}>
          <Ionicons name="search" size={20} color={tema.textoSecundario} style={styles.searchIcon} />
          <TextInput
            style={[styles.searchInput, { color: tema.textoPrincipal }]}
            placeholder={
              isAdmin
                ? (abaAtiva === 'auditoria' ? 'Pesquisar por ação, chamado ou responsável...' : 'Pesquisar por aluno ou turma...')
                : (abaAtiva === 'frequencia' ? 'Pesquisar por turma ou data...' : 'Pesquisar por nome, turma ou matéria...')
            }
            placeholderTextColor={tema.textoSecundario}
            value={busca}
            onChangeText={setBusca}
          />
        </View>
      </View>

      {carregando && (abaAtiva === 'auditoria' || abaAtiva === 'frequencia') ? (
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
          refreshControl={<RefreshControl refreshing={carregando} onRefresh={buscarDados} tintColor={tema.botaoPrimario} />}
          ListHeaderComponent={
            isAdmin && abaAtiva === 'alunos' ? (
              <View style={styles.resumoAlunosRow}>
                <View style={[styles.cardResumoAluno, { backgroundColor: tema.inputBackground, borderColor: tema.borda }]}>
                  <Ionicons name="school-outline" size={20} color={tema.botaoPrimario} />
                  <Text style={[styles.valorResumoAluno, { color: tema.textoPrincipal }]}>{boletinsDoPerfil.length}</Text>
                  <Text style={[styles.labelResumoAluno, { color: tema.textoSecundario }]}>Alunos Vinculados</Text>
                  <View style={[styles.pillResumo, { backgroundColor: '#2E7D3220' }]}>
                    <Text style={{ color: '#2E7D32', fontSize: 10, fontWeight: 'bold' }}>Ativos</Text>
                  </View>
                </View>

                <View style={[styles.cardResumoAluno, { backgroundColor: tema.inputBackground, borderColor: tema.borda }]}>
                  <Ionicons name="folder-outline" size={20} color={tema.botaoPrimario} />
                  <Text style={[styles.valorResumoAluno, { color: tema.textoPrincipal }]}>{turmasUnicas.length}</Text>
                  <Text style={[styles.labelResumoAluno, { color: tema.textoSecundario }]}>Turmas com Alunos</Text>
                  <View style={[styles.pillResumo, { backgroundColor: tema.botaoPrimario + '20' }]}>
                    <Text style={{ color: tema.botaoPrimario, fontSize: 10, fontWeight: 'bold' }}>Ativas</Text>
                  </View>
                </View>
              </View>
            ) : undefined
          }
          ListEmptyComponent={
            <View style={{ alignItems: 'center', marginTop: 40 }}>
              <Ionicons name="search-outline" size={50} color={tema.borda} />
              <Text style={{ textAlign: 'center', marginTop: 15, color: tema.textoSecundario, fontSize: 16 }}>
                {busca.trim() ? 'Nenhum resultado encontrado para a pesquisa.' : 'Nenhum registro disponível.'}
              </Text>
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
  badgeDemonstracao: { alignSelf: 'flex-start', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 4, marginBottom: 15, backgroundColor: 'rgba(255,255,255,0.15)' },
  textoBadgeDemonstracao: { color: '#FFF', fontSize: 11, fontWeight: '600' },

  tabContainer: { flexDirection: 'row', backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: 10, padding: 4, marginBottom: 15 },
  tabButton: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 8 },
  tabText: { fontSize: 13, fontWeight: 'bold' },

  searchContainer: { flexDirection: 'row', alignItems: 'center', height: 45, borderRadius: 10, borderWidth: 1, paddingHorizontal: 10 },
  searchIcon: { marginRight: 8 }, searchInput: { flex: 1, height: '100%', fontSize: 14 },

  listContent: { padding: 20, paddingBottom: 40 },
  resumoAlunosRow: { flexDirection: 'row', gap: 10, marginBottom: 18 },
  cardResumoAluno: { flex: 1, borderWidth: 1, borderRadius: 12, padding: 14, alignItems: 'center' },
  valorResumoAluno: { fontSize: 22, fontWeight: 'bold', marginTop: 6 },
  labelResumoAluno: { fontSize: 11, marginTop: 2, textAlign: 'center' },
  pillResumo: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, marginTop: 8 },

  cardItem: { borderWidth: 1, borderRadius: 12, padding: 15, overflow: 'hidden' },
  linhaCabecalho: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  linhaTitulo: { flexDirection: 'row', alignItems: 'center' },
  tituloAtividade: { fontSize: 15, fontWeight: 'bold' },
  textoData: { fontSize: 11, fontStyle: 'italic', marginTop: 3 },
  corpoCard: { paddingLeft: 26 },
  textoTurma: { fontSize: 13, fontWeight: '700', marginBottom: 4 },
  textoDetalhe: { fontSize: 13, lineHeight: 18 },

  iconePessoa: { width: 34, height: 34, borderRadius: 17, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  pillAtivo: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  badgeMedia: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  textoMedia: { fontSize: 12, fontWeight: 'bold' },
  gradeNotas: { flexDirection: 'row', justifyContent: 'space-between', paddingTop: 12, marginTop: 5, borderTopWidth: 1 },
  colunaNota: { alignItems: 'center', flex: 1 },
  labelUnidade: { fontSize: 11, marginBottom: 4 },
  valorNota: { fontSize: 14, fontWeight: 'bold' },

  cardPasta: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1, borderRadius: 12, padding: 15 },
  tituloPasta: { fontSize: 16, fontWeight: 'bold' },
  conteudoPasta: { paddingLeft: 15, paddingTop: 10, borderLeftWidth: 2, borderLeftColor: 'rgba(255,255,255,0.08)', marginLeft: 15, marginTop: 5 },
});