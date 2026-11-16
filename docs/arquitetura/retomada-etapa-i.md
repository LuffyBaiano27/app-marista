# Retomada da Etapa I — auditoria e pendências

## Estado de referência

Este relatório substitui, para operação atual, as propostas históricas I1/I2/I4. O único projeto é marista-app. A configuração pública fixa em .env.example foi alterada manualmente pelo responsável e foi preservada integralmente nesta auditoria, inclusive no stage. .env.local já existe e deve permanecer ignorado e não rastreado.

A referência é o relato mais recente do usuário, complementado pelo inventário das seis turmas fornecido na conversa. Não houve leitura autenticada do Firestore/Console nesta execução. Não inferir que os campos do último inventário ainda sejam os valores atuais do servidor.

Segundo o relato, há três perfis de teste ativos com papéis admin/coordenador/professor, um administrador existente ativo e outro inativo. Não há nomes pessoais, e-mails ou UIDs desses usuários neste relatório. A antiga conta pessoal e seu perfil foram removidos manualmente; não recriar nem restaurar essa conta por scripts. As remoções e ajustes anteriores foram realizados pelo responsável durante a interrupção, não por esta auditoria.

Turmas passaram a sete documentos: seis demonstrativos e teste-vinculo-uid-001. O vínculo professor/coordenador dessa turma de teste foi atualizado manualmente para UIDs reais das contas de teste; não sobrescrevê-lo com dados fictícios ou UIDs anteriores. A chamada histórica permanece vinculada a Nl0Q3TPKCvKwXqVhQV0l. O suporte teve um registro informado anteriormente, sem nova confirmação de quantidade/estrutura na retomada.

## Configuração e migração TypeScript

- src/config/firebase.js foi substituído por src/config/firebase.ts; imports sem extensão existentes continuam válidos, com as mesmas exportações auth, db e default.
- firebase-config.ts exige ambiente homologacao e ambos os projectIds explícitos iguais a marista-app. Não há fallback.
- App nomeado, Auth e Firestore na mesma instância, sem reutilização da default. Mudança de opções exige reinício. Nome da instância não cria isolamento no servidor.
- Domínio/bucket correspondem ao projeto; número do projeto e appId Web são coerentes. Os oito campos do exemplo coincidem com .env.local e, quanto aos seis campos originais Firebase, com a configuração pública antes versionada em firebase.js.
- Validação é local e não faz chamadas de rede; não comprova existência/propriedade da chave no Console nem restrições de APIs. A configuração é pública por desenho; senhas, tokens administrativos e contas de serviço não podem ser incluídos. Verificar restrições das APIs da chave no Console continua uma ação do responsável, sem alteração automática.
- .env.example contém valores públicos fixos conforme decisão manual. Não converter novamente para marcadores nem incluir preenchimento manual nas instruções atuais.
- .env.local não é rastreado e é ignorado. Nenhum arquivo privado foi criado ou modificado nesta auditoria.

Execução:

```sh
test -e .env.local || cp .env.example .env.local
npx expo start --web --clear
```

O primeiro comando não sobrescreve configurações locais existentes. Se as opções forem alteradas, revisar a diferença manualmente, parar o Metro e recarregar completamente a aplicação. O usuário informou que a versão Web abriu e, posteriormente, confirmou publicação manual das regras restritivas e homologação dos três perfis ativos e do bloqueio do administrador inativo. O alcance dessa evidência está discriminado abaixo. Não foram alteradas interfaces ou habilitados fluxos incompletos.

## Resultado da primeira revisão dos testes

Foi encontrada uma falha de expectativa antiga: um teste exigia que o .env.example fosse inválido e contivesse marcadores. A decisão manual tornou-o válido e compartilhado. O teste foi atualizado para conferir chaves esperadas, ausência de marcadores e validação pura do destino, sem inicializar SDK/rede. A configuração manual não foi alterada para satisfazer o teste. Os demais casos continuam sintéticos e com SDKs substituídos.

Resultado final após a correção: 242 testes aprovados, sendo 134 locais e 108 no emulador (39 regras, 10 turmas, 14 acadêmicos, 6 calendário, 13 F1 e 26 F2), sem falhas/cancelamentos/ignorados. TypeScript terminou com zero erros; git diff --check aprovado. A infraestrutura em /tmp anterior não sobreviveu à interrupção: foi restaurada com as versões já autorizadas (firebase-tools 15.36.0, rules-unit-testing 6.0.0 e SDK de ferramentas 13.3.0). Isso não altera dependências do aplicativo. Emulador usa apenas demo-violeta-tests, nunca marista-app.

## Auditoria individual das seis turmas demonstrativas

O [inventário atualizado](inventario-turmas-retomada-etapa-i.csv) tem uma linha por turma, incluindo a turma de teste. Ele substitui operacionalmente o CSV histórico I4 de dezoito referências. IDs de documentos não concedem autoridade e não são UIDs de usuários.

Último inventário informado:

| Documento | professorId | coordenadorIds / ativo | Histórico |
| --- | --- | --- | --- |
| YmfxOaqzX6MhXIeEpg9n | Fictício | Ausentes | Referências adicionais não conferidas |
| je5wAt3FecFO1FYLyaJd | Fictício | Ausentes | Referências adicionais não conferidas |
| exTzTNDxOaMYgTglGfkU | Fictício | Ausentes | Referências adicionais não conferidas |
| R4BTEnXU7sx3cV8tvuNk | Fictício | Ausentes | Referências adicionais não conferidas |
| Nl0Q3TPKCvKwXqVhQV0l | Ausente | Ausentes | Chamada existente, preservação obrigatória |
| 9AV2XlIVeWL3NYlfP9IX | Fictício | Ausentes | Referências adicionais não conferidas |

Em todas: alunos:number, diaId:number e disciplina/horario/nome/status/turno:string. Nos cinco documentos com professor fictício há professorNome:string. CriadoEm/atualizadoEm estavam ausentes no inventário original.

A simples indicação number não comprova inteiro nem intervalo. Antes de afirmar exibição válida, conferir diaId inteiro entre 1 e 5, alunos inteiro não negativo e textos não vazios. Não foram fornecidos os valores completos nem confirmação atualizada desses campos. O leitor pode adaptar materia, mas aqui disciplina foi informada como presente.

Para cada uma das cinco turmas com professor fictício: manter como legado administrativo sem atribuí-la a professor/coordenador de teste. Ausência de coordenadorIds não concede acesso. Não substituir professorId pelo nome/email nem completar timestamps sem origem conhecida.

Para Nl0Q3TPKCvKwXqVhQV0l: preservar documento, ID e chamada. Não associar ao Professor Teste apenas para que a chamada apareça em seu Histórico. O acesso histórico segue o vínculo atual; alterá-lo transfere também acesso a dados antigos. Sem vínculo real, professor/coordenador não devem consultar essa chamada; admin ativo pode lê-la segundo a política.

Para teste-vinculo-uid-001: preservar os vínculos manuais relatados. Conferir apresentação, diaId, turno e metadados sem editar. A leitura professor/coordenador requer UID igual ao autenticado/atribuído e perfil válido/ativo. Não associar a ela o diário histórico de outra turma.

## Ajustes mínimos: leitura versus gravação

Para publicar regras restritivas e manter consulta administrativa aos legados, não é necessário regularizar os seis documentos. As regras locais permitem admin ativo ler esses registros independentemente de professorId/ativo/metadados. A interface ainda valida a estrutura de apresentação e pode omitir valores inválidos.

Não há patch de dados recomendado para execução imediata. Os seis documentos não satisfazem o contrato de criação/atualização administrativa: professorId válido, coordenadorIds, ativo, criadoEm e atualizadoEm são exigidos nas escritas. Acrescentar somente ativo ou array vazio não torna válidos os professores fictícios nem resolve criadoEm desconhecido.

Se futuramente uma turma precisar ser operacional, primeiro confirmar responsável e vínculo acadêmico, registrar todos os campos/tipos originais e aprovar o patch individual. A data de criação histórica não deve ser inventada para fazer a regra passar; a regularização desse caso pode exigir decisão de contrato separada. Não remover campos extras ou documentos incidentalmente.

Ativo false em turma não cria privacidade nem a esconde da leitura por vínculo; não usar como mecanismo de isolamento de testes. Nenhuma exclusão está aprovada ou é pré-requisito da publicação das regras.

## Homologação de segurança — atualização de 15/11/2026

### Evidência manual informada pelo responsável

Projeto marista-app, banco (default). As regras restritivas do arquivo local foram publicadas manualmente no Firebase Console, segundo confirmação do usuário. Professor, coordenador e administrador ativos foram testados no aplicativo; as turmas vinculadas apareceram conforme as permissões. O administrador inativo foi bloqueado corretamente.

Essa publicação já foi realizada pelo responsável; não permanece como tarefa pendente. Nenhuma publicação ou alteração em recursos externos foi executada pelo agente. Não foi obtida uma cópia autenticada das regras servidas no projeto nesta execução: o status publicado e os resultados manuais são evidência relatada pelo usuário, não inspeção independente do servidor.

Não foram informados como concluídos testes manuais específicos de leitura direta de perfis alheios, chamados de suporte ou do diário histórico por cada conta. Esses cenários possuem cobertura no emulador, mas não devem ser registrados como testes manuais realizados no projeto. Não é necessário alterar dados reais para tentar comprová-los.

### Integridade e política local

firestore.rules mantém exatamente o SHA-256 aprovado na revisão anterior:

```text
419495b8203d3fc7084dd644b1e59e32f117539a61bad0e8c0dd4d3842373f99
```

O arquivo é idêntico ao integrado na main. Autoridade vem de usuarios/{request.auth.uid}, com nome válido, role reconhecido e ativo booleano true. Próprio perfil permanece legível para diagnóstico, inclusive inativo; isso não concede acesso operacional. Nenhum cliente, mesmo admin, altera role/ativo; e-mail fixo não é autoridade.

Professor consulta professorId==UID; coordenador consulta sua presença em coordenadorIds; admin ativo tem escopo institucional. Chamadas permanecem somente leitura, com todas as gravações negadas. Suporte tem leitura própria por UID ou administrativa, criação própria e resolução administrativa restritas. Mutações de suporte e criação/assinatura de chamadas continuam indisponíveis na interface. Não houve alteração de interfaces, serviços ou contratos nesta conclusão.

As turmas demonstrativas não precisam de migração para continuarem legíveis pelo admin ativo. Não transferir seus vínculos ou o histórico para as contas de teste. O mesmo projeto mantém dados compartilhados: nomes de instância e prefixos de documento não criam isolamento de autorização. Console/Admin SDK não servem para provar regras cliente, pois têm autoridade própria.

### Cobertura dos cenários negativos solicitados

| Cenário | Evidência automatizada existente |
| --- | --- |
| Não autenticado sem dados protegidos | firestore.test.mjs: nega operações funcionais para anônimo |
| Inativo sem operações acadêmicas/suporte | firestore.test.mjs e seguranca-f2/regras.test.mjs: inativação, ativo ausente/inválido e mesma sessão bloqueada nos três papéis |
| Professor sem turma de terceiros | firestore.test.mjs: get/query alheios negados; F2: consulta por UID de outro professor negada |
| Coordenador sem turma não atribuída | firestore.test.mjs: vínculo explícito, get alheio, legado sem atribuição e query geral negados |
| Professor/coordenador sem administração | firestore.test.mjs: gestão de turma e perfil negada; F2: manipulação de vínculos e transação de promoção negadas |
| Próprio role/ativo imutáveis | firestore.test.mjs: update/substituição/lote; F2: remoção/merge e campos aninhados negados |
| Chamadas sem escrita | firestore.test.mjs e F2: criação, alteração, merge, assinatura e exclusão negados inclusive para admin |
| Suporte conforme escopo | firestore.test.mjs, serviços F1 e F2: leitura própria/admin, terceiros e legado sem UID, autoria forjada e resolução indevida |

Casos positivos também passam, evitando uma falsa segurança por negar tudo: consultas vinculadas, suporte próprio, administração legítima e diagnóstico do próprio perfil continuam permitidos conforme a política. A infraestrutura verifica o destino demo local antes de carregar SDKs e usa apenas dados sintéticos. As operações sob assertSucceeds/assertFails usam regras habilitadas; o bypass prepara fixtures ou simula alterações administrativas controladas no emulador.

A cobertura existente é suficiente para os cenários pedidos. Nenhum teste foi acrescentado ou alterado nesta execução. Não foram efetuadas tentativas de escrita contra o projeto publicado.

### Resultados da execução de conclusão

Resultado confirmado: **242 testes aprovados**, sem falhas, cancelamentos ou testes ignorados. São 134 locais e 108 no emulador (39 regras, 10 turmas, 14 acadêmicos, 6 calendário, 13 F1 e 26 F2). Todos os processos encerraram com código zero. TypeScript: zero erros. git diff HEAD --check e git diff --cached --check aprovados. git fsck não identificou corrupção; relatou apenas árvores sem referência, que não foram removidas.

SHA-256 de firestore.rules permaneceu igual ao aprovado. Hashes confirmaram que .env.example (arquivo e stage), .env.local, configuração TypeScript, testes, regras, índices e package-lock.json não foram modificados nesta execução. A main local também permaneceu inalterada. A varredura por padrões dos arquivos candidatos não identificou senhas literais, tokens privados ou chaves de serviço. A configuração pública fixa do Firebase é intencional e não deve ser substituída por marcadores.

### Situação da Etapa I e pendências

A homologação manual informada (três perfis ativos, vínculos exibidos e administrador inativo bloqueado), combinada com os testes negativos no emulador, fornece evidência para encerrar a revisão técnica de autorização. A integração da branch permanece sujeita à revisão e aprovação do responsável.

Pendências sem modificação automática:

- Opcionalmente complementar o registro manual com leitura de suporte por UID e do histórico: admin consulta o legado; professor/coordenador não recebem histórico sem vínculo. Não registrar como feito sem evidência.
- Guardar, pelo responsável e fora do Git, a versão/data da publicação do Console e, se disponível, texto/hash efetivamente publicado. Não depende de credencial administrativa em script.
- Valores e tipos completos das seis turmas continuam baseados no último inventário fornecido. Preservar todos os documentos e a chamada histórica; qualquer regularização é uma tarefa separada com aprovação individual.
- Revisar e aprovar os commits/PR desta branch. Não há nova publicação de regras, migração, funcionalidade acadêmica ou trabalho de interface específico por perfil autorizado por este relatório.

Em futuras falhas de acesso, suspender a liberação e diagnosticar perfil, vínculo, consulta e índice antes de considerar regras. Não restaurar permissões amplas automaticamente nem alterar usuários para fazer um teste passar.

## Organização recomendada de commits — não executada

1. Configuração e testes: .env.example (já no stage manual), README.md, remoção firebase.js, novos firebase.ts/firebase-config.ts e testes/configuracao/firebase.test.cjs.
2. Documentação: planos históricos I1/I2/I4 com avisos, CSV histórico I4, este relatório e o CSV atualizado. Conservar as informações antigas como histórico explicitamente marcado, sem apresentá-las como inventário atual.

Lista exata dos 12 caminhos candidatos (inclui a remoção do arquivo JavaScript):

- `.env.example`
- `README.md`
- `docs/arquitetura/configuracao-e-organizacao-etapa-i4.md`
- `docs/arquitetura/configuracao-homologacao-etapa-i2.md`
- `docs/arquitetura/homologacao-etapa-i1.md`
- `docs/arquitetura/inventario-firebase-etapa-i4.csv`
- `docs/arquitetura/inventario-turmas-retomada-etapa-i.csv`
- `docs/arquitetura/retomada-etapa-i.md`
- `src/config/firebase-config.ts`
- `src/config/firebase.js`
- `src/config/firebase.ts`
- `tests/configuracao/firebase.test.cjs`

Não incluir .env.local, senhas/UIDs de usuários, contas de serviço, caches, logs, ferramentas em /tmp ou lockfile inalterado. Não há alteração de firestore.rules/índices para incluir nesta branch. Conferir stage final antes de qualquer commit; o stage manual foi preservado nesta execução.

## Limites

Nenhum documento, conta ou regra publicada foi modificado. As alterações manuais são fatos informados pelo responsável; os dados completos atuais não foram consultados por script administrativo. Os IDs e os campos acima vêm do último inventário compartilhado, não de nova leitura autenticada. Não foi exigido serviço pago ou exportação gerenciada.

Referência sobre configuração pública e restrições de chave: https://firebase.google.com/docs/projects/api-keys.
