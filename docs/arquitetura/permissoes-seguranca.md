# Permissões e estratégia de segurança

Status: proposta normativa da etapa A, pendente das confirmações listadas ao final. Não contém regras executáveis.

## Camadas

Authentication identifica a conta. O documento usuarios/{uid}, protegido no servidor, define perfil e ativação. Serviços tipados selecionam escopo e validam entradas. Menus apresentam capacidades. Regras Firestore são a barreira obrigatória para toda leitura/escrita cliente. Backend/Admin SDK exige validação própria e IAM; não depende das regras cliente.

Nenhuma identidade é inferida por nome/e-mail. Nenhuma permissão usa IDs de fixture ou demonstrativos em produção. Campo ausente/inválido nega a capacidade correspondente.

## Matriz de permissões — uma instituição

Todas as operações funcionais exigem perfil válido e ativo. O próprio perfil permanece legível para diagnóstico, mesmo quando inativo. Administrador é explicitamente responsável por toda a única instituição deste projeto; não é administrador de outras instituições.

| Operação | Professor | Coordenador | Administrador |
| --- | --- | --- | --- |
| Ler próprio perfil | Sim | Sim | Sim |
| Alterar próprio nome | Sim | Sim | Sim |
| Ler perfil completo alheio | Não | Não | Sim, para gestão |
| Alterar role/ativo pelo app | Não | Não | Não; provisionamento confiável |
| Consultar turmas | professorId == UID | UID em coordenadorIds | Todas, inclusive pendências para gestão |
| Criar/alterar turma | Não | Não | Sim, validando referências |
| Apagar turma | Não | Não | Não pelo cliente; inativar |
| Consultar chamadas | Turmas vinculadas | Turmas atribuídas | Todas, inclusive órfãs para revisão |
| Criar chamada | Turma própria ativa com vínculo válido | Não | Não por ser admin |
| Alterar/apagar finalizada | Não | Não | Não pelo cliente |
| Criar chamado de suporte | Próprio | Próprio | Próprio |
| Consultar suporte | Próprios | Próprios | Todos para gestão |
| Resolver suporte | Não | Não | Sim; somente transição pendente → resolvido |

Coordenador sem atribuição explícita não consulta dados acadêmicos. Menus de avaliações/notas ainda são protótipos e esta matriz não autoriza gravações desses módulos. Privilégios administrativos não implicam capacidade de assinar chamada por professor.

## Política por coleção para futura implementação

- usuarios: permitir get do próprio documento; gestão administrativa ativa pode ler/listar perfis. Cliente não cria/deleta perfil. Update próprio só altera nome e atualizadoEm, validando tipos e horário do servidor; role, ativo e criadoEm permanecem imutáveis. Campos legados não viram campos editáveis por inclusão acidental.
- turmas: leitura por vínculo ou admin. Gravação administrativa valida campos e UIDs de professor/coordenadores, perfis e ativação; lista coordenadorIds limitada a 10. A forma de validar todos os vínculos e os limites de acessos auxiliares nas regras serão testados antes de consolidar o teto. Sem delete cliente.
- chamadas: leitura por acesso à turma; admin pode revisar órfãs. Create exige autor igual ao UID autenticado, professor responsável válido, turma ativa, campos permitidos e estado finalizada. Chave, janela de registro e integridade por aluno dependem das decisões acadêmicas. Sem update/delete cliente.
- chamados_suporte: leitura própria por solicitanteUid ou admin ativo. Create exige solicitanteUid da sessão, pendente e horário do servidor; sem campos de resolução. Update administrativo altera apenas status, resolvidoPorUid e resolvidoEm e exige transição válida. Sem delete cliente.
- Demais caminhos: negar por padrão. Rever todo match amplo: regras permissivas sobrepostas não são anuladas por regras restritivas.

Não é necessário introduzir custom claims no MVP: role protegido no documento é a fonte única proposta. Mudança de role/ativo será refletida pelas regras em novas requisições; o contexto atual não acompanha alterações de perfil em tempo real. Futuro refinamento pode atualizar o contexto sem substituir a decisão do servidor.

## Consultas compatíveis e operações afetadas

Regras não filtram resultados. Cada consulta deve provar o escopo de todo resultado potencial.

- Turmas professor: where professorId == UID. Coordenador: array-contains UID em coordenadorIds. Admin: coleção inteira da única instituição.
- Chamadas: por turma autorizada, com data quando necessário. Histórico inicialmente por turma; testar custo e compatibilidade das regras antes de otimizar/agrupar.
- Suporte professor/coordenador: where solicitanteUid == UID. Admin: todos.
- Perfis: próprio doc direto; listagem reservada à gestão administrativa.

A consulta de chamadas só por data, as leituras gerais do Histórico, o suporte geral em Perfil, o administrador fixo em Início/Turmas, a carga demonstrativa e o cadastro cliente de admin são incompatíveis com essa política. A gravação atual de chamada não fornece autoria e não evita duplicatas.

Alterações deverão ser coordenadas: publicar regras antes de adaptar o cliente pode interromper operações legítimas; adaptar só o cliente mantém o banco vulnerável. Não introduzir exceção permissiva para manter cliente antigo. Planejar janela de atualização ou versão mínima; eventual reversão nunca deve restaurar regras amplas sem análise explícita.

## Provisionamento

1. Responsável autorizado confere conta no Authentication e registra UID em procedimento restrito, fora do repositório.
2. Confirma função acadêmica; não usa domínio de e-mail como prova de autoridade.
3. Cria/revisa usuarios/{uid} com nome, role explícito, ativo aprovado e metadados.
4. Confere login e escopo com conta de teste adequada.
5. Para primeiro admin, responsável com acesso administrativo ao projeto designa UID confirmado pelo Console ou ferramenta privilegiada. Não existe regra de primeiro cadastrado vira admin.
6. Alterações posteriores de role/ativo seguem aprovação e registro de antes/depois. Nenhuma chave de serviço vai para o app.

Conta sem perfil não recebe professor automaticamente. Desabilitação no Authentication e ativo=false são medidas distintas; avaliar ambas em desligamento. A futura remoção de Criar Admin não remove a necessidade de regras negarem sua operação. Evitar criar contas de terceiros no cliente principal com createUserWithEmailAndPassword, pois isso troca a sessão corrente.

## Decisões pendentes antes das regras executáveis

- Confirmar uma instituição por projeto e gestão administrativa global apenas nesse escopo.
- Aprovar coordenadorIds por turma e identificar responsável pelas atribuições.
- Confirmar unidade do documento de turma, um professor por documento e teto de coordenadores.
- Aprovar ativo obrigatório e lista de contas que serão explicitamente habilitadas.
- Definir fonte de matrícula, identificador de aluno e aulas por chamada.
- Definir uma chamada por turma/data ou ocorrência, janela permitida e confirmação por reautenticação.
- Confirmar acesso ao histórico pelo vínculo atual após substituição de professor.
- Obter texto integral das regras publicadas e verificar permissões sobrepostas; ainda não há arquivo dessas regras no repositório.
- Definir responsável por provisionamento, revisão dos dados e publicação.

## Fontes oficiais

- [Restringir campos e atualizações](https://firebase.google.com/docs/firestore/security/rules-fields)
- [Consultas e regras](https://firebase.google.com/docs/firestore/security/rules-query)
- [Testes de regras no emulador](https://firebase.google.com/docs/rules/unit-tests)
