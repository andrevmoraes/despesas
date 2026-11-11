# Contexto do projeto e decisões confirmadas

**Última consolidação:** 11/11/2026  
**Objetivo:** servir como ponto único de continuidade para novas conversas e agentes. Leia este documento antes de propor mudanças.

## Leitura recomendada

1. **Este arquivo (docs/PROJECT_CONTEXT.md):** visão geral, decisões confirmadas, pendências e ponto de retomada.
2. [docs/product.md](./product.md): visão e escopo funcional do produto.
3. [docs/debts.md](./debts.md): regras detalhadas de dívidas, previsões e pagamentos.
4. [docs/current-state.md](./current-state.md): stack, banco de produção auditado e alertas técnicos.
5. [AGENTS.md](../AGENTS.md): regras obrigatórias para agentes que trabalham no repositório.

Se houver diferença entre uma ideia antiga e uma decisão explicitamente confirmada neste documento, prevalece a decisão mais recente. Não transforme itens pendentes em decisões por conta própria.

---

## 1. O que é o aplicativo

O **Despesas Compartilhadas** já possui um MVP funcional para controlar assinaturas/serviços recorrentes entre pessoas, dividir valores e calcular saldos. A finalidade original continua importante: reduzir transferências desnecessárias, compensando valores que pessoas devem umas às outras e mostrando o saldo líquido.

A evolução prioritária é adicionar **dívidas parceladas entre pessoas**, como uma compra de sofá, sem perder o módulo atual de assinaturas e seu cálculo de saldos.

A visão futura pode incluir outras despesas compartilhadas e compromissos recorrentes individuais. A prioridade atual, porém, é dívida/compra parcelada e seu acerto financeiro com os compromissos mensais existentes.

## 2. Decisões de produto confirmadas

| Tema | Decisão |
|---|---|
| Banco/plataforma | Manter Supabase. Não migrar para Appwrite neste momento. |
| Evolução | Incremental. Preservar funcionalidades atuais e entender o código antes de refatorar. |
| Prioridade funcional | Dívidas/compras parceladas entre pessoas. |
| Criação da dívida | O credor cria o cadastro. |
| Aceite da dívida | Não exigir aceite formal no primeiro MVP; pressupõe-se que o acordo foi feito entre as partes. |
| Pessoa sem conta | Pode ser cadastrada inicialmente como participante por telefone. |
| Vínculo posterior à conta | Exigir verificação da posse do telefone; conhecer/digitar o número não basta. |
| Planejamento | Opcional. Uma dívida pode existir sem calendário de parcelas. |
| Saldo da dívida | O “balde” (valor original menos pagamentos/compensações válidos) é a fonte da verdade. |
| Previsões | São estimativas editáveis; não são pagamentos nem alteram sozinhas o saldo real. |
| Ajuste do plano | O credor decide como pagamentos parciais, maiores, antecipados ou atrasados afetam as previsões. |
| Registro de pagamento no MVP | Somente o credor registra pagamentos no aplicativo. O lançamento é considerado confirmado. |
| Registro pelo devedor | Fora do primeiro MVP. Avaliar futuramente aviso de pagamento pelo devedor com confirmação do credor. |
| Comprovantes | Não armazenar anexos no primeiro MVP; as partes podem trocar comprovantes fora do app. |
| Acerto entre pessoas | Cálculo automático do saldo líquido, com possibilidade de ajuste manual antes da confirmação (opção C escolhida). |
| Acerto parcial | A diferença não paga continua pendente e é carregada automaticamente para o próximo período (opção A escolhida). |
| Histórico | Preservar eventos, pagamentos, previsões antigas e correções; não apagar silenciosamente informação financeira. |
| Interface | Preservar a identidade Windows Phone/Metro. Não redesenhar o Dashboard neste MVP. |
| Refatoração | Não executar uma refatoração ampla só porque existe um plano antigo; validar o estado atual e propor etapas pequenas. |

## 3. Modelo financeiro: três conceitos separados

Não misturar estas três camadas:

1. **Dívida/obrigação:** valor que uma pessoa deve a outra.
2. **Planejamento:** quanto se espera receber/pagar e quando.
3. **Movimentação/acerto realizado:** pagamento em dinheiro/transferência ou compensação efetivamente registrada.

Previsões não são dinheiro recebido e não devem, sozinhas, ser tratadas como pagamento realizado. O cálculo de acerto deve trabalhar com valores financeiros devidos/realizados conforme as regras do período, sem contar a mesma obrigação ou pagamento duas vezes.

### Exemplo confirmado de compensação

Considere que:

- Carol deve R$ 100 a você por uma dívida (por exemplo, o sofá).
- Você deve R$ 30 a Carol pelas assinaturas.
- O aplicativo calcula automaticamente o saldo líquido: **Carol deve transferir R$ 70 a você**.

A direção importa: como Carol deve R$ 100 e você deve R$ 30, o saldo líquido é R$ 70 de Carol para você.

O aplicativo deve sugerir esse valor automaticamente, mas permitir que o acerto seja ajustado manualmente antes da confirmação.

### Exemplo confirmado de acerto parcial

Se o valor sugerido for R$ 70 e Carol pagar R$ 50:

- Registrar os R$ 50 efetivamente pagos.
- Manter R$ 20 como saldo pendente.
- Levar os R$ 20 automaticamente para o cálculo do próximo período.
- Não apagar nem reescrever os lançamentos originais.

**Atenção de implementação:** a regra de produto está decidida, mas o modelo de dados/ledger ainda precisa ser desenhado para que a compensação de R$ 30 e o pagamento de R$ 50 sejam alocados às obrigações corretas sem dupla contagem. Não implemente isso apenas subtraindo valores no frontend.

## 4. Regras de dívidas e pagamentos

- Credor cria dívida; devedor pode ter ou não conta.
- Dívida pode ter planejamento ou não.
- Aceitar pagamentos parciais, maiores ou menores que a previsão, antecipados e registrados retroativamente.
- Guardar separadamente a data em que o pagamento aconteceu (paid_at) e a data em que foi registrado (recorded_at).
- Pagamentos podem ocorrer em dinheiro, transferência ou compensação.
- O credor controla a distribuição do pagamento entre previsões e o ajuste do calendário.
- A dívida é calculada pelo saldo real; o planejamento pode ser editado sem alterar o saldo.
- Preservar previsões passadas e eventos não realizados.
- Uma previsão não realizada não reduz a dívida. Não criar cobranças duplicadas automaticamente; o credor pode deslocar o calendário ou distribuir pagamento posterior entre mais de uma previsão.
- Quando há pagamento menor que o valor previsto, o saldo não pago pode ser levado para a previsão seguinte (ex.: previsão de R$ 100, pagamento de R$ 80; os R$ 20 restantes podem somar-se ao próximo valor de R$ 100).
- Correções precisam ser auditáveis. A preferência discutida é corrigir por estorno e novo lançamento, mas o fluxo exato ainda não foi fechado.

Detalhamento: [docs/debts.md](./debts.md).

## 5. Escopo e prioridades

### Primeiro MVP de evolução

- Criar/consultar dívidas entre duas pessoas.
- Permitir dívida com ou sem planejamento.
- Registrar pagamentos pelo credor.
- Ajustar previsões e preservar histórico.
- Integrar os valores financeiros de dívidas ao acerto mensal entre pessoas.
- Calcular saldo líquido automaticamente e permitir ajuste manual antes da confirmação.
- Carregar saldo não pago para o próximo período.
- Garantir segurança real no acesso a dados financeiros.

### Preservar

- Cadastro/gestão de pessoas.
- Assinaturas/serviços recorrentes.
- Pagador, valor, dia de cobrança e participantes.
- Divisões iguais e personalizadas no fluxo existente.
- Cálculo atual de saldos e dashboard.
- PWA e identidade visual atual.

### Fora do primeiro MVP

- Upload/armazenamento de comprovantes.
- Redesign do Dashboard.
- Migração para Appwrite.
- Fluxo do devedor informar pagamento e aguardar confirmação.
- Despesas avulsas de restaurante e fluxos complexos de rateio como prioridade inicial.
- Um novo módulo sofisticado para compromissos mensais 1:1 de pessoas sem conta (ex.: aluguel de garagem), antes de verificar se o módulo recorrente atual já atende.
- Notificações push avançadas.

## 6. Regras de trabalho para próximas conversas

- Não modificar o banco de produção, políticas RLS, dados, secrets ou deploy sem autorização explícita.
- Não gerar/rodar SQL destrutivo nem propor correção de segurança que possa bloquear o app sem mapear antes a autenticação atual e os usos reais.
- Não reescrever páginas ou serviços inteiros sem necessidade comprovada.
- Não assumir que documentação antiga descreve o código/banco atual.
- Separar claramente decisões confirmadas, propostas e pendências.
- Para trabalho grande, apresentar plano, arquivos afetados, riscos e estratégia de migração antes de implementar.
- Usar precisão decimal no banco e cálculos financeiros transacionais no backend.
- Executar lint/build/testes pertinentes e relatar o resultado.

Regras completas para agentes: [AGENTS.md](../AGENTS.md).

## 7. Pendências que ainda precisam de decisão/desenho

Estas questões não devem ser tratadas como decididas:

1. **Ledger e alocação do acerto:** como cada parte da compensação e do pagamento parcial liquida as obrigações originais sem dupla contagem.
2. **Quem pode ajustar/confirmar um acerto:** a possibilidade de ajuste manual foi escolhida, mas faltam permissões e eventual necessidade de concordância das duas partes.
3. **Fechamento do período:** data de corte, tratamento de pagamentos retroativos e o que acontece com um acerto já confirmado quando um lançamento antigo é registrado depois.
4. **Escopo do cálculo:** confirmar se o primeiro fluxo será estritamente entre duas pessoas e como o cálculo tratará relações com múltiplos participantes.
5. **Correções/estornos:** fluxo exato, papéis autorizados e efeito sobre acertos já fechados.
6. **Modelo de dados e migração:** tabelas/relacionamentos para dívidas, previsões, pagamentos, compensações e acertos; ainda não desenhados/aprovados.
7. **Segurança/autenticação:** substituir o modelo simplificado atual por uma autorização segura compatível com RLS, sem quebrar o app existente.

## 8. Estado técnico e próximo passo sugerido

Leia [docs/current-state.md](./current-state.md) antes de propor banco, autenticação ou segurança. Foi feita uma auditoria somente de metadados no banco de produção em 11/11/2026; ela encontrou permissões abertas nas tabelas users, streamings e divisoes, além de divergências com o SQL versionado.

**Próximo passo recomendado para uma nova conversa:** primeiro mapear como o código atual autentica o usuário e consulta cada tabela; depois desenhar o ledger e o fluxo de acerto com exemplos e testes de aceitação. Não começar criando tabelas ou alterando RLS antes desse levantamento.

---

## 9. Prompt de continuidade para novo chat

Use este texto ao iniciar outra conversa:

> Estou continuando o projeto Despesas Compartilhadas. Leia primeiro docs/PROJECT_CONTEXT.md, depois docs/product.md, docs/debts.md, docs/current-state.md e AGENTS.md. Trate decisões marcadas como confirmadas como requisitos; não volte a perguntar decisões já tomadas. Não altere código, banco, RLS, dados ou deploy sem autorização explícita. Primeiro quero mapear o fluxo atual de autenticação e acesso aos dados e desenhar o ledger/acerto financeiro para evitar dupla contagem. Separe decisões confirmadas de pendências e avance uma decisão por vez.
