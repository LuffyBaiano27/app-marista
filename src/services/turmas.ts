import { collection, getDocsFromServer, query, where, type Firestore } from 'firebase/firestore';
import type { IdentidadeUsuario } from '../types/usuario';
import { verificarIdentidadeAtiva, verificarSessaoVigente } from './autorizacao';
import { calendarioBahia } from '../utils/calendario';
import { consultarDiarioDoDia } from './consulta-diaria';
import { validarTurma, classificarErroGrade, type Turma } from '../types/turma';

export type IdentidadeGrade = IdentidadeUsuario;
export interface GradeTurmas {
  turmas: Turma[];
  chamadasHoje: Record<string, string>;
  turmasInvalidas: number;
  diariosHoje: Record<string, string>;
  erroIndicadores?: ReturnType<typeof classificarErroGrade>;
}
const negar = () => Object.assign(new Error('Perfil ou vínculo indisponível.'), { code: 'permission-denied' });

export const verificarIdentidadeAcademica = verificarIdentidadeAtiva;
export const verificarLeituraVigente = verificarSessaoVigente;

export function verificarVinculoTurma(turma: Turma, identidade: IdentidadeGrade) {
  if ((identidade.role === 'professor' && turma.professorId !== identidade.uid)
    || (identidade.role === 'coordenador' && !turma.coordenadorIds.includes(identidade.uid))) throw negar();
}

export async function listarTurmasAutorizadas(banco: Firestore, identidade: IdentidadeGrade, vigente: () => boolean = () => true) {
  await verificarIdentidadeAcademica(banco, identidade, vigente);
  const verificarSessao = () => verificarLeituraVigente(vigente);
  const referencia = collection(banco, 'turmas');
  const consulta = identidade.role === 'professor'
    ? query(referencia, where('professorId', '==', identidade.uid))
    : identidade.role === 'coordenador'
      ? query(referencia, where('coordenadorIds', 'array-contains', identidade.uid))
      : query(referencia);
  const documentos = await getDocsFromServer(consulta);
  verificarSessao();
  const turmas: Turma[] = [];
  let turmasInvalidas = 0;
  documentos.forEach(documento => {
    const turma = validarTurma(documento.id, documento.data());
    if (!turma) { turmasInvalidas++; return; }
    // Defesa adicional para dados incoerentes; não substitui as regras do servidor.
    verificarVinculoTurma(turma, identidade);
    turmas.push(turma);
  });
  turmas.sort((a, b) => a.diaId - b.diaId || a.horario.localeCompare(b.horario) || a.id.localeCompare(b.id));

  return { turmas, turmasInvalidas };
}

export async function buscarTurmaAutorizada(banco: Firestore, identidade: IdentidadeGrade, id: string, vigente: () => boolean = () => true) {
  if (!id || id.includes('/')) throw negar();
  // Consulta primeiro o conjunto autorizado; a URL não provoca leitura de turma alheia.
  const { turmas } = await listarTurmasAutorizadas(banco, identidade, vigente);
  const turma = turmas.find(t => t.id === id);
  if (!turma) throw negar();
  return turma;
}

export async function buscarGradeTurmas(
  banco: Firestore, identidade: IdentidadeGrade, data = calendarioBahia().data,
  vigente: () => boolean = () => true,
): Promise<GradeTurmas> {
  const verificarSessao = () => verificarLeituraVigente(vigente);
  const { turmas, turmasInvalidas } = await listarTurmasAutorizadas(banco, identidade, vigente);
  const chamadasHoje: Record<string, string> = Object.create(null);
  const diariosHoje: Record<string, string> = Object.create(null);
  for (const turma of turmas) {
    verificarSessao();
    try {
      const diario = await consultarDiarioDoDia(banco, turma.id, data);
      verificarSessao();
      if (diario) {
        chamadasHoje[turma.id] = diario.horario;
        diariosHoje[turma.id] = diario.id;
      }
    } catch (erro) {
      verificarSessao();
      const falha = classificarErroGrade(erro);
      if (falha.tipo !== 'configuracao') throw erro;
      // Índice pendente não apaga a grade nem vira uma ausência falsa de chamadas.
      return { turmas, turmasInvalidas, chamadasHoje: Object.create(null),
        diariosHoje: Object.create(null), erroIndicadores: falha };
    }
  }
  return { turmas, chamadasHoje, diariosHoje, turmasInvalidas };
}
