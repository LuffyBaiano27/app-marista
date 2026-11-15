import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { test, before, beforeEach, after } from 'node:test';
import assert from 'node:assert/strict';
import { validarAmbiente } from '../firestore/ambiente.mjs';
import loader from '../turmas/carregar.cjs';
const destino = validarAmbiente();
const require = createRequire(process.env.VIOLETA_TEST_TOOLS_DIR ? resolve(process.env.VIOLETA_TEST_TOOLS_DIR, 'package.json') : import.meta.url);
const { initializeTestEnvironment } = require('@firebase/rules-unit-testing');
const sdk = require('firebase/firestore');
const servicos = loader.carregar('src/services/chamadas.ts', { 'firebase/firestore': sdk });
const fixture = JSON.parse(await readFile(new URL('../firestore/fixtures/cenarios.json', import.meta.url)));
let ambiente;
before(async () => {
  ambiente = await initializeTestEnvironment({ projectId: destino.projectId,
    firestore: { host: destino.host, port: destino.port, rules: await readFile(new URL('../../firestore.rules', import.meta.url), 'utf8') } });
});
beforeEach(async () => {
  await ambiente.clearFirestore();
  await ambiente.withSecurityRulesDisabled(async contexto => {
    const banco = contexto.firestore(), batch = sdk.writeBatch(banco);
    for (const [grupo, docs] of Object.entries({ usuarios: fixture.usuarios, turmas: fixture.turmas })) {
      for (const [id, dados] of Object.entries(docs)) batch.set(sdk.doc(banco, grupo, id), dados);
    }
    batch.set(sdk.doc(banco, 'usuarios/teste-sem-turma'), { nome: 'Professor Sintético', role: 'professor', ativo: true });
    for (const letra of ['a', 'b']) batch.set(sdk.doc(banco, `chamadas/diario-${letra}`), {
      turmaId: `teste-turma-${letra}`, dataChamada: '2026-01-05T12:00:00.000Z', dataChamadaFormatada: '2026-01-05',
      alunos: [{ id: `aluno-${letra}`, nome: `Aluno Sintético ${letra}`, presencas: [true], obs: '' }],
    });
    batch.set(sdk.doc(banco, 'chamadas/orfa'), { turmaId: 'inexistente', alunos: [] });
    await batch.commit();
  });
});
after(async () => { if (ambiente) await ambiente.cleanup(); });
function ator(uid, role = 'professor') { return { banco: ambiente.authenticatedContext(uid).firestore(), identidade: { uid, role } }; }
for (const [uid, role, ids] of [
  ['teste-professor-a', 'professor', ['diario-a']], ['teste-professor-b', 'professor', ['diario-b']],
  ['teste-coordenador-a', 'coordenador', ['diario-a']], ['teste-coordenador-b', 'coordenador', []],
  ['teste-sem-turma', 'professor', []], ['teste-admin', 'admin', ['diario-a', 'diario-b']],
]) {
  test(`histórico autorizado: ${uid}`, async () => {
    const { banco, identidade } = ator(uid, role);
    const dados = await servicos.buscarHistoricoAutorizado(banco, identidade);
    assert.deepEqual(Array.from(dados.chamadas, c => c.id).sort(), ids);
    if (!ids.length) assert.equal(dados.turmas.length, 0);
  });
}
for (const [uid, role] of [['teste-professor-a', 'professor'], ['teste-coordenador-a', 'coordenador'], ['teste-admin', 'admin']]) {
  test(`acesso direto autorizado abre diário exato: ${uid}`, async () => {
    const { banco, identidade } = ator(uid, role);
    const dados = await servicos.buscarDiarioAutorizado(banco, identidade, 'teste-turma-a', 'diario-a');
    assert.equal(dados.chamada.id, 'diario-a'); assert.equal(dados.chamada.alunos[0].id, 'aluno-a');
  });
}
for (const uid of ['teste-professor-a', 'teste-sem-turma']) {
  test(`URL de turma alheia rejeitada: ${uid}`, async () => {
    const { banco, identidade } = ator(uid);
    await assert.rejects(servicos.buscarDiarioAutorizado(banco, identidade, 'teste-turma-b', 'diario-b'), e => e.code === 'permission-denied');
  });
}
test('não abre diário alheio alterando apenas chamadaId', async () => {
  const { banco, identidade } = ator('teste-professor-a');
  await assert.rejects(servicos.buscarDiarioAutorizado(banco, identidade, 'teste-turma-a', 'diario-b'), { code: 'permission-denied' });
});
test('professor sem turma não pode fingir papel de admin', async () => {
  const { banco } = ator('teste-sem-turma');
  await assert.rejects(servicos.buscarHistoricoAutorizado(banco, { uid: 'teste-sem-turma', role: 'admin' }), { code: 'permission-denied' });
});
test('sem registro de hoje não cria alunos ou chamada', async () => {
  const { banco, identidade } = ator('teste-professor-a');
  assert.equal((await servicos.buscarDiarioAutorizado(banco, identidade, 'teste-turma-a')).chamada, null);
});
