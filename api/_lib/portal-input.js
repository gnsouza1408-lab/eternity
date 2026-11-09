// Validação do portal enviado pelo navegador. Devolve só os campos aceitos, já
// ajustados ao plano (música e emoji removidos/forçados quando o plano não inclui).
import { PLANS, ALLOWED_EMOJIS, DEFAULT_EMOJI, isSellablePlan } from '../../shared/plans.js';
import { isValidSlug, isValidEmail } from '../../shared/validation.js';

export const LIMITS = {
    title: 80,
    message: 5000,
    musicUrl: 300,
    musicName: 100,
    // Foto já comprimida pelo wizard (800 px, JPEG 0,7): hoje a maior tem ~214 mil caracteres.
    photoChars: 260_000,
};

const JPEG_PREFIX = 'data:image/jpeg;base64,';
const BASE64_RE = /^[A-Za-z0-9+/]+={0,2}$/;
const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
const YOUTUBE_RE = /^https:\/\/(www\.|m\.|music\.)?(youtube\.com\/(watch\?v=|shorts\/|embed\/)|youtu\.be\/)[A-Za-z0-9_-]{11}([?&#][^\s]*)?$/;

function optionalText(value, max, field, errors) {
    if (value === undefined || value === null) return '';
    if (typeof value !== 'string') {
        errors.push(`${field}: formato inválido`);
        return '';
    }
    const text = value.trim();
    if (text.length > max) errors.push(`${field}: máximo de ${max} caracteres`);
    return text;
}

function validDate(value, errors) {
    if (value === undefined || value === null || value === '') return null;
    const match = typeof value === 'string' && DATE_RE.exec(value);
    if (!match) {
        errors.push('date: use o formato AAAA-MM-DD');
        return null;
    }
    const [, y, m, d] = match.map(Number);
    const parsed = new Date(Date.UTC(y, m - 1, d));
    const isReal = parsed.getUTCFullYear() === y && parsed.getUTCMonth() === m - 1 && parsed.getUTCDate() === d;
    // Folga de 1 dia para fuso horário.
    const tomorrow = Date.now() + 24 * 60 * 60 * 1000;
    if (!isReal || y < 1900 || parsed.getTime() > tomorrow) {
        errors.push('date: data inválida ou no futuro');
        return null;
    }
    return value;
}

function validPhotos(value, maxPhotos, errors) {
    if (value === undefined || value === null) return [];
    if (!Array.isArray(value)) {
        errors.push('photos: formato inválido');
        return [];
    }
    if (value.length > maxPhotos) {
        errors.push(`photos: o plano permite até ${maxPhotos} fotos`);
        return [];
    }
    for (const photo of value) {
        if (typeof photo !== 'string' || !photo.startsWith(JPEG_PREFIX)) {
            errors.push('photos: formato de imagem inválido');
            return [];
        }
        if (photo.length > LIMITS.photoChars) {
            errors.push('photos: uma das fotos é grande demais');
            return [];
        }
        if (!BASE64_RE.test(photo.slice(JPEG_PREFIX.length))) {
            errors.push('photos: imagem corrompida');
            return [];
        }
    }
    return value;
}

// Retorna { value } ou { errors }.
export function validatePortalInput(body) {
    const errors = [];

    const slug = typeof body.slug === 'string' ? body.slug.trim() : '';
    if (!isValidSlug(slug)) errors.push('slug: use de 3 a 60 letras minúsculas, números e traços');

    const plan = body.plan;
    if (!isSellablePlan(plan)) {
        errors.push('plan: plano inválido');
        return { errors };
    }
    const rules = PLANS[plan];

    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    if (!isValidEmail(email)) errors.push('email: e-mail inválido');

    const title = optionalText(body.title, LIMITS.title, 'title', errors);
    const message = optionalText(body.message, LIMITS.message, 'message', errors);
    const date = validDate(body.date, errors);
    const photos = validPhotos(body.photos, rules.maxPhotos, errors);

    let music = null;
    let musicName = null;
    if (rules.music) {
        const url = optionalText(body.music, LIMITS.musicUrl, 'music', errors);
        if (url && !YOUTUBE_RE.test(url)) errors.push('music: use um link do YouTube');
        music = url || null;
        musicName = optionalText(body.musicName, LIMITS.musicName, 'musicName', errors) || null;
    }

    let emoji = DEFAULT_EMOJI;
    if (rules.customEmoji && body.emoji !== undefined && body.emoji !== null) {
        if (!ALLOWED_EMOJIS.includes(body.emoji)) errors.push('emoji: opção inválida');
        else emoji = body.emoji;
    }

    if (errors.length) return { errors };

    return {
        value: {
            slug,
            plan,
            email,
            title,
            message,
            date,
            photos,
            music,
            musicName,
            emoji,
        },
    };
}
