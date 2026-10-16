import React, { createContext, useState, useEffect, useContext } from 'react';
import { auth, db } from '../config/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';

// Tipagem do nosso Crachá Global
interface AuthContextData {
  usuario: User | null;      // Dados básicos de login (email, uid)
  dadosPerfil: any | null;   // Dados do Banco (nome, role/cargo, etc)
  carregando: boolean;
}

// Criando o "Tubo" que vai espalhar essa informação pelo app
const AuthContext = createContext<AuthContextData>({} as AuthContextData);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [usuario, setUsuario] = useState<User | null>(null);
  const [dadosPerfil, setDadosPerfil] = useState<any | null>(null);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    // O Firebase fica "escutando" 24h por dia se alguém fez login ou logout
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUsuario(firebaseUser);
        
        // Se logou, vamos no Firestore buscar quem é ele (Nome, se é Admin/Professor)
        const docRef = doc(db, 'usuarios', firebaseUser.uid);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          setDadosPerfil(docSnap.data());
        }
      } else {
        // Se deslogou, limpamos a memória
        setUsuario(null);
        setDadosPerfil(null);
      }
      setCarregando(false);
    });

    return unsubscribe; // Limpa o ouvinte quando o app fecha
  }, []);

  return (
    <AuthContext.Provider value={{ usuario, dadosPerfil, carregando }}>
      {children}
    </AuthContext.Provider>
  );
}

// Uma ferramenta rápida para puxarmos esses dados em qualquer tela
export const useAuth = () => useContext(AuthContext);