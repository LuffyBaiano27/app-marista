export interface ChamadoSuporte {
  id: string;
  solicitanteUid: string | null;
  descricao: string;
  status: 'pendente' | 'resolvido';
  criadoEmMs: number | null;
}
export function validarChamadoSuporte(id: string, valor: unknown): ChamadoSuporte | null {
  if (!valor || typeof valor !== 'object') return null;
  const d = valor as Record<string, unknown>;
  if (typeof d.descricao !== 'string' || !d.descricao.trim()
    || (d.status !== 'pendente' && d.status !== 'resolvido')) return null;
  // Ausência de autoria legada permanece explícita. Nunca associar pelo nome.
  const solicitanteUid = typeof d.solicitanteUid === 'string' && d.solicitanteUid ? d.solicitanteUid : null;
  const temporal = d.criadoEm as { toMillis?: () => number } | undefined;
  const ms = temporal && typeof temporal.toMillis === 'function' ? temporal.toMillis() : d.timestamp;
  return { id, solicitanteUid, descricao: d.descricao, status: d.status,
    criadoEmMs: typeof ms === 'number' && Number.isFinite(ms) ? ms : null };
}
