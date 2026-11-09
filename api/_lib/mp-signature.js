// Validação do header x-signature dos webhooks do Mercado Pago.
// Manifesto: id:<data.id>;request-id:<x-request-id>;ts:<ts>;  (HMAC-SHA256 com a assinatura secreta)
// data.id vem da query string; se for alfanumérico, em minúsculas. Partes ausentes são omitidas.
import { createHmac, timingSafeEqual } from 'node:crypto';

export function parseSignatureHeader(header) {
    const parts = {};
    for (const piece of String(header || '').split(',')) {
        const [key, ...rest] = piece.split('=');
        if (key && rest.length) parts[key.trim()] = rest.join('=').trim();
    }
    return { ts: parts.ts, v1: parts.v1 };
}

export function buildManifest({ dataId, requestId, ts }) {
    let manifest = '';
    if (dataId) {
        const id = String(dataId);
        manifest += `id:${/^[a-z0-9]+$/i.test(id) ? id.toLowerCase() : id};`;
    }
    if (requestId) manifest += `request-id:${requestId};`;
    if (ts) manifest += `ts:${ts};`;
    return manifest;
}

export function signManifest(manifest, secret) {
    return createHmac('sha256', secret).update(manifest).digest('hex');
}

export function isValidSignature({ signatureHeader, requestId, dataId, secret }) {
    if (!secret || !signatureHeader) return false;
    const { ts, v1 } = parseSignatureHeader(signatureHeader);
    if (!ts || !v1 || !/^[0-9a-f]{64}$/i.test(v1)) return false;
    const expected = Buffer.from(signManifest(buildManifest({ dataId, requestId, ts }), secret), 'hex');
    const received = Buffer.from(v1.toLowerCase(), 'hex');
    return expected.length === received.length && timingSafeEqual(expected, received);
}
