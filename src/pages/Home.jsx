import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, Sparkles, Infinity as InfinityIcon, ShieldCheck, ChevronDown, ChevronUp, MessageCircle, Music as MusicIcon, Clock } from 'lucide-react';
import { PortalPreview } from '../components/PortalPreview';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';

const FAQItem = ({ question, answer }) => {
    const [isOpen, setIsOpen] = useState(false);
    return (
        <div className="border-b border-white/10 last:border-0">
            <button
                className="flex w-full items-center justify-between py-4 text-left font-medium hover:text-rose-400 transition-colors"
                onClick={() => setIsOpen(!isOpen)}
            >
                {question}
                {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                    >
                        <p className="pb-4 text-sm text-gray-400 leading-relaxed">{answer}</p>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

import { supabase } from '../lib/supabaseClient';
import { PLANS, formatBRL } from '../../shared/plans.js';

export default function Home() {
    const [isAnnual, setIsAnnual] = useState(true);
    const [portalCount, setPortalCount] = useState(28); // Start with user's requested number as base/fallback

    React.useEffect(() => {
        const fetchCount = async () => {
            // Quantidade de portais pagos (função pública; a tabela não é lida direto)
            const { data: count, error } = await supabase.rpc('count_paid_portals');

            if (!error && count !== null) {
                // Social Proof Strategy: Base 25 + Real Count
                setPortalCount(25 + count);
            }
        };
        fetchCount();
    }, []);

    return (
        <div className="min-h-screen py-20 px-4 flex flex-col items-center justify-center relative z-10">

            {/* Split Hero Section */}
            <div className="max-w-7xl mx-auto w-full grid lg:grid-cols-2 gap-12 items-center mb-32">

                {/* Left Column: Text & CTA */}
                <motion.div
                    initial={{ x: -50, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ duration: 0.8 }}
                    className="text-center lg:text-left"
                >
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-medium text-rose-300 mb-6 backdrop-blur-sm mx-auto lg:mx-0">
                        <Sparkles className="h-3 w-3" />
                        <span>Um presente digital para guardar a história de vocês.</span>
                    </div>

                    <h1 className="font-serif text-4xl md:text-7xl font-bold mb-6 leading-tight">
                        Um lugar só para a <br />história de vocês.
                    </h1>

                    <p className="text-lg md:text-xl text-gray-400 mb-8 max-w-xl leading-relaxed mx-auto lg:mx-0">
                        Fotos, música e o tempo juntos.
                        <br />
                        Tudo em um portal personalizado feito para o seu amor.
                    </p>

                    <Link to="/create">
                        <Button size="lg" className="text-base rounded-full px-10 h-14 shadow-[0_0_40px_rgba(225,29,72,0.4)] hover:shadow-[0_0_60px_rgba(225,29,72,0.6)] animate-pulse-slow mb-8">
                            <Heart className="mr-2 h-5 w-5 fill-current" />
                            Criar nosso portal
                        </Button>
                    </Link>

                    <div className="flex items-center justify-center lg:justify-start gap-4 animate-fade-in-up">
                        <div className="flex -space-x-4">
                            {[1, 2, 3, 4].map(i => (
                                <div key={i} className="h-10 w-10 rounded-full border-2 border-black bg-gray-700 overflow-hidden relative z-10 first:z-40 [&:nth-child(2)]:z-30 [&:nth-child(3)]:z-20">
                                    <img src={`https://i.pravatar.cc/100?img=${i + 15}`} alt="User" className="h-full w-full object-cover" />
                                </div>
                            ))}
                        </div>
                        <div className="text-sm font-medium">
                            <span className="text-rose-500 font-bold text-base">+{portalCount}</span> <span className="text-gray-300">memórias eternizadas</span>
                        </div>
                    </div>
                </motion.div>

                {/* Right Column: Visual Preview */}
                <motion.div
                    initial={{ x: 50, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ duration: 0.8, delay: 0.2 }}
                    className="relative"
                >
                    {/* Floating Badge */}


                    <div className="relative z-10 transform md:scale-95 origin-center">
                        <PortalPreview />
                    </div>

                    {/* Background decoration for the preview */}
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] bg-rose-500/10 blur-[100px] -z-10 rounded-full pointer-events-none" />
                </motion.div>

            </div>

            {/* Pricing */}
            <div className="w-full max-w-4xl mx-auto grid md:grid-cols-2 gap-8 mb-32 items-center">
                <div className="space-y-6">
                    <h2 className="font-serif text-4xl font-bold">Escolha como <br />eternizar</h2>
                    <p className="text-gray-400">Todo plano inclui acesso ilimitado a todas as funcionalidades premium, sem taxas escondidas.</p>

                    <div className="flex items-center gap-4 bg-white/5 p-1 rounded-full w-fit border border-white/10">
                        <button
                            onClick={() => setIsAnnual(true)}
                            className={`px-6 py-2 rounded-full text-sm font-medium transition-all ${isAnnual ? 'bg-rose-600 text-white shadow-lg' : 'hover:text-white text-gray-400'}`}
                        >
                            Essencial
                        </button>
                        <button
                            onClick={() => setIsAnnual(false)}
                            className={`px-6 py-2 rounded-full text-sm font-medium transition-all ${!isAnnual ? 'bg-rose-600 text-white shadow-lg' : 'hover:text-white text-gray-400'}`}
                        >
                            Completo
                        </button>
                    </div>
                </div>

                <Card className="relative overflow-hidden border-rose-500/30 shadow-[0_0_50px_rgba(225,29,72,0.15)] flex flex-col">
                    <div className="absolute top-0 right-0 p-4">
                        {!isAnnual && (
                            <div className="bg-rose-500/20 text-rose-300 text-xs font-bold px-3 py-1 rounded-full border border-rose-500/30 uppercase tracking-wider">
                                Recomendado
                            </div>
                        )}
                    </div>

                    <div className="mb-6">
                        <h3 className="text-xl font-medium text-white mb-2">{isAnnual ? 'Amor Essencial' : 'Amor Completo'}</h3>
                        <div className="flex items-baseline gap-1">
                            <span className="text-4xl font-serif font-bold">{formatBRL(isAnnual ? PLANS.essential.price : PLANS.complete.price)}</span>
                            <span className="text-gray-500 text-sm">/único</span>
                        </div>
                    </div>

                    <ul className="space-y-4 mb-8 flex-1">
                        <li className="flex items-center gap-3 text-sm text-gray-300"><ShieldCheck className="h-4 w-4 text-rose-500" /> Domínio personalizado</li>
                        <li className="flex items-center gap-3 text-sm text-gray-300"><Clock className="h-4 w-4 text-rose-500" /> Contagem de tempo personalizada</li>
                        <li className="flex items-center gap-3 text-sm text-gray-300">
                            {isAnnual ? <div className="h-1.5 w-1.5 rounded-full bg-gray-600" /> : <MusicIcon className="h-4 w-4 text-rose-500" />}
                            <span className={isAnnual ? "text-gray-500" : "text-white"}>Trilha Sonora Exclusiva</span>
                        </li>
                        <li className="flex items-center gap-3 text-sm text-gray-300">
                            {isAnnual ? <div className="h-1.5 w-1.5 rounded-full bg-gray-600" /> : <Sparkles className="h-4 w-4 text-rose-500" />}
                            <span className={isAnnual ? "text-gray-500" : "text-white"}>Inteligência Artificial Poética</span>
                        </li>
                        <li className="flex items-center gap-3 text-sm text-gray-300">
                            <InfinityIcon className="h-4 w-4 text-rose-500" />
                            Até {isAnnual ? PLANS.essential.maxPhotos : PLANS.complete.maxPhotos} fotos
                        </li>
                        <li className="flex items-center gap-3 text-sm text-gray-300">
                            {isAnnual ? <div className="h-1.5 w-1.5 rounded-full bg-gray-600" /> : <Heart className="h-4 w-4 text-rose-500" />}
                            <span className={isAnnual ? "text-gray-500" : "text-white"}>Chuva de Emojis Personalizada</span>
                        </li>
                    </ul>

                    <Link to="/create" className="w-full">
                        <Button className="w-full" variant="secondary">Começar</Button>
                    </Link>
                </Card>
            </div>

            {/* FAQ */}
            <div className="w-full max-w-2xl mx-auto mb-20">
                <h2 className="font-serif text-3xl font-bold mb-8 text-center">Dúvidas Frequentes</h2>
                <Card>
                    <div className="divide-y divide-white/10">
                        <FAQItem
                            question="Como funciona o pagamento?"
                            answer="Aceitamos PIX instantâneo. Seu portal é liberado imediatamente após a confirmação."
                        />
                        <FAQItem
                            question="Posso editar depois?"
                            answer="Para garantir a segurança e a eternidade do seu link, o portal não pode ser alterado após a criação. Recomendamos revisar tudo com carinho antes de finalizar! Caso erre algo grave, entre em contato com nosso suporte."
                        />
                        <FAQItem
                            question="O site expira?"
                            answer="Não. Os dois planos são vitalícios: pagamento único, sem renovação."
                        />
                    </div>
                </Card>
            </div>

            {/* Support Section */}
            <Card className="flex items-center gap-6 max-w-xl mx-auto p-6 bg-gradient-to-r from-white/5 to-rose-900/10 mb-10">
                <div className="relative">
                    <div className="h-12 w-12 rounded-full bg-white/10 flex items-center justify-center border border-white/20">
                        <MessageCircle className="h-6 w-6" />
                    </div>
                    <span className="absolute -bottom-1 -right-1 flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                    </span>
                </div>
                <div>
                    <h4 className="font-medium text-white">Suporte Humanizado</h4>
                    <p className="text-sm text-gray-400 mb-2">Dúvidas? Fale com nosso time.</p>
                    <div className="flex gap-4">
                        <a href="https://wa.link/l2qsex" target="_blank" rel="noopener noreferrer" className="text-xs text-rose-400 hover:text-rose-300 underline underline-offset-4">WhatsApp</a>
                        <a href="mailto:g.nsouza1408@gmail.com" className="text-xs text-rose-400 hover:text-rose-300 underline underline-offset-4">Email</a>
                    </div>
                </div>
            </Card>

        </div>
    );
}
