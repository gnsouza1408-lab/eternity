// POST /api/webhook — avisos de pagamento do Mercado Pago (configurado no painel do MP).
// 1. Valida x-signature com MP_WEBHOOK_SECRET (401 se inválida).
// 2. Busca o pagamento na API do MP (a notificação em si não é confiada).
// 3. Libera o portal se aprovado e com valor >= preço do plano (api/_lib/payment-sync.js).
// Respostas: 200 = processado/ignorado; 5xx = erro temporário (o MP reenvia).
import { MercadoPagoConfig, Payment } from 'mercadopago';
import { getAdminClient } from './_lib/supabase.js';
import { isValidSignature } from './_lib/mp-signature.js';
import { applyPayment } from './_lib/payment-sync.js';
import { jsonBody } from './_lib/http.js';

const payment = new Payment(new MercadoPagoConfig({ accessToken: process.env.MP_ACCESS_TOKEN }));

function header(request, name) {
    const value = request.headers[name];
    return Array.isArray(value) ? value[0] : value;
}

export default async function handler(request, response) {
    if (request.method !== 'POST') {
        response.setHeader('Allow', 'POST');
        return response.status(405).json({ error: 'method_not_allowed' });
    }

    const secret = process.env.MP_WEBHOOK_SECRET;
    if (!secret) {
        console.error('webhook: MP_WEBHOOK_SECRET ausente');
        return response.status(500).json({ error: 'server_misconfigured' });
    }

    const body = jsonBody(request) || {};
    const query = request.query || {};
    const dataId = query['data.id'] ?? body?.data?.id;
    const type = query.type ?? body?.type ?? query.topic;

    const signatureOk = isValidSignature({
        signatureHeader: header(request, 'x-signature'),
        requestId: header(request, 'x-request-id'),
        dataId,
        secret,
    });
    if (!signatureOk) {
        console.warn('webhook: assinatura inválida', {
            hasSignature: Boolean(header(request, 'x-signature')),
            hasRequestId: Boolean(header(request, 'x-request-id')),
            queryKeys: Object.keys(query),
            type,
        });
        return response.status(401).json({ error: 'invalid_signature' });
    }

    if (type !== 'payment' || !dataId) {
        return response.status(200).json({ received: true, ignored: 'not_payment' });
    }

    let info;
    try {
        info = await payment.get({ id: String(dataId) });
    } catch (error) {
        const status = error?.status ?? error?.cause?.status;
        if (status === 404) {
            // Ex.: "Simular notificação" do painel, com ID inexistente.
            console.warn('webhook: pagamento não encontrado no MP', dataId);
            return response.status(200).json({ received: true, ignored: 'payment_not_found' });
        }
        console.error('webhook: erro ao consultar o MP', error?.message || error);
        return response.status(502).json({ error: 'payment_provider_error' });
    }

    try {
        const outcome = await applyPayment(getAdminClient(), info);
        console.log('webhook:', { paymentId: info.id, status: info.status, ...outcome });
        return response.status(200).json({ received: true, result: outcome.result });
    } catch (error) {
        console.error('webhook: erro de banco', error?.message || error);
        return response.status(500).json({ error: 'database_error' });
    }
}
