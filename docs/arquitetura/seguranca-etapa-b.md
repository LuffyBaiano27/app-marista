# Regras locais e compatibilidade — etapa B

Esta etapa prepara regras executáveis e testes locais, sem publicar ou alterar Firebase compartilhado. A política mantém uma única instituição. As definições da etapa A continuam sendo o contrato de domínio; este documento registra as restrições técnicas e os itens ainda incompletos da implementação local.

## Política implementada

- Perfil ativo exige nome válido, role conhecido e ativo=true. Sem perfil/ativo válido, nenhuma operação funcional é concedida. A leitura do próprio perfil continua permitida para diagnóstico.
- Clientes não criam nem apagam usuarios. Atualização própria só permite nome e atualizadoEm do servidor. Admin também não altera role/ativo de terceiros pelo cliente.
- Professor lê turmas por professorId=UID. Coordenador lê apenas quando seu UID está em coordenadorIds. Admin ativo revisa toda a instituição, inclusive legados.
- Admin cria/atualiza turma com campos validados, professor ativo e coordenadores ativos e distintos. CriadoEm é imutável, atualizadoEm vem do servidor. Delete negado.
- Histórico de chamadas segue vínculo atual da turma. Autor desconhecido em legado não é inventado. Admin pode revisar órfãs. Nenhum cliente altera ou exclui chamadas.
- Suporte: autor igual ao UID, criação pendente e horário do servidor; leitura própria ou administrativa; resolução administrativa só altera status, resolvidoPorUid e resolvidoEm, com autor da resolução igual à sessão. Sem exclusão.
- Outros caminhos e subcoleções são negados por padrão. Nome, e-mail e parâmetros de rota não entram na autorização.

## Restrições e decisões ainda abertas

1. **Criação de chamadas fechada:** a etapa A deixou matrícula, ocorrência, prazo e unicidade indefinidos. Esta versão nega create para todos, inclusive professor responsável. É uma restrição temporária explícita, não a implementação completa da capacidade de registro prevista na matriz. Antes de publicar é necessário completar o contrato e a validação, com testes positivos de registro, duplicata e integridade por aluno. Não foi criada estrutura adicional de matrícula/backend sem aprovação.
2. **Quatro coordenadores em novas gravações cliente:** limite conservador após o teste com oito exceder o orçamento de 1000 expressões do emulador. Há também limite de dez documentos auxiliares distintos por requisição, incluindo admin e professor. Nenhuma referência é aceita sem validação. Testes positivos no teto e negativos acima dele devem passar. Contrato da etapa A previa até dez; aceitar a redução ou rever modelagem antes de liberar gestão. Esse limite é técnico desta versão local, não uma alteração silenciosa do contrato acadêmico.
3. **Legados preservados, sem fallback:** leitores podem acessar dados históricos por vínculo real. Documentos novos e atualizações administrativas de turma exigem o contrato completo. Turmas antigas sem criadoEm não são silenciosamente regularizadas pelo cliente. Suporte legado sem solicitanteUid pode ser revisado/resolvido por admin, mantendo autoria desconhecida.
4. **Revogação:** regras consultam o perfil a cada requisição; o contexto atual ainda não acompanha ativo/role em tempo real. A interface pode demorar a refletir alteração, mas não deve ganhar acesso por isso. Dados já baixados não são apagados retroativamente.
5. **Provisionamento:** Console/Admin SDK não são controlados por estas regras cliente. Exigem autorização, validação e registro próprios. Não conceder autoridade por convenção de e-mail.

## Consultas e operações que devem mudar antes de publicar

| Arquivo/fluxo atual | Adequação necessária |
| --- | --- |
| Início: usuário Admin fixo e coleção turmas inteira | Usar contexto; professorId==UID ou coordenadorIds array-contains UID; admin ativo mantém geral |
| Turmas: mesmo usuário fixo | Mesma seleção de consulta centralizada |
| Início/Turmas: chamadas somente por data | Consultar por turma autorizada, acrescentando data; professor/coordenador não podem buscar todas |
| Histórico: todas as turmas e chamadas | Consultas por escopo e por turma; estratégia de ordenação/datas legadas revisada |
| Chamada: get de turma por parâmetro | Manter get, tratar permission-denied e não confiar no parâmetro como autorização |
| Chamada: query por turma/data | Pode ser compatível se turma autorizada; testar a consulta combinada |
| Chamada: addDoc sem autor e confirmação só de senha não vazia | Bloqueado nesta versão; completar contrato antes de liberar gravação |
| Perfil: todos os chamados de suporte | Professor/coordenador filtram solicitanteUid==UID; admin pode consultar todos |
| Perfil: abrir suporte com nome concatenado | Enviar solicitanteUid, descricao, pendente e criadoEm servidor; sem campos extras |
| Perfil: resolver somente mudando status | Acrescentar resolvidoPorUid e resolvidoEm do servidor |
| Perfil: injetar turmas demonstrativas | Retirar atalho; só gestão administrativa validada ou provisionamento revisado |
| Login: Criar Admin pelo cliente | Retirar fluxo; regras já negam criação do perfil |
| Contexto/validador: nome e role sem ativo | Adequar posteriormente ao contrato sem tratar ausência como ativo=true |

O próprio perfil continua legível mesmo sem ativo. Isso preserva diagnóstico, mas o app atual pode tentar consultas que as regras locais rejeitam. Esse é um bloqueio à publicação, não motivo para ampliar as regras.

## Transição e publicação

Não existe regra de transição permissiva. Preservação de dados não implica manutenção de acessos amplos. Preparar mapeamento manual confirmado dos IDs demonstrativos, habilitações explícitas, clientes compatíveis, índices necessários e janela de atualização. Só depois revisar/publicar em ação autorizada própria. Não publicar este arquivo enquanto criação de chamadas e consultas dependentes estiverem pendentes.

## Referências

- [Regras e validação de campos](https://firebase.google.com/docs/firestore/security/rules-fields)
- [Limites de consultas auxiliares e condições](https://firebase.google.com/docs/firestore/security/rules-conditions)
- [Consultas compatíveis com regras](https://firebase.google.com/docs/firestore/security/rules-query)
- [Testes oficiais de regras](https://firebase.google.com/docs/rules/unit-tests)
