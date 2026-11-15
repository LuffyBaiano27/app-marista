import { doc, getDocFromServer, onSnapshot } from 'firebase/firestore';
import { db } from '../config/firebase';
import { validarDadosPerfil, type DadosPerfil } from '../types/usuario';

export type ResultadoPerfil =
  | { status: 'disponivel' | 'inativo'; dadosPerfil: DadosPerfil }
  | { status: 'ausente' | 'invalido' | 'carregando'; dadosPerfil: null };

export function interpretarPerfil(existe: boolean, dados: unknown): ResultadoPerfil {
  if (!existe) return { status: 'ausente', dadosPerfil: null };
  const perfil = validarDadosPerfil(dados);
  if (!perfil) return { status: 'invalido', dadosPerfil: null };
  return { status: perfil.ativo === true ? 'disponivel' : 'inativo', dadosPerfil: perfil };
}

export async function buscarPerfilUsuario(uid: string): Promise<ResultadoPerfil> {
  const documento = await getDocFromServer(doc(db, 'usuarios', uid));
  return interpretarPerfil(documento.exists(), documento.data());
}

export function observarPerfilUsuario(uid: string, receber: (resultado: ResultadoPerfil) => void, falhar: () => void) {
  return onSnapshot(doc(db, 'usuarios', uid), { includeMetadataChanges: true }, documento => {
    // Snapshot em cache não confirma que a conta continua habilitada no servidor.
    if (documento.metadata.fromCache || documento.metadata.hasPendingWrites) receber({ status: 'carregando', dadosPerfil: null });
    else receber(interpretarPerfil(documento.exists(), documento.data()));
  }, falhar);
}
