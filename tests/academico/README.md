# Testes da etapa D

Dados exclusivamente sintéticos; nenhuma instalação adicional. Reutiliza TypeScript do projeto e ferramentas temporárias da etapa B.

## Sem rede

```bash
node --test --test-isolation=none tests/academico/leitura.test.cjs tests/academico/sessao.test.cjs tests/turmas/grade.test.cjs tests/firestore/ambiente.test.mjs
```

29 testes: validação de presenças, ausência de turmas, queries por vínculo, acesso direto, dados inválidos, falhas, cancelamento, troca de URL/sessão e regressão da grade. Os hooks são executados com harness local; não são testes de renderização visual ou navegador.

## Emulador

Com Node 24 e ferramentas já instaladas, a partir da raiz:

```bash
export VIOLETA_TEST_TOOLS_DIR=/tmp/violeta-firestore-tools
export PATH=/tmp/violeta-firestore-tools/node_modules/.bin:$PATH
export FIREBASE_EMULATORS_PATH=/tmp/violeta-firestore-cache/emulators
firebase emulators:exec --only firestore --project demo-violeta-tests --config firebase.emulator.json 'node tests/academico/executar-emulador.mjs'
```

O runner verifica o destino local e executa processos separados em sequência: 39 testes de regras, 10 testes do serviço de turmas e 14 testes de histórico/diário seis testes do calendário indexado e 13 testes de suporte/perfis F1. Não executar essas suítes simultaneamente no mesmo projeto, pois cada caso limpa suas fixtures.

A preparação grava somente no emulador via withSecurityRulesDisabled. Os serviços sob teste são o código TypeScript real, transpilado pelo carregador existente, usando SDK cliente com as regras locais. Não importam a configuração de produção. O projeto é fixado em demo-violeta-tests; sem host/projeto local válido a execução é recusada.

Os 14 casos acadêmicos cobrem os três papéis, professor sem turmas, coordenador sem atribuição, URLs alheias, troca apenas do ID do diário, tentativa de informar papel superior e ausência real de diário do dia. Testes unitários também simulam resposta de servidor com regra ampla para conferir a defesa de vínculo do cliente.

SDK de integração: a versão das ferramentas isoladas (firebase 13.3.0). TypeScript usa as dependências reais do aplicativo. Acesso por URL é testado no limite serviço/parâmetros, não com automação de navegador.

Não há comando de instalação implícita nem de deploy. Configuração, fontes das regras e dados publicados não são modificados. Consulte docs/arquitetura/integracao-etapa-d.md para impactos e roteiro visual.
