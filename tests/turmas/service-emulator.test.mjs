import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { test, before, beforeEach, after } from 'node:test';
import assert from 'node:assert/strict';
import { validarAmbiente } from '../firestore/ambiente.mjs';
import loader from './carregar.cjs';

const destino = validarAmbiente();
const require = createRequire(process.env.VIOLETA_TEST_TOOLS_DIR
  ? resolve(process.env.VIOLETA_TEST_TOOLS_DIR, 'package.json') : import.meta.url);
const { initializeTestEnvironment } = require('@firebase/rules-unit-testing');
const sdk = require('firebase/firestore');
const { buscarGradeTurmas } = loader.carregar('src/services/turmas.ts', { 'firebase/firestore': sdk });
const fixture = JSON.parse(await readFile(new URL('../firestore/fixtures/cenarios.json', import.meta.url)));
let ambiente;
before(async () => {
  ambiente = await initializeTestEnvironment({ projectId: destino.projectId,
    firestore: { host: destino.host, port: destino.port,
      rules: await readFile(new URL('../../firestore.rules', import.meta.url), 'utf8') } });
});
beforeEach(async () => {
  await ambiente.clearFirestore();
  await ambiente.withSecurityRulesDisabled(async contexto => {
    const banco = contexto.firestore();
    const batch = sdk.writeBatch(banco);
    for (const [grupo, docs] of Object.entries({ usuarios: fixture.usuarios, turmas: fixture.turmas, chamadas: fixture.chamadasLegadas })) {
      for (const [id, dados] of Object.entries(docs)) batch.set(sdk.doc(banco, grupo, id), dados);
    }
    batch.set(sdk.doc(banco, 'chamadas/teste-b'), { turmaId: 'teste-turma-b', dataChamadaFormatada: '2026-01-05', dataChamada: '2026-01-05T13:00:00.000Z', alunos: [{ id: 'aluno-sintetico', nome: 'Aluno Sintético' }] });
    await batch.commit();
  });
});
after(async () => { if (ambiente) await ambiente.cleanup(); });
async function carregar(uid, role) {
  return buscarGradeTurmas(ambiente.authenticatedContext(uid).firestore(), { uid, role }, '2026-01-05');
}
for (const [uid, role, esperadas] of [
  ['teste-professor-a', 'professor', ['teste-turma-a']],
  ['teste-professor-b', 'professor', ['teste-turma-b']],
  ['teste-coordenador-a', 'coordenador', ['teste-turma-a']],
  ['teste-coordenador-b', 'coordenador', []],
  ['teste-admin', 'admin', ['teste-turma-a', 'teste-turma-b']],
]) {
  test(`serviço real com regras: ${uid}`, async () => {
    const grade = await carregar(uid, role);
    assert.deepEqual(Array.from(grade.turmas, t => t.id), esperadas);
    assert.deepEqual(Object.keys(grade.chamadasHoje).sort(), esperadas);
    assert.equal(grade.turmasInvalidas, role === 'admin' ? 1 : 0);
  });
}
for (const uid of ['teste-legado', 'teste-inativo', 'teste-sem-perfil', 'teste-invalido']) {
  test(`serviço real nega perfil ${uid}`, async () => {
    await assert.rejects(carregar(uid, 'professor'), { code: 'permission-denied' });
  });
}
test('perfil real prevalece sobre papel informado pelo cliente', async () => {
  await assert.rejects(carregar('teste-professor-a', 'admin'), { code: 'permission-denied' });
});
