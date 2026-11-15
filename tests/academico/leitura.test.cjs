const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { carregar } = require('../turmas/carregar.cjs');
const { validarChamada } = carregar('src/types/chamada.ts');
const turma = { nome: 'Turma sintética', disciplina: 'Disciplina', horario: '08:00', diaId: 1, professorId: 'professor-a', coordenadorIds: ['coord-a'] };
const chamada = { turmaId: 'turma-a', dataChamada: '2026-01-05T12:00:00.000Z', alunos: [{ id: 'aluno-sintetico', nome: 'Aluno Sintético', presencas: [true, false], obs: 'Observação sintética' }] };
function ambiente({ role = 'professor', documentos = [['turma-a', turma]], diario = chamada, perfilAtivo = true, falha = null } = {}) {
  const consultas = [];
  const snapshot = (id, dados) => ({ id, data: () => dados, exists: () => dados !== undefined });
  const sdk = {
    collection: (_, nome) => nome, doc: (_, grupo, id) => ({ grupo, id }),
    orderBy: (...args) => ['orderBy', ...args], limit: n => ['limit', n], documentId: () => '__name__',
    query: (grupo, ...filtros) => ({ grupo, filtros }), where: (...filtro) => filtro,
    getDocFromServer: async ref => ref.grupo === 'usuarios'
      ? snapshot(ref.id, { nome: 'Perfil sintético', role, ativo: perfilAtivo })
      : snapshot(ref.id, documentos.find(([id]) => id === ref.id)?.[1]),
    getDocsFromServer: async q => {
      consultas.push(q);
      if (falha && q.grupo === 'chamadas') throw falha;
      const linhas = q.grupo === 'turmas' ? documentos : diario ? [['diario-a', diario]] : [];
      const docs = linhas.map(([id, dados]) => snapshot(id, dados));
      return { docs, forEach: fn => docs.forEach(fn) };
    },
  };
  return { ...carregar('src/services/chamadas.ts', { 'firebase/firestore': sdk }), consultas };
}
const identidade = { uid: 'professor-a', role: 'professor' };
test('valida presenças reais sem criar alunos substitutos', () => {
  const lida = validarChamada('diario-a', chamada);
  assert.equal(lida.alunos.length, 1);
  assert.equal(lida.faltas, 1);
  assert.equal(validarChamada('x', { ...chamada, alunos: [{ id: 'x', nome: 'Teste', presencas: ['true'] }] }), null);
  assert.equal(validarChamada('x', { ...chamada, alunos: undefined }), null);
  assert.equal(validarChamada('x', { ...chamada, alunos: [] }).alunos.length, 0);
});
test('professor sem turmas não lê chamadas nem apresenta boletins', async () => {
  const s = ambiente({ documentos: [] });
  const dados = await s.buscarHistoricoAutorizado({}, identidade);
  assert.equal(dados.turmas.length, 0); assert.equal(dados.chamadas.length, 0);
  assert.equal(s.consultas.length, 1); assert.equal(s.consultas[0].grupo, 'turmas');
});
test('histórico sempre consulta chamada por turma e nunca geral', async () => {
  const s = ambiente();
  const dados = await s.buscarHistoricoAutorizado({}, identidade);
  assert.equal(dados.chamadas[0].id, 'diario-a');
  assert.equal(JSON.stringify(s.consultas[1].filtros), JSON.stringify([['turmaId', '==', 'turma-a']]));
});
test('vínculo protege URL direta mesmo se o servidor devolver turma alheia', async () => {
  const s = ambiente({ documentos: [['turma-b', { ...turma, professorId: 'professor-b' }]] });
  await assert.rejects(s.buscarDiarioAutorizado({}, identidade, 'turma-b'), { code: 'permission-denied' });
  assert.equal(s.consultas.length, 1);
  assert.equal(s.consultas[0].grupo, 'turmas');
});
test('coordenador não pode consultar turma sem atribuição', async () => {
  const s = ambiente({ role: 'coordenador' });
  await assert.rejects(s.buscarDiarioAutorizado({}, { uid: 'coord-b', role: 'coordenador' }, 'turma-a'), { code: 'permission-denied' });
});
test('ID do diário não autoriza outro registro', async () => {
  const s = ambiente();
  await assert.rejects(s.buscarDiarioAutorizado({}, identidade, 'turma-a', 'diario-alheio'), { code: 'permission-denied' });
  const dados = await s.buscarDiarioAutorizado({}, identidade, 'turma-a', 'diario-a');
  assert.equal(dados.chamada.id, 'diario-a');
});
test('sem diário não substitui por lista de alunos fictícios', async () => {
  const s = ambiente({ diario: null });
  assert.equal((await s.buscarDiarioAutorizado({}, identidade, 'turma-a')).chamada, null);
});
test('dados históricos inválidos são sinalizados sem inventar presença', async () => {
  const s = ambiente({ diario: { ...chamada, alunos: null } });
  const historico = await s.buscarHistoricoAutorizado({}, identidade);
  assert.equal(historico.chamadas.length, 0); assert.equal(historico.chamadasInvalidas, 1);
  await assert.rejects(s.buscarDiarioAutorizado({}, identidade, 'turma-a', 'diario-a'), { code: 'dados-invalidos' });
});
test('conexão, perfil inativo e cancelamento não retornam dados acadêmicos', async () => {
  await assert.rejects(ambiente({ falha: { code: 'unavailable' } }).buscarHistoricoAutorizado({}, identidade), e => e.code === 'unavailable');
  await assert.rejects(ambiente({ perfilAtivo: false }).buscarHistoricoAutorizado({}, identidade), { code: 'permission-denied' });
  await assert.rejects(ambiente().buscarHistoricoAutorizado({}, identidade, () => false), { code: 'cancelled' });
});
test('telas não contêm simuladores, alunos estáticos ou operações de escrita', () => {
  for (const arquivo of ['src/app/(tabs)/historico.tsx', 'src/app/(tabs)/avaliacoes.tsx', 'src/app/chamada.tsx', 'src/app/notas.tsx']) {
    const codigo = fs.readFileSync(arquivo, 'utf8');
    assert.doesNotMatch(codigo, /setTipoUsuario|setPeriodoAberto|USUARIO_LOGADO|prof_\d|addDoc\(|setDoc\(|updateDoc\(/);
  }
});
