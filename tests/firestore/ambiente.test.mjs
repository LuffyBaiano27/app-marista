import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validarAmbiente, projectId } from './ambiente.mjs';

test('recusa ausência de emulador e destinos remotos', () => {
  for (const host of [undefined, '', 'firestore.googleapis.com:443', '0.0.0.0:8080']) {
    assert.throws(() => validarAmbiente({ FIRESTORE_EMULATOR_HOST: host }));
  }
});
test('recusa IDs de projeto externos inclusive FIREBASE_CONFIG', () => {
  for (const chave of ['GCLOUD_PROJECT', 'GOOGLE_CLOUD_PROJECT', 'FIREBASE_PROJECT_ID']) {
    assert.throws(() => validarAmbiente({ FIRESTORE_EMULATOR_HOST: '127.0.0.1:8080', [chave]: 'outro-projeto' }));
  }
  assert.throws(() => validarAmbiente({ FIRESTORE_EMULATOR_HOST: '127.0.0.1:8080', FIREBASE_CONFIG: '{"projectId":"outro-projeto"}' }));
});
test('aceita exclusivamente o destino local do projeto demo', () => {
  assert.deepEqual(validarAmbiente({ FIRESTORE_EMULATOR_HOST: '127.0.0.1:8080', GCLOUD_PROJECT: projectId }),
    { host: '127.0.0.1', port: 8080, projectId });
});
