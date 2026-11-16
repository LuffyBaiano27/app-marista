const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { spawnSync } = require('node:child_process');
const { carregar } = require('../turmas/carregar.cjs');
const { validarConfiguracaoFirebase } = carregar('src/config/firebase-config.ts');
const valido = (projectId = 'marista-app') => ({
  EXPO_PUBLIC_APP_ENV: 'homologacao', EXPO_PUBLIC_FIREBASE_PROJECT_ID: projectId,
  EXPO_PUBLIC_FIREBASE_EXPECTED_PROJECT_ID: projectId,
  EXPO_PUBLIC_FIREBASE_API_KEY: 'AIza' + 'X'.repeat(35),
  EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN: `${projectId}.firebaseapp.com`,
  EXPO_PUBLIC_FIREBASE_APP_ID: '1:123456789012:web:abcdef0123456789',
  EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: '123456789012',
  EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET: `${projectId}.firebasestorage.app`,
});
function inicializar(env, apps = []) {
  const chamadas = [];
  const substitutos = {
    'firebase/app': { getApps: () => apps, initializeApp: (options, name) => {
      const app = { options, name }; chamadas.push(['initializeApp', app]); return app;
    } },
    'firebase/auth': { getAuth: app => { chamadas.push(['getAuth', app]); return { app }; } },
    'firebase/firestore': { getFirestore: app => { chamadas.push(['getFirestore', app]); return { app }; } },
  };
  return { chamadas, executar: () => carregar('src/config/firebase.ts', substitutos, { process: { env } }) };
}

test('configuração válida retorna somente opções esperadas', () => {
  const config = validarConfiguracaoFirebase(valido());
  assert.equal(config.ambiente, 'homologacao'); assert.equal(config.options.projectId, 'marista-app');
  assert.equal(config.nomeApp, 'violeta-homologacao-marista-app');
  assert.deepEqual(Object.keys(config.options).sort(), ['apiKey', 'appId', 'authDomain', 'messagingSenderId', 'projectId', 'storageBucket']);
});
for (const campo of Object.keys(valido())) {
  for (const [tipo, valor] of [['ausente', undefined], ['vazio', ''], ['espaços', '   '], ['tipo inválido', true]]) {
    test(`${campo}: ${tipo} bloqueia antes de inicializar SDKs`, () => {
      const teste = inicializar({ ...valido(), [campo]: valor });
      assert.throws(teste.executar, /Configuração Firebase inválida/);
      assert.equal(teste.chamadas.length, 0);
    });
  }
}
for (const [campo, valor] of [
  ['EXPO_PUBLIC_APP_ENV', 'producao'], ['EXPO_PUBLIC_APP_ENV', 'desenvolvimento'],
  ['EXPO_PUBLIC_APP_ENV', 'Homologacao'], ['EXPO_PUBLIC_FIREBASE_PROJECT_ID', 'PROJETO_INVALIDO'],
  ['EXPO_PUBLIC_FIREBASE_EXPECTED_PROJECT_ID', 'outro-projeto-hml'],
  ['EXPO_PUBLIC_FIREBASE_API_KEY', 'chave-invalida'],
  ['EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN', 'outro-projeto.firebaseapp.com'],
  ['EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN', 'https://marista-app.firebaseapp.com'],
  ['EXPO_PUBLIC_FIREBASE_APP_ID', '1:999999999999:web:abcdef'],
  ['EXPO_PUBLIC_FIREBASE_APP_ID', '1:123456789012:android:abcdef'],
  ['EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID', '1e12'],
  ['EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET', 'outro-projeto.appspot.com'],
  ['EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET', 'gs://marista-app.firebasestorage.app'],
]) {
  test(`${campo} rejeita formato ou ambiente incompatível: ${valor}`, () => {
    const teste = inicializar({ ...valido(), [campo]: valor });
    assert.throws(teste.executar, /Configuração Firebase inválida/); assert.equal(teste.chamadas.length, 0);
  });
}
for (const projeto of ['outro-projeto-hml', 'demo-violeta-tests']) {
  test(`não conecta ao destino bloqueado ${projeto} mesmo com esperado igual`, () => {
    const teste = inicializar(valido(projeto));
    assert.throws(teste.executar, /Configuração Firebase inválida/); assert.equal(teste.chamadas.length, 0);
  });
}
test('bucket legado appspot é aceito somente para o projeto validado', () => {
  const config = validarConfiguracaoFirebase({ ...valido(), EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET: 'marista-app.appspot.com' });
  assert.equal(config.options.storageBucket, 'marista-app.appspot.com');
});
test('sem variáveis não usa fallback, default app ou inicialização parcial', () => {
  const teste = inicializar({}, [{ name: '[DEFAULT]', options: { projectId: 'marista-app' } }]);
  assert.throws(teste.executar, /Nenhum projeto alternativo/); assert.equal(teste.chamadas.length, 0);
});
test('Auth e Firestore recebem a mesma instância aprovada, nunca a default', () => {
  const teste = inicializar(valido(), [{ name: '[DEFAULT]', options: { projectId: 'marista-app' } }]);
  const resultado = teste.executar();
  assert.deepEqual(teste.chamadas.map(c => c[0]), ['initializeApp', 'getAuth', 'getFirestore']);
  assert.equal(resultado.auth.app, resultado.db.app); assert.equal(resultado.default, resultado.auth.app);
  assert.equal(resultado.default.name, 'violeta-homologacao-marista-app');
});
test('recarregamento reutiliza apenas app com nome e opções idênticos', () => {
  const config = validarConfiguracaoFirebase(valido()); const app = { name: config.nomeApp, options: config.options };
  const teste = inicializar(valido(), [app]); const resultado = teste.executar();
  assert.equal(resultado.default, app); assert.deepEqual(teste.chamadas.map(c => c[0]), ['getAuth', 'getFirestore']);
});
test('opções alteradas no mesmo app exigem reinício antes de Auth/Firestore', () => {
  const config = validarConfiguracaoFirebase(valido());
  const teste = inicializar(valido(), [{ name: config.nomeApp, options: { ...config.options, apiKey: 'configuracao-anterior' } }]);
  assert.throws(teste.executar, /Reinicie o Expo/); assert.equal(teste.chamadas.length, 0);
});
test('destino alternativo é negado mesmo quando ID esperado e campos são coerentes', () => {
  const primeiro = inicializar(valido()).executar();
  const teste = inicializar(valido('segundo-sintetico-hml'), [primeiro.default]);
  assert.throws(teste.executar, /Configuração Firebase inválida/);
  assert.equal(teste.chamadas.length, 0);
});
test('ID esperado de outro projeto não autoriza o projeto permitido nem cria fallback', () => {
  const teste = inicializar({ ...valido(), EXPO_PUBLIC_FIREBASE_EXPECTED_PROJECT_ID: 'outro-projeto-hml' });
  assert.throws(teste.executar, /Configuração Firebase inválida/); assert.equal(teste.chamadas.length, 0);
});
test('erro informa campo mas não revela valores da configuração', () => {
  const env = { ...valido(), EXPO_PUBLIC_FIREBASE_API_KEY: 'VALOR_NAO_DEVE_VAZAR' };
  assert.throws(() => validarConfiguracaoFirebase(env), erro => erro.message.includes('EXPO_PUBLIC_FIREBASE_API_KEY') && !erro.message.includes(env.EXPO_PUBLIC_FIREBASE_API_KEY));
});
test('leitura Expo é estática para todas as variáveis, sem destructuring', () => {
  const codigo = fs.readFileSync('src/config/firebase.ts', 'utf8');
  for (const campo of Object.keys(valido())) assert.ok(codigo.includes(`process.env.${campo}`));
  assert.doesNotMatch(codigo, /process\.env\[|\}\s*=\s*process\.env/);
});
test('exemplo compartilhado é válido sem preenchimento e contém somente configuração pública esperada', () => {
  const exemplo = Object.fromEntries(fs.readFileSync('.env.example', 'utf8').split('\n').filter(l => l && !l.startsWith('#')).map(l => { const i = l.indexOf('='); return [l.slice(0, i), l.slice(i + 1)]; }));
  assert.deepEqual(Object.keys(exemplo).sort(), Object.keys(valido()).sort());
  const config = validarConfiguracaoFirebase(exemplo); // Função pura; não inicializa SDK ou rede.
  assert.equal(config.options.projectId, 'marista-app');
  assert.equal(config.ambiente, 'homologacao');
  assert.ok(Object.values(exemplo).every(v => v && !v.includes('SUBSTITUA')));
});
test('Git ignora arquivos de ambiente/credenciais e permite .env.example', () => {
  for (const caminho of ['.env.local', '.env.production', 'service-account-teste.json', 'teste-firebase-adminsdk-demo.json']) {
    assert.equal(spawnSync('git', ['check-ignore', '--no-index', '-q', caminho]).status, 0, caminho);
  }
  assert.equal(spawnSync('git', ['check-ignore', '--no-index', '-q', '.env.example']).status, 1);
});
