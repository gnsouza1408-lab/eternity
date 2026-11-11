// POST /api/create-pix
// Gera um Pix para um portal PENDENTE, a pedido de quem tem o token de rascunho.
// O valor vem do plano gravado no banco (shared/plans.js), nunca do navegador.
// Body: { slug, draftToken }
// O aviso de pagamento chega pelo webhook configurado no painel do Mercado Pago.
import { randomUUID } from 'node:crypto';
import { MercadoPagoConfig, Payment } from 'mercadopago';
import { getAdminClient } from './_lib/supabase.js';
import { draftTokenMatches } from './_lib/draft-token.js';
import { handleCors } from './_lib/cors.js';
import { sendError, jsonBody } from './_lib/http.js';
import { PLANS, isSellablePlan } from '../shared/plans.js';
import { isValidSlug, isValidEmail } from '../shared/validation.js';

const payment = new Payment(new MercadoPagoConfig({ accessToken: process.env.MP_ACCESS_TOKEN }));

export default async function handler(request, response) {
    if (handleCors(request, response)) return;

    if (request.method !== 'POST') {
        response.setHeader('Allow', 'POST');
        return sendError(response, 405, 'method_not_allowed', 'Método não permitido.');
    }

    const body = jsonBody(request);
    const slug = typeof body?.slug === 'string' ? body.slug.trim() : '';
    const draftToken = body?.draftToken;
    if (!isValidSlug(slug) || typeof draftToken !== 'string' || !draftToken) {
        return sendError(response, 400, 'invalid_input', 'Dados inválidos.');
    }

    let portal;
    try {
        const { data, error } = await getAdminClient()
            .from('portals')
            .select('status, plan, email, draft_token_hash')
            .eq('slug', slug)
            .maybeSingle();
        if (error) throw error;
        portal = data;
    } catch (error) {
        console.error('create-pix db read error:', error?.message || error);
        return sendError(response, 500, 'server_error', 'Erro ao gerar Pix. Tente novamente.');
    }

    if (!portal) {
        return sendError(response, 404, 'not_found', 'Portal não encontrado.');
    }
    if (portal.status !== 'pending') {
        return sendError(response, 409, 'already_paid', 'Este portal já foi pago.');
    }
    if (!draftTokenMatches(draftToken, portal.draft_token_hash)) {
        return sendError(response, 403, 'forbidden', 'Não foi possível gerar o Pix para este portal.');
    }
    if (!isSellablePlan(portal.plan)) {
        return sendError(response, 409, 'invalid_plan', 'Plano indisponível. Crie o portal novamente.');
    }
    if (!isValidEmail(portal.email)) {
        return sendError(response, 400, 'invalid_email', 'Informe um e-mail válido antes de gerar o Pix.');
    }

    const amount = PLANS[portal.plan].price;

    let result;
    try {
        result = await payment.create({
            body: {
                transaction_amount: amount,
                description: `Eternity Portal: ${slug}`,
                payment_method_id: 'pix',
                payer: { email: portal.email },
                external_reference: slug,
                metadata: { slug, plan: portal.plan },
            },
            requestOptions: { idempotencyKey: randomUUID() },
        });
    } catch (error) {
        console.error('create-pix mercadopago error:', error?.message || error);
        return sendError(response, 502, 'payment_provider_error', 'Erro ao gerar Pix. Tente novamente.');
    }

    // Registro do Pix gerado (não bloqueia a resposta se falhar: o webhook grava de novo).
    try {
        const { error } = await getAdminClient()
            .from('portals')
            .update({ payment_id: String(result.id), payment_status: result.status })
            .eq('slug', slug)
            .eq('status', 'pending');
        if (error) throw error;
    } catch (error) {
        console.error('create-pix db update error:', error?.message || error);
    }

    const transaction = result.point_of_interaction?.transaction_data || {};
    return response.status(200).json({
        id: result.id,
        amount,
        expires_at: result.date_of_expiration || null,
        ticket_url: transaction.ticket_url,
        qr_code: transaction.qr_code,
        qr_code_base64: transaction.qr_code_base64,
    });
}
