const { test } = require('node:test');
const assert = require('node:assert/strict');
const { carregar } = require('../turmas/carregar.cjs');
function renderTurma(registrada, diaSemana) {
  const rotas = [];
  const jsx = (type, props) => ({ type, props });
  const turma = { id: 'turma-sintetica', nome: 'Turma sintética', disciplina: 'Disciplina',
    diaId: 1, diaSemana: 'Segunda-feira', horario: '08:00', turno: 'Matutino', coordenadorIds: [] };
  const fonte = carregar('src/app/(tabs)/turmas.tsx', {
    react: { useState: initial => [initial, () => {}] },
    'react/jsx-runtime': { jsx, jsxs: jsx },
    'react-native': { View: 'View', Text: 'Text', FlatList: 'FlatList', TouchableOpacity: 'Touchable',
      TextInput: 'Input', KeyboardAvoidingView: 'Keyboard', RefreshControl: 'Refresh', ActivityIndicator: 'Loading',
      useColorScheme: () => 'light', Platform: { OS: 'web' }, StyleSheet: { create: value => value } },
    '@expo/vector-icons': { Ionicons: 'Icon' },
    '../../constants/colors': { cores: { light: {} } },
    'expo-router': { useRouter: () => ({ push: rota => rotas.push(rota) }) },
    '../../contexts/authContext': { useAuth: () => ({ dadosPerfil: { nome: 'Perfil sintético', role: 'professor' } }) },
    '../../hooks/use-grade-turmas': { useGradeTurmas: () => ({ turmas: [turma], turmasInvalidas: 0,
      chamadasHoje: registrada ? { [turma.id]: '09:00' } : {}, diariosHoje: registrada ? { [turma.id]: 'diario-sintetico' } : {},
      calendario: { diaSemana, cabecalho: 'Data sintética' }, carregando: false, erro: null, atualizar: () => {} }) },
  });
  const elementos = value => {
    if (Array.isArray(value)) return value.flatMap(elementos);
    if (!value || typeof value !== 'object') return [];
    return [value, ...elementos(value.props?.children)];
  };
  const lista = elementos(fonte.default()).find(e => e.type === 'FlatList');
  return { elementos: elementos(lista.props.renderItem({ item: turma })), rotas };
}
for (const dia of [0, 1, 6]) {
  test(`sem diário não oferece criação no dia ${dia}`, () => {
    const { elementos } = renderTurma(false, dia);
    assert.equal(elementos.filter(e => e.type === 'Touchable').length, 0);
    assert.ok(elementos.some(e => e.type === 'Icon' && e.props.name === 'lock-closed'));
  });
}
test('diário existente oferece somente consulta do registro exato', () => {
  const { elementos, rotas } = renderTurma(true, 1);
  const acoes = elementos.filter(e => e.type === 'Touchable');
  assert.equal(acoes.length, 1); acoes[0].props.onPress();
  assert.equal(rotas[0].pathname, '/chamada');
  assert.equal(rotas[0].params.chamadaId, 'diario-sintetico');
});
