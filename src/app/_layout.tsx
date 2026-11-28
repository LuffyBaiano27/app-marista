import React from 'react';
import { Stack } from 'expo-router';
import { AuthProvider } from '../contexts/authContext';
import { DemoProfileProvider } from '../contexts/demoProfileContext';

export default function RootLayout() {
  return (
    <AuthProvider>
      <DemoProfileProvider>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="notas" />
          <Stack.Screen name="chamada" />
        </Stack>
      </DemoProfileProvider>
    </AuthProvider>
  );
}