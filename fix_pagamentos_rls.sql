-- Desabilita RLS na tabela pagamentos_mensais
ALTER TABLE pagamentos_mensais DISABLE ROW LEVEL SECURITY;

-- Remove as policies existentes
DROP POLICY IF EXISTS pagamentos_select_policy ON pagamentos_mensais;
DROP POLICY IF EXISTS pagamentos_insert_policy ON pagamentos_mensais;
DROP POLICY IF EXISTS pagamentos_delete_policy ON pagamentos_mensais;
