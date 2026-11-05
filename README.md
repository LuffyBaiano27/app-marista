# 💜 Violeta - Plataforma de Gestão Educacional

O **Violeta** (anteriormente *Marista App*) é um sistema SaaS *white-label* desenvolvido para revolucionar a gestão de instituições de ensino. O aplicativo unifica o controle acadêmico, comunicação institucional e suporte técnico em uma única plataforma, oferecendo interfaces adaptativas baseadas em regras estritas de hierarquia (Administradores, Coordenadores e Professores).

## 🚀 Tecnologias Utilizadas

*   **Front-end:** React Native com Expo (SDK 51/52) e TypeScript.
*   **Roteamento:** Expo Router (File-based routing).
*   **Back-end & BaaS:** Firebase (Authentication, Firestore Database).
*   **UI/UX:** Estilização nativa (`StyleSheet`), suporte a Dark/Light Mode dinâmico e animações fluidas (`Animated` nativo).

## ✨ Funcionalidades Implementadas (MVP Atual)

*   **Autenticação Avançada:** Tela inicial com animações de entrada (Fade-in e Slide-up) e integração em tempo real com o Firebase Auth.
*   **Arquitetura Baseada em Perfis (RBAC):** Renderização condicional completa de componentes. A interface se transforma organicamente dependendo se o usuário logado é Administrador, Coordenador ou Professor.
*   **Gestão de Conta e Segurança:**
    *   Painel centralizado de Meus Dados.
    *   Módulo de Privacidade e Segurança (Troca de senha, simulação de 2FA e monitoramento de sessões ativas).
    *   Suporte a compliance de privacidade (LGPD).
*   **Comunicação Institucional:** Emissão de comunicados em massa por Coordenadores diretamente para o mural de professores.
*   **Helpdesk Integrado (Suporte de TI):** Professores e Coordenadores podem abrir chamados relatando problemas; Administradores possuem um painel para ler, gerenciar e dar "baixa" nos tickets.
*   **Ambiente de Desenvolvimento Estruturado:** Atalhos embutidos para simulação ágil de perfis e injeção de dados no banco (Mocks), dispensando trocas constantes de credenciais nos testes de interface.

## 🚧 Próximos Passos (To-Do)

O escopo visual e estrutural está finalizado. Os próximos ciclos de desenvolvimento focarão em segurança de dados e lógica de nuvem:

*   [ ] **Integração Real do Firestore (Dashboard e Turmas):** Substituir as turmas mockadas por queries reais filtradas por dia e professor.
*   [ ] **Lógica de Chamadas e Assinatura Eletrônica:** Transitar IDs reais de turmas entre rotas, habilitar o "trancamento" imutável de diários após a aula e enviar o registro final para o banco.
*   [ ] **Infraestrutura e Permissões (Admin):** Ativar o Controle de Acessos (ACL) para aprovar/reprovar cadastros e implementar o painel de Logs de Auditoria.
*   [ ] **Segurança de Banco de Dados:** Escrever as *Firebase Security Rules* travando as coleções (ex: professores só podem editar turmas vinculadas ao seu UID).

## 👨‍💻 Equipe de Desenvolvimento

*   **Larissa Alves**
*   **Aryane**
*   **LuffyBaiano** (Tech Lead)

---

## ⚙️ Como Executar o Projeto Localmente

1.  **Clone o repositório:**
    ```bash
    git clone [https://github.com/SeuUsuario/violeta-app.git](https://github.com/SeuUsuario/violeta-app.git)
    cd violeta-app
    ```

2.  **Instale as dependências:**
    ```bash
    npm install
    ```

3.  **Inicie o servidor local limpando o cache (recomendado para evitar erros de SDK no Expo Go):**
    ```bash
    npx expo start -c
    ```

4.  Escaneie o QR Code gerado no terminal usando o aplicativo **Expo Go** no Android ou a câmera nativa no iOS.