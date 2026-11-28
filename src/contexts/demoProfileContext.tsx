import React, { createContext, useContext, useMemo, useState } from 'react';
import { useColorScheme } from 'react-native';
import { cores } from '../constants/colors';

export type DemoProfile = 'admin' | 'coordenador' | 'professor';
export type ModoTema = 'Sistema' | 'Claro' | 'Escuro';

export interface UsuarioLogado {
  nome: string;
  email: string;
  iniciais: string;
}

interface DemoProfileContextData {
  perfil: DemoProfile;
  setPerfil: (perfil: DemoProfile) => void;
  perfilReal: DemoProfile;
  setPerfilReal: (perfil: DemoProfile) => void;
  usuarioLogado: UsuarioLogado | null;
  setUsuarioLogado: (usuario: UsuarioLogado | null) => void;
  modoTema: ModoTema;
  setModoTema: (modo: ModoTema) => void;
  temaAtivo: typeof cores.dark;
}

const DemoProfileContext = createContext<DemoProfileContextData>({
  perfil: 'admin',
  setPerfil: () => {},
  perfilReal: 'admin',
  setPerfilReal: () => {},
  usuarioLogado: null,
  setUsuarioLogado: () => {},
  modoTema: 'Sistema',
  setModoTema: () => {},
  temaAtivo: cores.dark,
});

export function DemoProfileProvider({ children }: { children: React.ReactNode }) {
  const [perfil, setPerfil] = useState<DemoProfile>('admin');
  const [perfilReal, setPerfilReal] = useState<DemoProfile>('admin');
  const [usuarioLogado, setUsuarioLogado] = useState<UsuarioLogado | null>(null);
  const [modoTema, setModoTema] = useState<ModoTema>('Sistema');
  const esquemaSistema = useColorScheme();

  const temaAtivo = useMemo(() => {
    if (modoTema === 'Claro') return cores.light;
    if (modoTema === 'Escuro') return cores.dark;
    return esquemaSistema === 'dark' ? cores.dark : cores.light;
  }, [modoTema, esquemaSistema]);

  return (
    <DemoProfileContext.Provider
      value={{ perfil, setPerfil, perfilReal, setPerfilReal, usuarioLogado, setUsuarioLogado, modoTema, setModoTema, temaAtivo }}
    >
      {children}
    </DemoProfileContext.Provider>
  );
}

export const useDemoProfile = () => useContext(DemoProfileContext);