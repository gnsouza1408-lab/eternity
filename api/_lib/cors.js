// CORS das rotas chamadas pelo navegador (create-portal, create-pix).
// Só origens do domínio oficial. Requisição sem Origin (servidor, curl) segue normal:
// CORS protege o navegador; a autorização é o token de rascunho.
// ALLOWED_ORIGINS (opcional, separado por vírgula) substitui a lista padrão.

const DEFAULT_ORIGINS = ['https://eternity.dev.br', 'https://www.eternity.dev.br'];
const LOCAL_ORIGIN = /^http:\/\/(localhost|127\.0\.0\.1):\d+$/;

function allowedOrigins() {
    const fromEnv = (process.env.ALLOWED_ORIGINS || '')
        .split(',')
        .map((origin) => origin.trim())
        .filter(Boolean);
    return fromEnv.length ? fromEnv : DEFAULT_ORIGINS;
}

export function isAllowedOrigin(origin) {
    if (allowedOrigins().includes(origin)) return true;
    // localhost só fora de produção (vercel dev)
    return process.env.VERCEL_ENV !== 'production' && LOCAL_ORIGIN.test(origin);
}

// Retorna true se já respondeu (preflight ou origem bloqueada).
export function handleCors(request, response, methods = 'POST') {
    const origin = request.headers.origin;
    response.setHeader('Vary', 'Origin');

    if (origin) {
        if (!isAllowedOrigin(origin)) {
            response.status(403).json({ error: 'origin_not_allowed' });
            return true;
        }
        response.setHeader('Access-Control-Allow-Origin', origin);
        response.setHeader('Access-Control-Allow-Methods', `${methods}, OPTIONS`);
        response.setHeader('Access-Control-Allow-Headers', 'Content-Type');
        response.setHeader('Access-Control-Max-Age', '600');
    }

    if (request.method === 'OPTIONS') {
        response.status(204).end();
        return true;
    }
    return false;
}
