# Transição de dados e implantação

Plano manual revisável; nenhum script de migração, comando de escrita ou execução contra Firebase nesta etapa.

## Preparação

Inventariar separadamente perfis, turmas, chamadas e suporte, usando acesso autorizado de leitura. Guardar inventário real e eventuais backups em local restrito da equipe, nunca no repositório. Aqui ficam apenas modelos vazios e dados sintéticos.

A equipe deverá registrar, por item: ID do documento, campo atual, valor proposto, fonte de confirmação, impacto, aprovador, executor e resultado. Documentos sem confirmação permanecem pendentes. Não mapear automaticamente prof_3 para uma conta com nome parecido.

## Lotes propostos

1. Conferir UIDs no Authentication e documentos correspondentes em usuarios. Aprovar role e ativo individualmente; nunca ativar todas as contas por padrão.
2. Revisar cada turma e confirmar professor real e coordenadores. Preservar turmaId. Preencher campos novos somente após aprovação.
3. Conferir chamadas.turmaId e separar órfãs, duplicatas e datas ambíguas. Preservar registros; ausência de autoria não será preenchida com o professor atual. Correção de datas exige fonte comprovada.
4. Revisar suporte sem solicitanteUid. Vincular só com comprovação externa; nome isolado não basta. Sem prova, manter acesso administrativo para revisão.
5. Validar consultas propostas com a matriz aprovada e planejar versões de cliente, dados, índices e regras em conjunto.

Cada lote requer relatório de diferenças, aprovação e autorização de execução próprias. Antes de executar: registrar valores anteriores e estratégia de recuperação sem expor dados pessoais. Depois: conferir contagens, referências e acesso por perfil. Não sobrescrever mudanças concorrentes; revalidar o documento e interromper o item em conflito.

## Preservação e recuperação

Não renomear turmas, apagar histórico, recriar contas ou reescrever todas as chamadas. Não converter desconhecidos em autor ou professor padrão. Campos extras legados permanecem armazenados. Recuperação de dados restaura somente valores aprovados do lote; recuperação de aplicativo não deve reabrir permissões amplas.

Acesso às informações já baixadas/cacheadas não é retroativamente desfeito por regras novas. Avaliar cache e sessões existentes na implantação; não usar isso como justificativa para continuar leituras amplas.

## Sequência e validação

| Etapa | Local ou ambiente compartilhado | Critério |
| --- | --- | --- |
| A — contratos e plano | Local; documentação | Revisão da matriz e pendências pela equipe |
| B — regras e testes | Local, futuro emulador | Casos positivos/negativos e consultas passam; nenhum acesso a produção |
| C — serviços e telas | Local | Início/Turmas usam UID, estados claros, zero fallback permissivo |
| D — dependências | Local | Histórico, Chamada e suporte compatíveis; atalhos de admin/carga retirados |
| E — inventário e mapeamento | Leitura autorizada e revisão restrita | Vínculos e contas aprovados, sem escrita |
| F — correções/publicação | Firebase, autorização específica | Lotes e janela aprovados, regras testadas, clientes compatíveis |
| G — validação | Ambiente acordado | Login/logout/restauração; isolamento dos três perfis; sem exposição cruzada |

Operações locais futuras incluem contratos tipados, adaptadores de leitura, regras versionadas e testes. Mudança de documentos, concessão de admin, publicação de regras e criação de índices exigem ação expressamente autorizada no projeto Firebase. Instalação de ferramentas/dependências também exige autorização própria.
