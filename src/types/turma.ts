export interface Turma {
  id: string;
  nome: string;
  disciplina: string;
  diaId: number;
  diaSemana: string;
  horario: string;
  turno: string;
  alunos?: number;
  professorNome?: string;
  professorId?: string;
  coordenadorIds: string[];
}

const dias = ['Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira'];
const texto = (valor: unknown): valor is string => typeof valor === 'string' && !!valor.trim();

// Adapta somente apresentação legada. Nunca cria um vínculo ou perfil padrão.
export function validarTurma(id: string, valor: unknown): Turma | null {
  if (!valor || typeof valor !== 'object') return null;
  const d = valor as Record<string, unknown>;
  const disciplina = texto(d.disciplina) ? d.disciplina : d.materia;
  if (!texto(d.nome) || !texto(disciplina) || !texto(d.horario)
    || typeof d.diaId !== 'number' || !Number.isInteger(d.diaId) || d.diaId < 1 || d.diaId > 5) return null;
  return {
    id, nome: d.nome.trim(), disciplina: disciplina.trim(), horario: d.horario.trim(),
    diaId: d.diaId, diaSemana: dias[d.diaId - 1],
    turno: texto(d.turno) ? d.turno.trim() : 'Turno não informado',
    alunos: typeof d.alunos === 'number' && Number.isInteger(d.alunos) && d.alunos >= 0 ? d.alunos : undefined,
    professorNome: texto(d.professorNome) ? d.professorNome.trim() : undefined,
    professorId: texto(d.professorId) ? d.professorId : undefined,
    coordenadorIds: Array.isArray(d.coordenadorIds) && d.coordenadorIds.every(texto) ? d.coordenadorIds : [],
  };
}

export type TipoErroGrade = 'permissao' | 'conexao' | 'dados' | 'configuracao' | 'outro';
export function classificarErroGrade(erro: unknown): { tipo: TipoErroGrade; mensagem: string } {
  const codigo = erro && typeof erro === 'object' && 'code' in erro ? String(erro.code) : '';
  if (codigo === 'permission-denied' || codigo === 'unauthenticated') {
    return { tipo: 'permissao', mensagem: 'Acesso indisponível. Verifique seu perfil ativo e seus vínculos com o responsável pelo sistema.' };
  }
  if (['unavailable', 'deadline-exceeded', 'network-request-failed'].includes(codigo)) {
    return { tipo: 'conexao', mensagem: 'Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente.' };
  }
  if (codigo === 'failed-precondition') return { tipo: 'configuracao', mensagem: 'A consulta ainda precisa ser configurada. Contate o responsável pelo sistema.' };
  if (codigo === 'dados-invalidos') return { tipo: 'dados', mensagem: 'Os dados recebidos estão inválidos. Contate o responsável pelo sistema.' };
  return { tipo: 'outro', mensagem: 'Não foi possível carregar a grade. Tente novamente.' };
}
