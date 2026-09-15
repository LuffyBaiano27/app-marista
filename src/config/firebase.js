import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyB6inrc7g5BWtURTfiJay2YG3i5dtjWNrs",
  authDomain: "marista-app.firebaseapp.com",
  projectId: "marista-app",
  storageBucket: "marista-app.firebasestorage.app",
  messagingSenderId: "868804198752",
  appId: "1:868804198752:web:3c983b7b15aa940f351e05",
  measurementId: "G-L9ETNFNCH5"
};

// Inicializa o Firebase
const app = initializeApp(firebaseConfig);

// Inicializa a Autenticação (Para o Login)
export const auth = getAuth(app);

// Inicializa o Banco de Dados (Para turmas, notas, alunos)
export const db = getFirestore(app);

export default app;