# Diagnóstico do Eternity — 14/10/2026

## Atualização 08/11/2026 — Fase 0 (segurança)

> Código na branch `fase-0`, **publicado em 09/11/2026**. Ordem de publicação, testes e rollback: [`docs/fase-0-publicacao.md`](fase-0-publicacao.md).
> Banco: SQL `01` (aditivo) e SQL `02` (fecha a tabela) aplicados na produção. Conferido em 11/11/2026 com a chave pública: select direto em `portals` dá *permission denied* e as funções públicas respondem.
> O texto original abaixo é o retrato de 14/10 e não foi reescrito.

**Decisões:** dois planos vitalícios, pagamento único: **Essencial R$ 12,90** (5 fotos, sem música, emoji padrão) e **Completo R$ 19,90** (15 fotos, música, emojis). Preço e limites só no servidor (`shared/plans.js`). O plano Anual saiu da venda; portais `annual`/`eternal` existentes continuam abrindo. Domínio oficial: `eternity.dev.br`. Testes feitos localmente contra a produção com slugs `teste-cc-*` (apagados), sem projeto de teste.

| Problema (seção) | Situação após a Fase 0 |
|---|---|
| Anon lê a tabela inteira, com e-mails (§4) | **Resolvido após o SQL 02.** Front lê só por funções `SECURITY DEFINER`: portal sem e-mail e só se pago, slug livre, status, contagem. |
| Anon insere qualquer coisa, inclusive `status: 'paid'` (§4) | **Resolvido após o SQL 02.** Criação só por `/api/create-portal` (chave secreta), status forçado `pending`, CHECK no banco. |
| Preço vindo do navegador (§3.3) | **Resolvido.** `create-pix` calcula pelo plano gravado; webhook confere valor e moeda. |
| `create-pix` aceita qualquer slug (§3.3) | **Resolvido.** Exige portal existente, `pending` e token de rascunho. |
| Webhook sem assinatura (§3.3) | **Resolvido.** Valida `x-signature`; webhook configurado no painel do MP. Confirmado em 09/11/2026: "Simular notificação" respondeu 200 e o Pix real foi liberado automaticamente. |
| Webhook falha em silêncio, responde 200 (A7) | **Resolvido.** Sem fallback para chave pública; erro de banco → 500, erro do MP → 502 (o MP reenvia). |
| Sem `payment_id` no banco (§3.3) | **Resolvido.** `payment_id`, `payment_status`, `paid_amount`, `paid_at`. |
| `service_role` hardcoded nos scripts (§4) | **Resolvido.** Chaves legadas desativadas em 14/10; scripts em `scripts/` leem `.env`. |
| CORS `*` com credentials (§2 baixa) | **Resolvido.** Só `eternity.dev.br` e `www`. |
| E-mail de terceiro como payer (M10) | **Resolvido.** E-mail obrigatório e validado; é o payer. |
| Slug sem sanitização (A1) | **Resolvido.** Normalizado no wizard e validado no servidor. |
| Slug ocupado por pendente / sem novo Pix (A3, A4, §1.3 item 6) | **Parcial.** Quem criou retoma o portal e gera novo Pix pelo token de rascunho (mesmo navegador). Pendentes antigos continuam ocupando o slug. |
| Duplo clique em "Gerar PIX" (M1) | **Resolvido.** |
| Plano Anual sem expiração (M9) | **Resolvido.** Anual saiu da venda. |
| Prova social falsa "+44" (§0 item 6) | **Resolvido.** Contador e avatares removidos da Home. |
| Prefixo `eternity.app/` (§2 baixa) | **Resolvido.** `eternity.dev.br/portal/`. |
| Supabase pausando por inatividade | **Resolvido.** Cron diário da Vercel em `/api/keepalive`. |
| Fotos e payload sem limite de tamanho (§4, M3) | **Mitigado.** Só JPEG base64, até 260 mil caracteres por foto, corpo até 4 MB. Storage fica para a Fase 2. |

**Continua em aberto:** e-mail transacional (A6), "IA poética" fake (A5), campos obrigatórios no wizard (A2), HEIC/erros de upload (M2), modal de Pix no celular (M6), eventos de funil (M11), SEO/OG (M12), Termos e Privacidade (§4), lint (73 erros antigos), pendentes antigos sem expiração.

---

> Escopo: leitura completa do código, execução local (desktop e 375px), consulta ao Supabase e ao Mercado Pago (somente leitura, só agregados) e verificação de lint.
> **Nada foi alterado no código.** Única mudança no repositório: `git init`, `.gitignore` e commit inicial (ver "Estado do Git" no fim).
> Nenhum dado pessoal (slugs, e-mails, mensagens, fotos) está neste documento.

---

## 0. Resumo executivo

1. **O gargalo não é o formulário, é o pagamento.** Só existe registro no banco quando a pessoa clica em "Gerar PIX" (último passo). Dos 15 registros não pagos, **14 geraram Pix, todos expiraram (24 h) sem pagamento e nenhum tentou de novo.** Quem desistiu antes do último passo nem aparece no banco (não há nenhuma instrumentação do funil).
2. **Quem volta para pagar é bloqueado pelo próprio sistema:** o registro `pending` fica ocupando o slug para sempre, e o wizard barra o slug com "este link já está sendo usado". Pix expirado nunca é recriado.
3. **Segurança tem 3 problemas graves:** (a) a anon key lê a tabela inteira, incluindo e-mails, mensagens e fotos de todos os casais; (b) o preço é enviado pelo navegador (dá para pagar R$ 0,01); (c) a `service_role` key do Supabase está hardcoded em 3 scripts da raiz e foi colada em conversa com IA — **rotacionar**.
4. **O wizard permite finalizar com tudo vazio** e gera portal com "Desde Invalid Date" e contador zerado. O slug aceita `& / ? #` e acentos.
5. **"IA poética" é um mock**: apaga o texto da pessoa e coloca uma entre 3 frases fixas. É vendida como feature do plano Eterno.
6. **Prova social falsa:** "+44 memórias eternizadas" = 25 fixos + 19 linhas do banco (inclui pendentes e testes). Há 4 portais pagos.
7. Tráfego/uso caiu: último registro é de 09/06/2026; Pix por mês: jan 20 · fev 16 · mar 5 · abr 2 · jun 1.

---

## 1. Dados do Supabase e do Mercado Pago

### 1.1 Funil (tabela `portals`, 19 registros)

| Estágio | Qtd |
|---|---|
| Registros no banco (= clicaram em "Gerar PIX") | 19 |
| Pagos (`status = paid`) | 4 |
| Não pagos (`pending`) | 15 |
| ↳ geraram Pix (consulta ao MP por `metadata.slug`) | 14 |
| ↳ sem Pix (falha na chamada à API, ou Pix de outro slug) | 1 |
| ↳ Pix expirou sem pagamento | 14 |
| ↳ geraram um 2º Pix (tentaram de novo) | **0** |

**O que os 15 não pagos preencheram:**

| Campo | Preenchido |
|---|---|
| Data | 10/15 |
| Mensagem | 11/15 (só 6 com ≥100 caracteres) |
| ≥1 foto | 7/15 (mediana baixa: 0,0,0,0,0,0,0,0,1,1,4,9,10,13,15) |
| Música | 6/15 |
| E-mail | 7/15 |
| Título personalizado (≠ "Nós para sempre") | 3/15 |
| Emoji alterado | 5/15 |
| Plano Eterno (é o pré-selecionado) | 13/15 |

Leitura: boa parte dos "não pagos" chegou ao pagamento com portal incompleto (8/15 sem foto, 5/15 sem data, 4/15 sem mensagem), o que sugere uma mistura de **testes seus**, curiosos ("vamos ver o que acontece") e clientes reais. Com 19 linhas não dá para separar. Pergunta para você na seção 9.

**Os 4 pagos:** todos Eterno; 2 sem e-mail.

### 1.2 Pagamentos (Mercado Pago, conta de **produção**)

- 44 Pix do Eternity (com `metadata.slug`): **40 expirados, 4 aprovados.**
- Valores cobrados: R$ 19,90 (33×), R$ 29,90 (8×, 16–26/jan: preço antigo/testes), R$ 15,90 (3×, plano Anual).
- Quando paga, é rápido: aprovação **0,3 a 1,9 min** após gerar o Pix. O problema não é demora do Pix, é quase ninguém pagar.
- Pix por mês: jan 20 · fev 16 · mar 5 · abr 2 · jun 1.

### 1.3 Inconsistências que merecem sua atenção

- **Dos 4 portais `paid`, só 1 foi liberado automaticamente** (aprovado em 01/02). Os outros 3 têm Pix `cancelled/expired` e nenhum pagamento aprovado no MP → foram liberados **manualmente** (batem com os scripts `unlock_*.js`). Preciso saber o contexto de cada um (pagaram por fora? cortesia? o webhook falhou?).
- **3 pagamentos aprovados (R$ 19,90, R$ 29,90, R$ 19,90) apontam para slugs que não existem na tabela.** Os dois de 18/jan são anteriores ao primeiro registro (27/jan), então provavelmente são seus testes. O de 30/jan (R$ 19,90) é suspeito: pode ser cliente real cujo portal foi apagado ou teve o slug diferente. **Vale conferir.**
- Existem Pix para 42 slugs distintos, mas só 18 estão na tabela: ou você apagou registros de teste, ou `create-pix` aceita qualquer slug sem checar o banco (isso é verdade, ver 3.2).

---

## 2. Bugs e pontos quebrados

### Alta

| # | Problema | Onde | Evidência |
|---|---|---|---|
| A1 | Slug sem sanitização: aceita `& / ? # !` e acentos (`Ana & João!/x?y#z` passou). Gera URL inalcançável. O hint diz "Use apenas letras e traços". | `Wizard.jsx:316` | Reproduzido |
| A2 | Nenhum campo é obrigatório: dá para ir do passo 1 ao pagamento com título, data, mensagem e e-mail vazios. Portal resultante: "Desde **Invalid Date**", contador 00:00:00:00, "Sem fotos". | `Wizard.jsx:130-146`, `Portal.jsx:266` | Reproduzido |
| A3 | Slug de portal abandonado fica ocupado para sempre (registro `pending` nunca expira). Quem volta (outro navegador/limpou o storage) vê "este link já está sendo usado". | `Wizard.jsx:118-141` | 0 retentativas entre 14 Pix expirados |
| A4 | Pix expira em 24 h e nada trata isso: o modal continua dizendo "Aguardando pagamento..." para um Pix morto; `localStorage` guarda o Pix e o reabre dias depois; não há "gerar novo Pix". Polling a cada 3 s sem limite. | `Wizard.jsx:52-84`, `PaymentModal.jsx` | 40 Pix expirados |
| A5 | "IA poética" é fake (`setTimeout` + 3 frases fixas) e **substitui** o texto digitado pela pessoa, sem desfazer. | `Wizard.jsx:210-227` | Código |
| A6 | Pessoa que pagou e fechou a aba perde o link: não há e-mail de confirmação (nenhum código envia e-mail), o link só aparece na tela de sucesso, que só aparece se o modal estiver aberto e o polling pegar. E o evento de compra do TikTok só dispara nesse mesmo caminho. | `Wizard.jsx:62-77` | Código |
| A7 | Falha silenciosa do webhook: sem `SUPABASE_SERVICE_ROLE_KEY` cai na anon key; um `UPDATE` bloqueado por RLS **não retorna erro** (0 linhas), o webhook responde 200 e o MP não reenvia. Pagamento aprovado, portal nunca liberado. É a explicação mais provável para os desbloqueios manuais. | `webhook.js:23,50-58,66` | Código + 3 liberações manuais |

### Média

| # | Problema | Onde |
|---|---|---|
| M1 | Duplo clique em "Gerar PIX e Finalizar" não é bloqueado e não há loading: dispara upsert + criação de Pix duas vezes. | `Wizard.jsx:250-281`, botão em `:568` |
| M2 | Upload de foto sem `img.onerror`: HEIC (navegadores sem suporte, ex.: Chrome no desktop/Android) ou arquivo corrompido deixa a `Promise.all` pendente para sempre → UI "morta" sem erro. Fotos além do limite são descartadas sem aviso. | `Wizard.jsx:158-208` |
| M3 | Fotos em base64 dentro da linha do banco (linhas de 0,1 a 2 MB) e também no `localStorage` do wizard. `setItem` com cota estourada lança exceção dentro de um `useEffect` e pode derrubar a tela (React error). O Portal baixa todas as fotos de uma vez. | `Wizard.jsx:105-115` |
| M4 | Botão de remover foto tem 16×16 px (alvo de toque inadequado no celular). | `Wizard.jsx:444-449` |
| M5 | Portal no celular: contador quebra em 2 linhas com "SEG" sozinho e separadores `:` soltos (reproduzido a 375 px); frame de foto vazio ocupa meia tela; título do mockup da Home colide com a status bar. | `Portal.jsx:278-286`, `PortalPreview.jsx:37` |
| M6 | O modal de Pix prioriza o QR Code, inútil no celular (a pessoa não consegue escanear a própria tela). O "copia e cola" fica em segundo plano, sem instrução de "abra seu banco e cole", sem valor, sem tempo restante. | `PaymentModal.jsx` |
| M7 | Persistência do wizard em **dev** é inconsistente por causa do `StrictMode` (efeito de load + save duplicados): após recarregar, o formulário volta ao passo 1 vazio, mas o modal de Pix reabre. Reproduzido. Provavelmente OK em produção; **validar em build de produção**. | `Wizard.jsx:87-115` |
| M8 | Portal não pago mostra "Aguardando Pagamento" sem atualizar sozinho e sem caminho para ver o Pix. Quem pagou e abre o link do portal precisa recarregar. | `Portal.jsx:206-223` |
| M9 | Plano Anual não implementa expiração nem renovação em lugar nenhum (`plan` nunca é checado no Portal). Vende "/ano" mas funciona como vitalício. | `Home.jsx`, `Portal.jsx` |
| M10 | E-mail opcional e sem validação (um registro tem e-mail sem TLD). `create-pix` usa um e-mail pessoal de terceiro (`pagador@example.com`) como payer quando vem vazio. | `Wizard.jsx:527`, `create-pix.js:43` |
| M11 | Pixel: TikTok só tem `CompletePayment` (preço hardcoded) e Meta só `PageView`. Sem `InitiateCheckout`, `AddPaymentInfo`, `Purchase`, nem eventos por passo → impossível medir o funil ou otimizar anúncio. | `index.html`, `Wizard.jsx:67-77` |
| M12 | Meta SEO/compartilhamento: `lang="en"`, sem `<meta description>`, sem Open Graph (o link do portal compartilhado no WhatsApp não tem preview), favicon do Vite. | `index.html` |
| M13 | QR Code do portal é gerado invertido (módulos rosa `#F43F5E` sobre fundo preto). Alguns leitores não leem. Testar em vários celulares. | `Wizard.jsx:614-621` |

### Baixa

- Todos os erros usam `alert()` / `confirm()` nativos.
- `eslint`: 73 erros e 1 warning (props sem validação, imports/variáveis não usados). `isCheckingPayment`, `navigate`, `PaymentModal.onApproved` e `VITE_MP_PUBLIC_KEY` (uma chave **TEST** que não é usada) são código morto.
- Prefixo do slug exibe `eternity.app/`, mas o link real é `eternity.dev.br/portal/<slug>`.
- Comentários de rascunho de IA dentro de `webhook.js` e `App.jsx`; README é o template do Vite; sem `.env.example`.
- CORS `*` com `Allow-Credentials: true` em `create-pix` e `webhook`.
- `YouTube`: `onYouTubeIframeAPIReady` global e `setInterval` sem cleanup no Portal; link de música inválido é ignorado em silêncio no portal.
- Portal não distingue "não encontrado" de "erro de rede".
- Contador mostra 00 no primeiro segundo e fica zerado se a data for futura.

---

## 3. Fluxo de pagamento

### 3.1 O portal libera sozinho após o Pix?

**Sim, o mecanismo existe e funcionou** (01/02: Pix aprovado em ~1 min → `status = paid`). Caminho: front chama `/api/create-pix` → MP cria Pix com `metadata.slug` e `notification_url` → MP chama `/api/webhook` → webhook consulta `payment.get` e faz `update status='paid'` → o wizard (polling a cada 3 s) detecta e mostra o sucesso.

Dependências frágeis: (1) `SUPABASE_SERVICE_ROLE_KEY` precisa estar nas env vars da Vercel, senão falha em silêncio (A7); (2) o sucesso e o link só aparecem se a aba continuar aberta (A6); (3) o webhook engole erros e responde 200.

### 3.2 Por que existem scripts de desbloqueio manual?

Hipótese mais provável (a confirmar com você): o webhook falhou no início por falta da service key (o próprio código tem comentários dizendo "WITHOUT IT, THE AUTOMATIC APPROVAL WILL NOT WORK"). Os dados mostram **3 portais liberados à mão sem pagamento aprovado no MP**. Em todos os casos o desbloqueio é um script com slug fixo e a service key hardcoded, o que é uma prática perigosa e sem trilha de auditoria. Falta: tabela de pagamentos, reprocessamento automático e um painel/endpoint admin.

### 3.3 O webhook valida a assinatura do Mercado Pago?

**Não.** Não lê `x-signature` / `x-request-id` nem usa o secret do webhook. **Mitigação parcial:** ele sempre rebusca o pagamento na API do MP com o access token e só marca `approved`, então uma notificação forjada sozinha não libera nada.

Buracos reais, independentemente da assinatura:
- **Preço vem do cliente.** `create-pix` usa `Number(price)` do body. Quem chamar a API com `price: 0.01` e pagar centavos recebe o portal. O webhook não confere `transaction_amount` nem o plano.
- `create-pix` não verifica se o slug existe nem se está pendente. Qualquer um gera Pix para qualquer slug, o que também permite "pagar" o portal alheio.
- Sem rate limit: qualquer um pode criar Pix na sua conta MP.
- Sem idempotência/log: não há registro do `payment_id` no banco (a tabela nem tem a coluna), então não dá para reconciliar pagamento ↔ portal sem consultar o MP.

---

## 4. Segurança

| Item | Estado |
|---|---|
| **RLS — leitura** | **Aberta.** Com a anon key (pública no bundle), `select *` em `portals` retorna as 19 linhas, 9 delas com e-mail, mais mensagem, fotos e status de **todos**, pagos ou não. O comentário "Security: Only fetch public fields" em `Portal.jsx:46` é só cosmético; o filtro de colunas é do cliente. Impacto: exposição de e-mails (LGPD), declarações íntimas e fotos privadas, e qualquer um vê o conteúdo de portais **não pagos** sem pagar (`status !== 'paid'` só é checado no front). |
| **RLS — escrita** | **Não verificado** (não dá para listar policies pela anon key, e não escrevi na produção). Pelo código: o front faz `upsert` com anon (logo `INSERT` está liberado) enviando `status: 'pending'` do cliente. Se a policy de `INSERT` não restringir `status`, um visitante insere `status:'paid'` e ganha portal grátis. Se `UPDATE` estiver liberado, o `upsert … onConflict: slug` sobrescreve portais alheios. Ver SQL de verificação abaixo. |
| **`service_role` key** | Hardcoded em `check_db_status.js`, `unlock_portal.js` e `unlock_portal_manual.js` (uma chave que ignora o RLS). Um deles diz "Service Role Key provided by user in previous turn", ou seja, foi colada em conversa. **Rotacionar a chave no Supabase** e migrar os scripts para `process.env`. |
| `.env` | Não estava no `.gitignore` (só `*.local`). **Corrigido no commit inicial.** Contém `MP_ACCESS_TOKEN` de **produção** (`APP_USR-`). Há também `VITE_MP_PUBLIC_KEY` de **teste** não usada. Atenção: `VITE_*` vai para o bundle; nunca colocar secret com esse prefixo. |
| Endpoints | CORS `*`, sem rate limit, sem validação de entrada (`slug`, `email`, `price`), sem assinatura no webhook. |
| Exposto no front (esperado) | URL e anon key do Supabase, IDs dos pixels, WhatsApp e e-mail pessoal de suporte. Normal, mas combine com o RLS aberto acima. |
| XSS | Baixo risco: mensagem/título renderizados como texto no React; música reduzida ao ID do vídeo. Fotos são `src` vindo do banco (se a escrita estiver aberta, dá para injetar URLs externas, p.ex. pixel de rastreio). |
| LGPD / confiança | Sem Termos, Política de Privacidade, política de reembolso nem identificação do vendedor. Para um produto que guarda fotos e e-mail e cobra por Pix, isso pesa na conversão e é exigência legal. |

**SQL para você rodar no Supabase (SQL Editor) e me mandar o resultado:**

```sql
select policyname, cmd, roles, qual, with_check
from pg_policies where tablename = 'portals';

select column_name, data_type, is_nullable
from information_schema.columns where table_name = 'portals';
```

---

## 5. UX do wizard, passo a passo

O wizard tem **9 passos de dados + pagamento + sucesso, "Passo 1 de 11"**, e a pessoa só vê o que criou depois de pagar.

| # | Passo | Obrigatório hoje | Problemas | Sugestão |
|---|---|---|---|---|
| 0 | Link | Não vazio + disponível | Sem sanitização (A1); prefixo de domínio errado; disponibilidade só no "Próximo", sem feedback inline; é a primeira pergunta, antes de qualquer valor | Derivar o slug dos nomes do casal; checagem inline com debounce; sanitizar |
| 1 | Plano | Não | Aparece antes de a pessoa criar algo; plano barato é pior em tudo; clicar em "Anual" apaga música/emoji sem aviso; "IA" é fake | Mover para o checkout; revisar o catálogo (seção 8) |
| 2 | Título | Não (dá para esvaziar) | Pré-preenchido com "Nós para sempre"; sem limite de tamanho | Unir com o passo 0 ("Ana & João") |
| 3 | Data | Não | Aceita vazio e data futura; vazio gera "Invalid Date" | Obrigatório, com `max=hoje` e prévia "vocês estão juntos há X dias" |
| 4 | Mensagem | Não | Página em branco assusta; sem exemplos/modelos; sem contador; "IA" substitui o texto sem desfazer | Obrigatório (mín. ~20 caracteres), modelos de abertura, desfazer; IA real ou remover |
| 5 | Fotos | Não | Sem tratamento de HEIC/erro; limite descarta sem aviso; sem reordenar; "×" de 16 px; sem progresso | Mín. 1 foto recomendada, conversão/erros claros, alvo de toque ≥ 44 px |
| 6 | Emoji | Não | No plano Anual é uma tela inteira dizendo "bloqueado" | Unir com 7 e pular no Anual |
| 7 | Música | Não | Exige colar link do YouTube (difícil no celular); sem validação/prévia; link inválido some em silêncio | Validar o link com prévia (thumb + título); opcional |
| 8 | E-mail | Não | Rótulo "E-mail para Administração" (não existe área admin); não diz o que a pessoa vai receber; sem validação; vazio permitido | Obrigatório e validado, "enviaremos o link do portal e do QR Code" |
| 9 | Resumo + Pix | — | Só mostra contagem de fotos, **sem prévia do portal**; sem loading e sem proteção contra duplo clique; erro por `alert()` | **Prévia ao vivo**; bloquear botão; foco em copia-e-cola |
| — | Modal Pix | — | Ver M6 | Copia e cola primeiro no mobile, valor, expiração, "gerar novo Pix", botão "Já paguei" |
| 10 | Sucesso | — | Sem compartilhar no WhatsApp; link/QR só aqui; sem e-mail | Botão "Enviar pelo WhatsApp", e-mail de confirmação, página recuperável por link |

**Estados:** loading só existe no Portal e na IA fake. Faltam em slug, foto, geração do Pix e salvamento. Erros são `alert()`, sem erro inline. Sucesso funciona, mas só se a aba ficar aberta.

---

## 6. Onde suspeito que as pessoas desistiram, e por quê

> Evidência forte: pagamento. Evidência fraca/inexistente: o resto (não há analytics de funil).

1. **Na tela do Pix (alta confiança — dados).** 14 de 14 Pix gerados expiraram. Hipóteses, em ordem de probabilidade:
   - **Mobile + QR Code:** o público vem de rede social, em celular. QR em tela não escaneia. Copia-e-cola está em segundo plano e sem instrução. Pagar exige trocar para o app do banco e voltar.
   - **Falta de prévia:** a pessoa paga R$ 19,90 por algo que nunca viu, e a FAQ ainda diz que "o portal não pode ser alterado após a criação". Medo de errar + sem preview = adiar.
   - **Adiamento e expiração:** presente tem data (aniversário, Dia dos Namorados). O Pix morre em 24 h, não há lembrete por e-mail/WhatsApp nem "gerar novo".
   - **Confiança:** prova social falsa (+44 / avatares aleatórios), sem Termos/Privacidade, sem identificação do vendedor, sem política de reembolso, domínio/URL inconsistentes (`eternity.app` vs `eternity.dev.br`).
2. **Ao tentar voltar (confirmado pelo código, 0 retentativas).** O slug já registrado bloqueia a pessoa (A3). Quem fechou o navegador não consegue pagar o mesmo portal.
3. **No meio do wizard (hipótese, sem dados).** 9 passos antes do pagamento, 3 deles de personalização opcional; passo de plano logo no início; página em branco na mensagem; link do YouTube no celular; HEIC trava o upload. Sem instrumentação, não dá para saber onde.
4. **Na landing (hipótese).** Pessoas nem chegam ao wizard: CTA único repetido, sem preço visível acima da dobra, "Domínio personalizado" (inexistente), "Todo plano inclui … todas as funcionalidades premium" contradiz a tabela de planos, plano **Anual (R$ 15,90/ano) quase igual ao Eterno (R$ 19,90, único)** confunde e canibaliza.

---

## 7. Melhorias sugeridas

### MVP agora (ordem sugerida)

**Fase 0 — Segurança (antes de qualquer tráfego)**
1. Rotacionar a `service_role` key; scripts passam a ler `process.env`. Conferir `SUPABASE_SERVICE_ROLE_KEY` na Vercel.
2. Fechar o RLS: tirar `select` anon da tabela; leitura pública do portal via RPC/view que retorna só campos públicos e só se `status='paid'`; escrita só pelo servidor (service role).
3. Preço decidido no servidor a partir do plano; `create-pix` valida slug existente e `pending`; webhook confere valor e plano; validar `x-signature`; gravar `payment_id` e status do pagamento; responder 5xx em erro de banco para o MP reenviar.

**Fase 1 — Pagamento e conversão (maior impacto esperado)**
4. Pix: copia-e-cola em destaque no mobile, valor e contagem regressiva de expiração, "gerar novo Pix" (reaproveitar o mesmo portal), "Já paguei / verificar".
5. Liberar slug de `pending` antigo (ou permitir retomar o rascunho pelo e-mail/código); expirar `pending` após N dias.
6. E-mail obrigatório; enviar e-mail transacional com **link do portal + QR** na criação e na confirmação; lembrete se o Pix expirar.
7. Página/rota de status do pedido recuperável por link (para quem fecha a aba), que o Portal não pago também use.
8. Prévia ao vivo do portal antes de pagar (o `PortalPreview` já existe).
9. Eventos de funil nos dois pixels (visualizou, iniciou, passo N, gerou Pix, pagou) e de volta no servidor, mais um evento de abandono.

**Fase 2 — Wizard**
10. Validação por passo (slug sanitizado, data obrigatória, mensagem mínima, e-mail válido), erros inline em vez de `alert()`, loading em slug/foto/Pix, bloqueio de duplo clique.
11. Reduzir para ~5 telas: (1) nomes+link, (2) data+mensagem, (3) fotos, (4) extras opcionais (música/emoji), (5) resumo+plano+e-mail+pagar.
12. Upload robusto (HEIC, erro por arquivo, mover/remover com alvo de toque grande); fotos no Supabase Storage em vez de base64.

**Fase 3 — Copy e confiança**
13. Remover/corrigir afirmações falsas: contador "+44", avatares aleatórios, "Domínio personalizado", "todas as funcionalidades premium", IA fake (implementar de verdade com a API da Anthropic, ou remover o botão).
14. Simplificar planos (um preço, ou diferença clara); decidir sobre o Anual (expira de verdade ou sai).
15. Termos, Privacidade, reembolso, e quem é o vendedor no rodapé; corrigir domínio exibido; garantia/FAQ que reduza o medo do "não pode editar".
16. Portal mobile: contador em grade 2×2, tratar data vazia/futura, sem bloco vazio de fotos; `lang="pt-BR"`, meta description, Open Graph com título do casal.

### Depois

- Edição do portal pelo dono (link mágico por e-mail) — remove o maior medo de comprar.
- Compartilhar no WhatsApp com prévia/OG dinâmico; agendar "revelar" em uma data (Dia dos Namorados, aniversário).
- Galeria com swipe/linha do tempo; vários momentos/datas; modo "surpresa" com senha.
- Cartão (MP Checkout) além do Pix; cupom; upsell pós-compra.
- Painel admin com reconciliação de pagamentos e reenvio de e-mail; testes automatizados do fluxo de pagamento (Pix em modo teste); limpar lint e dead code; README e `.env.example`.
- Domínio personalizado (se for prometido, só então anunciar).

---

## 8. Plano e preço (decisão sua)

Hoje: Anual R$ 15,90/ano (5 fotos, sem música/emoji/IA) vs Eterno R$ 19,90 único (15 fotos, tudo). 13 de 15 registros ficaram no Eterno, e só 3 dos 44 Pix foram do Anual. A diferença de R$ 4 não justifica dois planos, e o Anual não expira de verdade. Sugestão para o MVP: **um plano só** (ou Anual removido da UI) e testar preço depois com dados reais. Quero sua decisão antes de mexer.

---

## 9. Perguntas para você aprovar/decidir

1. Os 3 portais liberados manualmente: foram pagamentos por fora, cortesias ou falha do webhook?
2. Os 3 pagamentos aprovados sem portal (R$ 19,90, R$ 29,90, R$ 19,90) são seus testes? O de 30/jan pode ser cliente real.
3. Posso assumir que dos 19 registros boa parte são testes seus? Ajuda a calibrar a taxa de conversão real.
4. Você pode rotacionar a `service_role` key no Supabase (eu não faço isso por você) e me passar o resultado do SQL da seção 4?
5. Mantemos dois planos ou vamos para um só?
6. Origem do tráfego (TikTok Ads? Meta? orgânico)? Muda a priorização do mobile e dos eventos de pixel.
7. Pode enviar e-mail transacional? Qual serviço prefere (Resend, Supabase + SMTP)? WhatsApp também?
8. Domínio oficial: `eternity.dev.br`? (Corrigir o prefixo do wizard e os OG.)

---

## 10. Limites desta análise

- **Não verifiquei:** policies de escrita do RLS; variáveis de ambiente da Vercel; configuração do webhook e secret no painel do MP; o comportamento do deploy em produção (testei só local).
- **Não testei** `/api/create-pix` e `/api/webhook` de ponta a ponta: o `.env` aponta para o Supabase e o Mercado Pago de **produção**, então no walkthrough mockei o upsert e o `create-pix` (nenhum registro/Pix real foi criado). `vite dev` também não serve `/api/*`.
- Os dados são pequenos (19 linhas, 44 Pix), com testes misturados; trate percentuais como indicação, não como estatística.
- O walkthrough no celular usou emulação do navegador embutido (375 px), não aparelho real.

## Estado do Git

- `git init` na branch `main` e commit inicial `57371f9`.
- `.gitignore` já tinha `node_modules`, `dist` e `.vercel`. **Faltavam `.env` e `.env.*`:** adicionados.
- **Desvio do pedido:** `check_db_status.js`, `unlock_portal.js` e `unlock_portal_manual.js` foram adicionados ao `.gitignore` e **não** entraram no commit, porque contêm a `service_role` key em texto puro e ela ficaria para sempre no histórico. `check_portal.js` (só usa a chave pública) foi commitado. Os 3 arquivos continuam em disco; sugiro migrar para `process.env` e então versioná-los.
- Verificado após o `git add`: nenhuma ocorrência de `eyJhbGci`, `APP_USR-` ou `sb_secret` nos arquivos staged.
- **08/11/2026:** os 3 scripts foram reescritos em `scripts/` lendo `process.env` e versionados (a exceção no `.gitignore` saiu). Repositório no GitHub (`gnsouza1408-lab/eternity-app`), Vercel conectada ao Git: merge na `main` publica em produção. A Fase 0 está na branch `fase-0`, um commit por item.
