# Inventário de arquivos para revisão do commit

Nenhum arquivo foi adicionado ao stage. Lista agregada das etapas aprovadas A–G, conferida na branch feat/integracao-perfis-usuarios.

## Código, configuração, documentação e testes

- `.gitignore`
- `README.md`
- `docs/arquitetura/arquivos-para-commit-etapa-g.md`
- `docs/arquitetura/calendario-e-acoes.md`
- `docs/arquitetura/contratos-dados.md`
- `docs/arquitetura/estabilizacao-etapa-g.md`
- `docs/arquitetura/integracao-etapa-c.md`
- `docs/arquitetura/integracao-etapa-d.md`
- `docs/arquitetura/permissoes-seguranca.md`
- `docs/arquitetura/seguranca-etapa-b.md`
- `docs/arquitetura/seguranca-etapa-f1.md`
- `docs/arquitetura/seguranca-etapa-f2.md`
- `docs/arquitetura/transicao-dados.md`
- `firebase.emulator.json`
- `firestore.indexes.json`
- `firestore.rules`
- `src/app/(tabs)/_layout.tsx`
- `src/app/(tabs)/avaliacoes.tsx`
- `src/app/(tabs)/historico.tsx`
- `src/app/(tabs)/index.tsx`
- `src/app/(tabs)/turmas.tsx`
- `src/app/_layout.tsx`
- `src/app/chamada.tsx`
- `src/app/index.tsx`
- `src/app/notas.tsx`
- `src/app/perfil.tsx`
- `src/components/ui/collapsible.tsx`
- `src/contexts/authContext.tsx`
- `src/hooks/use-calendario-bahia.ts`
- `src/hooks/use-grade-turmas.ts`
- `src/hooks/use-leitura-academica.ts`
- `src/services/autorizacao.ts`
- `src/services/chamadas.ts`
- `src/services/consulta-diaria.ts`
- `src/services/perfilUsuario.ts`
- `src/services/suporte.ts`
- `src/services/turmas.ts`
- `src/types/chamada.ts`
- `src/types/suporte.ts`
- `src/types/turma.ts`
- `src/types/usuario.ts`
- `src/utils/calendario.ts`
- `tests/academico/README.md`
- `tests/academico/executar-emulador.mjs`
- `tests/academico/leitura.test.cjs`
- `tests/academico/service-emulator.test.mjs`
- `tests/academico/sessao.test.cjs`
- `tests/calendario/README.md`
- `tests/calendario/acoes.test.cjs`
- `tests/calendario/calendario.test.cjs`
- `tests/calendario/relogio.test.cjs`
- `tests/calendario/service-emulator.test.mjs`
- `tests/firestore/README.md`
- `tests/firestore/RELATORIO.md`
- `tests/firestore/ambiente.mjs`
- `tests/firestore/ambiente.test.mjs`
- `tests/firestore/firestore.test.mjs`
- `tests/firestore/fixtures/cenarios.json`
- `tests/firestore/matriz-cenarios.md`
- `tests/firestore/preflight.mjs`
- `tests/seguranca-f1/README.md`
- `tests/seguranca-f1/autenticacao.test.cjs`
- `tests/seguranca-f1/interface.test.cjs`
- `tests/seguranca-f1/service-emulator.test.mjs`
- `tests/seguranca-f1/suporte.test.cjs`
- `tests/seguranca-f2/README.md`
- `tests/seguranca-f2/regras.test.mjs`
- `tests/turmas/README.md`
- `tests/turmas/carregar.cjs`
- `tests/turmas/grade.test.cjs`
- `tests/turmas/service-emulator.test.mjs`

## Alteração preexistente — decisão separada

- `package-lock.json`: preservado integralmente; confirmar origem/destino antes de incluir. Não regenerado nem alterado na G.

Não incluir logs, caches, ambientes, credenciais ou ferramentas isoladas em /tmp. Publicar código não publica regras do Firebase.
