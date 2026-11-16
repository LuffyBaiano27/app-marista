import type { FirebaseOptions } from 'firebase/app';

type VariaveisFirebase = Record<string, unknown>;
export interface ConfiguracaoFirebase {
  ambiente: 'homologacao';
  nomeApp: string;
  options: Required<Pick<FirebaseOptions, 'apiKey' | 'authDomain' | 'projectId' | 'appId' | 'messagingSenderId' | 'storageBucket'>>;
}

function falhar(campo: string): never {
  // Identifica o campo, sem expor seu conteúdo ou outros valores do ambiente.
  throw new Error(`Configuração Firebase inválida: ${campo}. Configure o ambiente de homologação em .env.local e reinicie o Expo. Nenhum projeto alternativo será utilizado.`);
}
function obrigatoria(variaveis: VariaveisFirebase, campo: string): string {
  const valor = variaveis[campo];
  if (typeof valor !== 'string' || !valor || valor !== valor.trim()) return falhar(campo);
  return valor;
}

// Homologação é um modo de teste na base compartilhada, não um segundo projeto.
// Validação local evita destinos acidentais; autorização continua nas regras do servidor.
export function validarConfiguracaoFirebase(variaveis: VariaveisFirebase): ConfiguracaoFirebase {
  const ambiente = obrigatoria(variaveis, 'EXPO_PUBLIC_APP_ENV');
  if (ambiente !== 'homologacao') falhar('EXPO_PUBLIC_APP_ENV');
  const projectId = obrigatoria(variaveis, 'EXPO_PUBLIC_FIREBASE_PROJECT_ID');
  const esperado = obrigatoria(variaveis, 'EXPO_PUBLIC_FIREBASE_EXPECTED_PROJECT_ID');
  if (projectId !== 'marista-app' || esperado !== 'marista-app') {
    falhar('EXPO_PUBLIC_FIREBASE_PROJECT_ID / EXPO_PUBLIC_FIREBASE_EXPECTED_PROJECT_ID');
  }
  const apiKey = obrigatoria(variaveis, 'EXPO_PUBLIC_FIREBASE_API_KEY');
  if (!/^AIza[A-Za-z0-9_-]{35}$/.test(apiKey)) falhar('EXPO_PUBLIC_FIREBASE_API_KEY');
  const authDomain = obrigatoria(variaveis, 'EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN');
  if (authDomain !== `${projectId}.firebaseapp.com`) falhar('EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN');
  const messagingSenderId = obrigatoria(variaveis, 'EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID');
  if (!/^[1-9][0-9]*$/.test(messagingSenderId)) falhar('EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID');
  const appId = obrigatoria(variaveis, 'EXPO_PUBLIC_FIREBASE_APP_ID');
  const partesApp = /^1:([0-9]+):web:([a-f0-9]+)$/.exec(appId);
  if (!partesApp || partesApp[1] !== messagingSenderId) falhar('EXPO_PUBLIC_FIREBASE_APP_ID');
  const storageBucket = obrigatoria(variaveis, 'EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET');
  if (![`${projectId}.firebasestorage.app`, `${projectId}.appspot.com`].includes(storageBucket)) falhar('EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET');
  return { ambiente: 'homologacao', nomeApp: `violeta-homologacao-${projectId}`,
    options: { apiKey, authDomain, projectId, appId, messagingSenderId, storageBucket } };
}
