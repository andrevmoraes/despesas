Analyzed AGENTS.md:L1-54
Analyzed product.md:L1-143
Analyzed debts.md:L1-142
Analyzed package.json:L1-39
Ran list all project files
Analyzed .env.example:L1-3
Analyzed supabase-schema.sql:L1-67
Analyzed create_pagamentos_mensais.sql:L1-21
Analyzed fix_pagamentos_rls.sql:L1-7
Analyzed INSTRUCOES_PAGAMENTOS.md:L1-35
Analyzed README.md:L1-226
Analyzed REFACTORING_PLAN.md:L1-800
Analyzed main.jsx:L1-25
Analyzed App.jsx:L1-81
Analyzed AuthContext.jsx:L1-77
Analyzed supabase.js:L1-6
Analyzed notificacoes.js:L1-121
Analyzed utils.js:L1-6
Analyzed Login.jsx:L1-91
Analyzed Dashboard.jsx:L1-800
Analyzed Streamings.jsx:L1-576
Analyzed Users.jsx:L1-363
Analyzed Dashboard.jsx:L801-1196
Analyzed Alert.jsx:L1-19
Analyzed BottomNav.jsx:L1-31
Analyzed BottomTabs.jsx:L1-49
Analyzed DashboardSkeleton.jsx:L1-97
Analyzed ErrorBoundary.jsx:L1-17
Analyzed Pivot.jsx:L1-129
Analyzed sw.js:L1-122
Analyzed manifest.json:L1-24
Analyzed vite.config.js:L1-52
Analyzed tailwind.config.js:L1-27
Analyzed eslint.config.js:L1-29
Analyzed global.css:L1-170
Analyzed metro.css:L1-456
Analyzed index.css:L1-82
Analyzed button.jsx:L1-46
Analyzed card.jsx:L1-57

# Relatório de Auditoria Técnica e Diagnóstico — Despesas Compartilhadas

> **Escopo desta auditoria:** Inspeção estática e arquitetural completa do repositório local em `c:/Users/andre/Repositories/despesas`, confrontada com [AGENTS.md](file:///c:/Users/andre/Repositories/despesas/AGENTS.md), [docs/product.md](file:///c:/Users/andre/Repositories/despesas/docs/product.md) e [docs/debts.md](file:///c:/Users/andre/Repositories/despesas/docs/debts.md). Nenhum arquivo, banco de dados, configuração ou dependência foi modificado.

---

## 1. Resumo Executivo

O projeto **Despesas Compartilhadas** é uma aplicação web/PWA funcional construída com **React 18**, **Vite 7** e **Supabase**, com identidade visual inspirada no **Windows Phone / Metro UI**. Atualmente, o MVP atende bem ao caso de uso de **rateio recorrente de assinaturas (`streamings`)** entre um grupo de amigos ou familiares, calculando quanto cada participante deve ao pagador no mês corrente e oferecendo atalhos práticos (cópia de resumo formatado, chave PIX, link para WhatsApp do Itaú e marcação simples de pagamento mensal).

Contudo, para evoluir com segurança para o **módulo de dívidas entre pessoas** ([docs/product.md](file:///c:/Users/andre/Repositories/despesas/docs/product.md) e [docs/debts.md](file:///c:/Users/andre/Repositories/despesas/docs/debts.md)), a auditoria identificou três blocos críticos que precisam ser endereçados de forma incremental:

1. **Segurança e Autenticação (Crítico):** O sistema **não utiliza o Supabase Auth**. O "login" consiste apenas em um `SELECT` na tabela `public.users` filtrando pelo telefone digitado ([`AuthProvider`](file:///c:/Users/andre/Repositories/despesas/src/contexts/AuthContext.jsx#L34-L60)) e gravação do objeto retornado no `localStorage`. Como `auth.uid()` é `NULL` para requisições anônimas, as políticas RLS originais de [supabase-schema.sql](file:///c:/Users/andre/Repositories/despesas/supabase-schema.sql#L55-L67) são incompatíveis com o login atual (o que levou à desativação manual de RLS em `pagamentos_mensais` via [fix_pagamentos_rls.sql](file:///c:/Users/andre/Repositories/despesas/fix_pagamentos_rls.sql#L1-L7) e provavelmente no banco remoto). Qualquer pessoa que conheça um telefone cadastrado (ou inspecione a API com a `anon_key`) pode personificar usuários ou manipular dados.
2. **Modelo Financeiro e de Dados (Estrutural):** O banco atual modela apenas **fluxos mensais perpétuos** (`streamings` + `divisoes`) e uma marcação booleana mensal por par de pessoas (`pagamentos_mensais`). Não existe conceito de **saldo acumulado ("balde")**, dívida com valor original finito, pagamentos parciais/retroativos/compensações com `paid_at` vs. `recorded_at`, planejamento flexível de parcelas (`previsões`), nem histórico auditável de estornos. Além disso, há uma divergência grave na forma como o pagador é contabilizado na divisão entre [Streamings.jsx](file:///c:/Users/andre/Repositories/despesas/src/pages/Streamings.jsx#L123-L138) e [Dashboard.jsx](file:///c:/Users/andre/Repositories/despesas/src/pages/Dashboard.jsx#L545-L634).
3. **Arquitetura de Frontend (Manutenibilidade):** As consultas ao Supabase e os cálculos financeiros (em ponto flutuante) estão fortemente acoplados aos componentes de página ([Dashboard.jsx](file:///c:/Users/andre/Repositories/despesas/src/pages/Dashboard.jsx) possui 1.196 linhas), sem camada de serviços para dados, sem testes automatizados e com código duplicado (como `formatarTelefone` com o contorno para autofill do iOS e `MetroTile`).

---

## 2. Inventário Técnico do Projeto (Parte 1)

### 2.1 Stack e Versões Utilizadas
Extraído de [package.json](file:///c:/Users/andre/Repositories/despesas/package.json#L12-L38) e arquivos de configuração:
- **Runtime / UI:** `react` (`^18.3.1`), `react-dom` (`^18.3.1`), JavaScript (ES Modules, sem TypeScript).
- **Bundler / Build:** `vite` (`^7.2.2`), `@vitejs/plugin-react` (`^5.1.0`), `vite-plugin-compression` (`^0.5.1` para gzip), `terser` (`^5.36.0`).
- **Roteamento:** `react-router-dom` (`^7.10.1`).
- **Backend-as-a-Service:** `@supabase/supabase-js` (`^2.81.0`).
- **Estilização:**
  - CSS modularizado manualmente em `src/styles/*.css` com variáveis CSS nativas (tema Metro UI).
  - Tailwind CSS v4 (`tailwindcss` `^4.1.17`, `@tailwindcss/postcss` `^4.1.17`) + utilitários Shadcn (`class-variance-authority` `^0.7.1`, `clsx` `^2.1.1`, `tailwind-merge` `^3.4.0`, `lucide-react` `^0.556.0`) instalados e configurados em [src/index.css](file:///c:/Users/andre/Repositories/despesas/src/index.css#L1-L25) e [src/components/ui/](file:///c:/Users/andre/Repositories/despesas/src/components/ui/button.jsx), porém **não utilizados nas páginas atuais**.
- **Qualidade:** `eslint` (`^9.39.1`), `eslint-plugin-react-hooks` (`^5.2.0`), `eslint-plugin-react-refresh` (`^0.4.24`). Não há framework de testes instalado (Vitest/Jest ausentes).

### 2.2 Estrutura de Pastas
```text
c:\Users\andre\Repositories\despesas\
├── docs/                          # Documentação de produto (product.md) e regras de dívidas (debts.md)
├── public/                        # Manifesto PWA (manifest.json), Service Worker (sw.js) e ícones SVG
├── src/
│   ├── assets/                    # Assets estáticos do template (react.svg)
│   ├── components/                # Componentes de UI e layout (Alert, DashboardSkeleton, ErrorBoundary, etc.)
│   │   └── ui/                    # Primitivos estilo shadcn/ui (badge, button, card, dialog, input, label, table)
│   ├── contexts/                  # Contexto de autenticação (AuthContext.jsx)
│   ├── lib/                       # Utilitário cn() para classes Tailwind (utils.js)
│   ├── pages/                     # Telas principais (Login, Dashboard, Streamings, Users)
│   ├── services/                  # Cliente Supabase (supabase.js) e Web Notifications (notificacoes.js)
│   └── styles/                    # Folhas de estilo CSS Metro UI (global, metro, tiles, forms, buttons, etc.)
├── supabase-schema.sql            # DDL inicial das tabelas users, streamings, divisoes e políticas RLS
├── create_pagamentos_mensais.sql  # DDL da tabela pagamentos_mensais
├── fix_pagamentos_rls.sql         # Script de desativação de RLS em pagamentos_mensais
├── INSTRUCOES_PAGAMENTOS.md       # Guia manual da feature de pagamentos mensais
├── REFACTORING_PLAN.md            # Plano prévio de refatoração arquitetural (Dez/2025, não executado)
└── AGENTS.md / README.md          # Diretrizes para agentes e documentação geral do repositório
```

### 2.3 Páginas e Componentes
- **Páginas (`src/pages/`):**
  - [`Login`](file:///c:/Users/andre/Repositories/despesas/src/pages/Login.jsx#L6-L89): Formulário de entrada apenas com número de telefone (com máscara e contorno para iOS).
  - [`Dashboard`](file:///c:/Users/andre/Repositories/despesas/src/pages/Dashboard.jsx#L35-L1194): Tela inicial com Live Tile animada (flip 3D a cada 8s com resumo financeiro), grid de tiles por pessoa (2x2), painel expansível com detalhamento (*breakdown*) de assinaturas, menu popup (`...`) com ações de PIX/WhatsApp/Marcar pago, e tiles de navegação/configuração.
  - [`Streamings`](file:///c:/Users/andre/Repositories/despesas/src/pages/Streamings.jsx#L36-L574): Listagem em tiles e modal de criação/edição/exclusão de assinaturas recorrentes e divisão percentual entre participantes.
  - [`Users`](file:///c:/Users/andre/Repositories/despesas/src/pages/Users.jsx#L37-L361): Listagem e modal CRUD de pessoas do grupo (restrito na interface a `isAdmin`).
- **Componentes (`src/components/`):**
  - [`Alert`](file:///c:/Users/andre/Repositories/despesas/src/components/Alert.jsx#L3-L19): Toast fixo no topo com auto-close em 3,5s.
  - [`DashboardSkeleton`](file:///c:/Users/andre/Repositories/despesas/src/components/DashboardSkeleton.jsx#L3-L95): Esqueleto de carregamento com barra de progresso estilo Windows Phone.
  - [`ErrorBoundary`](file:///c:/Users/andre/Repositories/despesas/src/components/ErrorBoundary.jsx#L3-L17): Captura erros de renderização React no topo da árvore ([src/main.jsx](file:///c:/Users/andre/Repositories/despesas/src/main.jsx#L18-L24)).
  - **Componentes órfãos (não utilizados nas páginas):** [`BottomNav`](file:///c:/Users/andre/Repositories/despesas/src/components/BottomNav.jsx), [`BottomTabs`](file:///c:/Users/andre/Repositories/despesas/src/components/BottomTabs.jsx), [`Pivot`](file:///c:/Users/andre/Repositories/despesas/src/components/Pivot.jsx) e todos os 7 arquivos em `src/components/ui/*.jsx` (`badge`, `button`, `card`, `dialog`, `input`, `label`, `table`).

### 2.4 Contextos, Serviços e Integrações Externas
- [`AuthContext.jsx`](file:///c:/Users/andre/Repositories/despesas/src/contexts/AuthContext.jsx#L14-L77): Gerencia `user`, `loading`, `error`, `isAdmin`, `login(telefone)` e `logout()`.
- [`supabase.js`](file:///c:/Users/andre/Repositories/despesas/src/services/supabase.js#L1-L6): Instancia o cliente `@supabase/supabase-js` usando `VITE_PUBLIC_SUPABASE_URL` e `VITE_PUBLIC_SUPABASE_ANON_KEY`. (Nota: o [README.md](file:///c:/Users/andre/Repositories/despesas/README.md#L106-L113) menciona `VITE_SUPABASE_URL`, mas o código real e `.env.example` usam o prefixo `VITE_PUBLIC_`).
- [`notificacoes.js`](file:///c:/Users/andre/Repositories/despesas/src/services/notificacoes.js#L1-L121): Integra com a Web Notifications API e o Service Worker ([`public/sw.js`](file:///c:/Users/andre/Repositories/despesas/public/sw.js#L107-L122)) para disparar alertas locais de hora em hora enquanto o app estiver aberto, caso `dia_cobranca === hoje`.
- **Integrações externas em [`Dashboard.jsx`](file:///c:/Users/andre/Repositories/despesas/src/pages/Dashboard.jsx#L150-L294):**
  - `navigator.clipboard.writeText` (cópia de resumo detalhado e chave PIX).
  - Deep link para o assistente do Itaú no WhatsApp (`https://wa.me/5511400415150?text=...`) em [`abrirWhatsAppItau`](file:///c:/Users/andre/Repositories/despesas/src/pages/Dashboard.jsx#L280-L294).

---

## 3. Funcionalidades Financeiras Existentes e Reaproveitamento (Parte 2)

### 3.1 Cadastro e Gerenciamento de Pessoas
- **O que já funciona:** Listagem em tiles, criação, edição e exclusão de registros na tabela `users` (`nome`, `telefone`, `is_admin`). Inclui máscara de telefone com a regra do dígito `1` para contornar o bug de autofill do iOS.
- **Onde está implementada:** [`src/pages/Users.jsx`](file:///c:/Users/andre/Repositories/despesas/src/pages/Users.jsx#L37-L361) (`carregarUsers`, `handleSubmit`, `deletarUsuario`, `formatarTelefone`).
- **Tabelas utilizadas:** `users`.
- **Limitações encontradas:**
  1. Apenas usuários com `is_admin = true` acessam a tela ([`Users.jsx`](file:///c:/Users/andre/Repositories/despesas/src/pages/Users.jsx#L183-L198)). No novo módulo de dívidas, qualquer credor precisará selecionar ou cadastrar um participante devedor por telefone.
  2. Não há separação entre "Participante/Pessoa" e "Conta Autenticada": criar uma pessoa em `users` cria automaticamente uma "conta" na qual qualquer um pode fazer login apenas digitando o telefone.
  3. Exclusão de usuário possui `ON DELETE CASCADE` em `streamings`, `divisoes` e `pagamentos_mensais` ([`supabase-schema.sql`](file:///c:/Users/andre/Repositories/despesas/supabase-schema.sql#L22-L31)), o que apaga silenciosamente todo o histórico financeiro se uma pessoa for removida.
- **O que pode ser reaproveitado:** A tabela `users` (como base de perfis/participantes), a interface de tiles/modal de [`Users.jsx`](file:///c:/Users/andre/Repositories/despesas/src/pages/Users.jsx) e a função de máscara compatível com iOS (`formatarTelefone`).

### 3.2 Cadastro de Assinaturas e Serviços Recorrentes
- **O que já funciona:** CRUD completo de serviços mensais com `nome`, `valor_total`, `dia_cobranca` (1 a 31) e escolha de `pagador_id`.
- **Onde está implementada:** [`src/pages/Streamings.jsx`](file:///c:/Users/andre/Repositories/despesas/src/pages/Streamings.jsx#L58-L267).
- **Tabelas utilizadas:** `streamings`, `divisoes`, `users`.
- **Limitações encontradas:**
  1. Quando uma assinatura é editada, todas as suas `divisoes` são deletadas e recriadas ([`Streamings.jsx`](file:///c:/Users/andre/Repositories/despesas/src/pages/Streamings.jsx#L115-L144)) sem transação atômica (se o `insert` falhar após o `delete`, a assinatura fica sem participantes).
  2. Não guarda histórico de vigência/preço: alterar `valor_total` muda imediatamente o cálculo do mês corrente sem preservar quanto custava nos meses anteriores.
- **O que pode ser reaproveitado:** Todo o módulo de assinaturas deve ser **mantido intacto** para despesas recorrentes contínuas (conforme [docs/product.md](file:///c:/Users/andre/Repositories/despesas/docs/product.md#L98-L105)), corrigindo apenas a inconsistência de cálculo descrita em 3.3/3.4.

### 3.3 e 3.4 Divisão de Despesas entre Participantes (Percentuais e Valores Personalizados)
- **O que já funciona:** No modal de [`Streamings.jsx`](file:///c:/Users/andre/Repositories/despesas/src/pages/Streamings.jsx#L461-L536), o usuário define o percentual do pagador (`pagador_percentual`) e seleciona participantes adicionais informando o percentual de cada um. O frontend valida que a soma seja `100%` (tolerância `0.01`), converte cada percentual em valor monetário (`parseFloat(((valorTotal * percentual) / 100).toFixed(2))`) e grava na coluna `divisoes.valor_personalizado`.
- **Onde está implementada:**
  - Gravação: [`Streamings.jsx`](file:///c:/Users/andre/Repositories/despesas/src/pages/Streamings.jsx#L87-L188) (`handleSubmit`, `atualizarPercentual`, `calcularTotalPercentual`).
  - Leitura/Cálculo: [`Dashboard.jsx`](file:///c:/Users/andre/Repositories/despesas/src/pages/Dashboard.jsx#L541-L634) (`carregarSaldos`) e [`notificacoes.js`](file:///c:/Users/andre/Repositories/despesas/src/services/notificacoes.js#L60-L95) (`verificarCobrancasHoje`).
- **Tabelas utilizadas:** `divisoes` (`streaming_id`, `user_id`, `valor_personalizado`).
- **Limitações e Bugs Críticos encontrados:**
  1. **Bug de duplicação/inconsistência na inclusão do pagador em `divisoes`:**
     - Em [`Streamings.jsx`](file:///c:/Users/andre/Repositories/despesas/src/pages/Streamings.jsx#L124-L138), ao salvar uma assinatura, o código **insere uma linha em `divisoes` para o próprio `pagador_id`** além dos demais participantes.
     - Porém, em [`Dashboard.jsx`](file:///c:/Users/andre/Repositories/despesas/src/pages/Dashboard.jsx#L590-L634), ao calcular `streamingsPagos` (quando o usuário logado é o pagador), o loop percorre **todas** as linhas de `streaming.divisoes` **sem filtrar `divisao.user_id !== usuario.id`**! Como resultado, o pagador aparece no `saldosMap` devendo para si mesmo (`totalRecebendoAcumulado` fica inflado com a própria cota do pagador e um card com o próprio nome do usuário logado aparece na tela "deve para você"!).
     - Além disso, o cálculo do número de participantes em [`Dashboard.jsx`](file:///c:/Users/andre/Repositories/despesas/src/pages/Dashboard.jsx#L545) faz `const participantes = (streaming.divisoes?.length || 0) + 1` (assumindo que o pagador *não* estava em `divisoes`), o que exibe `÷ (N+1) perfis` incorretamente nos detalhes e no texto copiado quando o pagador também foi inserido em `divisoes`.
     - Já em [`notificacoes.js`](file:///c:/Users/andre/Repositories/despesas/src/services/notificacoes.js#L61-L66), o código ignora completamente `valor_personalizado` e divide `valor_total / (streaming.divisoes.length + 1)`.
  2. **Arredondamento de centavos:** Se uma assinatura de R$ 100,00 é dividida entre 3 pessoas (33,33% cada = 99,99%), a validação `Math.abs(totalPercentual - 100) > 0.01` permite salvar 99,99%, gerando 3 cotas de R$ 33,33 (soma R$ 99,99, perdendo R$ 0,01).
- **O que pode ser reaproveitado:** O suporte a `valor_personalizado` (`DECIMAL(10,2)`) no banco já permite armazenar valores exatos em reais sem depender exclusivamente de percentuais.

### 3.5 e 3.6 Pagamentos Mensais, Registro de Pagamentos e Atualização de Saldos
- **O que já funciona:** No menu (`...`) do card expandido de uma pessoa no Dashboard, o botão `"marcar [mês] como pago"` insere um registro em `pagamentos_mensais` para o par `(usuario_id, pessoa_id, mes, ano)` com `valor_pago = Math.abs(saldo.valor)`. Quando existe esse registro no mês/ano atual, o card exibe `"tudo certo esse mês"` e omite o valor na capa do tile.
- **Onde está implementada:** [`Dashboard.jsx`](file:///c:/Users/andre/Repositories/despesas/src/pages/Dashboard.jsx#L296-L348) (`marcarComoPago`) e leitura em [`carregarSaldos`](file:///c:/Users/andre/Repositories/despesas/src/pages/Dashboard.jsx#L519-L535).
- **Tabelas utilizadas:** `pagamentos_mensais`.
- **Limitações encontradas:**
  1. **Unilateralidade na consulta:** `carregarSaldos` busca `pagamentos_mensais` filtrando apenas `.eq('usuario_id', usuario.id)` ([`Dashboard.jsx`](file:///c:/Users/andre/Repositories/despesas/src/pages/Dashboard.jsx#L522)). Se o usuário A marca como pago o acerto com B (`usuario_id = A, pessoa_id = B`), quando B abre o próprio Dashboard (`usuario_id = B`), **para B ainda aparece pendente**, pois não consulta onde `pessoa_id = usuario.id`.
  2. **Não altera o resumo global da Live Tile:** Mesmo marcando uma pessoa como `pagoEsseMes = true`, os estados `totalRecebendo` e `totalDevendo` ([`Dashboard.jsx`](file:///c:/Users/andre/Repositories/despesas/src/pages/Dashboard.jsx#L648-L650)) continuam somando o valor daquela pessoa.
  3. **Apenas 1 pagamento por mês por pessoa (`UNIQUE(usuario_id, pessoa_id, mes, ano)`):** Não permite pagamentos parciais; se uma nova assinatura for adicionada no meio do mês após marcar como pago, ou se a pessoa pagar metade, o sistema não calcula a diferença (`valor_pago` gravado no banco sequer é lido de volta no cálculo — usa-se apenas `!!pagamento` booleano na [linha 643](file:///c:/Users/andre/Repositories/despesas/src/pages/Dashboard.jsx#L643)).
  4. **Sem desmarcar / estornar:** Uma vez clicado em "marcar como pago", não há botão na UI para desfazer ou corrigir.
- **O que pode ser reaproveitado:** A tabela `pagamentos_mensais` pode continuar servindo ao ciclo mensal simplificado das assinaturas (ou ser integrada ao resumo mensal), mas **não serve como tabela de pagamentos de dívidas (`debt_payments`)**, que exige múltiplos pagamentos parciais, `paid_at` vs `recorded_at`, tipo de pagamento e vínculo direto com uma dívida específica (`debt_id`).

### 3.7 Dashboard e Detalhamento por Pessoa
- **O que já funciona:** Consolida o saldo líquido bilateral (`Eu paguei por você` vs `Você pagou por mim`) por pessoa, exibe o detalhamento item a item ao expandir o tile, gera resumo formatado para área de transferência (já descontando créditos cruzados e incluindo a chave PIX de quem deve receber) e integra com WhatsApp.
- **Onde está implementada:** [`Dashboard.jsx`](file:///c:/Users/andre/Repositories/despesas/src/pages/Dashboard.jsx#L57-L294) e [`L468-L1027`](file:///c:/Users/andre/Repositories/despesas/src/pages/Dashboard.jsx#L468-L1027).
- **Tabelas utilizadas:** `divisoes`, `streamings`, `users`, `pagamentos_mensais`.
- **O que pode ser reaproveitado:** **Altíssimo reaproveitamento.** A estrutura visual do Dashboard (Live Tile, grid 2x2 de pessoas, expansão inline estilo Windows Phone, gerador de texto de resumo e atalhos PIX) deve ser preservada conforme [docs/product.md](file:///c:/Users/andre/Repositories/despesas/docs/product.md#L110), bastando extrair a lógica de cálculo para um serviço/hook e incluir as dívidas individuais na composição ou navegação.

### 3.8 Histórico de Transações
- **Estado atual:** **Não implementado na interface.** Embora `pagamentos_mensais` armazene registros de meses passados no banco, o frontend filtra exclusivamente `.eq('mes', mesAtual).eq('ano', anoAtual)` ([`Dashboard.jsx`](file:///c:/Users/andre/Repositories/despesas/src/pages/Dashboard.jsx#L523-L524)). Não há tela nem listagem de pagamentos anteriores, alterações ou estornos.

### 3.9 Possibilidade de Representar uma Dívida Individual entre Duas Pessoas Hoje
- **O que já funciona (contorno em `streamings`):** É possível cadastrar um "streaming" onde `pagador_id = Credor` (`pagador_percentual = 0%`) e selecionar 1 participante (`Devedor` com `percentual = 100%`). Isso faz com que uma cobrança 1:1 apareça no Dashboard todo mês.
- **Por que NÃO atende ao módulo de dívidas ([docs/debts.md](file:///c:/Users/andre/Repositories/despesas/docs/debts.md)):**
  - `streamings` é **perpétuo e sem saldo ("balde")**: em janeiro cobra R$ 100, em fevereiro cobra R$ 100 novamente sem nunca abater de um valor principal (ex.: "Sofá de R$ 600").
  - Se o devedor não pagar em janeiro, em fevereiro o mês de janeiro simplesmente desaparece da visão.
  - Se o devedor pagar R$ 180 em janeiro, não há saldo total de onde abater os R$ 80 excedentes nem calendário de previsões futuras ajustáveis.
  - **Justificativa técnica:** O módulo de `streamings` modela **recorrências contínuas por competência mensal**, enquanto o módulo de `debts` modela **obrigações de saldo finito ("balde") com amortização livre e planejamento opcional**. Portanto, devem coexistir como conceitos distintos no banco de dados.

---

## 4. Banco de Dados e Modelo Financeiro (Parte 3)

> **Nota sobre o banco remoto:** Esta análise baseia-se nos arquivos SQL versionados no repositório ([supabase-schema.sql](file:///c:/Users/andre/Repositories/despesas/supabase-schema.sql), [create_pagamentos_mensais.sql](file:///c:/Users/andre/Repositories/despesas/create_pagamentos_mensais.sql), [fix_pagamentos_rls.sql](file:///c:/Users/andre/Repositories/despesas/fix_pagamentos_rls.sql)). O estado exato de triggers, views ou políticas aplicadas manualmente no painel do Supabase remoto sem versionamento em arquivo é **desconhecido** até inspeção autorizada do banco.

### 4.1 Tabelas, Relacionamentos e Campos Financeiros Atuais

| Tabela | Chave Primária | Chaves Estrangeiras | Campos Financeiros / Temporais | Constraints Relevantes |
|---|---|---|---|---|
| `users` | `id UUID` (`uuid_generate_v4()`) | — | `created_at TIMESTAMPTZ` | `telefone VARCHAR(20) UNIQUE NOT NULL` |
| `streamings` | `id UUID` (`uuid_generate_v4()`) | `pagador_id -> users(id) ON DELETE CASCADE`<br>`criado_por -> users(id) ON DELETE CASCADE` | `valor_total DECIMAL(10,2) NOT NULL`<br>`dia_cobranca INT (1..31)`<br>`created_at TIMESTAMPTZ` | `CHECK (dia_cobranca >= 1 AND dia_cobranca <= 31)` |
| `divisoes` | `id UUID` (`uuid_generate_v4()`) | `streaming_id -> streamings(id) ON DELETE CASCADE`<br>`user_id -> users(id) ON DELETE CASCADE` | `valor_personalizado DECIMAL(10,2) NULL`<br>`created_at TIMESTAMPTZ` | `UNIQUE(streaming_id, user_id)` |
| `pagamentos_mensais` | `id UUID` (`gen_random_uuid()`) | `usuario_id -> users(id) ON DELETE CASCADE`<br>`pessoa_id -> users(id) ON DELETE CASCADE` | `valor_pago DECIMAL(10,2) NOT NULL`<br>`mes INT (1..12)`, `ano INT`<br>`data_pagamento TIMESTAMPTZ`<br>`created_at TIMESTAMPTZ` | `UNIQUE(usuario_id, pessoa_id, mes, ano)` |

### 4.2 Diagnóstico do Modelo Atual frente a `docs/debts.md`
1. **Como os saldos são calculados hoje:** Exclusivamente no cliente (JavaScript com `Number` de ponto flutuante IEEE 754 em [`Dashboard.jsx`](file:///c:/Users/andre/Repositories/despesas/src/pages/Dashboard.jsx#L541-L638)), somando as cotas mensais de `divisoes` onde o usuário deve ao `pagador_id` (negativo) e onde outros devem ao usuário (positivo). Não há cálculo nem validação de saldo no PostgreSQL.
2. **Representação de pessoas sem conta:** Hoje toda pessoa cadastrada em `users` é simultaneamente um participante e uma conta habilitada para login imediato via telefone. Não há distinção entre participante pendente de verificação e conta vinculada a `auth.users`.
3. **Suporte a pagamentos parciais, retroativos e compensações:** **Inexistente.**
   - `pagamentos_mensais` impede mais de um lançamento por mês (`UNIQUE(usuario_id, pessoa_id, mes, ano)`).
   - Embora `pagamentos_mensais` tenha `data_pagamento` e `created_at`, ambos recebem `DEFAULT NOW()` e o frontend não envia `data_pagamento` ([`Dashboard.jsx`](file:///c:/Users/andre/Repositories/despesas/src/pages/Dashboard.jsx#L318-L326)), perdendo a distinção entre `paid_at` (data do fato) e `recorded_at` (data do registro).
   - Não há coluna para meio/tipo (`dinheiro`, `transferencia`, `compensacao`) nem observação.
4. **Alterações conceituais necessárias no banco para suportar `docs/debts.md` (sem executar SQL):**
   - **Vínculo de Identidade em `users`:** Adicionar coluna opcional `auth_user_id UUID UNIQUE REFERENCES auth.users(id)` e estado de verificação do telefone (`phone_verified_at`), permitindo que registros em `users` existam como **participantes** antes de terem conta autenticada, e só sejam vinculados após comprovação de posse do telefone (OTP). Remover `ON DELETE CASCADE` destrutivo em tabelas financeiras (usar `RESTRICT` ou soft-delete/arquivamento).
   - **Nova entidade `debts` (Dívidas):** Representando o "balde" com `id`, `creditor_id` (`FK -> users`), `debtor_id` (`FK -> users`), `description`, `original_amount NUMERIC(12,2) CHECK (original_amount > 0)`, `has_plan BOOLEAN`, `notes`, `status` (`active`, `settled`, `cancelled`), `created_by`, `created_at`, `updated_at`.
   - **Nova entidade `debt_payments` (Pagamentos e Ajustes de Saldo):** Com `id`, `debt_id` (`FK -> debts`), `amount NUMERIC(12,2) CHECK (amount > 0)`, `payment_type` (`transfer`, `cash`, `compensation`, `other`), `paid_at DATE/TIMESTAMPTZ NOT NULL` (informado pelo credor), `recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`, `recorded_by` (`FK -> users`), `notes`, `status` (`confirmed`, `reversed`), e referência de estorno (`reversed_by_event_id` ou tabela de eventos de correção).
   - **Nova entidade `debt_plan_items` (Previsões do Planejamento):** Com `id`, `debt_id` (`FK -> debts`), `expected_date DATE` (ou competência), `expected_amount NUMERIC(12,2)`, `status` (`planned`, `missed`, `covered`, `adjusted`, `superseded`), `version/active`, `related_payment_id` opcional, preservando histórico quando o credor reajustar o planejamento.
   - **Nova entidade `debt_audit_events` (Histórico e Estornos Auditáveis):** Registro append-only de criação, pagamentos, estornos/correções de pagamento e edições de planejamento com `actor_id`, `event_type`, `previous_payload`, `new_payload`, `reason` e `created_at`.
   - **View ou Function RPC para Saldo e Operações Transacionais:** Calcular `remaining_balance = original_amount - SUM(confirmed_payments)` diretamente em `NUMERIC(12,2)` no PostgreSQL e expor RPCs transacionais (`SECURITY INVOKER` com RLS) para registrar pagamento + ajuste opcional de planejamento na mesma transação.

---

## 5. Autenticação e Segurança (Parte 4)

### Classificação de Problemas por Criticidade

#### 🔴 CRÍTICO 1 — Ausência de Autenticação Real (Login por "Conhecimento do Telefone" e `localStorage` forjável)
- **Evidência:** Em [`AuthContext.jsx`](file:///c:/Users/andre/Repositories/despesas/src/contexts/AuthContext.jsx#L27-L60), o login executa apenas `supabase.from('users').select('*').eq('telefone', telefone).single()` e armazena o JSON em `localStorage.setItem('user', JSON.stringify(data))`. Na inicialização ([linhas 27-30](file:///c:/Users/andre/Repositories/despesas/src/contexts/AuthContext.jsx#L27-L30)), lê `localStorage.getItem('user')` sem qualquer validação de sessão ou token JWT.
- **Risco:**
  1. Qualquer pessoa que saiba o número de celular de um participante entra na conta dele sem senha ou código SMS/WhatsApp.
  2. Qualquer usuário pode abrir o DevTools no navegador, alterar `localStorage.user` mudando `"is_admin": true` ou trocando o `"id"` para o UUID de outro usuário, e assumir controle total da interface administrativa ([`Users.jsx`](file:///c:/Users/andre/Repositories/despesas/src/pages/Users.jsx#L183)).
  3. Viola diretamente as regras 9 de [AGENTS.md](file:///c:/Users/andre/Repositories/despesas/AGENTS.md#L15) (*"Não trate dados armazenados no frontend ou no localStorage como mecanismo de autenticação ou autorização"*) e a seção de Segurança (*"O telefone informado por alguém não prova a posse daquele número"*).

#### 🔴 CRÍTICO 2 — Quebra de Isolamento no Banco (`auth.uid()` é `NULL` e RLS Desabilitado/Permissivo)
- **Evidência:**
  - Como o `supabase.auth.signIn*` nunca é chamado, todas as requisições do cliente utilizam a role `anon` do Supabase com `auth.uid() = NULL`.
  - Em [`supabase-schema.sql`](file:///c:/Users/andre/Repositories/despesas/supabase-schema.sql#L51-L53), a tabela `users` possui políticas totalmente abertas: `FOR SELECT USING (true)`, `FOR INSERT WITH CHECK (true)`, `FOR UPDATE USING (true)`. Qualquer cliente anônimo pode listar todos os nomes e telefones do banco, criar usuários ou promover-se a admin via API REST do Supabase.
  - Em [`fix_pagamentos_rls.sql`](file:///c:/Users/andre/Repositories/despesas/fix_pagamentos_rls.sql#L2) e [`create_pagamentos_mensais.sql`](file:///c:/Users/andre/Repositories/despesas/create_pagamentos_mensais.sql#L19-L20), o RLS de `pagamentos_mensais` foi explicitamente **desabilitado** (`ALTER TABLE pagamentos_mensais DISABLE ROW LEVEL SECURITY;`) com o comentário *"RLS desabilitado porque usamos tabela users customizada, não Supabase Auth"*.
  - Nas tabelas `streamings` e `divisoes`, embora [`supabase-schema.sql`](file:///c:/Users/andre/Repositories/despesas/supabase-schema.sql#L56-L67) declare políticas baseadas em `auth.uid()`, como o app funciona hoje sem Supabase Auth, **é altamente provável que o RLS também tenha sido desabilitado ou aberto para `true` no banco remoto do Supabase** (estado exato no servidor remoto: **desconhecido**, requer verificação no dashboard do Supabase). Além disso, [`Streamings.jsx`](file:///c:/Users/andre/Repositories/despesas/src/pages/Streamings.jsx#L60-L67) executa `.from('streamings').select('*')` sem filtro de usuário, listando todas as assinaturas do banco para qualquer pessoa logada.
- **Risco:** Exposição total de dados pessoais (telefones/chaves PIX) e financeiros de todos os usuários para qualquer pessoa com acesso à URL da aplicação (que contém a `VITE_PUBLIC_SUPABASE_ANON_KEY` no bundle público).

#### 🟠 ALTO 3 — Confusão Conceitual entre `users.id` e `auth.uid()`
- **Evidência:** [`supabase-schema.sql`](file:///c:/Users/andre/Repositories/despesas/supabase-schema.sql#L57-L66) compara `criado_por = auth.uid()` e `user_id = auth.uid()`, onde `criado_por` e `user_id` são FKs para `public.users(id)` (gerado por `uuid_generate_v4()`).
- **Risco:** Quando um participante é pré-cadastrado pelo administrador ou por um credor (antes de ter conta no app), ele recebe um `users.id` gerado automaticamente. Quando essa pessoa futuramente autenticar no Supabase Auth, ela receberá um `auth.uid()` diferente em `auth.users`. Portanto, `users.id` **não pode** ser presumido igual a `auth.uid()`; é obrigatório usar uma coluna de vínculo explícita (`users.auth_user_id = auth.uid()`) validada após verificação de posse do telefone.

#### 🟡 MÉDIO 4 — Exclusão em Cascata (`ON DELETE CASCADE`) em Dados Financeiros
- **Evidência:** [`supabase-schema.sql`](file:///c:/Users/andre/Repositories/despesas/supabase-schema.sql#L22-L31) e [`create_pagamentos_mensais.sql`](file:///c:/Users/andre/Repositories/despesas/create_pagamentos_mensais.sql#L4-L5).
- **Risco:** Qualquer deleção acidental de usuário ou assinatura apaga em cascata todas as divisões e registros de pagamentos históricos sem rastro de auditoria.

---

## 6. Arquitetura e Qualidade do Código (Parte 5)

1. **Acoplamento entre Interface e Consultas Supabase:**
   - Não existe camada de serviços de domínio (`src/services/supabase.js` tem apenas 6 linhas). Todas as queries `supabase.from(...)` estão embutidas diretamente dentro dos componentes [`AuthContext.jsx`](file:///c:/Users/andre/Repositories/despesas/src/contexts/AuthContext.jsx), [`Dashboard.jsx`](file:///c:/Users/andre/Repositories/despesas/src/pages/Dashboard.jsx), [`Streamings.jsx`](file:///c:/Users/andre/Repositories/despesas/src/pages/Streamings.jsx), [`Users.jsx`](file:///c:/Users/andre/Repositories/despesas/src/pages/Users.jsx) e [`notificacoes.js`](file:///c:/Users/andre/Repositories/despesas/src/services/notificacoes.js).
2. **Separação entre Regras de Negócio e Interface:**
   - [`Dashboard.jsx`](file:///c:/Users/andre/Repositories/despesas/src/pages/Dashboard.jsx) acumula 1.196 linhas combinando busca de dados, agregação contábil de saldos, formatação de moeda, geração de texto de cobrança, formatação de chave PIX, integração com WhatsApp, agendamento de notificações, animações 3D de Live Tile e renderização de UI com dezenas de estilos inline (`style={{ ... }}`).
   - Regras de cálculo de rateio estão implementadas de três maneiras diferentes em três lugares diferentes:
     1. Em [`Streamings.jsx`](file:///c:/Users/andre/Repositories/despesas/src/pages/Streamings.jsx#L123-L138): calcula valor por porcentagem e insere o pagador em `divisoes`.
     2. Em [`Dashboard.jsx`](file:///c:/Users/andre/Repositories/despesas/src/pages/Dashboard.jsx#L545-L634): usa `valor_personalizado ?? (valorTotal / (divisoes.length + 1))` e esquece de filtrar o pagador em `streamingsPagos`.
     3. Em [`notificacoes.js`](file:///c:/Users/andre/Repositories/despesas/src/services/notificacoes.js#L61-L62): ignora `valor_personalizado` e calcula sempre `valor_total / (divisoes.length + 1)`.
3. **Duplicação de Código e Código Morto:**
   - `formatarTelefone` (com a regra de prefixar `1` para contornar o iOS) está duplicada em [`Login.jsx`](file:///c:/Users/andre/Repositories/despesas/src/pages/Login.jsx#L12-L28) e [`Users.jsx`](file:///c:/Users/andre/Repositories/despesas/src/pages/Users.jsx#L78-L87).
   - O componente `MetroTile` está redefinido localmente em [`Dashboard.jsx`](file:///c:/Users/andre/Repositories/despesas/src/pages/Dashboard.jsx#L18-L33), [`Streamings.jsx`](file:///c:/Users/andre/Repositories/despesas/src/pages/Streamings.jsx#L18-L34) e [`Users.jsx`](file:///c:/Users/andre/Repositories/despesas/src/pages/Users.jsx#L19-L35) com assinaturas ligeiramente diferentes.
   - Lógica de busca do telefone para PIX duplicada entre [`copiarPix`](file:///c:/Users/andre/Repositories/despesas/src/pages/Dashboard.jsx#L180-L209) e [`copiarChavePix`](file:///c:/Users/andre/Repositories/despesas/src/pages/Dashboard.jsx#L234-L263).
   - Há 10 componentes não utilizados (`BottomNav`, `BottomTabs`, `Pivot` e 7 componentes em `src/components/ui/`) e folhas CSS não importadas (`App.css`, `pivot.css`, `navigation.css`, `bottom-tabs.css`).
4. **Validações e Tratamento de Erros:**
   - Validações apenas no cliente via atributos HTML (`required`, `min`, `max`) e checagens simples (`telefoneNumeros.length !== 11`).
   - Nota importante sobre telefone: a função `formatarTelefone` força todo número que não comece com `1` a receber o dígito `1` na frente ([`Login.jsx`](file:///c:/Users/andre/Repositories/despesas/src/pages/Login.jsx#L17-L19)). Isso atende DDDs `11–19` (São Paulo) no contorno do iOS, mas **impede a digitação de DDDs de outros estados** (ex.: `21`, `31`, `41`, `85`), pois transforma `21...` em `(12) 1...`. Conforme [AGENTS.md](file:///c:/Users/andre/Repositories/despesas/AGENTS.md#L28-L30), esse comportamento **não deve ser removido nem alterado sem reprodução/teste em iOS e validação com números brasileiros**.
5. **Testes Existentes:**
   - **Nenhum.** Não há scripts de teste em [package.json](file:///c:/Users/andre/Repositories/despesas/package.json) nem arquivos `*.test.js` / `*.spec.js` no projeto.
6. **Melhorias Incrementais Recomendadas (sem reescrita completa):**
   - Extrair funções puras de cálculo financeiro (usando aritmética inteira em centavos ou biblioteca decimal leve) e formatação para `src/lib/` ou `src/services/`, cobrindo-as imediatamente com testes unitários (`Vitest`).
   - Criar serviços dedicados (`src/services/streamingsService.js`, `src/services/debtsService.js`, `src/services/usersService.js`) para isolar as chamadas ao Supabase sem precisar reestruturar todas as pastas do projeto de uma vez.
   - Extrair `MetroTile` para `src/components/MetroTile.jsx` mantendo o visual idêntico.

---

## 7. Comparativo de Evolução: Estado Atual vs. Produto Desejado (Parte 6)

| Funcionalidade | Estado atual | O que falta | Arquivos envolvidos | Prioridade |
|---|---|---|---|---|
| **Autenticação real e posse de telefone** | **Não implementado** (login por query aberta + `localStorage`) | Integrar Supabase Auth, vincular `users.auth_user_id` a `auth.uid()` e validar posse do telefone antes de associar participante existente | [`src/contexts/AuthContext.jsx`](file:///c:/Users/andre/Repositories/despesas/src/contexts/AuthContext.jsx), [`src/pages/Login.jsx`](file:///c:/Users/andre/Repositories/despesas/src/pages/Login.jsx), [`supabase-schema.sql`](file:///c:/Users/andre/Repositories/despesas/supabase-schema.sql) | **P0 (Crítica)** |
| **Políticas RLS e isolamento de dados** | **Parcialmente implementado / Quebrado** (políticas de `users` abertas; `pagamentos_mensais` sem RLS; `auth.uid()` nulo) | Criar helper/função SQL para resolver o `users.id` autenticado via `auth.uid()` e aplicar RLS restritivo em todas as tabelas | [`supabase-schema.sql`](file:///c:/Users/andre/Repositories/despesas/supabase-schema.sql), [`fix_pagamentos_rls.sql`](file:///c:/Users/andre/Repositories/despesas/fix_pagamentos_rls.sql) | **P0 (Crítica)** |
| **Cadastro de participantes sem conta** | **Parcialmente implementado** (`Users.jsx` cadastra em `users`, mas restrito a admin e sem distinção entre participante e conta) | Permitir que credores cadastrem/selecionem participantes por nome e telefone (`auth_user_id IS NULL`) sem conceder login automático sem verificação | [`src/pages/Users.jsx`](file:///c:/Users/andre/Repositories/despesas/src/pages/Users.jsx), `users` (DB) | **P1 (Alta)** |
| **Assinaturas e serviços recorrentes (`streamings`)** | **Já implementado** | Corrigir bug de inclusão do pagador no cálculo de [`Dashboard.jsx`](file:///c:/Users/andre/Repositories/despesas/src/pages/Dashboard.jsx#L597) e unificar cálculo em [`notificacoes.js`](file:///c:/Users/andre/Repositories/despesas/src/services/notificacoes.js#L61); tornar atualização de divisões atômica | [`src/pages/Streamings.jsx`](file:///c:/Users/andre/Repositories/despesas/src/pages/Streamings.jsx), [`src/pages/Dashboard.jsx`](file:///c:/Users/andre/Repositories/despesas/src/pages/Dashboard.jsx), [`src/services/notificacoes.js`](file:///c:/Users/andre/Repositories/despesas/src/services/notificacoes.js) | **P1 (Alta)** |
| **Dashboard Metro UI, resumo e PIX** | **Já implementado** | Preservar visual atual; corrigir leitura bilateral de `pagamentos_mensais` e integrar exibição/navegação para o novo módulo de dívidas | [`src/pages/Dashboard.jsx`](file:///c:/Users/andre/Repositories/despesas/src/pages/Dashboard.jsx) | **P1 (Alta)** |
| **Cadastro de dívida individual (com ou sem planejamento)** | **Não implementado** | Tabelas `debts` e `debt_plan_items`; tela/modal Metro UI para credor criar dívida informando devedor, descrição, valor original e planejamento opcional | Novas migrations SQL, novos serviços em `src/services/` e página/componentes de Dívidas em `src/pages/` | **P1 (Alta)** |
| **Cálculo de saldo real ("Balde")** | **Não implementado** | Cálculo em `numeric` no banco (`valor_original - pagamentos_confirmados + estornos`), independente das previsões do planejamento | Banco de dados (View/RPC) + serviço de dívidas e testes unitários | **P1 (Alta)** |
| **Registro de pagamentos flexíveis pelo credor** | **Não implementado** (apenas flag mensal em `pagamentos_mensais`) | Tabela `debt_payments` e fluxo para credor registrar pagamentos parciais, maiores que a previsão, antecipados, retroativos (`paid_at` ≠ `recorded_at`) e compensações | Novas migrations SQL, modal de pagamento na tela de detalhes da dívida | **P1 (Alta)** |
| **Planejamento flexível e ajuste pós-pagamento** | **Não implementado** | Visualização e edição das previsões futuras pelo credor após pagamentos, alerta de divergência entre soma das previsões e saldo restante, preservação de previsões não realizadas (`missed`) | Tela de detalhes da dívida, serviço de planejamento e banco (`debt_plan_items`) | **P2 (Média)** |
| **Histórico detalhado, correções e estornos auditáveis** | **Não implementado** | Tabela de eventos/auditoria e fluxo de estorno/correção de lançamento incorreto sem exclusão silenciosa (após definição da regra de negócio pendente) | Tabelas `debt_payments` / `debt_audit_events`, aba/seção de histórico no detalhe da dívida | **P2 (Média)** |
| **Estado real de RLS e triggers no Supabase remoto** | **Não foi possível confirmar** (sem acesso/inspeção ao banco remoto nesta auditoria) | Inspecionar `pg_policies` e schema real do ambiente Supabase antes de criar novas migrations | Ambiente remoto Supabase | **P0 (Pré-requisito)** |

---

## 8. Plano de Evolução Recomendado em Etapas Pequenas (Parte 6 & 7)

Para evoluir o sistema sem quebrar o MVP em produção nem exigir uma reescrita disruptiva (como a sugerida no antigo `REFACTORING_PLAN.md`), recomenda-se a seguinte sequência incremental:

### Etapa 0 — Saneamento da Base, Testes e Correção de Cálculos Existentes
- **Objetivo:** Garantir precisão matemática e corrigir bugs silenciosos nas funcionalidades atuais sem alterar o banco de dados.
- **Ações:**
  1. Configurar `Vitest` para testes automatizados de regras financeiras.
  2. Extrair a lógica de cálculo de saldos de [`Dashboard.jsx`](file:///c:/Users/andre/Repositories/despesas/src/pages/Dashboard.jsx#L537-L646) para funções puras testadas (usando centavos inteiros para evitar erros de ponto flutuante).
  3. Corrigir o bug em que o `pagador_id` aparece cobrando a si mesmo no [`Dashboard.jsx`](file:///c:/Users/andre/Repositories/despesas/src/pages/Dashboard.jsx#L597) quando inserido em `divisoes` por [`Streamings.jsx`](file:///c:/Users/andre/Repositories/despesas/src/pages/Streamings.jsx#L124-L128), e alinhar o cálculo de [`notificacoes.js`](file:///c:/Users/andre/Repositories/despesas/src/services/notificacoes.js#L61-L66) para respeitar `valor_personalizado`.
  4. Corrigir a consulta de `pagamentos_mensais` no Dashboard para considerar ambos os lados da relação (`usuario_id` e `pessoa_id`).

### Etapa 1 — Identidade, Autenticação Real e Vínculo Seguro de Participantes
- **Objetivo:** Resolver as vulnerabilidades críticas de segurança mantendo os dados atuais dos usuários.
- **Ações:**
  1. Inspecionar o schema remoto atual do Supabase para mapear os registros existentes em `public.users`.
  2. Adicionar suporte a `auth_user_id UUID UNIQUE` em `public.users`, separando o conceito de **Participante** (qualquer linha em `users`) de **Conta Autenticada** (linha com `auth_user_id` preenchido após verificação).
  3. Migrar o fluxo de [`AuthContext.jsx`](file:///c:/Users/andre/Repositories/despesas/src/contexts/AuthContext.jsx) e [`Login.jsx`](file:///c:/Users/andre/Repositories/despesas/src/pages/Login.jsx) para **Supabase Auth** (ver seção 9 sobre escolha do método de verificação).
  4. Criar função SQL `public.current_app_user_id()` (`SELECT id FROM public.users WHERE auth_user_id = auth.uid()`) e atualizar as políticas RLS de `users`, `streamings`, `divisoes` e `pagamentos_mensais` usando essa função em vez de comparar `users.id = auth.uid()`.

### Etapa 2 — Modelo de Dados de Dívidas ("Balde") e Dívidas Sem Planejamento
- **Objetivo:** Entregar o núcleo financeiro de dívidas individuais (`debts` + `debt_payments` + `debt_audit_events`) com RLS estrito desde o primeiro dia.
- **Ações:**
  1. Criar migration aditiva (não-destrutiva) com as tabelas `debts`, `debt_payments` e `debt_audit_events`, usando `NUMERIC(12,2)` e políticas RLS onde apenas `creditor_id` e `debtor_id` podem visualizar a dívida, e apenas o `creditor_id` pode alterar a dívida ou registrar pagamentos (conforme decisão do MVP em [docs/debts.md](file:///c:/Users/andre/Repositories/despesas/docs/debts.md#L105)).
  2. Criar função RPC transacional no PostgreSQL para registrar pagamentos (`paid_at`, `recorded_at`, `amount`, `payment_type`, `notes`) e retornar o saldo atualizado.
  3. Permitir que o credor selecione um participante existente ou cadastre um novo participante por nome e telefone durante a criação da dívida.

### Etapa 3 — Interface de Dívidas e Pagamentos (Identidade Metro UI)
- **Objetivo:** Disponibilizar o gerenciamento de dívidas sem redesenhar o Dashboard atual.
- **Ações:**
  1. Adicionar acesso às Dívidas no Dashboard (ex.: tile `"dívidas"` seguindo o mesmo padrão de `"streamings"` e `"pessoas"` em [`Dashboard.jsx`](file:///c:/Users/andre/Repositories/despesas/src/pages/Dashboard.jsx#L1075-L1131), além de indicar dívidas ativas no resumo/detalhe por pessoa conforme desejado).
  2. Criar a listagem de dívidas e a tela de detalhes da dívida em estilo Windows Phone/Metro (`src/styles/metro.css`), distinguindo visualmente **Valor Original**, **Total Pago**, **Saldo Restante (Balde)** e **Histórico de Pagamentos** (com `paid_at` vs `recorded_at` e tipo: transferência, dinheiro ou compensação).

### Etapa 4 — Planejamento Flexível e Ajustes Pós-Pagamento
- **Objetivo:** Adicionar o calendário opcional de previsões (`debt_plan_items`) desacoplado do saldo real.
- **Ações:**
  1. Criar tabela `debt_plan_items` com estados (`planned`, `missed`, `covered`, `adjusted`) e versionamento/histórico de alterações.
  2. Implementar na tela da dívida a geração inicial de previsões mensais e a interface de edição livre pelo credor após pagamentos parciais ou antecipados (ex.: abater na próxima previsão, reduzir parcelas futuras, adiar ou antecipar quitação).
  3. Exibir comparativo visual claro quando a soma das previsões futuras divergir do saldo restante da dívida ([docs/product.md](file:///c:/Users/andre/Repositories/despesas/docs/product.md#L75)).

### Etapa 5 — Fluxo de Correções e Estornos Auditáveis
- **Objetivo:** Permitir corrigir erros de lançamento sem apagar dados históricos.
- **Ações:**
  1. Implementar RPC transacional de estorno/retificação de pagamento que preserva o lançamento original, grava o evento em `debt_audit_events` (autor, data, valor anterior, valor novo, motivo) e recalcula o saldo.
  2. Exibir os eventos de correção na área secundária de histórico/detalhes da dívida, mantendo a tela principal limpa.

---

## 9. Decisões Pendentes e Riscos de Implementação (Parte 7)

### 9.1 Decisões que ainda precisam ser tomadas pelo usuário
1. **Regra detalhada de correção e estorno de pagamentos ([docs/product.md](file:///c:/Users/andre/Repositories/despesas/docs/product.md#L84) e [docs/debts.md](file:///c:/Users/andre/Repositories/despesas/docs/debts.md#L116-L125)):**
   - *Alternativa A (Estorno Total + Novo Lançamento):* Um pagamento lançado errado é marcado como "Estornado" (criando um lançamento inverso no histórico com motivo opcional) e o credor registra um novo pagamento com os dados corretos. Mais simples e 100% imutável.
   - *Alternativa B (Edição com Versionamento/Diff):* O credor edita o valor ou data do pagamento existente; o sistema atualiza o pagamento e grava uma linha em `debt_audit_events` com `valor_anterior -> valor_novo`, `data` e `motivo`.
2. **Mecanismo de autenticação e verificação de posse do telefone no Supabase Auth ([AGENTS.md](file:///c:/Users/andre/Repositories/despesas/AGENTS.md#L36-L38)):**
   - Para provar a posse do telefone antes de vincular uma conta a um participante pendente, qual estratégia será usada?
   - *Alternativa A:* Supabase Phone Auth (OTP via SMS ou WhatsApp usando provedor configurado no Supabase, como Twilio/MessageBird) — comprova posse real do número diretamente, mas possui custo por mensagem enviada.
   - *Alternativa B:* Login com Email/Senha ou Magic Link/Google no Supabase Auth + fluxo de verificação/vinculação do telefone por código ou convite autenticado.
3. **Integração do saldo de Dívidas no Dashboard atual ([docs/product.md](file:///c:/Users/andre/Repositories/despesas/docs/product.md#L110)):**
   - No card de cada pessoa no Dashboard atual, o valor principal deve exibir apenas o saldo mensal das assinaturas recorrentes (mantendo as Dívidas em um tile/tela própria e/ou indicador separado no card), ou deve somar a previsão do mês atual da dívida ao resumo mensal do PIX? (Recomendação: manter o saldo total da dívida separado do rateio mensal de streamings para não misturar "balde total" com "fluxo mensal", exibindo ambos claramente no detalhe da pessoa).
4. **Suporte a DDDs fora de São Paulo (`11–19`) na máscara de telefone ([AGENTS.md](file:///c:/Users/andre/Repositories/despesas/AGENTS.md#L28-L30)):**
   - O contorno atual em [`Login.jsx`](file:///c:/Users/andre/Repositories/despesas/src/pages/Login.jsx#L17-L19) e [`Users.jsx`](file:///c:/Users/andre/Repositories/despesas/src/pages/Users.jsx#L80-L82) prefixa `'1'` sempre que o número não começa com `'1'`. Caso haja participantes com DDDs iniciados por `2` a `9`, será necessário definir se ajustamos a heurística (ex.: só prefixar `'1'` quando o autofill entregar exatamente 10 dígitos iniciados por `1–9` compatíveis com perda do primeiro dígito) após testes em dispositivos iOS.

### 9.2 Riscos de Implementação e Mitigações
- **Risco 1 — Bloqueio de usuários atuais ao ativar Supabase Auth e RLS:** Se o RLS baseado em `auth.uid()` for ativado antes que os usuários atuais tenham suas contas vinculadas (`users.auth_user_id`), eles deixarão de ver seus streamings no Dashboard.
  - *Mitigação:* Fazer migração suave guiando o usuário já existente no primeiro acesso a autenticar e vincular seu registro `public.users` via RPC segura de verificação.
- **Risco 2 — Alteração de valores percebidos no Dashboard ao corrigir o bug do `pagador_id`:** Atualmente, `totalRecebendo` na Live Tile inclui indevidamente a própria cota do pagador ([`Dashboard.jsx`](file:///c:/Users/andre/Repositories/despesas/src/pages/Dashboard.jsx#L597-L621)). Ao corrigir esse cálculo, o valor de `recebendo` na Live Tile passará a refletir apenas o que *outras pessoas* devem ao usuário.
  - *Mitigação:* Validar os números antes e depois com os dados reais e comunicar a correção.
- **Risco 3 — Divergências entre os scripts SQL do repositório e o banco Supabase em produção:** Como há múltiplos arquivos avulsos (`supabase-schema.sql`, `create_pagamentos_mensais.sql`, `fix_pagamentos_rls.sql`) sem histórico formal em `supabase/migrations/`, o banco de produção pode ter colunas ou políticas diferentes.
  - *Mitigação:* Antes de escrever qualquer migration na fase de implementação, exportar/inspecionar o schema atual do banco remoto para consolidar uma linha de base fiel.