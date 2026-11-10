// Regras de formato compartilhadas. O servidor SEMPRE revalida; o front usa para avisar cedo.

export const SLUG_MIN = 3;
export const SLUG_MAX = 60;
const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function isValidSlug(slug) {
    return typeof slug === 'string'
        && slug.length >= SLUG_MIN
        && slug.length <= SLUG_MAX
        && SLUG_RE.test(slug);
}

// Enquanto digita: minúsculas, sem acento, só letras/números/traço (mantém traço final).
export function sanitizeSlugInput(value) {
    return String(value)
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+/, '')
        .slice(0, SLUG_MAX);
}

// Ao confirmar: remove traços repetidos e o traço final.
export function finalizeSlug(value) {
    return sanitizeSlugInput(value).replace(/-+/g, '-').replace(/-+$/, '');
}

export const EMAIL_MAX = 254;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@.]{2,}$/;

export function isValidEmail(email) {
    return typeof email === 'string' && email.length <= EMAIL_MAX && EMAIL_RE.test(email);
}
