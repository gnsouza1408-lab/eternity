# Limites e custo do assistente de mensagem

Rota: `/api/gerar-mensagem` · Modelo: `claude-haiku-5-5` · Código: [`api/_lib/declaracao.js`](../../api/_lib/declaracao.js), [`api/_lib/limite-ia.js`](../../api/_lib/limite-ia.js) · SQL: [`docs/sql/03-limite-geracoes-ia.sql`](../sql/03-limite-geracoes-ia.sql)

## Limites

| Camada | Limite | Por quê |
|---|---|---|
| Tamanho dos campos | nomes 40 · como se conheceram 300 · memória 400 · o que admira 300 · versão anterior 1.500 caracteres | Cabe uma história real e corta abuso (colar textos longos para usar o modelo como chat). Iguais no front (`maxLength`) e no servidor. |
| Corpo da requisição | 8 KB | Bem acima da soma dos campos; recusa antes de ler (413). |
| Tom e tamanho | listas fixas (`fofo`, `engracado`, `emocionante` · `curto`, `medio`) | Entram no prompt fora dos dados do usuário. |
| `max_tokens` | 1.000 | O texto médio usa ~300 tokens; sobra para o JSON. Com pensamento desligado, não há consumo oculto. |
| Timeout | 20 s por tentativa, 1 nova tentativa automática (SDK); a função pode rodar por até 45 s (`vercel.json`) | Uma geração leva ~2 s; 20 s cobre picos da API sem prender a pessoa. O front desiste em 50 s e mostra os modelos prontos. |
| Chamadas por geração | no máximo 2 (a segunda só para corrigir gênero) | Custo e latência previsíveis. |
| Por IP | 10 por hora e 30 por dia | Uma pessoa gera e pede "Gerar outra" algumas vezes. 30 por dia cobre até quem cria mais de um portal. |
| Por rascunho | 15 por dia | Identificador aleatório gerado no navegador e salvo com o rascunho. É um limite de experiência, não de segurança: quem limpa o navegador ganha um novo, mas continua preso ao limite do IP. |
| Global | 500 por dia | Teto de gasto contra abuso distribuído (muitos IPs). Ao atingir, a rota responde 503 e o wizard mostra os modelos prontos. |
| Gasto mensal | limite configurado no Console da Anthropic | Última barreira, fora do código. |

### Como o limite funciona em serverless

Cada execução da função na Vercel pode rodar numa instância diferente, sem memória compartilhada. Por isso a contagem fica no Supabase:

- **Tabela `ai_generations`:** hash HMAC do IP, id do rascunho e data. O IP nunca é gravado, só o HMAC com a chave secreta do servidor. Registros com mais de 2 dias são apagados.
- **Função `consume_ai_quota`:** confere os quatro limites e registra a geração na mesma transação. Usa uma trava por IP (`pg_advisory_xact_lock`), para que dois pedidos simultâneos do mesmo IP não passem do limite juntos.
- **Fechada para visitantes:** RLS ligado, sem policies e sem privilégios para `anon`/`authenticated`. Só o servidor executa a função.
- **A cota é consumida antes de chamar o modelo.** Pedidos que terminam em erro também contam, para ninguém forçar erros e escapar do limite.
- **Se o banco não responder, a rota bloqueia (503).** Nesse caso, prefiro não gastar a liberar sem controle; a pessoa continua com os modelos prontos e pode escrever sozinha.

## Custo por geração

Preços do Claude Haiku 5.5 (prompts de até 100 mil tokens), em US$ por milhão de tokens: entrada **0,10**, saída **0,50**. O cache de 5 minutos custa 1,25x a entrada para gravar e 0,1x para ler.

O prompt do sistema tem ~2.130 tokens e é igual em todas as chamadas, por isso fica em cache. A parte que muda (dados do casal) tem ~150 a 300 tokens. A saída tem ~120 a 350 tokens.

| Situação | Conta | Custo (US$) |
|---|---|---|
| 1ª geração (grava o cache) | 2.130 × 1,25 + 250 = ~2.910 tokens de entrada equivalentes × 0,10/M + 200 de saída × 0,50/M | **~0,00039** |
| Gerações seguintes em até 5 min (lê o cache) | 2.130 × 0,1 + 250 = ~460 × 0,10/M + 200 × 0,50/M | **~0,00015** |
| Com correção de gênero (2 chamadas, a 2ª lê o cache) | soma das duas linhas acima, aproximadamente | **~0,00030 a 0,00055** |
| **Média medida** (rodada final, 10 casos, [testes-prompt.md](testes-prompt.md)) | | **0,000215** |
| Pior caso (2 chamadas sem cache, 1.000 tokens de saída cada) | (2.910 × 2) × 0,10/M + 2.000 × 0,50/M | ~0,0016 |

### Em reais e por venda

Considerando US$ 1 = R$ 5,50 (ajuste para a cotação do dia):

- **Por geração:** ~R$ 0,0012 (média medida).
- **Por pessoa que usa o assistente** (~3 gerações, uma com cache gravado): ~US$ 0,0007, ou **~R$ 0,004**. Isso é 0,03% de uma venda de R$ 12,90.
- **Teto diário (500 gerações):** ~US$ 0,11 no custo médio; ~US$ 0,80 no pior caso.
- **Teto mensal teórico:** ~US$ 24 no pior caso, se o limite global for atingido todos os dias por abuso. O limite de gasto do Console fica abaixo disso, como última barreira.

### Como acompanhar

Cada geração gera um log na Vercel (`gerar-mensagem: ok`) com tokens de entrada, de cache e de saída, tempo, se houve correção e `custoUSD`. O texto do casal não vai para o log. O Console da Anthropic mostra o gasto consolidado.
