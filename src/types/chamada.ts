import { instanteLegadoConfiavel, FUSO_ACADEMICO } from '../utils/calendario';

export interface PresencaAluno {
  id: string;
  nome: string;
  presencas: boolean[];
  obs: string;
}
export interface Chamada {
  id: string;
  turmaId: string;
  instante: number | null;
  dataFormatada: string;
  alunos: PresencaAluno[];
  presentes: number;
  faltas: number;
}
export function validarChamada(id: string, valor: unknown): Chamada | null {
  if (!valor || typeof valor !== 'object') return null;
  const d = valor as Record<string, unknown>;
  if (typeof d.turmaId !== 'string' || !d.turmaId || !Array.isArray(d.alunos)) return null;
  const alunos: PresencaAluno[] = [];
  const ids = new Set<string>();
  for (const aluno of d.alunos) {
    if (!aluno || typeof aluno !== 'object' || typeof aluno.id !== 'string' || !aluno.id
      || ids.has(aluno.id) || typeof aluno.nome !== 'string' || !aluno.nome.trim()
      || !Array.isArray(aluno.presencas) || !aluno.presencas.length
      || !aluno.presencas.every((p: unknown) => typeof p === 'boolean')
      || (aluno.obs !== undefined && typeof aluno.obs !== 'string')) return null;
    ids.add(aluno.id);
    alunos.push({ id: aluno.id, nome: aluno.nome, presencas: aluno.presencas, obs: aluno.obs ?? '' });
  }
  const instante = instanteLegadoConfiavel(d.dataChamada);
  const faltas = alunos.filter(a => a.presencas.some(p => !p)).length;
  return { id, turmaId: d.turmaId, instante,
    dataFormatada: instante === null ? 'Data não informada' : new Date(instante).toLocaleString('pt-BR', { timeZone: FUSO_ACADEMICO }),
    alunos, presentes: alunos.length - faltas, faltas };
}
