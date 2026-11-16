# Etapa I4 — projeto único marista-app

Atualização após a interrupção: o arquivo .env.example agora contém a configuração pública fixa oficial; não há preenchimento manual. .env.local já foi criado e deve ser preservado. As contagens e o CSV de 18 referências abaixo são históricos, anteriores à reorganização manual. Seguir retomada-etapa-i.md para o estado atual.

## Decisão e execução local

A validação usa exclusivamente marista-app. EXPO_PUBLIC_APP_ENV=homologacao é somente um modo de execução no mesmo backend: não isola contas, dados, regras ou permissões. Não criar outro projeto.

Branch de trabalho: feat/homologacao-perfis-usuarios. A main não foi alterada. A I4 modifica somente configuração local, testes e documentação; não cria .env.local, usuários ou documentos no Firebase publicado e não publica regras, índices, commits ou deploy. O plano da I1 e o relatório I2 são históricos; suas recomendações de projeto separado foram superadas por esta decisão.

## Configuração atual

Antes de initializeApp:

- Exigir EXPO_PUBLIC_APP_ENV exatamente homologacao.
- Exigir EXPO_PUBLIC_FIREBASE_PROJECT_ID e EXPO_PUBLIC_FIREBASE_EXPECTED_PROJECT_ID explicitamente iguais a marista-app. Se faltarem ou divergirem, interromper; não preencher automaticamente com o ID permitido.
- Preservar validações de apiKey, appId Web, número do projeto, domínio e bucket. As duas variantes de bucket aceitas são marista-app.firebasestorage.app e marista-app.appspot.com.
- Rejeitar todo outro projeto, mesmo quando projectId/expectedProjectId coincidem e as demais opções são coerentes.
- Manter referência estática process.env.EXPO_PUBLIC_NOME, sem fallback, com erro explícito sem expor os valores recebidos.

Authentication e Firestore continuam na mesma instância nomeada violeta-homologacao-marista-app; a instância default não é reutilizada. O nome evita reaproveitamento acidental de instância cliente, mas NÃO cria separação de dados no servidor. Mudança das opções para uma instância já carregada exige reinício completo.

O preenchimento correto comprova somente formato e coerência local; não comprova autenticidade da configuração, regras publicadas ou permissões do usuário. Nenhuma opção pública de ambiente concede autoridade. A fonte de autorização permanece usuarios/{UID}, seus campos protegidos e vínculos por UID.

## Configuração local atual

Copiar a configuração pública fixa apenas quando não existir arquivo local:

```sh
test -e .env.local || cp .env.example .env.local
```

Não preencher valores manualmente nem sobrescrever .env.local existente. O projeto deve continuar marista-app e o modo homologacao não oferece isolamento. Para executar, seguir o README atual. Nenhum desses arquivos pode conter senha, token privado ou conta de serviço.

## Inventário preparado e limite de conhecimento

[inventario-firebase-etapa-i4.csv](inventario-firebase-etapa-i4.csv) contém 18 referências de auditoria, não 18 documentos lidos. A fonte é a contagem informada pelo usuário: três usuarios, treze turmas, uma chamada e um chamado de suporte. Não foi feita leitura autenticada do Console/Firestore nem execução de script administrativo. Não há IDs/UIDs pessoais ou dados originais no CSV.

U-01 a U-03 representam os três perfis a conferir. T-TESTE representa a turma de teste informada; T-01 a T-12 representam os outros doze documentos, sem presumir quais são demonstrativos. C-01 e S-01 representam os dois registros históricos. Essas referências são etiquetas para o levantamento, não IDs reais, UIDs ou evidência de autorização.

A correspondência de cada referência ao caminho real precisa ser mantida pelo operador em controle restrito fora do Git. Não se presume ordem do Console, quantidade de perfis ativos, distribuição entre roles nem que os três documentos correspondam a três contas Auth. Contagens também não descartam subcoleções; conferir sua existência sem excluir nada.

Sem os documentos individuais não é possível afirmar quais têm campos ausentes, qual UID deve substituir prof_1/2/3 ou quais são descartáveis. Todas as ações do CSV são condicionais. Nenhuma exclusão está recomendada como pronta para execução, nem mesmo a da turma de teste.

## Compatibilidade e proposta por coleção

| Coleção | Leitura atual | Recomendação condicionada à conferência |
| --- | --- | --- |
| usuarios | Nome válido, role professor/coordenador/admin e ativo booleano; só true libera operação | Confirmar UID no Authentication e legitimidade de privilégios. Revisar cada role/ativo individualmente. Não criar perfil padrão. Metadados só com origem confiável, sem inventar criação histórica. |
| turmas | Nome, disciplina ou materia, horario e diaId de 1–5; UID controla consulta | Conferir campos, professorId real, coordenadorIds e vínculo acadêmico aprovado. Para gravação administrativa, contrato local exige também turno, ativo e timestamps, com até quatro coordenadores ativos distintos. |
| chamadas | turmaId e alunos válidos; data pode permanecer desconhecida no histórico | Preservar integralmente. Conferir referência da turma e formato temporal; não preencher autoria, data ou assinatura por inferência. Não habilitar contrato de gravação. |
| chamados_suporte | Descrição/status válidos, autoria explícita ou desconhecida, Timestamp/numérico legado | Sem solicitanteUid comprovado, manter legado só para administração; não associar pelo nome. Alterações estruturais precisam de comprovação e aprovação própria. |

Para cada U-01/U-02/U-03: registrar existência da conta, campos/tipos e pendências. Correção de autoridade somente por decisão do responsável, nunca por script ou login automático. Se houver CPF/e-mail redundante, apenas registrar sua existência de forma não identificável; remoção futura depende de análise e aprovação, não desta auditoria.

Para cada T-01 a T-12: se professorId for demonstrativo, registrar mapeamento pendente. Não substituir em lote. Se faltar coordenadorIds, coordenador não recebe vínculo. Se usar materia ou tiver diaId incorreto, propor patch campo a campo sem apagar valores originais. Se já estiver compatível, a ação é manter. CriadoEm ausente não deve receber uma data histórica inventada para satisfazer o contrato de escrita; isso requer uma decisão explícita de regularização.

Para T-TESTE: conservar o vínculo real já confirmado anteriormente até nova conferência. Não associar automaticamente à futura conta de teste. Reutilização, mudança de responsável ou exclusão precisam de autorização própria, incluindo revisão das chamadas referenciadas.

Para C-01: se a turma for órfã, não escolher outra turma por nome. Registrar para análise administrativa; o histórico original permanece. dataChamada Timestamp, string local ou sem fuso não deve ser convertido automaticamente. Indicador diário atual exige string UTC canônica com milissegundos; a ausência de data confiável não impede preservar o documento, mas impede presumir status diário.

Para S-01: nome/cargo não comprovam autoria. Se não houver UID confirmado, manter sem atribuição e sem tornar visível a professor/coordenador. Resolução de suporte não é padronização de dados e permanece desabilitada na interface.

## Regras e consultas

O código mantém as consultas professorId == UID, coordenadorIds array-contains UID, chamados por turma autorizada e suporte solicitanteUid == UID. Admin ativo tem consultas gerais. Regras não filtram resultados. O composto existente em firestore.indexes.json continua turmaId ASC/dataChamada DESC; estado publicado deve ser conferido, não recriado incidentalmente.

A política local exige perfil ativo válido, protege role/ativo contra alterações cliente, nega criação/exclusão de perfis, nega todas as gravações de chamadas e restringe suporte. O próprio perfil continua legível para diagnóstico. Para turma, criadoEm é imutável e atualizadoEm de uma gravação SDK deve corresponder a request.time. Atualizar um legado incompleto pelo cliente pode falhar mesmo que ele seja legível. Campos extras podem também impedir updates; não removê-los para contornar a regra sem aprovação.

Ativo false na turma não a arquiva de forma privada: a leitura histórica continua pelo vínculo. Alterar professor/coordenadores transfere acesso ao histórico existente. Admin de teste pode ler dados reais do mesmo projeto; prefixos de teste não oferecem isolamento. Não distribuir acesso administrativo ao grupo sem essa decisão explícita.

Regras publicadas ainda não foram comparadas nesta execução. Antes de criar contas de teste ou liberar o grupo, obter o texto integral e revisar permissões sobrepostas. Se ainda forem amplas, as proteções locais da interface não impedem outro cliente de tentar operações indevidas.

## Registro antes de qualquer alteração — sem serviço pago obrigatório

O operador registra, em pasta restrita fora do Git, antes de cada alteração autorizada:

- Projeto, database, caminho exato, referência anônima do CSV e momento da captura.
- Todos os campos e tipos originais, incluindo campos desconhecidos e subcoleções existentes. Diferenciar campo ausente de null, Timestamp de string, inteiro/double e arrays de mapas. Preservar referências, bytes ou GeoPoint caso existam.
- Para cada campo que será afetado: estado anterior completo, valor/tipo proposto, motivo, aprovador e executor.
- Evidência de revisão por segunda pessoa quando possível. Screenshots podem complementar, mas não substituem registro completo tipado e conferido.

Não colocar o conteúdo original, nomes, e-mails, UIDs ou dados de alunos no CSV versionado. Não registrar senhas. Não criar uma coleção de backup no próprio Firestore sem autorização. Exportação gerenciada/plano pago não são pré-requisitos desta proposta; o volume reduzido permite avaliar captura manual tipada dos documentos afetados, desde que seja completa e restaurável. Se um campo não puder ser registrado corretamente, suspender o patch.

Guardar também texto/hash das regras e configuração dos índices fora do Git quando obtidos. Firestore e Authentication são recursos distintos: preservar as contas existentes; registrar apenas metadados necessários no controle restrito, sem hashes de senha nem scripts administrativos.

## Execução futura pelo Console — proposta, não autorizada por este documento

1. Conferir marista-app/database (default), operador autorizado e janela sem alterações concorrentes.
2. Associar cada referência do CSV ao documento real no controle restrito; revisar subcoleções e o total atual. Preencher pendências sem dados pessoais no inventário compartilhável.
3. Obter/comparar regras publicadas e conferir privilégios existentes; não conceder novas permissões durante o levantamento.
4. Selecionar um documento e produzir seu registro original tipado, patch proposto e plano de reversão. Não aprovar a coleção inteira por conveniência.
5. Submeter a alteração individual ao responsável. Antes de executar, conferir que o documento não mudou desde a captura; se mudou, parar e reapresentar o patch.
6. Somente com autorização posterior: aplicar os campos aprovados pelo Console, conferir tipos e não substituir o documento inteiro nem remover campos desconhecidos.
7. Validar leitura, vínculo, calendário e histórico com conta cliente apropriada e regras aprovadas. Console privilegiado não comprova regras de segurança. Tentativas destrutivas continuam somente no emulador.
8. Registrar resultado e nova captura; prosseguir para outro documento apenas após validação. Qualquer exclusão futura exige solicitação individual com impacto em todas as referências, fora desta execução.

Reversão: requer autorização e usa os campos/tipos originais do documento correspondente. Não sobrescrever alterações posteriores. Se um campo foi acrescentado, sua eventual remoção também deve estar prevista e aprovada. Não restaurar coleções em lote nem regras permissivas para resolver falhas. Sem registro fiel e aprovação, não executar modificação.

## Resultado da validação I4

TypeScript strict: zero erros. 242 testes aprovados: 134 locais (75 anteriores + 59 de configuração) e 108 no Firebase Emulator Suite. Nenhuma falha. git diff --check, sintaxe dos testes e conferência do CSV aprovados. Não houve teste de conexão ao projeto publicado, pois .env.local não foi preenchido e não foram utilizadas opções ou credenciais reais. Os únicos documentos de teste são sintéticos no emulador demo.

## Testes e arquivos

Os testes de configuração usam API key/appId/número sintéticos e SDKs substituídos; o ID público marista-app serve apenas para validar a allowlist. Não inicializam Firebase real, não fazem login nem consultam/gravam o projeto. O harness do emulador continua exigindo demo-violeta-tests e destino local, independente da configuração do app.

Alterações I4: src/config/firebase-config.ts, .env.example, tests/configuracao/firebase.test.cjs, README.md e aviso histórico no guia I2. Criados este guia e o CSV. src/config/firebase.ts, serviços, tipos acadêmicos, regras, índices, package-lock.json e main preservados nesta etapa. .env.local não foi criado.

A configuração agora aceita o projeto aprovado, mas não há arquivo com opções reais nem autorização implícita para executar testes contra o banco compartilhado. A conclusão do inventário individual depende da conferência sanitizada dos documentos no Console pelo responsável.
