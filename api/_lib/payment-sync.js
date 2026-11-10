// Aplica ao portal o estado de um pagamento do Mercado Pago (já buscado na API do MP).
// Libera o portal só se: aprovado, em BRL e valor >= preço do plano do portal.
// Erros de banco são lançados (o webhook responde 5xx e o MP reenvia).
import { expectedPrice } from '../../shared/plans.js';

const CENT = 0.005;

export async function applyPayment(supabase, payment) {
    const slug = payment?.metadata?.slug || payment?.external_reference;
    if (!slug) return { result: 'ignored_no_slug' };

    const paymentId = String(payment.id);

    const { data: portal, error: readError } = await supabase
        .from('portals')
        .select('status, plan, payment_id')
        .eq('slug', slug)
        .maybeSingle();
    if (readError) throw readError;
    if (!portal) return { result: 'ignored_portal_not_found', slug };
    if (portal.status === 'paid') return { result: 'already_paid', slug };

    if (payment.status !== 'approved') {
        // Só atualiza se for o Pix mais recente do portal (aviso atrasado de Pix antigo não sobrescreve).
        if (!portal.payment_id || portal.payment_id === paymentId) {
            const { error } = await supabase
                .from('portals')
                .update({ payment_id: paymentId, payment_status: payment.status })
                .eq('slug', slug)
                .eq('status', 'pending');
            if (error) throw error;
        }
        return { result: 'not_approved', slug, status: payment.status };
    }

    const expected = expectedPrice(portal.plan);
    const amount = Number(payment.transaction_amount);
    const amountOk = expected !== null
        && payment.currency_id === 'BRL'
        && Number.isFinite(amount)
        && amount + CENT >= expected;

    if (!amountOk) {
        const { error } = await supabase
            .from('portals')
            .update({ payment_id: paymentId, payment_status: 'approved_amount_mismatch' })
            .eq('slug', slug)
            .eq('status', 'pending');
        if (error) throw error;
        return { result: 'amount_mismatch', slug, amount, expected, currency: payment.currency_id };
    }

    const { error } = await supabase
        .from('portals')
        .update({
            status: 'paid',
            payment_id: paymentId,
            payment_status: 'approved',
            paid_amount: amount,
            paid_at: payment.date_approved || new Date().toISOString(),
        })
        .eq('slug', slug)
        .eq('status', 'pending');
    if (error) throw error;

    return { result: 'paid', slug, amount };
}
