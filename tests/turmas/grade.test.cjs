const { test } = require('node:test');
const assert = require('node:assert/strict');
const { carregar } = require('./carregar.cjs');
const tipos = carregar('src/types/turma.ts');
const turma = { nome: 'Turma sintética', disciplina: 'Disciplina', diaId: 2, horario: '08:00', professorId: 'uid-a' };

test('validação protege apresentação e não concede vínculo por nome', () => {
  assert.equal(tipos.validarTurma('real', { ...turma, id: 'falso' }).id, 'real');
  assert.equal(tipos.validarTurma('real', { ...turma, disciplina: undefined, materia: 'Legada' }).disciplina, 'Legada');
  assert.equal(tipos.validarTurma('real', { ...turma, professorId: undefined }).professorId, undefined);
  for (const extra of [{ diaId: 0 }, { diaId: 1.5 }, { nome: '' }, { horario: null }, { disciplina: 3 }]) {
    assert.equal(tipos.validarTurma('x', { ...turma, ...extra }), null);
  }
});
test('permissão e conexão são erros distintos', () => {
  assert.equal(tipos.classificarErroGrade({ code: 'permission-denied' }).tipo, 'permissao');
  assert.equal(tipos.classificarErroGrade({ code: 'unavailable' }).tipo, 'conexao');
});
function servico({ perfil = { nome: 'Sintético', role: 'professor', ativo: true }, documentos = [], chamadas = [], falha } = {}) {
  const consultas = [];
  const sdk = {
    collection: (_, nome) => nome, doc: (_, grupo, id) => ({ grupo, id }),
    orderBy: (...args) => ['orderBy', ...args], limit: n => ['limit', n],
    where: (...args) => args, query: (grupo, ...filtros) => ({ grupo, filtros }),
    getDocFromServer: async () => ({ data: () => perfil }),
    getDocsFromServer: async q => {
      consultas.push(q);
      if (falha && q.grupo === 'chamadas') throw falha;
      return { forEach: fn => (q.grupo === 'turmas' ? documentos : chamadas).forEach(([id, dados]) => fn({ id, data: () => dados })) };
    },
  };
  return { ...carregar('src/services/turmas.ts', { 'firebase/firestore': sdk }), consultas };
}
test('sem ativo ou perfil divergente não consulta turmas', async () => {
  for (const perfil of [{ nome: 'Teste', role: 'professor' }, { nome: 'Teste', role: 'admin', ativo: true }]) {
    const s = servico({ perfil });
    await assert.rejects(s.buscarGradeTurmas({}, { uid: 'uid-a', role: 'professor' }), { code: 'permission-denied' });
    assert.equal(s.consultas.length, 0);
  }
});
test('sem turmas não existe consulta de chamadas', async () => {
  const s = servico();
  const grade = await s.buscarGradeTurmas({}, { uid: 'uid-a', role: 'professor' });
  assert.equal(grade.turmas.length, 0);
  assert.equal(s.consultas.length, 1);
});
test('consulta diária usa intervalo indexado e rejeita horário não confiável', async () => {
  const s = servico({ documentos: [['t-a', turma]], chamadas: [['c-a', { turmaId: 't-a', dataChamada: 'invalida' }]] });
  await assert.rejects(s.buscarGradeTurmas({}, { uid: 'uid-a', role: 'professor' }, '2026-01-05'), { code: 'dados-invalidos' });
  assert.equal(JSON.stringify(s.consultas[1]), JSON.stringify({ grupo: 'chamadas', filtros: [
    ['turmaId', '==', 't-a'], ['dataChamada', '>=', '2026-01-05T03:00:00.000Z'],
    ['dataChamada', '<', '2026-01-06T03:00:00.000Z'], ['orderBy', 'dataChamada', 'desc'], ['limit', 1]] }));
});
test('coordenador usa atribuição e admin consulta geral; nunca perfil padrão', async () => {
  for (const role of ['coordenador', 'admin']) {
    const s = servico({ perfil: { nome: 'Teste', role, ativo: true } });
    await s.buscarGradeTurmas({}, { uid: 'uid-a', role });
    assert.equal(JSON.stringify(s.consultas[0].filtros), JSON.stringify(role === 'admin' ? [] : [['coordenadorIds', 'array-contains', 'uid-a']]));
  }
  await assert.rejects(servico().buscarGradeTurmas({}, { uid: 'uid-a', role: 'desconhecido' }), { code: 'permission-denied' });
});
test('falha de chamadas não retorna grade parcial com indicadores falsos', async () => {
  const erro = { code: 'unavailable' };
  await assert.rejects(servico({ falha: erro, documentos: [['t-a', turma]] }).buscarGradeTurmas({}, { uid: 'uid-a', role: 'professor' }), e => e === erro);
});
test('cancelamento interrompe novas leituras', async () => {
  const s = servico({ documentos: [['t-a', turma]] });
  let contador = 0;
  await assert.rejects(s.buscarGradeTurmas({}, { uid: 'uid-a', role: 'professor' }, '2026-01-05', () => ++contador < 3), { code: 'cancelled' });
  assert.equal(s.consultas.length, 1);
});

// Harness de ciclo de vida para testar o hook real sem renderer/dependências novas.
function montarHook(relogio) {
  const valores = [], memorias = [];
  let cursor = 0, efeito, contexto;
  const auth = { currentUser: null }, pendentes = [];
  const react = {
    useState(inicial) { const i = cursor++; if (!(i in valores)) valores[i] = inicial; return [valores[i], v => valores[i] = v]; },
    useRef(inicial) { const i = cursor++; return valores[i] ||= { current: inicial }; },
    useCallback(fn, deps) { const i = cursor++; if (!memorias[i] || deps.some((v, j) => v !== memorias[i].deps[j])) memorias[i] = { fn, deps }; return memorias[i].fn; },
  };
  const { useGradeTurmas } = carregar('src/hooks/use-grade-turmas.ts', {
    './use-calendario-bahia': { useCalendarioBahia: () => carregar('src/utils/calendario.ts').calendarioBahia(relogio ? new relogio() : new Date()) },
    react, 'expo-router': { useFocusEffect: fn => efeito = fn },
    '../config/firebase': { auth, db: {} }, '../contexts/authContext': { useAuth: () => contexto },
    '../services/turmas': { buscarGradeTurmas: () => new Promise((resolve, reject) => pendentes.push({ resolve, reject })) },
  }, relogio ? { Date: relogio } : {});
  return { pendentes, auth, render(usuario, role = 'professor') {
    auth.currentUser = usuario;
    contexto = { usuario, dadosPerfil: { role }, statusPerfil: 'disponivel' };
    cursor = 0; return useGradeTurmas();
  }, focar: () => efeito() };
}
const gradeTeste = id => ({ turmas: [{ id }], chamadasHoje: {}, turmasInvalidas: 0 });
const concluir = () => new Promise(resolve => setImmediate(resolve));
test('troca de sessão oculta dados no render e ignora resposta antiga', async () => {
  const h = montarHook(), a = { uid: 'a' }, b = { uid: 'b' };
  h.render(a); const limparA = h.focar();
  assert.equal(h.render(b).turmas.length, 0);
  limparA(); h.focar();
  h.pendentes[1].resolve(gradeTeste('b')); await concluir();
  h.pendentes[0].resolve(gradeTeste('a')); await concluir();
  assert.equal(h.render(b).turmas[0].id, 'b');
});
test('refresh mais recente vence e falha limpa dados antigos', async () => {
  const h = montarHook(), a = { uid: 'a' };
  h.render(a); h.focar();
  const atualizar = h.render(a).atualizar;
  void atualizar();
  h.pendentes[1].resolve(gradeTeste('novo')); await concluir();
  h.pendentes[0].resolve(gradeTeste('antigo')); await concluir();
  assert.equal(h.render(a).turmas[0].id, 'novo');
  void atualizar(); h.pendentes[2].reject({ code: 'unavailable' }); await concluir();
  assert.equal(h.render(a).turmas.length, 0);
  assert.equal(h.render(a).erro.tipo, 'conexao');
});

test('IDs de documentos não colidem com propriedades do dicionário', async () => {
  const s = servico({ documentos: [['__proto__', turma]], chamadas: [['c', { turmaId: '__proto__', dataChamada: '2026-01-05T12:00:00.000Z' }]] });
  const grade = await s.buscarGradeTurmas({}, { uid: 'uid-a', role: 'professor' }, '2026-01-05');
  assert.equal(grade.chamadasHoje['__proto__'], '09:00');
  assert.equal(Object.keys(grade.chamadasHoje)[0], '__proto__');
});
test('resposta após perda de foco não é publicada', async () => {
  const h = montarHook(), a = { uid: 'a' };
  h.render(a); const limpar = h.focar();
  limpar(); h.pendentes[0].resolve(gradeTeste('antiga')); await concluir();
  assert.equal(h.render(a).turmas.length, 0);
});

test('virada do dia invalida indicadores e respostas iniciadas no domingo', async () => {
  let agora = Date.parse('2026-11-16T02:59:59.900Z');
  class Relogio extends Date {
    constructor(...args) { super(...(args.length ? args : [agora])); }
    static now() { return agora; }
  }
  const h = montarHook(Relogio), a = { uid: 'a' };
  h.render(a); const limpar = h.focar();
  agora += 100;
  assert.equal(h.render(a).turmas.length, 0);
  limpar(); h.focar();
  h.pendentes[1].resolve(gradeTeste('segunda')); await concluir();
  h.pendentes[0].resolve(gradeTeste('domingo')); await concluir();
  assert.equal(h.render(a).turmas[0].id, 'segunda');
});

test('índice pendente preserva grade, bloqueia indicadores e não faz scan alternativo', async () => {
  const s = servico({ documentos: [['t-a', turma]], falha: { code: 'failed-precondition' } });
  const grade = await s.buscarGradeTurmas({}, { uid: 'uid-a', role: 'professor' });
  assert.equal(grade.turmas.length, 1);
  assert.equal(grade.erroIndicadores.tipo, 'configuracao');
  assert.equal(Object.keys(grade.chamadasHoje).length, 0);
  assert.equal(s.consultas.length, 2);
});
