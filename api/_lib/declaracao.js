// Geração da declaração com a API da Anthropic (Claude Haiku 5.5).
// Entrada já validada por validarPedido(); o conteúdo do usuário vai entre tags XML,
// com < e > neutralizados, e o prompt do sistema trata esse conteúdo como dado.
import { readFileSync } from 'node:fs';
import Anthropic from '@anthropic-ai/sdk';

export const MODELO = 'claude-haiku-5-5';
export const MAX_TOKENS = 1200;       // texto médio (~160 palavras) + pensamento, com folga
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
    if (p.versaoAnterior) {
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

// Retorna { mensagem, uso, ms }. Lança DeclaracaoErro (recusado | resposta_invalida)
// ou erros do SDK (Anthropic.APIError e subclasses).
export async function gerarDeclaracao(pedido) {
    const inicio = Date.now();
    const response = await getClient().messages.create({
        model: MODELO,
        max_tokens: MAX_TOKENS,
        system: getSystemPrompt(),
        output_config: {
            effort: 'low',
            format: { type: 'json_schema', schema: SAIDA_SCHEMA },
        },
        messages: [{ role: 'user', content: montarMensagemUsuario(pedido) }],
    });
    const ms = Date.now() - inicio;
    const uso = {
        input: response.usage?.input_tokens ?? 0,
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
