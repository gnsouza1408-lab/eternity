// Lista (padrão) ou apaga (--confirm) os portais de teste, com slug começando por "teste-cc-".
// Uso: npm run test:cleanup            -> só lista
//      npm run test:cleanup -- --confirm -> apaga
import { supabase } from './_supabase.js';

const PREFIX = 'teste-cc-';
const confirm = process.argv.includes('--confirm');

const { data, error } = await supabase
    .from('portals')
    .select('slug, status, plan, created_at')
    .like('slug', `${PREFIX}%`)
    .order('created_at');

if (error) {
    console.error('Erro ao listar:', error);
    process.exit(1);
}

const rows = data.filter((row) => row.slug.startsWith(PREFIX));
console.table(rows);

if (!confirm) {
    console.log(`${rows.length} portal(is) de teste. Nada apagado. Rode com --confirm para apagar.`);
    process.exit(0);
}

for (const row of rows) {
    const { error: deleteError } = await supabase.from('portals').delete().eq('slug', row.slug);
    if (deleteError) {
        console.error(`Erro ao apagar ${row.slug}:`, deleteError);
        process.exit(1);
    }
}
console.log(`${rows.length} portal(is) de teste apagado(s).`);
