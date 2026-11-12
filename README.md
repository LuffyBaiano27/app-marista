# 💜 Sistema Violeta - Gestão Educacional

O **Sistema Violeta** é um SaaS (Software as a Service) educacional desenvolvido em **React Native (Expo)** focado em modernizar a rotina acadêmica de Professores, Coordenadores e Administradores.

## 🚀 Tecnologias Utilizadas
* **Frontend:** React Native, Expo Router, TypeScript
* **Backend / BaaS:** Firebase (Firestore Database & Authentication)
* **Estilização:** StyleSheet nativo responsivo, com suporte a Light/Dark Mode
* **Ícones:** Ionicons (Expo Vector Icons)

## 📌 Funcionalidades Principais (MVP)
- **Dashboard Personalizado:** Grelha de aulas diária baseada no perfil do usuário e dia da semana.
- **Diário de Classe Digital:** Registo de frequência offline-first/online, com bloqueio automático anti-fraude pós-assinatura.
- **Central de Consultas (Arquivo Morto):** Histórico retroativo de chamadas e desempenho de alunos agrupado por pastas (Acordeão).
- **Gestão de Suporte Técnico (Help Desk):** Professores podem abrir chamados de infraestrutura que são monitorados em tempo real pela TI/Admin.
- **Controle de Acessos (ACL):** Experiências de navegação diferentes de acordo com a permissão (Professor, Coordenador, Admin).
- *Em Breve: Lançamento de Avaliações (Notas Bimestrais), Comunicados Oficiais e Autenticação Real.*

## 💻 Como Rodar o Projeto

1. Clone o repositório:
   ```bash
   git clone [https://github.com/SEU-USUARIO/violeta.git](https://github.com/SEU-USUARIO/violeta.git)

   Acesse a pasta do projeto:
Acesse a pasta do projeto:

Bash
cd violeta
Instale as dependências:

Bash
npm install
Inicie o servidor Expo:

Bash
npx expo start
🔐 Configuração do Firebase
Para rodar este projeto, é necessário criar um arquivo .env na raiz do projeto com as chaves do seu projeto Firebase, seguindo o modelo abaixo:

Snippet de código
EXPO_PUBLIC_FIREBASE_API_KEY=sua_api_key
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=seu_domain
EXPO_PUBLIC_FIREBASE_PROJECT_ID=seu_project_id
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=seu_bucket
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=seu_sender
EXPO_PUBLIC_FIREBASE_APP_ID=seu_app_id
👩‍💻 Equipe de Desenvolvimento
LuffyBaiano (Infraestrutura, Banco de Dados, React Native)

Larissa Alves

Aryane

© 2026 Sistema Violeta. Todos os direitos reservados. Salvador, BA.


### Comandos Git para salvar o teu progresso

Abre o terminal na raiz do teu projeto e executa a seguinte sequência:

```bash
git add .
git commit -m "feat: checklist do MVP, atualizacao de telas de perfil, chamadas, historico e integracao firebase"
git push origin main