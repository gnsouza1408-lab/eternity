// Saúde do banco: conexão, total de portais e os 3 últimos (sem dados pessoais).
// Uso: npm run db:status
import { supabase } from './_supabase.js';

const { count, error } = await supabase
    .from('portals')
    .select('*', { count: 'exact', head: true });

if (error) {
    console.error('Erro de conexão ou permissão:', error);
    process.exit(1);
}

console.log(`Conexão OK. Total de portais: ${count}`);

const { data: latest, error: fetchError } = await supabase
    .from('portals')
    .select('slug, status, plan, created_at')
    .order('created_at', { ascending: false })
    .limit(3);

if (fetchError) {
    console.error('Erro ao ler dados:', fetchError);
    process.exit(1);
}

console.table(latest);
