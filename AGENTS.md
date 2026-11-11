# AGENTS.md — Instruções para agentes de desenvolvimento

## Contexto do projeto
Este repositório contém o aplicativo Despesas Compartilhadas, uma aplicação web/PWA construída com React, Vite e Supabase. O projeto já possui funcionalidades em uso. Preserve o que funciona e evolua a aplicação incrementalmente.

## Regras de trabalho
1. Antes de alterar código, leia este arquivo e os documentos relevantes em `docs/`.
2. Antes de propor ou executar mudanças, inspecione a implementação atual. Não presuma que uma funcionalidade não existe só porque não está descrita na documentação.
3. Não reescreva páginas, componentes ou serviços inteiros sem necessidade demonstrada.
4. Não faça mudanças em produção, banco de dados remoto, configurações, segredos ou deploy sem autorização explícita.
5. Não execute migrações destrutivas nem apague dados.
6. Para tarefas grandes, primeiro apresente plano, arquivos afetados, riscos e estratégia de migração. Aguarde aprovação antes de implementar.
7. Faça mudanças pequenas e coerentes. Preserve compatibilidade com os dados existentes.
8. Não invente regras de negócio. Quando uma regra estiver marcada como “a definir”, apresente alternativas e peça decisão.
9. Não trate dados armazenados no frontend ou no `localStorage` como mecanismo de autenticação ou autorização.
10. Regras financeiras e permissões devem ser validadas no backend/banco, não apenas na interface.

## Stack e convenções atuais
- React 18
- Vite
- JavaScript (projeto atualmente não está configurado como TypeScript)
- Supabase / PostgreSQL
- React Router
- CSS existente em `src/styles/`
- O projeto possui identidade visual inspirada no Windows Phone/Metro. Não descaracterize o visual sem solicitação.
- Verifique `package.json` e os arquivos reais antes de assumir scripts ou dependências.

## Compatibilidade de telefone
- A lógica atual que acrescenta o dígito `1` ao telefone foi criada como contorno para um problema observado no preenchimento automático de telefone do iOS, que ocasionalmente omitia o primeiro dígito do DDD.
- Não remova nem altere esse comportamento apenas por parecer incorreto. Primeiro reproduza/teste o preenchimento automático em versões relevantes do iOS e valide a máscara/normalização com números brasileiros. Se houver correção, preserve uma estratégia compatível e documente a mudança.

## Segurança
- Nunca exponha `service_role` keys ou segredos no frontend.
- Toda tabela com dados de usuários deve ter políticas RLS coerentes com a identidade autenticada.
- Não use `users.id` como se fosse automaticamente igual a `auth.uid()`; a relação precisa ser explícita e validada.
- O telefone informado por alguém não prova a posse daquele número.
- Não conceda acesso a dívidas ou dados financeiros apenas porque alguém conhece o telefone de um participante.
- Qualquer associação de conta a um participante pendente deve exigir verificação de posse do telefone e validação no backend.
- Prefira operações transacionais para registrar pagamentos e atualizar saldos/planejamentos relacionados.

## Qualidade
- Execute `npm run lint` e `npm run build` quando aplicável.
- Informe quais verificações foram executadas e seus resultados.
- Inclua testes para cálculos financeiros, arredondamento, pagamentos parciais, ajustes de planejamento e permissões.
- Use valores monetários com precisão decimal apropriada no banco (por exemplo, `numeric` no PostgreSQL); evite cálculos financeiros baseados em ponto flutuante sem estratégia de arredondamento.
- Datas de pagamento e datas de registro são conceitos diferentes e devem ser preservadas separadamente.

## Entrega
Ao concluir uma tarefa, informe:
- O que mudou.
- Quais arquivos foram alterados.
- Migrações ou configurações necessárias.
- Testes executados.
- Riscos ou decisões ainda pendentes.


## Documentação canônica e continuidade

Antes de qualquer tarefa de produto, consulte nesta ordem:
1. `docs/PROJECT_CONTEXT.md` — decisões confirmadas, escopo, pendências e prompt de continuidade.
2. `docs/product.md` e `docs/debts.md` — requisitos e regras de negócio.
3. `docs/current-state.md` — estado técnico observado e auditoria do banco.
4. Este arquivo (`AGENTS.md`).

`REFACTORING_PLAN.md` é um plano histórico de dezembro de 2025, não prova de que as fases foram executadas nem define a arquitetura atual. Verifique o código real antes de usar suas sugestões.

Não confunda o SQL versionado com o schema de produção: consulte `docs/current-state.md`. Não execute o schema inicial novamente em produção nem altere RLS sem mapear autenticação, queries e dependências atuais.
