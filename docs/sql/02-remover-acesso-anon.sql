-- =====================================================================
-- 02 — Remove o acesso direto de visitantes (anon/authenticated) à tabela portals
-- =====================================================================
-- Onde: SQL Editor da PRODUÇÃO (você roda).
-- Quando: SÓ DEPOIS do deploy da Fase 0 em produção, testado (ver docs/fase-0-publicacao.md).
--   O site antigo lê e insere direto na tabela: se este SQL rodar antes do deploy,
--   o wizard e o portal antigos param de funcionar.
-- Desfazer: docs/sql/rollback-policies-originais.sql
-- =====================================================================

-- ---------------------------------------------------------------------
-- A) PRÉ-CHECAGEM (só leitura). Rode antes e confira:
-- ---------------------------------------------------------------------
-- A1. As 4 funções existem e são SECURITY DEFINER (prosecdef = true):
-- select proname, prosecdef, pg_get_userbyid(proowner) as dono
-- from pg_proc where pronamespace = 'public'::regnamespace
--   and proname in ('get_public_portal','slug_available','get_portal_status','count_paid_portals');
--
-- A2. O dono das funções ignora RLS (rolbypassrls = true) ou é o dono da tabela:
-- select r.rolname, r.rolbypassrls, (select pg_get_userbyid(relowner) from pg_class where oid = 'public.portals'::regclass) as dono_tabela
-- from pg_roles r where r.rolname = 'postgres';

-- ---------------------------------------------------------------------
-- B) MIGRAÇÃO
-- ---------------------------------------------------------------------
begin;

drop policy if exists "Enable select for anon" on public.portals;
drop policy if exists "Enable insert for anon" on public.portals;

-- RLS continua ligado e sem policy: anon/authenticated não leem nem escrevem.
-- Além disso, tira os privilégios da tabela (TRUNCATE, por exemplo, não passa pelo RLS).
revoke all on public.portals from anon, authenticated;

commit;

-- ---------------------------------------------------------------------
-- C) CONFERÊNCIA (rode depois; a transação é desfeita no fim, não altera nada)
-- ---------------------------------------------------------------------
-- begin;
--   set local role anon;
--   select public.count_paid_portals();                     -- deve retornar o número de pagos
--   select public.slug_available('teste-cc-nao-existe');     -- true
--   select count(*) from public.get_public_portal('teste-cc-nao-existe'); -- 0
-- rollback;
--
-- begin;
--   set local role anon;
--   select count(*) from public.portals;  -- deve dar ERRO: permission denied for table portals
-- rollback;
--
-- select policyname from pg_policies where tablename = 'portals';  -- 0 linhas
-- select grantee, privilege_type from information_schema.role_table_grants
--   where table_schema='public' and table_name='portals' and grantee in ('anon','authenticated'); -- 0 linhas
