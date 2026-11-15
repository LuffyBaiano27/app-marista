import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { before, beforeEach, after, test } from 'node:test';
import assert from 'node:assert/strict';
import { validarAmbiente } from '../firestore/ambiente.mjs';
import loader from '../turmas/carregar.cjs';
const destino = validarAmbiente();
const require = createRequire(process.env.VIOLETA_TEST_TOOLS_DIR ? resolve(process.env.VIOLETA_TEST_TOOLS_DIR, 'package.json') : import.meta.url);
const { initializeTestEnvironment } = require('@firebase/rules-unit-testing');
const sdk = require('firebase/firestore');
// O código transpilado roda em VM. Copiar o envelope elimina apenas a diferença
// de protótipo entre realms; os valores e FieldValue originais são preservados.
const sdkTeste = { ...sdk, runTransaction: (banco, fn) => sdk.runTransaction(banco, transacao => fn({
  get: ref => transacao.get(ref),
  set: (ref, dados) => transacao.set(ref, { ...dados }),
  update: (ref, dados) => transacao.update(ref, { ...dados }),
})) };
const servicos = loader.carregar('src/services/suporte.ts', { 'firebase/firestore': sdkTeste });
let ambiente;
before(async () => {
  ambiente = await initializeTestEnvironment({ projectId: destino.projectId,
    firestore: { host: destino.host, port: destino.port, rules: await readFile(new URL('../../firestore.rules', import.meta.url), 'utf8') } });
});
beforeEach(async () => {
  await ambiente.clearFirestore();
  await ambiente.withSecurityRulesDisabled(async contexto => {
    const banco = contexto.firestore(), batch = sdk.writeBatch(banco);
    for (const [uid, role, ativo] of [['p-a', 'professor', true], ['p-b', 'professor', true], ['c-a', 'coordenador', true], ['admin', 'admin', true], ['p-inativo', 'professor', false]]) {
      batch.set(sdk.doc(banco, 'usuarios', uid), { nome: `Perfil Sintético ${uid}`, role, ativo });
    }
    batch.set(sdk.doc(banco, 'usuarios/legado'), { nome: 'Perfil Sintético Legado', role: 'professor' });
    for (const uid of ['p-a', 'p-b', 'c-a']) batch.set(sdk.doc(banco, 'chamados_suporte', uid), {
      solicitanteUid: uid, descricao: `Pedido sintético ${uid}`, status: 'pendente', criadoEm: sdk.Timestamp.fromMillis(1),
    });
    batch.set(sdk.doc(banco, 'chamados_suporte/legado'), { solicitante: 'Nome sintético', descricao: 'Ticket legado sintético', status: 'pendente', timestamp: 1 });
    await batch.commit();
  });
});
after(async () => { if (ambiente) await ambiente.cleanup(); });
function ator(uid, role = 'professor') { return { banco: ambiente.authenticatedContext(uid).firestore(), identidade: { uid, role } }; }
for (const [uid, role] of [['p-a', 'professor'], ['c-a', 'coordenador']]) {
  test(`${role}: serviço consulta só próprios`, async () => {
    const { banco, identidade } = ator(uid, role);
    const resultado = await servicos.listarChamadosSuporte(banco, identidade);
    assert.deepEqual(Array.from(resultado.chamados, c => c.id), [uid]);
  });
  test(`${role}: criação transacional compatível, sem resolução`, async () => {
    const { banco, identidade } = ator(uid, role);
    const id = await servicos.criarChamadoSuporte(banco, identidade, ' Novo pedido sintético ');
    const criado = (await sdk.getDoc(sdk.doc(banco, 'chamados_suporte', id))).data();
    assert.equal(criado.solicitanteUid, uid); assert.equal(criado.descricao, 'Novo pedido sintético');
    assert.equal(criado.status, 'pendente'); assert.ok(criado.criadoEm instanceof sdk.Timestamp);
    await assert.rejects(servicos.resolverChamadoSuporte(banco, identidade, id), e => e.code === 'permission-denied');
  });
}
test('admin lê legado sem atribuição e resolve sem alterar conteúdo', async () => {
  const { banco, identidade } = ator('admin', 'admin');
  const dados = await servicos.listarChamadosSuporte(banco, identidade);
  assert.equal(dados.chamados.length, 4); assert.equal(dados.chamados.find(c => c.id === 'legado').solicitanteUid, null);
  await servicos.resolverChamadoSuporte(banco, identidade, 'p-a');
  const atualizado = (await sdk.getDoc(sdk.doc(banco, 'chamados_suporte/p-a'))).data();
  assert.equal(atualizado.status, 'resolvido'); assert.equal(atualizado.resolvidoPorUid, 'admin');
  assert.equal(atualizado.solicitanteUid, 'p-a'); assert.equal(atualizado.descricao, 'Pedido sintético p-a');
  assert.ok(atualizado.resolvidoEm instanceof sdk.Timestamp);
  await assert.rejects(servicos.resolverChamadoSuporte(banco, identidade, 'p-a'), e => e.code === 'dados-invalidos');
});
for (const uid of ['p-inativo', 'legado']) {
  test(`conta ${uid} não consulta nem cria suporte`, async () => {
    const { banco, identidade } = ator(uid);
    await assert.rejects(servicos.listarChamadosSuporte(banco, identidade), e => e.code === 'permission-denied');
    await assert.rejects(servicos.criarChamadoSuporte(banco, identidade, 'Pedido sintético'), e => e.code === 'permission-denied');
  });
}
test('contexto de professor não ganha acesso informando admin', async () => {
  const { banco } = ator('p-a');
  await assert.rejects(servicos.listarChamadosSuporte(banco, { uid: 'p-a', role: 'admin' }), e => e.code === 'permission-denied');
});
test('inativação administrativa bloqueia novas operações com mesma sessão', async () => {
  const { banco, identidade } = ator('admin', 'admin');
  await servicos.listarChamadosSuporte(banco, identidade);
  await ambiente.withSecurityRulesDisabled(contexto => sdk.updateDoc(sdk.doc(contexto.firestore(), 'usuarios/admin'), { ativo: false }));
  await assert.rejects(servicos.listarChamadosSuporte(banco, identidade), e => e.code === 'permission-denied');
  await assert.rejects(servicos.resolverChamadoSuporte(banco, identidade, 'p-a'), e => e.code === 'permission-denied');
});

test('observador real acompanha inativação e reativação do perfil no emulador', async () => {
  const { banco } = ator('p-a');
  const { observarPerfilUsuario } = loader.carregar('src/services/perfilUsuario.ts', {
    'firebase/firestore': sdk, '../config/firebase': { db: banco },
  });
  let ultimo, falhou = false;
  const aguardando = new Set();
  const notificar = () => { for (const verificar of aguardando) verificar(); };
  const cancelar = observarPerfilUsuario('p-a', resultado => { ultimo = resultado; notificar(); }, () => { falhou = true; notificar(); });
  const esperar = predicado => new Promise((resolve, reject) => {
    const timer = setTimeout(() => { aguardando.delete(verificar); reject(Error('Observador não recebeu confirmação do servidor.')); }, 8000);
    function verificar() {
      if (falhou || predicado(ultimo)) {
        clearTimeout(timer); aguardando.delete(verificar);
        if (falhou) reject(Error('Falha do observador.')); else resolve();
      }
    }
    aguardando.add(verificar); verificar();
  });
  try {
    await esperar(r => r?.status === 'disponivel');
    await ambiente.withSecurityRulesDisabled(c => sdk.updateDoc(sdk.doc(c.firestore(), 'usuarios/p-a'), { ativo: false }));
    await esperar(r => r?.status === 'inativo'); assert.equal(ultimo.dadosPerfil.ativo, false);
    await ambiente.withSecurityRulesDisabled(c => sdk.updateDoc(sdk.doc(c.firestore(), 'usuarios/p-a'), { ativo: true, role: 'coordenador' }));
    await esperar(r => r?.status === 'disponivel' && r.dadosPerfil.role === 'coordenador');
  } finally { cancelar(); }
});
for (const [uid, role] of [['p-a', 'professor'], ['c-a', 'coordenador'], ['admin', 'admin']]) {
  test(`inativação bloqueia suporte para ${role}`, async () => {
    const { banco, identidade } = ator(uid, role);
    await ambiente.withSecurityRulesDisabled(c => sdk.updateDoc(sdk.doc(c.firestore(), 'usuarios', uid), { ativo: false }));
    await assert.rejects(servicos.listarChamadosSuporte(banco, identidade), e => e.code === 'permission-denied');
    await assert.rejects(servicos.criarChamadoSuporte(banco, identidade, 'Pedido sintético'), e => e.code === 'permission-denied');
  });
}
