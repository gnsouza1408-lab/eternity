# RLS atual da tabela `portals` — 14/10/2026

**Status: EXECUTADO** (consultas rodadas por você no SQL Editor do Supabase; somente leitura). Resultados transcritos abaixo a partir dos prints.

## Consultas

```sql
-- 1) Policies da tabela
select policyname, cmd, roles, permissive, qual as using_expr, with_check
from pg_policies
where schemaname = 'public' and tablename = 'portals';

-- 2) RLS está ligado?
select relname, relrowsecurity as rls_ligado, relforcerowsecurity as rls_forcado
from pg_class
where oid = 'public.portals'::regclass;

-- 3) Colunas, obrigatoriedade e valores padrão
select column_name, data_type, is_nullable, column_default
from information_schema.columns
where table_schema = 'public' and table_name = 'portals'
order by ordinal_position;
```

## Resultado

### 1) Policies (2 linhas)

| policyname | cmd | roles | permissive | using_expr | with_check |
|---|---|---|---|---|---|
| Enable insert for anon | INSERT | {public} | PERMISSIVE | NULL | **true** |
| Enable select for anon | SELECT | {public} | PERMISSIVE | **true** | NULL |

### 2) RLS

| relname | rls_ligado | rls_forcado |
|---|---|---|
| portals | true | false |

### 3) Colunas

| column_name | data_type | is_nullable | column_default |
|---|---|---|---|
| slug | text | **NO** | — |
| title | text | YES | — |
| message | text | YES | — |
| date | text | YES | — |
| photos | jsonb | YES | — |
| music | text | YES | — |
| musicName | text | YES | — |
| plan | text | YES | — |
| emoji | text | YES | — |
| email | text | YES | — |
| created_at | timestamptz | NO | `timezone('utc', now())` |
| status | text | YES | `'pending'::text` |

## Interpretação

> **Confirmado** = sai direto dos resultados acima. **Inferido** = consequência lógica do RLS do Postgres, **não testada** (testar exigiria escrever em produção).

### O que está confirmado

- O RLS está **ligado** (isso é bom: a tabela não está 100% aberta por padrão).
- Existem só **duas** policies, ambas para o papel `public` (na prática, qualquer visitante com a chave pública):
  - **SELECT com `using = true`:** qualquer um lê **todas as linhas e todas as colunas**, inclusive `email`, `message`, `photos` e `status`. Bate com o que observei (19 linhas, 9 e-mails).
  - **INSERT com `with_check = true`:** qualquer um insere uma linha **com qualquer valor em qualquer coluna**.
- **Não existe policy de UPDATE nem de DELETE.**
- `date` é `text` (não `date`), então o banco não valida formato. `title`, `message`, `date`, `email`, `plan`, `status` aceitam nulo, o que explica os portais vazios no banco. O `status` tem padrão `pending`, mas o cliente pode mandar outro valor.
- Não há coluna de `payment_id`, `updated_at` nem `id` (a chave natural é o `slug`).

### Consequências (inferidas a partir das policies)

| # | Consequência | Gravidade |
|---|---|---|
| 1 | **Portal grátis:** qualquer visitante pode inserir `{slug, ..., status: 'paid'}` direto pela API pública e abrir `/portal/<slug>` sem pagar. O `with_check` é `true`, e a coluna `status` não tem restrição conhecida. | **Alta** |
| 2 | **Vazamento de dados:** a policy de SELECT expõe e-mails, declarações e fotos de todos os casais (inclusive portais não pagos, já que o `paid` só é checado no front). LGPD. | **Alta** |
| 3 | **Squatting e spam:** qualquer um pode reservar qualquer slug (inclusive nomes de marca ou slugs que vão ser pedidos por clientes) e inserir linhas em massa, com `photos` de tamanho ilimitado (custo de armazenamento). | **Média** |
| 4 | O medo de **sobrescrever o portal de outra pessoa** pelo `upsert … onConflict: slug` **não procede**: sem policy de UPDATE, o `ON CONFLICT DO UPDATE` é barrado. | Descartado |
| 5 | **Apagar portais** pela API pública também não é possível (sem policy de DELETE). | Descartado |
| 6 | **Retentativa quebrada (nova causa para as 0 retentativas):** quando o Pix expira e a pessoa clica de novo em "Gerar PIX e Finalizar" com o mesmo slug, o `upsert` cai no `ON CONFLICT DO UPDATE`, que **falha por falta de policy de UPDATE**. O wizard mostra "Erro ao criar o portal… tente outro link". Soma-se ao bloqueio do slug em `checkSlugAvailability`: o caminho de voltar e pagar está quebrado nos dois pontos. *(Inferido; vale confirmar por teste na Fase 0, em ambiente de teste.)* | **Alta** |

### O que isso muda no plano da Fase 0

- **Fechar a leitura:** remover a policy de SELECT para `public`. Expor o necessário por funções (`SECURITY DEFINER`) que devolvem só o mínimo:
  - `get_portal(slug)`: campos públicos (sem `email`) e **só se `status = 'paid'`**.
  - `slug_available(slug)`: booleano, para o passo 1 do wizard.
  - `get_portal_status(slug)` (ou rota de servidor): para o polling do pagamento.
  - Contagem de portais **pagos** para a home (hoje é a contagem de todas as linhas).
- **Fechar a escrita:** remover a policy de INSERT para `public`. A criação passa por uma rota de servidor (que usa a chave secreta nova), que valida os campos, força `status = 'pending'`, calcula o preço pelo plano e registra o pagamento.
- **Endurecer a tabela:** `CHECK (status in ('pending','paid'))`, `NOT NULL` em `title/date/message/email/plan` (depois de tratar as linhas existentes), `date` como `date`, limite de tamanho em `photos`/`message`, e uma tabela ou colunas de pagamento (`payment_id`, `paid_at`, `amount`).
- Uma migração só pode ser aplicada **depois** da rota de servidor e das funções estarem prontas e testadas. Se tirarmos o SELECT/INSERT antes disso, o wizard e o portal param de funcionar.

## Ainda não consultado (opcional, mais 3 consultas só leitura)

Para desenhar a migração com segurança, faltam o que o RLS não mostra:

```sql
-- constraints (PK/UNIQUE em slug? algum CHECK em status?)
select conname, contype, pg_get_constraintdef(oid) as def
from pg_constraint where conrelid = 'public.portals'::regclass;

-- índices
select indexname, indexdef from pg_indexes where schemaname='public' and tablename='portals';

-- privilégios da tabela para anon/authenticated
select grantee, privilege_type
from information_schema.role_table_grants
where table_schema='public' and table_name='portals' and grantee in ('anon','authenticated','public');
```

Esses três respondem: o `slug` é mesmo chave única (o `upsert … onConflict` funciona, então deve ser)? Existe algum `CHECK` em `status`? E `anon` tem `UPDATE`/`DELETE` concedido (o RLS já os bloqueia, mas é bom saber)?
