# Etapa F1 — autenticação, ativação e suporte

## Escopo implementado

Branch feat/integracao-perfis-usuarios. Não houve publicação, alteração de regras, acesso ou gravação em dados/usuários reais. O projeto de teste é exclusivamente demo-violeta-tests.

- Login preservado, sem botão, credenciais fixas, criação de conta ou criação de perfil administrativo.
- DadosPerfil exige ativo booleano, nome válido e role conhecido; ausência de ativo é inválida, não true implícito. False gera estado inativo.
- AuthContext acompanha usuarios/{uid} via onSnapshot e limpa o observador da sessão anterior. Atualizações de papel/ativação e exclusão do próprio perfil mudam o estado sem depender de novo login.
- Snapshot de cache ou com gravação local pendente não confirma autoridade. O estado operacional é suspenso até confirmação do servidor. Erros síncronos/assíncronos deixam o acesso bloqueado e preservam logout.
- Layout libera rotas somente com usuário, perfil disponível e ativo===true. Contas ausentes, inválidas, inativas ou sem confirmação do servidor não montam funcionalidades operacionais. A verificação pendente com sessão conhecida também permite logout.
- A verificação fresca de autoridade foi extraída para services/autorizacao.ts; o serviço de turmas mantém seus nomes exportados e suas consultas, delegando a checagem de perfil à mesma função. Vínculos por UID e calendário não foram alterados.

## Suporte

listarChamadosSuporte confirma o próprio perfil no servidor antes de consultar. Professor e coordenador usam solicitanteUid==UID; somente admin ativo consulta a coleção inteira. Há verificação adicional do autor no resultado para atores não administrativos, cancelamento entre leituras e rejeição de respostas fora do escopo.

Chamados legados sem solicitanteUid são apresentados apenas à administração, com autor desconhecido explícito. O nome concatenado antigo nunca é utilizado para atribuir autoria. Datas Timestamp ou timestamp numérico legado podem ser apresentadas, sem inferência de autorização. Registros de formato inválido são sinalizados e omitidos.

Criar e resolver foram preparados como serviços transacionais:

- Criação: solicitanteUid da identidade, descricao validada, pendente, criadoEm serverTimestamp. Sem campos arbitrários ou papel fornecido no payload.
- Resolução: perfil administrativo ativo confirmado na transação, ticket pendente, mudança somente de status, resolvidoPorUid e resolvidoEm serverTimestamp.
- Releitura transacional do perfil evita usar apenas uma autorização anterior ao início da gravação. Estado concorrente do ticket também é relido.
- Não há operação de exclusão.

**Por escolha expressa do usuário, envio e resolução permanecem indisponíveis na interface até a F2.** Perfil importa apenas o serviço de listagem; botões de mutação estão desabilitados e não possuem handlers de gravação. As funções de mutação foram executadas somente em testes com dados sintéticos no emulador.

## Perfil

Mantidos nome, e-mail, iniciais, papel real, tema, retorno e logout. A tela apresenta os chamados permitidos e estados de carregamento, vazio, registros inválidos e erro; permite atualizar a leitura.

Removidos carga demonstrativa de turmas, formulários com dados fictícios, senha/preferências com falso sucesso, publicação fictícia de comunicados e menus administrativos sem implementação. Cadastro e alteração de senha aparecem como indisponíveis nesta versão, sem confirmação fictícia de persistência. Provisão de usuários não foi substituída por outro mecanismo cliente.

## Verificação

157 testes passaram: 75 sem rede e 82 no emulador (39 regras, 10 turmas, 14 acadêmicos, seis calendário e 13 suporte/perfis F1). A F1 acrescenta 27 casos locais e 13 no emulador.

Cobertura nova:

- ativo ausente, inválido, false e true; nenhum role inferido.
- Snapshot em cache/com pendência local, perfil inexistente, inválido ou inativo e falha do observador.
- Troca de sessão, cancelamento de ouvintes e recusa de eventos antigos.
- Logout com sucesso/falha, erro na autenticação e falha síncrona de inicialização do perfil.
- Rotas bloqueadas para os estados não operacionais, com logout disponível; restauração não monta telas antes da confirmação.
- Listagem de suporte por UID para professor/coordenador e revisão administrativa de legados.
- Tentativa de informar role administrativo, ticket alheio, ausência de autor e inativação dos três papéis.
- Criação/resolução transacionais aceitas pelas regras locais, preservando autoria e conteúdo, sem nova resolução de ticket já resolvido.
- Observador real no emulador acompanhando inativação e reativação/mudança de papel da mesma sessão.
- Interface com envio/resolução sem handler e desabilitados até F2.

Os testes de escrita transpõem o envelope de objetos da VM para o realm do SDK no harness, preservando os mesmos campos e FieldValue. Isso corrigiu uma incompatibilidade do carregador de testes, sem alterar o payload da aplicação ou contornar regras.

TypeScript mantém exatamente os oito erros preexistentes: quatro de cores no layout das abas e quatro imports/exportações de collapsible. Nenhum erro novo. git diff --check, sintaxe dos novos testes e comparação dos hashes de manifestos/regras/índices aprovados.

## Arquivos

Modificados:

- src/app/index.tsx
- src/app/_layout.tsx
- src/app/perfil.tsx
- src/contexts/authContext.tsx
- src/types/usuario.ts
- src/services/perfilUsuario.ts
- src/services/turmas.ts
- tests/academico/executar-emulador.mjs
- tests/academico/README.md

Criados:

- src/services/autorizacao.ts
- src/services/suporte.ts
- src/types/suporte.ts
- tests/seguranca-f1/autenticacao.test.cjs
- tests/seguranca-f1/interface.test.cjs
- tests/seguranca-f1/suporte.test.cjs
- tests/seguranca-f1/service-emulator.test.mjs
- tests/seguranca-f1/README.md
- docs/arquitetura/seguranca-etapa-f1.md

## Limitações e validação manual

O bloqueio local não substitui as regras seguras no servidor. Enquanto a política publicada permanecer ampla, outro cliente poderá tentar operações indevidas. F2 precisa revisar a versão publicada e a legitimidade das atribuições existentes, sem presumir que os roles antigos são corretos.

Acesso operacional requer confirmação online do perfil. Se a conexão ficar sem confirmação, o aplicativo bloqueia as funcionalidades, em vez de conceder autoridade usando cache. Logout continua disponível; dados já baixados não são apagados retroativamente pelas regras.

Admin lê o suporte completo da única instituição do MVP, incluindo registros legados, conforme matriz aprovada. Paginação do suporte/histórico permanece evolução futura; este trabalho corrige escopo e autoridade, sem introduzir novas coleções.

Testes de componentes usam elementos nativos substituídos; a navegação visual ainda deve ser validada no aplicativo. Usar conta já ativa para conferir login, identidade, chamados permitidos e logout. Não editar usuários ou documentos publicados para criar cenários de teste desta etapa: inativação e mutações já foram exercitadas no emulador.

Envio/resolução reais, atualização de cadastro, alteração de senha, publicação de regras e qualquer provisionamento continuam dependendo de etapa e autorização próprias. Criação e assinatura de chamadas permanecem bloqueadas. Nenhuma dependência foi instalada; package-lock.json, regras e índices permaneceram intactos.
