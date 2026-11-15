import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const require = createRequire(process.env.VIOLETA_TEST_TOOLS_DIR
  ? resolve(process.env.VIOLETA_TEST_TOOLS_DIR, 'package.json') : import.meta.url);
let falhou = false;
for (const pacote of ['firebase/firestore', '@firebase/rules-unit-testing']) {
  try { console.log(`OK: ${pacote}: ${require.resolve(pacote)}`); }
  catch { console.error(`AUSENTE: ${pacote}`); falhou = true; }
}
for (const [comando, argumentos] of [['java', ['-version']], ['firebase', ['--version']]]) {
  const resultado = spawnSync(comando, argumentos, { encoding: 'utf8', timeout: 15000 });
  if (resultado.status !== 0) {
    console.error(`AUSENTE OU INDISPONÍVEL: ${comando}`);
    falhou = true;
  } else console.log(`OK: ${comando}: ${(resultado.stdout || resultado.stderr).trim()}`);
}
if (falhou) {
  console.error('Instalação interrompida: nenhuma ferramenta será baixada por este script.');
  process.exitCode = 1;
}
