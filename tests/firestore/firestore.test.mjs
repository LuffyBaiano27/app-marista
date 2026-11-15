import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { test, before, beforeEach, after } from 'node:test';
import { validarAmbiente } from './ambiente.mjs';

// Verificar destino antes de carregar SDKs ou inicializar qualquer conexão.
const destino = validarAmbiente();
const require = createRequire(process.env.VIOLETA_TEST_TOOLS_DIR
  ? resolve(process.env.VIOLETA_TEST_TOOLS_DIR, 'package.json') : import.meta.url);
const { initializeTestEnvironment, assertSucceeds, assertFails } = require('@firebase/rules-unit-testing');
const { doc, collection, getDoc, getDocs, setDoc, updateDoc, deleteDoc,
  query, where, serverTimestamp, Timestamp, writeBatch } = require('firebase/firestore');
const fixture = JSON.parse(await readFile(new URL('./fixtures/cenarios.json', import.meta.url)));
const regras = await readFile(new URL('../../firestore.rules', import.meta.url), 'utf8');
let ambiente;
const db = (uid, claims = {}) => uid
  ? ambiente.authenticatedContext(uid, claims).firestore()
  : ambiente.unauthenticatedContext().firestore();
const ref = (uid, caminho) => doc(db(uid), caminho);
const professor = 'teste-professor-a';
const coordenador = 'teste-coordenador-a';
const admin = 'teste-admin';
const suporteNovo = (uid = professor) => ({ solicitanteUid: uid, descricao: 'Pedido sintético',
  status: 'pendente', criadoEm: serverTimestamp() });
const turmaNova = (extra = {}) => ({ ...fixture.turmas['teste-turma-a'],
  criadoEm: serverTimestamp(), atualizadoEm: serverTimestamp(), ...extra });

before(async () => {
  ambiente = await initializeTestEnvironment({ projectId: destino.projectId,
    firestore: { host: destino.host, port: destino.port, rules: regras } });
});
beforeEach(async () => {
  await ambiente.clearFirestore();
  await ambiente.withSecurityRulesDisabled(async contexto => {
    const batch = writeBatch(contexto.firestore());
    const grupos = { usuarios: fixture.usuarios, turmas: fixture.turmas,
      chamadas: fixture.chamadasLegadas, chamados_suporte: fixture.chamadosSuporteLegados };
    for (const [grupo, documentos] of Object.entries(grupos)) {
      for (const [id, dados] of Object.entries(documentos)) {
        batch.set(doc(contexto.firestore(), grupo, id), dados);
      }
    }
    batch.set(doc(contexto.firestore(), 'usuarios/teste-nome-invalido'), { nome: '', role: 'admin', ativo: true });
    batch.set(doc(contexto.firestore(), 'usuarios/teste-ativo-invalido'), { nome: 'Teste', role: 'admin', ativo: 'true' });
    for (let i = 0; i < 10; i++) batch.set(doc(contexto.firestore(), `usuarios/teste-coord-${i}`),
      { nome: `Coordenador sintético ${i}`, role: 'coordenador', ativo: true });
    batch.set(doc(contexto.firestore(), 'turmas/teste-inativa'), { ...fixture.turmas['teste-turma-a'], ativo: false });
    await batch.commit();
  });
});
after(async () => { if (ambiente) await ambiente.cleanup(); });

for (const uid of [null, 'teste-sem-perfil', 'teste-inativo', 'teste-legado', 'teste-invalido', 'teste-nome-invalido', 'teste-ativo-invalido']) {
  test(`nega operações funcionais para ${uid ?? 'anônimo'}`, async () => {
    await assertFails(getDoc(ref(uid, 'turmas/teste-turma-a')));
    await assertFails(getDoc(ref(uid, 'chamadas/teste-chamada-a')));
    await assertFails(getDoc(ref(uid, 'chamados_suporte/teste-suporte-a')));
    await assertFails(setDoc(ref(uid, 'chamados_suporte/novo'), suporteNovo(uid)));
  });
}
for (const uid of ['teste-inativo', 'teste-legado', 'teste-invalido']) {
  test(`permite diagnóstico do próprio perfil ${uid}`, async () => {
    await assertSucceeds(getDoc(ref(uid, `usuarios/${uid}`)));
  });
}
for (const uid of [professor, coordenador, admin]) {
  test(`protege autoridade do próprio usuário ${uid}`, async () => {
    for (const alteracao of [{ role: 'admin' }, { ativo: false }, { privilegio: true },
      { email: 'sintetico@example.invalid' }, { criadoEm: serverTimestamp() }]) {
      await assertFails(updateDoc(ref(uid, `usuarios/${uid}`), alteracao));
    }
    await assertSucceeds(updateDoc(ref(uid, `usuarios/${uid}`), { nome: 'Nome sintético atualizado', atualizadoEm: serverTimestamp() }));
    await assertFails(updateDoc(ref(uid, `usuarios/${uid}`), { nome: '   ', atualizadoEm: serverTimestamp() }));
    await assertFails(updateDoc(ref(uid, `usuarios/${uid}`), { nome: 'Teste', atualizadoEm: Timestamp.fromMillis(0) }));
    await assertFails(deleteDoc(ref(uid, `usuarios/${uid}`)));
    await assertFails(setDoc(ref(uid, 'usuarios/novo-admin'), { nome: 'Admin sintético', role: 'admin', ativo: true }));
  });
  test(`permite criar suporte próprio para ${uid}`, async () => {
    await assertSucceeds(setDoc(ref(uid, 'chamados_suporte/novo'), suporteNovo(uid)));
  });
  test(`impede modificar ou excluir chamada para ${uid}`, async () => {
    await assertFails(updateDoc(ref(uid, 'chamadas/teste-chamada-a'), { alunos: [] }));
    await assertFails(deleteDoc(ref(uid, 'chamadas/teste-chamada-a')));
  });
}
test('professor não se promove com substituição de documento nem lote', async () => {
  await assertFails(setDoc(ref(professor, `usuarios/${professor}`), { nome: 'Teste', role: 'admin', ativo: true }));
  const banco = db(professor);
  const batch = writeBatch(banco);
  batch.update(doc(banco, `usuarios/${professor}`), { role: 'admin' });
  batch.set(doc(banco, 'turmas/escalada'), turmaNova());
  await assertFails(batch.commit());
});
test('nome, email e claims arbitrárias não conferem autoridade', async () => {
  const falsoAdmin = db('teste-sem-perfil', { role: 'admin', admin: true, email: 'admin@example.invalid' });
  await assertFails(getDocs(collection(falsoAdmin, 'turmas')));
});
test('leitura e listagem de perfis respeitam o papel', async () => {
  await assertFails(getDoc(ref(professor, 'usuarios/teste-professor-b')));
  await assertFails(getDocs(collection(db(coordenador), 'usuarios')));
  await assertSucceeds(getDocs(collection(db(admin), 'usuarios')));
  await assertFails(updateDoc(ref(admin, `usuarios/${professor}`), { role: 'admin' }));
});
test('professor consulta apenas suas turmas; consulta vazia válida', async () => {
  await assertSucceeds(getDocs(query(collection(db(professor), 'turmas'), where('professorId', '==', professor))));
  await assertSucceeds(getDocs(query(collection(db('teste-professor-b'), 'turmas'), where('professorId', '==', 'teste-professor-b'), where('nome', '==', 'Inexistente'))));
  await assertFails(getDocs(collection(db(professor), 'turmas')));
  await assertFails(getDoc(ref(professor, 'turmas/teste-turma-b')));
  await assertFails(getDocs(query(collection(db(professor), 'turmas'), where('professorId', '==', 'prof_3'))));
});
test('coordenador exige atribuição explícita', async () => {
  await assertSucceeds(getDoc(ref(coordenador, 'turmas/teste-turma-a')));
  await assertSucceeds(getDocs(query(collection(db(coordenador), 'turmas'), where('coordenadorIds', 'array-contains', coordenador))));
  await assertFails(getDoc(ref('teste-coordenador-b', 'turmas/teste-turma-a')));
  await assertFails(getDoc(ref(coordenador, 'turmas/teste-turma-legada')));
  await assertFails(getDocs(collection(db(coordenador), 'turmas')));
});
test('histórico pode ser lido por vínculo atual inclusive turma inativa', async () => {
  for (const uid of [professor, coordenador, admin]) {
    await assertSucceeds(getDoc(ref(uid, 'chamadas/teste-chamada-a')));
    await assertSucceeds(getDocs(query(collection(db(uid), 'chamadas'), where('turmaId', '==', 'teste-turma-a'))));
  }
  await assertSucceeds(getDoc(ref(professor, 'turmas/teste-inativa')));
  for (const uid of ['teste-professor-b', 'teste-coordenador-b']) {
    await assertFails(getDoc(ref(uid, 'chamadas/teste-chamada-a')));
  }
  await assertFails(getDoc(ref(professor, 'chamadas/teste-chamada-orfa')));
  await assertSucceeds(getDoc(ref(admin, 'chamadas/teste-chamada-orfa')));
});
test('consulta combinada de turma e data é autorizada', async () => {
  for (const uid of [professor, coordenador]) {
    await assertSucceeds(getDocs(query(collection(db(uid), 'chamadas'),
      where('turmaId', '==', 'teste-turma-a'), where('dataChamadaFormatada', '==', '2026-01-05'))));
  }
});
test('atribuição de coordenador malformada não concede acesso', async () => {
  await ambiente.withSecurityRulesDisabled(async contexto => {
    await setDoc(doc(contexto.firestore(), 'turmas/malformada'),
      { professorId: professor, coordenadorIds: { [coordenador]: true } });
  });
  await assertFails(getDoc(ref(coordenador, 'turmas/malformada')));
});
test('rejeita consultas amplas atuais para professor', async () => {
  await assertFails(getDocs(collection(db(professor), 'chamadas')));
  await assertFails(getDocs(query(collection(db(professor), 'chamadas'), where('dataChamadaFormatada', '==', '2026-01-05'))));
  await assertFails(getDocs(collection(db(professor), 'chamados_suporte')));
});
test('admin revisa coleção e documentos legados', async () => {
  for (const grupo of ['turmas', 'chamadas', 'chamados_suporte']) {
    await assertSucceeds(getDocs(collection(db(admin), grupo)));
  }
});
test('admin cria turma com referências válidas e limite de quatro coordenadores', async () => {
  await assertSucceeds(setDoc(ref(admin, 'turmas/nova'), turmaNova()));
  await assertSucceeds(setDoc(ref(admin, 'turmas/limite'), turmaNova({ coordenadorIds: Array.from({ length: 4 }, (_, i) => `teste-coord-${i}`) })));
  await assertFails(setDoc(ref(admin, 'turmas/excesso'), turmaNova({ coordenadorIds: Array.from({ length: 5 }, (_, i) => `teste-coord-${i}`) })));
});
test('nega turma com referências inválidas, tipos ou campos extras', async () => {
  for (const extra of [{ professorId: 'prof_3' }, { professorId: 'teste-inativo' },
    { professorId: admin }, { coordenadorIds: [professor] },
    { coordenadorIds: [coordenador, coordenador] }, { coordenadorIds: ['teste-sem-perfil'] },
    { coordenadorIds: [null] }, { ativo: 'true' }, { alunos: -1 }, { diaId: 9 },
    { horario: '' }, { extra: true }, { criadoEm: Timestamp.fromMillis(0) }]) {
    await assertFails(setDoc(ref(admin, 'turmas/invalida'), turmaNova(extra)));
  }
});
test('update administrativo preserva criação e valida documento inteiro', async () => {
  await assertSucceeds(setDoc(ref(admin, 'turmas/editavel'), turmaNova()));
  await assertSucceeds(updateDoc(ref(admin, 'turmas/editavel'), { nome: 'Nova descrição', atualizadoEm: serverTimestamp() }));
  await assertFails(updateDoc(ref(admin, 'turmas/editavel'), { criadoEm: Timestamp.fromMillis(0), atualizadoEm: serverTimestamp() }));
  await assertFails(updateDoc(ref(admin, 'turmas/editavel'), { professorId: 'prof_3', atualizadoEm: serverTimestamp() }));
  await assertFails(deleteDoc(ref(admin, 'turmas/editavel')));
});
for (const uid of [professor, coordenador]) {
  test(`não permite gestão de turma a ${uid}`, async () => {
    await assertFails(setDoc(ref(uid, 'turmas/nova'), turmaNova()));
    await assertFails(updateDoc(ref(uid, 'turmas/teste-turma-a'), { nome: 'Teste' }));
    await assertFails(deleteDoc(ref(uid, 'turmas/teste-turma-a')));
  });
}
test('criação de chamadas permanece fechada até contrato acadêmico completo', async () => {
  for (const uid of [professor, coordenador, admin]) {
    for (const turmaId of ['teste-turma-a', 'teste-turma-b', 'teste-inativa', 'inexistente']) {
      await assertFails(setDoc(ref(uid, 'chamadas/nova'), { turmaId, registradoPorUid: uid,
        criadoEm: serverTimestamp(), dataLetiva: '2026-01-05', status: 'finalizada', alunos: [] }));
    }
  }
});
test('suporte próprio e legado: leitura e consultas', async () => {
  await assertSucceeds(getDocs(query(collection(db(professor), 'chamados_suporte'), where('solicitanteUid', '==', professor))));
  await assertFails(getDoc(ref('teste-professor-b', 'chamados_suporte/teste-suporte-a')));
  await assertFails(getDoc(ref(professor, 'chamados_suporte/teste-suporte-sem-uid')));
  await assertSucceeds(getDoc(ref(admin, 'chamados_suporte/teste-suporte-sem-uid')));
});
test('criação de suporte rejeita falsificação, campos extras e timestamp falso', async () => {
  for (const extra of [{ solicitanteUid: 'teste-professor-b' }, { status: 'resolvido' },
    { descricao: '' }, { descricao: 'x'.repeat(4001) }, { criadoEm: Timestamp.fromMillis(0) },
    { resolvidoPorUid: admin }, { extra: true }]) {
    await assertFails(setDoc(ref(professor, 'chamados_suporte/invalido'), { ...suporteNovo(), ...extra }));
  }
});
test('resolução administrativa só altera campos permitidos uma vez', async () => {
  const caminho = 'chamados_suporte/teste-suporte-a';
  const resolucao = { status: 'resolvido', resolvidoPorUid: admin, resolvidoEm: serverTimestamp() };
  await assertFails(updateDoc(ref(professor, caminho), resolucao));
  await assertFails(updateDoc(ref(admin, caminho), { ...resolucao, descricao: 'Adulteração' }));
  await assertFails(updateDoc(ref(admin, caminho), { ...resolucao, solicitanteUid: admin }));
  await assertFails(updateDoc(ref(admin, caminho), { ...resolucao, resolvidoPorUid: professor }));
  await assertFails(updateDoc(ref(admin, caminho), { ...resolucao, resolvidoEm: Timestamp.fromMillis(0) }));
  await assertSucceeds(updateDoc(ref(admin, caminho), resolucao));
  await assertFails(updateDoc(ref(admin, caminho), { status: 'pendente' }));
  await assertFails(deleteDoc(ref(admin, caminho)));
});
test('caminhos desconhecidos e subcoleções não herdam permissões', async () => {
  for (const uid of [professor, coordenador, admin]) {
    await assertFails(setDoc(ref(uid, 'desconhecida/documento'), { role: 'admin' }));
    await assertFails(getDoc(ref(uid, 'usuarios/teste-professor-a/privado/documento')));
    await assertFails(setDoc(ref(uid, 'turmas/teste-turma-a/privado/documento'), { valor: true }));
  }
});
