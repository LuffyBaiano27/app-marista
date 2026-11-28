import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, doc, setDoc, serverTimestamp } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: 'AIzaSyB6inrc7g5BWtURTfiJay2YG3i5dtjWNrs',
  authDomain: 'marista-app.firebaseapp.com',
  projectId: 'marista-app',
  storageBucket: 'marista-app.firebasestorage.app',
  messagingSenderId: '868804198752',
  appId: '1:868804198752:web:3c983b7b15aa940f351e05',
  measurementId: 'G-L9ETNFNCH5',
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Preencha com o e-mail e senha do Admin antes de rodar
const ADMIN_EMAIL = 'admin@violeta.com';
const ADMIN_SENHA = '123@Lu';

const USUARIOS = [
  { id: 'admin_1', nome: 'Marina Andrade', email: 'marina@violeta.com', cpf: '11122233344', role: 'admin', perfil: 'Administrador', ativo: true, situacao: 'Ativo' },
  { id: 'coord_1', nome: 'Camila Rocha', email: 'camila@violeta.com', cpf: '22233344455', role: 'coordenador', perfil: 'Coordenador', ativo: true, situacao: 'Ativo' },
  { id: 'prof_1', nome: 'Luffy Baiano', email: 'luffy@violeta.com', cpf: '33344455566', role: 'professor', perfil: 'Professor', disciplina: 'Matemática', ativo: true, situacao: 'Ativo', senhaInicialGerada: 'luff@3334' },
  { id: 'prof_2', nome: 'Rafael Nunes', email: 'rafael@violeta.com', cpf: '44455566677', role: 'professor', perfil: 'Professor', disciplina: 'Física', ativo: true, situacao: 'Ativo', senhaInicialGerada: 'rafa@4445' },
  { id: 'prof_3', nome: 'Larissa Alves', email: 'larissa@violeta.com', cpf: '55566677788', role: 'professor', perfil: 'Professor', disciplina: 'História', ativo: true, situacao: 'Ativo', senhaInicialGerada: 'lari@5556' },
];

const TURMAS = [
  { id: 'turma_6a', nome: '6º Ano A', turno: 'Matutino', alunos: 4 },
  { id: 'turma_9c', nome: '9º Ano C', turno: 'Matutino', alunos: 4 },
  { id: 'turma_1em', nome: '1º Ano Médio', turno: 'Matutino', alunos: 4 },
  { id: 'turma_2em', nome: '2º Ano Médio', turno: 'Vespertino', alunos: 3 },
];

const ALUNOS = [
  { id: 'al_1', nome: 'João Pedro Silva', matricula: 'MAT260001', turmaId: 'turma_6a', turmaNome: '6º Ano A', turno: 'Matutino', responsavelNome: 'Marcos Silva', responsavelTelefone: '(71) 99111-1111' },
  { id: 'al_2', nome: 'Sophia Mendes', matricula: 'MAT260002', turmaId: 'turma_6a', turmaNome: '6º Ano A', turno: 'Matutino', responsavelNome: 'Carla Mendes', responsavelTelefone: '(71) 99111-2222' },
  { id: 'al_3', nome: 'Enzo Gabriel Costa', matricula: 'MAT260003', turmaId: 'turma_6a', turmaNome: '6º Ano A', turno: 'Matutino', responsavelNome: 'Patrícia Costa', responsavelTelefone: '(71) 99111-3333' },
  { id: 'al_4', nome: 'Valentina Souza', matricula: 'MAT260004', turmaId: 'turma_6a', turmaNome: '6º Ano A', turno: 'Matutino', responsavelNome: 'Roberto Souza', responsavelTelefone: '(71) 99111-4444' },
  { id: 'al_5', nome: 'Mariana Silva', matricula: 'MAT260005', turmaId: 'turma_9c', turmaNome: '9º Ano C', turno: 'Matutino', responsavelNome: 'Ana Silva', responsavelTelefone: '(71) 99222-1111' },
  { id: 'al_6', nome: 'Matheus Costa', matricula: 'MAT260006', turmaId: 'turma_9c', turmaNome: '9º Ano C', turno: 'Matutino', responsavelNome: 'Fábio Costa', responsavelTelefone: '(71) 99222-2222' },
  { id: 'al_7', nome: 'Letícia Rocha', matricula: 'MAT260007', turmaId: 'turma_9c', turmaNome: '9º Ano C', turno: 'Matutino', responsavelNome: 'Helena Rocha', responsavelTelefone: '(71) 99222-3333' },
  { id: 'al_8', nome: 'Pedro Henrique Lima', matricula: 'MAT260008', turmaId: 'turma_9c', turmaNome: '9º Ano C', turno: 'Matutino', responsavelNome: 'Paulo Lima', responsavelTelefone: '(71) 99222-4444' },
  { id: 'al_9', nome: 'Ana Carolina Ferreira', matricula: 'MAT260009', turmaId: 'turma_1em', turmaNome: '1º Ano Médio', turno: 'Matutino', responsavelNome: 'Cláudia Ferreira', responsavelTelefone: '(71) 99333-1111' },
  { id: 'al_10', nome: 'Carlos Eduardo Santos', matricula: 'MAT260010', turmaId: 'turma_1em', turmaNome: '1º Ano Médio', turno: 'Matutino', responsavelNome: 'Eduardo Santos', responsavelTelefone: '(71) 99333-2222' },
  { id: 'al_11', nome: 'Beatriz Oliveira', matricula: 'MAT260011', turmaId: 'turma_1em', turmaNome: '1º Ano Médio', turno: 'Matutino', responsavelNome: 'Sônia Oliveira', responsavelTelefone: '(71) 99333-3333' },
  { id: 'al_12', nome: 'Lucas Andrade', matricula: 'MAT260012', turmaId: 'turma_1em', turmaNome: '1º Ano Médio', turno: 'Matutino', responsavelNome: 'Maria Andrade', responsavelTelefone: '(71) 99333-4444' },
  { id: 'al_13', nome: 'Gabriel Martins', matricula: 'MAT260013', turmaId: 'turma_2em', turmaNome: '2º Ano Médio', turno: 'Vespertino', responsavelNome: 'José Martins', responsavelTelefone: '(71) 99444-1111' },
  { id: 'al_14', nome: 'Fernanda Lima', matricula: 'MAT260014', turmaId: 'turma_2em', turmaNome: '2º Ano Médio', turno: 'Vespertino', responsavelNome: 'Lúcia Lima', responsavelTelefone: '(71) 99444-2222' },
  { id: 'al_15', nome: 'Rafael Almeida', matricula: 'MAT260015', turmaId: 'turma_2em', turmaNome: '2º Ano Médio', turno: 'Vespertino', responsavelNome: 'André Almeida', responsavelTelefone: '(71) 99444-3333' },
];

const GRADE_AULAS = [
  { id: 'grade_1', turmaId: 'turma_6a', nome: '6º Ano A', turno: 'Matutino', disciplina: 'Matemática', diaId: 1, horario: '07:30 às 08:20', professorId: 'prof_1', professorNome: 'Luffy Baiano' },
  { id: 'grade_2', turmaId: 'turma_9c', nome: '9º Ano C', turno: 'Matutino', disciplina: 'Matemática', diaId: 2, horario: '08:20 às 09:10', professorId: 'prof_1', professorNome: 'Luffy Baiano' },
  { id: 'grade_3', turmaId: 'turma_1em', nome: '1º Ano Médio', turno: 'Matutino', disciplina: 'Matemática', diaId: 3, horario: '09:30 às 10:20', professorId: 'prof_1', professorNome: 'Luffy Baiano' },
  { id: 'grade_4', turmaId: 'turma_2em', nome: '2º Ano Médio', turno: 'Vespertino', disciplina: 'Matemática', diaId: 4, horario: '13:30 às 14:20', professorId: 'prof_1', professorNome: 'Luffy Baiano' },
  { id: 'grade_5', turmaId: 'turma_1em', nome: '1º Ano Médio', turno: 'Matutino', disciplina: 'Matemática', diaId: 5, horario: '07:30 às 08:20', professorId: 'prof_1', professorNome: 'Luffy Baiano' },
  { id: 'grade_6', turmaId: 'turma_1em', nome: '1º Ano Médio', turno: 'Matutino', disciplina: 'Física', diaId: 2, horario: '10:20 às 11:10', professorId: 'prof_2', professorNome: 'Rafael Nunes' },
  { id: 'grade_7', turmaId: 'turma_9c', nome: '9º Ano C', turno: 'Matutino', disciplina: 'História', diaId: 4, horario: '08:20 às 09:10', professorId: 'prof_3', professorNome: 'Larissa Alves' },
];

const AVALIACOES = [
  { id: 'av_1', titulo: '1ª Avaliação Bimestral', bimestre: '1º Bim', turmaId: 'turma_1em', turma: '1º Ano Médio', materia: 'Matemática', professorId: 'prof_1', professor: 'Luffy Baiano', prazo: '10/12/2026', valorMaximo: 10, status: 'pendente', statusPrazo: 'aberto' },
  { id: 'av_2', titulo: 'Trabalho de Geometria', bimestre: '1º Bim', turmaId: 'turma_6a', turma: '6º Ano A', materia: 'Matemática', professorId: 'prof_1', professor: 'Luffy Baiano', prazo: '15/12/2026', valorMaximo: 5, status: 'andamento', statusPrazo: 'aberto' },
  { id: 'av_3', titulo: 'Simulado de Cinemática', bimestre: '1º Bim', turmaId: 'turma_1em', turma: '1º Ano Médio', materia: 'Física', professorId: 'prof_2', professor: 'Rafael Nunes', prazo: '05/12/2026', valorMaximo: 10, status: 'concluido', statusPrazo: 'fechado' },
];

const COMUNICADOS = [
  { id: 'com_1', titulo: 'Bem-vindos ao Sistema Violeta', mensagem: 'O diário digital de chamadas e notas do 1º Bimestre já está liberado para toda a equipe.', destinatario: 'Todos', autor: 'Coordenadora Camila', tipo: 'geral', privado: false },
  { id: 'com_2', titulo: 'Prazo de Lançamento de Notas', mensagem: 'Lembrete: o fechamento das avaliações do 1º Bimestre encerra no dia 15/12.', destinatario: 'Todos os Professores', autor: 'Coordenadora Camila', tipo: 'geral', privado: false },
];

async function popularBanco() {
  console.log('Autenticando no Firebase...');
  await signInWithEmailAndPassword(auth, ADMIN_EMAIL, ADMIN_SENHA);
  console.log('✔ Autenticado! Populando coleções do Violeta...');

  for (const u of USUARIOS) {
    await setDoc(doc(db, 'usuarios', u.id), { ...u, criadoPor: 'Marina', criadoEm: serverTimestamp() }, { merge: true });
  }
  for (const t of TURMAS) {
    await setDoc(doc(db, 'turmas', t.id), { ...t, criadoPor: 'Marina', criadoEm: serverTimestamp() }, { merge: true });
  }
  for (const a of ALUNOS) {
    await setDoc(doc(db, 'alunos', a.id), { ...a, turma: a.turmaNome, ativo: true, cadastradoPor: 'Camila', criadoEm: serverTimestamp() }, { merge: true });
  }
  for (const g of GRADE_AULAS) {
    await setDoc(doc(db, 'grade_aulas', g.id), { ...g, turmaNome: g.nome, criadoPor: 'Camila', criadoEm: serverTimestamp() }, { merge: true });
  }
  for (const av of AVALIACOES) {
    await setDoc(doc(db, 'avaliacoes', av.id), { ...av, criadoPor: 'Camila', criadoEm: serverTimestamp() }, { merge: true });
  }
  for (const c of COMUNICADOS) {
    await setDoc(doc(db, 'comunicados', c.id), { ...c, criadoEm: serverTimestamp() }, { merge: true });
  }

  console.log('✔ Banco povoado com sucesso (5 usuários, 4 turmas, 15 alunos, 7 aulas, 3 avaliações, 2 comunicados)!');
  process.exit(0);
}

popularBanco().catch(err => {
  console.error('Erro ao povoar banco:', err);
  process.exit(1);
});