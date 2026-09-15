import { Stack } from 'expo-router';
import { StatusBar } from 'react-native';

export default function RootLayout() {
  return (
    <>
      <StatusBar barStyle="light-content" />
      <Stack screenOptions={{ headerShown: false }}>
        {/* A tela de login (index.tsx) */}
        <Stack.Screen name="index" />
        
        {/* A futura pasta de abas que vamos criar */}
        <Stack.Screen name="(tabs)" />
      </Stack>
    </>
  );
}