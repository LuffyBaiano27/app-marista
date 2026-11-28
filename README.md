# 💜 Sistema Violeta - Gestão Educacional

O **Sistema Violeta** é um SaaS educacional desenvolvido em **React Native (Expo)** para apoiar a rotina acadêmica de Professores, Coordenadores e Administradores.

## 🚀 Tecnologias Utilizadas
- **Frontend:** React Native, Expo Router, TypeScript
- **Backend / BaaS:** Firebase (Firestore Database & Authentication)
- **Estilização:** StyleSheet nativo responsivo com suporte a **Sistema**, **Claro** e **Escuro**
- **Ícones:** Ionicons (Expo Vector Icons)

## 📌 Funcionalidades Principais
- **Dashboard por Perfil:** Métricas em tempo real, cronograma semanal e ações rápidas adaptadas para `Administrador`, `Coordenador` e `Professor`.
- **Autenticação & Segurança:** Login integrado ao Firebase Authentication com detecção automática de cargo, cadastro de novos usuários sem derrubar a sessão ativa, bloqueio de contas inativas e encerramento seguro de sessão.
- **Diário de Classe Digital:** Registro de frequência (`P`, `F`, `J`), conteúdo ministrado, bloqueio após assinatura digital e consulta histórica por data e turma.
- **Gestão de Avaliações e Notas:** Agendamento de provas, salvamento de rascunhos, validação por senha docente, cobrança privada e fluxo de retificação com a coordenação.
- **Comunicados e Calendário:** Mural de avisos gerais e pausas/recessos (`instituicao/config`), com disparo automático de notificações.
- **Central de Auditoria & Suporte:** Logs administrativos, diagnóstico de integridade do banco, backup em segundo plano, exportação CSV e gestão completa de chamados técnicos.
- **Preferências & Identidade Visual:** Tema global (Roxo da Meia-Noite & Azul-Galáxia), escala de fonte, controle de notificações e gerenciamento de sessões ativas.

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
(Opcional) Para popular o Firestore com dados iniciais de teste:

Bash
node scripts/seedVioleta.mjs

🔐 Configuração do Firebase
Caso utilize variáveis de ambiente, crie um arquivo .env.local na raiz do projeto com as credenciais do Firebase:

Snippet de código
EXPO_PUBLIC_FIREBASE_API_KEY=sua_api_key
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=seu_domain
EXPO_PUBLIC_FIREBASE_PROJECT_ID=seu_project_id
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=seu_bucket
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=seu_sender
EXPO_PUBLIC_FIREBASE_APP_ID=seu_app_id


👨‍💻 Equipe de Desenvolvimento
LuffyBaiano — Infraestrutura, Banco de Dados, React Native

Larissa Alves — Infraestrutura, Banco de Dados, React Native

Aryane — Infraestrutura, Banco de Dados, React Native

© 2026 Sistema Violeta. Todos os direitos reservados. Salvador, BA.