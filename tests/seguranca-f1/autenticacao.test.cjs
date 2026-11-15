const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { carregar } = require('../turmas/carregar.cjs');
const tipos = carregar('src/types/usuario.ts');
const perfil = { nome: 'Perfil Sintético', role: 'professor', ativo: true };

test('ativo não tem valor permissivo padrão; papéis não são inferidos', () => {
  for (const ativo of [undefined, null, 'true', 1]) assert.equal(tipos.validarDadosPerfil({ ...perfil, ativo }), null);
  assert.equal(tipos.perfilOperacional(tipos.validarDadosPerfil({ ...perfil, ativo: false })), false);
  assert.equal(tipos.perfilOperacional(tipos.validarDadosPerfil(perfil)), true);
  assert.equal(tipos.validarDadosPerfil({ ...perfil, role: 'desconhecido' }), null);
});
test('observador exige confirmação do servidor e acompanha inativação', () => {
  let receber, falhar, removido = false;
  const resultados = [];
  const fonte = carregar('src/services/perfilUsuario.ts', {
    '../config/firebase': { db: {} },
    'firebase/firestore': { doc: (_, grupo, uid) => { assert.equal(grupo, 'usuarios'); assert.equal(uid, 'uid-sintetico'); return uid; },
      onSnapshot: (_, opcoes, next, erro) => { assert.equal(opcoes.includeMetadataChanges, true); receber = next; falhar = erro; return () => removido = true; } },
  });
  const cancelar = fonte.observarPerfilUsuario('uid-sintetico', r => resultados.push(r), () => resultados.push('erro'));
  const emitir = (dados, cache = false, existe = true, pendente = false) => receber({ metadata: { fromCache: cache, hasPendingWrites: pendente }, exists: () => existe, data: () => dados });
  emitir(perfil, true); assert.equal(resultados.at(-1).status, 'carregando');
  emitir(perfil, false, true, true); assert.equal(resultados.at(-1).status, 'carregando');
  emitir(perfil); assert.equal(resultados.at(-1).status, 'disponivel');
  emitir({ ...perfil, ativo: false }); assert.equal(resultados.at(-1).status, 'inativo');
  emitir({ nome: 'Legado', role: 'professor' }); assert.equal(resultados.at(-1).status, 'invalido');
  emitir(undefined, false, false); assert.equal(resultados.at(-1).status, 'ausente');
  falhar(); assert.equal(resultados.at(-1), 'erro'); cancelar(); assert.equal(removido, true);
});
function contexto(falhaInicio = false) {
  let estado, efeito, valor, authNext, authError, signOutFalha = false, assinaturas = 0;
  const observadores = [], auth = { currentUser: null };
  const { AuthProvider } = carregar('src/contexts/authContext.tsx', {
    react: { createContext: () => ({ Provider: 'Provider' }), useContext: () => {},
      useState: initial => { estado ??= initial; return [estado, next => estado = next]; },
      useEffect: fn => { if (!efeito) efeito = fn(); } },
    'react/jsx-runtime': { jsx: (_, props) => valor = props.value },
    '../config/firebase': { auth },
    'firebase/auth': { onAuthStateChanged: (_, next, erro) => { authNext = next; authError = erro; return () => assinaturas++; },
      signOut: async () => { if (signOutFalha) throw Error('Falha sintética'); auth.currentUser = null; authNext(null); } },
    '../services/perfilUsuario': { observarPerfilUsuario: (uid, next, erro) => {
      if (falhaInicio) throw Error('Falha sintética de inicialização');
      const observador = { uid, next, erro, fechado: false }; observadores.push(observador);
      return () => observador.fechado = true;
    } },
  });
  const render = () => { AuthProvider({ children: null }); return valor; };
  render();
  return { render, observadores, entrar(usuario) { auth.currentUser = usuario; authNext(usuario); },
    falharAuth: () => authError(), falharLogout: () => signOutFalha = true,
    desmontar: () => efeito(), assinaturas: () => assinaturas };
}
test('contexto troca sessão, limpa perfil e ignora observador antigo', () => {
  const c = contexto(); c.entrar({ uid: 'a' });
  assert.equal(c.render().carregando, true);
  c.observadores[0].next({ status: 'disponivel', dadosPerfil: perfil });
  assert.equal(c.render().dadosPerfil.ativo, true);
  c.entrar({ uid: 'b' }); assert.equal(c.observadores[0].fechado, true); assert.equal(c.render().dadosPerfil, null);
  c.observadores[1].next({ status: 'disponivel', dadosPerfil: { ...perfil, role: 'coordenador' } });
  c.observadores[0].next({ status: 'disponivel', dadosPerfil: { ...perfil, role: 'admin' } });
  assert.equal(c.render().dadosPerfil.role, 'coordenador');
});
test('inativação, erro e logout não mantêm acesso operacional', async () => {
  const c = contexto(); c.entrar({ uid: 'a' });
  c.observadores[0].next({ status: 'inativo', dadosPerfil: { ...perfil, ativo: false } });
  assert.equal(c.render().statusPerfil, 'inativo');
  c.observadores[0].erro(); assert.equal(c.render().statusPerfil, 'erro'); assert.equal(c.render().dadosPerfil, null);
  await c.render().encerrarSessao(); assert.equal(c.render().usuario, null); assert.equal(c.render().statusPerfil, 'desconectado');
  c.observadores[0].next({ status: 'disponivel', dadosPerfil: perfil }); assert.equal(c.render().dadosPerfil, null);
});
test('falha de logout preserva estado; desmontagem cancela os dois ouvintes', async () => {
  const c = contexto(); c.entrar({ uid: 'a' }); c.observadores[0].next({ status: 'disponivel', dadosPerfil: perfil });
  c.falharLogout(); await assert.rejects(c.render().encerrarSessao()); assert.equal(c.render().usuario.uid, 'a');
  c.desmontar(); assert.equal(c.observadores[0].fechado, true); assert.equal(c.assinaturas(), 1);
  c.observadores[0].erro(); assert.equal(c.render().statusPerfil, 'disponivel');
});
test('erro do observador de autenticação cancela o perfil e bloqueia', () => {
  const c = contexto(); c.entrar({ uid: 'a' }); c.falharAuth();
  assert.equal(c.observadores[0].fechado, true); assert.equal(c.render().statusPerfil, 'erro');
});
test('login não contém criação de usuário ou perfil administrativo', () => {
  const fonte = fs.readFileSync('src/app/index.tsx', 'utf8');
  assert.doesNotMatch(fonte, /createUserWithEmailAndPassword|criarAdmin|setDoc|Criar Admin/);
  assert.match(fonte, /signInWithEmailAndPassword/);
});

test('falha síncrona ao iniciar perfil vira erro com sessão disponível para logout', () => {
  const c = contexto(true); c.entrar({ uid: 'a' });
  assert.equal(c.render().statusPerfil, 'erro'); assert.equal(c.render().usuario.uid, 'a');
});
