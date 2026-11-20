import {
  createContext,
  useContext,
  useState,
  type Dispatch,
  type PropsWithChildren,
  type SetStateAction,
} from 'react';

export type DemoProfile = 'admin' | 'coordenador' | 'professor';

interface DemoProfileContextValue {
  perfil: DemoProfile;
  setPerfil: Dispatch<SetStateAction<DemoProfile>>;
}

const DemoProfileContext = createContext<DemoProfileContextValue | null>(null);

export function DemoProfileProvider({ children }: PropsWithChildren) {
  const [perfil, setPerfil] = useState<DemoProfile>('admin');

  return (
    <DemoProfileContext.Provider value={{ perfil, setPerfil }}>
      {children}
    </DemoProfileContext.Provider>
  );
}

export function useDemoProfile() {
  const context = useContext(DemoProfileContext);

  if (!context) {
    throw new Error('useDemoProfile must be used within a DemoProfileProvider');
  }

  return context;
}
