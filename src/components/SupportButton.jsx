import { MessageCircle } from 'lucide-react';
import { WHATSAPP_SUPORTE } from '../lib/contato';

export function SupportButton() {
    return (
        <div className="fixed bottom-6 right-6 z-50">
            <a
                href={WHATSAPP_SUPORTE}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-center gap-2 bg-rose-600 text-white p-3 md:px-4 md:py-3 rounded-full shadow-[0_0_20px_rgba(225,29,72,0.5)] hover:bg-rose-500 hover:scale-105 transition-all"
            >
                <div className="relative">
                    <MessageCircle className="h-6 w-6" />
                    <span className="absolute -top-1 -right-1 flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                    </span>
                </div>
                <span className="max-w-0 overflow-hidden group-hover:max-w-xs transition-all duration-300 font-medium whitespace-nowrap">
                    Suporte Online
                </span>
            </a>
        </div>
    );
}
