-- =====================================================================
-- 01-rollback — desfaz docs/sql/01-colunas-e-funcoes-publicas.sql
-- =====================================================================
-- ATENÇÃO À ORDEM: o código da Fase 0 depende do 01. Se ele estiver no ar,
-- volte primeiro o deploy na Vercel (Instant Rollback) e só depois rode isto.
-- Perde: payment_id/payment_status/paid_amount/paid_at/draft_token_hash gravados
-- desde o 01 (o status 'paid' dos portais NÃO é afetado).
-- =====================================================================

begin;

drop function if exists public.get_public_portal(text);
drop function if exists public.slug_available(text);
drop function if exists public.get_portal_status(text);
drop function if exists public.count_paid_portals();

alter table public.portals alter column status drop not null;
alter table public.portals drop constraint if exists portals_status_check;

alter table public.portals
  drop column if exists draft_token_hash,
  drop column if exists payment_id,
  drop column if exists payment_status,
  drop column if exists paid_amount,
  drop column if exists paid_at;

commit;
