// Mostra o estado de um portal (sem e-mail, mensagem nem fotos).
// Uso: npm run portal:check -- <slug>
import { supabase, slugFromArgs } from './_supabase.js';

const slug = slugFromArgs();

const { data, error } = await supabase
    .from('portals')
    .select('slug, status, plan, created_at')
    .eq('slug', slug)
    .maybeSingle();

if (error) {
    console.error('Erro ao buscar:', error);
    process.exit(1);
}

console.log(data ?? `Portal "${slug}" não encontrado.`);
