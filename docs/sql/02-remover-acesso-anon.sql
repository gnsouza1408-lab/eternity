-- =====================================================================
-- 02 — Remove o acesso direto de visitantes (anon/authenticated) à tabela portals
-- =====================================================================
-- Onde: SQL Editor da PRODUÇÃO (você roda), em 3 execuções separadas: A, B e C.
-- Quando: SÓ DEPOIS do deploy da Fase 0 em produção, testado (docs/fase-0-publicacao.md).
--   O site antigo lê e insere direto na tabela: com este SQL, ele para de funcionar.
-- Desfazer: docs/sql/rollback-policies-originais.sql
-- =====================================================================


-- ---------------------------------------------------------------------
-- A) PRÉ-CHECAGEM (só leitura)
-- Esperado: 4 linhas; security_definer = true e anon_executa = true em todas;
-- e, em todas, dono_ignora_rls = true OU dono_funcao = dono_tabela.
-- Se vier menos de 4 linhas ou algum false: NÃO rode o B.
-- ---------------------------------------------------------------------
select p.proname                              as funcao,
       p.prosecdef                            as security_definer,
       pg_get_userbyid(p.proowner)            as dono_funcao,
       r.rolbypassrls                         as dono_ignora_rls,
       pg_get_userbyid(c.relowner)            as dono_tabela,
       has_function_privilege('anon', p.oid, 'EXECUTE') as anon_executa
from pg_proc p
join pg_roles r on r.oid = p.proowner
cross join pg_class c
where c.oid = 'public.portals'::regclass
  and p.pronamespace = 'public'::regnamespace
  and p.proname in ('get_public_portal', 'slug_available', 'get_portal_status', 'count_paid_portals')
order by p.proname;


-- ---------------------------------------------------------------------
-- B) MIGRAÇÃO
-- Esperado: "Success. No rows returned".
-- ---------------------------------------------------------------------
begin;

drop policy if exists "Enable select for anon" on public.portals;
drop policy if exists "Enable insert for anon" on public.portals;

-- RLS continua ligado e sem policy: anon/authenticated não leem nem escrevem.
-- Também tira os privilégios da tabela (TRUNCATE, por exemplo, não passa pelo RLS).
revoke all on public.portals from anon, authenticated;

commit;


-- ---------------------------------------------------------------------
-- C) CONFERÊNCIA (só leitura)
-- Esperado: policies 0 | rls_ligado true | anon_select, anon_insert, anon_update,
-- anon_truncate, auth_select = false | anon_funcoes true | pagos = número de pagos
-- | slug_teste_livre false (o teste-cc-pix-real existe).
-- ---------------------------------------------------------------------
select
  (select count(*) from pg_policies where schemaname = 'public' and tablename = 'portals') as policies,
  (select relrowsecurity from pg_class where oid = 'public.portals'::regclass)            as rls_ligado,
  has_table_privilege('anon', 'public.portals', 'SELECT')           as anon_select,
  has_table_privilege('anon', 'public.portals', 'INSERT')           as anon_insert,
  has_table_privilege('anon', 'public.portals', 'UPDATE')           as anon_update,
  has_table_privilege('anon', 'public.portals', 'TRUNCATE')         as anon_truncate,
  has_table_privilege('authenticated', 'public.portals', 'SELECT')  as auth_select,
  has_function_privilege('anon', 'public.get_public_portal(text)', 'EXECUTE') as anon_funcoes,
  public.count_paid_portals()                                       as pagos,
  public.slug_available('teste-cc-pix-real')                        as slug_teste_livre;
