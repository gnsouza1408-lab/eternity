// Cliente Supabase do servidor (chave secreta). Sem fallback para a chave pública:
// se a chave secreta faltar, a rota falha com erro em vez de falhar em silêncio no RLS.
import { createClient } from '@supabase/supabase-js';

let client;

export function getAdminClient() {
    if (!client) {
        const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
        const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
        if (!url || !key) {
            throw new Error('SUPABASE_URL/VITE_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY ausente');
        }
        client = createClient(url, key, {
            auth: { persistSession: false, autoRefreshToken: false },
        });
    }
    return client;
}
