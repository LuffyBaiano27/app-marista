# Sistema Violeta

MVP acadêmico de gestão educacional para uma instituição, desenvolvido com React Native, Expo Router, TypeScript, Firebase Authentication e Cloud Firestore.

## Estado atual

- Login/logout reais, restauração de sessão, identidade em usuarios/{uid} e proteção de rotas.
- Acesso operacional exige perfil válido e ativo. Professor consulta turmas por professorId; coordenador por coordenadorIds; administrador ativo tem o escopo institucional documentado.
- Início/Turmas usam dados autorizados, grade semanal e calendário America/Bahia.
- Histórico e diários existentes são somente leitura, limitados às turmas autorizadas.
- Suporte tem leitura por UID e serviços de criação/resolução testados; suas ações permanecem desabilitadas na interface.
- Regras de autorização locais foram validadas no emulador. Isso não comprova que estejam publicadas: publicação depende de autorização e verificação próprias.

Criação/assinatura de chamadas, avaliações, notas, recuperação de senha e demais fluxos incompletos não estão disponíveis. O modal de notificações do Início ainda contém uma demonstração local sem persistência; não representa eventos reais. Consulte o [relatório de estabilização](docs/arquitetura/estabilizacao-etapa-g.md).

## Executar localmente

Com Node e as dependências do projeto já disponíveis:

```sh
npm start
```

O manifesto atual utiliza Expo 58. Não atualizar dependências ou regenerar o lockfile incidentalmente. Para um ambiente novo, a instalação deve seguir a revisão do package-lock.json e o procedimento aprovado pela equipe.

A configuração atual do cliente Firebase está em src/config/firebase.js; não há leitura de variáveis .env implementada. Ela aponta para o projeto compartilhado: não executar scripts de carga, migração ou testes de escrita nesse projeto. Identificadores públicos do cliente não substituem regras de segurança. Nunca incluir chaves privadas, contas de serviço, senhas ou credenciais de ferramentas no repositório.

## Verificações

```sh
./node_modules/.bin/tsc --noEmit
git diff --check
```

Os comandos dos testes locais estão em [tests/seguranca-f1/README.md](tests/seguranca-f1/README.md). A suíte do emulador e os requisitos das ferramentas isoladas estão em [tests/seguranca-f2/README.md](tests/seguranca-f2/README.md). Não exigem login no Firebase: usam apenas projeto demo e dados sintéticos. Não executar testes paralelos contra o mesmo banco de emulador.

## Arquitetura e segurança

- [Contratos de dados](docs/arquitetura/contratos-dados.md)
- [Matriz de permissões e provisionamento](docs/arquitetura/permissoes-seguranca.md)
- [Regras efetivas, testes, publicação e reversão](docs/arquitetura/seguranca-etapa-f2.md)
- [Relatório final de estabilização e pendências](docs/arquitetura/estabilizacao-etapa-g.md)

Os documentos A–F registram a evolução. Para o estado atual, prevalecem F2/G: chamadas sem gravações, até quatro coordenadores por turma e observação do perfil em tempo real desde F1. Não publicar regras junto com alterações do aplicativo sem revisão do projeto, dos dados legados e da versão cliente.

## Equipe

LuffyBaiano (infraestrutura, banco de dados e React Native), Larissa Alves e Aryane.

© 2026 Sistema Violeta. Salvador, BA. Consulte LICENSE.
