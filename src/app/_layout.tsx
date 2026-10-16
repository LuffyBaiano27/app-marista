import { Stack } from 'expo-router';
import { AuthProvider } from '../contexts/authContext';

export default function RootLayout() {
  return (
    // O AuthProvider "abraça" o app inteiro. Agora qualquer tela sabe quem está logado!
    <AuthProvider>
      <Stack screenOptions={{ headerShown: false }}>
        {/* A tela de login (index) */}
        <Stack.Screen name="index" />
        
        {/* As abas internas e telas por cima */}
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="notas" />
        <Stack.Screen name="chamada" />
        <Stack.Screen name="perfil" />
      </Stack>
    </AuthProvider>
  );
}