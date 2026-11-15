import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { before, beforeEach, after, test } from 'node:test';
import { validarAmbiente } from '../firestore/ambiente.mjs';
const destino = validarAmbiente();
const require = createRequire(process.env.VIOLETA_TEST_TOOLS_DIR ? resolve(process.env.VIOLETA_TEST_TOOLS_DIR, 'package.json') : import.meta.url);
const { initializeTestEnvironment, assertSucceeds, assertFails } = require('@firebase/rules-unit-testing');
const { doc, getDocFromServer, getDocsFromServer, collection, query, where, setDoc, updateDoc, deleteDoc, deleteField, serverTimestamp, Timestamp, writeBatch, runTransaction } = require('firebase/firestore');
let ambiente;
const perfis = [['p', 'professor'], ['p2', 'professor'], ['c', 'coordenador'], ['c2', 'coordenador'], ['a', 'admin']];
const banco = uid => ambiente.authenticatedContext(uid).firestore();
const semRegras = fn => ambiente.withSecurityRulesDisabled(c => fn(c.firestore()));
const ticket = uid => ({ solicitanteUid: uid, descricao: 'Pedido sintético F2', status: 'pendente', criadoEm: serverTimestamp() });
before(async () => {
  ambiente = await initializeTestEnvironment({ projectId: destino.projectId, firestore: { host: destino.host, port: destino.port,
    rules: await readFile(new URL('../../firestore.rules', import.meta.url), 'utf8') } });
});
beforeEach(async () => {
  await ambiente.clearFirestore();
  await semRegras(async db => {
    const batch = writeBatch(db);
    for (const [uid, role] of perfis) batch.set(doc(db, 'usuarios', uid), { nome: 'Perfil Sintético F2', role, ativo: true });
    batch.set(doc(db, 'turmas/t'), { nome: 'Turma Sintética F2', disciplina: 'Disciplina Sintética', professorId: 'p', coordenadorIds: ['c'], ativo: true,
      diaId: 1, horario: '08:00', turno: 'Matutino', criadoEm: Timestamp.fromMillis(1), atualizadoEm: Timestamp.fromMillis(1) });
    batch.set(doc(db, 'chamadas/d'), { turmaId: 't', status: 'finalizada' });
    batch.set(doc(db, 'chamados_suporte/s'), { ...ticket('p'), criadoEm: Timestamp.fromMillis(1) });
    await batch.commit();
  });
});
after(async () => { if (ambiente) await ambiente.cleanup(); });
for (const [uid, role] of [['p', 'professor'], ['c', 'coordenador'], ['a', 'admin']]) {
  test(`${role}: remoção e merge de autoridade são negados`, async () => {
    const db = banco(uid), ref = doc(db, 'usuarios', uid);
    for (const campo of ['role', 'ativo']) await assertFails(updateDoc(ref, { [campo]: deleteField() }));
    await assertFails(setDoc(ref, { role: 'admin', permissoes: { tudo: true } }, { merge: true }));
    await assertFails(updateDoc(ref, { 'autoridade.admin': true }));
  });
  test(`${role}: todas as gravações diretas de chamada são negadas`, async () => {
    const db = banco(uid);
    await assertFails(setDoc(doc(db, 'chamadas/nova'), { turmaId: 't' }));
    await assertFails(setDoc(doc(db, 'chamadas/d'), { assinada: true }, { merge: true }));
    await assertFails(updateDoc(doc(db, 'chamadas/d'), { status: 'assinada' }));
    await assertFails(deleteDoc(doc(db, 'chamadas/d')));
  });
  test(`${role}: criação própria de suporte e integridade da autoria`, async () => {
    const db = banco(uid);
    await assertSucceeds(setDoc(doc(db, 'chamados_suporte/novo'), ticket(uid)));
    await assertFails(setDoc(doc(db, 'chamados_suporte/forjado'), ticket('outro')));
    await assertFails(updateDoc(doc(db, 'chamados_suporte/novo'), { solicitanteUid: 'outro' }));
    await assertFails(deleteDoc(doc(db, 'chamados_suporte/novo')));
  });
  for (const [estado, alteracao] of [['inativo', { ativo: false }], ['sem ativo', { ativo: deleteField() }], ['role inválido', { role: 'diretor' }], ['ativo inválido', { ativo: 'true' }]]) {
    test(`${role} ${estado}: mesma sessão perde acesso operacional`, async () => {
      const db = banco(uid);
      await semRegras(b => updateDoc(doc(b, 'usuarios', uid), alteracao));
      await assertSucceeds(getDocFromServer(doc(db, 'usuarios', uid)));
      await assertFails(getDocFromServer(doc(db, 'turmas/t')));
      await assertFails(getDocFromServer(doc(db, 'chamadas/d')));
      await assertFails(getDocsFromServer(query(collection(db, 'chamados_suporte'), where('solicitanteUid', '==', uid))));
      await assertFails(setDoc(doc(db, 'chamados_suporte/novo'), ticket(uid)));
      await assertFails(updateDoc(doc(db, 'chamados_suporte/s'), { status: 'resolvido', resolvidoPorUid: uid, resolvidoEm: serverTimestamp() }));
      await assertFails(updateDoc(doc(db, 'usuarios', uid), { nome: 'Outro nome sintético', atualizadoEm: serverTimestamp() }));
    });
  }
}
test('reassociação administrativa revoga vínculo antigo e transfere leitura histórica', async () => {
  const anterior = banco('p'), novo = banco('p2'), coordAnterior = banco('c'), coordNovo = banco('c2');
  for (const db of [anterior, coordAnterior]) await assertSucceeds(getDocFromServer(doc(db, 'chamadas/d')));
  for (const db of [novo, coordNovo]) await assertFails(getDocFromServer(doc(db, 'turmas/t')));
  await assertSucceeds(updateDoc(doc(banco('a'), 'turmas/t'), { professorId: 'p2', coordenadorIds: ['c2'], atualizadoEm: serverTimestamp() }));
  for (const db of [anterior, coordAnterior]) {
    await assertFails(getDocFromServer(doc(db, 'turmas/t')));
    await assertFails(getDocFromServer(doc(db, 'chamadas/d')));
  }
  for (const db of [novo, coordNovo]) await assertSucceeds(getDocFromServer(doc(db, 'chamadas/d')));
});
for (const uid of ['p', 'c']) {
  test(`${uid}: manipulação de vínculos, consultas e transação não promove conta`, async () => {
    const db = banco(uid);
    await assertFails(updateDoc(doc(db, 'turmas/t'), { professorId: uid, coordenadorIds: [uid], atualizadoEm: serverTimestamp() }));
    await assertFails(getDocFromServer(doc(db, 'usuarios/a')));
    await assertFails(getDocsFromServer(query(collection(db, 'turmas'), where('professorId', '==', 'p2'))));
    await assertFails(getDocsFromServer(query(collection(db, 'chamados_suporte'), where('solicitanteUid', '==', 'p2'))));
    await assertFails(runTransaction(db, async tx => {
      await tx.get(doc(db, 'usuarios', uid));
      tx.update(doc(db, 'usuarios', uid), { role: 'admin' });
      tx.update(doc(db, 'chamados_suporte/s'), { status: 'resolvido', resolvidoPorUid: uid, resolvidoEm: serverTimestamp() });
    }));
  });
}
test('perfil excluído ou ausente nega acesso mesmo com claims administrativas', async () => {
  const db = ambiente.authenticatedContext('ausente', { role: 'admin', admin: true }).firestore();
  await assertFails(getDocsFromServer(collection(db, 'usuarios')));
  await assertFails(getDocFromServer(doc(db, 'turmas/t')));
  await assertFails(setDoc(doc(db, 'chamados_suporte/novo'), ticket('ausente')));
  const sessao = banco('a');
  await semRegras(b => deleteDoc(doc(b, 'usuarios/a')));
  await assertFails(getDocFromServer(doc(sessao, 'chamadas/d')));
});
test('resolução administrativa é única e não permite reabertura ou remoção de autoria', async () => {
  const db = banco('a'), ref = doc(db, 'chamados_suporte/s');
  await assertFails(updateDoc(ref, { status: 'resolvido', resolvidoPorUid: 'p', resolvidoEm: serverTimestamp() }));
  await assertFails(updateDoc(ref, { status: 'resolvido', solicitanteUid: deleteField(), resolvidoPorUid: 'a', resolvidoEm: serverTimestamp() }));
  await assertSucceeds(updateDoc(ref, { status: 'resolvido', resolvidoPorUid: 'a', resolvidoEm: serverTimestamp() }));
  await assertFails(updateDoc(ref, { status: 'pendente' }));
  await assertFails(updateDoc(ref, { status: 'resolvido', resolvidoPorUid: 'a', resolvidoEm: serverTimestamp() }));
});
