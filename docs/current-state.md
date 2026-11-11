# Estado técnico atual

**Última verificação do banco:** 11/11/2026, 04:32:41 UTC  
**Tipo de verificação:** consulta somente de metadados; nenhuma linha de negócio foi consultada ou alterada.  
**Objetivo:** registrar o que foi observado, sem confundir o banco de produção com arquivos SQL antigos do repositório.

## 1. Stack e aplicação

- Frontend: React 18 + Vite, JavaScript.
- Navegação: React Router.
- Dados: Supabase / PostgreSQL.
- Aplicativo web com PWA.
- Estilo atual inspirado no Windows Phone/Metro.
- O app atual usa um fluxo simplificado de identificação por telefone, sem senha/OTP, e mantém o usuário no localStorage. Isso não deve ser tratado como autenticação/autorização confiável para proteger dados financeiros.
- O usuário decidiu manter Supabase; migração para Appwrite não está no escopo atual.

Consulte o código real antes de assumir organização de pastas, dependências ou serviços. O plano em REFACTORING_PLAN.md é uma proposta datada de 05/12/2025, não uma declaração de que aquelas mudanças foram executadas.

## 2. Tabelas encontradas no schema public

A auditoria encontrou quatro tabelas:

### users

| Coluna | Tipo | Observação |
|---|---|---|
| id | uuid | PK; default gen_random_uuid() |
| nome | varchar(255) | NOT NULL |
| telefone | varchar(11) | NOT NULL, UNIQUE |
| is_admin | boolean | default false |
| created_at | timestamptz | data de criação |

### streamings

| Coluna | Tipo | Observação |
|---|---|---|
| id | uuid | PK |
| nome | varchar(255) | NOT NULL |
| valor_total | numeric(10,2) | NOT NULL |
| dia_cobranca | integer | nullable; CHECK entre 1 e 31 |
| pagador_id | uuid | FK para users(id), ON DELETE CASCADE |
| criado_por | uuid | NOT NULL; FK para users(id), sem ON DELETE explícito |
| created_at | timestamptz | data de criação |

### divisoes

| Coluna | Tipo | Observação |
|---|---|---|
| id | uuid | PK |
| streaming_id | uuid | FK para streamings(id), ON DELETE CASCADE |
| user_id | uuid | FK para users(id), ON DELETE CASCADE |
| valor_personalizado | numeric(10,2) | nullable |
| created_at | timestamptz | data de criação |

Há uma restrição UNIQUE em (streaming_id, user_id).

### pagamentos_mensais

| Coluna | Tipo | Observação |
|---|---|---|
| id | uuid | PK |
| usuario_id | uuid | FK para users(id), ON DELETE CASCADE |
| pessoa_id | uuid | FK para users(id), ON DELETE CASCADE |
| mes | integer | NOT NULL; CHECK 1–12 |
| ano | integer | NOT NULL |
| valor_pago | numeric(10,2) | NOT NULL |
| data_pagamento | timestamptz | default now() |
| created_at | timestamptz | data de criação |

Há UNIQUE em (usuario_id, pessoa_id, mes, ano). Essa granularidade indica um registro por par de pessoas/mês/ano; não assumir que a tabela já serve como ledger de pagamentos de dívidas parceladas.

## 3. Segurança observada na auditoria

### RLS

| Tabela | RLS habilitado | RLS forçado |
|---|---:|---:|
| users | Sim | Não |
| streamings | Sim | Não |
| divisoes | Sim | Não |
| pagamentos_mensais | Não | Não |

### Políticas encontradas

- divisoes: SELECT, INSERT, UPDATE e DELETE com condições amplas USING (true) / WITH CHECK (true).
- streamings: SELECT, INSERT, UPDATE e DELETE com condições amplas USING (true) / WITH CHECK (true).
- users: SELECT com USING (true); INSERT com WITH CHECK (true); UPDATE com USING (true). Não foi listada policy de DELETE.
- As políticas foram listadas como permissive para o papel public.

### Grants observados

A consulta de grants listou privilégios de tabela para anon, authenticated e service_role em users, streamings e divisoes. Combinados com políticas permissivas amplas, isso é um risco crítico: não há isolamento de linhas por usuário nessas tabelas para a API anônima.

Para pagamentos_mensais, a consulta não listou grants explícitos para anon, authenticated ou service_role; RLS desabilitado, isoladamente, não prova que a tabela está acessível publicamente. Antes de concluir a exposição efetiva, verificar privilégios efetivos/ACLs e configuração de exposição da API.

### Outros metadados

- A consulta não encontrou triggers nem rotinas/funções no schema public.
- A auditoria não cobriu todos os schemas, políticas de Storage, configurações de Auth, configuração de exposição do PostgREST, dados de negócio nem todo o projeto Supabase.
- Nenhuma chave ou segredo foi compartilhado nessa auditoria.

**Não colocar o aplicativo em uso público nem acrescentar dados financeiros sensíveis antes de corrigir e validar o modelo de autenticação/autorização.** Não aplique uma correção simplista de RLS: o login atual é baseado em tabela customizada/localStorage, e as políticas devem ser redesenhadas depois de mapear o fluxo real do app.

## 4. Divergências entre produção e SQL versionado

O arquivo raiz supabase-schema.sql não corresponde integralmente ao banco auditado. Exemplos:

- Arquivo SQL: users.telefone VARCHAR(20); produção: VARCHAR(11).
- Arquivo SQL: streamings.dia_cobranca NOT NULL; produção: coluna nullable.
- Arquivo SQL: streamings.criado_por com ON DELETE CASCADE; produção não mostrou ação ON DELETE explícita.
- Políticas do SQL versionado diferem das políticas permissivas encontradas na produção.

Portanto:
- Não executar supabase-schema.sql novamente como se fosse uma migração incremental.
- Não assumir que os arquivos create_pagamentos_mensais.sql e fix_pagamentos_rls.sql descrevem exatamente o estado atual.
- Antes de qualquer migração, criar uma migração baseada no schema real, revisar dependências do código e fazer backup/estratégia de rollback.

## 5. Limitações do modelo atual

- users.id é uma chave da tabela customizada e não deve ser presumida igual a auth.uid().
- A identificação por telefone e o localStorage não comprovam posse do número nem autenticam uma pessoa de forma segura.
- A tabela pagamentos_mensais representa pagamentos mensais por par e não foi desenhada como histórico transacional de pagamentos de dívidas.
- Não foram encontradas rotinas ou triggers no schema public na auditoria.

## 6. Próxima investigação técnica recomendada

Antes de alterar código ou banco:

1. Mapear exatamente o fluxo de login, persistência de usuário e logout.
2. Mapear cada query Supabase usada por Dashboard, Streamings, Users e pagamentos mensais.
3. Identificar se algum fluxo depende de acesso anônimo e como o identificador do usuário é passado.
4. Desenhar autenticação/autorização compatível com Supabase Auth e RLS ou outra solução segura aprovada.
5. Projetar o ledger financeiro (dívidas, previsões, pagamentos, compensações e acertos) com transações atômicas, constraints e testes.
6. Só então apresentar plano de migração e SQL para aprovação explícita.
