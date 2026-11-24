import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, KeyboardAvoidingView, Platform, RefreshControl, ActivityIndicator, Modal, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, where, serverTimestamp } from 'firebase/firestore';
import { useDemoProfile, type DemoProfile } from '../../contexts/demoProfileContext';
import { db } from '../../config/firebase';
import { FeedbackToast, type EstadoFeedback, type TipoFeedback } from '../../components/FeedbackToast';

const ID_PROFESSOR_DEMONSTRATIVO = 'prof_1';
const NOMES_PERFIS: Record<DemoProfile, string> = { admin: 'Administrador', coordenador: 'Coordenador', professor: 'Professor' };
const DIAS_SEMANA: Record<number, string> = { 1: 'Segunda-feira', 2: 'Terça-feira', 3: 'Quarta-feira', 4: 'Quinta-feira', 5: 'Sexta-feira' };
const TURNOS = ['Matutino', 'Vespertino', 'Noturno'] as const;
const FILTROS_TURNO = ['Todos', ...TURNOS] as const;
const ALUNOS_SIMULADOS: Record<string, string[]> = {
  '1º Ano Médio': ['Ana Carolina', 'Carlos Eduardo', 'Beatriz Souza'],
  '2º Ano Médio': ['Gabriel Martins', 'Fernanda Lima', 'Lucas Oliveira'],
  '6º Ano A': ['João Pedro', 'Sophia Mendes'],
  '9º Ano C': ['Mariana Silva', 'Matheus Costa', 'Letícia Rocha'],
};

export default function TurmasScreen() {
  const router = useRouter();
  const { perfil, temaAtivo: tema } = useDemoProfile();
  const isAdmin = perfil === 'admin';

  const [busca, setBusca] = useState('');
  const [turnoFiltro, setTurnoFiltro] = useState<(typeof FILTROS_TURNO)[number]>('Todos');
  const [turmas, setTurmas] = useState<any[]>([]);
  const [alunosPorTurma, setAlunosPorTurma] = useState<Record<string, any[]>>({});
  const [chamadasRealizadasHoje, setChamadasRealizadasHoje] = useState<Record<string, string>>({});
  const [turmasExpandidas, setTurmasExpandidas] = useState<string[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);

  const [modalFormTurma, setModalFormTurma] = useState(false);
  const [turmaEditandoId, setTurmaEditandoId] = useState<string | null>(null);
  const [formTurma, setFormTurma] = useState({ nome: '', turno: 'Matutino' as (typeof TURNOS)[number] });
  const [confirmarExclusao, setConfirmarExclusao] = useState(false);
  const [feedback, setFeedback] = useState<EstadoFeedback>({ visivel: false, tipo: 'sucesso', titulo: '', mensagem: '' });

  const notificar = useCallback((tipo: TipoFeedback, titulo: string, mensagem: string) => {
    setFeedback({ visivel: true, tipo, titulo, mensagem });
  }, []);
  const fecharFeedback = useCallback(() => setFeedback(prev => ({ ...prev, visivel: false })), []);

  const hoje = new Date();
  const diaAtual = hoje.getDay();
  const dataFormatada = hoje.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });
  const dataHeader = dataFormatada.charAt(0).toUpperCase() + dataFormatada.slice(1);
  const getDataDeHoje = () => hoje.toISOString().split('T')[0];

  const voltar = () => (router.canGoBack() ? router.back() : router.replace('/(tabs)'));
  const toggleTurma = (id: string) => setTurmasExpandidas(prev => (prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]));

  const buscarDadosTurmas = useCallback(async () => {
    setCarregando(true);
    try {
      const qTurmas = isAdmin
        ? query(collection(db, 'turmas'))
        : perfil === 'professor'
          ? query(collection(db, 'grade_aulas'), where('professorId', '==', ID_PROFESSOR_DEMONSTRATIVO))
          : query(collection(db, 'grade_aulas'));

      const [turmasSnap, chamadasSnap] = await Promise.all([
        getDocs(qTurmas),
        getDocs(query(collection(db, 'chamadas'), where('dataChamadaFormatada', '==', getDataDeHoje()))),
      ]);

      const turmasBanco: any[] = turmasSnap.docs.map(d => {
        const dados = d.data();
        return { id: d.id, diaSemana: DIAS_SEMANA[dados.diaId] || 'Indefinido', ...dados };
      });

      if (isAdmin) {
        try {
          const alunosSnap = await getDocs(collection(db, 'alunos'));
          const mapa: Record<string, any[]> = {};
          alunosSnap.forEach(docSnap => {
            const a = docSnap.data();
            const chave = a.turmaId || a.turmaNome || a.turma || '';
            if (chave) mapa[chave] = [...(mapa[chave] || []), { id: docSnap.id, nome: a.nome || 'Aluno sem nome' }];
          });
          setAlunosPorTurma(mapa);
        } catch {
          setAlunosPorTurma({});
        }
        const unicas = turmasBanco.filter((t, idx, arr) => arr.findIndex(x => x.nome === t.nome) === idx);
        unicas.sort((a, b) => String(a.nome || '').localeCompare(String(b.nome || '')));
        setTurmas(unicas);
      } else {
        turmasBanco.sort((a, b) => (a.diaId || 0) - (b.diaId || 0) || String(a.horario || '').localeCompare(String(b.horario || '')));
        setTurmas(turmasBanco);
      }

      const chamadasHojeDic: Record<string, string> = {};
      chamadasSnap.forEach(d => {
        const dados = d.data();
        chamadasHojeDic[dados.turmaId] = new Date(dados.dataChamada).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
      });
      setChamadasRealizadasHoje(chamadasHojeDic);
    } catch (error: any) {
      notificar('erro', 'Erro ao buscar turmas', error?.message || 'Falha ao consultar o Firestore.');
    } finally {
      setCarregando(false);
    }
  }, [isAdmin, perfil, notificar]);

  useEffect(() => { void buscarDadosTurmas(); }, [buscarDadosTurmas]);

  const obterAlunosDaTurma = useCallback((turma: any) => {
    const porId = alunosPorTurma[turma.id] || [];
    const porNome = alunosPorTurma[turma.nome] || [];
    const reais = [...porId, ...porNome].filter((a, idx, arr) => arr.findIndex(x => x.id === a.id) === idx);
    if (reais.length > 0) return reais;
    const simulados = ALUNOS_SIMULADOS[turma.nome] || [];
    return simulados.map((nome, i) => ({ id: `${turma.id}_sim_${i}`, nome }));
  }, [alunosPorTurma]);

  const abrirCriarTurma = () => {
    setTurmaEditandoId(null);
    setFormTurma({ nome: '', turno: 'Matutino' });
    setConfirmarExclusao(false);
    setModalFormTurma(true);
  };

  const abrirEditarTurma = (turma: any) => {
    setTurmaEditandoId(turma.id);
    setFormTurma({ nome: turma.nome || '', turno: TURNOS.includes(turma.turno) ? turma.turno : 'Matutino' });
    setConfirmarExclusao(false);
    setModalFormTurma(true);
  };

  const salvarTurma = async () => {
    if (!formTurma.nome.trim()) return notificar('aviso', 'Campo obrigatório', 'Informe o nome da turma.');
    setSalvando(true);
    try {
      if (turmaEditandoId) {
        await updateDoc(doc(db, 'turmas', turmaEditandoId), { nome: formTurma.nome.trim(), turno: formTurma.turno });
        setModalFormTurma(false);
        void buscarDadosTurmas();
        notificar('sucesso', 'Turma atualizada', `${formTurma.nome.trim()} (${formTurma.turno}) salva.`);
      } else {
        await addDoc(collection(db, 'turmas'), { nome: formTurma.nome.trim(), turno: formTurma.turno, alunos: 0, criadoPor: 'Marina', criadoEm: serverTimestamp() });
        setModalFormTurma(false);
        void buscarDadosTurmas();
        notificar('sucesso', 'Turma criada', `${formTurma.nome.trim()} (${formTurma.turno}) cadastrada.`);
      }
    } catch (error: any) {
      notificar('erro', 'Erro ao salvar', error?.message || 'Não foi possível salvar a turma no Firestore.');
    } finally { setSalvando(false); }
  };

  const excluirTurma = async (turma: any) => {
    const totalAlunos = obterAlunosDaTurma(turma).length;
    if (totalAlunos > 0) {
      return notificar('aviso', 'Exclusão bloqueada', `${turma.nome} possui ${totalAlunos} aluno(s) vinculado(s). Remova ou realoque antes de excluir.`);
    }
    if (!confirmarExclusao) return setConfirmarExclusao(true);
    setSalvando(true);
    try {
      await deleteDoc(doc(db, 'turmas', turma.id));
      setModalFormTurma(false);
      void buscarDadosTurmas();
      notificar('sucesso', 'Turma excluída', `${turma.nome} foi removida.`);
    } catch (error: any) {
      notificar('erro', 'Erro ao excluir', error?.message || 'Não foi possível excluir a turma.');
    } finally { setSalvando(false); }
  };

  const turmasFiltradas = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    const base = !isAdmin && perfil === 'professor' ? turmas.filter(t => t.professorId === ID_PROFESSOR_DEMONSTRATIVO) : turmas;
    return base.filter(t => {
      if (isAdmin && turnoFiltro !== 'Todos' && (t.turno || 'Matutino') !== turnoFiltro) return false;
      if (!termo) return true;
      return isAdmin
        ? String(t.nome || '').toLowerCase().includes(termo) || String(t.turno || '').toLowerCase().includes(termo)
        : String(t.nome || '').toLowerCase().includes(termo) || String(t.diaSemana || '').toLowerCase().includes(termo) || String(t.horario || '').includes(termo) || String(t.professorNome || '').toLowerCase().includes(termo);
    });
  }, [busca, isAdmin, perfil, turnoFiltro, turmas]);

  const totalAlunosVinculados = useMemo(
    () => turmasFiltradas.reduce((acc, t) => acc + obterAlunosDaTurma(t).length, 0),
    [turmasFiltradas, obterAlunosDaTurma]
  );

  const totalTurmasComAlunos = useMemo(
    () => turmasFiltradas.filter(t => obterAlunosDaTurma(t).length > 0).length,
    [turmasFiltradas, obterAlunosDaTurma]
  );

  const toastProps = {
    feedback,
    onFechar: fecharFeedback,
    fundoCard: tema.fundoTopo,
    textoPrincipal: tema.textoPrincipal,
    textoSecundario: tema.textoSecundario,
  };

  const renderPastaAdmin = ({ item }: { item: any }) => {
    const isExpanded = turmasExpandidas.includes(item.id);
    const alunos = obterAlunosDaTurma(item);
    return (
      <View style={{ marginBottom: 14 }}>
        <TouchableOpacity style={[styles.cardPasta, { backgroundColor: tema.inputBackground, borderColor: tema.borda }]} activeOpacity={0.75} onPress={() => toggleTurma(item.id)}>
          <View style={styles.linhaTituloPasta}>
            <Ionicons name={isExpanded ? 'folder-open' : 'folder'} size={22} color={tema.botaoPrimario} style={{ marginRight: 12 }} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.tituloPasta, { color: tema.textoPrincipal }]}>{item.nome}</Text>
              <Text style={{ color: tema.textoSecundario, fontSize: 11, marginTop: 2 }}>{item.turno || 'Matutino'}</Text>
            </View>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={{ color: tema.textoSecundario, fontSize: 12, marginRight: 10, fontWeight: 'bold' }}>{alunos.length} {alunos.length === 1 ? 'aluno' : 'alunos'}</Text>
            <TouchableOpacity onPress={() => abrirEditarTurma(item)} style={{ padding: 4, marginRight: 6 }} accessibilityLabel="Editar turma">
              <Ionicons name="create-outline" size={18} color={tema.textoSecundario} />
            </TouchableOpacity>
            <Ionicons name={isExpanded ? 'chevron-down' : 'chevron-forward'} size={20} color={tema.textoSecundario} />
          </View>
        </TouchableOpacity>
        {isExpanded && (
          <View style={[styles.conteudoPasta, { borderLeftColor: tema.borda }]}>
            {alunos.length === 0 ? (
              <Text style={{ color: tema.textoSecundario, fontSize: 13, fontStyle: 'italic', paddingVertical: 8 }}>Nenhum aluno vinculado.</Text>
            ) : alunos.map(aluno => (
              <View key={aluno.id} style={[styles.cardAlunoClean, { backgroundColor: tema.inputBackground, borderColor: tema.borda }]}>
                <View style={[styles.iconePessoa, { backgroundColor: tema.botaoPrimario + '20' }]}><Ionicons name="person" size={16} color={tema.botaoPrimario} /></View>
                <Text style={[styles.nomeAlunoClean, { color: tema.textoPrincipal }]}>{aluno.nome}</Text>
              </View>
            ))}
          </View>
        )}
      </View>
    );
  };

  const renderTurmaDocente = ({ item }: { item: any }) => {
    const horaRealizada = chamadasRealizadasHoje[item.id];
    const isRealizada = !!horaRealizada;
    const diaBusca = diaAtual === 0 || diaAtual === 6 ? 1 : diaAtual;
    const isBloqueado = !isRealizada && item.diaId !== diaBusca;
    return (
      <View style={[styles.cardTurma, { backgroundColor: tema.inputBackground, borderColor: tema.borda }]}>
        <View style={styles.corpoCard}>
          <View style={[styles.iconeTurmaBg, { backgroundColor: tema.botaoPrimario + '20' }]}><Ionicons name="people" size={24} color={tema.botaoPrimario} /></View>
          <View style={styles.infoTurma}>
            <View style={styles.linhaTitulo}>
              <Text style={[styles.nomeTurma, { color: tema.textoPrincipal }]}>{item.nome}</Text>
              <View style={[styles.badgeStatus, { backgroundColor: isRealizada ? '#E8F5E9' : '#FFF3E0', borderColor: isRealizada ? '#A5D6A7' : '#FFCC80' }]}>
                <Text style={[styles.textoBadge, { color: isRealizada ? '#2E7D32' : '#EF6C00' }]}>{isRealizada ? 'REALIZADA' : 'PENDENTE'}</Text>
              </View>
            </View>
            <Text style={[styles.materiaTurma, { color: tema.textoSecundario }]}>{item.disciplina || item.materia}</Text>
            <View style={styles.detalhesGrade}>
              {item.alunos && <View style={styles.detalheRow}><Ionicons name="person" size={12} color={tema.textoSecundario} /><Text style={[styles.textoDetalhe, { color: tema.textoSecundario }]}> {item.alunos} alunos</Text></View>}
              <View style={styles.detalheRow}><Ionicons name="time" size={14} color={tema.botaoPrimario} /><Text style={[styles.textoHorario, { color: tema.botaoPrimario }]}> {item.diaSemana} • {item.horario}</Text></View>
              {item.professorNome && <View style={[styles.detalheRow, { marginTop: 2 }]}><Ionicons name="person-circle-outline" size={14} color={tema.textoSecundario} /><Text style={[styles.textoProf, { color: tema.textoSecundario }]}> Prof. {item.professorNome}</Text></View>}
            </View>
          </View>
        </View>
        <TouchableOpacity style={[styles.rodapeAcao, { borderTopColor: tema.borda }]} disabled={isBloqueado} onPress={() => router.push(`/chamada?id=${item.id}`)}>
          <Text style={[styles.textoAcao, { color: isBloqueado ? tema.textoSecundario : tema.botaoPrimario }]}>
            {isRealizada ? <>Consulta <Text style={{ fontStyle: 'italic', fontSize: 11 }}>(Realizada hoje às {horaRealizada})</Text></> : isBloqueado ? 'Fora do dia da aula' : 'Fazer chamada'}
          </Text>
          <Ionicons name={isBloqueado ? 'lock-closed' : 'chevron-forward'} size={isBloqueado ? 16 : 18} color={isBloqueado ? tema.textoSecundario : tema.botaoPrimario} />
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView style={[styles.container, { backgroundColor: tema.fundoBase }]} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={[styles.header, { backgroundColor: tema.fundoTopo }]}>
        <View style={styles.topoLinha}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            {isAdmin && (
              <TouchableOpacity onPress={voltar} accessibilityLabel="Voltar">
                <Ionicons name="arrow-back" size={24} color={tema.textoLogo} />
              </TouchableOpacity>
            )}
            <Text style={[styles.tituloHeader, { color: tema.textoLogo }]}>{isAdmin ? 'Turmas Cadastradas' : 'Grade de Aulas'}</Text>
          </View>
          {isAdmin ? (
            <TouchableOpacity style={[styles.btnAddTopo, { backgroundColor: tema.botaoPrimario }]} onPress={abrirCriarTurma}>
              <Ionicons name="add" size={18} color={tema.textoBotao} />
              <Text style={{ color: tema.textoBotao, fontSize: 12, fontWeight: '700' }}>Nova Turma</Text>
            </TouchableOpacity>
          ) : (
            <Text style={{ color: tema.textoLogo, opacity: 0.7, fontSize: 12 }}>{NOMES_PERFIS[perfil]}</Text>
          )}
        </View>

        <Text style={[styles.subtituloData, { color: tema.textoLogo }]}>{dataHeader}</Text>
        <Text style={[styles.subtituloPerfil, { color: tema.textoLogo }]}>
          {isAdmin ? 'Controle de turmas e alunos vinculados' : perfil === 'coordenador' ? 'Acompanhamento pedagógico' : 'Visão docente'} · Modo demonstração
        </Text>

        {isAdmin && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filtrosTurno}>
            {FILTROS_TURNO.map(t => {
              const ativo = turnoFiltro === t;
              return (
                <TouchableOpacity key={t} onPress={() => setTurnoFiltro(t)} style={[styles.chipTurno, { backgroundColor: ativo ? tema.botaoPrimario : tema.inputBackground, borderColor: tema.borda }]}>
                  <Text style={{ color: ativo ? tema.textoBotao : tema.textoPrincipal, fontSize: 12, fontWeight: '600' }}>{t}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}

        <View style={[styles.searchContainer, { backgroundColor: tema.inputBackground, borderColor: tema.borda }]}>
          <Ionicons name="search" size={20} color={tema.textoSecundario} style={styles.searchIcon} />
          <TextInput style={[styles.searchInput, { color: tema.textoPrincipal }]} placeholder={isAdmin ? 'Buscar turma ou turno...' : 'Buscar turma, professor ou horário...'} placeholderTextColor={tema.textoSecundario} value={busca} onChangeText={setBusca} />
        </View>
      </View>

      {carregando ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={tema.botaoPrimario} />
          <Text style={{ marginTop: 10, color: tema.textoSecundario }}>{isAdmin ? 'Carregando turmas...' : 'Carregando Grade...'}</Text>
        </View>
      ) : (
        <FlatList
          data={turmasFiltradas}
          keyExtractor={item => item.id}
          renderItem={isAdmin ? renderPastaAdmin : renderTurmaDocente}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={carregando} onRefresh={() => void buscarDadosTurmas()} tintColor={tema.botaoPrimario} />}
          ListHeaderComponent={
            isAdmin ? (
              <View style={styles.resumoRow}>
                {[
                  { icone: 'layers-outline' as const, valor: turmasFiltradas.length, label: 'Turmas Cadastradas', pill: 'Total', cor: tema.botaoPrimario },
                  { icone: 'folder-outline' as const, valor: totalTurmasComAlunos, label: 'Turmas com Alunos', pill: 'Ativas', cor: tema.botaoPrimario },
                  { icone: 'school-outline' as const, valor: totalAlunosVinculados, label: 'Alunos Vinculados', pill: 'Ativos', cor: '#2E7D32' },
                ].map(card => (
                  <View key={card.label} style={[styles.cardResumo, { backgroundColor: tema.inputBackground, borderColor: tema.borda }]}>
                    <Ionicons name={card.icone} size={20} color={tema.botaoPrimario} />
                    <Text style={[styles.valorResumo, { color: tema.textoPrincipal }]}>{card.valor}</Text>
                    <Text style={[styles.labelResumo, { color: tema.textoSecundario }]}>{card.label}</Text>
                    <View style={[styles.pillResumo, { backgroundColor: card.cor + '20' }]}>
                      <Text style={{ color: card.cor, fontSize: 10, fontWeight: 'bold' }}>{card.pill}</Text>
                    </View>
                  </View>
                ))}
              </View>
            ) : undefined
          }
          ListEmptyComponent={
            <Text style={{ textAlign: 'center', marginTop: 20, color: tema.textoSecundario }}>
              {perfil === 'professor' && !busca.trim() ? 'Nenhuma turma vinculada ao perfil docente.' : 'Nenhuma turma encontrada.'}
            </Text>
          }
        />
      )}

      <Modal visible={modalFormTurma} transparent animationType="slide" onRequestClose={() => setModalFormTurma(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalConteudo, { backgroundColor: tema.fundoBase, borderColor: tema.borda }]}>
            <View style={[styles.modalHeader, { borderBottomColor: tema.borda }]}>
              <Text style={[styles.modalTitulo, { color: tema.textoPrincipal }]}>{turmaEditandoId ? 'Editar Turma' : 'Nova Turma'}</Text>
              <TouchableOpacity onPress={() => setModalFormTurma(false)}><Ionicons name="close" size={24} color={tema.textoSecundario} /></TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={{ padding: 20 }}>
              <Text style={[styles.labelCampo, { color: tema.textoSecundario }]}>Nome da Turma / Série</Text>
              <TextInput value={formTurma.nome} onChangeText={v => setFormTurma(prev => ({ ...prev, nome: v }))} placeholder="Ex: 6º Ano A" placeholderTextColor={tema.textoSecundario} style={[styles.inputModal, { backgroundColor: tema.inputBackground, color: tema.textoPrincipal, borderColor: tema.borda }]} />

              <Text style={[styles.labelCampo, { color: tema.textoSecundario }]}>Turno</Text>
              <View style={styles.linhaTurnosModal}>
                {TURNOS.map(t => {
                  const sel = formTurma.turno === t;
                  return (
                    <TouchableOpacity key={t} onPress={() => setFormTurma(prev => ({ ...prev, turno: t }))} style={[styles.chipTurnoModal, { backgroundColor: sel ? tema.botaoPrimario + '20' : tema.inputBackground, borderColor: sel ? tema.botaoPrimario : tema.borda }]}>
                      <Text style={{ color: sel ? tema.botaoPrimario : tema.textoPrincipal, fontSize: 12, fontWeight: '700' }}>{t}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <TouchableOpacity style={[styles.btnSalvar, { backgroundColor: tema.botaoPrimario }]} onPress={() => void salvarTurma()} disabled={salvando}>
                <Text style={{ color: tema.textoBotao, fontWeight: '700', fontSize: 14 }}>{salvando ? 'Salvando...' : turmaEditandoId ? 'Salvar alterações' : 'Criar turma'}</Text>
              </TouchableOpacity>

              {turmaEditandoId && (
                <TouchableOpacity
                  style={[styles.btnExcluir, { backgroundColor: confirmarExclusao ? '#C6282820' : tema.inputBackground, borderColor: confirmarExclusao ? '#C62828' : tema.borda }]}
                  onPress={() => {
                    const atual = turmas.find(t => t.id === turmaEditandoId);
                    if (atual) void excluirTurma(atual);
                  }}
                  disabled={salvando}
                >
                  <Ionicons name="trash-outline" size={18} color="#C62828" />
                  <Text style={{ color: '#C62828', fontWeight: '700', fontSize: 13 }}>{confirmarExclusao ? 'Confirmar exclusão da turma' : 'Excluir turma'}</Text>
                </TouchableOpacity>
              )}
            </ScrollView>
          </View>
          <FeedbackToast {...toastProps} />
        </View>
      </Modal>

      <FeedbackToast {...toastProps} />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingTop: 50, paddingBottom: 20, paddingHorizontal: 20, elevation: 5, borderBottomLeftRadius: 20, borderBottomRightRadius: 20 },
  topoLinha: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  btnAddTopo: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, gap: 4 },
  tituloHeader: { fontSize: 24, fontWeight: 'bold' },
  subtituloData: { fontSize: 13, opacity: 0.8, marginBottom: 2, marginTop: 2 },
  subtituloPerfil: { fontSize: 11, opacity: 0.75, marginBottom: 14 },
  filtrosTurno: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  chipTurno: { borderWidth: 1, borderRadius: 16, paddingHorizontal: 12, paddingVertical: 6 },
  searchContainer: { flexDirection: 'row', alignItems: 'center', height: 45, borderRadius: 10, borderWidth: 1, paddingHorizontal: 10 },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, height: '100%', fontSize: 14 },
  listContent: { padding: 20, paddingBottom: 40 },
  resumoRow: { flexDirection: 'row', gap: 10, marginBottom: 18 },
  cardResumo: { flex: 1, borderWidth: 1, borderRadius: 12, padding: 14, alignItems: 'center' },
  valorResumo: { fontSize: 22, fontWeight: 'bold', marginTop: 6 },
  labelResumo: { fontSize: 11, marginTop: 2, textAlign: 'center' },
  pillResumo: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, marginTop: 8 },
  cardPasta: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1, borderRadius: 12, padding: 15 },
  linhaTituloPasta: { flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 10 },
  tituloPasta: { fontSize: 16, fontWeight: 'bold' },
  conteudoPasta: { paddingLeft: 15, paddingTop: 10, borderLeftWidth: 2, marginLeft: 15, marginTop: 5 },
  cardAlunoClean: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 12, padding: 12, marginBottom: 8 },
  iconePessoa: { width: 34, height: 34, borderRadius: 17, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  nomeAlunoClean: { fontSize: 15, fontWeight: '600' },
  cardTurma: { borderWidth: 1, borderRadius: 12, marginBottom: 14, overflow: 'hidden' },
  corpoCard: { flexDirection: 'row', padding: 15, alignItems: 'center' },
  iconeTurmaBg: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', marginRight: 14 },
  infoTurma: { flex: 1 },
  linhaTitulo: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  nomeTurma: { fontSize: 16, fontWeight: 'bold' },
  badgeStatus: { borderWidth: 1, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12 },
  textoBadge: { fontSize: 10, fontWeight: 'bold' },
  materiaTurma: { fontSize: 13, marginTop: 2 },
  detalhesGrade: { gap: 2, marginTop: 6 },
  detalheRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 2 },
  textoDetalhe: { fontSize: 12 },
  textoHorario: { fontSize: 12, fontWeight: 'bold' },
  textoProf: { fontSize: 12, fontStyle: 'italic' },
  rodapeAcao: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 12, borderTopWidth: 1 },
  textoAcao: { fontSize: 13, fontWeight: 'bold' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
  modalConteudo: { maxHeight: '85%', borderTopLeftRadius: 22, borderTopRightRadius: 22, borderWidth: 1, paddingBottom: 24 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1 },
  modalTitulo: { fontSize: 18, fontWeight: 'bold' },
  labelCampo: { fontSize: 12, fontWeight: '700', marginBottom: 6 },
  inputModal: { borderWidth: 1, borderRadius: 10, height: 44, paddingHorizontal: 12, fontSize: 14, marginBottom: 14 },
  linhaTurnosModal: { flexDirection: 'row', gap: 8, marginBottom: 18 },
  chipTurnoModal: { flex: 1, height: 40, borderWidth: 1, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  btnSalvar: { height: 46, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  btnExcluir: { flexDirection: 'row', height: 44, borderWidth: 1, borderRadius: 10, justifyContent: 'center', alignItems: 'center', gap: 8, marginTop: 10 },
});