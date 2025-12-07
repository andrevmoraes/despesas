# Instruções para Ativar Pagamentos Mensais

## 1. Executar SQL no Supabase

Acesse o Supabase Dashboard e execute o arquivo `create_pagamentos_mensais.sql`:

1. Abra https://supabase.com/dashboard
2. Selecione seu projeto
3. Vá em **SQL Editor** no menu lateral
4. Clique em **New query**
5. Cole o conteúdo do arquivo `create_pagamentos_mensais.sql`
6. Clique em **Run** para executar

## 2. Funcionalidade Implementada

✅ **Tabela `pagamentos_mensais`** criada com:
- Registro de pagamentos por mês/ano
- RLS policies para segurança
- Índices para performance

✅ **Botão no menu**: "marcar dezembro como pago" (muda automaticamente)

✅ **Card mostra**: "tudo certo esse mês ✓" quando pago

✅ **Lógica**: 
- Ao marcar como pago, registra na tabela
- Dashboard verifica pagamentos do mês atual
- Em janeiro 2026, volta a cobrar normalmente

## 3. Como Usar

1. Clique nos 3 pontos (...) no card da pessoa
2. Selecione "marcar dezembro como pago"
3. O card mostrará "tudo certo esse mês ✓"
4. No próximo mês, a cobrança volta automaticamente
