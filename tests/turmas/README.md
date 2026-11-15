# Testes da integração de turmas — etapa C

Sem dependências novas. `carregar.cjs` transpila o código TypeScript real com o TypeScript já instalado. Não importa a configuração Firebase publicada. Substitutos só existem nos testes.

## Testes sem rede

```bash
node --test --test-isolation=none tests/turmas/grade.test.cjs
node --test --test-isolation=none tests/firestore/ambiente.test.mjs
```

O primeiro arquivo verifica validação de documentos, filtros, lista vazia, indisponibilidade, cancelamento, troca de sessão e concorrência de refresh. O ciclo do hook usa um harness de hooks, sem renderizador React; não substitui validação visual.

## Serviço real no emulador

Reutiliza as ferramentas isoladas autorizadas na etapa B; nenhuma instalação implícita:

```bash
export VIOLETA_TEST_TOOLS_DIR=/tmp/violeta-firestore-tools
export PATH=/tmp/violeta-firestore-tools/node_modules/.bin:$PATH
export FIREBASE_EMULATORS_PATH=/tmp/violeta-firestore-cache/emulators
firebase emulators:exec --only firestore --project demo-violeta-tests --config firebase.emulator.json 'node --test --test-isolation=none --test-concurrency=1 tests/turmas/service-emulator.test.mjs'
```

Exige Node 24 e ferramentas já disponíveis. O harness valida host/projeto antes de carregar SDKs. As únicas gravações são a preparação sintética do emulador com regras desabilitadas; a operação de produção testada contém apenas leituras. Execute separadamente da suíte de regras, pois ambas limpam o mesmo projeto sintético.

O SDK das ferramentas isoladas é usado na integração (firebase 13.3.0), enquanto a aplicação mantém seu SDK instalado. A verificação TypeScript usa as dependências da aplicação. A validação de interface e rede real continua sendo manual.
