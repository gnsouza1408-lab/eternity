import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Heart, Play, Calendar, Battery, Wifi, Signal } from 'lucide-react';
import { calcularTempo, formatarData } from '../lib/tempoJuntos';

// Data do exemplo: a contagem e o texto "Desde ..." saem sempre desta mesma data.
const DATA_EXEMPLO = '2025-06-12';

const PreviewTimeBlock = ({ value, label, isMobile }) => (
    <div className={`flex flex-col items-center ${isMobile ? 'mx-1' : 'mx-2 md:mx-4'}`}>
        <span className={`${isMobile ? 'text-xl' : 'text-3xl md:text-5xl'} font-serif font-bold text-white mb-1 drop-shadow-[0_0_10px_rgba(255,255,255,0.3)]`}>
            {String(value).padStart(2, '0')}
        </span>
        <span className={`${isMobile ? 'text-[8px]' : 'text-xs md:text-sm'} text-rose-200/80 uppercase tracking-widest`}>{label}</span>
    </div>
);

// Reusable Content Component
const PortalContent = ({ isMobile = false }) => {
    const [timeLeft, setTimeLeft] = useState(() => calcularTempo(DATA_EXEMPLO) || { days: 0, hours: 0, minutes: 0, seconds: 0 });

    useEffect(() => {
        const interval = setInterval(() => {
            setTimeLeft(calcularTempo(DATA_EXEMPLO) || { days: 0, hours: 0, minutes: 0, seconds: 0 });
        }, 1000);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className={`w-full h-full overflow-hidden flex flex-col ${isMobile ? 'p-4 pt-14' : 'p-6 md:p-8'} relative`}>
            {/* Background Gradient */}
            <div className="absolute inset-0 bg-gradient-to-b from-rose-950/20 via-black to-black -z-10" />

            {/* Header */}
            <div className={`text-center ${isMobile ? 'mb-4' : 'mb-8'}`}>
                <h1 className={`font-serif ${isMobile ? 'text-2xl' : 'text-4xl'} font-bold mb-2 text-transparent bg-clip-text bg-gradient-to-r from-white via-rose-100 to-white pb-1`}>
                    Nós para sempre
                    <span className="text-rose-500 align-top ml-1">♥️</span>
                </h1>
                <div className={`inline-flex items-center gap-2 text-rose-300/80 bg-white/5 ${isMobile ? 'px-2 py-1 text-[10px]' : 'px-3 py-1.5 text-xs'} rounded-full backdrop-blur-sm border border-white/5`}>
                    <Calendar className={`${isMobile ? 'h-3 w-3' : 'h-3.5 w-3.5'}`} />
                    <span>Desde {formatarData(DATA_EXEMPLO)}</span>
                </div>
            </div>

            {/* Content Body */}
            <div className="flex-1 overflow-y-auto no-scrollbar">
                {/* Counter Card */}
                <div className={`bg-white/5 ${isMobile ? 'p-4 rounded-2xl mb-4' : 'p-6 rounded-3xl mb-8'} border border-rose-500/10 text-center`}>
                    <div className={`flex flex-wrap justify-center ${isMobile ? 'gap-2' : 'gap-6'}`}>
                        <PreviewTimeBlock value={timeLeft.days} label="DIAS" isMobile={isMobile} />
                        <div className={`${isMobile ? 'text-xl' : 'text-3xl'} font-serif text-rose-500/50 mt-1`}>:</div>
                        <PreviewTimeBlock value={timeLeft.hours} label="HRS" isMobile={isMobile} />
                        <div className={`${isMobile ? 'text-xl' : 'text-3xl'} font-serif text-rose-500/50 mt-1`}>:</div>
                        <PreviewTimeBlock value={timeLeft.minutes} label="MIN" isMobile={isMobile} />
                        <div className={`${isMobile ? 'text-xl' : 'text-3xl'} font-serif text-rose-500/50 mt-1`}>:</div>
                        <PreviewTimeBlock value={timeLeft.seconds} label="SEG" isMobile={isMobile} />
                    </div>
                </div>

                {/* Grid Layout */}
                <div className={`grid ${isMobile ? 'grid-cols-1 gap-4' : 'grid-cols-2 gap-6'}`}>

                    {/* Photo & Music */}
                    <div className="flex flex-col gap-4">
                        <div className={`relative aspect-[4/5] w-full rounded-xl overflow-hidden shadow-lg border border-white/10 ${isMobile ? '' : 'rotate-[-1deg]'}`}>
                            <img
                                src="https://images.unsplash.com/photo-1516589178581-6cd7833ae3b2?q=80&w=400&auto=format&fit=crop"
                                className="absolute inset-0 w-full h-full object-cover"
                                alt="Casal"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                            <div className="absolute bottom-3 right-3">
                                <Heart className={`${isMobile ? 'h-5 w-5' : 'h-6 w-6'} text-rose-500 fill-rose-500`} />
                            </div>
                        </div>

                        <div className={`bg-white/5 ${isMobile ? 'p-2.5 rounded-xl' : 'p-3 rounded-2xl'} flex items-center gap-3 border border-white/10`}>
                            <div className={`${isMobile ? 'h-10 w-10' : 'h-12 w-12'} rounded-lg overflow-hidden flex-shrink-0`}>
                                <img
                                    src="https://images.unsplash.com/photo-1493225255756-d9584f8606e9?q=80&w=200&auto=format&fit=crop"
                                    className="w-full h-full object-cover"
                                    alt="Cover"
                                />
                            </div>
                            <div className="flex-1 min-w-0">
                                <span className="text-white font-bold text-xs truncate block">Perfect - Ed Sheeran</span>
                                <div className="h-1 w-full bg-white/10 rounded-full mt-1.5 overflow-hidden">
                                    <div className="h-full w-1/3 bg-rose-500 rounded-full" />
                                </div>
                            </div>
                            <div className={`${isMobile ? 'h-8 w-8' : 'h-9 w-9'} bg-white rounded-full flex items-center justify-center flex-shrink-0`}>
                                <Play className="fill-black text-black h-3 w-3 ml-0.5" />
                            </div>
                        </div>
                    </div>

                    {/* Declaração de exemplo */}
                    <div className={`bg-white/5 border border-white/5 ${isMobile ? 'p-4 rounded-xl' : 'p-6 rounded-2xl'} flex flex-col justify-center`}>

                        <h3 className="font-serif text-xl font-bold text-rose-100 mb-3 flex items-center gap-2">
                            <span className="h-px flex-1 bg-white/20"></span>
                            Declaração
                            <span className="h-px flex-1 bg-white/20"></span>
                        </h3>

                        <p className={`${isMobile ? 'text-sm' : 'text-base'} leading-relaxed font-serif text-gray-300 italic`}>
                            &quot;Entre o brilho das estrelas e o sussurro do vento, nosso amor floresce como a mais bela poesia...&quot;
                        </p>

                        <div className="mt-4 text-right">
                            <span className="font-dancing text-rose-400">Com amor, para sempre</span>
                        </div>
                    </div>

                </div>
                {/* Footer Space */}
                <div className="h-10" />
            </div>
        </div>
    );
};


export function PortalPreview() {
    return (
        <div className="relative w-full max-w-[320px] mx-auto h-[600px] flex items-center justify-center perspective-1000">
            {/* Mobile Mockup (Centered) */}
            <motion.div
                initial={{ y: 20, opacity: 0 }}
                whileInView={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.8 }}
                className="relative w-full h-full bg-black rounded-[3rem] border-[8px] border-[#333] shadow-[0_20px_50px_rgba(0,0,0,0.5)] overflow-hidden z-20"
                style={{ boxShadow: '0 0 0 2px #1a1a1a, 0 20px 50px rgba(0,0,0,0.5)' }}
            >
                {/* Dynamic Island */}
                <div className="absolute top-2 left-1/2 -translate-x-1/2 w-28 h-7 bg-black rounded-full z-30 flex items-center justify-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-[#1a1a1a]" />
                </div>

                {/* Status Bar */}
                <div className="absolute top-3 left-6 right-6 flex justify-between text-white text-[10px] z-20 font-medium">
                    <span>9:41</span>
                    <div className="flex gap-1">
                        <Signal className="h-3 w-3" />
                        <Wifi className="h-3 w-3" />
                        <Battery className="h-3 w-3" />
                    </div>
                </div>

                <PortalContent isMobile={true} />

                {/* Home Indicator */}
                <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-32 h-1 bg-white/20 rounded-full z-30" />
            </motion.div>
        </div>
    );
}
