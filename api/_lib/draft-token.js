// Token de rascunho: devolvido UMA vez a quem cria o portal; no banco fica só o hash.
// Permite retomar o portal (editar e gerar novo Pix) sem login.
import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';

export function newDraftToken() {
    return randomBytes(32).toString('base64url');
}

export function hashDraftToken(token) {
    return createHash('sha256').update(token).digest('hex');
}

export function draftTokenMatches(token, storedHash) {
    if (typeof token !== 'string' || !token || typeof storedHash !== 'string' || !storedHash) {
        return false;
    }
    const a = Buffer.from(hashDraftToken(token), 'hex');
    const b = Buffer.from(storedHash, 'hex');
    return a.length === b.length && timingSafeEqual(a, b);
}
