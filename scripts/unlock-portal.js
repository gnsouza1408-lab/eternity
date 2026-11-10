// Libera manualmente um portal pendente (ex.: pagamento confirmado fora do fluxo).
// Substitui unlock_portal.js e unlock_portal_manual.js, que tinham slug fixo.
// Uso: npm run portal:unlock -- <slug>
import { supabase, slugFromArgs } from './_supabase.js';

const slug = slugFromArgs();

const { data, error } = await supabase
    .from('portals')
    .update({ status: 'paid' })
    .eq('slug', slug)
    .eq('status', 'pending')
    .select('slug, status, plan');

if (error) {
    console.error('Erro ao liberar:', error);
    process.exit(1);
}

if (!data.length) {
    console.error(`Nada alterado: "${slug}" não existe ou não está pendente.`);
    process.exit(1);
}

console.log('Portal liberado:', data[0]);
