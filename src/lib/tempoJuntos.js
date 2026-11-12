// Cálculo do "tempo juntos" a partir de uma data AAAA-MM-DD, sempre no fuso do navegador.

// Converte 'AAAA-MM-DD' em Date local. Retorna null se vazio ou inválido (ex.: 2021-02-30).
export function parseDataLocal(valor) {
    if (typeof valor !== 'string') return null;
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(valor.trim());
    if (!m) return null;
    const [ano, mes, dia] = [Number(m[1]), Number(m[2]), Number(m[3])];
    const data = new Date(ano, mes - 1, dia);
    const ok = data.getFullYear() === ano && data.getMonth() === mes - 1 && data.getDate() === dia;
    return ok ? data : null;
}

// 'AAAA-MM-DD' -> 'DD/MM/AAAA' (ou null se a data for inválida).
export function formatarData(valor) {
    const d = parseDataLocal(valor);
    if (!d) return null;
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    return `${dd}/${mm}/${d.getFullYear()}`;
}

// Tempo decorrido desde a data. Retorna null se a data é inválida ou está no futuro.
export function calcularTempo(valor, agora = Date.now()) {
    const inicio = parseDataLocal(valor);
    if (!inicio) return null;
    const diff = agora - inicio.getTime();
    if (diff < 0) return null;
    const totalSeg = Math.floor(diff / 1000);
    return {
        days: Math.floor(totalSeg / 86400),
        hours: Math.floor((totalSeg % 86400) / 3600),
        minutes: Math.floor((totalSeg % 3600) / 60),
        seconds: totalSeg % 60,
    };
}
