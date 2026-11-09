// POST /api/create-portal
// Cria o portal (sempre 'pending') ou atualiza um rascunho pendente de quem tem o token.
// Body: { slug, plan, email, title, date, message, photos, music, musicName, emoji, draftToken? }
// 201 { slug, draftToken }  criado (token devolvido só aqui; guarde no navegador)
// 200 { slug, draftToken }  rascunho atualizado
// 409 slug_taken            slug de outra pessoa, já pago ou sem token válido
import { getAdminClient } from './_lib/supabase.js';
import { newDraftToken, hashDraftToken, draftTokenMatches } from './_lib/draft-token.js';
import { validatePortalInput } from './_lib/portal-input.js';
import { sendError, bodyTooLarge, jsonBody } from './_lib/http.js';

const SLUG_TAKEN = 'Poxa, este link já está sendo usado! Tente outro nome.';

export default async function handler(request, response) {
    if (request.method !== 'POST') {
        response.setHeader('Allow', 'POST');
        return sendError(response, 405, 'method_not_allowed', 'Método não permitido.');
    }

    if (bodyTooLarge(request)) {
        return sendError(response, 413, 'payload_too_large', 'As fotos ficaram grandes demais. Remova alguma e tente de novo.');
    }

    const body = jsonBody(request);
    if (!body) {
        return sendError(response, 400, 'invalid_body', 'Dados inválidos.');
    }

    const { value, errors } = validatePortalInput(body);
    if (errors) {
        return response.status(400).json({ error: 'invalid_input', message: 'Confira os dados do portal.', details: errors });
    }

    try {
        const supabase = getAdminClient();

        const { data: existing, error: readError } = await supabase
            .from('portals')
            .select('status, draft_token_hash')
            .eq('slug', value.slug)
            .maybeSingle();
        if (readError) throw readError;

        if (!existing) {
            const draftToken = newDraftToken();
            const { error: insertError } = await supabase
                .from('portals')
                .insert({ ...value, status: 'pending', draft_token_hash: hashDraftToken(draftToken) });

            if (insertError) {
                if (insertError.code === '23505') {
                    return sendError(response, 409, 'slug_taken', SLUG_TAKEN);
                }
                throw insertError;
            }
            return response.status(201).json({ slug: value.slug, draftToken });
        }

        const canResume = existing.status === 'pending'
            && draftTokenMatches(body.draftToken, existing.draft_token_hash);
        if (!canResume) {
            return sendError(response, 409, 'slug_taken', SLUG_TAKEN);
        }

        const { data: updated, error: updateError } = await supabase
            .from('portals')
            .update(value)
            .eq('slug', value.slug)
            .eq('status', 'pending')
            .select('slug');
        if (updateError) throw updateError;
        if (!updated.length) {
            // Foi pago entre a leitura e a escrita.
            return sendError(response, 409, 'slug_taken', SLUG_TAKEN);
        }

        return response.status(200).json({ slug: value.slug, draftToken: body.draftToken });
    } catch (error) {
        console.error('create-portal error:', error?.message || error);
        return sendError(response, 500, 'server_error', 'Erro ao salvar o portal. Tente novamente.');
    }
}
