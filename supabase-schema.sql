-- Schema para o banco de dados do app Despesas Compartilhadas
-- Executar no SQL Editor do Supabase

-- Extensões necessárias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Tabela de usuários
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome VARCHAR(255) NOT NULL,
  telefone VARCHAR(20) UNIQUE NOT NULL,
  is_admin BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de streamings (serviços compartilhados)
CREATE TABLE streamings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome VARCHAR(255) NOT NULL,
  valor_total DECIMAL(10,2) NOT NULL,
  dia_cobranca INTEGER NOT NULL CHECK (dia_cobranca >= 1 AND dia_cobranca <= 31),
  pagador_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  criado_por UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de divisões (como o valor é dividido entre participantes)
CREATE TABLE divisoes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  streaming_id UUID NOT NULL REFERENCES streamings(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  valor_personalizado DECIMAL(10,2) NULL, -- NULL significa divisão igual
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(streaming_id, user_id)
);

-- Índices para performance
CREATE INDEX idx_users_telefone ON users(telefone);
CREATE INDEX idx_streamings_pagador ON streamings(pagador_id);
CREATE INDEX idx_streamings_criado_por ON streamings(criado_por);
CREATE INDEX idx_divisoes_streaming ON divisoes(streaming_id);
CREATE INDEX idx_divisoes_user ON divisoes(user_id);

-- Habilitar Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE streamings ENABLE ROW LEVEL SECURITY;
ALTER TABLE divisoes ENABLE ROW LEVEL SECURITY;

-- Políticas RLS (ajustar conforme necessário para produção)
-- Para usuários: todos podem ler, mas apenas admins podem criar/editar
CREATE POLICY "Users are viewable by everyone" ON users FOR SELECT USING (true);
CREATE POLICY "Users can be created by admins" ON users FOR INSERT WITH CHECK (true); -- Temporário, ajustar
CREATE POLICY "Users can be updated by admins" ON users FOR UPDATE USING (true); -- Temporário

-- Para streamings: usuários podem ver streamings onde participam ou que criaram
CREATE POLICY "Streamings are viewable by participants" ON streamings FOR SELECT USING (
  criado_por = auth.uid() OR
  id IN (SELECT streaming_id FROM divisoes WHERE user_id = auth.uid())
);
CREATE POLICY "Streamings can be created by authenticated users" ON streamings FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Streamings can be updated by creator" ON streamings FOR UPDATE USING (criado_por = auth.uid());

-- Para divisões: usuários podem ver suas próprias divisões
CREATE POLICY "Divisions are viewable by participants" ON divisoes FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Divisions can be managed by streaming creator" ON divisoes FOR ALL USING (
  streaming_id IN (SELECT id FROM streamings WHERE criado_por = auth.uid())
);