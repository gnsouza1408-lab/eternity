// Limite de gerações do assistente, válido em serverless (contagem no Supabase).
// Ver docs/sql/03-limite-geracoes-ia.sql e docs/ia/limites-e-custo.md.
import { createHmac } from 'node:crypto';
import { getAdminClient } from './supabase.js';

export const LIMITES_IA = {
    ipPorHora: 10,
    ipPorDia: 30,
    rascunhoPorDia: 15,
    globalPorDia: 500, // teto de gasto: pior caso ~US$ 0,80/dia (ver docs/ia/limites-e-custo.md)
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Na Vercel, x-real-ip e x-forwarded-for são definidos pela borda (o cliente não controla).
export function ipDaRequisicao(request) {
    const real = request.headers['x-real-ip'];
    if (typeof real === 'string' && real) return real.trim();
    const forwarded = request.headers['x-forwarded-for'];
    if (typeof forwarded === 'string' && forwarded) return forwarded.split(',')[0].trim();
    return request.socket?.remoteAddress || 'desconhecido';
}

// O IP nunca é gravado: só um HMAC com a chave secreta do servidor.
export function hashIp(ip) {
    return createHmac('sha256', process.env.SUPABASE_SERVICE_ROLE_KEY || '').update(`ia:${ip}`).digest('hex');
}

export function rascunhoValido(id) {
    return typeof id === 'string' && UUID_RE.test(id) ? id.toLowerCase() : null;
}

// Retorna 'ok' ou o motivo do bloqueio. Lança erro se o banco falhar (a rota bloqueia).
export async function consumirCota({ ip, rascunhoId }) {
    const { data, error } = await getAdminClient().rpc('consume_ai_quota', {
        p_ip_hash: hashIp(ip),
        p_draft_id: rascunhoValido(rascunhoId),
        p_ip_hora: LIMITES_IA.ipPorHora,
        p_ip_dia: LIMITES_IA.ipPorDia,
        p_rascunho_dia: LIMITES_IA.rascunhoPorDia,
        p_global_dia: LIMITES_IA.globalPorDia,
    });
    if (error) throw error;
    return data;
}
