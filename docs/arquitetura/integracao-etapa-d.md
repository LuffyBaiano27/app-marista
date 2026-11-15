# Consistência de autorização acadêmica — etapa D

## Diagnóstico anterior à implementação

- Histórico consultava toda a coleção turmas e toda a coleção chamadas. Os boletins e agrupamentos de Alunos e Notas eram estáticos, sem turmaId ou vínculo com a sessão.
- Avaliações não lia Firebase: listas demonstrativas de provas e professores; alternância local de papel; navegação para /notas com visao/status em parâmetros.
- Chamada buscava uma turma pelo parâmetro id e suas chamadas do dia sem verificar o vínculo no aplicativo. Iniciava com quatro alunos demonstrativos e tentava addDoc após verificar apenas que a senha não estava vazia.
- /notas podia ser aberta diretamente, com alunos/notas estáticos, troca local de perfil/prazo e ações aparentes sem persistência. Remover somente o botão em Avaliações deixaria esse acesso demonstrativo disponível.

## Comportamento implementado

O serviço de turmas agora exporta verificação do perfil ativo, listagem autorizada e seleção de turma autorizada. A mesma política das abas Início/Turmas é reutilizada, sem consultar indicadores do dia quando basta o catálogo. As consultas do serviço existente continuam iguais; os testes da etapa C cobrem sua regressão.

Histórico:

- Primeiro obtém as turmas autorizadas pelo UID e papel confirmado no próprio perfil do servidor.
- Consulta chamadas somente com where(turmaId == turma autorizada). Sem coleção geral de chamadas para nenhum papel.
- Valida registros recebidos, ordena datas no cliente e sinaliza documentos inválidos omitidos. Não inventa autores, assinaturas ou presenças.
- Abre o registro histórico exato por turmaId e chamadaId, em vez de abrir sempre o diário de hoje.
- Alunos e Notas apresenta somente as turmas autorizadas e informa que boletins anteriores eram demonstrativos. Nenhuma nota ou matrícula nova é inferida a partir dos registros de chamada ou de nomes.

Avaliações:

- Usa papel real do AuthContext e catálogo autorizado validado no servidor.
- Remove alternância de papel e provas fictícias. Exibe turmas permitidas, título apropriado ao papel e aviso de que avaliações não estão integradas.
- Não cria coleção, contrato ou persistência de avaliações. Não autoriza edição de notas.

Chamada:

- Parâmetros de URL não conferem autoridade. A turma é selecionada do conjunto consultado com escopo autorizado; não é feito get de turma alheia para depois decidir se pode exibi-la.
- Para chamadaId explícito, busca registros somente da turma autorizada e seleciona o ID solicitado. Não baixa registros de outra turma por ID arbitrário.
- Sem chamadaId, lê os registros da turma para a data legada de hoje. Sem registro, exibe ausência real, sem lista fictícia.
- Modo somente leitura: mostra as presenças e observações gravadas e a quantidade de aulas registrada, sem segundo horário fictício.
- Não há import ou operação de gravação, exclusão, edição de presença ou assinatura. O bloqueio da criação nas regras locais continua intacto e está explicado na interface.

Notas:

- A rota permanece disponível como página informativa, sem alunos/notas de exemplo, parâmetros de privilégio ou controle de prazo.
- Restrição temporária necessária para fechar o acesso direto ao protótipo. Nenhuma operação real de notas existia no fluxo analisado.

## Sessão, estados e limites

O hook useLeituraAcademica é reutilizado nas três telas com leitura. Limpa resultados ao atualizar, oculta dados imediatamente ao mudar conta/URL/papel e ignora respostas anteriores ou concluídas após perda de foco. Verificações entre requisições interrompem novas leituras de uma carga cancelada. Requisição já enviada não pode ser desfeita, mas sua resposta obsoleta não é apresentada.

Carregamento, ausência de dados, permissão negada, dados inválidos e conexão indisponível têm tratamentos separados, com nova tentativa. As telas mantêm tema, cabeçalhos, busca de histórico, abas e navegação legítima. O agrupamento de alunos fictícios e os botões de ações demonstrativas foram substituídos por mensagens claras.

O histórico é consultado por turma e ordenado localmente; não há paginação nesta versão do MVP. Não consulta órfãs nem turmas inválidas para construir um painel administrativo genérico. Revisão desses documentos continua sendo atividade administrativa separada. A data diária UTC do legado não foi alterada.

Os registros são snapshots históricos de alunos, não um cadastro de matrícula. Uma presença inválida não é convertida em true/false por coerção: registro inválido é omitido com aviso no histórico e bloqueado na consulta direta. Ausência de data pode ser apresentada como Data não informada.

Regras publicadas continuam amplas conforme diagnóstico anterior. Esta proteção no cliente reduz a exposição nos fluxos alterados, mas não corrige o servidor nem revoga dados já baixados. Perfil/suporte e atalhos administrativos na tela Perfil permanecem fora desta integração acadêmica e precisam de etapa própria antes da publicação da política definitiva.

## Arquivos desta etapa

Modificados:

- src/services/turmas.ts
- src/app/(tabs)/historico.tsx
- src/app/(tabs)/avaliacoes.tsx
- src/app/chamada.tsx
- src/app/notas.tsx

Criados:

- src/types/chamada.ts
- src/services/chamadas.ts
- src/hooks/use-leitura-academica.ts
- tests/academico/leitura.test.cjs
- tests/academico/sessao.test.cjs
- tests/academico/service-emulator.test.mjs
- tests/academico/executar-emulador.mjs
- tests/academico/README.md
- docs/arquitetura/integracao-etapa-d.md

## Validação manual

1. Professor ativo sem turmas: Histórico sem diários; Alunos e Notas e Avaliações sem turmas de terceiros.
2. Professor com vínculos previamente confirmados: somente seus diários e catálogo; busca por turma/data e abertura do diário exato.
3. Coordenador: somente turmas em coordenadorIds; outro coordenador não herda esse acesso.
4. Admin ativo: histórico das turmas válidas, sem capacidade de assinar por professor.
5. Abrir /chamada?id=ID_ALHEIO e /chamada?id=ID_PROPRIO&chamadaId=DIARIO_ALHEIO: acesso negado, sem nomes/presenças alheias.
6. Abrir /notas?visao=coordenador&status=aberto: somente aviso de indisponibilidade, sem privilégio.
7. Trocar conta/URL durante carregamento: não manter registro anterior. Desconectar rede: erro de conexão e nova tentativa.
8. Chamada autorizada: presenças e observações somente leitura; sem botão de assinatura ou escrita.

Não editar documentos para executar esta validação. Usar somente contas e vínculos já aprovados ou fixtures do emulador. Novas notas/avaliações e registro de chamada dependem de contrato e autorização próprios.

## Resultado de validação local

90 testes passaram: 27 sem rede, 39 de regras, 10 de regressão do serviço de turmas e 14 de serviços acadêmicos no emulador. Não houve testes de navegador ou validação visual automatizada; acessos diretos foram exercitados no limite de serviço/parâmetros e no ciclo do hook.

TypeScript: permanecem oito erros preexistentes, quatro de cores no layout das abas e quatro imports/exportações de collapsible. Nenhum novo erro. git diff --check e verificações de sintaxe dos testes passaram. Arquivos fora do escopo foram comparados por hash, incluindo package-lock.json e firestore.rules. Nenhuma dependência instalada, commit, push, migração, publicação ou escrita no Firebase compartilhado.
