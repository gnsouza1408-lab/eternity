-- =====================================================================
-- 03 — Limite de gerações do assistente de IA (/api/gerar-mensagem)
-- =====================================================================
-- Onde: SQL Editor da PRODUÇÃO (você roda).
-- Quando: antes do deploy da branch ia-assistente. Só ADICIONA: não mexe na tabela portals.
-- Desfazer: docs/sql/03-rollback.sql
--
-- Por que no banco: a rota roda em serverless (várias instâncias, sem memória
-- compartilhada), então a contagem precisa de um lugar central.
-- Privacidade: guarda só o hash HMAC do IP (nunca o IP) e o id aleatório do rascunho.
-- Os registros com mais de 2 dias são apagados pela própria função.
-- =====================================================================

begin;

create table if not exists public.ai_generations (
  id          bigint generated always as identity primary key,
  ip_hash     text not null,
  draft_id    text,
  created_at  timestamptz not null default now()
);

create index if not exists ai_generations_ip_idx      on public.ai_generations (ip_hash, created_at desc);
create index if not exists ai_generations_draft_idx   on public.ai_generations (draft_id, created_at desc) where draft_id is not null;
create index if not exists ai_generations_created_idx on public.ai_generations (created_at);

-- Fechada para visitantes (mesmo padrão da portals após o SQL 02): só o servidor acessa.
alter table public.ai_generations enable row level security;
revoke all on public.ai_generations from anon, authenticated;

-- Confere os limites e, se couber, registra a geração. Atômica por IP (advisory lock).
-- Retorna: 'ok' | 'limite_global' | 'limite_ip_hora' | 'limite_ip_dia' | 'limite_rascunho'
create or replace function public.consume_ai_quota(
  p_ip_hash        text,
  p_draft_id       text,
  p_ip_hora        integer,
  p_ip_dia         integer,
  p_rascunho_dia   integer,
  p_global_dia     integer
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  n integer;
begin
  perform pg_advisory_xact_lock(hashtext('ai_quota:' || p_ip_hash));

  delete from public.ai_generations where created_at < now() - interval '2 days';

  select count(*) into n from public.ai_generations where created_at > now() - interval '1 day';
  if n >= p_global_dia then return 'limite_global'; end if;

  select count(*) into n from public.ai_generations
   where ip_hash = p_ip_hash and created_at > now() - interval '1 hour';
  if n >= p_ip_hora then return 'limite_ip_hora'; end if;

  select count(*) into n from public.ai_generations
   where ip_hash = p_ip_hash and created_at > now() - interval '1 day';
  if n >= p_ip_dia then return 'limite_ip_dia'; end if;

  if p_draft_id is not null then
    select count(*) into n from public.ai_generations
     where draft_id = p_draft_id and created_at > now() - interval '1 day';
    if n >= p_rascunho_dia then return 'limite_rascunho'; end if;
  end if;

  insert into public.ai_generations (ip_hash, draft_id) values (p_ip_hash, p_draft_id);
  return 'ok';
end;
$$;

-- Só o servidor (service_role) executa.
revoke all on function public.consume_ai_quota(text, text, integer, integer, integer, integer) from public, anon, authenticated;
grant execute on function public.consume_ai_quota(text, text, integer, integer, integer, integer) to service_role;

commit;

-- ---------------------------------------------------------------------
-- Conferência (só leitura; uma consulta, uma linha)
-- Esperado: tabela_existe true | rls_ligado true | anon_select false | anon_executa false | service_executa true
-- ---------------------------------------------------------------------
select
  (to_regclass('public.ai_generations') is not null)                                       as tabela_existe,
  (select relrowsecurity from pg_class where oid = 'public.ai_generations'::regclass)       as rls_ligado,
  has_table_privilege('anon', 'public.ai_generations', 'SELECT')                           as anon_select,
  has_function_privilege('anon', 'public.consume_ai_quota(text,text,integer,integer,integer,integer)', 'EXECUTE')         as anon_executa,
  has_function_privilege('service_role', 'public.consume_ai_quota(text,text,integer,integer,integer,integer)', 'EXECUTE') as service_executa;
