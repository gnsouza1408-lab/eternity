// POST /api/gerar-mensagem — sugere uma declaração com IA (Claude Haiku 5.5).
// Body: { quemEscreve*, paraQuem*, tom* (fofo|engracado|emocionante), tamanho (curto|medio),
//         comoSeConheceram, memoria, admiracao, versaoAnterior }   (* obrigatório)
// 200 { mensagem }                     sugestão (o front decide se usa)
// 400 invalid_input | 413 | 422 conteudo_recusado | 5xx: o front mostra os modelos prontos.
// O conteúdo do casal nunca vai para os logs: só tamanhos, tokens e tempo.
import Anthropic from '@anthropic-ai/sdk';
import { handleCors } from './_lib/cors.js';
import { sendError, jsonBody } from './_lib/http.js';
import { validarPedido, gerarDeclaracao, DeclaracaoErro, MODELO } from './_lib/declaracao.js';

const MAX_BODY_BYTES = 8_000;

export default async function handler(request, response) {
    if (handleCors(request, response)) return;

    if (request.method !== 'POST') {
        response.setHeader('Allow', 'POST');
        return sendError(response, 405, 'method_not_allowed', 'Método não permitido.');
    }

    if (Number(request.headers['content-length'] || 0) > MAX_BODY_BYTES) {
        return sendError(response, 413, 'payload_too_large', 'Os textos estão longos demais.');
    }

    const body = jsonBody(request);
    if (!body) return sendError(response, 400, 'invalid_body', 'Dados inválidos.');

    const { value: pedido, errors } = validarPedido(body);
    if (errors) {
        return response.status(400).json({ error: 'invalid_input', message: 'Confira os campos.', details: errors });
    }

    try {
        const { mensagem, uso, ms } = await gerarDeclaracao(pedido);
        console.log('gerar-mensagem: ok', { modelo: MODELO, tom: pedido.tom, tamanho: pedido.tamanho, ...uso, ms });
        return response.status(200).json({ mensagem });
    } catch (error) {
        if (error instanceof DeclaracaoErro) {
            console.warn('gerar-mensagem:', error.codigo, error.detalhe);
            if (error.codigo === 'recusado') {
                return sendError(response, 422, 'conteudo_recusado',
                    'Não conseguimos escrever com essas informações. Revise o que foi digitado e tente de novo.');
            }
            return sendError(response, 502, 'resposta_invalida', 'A sugestão não veio como esperado. Tente de novo.');
        }
        if (error instanceof Anthropic.RateLimitError) {
            console.warn('gerar-mensagem: limite da API');
            return sendError(response, 503, 'ia_ocupada', 'O assistente está ocupado agora. Tente em instantes.');
        }
        if (error instanceof Anthropic.APIConnectionTimeoutError) {
            console.warn('gerar-mensagem: timeout');
            return sendError(response, 504, 'ia_timeout', 'O assistente demorou para responder. Tente de novo.');
        }
        if (error instanceof Anthropic.APIConnectionError) {
            console.error('gerar-mensagem: conexão', error.message);
            return sendError(response, 503, 'ia_indisponivel', 'O assistente está indisponível agora.');
        }
        if (error instanceof Anthropic.APIError) {
            // 400/401/403 aqui são problema nosso (configuração, limite de gasto); 5xx, da API.
            console.error('gerar-mensagem: API', error.status, error.message);
            return sendError(response, 503, 'ia_indisponivel', 'O assistente está indisponível agora.');
        }
        console.error('gerar-mensagem: erro', error?.message || error);
        return sendError(response, 500, 'server_error', 'O assistente está indisponível agora.');
    }
}
