# Relatório de validação — etapa B

Data: 15/11/2026. Branch: feat/integracao-perfis-usuarios.

## Ambiente e isolamento

Instalação autorizada isolada em /tmp/violeta-firestore-tools, sem alterar manifestos do app:

- Node 24.22.0; Java 21.0.13.
- firebase-tools 15.36.0.
- @firebase/rules-unit-testing 6.0.0.
- SDK firebase 13.3.0 da ferramenta isolada (o aplicativo mantém sua própria versão).
- Emulador Firestore 1.22.0, projeto demo-violeta-tests, host 127.0.0.1:8080.

Pacotes e binário baixados após autorização. Nenhum login administrativo, publicação ou acesso ao banco compartilhado. Os testes não importam src/config/firebase.js. FIRESTORE_EMULATOR_HOST ausente ou destino/projeto conflitante interrompe o harness antes dos SDKs.

## Resultados finais

| Verificação | Resultado |
| --- | --- |
| Compilação das regras por initializeTestEnvironment | Passou no emulador |
| firestore.test.mjs | 39 testes passaram; zero falhas/cancelamentos/ignorados |
| ambiente.test.mjs | 3 testes passaram; zero falhas |
| Tentativa de executar sem variável do emulador | Recusada antes de carregar SDK, conforme esperado |
| node --check nos módulos de teste | Passou |
| JSON da configuração e fixtures | Válido |
| git diff --check | Passou |
| TypeScript do aplicativo | 8 erros preexistentes; nenhum novo |

Os oito erros são quatro incompatibilidades de cor em src/app/(tabs)/_layout.tsx e quatro imports/exportações ausentes em src/components/ui/collapsible.tsx. Não foram corrigidos por estarem fora do escopo. Hash do package-lock.json preservado: 6dfa4077e81cf4bc2315e8c080b573de5b7fda5deacf0d106c78af544ad3ff50.

## Cobertura

- Sem sessão/perfil, inativo, ativo ausente ou inválido, role inválido e nome inválido.
- Diagnóstico do próprio perfil legado/inativo; bloqueio da leitura de perfil alheio por professor/coordenador.
- Alteração de nome legítima; rejeição de mudanças de autoridade, substituição de documento, criação de admin e lote de escalada de privilégio.
- Claims arbitrárias e e-mail não conferem autoridade.
- Professor: consulta própria, consulta vazia válida e bloqueio de turma alheia/demonstrativa.
- Coordenador: get e array-contains autorizado; ausência, atribuição alheia ou formato inválido negados.
- Admin: leitura geral para revisão e gestão de turmas com referências validadas.
- Histórico: vínculo atual, consulta por turma, consulta combinada turma/data, órfãs e turma inativa.
- Recusa de consultas amplas usadas hoje pelo app para professor.
- Turma: criação/update legítimos, teto de quatro coordenadores, rejeição acima do teto, campos/tipos/referências inválidos, imutabilidade de criadoEm e negação de delete.
- Chamadas: create negado enquanto contrato pendente; update/delete negados inclusive para admin.
- Suporte: criação própria para os três perfis, autoria/timestamp/status falsificados negados, leitura própria/administrativa, resolução restrita e imutabilidade de autoria/descrição.
- Caminhos e subcoleções desconhecidos negados.

As primeiras rodadas revelaram problema de instância no teste de lote, condição de tipo incompatível com query array-contains e excesso de expressões no teto de oito coordenadores. Foram corrigidos antes da rodada final. A primeira tentativa selecionou Node 21 pelo PATH e não executou a suíte; a rodada final usou Node 24 explicitamente.

## Limitações e critérios para avançar

- Esta versão não implementa o registro acadêmico completo: create de chamadas permanece fechado até definir matrícula, ocorrência, prazo e unicidade. Isso deve ser resolvido antes de publicar, com testes positivos e negativos próprios.
- Teto técnico local de quatro coordenadores precisa ser aceito ou a modelagem revista; contrato A previa até dez.
- Novos contratos e queries ainda não estão integrados ao app; o próprio validador atual de perfil não exige ativo. Não publicar agora.
- Testes são de regras no emulador, não testes de interface nem garantia de integridade de cada presença na lista. Revalidar com os serviços e a versão do SDK do aplicativo ao integrá-los.
- A pasta de ferramentas em /tmp é temporária. Não constitui dependência instalada/versionada no projeto. Reexecução em outro ambiente requer provisionar versões compatíveis de forma autorizada.
- Contratos de criação usam timestamps do servidor; fixtures de leitura legadas deliberadamente não os inventam.

Próximo passo: revisão dos arquivos e decisões pendentes pelo usuário. Depois, completar o contrato de chamadas e só então adaptar serviços/consultas em etapa autorizada. Publicação no Firebase exige autorização separada, preparação dos dados e compatibilidade de todas as telas afetadas.
