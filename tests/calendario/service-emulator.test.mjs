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
const { buscarGradeTurmas } = loader.carregar('src/services/turmas.ts', { 'firebase/firestore': sdk });
const { consultarDiarioDoDia } = loader.carregar('src/services/consulta-diaria.ts', { 'firebase/firestore': sdk });
let ambiente;
before(async () => {
  ambiente = await initializeTestEnvironment({ projectId: destino.projectId,
    firestore: { host: destino.host, port: destino.port, rules: await readFile(new URL('../../firestore.rules', import.meta.url), 'utf8') } });
});
beforeEach(async () => {
  await ambiente.clearFirestore();
  await ambiente.withSecurityRulesDisabled(async contexto => {
    const banco = contexto.firestore(), batch = sdk.writeBatch(banco);
    for (const letra of ['a', 'b']) {
      batch.set(sdk.doc(banco, `usuarios/teste-prof-${letra}`), { nome: `Professor Sintético ${letra}`, role: 'professor', ativo: true });
      batch.set(sdk.doc(banco, `turmas/teste-turma-${letra}`), { nome: `Turma Sintética ${letra}`, disciplina: 'Teste', diaId: 1,
        horario: '08:00', professorId: `teste-prof-${letra}`, coordenadorIds: [], ativo: true });
    }
    for (const [id, dataChamada] of [
      ['antes', '2026-11-15T02:59:59.999Z'], ['inicio', '2026-11-15T03:00:00.000Z'],
      ['utc-seguinte', '2026-11-16T00:30:00.000Z'], ['ultimo', '2026-11-16T02:59:59.999Z'],
      ['seguinte', '2026-11-16T03:00:00.000Z'],
    ]) batch.set(sdk.doc(banco, `chamadas/${id}`), { turmaId: 'teste-turma-a', dataChamada, alunos: [] });
    batch.set(sdk.doc(banco, 'chamadas/alheia'), { turmaId: 'teste-turma-b', dataChamada: '2026-11-16T02:59:59.999Z', alunos: [] });
    batch.set(sdk.doc(banco, 'chamadas/sem-data'), { turmaId: 'teste-turma-a', alunos: [] });
    await batch.commit();
  });
});
after(async () => { if (ambiente) await ambiente.cleanup(); });
const banco = () => ambiente.authenticatedContext('teste-prof-a').firestore();
test('intervalo Bahia retorna só o último diário do dia, inclusive após meia-noite UTC', async () => {
  const grade = await buscarGradeTurmas(banco(), { uid: 'teste-prof-a', role: 'professor' }, '2026-11-15');
  assert.deepEqual(Object.keys(grade.chamadasHoje), ['teste-turma-a']);
  assert.equal(grade.diariosHoje['teste-turma-a'], 'ultimo');
  assert.equal(grade.chamadasHoje['teste-turma-a'], '23:59');
});
test('limite superior de domingo pertence somente à segunda-feira Bahia', async () => {
  assert.equal((await consultarDiarioDoDia(banco(), 'teste-turma-a', '2026-11-16')).id, 'seguinte');
  assert.equal((await consultarDiarioDoDia(banco(), 'teste-turma-a', '2026-11-14')).id, 'antes');
});
test('consulta por intervalo não ultrapassa o vínculo da professora', async () => {
  await assert.rejects(consultarDiarioDoDia(banco(), 'teste-turma-b', '2026-11-15'), e => e.code === 'permission-denied');
});
test('registro sem campo temporal não é presumido como registro de hoje', async () => {
  assert.equal(await consultarDiarioDoDia(banco(), 'teste-turma-a', '2026-11-17'), null);
});
test('formato temporal não canônico candidato bloqueia o indicador em vez de presumir', async () => {
  await ambiente.withSecurityRulesDisabled(async contexto => {
    await sdk.setDoc(sdk.doc(contexto.firestore(), 'chamadas/nao-canonica'), {
      turmaId: 'teste-turma-a', dataChamada: '2026-11-16T02:59:59Z', alunos: [],
    });
  });
  await assert.rejects(consultarDiarioDoDia(banco(), 'teste-turma-a', '2026-11-15'), { code: 'dados-invalidos' });
});

test('consulta de tela sem chamadaId usa o dia Bahia solicitado e mantém leitura', async () => {
  const { buscarDiarioAutorizado } = loader.carregar('src/services/chamadas.ts', { 'firebase/firestore': sdk });
  const dados = await buscarDiarioAutorizado(banco(), { uid: 'teste-prof-a', role: 'professor' },
    'teste-turma-a', undefined, () => true, '2026-11-15');
  assert.equal(dados.chamada.id, 'ultimo');
});
