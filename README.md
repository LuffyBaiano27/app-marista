# 💜 Sistema Violeta - Gestão Educacional

O **Sistema Violeta** é um SaaS educacional desenvolvido em **React Native (Expo)** para apoiar a rotina acadêmica de Professores, Coordenadores e Administradores.

## 🚀 Tecnologias Utilizadas
- **Frontend:** React Native, Expo Router, TypeScript
- **Backend / BaaS:** Firebase (Firestore Database & Authentication)
- **Estilização:** StyleSheet nativo responsivo, com suporte a **Sistema**, **Claro** e **Escuro**
- **Ícones:** Ionicons (Expo Vector Icons)

## 📌 Funcionalidades Principais
- **Dashboard Personalizado:** Métricas em tempo real e ações adaptadas ao perfil (`Admin`, `Coordenador` e `Professor`).
- **Diário de Classe Digital:** Registro de frequência com janela de 24h e bloqueio automático após assinatura.
- **Central de Auditoria & Consultas:** Histórico administrativo, chamados encerrados, diários e consulta de alunos/notas.
- **Gestão de Suporte Técnico:** Abertura, acompanhamento, resolução com auditoria e reabertura de chamados.
- **Controle de Acessos & Preferências:** Permissões por cargo, tema global, escala de fonte, notificações e gerenciamento de sessões.

---

## ✅ Checklist de Evolução

### 🟢 Concluído

#### Arquitetura, Tema e Feedback
- [x] Contexto global (`demoProfileContext`) gerenciando perfil, modo de tema (`Sistema`, `Claro`, `Escuro`) e tema ativo.
- [x] Layout das abas (`(tabs)/_layout.tsx`) e telas principais sincronizados ao tema global com contraste legível.
- [x] Componente `FeedbackToast` animado com barra regressiva, suporte em modais e adaptação a fundos claros e escuros.

#### Entrada e Navegação
- [x] Tela inicial (`src/app/index.tsx`) com animação de abertura, tema integrado, `FeedbackToast` e tratamento de login/recuperação/criação de admin.

#### Perfil e Segurança
- [x] Alteração de senha com confirmação, validação e aviso de desconexão das demais sessões.
- [x] Seletores funcionais de tema e tamanho de fonte, toggle de notificações com ícone de sino e modal de **Sessões Ativas** (encerrar sessão individual ou encerrar outras sessões).
- [x] Ferramentas administrativas: diagnóstico de integridade, backup em segundo plano e limpeza de registros de teste com confirmação própria no app.

#### Gestão Administrativa, Turmas, Usuários e Chamados
- [x] **Home (`(tabs)/index.tsx`):** KPIs sincronizados, sincronização manual com horário, modais de **Novo Usuário** e **Nova Turma** e exportação **CSV**.
- [x] **Usuários (`usuarios.tsx`):** ativar/inativar, editar dados e cargo, redefinir senha inicial, excluir usuário e proteção de conta de Administrador.
- [x] **Turmas (`turmas.tsx`):** visão administrativa com resumo, filtro por turno, alunos por turma e modal de criar/editar/excluir (com bloqueio quando há alunos vinculados), além das visões de coordenação/docência.
- [x] **Chamados (`chamados.tsx`):** criação, filtros, **Auditoria de Resolução** com nota técnica, encerramento e reabertura.
- [x] **Histórico (`historico.tsx`):** botão de voltar e abas organizadas por perfil.

### 🟡 Próximos Passos
- [ ] **Perfis de Professor e Coordenador:** aplicar e revisar as modificações específicas das telas, fluxos e ações para os perfis de Professor e Coordenador.
- [ ] **Validação em Build:** testar todo o fluxo de tema global, fonte, modais e notificações na build mobile e na web.
- [ ] **Coordenação:** implementar fluxo de cadastro e alocação de novos alunos nas turmas.
- [ ] **Identidade Visual:** adicionar o arquivo do ícone oficial do app e vinculá-lo na tela inicial.
---

## 💻 Como Rodar o Projeto

1. Clone o repositório:
   ```bash
   git clone [https://github.com/LuffyBaiano27/app-marista.git](https://github.com/LuffyBaiano27/app-marista.git)
Acesse a pasta do projeto:

Bash
cd app-marista
Instale as dependências:

Bash
npm install
Inicie o servidor Expo:

Bash
npx expo start -c
🔐 Configuração do Firebase
Crie um arquivo .env.local na raiz do projeto com as variáveis do Firebase:

Snippet de código
EXPO_PUBLIC_FIREBASE_API_KEY=sua_api_key
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=seu_domain
EXPO_PUBLIC_FIREBASE_PROJECT_ID=seu_project_id
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=seu_bucket
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=seu_sender
EXPO_PUBLIC_FIREBASE_APP_ID=seu_app_id


👩‍💻 Equipe de Desenvolvimento
LuffyBaiano (Infraestrutura, Banco de Dados, React Native)

Larissa Alves (Infraestrutura, Banco de Dados, React Native)

Aryane (Infraestrutura, Banco de Dados, React Native)

© 2026 Sistema Violeta. Todos os direitos reservados. Salvador, BA.