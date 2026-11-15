# Cenários futuros de regras

Especificação, não resultado de execução. As fixtures são sementes de leitura/legado, não documentos novos completos. O harness futuro acrescentará Timestamp apenas onde o contrato exigir; não completará campos de autorização ausentes.

| Cenário | Resultado esperado |
| --- | --- |
| Sem autenticação lê ou grava dados | Negado |
| Conta autenticada sem usuarios/{uid} acessa turma | Negado |
| Inativo, role inválido ou ativo ausente acessa funcionalidade | Negado |
| Usuário lê o próprio perfil inativo/incompleto | Permitido para diagnóstico |
| Professor A lê perfil de B | Negado |
| Usuário altera próprio role/ativo ou adiciona campo privilegiado | Negado |
| Usuário cria o próprio perfil como admin | Negado |
| Usuário altera só nome e timestamp com valores válidos | Permitido |
| Professor A consulta turmas com professorId=A | Permitido |
| Professor A lista coleção sem filtro ou lê turma B | Negado |
| Coordenador A consulta array-contains seu UID | Permitido para turma A |
| Coordenador B sem atribuição lê turma A | Negado |
| Admin ativo lista turmas da única instituição | Permitido |
| Professor tenta obter acesso por nome/e-mail/prof_3 | Negado |
| Chamada legada A lida por professor A/coordenador A | Permitido por referência válida da turma |
| Chamada A lida por professor B/coordenador B | Negado |
| Chamada órfã lida por professor/coordenador | Negado |
| Chamada órfã ou turma legada lida por admin | Permitido para revisão |
| Professor consulta chamadas só por data sem escopo de turma | Negado |
| Professor cria chamada com autor diferente ou turma alheia | Negado |
| Professor cria chamada em turma inativa/inexistente | Negado |
| Cliente altera ou exclui chamada finalizada | Negado inclusive para admin |
| Professor consulta suporte filtrando seu UID | Permitido |
| Professor lê suporte alheio ou sem UID | Negado |
| Admin lê suporte legado sem UID | Permitido para revisão |
| Cliente cria suporte com autor alheio ou status resolvido | Negado |
| Admin resolve pendente alterando só campos de resolução válidos | Permitido |
| Professor resolve ticket ou admin altera descrição/autoria | Negado |
| Campo extra, tipo inválido ou timestamp de criação falsificado | Negado em novas gravações |
| Permissão ampla em match sobreposto reabre acesso | Teste deve falhar; remover permissão ampla |

Pendências para casos positivos completos: contrato de matrícula, chave de ocorrência da chamada, prazo de registro, limites de presenças e referências de coordenadores. Acrescentar cenários de duplicata concorrente, reatribuição de turma, integridade de aluno, mudanças de estado e queries/índices ao definir esses contratos.
