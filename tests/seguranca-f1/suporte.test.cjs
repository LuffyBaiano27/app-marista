const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { carregar } = require('../turmas/carregar.cjs');
const { validarChamadoSuporte } = carregar('src/types/suporte.ts');
function fonte({ role = 'professor', ativo = true, docs = [], vigente = () => true } = {}) {
  const consultas = [], escritas = [];
  const perfil = { nome: 'Perfil Sintético', role, ativo };
  const ref = (_, grupo, id) => ({ grupo, id: id ?? 'novo-id' });
  const sdk = { doc: ref, collection: (_, nome) => nome, where: (...filtro) => filtro,
    query: (grupo, ...filtros) => ({ grupo, filtros }), serverTimestamp: () => 'timestamp-servidor',
    getDocFromServer: async () => ({ data: () => perfil }),
    getDocsFromServer: async q => { consultas.push(q); return { forEach: fn => docs.forEach(d => fn({ id: d.id, data: () => d.dados })) }; },
    runTransaction: async (_, fn) => fn({
      get: async referencia => ({ exists: () => true, data: () => referencia.grupo === 'usuarios' ? perfil : { status: 'pendente' } }),
      set: (referencia, dados) => escritas.push({ referencia, dados }), update: (referencia, dados) => escritas.push({ referencia, dados }),
    }),
  };
  return { ...carregar('src/services/suporte.ts', { 'firebase/firestore': sdk }), consultas, escritas, vigente };
}
const ticket = { descricao: 'Pedido sintético', status: 'pendente' };
for (const role of ['professor', 'coordenador']) {
  test(`suporte de ${role} usa apenas UID, sem fallback por nome`, async () => {
    const s = fonte({ role, docs: [{ id: 'a', dados: { ...ticket, solicitanteUid: 'uid-a' } }] });
    assert.equal((await s.listarChamadosSuporte({}, { uid: 'uid-a', role })).chamados.length, 1);
    assert.equal(JSON.stringify(s.consultas[0].filtros), JSON.stringify([['solicitanteUid', '==', 'uid-a']]));
    await assert.rejects(s.resolverChamadoSuporte({}, { uid: 'uid-a', role }, 'a'), { code: 'permission-denied' });
  });
}
test('admin ativo lê legado sem atribuir autor', async () => {
  const s = fonte({ role: 'admin', docs: [{ id: 'legado', dados: { ...ticket, solicitante: 'Nome sintético' } }] });
  const dados = await s.listarChamadosSuporte({}, { uid: 'uid-admin', role: 'admin' });
  assert.equal(dados.chamados[0].solicitanteUid, null); assert.equal(s.consultas[0].filtros.length, 0);
});
test('inativo e papel divergente não consultam nem gravam suporte', async () => {
  const s = fonte({ ativo: false });
  await assert.rejects(s.listarChamadosSuporte({}, { uid: 'uid-a', role: 'professor' }), { code: 'permission-denied' });
  await assert.rejects(s.criarChamadoSuporte({}, { uid: 'uid-a', role: 'professor' }, 'Pedido'), { code: 'permission-denied' });
  assert.equal(s.consultas.length, 0); assert.equal(s.escritas.length, 0);
  await assert.rejects(fonte().listarChamadosSuporte({}, { uid: 'uid-a', role: 'admin' }), { code: 'permission-denied' });
});
test('resposta de regra ampla não expõe ticket de terceiro ou legado', async () => {
  for (const dados of [{ ...ticket, solicitanteUid: 'uid-b' }, { ...ticket, solicitante: 'Nome coincidente' }]) {
    await assert.rejects(fonte({ docs: [{ id: 'x', dados }] }).listarChamadosSuporte({}, { uid: 'uid-a', role: 'professor' }), { code: 'permission-denied' });
  }
});
test('criação e resolução preparam exclusivamente campos autorizados', async () => {
  const s = fonte(); await s.criarChamadoSuporte({}, { uid: 'uid-a', role: 'professor' }, ' Pedido ');
  assert.equal(JSON.stringify(s.escritas[0].dados), JSON.stringify({ solicitanteUid: 'uid-a', descricao: 'Pedido', status: 'pendente', criadoEm: 'timestamp-servidor' }));
  const a = fonte({ role: 'admin' }); await a.resolverChamadoSuporte({}, { uid: 'uid-admin', role: 'admin' }, 'ticket');
  assert.equal(JSON.stringify(Object.keys(a.escritas[0].dados).sort()), JSON.stringify(['resolvidoEm', 'resolvidoPorUid', 'status']));
});
test('cancelamento e descrição inválida não gravam', async () => {
  const s = fonte();
  await assert.rejects(s.criarChamadoSuporte({}, { uid: 'uid-a', role: 'professor' }, 'Pedido', () => false), { code: 'cancelled' });
  for (const texto of ['', ' ', 'x'.repeat(4001)]) await assert.rejects(s.criarChamadoSuporte({}, { uid: 'uid-a', role: 'professor' }, texto), { code: 'dados-invalidos' });
  assert.equal(s.escritas.length, 0);
});
test('validação preserva ausência de autor e data', () => {
  const lido = validarChamadoSuporte('id-real', { ...ticket, id: 'falso', solicitante: 'Nome sintético' });
  assert.equal(lido.id, 'id-real'); assert.equal(lido.solicitanteUid, null); assert.equal(lido.criadoEmMs, null);
});
test('Perfil não mantém carga demonstrativa, senhas ou falsa confirmação de edição', () => {
  const codigo = fs.readFileSync('src/app/perfil.tsx', 'utf8');
  assert.doesNotMatch(codigo, /handleInjetarDados|prof_\d|senhaAtual|novaSenha|handleSalvarDados|handleSalvarPreferencias|addDoc\(|updateDoc\(/);
});
