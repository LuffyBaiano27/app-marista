import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import {getFirestore,collection,getDocs,addDoc,setDoc,deleteDoc,doc,serverTimestamp,} from 'firebase/firestore';

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
const ADMIN_EMAIL = '...';
const ADMIN_SENHA = '...';

const ALUNOS_INICIAIS = {
  '1º Ano Médio': ['Ana Carolina', 'Carlos Eduardo', 'Beatriz Souza'],
  '2º Ano Médio': ['Gabriel Martins', 'Fernanda Lima', 'Lucas Oliveira'],
  '6º Ano A': ['João Pedro', 'Sophia Mendes'],
  '9º Ano C': ['Mariana Silva', 'Matheus Costa', 'Letícia Rocha'],
};

async function migrar() {
  console.log('Autenticando no Firebase...');
  await signInWithEmailAndPassword(auth, ADMIN_EMAIL, ADMIN_SENHA);
  console.log('✔ Autenticado! Iniciando organização do Firestore...');

  const turmasSnap = await getDocs(collection(db, 'turmas'));
  const todosDocs = turmasSnap.docs.map(d => ({ id: d.id, ...d.data() }));

  const mapaTurmaPrincipal = new Map();
  const docsParaExcluir = [];

  for (const item of todosDocs) {
    const nome = String(item.nome || '').trim();
    if (!nome || nome.startsWith('[TESTE]')) {
      docsParaExcluir.push(item.id);
      continue;
    }

    if (!mapaTurmaPrincipal.has(nome)) {
      mapaTurmaPrincipal.set(nome, {
        id: item.id,
        nome,
        turno: item.turno || 'Matutino',
      });
    } else {
      docsParaExcluir.push(item.id);
    }
  }

  const gradeSnap = await getDocs(collection(db, 'grade_aulas'));
  if (gradeSnap.empty) {
    let aulasCriadas = 0;
    const horariosUnicos = new Set();

    for (const item of todosDocs) {
      const principal = mapaTurmaPrincipal.get(String(item.nome || '').trim());
      if (!principal || !item.diaId || !item.horario) continue;

      const chaveHorario = `${principal.nome}_${item.diaId}_${item.horario}`;
      if (horariosUnicos.has(chaveHorario)) continue;
      horariosUnicos.add(chaveHorario);

      await addDoc(collection(db, 'grade_aulas'), {
        turmaId: principal.id,
        nome: principal.nome,
        turmaNome: principal.nome,
        turno: item.turno || principal.turno,
        disciplina: item.disciplina || item.materia || 'Disciplina Geral',
        diaId: item.diaId,
        horario: item.horario,
        professorId: item.professorId || 'prof_1',
        professorNome: item.professorNome || 'Luffy Baiano',
        criadoEm: serverTimestamp(),
      });
      aulasCriadas++;
    }
    console.log(`✔ ${aulasCriadas} horários únicos migrados para "grade_aulas".`);
  } else {
    console.log('ℹ Coleção "grade_aulas" já possui dados. Pulando cópia.');
  }

  for (const [, turma] of mapaTurmaPrincipal) {
    await setDoc(doc(db, 'turmas', turma.id), {
      nome: turma.nome,
      turno: turma.turno,
      criadoPor: 'Marina',
      criadoEm: serverTimestamp(),
    });
  }
  console.log(`✔ ${mapaTurmaPrincipal.size} turmas únicas padronizadas em "turmas".`);

  for (const id of docsParaExcluir) {
    await deleteDoc(doc(db, 'turmas', id));
  }
  console.log(`✔ ${docsParaExcluir.length} documentos duplicados/teste removidos de "turmas".`);

  const alunosSnap = await getDocs(collection(db, 'alunos'));
  if (alunosSnap.empty) {
    let alunosCriados = 0;
    for (const [nomeTurma, turma] of mapaTurmaPrincipal) {
      const listaNomes = ALUNOS_INICIAIS[nomeTurma] || [];
      for (const nomeAluno of listaNomes) {
        await addDoc(collection(db, 'alunos'), {
          nome: nomeAluno,
          turmaId: turma.id,
          turmaNome: turma.nome,
          ativo: true,
          criadoEm: serverTimestamp(),
        });
        alunosCriados++;
      }
    }
    console.log(`✔ ${alunosCriados} alunos criados em "alunos".`);
  } else {
    console.log('ℹ Coleção "alunos" já possui dados. Pulando criação.');
  }

  console.log('Migração concluída com sucesso!');
  process.exit(0);
}

migrar().catch(err => {
  console.error('Erro na migração:', err);
  process.exit(1);
});