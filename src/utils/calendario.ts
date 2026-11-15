export const FUSO_ACADEMICO = 'America/Bahia';
const partes = (instante: Date) => {
  const valores = new Intl.DateTimeFormat('en-CA', { timeZone: FUSO_ACADEMICO,
    year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
    second: '2-digit', hourCycle: 'h23' }).formatToParts(instante);
  const numero = (tipo: string) => Number(valores.find(p => p.type === tipo)?.value);
  return { ano: numero('year'), mes: numero('month'), dia: numero('day'),
    hora: numero('hour'), minuto: numero('minute'), segundo: numero('second') };
};

// Converte meia-noite civil usando o offset informado pelo banco IANA do runtime.
function meiaNoite(ano: number, mes: number, dia: number) {
  const alvo = Date.UTC(ano, mes - 1, dia);
  let instante = alvo;
  for (let i = 0; i < 3; i++) {
    const p = partes(new Date(instante));
    const offset = Date.UTC(p.ano, p.mes - 1, p.dia, p.hora, p.minuto, p.segundo) - instante;
    instante = alvo - offset;
  }
  return new Date(instante);
}

export function limitesDiaBahia(data: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(data)) throw new Error('Data acadêmica inválida.');
  const [ano, mes, dia] = data.split('-').map(Number);
  const civil = new Date(Date.UTC(ano, mes - 1, dia));
  if (civil.toISOString().slice(0, 10) !== data) throw new Error('Data acadêmica inválida.');
  const seguinte = new Date(Date.UTC(ano, mes - 1, dia + 1));
  return { inicio: meiaNoite(ano, mes, dia),
    fim: meiaNoite(seguinte.getUTCFullYear(), seguinte.getUTCMonth() + 1, seguinte.getUTCDate()) };
}

export function calendarioBahia(agora = new Date()) {
  const p = partes(agora);
  const data = `${p.ano}-${String(p.mes).padStart(2, '0')}-${String(p.dia).padStart(2, '0')}`;
  return { data, diaSemana: new Date(Date.UTC(p.ano, p.mes - 1, p.dia)).getUTCDay(), hora: p.hora,
    cabecalho: new Intl.DateTimeFormat('pt-BR', { timeZone: FUSO_ACADEMICO, weekday: 'long', day: 'numeric', month: 'long' }).format(agora),
    ...limitesDiaBahia(data) };
}

// Exige data/hora ISO com fuso explícito; nunca interpreta data civil como instante.
export function instanteLegadoConfiavel(valor: unknown): number | null {
  if (typeof valor !== 'string') return null;
  const formato = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.(\d{1,3}))?(Z|[+-]\d{2}:\d{2})$/;
  const partes = formato.exec(valor);
  if (!partes) return null;
  const [, ano, mes, dia, hora, minuto, segundo] = partes;
  const civil = new Date(Date.UTC(+ano, +mes - 1, +dia, +hora, +minuto, +segundo));
  if (civil.getUTCFullYear() !== +ano || civil.getUTCMonth() + 1 !== +mes
    || civil.getUTCDate() !== +dia || civil.getUTCHours() !== +hora
    || civil.getUTCMinutes() !== +minuto || civil.getUTCSeconds() !== +segundo) return null;
  const ms = Date.parse(valor);
  return Number.isFinite(ms) ? ms : null;
}
export const horarioBahia = (ms: number) => new Intl.DateTimeFormat('pt-BR', {
  timeZone: FUSO_ACADEMICO, hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
}).format(new Date(ms));

export function pendenciasDoDia<T extends { id: string; diaId: number; horario: string }>(
  turmas: T[], registrados: Record<string, string>, diaSemana: number,
): T[] {
  if (diaSemana < 1 || diaSemana > 5) return [];
  return turmas.filter(t => t.diaId === diaSemana && !Object.hasOwn(registrados, t.id))
    .sort((a, b) => a.horario.localeCompare(b.horario));
}
