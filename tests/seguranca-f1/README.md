# Testes de segurança F1

Sem dependências novas. Usa os carregadores TypeScript e as ferramentas isoladas já existentes.

## Sem rede

```bash
node --test --test-isolation=none tests/calendario/calendario.test.cjs tests/calendario/relogio.test.cjs tests/calendario/acoes.test.cjs tests/turmas/grade.test.cjs tests/academico/leitura.test.cjs tests/academico/sessao.test.cjs tests/firestore/ambiente.test.mjs tests/seguranca-f1/autenticacao.test.cjs tests/seguranca-f1/suporte.test.cjs tests/seguranca-f1/interface.test.cjs
```

75 testes, incluindo 27 novos da F1. Os testes de autenticação usam observadores controlados e não criam contas no Authentication. Os componentes são executados com elementos nativos substituídos, não navegador real. Tests de fusos usam subprocessos locais; em ambiente restrito é necessária permissão para esse recurso.

## Emulador

Com Node 24, Java e ferramentas já disponíveis:

```bash
export VIOLETA_TEST_TOOLS_DIR=/tmp/violeta-firestore-tools
export PATH=/tmp/violeta-firestore-tools/node_modules/.bin:$PATH
export FIREBASE_EMULATORS_PATH=/tmp/violeta-firestore-cache/emulators
firebase emulators:exec --only firestore --project demo-violeta-tests --config firebase.emulator.json 'node tests/academico/executar-emulador.mjs'
```

82 testes em sequência: regras, turmas, acadêmicos, calendário e suporte/perfis. Cada suíte limpa suas próprias fixtures; não executar simultaneamente contra o mesmo projeto local.

Os 13 casos novos usam serviços reais transpilados, SDK cliente e regras locais. Criação/resolução e mudanças de perfis são exclusivamente sintéticas no Firestore Emulator. O observador real confirma atualização de ativação e papel. Não são usados usuários reais nem o projeto publicado.

O adaptador de runTransaction copia apenas o envelope do payload da VM para o realm do SDK, preservando FieldValue e os campos. Isso evita erro de protótipo na infraestrutura do teste; as regras continuam sendo avaliadas normalmente em todas as operações sob teste. withSecurityRulesDisabled é utilizado apenas na preparação e nas mudanças administrativas de fixtures.

Sem FIRESTORE_EMULATOR_HOST local e projeto demo válido o harness recusa executar. Não há instalação implícita, login, deploy ou credencial administrativa. Consulte docs/arquitetura/seguranca-etapa-f1.md para resultados e limitações.
