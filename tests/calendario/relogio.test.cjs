const { test } = require('node:test');
const assert = require('node:assert/strict');
const { carregar } = require('../turmas/carregar.cjs');

test('atualiza na meia-noite Bahia, no retorno e no foco; remove listeners e timers', () => {
  let agora = Date.parse('2026-11-16T02:59:59.900Z');
  const DateReal = Date;
  class Relogio extends DateReal {
    constructor(...args) { super(...(args.length ? args : [agora])); }
    static now() { return agora; }
  }
  const valores = [], efeitos = [], timers = new Map();
  let cursor = 0, foco, listener, removidos = 0;
  const react = {
    useState(inicial) { const i = cursor++; if (!(i in valores)) valores[i] = typeof inicial === 'function' ? inicial() : inicial; return [valores[i], v => valores[i] = v]; },
    useCallback: fn => fn,
    useEffect(fn, deps) { const i = cursor++; if (!efeitos[i] || deps.some((v, j) => v !== efeitos[i].deps[j])) {
      efeitos[i]?.cleanup(); efeitos[i] = { deps, cleanup: fn() };
    } },
  };
  const { useCalendarioBahia } = carregar('src/hooks/use-calendario-bahia.ts', {
    react, 'expo-router': { useFocusEffect: fn => foco = fn },
    'react-native': { AppState: { addEventListener: (_, fn) => { listener = fn; return { remove: () => removidos++ }; } } },
  }, { Date: Relogio, setTimeout: (fn, ms) => { const id = timers.size + 1; timers.set(id, { fn, ms }); return id; }, clearTimeout: id => timers.delete(id) });
  const render = () => { cursor = 0; return useCalendarioBahia(); };
  assert.equal(render().diaSemana, 0);
  const timer = [...timers.values()][0]; assert.equal(timer.ms, 100);
  agora += 100; timer.fn(); assert.equal(render().diaSemana, 1);
  agora = Date.parse('2026-11-18T12:00:00.000Z'); listener('active');
  assert.equal(render().data, '2026-11-18');
  agora = Date.parse('2026-11-19T12:00:00.000Z'); foco();
  assert.equal(render().data, '2026-11-19');
  for (const efeito of efeitos) efeito?.cleanup();
  assert.equal(timers.size, 0); assert.ok(removidos >= 4);
});
