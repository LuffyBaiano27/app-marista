export type PerfilUsuario = 'professor' | 'coordenador' | 'admin';

export interface DadosPerfil {
  nome: string;
  role: PerfilUsuario;
  ativo: boolean;
}

export type StatusPerfil =
  | 'carregando'
  | 'desconectado'
  | 'disponivel'
  | 'ausente'
  | 'invalido'
  | 'inativo'
  | 'erro';

export const nomesPerfis: Record<PerfilUsuario, string> = {
  professor: 'Professor',
  coordenador: 'Coordenador',
  admin: 'Administrador',
};

// Os dados externos só podem conceder um perfil após validação explícita.
export function validarDadosPerfil(dados: unknown): DadosPerfil | null {
  if (typeof dados !== 'object' || dados === null) return null;
  const { nome, role, ativo } = dados as Record<string, unknown>;
  if (typeof nome !== 'string' || !nome.trim() || nome.trim().length > 120) return null;
  if (role !== 'professor' && role !== 'coordenador' && role !== 'admin') return null;
  if (typeof ativo !== 'boolean') return null;
  return { nome: nome.trim(), role, ativo };
}

export interface IdentidadeUsuario { uid: string; role: PerfilUsuario }

export function perfilOperacional(perfil: DadosPerfil | null): boolean {
  return perfil?.ativo === true;
}
