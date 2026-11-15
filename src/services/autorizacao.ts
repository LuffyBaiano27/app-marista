import { doc, getDocFromServer, type Firestore } from 'firebase/firestore';
import { validarDadosPerfil, type IdentidadeUsuario } from '../types/usuario';

export function verificarSessaoVigente(vigente: () => boolean) {
  if (!vigente()) throw Object.assign(new Error('Leitura cancelada.'), { code: 'cancelled' });
}
export function exigirPerfilAtivo(dados: unknown, identidade: IdentidadeUsuario) {
  const perfil = validarDadosPerfil(dados);
  if (!identidade.uid || identidade.uid.includes('/') || !perfil || perfil.ativo !== true || perfil.role !== identidade.role) {
    throw Object.assign(new Error('Perfil ou acesso indisponível.'), { code: 'permission-denied' });
  }
  return perfil;
}
export async function verificarIdentidadeAtiva(banco: Firestore, identidade: IdentidadeUsuario, vigente: () => boolean = () => true) {
  verificarSessaoVigente(vigente);
  if (!identidade.uid || identidade.uid.includes('/')) throw Object.assign(new Error('Identidade inválida.'), { code: 'permission-denied' });
  const documento = await getDocFromServer(doc(banco, 'usuarios', identidade.uid));
  verificarSessaoVigente(vigente);
  return exigirPerfilAtivo(documento.data(), identidade);
}
