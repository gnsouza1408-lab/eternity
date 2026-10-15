
import { MercadoPagoConfig, Payment } from 'mercadopago';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase (Service Role for secure DB access) needs process.env vars
// But for now we might not strictly need DB access here if we just return the QR Code.
// However, updating the DB with the "payment_id" reference is good practice.

const client = new MercadoPagoConfig({ accessToken: process.env.MP_ACCESS_TOKEN });
const payment = new Payment(client);

export default async function handler(request, response) {
    // Add CORS headers
    response.setHeader('Access-Control-Allow-Credentials', true);
    response.setHeader('Access-Control-Allow-Origin', '*');
    response.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    response.setHeader(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
    );

    if (request.method === 'OPTIONS') {
        response.status(200).end();
        return;
    }

    if (request.method !== 'POST') {
        return response.status(405).json({ error: 'Method not allowed' });
    }

    const { slug, email, descriptions, price } = request.body;

    if (!slug) {
        return response.status(400).json({ error: 'Missing slug' });
    }

    try {
        const body = {
            transaction_amount: Number(price) || 15.90,
            description: `Eternity Portal: ${slug}`,
            payment_method_id: 'pix',
            payer: {
                email: email || 'pagador@example.com', // Fallback or user email
            },
            notification_url: process.env.WEBHOOK_URL, // Where MP sends the "PAID" signal
            metadata: {
                slug: slug
            }
        };

        const result = await payment.create({ body });

        return response.status(200).json({
            id: result.id,
            ticket_url: result.point_of_interaction.transaction_data.ticket_url,
            qr_code: result.point_of_interaction.transaction_data.qr_code, // "Copia e cola"
            qr_code_base64: result.point_of_interaction.transaction_data.qr_code_base64
        });

    } catch (error) {
        console.error(error);
        return response.status(500).json({ error: 'Error generating Pix', details: error.message });
    }
}
