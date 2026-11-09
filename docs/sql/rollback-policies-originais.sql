-- =====================================================================
-- Rollback de emergência: restaura policies e privilégios da tabela portals
-- exatamente como estavam na produção em 08/11/2026 (consultas conferidas).
-- =====================================================================
-- Use se, depois do 02 (remoção do acesso anon), o site quebrar e for preciso
-- voltar ao código antigo, que lê e insere direto com a chave pública.
-- Idempotente: pode rodar mais de uma vez.
--
-- Estado capturado:
--   policies: "Enable insert for anon" INSERT {public} with_check true
--             "Enable select for anon" SELECT {public} using true
--   grants anon e authenticated: DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE
--   RLS ligado, não forçado; PK portals_pkey (slug)
-- =====================================================================

begin;

alter table public.portals enable row level security;

drop policy if exists "Enable insert for anon" on public.portals;
create policy "Enable insert for anon" on public.portals
  as permissive for insert to public with check (true);

drop policy if exists "Enable select for anon" on public.portals;
create policy "Enable select for anon" on public.portals
  as permissive for select to public using (true);

grant delete, insert, references, select, trigger, truncate, update
  on public.portals to anon, authenticated;

commit;

-- Conferência:
-- select policyname, cmd, roles, qual, with_check from pg_policies where tablename = 'portals';
-- select grantee, privilege_type from information_schema.role_table_grants
--   where table_schema='public' and table_name='portals' and grantee in ('anon','authenticated') order by 1,2;
