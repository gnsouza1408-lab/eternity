import { useState, useRef, useEffect } from 'react';
import QRCode from 'qrcode';
import { motion } from 'framer-motion';
import { ArrowRight, ArrowLeft, Upload, Music, CheckCircle, Check, Copy, Lock, QrCode, Loader2 } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { cn } from '../lib/utils';
import { SupportButton } from '../components/SupportButton';
import { supabase } from '../lib/supabaseClient';

import { PaymentModal } from '../components/PaymentModal';
import { AssistenteMensagem } from '../components/AssistenteMensagem';
import { PLANS, DEFAULT_EMOJI, ALLOWED_EMOJIS, formatBRL } from '../../shared/plans.js';
import { sanitizeSlugInput, finalizeSlug, erroSlug, erroData, erroMensagem, erroEmail, hojeISO, MESSAGE_MIN } from '../../shared/validation.js';

const INITIAL_DATA = {
    slug: '',
    title: 'Nós para sempre',
    date: '',
    message: '',
    photos: [],
    emoji: DEFAULT_EMOJI,
    music: '',
    musicName: '',
    email: '',
    plan: 'complete',
    draftToken: '',
    draftSlug: '',
    rascunhoId: '',
};

// Identificador do rascunho neste navegador (limite de gerações da IA por rascunho).
function novoRascunho() {
    const id = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : String(Date.now());
    return { ...INITIAL_DATA, rascunhoId: id };
}

// Rascunhos salvos antes da Fase 0 usam os planos antigos.
const LEGACY_PLAN_MAP = { annual: 'essential', eternal: 'complete' };

function restoreData(saved) {
    const restored = { ...novoRascunho(), ...saved };
    if (!restored.rascunhoId) restored.rascunhoId = novoRascunho().rascunhoId;
    restored.plan = LEGACY_PLAN_MAP[restored.plan] || restored.plan;
    if (!PLANS[restored.plan]) restored.plan = INITIAL_DATA.plan;
    return restored;
}

const STEPS = [
    { id: 'slug', title: 'Escolha seu Link' },
    { id: 'plan', title: 'Escolha o Plano' },
    { id: 'title', title: 'Título do Portal' },
    { id: 'date', title: 'Data do Início' },
    { id: 'message', title: 'Sua Mensagem' },
    { id: 'photos', title: 'Nossas Fotos' },
    { id: 'emoji', title: 'Chuva de Emojis' },
    { id: 'music', title: 'Trilha Sonora' },
    { id: 'email', title: 'Seu E-mail' },
    { id: 'checkout', title: 'Pagamento' },
    { id: 'success', title: 'Portal Criado!' },
];

// Mensagem de erro embaixo do campo (lida por leitores de tela).
function CampoErro({ id, children }) {
    if (!children) return null;
    return <p id={id} role="alert" className="text-sm text-red-300">{children}</p>;
}
const campoInvalido = 'border-red-400/70 focus:border-red-400 focus:ring-red-400/50';

export default function Wizard() {
    const [currentStep, setCurrentStep] = useState(0);
    const [data, setData] = useState(novoRascunho);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const submitLock = useRef(false); // trava imediata contra toque duplo (o estado só muda no próximo render)
    const [errors, setErrors] = useState({});
    const [isCheckingSlug, setIsCheckingSlug] = useState(false);
    const [confirmReset, setConfirmReset] = useState(false);
    const [linkCopied, setLinkCopied] = useState(false);
    const [successError, setSuccessError] = useState('');
    const plan = PLANS[data.plan] || PLANS[INITIAL_DATA.plan];

    // Payment State
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
    const [pixData, setPixData] = useState(null);
    const [isGeneratingPix, setIsGeneratingPix] = useState(false);
    const [pixError, setPixError] = useState('');
    const [submitError, setSubmitError] = useState('');

    // Polling for Payment Approval
    useEffect(() => {
        let interval;
        if (isPaymentModalOpen && data.slug) {
            interval = setInterval(async () => {
                const { data: status } = await supabase.rpc('get_portal_status', { p_slug: data.slug });

                if (status === 'paid') {
                    setIsPaymentModalOpen(false);
                    setCurrentStep(10); // Success Step
                    localStorage.removeItem('eternity_wizard_state'); // Clear persistence on success

                    // TikTok Pixel - Track Purchase
                    if (window.ttq) {
                        try {
                            // Só tipo, valor e moeda. O link (slug) dá acesso às fotos do casal: nunca vai ao pixel.
                            window.ttq.track('CompletePayment', {
                                content_type: 'product',
                                value: plan.price,
                                currency: 'BRL'
                            });
                        } catch (e) { console.error("Pixel Error", e); }
                    }

                    clearInterval(interval);
                }
            }, 3000);
        }
        return () => clearInterval(interval);
    // plan.price só alimenta o evento do pixel; incluí-lo reiniciaria o polling do status do pagamento.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isPaymentModalOpen, data.slug]);

    // Persistence Logic (Auto-Save & Auto-Recover)
    useEffect(() => {
        // Load state on mount
        let temPixSalvo = false;
        const savedState = localStorage.getItem('eternity_wizard_state');
        if (savedState) {
            try {
                const parsed = JSON.parse(savedState);
                setData(restoreData(parsed.data));
                setCurrentStep(parsed.currentStep);
                if (parsed.pixData) {
                    temPixSalvo = true;
                    setPixData(parsed.pixData);
                    setIsPaymentModalOpen(parsed.isPaymentModalOpen);
                }
            } catch (e) {
                console.error("Failed to load saved state", e);
            }
        }

        // Plano escolhido na landing (/create?plano=essential|complete). Não muda o plano de um
        // pagamento já em andamento.
        const planoDaUrl = new URLSearchParams(window.location.search).get('plano');
        if (PLANS[planoDaUrl] && !temPixSalvo) {
            setData(prev => {
                if (prev.plan === planoDaUrl) return prev;
                if (planoDaUrl === 'essential') {
                    return { ...prev, plan: planoDaUrl, photos: prev.photos.slice(0, PLANS.essential.maxPhotos), music: '', musicName: '', emoji: DEFAULT_EMOJI };
                }
                return { ...prev, plan: planoDaUrl };
            });
        }
    }, []);

    useEffect(() => {
        // Save state on change
        if (currentStep === 10) return; // Don't save if success
        const stateToSave = {
            data,
            currentStep,
            pixData,
            isPaymentModalOpen
        };
        localStorage.setItem('eternity_wizard_state', JSON.stringify(stateToSave));
    }, [data, currentStep, pixData, isPaymentModalOpen]);


    const checkSlugAvailability = async (slug) => {
        if (!slug) return false;
        // Rascunho deste navegador: o servidor confere o token ao salvar
        if (data.draftToken && data.draftSlug === slug) return true;
        const { data: available, error } = await supabase.rpc('slug_available', { p_slug: slug });
        if (error) {
            console.error(error);
            return false;
        }
        return available === true;
    };

    // Erros de um passo (vazio = ok). A disponibilidade do link é checada à parte, no servidor.
    const stepErrors = (step, d = data) => {
        if (step === 0) return { slug: erroSlug(finalizeSlug(d.slug)) };
        if (step === 3) return { date: erroData(d.date) };
        if (step === 4) return { message: erroMensagem(d.message) };
        if (step === 8) return { email: erroEmail((d.email || '').trim()) };
        return {};
    };
    const hasErrors = (e) => Object.values(e).some(Boolean);

    const handleNext = async () => {
        const found = stepErrors(currentStep);
        if (hasErrors(found)) {
            setErrors(found);
            return;
        }

        if (currentStep === 0) {
            const slug = finalizeSlug(data.slug);
            if (slug !== data.slug) handleChange('slug', slug);
            setIsCheckingSlug(true);
            try {
                const isAvailable = await checkSlugAvailability(slug);
                if (!isAvailable) {
                    setErrors({ slug: "Poxa, este link já está sendo usado ou não pôde ser conferido agora. Tente outro nome." });
                    return;
                }
            } finally {
                setIsCheckingSlug(false);
            }
        }

        if (currentStep === 8) {
            const email = data.email.trim();
            if (email !== data.email) handleChange('email', email);
        }

        setErrors({});
        if (currentStep < STEPS.length - 1) {
            setCurrentStep(prev => prev + 1);
        }
    };

    const handleBack = () => {
        setErrors({});
        if (currentStep > 0) {
            setCurrentStep(prev => prev - 1);
        }
    };

    const handleChange = (field, value) => {
        setData(prev => ({ ...prev, [field]: value }));
        setErrors(prev => (prev[field] ? { ...prev, [field]: '' } : prev));
    };

    const handlePhotoUpload = async (e) => {
        const files = Array.from(e.target.files);
        // Limit based on plan
        const maxPhotos = plan.maxPhotos;
        const currentCount = data.photos.length;
        const remainingSlots = maxPhotos - currentCount;

        if (remainingSlots <= 0) return;

        const selectedFiles = files.slice(0, remainingSlots);

        const promises = selectedFiles.map(file => {
            return new Promise((resolve) => {
                const reader = new FileReader();
                reader.onload = (e) => {
                    const img = new Image();
                    img.onload = () => {
                        const canvas = document.createElement('canvas');
                        const ctx = canvas.getContext('2d');

                        // Simple resize logic to max 800px width/height
                        let width = img.width;
                        let height = img.height;
                        const maxSize = 800;

                        if (width > height) {
                            if (width > maxSize) {
                                height *= maxSize / width;
                                width = maxSize;
                            }
                        } else {
                            if (height > maxSize) {
                                width *= maxSize / height;
                                height = maxSize;
                            }
                        }

                        canvas.width = width;
                        canvas.height = height;
                        ctx.drawImage(img, 0, 0, width, height);
                        resolve(canvas.toDataURL('image/jpeg', 0.7)); // Compress
                    };
                    img.src = e.target.result;
                };
                reader.readAsDataURL(file);
            });
        });

        const base64Images = await Promise.all(promises);
        setData(prev => ({ ...prev, photos: [...prev.photos, ...base64Images] }));
    };

    // O valor é definido pelo servidor a partir do plano salvo; aqui só vão slug e token.
    // Retorna true se o Pix foi gerado. Erros ficam em pixError (mostrado na tela, sem alert).
    const generatePix = async (slug, draftToken) => {
        setIsGeneratingPix(true);
        setPixError('');
        try {
            const response = await fetch('/api/create-pix', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ slug, draftToken })
            });
            const result = await response.json().catch(() => ({}));
            if (!response.ok) {
                setPixError(result.message || "Não conseguimos gerar o Pix agora. Tente de novo.");
                return false;
            }
            setPixData({ ...result, generatedAt: Date.now() });
            setIsPaymentModalOpen(true);
            return true;
        } catch (error) {
            console.error(error);
            setPixError("Não conseguimos gerar o Pix agora. Verifique sua conexão e tente de novo.");
            return false;
        } finally {
            setIsGeneratingPix(false);
        }
    };

    const finalizeCreation = async () => {
        if (isSubmitting || submitLock.current) return;
        // Rascunhos antigos (do navegador) podem ter campos que hoje seriam recusados.
        for (const step of [0, 3, 4, 8]) {
            const found = stepErrors(step);
            if (hasErrors(found)) {
                setErrors(found);
                setCurrentStep(step);
                return;
            }
        }
        submitLock.current = true;
        setIsSubmitting(true);
        setSubmitError('');
        setPixError('');
        try {
            // 1. Salva no servidor (valida, aplica o plano e devolve o token de rascunho)
            const response = await fetch('/api/create-portal', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    slug: data.slug,
                    title: data.title,
                    date: data.date,
                    message: data.message,
                    photos: data.photos,
                    emoji: data.emoji,
                    music: data.music,
                    musicName: data.musicName,
                    email: data.email,
                    plan: data.plan,
                    draftToken: data.draftToken || undefined,
                }),
            });
            const result = await response.json().catch(() => ({}));
            if (!response.ok) {
                setSubmitError(result.message || "Não conseguimos salvar o portal. Verifique sua conexão ou tente outro link.");
                return;
            }
            setData(prev => ({ ...prev, draftToken: result.draftToken, draftSlug: result.slug }));

            // 2. Gera o Pix
            await generatePix(result.slug, result.draftToken);
        } catch (error) {
            console.error("Error saving portal:", error);
            setSubmitError("Não conseguimos salvar o portal. Verifique sua conexão e tente de novo.");
        } finally {
            submitLock.current = false;
            setIsSubmitting(false);
        }
    };

    const handleReset = () => {
        setData(novoRascunho());
        setCurrentStep(0);
        setIsPaymentModalOpen(false);
        setPixData(null);
        setErrors({});
        setSubmitError('');
        setPixError('');
        setConfirmReset(false);
        localStorage.removeItem('eternity_wizard_state');
    };

    // Step Renders
    const renderStep = () => {
        switch (currentStep) {
            case 0:

                return (
                    <div className="space-y-4">
                        <label className="block text-sm font-medium text-gray-300">Digite o endereço do seu portal</label>
                        <div className="flex items-center">
                            <span className="text-gray-500 mr-2">eternity.dev.br/portal/</span>
                            <Input
                                value={data.slug}
                                onChange={(e) => handleChange('slug', sanitizeSlugInput(e.target.value))}
                                placeholder="nome-do-casal"
                                autoFocus
                                autoCapitalize="none"
                                autoCorrect="off"
                                spellCheck={false}
                                aria-invalid={Boolean(errors.slug)}
                                aria-describedby={errors.slug ? 'erro-slug' : undefined}
                                className={errors.slug ? campoInvalido : ''}
                            />
                        </div>
                        <CampoErro id="erro-slug">{errors.slug}</CampoErro>
                        <p className="text-xs text-gray-500">Só letras minúsculas, números e traços. Ex.: ana-e-joao</p>
                    </div>
                );
            case 1:
                return (
                    <div className="space-y-4">
                        <div
                            onClick={() => {
                                handleChange('plan', 'essential');
                                // Reset features that might be incompatible if switching back
                                const limit = PLANS.essential.maxPhotos;
                                setData(prev => ({ ...prev, photos: prev.photos.slice(0, limit), music: '', musicName: '', emoji: DEFAULT_EMOJI }));
                            }}
                            className={cn(
                                "p-6 rounded-xl border cursor-pointer transition-all flex justify-between items-center",
                                data.plan === 'essential' ? "bg-rose-500/10 border-rose-500" : "bg-white/5 border-white/10"
                            )}
                        >
                            <div>
                                <h3 className="font-serif text-lg">Plano Essencial</h3>
                                <p className="text-sm text-gray-400">{formatBRL(PLANS.essential.price)} (Único)</p>
                                <p className="text-xs text-rose-300/70 mt-1">Limite de 5 fotos • Sem trilha sonora</p>
                            </div>
                            {data.plan === 'essential' && <div className="h-4 w-4 rounded-full bg-rose-500" />}
                        </div>

                        <div
                            onClick={() => handleChange('plan', 'complete')}
                            className={cn(
                                "p-6 rounded-xl border cursor-pointer transition-all flex justify-between items-center relative overflow-hidden",
                                data.plan === 'complete' ? "bg-rose-500/10 border-rose-500" : "bg-white/5 border-white/10"
                            )}
                        >
                            <div className="absolute top-0 right-0 p-2">
                                <span className="bg-rose-500 text-[10px] px-2 py-0.5 rounded-full text-white font-bold">RECOMENDADO</span>
                            </div>
                            <div>
                                <h3 className="font-serif text-lg">Plano Completo</h3>
                                <p className="text-sm text-gray-400">{formatBRL(PLANS.complete.price)} (Único)</p>
                                <p className="text-xs text-rose-300/70 mt-1">15 fotos • Música • Emojis</p>
                            </div>
                            {data.plan === 'complete' && <div className="h-4 w-4 rounded-full bg-rose-500" />}
                        </div>
                    </div>
                );
            case 2:
                return (
                    <div className="space-y-4">
                        <label className="block text-sm font-medium text-gray-300">Título do Portal</label>
                        <Input
                            value={data.title}
                            onChange={(e) => handleChange('title', e.target.value)}
                            placeholder="Ex: Ana & João"
                        />
                    </div>
                );
            case 3:
                return (
                    <div className="space-y-4">
                        <label className="block text-sm font-medium text-gray-300">Quando tudo começou?</label>
                        <Input
                            type="date"
                            value={data.date}
                            min="1900-01-01"
                            max={hojeISO()}
                            onChange={(e) => handleChange('date', e.target.value)}
                            aria-invalid={Boolean(errors.date)}
                            aria-describedby={errors.date ? 'erro-data' : undefined}
                            className={errors.date ? campoInvalido : ''}
                        />
                        <CampoErro id="erro-data">{errors.date}</CampoErro>
                    </div>
                );
            case 4:
                return (
                    <div className="space-y-4">
                        <label className="block text-sm font-medium text-gray-300">Sua Declaração</label>
                        <textarea
                            className={`w-full h-40 bg-black/20 border rounded-md p-3 text-base text-white focus:outline-none resize-none relative z-10 ${errors.message ? 'border-red-400/70 focus:border-red-400' : 'border-white/10 focus:border-rose-500/50'}`}
                            autoFocus
                            value={data.message}
                            onChange={(e) => handleChange('message', e.target.value)}
                            placeholder="Escreva sua mensagem de amor..."
                            aria-invalid={Boolean(errors.message)}
                            aria-describedby={errors.message ? 'erro-mensagem' : 'ajuda-mensagem'}
                        />
                        <div className="flex items-start justify-between gap-3">
                            <div className="flex-1">
                                <CampoErro id="erro-mensagem">{errors.message}</CampoErro>
                                {!errors.message && <p id="ajuda-mensagem" className="text-xs text-gray-500">Mínimo de {MESSAGE_MIN} caracteres.</p>}
                            </div>
                            <span className="text-xs text-gray-500 tabular-nums">{data.message.trim().length}</span>
                        </div>
                        <AssistenteMensagem
                            mensagem={data.message}
                            onMensagemChange={(texto) => handleChange('message', texto)}
                            rascunhoId={data.rascunhoId}
                        />
                    </div>
                );
            case 5: {
                const maxPhotos = plan.maxPhotos;
                return (
                    <div className="space-y-4">
                        <label className="block text-sm font-medium text-gray-300">Nossas Fotos (Max {maxPhotos})</label>
                        <div className="border-2 border-dashed border-white/10 rounded-xl p-8 text-center cursor-pointer hover:border-rose-500/50 transition-colors relative">
                            <input
                                type="file"
                                multiple
                                accept="image/*"
                                onChange={handlePhotoUpload}
                                className="absolute inset-0 opacity-0 cursor-pointer"
                                disabled={data.photos.length >= maxPhotos}
                            />
                            <Upload className="mx-auto h-10 w-10 text-gray-500 mb-2" />
                            <p className="text-sm text-gray-400">
                                {data.photos.length >= maxPhotos ? "Limite atingido" : "Clique ou arraste fotos aqui"}
                            </p>
                        </div>
                        <div className="flex gap-2 bg-black/20 p-2 overflow-x-auto rounded-md">
                            {data.photos.map((src, idx) => (
                                <div key={idx} className="relative flex-shrink-0">
                                    <img src={src} className="h-20 w-20 object-cover rounded shadow-sm" alt="preview" />
                                    <button
                                        onClick={() => setData(prev => ({ ...prev, photos: prev.photos.filter((_, i) => i !== idx) }))}
                                        className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-4 h-4 flex items-center justify-center text-xs"
                                    >
                                        ×
                                    </button>
                                </div>
                            ))}
                        </div>
                        {data.plan === 'essential' && (
                            <p className="text-xs text-center text-gray-500">Faça upgrade para o Plano Completo para adicionar até {PLANS.complete.maxPhotos} fotos.</p>
                        )}
                    </div>
                );
            }
            case 6: {
                const emojis = ALLOWED_EMOJIS;
                return (
                    <div className="space-y-6">
                        <label className="block text-sm font-medium text-gray-300">Escolha o Emoji Principal</label>
                        {plan.customEmoji ? (
                            <div className="grid grid-cols-4 gap-4">
                                {emojis.map(emoji => (
                                    <button
                                        key={emoji}
                                        onClick={() => handleChange('emoji', emoji)}
                                        className={cn(
                                            "text-2xl p-4 rounded-xl transition-all border flex items-center justify-center",
                                            data.emoji === emoji
                                                ? "bg-rose-500/20 border-rose-500 shadow-lg scale-110"
                                                : "bg-white/5 border-transparent hover:bg-white/10"
                                        )}
                                    >
                                        {emoji === 'all' ? <span className="text-sm font-bold">Mix ✨</span> : emoji}
                                    </button>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center p-6 border border-white/10 rounded-lg bg-white/5">
                                <div className="text-4xl mb-4">❤️</div>
                                <p className="text-sm text-gray-400 mb-2">Emoji Padrão selecionado</p>
                                <div className="flex items-center justify-center gap-2 text-xs text-rose-400">
                                    <Lock className="h-3 w-3" />
                                    Personalização disponível no Plano Completo
                                </div>
                            </div>
                        )}
                    </div>
                );
            }
            case 7:
                return (
                    <div className="space-y-4">
                        <label className="block text-sm font-medium text-gray-300">Música de Fundo (Link YouTube)</label>
                        {plan.music ? (
                            <>
                                <div className="relative">
                                    <Music className="absolute left-3 top-3 h-4 w-4 text-gray-500" />
                                    <Input
                                        value={data.music}
                                        onChange={(e) => handleChange('music', e.target.value)}
                                        placeholder="https://youtube.com/watch?v=..."
                                        className="pl-10"
                                    />
                                </div>
                                <Input
                                    value={data.musicName}
                                    onChange={(e) => handleChange('musicName', e.target.value)}
                                    placeholder="Nome da Música (Opcional)"
                                    className="mt-2"
                                />
                                <p className="text-xs text-gray-500">O player ficará invisível no portal.</p>
                            </>
                        ) : (
                            <div className="p-4 border border-white/10 rounded-lg bg-white/5 text-center">
                                <Music className="h-8 w-8 text-gray-600 mx-auto mb-2" />
                                <p className="text-sm text-gray-400 mb-2">Trilha sonora não disponível</p>
                                <div className="flex items-center justify-center gap-2 text-xs text-rose-400">
                                    <Lock className="h-3 w-3" />
                                    Disponível exclusivamente no Plano Completo
                                </div>
                            </div>
                        )}
                    </div>
                );
            case 8:
                return (
                    <div className="space-y-4">
                        <label className="block text-sm font-medium text-gray-300">E-mail para Administração</label>
                        <Input
                            type="email"
                            inputMode="email"
                            autoComplete="email"
                            value={data.email}
                            onChange={(e) => handleChange('email', e.target.value)}
                            placeholder="seu@email.com"
                            aria-invalid={Boolean(errors.email)}
                            aria-describedby={errors.email ? 'erro-email' : undefined}
                            className={errors.email ? campoInvalido : ''}
                        />
                        <CampoErro id="erro-email">{errors.email}</CampoErro>
                        <p className="text-xs text-gray-500">Usamos este e-mail para identificar seu pagamento e te ajudar a recuperar seu portal, se precisar.</p>
                    </div>
                );
            case 9:
                return (
                    <div className="text-center space-y-6">
                        <h3 className="text-xl font-serif">Resumo do Pedido</h3>

                        <div className="bg-white/5 p-4 rounded-lg text-left space-y-2 text-sm">
                            <div className="flex justify-between">
                                <span className="text-gray-400">Plano</span>
                                <span className="font-medium text-white">{plan.label} (Vitalício)</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-400">Fotos</span>
                                <span className="font-medium text-white">{data.photos.length} enviadas</span>
                            </div>
                            {data.music && (
                                <div className="flex justify-between">
                                    <span className="text-gray-400">Música</span>
                                    <span className="font-medium text-white">Inclusa</span>
                                </div>
                            )}
                        </div>

                        <div className="bg-white/5 p-4 rounded-lg border border-white/10">
                            <p className="text-sm text-gray-400 mb-2">Total a pagar</p>
                            <p className="text-3xl font-serif text-rose-400 font-bold">
                                {formatBRL(plan.price)}
                            </p>
                        </div>

                        <Button
                            variant="primary"
                            className="w-full gap-2 text-lg"
                            onClick={finalizeCreation}
                            disabled={isSubmitting || isGeneratingPix}
                        >
                            {isSubmitting || isGeneratingPix
                                ? <><Loader2 className="h-5 w-5 animate-spin" /> Preparando seu Pix...</>
                                : <><QrCode className="h-5 w-5" /> Gerar PIX e Finalizar</>}
                        </Button>
                        <div aria-live="polite">
                            {(submitError || (pixError && !isPaymentModalOpen)) && (
                                <p role="alert" className="text-sm text-red-300 text-left">{submitError || pixError}</p>
                            )}
                        </div>
                    </div>
                );
            case 10: {
                const portalUrl = `${window.location.origin}/portal/${data.slug}`;
                return (
                    <div className="text-center space-y-8 py-8">
                        <div className="space-y-4">
                            <div className="h-24 w-24 bg-green-500/20 rounded-full flex items-center justify-center mx-auto border border-green-500/50 shadow-[0_0_30px_rgba(34,197,94,0.3)]">
                                <CheckCircle className="h-12 w-12 text-green-500" />
                            </div>
                            <h2 className="text-4xl font-serif font-bold text-white">Portal Criado!</h2>
                            <p className="text-gray-400">Seu amor foi eternizado com sucesso.</p>
                        </div>

                        <Button
                            className="w-full text-lg h-14 rounded-full shadow-[0_0_30px_rgba(225,29,72,0.4)] hover:shadow-[0_0_50px_rgba(225,29,72,0.6)] animate-pulse-slow"
                            onClick={() => window.open(portalUrl, '_blank')}
                        >
                            Acessar nosso mundo <ArrowRight className="ml-2 h-5 w-5" />
                        </Button>

                        <div className="bg-white/5 p-6 rounded-2xl border border-white/10 space-y-3">
                            <p className="text-sm text-gray-400 text-left">Copie seu link exclusivo:</p>
                            <div className="flex items-center gap-2 bg-black/40 p-3 rounded-lg border border-white/10">
                                <span className="text-rose-300 font-mono text-sm truncate flex-1 text-left">{portalUrl}</span>
                                <Button
                                    size="icon"
                                    variant="ghost"
                                    aria-label="Copiar link do portal"
                                    className="hover:bg-white/10 text-gray-400 hover:text-white"
                                    onClick={async () => {
                                        try {
                                            await navigator.clipboard.writeText(portalUrl);
                                            setSuccessError('');
                                            setLinkCopied(true);
                                            setTimeout(() => setLinkCopied(false), 2500);
                                        } catch {
                                            setSuccessError('Não deu para copiar sozinho. Toque no link, selecione e copie.');
                                        }
                                    }}
                                >
                                    {linkCopied ? <Check className="h-4 w-4 text-green-400" /> : <Copy className="h-4 w-4" />}
                                </Button>
                            </div>
                            <div aria-live="polite" className="min-h-[1rem] text-left">
                                {linkCopied && <p className="text-sm text-green-300">Link copiado!</p>}
                                {successError && <p role="alert" className="text-sm text-red-300">{successError}</p>}
                            </div>

                            <Button
                                variant="outline"
                                className="w-full gap-2 border-white/10 hover:bg-white/5 text-gray-300"
                                onClick={async () => {
                                    try {
                                        const url = await QRCode.toDataURL(portalUrl, {
                                            width: 800,
                                            margin: 2,
                                            color: {
                                                dark: '#F43F5E', // Rose-500
                                                light: '#000000', // Black background
                                            }
                                        });
                                        const link = document.createElement('a');
                                        link.download = `qrcode-${data.slug}.png`;
                                        link.href = url;
                                        document.body.appendChild(link);
                                        link.click();
                                        document.body.removeChild(link);
                                        setSuccessError('');
                                    } catch (err) {
                                        console.error(err);
                                        setSuccessError('Não conseguimos gerar o QR Code agora. Tente de novo.');
                                    }
                                }}
                            >
                                <QrCode className="h-4 w-4" /> Baixar QR Code do Portal
                            </Button>
                        </div>
                    </div>
                );
            }
            default:
                return null;
        }
    };

    return (
        <div className="min-h-screen pt-24 pb-12 px-4 flex flex-col items-center justify-center max-w-xl mx-auto">
            <PaymentModal
                isOpen={isPaymentModalOpen}
                onClose={() => setIsPaymentModalOpen(false)}
                pixData={pixData}
                onNewPix={() => generatePix(data.slug, data.draftToken)}
                isGeneratingPix={isGeneratingPix}
                pixError={pixError}
            />

            {currentStep < STEPS.length && (
                <div className="w-full mb-8">
                    <div className="flex justify-between items-center mb-2">
                        <span className="text-xs text-rose-300 font-medium tracking-widest uppercase">Passo {currentStep + 1} de {STEPS.length}</span>
                        <span className="text-xs text-gray-600">{Math.round(((currentStep + 1) / STEPS.length) * 100)}%</span>
                    </div>
                    <div className="h-1 w-full bg-white/10 rounded-full overflow-hidden">
                        <motion.div
                            className="h-full bg-rose-600"
                            initial={{ width: 0 }}
                            animate={{ width: `${((currentStep + 1) / STEPS.length) * 100}%` }}
                        />
                    </div>
                </div>
            )}

            <Card className="w-full min-h-[400px] flex flex-col justify-between">
                <motion.div
                    key={currentStep}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -12 }}
                    transition={{ duration: 0.3 }}
                >
                    {currentStep < 10 && (
                        <h2 className="text-2xl font-serif font-bold mb-6">{STEPS[currentStep].title}</h2>
                    )}
                    {renderStep()}
                </motion.div>

                <div className="flex justify-between mt-8 pt-4 border-t border-white/5 items-center">
                    <div className="flex items-center gap-2">
                        {currentStep > 0 && currentStep < 10 && (
                            <Button variant="ghost" onClick={handleBack}>
                                <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
                            </Button>
                        )}
                        {currentStep > 0 && currentStep < 10 && (
                            <button
                                type="button"
                                onClick={() => setConfirmReset(true)}
                                className="min-h-[44px] px-2 text-xs text-rose-500/70 hover:text-rose-400 underline decoration-rose-500/30 underline-offset-4 transition-colors ml-2"
                            >
                                Começar Novamente
                            </button>
                        )}
                    </div>

                    {currentStep < 9 ? (
                        <Button className="ml-auto min-h-[44px]" onClick={handleNext} disabled={isCheckingSlug}>
                            {isCheckingSlug
                                ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Verificando...</>
                                : <>Próximo <ArrowRight className="ml-2 h-4 w-4" /></>}
                        </Button>
                    ) : null}
                </div>
                {confirmReset && (
                    <div role="alertdialog" aria-label="Começar novamente" className="mt-4 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 space-y-2">
                        <p className="text-sm text-amber-100">Isso apaga tudo o que você preencheu até agora. Deseja recomeçar?</p>
                        <div className="flex flex-col sm:flex-row gap-2">
                            <Button type="button" className="flex-1 min-h-[44px]" onClick={handleReset}>Apagar e recomeçar</Button>
                            <Button type="button" variant="secondary" className="flex-1 min-h-[44px]" onClick={() => setConfirmReset(false)}>Cancelar</Button>
                        </div>
                    </div>
                )}
            </Card>

            {currentStep < 10 && <SupportButton />}
        </div>
    );
}
