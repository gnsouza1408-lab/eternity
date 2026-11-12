# Fase 0 — ordem de publicação, testes e rollback

Branch `fase-0`. A Vercel publica em produção sozinha quando a `main` recebe merge.
Regra geral: **cada passo só começa se o anterior passou.** Se algo falhar, pare e vá para "Rollback".

## Estado do banco antes da publicação

| SQL | Estado | O que faz |
|---|---|---|
| `01-colunas-e-funcoes-publicas.sql` | **Já rodado** (08/11) | Colunas novas + 4 funções públicas. Compatível com o site antigo. |
| `02-remover-acesso-anon.sql` | **Rodado** (passo 5; conferido em 11/11/2026) | Fecha a tabela para visitantes. |
| `rollback-policies-originais.sql` | Reserva | Desfaz o 02. |
| `01-rollback.sql` | Reserva | Desfaz o 01 (só depois de voltar o deploy). |

---

## Passo 0 — Preparação (nada vai ao ar)

1. Vercel → **Settings → Environment Variables**, ambiente **Production**:

   | Variável | Estado |
   |---|---|
   | `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` | já existem, não mudam |
   | `SUPABASE_SERVICE_ROLE_KEY` | `sb_secret_…` (atualizada em 14/10) |
   | `MP_ACCESS_TOKEN` | já existe |
   | `MP_WEBHOOK_SECRET` | adicionada (08/11) |
   | **`CRON_SECRET`** | **adicionar agora**: texto aleatório longo, tipo Secret, só Production |
   | `WEBHOOK_URL` | **manter** por enquanto: o código antigo usa, caso seja preciso fazer rollback |

2. Vercel → **Deployments**: anote qual é o deploy de produção atual (marcado como *Current*). É para ele que o rollback volta.
3. Confirme que os clientes usam `eternity.dev.br` (ou `www.`). Se o site também é acessado por outro domínio (ex.: `*.vercel.app`), crie `ALLOWED_ORIGINS` com todos eles, separados por vírgula. Senão, criar portal nesse domínio dá erro 403.

## Passo 1 — Publicar o código

1. No GitHub: **Pull request `fase-0` → `main`**, revisar e fazer **merge**.
2. Vercel → Deployments: aguarde o novo deploy de produção ficar **Ready**.

> Neste ponto o banco ainda tem as policies antigas. Se algo der errado, o Instant Rollback resolve sozinho (não precisa de SQL).

## Passo 2 — Testes rápidos em produção (sem pagar)

| # | Teste | Esperado |
|---|---|---|
| 2.1 | Abrir `https://eternity.dev.br` | Planos Essencial R$ 12,90 e Completo R$ 19,90; sem "+N memórias eternizadas" |
| 2.2 | Abrir um portal pago existente | Abre normalmente (agora via função pública) |
| 2.3 | Abrir `/portal/teste-cc-nao-existe` | "Portal não encontrado" |
| 2.4 | Wizard, passo 1: digitar o slug de um portal existente | "Poxa, este link já está sendo usado!" |
| 2.5 | Vercel → **Settings → Cron Jobs** | Aparece `/api/keepalive` diário. Clique em **Run**: o log da função mostra 200 |

## Passo 3 — "Simular notificação" no Mercado Pago (antes do Pix real)

1. Painel do Mercado Pago → Suas integrações → app do Eternity → **Webhooks** → **Simular notificação** (modo produção, evento de pagamentos) → enviar.
2. Vercel → Deployments → deploy atual → **Logs**, filtrando `/api/webhook`:
   - **Passou:** status **200** e a linha `webhook: pagamento não encontrado no MP` (o ID da simulação é falso). A assinatura foi aceita.
   - **Falhou:** status **401** e a linha `webhook: assinatura inválida { hasSignature, hasRequestId, queryKeys, type }`. **Não faça o Pix.** Me mande essa linha. Pagamentos não seriam liberados sozinhos. Se houver cliente pagando, faça o rollback do passo "Rollback A".

## Passo 4 — Pix real de R$ 12,90

1. Em `https://eternity.dev.br/create`: slug **`teste-cc-pix-real`**, plano **Essencial**, seu e-mail, gerar o Pix.
   Use um e-mail **diferente** do login da conta do Mercado Pago que recebe: o MP recusa Pix em que pagador e recebedor têm o mesmo e-mail.
2. Pague o **copia e cola** pelo app do banco.
3. Esperado, em segundos:
   - o wizard mostra **"Portal Criado!"**;
   - log de `/api/webhook`: `webhook: { … status: 'approved', result: 'paid', amount: 12.9 }`;
   - `https://eternity.dev.br/portal/teste-cc-pix-real` abre.
4. Confirmação no banco (local): `npm run portal:check -- teste-cc-pix-real` → `status: 'paid'`.

Se o wizard ficar em "Aguardando pagamento" por mais de 2 minutos: veja o log do webhook e me mande. Para liberar na mão enquanto isso: `npm run portal:unlock -- teste-cc-pix-real`.

## Passo 5 — Fechar a tabela (SQL 02)

1. SQL Editor da produção: rode a **pré-checagem A** do `02-remover-acesso-anon.sql`. Esperado: 4 funções com `prosecdef = true`, e `postgres` com `rolbypassrls = true` ou dono da tabela.
2. Rode a parte **B** (migração).
3. Rode a **conferência C**: as funções respondem como `anon`; `select count(*) from public.portals` como `anon` dá **permission denied**; 0 policies; 0 grants.
4. Repita os testes 2.1 a 2.4 e abra `teste-cc-pix-real`. Tudo igual ao passo 2.

## Passo 6 — Limpeza

1. `npm run test:cleanup` (lista) e depois `npm run test:cleanup -- --confirm` (apaga só `teste-cc-*`).
2. Opcional: estornar os R$ 12,90 no painel do Mercado Pago.
3. Nas próximas 24 h, procure `assinatura inválida` nos logs do webhook. Pix gerado **antes** do deploy (código antigo, com `notification_url`) e pago depois pode chegar sem assinatura. Se aparecer, libere com `npm run portal:unlock -- <slug>` depois de conferir o pagamento no painel do MP.
4. Depois de uns dias estável: apagar `WEBHOOK_URL` da Vercel.

---

## Rollback

**A) Problema depois do passo 1 e antes do passo 5** (SQL 02 não rodado)
1. Vercel → Deployments → deploy anotado no passo 0.2 → **⋯ → Instant Rollback**.
2. Nenhum SQL: o 01 é compatível com o código antigo.

**B) Problema depois do passo 5** (SQL 02 já rodado)
1. SQL Editor: rodar `rollback-policies-originais.sql` (o código antigo precisa ler e inserir direto).
2. Vercel: **Instant Rollback** como em A.

**Depois de um Instant Rollback**, a Vercel para de publicar sozinha os merges na `main`. Para voltar ao normal: Deployments → deploy corrigido → **Promote to Production**.

**Voltar o 01** (raro): só depois de A ou B, rodar `01-rollback.sql`. Perde os dados de pagamento gravados desde o 01; o status `paid` dos portais não muda.

---

## Checklist de testes

### Feitos localmente (`vercel dev` + Supabase de produção, slugs `teste-cc-*`, já apagados)

- [x] Scripts leem as chaves só do `.env`; nenhuma chave nos commits.
- [x] `create-portal`: 20 casos de validação; status forçado `pending`; limites do plano (Essencial perde música e emoji); token de rascunho (sem token ou com token errado → 409; com token → retoma); portal pago não é sobrescrito; corpo > 4 MB → 413; JSON inválido → 400.
- [x] Funções públicas com a chave pública: pendente não aparece; pago aparece sem e-mail/token/pagamento; status; slug livre/ocupado; contagem.
- [x] Telas: "Aguardando Pagamento", "não encontrado", portal pago; slug normalizado ("Teste CC Zé & Lú!" → `teste-cc-ze-lu`); e-mail vazio/inválido barrado; duplo clique gera uma chamada só; "gerar novo Pix" reaproveita o rascunho; polling leva à tela de sucesso.
- [x] `create-pix`: ignora `price` do navegador (cobra R$ 12,90); 404/409/403 para inexistente/pago/token errado e para pendente antigo de cliente; payer = e-mail do portal; sem `notification_url`; grava `payment_id`.
- [x] Webhook: sem/errada assinatura → 401; ID inexistente → 200; outro tipo → 200; Pix real pendente → não libera. Regra (pagamentos simulados): 12,90 libera Essencial; 12,90, 0,01 ou USD não liberam Completo; 19,90 libera Completo; legados eterno 19,90 e anual 15,90 liberam; anual 12,90 não; aviso repetido não muda nada; aviso atrasado não sobrescreve; erro de banco → 500.
- [x] CORS: origem estranha → 403; `eternity.dev.br` e `www` aceitos; localhost só fora de produção; sem `Allow-Credentials`; webhook sem cabeçalhos CORS.
- [x] Cron: sem token ou com token errado → 401; POST → 405; token certo → 200 com consulta ao banco.
- [x] `vite build` sem erros em cada item.

### Em produção (passos 2 a 6 acima)

- [ ] 2.1 a 2.5
- [x] 3 Simular notificação (09/11/2026): o webhook respondeu 200.
- [x] 4 Pix real (09/11/2026): Pix de R$ 12,90 aprovado e portal liberado automaticamente.
- [x] 5 SQL 02 e conferência: conferido em 11/11/2026 com a chave pública; select direto em `portals` dá *permission denied* (42501) e as 4 funções públicas respondem.
- [ ] 6 Limpeza

### Não testado / limites

- Aviso real do Mercado Pago no webhook novo: coberto pelos passos 3 e 4 em 09/11/2026.
- Cron agendado de verdade (a Vercel só agenda em produção; o passo 2.5 roda manualmente).
- SQL 02: não há banco de teste; aplicado direto na produção e conferido em 11/11/2026.
- Celular real (testei no navegador do desktop).
