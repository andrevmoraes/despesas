
CREATE TABLE pagamentos_mensais (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  pessoa_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  mes INT NOT NULL CHECK (mes >= 1 AND mes <= 12),
  ano INT NOT NULL,
  valor_pago DECIMAL(10,2) NOT NULL,
  data_pagamento TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(usuario_id, pessoa_id, mes, ano)
);

-- Índices para performance
CREATE INDEX idx_pagamentos_usuario ON pagamentos_mensais(usuario_id);
CREATE INDEX idx_pagamentos_pessoa ON pagamentos_mensais(pessoa_id);
CREATE INDEX idx_pagamentos_mes_ano ON pagamentos_mensais(mes, ano);

-- RLS desabilitado porque usamos tabela users customizada, não Supabase Auth
-- ALTER TABLE pagamentos_mensais ENABLE ROW LEVEL SECURITY;

