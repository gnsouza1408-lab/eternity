import React, { useState, useEffect } from 'react';
import { X, Copy, Check, Loader2, QrCode, Clock, AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from './ui/Button';
import { formatBRL } from '../../shared/plans.js';

const VINTE_E_QUATRO_HORAS = 24 * 60 * 60 * 1000;

// Quando o Pix expira: o horário que o servidor informou ou, na falta dele, 24 h após a geração.
function expiraEm(pixData) {
    const informado = pixData?.expires_at ? Date.parse(pixData.expires_at) : NaN;
    if (Number.isFinite(informado)) return informado;
    return (pixData?.generatedAt || Date.now()) + VINTE_E_QUATRO_HORAS;
}

function formatarRestante(ms) {
    const total = Math.max(0, Math.floor(ms / 1000));
    const h = String(Math.floor(total / 3600)).padStart(2, '0');
    const m = String(Math.floor((total % 3600) / 60)).padStart(2, '0');
    const s = String(total % 60).padStart(2, '0');
    return `${h}:${m}:${s}`;
}

// Copia com a API moderna e, se o navegador bloquear, com o método antigo.
async function copiarTexto(texto) {
    try {
        await navigator.clipboard.writeText(texto);
        return true;
    } catch {
        try {
            const campo = document.createElement('textarea');
            campo.value = texto;
            campo.setAttribute('readonly', '');
            campo.style.position = 'fixed';
            campo.style.opacity = '0';
            document.body.appendChild(campo);
            campo.select();
            const ok = document.execCommand('copy');
            document.body.removeChild(campo);
            return ok;
        } catch {
            return false;
        }
    }
}

export function PaymentModal({ isOpen, onClose, pixData, onNewPix, isGeneratingPix, pixError }) {
    const [copied, setCopied] = useState(false);
    const [copyFailed, setCopyFailed] = useState(false);
    const [showQr, setShowQr] = useState(false);
    const [now, setNow] = useState(() => Date.now());

    useEffect(() => {
        if (!isOpen) return undefined;
        setNow(Date.now());
        const id = setInterval(() => setNow(Date.now()), 1000);
        return () => clearInterval(id);
    }, [isOpen, pixData]);

    useEffect(() => {
        setCopied(false);
        setCopyFailed(false);
        setShowQr(false);
    }, [pixData]);

    if (!isOpen) return null;

    const restante = expiraEm(pixData) - now;
    const expirado = restante <= 0;

    const handleCopy = async () => {
        const ok = await copiarTexto(pixData?.qr_code || '');
        setCopyFailed(!ok);
        setCopied(ok);
        if (ok) setTimeout(() => setCopied(false), 2500);
    };

    return (
        <div
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm"
            role="dialog"
            aria-modal="true"
            aria-labelledby="pix-titulo"
        >
            <div className="bg-[#0A0A0A] border border-white/10 rounded-t-2xl sm:rounded-2xl w-full max-w-md max-h-[94vh] overflow-y-auto p-5 pb-24 sm:p-6 sm:pb-6 relative shadow-2xl shadow-rose-500/10">
                <button
                    type="button"
                    onClick={onClose}
                    aria-label="Fechar"
                    className="absolute top-2 right-2 h-11 w-11 flex items-center justify-center text-gray-400 hover:text-white transition-colors"
                >
                    <X size={20} />
                </button>

                <div className="text-center mb-5 pr-6 pl-6">
                    <h2 id="pix-titulo" className="text-2xl font-serif text-white mb-1">Pague com Pix</h2>
                    <p className="text-3xl font-serif font-bold text-rose-400">
                        {pixData?.amount ? formatBRL(Number(pixData.amount)) : ''}
                    </p>
                </div>

                {expirado ? (
                    <div className="space-y-4">
                        <div role="alert" className="flex gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-100">
                            <AlertCircle className="h-5 w-5 shrink-0" />
                            <span>Este Pix expirou. Gere um novo para continuar: o seu portal está guardado.</span>
                        </div>
                        {pixError && (
                            <p role="alert" className="text-sm text-red-300">{pixError}</p>
                        )}
                        <Button
                            type="button"
                            className="w-full min-h-[52px] text-base gap-2"
                            onClick={onNewPix}
                            disabled={isGeneratingPix}
                        >
                            {isGeneratingPix
                                ? <><Loader2 size={18} className="animate-spin" /> Gerando...</>
                                : <><RefreshCw size={18} /> Gerar novo Pix</>}
                        </Button>
                    </div>
                ) : (
                    <div className="space-y-4">
                        <div className="flex items-center justify-center gap-2 text-sm text-gray-300" aria-live="off">
                            <Clock size={16} className="text-rose-400" />
                            <span>Expira em <strong className="font-mono text-white">{formatarRestante(restante)}</strong></span>
                        </div>

                        <Button
                            type="button"
                            className="w-full min-h-[56px] text-base gap-2"
                            onClick={handleCopy}
                        >
                            {copied ? <Check size={20} /> : <Copy size={20} />}
                            {copied ? 'Copiado!' : 'Copiar código Pix'}
                        </Button>

                        <div aria-live="polite" className="min-h-[1rem]">
                            {copyFailed && (
                                <p role="alert" className="text-sm text-amber-200">
                                    Não deu para copiar sozinho. Toque no código abaixo, selecione tudo e copie.
                                </p>
                            )}
                        </div>

                        <ol className="list-decimal list-inside space-y-1 text-sm text-gray-300 bg-white/5 rounded-lg p-3">
                            <li>Copie o código Pix.</li>
                            <li>Abra o app do seu banco e escolha <strong className="text-white">Pix Copia e Cola</strong>.</li>
                            <li>Cole o código e confirme o pagamento.</li>
                        </ol>

                        <input
                            type="text"
                            readOnly
                            aria-label="Código Pix copia e cola"
                            value={pixData?.qr_code || ''}
                            onFocus={(e) => e.target.select()}
                            className="w-full bg-white/5 border border-white/10 rounded-lg py-3 px-3 text-base md:text-xs text-gray-400 font-mono truncate"
                        />

                        <button
                            type="button"
                            onClick={() => setShowQr((v) => !v)}
                            aria-expanded={showQr}
                            className="sm:hidden w-full min-h-[44px] flex items-center justify-center gap-2 text-sm text-gray-300 underline underline-offset-4"
                        >
                            <QrCode size={16} /> {showQr ? 'Esconder QR Code' : 'Pagar com QR Code (de outro aparelho)'}
                        </button>

                        <div className={showQr ? 'block' : 'hidden sm:block'}>
                            <div className="bg-white p-3 rounded-xl mx-auto w-fit">
                                {pixData?.qr_code_base64 && (
                                    <img
                                        src={`data:image/png;base64,${pixData.qr_code_base64}`}
                                        alt="QR Code do Pix"
                                        className="w-40 h-40 object-contain"
                                    />
                                )}
                            </div>
                            <p className="text-xs text-gray-500 text-center mt-2">Aponte a câmera do app do banco para o QR Code.</p>
                        </div>

                        <div className="text-center pt-1">
                            <div className="flex items-center justify-center gap-2 text-rose-400 text-sm">
                                <Loader2 size={16} className="animate-spin" />
                                Aguardando o pagamento...
                            </div>
                            <p className="text-xs text-gray-400 mt-2">
                                A liberação é automática em poucos segundos após o pagamento. Pode deixar esta tela aberta.
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
