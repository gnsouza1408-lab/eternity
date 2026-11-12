import React, { useEffect, useRef, useState } from 'react';
import { Wand2, Loader2, RotateCcw, PenLine, Check, AlertCircle, X } from 'lucide-react';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { cn } from '../lib/utils';
import { modelosMensagem } from '../lib/modelosMensagem';

// Limites iguais aos do servidor (api/_lib/declaracao.js). O servidor revalida.
const LIMITES = { nome: 40, comoSeConheceram: 300, memoria: 400, admiracao: 300 };
const TONS = [
    { id: 'fofo', rotulo: 'Fofo' },
    { id: 'engracado', rotulo: 'Engraçado' },
    { id: 'emocionante', rotulo: 'Emocionante' },
];
const TAMANHOS = [
    { id: 'curto', rotulo: 'Curto' },
    { id: 'medio', rotulo: 'Médio' },
];
const TIMEOUT_MS = 50_000;

const FORM_INICIAL = {
    quemEscreve: '',
    paraQuem: '',
    comoSeConheceram: '',
    memoria: '',
    admiracao: '',
    tom: 'fofo',
    tamanho: 'curto',
};

function Campo({ id, rotulo, opcional, children }) {
    return (
        <div className="space-y-1">
            <label htmlFor={id} className="block text-xs font-medium text-gray-300">
                {rotulo} {opcional && <span className="text-gray-500">(opcional)</span>}
            </label>
            {children}
        </div>
    );
}

function Escolha({ opcoes, valor, onChange, rotulo }) {
    return (
        <div role="radiogroup" aria-label={rotulo} className="flex flex-wrap gap-2">
            {opcoes.map((o) => (
                <button
                    key={o.id}
                    type="button"
                    role="radio"
                    aria-checked={valor === o.id}
                    onClick={() => onChange(o.id)}
                    className={cn(
                        'min-h-[40px] px-4 rounded-full text-sm border transition-colors',
                        valor === o.id
                            ? 'bg-rose-500/20 border-rose-500 text-white'
                            : 'bg-white/5 border-white/10 text-gray-300 hover:bg-white/10'
                    )}
                >
                    {o.rotulo}
                </button>
            ))}
        </div>
    );
}

const textareaClasse = 'w-full bg-black/20 border border-white/10 rounded-md p-2 text-base md:text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-rose-500/50 resize-none';

/**
 * Assistente do passo da mensagem.
 * - A sugestão nunca entra no texto sem a pessoa clicar em "Usar este texto".
 * - Se já houver texto, pede confirmação antes de substituir; depois, permite desfazer.
 * - Se a API falhar, mostra 3 modelos editáveis.
 */
export function AssistenteMensagem({ mensagem, onMensagemChange, rascunhoId }) {
    const [aberto, setAberto] = useState(() => !mensagem?.trim());
    const [form, setForm] = useState(FORM_INICIAL);
    const [estado, setEstado] = useState('idle'); // idle | carregando | sugestao | erro | recusado
    const [sugestao, setSugestao] = useState('');
    const [erro, setErro] = useState('');
    const [confirmar, setConfirmar] = useState(null); // texto aguardando confirmação de substituição
    const [desfazer, setDesfazer] = useState(null); // { anterior, aplicado }
    const abortRef = useRef(null);

    // Se a pessoa editar o texto depois de aplicar, o "Desfazer" deixa de valer.
    useEffect(() => {
        if (desfazer && mensagem !== desfazer.aplicado) setDesfazer(null);
    }, [mensagem, desfazer]);

    useEffect(() => () => abortRef.current?.abort(), []);

    const atualizar = (campo, valor) => setForm((f) => ({ ...f, [campo]: valor }));
    const podeGerar = form.quemEscreve.trim() && form.paraQuem.trim() && estado !== 'carregando';

    async function gerar(versaoAnterior) {
        if (!podeGerar) return;
        abortRef.current?.abort();
        const controller = new AbortController();
        abortRef.current = controller;
        const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

        setEstado('carregando');
        setErro('');
        setConfirmar(null);
        try {
            const resposta = await fetch('/api/gerar-mensagem', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                signal: controller.signal,
                body: JSON.stringify({ ...form, versaoAnterior: versaoAnterior || undefined, rascunhoId }),
            });
            const corpo = await resposta.json().catch(() => ({}));
            if (resposta.ok && corpo.mensagem) {
                setSugestao(corpo.mensagem);
                setEstado('sugestao');
                return;
            }
            if (resposta.status === 422 || resposta.status === 400) {
                setErro(corpo.message || 'Revise o que foi digitado e tente de novo.');
                setEstado('recusado');
                return;
            }
            setErro(corpo.message || 'O assistente está indisponível agora.');
            setEstado('erro');
        } catch {
            setErro('Não conseguimos falar com o assistente agora. Verifique sua conexão.');
            setEstado('erro');
        } finally {
            clearTimeout(timer);
        }
    }

    function aplicar(texto) {
        if (mensagem?.trim() && mensagem !== texto) {
            setConfirmar(texto);
            return;
        }
        efetivar(texto);
    }

    function efetivar(texto) {
        setDesfazer({ anterior: mensagem || '', aplicado: texto });
        onMensagemChange(texto);
        setConfirmar(null);
        setSugestao('');
        setEstado('idle');
        setAberto(false);
    }

    function voltar() {
        if (!desfazer) return;
        onMensagemChange(desfazer.anterior);
        setDesfazer(null);
    }

    function escreverDoMeuJeito() {
        abortRef.current?.abort();
        setAberto(false);
        setEstado('idle');
        setSugestao('');
        setConfirmar(null);
    }

    return (
        <div className="space-y-3">
            {desfazer && (
                <div role="status" className="flex items-center justify-between gap-3 rounded-lg border border-green-500/30 bg-green-500/10 px-3 py-2 text-sm text-green-200">
                    <span className="flex items-center gap-2"><Check className="h-4 w-4 shrink-0" /> Texto aplicado. Você pode editar à vontade.</span>
                    <button type="button" onClick={voltar} className="min-h-[40px] px-2 font-medium underline underline-offset-4 hover:text-white">
                        Desfazer
                    </button>
                </div>
            )}

            {!aberto ? (
                <Button type="button" variant="secondary" className="w-full min-h-[44px]" onClick={() => setAberto(true)}>
                    <Wand2 className="mr-2 h-4 w-4" /> Escrever com ajuda da IA
                </Button>
            ) : (
                <section aria-label="Assistente de mensagem" className="rounded-xl border border-rose-500/20 bg-rose-500/5 p-4 space-y-4">
                    <div className="flex items-start justify-between gap-3">
                        <div>
                            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                                <Wand2 className="h-4 w-4 text-rose-400" /> Escrever com ajuda da IA
                            </h3>
                            <p className="text-xs text-gray-400 mt-1">
                                Conte alguns detalhes reais e receba uma sugestão. Você revisa antes de usar.
                            </p>
                        </div>
                        <button type="button" onClick={escreverDoMeuJeito} aria-label="Fechar assistente" className="p-2 -m-2 text-gray-400 hover:text-white">
                            <X className="h-4 w-4" />
                        </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <Campo id="ia-quem" rotulo="Seu nome">
                            <Input id="ia-quem" value={form.quemEscreve} maxLength={LIMITES.nome}
                                onChange={(e) => atualizar('quemEscreve', e.target.value)} placeholder="Ex.: Ana" />
                        </Campo>
                        <Campo id="ia-para" rotulo="Nome de quem você ama">
                            <Input id="ia-para" value={form.paraQuem} maxLength={LIMITES.nome}
                                onChange={(e) => atualizar('paraQuem', e.target.value)} placeholder="Ex.: João" />
                        </Campo>
                    </div>
                    <Campo id="ia-conheceram" rotulo="Como vocês se conheceram" opcional>
                        <textarea id="ia-conheceram" rows={2} className={textareaClasse} maxLength={LIMITES.comoSeConheceram}
                            value={form.comoSeConheceram} onChange={(e) => atualizar('comoSeConheceram', e.target.value)}
                            placeholder="Ex.: na fila do show, quando choveu" />
                    </Campo>
                    <Campo id="ia-memoria" rotulo="Uma memória marcante" opcional>
                        <textarea id="ia-memoria" rows={2} className={textareaClasse} maxLength={LIMITES.memoria}
                            value={form.memoria} onChange={(e) => atualizar('memoria', e.target.value)}
                            placeholder="Ex.: a viagem em que o carro quebrou e a gente riu o dia todo" />
                    </Campo>
                    <Campo id="ia-admiracao" rotulo="O que você mais admira nessa pessoa" opcional>
                        <textarea id="ia-admiracao" rows={2} className={textareaClasse} maxLength={LIMITES.admiracao}
                            value={form.admiracao} onChange={(e) => atualizar('admiracao', e.target.value)}
                            placeholder="Ex.: a paciência e o jeito de cuidar de todo mundo" />
                    </Campo>
                    <div className="space-y-2">
                        <span className="block text-xs font-medium text-gray-300">Tom</span>
                        <Escolha rotulo="Tom" opcoes={TONS} valor={form.tom} onChange={(v) => atualizar('tom', v)} />
                    </div>
                    <div className="space-y-2">
                        <span className="block text-xs font-medium text-gray-300">Tamanho</span>
                        <Escolha rotulo="Tamanho" opcoes={TAMANHOS} valor={form.tamanho} onChange={(v) => atualizar('tamanho', v)} />
                    </div>

                    {estado !== 'sugestao' && (
                        <Button type="button" className="w-full min-h-[44px]" disabled={!podeGerar} onClick={() => gerar()}>
                            {estado === 'carregando'
                                ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Escrevendo sua sugestão...</>
                                : <><Wand2 className="mr-2 h-4 w-4" /> Gerar sugestão</>}
                        </Button>
                    )}
                    {!form.quemEscreve.trim() || !form.paraQuem.trim() ? (
                        <p className="text-xs text-gray-500">Preencha os dois nomes para gerar.</p>
                    ) : null}

                    <div aria-live="polite" className="space-y-3">
                        {estado === 'sugestao' && sugestao && (
                            <div className="rounded-lg border border-white/10 bg-black/30 p-3 space-y-3">
                                <p className="text-xs font-medium uppercase tracking-wider text-rose-300">Sugestão</p>
                                <p className="text-sm text-gray-100 whitespace-pre-line leading-relaxed">{sugestao}</p>

                                {confirmar === sugestao ? (
                                    <ConfirmarSubstituicao onSim={() => efetivar(sugestao)} onNao={() => setConfirmar(null)} />
                                ) : (
                                    <div className="flex flex-col sm:flex-row gap-2">
                                        <Button type="button" className="flex-1 min-h-[44px]" onClick={() => aplicar(sugestao)}>
                                            <Check className="mr-2 h-4 w-4" /> Usar este texto
                                        </Button>
                                        <Button type="button" variant="secondary" className="flex-1 min-h-[44px]" onClick={() => gerar(sugestao)}>
                                            <RotateCcw className="mr-2 h-4 w-4" /> Gerar outra
                                        </Button>
                                        <Button type="button" variant="ghost" className="flex-1 min-h-[44px]" onClick={escreverDoMeuJeito}>
                                            <PenLine className="mr-2 h-4 w-4" /> Escrever do meu jeito
                                        </Button>
                                    </div>
                                )}
                            </div>
                        )}

                        {estado === 'recusado' && (
                            <p role="alert" className="flex gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-100">
                                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" /> {erro}
                            </p>
                        )}

                        {estado === 'erro' && (
                            <ModelosProntos
                                erro={erro}
                                paraQuem={form.paraQuem}
                                confirmar={confirmar}
                                onUsar={aplicar}
                                onConfirmar={efetivar}
                                onCancelar={() => setConfirmar(null)}
                                onTentarDeNovo={() => gerar()}
                            />
                        )}
                    </div>

                    <p className="text-xs text-gray-500 text-center">
                        Usamos IA para sugerir o texto. <a href="/privacidade" target="_blank" rel="noopener noreferrer" className="underline underline-offset-4 hover:text-rose-300">Saiba mais</a>
                    </p>
                </section>
            )}
        </div>
    );
}

function ConfirmarSubstituicao({ onSim, onNao }) {
    return (
        <div role="alertdialog" aria-label="Substituir o texto" className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 space-y-2">
            <p className="text-sm text-amber-100">Isso vai substituir o que você já escreveu. Você poderá desfazer depois.</p>
            <div className="flex flex-col sm:flex-row gap-2">
                <Button type="button" className="flex-1 min-h-[44px]" onClick={onSim}>Substituir</Button>
                <Button type="button" variant="secondary" className="flex-1 min-h-[44px]" onClick={onNao}>Manter o meu</Button>
            </div>
        </div>
    );
}

function ModelosProntos({ erro, paraQuem, confirmar, onUsar, onConfirmar, onCancelar, onTentarDeNovo }) {
    const modelos = modelosMensagem(paraQuem);
    return (
        <div className="space-y-3">
            <div role="alert" className="flex items-start justify-between gap-3 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-100">
                <span className="flex gap-2"><AlertCircle className="h-4 w-4 shrink-0 mt-0.5" /> {erro} Enquanto isso, comece por um destes modelos e edite do seu jeito:</span>
            </div>
            {modelos.map((m) => (
                <div key={m.id} className="rounded-lg border border-white/10 bg-black/30 p-3 space-y-2">
                    <p className="text-xs font-medium uppercase tracking-wider text-gray-400">{m.titulo}</p>
                    <p className="text-sm text-gray-200 leading-relaxed">{m.texto}</p>
                    {confirmar === m.texto ? (
                        <ConfirmarSubstituicao onSim={() => onConfirmar(m.texto)} onNao={onCancelar} />
                    ) : (
                        <Button type="button" variant="secondary" className="w-full min-h-[44px]" onClick={() => onUsar(m.texto)}>
                            Usar este modelo
                        </Button>
                    )}
                </div>
            ))}
            <Button type="button" variant="ghost" className="w-full min-h-[44px]" onClick={onTentarDeNovo}>
                <RotateCcw className="mr-2 h-4 w-4" /> Tentar a IA de novo
            </Button>
        </div>
    );
}
