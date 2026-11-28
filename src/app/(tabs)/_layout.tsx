import React, { useEffect, useState } from 'react';
import { Platform, View } from 'react-native';
import { Redirect, Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../../config/firebase';
import { useDemoProfile } from '../../contexts/demoProfileContext';

const CONFIGURACAO_ABAS = {
  index: { titulo: 'Início', iconeAtivo: 'home' as const, iconeInativo: 'home-outline' as const },
  usuarios: { titulo: 'Usuários', iconeAtivo: 'people' as const, iconeInativo: 'people-outline' as const },
  turmas: { titulo: 'Turmas', iconeAtivo: 'school' as const, iconeInativo: 'school-outline' as const },
  chamados: { titulo: 'Chamados', iconeAtivo: 'construct' as const, iconeInativo: 'construct-outline' as const },
  historico: { titulo: 'Histórico', iconeAtivo: 'time' as const, iconeInativo: 'time-outline' as const },
  avaliacoes: { titulo: 'Avaliações', iconeAtivo: 'document-text' as const, iconeInativo: 'document-text-outline' as const },
  perfil: { titulo: 'Perfil', iconeAtivo: 'person' as const, iconeInativo: 'person-outline' as const },
};

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const { perfil, temaAtivo: tema } = useDemoProfile();
  const [autenticado, setAutenticado] = useState(Boolean(auth.currentUser));
  const isEscuro = tema.fundoBase !== '#FFFFFF';
  const bottomInset = Platform.OS === 'web' ? 0 : insets.bottom;
  const corFundoBarra = isEscuro ? tema.fundoTopo : tema.fundoBase;

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, user => {
      setAutenticado(Boolean(user));
    });
    return unsubscribe;
  }, []);

  if (!autenticado) {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.location.replace('/');
      return null;
    }
    return <Redirect href="/" />;
  }

  const ordemAbas = perfil === 'admin'
    ? ['index', 'usuarios', 'turmas', 'chamados', 'historico', 'avaliacoes', 'perfil'] as const
    : ['index', 'turmas', 'usuarios', 'chamados', 'historico', 'avaliacoes', 'perfil'] as const;

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: tema.botaoPrimario,
        tabBarInactiveTintColor: tema.textoSecundario,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '700',
        },
        tabBarBackground: () => (
          <View style={{ flex: 1, backgroundColor: corFundoBarra }} />
        ),
        tabBarStyle: {
          backgroundColor: corFundoBarra,
          borderTopColor: tema.borda,
          borderTopWidth: 1,
          height: 64 + bottomInset,
          paddingBottom: 10 + bottomInset,
          paddingTop: 6,
          elevation: 8,
        },
        headerShown: false,
      }}
    >
      {ordemAbas.map(nome => {
        const configuracao = CONFIGURACAO_ABAS[nome];
        const titulo = nome === 'usuarios' && perfil === 'coordenador'
          ? 'Professores'
          : configuracao.titulo;
        const ocultar = (nome === 'usuarios' && perfil === 'professor') ||
          (nome === 'chamados' && perfil !== 'admin') ||
          (nome === 'avaliacoes' && perfil === 'admin');
        const esconderDaBarra = nome === 'perfil' ||
          (nome === 'historico' && (perfil === 'admin' || perfil === 'coordenador'));

        return (
          <Tabs.Screen
            key={nome}
            name={nome}
            options={{
              title: titulo,
              href: ocultar ? null : undefined,
              tabBarItemStyle: esconderDaBarra ? { display: 'none' } : undefined,
              tabBarIcon: ({ color, focused }) => (
                <Ionicons
                  name={focused ? configuracao.iconeAtivo : configuracao.iconeInativo}
                  size={23}
                  color={typeof color === 'string' ? color : undefined}
                />
              ),
            }}
          />
        );
      })}
    </Tabs>
  );
}