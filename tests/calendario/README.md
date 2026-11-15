# Testes de calendário e ações

Sem instalação adicional. Usa TypeScript do projeto e ferramentas isoladas da etapa B.

## Sem rede

```bash
node --test --test-isolation=none tests/calendario/calendario.test.cjs tests/calendario/relogio.test.cjs tests/calendario/acoes.test.cjs tests/turmas/grade.test.cjs tests/academico/leitura.test.cjs tests/academico/sessao.test.cjs tests/firestore/ambiente.test.mjs
```

calendario.test.cjs verifica fronteiras de data e usa subprocessos com TZ=UTC, Asia/Tokyo e America/Los_Angeles. relogio.test.cjs usa relógio, timers e AppState controlados para testar meia-noite e retorno sem aguardar tempo real. acoes.test.cjs executa o componente real com elementos nativos substituídos para verificar ausência de criação e navegação exata de consulta; não substitui validação visual de navegador/dispositivo.

## Emulador

Com ferramentas já disponíveis e Node 24:

```bash
export VIOLETA_TEST_TOOLS_DIR=/tmp/violeta-firestore-tools
export PATH=/tmp/violeta-firestore-tools/node_modules/.bin:$PATH
export FIREBASE_EMULATORS_PATH=/tmp/violeta-firestore-cache/emulators
firebase emulators:exec --only firestore --project demo-violeta-tests --config firebase.emulator.json 'node tests/academico/executar-emulador.mjs'
```

O runner executa regras, serviço de turmas, serviços acadêmicos e calendário em processos sequenciais, pois cada suíte limpa suas fixtures. service-emulator.test.mjs cobre início/fim do dia, chamada após meia-noite UTC ainda no dia anterior Bahia, autorizações, ausência de data e candidato não canônico. Não há credenciais ou imports da configuração de produção. O harness recusa host/projeto externos.

A configuração local inclui o índice proposto, mas o emulador não garante sua existência ou necessidade no projeto publicado. Nenhum índice ou regra é publicado pelos comandos acima. Instalações e futura criação do índice em produção dependem de autorização separada.
