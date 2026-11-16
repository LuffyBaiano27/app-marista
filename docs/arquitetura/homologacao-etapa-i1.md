# Etapa I1 — plano de homologação

Documento histórico, superado: não criar projeto separado nem seguir seu provisionamento. O estado atual utiliza exclusivamente marista-app e configuração pública fixa em .env.example. Seguir retomada-etapa-i.md. Os procedimentos abaixo registram a proposta original, não instruções atuais.

## Estado desta preparação

main local atualizada por fast-forward para 3f823f5b3cddc4a8a3efec8a48642e9bc7646bd9, igual à origin/main consultada. Branch feat/integracao-perfis-usuarios preservada em 13a193919dd54a5991c884491a63ab6385d2d5fa. Nenhum novo commit/push ou recurso Firebase criado. Somente este plano foi acrescentado; configuração do aplicativo não foi alterada e Expo não foi iniciado.

Este documento é proposta, não registro de provisionamento. Nenhuma conta, senha, UID real ou dado de aluno foi incluído. Todos os passos que criam projetos, apps, usuários, documentos, índices ou regras dependem de aprovação posterior, mesmo quando destinados à homologação.

## Diagnóstico

- src/config/firebase.js contém configuração fixa do projeto compartilhado marista-app. Authentication e Firestore usam a mesma instância Firebase, o que deve ser mantido.
- Não há leitura de variáveis de ambiente, seleção de projeto ou bloqueio de inicialização para configuração incompleta. Um .env isoladamente não troca o projeto atual.
- .gitignore já exclui .env e variantes, contas de serviço com nomes usuais, .firebase e logs; permite .env.example. Ignorar arquivos não protege segredos incluídos em JavaScript ou variáveis públicas.
- Regras e índice estão no repositório, não publicados por esta contribuição. Não presumir que a versão do servidor atual corresponda ao arquivo local.
- firebase.emulator.json é configuração local de testes. O harness exige demo-violeta-tests/127.0.0.1:8080, não deve ser apontado para um projeto real.
- Pacote Expo atual é 58; AGENTS.md exige leitura da referência 57, já realizada. Não alterar SDK para preparar homologação. Compatibilidade com Expo Go instalado deve ser confirmada; Expo Go não substitui teste de build nativo.
- Criação/assinatura de chamadas e mutações de suporte continuam desabilitadas. Avaliações/notas são estados informativos. A notificação local demonstrativa não é evento de homologação e não deve ser usada como evidência.

## Ambiente recomendado e recursos

Um projeto Firebase separado, por exemplo com nome de exibição Sistema Violeta — Homologação. O projectId real será escolhido no Console e confirmado pela equipe; não presumir que um nome esteja disponível. A separação é de ambientes, não introduz suporte a múltiplas instituições.

| Recurso | Preparação posterior proposta |
| --- | --- |
| Projeto e IAM | Responsável pelo projeto, acesso mínimo aos operadores, projectId aprovado e registro do ambiente; não conceder Console a todos os testadores |
| App Firebase | Registro de aplicativo Web para o SDK JavaScript já utilizado; copiar somente a configuração desse app |
| Authentication | Habilitar Email/Password; criar as três contas manualmente no Console; registrar UIDs somente no controle restrito; não criar admin pelo app |
| Firestore | Database (default), edição Standard, região definida antes da criação considerando localização, latência e custos; iniciar com acesso fechado, sem modo de teste amplo |
| Regras | Após aprovação específica, usar exatamente firestore.rules validado no emulador; confirmar projeto/database e registrar hash/versão |
| Índices | Após aprovação, criar o composto de chamadas e aguardar ativação; manter índices automáticos necessários |
| Dados | Conjunto sintético pequeno, provisionado por responsável no Console, com inventário exato de documentos e UIDs confirmados |
| Quotas/custos | Conferir plano, limites e eventuais requisitos de cobrança do projeto antes de habilitar recursos; começar pelo mínimo necessário |

Storage, Functions, Analytics, Hosting, App Check adicional e EAS não são necessários para os testes iniciais de leitura. Não ativar recursos/incorrer em novas dependências incidentalmente. Restrições adequadas da chave cliente e domínios autorizados para os fluxos usados devem ser conferidos pelo operador; não copiar listas inteiras do projeto compartilhado.

Índice: collectionGroup chamadas, queryScope COLLECTION, turmaId ASCENDING e dataChamada DESCENDING, exatamente como firestore.indexes.json. ProfessorId, coordenadorIds array-contains e solicitanteUid usam índices automáticos nas consultas atuais. Regras não filtram resultados: as consultas restritas do aplicativo devem permanecer iguais.

## Configuração local futura — requer implementação aprovada

Propor uma branch nova a partir da main atualizada para essa implementação. Não editar a branch anterior nem começar uma seleção de ambientes nas telas.

1. Centralizar configuração validada antes de initializeApp. Ler cada variável por process.env.EXPO_PUBLIC_NOME, com referência estática (sem destructuring ou acesso dinâmico).
2. Exigir ambiente homologacao e correspondência exata do projectId com o ID de homologação previamente aprovado, não apenas um sufixo no nome. Conferir consistência de authDomain, appId e demais opções com a configuração aprovada.
3. Recusar campo obrigatório ausente, ambiente desconhecido ou destino compartilhado. Não manter fallback silencioso para marista-app. Auth e Firestore devem vir da mesma instância validada.
4. .env.local local/ignorado contém apenas configuração pública de cliente. .env.example versionado terá placeholders vazios, nunca senhas, tokens ou contas de serviço. Limpar valores antigos exportados no shell antes de iniciar para não sobrepor a configuração aprovada.
5. Identificar visualmente HOMOLOGAÇÃO, com o projeto configurado, para evitar confusão durante a coleta de evidências. Não implementar funcionalidades acadêmicas para isso.
6. Criar testes de configuração incompleta/destino errado, sem conexão Firebase; reexecutar TypeScript, regressão e emulador. A checagem é prevenção de erro de ambiente, não substitui as regras servidor.

Variáveis propostas:

- EXPO_PUBLIC_APP_ENV
- EXPO_PUBLIC_FIREBASE_API_KEY
- EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN
- EXPO_PUBLIC_FIREBASE_PROJECT_ID
- EXPO_PUBLIC_FIREBASE_APP_ID
- EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
- EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET (não exige habilitar Storage)

measurementId não é necessário, pois Analytics não é utilizado. Todos os valores EXPO_PUBLIC são incorporados ao bundle e públicos. Nenhuma senha de teste ou chave privilegiada entra nessas variáveis. Não usar NODE_ENV para escolher homologação e não presumir carregamento automático de .env.homologacao. Para o MVP, .env.local mais validação explícita é suficiente.

## Contas propostas — não criadas

| Nome fictício | E-mail de exemplo | role |
| --- | --- | --- |
| Administrador Teste | violeta.admin@example.com | admin |
| Coordenador Teste | violeta.coordenador@example.com | coordenador |
| Professor Teste | violeta.professor@example.com | professor |

Endereços acima são exemplos reservados de documentação, não caixas de e-mail controladas para recuperação/verificação. Confirmar se serão usados endereços sintéticos aceitos pelo provedor para testes sem envio de e-mail ou aliases de teste controlados pelo grupo, mantidos fora do repositório. Não usar contas pessoais existentes do projeto compartilhado. Não enviar mensagens a endereços de exemplo.

Senhas únicas por conta, geradas e compartilhadas por canal privado, nunca documentadas, commitadas, logadas ou fotografadas. Cada UID será obtido do Authentication de homologação após criação; não copiar nem inventar UIDs de outro projeto.

Em usuarios/{UID obtido}, provisionar nome sintético, role explícito, ativo true e criadoEm Timestamp. atualizadoEm Timestamp quando aplicável. Não cadastrar CPF, nome real ou e-mail redundante. Primeiro admin é atribuído por operador autorizado no Console, não por regra de primeiro usuário. Contas devem receber identificação mínima de responsáveis no controle restrito para auditoria, sem dados pessoais no material versionado.

## Dados sintéticos propostos — sem gravação nesta etapa

Prefixar todos os IDs de documento com homol-i1-. Os identificadores de fixture localizam dados para revisão/limpeza; não concedem permissões. A autorização usa somente UIDs realmente obtidos no Authentication.

### Turmas

Exemplo de envelope de uma turma, para preenchimento manual posterior. Marcadores não são valores reais e não devem ser gravados literalmente:

```text
ID: homol-i1-turma-segunda
nome: Turma Sintética A                   (string)
disciplina: Disciplina Sintética A         (string)
professorId: <UID do Professor Teste>       (string)
coordenadorIds: [<UID Coordenador Teste>]   (array de strings)
ativo: true                               (boolean)
diaId: 1                                  (inteiro, segunda)
horario: 08:00 - 08:50                     (string)
turno: Matutino                            (string)
alunos: 2                                 (inteiro informativo)
criadoEm: <Timestamp de provisionamento>   (Firestore Timestamp)
atualizadoEm: <Timestamp de provisionamento> (Firestore Timestamp)
```

Criar, somente após autorização:

| ID | diaId | Horário | Professor | Coordenadores |
| --- | ---: | --- | --- | --- |
| homol-i1-turma-segunda | 1 | 08:00 - 08:50 | UID Professor Teste | UID Coordenador Teste |
| homol-i1-turma-quarta | 3 | 14:00 - 14:50 | UID Professor Teste | lista vazia |

Sem status/professorNome adicionais, sem campos extras fora da allowlist. Professor deve ler ambas; coordenador somente segunda; admin ambas. Professor sem turmas é validado antes de provisionar o conjunto. O número alunos não cria matrícula/cadastro de alunos.

Com apenas um professor, não é possível comprovar na homologação o acesso negado a uma turma válida de OUTRO professor ativo. Para esse cenário, manter os testes existentes do emulador e solicitar autorização posterior para uma quarta conta Professor Controle com UID próprio. Não usar o UID de admin/coordenador como professor, não inventar UID nem corromper vínculos para simular terceiro.

### Histórico de leitura

Após autorização explícita para fixtures, provisionar pelo Console um diário sintético conhecido. Isso não habilita criação/assinatura pelo aplicativo nem altera a negação de escrita nas regras. O Console é privilegiado e exige revisão manual.

```json
{
  "turmaId": "homol-i1-turma-segunda",
  "dataChamada": "2026-11-16T11:00:00.000Z",
  "alunos": [
    { "id": "homol-aluno-001", "nome": "Estudante Sintético 01", "presencas": [true], "obs": "" },
    { "id": "homol-aluno-002", "nome": "Estudante Sintético 02", "presencas": [false], "obs": "" }
  ]
}
```

ID proposto: homol-i1-diario-segunda. Exemplo corresponde a segunda-feira, 16/11/2026, 08h em America/Bahia. É um snapshot sintético compatível com o leitor atual, não contrato novo de criação, prova de assinatura ou matrícula real. Não incluir assinatura fictícia, senha ou autoria inventada. A apresentação não deve ser usada como confirmação de assinatura digital.

Provisionar também, se aprovado, diário equivalente da turma quarta para validar o bloqueio do coordenador. Datas de testes diários devem ser definidas previamente conforme o calendário do ensaio. dataChamada precisa ser string UTC canônica com milissegundos, como saída de toISOString; não usar Timestamp nesse campo do indicador atual. Os metadados criadoEm/atualizadoEm de turmas/usuários são Timestamp, não strings.

Para carga de dados de hoje, o operador calcula e revisa a data de Bahia antes da gravação autorizada; não rodar scripts que infiram datas silenciosamente. Se hoje não for dia letivo, validar grade/histórico e aguardar o dia correto. Não alterar o relógio para forçar autenticação ou resultados; transições UTC/Bahia permanecem nos testes automatizados.

Suporte: preparar até um ticket pendente sintético por UID, solicitanteUid confirmado, descricao sem dados pessoais e criadoEm Timestamp. Provisionamento manual somente se aprovado; a interface continua sem criação/resolução. Cenários de escrita/resolução ficam no emulador.

## Matriz de testes

P = Professor Teste, C = Coordenador Teste, A = Administrador Teste. Cada execução registra versão/hash, projectId, perfil, cenário, resultado esperado/obtido e evidência sanitizada; nunca senha/token.

| Cenário | P | C | A |
| --- | --- | --- | --- |
| Login válido, nome/e-mail/iniciais/role e logout | Identidade própria | Identidade própria | Identidade própria |
| Restaurar/recarregar sessão | Aguardar perfil antes de montar telas | Idem | Idem |
| Rota interna sem sessão | Redirecionada ao login, sem dados | Idem | Idem |
| Início/Turmas | Segunda e quarta | Apenas segunda | Ambas |
| Busca/ordenação/grade semanal | Somente escopo próprio | Somente escopo atribuído | Escopo institucional sintético |
| Histórico/URL do diário da segunda | Permitido, leitura | Permitido, leitura | Permitido, leitura |
| Histórico/URL do diário da quarta | Permitido, leitura | Negado, sem dados de alunos | Permitido, leitura |
| Perfil completo alheio pelo SDK | Negado | Negado | Leitura permitida pela política |
| Query geral acadêmica pelo SDK | Negada | Negada | Permitida |
| Suporte | Apenas próprio UID | Apenas próprio UID | Todos os tickets sintéticos |
| Conta ativo false | Sem operação; diagnóstico/logout | Idem | Idem |
| ativo ausente/inválido, role inválido, perfil excluído | Sem operação; sem role padrão | Idem | Idem |
| Troca P → C → A na mesma instância | Dados da sessão anterior desaparecem | Idem | Idem |
| Permissão negada/offline/falha de índice | Mensagem clara; sem fallback amplo | Idem | Idem |
| Sábado/domingo | Sem pendência de hoje; grade semanal preservada | Idem | Idem |
| Segunda sem diário de hoje | Apenas turma segunda pendente | Idem | Idem |
| Indicador com diário canônico de hoje | Só turma vinculada; data de Bahia | Idem | Idem |
| Avaliações/Notas | Sem demonstração acadêmica, sem gravação | Idem | Idem |
| Criar/assinar chamada e criar/resolver suporte | Ações indisponíveis | Idem | Idem |

Cenários de perfil inválido/inativo devem ser feitos pelo operador apenas nos documentos sintéticos do projeto de homologação e restaurados conforme inventário, mediante aprovação específica. Usar um papel por vez; contas inativas mantêm login Auth possível, mas são bloqueadas operacionalmente pelo perfil. Desabilitar no Authentication é outro cenário, com semântica própria de tokens/sessão.

Tentativas de escrita acadêmica, elevação de role/ativo, falsificação de autoria, alteração de vínculo, resolução e exclusão: executar os testes diretos do SDK no emulador, não um script mutante apontado ao Firebase compartilhado. Para leitura direta em homologação, usar harness separado e validado, autenticado com a conta testada (não Console/Admin SDK, que ignora regras). Preparar esse harness somente após aprovação; não reapontar os testes demo existentes.

Transições automatizadas: 02:59:59.999Z → 03:00:00.000Z equivale a 23:59:59.999 → 00:00 em Bahia nas datas atuais; incluir domingo → segunda e sexta → sábado, com dispositivo em outros fusos. Permanecer com os testes existentes, sem alterar relógio de conta real. Não dar data presumida a histórico sem informação confiável.

## Execução recomendada com Expo — somente após configuração aprovada

O aplicativo atual ainda aponta ao Firebase compartilhado. Não executar os comandos abaixo como teste de homologação antes da troca de configuração validada.

1. Em checkout/pasta exclusivos de homologação, usar a versão aprovada e as dependências do lockfile. Não reutilizar .env nem perfis de navegador do ambiente compartilhado.
2. Operador entrega configuração pública do app Firebase homologação por canal controlado; usuário coloca em .env.local ignorado e revisa o projectId. Nenhuma credencial de usuário vai no arquivo.
3. Confirmar regras publicadas no projeto correto, índice ativo e fixtures/UIDs aprovados antes de convidar o grupo. Sem isso, testes de autorização no servidor não estão prontos.
4. Para primeiro teste, usar Web e perfil de navegador exclusivo, sem contas/sessões do projeto compartilhado:

```sh
./node_modules/.bin/expo start --web --clear
```

5. Para dispositivos na mesma rede, depois de confirmar compatibilidade do Expo Go com SDK 58 e disponibilidade dos módulos utilizados:

```sh
./node_modules/.bin/expo start --lan --clear
```

6. Conferir o marcador de homologação e destino esperado antes do login. Após troca de ambiente, parar o Metro, reiniciar/recarregar completamente e usar sessão/cache separados; nunca confiar só em hot reload para trocar backend.
7. Se Expo Go não suportar o SDK/módulos, usar Web no primeiro ciclo. Development build/APK/EAS é plano separado que pode exigir instalação de expo-dev-client, configuração de pacote/identificador e ferramentas/contas de build; nada disso foi autorizado ou executado agora. Não propor upgrade/downgrade do SDK como solução automática.

O servidor Metro precisa permanecer ativo para QR/LAN. Isso não equivale a distribuição permanente. Compartilhamento fora da rede por túnel ou hospedagem pode exigir ferramentas/serviços adicionais e não será habilitado incidentalmente.

## Disponibilização posterior ao grupo

- Primeiro aprovar ambiente, regras, índice e conjunto mínimo de dados; registrar hash do cliente usado.
- Distribuir um roteiro por papel, horário de teste e canal de retorno. Compartilhar senhas em separado, não em issue/PR ou captura de tela.
- Com três contas compartilhadas não há rastreabilidade individual. Para sessões simultâneas ou auditoria por integrante, definir contas adicionais aprovadas em vez de compartilhar conta administrativa amplamente.
- Preferir o primeiro ciclo acompanhado via Web/LAN. Depois decidir entre hospedagem Web de homologação (domínio autorizado e publicação separada) e build instalável de teste. Não há deploy/build automático preparado.
- Restringir a administração aos responsáveis; testar coordenador/professor em contextos de navegador separados. Nunca fornecer Console para comprovar permissões cliente.
- Ao encerrar, operador revoga/rotaciona acessos conforme decisão; não reutilizar credenciais em outro ambiente. Remoção de fixtures só pelo inventário e aprovação, sem exclusão genérica de coleções/projeto.

## Sequência proposta e aprovações

1. Aprovar projectId real, região, responsável/IAM/plano e canal de credenciais. Criar projeto/app/Auth/Firestore somente após autorização.
2. Autorizar implementação local da configuração por ambiente, validações, indicador de homologação, .env.example e testes, em branch nova; sem mudar funcionalidades incompletas.
3. Após nova validação local, autorizar publicação das regras/índice exclusivamente no projeto de homologação, conferindo destino duas vezes. Não alterar o projeto compartilhado.
4. Aprovar criação das três contas e provisionamento manual dos perfis/dados sintéticos. Registrar UIDs reais fora do repositório; nenhum mapeamento por nome/e-mail.
5. Aprovar ensaios controlados de inativação/perfil inválido e eventual quarta conta para testar outro professor; preparar o roteiro de leitura SDK sem Admin SDK.
6. Executar a matriz e coletar evidências. Só depois autorizar acesso do grupo e decidir distribuição Web/build.

Reversão: parar o cliente de homologação, corrigir configuração sem fallback para o compartilhado e cancelar o rollout. Regras nunca devem voltar a uma versão ampla para fazer o teste passar. Limpeza e recuperação de dados/contas seguem autorização específica e inventário; este plano não executa limpeza automática.

## Fontes oficiais consultadas

- https://docs.expo.dev/versions/v57.0.0/ — referência exigida pelo AGENTS.md.
- https://docs.expo.dev/guides/environment-variables/ — variáveis públicas, acesso estático e arquivos locais.
- https://docs.expo.dev/get-started/start-developing/ — servidor de desenvolvimento.
- https://docs.expo.dev/develop/development-builds/introduction/ — limites de Expo Go e builds de desenvolvimento.
- https://firebase.google.com/docs/projects/dev-workflows/overview-environments — projetos separados por ambiente.
- https://firebase.google.com/docs/auth/web/password-auth — provedor de senha.
- https://firebase.google.com/docs/firestore/quickstart — criação do Firestore e modos de acesso.
- https://firebase.google.com/docs/firestore/query-data/indexing — índices e preparação das consultas.
