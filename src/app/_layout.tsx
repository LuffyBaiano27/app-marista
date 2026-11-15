import { Stack } from 'expo-router';
import { ActivityIndicator, Button, StyleSheet, Text, View } from 'react-native';
import { useState } from 'react';
import { perfilOperacional } from '../types/usuario';
import { AuthProvider, useAuth } from '../contexts/authContext';

function NavegacaoComSessao() {
  const { usuario, dadosPerfil, carregando, statusPerfil, erro, encerrarSessao } = useAuth();
  const [saindo, setSaindo] = useState(false);
  const [erroLogout, setErroLogout] = useState<string | null>(null);
  const acessoLiberado = !!usuario && statusPerfil === 'disponivel' && perfilOperacional(dadosPerfil);

  const sair = async () => {
    setSaindo(true);
    setErroLogout(null);
    try {
      await encerrarSessao();
    } catch {
      setErroLogout('Não foi possível encerrar a sessão. Tente novamente.');
    } finally {
      setSaindo(false);
    }
  };

  // Nenhuma tela (ou consulta interna) é montada antes da restauração e validação.
  if (carregando) {
    return (
      <View style={styles.estado}>
        <ActivityIndicator size="large" />
        <Text>Verificando sua sessão e seu perfil...</Text>
        {usuario && <Text>Se a verificação não terminar, confira a conexão ou encerre a sessão.</Text>}
        {erroLogout && <Text accessibilityRole="alert">{erroLogout}</Text>}
        {usuario && <Button title={saindo ? 'Encerrando sessão...' : 'Encerrar sessão'} disabled={saindo} onPress={() => { void sair(); }} />}
      </View>
    );
  }

  // Mantém uma saída disponível sem montar funcionalidades com perfil inválido.
  if ((usuario && !acessoLiberado) || statusPerfil === 'erro') {
    const mensagem = statusPerfil === 'inativo'
      ? 'Sua conta está inativa. Contate o responsável pelo sistema.'
      : statusPerfil === 'ausente'
      ? 'Seu perfil não foi encontrado. Contate o responsável pelo sistema.'
      : statusPerfil === 'invalido'
        ? 'Seu perfil possui dados inválidos. Contate o responsável pelo sistema.'
        : erro || 'Seu perfil está indisponível. Contate o responsável pelo sistema.';
    return (
      <View style={styles.estado}>
        <Text accessibilityRole="header">Acesso indisponível</Text>
        <Text accessibilityRole="alert">{mensagem}</Text>
        {erroLogout && <Text accessibilityRole="alert">{erroLogout}</Text>}
        <Button title={saindo ? 'Encerrando sessão...' : 'Encerrar sessão'}
          disabled={saindo} onPress={() => { void sair(); }} />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={!acessoLiberado}>
        <Stack.Screen name="index" />
      </Stack.Protected>
      <Stack.Protected guard={acessoLiberado}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="notas" />
        <Stack.Screen name="chamada" />
        <Stack.Screen name="perfil" />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <NavegacaoComSessao />
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  estado: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, gap: 16 },
});
