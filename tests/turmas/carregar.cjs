const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const ts = require('typescript');
const raiz = path.resolve(__dirname, '../..');
// Executa o código real TypeScript sem importar configuração de produção.
exports.carregar = function carregar(arquivo, substitutos = {}, globais = {}) {
  const codigo = ts.transpileModule(fs.readFileSync(path.join(raiz, arquivo), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  const exports = {};
  vm.runInNewContext(codigo, { exports, require(nome) {
    if (nome in substitutos) return substitutos[nome];
    if (nome.startsWith('.')) return carregar(path.relative(raiz, path.resolve(raiz, path.dirname(arquivo), `${nome}.ts`)), substitutos, globais);
    throw new Error(`Importação não autorizada no teste: ${nome}`);
  }, ...globais }, { filename: arquivo });
  return exports;
};
