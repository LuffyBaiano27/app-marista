# Contratos de dados — Sistema Violeta

Status: definição local da etapa A; não altera validações, consultas ou regras em execução.

## Escopo e decisões

O MVP atende uma única instituição por projeto Firebase. Não haverá `instituicaoId`, coleção de instituições, seleção de instituição ou administração global nesta etapa. Se duas instituições precisarem compartilhar o projeto, este contrato deverá ser revisto antes de cadastrar a segunda; a política atual não oferece isolamento entre instituições.

Authentication fornece o UID e o e-mail da sessão. `usuarios/{uid}` fornece nome e perfil. `turmas.professorId` referencia esse mesmo UID. `chamadas.turmaId` referencia o ID estável da turma. O nome do professor e o e-mail não conferem autoridade.

A observação do banco publicada foi fornecida pela equipe; esta documentação não representa uma exportação ou inspeção completa do Console. Os campos atuais abaixo foram identificados no código. Não se presume sua presença em todos os documentos.

Convenções:

- **Obrigatório** significa exigido para novos documentos no contrato futuro, não retroativamente presente.
- **Imutável** significa não alterável pelo cliente depois da criação. Provisionamento privilegiado exige procedimento próprio.
- Timestamp significa Firestore Timestamp. Novos metadados de criação usarão horário do servidor.
- Ausência ou invalidade de campos de autorização nunca recebe valor padrão permissivo.
- Campos adicionais legados serão preservados, mas não incorporados automaticamente ao domínio nem usados para autorizar.
- Novos campos não serão acrescentados por leitura, login ou validação.

## usuarios/{uid}

Atual: cadastro demonstrativo grava `nome`, `email`, `cpf`, `role` e `criadoEm`; o leitor atual exige somente nome não vazio e role reconhecido. O ID já corresponde ao UID do Authentication.

| Campo | Contrato futuro | Obrigação | Mutabilidade e finalidade |
| --- | --- | --- | --- |
| ID do documento | UID existente no Authentication | Obrigatório | Imutável; identidade |
| nome | string não vazia, até 120 caracteres | Obrigatório | Próprio usuário pode alterar; apresentação |
| role | professor, coordenador ou admin | Obrigatório | Imutável no cliente; autorização |
| ativo | boolean | Obrigatório | Imutável no cliente; autorização; somente true habilita acesso funcional |
| criadoEm | Timestamp | Obrigatório em novos | Imutável; auditoria |
| atualizadoEm | Timestamp | Obrigatório em futuras atualizações | Horário do servidor |
| email | string legada | Opcional | Preservar; não autoriza; e-mail da sessão vem do Authentication |
| cpf | string legada | Opcional | Não ampliar uso/exposição; necessidade a revisar |

`ativo` ainda não é exigido pelo código atual. Sua exigência futura depende de preenchimento explicitamente aprovado para as contas habilitadas. Não se introduzirá fallback `ativo ?? true`.

Perfis ausentes podem receber uma mensagem explicativa e encerrar a sessão, sem acesso operacional. A leitura do próprio perfil deve continuar possível para diagnosticar uma conta inativa; isso não autoriza outras coleções.

## turmas/{turmaId}

Atual: os exemplos contêm `nome`, `disciplina`, `alunos` (quantidade), `horario`, `turno`, `diaId`, `status`, `professorNome` e `professorId`. Há IDs demonstrativos, como `prof_3`.

Unidade preservada nesta versão: documento de oferta de aula, com uma disciplina, um professor responsável e um horário semanal. A equipe precisa confirmar essa interpretação antes de consolidar as gravações. Os IDs existentes não serão renomeados.

| Campo | Contrato futuro | Obrigação | Mutabilidade e finalidade |
| --- | --- | --- | --- |
| ID do documento | identificador estável | Obrigatório | Imutável; referência das chamadas |
| nome | string não vazia, até 120 caracteres | Obrigatório | Gestão administrativa; apresentação |
| disciplina | string não vazia, até 120 caracteres | Obrigatório | Gestão administrativa |
| professorId | UID de professor ativo com perfil válido | Obrigatório para operação docente | Administração pode reatribuir mediante revisão; autorização |
| coordenadorIds | lista limitada a 10 UIDs distintos de coordenadores ativos | Obrigatório em novos; lista vazia válida | Administração; autorização; ausente não concede acesso a coordenador |
| ativo | boolean | Obrigatório em novos | Administração; somente true permite novas chamadas |
| diaId | inteiro de 1 a 5 | Obrigatório em novos | Gestão administrativa; calendário MVP |
| horario | string não vazia, até 80 caracteres | Obrigatório em novos | Apresentação; não prova permissão nem prazo |
| turno | string não vazia, até 40 caracteres | Obrigatório em novos | Apresentação |
| alunos | inteiro não negativo | Opcional | Quantidade informativa; não é cadastro ou matrícula |
| professorNome | string | Opcional | Cache visual; não autoriza |
| status | string legada | Opcional | Preservar; status diário vem da chamada, não deste campo |
| criadoEm / atualizadoEm | Timestamp | Obrigatórios em novos | Criação imutável; atualização administrativa |

Legado `materia`: aceitar como alternativa de apresentação a `disciplina`, sem gravar automaticamente. Documentos incompletos não devem quebrar a lista: reportar dado inválido ou exibir indicação limitada; nunca habilitar escrita com vínculo inválido.

Turmas inativas mantêm histórico consultável pelos atores autorizados, mas não aceitam novas chamadas. Turmas com professor inexistente ou demonstrativo ficam pendentes de revisão administrativa. Sem professor válido não há operação docente. Acesso de coordenador exige sua própria atribuição válida, independentemente do nome do professor.

## chamadas/{chamadaId}

Atual: `turmaId`, `disciplina`, `dataChamada` (ISO string), `dataChamadaFormatada` (YYYY-MM-DD por UTC), `assinaturaProf` (boolean) e lista `alunos` com `id`, `nome`, `presencas` e `obs`. Não há autor por UID. O app usa `addDoc`, permitindo duplicatas se clientes concorrerem. A confirmação atual apenas testa senha não vazia.

| Campo | Contrato futuro | Obrigação | Mutabilidade e finalidade |
| --- | --- | --- | --- |
| ID do documento | preservar históricos; novos dependem da unidade de chamada aprovada | Obrigatório | Imutável |
| turmaId | ID de turma existente | Obrigatório | Imutável; autorização por referência à turma |
| registradoPorUid | UID da sessão criadora | Obrigatório em novos | Imutável; autoria, não transfere acesso histórico |
| dataLetiva | YYYY-MM-DD no fuso America/Bahia | Obrigatório em novos | Imutável; data acadêmica validada |
| criadoEm | Timestamp do servidor | Obrigatório em novos | Imutável; instante de registro |
| status | finalizada | Obrigatório em novos | Imutável no cliente no MVP; sem rascunho persistente nesta versão |
| alunos | lista de registros de presença | Obrigatório para compatibilidade inicial | Snapshot acadêmico; finalização imutável |
| disciplina | string | Opcional | Snapshot visual; não autoriza |
| assinaturaProf | boolean legado | Opcional | Não comprova reautenticação ou assinatura digital |
| dataChamada / dataChamadaFormatada | strings legadas | Opcionais no domínio novo | Preservar; leitor adapta formatos conhecidos |

Registro de presença: `id` deve ser um identificador acadêmico estável, `nome` é snapshot, `presencas` é lista de booleanos por aula e `obs` é texto opcional. A fonte de matrícula e a quantidade de aulas não estão definidas; não transformar IDs demonstrativos em matrícula real. A gravação de presenças reais depende dessa definição.

Regras podem validar o envelope do documento e limitar o tamanho, mas não devem alegar validação completa de cada elemento arbitrário da lista. Definir teste de integridade e optar por subcoleção de presenças ou backend validador antes de exigir garantia por aluno; nenhuma dessas estruturas será criada agora.

Acesso histórico recomendado: segue a atribuição atual da turma, mesmo após troca de professor. Autor original continua registrado. Essa política exige confirmação da equipe.

Não haverá update ou delete de chamada finalizada por clientes, inclusive administradores. Correções futuras exigem fluxo auditável separado. Uma chamada por turma/data ou por ocorrência de aula ainda precisa ser confirmada antes de escolher chave determinística para impedir duplicatas.

## chamados_suporte/{id}

Atual: `solicitante` é nome/cargo concatenado; `data`, `hora`, `descricao`, `status` e `timestamp` numérico. Não há autor identificável por UID. A leitura atual busca todos os chamados.

| Campo | Contrato futuro | Obrigação | Mutabilidade e finalidade |
| --- | --- | --- | --- |
| solicitanteUid | UID da sessão criadora | Obrigatório em novos | Imutável; autorização |
| descricao | string não vazia, até 4000 caracteres | Obrigatório em novos | Imutável após envio no MVP |
| status | pendente ou resolvido | Obrigatório | Criação pendente; só admin resolve |
| criadoEm | Timestamp do servidor | Obrigatório em novos | Imutável |
| resolvidoPorUid | UID administrativo da sessão | Somente ao resolver | Imutável depois da resolução |
| resolvidoEm | Timestamp do servidor | Somente ao resolver | Imutável depois da resolução |
| solicitante / data / hora / timestamp | formatos legados | Opcionais | Preservar; apresentação, sem autorização |

Chamado legado sem solicitanteUid não é atribuído por nome: somente gestão administrativa pode revisá-lo. Professor e coordenador consultam apenas chamados cujo solicitanteUid seja seu próprio UID. Não haverá exclusão pelo cliente.

## Incompatibilidades e fronteira da compatibilidade

| Situação | Tratamento proposto |
| --- | --- |
| Usuário sem ativo | Preservar documento; habilitação futura depende de revisão explícita |
| Turma com prof_1/prof_2/prof_3 | Não atribuir; incluir em inventário de revisão |
| Turma sem coordenadorIds | Coordenador não recebe acesso; preencher só com atribuição confirmada |
| Chamada sem autor | Preservar; não inventar autoria; permitir histórico apenas pela turma válida |
| Chamada órfã | Não expor a professor/coordenador; revisão administrativa |
| Suporte sem UID | Não atribuir por nome; revisão administrativa |
| Datas ISO/numéricas e Timestamp | Adaptadores de leitura explícitos; nenhuma atualização silenciosa |
| Campos desconhecidos | Preservar documentos; novas escritas seguem lista permitida |

Compatibilidade significa preservar dados e leitura legítima possível; não significa conservar permissões amplas nem fazer documentos incompletos passarem na validação de novas gravações. Campos obrigatórios de novos contratos não serão exigidos indiscriminadamente para a leitura de registros históricos.
