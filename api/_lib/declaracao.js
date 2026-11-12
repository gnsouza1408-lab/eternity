// Geração da declaração com a API da Anthropic (Claude Haiku 5.5).
// Entrada já validada por validarPedido(); o conteúdo do usuário vai entre tags XML,
// com < e > neutralizados, e o prompt do sistema trata esse conteúdo como dado.
import { readFileSync } from 'node:fs';
import Anthropic from '@anthropic-ai/sdk';

export const MODELO = 'claude-haiku-5-5';
export const MAX_TOKENS = 1000;       // texto médio ~300 tokens + JSON; pensamento desligado
// Pensamento desligado: nos testes (docs/ia/testes-prompt.md) seguiu melhor as regras,
// com menos tokens e menor latência que o adaptativo em effort low.
export const PENSAMENTO = { type: 'disabled' };
export const TIMEOUT_MS = 20_000;     // por tentativa
export const MAX_RETRIES = 1;         // SDK repete 1x em 429/5xx/conexão

export const TONS = ['fofo', 'engracado', 'emocionante'];
export const TAMANHOS = ['curto', 'medio'];
export const LIMITES = {
    nome: 40,
    comoSeConheceram: 300,
    memoria: 400,
    admiracao: 300,
    versaoAnterior: 1500,
    mensagemSaida: 1500,
};

const TAMANHO_TEXTO = {
    curto: 'curto (40 a 80 palavras)',
    medio: 'medio (100 a 160 palavras)',
};

const SAIDA_SCHEMA = {
    type: 'object',
    properties: {
        recusado: { type: 'boolean' },
        mensagem: { type: 'string' },
    },
    required: ['recusado', 'mensagem'],
    additionalProperties: false,
};

let systemPrompt;
function getSystemPrompt() {
    if (!systemPrompt) {
        systemPrompt = readFileSync(new URL('../prompts/declaracao.md', import.meta.url), 'utf8');
    }
    return systemPrompt;
}

let client;
function getClient() {
    if (!client) {
        if (!process.env.ANTHROPIC_API_KEY) throw new Error('ANTHROPIC_API_KEY ausente');
        client = new Anthropic({
            apiKey: process.env.ANTHROPIC_API_KEY,
            timeout: TIMEOUT_MS,
            maxRetries: MAX_RETRIES,
        });
    }
    return client;
}

// Remove caracteres de controle, junta espaços e neutraliza < > (não fecham tags).
function limpar(valor) {
    return String(valor)
        // eslint-disable-next-line no-control-regex -- remover caracteres de controle é o objetivo desta regex
        .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
        .replace(/</g, '‹')
        .replace(/>/g, '›')
        .replace(/[ \t]+/g, ' ')
        .replace(/\n{3,}/g, '\n\n')
        .trim();
}

function texto(body, campo, max, erros, obrigatorio = false) {
    const valor = body[campo];
    if (valor === undefined || valor === null || valor === '') {
        if (obrigatorio) erros.push(`${campo}: obrigatório`);
        return '';
    }
    if (typeof valor !== 'string') {
        erros.push(`${campo}: formato inválido`);
        return '';
    }
    const limpo = limpar(valor);
    if (obrigatorio && !limpo) erros.push(`${campo}: obrigatório`);
    if (limpo.length > max) erros.push(`${campo}: máximo de ${max} caracteres`);
    return limpo;
}

// Retorna { value } ou { errors }.
export function validarPedido(body) {
    const erros = [];
    const value = {
        quemEscreve: texto(body, 'quemEscreve', LIMITES.nome, erros, true),
        paraQuem: texto(body, 'paraQuem', LIMITES.nome, erros, true),
        comoSeConheceram: texto(body, 'comoSeConheceram', LIMITES.comoSeConheceram, erros),
        memoria: texto(body, 'memoria', LIMITES.memoria, erros),
        admiracao: texto(body, 'admiracao', LIMITES.admiracao, erros),
        versaoAnterior: texto(body, 'versaoAnterior', LIMITES.versaoAnterior, erros),
        tom: body.tom,
        tamanho: body.tamanho ?? 'curto',
    };
    if (!TONS.includes(value.tom)) erros.push('tom: use fofo, engracado ou emocionante');
    if (!TAMANHOS.includes(value.tamanho)) erros.push('tamanho: use curto ou medio');
    return erros.length ? { errors: erros } : { value };
}

// Palavras que, em quem escreve, marcam gênero. Se aparecerem, a rota pede 1 correção.
const GENERO_QUEM_ESCREVE = /\b(obrigad[ao]|grat[ao]|apaixonad[ao]|sozinh[ao]|encantad[ao]|tranquil[ao]|ser (?:seu|sua))\b/gi;

export function palavrasDeGenero(texto) {
    return [...new Set((texto.match(GENERO_QUEM_ESCREVE) || []).map((p) => p.toLowerCase()))];
}

export function montarMensagemUsuario(p) {
    const campo = (tag, valor) => `<${tag}>${valor || 'não informado'}</${tag}>`;
    const partes = [
        '<dados_do_casal>',
        campo('quem_escreve', p.quemEscreve),
        campo('para_quem', p.paraQuem),
        campo('como_se_conheceram', p.comoSeConheceram),
        campo('memoria_marcante', p.memoria),
        campo('o_que_admira', p.admiracao),
        '</dados_do_casal>',
    ];
    if (p.correcao) {
        partes.push(
            '<versao_anterior>', p.correcao.texto, '</versao_anterior>',
            `Reescreva a versão anterior mantendo o conteúdo, mas sem palavras que indiquem o gênero de quem escreve. Ela usou: ${p.correcao.palavras.map((x) => `"${x}"`).join(', ')}. Troque por formas neutras, como "agradeço", "tenho sorte", "fico em paz", "sou feliz".`,
        );
    } else if (p.versaoAnterior) {
        partes.push(
            '<versao_anterior>', p.versaoAnterior, '</versao_anterior>',
            'Escreva uma versão diferente da anterior: outra abertura, outra estrutura e outras frases, com os mesmos dados.',
        );
    }
    partes.push(`Tom: ${p.tom}. Tamanho: ${TAMANHO_TEXTO[p.tamanho]}.`);
    return partes.join('\n');
}

export class DeclaracaoErro extends Error {
    constructor(codigo, detalhe) {
        super(codigo);
        this.codigo = codigo;
        this.detalhe = detalhe;
    }
}

// Retorna { mensagem, uso, ms, corrigido }. Lança DeclaracaoErro (recusado | resposta_invalida)
// ou erros do SDK (Anthropic.APIError e subclasses).
// Se o texto marcar o gênero de quem escreve, faz 1 chamada de correção (no máximo 2 no total).
// `opcoes.thinking` e `opcoes.semCorrecao` existem só para o script de avaliação.
export async function gerarDeclaracao(pedido, opcoes = {}) {
    const primeira = await chamarModelo(pedido, opcoes);
    const palavras = palavrasDeGenero(primeira.mensagem);
    if (!palavras.length || opcoes.semCorrecao) return { ...primeira, corrigido: false };

    try {
        const segunda = await chamarModelo({ ...pedido, correcao: { texto: primeira.mensagem, palavras } }, opcoes);
        return {
            mensagem: segunda.mensagem,
            uso: somarUso(primeira.uso, segunda.uso),
            ms: primeira.ms + segunda.ms,
            corrigido: true,
            restante: palavrasDeGenero(segunda.mensagem),
        };
    } catch (erro) {
        // A correção é um refinamento: se falhar, a primeira versão ainda serve. Mas o erro é registrado.
        console.warn('declaracao: correção de gênero falhou', erro?.message || erro);
        return { ...primeira, corrigido: false };
    }
}

function somarUso(a, b) {
    return Object.fromEntries(Object.keys(a).map((k) => [k, a[k] + (b[k] ?? 0)]));
}

// Custo em US$ (Haiku 5.5, prompt <= 100K tokens): entrada 0,10/M, saída 0,50/M,
// escrita de cache 5 min = 1,25x a entrada, leitura de cache = 0,1x a entrada.
export function custoUSD(uso) {
    const entrada = 0.10 / 1_000_000;
    const saida = 0.50 / 1_000_000;
    return uso.input * entrada + uso.cacheWrite * entrada * 1.25 + uso.cacheRead * entrada * 0.1 + uso.output * saida;
}

async function chamarModelo(pedido, opcoes) {
    const inicio = Date.now();
    const response = await getClient().messages.create({
        model: MODELO,
        max_tokens: MAX_TOKENS,
        thinking: opcoes.thinking ?? PENSAMENTO,
        // Prompt do sistema fixo e com ~2.000 tokens: cache de 5 min (mínimo do Haiku 5.5 é 512).
        system: [{ type: 'text', text: getSystemPrompt(), cache_control: { type: 'ephemeral' } }],
        output_config: {
            effort: 'low',
            format: { type: 'json_schema', schema: SAIDA_SCHEMA },
        },
        messages: [{ role: 'user', content: montarMensagemUsuario(pedido) }],
    });
    const ms = Date.now() - inicio;
    const uso = {
        input: response.usage?.input_tokens ?? 0,
        cacheWrite: response.usage?.cache_creation_input_tokens ?? 0,
        cacheRead: response.usage?.cache_read_input_tokens ?? 0,
        output: response.usage?.output_tokens ?? 0,
    };

    if (response.stop_reason === 'refusal') {
        throw new DeclaracaoErro('recusado', { origem: 'classificador', categoria: response.stop_details?.category, uso, ms });
    }
    if (response.stop_reason !== 'end_turn') {
        throw new DeclaracaoErro('resposta_invalida', { stop_reason: response.stop_reason, uso, ms });
    }

    const bloco = response.content.find((b) => b.type === 'text');
    let saida;
    try {
        saida = JSON.parse(bloco?.text ?? '');
    } catch {
        throw new DeclaracaoErro('resposta_invalida', { motivo: 'json', uso, ms });
    }

    if (saida.recusado === true) {
        throw new DeclaracaoErro('recusado', { origem: 'modelo', uso, ms });
    }
    const mensagem = typeof saida.mensagem === 'string' ? saida.mensagem.trim() : '';
    if (!mensagem || mensagem.length > LIMITES.mensagemSaida) {
        throw new DeclaracaoErro('resposta_invalida', { motivo: 'tamanho', tamanho: mensagem.length, uso, ms });
    }

    return { mensagem, uso, ms };
}
