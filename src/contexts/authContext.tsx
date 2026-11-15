import React, { createContext, useState, useEffect, useContext } from 'react';
import { auth } from '../config/firebase';
import { onAuthStateChanged, signOut, type User } from 'firebase/auth';
import { observarPerfilUsuario } from '../services/perfilUsuario';
import type { DadosPerfil, StatusPerfil } from '../types/usuario';

interface AuthContextData {
  usuario: User | null;
  dadosPerfil: DadosPerfil | null;
  carregando: boolean;
  statusPerfil: StatusPerfil;
  erro: string | null;
  encerrarSessao: () => Promise<void>;
}

type EstadoAuth = Omit<AuthContextData, 'carregando' | 'encerrarSessao'>;
const AuthContext = createContext<AuthContextData | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [estado, setEstado] = useState<EstadoAuth>({
    usuario: null, dadosPerfil: null, statusPerfil: 'carregando', erro: null,
  });

  useEffect(() => {
    let ativo = true;
    let versaoSessao = 0;
    let cancelarPerfil: (() => void) | undefined;
    const unsubscribe = onAuthStateChanged(auth, (usuario) => {
      const versaoAtual = ++versaoSessao;
      cancelarPerfil?.();
      cancelarPerfil = undefined;
      if (!ativo) return;
      setEstado({
        usuario, dadosPerfil: null,
        statusPerfil: usuario ? 'carregando' : 'desconectado', erro: null,
      });
      if (!usuario) return;

      // Ignora respostas de uma sessão anterior ou de um provider desmontado.
      const sessaoAtual = () => ativo && versaoAtual === versaoSessao
        && auth.currentUser?.uid === usuario.uid;
      const falharPerfil = () => {
        if (!sessaoAtual()) return;
        setEstado({ usuario, dadosPerfil: null, statusPerfil: 'erro',
          erro: 'Não foi possível verificar seu perfil no servidor. Recarregue a aplicação para tentar novamente.' });
      };
      try {
        cancelarPerfil = observarPerfilUsuario(usuario.uid, resultado => {
          if (!sessaoAtual()) return;
          setEstado({ usuario, dadosPerfil: resultado.dadosPerfil,
            statusPerfil: resultado.status, erro: null });
        }, falharPerfil);
      } catch {
        falharPerfil();
      }
    }, () => {
      ++versaoSessao;
      cancelarPerfil?.();
      cancelarPerfil = undefined;
      if (ativo) setEstado({ usuario: null, dadosPerfil: null, statusPerfil: 'erro',
        erro: 'Não foi possível verificar sua sessão.' });
    });

    return () => {
      ativo = false;
      ++versaoSessao;
      cancelarPerfil?.();
      unsubscribe();
    };
  }, []);

  const encerrarSessao = async () => {
    await signOut(auth);
    // O observador é a fonte única do estado da sessão e limpa o perfil.
  };

  return (
    <AuthContext.Provider value={{ ...estado, carregando: estado.statusPerfil === 'carregando', encerrarSessao }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const contexto = useContext(AuthContext);
  if (!contexto) throw new Error('useAuth deve ser utilizado dentro de AuthProvider.');
  return contexto;
}
