import { collection, getDocsFromServer, query, where, orderBy, limit, type Firestore } from 'firebase/firestore';
import { instanteLegadoConfiavel, limitesDiaBahia, horarioBahia } from '../utils/calendario';

// Chamador deve verificar perfil e vínculo antes de fornecer a turma.
export async function consultarDiarioDoDia(banco: Firestore, turmaId: string, data: string): Promise<{ id: string; horario: string; dados: unknown } | null> {
  const { inicio, fim } = limitesDiaBahia(data);
  const documentos = await getDocsFromServer(query(collection(banco, 'chamadas'),
    where('turmaId', '==', turmaId), where('dataChamada', '>=', inicio.toISOString()),
    where('dataChamada', '<', fim.toISOString()), orderBy('dataChamada', 'desc'), limit(1)));
  let resultado: { id: string; horario: string; dados: unknown } | null = null;
  documentos.forEach(documento => {
    const dados = documento.data();
    const ms = instanteLegadoConfiavel(dados.dataChamada);
    if (dados.turmaId !== turmaId || ms === null || dados.dataChamada !== new Date(ms).toISOString() || ms < inicio.getTime() || ms >= fim.getTime()) {
      throw Object.assign(new Error('Informação temporal não confiável.'), { code: 'dados-invalidos' });
    }
    resultado = { id: documento.id, horario: horarioBahia(ms), dados };
  });
  return resultado;
}
