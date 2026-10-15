
import { createClient } from '@supabase/supabase-js';

// Re-using the env vars from your previous context or file
const supabaseUrl = 'https://aoeovcbclkvefztamhha.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_Hl4SX5odxSjNuHlc7mypCA_RCXwWOaa'; // fallback to known key if env not loaded in script context
// Note: Ideally we read from .env, but for this quick script hardcoding the public key is fine for SELECT.

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkPortal() {
    const slug = 'guizao-e-gigica';
    console.log(`Checking portal: ${slug}...`);

    const { data, error } = await supabase
        .from('portals')
        .select('*')
        .eq('slug', slug)
        .maybeSingle();

    if (error) {
        console.error("Error fetching:", error);
    } else {
        console.log("Portal found:", data);
    }
}

checkPortal();
