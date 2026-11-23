import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { cores } from '../../constants/colors';
import { useColorScheme } from 'react-native';
import { useDemoProfile } from '../../contexts/demoProfileContext';

const CONFIGURACAO_ABAS = {
  index: { titulo: 'Início', icone: 'home' as const },
  usuarios: { titulo: 'Usuários', icone: 'people' as const },
  turmas: { titulo: 'Turmas', icone: 'people' as const },
  chamados: { titulo: 'Chamados', icone: 'construct' as const },
  historico: { titulo: 'Histórico', icone: 'time' as const },
  avaliacoes: { titulo: 'Avaliações', icone: 'document-text' as const },
  perfil: { titulo: 'Perfil', icone: 'person' as const },
};

export default function TabLayout() {
  const { perfil } = useDemoProfile();
  const isDarkMode = useColorScheme() === 'dark';
  const tema = isDarkMode ? cores.dark : cores.light;
  const ordemAbas = perfil === 'admin'
    ? ['index', 'usuarios', 'turmas', 'chamados', 'historico', 'avaliacoes', 'perfil'] as const
    : ['index', 'turmas', 'usuarios', 'chamados', 'historico', 'avaliacoes', 'perfil'] as const;

  return (
    <Tabs 
      screenOptions={{
        tabBarActiveTintColor: tema.botaoPrimario,
        tabBarInactiveTintColor: tema.textoSecundario,
        tabBarStyle: {
          backgroundColor: tema.fundoBase,
          borderTopColor: tema.borda,
          height: 60,
          paddingBottom: 10,
          paddingTop: 5,
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
          (nome === 'historico' && perfil === 'coordenador') ||
          (nome === 'avaliacoes' && perfil === 'admin');

        return (
          <Tabs.Screen
            key={nome}
            name={nome}
            options={{
              title: titulo,
              href: ocultar ? null : undefined,
              tabBarItemStyle: nome === 'perfil' || (nome === 'historico' && perfil === 'admin')
                ? { display: 'none' }
                : undefined,
              tabBarIcon: ({ color }) => <Ionicons name={configuracao.icone} size={24} color={typeof color === 'string' ? color : undefined} />,
            }}
          />
        );
      })}
    </Tabs>
  );
}