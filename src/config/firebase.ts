import { getApps, initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { validarConfiguracaoFirebase } from './firebase-config';

// Referências estáticas são necessárias para o Expo incorporar EXPO_PUBLIC_.
const configuracao = validarConfiguracaoFirebase({
  EXPO_PUBLIC_APP_ENV: process.env.EXPO_PUBLIC_APP_ENV,
  EXPO_PUBLIC_FIREBASE_EXPECTED_PROJECT_ID: process.env.EXPO_PUBLIC_FIREBASE_EXPECTED_PROJECT_ID,
  EXPO_PUBLIC_FIREBASE_API_KEY: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  EXPO_PUBLIC_FIREBASE_PROJECT_ID: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  EXPO_PUBLIC_FIREBASE_APP_ID: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
  EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
});

// Nunca reutiliza a instância default nem uma instância de outro projeto/ambiente.
const existente = getApps().find(candidata => candidata.name === configuracao.nomeApp);
if (existente && Object.entries(configuracao.options).some(([campo, valor]) => existente.options[campo as keyof typeof configuracao.options] !== valor)) {
  throw new Error('A configuração Firebase mudou nesta sessão. Reinicie o Expo e recarregue completamente a aplicação.');
}
const app = existente ?? initializeApp(configuracao.options, configuracao.nomeApp);
export const auth = getAuth(app);
export const db = getFirestore(app);
export default app;
