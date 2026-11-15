# Segurança F2

26 testes novos diretos pelo SDK. Dados exclusivamente sintéticos; não criam contas no Authentication. O harness recusa destino diferente de demo-violeta-tests em 127.0.0.1:8080 antes de importar o SDK. Executar sequencialmente, sem outras suítes limpando o mesmo projeto local.

Com as ferramentas já disponíveis fora do projeto:

```sh
export VIOLETA_TEST_TOOLS_DIR=/tmp/violeta-firestore-tools
export FIREBASE_EMULATORS_PATH=/tmp/violeta-firestore-cache/emulators
export XDG_CONFIG_HOME=/tmp/violeta-firestore-cache/config
export PATH=/tmp/violeta-firestore-tools/node_modules/.bin:$PATH
firebase emulators:exec --only firestore --project demo-violeta-tests --config firebase.emulator.json 'node tests/academico/executar-emulador.mjs'
```

O runner executa os 108 testes do emulador em seis processos sequenciais; termina com erro se qualquer suíte falhar. São necessárias Java 21 e Node compatível com as ferramentas existentes. Não instalar nem usar npx com download implícito para executar esta etapa. Os 75 testes sem emulador e seu comando estão em ../seguranca-f1/README.md, totalizando 183 testes.

Fixtures usam bypass somente na preparação e simulação de mudanças administrativas. As ações afirmadas são avaliadas pelas regras. A reassociação de turma usa SDK de admin ativo, comprovando validação de vínculo e timestamps sem bypass. Todas as mutações ocorrem no emulador; aprovação local não autoriza deploy nem habilita botões.

Relatório: ../../docs/arquitetura/seguranca-etapa-f2.md.
