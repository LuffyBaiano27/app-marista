import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { validarAmbiente } from '../firestore/ambiente.mjs';
validarAmbiente();
for (const arquivo of ['../firestore/firestore.test.mjs', '../turmas/service-emulator.test.mjs', './service-emulator.test.mjs', '../calendario/service-emulator.test.mjs', '../seguranca-f1/service-emulator.test.mjs', '../seguranca-f2/regras.test.mjs']) {
  const resultado = spawnSync(process.execPath,
    ['--test', '--test-isolation=none', '--test-concurrency=1', fileURLToPath(new URL(arquivo, import.meta.url))],
    { stdio: 'inherit', env: process.env });
  if (resultado.status !== 0) {
    process.exitCode = resultado.status || 1;
    break;
  }
}
