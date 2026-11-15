# Etapa G — estabilização e revisão para o repositório

## Resultado

Branch feat/integracao-perfis-usuarios. TypeScript em modo strict sem erros. Todos os 183 testes disponíveis passaram: 75 locais e 108 no Firestore Emulator Suite. git diff --check aprovado. Não foi identificada regressão pelas verificações executadas.

Não houve instalação, deploy, commit, push ou alteração de dados/usuários/regras publicados. Não foram habilitadas mutações de suporte ou chamadas. O hash de package-lock.json permanece 6dfa4077e81cf4bc2315e8c080b573de5b7fda5deacf0d106c78af544ad3ff50, igual ao início da etapa. Todas as mudanças anteriores foram preservadas.

## Correções realizadas

1. src/app/(tabs)/_layout.tsx: os quatro ícones agora recebem strings da paleta de cores existente conforme focused. O parâmetro color fornecido pela navegação aceita um tipo mais amplo, incluindo valores incompatíveis com Ionicons. Não foram usados casts, any ou supressões de diagnóstico.
2. src/components/ui/collapsible.tsx: removidas dependências de ThemedText/ThemedView (arquivos vazios) e de theme/use-theme inexistentes. O componente usa Text/View e a paleta light/dark já existente, preserva alternância e animação e expõe expanded à acessibilidade. A seta indica fechado/aberto. Não está atualmente importado pelas telas operacionais; não foram criadas novas abstrações de tema para corrigir um componente isolado.
3. README.md: substituído o texto desatualizado que anunciava chamadas offline/assinatura e autenticação futura, corrigidos blocos Markdown e removidos exemplos de commit/push direto na main. Documentados estado real, limitações, configuração Firebase existente e testes. Não existe carregamento de .env no código atual; a documentação agora reflete isso.
4. .gitignore: excluídos logs/artefatos locais do Firebase, variantes .env e nomes usuais de contas de serviço. Isso é prevenção, não substitui inspeção de arquivos e não remove itens já rastreados.

Não foram alterados regras, índices, serviços, tipos, autenticação ou consultas acadêmicas nesta etapa. Existem any preexistentes em partes legadas da aplicação; não foram acrescentados nem usados para resolver os oito erros. Uma limpeza de tipagem abrangente exigiria revisão separada.

## Revisão funcional e de arquitetura

| Área | Estado e verificação |
| --- | --- |
| Login/logout | signInWithEmailAndPassword/signOut reais, sem criação administrativa no cliente. Erros de login/logout tratados; roteamento decidido pelo contexto/layout. Testes de sessão e interface passaram. |
| Autenticação/ativação | Perfil em usuarios/UID; observador limpa identidade anterior e ignora respostas antigas. Perfil carregando, ausente, inválido, inativo ou erro não monta telas operacionais; diagnóstico e logout preservados. |
| Permissões | UID e perfil ativo determinam consultas. Papel informado em parâmetro não concede autoridade. Regras locais validam servidor independentemente da interface, com negação por padrão. |
| Início/Turmas | Mesmos serviços de turma/grade, vínculos reais, busca/ordenação, vazio/erro/loading, indicadores por turma e calendário America/Bahia. Sem fallback amplo se faltar índice. |
| Histórico/Chamadas | Leitura restrita às turmas autorizadas, verificação de IDs/URL e diário somente leitura. Registros sem data confiável não recebem data presumida. Todas as gravações de chamadas negadas nas regras locais. |
| Avaliações/Notas | Papel autenticado e turmas autorizadas, sem troca de perfil. Dados de avaliações/alunos/notas não integrados; mensagens de indisponibilidade substituem antigas demonstrações. |
| Suporte | Consulta por solicitanteUid para professor/coordenador; revisão geral para admin ativo. Serviços de criação/resolução testados no emulador. Botões desabilitados sem handlers de mutação; nenhuma chamada antiga atribuída por nome. |

Serviços, tipos e hooks foram revisados: tipos de entrada do Firestore são validados; autorização compartilhada confirma perfil ativo no servidor; hooks invalidam respostas em troca de usuário/role/chave e desmontagem; erros distinguem permissão, conexão, dados e configuração. Validação legada aceita campos de apresentação antigos, sem inventar vínculos/perfis. A política acadêmica permanece no escopo aprovado.

## Limitações encontradas — sem novas funcionalidades implementadas

- Início ainda tem notificação demonstrativa local sobre uma alteração de nota, com nome fictício; não vem do Firebase e não representa aprovação real. O sino abre esse modal. Remover ou substituir a demonstração exige decisão antes de apresentar o MVP como produto operacional completo.
- Login: Esqueci minha senha não possui handler. Recuperação de senha não foi implementada. Também não há estado de envio/desabilitação para prevenir cliques repetidos no login; refinamento futuro.
- Perfil: criação e resolução do suporte permanecem intencionalmente desabilitadas. O texto de resolução ainda menciona F2; sua conclusão local não autoriza habilitação. Dados de conta/senha são informativos, sem edição.
- Avaliações, boletins e notas não têm persistência ou contratos acadêmicos aprovados. A seção Alunos e Notas lista apenas turmas autorizadas e explica a indisponibilidade.
- Chamadas não podem ser criadas, editadas, assinadas ou excluídas. O diário apresenta registros existentes somente em leitura.
- Histórico/suporte não possuem paginação. O escopo é autorizado, mas volume elevado exigirá evolução específica. Datas legadas fora do formato confiável não alimentam indicadores diários.
- Vínculo atual concede acesso histórico: trocar professor/coordenador transfere leitura dos diários existentes. Não há autorização por período/autoria implementada.
- Configuração de tema do login é local; as demais telas seguem o tema do dispositivo. Não há preferências persistentes.
- Restaram estilos e componentes de template sem uso, incluindo themed-text/view vazios. Não foram removidos incidentalmente.
- O manifesto usa Expo 58; a instrução AGENTS.md solicita leitura da documentação 57, cumprida antes da edição. Nenhuma versão foi alterada. Validar atualização dessa orientação com a equipe.

## Testes e verificações

| Verificação | Resultado |
| --- | --- |
| ./node_modules/.bin/tsc --noEmit | Código 0; zero erros, oito anteriores corrigidos |
| Testes locais | 75 aprovados |
| Regras existentes no emulador | 39 aprovados |
| Serviço de turmas no emulador | 10 aprovados |
| Serviços acadêmicos no emulador | 14 aprovados |
| Calendário no emulador | 6 aprovados |
| Suporte/perfis F1 no emulador | 13 aprovados |
| Segurança F2 direta pelo SDK | 26 aprovados |
| Total | 183 aprovados; zero falhas, cancelamentos ou ignorados |
| git diff --check | Aprovado |
| Comparação de hashes com início da G | Apenas arquivos G previstos alterados; lockfile/regras/índices/serviços preservados |

Comandos reproduzíveis: tests/seguranca-f1/README.md e tests/seguranca-f2/README.md. As seis suítes do emulador executaram sequencialmente contra demo-violeta-tests, validado antes do SDK. As únicas escritas de teste foram em dados sintéticos no emulador local.

ESLint não está instalado. Não foi executado expo lint, para evitar instalação/configuração implícita. Não foi realizada exportação/bundle de produção nem novo teste visual em navegador/dispositivo nesta etapa. TypeScript não comprova sozinho layout ou integração nativa; conferir cores das abas em light/dark e o componente expansível caso venha a ser utilizado. Os testes de componentes usam harness e não substituem navegação visual.

## Credenciais, privacidade e artefatos

A inspeção automatizada por padrões examinou os 117 arquivos candidatos então presentes (texto quando decodificável), e 200 objetos textuais alcançáveis pelas referências do histórico Git local. Não encontrou chaves privadas, contas de serviço, tokens privados reconhecidos ou literais de senha. Achados de e-mail atuais eram exclusivamente fixtures example.invalid. Não foram incluídos valores de credenciais nos relatórios.

src/config/firebase.js contém configuração pública do cliente Firebase, já rastreada antes destas etapas, inclusive apiKey. A chave Firebase identifica projeto/app e não substitui autorização; não é credencial administrativa. Antes de tornar o repositório público, o responsável deve conferir suas restrições às APIs necessárias e que não habilite serviços que exijam segredo. Isso não pôde ser verificado no Console e não foi alterado. Fonte: [documentação oficial de chaves Firebase](https://firebase.google.com/docs/projects/api-keys).

A varredura é baseada em padrões e revisão local, não garantia absoluta nem auditoria de todas as referências remotas. Não há scanner especializado instalado; não foi instalada ferramenta. Nomes de autoria no README são créditos existentes, não dados de alunos ou usuários do Firestore. A demonstração de notificação é descrita acima e não é dado extraído do projeto publicado.

Logs do emulador ficaram em /tmp e são ignorados preventivamente no repositório. Não incluir .env, .firebase, caches, node_modules, dumps, arquivos de conta de serviço ou configurações autenticadas de CLI. As ferramentas de teste seguem isoladas em /tmp; nenhum manifesto foi alterado por instalações.

## Revisão Git e arquivos para commit

As alterações agregadas incluem A–F2 e G, ainda sem stage/commit. As remoções extensas nas telas correspondem à retirada de simulações, identidade fixa e gravações acadêmicas não autorizadas das etapas aprovadas. Arquivos novos são contratos, serviços/hooks/tipos, regras/índices/configuração local, documentação e testes sintéticos. Não foram identificados artefatos inesperados entre os candidatos após excluir os logs gerados.

A lista exata de caminhos revisados está em [arquivos-para-commit-etapa-g.md](arquivos-para-commit-etapa-g.md). Conferir seleção explícita antes de qualquer commit; não usar git add . indiscriminadamente.

package-lock.json tem uma mudança extensa preexistente (633 linhas adicionadas/530 removidas) que não foi criada nem revertida pela G. Está listado separadamente no inventário: confirmar sua origem e decidir se acompanha o commit funcional ou um commit próprio. Nenhuma instalação limpa foi executada para validar reprodutibilidade desse delta; o resultado dos testes corresponde às dependências já disponíveis. Isso não bloqueia o preparo do código funcional, mas impede afirmar que o lockfile preexistente foi regenerado/validado nesta etapa.

Arquivos modificados pela G: .gitignore, README.md, src/app/(tabs)/_layout.tsx e src/components/ui/collapsible.tsx. Criados pela G: este relatório e o inventário de commit. Nenhum outro arquivo anterior foi alterado nesta etapa.

## Pendências e próxima etapa

Antes de commit/push: validar este relatório, inventário e destino do lockfile preexistente; decidir o tratamento da notificação demonstrativa e do botão de recuperação sem ação; concluir smoke test visual de cores/navegação. Não implementar esses fluxos sem autorização.

Publicação remota de código não equivale a publicar regras no Firebase. As regras publicadas continuam sem comparação textual autenticada nesta sessão. Revisão dos privilégios existentes, legados/UIDs e restrições da chave cliente, aprovação específica, publicação/rollback e validação de produção seguem o procedimento F2. Não reativar suporte nem chamadas incidentalmente.

A Etapa H depende de validação e autorização do responsável. Nenhum commit, push ou deploy foi realizado.
