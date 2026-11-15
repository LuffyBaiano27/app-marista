# Etapa F2 — autorização no servidor e validação local

## Resultado e limites

Política local consolidada na branch `feat/integracao-perfis-usuarios`. 183 testes aprovados: 75 locais e 108 no Firestore Emulator Suite (82 anteriores + 26 novos). Nenhuma falha, cancelamento ou teste ignorado. As regras foram compiladas e carregadas pelo emulador; os testes exercitaram tanto operações permitidas como negadas.

Não houve deploy, mudança de regras/dados/usuários publicados, instalação, commit ou push. A criação/resolução de suporte continua desabilitada na interface. Criação, alteração, assinatura e exclusão de chamadas permanecem bloqueadas no servidor local e indisponíveis no aplicativo.

O arquivo de regras já implementava a maior parte da política desde B. Nesta etapa foram explicitados os tipos de ativo/role na validação de perfil e documentadas as exceções e a allowlist de atualização. Não foram alterados serviços, telas, consultas, índices nem contratos de gravação. A principal ampliação é a comprovação da política por operações diretas do SDK.

## Matriz efetiva

Todas as permissões operacionais abaixo exigem `usuarios/{request.auth.uid}` com nome válido, `ativo` booleano true e role reconhecido. Campos ausentes, tipos inválidos e claims de papel sem esse documento não concedem autoridade.

| Operação | Professor ativo | Coordenador ativo | Admin ativo |
| --- | --- | --- | --- |
| Ler próprio perfil | Sim | Sim | Sim |
| Listar/ler outros perfis completos | Não | Não | Sim |
| Atualizar próprio perfil | Somente nome e atualizadoEm | Idem | Idem |
| Criar/excluir perfil ou alterar role/ativo/outros campos | Não | Não | Não |
| Ler turmas | professorId == UID | coordenadorIds contém UID | Todas |
| Criar/atualizar turma | Não | Não | Sim, contrato e referências válidos |
| Excluir turma | Não | Não | Não |
| Ler chamadas | Turma vinculada | Turma atribuída | Todas, inclusive órfãs para revisão |
| Criar/alterar/excluir chamada | Não | Não | Não |
| Ler suporte | solicitanteUid == UID | solicitanteUid == UID | Todos, inclusive legados |
| Criar suporte | Próprio, pendente | Próprio, pendente | Próprio, pendente |
| Resolver suporte | Não | Não | Somente pendente → resolvido |
| Alterar conteúdo/autoria ou excluir suporte | Não | Não | Não |

Exceção diagnóstica: qualquer conta autenticada pode tentar ler seu próprio documento, mesmo inativo, inválido ou inexistente. Isso permite o tratamento de estado no AuthContext e logout; não concede operações funcionais. Não autenticados e coleções/subcoleções não previstas são negados.

A matriz da etapa A descrevia criação futura de chamadas e teto provisório de coordenadores. Para esta versão prevalecem o bloqueio integral de gravações de chamadas da etapa B e o teto testado de **quatro coordenadores distintos** por turma. O AuthContext já acompanha alterações de perfil desde F1; não depende apenas do login inicial.

## Proteções e integridade

- Authentication identifica por UID; regras consultam o próprio perfil protegido. Nome, e-mail, claims arbitrárias e parâmetros de navegação não substituem esse documento.
- Update próprio usa diff de chaves afetadas com allowlist de nome/atualizadoEm. Inclui remoções, merge, campos aninhados e campos privilegiados futuros; nem o admin altera role/ativo pelo SDK cliente. atualizadoEm deve ser horário do servidor.
- Somente admin ativo cria/atualiza turmas. Contrato valida campos permitidos, tipos, timestamps, professor ativo e coordenadores ativos com papéis corretos, sem duplicidade. criadoEm é imutável. Não há delete cliente.
- Chamadas usam o vínculo atual da turma referenciada. Não há autorização por professorId fornecido na chamada ou ID escolhido na URL. Turmas inativas continuam legíveis por vínculo para preservar histórico; a ativação exigida operacionalmente é a do usuário.
- Suporte novo aceita somente solicitanteUid, descricao, status pendente e criadoEm. Autor é o UID da sessão e data é request.time. Campos de resolução na criação são rejeitados.
- Resolução administrativa só altera status/resolvidoPorUid/resolvidoEm, identifica o administrador real e usa horário do servidor. Conteúdo/autoria não mudam; reabertura e segunda resolução são negadas. Admin pode revisar/resolver um legado pendente sem inventar solicitanteUid.
- Admin SDK e Console privilegiado não são limitados por estas regras cliente. Provisionamento e auditoria de privilégios dependem de IAM e procedimento confiável, fora do app. Regras Firestore não desabilitam por si a criação de contas no Authentication.

## Compatibilidade das consultas e índices

Foram revisados autorizacao.ts, perfilUsuario.ts, turmas.ts, chamadas.ts, consulta-diaria.ts e suporte.ts, além do contexto e consumidores da F1. As suítes executam os serviços reais transpilados contra as regras locais.

| Fluxo | Consulta atual | Compatibilidade |
| --- | --- | --- |
| Perfil | Documento usuarios/UID, get/listener | Permitido para diagnóstico; terceiros só admin |
| Turmas professor | professorId == UID | Permitida; consulta geral negada |
| Turmas coordenador | coordenadorIds array-contains UID | Permitida; sem vínculo não há acesso |
| Turmas admin | Coleção geral | Permitida somente para admin ativo |
| Histórico | chamadas com turmaId == turma autorizada, por turma | Permitida; consulta acadêmica geral não administrativa negada |
| Diário por URL | turmaId == turma autorizada + documentId == ID, limit 1 | Permitida; IDs não substituem vínculo |
| Indicador diário | turmaId == ID, intervalo em dataChamada, order desc, limit 1 | Permitida e testada nas transições America/Bahia |
| Suporte comum | solicitanteUid == UID | Permitida; consulta geral e UID de terceiros negados |
| Suporte admin | Coleção geral | Permitida para admin ativo |
| Mutações suporte | Transações leem perfil e escrevem campos restritos | Permitidas nos testes; interface continua desabilitada |

Regras não filtram resultados: a consulta deve comprovar seu escopo. Não foi criado fallback amplo nem filtro local para contornar uma negação. A função interna consultarDiarioDoDia pressupõe um chamador autorizado; mesmo um uso direto indevido do SDK fica sujeito à regra no servidor.

firestore.indexes.json corresponde ao indicador diário: coleção chamadas, escopo COLLECTION, turmaId ASC e dataChamada DESC. As outras consultas atuais usam índices automáticos/documentId. A ativação do composto no projeto publicado foi informada pelo responsável na etapa anterior; não foi inspecionada nesta etapa. O emulador não comprova a existência nem o estado dos índices de produção. Nenhuma configuração de índice foi alterada.

Histórico e suporte ainda não têm paginação; as leituras permanecem restritas ao escopo autorizado. Paginação é evolução separada. A autorização administrativa global refere-se exclusivamente à instituição deste projeto.

## Testes e verificações

| Suíte | Aprovados |
| --- | ---: |
| Calendário, grade, acadêmico, sessão, ambiente e F1 locais | 75 |
| Regras anteriores | 39 |
| Serviço de turmas | 10 |
| Serviços acadêmicos | 14 |
| Calendário no emulador | 6 |
| Suporte/perfis F1 no emulador | 13 |
| Novos cenários F2 no SDK | 26 |
| Total | 183 |

Novos testes F2 cobrem os três papéis: remoção/merge de autoridade, campos aninhados, todas as gravações de chamadas, suporte próprio/autoria forjada, conta inativa, sem ativo, ativo string e role inválido na mesma sessão. Verificam ainda reassociação administrativa de professor/coordenadores e efeito no histórico, tentativa de modificar vínculos por professor/coordenador, consultas com UID de terceiros, escalonamento transacional, claims falsas, exclusão de perfil e integridade/unicidade da resolução administrativa.

As suítes anteriores mantêm cobertura de ausência de perfil, consultas gerais negadas, coordenadores inválidos/duplicados e teto de quatro, operações em lote, dados legados, IDs de diários trocados, troca de sessão, observador de ativação, botões desabilitados, leitura sem escrita acadêmica e calendário/fusos. withSecurityRulesDisabled só prepara ou altera fixtures sintéticas; as operações verificadas usam contextos autenticados com regras habilitadas. O destino é validado antes de importar o SDK: demo-violeta-tests, 127.0.0.1:8080, sem fallback para projeto publicado.

TypeScript: oito erros preexistentes, nenhum novo. Quatro TS2322 em src/app/(tabs)/_layout.tsx (cores, linhas 29/36/43/50); quatro imports/exportações em src/components/ui/collapsible.tsx (linhas 6–9). Não foram corrigidos fora do escopo. git diff --check aprovado. Hashes confirmam preservação de package-lock.json e de todos os arquivos anteriores, exceto as duas modificações F2 listadas abaixo.

## Regras locais versus publicadas

Não foi possível obter uma comparação textual: `firebase login:list --json`, com configuração isolada, não retornou conta autenticada. Não foi realizado login nem solicitada credencial. As regras publicadas **não foram consultadas nem modificadas** nesta etapa.

O relato histórico da equipe descrevia leitura ampla de perfis e escrita ampla de turmas/chamadas por autenticados, além de edição própria sem bloqueio de role. Se essa versão continuar publicada, ela diverge da política local acima e os bloqueios da interface não eliminam o risco. Esse relato não é uma cópia autenticada da configuração atual; obter o texto integral e verificar todos os matches sobrepostos continua obrigatório antes de publicar.

## Legados, riscos e decisões

- ativo ausente/inválido exige revisão explícita, não default true. Validar legitimidade de todos os administradores, porque a política antiga pode ter permitido autoelevação.
- professorId demonstrativo não é UID e não será convertido por nome/e-mail. Coordenador sem coordenadorIds não ganha acesso. Revisão e mapeamento manual aprovado precedem qualquer migração.
- Novas gravações de turma exigem contrato completo e timestamps; documentos antigos podem continuar legíveis, mas updates administrativos incompletos serão negados. Regularização exige proposta e aprovação próprias, sem perda de campos/dados.
- Chamadas órfãs ficam acessíveis apenas ao admin no servidor; o histórico do app continua partindo das turmas autorizadas, portanto não é uma ferramenta de revisão de órfãs.
- Datas não confiáveis não alimentam indicadores do dia. Nenhum documento histórico é reescrito.
- Chamados sem solicitanteUid ficam só para administração; não atribuir por nomes.
- A leitura histórica segue o vínculo **atual**, comprovado por teste. Trocar professor/coordenadores transfere acesso inclusive a chamadas antigas. Caso a instituição exija acesso por autoria/período, definir um contrato novo antes de alterar essa política.
- Dados já baixados não podem ser revogados retroativamente pelas regras. Confirmação online do perfil na F1 reduz confiança indevida no cache, sem garantir apagamento de cópias prévias.
- Manter criação/resolução de suporte desabilitada até validação e autorização explícita; aprovação dos testes F2 não implica habilitação automática nem publicação.

## Procedimento futuro de publicação e reversão — não executado

1. Responsável autorizado obtém e guarda o texto integral publicado, versão/hash e projeto/database em local restrito; revisa IAM, perfis administrativos e regras sobrepostas. Não incluir dados pessoais nem credenciais no repositório.
2. Conferir contas ativas e vínculos reais com mapeamento aprovado; listar documentos legados afetados e decidir sua regularização. Não ampliar a regra para acomodar demonstrativos. Confirmar política de acesso histórico por vínculo atual.
3. Validar versão cliente F1/E disponível, índice composto ativo e plano de janela/versão mínima. Rodar novamente a suíte completa com o arquivo exato candidato. Revisar o diff entre candidato e regras publicadas com a equipe.
4. Somente após autorização específica, responsável publica exclusivamente as regras revisadas, no projeto/database explicitamente conferidos, via Console ou configuração de deploy dedicada. Não usar firebase.emulator.json como configuração de publicação; não publicar índices ou outros recursos incidentalmente. Registrar versão/hash e horário.
5. Validar leituras de contas existentes: professor/coordenador somente vinculados, admin conforme matriz, própria identidade e logout; não criar chamadas ou dados acadêmicos para testar produção. As tentativas destrutivas ficam no emulador.
6. Se houver bloqueio inesperado, suspender o rollout e preservar evidências. Reverter somente para versão previamente auditada e segura/compatível. A versão antiga ampla não é rollback aceitável automático; se não houver versão segura, aprovar contenção temporária com negação operacional e diagnóstico do próprio perfil. Não restaurar/excluir documentos para reverter regras.
7. Habilitação do suporte e qualquer mudança de contrato acadêmico exigem validação e autorização separadas.

## Arquivos desta etapa

Modificados: firestore.rules; tests/academico/executar-emulador.mjs.

Criados: tests/seguranca-f2/regras.test.mjs; tests/seguranca-f2/README.md; docs/arquitetura/seguranca-etapa-f2.md.

Aplicativo, package-lock.json, firebase.emulator.json e firestore.indexes.json preservados.
