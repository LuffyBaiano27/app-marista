# Sistema Violeta

Sistema de gestão educacional desenvolvido como projeto acadêmico, com foco na organização de turmas, acompanhamento de atividades escolares e controle de acesso por perfil de usuário.

A aplicação utiliza **React Native, Expo Router, TypeScript e Firebase**, com suporte à autenticação, persistência de dados e autorização baseada em perfis.

**Status:** MVP em desenvolvimento | Homologação em andamento

## Tecnologias

- **React Native + Expo SDK 58** — Desenvolvimento da aplicação.
- **Expo Router** — Navegação e gerenciamento de rotas.
- **TypeScript** — Tipagem estática.
- **Firebase Authentication** — Autenticação e gerenciamento de sessões.
- **Cloud Firestore** — Persistência de dados.
- **Firebase Security Rules** — Controle de acesso aos documentos.

## Funcionalidades

O MVP contempla:

- Autenticação e proteção de rotas.
- Identificação de usuários por perfil e status de ativação.
- Consulta de turmas conforme permissões.
- Grade semanal e calendário acadêmico.
- Consulta ao histórico de chamadas.
- Estrutura de atendimento e acompanhamento de suporte.

### Perfis de acesso

| Perfil            | Escopo                                                              |
| ----------------- | ------------------------------------------------------------------- |
| **Administrador** | Acesso institucional e funcionalidades administrativas autorizadas. |
| **Coordenador**   | Consulta às turmas vinculadas ao seu usuário.                       |
| **Professor**     | Consulta às turmas sob sua responsabilidade.                        |

A personalização completa das interfaces por perfil está prevista nas próximas etapas.

> **Limitações atuais:** criação e assinatura de chamadas, avaliações, notas, recuperação de senha e ações de suporte na interface ainda não estão disponíveis. As notificações utilizam dados demonstrativos.

## Executar localmente

### Pré-requisitos

- Node.js e npm.
- Git.
- Acesso ao repositório privado.

### Instalação

Clone o repositório e acesse o diretório do projeto:

```bash
git clone https://github.com/LuffyBaiano27/app-marista.git
cd app-marista
```

Instale as dependências utilizando o lockfile versionado:

```bash
npm ci
```

Configure o ambiente:

```bash
test -e .env.local || cp .env.example .env.local
```

Inicie a aplicação no navegador:

```bash
npx expo start --web
```

A aplicação estará disponível, normalmente, em `http://localhost:8081`.

**Configuração:** o `.env.example` contém os valores públicos oficiais do Firebase `marista-app`. Não é necessário preencher variáveis manualmente.

O arquivo `.env.local` é ignorado pelo Git. O comando acima preserva um arquivo local já existente. Não colocar senhas de usuários ou credenciais administrativas nesses arquivos.

## Ambiente e segurança

O projeto utiliza o Firebase compartilhado `marista-app`, com configuração de homologação.

A inicialização valida as variáveis de ambiente e bloqueia configurações incompatíveis com o projeto autorizado.

**Atenção:** o modo de homologação não isola dados ou usuários. Todos os integrantes utilizam o mesmo projeto Firebase.

As regras restritivas foram publicadas manualmente em marista-app, banco (default), conforme confirmação do responsável. Os três perfis ativos e o bloqueio do administrador inativo foram homologados manualmente. A cobertura automatizada e os limites dessa validação estão no relatório da Etapa I.

Não versionar senhas, chaves privadas, contas de serviço ou tokens administrativos.

## Testes

Verificação de tipos:

```bash
npx tsc --noEmit
```

Testes de configuração do Firebase:

```bash
node --test --test-isolation=none tests/configuracao/firebase.test.cjs
```

Verificação de alterações:

```bash
git diff --check
```

As instruções dos testes de segurança estão disponíveis em:

- [Testes de segurança — F1](tests/seguranca-f1/README.md)
- [Testes com Firebase Emulator — F2](tests/seguranca-f2/README.md)

## Documentação

| Documento                                                                                  | Descrição                                 |
| ------------------------------------------------------------------------------------------ | ----------------------------------------- |
| [Contratos de dados](docs/arquitetura/contratos-dados.md)                                  | Estrutura e validação dos dados.          |
| [Permissões e segurança](docs/arquitetura/permissoes-seguranca.md)                         | Perfis e regras de autorização.           |
| [Segurança — F2](docs/arquitetura/seguranca-etapa-f2.md)                                   | Testes, publicação e reversão das regras. |
| [Estabilização — G](docs/arquitetura/estabilizacao-etapa-g.md)                             | Funcionalidades e limitações atuais.      |
| [Homologação — I1 (histórico)](docs/arquitetura/homologacao-etapa-i1.md)                               | Planejamento da homologação.              |
| [Configuração e organização — I4 (histórico)](docs/arquitetura/configuracao-e-organizacao-etapa-i4.md) | Configuração e inventário do Firebase.    |

O estado atual e as pendências estão no [relatório de retomada da Etapa I](docs/arquitetura/retomada-etapa-i.md).

## Desenvolvimento

O projeto está em fase de homologação, com foco nas seguintes atividades:

1. Conclusão da configuração e organização do Firebase.
2. Validação das permissões dos perfis.
3. Adequação das interfaces de Administrador, Coordenador e Professor.
4. Testes integrados e estabilização.

## Equipe

- **LuffyBaiano**&#x20;
- **Larissa Alves**
- **Aryane Andrade&#x20;**

## Licença

Consulte o arquivo [LICENSE](LICENSE).

---

© 2026 Sistema Violeta.
