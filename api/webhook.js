
import { MercadoPagoConfig, Payment } from 'mercadopago';
import { createClient } from '@supabase/supabase-js';

const client = new MercadoPagoConfig({ accessToken: process.env.MP_ACCESS_TOKEN });
const payment = new Payment(client);

// Initialize Supabase with SERVICE ROLE key (needed for UPDATE on RLS protected table)
// Since we don't have the Service Role Key in .env yet, we might need to ask the user
// OR we can make the UPDATE policy allow 'anon' for strict cases, but that is insecure.
// BEST PRACTICE: Use SERVICE_ROLE_KEY env var in Vercel. 
// For now, if we don't have it, we can't update.
// WAIT -> The user only gave us ANON KEY. We need SERVICE ROLE KEY to bypass RLS "No Update" policy.
// Plan: I will use ANON KEY but I created a policy that BLOCKS anonymous updates.
// So this webhook will FAIL unless I get the Service Role Key OR change the Policy.
// Actually, since I am the backend, I should have the Service/Secret key.

// TEMPORARY FIX: I will ask the user for the Service Role Key to put in Vercel Env Vars.
// WITHOUT IT, THE AUTOMATIC APPROVAL WILL NOT WORK.

const supabaseUrl = process.env.VITE_SUPABASE_URL;
// We need a separate env var for the secret key, typically SUPABASE_SERVICE_ROLE_KEY
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

export default async function handler(request, response) {
    // CORS
    response.setHeader('Access-Control-Allow-Credentials', true);
    response.setHeader('Access-Control-Allow-Origin', '*');
    response.setHeader('Access-Control-Allow-Methods', 'POST');

    if (request.method !== 'POST') {
        return response.status(200).send('OK'); // MP expects 200/201 always
    }

    const { type, data } = request.body;

    try {
        if (type === 'payment') {
            // Check status with MP
            const paymentInfo = await payment.get({ id: data.id });
            const status = paymentInfo.status;
            const slug = paymentInfo.metadata.slug;

            console.log(`Payment ${data.id} for ${slug} is ${status}`);

            if (status === 'approved' && slug) {
                // Update Database
                const { error } = await supabase
                    .from('portals')
                    .update({ status: 'paid' })
                    .eq('slug', slug);

                if (error) {
                    console.error('Supabase Update Error:', error);
                    throw error;
                }
            }
        }
    } catch (e) {
        console.error('Webhook Error:', e);
    }

    // Mercado Pago insists on a 200/201 response to acknowledge receipt
    return response.status(200).json({ received: true });
}
