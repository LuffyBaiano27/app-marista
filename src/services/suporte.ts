import { collection, doc, getDocsFromServer, query, where, runTransaction, serverTimestamp, type Firestore } from 'firebase/firestore';
import type { IdentidadeUsuario } from '../types/usuario';
import { validarChamadoSuporte, type ChamadoSuporte } from '../types/suporte';
import { exigirPerfilAtivo, verificarIdentidadeAtiva, verificarSessaoVigente } from './autorizacao';

const negar = () => Object.assign(new Error('Acesso indisponível.'), { code: 'permission-denied' });
const invalido = () => Object.assign(new Error('Chamado inválido.'), { code: 'dados-invalidos' });

export async function listarChamadosSuporte(banco: Firestore, identidade: IdentidadeUsuario, vigente: () => boolean = () => true) {
  await verificarIdentidadeAtiva(banco, identidade, vigente);
  const referencia = collection(banco, 'chamados_suporte');
  const documentos = await getDocsFromServer(identidade.role === 'admin'
    ? query(referencia) : query(referencia, where('solicitanteUid', '==', identidade.uid)));
  verificarSessaoVigente(vigente);
  const chamados: ChamadoSuporte[] = [];
  let invalidos = 0;
  documentos.forEach(documento => {
    const chamado = validarChamadoSuporte(documento.id, documento.data());
    if (!chamado) { invalidos++; return; }
    if (identidade.role !== 'admin' && chamado.solicitanteUid !== identidade.uid) throw negar();
    chamados.push(chamado);
  });
  chamados.sort((a, b) => (a.status === b.status ? 0 : a.status === 'pendente' ? -1 : 1)
    || (b.criadoEmMs ?? -Infinity) - (a.criadoEmMs ?? -Infinity) || a.id.localeCompare(b.id));
  return { chamados, invalidos };
}

// Preparados para F2; interface mantém mutações indisponíveis até autorização própria.
export async function criarChamadoSuporte(banco: Firestore, identidade: IdentidadeUsuario, descricao: string, vigente: () => boolean = () => true) {
  if (typeof descricao !== 'string' || !descricao.trim() || descricao.trim().length > 4000) throw invalido();
  verificarSessaoVigente(vigente);
  if (!identidade.uid || identidade.uid.includes('/')) throw negar();
  const referencia = doc(collection(banco, 'chamados_suporte'));
  await runTransaction(banco, async transacao => {
    verificarSessaoVigente(vigente);
    const perfil = await transacao.get(doc(banco, 'usuarios', identidade.uid));
    exigirPerfilAtivo(perfil.data(), identidade);
    verificarSessaoVigente(vigente);
    transacao.set(referencia, { solicitanteUid: identidade.uid, descricao: descricao.trim(),
      status: 'pendente', criadoEm: serverTimestamp() });
  });
  return referencia.id;
}

export async function resolverChamadoSuporte(banco: Firestore, identidade: IdentidadeUsuario, id: string, vigente: () => boolean = () => true) {
  if (!id || id.includes('/') || !identidade.uid || identidade.uid.includes('/')) throw negar();
  await runTransaction(banco, async transacao => {
    verificarSessaoVigente(vigente);
    const perfil = await transacao.get(doc(banco, 'usuarios', identidade.uid));
    exigirPerfilAtivo(perfil.data(), identidade);
    if (identidade.role !== 'admin') throw negar();
    const referencia = doc(banco, 'chamados_suporte', id);
    const documento = await transacao.get(referencia);
    verificarSessaoVigente(vigente);
    if (!documento.exists() || documento.data().status !== 'pendente') throw invalido();
    transacao.update(referencia, { status: 'resolvido', resolvidoPorUid: identidade.uid, resolvidoEm: serverTimestamp() });
  });
}
