import React, { createContext, useContext, useMemo, useState } from 'react';
import { useColorScheme } from 'react-native';
import { cores } from '../constants/colors';

export type DemoProfile = 'admin' | 'coordenador' | 'professor';
export type ModoTema = 'Sistema' | 'Claro' | 'Escuro';

interface DemoProfileContextData {
  perfil: DemoProfile;
  setPerfil: (perfil: DemoProfile) => void;
  modoTema: ModoTema;
  setModoTema: (modo: ModoTema) => void;
  temaAtivo: typeof cores.dark;
}

const DemoProfileContext = createContext<DemoProfileContextData>({
  perfil: 'admin',
  setPerfil: () => {},
  modoTema: 'Sistema',
  setModoTema: () => {},
  temaAtivo: cores.dark,
});

export function DemoProfileProvider({ children }: { children: React.ReactNode }) {
  const [perfil, setPerfil] = useState<DemoProfile>('admin');
  const [modoTema, setModoTema] = useState<ModoTema>('Sistema');
  const esquemaSistema = useColorScheme();

  const temaAtivo = useMemo(() => {
    if (modoTema === 'Claro') return cores.light;
    if (modoTema === 'Escuro') return cores.dark;
    return esquemaSistema === 'dark' ? cores.dark : cores.light;
  }, [modoTema, esquemaSistema]);

  return (
    <DemoProfileContext.Provider value={{ perfil, setPerfil, modoTema, setModoTema, temaAtivo }}>
      {children}
    </DemoProfileContext.Provider>
  );
}

export const useDemoProfile = () => useContext(DemoProfileContext);