# 🚀 Plano de Refatoração Completo - Despesas Compartilhadas

**Data:** 5 de dezembro de 2025  
**Status:** Planejamento concluído, aguardando execução  
**Estimativa total:** 13-17 horas

---

## 📊 Resumo Executivo

Este documento contém o plano completo para modernizar o projeto usando:
- **React Query** (data fetching)
- **Zustand** (state management)
- **React Hook Form + Zod** (forms e validação)
- **Arquitetura feature-based** (organização)
- **Service layer** (abstração Supabase)

---

## 🔍 Análise de Problemas Identificados

### 1. Duplicação Massiva de Código

**Problema:** Padrão `useState` + `useEffect` + `supabase.from()` repetido em todas as páginas.

**Ocorrências encontradas:**
- `Dashboard.jsx`: 167 linhas, 80+ linhas de lógica de cálculo misturada
- `Streamings.jsx`: 6 estados diferentes, 2 useEffects, chamadas Supabase inline
- `Users.jsx`: 5 estados diferentes, validação manual duplicada
- `Login.jsx`: 3 estados, validação de telefone duplicada

**Impacto:**
- Manutenção difícil (mudar loading pattern = mudar 4 arquivos)
- Sem cache (re-fetch toda vez que componente monta)
- Sem tratamento de erros consistente

### 2. Ausência de Service Layer

**Problema:** Chamadas `supabase.from()` espalhadas por 4 arquivos diferentes.

**Exemplos:**
```javascript
// Dashboard.jsx - linha ~240
const { data: divisoes, error: divisoesError } = await supabase
  .from('divisoes')
  .select(`*, streaming:streamings (...)`)
  .eq('user_id', usuario.id)

// Streamings.jsx - linha ~30
const { data: streamingsData, error: streamingsError } = await supabase
  .from('streamings')
  .select(`*, pagador:users!streamings_pagador_id_fkey (nome), ...`)
  .order('created_at', { ascending: false })
```

**Impacto:**
- Queries complexas duplicadas
- Difícil testar (Supabase acoplado)
- Sem tipo de retorno consistente

### 3. Estado Global Mal Gerenciado

**Problema:** Context API usado para estado simples + localStorage direto.

**Código atual:**
```javascript
// AuthContext.jsx
const [user, setUser] = useState(null)
localStorage.setItem('user', JSON.stringify(data))

// App.jsx
const [alert, setAlert] = useState({ message: '', type: 'info' })
```

**Impacto:**
- Context re-render desnecessário
- localStorage sem abstração (dificulta migração)
- Estado de alert duplicado em App.jsx

### 4. Validação Manual e Duplicada

**Problema:** Função `formatarTelefone()` duplicada em 3 arquivos.

**Código duplicado:**
```javascript
// Login.jsx, Users.jsx, Streamings.jsx (3x)
const formatarTelefone = (value) => {
  const numbers = value.replace(/\D/g, '')
  if (numbers.length <= 11) {
    return numbers
      .replace(/^(\d{2})(\d)/g, '($1) $2')
      .replace(/(\d{5})(\d)/, '$1-$2')
  }
  const trimmed = numbers.slice(0, 11)
  return trimmed
    .replace(/^(\d{2})(\d)/g, '($1) $2')
    .replace(/(\d{5})(\d)/, '$1-$2')
}
```

**Outras validações manuais:**
- Telefone (11 dígitos) - 3 locais
- Dia da cobrança (1-31) - sem validação real
- Valor total - sem validação de formato

### 5. CSS Não Otimizado

**Arquivos CSS:**
- ✅ `global.css` - usado
- ✅ `tiles.css` - usado
- ✅ `forms.css` - usado
- ✅ `buttons.css` - usado
- ✅ `navigation.css` - usado
- ✅ `bottom-tabs.css` - usado
- ❌ `pivot.css` - **NÃO USADO** (componente removido)
- ❌ `App.css` - **NÃO USADO** (código de exemplo do Vite)

**Impacto:**
- 2 arquivos CSS mortos no bundle
- Sem CSS Modules (classes globais podem colidir)

---

## 📦 Bibliotecas Recomendadas

| Biblioteca | Versão | Justificativa | Bundle Size |
|-----------|--------|---------------|-------------|
| `@tanstack/react-query` | ^5.0.0 | Elimina 80% do código de fetch, cache automático, devtools | ~13kb |
| `zustand` | ^4.0.0 | State global minimalista, substitui Context API | ~1kb |
| `react-hook-form` | ^7.0.0 | Forms performáticos, re-render otimizado | ~9kb |
| `zod` | ^3.0.0 | Validação TypeScript-safe, schemas reutilizáveis | ~12kb |
| `date-fns` | ^3.0.0 | Manipulação de datas (dia_cobranca, formatação) | ~2kb (tree-shakeable) |

**Total adicionado:** ~37kb (gzipped: ~12kb)

**NÃO recomendo:**
- ❌ **Tailwind CSS** - Design system já bem definido em CSS variables, migração seria disruptiva
- ❌ **Redux Toolkit** - Overkill para escala do projeto, Zustand é suficiente
- ❌ **TypeScript** - Pode ser adicionado depois, não é prioritário agora

---

## 🏗️ Nova Estrutura de Pastas (Feature-based)

```
src/
├── features/
│   ├── auth/
│   │   ├── components/
│   │   │   └── LoginForm.jsx
│   │   ├── hooks/
│   │   │   └── useAuth.js
│   │   ├── services/
│   │   │   └── authService.js
│   │   ├── stores/
│   │   │   └── authStore.js
│   │   └── schemas/
│   │       └── loginSchema.js
│   │
│   ├── dashboard/
│   │   ├── components/
│   │   │   ├── SaldoCard.jsx
│   │   │   ├── BalanceBreakdown.jsx
│   │   │   └── NotificationButton.jsx
│   │   ├── hooks/
│   │   │   ├── useSaldos.js
│   │   │   └── useNotifications.js
│   │   ├── services/
│   │   │   └── saldosService.js
│   │   └── utils/
│   │       ├── formatCurrency.js
│   │       └── calculateBalances.js
│   │
│   ├── streamings/
│   │   ├── components/
│   │   │   ├── StreamingCard.jsx
│   │   │   ├── StreamingModal.jsx
│   │   │   └── DivisaoCheckbox.jsx
│   │   ├── hooks/
│   │   │   ├── useStreamings.js
│   │   │   └── useStreamingMutation.js
│   │   ├── services/
│   │   │   └── streamingsService.js
│   │   └── schemas/
│   │       └── streamingSchema.js
│   │
│   ├── users/
│   │   ├── components/
│   │   │   ├── UserCard.jsx
│   │   │   └── UserModal.jsx
│   │   ├── hooks/
│   │   │   ├── useUsers.js
│   │   │   └── useUserMutation.js
│   │   ├── services/
│   │   │   └── usersService.js
│   │   └── schemas/
│   │       └── userSchema.js
│   │
│   └── common/
│       ├── components/
│       │   ├── Alert.jsx
│       │   ├── BottomTabs.jsx
│       │   ├── ErrorBoundary.jsx
│       │   ├── Modal.jsx
│       │   └── Loader.jsx
│       ├── stores/
│       │   └── alertStore.js
│       └── utils/
│           ├── formatters.js
│           ├── validators.js
│           └── constants.js
│
├── lib/
│   ├── supabase/
│   │   ├── client.js
│   │   ├── types.js
│   │   └── queryBuilder.js
│   └── react-query/
│       ├── queryClient.js
│       └── queryKeys.js
│
├── styles/
│   ├── base/
│   │   ├── reset.css
│   │   ├── tokens.css
│   │   └── typography.css
│   └── components/
│       ├── tiles.css
│       ├── forms.css
│       ├── buttons.css
│       └── bottom-tabs.css
│
├── App.jsx
└── main.jsx
```

**Princípios:**
- Cada feature é autossuficiente
- Código compartilhado em `common/`
- Infra técnica em `lib/`
- Estilos organizados por categoria

---

## 🎯 Plano de Migração por Fases

### FASE 1: Setup de Ferramentas (1-2h)

**Objetivo:** Instalar e configurar todas as dependências modernas.

**Tarefas:**
1. Instalar dependências:
   ```bash
   npm install @tanstack/react-query zustand react-hook-form zod date-fns
   npm install @tanstack/react-query-devtools --save-dev
   ```

2. Criar `lib/react-query/queryClient.js`:
   ```javascript
   import { QueryClient } from '@tanstack/react-query'
   
   export const queryClient = new QueryClient({
     defaultOptions: {
       queries: {
         staleTime: 1000 * 60 * 5, // 5 minutos
         cacheTime: 1000 * 60 * 10, // 10 minutos
         retry: 1,
         refetchOnWindowFocus: false,
       },
     },
   })
   ```

3. Criar `lib/react-query/queryKeys.js`:
   ```javascript
   export const queryKeys = {
     users: {
       all: ['users'],
       detail: (id) => ['users', id],
     },
     streamings: {
       all: ['streamings'],
       detail: (id) => ['streamings', id],
     },
     saldos: {
       byUser: (userId) => ['saldos', userId],
     },
   }
   ```

4. Atualizar `main.jsx` para incluir QueryClientProvider

**Critérios de sucesso:**
- ✅ Dependências instaladas
- ✅ QueryClient configurado
- ✅ App rodando sem erros

---

### FASE 2: Service Layer (2-3h)

**Objetivo:** Abstrair todas as chamadas Supabase em serviços dedicados.

**Tarefas:**

1. Criar `lib/supabase/client.js`:
   ```javascript
   import { createClient } from '@supabase/supabase-js'
   
   const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
   const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
   
   if (!supabaseUrl || !supabaseAnonKey) {
     throw new Error('Missing Supabase environment variables')
   }
   
   export const supabase = createClient(supabaseUrl, supabaseAnonKey)
   
   // Helper para tratar erros de forma consistente
   export const handleSupabaseError = (error) => {
     console.error('Supabase error:', error)
     return {
       success: false,
       error: error.message || 'Erro desconhecido',
     }
   }
   ```

2. Criar `features/auth/services/authService.js`:
   ```javascript
   import { supabase, handleSupabaseError } from '@/lib/supabase/client'
   
   export const authService = {
     async login(telefone) {
       try {
         const { data, error } = await supabase
           .from('users')
           .select('*')
           .eq('telefone', telefone)
           .single()
         
         if (error) throw error
         
         return { success: true, user: data }
       } catch (error) {
         return handleSupabaseError(error)
       }
     },
   }
   ```

3. Criar `features/streamings/services/streamingsService.js`
4. Criar `features/users/services/usersService.js`
5. Criar `features/dashboard/services/saldosService.js`

**Critérios de sucesso:**
- ✅ Todos os `supabase.from()` movidos para services
- ✅ Tratamento de erro consistente
- ✅ Tipo de retorno padronizado

---

### FASE 3: Data Fetching com React Query (3-4h)

**Objetivo:** Substituir todo `useEffect` + `useState` por hooks React Query.

**Exemplo - ANTES (Dashboard.jsx atual):**
```javascript
const [saldos, setSaldos] = useState([])
const [loading, setLoading] = useState(true)

useEffect(() => {
  carregarSaldos(user)
}, [user])

const carregarSaldos = async (usuario) => {
  setLoading(true)
  // 80 linhas de lógica...
  setSaldos(saldosOrdenados)
  setLoading(false)
}
```

**DEPOIS (features/dashboard/hooks/useSaldos.js):**
```javascript
import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/lib/react-query/queryKeys'
import { saldosService } from '../services/saldosService'

export const useSaldos = (userId) => {
  return useQuery({
    queryKey: queryKeys.saldos.byUser(userId),
    queryFn: () => saldosService.calcularSaldos(userId),
    enabled: !!userId,
  })
}
```

**Tarefas:**

1. Criar hooks React Query:
   - `features/dashboard/hooks/useSaldos.js`
   - `features/streamings/hooks/useStreamings.js`
   - `features/streamings/hooks/useStreamingMutation.js`
   - `features/users/hooks/useUsers.js`
   - `features/users/hooks/useUserMutation.js`

2. Mutations para create/update/delete:
   ```javascript
   // features/streamings/hooks/useStreamingMutation.js
   import { useMutation, useQueryClient } from '@tanstack/react-query'
   import { queryKeys } from '@/lib/react-query/queryKeys'
   import { streamingsService } from '../services/streamingsService'
   
   export const useCreateStreaming = () => {
     const queryClient = useQueryClient()
     
     return useMutation({
       mutationFn: streamingsService.create,
       onSuccess: () => {
         queryClient.invalidateQueries(queryKeys.streamings.all)
         queryClient.invalidateQueries(queryKeys.saldos.all)
       },
     })
   }
   ```

3. Atualizar páginas para usar hooks:
   ```javascript
   // Dashboard.jsx - REFATORADO
   import { useSaldos } from '@/features/dashboard/hooks/useSaldos'
   
   export default function Dashboard() {
     const { user } = useAuthStore()
     const { data: saldos, isLoading } = useSaldos(user?.id)
     
     if (isLoading) return <Loader />
     
     return <div>{/* UI limpa */}</div>
   }
   ```

**Benefícios:**
- ✅ Cache automático (não refetch ao voltar para página)
- ✅ Background refetch inteligente
- ✅ Invalidação de queries relacionadas
- ✅ DevTools para debug

**Critérios de sucesso:**
- ✅ Zero `useEffect` com data fetching
- ✅ Zero `useState` para loading/data/error
- ✅ Invalidação de cache funcionando

---

### FASE 4: Estado Global com Zustand (1h)

**Objetivo:** Substituir Context API por Zustand.

**ANTES (AuthContext.jsx - 60 linhas):**
```javascript
const AuthContext = createContext(null)

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  
  useEffect(() => {
    const storedUser = localStorage.getItem('user')
    if (storedUser) setUser(JSON.parse(storedUser))
    setLoading(false)
  }, [])
  
  const login = async (telefone) => { /* ... */ }
  const logout = () => { /* ... */ }
  
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
```

**DEPOIS (features/auth/stores/authStore.js - 25 linhas):**
```javascript
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { authService } from '../services/authService'

export const useAuthStore = create(
  persist(
    (set) => ({
      user: null,
      isAdmin: false,
      
      login: async (telefone) => {
        const result = await authService.login(telefone)
        if (result.success) {
          set({ 
            user: result.user, 
            isAdmin: result.user.is_admin 
          })
        }
        return result
      },
      
      logout: () => set({ user: null, isAdmin: false }),
    }),
    {
      name: 'auth-storage',
    }
  )
)
```

**Tarefas:**

1. Criar `features/auth/stores/authStore.js`
2. Criar `features/common/stores/alertStore.js`:
   ```javascript
   import { create } from 'zustand'
   
   export const useAlertStore = create((set) => ({
     message: '',
     type: 'info',
     
     showAlert: (message, type = 'info') => 
       set({ message, type }),
     
     closeAlert: () => 
       set({ message: '', type: 'info' }),
   }))
   ```

3. Remover `AuthContext.jsx`
4. Atualizar todos os usos de `useAuth()` para `useAuthStore()`

**Benefícios:**
- ✅ Menos código (25 vs 60 linhas)
- ✅ Persist automático (Zustand middleware)
- ✅ Re-render otimizado
- ✅ DevTools integrado

**Critérios de sucesso:**
- ✅ AuthContext deletado
- ✅ useAuthStore funcionando em todos os componentes
- ✅ Persist funcionando (localStorage automático)

---

### FASE 5: Validação com Zod + React Hook Form (2-3h)

**Objetivo:** Substituir validações manuais por schemas reutilizáveis.

**ANTES (Users.jsx - validação manual):**
```javascript
const handleSubmit = async (e) => {
  e.preventDefault()
  setLoading(true)
  
  const telefoneNumeros = formData.telefone.replace(/\D/g, '')
  
  if (telefoneNumeros.length !== 11) {
    showAlert('Telefone deve ter 11 dígitos (DDD + número)', 'error')
    setLoading(false)
    return
  }
  
  // ... resto do código
}
```

**DEPOIS (features/users/schemas/userSchema.js):**
```javascript
import { z } from 'zod'

export const userSchema = z.object({
  nome: z.string()
    .min(3, 'Nome deve ter no mínimo 3 caracteres')
    .max(100, 'Nome muito longo'),
  
  telefone: z.string()
    .regex(/^\d{11}$/, 'Telefone deve ter 11 dígitos (DDD + número)'),
  
  is_admin: z.boolean().default(false),
})

export const loginSchema = z.object({
  telefone: z.string()
    .regex(/^\d{11}$/, 'Telefone inválido'),
})

export const streamingSchema = z.object({
  nome: z.string()
    .min(2, 'Nome muito curto')
    .max(50, 'Nome muito longo'),
  
  valor_total: z.number()
    .positive('Valor deve ser positivo')
    .max(9999.99, 'Valor muito alto'),
  
  dia_cobranca: z.number()
    .int('Dia deve ser inteiro')
    .min(1, 'Dia inválido')
    .max(31, 'Dia inválido'),
  
  pagador_id: z.string().uuid('ID inválido'),
  
  divisoes: z.array(z.string().uuid()).default([]),
})
```

**DEPOIS (features/users/components/UserModal.jsx):**
```javascript
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { userSchema } from '../schemas/userSchema'

export default function UserModal({ user, onClose }) {
  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(userSchema),
    defaultValues: user || {},
  })
  
  const { mutate, isPending } = useUserMutation()
  
  const onSubmit = (data) => {
    mutate(data, {
      onSuccess: () => {
        showAlert('Usuário salvo!', 'success')
        onClose()
      },
    })
  }
  
  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <input {...register('nome')} />
      {errors.nome && <span>{errors.nome.message}</span>}
      
      <input {...register('telefone')} />
      {errors.telefone && <span>{errors.telefone.message}</span>}
      
      <button type="submit" disabled={isPending}>
        {isPending ? 'Salvando...' : 'Salvar'}
      </button>
    </form>
  )
}
```

**Tarefas:**

1. Criar schemas Zod para cada entidade
2. Integrar React Hook Form em todos os formulários
3. Remover todas as validações manuais
4. Remover funções `formatarTelefone` duplicadas (mover para `common/utils/formatters.js`)

**Benefícios:**
- ✅ Validação no cliente e servidor (mesmo schema)
- ✅ Mensagens de erro consistentes
- ✅ TypeScript-safe (se adicionar TS depois)
- ✅ Schemas reutilizáveis

**Critérios de sucesso:**
- ✅ Todos os forms usam React Hook Form
- ✅ Validações definidas em schemas Zod
- ✅ Formatação em utils compartilhados

---

### FASE 6: Reorganização de Arquivos (2h)

**Objetivo:** Mover código para estrutura feature-based.

**Plano de migração:**

1. Criar estrutura `features/`:
   ```bash
   mkdir -p src/features/{auth,dashboard,streamings,users,common}/{components,hooks,services,stores,schemas,utils}
   ```

2. Mover arquivos:
   ```
   pages/Login.jsx → features/auth/components/LoginForm.jsx
   pages/Dashboard.jsx → features/dashboard/Dashboard.jsx
   pages/Streamings.jsx → features/streamings/Streamings.jsx
   pages/Users.jsx → features/users/Users.jsx
   
   components/Alert.jsx → features/common/components/Alert.jsx
   components/BottomTabs.jsx → features/common/components/BottomTabs.jsx
   components/ErrorBoundary.jsx → features/common/components/ErrorBoundary.jsx
   
   services/supabase.js → lib/supabase/client.js
   services/notificacoes.js → features/dashboard/services/notificationService.js
   ```

3. Atualizar imports:
   - Usar alias `@/` para imports absolutos
   - Configurar em `vite.config.js`:
     ```javascript
     import path from 'path'
     
     export default defineConfig({
       resolve: {
         alias: {
           '@': path.resolve(__dirname, './src'),
         },
       },
     })
     ```

4. Deletar pastas antigas:
   ```bash
   rm -rf src/pages src/contexts src/services
   ```

**Critérios de sucesso:**
- ✅ Estrutura feature-based completa
- ✅ Imports absolutos funcionando
- ✅ Pastas antigas removidas
- ✅ App rodando sem erros

---

### FASE 7: Limpeza de Código Morto (1h)

**Objetivo:** Remover arquivos não utilizados.

**Arquivos para deletar:**

1. **Componentes não usados:**
   - `src/components/Pivot.jsx` (substituído por BottomTabs)
   - `src/components/BottomNav.jsx` (não usado)

2. **CSS não usado:**
   - `src/styles/pivot.css` (componente Pivot removido)
   - `src/App.css` (código exemplo do Vite)

3. **Arquivos de exemplo:**
   - Verificar se `.env.example` está atualizado

**Reorganizar CSS:**

Mover de `src/styles/` flat para estrutura organizada:
```
src/styles/
├── base/
│   ├── reset.css (extrair de global.css)
│   ├── tokens.css (CSS variables)
│   └── typography.css (fonts, headings)
└── components/
    ├── tiles.css
    ├── forms.css
    ├── buttons.css
    └── bottom-tabs.css
```

**Critérios de sucesso:**
- ✅ Componentes não usados deletados
- ✅ CSS não usado deletado
- ✅ Build sem warnings de imports não resolvidos
- ✅ Bundle size reduzido

---

### FASE 8: Otimizações PWA e Performance (1h)

**Objetivo:** Melhorar code splitting, Service Worker e bundle.

**Tarefas:**

1. **Melhorar code splitting:**
   ```javascript
   // App.jsx
   const Dashboard = lazy(() => import('@/features/dashboard/Dashboard'))
   const Streamings = lazy(() => import('@/features/streamings/Streamings'))
   const Users = lazy(() => import('@/features/users/Users'))
   const Login = lazy(() => import('@/features/auth/components/LoginForm'))
   ```

2. **Otimizar Service Worker:**
   - Atualizar versão de cache para `v4`
   - Adicionar prefetch de dados críticos
   - Melhorar estratégia de cache para React Query

3. **Vite bundle optimization:**
   ```javascript
   // vite.config.js
   export default defineConfig({
     build: {
       rollupOptions: {
         output: {
           manualChunks: {
             'vendor': ['react', 'react-dom'],
             'supabase': ['@supabase/supabase-js'],
             'react-query': ['@tanstack/react-query'],
             'forms': ['react-hook-form', 'zod'],
           },
         },
       },
       chunkSizeWarningLimit: 500,
     },
   })
   ```

4. **React Query prefetching:**
   ```javascript
   // features/dashboard/Dashboard.jsx
   import { useQueryClient } from '@tanstack/react-query'
   
   useEffect(() => {
     // Prefetch streamings quando usuário está no dashboard
     queryClient.prefetchQuery(queryKeys.streamings.all)
   }, [])
   ```

**Critérios de sucesso:**
- ✅ Lazy loading funcionando
- ✅ Bundle otimizado (<500kb main chunk)
- ✅ Service Worker v4 ativo
- ✅ Prefetching configurado

---

## 📝 Checklist Completa de Execução

### Preparação
- [ ] Fazer backup do projeto atual
- [ ] Criar branch `refactor/modernization`
- [ ] Verificar que todos os testes manuais funcionam

### FASE 1: Setup (1-2h)
- [ ] Instalar React Query, Zustand, Zod, React Hook Form, date-fns
- [ ] Criar `lib/react-query/queryClient.js`
- [ ] Criar `lib/react-query/queryKeys.js`
- [ ] Atualizar `main.jsx` com QueryClientProvider
- [ ] Testar que app roda sem erros

### FASE 2: Service Layer (2-3h)
- [ ] Criar `lib/supabase/client.js` com error handling
- [ ] Criar `features/auth/services/authService.js`
- [ ] Criar `features/streamings/services/streamingsService.js`
- [ ] Criar `features/users/services/usersService.js`
- [ ] Criar `features/dashboard/services/saldosService.js`
- [ ] Testar todos os serviços isoladamente

### FASE 3: React Query (3-4h)
- [ ] Criar `features/dashboard/hooks/useSaldos.js`
- [ ] Criar `features/streamings/hooks/useStreamings.js`
- [ ] Criar `features/streamings/hooks/useStreamingMutation.js`
- [ ] Criar `features/users/hooks/useUsers.js`
- [ ] Criar `features/users/hooks/useUserMutation.js`
- [ ] Atualizar Dashboard para usar hooks
- [ ] Atualizar Streamings para usar hooks
- [ ] Atualizar Users para usar hooks
- [ ] Remover todos os `useEffect` + `useState` de data fetching
- [ ] Testar invalidação de cache

### FASE 4: Zustand (1h)
- [ ] Criar `features/auth/stores/authStore.js`
- [ ] Criar `features/common/stores/alertStore.js`
- [ ] Substituir `useAuth()` por `useAuthStore()` em todos os componentes
- [ ] Remover `AuthContext.jsx`
- [ ] Testar persist do localStorage
- [ ] Testar login/logout

### FASE 5: Forms + Zod (2-3h)
- [ ] Criar `features/users/schemas/userSchema.js`
- [ ] Criar `features/auth/schemas/loginSchema.js`
- [ ] Criar `features/streamings/schemas/streamingSchema.js`
- [ ] Criar `features/common/utils/formatters.js` (formatarTelefone, formatCurrency)
- [ ] Refatorar UserModal com React Hook Form
- [ ] Refatorar StreamingModal com React Hook Form
- [ ] Refatorar LoginForm com React Hook Form
- [ ] Remover validações manuais
- [ ] Testar validações em todos os forms

### FASE 6: Reorganização (2h)
- [ ] Criar estrutura `features/` completa
- [ ] Mover Login.jsx → features/auth/components/LoginForm.jsx
- [ ] Mover Dashboard.jsx → features/dashboard/Dashboard.jsx
- [ ] Mover Streamings.jsx → features/streamings/Streamings.jsx
- [ ] Mover Users.jsx → features/users/Users.jsx
- [ ] Mover componentes comuns para features/common/
- [ ] Configurar alias `@/` em vite.config.js
- [ ] Atualizar todos os imports
- [ ] Deletar pastas antigas (pages, contexts, services)
- [ ] Testar que app roda sem erros

### FASE 7: Limpeza (1h)
- [ ] Deletar `components/Pivot.jsx`
- [ ] Deletar `components/BottomNav.jsx`
- [ ] Deletar `styles/pivot.css`
- [ ] Deletar `App.css`
- [ ] Reorganizar CSS em base/ e components/
- [ ] Atualizar imports de CSS
- [ ] Rodar build e verificar bundle size
- [ ] Verificar warnings

### FASE 8: Otimizações (1h)
- [ ] Adicionar lazy loading para todas as features
- [ ] Atualizar Service Worker para v4
- [ ] Otimizar manualChunks em vite.config.js
- [ ] Adicionar prefetch de dados críticos
- [ ] Testar performance no DevTools
- [ ] Testar PWA offline

### Finalização
- [ ] Executar `npm run build` e verificar erros
- [ ] Testar todas as funcionalidades manualmente
- [ ] Verificar que não há console.errors
- [ ] Atualizar README.md com nova estrutura
- [ ] Commit e merge para main

---

## 🚦 Estratégia de Execução Recomendada

### OPÇÃO A: Refatoração Completa (13-17h)
**Melhor para:** Quando você tem tempo dedicado e quer modernizar tudo de uma vez.

**Como executar:**
1. Reserve 2-3 dias dedicados
2. Execute as fases em ordem sequencial
3. Commit após cada fase concluída
4. Se algo quebrar, reverta a última fase

**Vantagens:**
- ✅ Projeto modernizado rapidamente
- ✅ Menos chance de conflitos de merge
- ✅ Você vê o resultado completo logo

**Riscos:**
- ⚠️ Se algo quebrar no meio, pode ser difícil debugar
- ⚠️ Requer tempo dedicado (não pode fazer aos poucos)

---

### OPÇÃO B: Prova de Conceito (2-3h) → Depois Full Refactor
**Melhor para:** Quando você quer validar a abordagem antes de refatorar tudo.

**Como executar:**
1. **POC: Refatorar apenas feature Streamings** (2-3h)
   - Criar service layer para streamings
   - Criar hooks React Query para streamings
   - Criar schemas Zod para validação
   - Refatorar StreamingModal com React Hook Form
   - Resultado: você vê como fica o código final

2. **Se aprovar:** aplicar mesmo padrão em Dashboard e Users (4-6h)
3. **Finalizar:** fases 4, 6, 7, 8 (4-5h)

**Vantagens:**
- ✅ Você vê o resultado antes de comprometer
- ✅ Pode ajustar o approach se não gostar
- ✅ Menos risco

**Desvantagens:**
- ⚠️ Mais tempo total (setup duplicado)
- ⚠️ Código fica inconsistente durante POC

---

### OPÇÃO C: Por Demanda (Você escolhe a ordem)
**Melhor para:** Quando você quer modernizar aos poucos, conforme necessidade.

**Sugestão de ordem:**
1. **Service Layer primeiro** (FASE 2) - 2-3h
   - Impacto: código mais testável, queries centralizadas
   - Não quebra nada (ainda usa useState + useEffect)

2. **React Query depois** (FASE 3) - 3-4h
   - Impacto: elimina 80% dos useEffect
   - Depende: service layer estar pronto

3. **Forms + Zod quando precisar mudar um form** (FASE 5)
   - Impacto: validação robusta
   - Independente das outras fases

4. **Zustand quando Context API incomodar** (FASE 4)
   - Impacto: menos boilerplate
   - Pode fazer por último

**Vantagens:**
- ✅ Pode fazer em sprints curtos
- ✅ Cada fase entrega valor isoladamente
- ✅ Flexibilidade total

**Desvantagens:**
- ⚠️ Código fica inconsistente por mais tempo
- ⚠️ Mais difícil rastrear dependências

---

## 🎨 Exemplos de Código Final (ANTES vs DEPOIS)

### Dashboard.jsx

**ANTES (167 linhas):**
```javascript
import { useState, useEffect, useRef } from 'react'
import { supabase } from '../services/supabase'
import { useAuth } from '../contexts/AuthContext'

function Dashboard({ showAlert }) {
  const { user, logout } = useAuth()
  const [saldos, setSaldos] = useState([])
  const [totalDevendo, setTotalDevendo] = useState(0)
  const [totalRecebendo, setTotalRecebendo] = useState(0)
  const [loading, setLoading] = useState(true)
  
  useEffect(() => {
    if (!user?.id) return
    carregarSaldos(user)
  }, [user])
  
  const carregarSaldos = async (usuario) => {
    setLoading(true)
    try {
      const [divisoes, streamingsPagos] = await Promise.all([
        supabase.from('divisoes').select(`...`).eq('user_id', usuario.id),
        supabase.from('streamings').select(`...`).eq('pagador_id', usuario.id)
      ])
      // ... 80 linhas de cálculo
      setSaldos(saldosOrdenados)
      setTotalDevendo(totalDevendoAcumulado)
      setTotalRecebendo(totalRecebendoAcumulado)
    } catch (error) {
      console.error('Erro:', error)
    } finally {
      setLoading(false)
    }
  }
  
  // ... resto do componente
}
```

**DEPOIS (45 linhas):**
```javascript
import { useSaldos } from './hooks/useSaldos'
import { useAuthStore } from '@/features/auth/stores/authStore'
import { useAlertStore } from '@/features/common/stores/alertStore'
import { SaldoCard } from './components/SaldoCard'
import { NotificationButton } from './components/NotificationButton'
import { Loader } from '@/features/common/components/Loader'

export default function Dashboard() {
  const { user, logout } = useAuthStore()
  const showAlert = useAlertStore(state => state.showAlert)
  const { data: saldos, isLoading } = useSaldos(user?.id)
  
  if (isLoading) return <Loader />
  
  const { saldosDetalhados, totalDevendo, totalRecebendo } = saldos
  
  return (
    <div className="container">
      <header>
        <h1>Olá, {user.nome}</h1>
        <div>
          <NotificationButton />
          <button onClick={logout}>Sair</button>
        </div>
      </header>
      
      <div className="balance-summary">
        <div className="tile tile--green">
          <span>Recebendo</span>
          <span>R$ {totalRecebendo.toFixed(2)}</span>
        </div>
        <div className="tile tile--pink">
          <span>Devendo</span>
          <span>R$ {totalDevendo.toFixed(2)}</span>
        </div>
      </div>
      
      <div className="tile-grid">
        {saldosDetalhados.map(saldo => (
          <SaldoCard key={saldo.pessoa.id} saldo={saldo} />
        ))}
      </div>
    </div>
  )
}
```

---

### StreamingModal.jsx (Forms)

**ANTES (validação manual, 120 linhas):**
```javascript
const [formData, setFormData] = useState({
  nome: '',
  valor_total: '',
  dia_cobranca: '',
  pagador_id: user.id,
  divisoes: []
})

const handleSubmit = async (e) => {
  e.preventDefault()
  setLoading(true)
  
  // Validação manual
  if (!formData.nome || formData.nome.length < 2) {
    showAlert('Nome muito curto', 'error')
    setLoading(false)
    return
  }
  
  if (!formData.valor_total || parseFloat(formData.valor_total) <= 0) {
    showAlert('Valor inválido', 'error')
    setLoading(false)
    return
  }
  
  // ... mais validações
  
  try {
    const { error } = await supabase.from('streamings').insert({ /* ... */ })
    if (error) throw error
    await carregarDados()
    setShowModal(false)
  } catch (error) {
    showAlert('Erro ao salvar', 'error')
  } finally {
    setLoading(false)
  }
}

return (
  <form onSubmit={handleSubmit}>
    <input
      value={formData.nome}
      onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
    />
    {/* ... mais inputs */}
  </form>
)
```

**DEPOIS (React Hook Form + Zod, 40 linhas):**
```javascript
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { streamingSchema } from '../schemas/streamingSchema'
import { useStreamingMutation } from '../hooks/useStreamingMutation'

export default function StreamingModal({ streaming, onClose }) {
  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(streamingSchema),
    defaultValues: streaming || { pagador_id: user.id, divisoes: [] },
  })
  
  const { mutate, isPending } = useStreamingMutation(streaming?.id)
  const showAlert = useAlertStore(state => state.showAlert)
  
  const onSubmit = (data) => {
    mutate(data, {
      onSuccess: () => {
        showAlert('Streaming salvo!', 'success')
        onClose()
      },
      onError: (error) => {
        showAlert(error.message, 'error')
      },
    })
  }
  
  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <div>
        <label>Nome do Streaming</label>
        <input {...register('nome')} />
        {errors.nome && <span className="error">{errors.nome.message}</span>}
      </div>
      
      <div>
        <label>Valor Mensal (R$)</label>
        <input type="number" step="0.01" {...register('valor_total', { valueAsNumber: true })} />
        {errors.valor_total && <span className="error">{errors.valor_total.message}</span>}
      </div>
      
      {/* ... mais campos */}
      
      <button type="submit" disabled={isPending}>
        {isPending ? 'Salvando...' : 'Salvar'}
      </button>
    </form>
  )
}
```

---

## 📊 Métricas de Sucesso

### Antes da Refatoração
- **Linhas de código:** ~2.500
- **Arquivos JSX:** 13
- **Duplicação de código:** Alta (formatarTelefone 3x, validações 5x)
- **useState para data:** 15 ocorrências
- **useEffect para fetch:** 8 ocorrências
- **Bundle size:** ~180kb (estimado)
- **Time to Interactive:** ~2.5s

### Depois da Refatoração (Esperado)
- **Linhas de código:** ~1.800 (-28%)
- **Arquivos JSX:** 25+ (mais modular)
- **Duplicação de código:** Mínima (utils centralizados)
- **useState para data:** 0 ✅
- **useEffect para fetch:** 0 ✅
- **Bundle size:** ~165kb (-8%)
- **Time to Interactive:** ~2.0s (-20%)

### Benefícios Qualitativos
- ✅ Código mais testável (services isolados)
- ✅ Melhor developer experience (menos boilerplate)
- ✅ Cache inteligente (React Query)
- ✅ Validação robusta (Zod schemas)
- ✅ Estado global simplificado (Zustand)

---

## ❓ Perguntas Frequentes

### Q: Preciso aprender todas essas bibliotecas antes?
**R:** Não! As bibliotecas são intuitivas. Você aprende conforme usa. Documentação:
- React Query: https://tanstack.com/query/latest
- Zustand: https://zustand-demo.pmnd.rs/
- React Hook Form: https://react-hook-form.com/
- Zod: https://zod.dev/

### Q: O que acontece se algo quebrar no meio?
**R:** Cada fase é isolada. Se quebrar na FASE 3, você pode reverter apenas ela. Por isso é importante commitar após cada fase.

### Q: Posso pular alguma fase?
**R:** Sim, mas algumas têm dependências:
- FASE 3 (React Query) depende de FASE 2 (Service Layer)
- FASE 5 (Forms) é independente
- FASE 4 (Zustand) é independente

### Q: Vale a pena adicionar TypeScript também?
**R:** Recomendo fazer em outra etapa. Refatoração já é complexa. TypeScript pode ser adicionado depois que a arquitetura estiver estável.

### Q: E se eu quiser adicionar Tailwind depois?
**R:** Possível, mas trabalhoso. O design system atual em CSS variables é sólido. Tailwind traria ganhos marginais.

### Q: Como testar se não quebrei nada?
**R:** Teste manual em cada fase:
1. Login funciona?
2. Dashboard carrega saldos?
3. Posso criar/editar streaming?
4. Posso criar/editar usuário?
5. Logout funciona?
6. PWA instala no celular?

---

## 📚 Referências e Recursos

### Documentação Oficial
- [React Query - Guia Completo](https://tanstack.com/query/latest/docs/react/overview)
- [Zustand - Getting Started](https://github.com/pmndrs/zustand)
- [React Hook Form - Quickstart](https://react-hook-form.com/get-started)
- [Zod - Documentation](https://zod.dev/)

### Artigos Recomendados
- [Feature-based Architecture](https://khalilstemmler.com/articles/software-design-architecture/feature-sliced/)
- [React Query Best Practices](https://tkdodo.eu/blog/practical-react-query)
- [Form Validation with Zod](https://www.robinwieruch.de/react-hook-form-zod/)

### Vídeos
- [React Query in 100 Seconds](https://www.youtube.com/watch?v=novnyCaa7To)
- [Zustand State Management](https://www.youtube.com/watch?v=KCr-UNsM3vA)

---

## ✅ Próximos Passos

**Para executar este plano:**

1. **Leia o plano completo** (você acabou de fazer! ✅)

2. **Escolha a estratégia:**
   - [ ] OPÇÃO A: Refatoração completa (13-17h)
   - [ ] OPÇÃO B: POC primeiro (2-3h) → Full depois
   - [ ] OPÇÃO C: Por demanda (fase a fase)

3. **Quando estiver pronto para começar, me diga:**
   - "Vamos executar a OPÇÃO A/B/C"
   - Ou "Comece pela FASE X"

4. **Durante a execução:**
   - Vou atualizar este documento com ✅ em cada tarefa concluída
   - Vou commitar após cada fase
   - Vou alertar se encontrar problemas

---

**Este documento será atualizado conforme executamos cada fase.**

**Última atualização:** 5 de dezembro de 2025
