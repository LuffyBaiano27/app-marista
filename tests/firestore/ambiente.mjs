// Importar antes de qualquer SDK. Sem fallback de rede ou ID de projeto real.
export const projectId = 'demo-violeta-tests';
export function validarAmbiente(env = process.env) {
  if (env.FIRESTORE_EMULATOR_HOST !== '127.0.0.1:8080') {
    throw new Error('Teste exige FIRESTORE_EMULATOR_HOST=127.0.0.1:8080.');
  }
  for (const chave of ['GCLOUD_PROJECT', 'GOOGLE_CLOUD_PROJECT', 'FIREBASE_PROJECT_ID']) {
    if (env[chave] && env[chave] !== projectId) {
      throw new Error(`${chave} deve ser ${projectId}.`);
    }
  }
  if (env.FIREBASE_CONFIG) {
    const config = JSON.parse(env.FIREBASE_CONFIG);
    if (config.projectId && config.projectId !== projectId) {
      throw new Error('FIREBASE_CONFIG aponta para outro projeto.');
    }
  }
  return { host: '127.0.0.1', port: 8080, projectId };
}
