import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, Sparkles, Check, Minus, ChevronDown, ChevronUp, MessageCircle, PenLine, QrCode, Smartphone } from 'lucide-react';
import { PortalPreview } from '../components/PortalPreview';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { PLANS, formatBRL } from '../../shared/plans.js';

const FAQItem = ({ question, children }) => {
    const [isOpen, setIsOpen] = useState(false);
    return (
        <div className="border-b border-white/10 last:border-0">
            <button
                type="button"
                className="flex w-full items-center justify-between gap-3 py-4 min-h-[56px] text-left font-medium hover:text-rose-400 transition-colors"
                onClick={() => setIsOpen(!isOpen)}
                aria-expanded={isOpen}
            >
                <span>{question}</span>
                {isOpen ? <ChevronUp className="h-4 w-4 shrink-0" /> : <ChevronDown className="h-4 w-4 shrink-0" />}
            </button>
            <AnimatePresence initial={false}>
                {isOpen && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                    >
                        <div className="pb-4 text-sm text-gray-400 leading-relaxed space-y-2">{children}</div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

const PASSOS = [
    { icone: PenLine, titulo: 'Monte', texto: 'Escolha o link, conte a história de vocês e envie as fotos. Leva poucos minutos.' },
    { icone: Smartphone, titulo: 'Pague por Pix', texto: 'Copie o código Pix e pague no app do seu banco. A liberação é automática.' },
    { icone: QrCode, titulo: 'Entregue o QR Code', texto: 'Você recebe o link e o QR Code do portal. É só mostrar ou enviar para quem você ama.' },
];

const RECURSOS = {
    essential: [
        { ok: true, texto: `Até ${PLANS.essential.maxPhotos} fotos` },
        { ok: true, texto: 'Sua declaração' },
        { ok: true, texto: 'Contagem do tempo de vocês juntos' },
        { ok: true, texto: 'Link e QR Code para entregar' },
        { ok: true, texto: 'Chuva de emojis padrão (❤️)' },
        { ok: false, texto: 'Trilha sonora' },
        { ok: false, texto: 'Emojis personalizados' },
    ],
    complete: [
        { ok: true, texto: `Até ${PLANS.complete.maxPhotos} fotos` },
        { ok: true, texto: 'Sua declaração' },
        { ok: true, texto: 'Contagem do tempo de vocês juntos' },
        { ok: true, texto: 'Link e QR Code para entregar' },
        { ok: true, texto: 'Trilha sonora (link do YouTube)' },
        { ok: true, texto: 'Chuva de emojis personalizada' },
    ],
};

function PlanoCard({ id, destaque }) {
    const plano = PLANS[id];
    return (
        <Card className={`relative flex flex-col h-full ${destaque ? 'border-rose-500/60 shadow-[0_0_50px_rgba(225,29,72,0.2)]' : ''}`}>
            {destaque && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-rose-600 text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider whitespace-nowrap">
                    Mais completo
                </div>
            )}
            <h3 className="text-xl font-serif font-bold text-white mb-1">{plano.label}</h3>
            <div className="flex items-baseline gap-2 mb-5">
                <span className="text-4xl font-serif font-bold">{formatBRL(plano.price)}</span>
                <span className="text-gray-400 text-sm">pagamento único</span>
            </div>
            <ul className="space-y-3 mb-8 flex-1">
                {RECURSOS[id].map((r) => (
                    <li key={r.texto} className={`flex items-start gap-3 text-sm ${r.ok ? 'text-gray-200' : 'text-gray-500'}`}>
                        {r.ok
                            ? <Check className="h-4 w-4 mt-0.5 shrink-0 text-rose-400" aria-label="Incluído" />
                            : <Minus className="h-4 w-4 mt-0.5 shrink-0 text-gray-600" aria-label="Não incluído" />}
                        <span>{r.texto}</span>
                    </li>
                ))}
            </ul>
            <Link to={`/create?plano=${id}`} className="block">
                <Button className="w-full min-h-[48px]" variant={destaque ? 'primary' : 'secondary'}>
                    Criar com o plano {plano.label}
                </Button>
            </Link>
        </Card>
    );
}

export default function Home() {
    return (
        <div className="min-h-screen py-20 px-4 flex flex-col items-center justify-center relative z-10">

            {/* Split Hero Section */}
            <div className="max-w-7xl mx-auto w-full grid lg:grid-cols-2 gap-12 items-center mb-24">

                {/* Left Column: Text & CTA */}
                <motion.div
                    initial={{ x: -50, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ duration: 0.8 }}
                    className="text-center lg:text-left"
                >
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-medium text-rose-300 mb-6 backdrop-blur-sm mx-auto lg:mx-0">
                        <Sparkles className="h-3 w-3" />
                        <span>Presente para quem você ama</span>
                    </div>

                    <h1 className="font-serif text-3xl sm:text-4xl lg:text-6xl font-bold mb-5 leading-tight">
                        Um presente digital que você monta em poucos minutos e entrega com um QR Code
                    </h1>

                    <p className="text-base sm:text-lg md:text-xl text-gray-400 mb-8 max-w-xl leading-relaxed mx-auto lg:mx-0">
                        Reúna fotos, uma declaração e a contagem do tempo de vocês em uma página. Pague por Pix e entregue com um QR Code.
                    </p>

                    <Link to="/create" className="block sm:inline-block">
                        <Button size="lg" className="w-full sm:w-auto h-auto min-h-[56px] py-3 px-6 sm:px-10 text-base rounded-full whitespace-normal text-center leading-snug shadow-[0_0_40px_rgba(225,29,72,0.4)] hover:shadow-[0_0_60px_rgba(225,29,72,0.6)]">
                            <Heart className="mr-2 h-5 w-5 fill-current shrink-0" />
                            Criar o nosso portal — a partir de {formatBRL(PLANS.essential.price)}
                        </Button>
                    </Link>
                    <p className="text-sm text-gray-500 mt-3 mb-8">Pagamento único por Pix. Sem mensalidade.</p>
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

            {/* Como funciona */}
            <section className="w-full max-w-4xl mx-auto mb-24" aria-labelledby="como-funciona">
                <h2 id="como-funciona" className="font-serif text-3xl md:text-4xl font-bold mb-8 text-center">Como funciona</h2>
                <ol className="grid md:grid-cols-3 gap-4">
                    {PASSOS.map((p, i) => (
                        <li key={p.titulo}>
                            <Card className="h-full text-center">
                                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-rose-500/15 border border-rose-500/30">
                                    <p.icone className="h-5 w-5 text-rose-300" />
                                </div>
                                <p className="text-xs font-bold uppercase tracking-widest text-rose-300 mb-1">Passo {i + 1}</p>
                                <h3 className="font-serif text-xl font-bold mb-2">{p.titulo}</h3>
                                <p className="text-sm text-gray-400 leading-relaxed">{p.texto}</p>
                            </Card>
                        </li>
                    ))}
                </ol>
            </section>

            {/* Assistente de escrita (IA) */}
            <section className="w-full max-w-3xl mx-auto mb-24" aria-labelledby="assistente">
                <Card className="border-rose-500/30 bg-gradient-to-br from-rose-500/10 via-transparent to-transparent">
                    <div className="flex flex-col sm:flex-row gap-5 sm:items-center">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-rose-500/15 border border-rose-500/30">
                            <Sparkles className="h-5 w-5 text-rose-300" />
                        </div>
                        <div>
                            <h2 id="assistente" className="font-serif text-2xl font-bold mb-2">Travou na hora de escrever?</h2>
                            <p className="text-gray-300 leading-relaxed">
                                Conte como vocês se conheceram e uma lembrança, e a IA sugere uma declaração com a história de vocês. Você revisa e edita antes de usar.
                            </p>
                            <p className="text-sm text-gray-400 mt-3">
                                Está incluído nos dois planos. A IA só usa o que você contar e pode errar, por isso o texto é sempre uma sugestão: nada entra no portal sem a sua escolha.
                            </p>
                            <p className="text-xs text-gray-500 mt-2">
                                O que você digitar no assistente é enviado a um serviço de IA só para gerar a sugestão. <Link to="/privacidade" className="underline underline-offset-4 hover:text-rose-300">Saiba mais</Link>
                            </p>
                        </div>
                    </div>
                </Card>
            </section>

            {/* Planos */}
            <section className="w-full max-w-3xl mx-auto mb-24" aria-labelledby="planos">
                <h2 id="planos" className="font-serif text-3xl md:text-4xl font-bold mb-2 text-center">Escolha seu plano</h2>
                <p className="text-gray-400 text-center mb-10">Pagamento único por Pix. Sem mensalidade nem renovação.</p>
                <div className="grid md:grid-cols-2 gap-6 items-stretch pt-3">
                    <div className="order-2 md:order-1"><PlanoCard id="essential" /></div>
                    <div className="order-1 md:order-2"><PlanoCard id="complete" destaque /></div>
                </div>
            </section>

            {/* FAQ */}
            <section className="w-full max-w-2xl mx-auto mb-20" aria-labelledby="faq">
                <h2 id="faq" className="font-serif text-3xl font-bold mb-8 text-center">Dúvidas frequentes</h2>
                <Card>
                    <div className="divide-y divide-white/10">
                        <FAQItem question="Depois de pagar, libera na hora?">
                            <p>Sim, em poucos segundos. Assim que o Mercado Pago confirma o Pix, o portal é liberado sozinho, mesmo que você feche a tela.</p>
                            <p>O endereço do portal é o link que você escolheu no começo (eternity.dev.br/portal/seu-link). Se algo demorar, fale com o suporte.</p>
                        </FAQItem>
                        <FAQItem question="Posso editar depois?">
                            <p>Hoje, não: depois de pago, o portal não pode ser alterado por você. Por isso, revise tudo com calma antes de pagar. Até gerar o Pix, dá para voltar em qualquer passo e mudar o que quiser.</p>
                            <p>Se errar algo grave, fale com o suporte.</p>
                        </FAQItem>
                        <FAQItem question="O site expira?">
                            <p>Não há mensalidade nem renovação: o pagamento é único. O portal continua no ar enquanto o Eternity existir.</p>
                        </FAQItem>
                        <FAQItem question="Como entrego o presente?">
                            <p>Depois de pago, aparecem o link do portal e um botão para baixar o QR Code. Você pode enviar o link por WhatsApp ou imprimir o QR Code (num cartão, por exemplo). A pessoa aponta a câmera do celular e abre o portal.</p>
                        </FAQItem>
                        <FAQItem question="Meus dados ficam seguros?">
                            <p>Cuidamos do que você envia: o portal só aparece depois de pago, seu e-mail nunca é exibido nele, e o pagamento é feito no Mercado Pago (não guardamos dados do seu cartão ou banco).</p>
                            <p>Mas atenção: quem tiver o link do portal consegue vê-lo. Por isso, não coloque nele informações sensíveis. Detalhes na <Link to="/privacidade" className="text-rose-400 underline underline-offset-4">Política de Privacidade</Link>.</p>
                        </FAQItem>
                    </div>
                </Card>
            </section>

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
                    <h4 className="font-medium text-white">Suporte</h4>
                    <p className="text-sm text-gray-400 mb-2">Dúvidas? Fale com a gente.</p>
                    <div className="flex gap-4">
                        <a href="https://wa.link/l2qsex" target="_blank" rel="noopener noreferrer" className="text-xs text-rose-400 hover:text-rose-300 underline underline-offset-4">WhatsApp</a>
                        <a href="mailto:g.nsouza1408@gmail.com" className="text-xs text-rose-400 hover:text-rose-300 underline underline-offset-4">Email</a>
                    </div>
                </div>
            </Card>

        </div>
    );
}
