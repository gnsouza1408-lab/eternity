// Fonte única dos planos. O SERVIDOR (api/) usa estes valores para validar e cobrar.
// O front importa o mesmo arquivo só para exibir: nada que vem do navegador é confiado.

export const PLANS = {
    essential: { label: 'Essencial', price: 12.90, maxPhotos: 5, music: false, customEmoji: false },
    complete: { label: 'Completo', price: 19.90, maxPhotos: 15, music: true, customEmoji: true },
};

// Planos que não são mais vendidos. Os portais já criados neles continuam funcionando,
// e o webhook ainda aceita o preço antigo (Pix gerado antes da Fase 0 e pago depois).
export const LEGACY_PRICES = {
    annual: 15.90,
    eternal: 19.90,
};

export const DEFAULT_EMOJI = '❤️';
export const ALLOWED_EMOJIS = ['❤️', '💖', '🌹', '✨', '💕', '💍', '🦋', 'all'];

export function isSellablePlan(plan) {
    return Object.prototype.hasOwnProperty.call(PLANS, plan);
}

// Preço mínimo aceito para liberar um portal deste plano (inclui os legados).
export function expectedPrice(plan) {
    if (isSellablePlan(plan)) return PLANS[plan].price;
    if (Object.prototype.hasOwnProperty.call(LEGACY_PRICES, plan)) return LEGACY_PRICES[plan];
    return null;
}

export function formatBRL(value) {
    return `R$ ${value.toFixed(2).replace('.', ',')}`;
}
