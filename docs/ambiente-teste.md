> **NÃO ESTÁ EM USO (08/11/2026).** Decisão: a Fase 0 é testada localmente com `vercel dev` contra o Supabase de produção (portais de teste com slug `teste-cc-*`, apagados no fim) e com um Pix real de R$ 12,90. Mantido só como referência.

# Ambiente de teste da Fase 0

Objetivo: desenvolver e testar tudo sem tocar no Supabase nem no Mercado Pago de produção e sem gastar dinheiro real.

```
Produção:  eternity.dev.br      → Supabase PROD  + MP credenciais de produção
Teste:     preview da branch    → Supabase TESTE + MP credenciais de teste
           fase-0 na Vercel
Local:     scripts/node         → Supabase TESTE (arquivo .env.teste, fora do git)
```

---

## Passo 0 — Blindar a produção antes de qualquer preview (Vercel)

Na Vercel: **Project → Settings → Environment Variables**. Para cada variável existente (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `MP_ACCESS_TOKEN`, `WEBHOOK_URL`):

- Confira a coluna de ambientes. Ela deve marcar **somente Production**.
- Se marcar *Preview* ou *All Environments*: edite e desmarque **Preview** e **Development**.

Por quê: o build de preview usa as variáveis marcadas como *Preview*. Se as de produção estiverem lá, um preview da branch `fase-0` gravaria no banco real e geraria Pix reais.

---

## Passo 1 — Criar o projeto Supabase de teste

1. supabase.com → **New project**, na mesma organização.
   - Nome: `eternity-teste`
   - Região: a mesma da produção (Prod → Settings → General → Region)
   - Senha do banco: gere uma e guarde no seu gerenciador de senhas.
   - O plano gratuito permite 2 projetos ativos; se já houver 2, pause um que não seja a produção.
2. No projeto **de teste**, abra o **SQL Editor** e rode `docs/sql/00-teste-schema-e-seed.sql`.
   - Antes de clicar em Run, confira o nome do projeto no topo da tela.
3. Ainda no teste, rode as 4 consultas de conferência do fim do arquivo. Rode as mesmas 4 **na produção** (são só leitura) e compare. Se algo diferir (constraint, índice, grant), me mande o resultado e eu ajusto o `00` antes de começar.
4. Pegue as chaves do teste em **Settings → API Keys**:
   - *Publishable key* (`sb_publishable_…`) → vai no front.
   - *Secret key* (`sb_secret_…`) → só servidor e scripts.
   - URL do projeto (`https://<ref>.supabase.co`).

### `.env.teste` local (não vai para o git: `.env.*` está no `.gitignore`)

```
VITE_SUPABASE_URL=https://<ref-do-teste>.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_...
SUPABASE_URL=https://<ref-do-teste>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=sb_secret_...
MP_ACCESS_TOKEN=<token do vendedor de teste>
MP_PUBLIC_KEY=<public key do vendedor de teste>
MP_WEBHOOK_SECRET=<assinatura secreta, passo 2.3>
```

Scripts locais rodam com `node --env-file=.env.teste <script>` (Node 22 já suporta).

---

## Passo 2 — Mercado Pago sem dinheiro real

### 2.1 Contas de teste

Mercado Pago Developers → **Suas integrações** → app do Eternity → **Contas de teste** → crie:

- 1 conta **Vendedor** (país Brasil)
- 1 conta **Comprador** (país Brasil)

Guarde usuário e senha das duas (o MP mostra só na criação).

### 2.2 Credenciais do vendedor de teste

Numa janela anônima, entre no Mercado Pago **com a conta Vendedor de teste**, crie uma aplicação nela e copie *Access Token* e *Public Key* (**Credenciais de produção da conta de teste**). Elas começam com `APP_USR-`, como as reais, mas movimentam só dinheiro fictício.

> Para não confundir: anote os 6 últimos caracteres do token real e do de teste. O real **nunca** entra em Preview nem no `.env.teste`.

### 2.3 Webhook e assinatura secreta

No app do **vendedor de teste**: **Webhooks → Configurar notificações**
- URL: `https://<url-do-preview-da-branch>/api/webhook` (passo 3)
- Evento: **Pagamentos**
- Salvar → copiar a **assinatura secreta** → `MP_WEBHOOK_SECRET`.
- O botão **Simular notificação** manda uma notificação assinada com um ID falso: serve para testar a validação da assinatura.

### 2.4 Como o pagamento é aprovado no teste

Pix de teste **é gerado** (QR e copia-e-cola), mas **nenhum banco paga** um Pix de conta de teste, então ele fica `pending` até expirar. Para testar a **aprovação**, a Fase 0 inclui um script que cria, para um portal de teste, um pagamento **com cartão de teste** (titular `APRO` = aprovado; `OTHE` = recusado), com o mesmo `metadata.slug`, o mesmo valor e o mesmo `notification_url`. O MP manda o webhook de verdade e o fluxo inteiro roda: assinatura → busca do pagamento → confere valor do plano → grava `paid`.

Casos que o script cobre: valor certo (libera), valor menor que o plano (não libera), recusado (não libera), slug inexistente (ignora).

> A confirmar no 1º teste: se as notificações vindas do `notification_url` trazem `x-signature` (a documentação do MP é ambígua). Se não trouxerem, a URL fica configurada só no painel.

---

## Passo 3 — Preview da Vercel apontando para o teste

1. **Settings → Environment Variables → Add**, ambiente **Preview**, e em *Git branch* escolha `fase-0` (fica restrito a essa branch):

| Variável | Valor |
|---|---|
| `VITE_SUPABASE_URL` | URL do Supabase de teste |
| `VITE_SUPABASE_ANON_KEY` | publishable do teste |
| `SUPABASE_SERVICE_ROLE_KEY` | secret do teste |
| `MP_ACCESS_TOKEN` | token do vendedor de teste |
| `MP_WEBHOOK_SECRET` | assinatura secreta do passo 2.3 |
| `WEBHOOK_URL` | `https://<url-da-branch>/api/webhook?x-vercel-protection-bypass=<segredo>` |
| `ALLOWED_ORIGINS` | `https://<url-da-branch>` |
| `CRON_SECRET` | texto aleatório longo |

2. **URL fixa da branch**: a Vercel cria `https://<projeto>-git-fase-0-<time>.vercel.app`, que não muda a cada deploy. Use essa URL acima.
3. **Proteção de preview**: previews exigem login da Vercel por padrão, e o MP receberia 401. Em **Settings → Deployment Protection → Protection Bypass for Automation**, gere o segredo e use no `WEBHOOK_URL` como na tabela.
4. Variáveis `VITE_*` entram no build: depois de mudar qualquer uma, faça **Redeploy**.

> Cron da Vercel só roda em **produção**. No preview, a rota do cron é testada chamando-a manualmente com `Authorization: Bearer <CRON_SECRET>`.
