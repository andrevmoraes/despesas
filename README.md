## Despesas Compartilhadas — Gerenciador PWA

Aplicação PWA para gerenciar despesas compartilhadas entre amigos. Permite cadastrar serviços, definir quem paga, dividir valores (igual ou personalizado) e visualizar saldos por usuário.

**Objetivo:** facilitar o controle de despesas compartilhadas entre amigos e prover uma interface leve, offline-capable e instalável.

---

## Funcionalidades principais

- Autenticação por número de telefone (login sem senha)
- Gestão de usuários (criação/edição por admin)
- Cadastro e edição de streamings (nome, valor, dia de cobrança, pagador)
- Divisão de custos: divisão igual ou valores personalizados por participante
- Dashboard com cálculo automático de saldos entre usuários
- Design inspirado no Windows Phone (tiles, palette vibrante)
- PWA: service worker, manifest e instalação em dispositivos

---

## Tecnologias

- React + Vite
- Supabase (PostgreSQL + Auth)
- PWA (Service Worker + Manifest)
- CSS puro (estrutura de estilos em `src/styles/`)

---

## Estrutura do projeto (resumo)

```
cobranca/
├── public/                 # assets públicos, manifest, service worker
├── src/
│   ├── components/         # componentes reutilizáveis (BottomNav, Alert...)
│   ├── contexts/           # AuthContext
│   ├── pages/              # páginas (Dashboard, Login, Streamings, Users)
│   ├── services/           # integração com Supabase
│   └── styles/             # css: global, forms, buttons, tiles, navigation
├── dados-exemplo.sql       # dados de exemplo para popular o DB
├── supabase-schema.sql     # schema do banco (tables, indices, RLS)
├── SETUP_SUPABASE.md       # passo-a-passo para configurar Supabase
├── QUICK_START.md          # instruções rápidas de setup e uso
└── README.md               # este arquivo
```

---

## Banco de dados (visão técnica)

Tabelas principais e campos (resumo do `supabase-schema.sql`):

- `users`
   - `id` UUID (PK)
   - `nome` VARCHAR
   - `telefone` VARCHAR (único)
   - `is_admin` BOOLEAN
   - `created_at` TIMESTAMP

- `streamings`
   - `id` UUID (PK)
   - `nome` VARCHAR
   - `valor_total` DECIMAL
   - `dia_cobranca` INTEGER
   - `pagador_id` UUID (FK → users)
   - `criado_por` UUID (FK → users)
   - `created_at` TIMESTAMP

- `divisoes`
   - `id` UUID (PK)
   - `streaming_id` UUID (FK → streamings)
   - `user_id` UUID (FK → users)
   - `valor_personalizado` DECIMAL (nullable; null = divisão igual)
   - `created_at` TIMESTAMP

Índices recomendados já incluídos no schema: índices por `telefone`, `pagador_id`, `streaming_id`.

---

## Arquitetura e fluxo de dados

- Autenticação: `AuthContext` valida o telefone junto ao Supabase e persiste estado no `localStorage`.
- Dashboard: carrega divisões e streamings do usuário, calcula saldos por pessoa e exibe em tiles.
- Streamings: lista, criação via modal, seleção de pagador, seleção de participantes e divisão automática ou personalizada.
- Usuários: área restrita a admins para listar/criar/editar usuários.

RLS (Row Level Security) está habilitado no schema; políticas no projeto atual permitem leitura/escrita típicas para app interno — ajustar para produção.

---

## Design e tema

- Paleta principal inspirada no Windows Phone: `#00aff0` (primary), `#00aba9` (secondary), `#ff8c00` (accent), `#00a300` (success), `#e51400` (danger).
- Tipografia: Segoe UI (fallback: system-ui)
- Layout: tiles flat, espaçamento consistente (4/8/16/24/32), bordas mínimas.

Arquivos de estilo: `src/styles/global.css`, `tiles.css`, `buttons.css`, `forms.css`, `navigation.css`.

---

## Configuração (Supabase) — resumo

1. Criar projeto em https://supabase.com
2. Executar o conteúdo de `supabase-schema.sql` no SQL Editor (cria tabelas, índices e políticas)
3. Copiar `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` para um arquivo `.env` (use `.env.example` como modelo)

Exemplo `.env`:

```env
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua-chave-publica-aqui
```

4. Criar o primeiro usuário admin (exemplo SQL):

```sql
INSERT INTO users (nome, telefone, is_admin)
VALUES ('Seu Nome', '11999999999', true);
```

Notas:
- Telefones devem estar em formato numérico sem formatação (11 dígitos, ex: `11987654321`).
- Em ambiente de produção, revise as políticas RLS e chaves do Supabase.

---

## Início rápido (desenvolvimento)

Instale dependências e inicie o servidor de desenvolvimento:

```powershell
npm install
npm run dev
```

Abra `http://localhost:5173` no navegador. Faça login com o telefone cadastrado no banco.

Para popular dados de exemplo use `dados-exemplo.sql` via SQL Editor do Supabase.

---

## PWA & Deploy

- Service Worker em `public/sw.js` fornece caching básico para o modo offline.
- `public/manifest.json` configurado para instalação em dispositivos móveis.
- Build para produção com Vite: `npm run build` (ver `package.json`).

---

## Segurança

- Autenticação: login por telefone (sem senha). Admins controlam criação de usuários.
- RLS habilitado (ajustar políticas para produção).
- Não exponha chaves anon em repositórios públicos; use variáveis de ambiente no deploy.

---

## Operação e tarefas futuras

Prioridade média / backlog identificado:

- Histórico de pagamentos e marcação de pagamentos realizados
- Notificações push para cobranças
- Valores personalizados mais flexíveis na divisão
- Exportação de relatórios (CSV/PDF)
- Suporte a categorias além de streaming
- Dark/Light mode toggle

---

## Desenvolvimento colaborativo

- Estrutura limpa de componentes em `src/components/`
- Contexto de autenticação em `src/contexts/AuthContext.jsx`
- Serviços e integrações em `src/services/supabase.js`

Contribuições são bem-vindas: abra issues descrevendo o escopo e envie PRs com mudanças pequenas e bem documentadas.

---

## Referências internas

- Arquivos principais: `supabase-schema.sql`, `dados-exemplo.sql`, `SETUP_SUPABASE.md`, `QUICK_START.md`.
- Páginas principais: `src/pages/Dashboard.jsx`, `src/pages/Login.jsx`, `src/pages/Streamings.jsx`, `src/pages/Users.jsx`.

---

## Histórico de mudanças e refatorações

### Sessão de Clean Code & Bugfix (Dezembro 2025)

#### 📄 Consolidação de documentação
- Unificou `ARCHITECTURE.md`, `QUICK_START.md` e `SETUP_SUPABASE.md` em um único `README.md` técnico, bem estruturado e pronto para IA.
- Removeu redundâncias e reorganizou seções de forma lógica.

#### 🔧 Refatoração de código (Clean Code)
- **`src/pages/Login.jsx` e `src/pages/Users.jsx`**: Corrigiu função `formatarTelefone()` que retornava variável de estado externa ao digitar >11 dígitos. Agora recorta corretamente para 11 dígitos e formata.
- **`src/contexts/AuthContext.jsx`**: Padronizou `createContext(null)` (melhor tipagem) e traduzir mensagem de erro do hook para português.
- **`src/main.jsx`**: Removeu vírgula extra após JSX na chamada `render()`.

#### 🐛 Bugfix crítico (Microsoft Edge)
- **Problema**: App renderizava "tudo preto" no Edge, funcionando normalmente no Firefox.
- **Raiz**: Service Worker (`public/sw.js`) bloqueava requisições para domínios externos (Supabase), impedindo carregamento de dados.
- **Solução aplicada**:
  - Atualizado `public/sw.js` para usar `skipWaiting()` e `clients.claim()` (ativa SW imediatamente)
  - Mudou para estratégia **network-first** para requisições de navegação (HTML)
  - Mantém cache-first para recursos estáticos
  - **Exclui requisições externas** (Supabase, APIs) da interceptação — deixa passar direto para a rede
  - Incrementou versão de cache para `cobranca-v2`

#### 🔍 Diagnóstico e validação
- Adicionou logs temporários em `main.jsx`, `AuthContext.jsx`, `App.jsx` para diagnosticar versões do React e carregamento.
- Validou que React 18.3.1 carrega corretamente em Edge e Firefox após mudanças.
- Removeu logs de diagnóstico após resolução (limpeza de console para produção).

#### ✅ Resultado
- ✅ App funciona corretamente em Edge, Firefox e outros navegadores
- ✅ Service Worker otimizado (não intercepta APIs externas)
- ✅ Clean Code aplicado (sem mudanças comportamentais)
- ✅ Documentação consolidada e clara

---

**Atualização do README:** se novos arquivos `.md` forem adicionados e alterarem significativamente o contexto (novas políticas de segurança, mudanças no schema, ou novos fluxos), atualize este README para refletir tais mudanças.



---

## Documentação de produto e continuidade

A documentação canônica para decisões e continuidade do projeto está em:
- [Contexto do projeto e decisões confirmadas](docs/PROJECT_CONTEXT.md)
- [Regras de produto](docs/product.md)
- [Regras de dívidas e pagamentos](docs/debts.md)
- [Estado técnico e auditoria do banco](docs/current-state.md)
- [Instruções para agentes](AGENTS.md)

**Importante:** as instruções de setup e o schema SQL deste README refletem arquivos históricos do repositório e não devem ser usados para reaplicar o schema em produção. A auditoria de 11/11/2026 encontrou divergências entre o SQL versionado e o banco atual, além de políticas de segurança permissivas. Consulte `docs/current-state.md` antes de qualquer operação de banco ou segurança.

O README descreve principalmente o MVP existente; as funcionalidades de dívidas e acerto integrado são decisões de evolução do produto e não devem ser consideradas implementadas apenas por estarem documentadas.
