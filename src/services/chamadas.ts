import { collection, documentId, getDocsFromServer, query, where, limit, type Firestore } from 'firebase/firestore';
import { buscarTurmaAutorizada, listarTurmasAutorizadas, verificarLeituraVigente,
  type IdentidadeGrade } from './turmas';
import { calendarioBahia } from '../utils/calendario';
import { consultarDiarioDoDia } from './consulta-diaria';
import { validarChamada, type Chamada } from '../types/chamada';
import type { Turma } from '../types/turma';

const dadosInvalidos = () => Object.assign(new Error('Diário inválido.'), { code: 'dados-invalidos' });
export interface HistoricoAcademico {
  turmas: Turma[];
  turmasInvalidas: number;
  chamadasInvalidas: number;
  chamadas: (Chamada & { turmaNome: string })[];
}

export async function buscarHistoricoAutorizado(banco: Firestore, identidade: IdentidadeGrade, vigente: () => boolean = () => true): Promise<HistoricoAcademico> {
  const { turmas, turmasInvalidas } = await listarTurmasAutorizadas(banco, identidade, vigente);
  const chamadas: HistoricoAcademico['chamadas'] = [];
  let chamadasInvalidas = 0;
  for (const turma of turmas) {
    verificarLeituraVigente(vigente);
    const documentos = await getDocsFromServer(query(collection(banco, 'chamadas'), where('turmaId', '==', turma.id)));
    verificarLeituraVigente(vigente);
    documentos.forEach(documento => {
      const chamada = validarChamada(documento.id, documento.data());
      if (!chamada || chamada.turmaId !== turma.id) { chamadasInvalidas++; return; }
      chamadas.push({ ...chamada, turmaNome: turma.nome });
    });
  }
  chamadas.sort((a, b) => (b.instante ?? -Infinity) - (a.instante ?? -Infinity) || a.id.localeCompare(b.id));
  return { turmas, turmasInvalidas, chamadasInvalidas, chamadas };
}

export async function buscarDiarioAutorizado(banco: Firestore, identidade: IdentidadeGrade, turmaId: string, chamadaId?: string, vigente: () => boolean = () => true, data = calendarioBahia().data) {
  const turma = await buscarTurmaAutorizada(banco, identidade, turmaId, vigente);
  let chamada: Chamada | null = null;
  if (chamadaId !== undefined) {
    if (!chamadaId || chamadaId.includes('/')) throw dadosInvalidos();
    // A consulta por turma impede baixar diários de outras turmas por manipulação do ID.
    const documentos = await getDocsFromServer(query(collection(banco, 'chamadas'), where('turmaId', '==', turma.id), where(documentId(), '==', chamadaId), limit(1)));
    verificarLeituraVigente(vigente);
    const documento = documentos.docs.find(d => d.id === chamadaId);
    if (!documento) throw Object.assign(new Error('Diário indisponível.'), { code: 'permission-denied' });
    chamada = validarChamada(documento.id, documento.data());
    if (!chamada || chamada.turmaId !== turma.id) throw dadosInvalidos();
  } else {
    const diario = await consultarDiarioDoDia(banco, turma.id, data);
    verificarLeituraVigente(vigente);
    chamada = diario ? validarChamada(diario.id, diario.dados) : null;
    if (diario && !chamada) throw dadosInvalidos();
  }
  return { turma, chamada };
}
