# Integração de Início e Turmas — etapa C

## Implementação

Somente as telas Início e Turmas foram modificadas. Tipos, serviço e hook novos centralizam apresentação e leitura. AuthContext, outras telas, contratos de gravação, regras e manifestos foram preservados.

Fluxo:

1. Hook obtém a identidade do AuthContext.
2. Serviço lê o próprio perfil no servidor, valida nome/role e exige ativo=true; o role deve corresponder ao contexto. Ausência/inconsistência nega o acesso, sem fallback.
3. Professor consulta professorId==UID; coordenador consulta coordenadorIds array-contains UID; administrador consulta todas as turmas.
4. Validador adapta somente campos de apresentação. `materia` é alternativa legada para disciplina; turno ausente recebe texto informativo. Não cria vínculos. Documento inválido é contado e omitido com aviso visível. ID do snapshot prevalece sobre campo id armazenado.
5. As duas telas recebem a mesma ordenação por dia, horário e ID.
6. Para cada turma validada retornada, consulta chamadas com turmaId e dataChamadaFormatada. Nenhuma consulta somente por data ou coleção geral de chamadas é usada, inclusive para admin.
7. Resultado completo substitui a grade; erro não é convertido em lista vazia ou chamada pendente. Em erro de uma consulta de chamadas, a grade inteira é descartada para não exibir indicadores falsos.

O serviço usa leitura obrigatória do servidor. Sem conexão, exibe erro e nova tentativa; não trata cache sem confirmação como acesso atual. Regras publicadas ainda têm as fragilidades conhecidas: esta mudança não substitui a futura publicação da política validada.

## Indicadores e contrato legado

A chave diária UTC foi preservada porque o gravador atual usa toISOString().split('T')[0]. Alterar a data letiva para America/Bahia exige adequação coordenada do gravador e dados, fora desta etapa. A diferença de dia perto da meia-noite UTC continua uma limitação do contrato legado.

Nenhuma presença de aluno é usada na montagem dos indicadores. Os documentos lidos pertencem apenas às turmas autorizadas. O SDK cliente lê o documento completo; não há projeção de campos neste fluxo. Uma futura coleção de resumos pode reduzir transferência, mas não foi criada sem necessidade nesta etapa.

Se houver duplicatas, o indicador escolhe o horário válido mais recente. Se houver chamada com dataChamada inválida, mantém REALIZADA com horário indisponível, em vez de liberar um novo registro por ausência de horário. Duplicatas não são corrigidas nem excluídas.

Turmas inválidas não geram consulta de chamadas. Turmas demonstrativas não são atribuídas: professor sem vínculo UID vê lista vazia; coordenador sem atribuição vê lista vazia; admin pode ver demonstrações que tenham campos visuais válidos.

## Sessão e consistência

O mesmo hook é usado nas duas telas, com atualização ao receber foco e por gesto/nova tentativa. Dados antigos são removidos ao atualizar e ocultados imediatamente em mudança de identidade. Um contador ignora respostas de refresh anterior; limpeza de foco/sessão invalida a requisição e interrompe próximas consultas sequenciais. O serviço não pode cancelar uma requisição já enviada, mas não publica sua resposta obsoleta.

As telas usam a mesma política, validador e ordenação; não existe cache global nem snapshot transacional compartilhado. Alterações concorrentes no banco podem produzir fotografias distintas entre carregamentos. Ao voltar a uma aba, ela atualiza pelo mesmo serviço.

## Custo e limites

Uma leitura de perfil, uma consulta de turmas e uma consulta de chamadas por turma válida. Consultas de chamadas são sequenciais para evitar pico de requisições. Adequado ao MVP; grandes grades exigirão medição e eventual agregação/paginação. Não houve novo índice, coleção ou dependência.

## Validação manual sem gravação

Usar apenas contas previamente provisionadas com ativo=true. Se esse campo não existir, esperar mensagem de acesso indisponível; não ativar automaticamente e não editar os dados como parte deste teste.

- Professor: conferir nome/cargo e somente turmas com professorId igual ao próprio UID nas duas abas. Sem vínculo real, esperar lista vazia, mesmo que existam prof_1/prof_3 no banco.
- Coordenador: conferir somente turmas cuja coordenadorIds contenha seu UID. Campo ausente ou lista vazia não dá acesso. Sem atribuições, lista vazia.
- Admin: conferir visão geral e aviso sobre documentos inválidos; dados demonstrativos não mudam de responsável.
- Para todos: testar busca, ordenação, grade semanal, indicadores, atualização e retorno à aba. Em rede indisponível, esperar falha de conexão, nunca tudo pronto. Trocar conta e verificar ausência de dados da sessão anterior.
- Navegação pode ser conferida abrindo a turma, mas não assinar chamada, injetar dados, criar admin ou operar suporte. Outras telas continuam fora do escopo e podem ter consultas amplas.

## Resultado local

Testes sem rede: doze cenários passaram, cobrindo adaptação, filtros, cancelamento, erros e ciclo de sessão. Serviço real com regras no emulador: dez cenários passaram para professores distintos, coordenadores com/sem atribuição, admin, legados/inativos/perfis inválidos e tentativa de informar papel superior. Os testes sintéticos confirmam indicadores limitados às turmas retornadas.

TypeScript apresenta os oito erros preexistentes (layout das abas e collapsible), sem novos. Diff e preservação dos demais arquivos foram verificados. Regressão das regras: 39 testes passaram. Isolamento do ambiente: três testes passaram. Total: 64 testes, sem falhas.

Não houve leitura ou escrita de dados de produção durante os testes, publicação de regras, instalação, commit ou push. As únicas escritas de teste ocorreram no emulador demo.
