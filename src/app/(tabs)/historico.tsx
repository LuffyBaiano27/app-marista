import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, KeyboardAvoidingView, Platform, RefreshControl, ActivityIndicator, Modal, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter, useLocalSearchParams } from 'expo-router';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { useDemoProfile } from '../../contexts/demoProfileContext';
import { db } from '../../config/firebase';

// === CONSTANTES E FALLBACKS ===
const ID_PROFESSOR_DEMONSTRATIVO = 'prof_1';
const LOGS_SISTEMA_FALLBACK = [
  { id: 'log_1', tipo: 'usuario', titulo: 'Usuário Cadastrado', detalhe: 'Rafael Nunes (Professor) vinculado à base por Marina Andrade', dataFormatada: 'Ontem, 14:15' },
  { id: 'log_2', tipo: 'turma', titulo: 'Turma Cadastrada', detalhe: '6º Ano A (Matutino) criada por Marina Andrade', dataFormatada: 'Ontem, 10:30' },
];
const CHAMADOS_ENCERRADOS_FALLBACK = [
  { id: 'ch_1', titulo: 'Erro ao sincronizar turma 6º Ano A', detalhe: 'Resolvido por Marina Andrade', dataFormatada: 'Hoje, 18:40' },
];

// === HELPERS ===
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

const formatarDataBrCurta = (dataInput: any) => {
  if (!dataInput) return '';
  const dataObjeto = dataInput?.toDate ? dataInput.toDate() : new Date(dataInput);
  return isNaN(dataObjeto.getTime()) ? '' : dataObjeto.toLocaleDateString('pt-BR');
};

const formatarInputDataFiltro = (valor: string) => {
  const nums = valor.replace(/\D/g, '').slice(0, 8);
  if (nums.length <= 2) return nums;
  if (nums.length <= 4) return `${nums.slice(0, 2)}/${nums.slice(2)}`;
  return `${nums.slice(0, 2)}/${nums.slice(2, 4)}/${nums.slice(4)}`;
};

const obterIniciais = (nome: string) => {
  const partes = nome.trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return 'AL';
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
  return `${partes[0][0]}${partes[partes.length - 1][0]}`.toUpperCase();
};

export default function HistoricoScreen() {
  const router = useRouter();
  const { aba } = useLocalSearchParams<{ aba?: string }>();
  const { perfil, temaAtivo: tema } = useDemoProfile();
  const isAdmin = perfil === 'admin';
  const isProf = perfil === 'professor';

  // === ESTADOS ===
  const [abaAtiva, setAbaAtiva] = useState<string>(isAdmin ? 'auditoria' : 'frequencia');
  const [busca, setBusca] = useState('');
  const [filtroData, setFiltroData] = useState('');
  const [filtroAula, setFiltroAula] = useState('');
  const [dropdownAulaAberto, setDropdownAulaAberto] = useState(false);
  const [historicoChamadas, setHistoricoChamadas] = useState<any[]>([]);
  const [boletinsReais, setBoletinsReais] = useState<any[]>([]);
  const [logsSistema, setLogsSistema] = useState<any[]>([]);
  const [chamadosEncerrados, setChamadosEncerrados] = useState<any[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [turmasExpandidas, setTurmasExpandidas] = useState<string[]>([]);
  const [diarioSelecionado, setDiarioSelecionado] = useState<any | null>(null);

  useEffect(() => {
    setAbaAtiva(isAdmin ? (aba === 'chamados' ? 'chamados' : 'auditoria') : 'frequencia');
    setBusca('');
    setFiltroData('');
    setFiltroAula('');
    setDropdownAulaAberto(false);
  }, [isAdmin, aba]);

  // === CARREGAMENTO DE DADOS (FIRESTORE) ===
  const buscarDados = useCallback(async () => {
    setCarregando(true);
    try {
      const [turmasSnap, gradeSnap] = await Promise.all([
        getDocs(collection(db, 'turmas')),
        getDocs(collection(db, 'grade_aulas')),
      ]);

      const dicTurmas: Record<string, string> = {};
      const idsTurmasProf = new Set<string>();
      const nomesTurmasProf = new Set<string>();
      const logsMontados: any[] = [];

      turmasSnap.forEach(docSnap => {
        const turma = docSnap.data();
        dicTurmas[docSnap.id] = String(turma.nome || 'Turma');
        if (turma.criadoPor) {
          logsMontados.push({
            id: `turma_${docSnap.id}`,
            tipo: 'turma',
            titulo: 'Turma Cadastrada',
            detalhe: `${turma.nome} (${turma.turno || 'Turno regular'}) criada por ${turma.criadoPor}`,
            dataFormatada: formatarData(turma.criadoEm),
          });
        }
      });

      gradeSnap.forEach(docSnap => {
        const g = docSnap.data() as any;
        dicTurmas[docSnap.id] = String(g.nome || dicTurmas[g.turmaId] || 'Turma');
        const ehDoProf = g.professorId === ID_PROFESSOR_DEMONSTRATIVO || String(g.professorNome || '').toLowerCase().includes('luffy');
        if (ehDoProf) {
          idsTurmasProf.add(docSnap.id);
          if (g.turmaId) idsTurmasProf.add(String(g.turmaId));
          if (g.nome) nomesTurmasProf.add(String(g.nome));
        }
      });

      if (isAdmin) {
        try {
          const uSnap = await getDocs(collection(db, 'usuarios'));
          uSnap.forEach(docSnap => {
            const u = docSnap.data();
            if (u.criadoPor) {
              logsMontados.push({
                id: `user_${docSnap.id}`,
                tipo: 'usuario',
                titulo: 'Usuário Cadastrado',
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
        const [chamadasSnap, notasSnap] = await Promise.all([
          getDocs(query(collection(db, 'chamadas'), orderBy('dataChamada', 'desc'))),
          getDocs(collection(db, 'notas')),
        ]);

        const registrosMontados: any[] = [];
        chamadasSnap.forEach(docSnap => {
          const dados = docSnap.data() as any;
          const turmaNome = String(dados.turmaNome || dicTurmas[dados.turmaId] || 'Turma');
          const ehDoProf =
            idsTurmasProf.has(String(dados.turmaId || '')) ||
            idsTurmasProf.has(String(dados.turmaRealId || '')) ||
            nomesTurmasProf.has(turmaNome) ||
            String(dados.professorNome || '').toLowerCase().includes('luffy');

          if (isProf && idsTurmasProf.size > 0 && !ehDoProf) return;

          const alunosLista = Array.isArray(dados.alunos) ? dados.alunos : [];
          let presentes = 0, faltas = 0, justificadas = 0;
          alunosLista.forEach((a: any) => {
            if (a.status === 'falta') faltas++;
            else if (a.status === 'justificada') justificadas++;
            else if (a.status === 'presente') presentes++;
            else if (Array.isArray(a.presencas) && a.presencas.some((p: boolean) => p === false)) faltas++;
            else presentes++;
          });

          const dataBr = formatarDataBrCurta(dados.dataChamada) || String(dados.dataChamadaFormatada || '');
          const disciplina = String(dados.disciplina || 'Disciplina');
          registrosMontados.push({
            id: docSnap.id,
            turmaId: String(dados.turmaId || ''),
            turmaNome,
            disciplina,
            rotuloAula: `${turmaNome} • ${disciplina}`,
            professorNome: String(dados.professorNome || ''),
            horario: String(dados.horario || ''),
            conteudoMinistrado: String(dados.conteudoMinistrado || ''),
            dataChamadaFormatada: String(dados.dataChamadaFormatada || ''),
            dataBr,
            dataFormatada: formatarData(dados.dataChamada),
            presentes,
            faltas,
            justificadas,
            alunos: alunosLista,
          });
        });
        setHistoricoChamadas(registrosMontados);

        const mapaBoletim = new Map<string, { id: string; aluno: string; turma: string; disciplina: string; avaliacoes: { titulo: string; nota: number; max: number }[] }>();
        notasSnap.forEach(docSnap => {
          const n = docSnap.data() as any;
          const notaStr = String(n.nota ?? '').trim().replace(',', '.');
          if (notaStr === '' || Number.isNaN(Number(notaStr))) return;
          const turma = String(n.turma || 'Sem turma');
          const disciplina = String(n.materia || 'Disciplina');
          const aluno = String(n.alunoNome || 'Aluno');
          const chave = `${turma}_${disciplina}_${n.alunoId || aluno}`;
          const atual = mapaBoletim.get(chave) || { id: chave, aluno, turma, disciplina, avaliacoes: [] };
          atual.avaliacoes.push({
            titulo: String(n.avaliacao || 'Avaliação'),
            nota: Number(notaStr),
            max: Number(n.valorMaximo) > 0 ? Number(n.valorMaximo) : 10,
          });
          mapaBoletim.set(chave, atual);
        });
        setBoletinsReais(Array.from(mapaBoletim.values()).sort((a, b) => a.aluno.localeCompare(b.aluno, 'pt-BR')));
      }
    } catch (error) {
      console.error('Erro ao buscar histórico:', error);
    } finally {
      setCarregando(false);
    }
  }, [isAdmin, isProf]);

  useFocusEffect(useCallback(() => { void buscarDados(); }, [buscarDados]));

  // === FILTROS E KPIS ===
  const voltarTela = () => (router.canGoBack() ? router.back() : router.push('/(tabs)'));
  const isBuscando = busca.trim().length > 0 || filtroData.trim().length > 0 || filtroAula.trim().length > 0;
  const termo = busca.toLowerCase();

  const opcoesAula = useMemo(() => {
    const setAulas = new Set<string>();
    historicoChamadas.forEach(c => { if (c.rotuloAula) setAulas.add(c.rotuloAula); });
    return Array.from(setAulas).sort((a, b) => a.localeCompare(b, 'pt-BR'));
  }, [historicoChamadas]);

  const logsFiltrados = logsSistema.filter(l => [l.titulo, l.detalhe, l.dataFormatada].some(v => v?.toLowerCase().includes(termo)));
  const chamadosFiltrados = chamadosEncerrados.filter(c => [c.titulo, c.detalhe, c.dataFormatada].some(v => v?.toLowerCase().includes(termo)));

  const chamadasFiltradas = useMemo(() => {
    const dataBuscaLimpa = filtroData.trim();
    const aulaBuscaLimpa = filtroAula.trim().toLowerCase();
    return historicoChamadas.filter(i => {
      if (dataBuscaLimpa) {
        const bate = [i.dataBr, i.dataFormatada, i.dataChamadaFormatada].some(v => String(v || '').toLowerCase().includes(dataBuscaLimpa.toLowerCase()));
        if (!bate) return false;
      }
      if (aulaBuscaLimpa) {
        const bateAula = [i.rotuloAula, i.turmaNome, i.disciplina].some(v => String(v || '').toLowerCase().includes(aulaBuscaLimpa));
        if (!bateAula) return false;
      }
      return !termo || [i.turmaNome, i.disciplina, i.dataFormatada, i.conteudoMinistrado].some(v => String(v || '').toLowerCase().includes(termo));
    });
  }, [historicoChamadas, filtroData, filtroAula, termo]);

  const boletinsFiltrados = useMemo(
    () => boletinsReais.filter(b => [b.aluno, b.turma, b.disciplina].some(v => v.toLowerCase().includes(termo))),
    [boletinsReais, termo]
  );

  const turmasUnicas = useMemo(
    () => Array.from(new Set(boletinsReais.map(b => b.turma))).sort((a, b) => a.localeCompare(b, 'pt-BR')),
    [boletinsReais]
  );

  const kpisDiario = useMemo(() => {
    const totalAulas = chamadasFiltradas.length;
    const totalPres = chamadasFiltradas.reduce((acc, c) => acc + c.presentes + c.justificadas, 0);
    const totalReg = chamadasFiltradas.reduce((acc, c) => acc + c.presentes + c.faltas + c.justificadas, 0);
    return { totalAulas, freq: totalReg > 0 ? `${Math.round((totalPres / totalReg) * 100)}%` : '—' };
  }, [chamadasFiltradas]);

  const toggleTurma = (nome: string) => setTurmasExpandidas(prev => (prev.includes(nome) ? prev.filter(t => t !== nome) : [...prev, nome]));

  // === RENDERIZADORES ===
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
    <TouchableOpacity style={[styles.cardItem, { backgroundColor: tema.inputBackground, borderColor: tema.borda, marginBottom: 12 }]} activeOpacity={0.75} onPress={() => setDiarioSelecionado(item)}>
      {renderCabecalhoCard('checkmark-circle-outline', '#2E7D32', item.rotuloAula, item.dataFormatada)}
      <View style={styles.corpoCard}>
        {!!item.conteudoMinistrado && (
          <Text style={[styles.textoDetalhe, { color: tema.textoPrincipal, marginBottom: 6 }]} numberOfLines={2}>Conteúdo: {item.conteudoMinistrado}</Text>
        )}
        <View style={styles.rowPillsChamada}>
          <View style={[styles.pillMini, { backgroundColor: '#2E7D3220' }]}><Text style={{ color: '#2E7D32', fontSize: 11, fontWeight: '700' }}>{item.presentes} P</Text></View>
          <View style={[styles.pillMini, { backgroundColor: '#C6282820' }]}><Text style={{ color: '#C62828', fontSize: 11, fontWeight: '700' }}>{item.faltas} F</Text></View>
          {item.justificadas > 0 && <View style={[styles.pillMini, { backgroundColor: '#EF6C0020' }]}><Text style={{ color: '#EF6C00', fontSize: 11, fontWeight: '700' }}>{item.justificadas} J</Text></View>}
          <View style={{ flex: 1 }} />
          <Text style={{ color: tema.botaoPrimario, fontSize: 11, fontWeight: '700' }}>Ver chamada {'>'}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderBoletim = (item: any, isFlat = true) => {
    const somaNotas = item.avaliacoes.reduce((acc: number, a: any) => acc + a.nota, 0);
    const somaMax = item.avaliacoes.reduce((acc: number, a: any) => acc + a.max, 0);
    const isAprovado = somaMax > 0 && (somaNotas / somaMax) * 100 >= 60;
    return (
      <View key={item.id} style={[styles.cardItem, { backgroundColor: tema.inputBackground, borderColor: tema.borda, marginBottom: isFlat ? 14 : 10 }]}>
        <View style={styles.linhaCabecalho}>
          <View style={styles.linhaTitulo}>
            <View style={[styles.iconePessoa, { backgroundColor: tema.botaoPrimario + '20' }]}>
              <Text style={{ color: tema.botaoPrimario, fontSize: 11, fontWeight: '800' }}>{obterIniciais(item.aluno)}</Text>
            </View>
            <View>
              <Text style={[styles.tituloAtividade, { color: tema.textoPrincipal }]}>{item.aluno}</Text>
              <Text style={[styles.textoDetalhe, { color: tema.textoSecundario, fontSize: 11 }]}>{item.turma} • {item.disciplina}</Text>
            </View>
          </View>
          <View style={[styles.badgeMedia, { backgroundColor: isAprovado ? '#2E7D3220' : '#C6282820' }]}>
            <Text style={[styles.textoMedia, { color: isAprovado ? '#2E7D32' : '#C62828' }]}>{somaNotas.toFixed(1)} / {somaMax.toFixed(1)}</Text>
          </View>
        </View>
        <View style={[styles.gradeNotas, { borderTopColor: tema.borda }]}>
          {item.avaliacoes.map((av: any, idx: number) => (
            <View key={`${av.titulo}_${idx}`} style={styles.colunaNota}>
              <Text style={[styles.labelUnidade, { color: tema.textoSecundario }]} numberOfLines={1}>{av.titulo}</Text>
              <Text style={[styles.valorNota, { color: tema.textoPrincipal }]}>{av.nota.toFixed(1)}</Text>
            </View>
          ))}
        </View>
      </View>
    );
  };

  const renderPasta = ({ item }: { item: any }) => {
    if (isBuscando) return renderBoletim(item, true);
    const isExpanded = turmasExpandidas.includes(item);
    const alunosDaTurma = boletinsReais.filter(b => b.turma === item);
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

  // === INTERFACE ===
  return (
    <KeyboardAvoidingView style={[styles.container, { backgroundColor: tema.fundoBase }]} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      {/* Cabeçalho, Abas e Filtros */}
      <View style={[styles.header, { backgroundColor: tema.fundoTopo }]}>
        <View style={styles.topoCabecalho}>
          <TouchableOpacity onPress={voltarTela} style={styles.btnVoltar} activeOpacity={0.7} accessibilityLabel="Voltar">
            <Ionicons name="arrow-back" size={24} color={tema.textoLogo} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={[styles.tituloHeader, { color: tema.textoLogo }]}>{isAdmin ? 'Central de Auditoria' : 'Central de Consultas'}</Text>
            <Text style={[styles.subtituloHeader, { color: tema.textoLogo }]}>
              {isAdmin ? 'Logs administrativos e histórico de chamados encerrados' : perfil === 'coordenador' ? 'Acompanhamento pedagógico de frequência e desempenho' : 'Consulte chamadas anteriores e notas das suas turmas'}
            </Text>
          </View>
        </View>
        <View style={styles.tabContainer}>
          <TouchableOpacity style={[styles.tabButton, abaPrimaria && styles.tabButtonAtiva]} onPress={() => { setAbaAtiva(isAdmin ? 'auditoria' : 'frequencia'); setBusca(''); setDropdownAulaAberto(false); }}>
            <Text style={[styles.tabText, { color: tema.textoLogo, opacity: abaPrimaria ? 1 : 0.65 }]}>{isAdmin ? 'Log de Auditoria' : 'Diários de Classe'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.tabButton, !abaPrimaria && styles.tabButtonAtiva]} onPress={() => { setAbaAtiva(isAdmin ? 'chamados' : 'notas'); setBusca(''); setDropdownAulaAberto(false); }}>
            <Text style={[styles.tabText, { color: tema.textoLogo, opacity: !abaPrimaria ? 1 : 0.65 }]}>{isAdmin ? 'Chamados Encerrados' : 'Alunos e Notas'}</Text>
          </TouchableOpacity>
        </View>
        <View style={[styles.searchContainer, { backgroundColor: tema.inputBackground, borderColor: tema.borda }]}>
          <Ionicons name="search" size={20} color={tema.textoSecundario} style={styles.searchIcon} />
          <TextInput
            style={[styles.searchInput, { color: tema.textoPrincipal }]}
            placeholder={isAdmin ? (abaAtiva === 'auditoria' ? 'Pesquisar por ação ou responsável...' : 'Pesquisar por chamado ou responsável...') : (abaAtiva === 'frequencia' ? 'Pesquisar por aluno, conteúdo ou turma...' : 'Pesquisar por aluno, turma ou matéria...')}
            placeholderTextColor={tema.textoSecundario}
            value={busca}
            onChangeText={setBusca}
          />
        </View>
        {!isAdmin && abaAtiva === 'frequencia' && (
          <View style={{ marginTop: 10 }}>
            <View style={styles.rowFiltroPrensado}>
              <View style={[styles.filtroDataBox, { backgroundColor: tema.inputBackground, borderColor: filtroData ? tema.botaoPrimario : tema.borda }]}>
                <Ionicons name="calendar-outline" size={16} color={tema.botaoPrimario} />
                <TextInput
                  style={[styles.inputFiltroCurto, { color: tema.textoPrincipal }]}
                  placeholder="Data (DD/MM/AAAA)"
                  placeholderTextColor={tema.textoSecundario}
                  keyboardType="numeric"
                  maxLength={10}
                  value={filtroData}
                  onChangeText={v => setFiltroData(formatarInputDataFiltro(v))}
                />
                {!!filtroData && (
                  <TouchableOpacity onPress={() => setFiltroData('')}><Ionicons name="close-circle" size={16} color={tema.textoSecundario} /></TouchableOpacity>
                )}
              </View>
              <TouchableOpacity style={[styles.filtroAulaBox, { backgroundColor: tema.inputBackground, borderColor: filtroAula || dropdownAulaAberto ? tema.botaoPrimario : tema.borda }]} onPress={() => setDropdownAulaAberto(!dropdownAulaAberto)}>
                <Ionicons name="school-outline" size={16} color={tema.botaoPrimario} />
                <Text style={{ color: filtroAula ? tema.textoPrincipal : tema.textoSecundario, fontSize: 12, fontWeight: filtroAula ? '600' : '400', flex: 1 }} numberOfLines={1}>{filtroAula || 'Aula / Turma'}</Text>
                <Ionicons name={dropdownAulaAberto ? 'chevron-up' : 'chevron-down'} size={16} color={tema.textoSecundario} />
              </TouchableOpacity>
            </View>
            {dropdownAulaAberto && (
              <View style={[styles.dropdownAulaLista, { backgroundColor: tema.inputBackground, borderColor: tema.borda }]}>
                <TouchableOpacity style={[styles.dropdownAulaItem, { borderBottomColor: tema.borda }]} onPress={() => { setFiltroAula(''); setDropdownAulaAberto(false); }}>
                  <Text style={{ color: !filtroAula ? tema.botaoPrimario : tema.textoPrincipal, fontSize: 12, fontWeight: !filtroAula ? '700' : '500' }}>Todas as aulas / turmas</Text>
                </TouchableOpacity>
                {opcoesAula.map(aula => (
                  <TouchableOpacity key={aula} style={[styles.dropdownAulaItem, { borderBottomColor: tema.borda }]} onPress={() => { setFiltroAula(aula); setDropdownAulaAberto(false); }}>
                    <Text style={{ color: filtroAula === aula ? tema.botaoPrimario : tema.textoPrincipal, fontSize: 12, fontWeight: filtroAula === aula ? '700' : '500' }}>{aula}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        )}
      </View>

      {/* Lista de Registros */}
      {carregando ? (
        <View style={styles.centro}>
          <ActivityIndicator size="large" color={tema.botaoPrimario} />
          <Text style={{ marginTop: 10, color: tema.textoSecundario }}>Carregando registros...</Text>
        </View>
      ) : (
        <FlatList
          data={listaAtual}
          keyExtractor={(item, index) => item.id || String(item) || index.toString()}
          renderItem={renderAtual}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={carregando} onRefresh={() => void buscarDados()} tintColor={tema.botaoPrimario} />}
          ListHeaderComponent={
            !isAdmin && abaAtiva === 'frequencia' ? (
              <View style={styles.resumoRow}>
                <View style={[styles.cardResumo, { backgroundColor: tema.inputBackground, borderColor: tema.borda }]}>
                  <Ionicons name="book-outline" size={18} color={tema.botaoPrimario} />
                  <Text style={[styles.valorResumo, { color: tema.textoPrincipal }]}>{kpisDiario.totalAulas}</Text>
                  <Text style={[styles.labelResumo, { color: tema.textoSecundario }]}>Diários Assinados</Text>
                </View>
                <View style={[styles.cardResumo, { backgroundColor: tema.inputBackground, borderColor: tema.borda }]}>
                  <Ionicons name="stats-chart-outline" size={18} color="#2E7D32" />
                  <Text style={[styles.valorResumo, { color: tema.textoPrincipal }]}>{kpisDiario.freq}</Text>
                  <Text style={[styles.labelResumo, { color: tema.textoSecundario }]}>Frequência Média</Text>
                </View>
              </View>
            ) : undefined
          }
          ListEmptyComponent={
            <View style={styles.vazioBox}>
              <Ionicons name="search-outline" size={44} color={tema.textoSecundario} />
              <Text style={{ textAlign: 'center', marginTop: 12, color: tema.textoPrincipal, fontWeight: '700', fontSize: 15 }}>
                {isBuscando ? 'Nenhum resultado encontrado' : 'Nenhum registro disponível'}
              </Text>
              <Text style={{ textAlign: 'center', marginTop: 4, color: tema.textoSecundario, fontSize: 12 }}>
                {abaAtiva === 'frequencia' ? 'As chamadas assinadas aparecerão aqui para consulta.' : 'As notas lançadas aparecerão organizadas por turma.'}
              </Text>
            </View>
          }
        />
      )}

      {/* Modal: Consulta Detalhada do Diário de Classe */}
      <Modal visible={diarioSelecionado !== null} transparent animationType="slide" onRequestClose={() => setDiarioSelecionado(null)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalConteudo, { backgroundColor: tema.fundoBase, borderColor: tema.borda }]}>
            <View style={[styles.modalHeader, { borderBottomColor: tema.borda }]}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.modalTitulo, { color: tema.textoPrincipal }]}>{diarioSelecionado?.rotuloAula || diarioSelecionado?.turmaNome}</Text>
                <Text style={{ color: tema.textoSecundario, fontSize: 12, marginTop: 2 }}>
                  {diarioSelecionado?.dataFormatada}{diarioSelecionado?.horario ? ` • ${diarioSelecionado.horario}` : ''}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setDiarioSelecionado(null)}><Ionicons name="close" size={24} color={tema.textoSecundario} /></TouchableOpacity>
            </View>
            {diarioSelecionado && (
              <ScrollView contentContainerStyle={{ padding: 20 }}>
                <View style={styles.resumoRow}>
                  <View style={[styles.cardResumo, { backgroundColor: tema.inputBackground, borderColor: tema.borda }]}>
                    <Text style={{ color: '#2E7D32', fontSize: 18, fontWeight: 'bold' }}>{diarioSelecionado.presentes}</Text>
                    <Text style={{ color: tema.textoSecundario, fontSize: 11 }}>Presentes</Text>
                  </View>
                  <View style={[styles.cardResumo, { backgroundColor: tema.inputBackground, borderColor: tema.borda }]}>
                    <Text style={{ color: '#C62828', fontSize: 18, fontWeight: 'bold' }}>{diarioSelecionado.faltas}</Text>
                    <Text style={{ color: tema.textoSecundario, fontSize: 11 }}>Faltas</Text>
                  </View>
                  <View style={[styles.cardResumo, { backgroundColor: tema.inputBackground, borderColor: tema.borda }]}>
                    <Text style={{ color: '#EF6C00', fontSize: 18, fontWeight: 'bold' }}>{diarioSelecionado.justificadas}</Text>
                    <Text style={{ color: tema.textoSecundario, fontSize: 11 }}>Justificadas</Text>
                  </View>
                </View>
                {!!diarioSelecionado.conteudoMinistrado && (
                  <View style={[styles.boxConteudoModal, { backgroundColor: tema.inputBackground, borderColor: tema.borda }]}>
                    <Text style={{ color: tema.textoSecundario, fontSize: 11, fontWeight: '700', marginBottom: 4 }}>CONTEÚDO MINISTRADO</Text>
                    <Text style={{ color: tema.textoPrincipal, fontSize: 13, lineHeight: 19 }}>{diarioSelecionado.conteudoMinistrado}</Text>
                  </View>
                )}
                <Text style={{ color: tema.textoSecundario, fontSize: 12, fontWeight: '700', marginBottom: 10 }}>
                  Lista de Frequência ({diarioSelecionado.alunos?.length || 0} aluno(s))
                </Text>
                {(diarioSelecionado.alunos || []).map((a: any, idx: number) => {
                  const st = a.status || (Array.isArray(a.presencas) && a.presencas.some((p: boolean) => !p) ? 'falta' : 'presente');
                  const cor = st === 'falta' ? '#C62828' : st === 'justificada' ? '#EF6C00' : '#2E7D32';
                  const label = st === 'falta' ? 'Falta' : st === 'justificada' ? 'Justificada' : 'Presente';
                  return (
                    <View key={a.id || idx} style={[styles.linhaAlunoModal, { backgroundColor: tema.inputBackground, borderColor: tema.borda }]}>
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: tema.textoPrincipal, fontSize: 14, fontWeight: '600' }}>{a.nome}</Text>
                        {!!a.obs && <Text style={{ color: tema.textoSecundario, fontSize: 12, marginTop: 2, fontStyle: 'italic' }}>Obs: {a.obs}</Text>}
                      </View>
                      <View style={[styles.pillMini, { backgroundColor: cor + '20' }]}>
                        <Text style={{ color: cor, fontSize: 11, fontWeight: '800' }}>{label}</Text>
                      </View>
                    </View>
                  );
                })}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

// === ESTILOS ===
const styles = StyleSheet.create({
  container: { flex: 1 },
  centro: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  vazioBox: { alignItems: 'center', marginTop: 40 },
  header: { paddingTop: 50, paddingBottom: 20, paddingHorizontal: 20, elevation: 5, borderBottomLeftRadius: 20, borderBottomRightRadius: 20 },
  topoCabecalho: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  btnVoltar: { paddingTop: 3, paddingRight: 4 },
  tituloHeader: { fontSize: 22, fontWeight: 'bold' },
  subtituloHeader: { fontSize: 12, opacity: 0.85, marginBottom: 14, marginTop: 2 },
  tabContainer: { flexDirection: 'row', backgroundColor: 'rgba(0,0,0,0.22)', borderRadius: 10, padding: 4, marginBottom: 14 },
  tabButton: { flex: 1, paddingVertical: 9, alignItems: 'center', borderRadius: 8 },
  tabButtonAtiva: { backgroundColor: 'rgba(124, 124, 255, 0.28)', borderWidth: 1, borderColor: 'rgba(165, 158, 196, 0.25)' },
  tabText: { fontSize: 13, fontWeight: 'bold' },
  searchContainer: { flexDirection: 'row', alignItems: 'center', height: 44, borderRadius: 10, borderWidth: 1, paddingHorizontal: 10 },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, height: '100%', fontSize: 14 },
  rowFiltroPrensado: { flexDirection: 'row', gap: 8 },
  filtroDataBox: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6, height: 38, borderRadius: 8, borderWidth: 1, paddingHorizontal: 10 },
  inputFiltroCurto: { flex: 1, height: '100%', fontSize: 12 },
  filtroAulaBox: { flex: 1.15, flexDirection: 'row', alignItems: 'center', gap: 6, height: 38, borderRadius: 8, borderWidth: 1, paddingHorizontal: 10 },
  dropdownAulaLista: { borderWidth: 1, borderRadius: 10, marginTop: 6, overflow: 'hidden' },
  dropdownAulaItem: { paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 1 },
  listContent: { padding: 20, paddingBottom: 40 },
  resumoRow: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  cardResumo: { flex: 1, borderWidth: 1, borderRadius: 12, padding: 12, alignItems: 'center' },
  valorResumo: { fontSize: 20, fontWeight: 'bold', marginTop: 4 },
  labelResumo: { fontSize: 11, marginTop: 2, textAlign: 'center' },
  cardItem: { borderWidth: 1, borderRadius: 12, padding: 15, overflow: 'hidden' },
  linhaCabecalho: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  linhaTitulo: { flexDirection: 'row', alignItems: 'center' },
  tituloAtividade: { fontSize: 15, fontWeight: 'bold' },
  textoData: { fontSize: 11, fontStyle: 'italic', marginTop: 3 },
  corpoCard: { paddingLeft: 26 },
  textoDetalhe: { fontSize: 13, lineHeight: 18 },
  rowPillsChamada: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  pillMini: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  rodapeChamado: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingLeft: 26, marginTop: 4, gap: 10 },
  pillEncerrado: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  iconePessoa: { width: 34, height: 34, borderRadius: 17, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  badgeMedia: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  textoMedia: { fontSize: 12, fontWeight: 'bold' },
  gradeNotas: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, paddingTop: 12, marginTop: 8, borderTopWidth: 1 },
  colunaNota: { alignItems: 'center', minWidth: 64 },
  labelUnidade: { fontSize: 11, marginBottom: 4 },
  valorNota: { fontSize: 14, fontWeight: 'bold' },
  cardPasta: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1, borderRadius: 12, padding: 15 },
  tituloPasta: { fontSize: 16, fontWeight: 'bold' },
  conteudoPasta: { paddingLeft: 15, paddingTop: 10, borderLeftWidth: 2, marginLeft: 15, marginTop: 5 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalConteudo: { maxHeight: '85%', borderTopLeftRadius: 22, borderTopRightRadius: 22, borderWidth: 1, paddingBottom: 24 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1 },
  modalTitulo: { fontSize: 17, fontWeight: 'bold' },
  boxConteudoModal: { borderWidth: 1, borderRadius: 12, padding: 12, marginBottom: 16 },
  linhaAlunoModal: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 10, padding: 12, marginBottom: 8, gap: 10 },
});