-- =====================================================================
-- 03-rollback — desfaz docs/sql/03-limite-geracoes-ia.sql
-- =====================================================================
-- Ordem: se o código da ia-assistente estiver no ar, volte o deploy primeiro.
-- Sem a função, /api/gerar-mensagem responde 503 e o wizard mostra os modelos prontos
-- (o resto do site não usa esta tabela).
-- Perde só o histórico de gerações (contagem de limite), nenhum dado de portal.
-- =====================================================================

begin;
drop function if exists public.consume_ai_quota(text, text, integer, integer, integer, integer);
drop table if exists public.ai_generations;
commit;
