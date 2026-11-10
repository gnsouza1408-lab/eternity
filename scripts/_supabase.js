// Cliente Supabase com a chave secreta, para scripts de manutenção locais.
// As chaves vêm SEMPRE do ambiente. Uso: node --env-file=.env scripts/<script>.js
import { createClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const secretKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !secretKey) {
    console.error('Faltam SUPABASE_URL (ou VITE_SUPABASE_URL) e SUPABASE_SERVICE_ROLE_KEY no ambiente.');
    console.error('Rode com: node --env-file=.env scripts/<script>.js');
    process.exit(1);
}

export const supabase = createClient(url, secretKey, {
    auth: { persistSession: false, autoRefreshToken: false },
});

export function slugFromArgs() {
    const slug = process.argv[2];
    if (!slug) {
        console.error('Informe o slug: node --env-file=.env scripts/<script>.js <slug>');
        process.exit(1);
    }
    return slug;
}
