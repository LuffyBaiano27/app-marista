# Etapa I2 — configuração local do Firebase

Registro histórico: a decisão de projeto separado e o bloqueio de marista-app foram substituídos na I4. A configuração pública fixa e o estado atual estão em retomada-etapa-i.md. Não seguir as instruções antigas de preenchimento abaixo. Os resultados e o comportamento abaixo descrevem a execução anterior da I2.

## Escopo

Branch feat/homologacao-perfis-usuarios criada a partir da main em 3f823f5. O documento local da I1 foi preservado sem edição. Nenhuma mudança foi aplicada à main, aos recursos Firebase ou às funcionalidades incompletas. Não houve commit, push, instalação ou deploy.

A configuração fixa src/config/firebase.js foi substituída por src/config/firebase.ts, mantendo os imports existentes e as exportações auth, db e default. A validação pura está em firebase-config.ts. Somente homologacao está habilitado nesta etapa; outros ambientes exigem definição explícita posterior, sem inferência por NODE_ENV ou fallback.

## Como configurar após aprovação do projeto

1. Obter do responsável o projectId aprovado, a configuração do app Web Firebase e o número do projeto de homologação. Não usar dados do projeto compartilhado. Nenhum projeto foi criado nesta etapa.
2. Copiar o exemplo apenas se .env.local não existir; se já existir, revisá-lo manualmente, sem sobrescrever valores:

```sh
test -e .env.local || cp .env.example .env.local
```

3. Editar os valores localmente:

| Variável | Valor esperado |
| --- | --- |
| EXPO_PUBLIC_APP_ENV | homologacao, exatamente |
| EXPO_PUBLIC_FIREBASE_EXPECTED_PROJECT_ID | ID do destino aprovado, conferido independentemente no Console |
| EXPO_PUBLIC_FIREBASE_PROJECT_ID | Mesmo ID, na configuração do app Web |
| EXPO_PUBLIC_FIREBASE_API_KEY | Chave pública de cliente do app Firebase, no formato aceito |
| EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN | projectId.firebaseapp.com, sem protocolo ou caminho |
| EXPO_PUBLIC_FIREBASE_APP_ID | ID Web do formato 1:numero:web:identificador hexadecimal |
| EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID | Número decimal do projeto, igual ao componente numérico do appId |
| EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET | projectId.firebasestorage.app ou projectId.appspot.com |

StorageBucket é opção de cliente, não habilita nem exige que esta etapa crie Storage. Analytics/measurementId não são utilizados. A opção EXPECTED_PROJECT_ID é uma conferência contra erro operacional, não prova criptográfica de aprovação. Não há ID real de homologação conhecido nesta execução; o responsável deve confirmar os valores no Console. Formato e coerência não comprovam que uma apiKey/appId pertença ao projeto nem que as regras estejam publicadas.

4. Verificar variáveis já exportadas no shell e arquivos .env.* de maior precedência para evitar valores antigos sobrepondo .env.local. O SDK atual é Expo 58; a leitura usa somente process.env.EXPO_PUBLIC_NOME com referência estática. Não usar destructuring, acesso dinâmico, .env.homologacao ou NODE_ENV para escolher o ambiente.
5. Depois da aprovação do destino, regras e dados, parar qualquer Metro anterior e executar:

```sh
./node_modules/.bin/expo start --web --clear
```

Recarregar completamente o app e usar perfil de navegador separado. Em dispositivo, validar compatibilidade com o SDK antes de usar Expo Go/LAN. Nenhum servidor foi iniciado nesta etapa. Limpar cache de bundle não remove dados de sessão do navegador; não reutilizar perfis de ambientes diferentes.

O .env.example é intencionalmente inválido até todos os marcadores serem preenchidos. Não introduzir chave pública fictícia com formato válido para tentar iniciar sem um projeto aprovado. Senhas de usuários, tokens administrativos e contas de serviço nunca vão em arquivos EXPO_PUBLIC: seus valores ficam visíveis no bundle.

## Bloqueios e isolamento

- Todo campo exigido precisa ser string não vazia, sem espaços periféricos, e corresponder ao formato esperado.
- projectId deve ser válido, igual ao esperado, diferente de marista-app e não começar por demo-. O caminho de emulador permanece exclusivamente no harness de teste.
- authDomain e storageBucket precisam corresponder ao projeto. appId precisa ser Web e consistente com messagingSenderId. Domínios/buckets personalizados não estão habilitados; antes de usá-los será necessário adaptar e testar o contrato.
- Validação ocorre antes de getApps/initializeApp/getAuth/getFirestore. Erro menciona o campo sem incluir seus valores; aparece explicitamente na inicialização, não como login funcional contra um backend alternativo.
- App nomeado violeta-homologacao-projectId, separado da instância default. Auth e Firestore vêm da mesma instância; nunca se reutiliza a default ou outro projeto.
- Fast Refresh reutiliza somente app com mesmo nome e opções. Mudança de opções para o mesmo nome produz erro e exige reinício/reload; mudança de projeto usa outro namespace. Para isolamento de caches/sessões durante testes reais, manter contextos de navegador/dispositivo separados.
- Isso previne erro de destino no cliente; não concede permissão, não verifica credenciais no servidor e não substitui as regras Firestore. A configuração pública pode ser alterada por quem recompila o cliente, portanto a autorização continua no servidor.

Não foram adicionados indicadores visuais às telas nesta etapa: a I2 altera configuração e documentação; a identificação visual proposta na I1 permanece pendente. Nenhuma conta é criada automaticamente para contornar configuração ausente.

## Testes

58 novos cenários usam código real transpilado e SDKs substituídos: nenhum chama Firebase real nem lê .env.local. Cobrem configuração válida, cada campo ausente/vazio/espaços/tipo inválido, formatos inválidos, campos cruzados, destinos bloqueados, ambientes não habilitados, ausência de fallback, instância default indevida, reutilização segura, mudança de configuração, isolamento por projeto e mensagens sem valores. Há verificações das referências estáticas Expo e regras do gitignore.

Comando isolado:

```sh
node --test --test-isolation=none tests/configuracao/firebase.test.cjs
```

Comando de todos os testes sem emulador:

```sh
node --test --test-isolation=none tests/configuracao/firebase.test.cjs tests/calendario/calendario.test.cjs tests/calendario/relogio.test.cjs tests/calendario/acoes.test.cjs tests/turmas/grade.test.cjs tests/academico/leitura.test.cjs tests/academico/sessao.test.cjs tests/firestore/ambiente.test.mjs tests/seguranca-f1/autenticacao.test.cjs tests/seguranca-f1/suporte.test.cjs tests/seguranca-f1/interface.test.cjs
```

São 133 testes locais (75 anteriores + 58 novos). O runner documentado em tests/seguranca-f2/README.md executa outros 108 no emulador demo, totalizando 241. Não apontar esse harness a projetos reais.

## Resultado da execução

TypeScript strict: zero erros. 241 testes passaram (133 locais e 108 no emulador), sem falhas. git diff --check aprovado. Sintaxe dos testes e whitespace dos novos arquivos conferidos. Os testes de configuração não importam SDKs reais; os demais usam somente dados sintéticos no emulador. Não foi feita validação online de um projeto de homologação nem iniciado Expo com credenciais reais.

## Arquivos e continuidade

- Substituído src/config/firebase.js por src/config/firebase.ts.
- Criados src/config/firebase-config.ts, .env.example e tests/configuracao/firebase.test.cjs.
- Atualizado README.md e criado este guia.
- .gitignore revisado e preservado: .env.local/.env.* e nomes usuais de contas de serviço são ignorados; .env.example é permitido. Arquivos ignorados também precisam de revisão humana; o padrão não reconhece qualquer possível nome de segredo nem remove arquivos já rastreados.
- Plano da I1, lockfile, regras/índices, serviços e demais telas preservados. .env.local não foi criado.

Próximo passo depende de validação desta implementação e autorização para criar/configurar o projeto separado. Sem esse projeto, o aplicativo não pode ser validado online, intencionalmente. Provisionamento de contas, publicação de regras/índices e carga de dados continuam fora do escopo executado.

## Referências

- https://docs.expo.dev/versions/v57.0.0/ (leitura exigida pelo AGENTS.md)
- https://docs.expo.dev/guides/environment-variables/ (inlining, precedência, arquivos locais e caráter público)
