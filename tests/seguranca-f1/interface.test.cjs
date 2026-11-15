const { test } = require('node:test');
const assert = require('node:assert/strict');
const { carregar } = require('../turmas/carregar.cjs');
const jsx = (type, props) => ({ type, props });
const elementos = value => Array.isArray(value) ? value.flatMap(elementos)
  : !value || typeof value !== 'object' ? [] : [value, ...elementos(value.props?.children)];
function layout(estado) {
  const Stack = () => {}; Stack.Protected = 'Protected'; Stack.Screen = 'Screen';
  let cursor = 0;
  const valores = [];
  const fonte = carregar('src/app/_layout.tsx', {
    react: { useState: initial => { const i = cursor++; if (!(i in valores)) valores[i] = initial; return [valores[i], v => valores[i] = v]; } },
    'react/jsx-runtime': { jsx, jsxs: jsx },
    'react-native': { ActivityIndicator: 'Loading', Button: 'Button', Text: 'Text', View: 'View', StyleSheet: { create: s => s } },
    'expo-router': { Stack }, '../contexts/authContext': { AuthProvider: 'Provider', useAuth: () => estado },
  });
  return { Stack, render() { cursor = 0; return fonte.default().props.children.type(); } };
}
const perfil = { nome: 'Perfil Sintético', role: 'professor', ativo: true };
for (const [statusPerfil, dadosPerfil] of [
  ['inativo', { ...perfil, ativo: false }], ['invalido', null], ['ausente', null], ['erro', null], ['disponivel', { ...perfil, ativo: false }],
]) {
  test(`rotas bloqueadas com logout para ${statusPerfil} / ${dadosPerfil?.ativo}`, async () => {
    let saiu = false;
    const h = layout({ usuario: { uid: 'a' }, statusPerfil, dadosPerfil, carregando: false, encerrarSessao: async () => saiu = true });
    const tela = h.render(); assert.notEqual(tela.type, h.Stack);
    const botao = elementos(tela).find(e => e.type === 'Button'); assert.ok(botao);
    botao.props.onPress(); await new Promise(resolve => setImmediate(resolve)); assert.equal(saiu, true);
  });
}
test('restauração pendente não monta telas e mantém logout', () => {
  const h = layout({ usuario: { uid: 'a' }, statusPerfil: 'carregando', dadosPerfil: null, carregando: true });
  const tela = h.render(); assert.notEqual(tela.type, h.Stack); assert.ok(elementos(tela).some(e => e.type === 'Button'));
});
test('perfil ativo libera internas e desconectado libera só login', () => {
  const estado = { usuario: { uid: 'a' }, statusPerfil: 'disponivel', dadosPerfil: perfil, carregando: false };
  const h = layout(estado);
  let guards = elementos(h.render()).filter(e => e.type === 'Protected');
  assert.equal(guards[0].props.guard, false); assert.equal(guards[1].props.guard, true);
  estado.usuario = null; estado.dadosPerfil = null; estado.statusPerfil = 'desconectado';
  guards = elementos(h.render()).filter(e => e.type === 'Protected');
  assert.equal(guards[0].props.guard, true); assert.equal(guards[1].props.guard, false);
});
for (const role of ['professor', 'coordenador', 'admin']) {
  test(`Perfil de ${role} mantém mutações indisponíveis até F2`, () => {
    const fonte = carregar('src/app/perfil.tsx', {
      react: { useState: initial => [initial, () => {}] }, 'react/jsx-runtime': { jsx, jsxs: jsx },
      'react-native': { View: 'View', Text: 'Text', TouchableOpacity: 'Touchable', ScrollView: 'Scroll', ActivityIndicator: 'Loading',
        StyleSheet: { create: s => s }, useColorScheme: () => 'light', Platform: { OS: 'web' }, Alert: {} },
      '@expo/vector-icons': { Ionicons: 'Icon' }, '../constants/colors': { cores: { light: {} } },
      'expo-router': { useRouter: () => ({}) }, '../config/firebase': { db: {} },
      '../contexts/authContext': { useAuth: () => ({ usuario: { uid: 'sintetico', email: 'teste@example.invalid' }, dadosPerfil: { ...perfil, role } }) },
      '../hooks/use-leitura-academica': { useLeituraAcademica: () => ({ dados: { chamados: [{ id: 't', descricao: 'Sintético', status: 'pendente', criadoEmMs: null, solicitanteUid: null }], invalidos: 0 }, carregando: false, erro: null, atualizar: () => {} }) },
      '../services/suporte': { listarChamadosSuporte: () => {} },
    });
    const botoes = elementos(fonte.default()).filter(e => e.type === 'Touchable');
    const desabilitados = botoes.filter(e => e.props.disabled === true);
    assert.equal(desabilitados.length, role === 'admin' ? 2 : 1);
    assert.ok(desabilitados.every(e => e.props.onPress === undefined));
  });
}
