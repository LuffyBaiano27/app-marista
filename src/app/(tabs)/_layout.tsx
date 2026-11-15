import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { cores } from '../../constants/colors';
import { useColorScheme } from 'react-native';

export default function TabLayout() {
  const isDarkMode = useColorScheme() === 'dark';
  const tema = isDarkMode ? cores.dark : cores.light;

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
      <Tabs.Screen
        name="index"
        options={{
          title: 'Início',
          tabBarIcon: ({ focused }) => <Ionicons name="home" size={24} color={focused ? tema.botaoPrimario : tema.textoSecundario} />,
        }}
      />
      <Tabs.Screen
        name="turmas"
        options={{
          title: 'Turmas',
          tabBarIcon: ({ focused }) => <Ionicons name="people" size={24} color={focused ? tema.botaoPrimario : tema.textoSecundario} />,
        }}
      />
      <Tabs.Screen
        name="historico"
        options={{
          title: 'Histórico',
          tabBarIcon: ({ focused }) => <Ionicons name="time" size={24} color={focused ? tema.botaoPrimario : tema.textoSecundario} />,
        }}
      />
      <Tabs.Screen
        name="avaliacoes"
        options={{
          title: 'Avaliações',
          tabBarIcon: ({ focused }) => <Ionicons name="document-text" size={24} color={focused ? tema.botaoPrimario : tema.textoSecundario} />,
        }}
      />
    </Tabs>
  );
}