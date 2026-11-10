-- =====================================================================
-- 01 — Colunas de pagamento/rascunho + funções públicas de leitura
-- =====================================================================
-- Onde: SQL Editor da PRODUÇÃO (você roda; eu não rodo SQL de escrita).
-- Quando: ANTES do deploy da Fase 0.
-- Seguro com o site atual: só ADICIONA. Não remove policy, coluna nem dado.
-- O front atual continua funcionando igual (insere status 'pending', lê com select).
-- Desfazer: docs/sql/01-rollback.sql
-- =====================================================================

begin;

-- 1) Colunas novas (todas opcionais; as 19 linhas existentes ficam com NULL)
alter table public.portals
  add column if not exists draft_token_hash text,        -- sha256 do token de rascunho (o token nunca é gravado)
  add column if not exists payment_id       text,        -- último pagamento do MP ligado ao portal
  add column if not exists payment_status   text,        -- status desse pagamento no MP
  add column if not exists paid_amount      numeric(10,2),
  add column if not exists paid_at          timestamptz;

-- 2) status só pode ser 'pending' ou 'paid' (hoje: 4 paid, 15 pending, nenhum nulo)
alter table public.portals
  add constraint portals_status_check check (status in ('pending', 'paid'));
alter table public.portals
  alter column status set not null;

-- 3) Funções públicas (SECURITY DEFINER: leem a tabela sem precisar da policy de SELECT)

-- Portal público: sem e-mail, sem dados de pagamento, e só se pago.
create or replace function public.get_public_portal(p_slug text)
returns table (
  slug text, title text, message text, date text, photos jsonb,
  music text, "musicName" text, plan text, emoji text
)
language sql stable security definer set search_path = ''
as $$
  select p.slug, p.title, p.message, p.date, p.photos,
         p.music, p."musicName", p.plan, p.emoji
  from public.portals p
  where p.slug = p_slug and p.status = 'paid';
$$;

-- Slug livre?
create or replace function public.slug_available(p_slug text)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select not exists (select 1 from public.portals p where p.slug = p_slug);
$$;

-- Status do pagamento: 'pending' | 'paid' | null (não existe)
create or replace function public.get_portal_status(p_slug text)
returns text
language sql stable security definer set search_path = ''
as $$
  select p.status from public.portals p where p.slug = p_slug;
$$;

-- Quantidade de portais pagos (home)
create or replace function public.count_paid_portals()
returns integer
language sql stable security definer set search_path = ''
as $$
  select count(*)::integer from public.portals p where p.status = 'paid';
$$;

-- 4) Só anon/authenticated executam (o Supabase concede a PUBLIC por padrão)
revoke all on function public.get_public_portal(text)  from public;
revoke all on function public.slug_available(text)     from public;
revoke all on function public.get_portal_status(text)  from public;
revoke all on function public.count_paid_portals()     from public;
grant execute on function public.get_public_portal(text)  to anon, authenticated;
grant execute on function public.slug_available(text)     to anon, authenticated;
grant execute on function public.get_portal_status(text)  to anon, authenticated;
grant execute on function public.count_paid_portals()     to anon, authenticated;

commit;

-- ---------------------------------------------------------------------
-- Conferência (só leitura) — rode depois e me mande o resultado
-- ---------------------------------------------------------------------
-- select public.count_paid_portals();                    -- esperado: 4
-- select public.slug_available('teste-cc-nao-existe');    -- esperado: true
-- select public.get_portal_status('teste-cc-nao-existe'); -- esperado: null
-- select column_name from information_schema.columns
--   where table_schema = 'public' and table_name = 'portals' order by ordinal_position; -- 17 colunas
