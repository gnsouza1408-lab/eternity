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

// ---- Mensagens de erro para o formulário (o servidor continua validando por conta própria) ----

export const MESSAGE_MIN = 20;

// Data de hoje no fuso do navegador, no formato AAAA-MM-DD (para o max do campo de data).
export function hojeISO() {
    const d = new Date();
    const mes = String(d.getMonth() + 1).padStart(2, '0');
    const dia = String(d.getDate()).padStart(2, '0');
    return `${d.getFullYear()}-${mes}-${dia}`;
}

export function erroSlug(slug) {
    if (!slug) return 'Digite o link do seu portal.';
    if (slug.length < SLUG_MIN) return `O link precisa ter pelo menos ${SLUG_MIN} caracteres.`;
    if (!isValidSlug(slug)) return 'Use só letras minúsculas, números e traços.';
    return '';
}

export function erroData(value) {
    if (!value) return 'Informe a data em que tudo começou.';
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || value < '1900-01-01') return 'Essa data não parece válida.';
    if (value > hojeISO()) return 'A data não pode ser no futuro.';
    return '';
}

export function erroMensagem(texto) {
    const n = (texto || '').trim().length;
    if (n < MESSAGE_MIN) return `Escreva pelo menos ${MESSAGE_MIN} caracteres (faltam ${MESSAGE_MIN - n}).`;
    return '';
}

export function erroEmail(email) {
    if (!email) return 'Informe seu e-mail.';
    if (!isValidEmail(email)) return 'Esse e-mail não parece válido. Confira se tem @ e o final (.com, .com.br).';
    return '';
}
