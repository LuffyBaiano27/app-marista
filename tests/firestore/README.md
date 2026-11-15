# Testes locais das regras Firestore — etapa B

A configuração `firebase.emulator.json` é dedicada ao emulador. Não há `.firebaserc`, alias de produção, credencial administrativa ou comando de publicação. As telas e a configuração Firebase do aplicativo não foram alteradas.

## Arquivos

- `../../firestore.rules`: política local; ainda não aprovada para publicação.
- `../../firebase.emulator.json`: somente Firestore local em 127.0.0.1:8080.
- `ambiente.mjs`: valida destino antes de inicializar SDKs.
- `ambiente.test.mjs`: testa recusa de rede/projeto externo; não exige Firebase CLI.
- `preflight.mjs`: verifica ferramentas sem instalar ou baixar nada.
- `firestore.test.mjs`: compila as regras no emulador e testa autorizações com contextos sintéticos.
- `fixtures/cenarios.json`: dados sintéticos de leitura e legado; não são documentos novos completos.
- `matriz-cenarios.md`: cenários previstos na etapa A; o relatório B distingue testes implementados e pendências.

## Ferramentas

Necessárias: Node, Java 21, Firebase CLI (`firebase-tools`), `@firebase/rules-unit-testing`, SDK `firebase` e o binário do emulador Firestore. Instalações dependem de autorização. Não usar `npx` com instalação implícita.

Nesta sessão foi autorizada instalação isolada em `/tmp/violeta-firestore-tools`, com cache npm em `/tmp/violeta-firestore-cache/npm`. O SDK Firebase foi incluído nessa instalação para compartilhar a resolução de módulos com a biblioteca de testes. `package.json` e `package-lock.json` do aplicativo permanecem intactos. Essa pasta é temporária e precisará ser recriada em outro ambiente, com autorização; versões efetivamente instaladas ficam no lock temporário e no relatório.

## Comandos locais

Executar a partir da raiz do repositório. Com ferramentas isoladas já instaladas:

```bash
export VIOLETA_TEST_TOOLS_DIR=/tmp/violeta-firestore-tools
export PATH=/tmp/violeta-firestore-tools/node_modules/.bin:$PATH
export FIREBASE_EMULATORS_PATH=/tmp/violeta-firestore-cache/emulators
node tests/firestore/preflight.mjs
node --test --test-isolation=none tests/firestore/ambiente.test.mjs
firebase emulators:exec --only firestore --project demo-violeta-tests --config firebase.emulator.json 'node --test --test-isolation=none --test-concurrency=1 tests/firestore/firestore.test.mjs'
```

O primeiro início pode baixar o emulador; isso também exige autorização. `emulators:exec` fornece FIRESTORE_EMULATOR_HOST. O harness exige exatamente 127.0.0.1:8080 e fixa projectId=demo-violeta-tests; recusa variáveis de projeto conflitantes. Não alterar o ID para um projeto real. Emuladores inicializam e limpam apenas fixtures locais, sem importar o arquivo de configuração Firebase do app.

Sem emulador, o teste falha antes de importar SDKs. Carregar regras com `initializeTestEnvironment` é a verificação de sintaxe/compilação oficial usada aqui; `node --check` verifica somente JavaScript e não substitui essa compilação. Os testes não devem ser considerados aprovados se a inicialização falhar.

## Isolamento

Dados limpos antes de cada caso; carga via `withSecurityRulesDisabled` somente no emulador. Operações sob teste usam SDK cliente e assertSucceeds/assertFails. Nenhum nome/e-mail/CPF/presença real integra as fixtures. Não executar vários processos contra este mesmo projeto/porta simultaneamente.

## Limitações deliberadas

- Criação de chamadas negada nesta versão até definir matrícula, ocorrência, unicidade e janela de registro; nenhuma exceção abre gravações acadêmicas arbitrárias.
- Gravação de turmas admite até quatro coordenadores, com margem nos limites de documentos auxiliares e expressões das regras. O teste com oito excedeu o limite de 1000 expressões. O teto anterior de dez fica pendente de revisão, não é mantido por enfraquecimento da validação.
- Chamadas históricas podem ser lidas por vínculo atual com a turma, sem inventar autor. Órfãs e suporte sem autor ficam somente para admin ativo.
- Regras não verificam a existência de conta no Authentication; verificam perfil provisionado pelo UID. A correspondência deve ser garantida no provisionamento confiável.
- Não publicar antes de adaptar consultas, revisar contas e vínculos e aprovar os contratos pendentes.
