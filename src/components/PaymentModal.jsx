
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Copy, Check, Loader2, QrCode } from 'lucide-react';
import { Button } from './ui/Button';

export function PaymentModal({ isOpen, onClose, pixData, onApproved }) {
    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
        navigator.clipboard.writeText(pixData?.qr_code);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="bg-[#0A0A0A] border border-white/10 rounded-2xl w-full max-w-md p-6 relative shadow-2xl shadow-rose-500/10"
                >
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
                    >
                        <X size={20} />
                    </button>

                    <div className="text-center mb-6">
                        <h2 className="text-2xl font-serif text-white mb-2">Finalizar Criação</h2>
                        <p className="text-gray-400 text-sm">Escaneie o QR Code ou copie o código para liberar seu portal instantaneamente.</p>
                    </div>

                    <div className="bg-white p-4 rounded-xl mb-6 mx-auto w-fit">
                        {pixData?.qr_code_base64 && (
                            <img
                                src={`data:image/png;base64,${pixData.qr_code_base64}`}
                                alt="Pix QR Code"
                                className="w-48 h-48 object-contain"
                            />
                        )}
                    </div>

                    <div className="space-y-3">
                        <div className="relative">
                            <input
                                type="text"
                                readOnly
                                value={pixData?.qr_code || ''}
                                className="w-full bg-white/5 border border-white/10 rounded-lg py-3 px-4 text-xs text-gray-400 pr-12 font-mono truncate"
                            />
                            <button
                                onClick={handleCopy}
                                className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 hover:bg-white/10 rounded-md transition-colors text-rose-400"
                            >
                                {copied ? <Check size={16} /> : <Copy size={16} />}
                            </button>
                        </div>

                        <Button
                            onClick={handleCopy}
                            className="w-full gap-2"
                        >
                            <Copy size={18} />
                            {copied ? 'Copiado!' : 'Copiar "Copia e Cola"'}
                        </Button>
                    </div>

                    <div className="mt-6 text-center">
                        <div className="flex items-center justify-center gap-2 text-rose-400 text-sm animate-pulse">
                            <Loader2 size={16} className="animate-spin" />
                            Aguardando pagamento...
                        </div>
                        <p className="text-xs text-gray-500 mt-2">O portal será liberado assim que o pagamento for confirmado.</p>
                    </div>

                </motion.div>
            </div>
        </AnimatePresence>
    );
}
