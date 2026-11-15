# Calendário acadêmico e ações de chamada

## Causa e correção

Início e Turmas convertiam sábado/domingo em segunda-feira e utilizavam o fuso do dispositivo. A chave diária UTC do gravador legado também podia divergir da data acadêmica.

O calendário agora usa explicitamente America/Bahia via Intl/IANA. Dia da semana, cabeçalho, saudação e intervalo diário não dependem do fuso do dispositivo. A semana de segunda a sexta permanece visível nos fins de semana, sem destacar segunda como hoje. Pendências incluem somente aulas do dia civil atual na Bahia; sábado e domingo ficam vazios no contrato atual (diaId 1–5).

O hook atualiza na meia-noite local, ao receber foco e ao retornar ao aplicativo. A grade inclui a data na identidade da requisição e ignora respostas iniciadas no dia anterior. A consulta de Chamada sem ID histórico também muda de chave na virada do dia; consulta por chamadaId permanece vinculada ao registro exato.

## Leituras diárias limitadas

Por turma autorizada, a consulta usa:

- turmaId == ID autorizado;
- dataChamada >= início do dia Bahia em ISO UTC;
- dataChamada < início do próximo dia Bahia em ISO UTC;
- orderBy dataChamada desc;
- limit 1.

Não consulta toda a coleção, não busca todo o histórico da turma para filtrar o dia no cliente e não usa dataChamadaFormatada como prova temporal. O filtro local restante apenas valida o único candidato retornado; não é uma varredura de registros. Uma consulta por turma válida é mantida, como no MVP anterior.

O formato indexável considerado canônico é o produzido pelo antigo gravador: new Date().toISOString(), com milissegundos e Z, armazenado como string. Assim a ordenação lexical coincide com a temporal. Candidato fora desse formato ou fora do intervalo falha explicitamente, sem presumir data ou declarar chamada pendente.

A consulta retorna o diário mais recente do dia para os indicadores; os demais continuam acessíveis pelo Histórico. O serviço retorna seu ID e o botão de consulta abre esse registro exato. Consultas por chamadaId usam turmaId, documentId e limit 1, sem carregar todos os diários da turma.

## Índice local e publicação separada

firestore.indexes.json declara chamadas: turmaId ASC e dataChamada DESC, escopo COLLECTION. firebase.emulator.json referencia esse arquivo apenas na configuração local. Nenhum índice foi criado no Firebase compartilhado.

Em produção, o índice pode precisar ser criado após revisão e autorização próprias. Se a consulta falhar por precondição/configuração, a grade semanal é preservada e os indicadores/pendências diárias ficam indisponíveis com mensagem clara. Não há fallback para consulta ampla. Falhas de conexão/autorização continuam com tratamento explícito, sem dados parciais que pareçam resultados completos.

O emulador valida a consulta e as regras, mas não comprova disponibilidade nem desempenho do índice composto publicado. O inventário de índices e eventuais isenções do projeto não foi consultado nesta etapa.

## Compatibilidade e limites dos históricos

Nenhum documento histórico foi alterado. O histórico aceita instantes ISO com fuso explícito (UTC Z ou offset), validando componentes para não normalizar datas impossíveis. Datas sem fuso, valores ausentes/inválidos e datas civis isoladas são apresentadas como Data não informada, sem inferência.

Para os indicadores indexados, formatos mistos (Timestamp, strings com offset, ISO não canônico) não têm garantia de descoberta/ordenação correta. Não se faz scan para compensar essa ambiguidade; podem ficar somente no Histórico ou provocar aviso de dados inválidos se forem o candidato retornado. A ausência de indicador significa nenhum diário identificável pela consulta confiável, não prova de inexistência de registros históricos.

Não usamos criadoEm como substituto de ocorrência acadêmica. O legado dataChamada é instante de registro; não prova uma data letiva retroativa. O futuro contrato deve decidir dataLetiva em America/Bahia e um Timestamp de ocorrência/registro bem definido, com plano de normalização explicitamente aprovado. Não há migração automática nem nova gravação nesta etapa.

A data atual depende de o relógio do aparelho estar correto; o fuso do aparelho não altera a interpretação. O aplicativo não recebe aqui um relógio autoritativo do servidor para auditoria de novas gravações, pois criação e assinatura continuam bloqueadas.

O histórico geral existente continua sendo uma leitura por turma autorizada; paginação desse arquivo histórico é uma evolução separada. A correção dos indicadores não introduziu nem ampliou essa leitura.

## Ações da interface

- Não há Fazer chamada nem ação de assinatura nas telas refinadas.
- Cartões de pendências são informativos, com indicação de criação indisponível.
- Turmas sem diário identificável não têm ação de registro; exibem indisponibilidade ou ausência de aula prevista hoje.
- Com diário identificado, há somente Consultar diário, passando turmaId e chamadaId.
- Históricos existentes continuam em modo somente leitura; URLs não conferem privilégios.

## Verificações

Os testes cobrem dias úteis, sábado/domingo, fronteiras inclusiva/exclusiva, virada UTC antes da virada Bahia, mês/ano, três fusos de dispositivo, atualização por timer/foco/retorno, descarte de respostas antigas e ausência de ações de criação. Testes do emulador verificam consultas por intervalo, último registro do dia, exclusão de turma alheia e recusa de formatos temporais não canônicos nos indicadores.

Os testes existentes de autorização e regressão são executados em sequência no projeto demo. As únicas gravações são fixtures sintéticas no emulador, sem acesso ao Firebase publicado. Não houve instalação, alteração de regras publicadas, migração, commit ou push. package-lock.json e alterações fora do escopo são preservados por comparação de hash.

## Resultado final e arquivos

117 testes passaram: 48 sem rede e 69 no emulador (39 de regras, 10 de turmas, 14 acadêmicos e seis do calendário indexado). TypeScript mantém os oito erros preexistentes: quatro de cores em src/app/(tabs)/_layout.tsx e quatro imports/exportações em src/components/ui/collapsible.tsx. Nenhum novo erro. git diff --check, sintaxe dos testes e JSON passaram. A primeira tentativa de teste com subprocessos foi impedida pelo sandbox; a execução autorizada final passou nos três fusos, sem acesso de rede desses testes.

Fontes modificadas:

- src/app/(tabs)/index.tsx
- src/app/(tabs)/turmas.tsx
- src/app/chamada.tsx
- src/hooks/use-grade-turmas.ts
- src/services/turmas.ts
- src/services/chamadas.ts
- src/types/turma.ts
- src/types/chamada.ts

Novas fontes/configuração:

- src/utils/calendario.ts
- src/hooks/use-calendario-bahia.ts
- src/services/consulta-diaria.ts
- firestore.indexes.json

Configuração local modificada: firebase.emulator.json.

Testes existentes adaptados: tests/turmas/carregar.cjs, grade.test.cjs e service-emulator.test.mjs; tests/academico/leitura.test.cjs, service-emulator.test.mjs, executar-emulador.mjs e README.md.

Criados: tests/calendario/calendario.test.cjs, relogio.test.cjs, acoes.test.cjs, service-emulator.test.mjs e README.md, além deste documento.

Nenhuma instalação, publicação ou alteração de documentos compartilhados. As gravações dos testes ficaram restritas às fixtures do projeto demo no emulador; criação e assinatura pelo aplicativo continuam indisponíveis. Os arquivos firestore.rules, package.json e package-lock.json permaneceram idênticos ao início desta etapa.
