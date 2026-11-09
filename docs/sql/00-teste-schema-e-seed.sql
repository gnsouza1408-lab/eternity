-- NÃO ESTÁ EM USO (08/11/2026): não existe projeto Supabase de teste. Ver docs/ambiente-teste.md.
-- NUNCA rodar este arquivo na produção (faz DROP TABLE).
-- =====================================================================
-- 00 — Projeto Supabase de TESTE: estrutura igual à produção + dados fictícios
-- =====================================================================
-- RODAR SOMENTE NO PROJETO DE TESTE (SQL Editor do projeto "eternity-teste").
-- NUNCA rodar na produção: recria a tabela (DROP) e insere dados falsos.
--
-- Reproduz o estado da produção em 14/10/2026 (docs/sql/rls-atual.md):
--   - mesmas 12 colunas, tipos, nulos e defaults;
--   - RLS ligado, com as MESMAS 2 policies abertas (SELECT e INSERT para public).
-- Assim os SQLs da Fase 0 são testados partindo do mesmo ponto da produção.
--
-- Pressuposto a confirmar: `slug` é chave única (o upsert onConflict:'slug'
-- do front só funciona assim). Ver consultas de conferência no fim.
-- =====================================================================

drop table if exists public.portals cascade;

create table public.portals (
  slug        text primary key,
  title       text,
  message     text,
  date        text,
  photos      jsonb,
  music       text,
  "musicName" text,
  plan        text,
  emoji       text,
  email       text,
  created_at  timestamptz not null default timezone('utc', now()),
  status      text default 'pending'::text
);

alter table public.portals enable row level security;

-- Policies idênticas às da produção (abertas de propósito, para reproduzir o problema)
create policy "Enable insert for anon" on public.portals
  for insert to public with check (true);

create policy "Enable select for anon" on public.portals
  for select to public using (true);

-- Privilégios padrão do Supabase para tabelas em public
grant select, insert, update, delete on public.portals to anon, authenticated;
grant all on public.portals to service_role;

-- ---------------------------------------------------------------------
-- Dados fictícios (nenhum dado real). Fotos = SVG inline pequeno.
-- ---------------------------------------------------------------------
insert into public.portals (slug, title, message, date, photos, music, "musicName", plan, emoji, email, status, created_at) values
('teste-pago-eterno', 'Ana e Beto', 'Mensagem de teste com mais de vinte caracteres para o portal pago no plano eterno.', '2021-03-14',
  '["data:image/svg+xml;utf8,<svg xmlns=''http://www.w3.org/2000/svg'' width=''800'' height=''600''><rect width=''100%'' height=''100%'' fill=''%23f43f5e''/></svg>","data:image/svg+xml;utf8,<svg xmlns=''http://www.w3.org/2000/svg'' width=''800'' height=''600''><rect width=''100%'' height=''100%'' fill=''%233b82f6''/></svg>"]'::jsonb,
  'https://www.youtube.com/watch?v=dQw4w9WgXcQ', 'Música de teste', 'eternal', '🌹', 'ana.teste@example.com', 'paid', now() - interval '30 days'),

('teste-pago-anual', 'Caio e Duda', 'Portal legado do plano anual, já pago. Deve continuar abrindo depois da Fase 0.', '2019-07-01',
  '["data:image/svg+xml;utf8,<svg xmlns=''http://www.w3.org/2000/svg'' width=''800'' height=''600''><rect width=''100%'' height=''100%'' fill=''%2310b981''/></svg>"]'::jsonb,
  null, null, 'annual', '❤️', null, 'paid', now() - interval '20 days'),

('teste-pendente-eterno', 'Eva e Fabio', 'Portal pendente: não pode aparecer publicamente até ser pago.', '2023-12-25',
  '[]'::jsonb, null, null, 'eternal', '❤️', 'eva.teste@example.com', 'pending', now() - interval '3 days'),

('teste-pendente-anual', 'Gil e Hana', 'Portal pendente no plano anual legado.', '2022-02-02',
  '[]'::jsonb, null, null, 'annual', '❤️', null, 'pending', now() - interval '2 days'),

('teste-pendente-vazio', 'Nós para sempre', null, null,
  '[]'::jsonb, null, null, 'eternal', '❤️', null, 'pending', now() - interval '1 day');

-- ---------------------------------------------------------------------
-- Conferência (rode também na PRODUÇÃO — são só leitura — e compare)
-- ---------------------------------------------------------------------
-- select conname, contype, pg_get_constraintdef(oid) from pg_constraint where conrelid = 'public.portals'::regclass;
-- select indexname, indexdef from pg_indexes where schemaname = 'public' and tablename = 'portals';
-- select grantee, privilege_type from information_schema.role_table_grants
--   where table_schema = 'public' and table_name = 'portals' and grantee in ('anon','authenticated','public') order by 1,2;
-- select policyname, cmd, roles, qual, with_check from pg_policies where tablename = 'portals';
