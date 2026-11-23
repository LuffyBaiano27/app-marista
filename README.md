# 💜 Sistema Violeta - Gestão Educacional

O **Sistema Violeta** é um SaaS (Software as a Service) educacional desenvolvido em **React Native (Expo)** focado em modernizar a rotina acadêmica de Professores, Coordenadores e Administradores.

## 🚀 Tecnologias Utilizadas
- **Frontend:** React Native, Expo Router, TypeScript
- **Backend / BaaS:** Firebase (Firestore Database & Authentication)
- **Estilização:** StyleSheet nativo responsivo, com suporte a Light/Dark Mode
- **Ícones:** Ionicons (Expo Vector Icons)

## 📌 Funcionalidades Principais (MVP)
- **Dashboard Personalizado:** Visão adaptada ao perfil (Admin, Coordenador e Professor), com métricas em tempo real sincronizadas com o Firestore.
- **Diário de Classe Digital:** Registro de frequência com janela de 24h e bloqueio automático anti-fraude pós-assinatura.
- **Central de Auditoria & Consultas:** Log administrativo de ações/chamados e diretório de alunos agrupado por pastas (Acordeão).
- **Gestão de Suporte Técnico (Help Desk):** Abertura e monitoramento de chamados de infraestrutura em tempo real pela TI/Admin.
- **Controle de Acessos (ACL):** Experiências de navegação e permissões distintas por cargo (Professor, Coordenador e Administrador).

---

## ✅ Checklist de Evolução (Visão Administrador)

### Concluído
- [x] **Home do Administrador (`index.tsx`):**
  - [x] Redesign *clean* seguindo a identidade visual do app, com pílulas de status (`Ativas`, `Vinculados`, `Em dia` / `Pendentes`).
  - [x] Contagem real sincronizada com o Firestore (Turmas, Prof./Coord. ativos e Chamados pendentes).
  - [x] Botão funcional de sincronização manual com o Firebase exibindo horário atualizado.
  - [x] Modal **Novo Usuário** funcional (Nome, E-mail, CPF, Cargo, Disciplina para professores e geração automática de senha inicial).
  - [x] Modal **Nova Turma** simplificado (Nome da Turma/Série e Turno).
  - [x] Exportação de relatório da base em **CSV**.
- [x] **Central de Auditoria (`historico.tsx`):**
  - [x] Separação da visão do Admin em **Log de Auditoria** e **Alunos Cadastrados** (sem notas).
  - [x] Roteamento direto da Home para cada aba (`?aba=auditoria` e `?aba=alunos`).
  - [x] Resumo de **Alunos Vinculados** e **Turmas com Alunos** acima das pastas.

### Próximos Passos
- [ ] **Central de Auditoria (`historico.tsx`):**
  - [ ] Adicionar botão de **Voltar** no cabeçalho.
- [ ] **Gestão de Usuários (`usuarios.tsx`):**
  - [ ] Transformar o modal de detalhes em painel de ações reais sincronizado com o Firestore.
  - [ ] **Ativar / Inativar usuário** (atualizando o contador da Home em tempo real).
  - [ ] **Editar dados** (nome, e-mail e disciplina).
  - [ ] **Alterar cargo** (promover/rebaixar entre `Professor` e `Coordenador`).
  - [ ] **Redefinir senha inicial** (gerar/exibir novamente a senha padrão Nome + CPF).
  - [ ] **Excluir usuário** com confirmação dupla.
  - [ ] **Proteção contra auto-bloqueio** (impedir o Admin logado de inativar ou excluir a própria conta).
- [ ] **Diretório de Salas (`turmas.tsx` — Visão Admin):**
  - [ ] Adicionar botão de **Voltar** no topo e renomear para **Turmas Cadastradas**.
  - [ ] Remover da visão do Admin: badges de chamada, disciplina, horário, nome de professor único e botões de chamada.
  - [ ] Exibir cards limpos com **Nome da Turma** e **quantidade real de alunos** sincronizada em tempo real.
  - [ ] Ao clicar na turma, abrir a **lista de alunos cadastrados** nela.
  - [ ] **Filtro por Turno** (`Todos`, `Matutino`, `Vespertino`, `Noturno`).
  - [ ] **Editar / Excluir turma** (bloqueando exclusão caso ainda existam alunos vinculados).
  - [ ] Botão **`+ Nova Turma`** direto na tela.
- [ ] **Chamados (`chamados.tsx`):**
  - [ ] Bloco de **Auditoria de Encerramento** (data/hora e nome do administrador que resolveu o ticket) integrado ao Log de Auditoria.
- [ ] **Coordenação (Etapa Seguinte):**
  - [ ] Fluxo de cadastro e alocação de novos alunos nas turmas.

---

## 💻 Como Rodar o Projeto

1. Clone o repositório:
   ```bash
   git clone [https://github.com/LuffyBaiano27/app-marista.git](https://github.com/LuffyBaiano27/app-marista.git)

   Acesse a pasta do projeto:
      cd app-marista

   Instale as dependências:

      npm install

   Inicie o servidor Expo:

      npx expo start -c  ```

🔐 Configuração do Firebase
Crie um arquivo .env.local na raiz do projeto com as chaves do Firebase:

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


---

### Comandos Git para subir essa versão agora

Rode no terminal dentro da pasta `marista-app`:

```bash
git status
git add .
git commit -m "feat(admin): dashboard clean, modais de usuario/turma, auditoria e checklist no README"
git push origin main