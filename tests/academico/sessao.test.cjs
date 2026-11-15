const { test } = require('node:test');
const assert = require('node:assert/strict');
const { carregar } = require('../turmas/carregar.cjs');
function harness() {
  const valores = [], memorias = [], pendentes = [];
  let cursor = 0, efeito, contexto;
  const auth = { currentUser: null };
  const consulta = () => new Promise(resolve => pendentes.push(resolve));
  const react = {
    useState(inicial) { const i = cursor++; if (!(i in valores)) valores[i] = inicial; return [valores[i], v => valores[i] = v]; },
    useRef(inicial) { const i = cursor++; return valores[i] ||= { current: inicial }; },
    useCallback(fn, deps) { const i = cursor++; if (!memorias[i] || deps.some((v, j) => v !== memorias[i].deps[j])) memorias[i] = { fn, deps }; return memorias[i].fn; },
  };
  const { useLeituraAcademica } = carregar('src/hooks/use-leitura-academica.ts', {
    react, 'expo-router': { useFocusEffect: fn => efeito = fn },
    '../config/firebase': { auth }, '../contexts/authContext': { useAuth: () => contexto },
  });
  return { pendentes, focar: () => efeito(), render(usuario, chave = 'a') {
    auth.currentUser = usuario;
    contexto = { usuario, dadosPerfil: { role: 'professor' }, statusPerfil: 'disponivel' };
    cursor = 0;
    return useLeituraAcademica(consulta, chave);
  } };
}
const concluir = () => new Promise(resolve => setImmediate(resolve));
test('troca de URL oculta diário anterior antes do efeito e ignora resposta antiga', async () => {
  const h = harness(), usuario = { uid: 'a' };
  h.render(usuario, 'turma-a'); const limpar = h.focar();
  assert.equal(h.render(usuario, 'turma-b').dados, null);
  limpar(); h.focar();
  h.pendentes[1]({ id: 'diario-b' }); await concluir();
  h.pendentes[0]({ id: 'diario-a' }); await concluir();
  assert.equal(h.render(usuario, 'turma-b').dados.id, 'diario-b');
});
test('troca de conta não mostra dados acadêmicos anteriores', async () => {
  const h = harness(), a = { uid: 'a' }, b = { uid: 'b' };
  h.render(a); const limpar = h.focar(); h.pendentes[0]({ id: 'diario-a' }); await concluir();
  assert.equal(h.render(a).dados.id, 'diario-a');
  assert.equal(h.render(b).dados, null);
  limpar(); h.focar(); h.pendentes[1]({ chamadas: [] }); await concluir();
  assert.equal(h.render(b).dados.chamadas.length, 0);
});
