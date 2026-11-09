// GET /api/keepalive — chamado 1x por dia pelo cron da Vercel (vercel.json).
// Faz uma consulta leve para o Supabase (plano gratuito) não pausar por inatividade.
// A Vercel envia "Authorization: Bearer <CRON_SECRET>"; sem ele, 401.
import { timingSafeEqual } from 'node:crypto';
import { getAdminClient } from './_lib/supabase.js';

function authorized(request) {
    const secret = process.env.CRON_SECRET;
    if (!secret) return false;
    const received = Buffer.from(String(request.headers.authorization || ''));
    const expected = Buffer.from(`Bearer ${secret}`);
    return received.length === expected.length && timingSafeEqual(received, expected);
}

export default async function handler(request, response) {
    if (request.method !== 'GET') {
        response.setHeader('Allow', 'GET');
        return response.status(405).json({ error: 'method_not_allowed' });
    }
    if (!process.env.CRON_SECRET) {
        console.error('keepalive: CRON_SECRET ausente');
        return response.status(500).json({ error: 'server_misconfigured' });
    }
    if (!authorized(request)) {
        return response.status(401).json({ error: 'unauthorized' });
    }

    try {
        const { error } = await getAdminClient()
            .from('portals')
            .select('slug', { head: true, count: 'estimated' })
            .limit(1);
        if (error) throw error;
        return response.status(200).json({ ok: true, at: new Date().toISOString() });
    } catch (error) {
        console.error('keepalive: erro de banco', error?.message || error);
        return response.status(500).json({ error: 'database_error' });
    }
}
