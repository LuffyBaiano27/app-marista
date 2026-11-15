const { test } = require('node:test');
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const { carregar } = require('../turmas/carregar.cjs');
const { calendarioBahia, limitesDiaBahia, pendenciasDoDia, instanteLegadoConfiavel } = carregar('src/utils/calendario.ts');

for (const [iso, data, dia] of [
  ['2026-11-13T15:00:00.000Z', '2026-11-13', 5],
  ['2026-11-14T02:59:59.999Z', '2026-11-13', 5],
  ['2026-11-14T03:00:00.000Z', '2026-11-14', 6],
  ['2026-11-15T15:00:00.000Z', '2026-11-15', 0],
  ['2026-11-16T00:00:00.000Z', '2026-11-15', 0],
  ['2026-11-16T02:59:59.999Z', '2026-11-15', 0],
  ['2026-11-16T03:00:00.000Z', '2026-11-16', 1],
  ['2027-01-01T02:00:00.000Z', '2026-12-31', 4],
  ['2027-01-01T03:00:00.000Z', '2027-01-01', 5],
  ['2026-03-01T02:59:59.999Z', '2026-02-28', 6],
]) {
  test(`calendário Bahia: ${iso}`, () => {
    const atual = calendarioBahia(new Date(iso));
    assert.equal(atual.data, data); assert.equal(atual.diaSemana, dia);
    assert.ok(atual.inicio.getTime() <= Date.parse(iso));
    assert.ok(atual.fim.getTime() > Date.parse(iso));
  });
}
test('dias úteis selecionam só aulas do dia; fins de semana não viram segunda', () => {
  const turmas = Array.from({ length: 5 }, (_, i) => ({ id: `t${i + 1}`, diaId: i + 1, horario: '08:00' }));
  for (let dia = 1; dia <= 5; dia++) assert.equal(pendenciasDoDia(turmas, {}, dia)[0].diaId, dia);
  assert.equal(pendenciasDoDia(turmas, {}, 0).length, 0);
  assert.equal(pendenciasDoDia(turmas, {}, 6).length, 0);
  assert.equal(pendenciasDoDia(turmas, { t1: '09:00' }, 1).length, 0);
  assert.equal(turmas.length, 5); // grade semanal preservada
});
test('intervalo diário é fechado no início e aberto no fim', () => {
  const { inicio, fim } = limitesDiaBahia('2026-11-15');
  assert.equal(inicio.toISOString(), '2026-11-15T03:00:00.000Z');
  assert.equal(fim.toISOString(), '2026-11-16T03:00:00.000Z');
  assert.throws(() => limitesDiaBahia('2026-02-30'));
});
test('não presume fuso, data ou instante de registros legados', () => {
  for (const valor of [null, undefined, 0, '', '2026-11-15', '2026-11-15T12:00:00', '2026-02-30T12:00:00.000Z']) {
    assert.equal(instanteLegadoConfiavel(valor), null);
  }
  assert.equal(instanteLegadoConfiavel('2026-11-15T09:00:00-03:00'), Date.parse('2026-11-15T12:00:00.000Z'));
  assert.equal(instanteLegadoConfiavel('2026-11-15T12:00:00Z'), Date.parse('2026-11-15T12:00:00.000Z'));
  assert.equal(instanteLegadoConfiavel('2026-11-15T12:00:00.000Z'), Date.parse('2026-11-15T12:00:00.000Z'));
});
test('resultado independe do fuso do dispositivo', () => {
  const script = `const { carregar } = require('./tests/turmas/carregar.cjs'); const c = carregar('src/utils/calendario.ts').calendarioBahia(new Date('2026-11-16T01:00:00.000Z')); console.log(JSON.stringify([c.data,c.diaSemana,c.inicio.toISOString()]));`;
  const resultados = ['UTC', 'Asia/Tokyo', 'America/Los_Angeles'].map(TZ => execFileSync(process.execPath, ['-e', script], { env: { ...process.env, TZ }, encoding: 'utf8' }).trim());
  assert.equal(new Set(resultados).size, 1);
});
