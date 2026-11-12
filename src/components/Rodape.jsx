import React from 'react';
import { Link } from 'react-router-dom';
import { EMAIL_SUPORTE, WHATSAPP_SUPORTE, SITE } from '../lib/contato';

export function Rodape() {
    return (
        <footer className="w-full max-w-4xl mx-auto border-t border-white/10 pt-6 pb-24 text-center text-sm text-gray-500">
            <nav aria-label="Rodapé" className="flex flex-wrap items-center justify-center gap-x-6 gap-y-1 mb-3">
                <Link to="/privacidade" className="inline-flex items-center min-h-[44px] hover:text-rose-300 underline underline-offset-4">Política de Privacidade</Link>
                <a href={WHATSAPP_SUPORTE} target="_blank" rel="noopener noreferrer" className="inline-flex items-center min-h-[44px] hover:text-rose-300 underline underline-offset-4">WhatsApp</a>
                <a href={`mailto:${EMAIL_SUPORTE}`} className="inline-flex items-center min-h-[44px] hover:text-rose-300 underline underline-offset-4">E-mail</a>
            </nav>
            <p>© {new Date().getFullYear()} Eternity · {SITE}</p>
        </footer>
    );
}
