// Utilitários HTTP comuns às rotas /api.

// A Vercel recusa corpo acima de 4,5 MB antes de chegar aqui; ficamos abaixo com folga.
export const MAX_BODY_BYTES = 4_000_000;

export function sendError(response, status, error, message) {
    return response.status(status).json({ error, message });
}

export function bodyTooLarge(request) {
    const length = Number(request.headers['content-length'] || 0);
    return length > MAX_BODY_BYTES;
}

// Garante objeto JSON (a Vercel já faz o parse quando o Content-Type é application/json).
export function jsonBody(request) {
    let body;
    try {
        body = request.body; // getter da Vercel lança erro se o JSON for inválido
    } catch {
        return null;
    }
    if (body && typeof body === 'object' && !Array.isArray(body)) return body;
    if (typeof body === 'string') {
        try {
            const parsed = JSON.parse(body);
            if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) return parsed;
        } catch {
            return null;
        }
    }
    return null;
}
