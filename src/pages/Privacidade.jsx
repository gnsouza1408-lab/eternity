import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Rodape } from '../components/Rodape';
import { RESPONSAVEL, EMAIL_SUPORTE, WHATSAPP_SUPORTE, SITE, POLITICA_ATUALIZADA_EM } from '../lib/contato';

function Secao({ titulo, children }) {
    return (
        <section className="space-y-3">
            <h2 className="font-serif text-2xl font-bold text-white">{titulo}</h2>
            <div className="space-y-3 text-gray-300 leading-relaxed">{children}</div>
        </section>
    );
}

export default function Privacidade() {
    useEffect(() => {
        const anterior = document.title;
        document.title = 'Política de Privacidade | Eternity';
        window.scrollTo(0, 0);
        return () => { document.title = anterior; };
    }, []);

    return (
        <div className="min-h-screen py-16 px-4 relative z-10">
            <div className="max-w-2xl mx-auto">
                <Link to="/" className="inline-flex items-center gap-2 min-h-[44px] text-sm text-gray-400 hover:text-white mb-6">
                    <ArrowLeft className="h-4 w-4" /> Voltar para o início
                </Link>

                <h1 className="font-serif text-4xl font-bold mb-2">Política de Privacidade</h1>
                <p className="text-sm text-gray-500 mb-8">Atualizada em {POLITICA_ATUALIZADA_EM}</p>

                <Card className="space-y-8">
                    <p className="text-gray-300 leading-relaxed">
                        Aqui explicamos, em linguagem simples, quais dados o {SITE} recebe, para que usamos e com quem eles passam.
                        Tentamos escrever só o que de fato acontece.
                    </p>

                    <Secao titulo="Quem é o responsável">
                        <p>{RESPONSAVEL}. Para falar sobre seus dados: <a className="text-rose-400 underline underline-offset-4" href={`mailto:${EMAIL_SUPORTE}`}>{EMAIL_SUPORTE}</a> ou pelo <a className="text-rose-400 underline underline-offset-4" href={WHATSAPP_SUPORTE} target="_blank" rel="noopener noreferrer">WhatsApp</a>.</p>
                    </Secao>

                    <Secao titulo="Quais dados recebemos">
                        <ul className="list-disc pl-5 space-y-2">
                            <li><strong className="text-white">Seu e-mail</strong>, para identificar o pagamento e ajudar a recuperar o portal. Ele não aparece no portal.</li>
                            <li><strong className="text-white">O conteúdo do portal</strong>: link escolhido, título, data, mensagem, fotos, emoji, e o link e o nome da música (plano Completo).</li>
                            <li><strong className="text-white">Dados do pagamento</strong>: valor, situação e código do pagamento no Mercado Pago. Não recebemos nem guardamos dados de cartão ou de conta bancária.</li>
                            <li><strong className="text-white">Dados técnicos de acesso</strong> (como endereço IP e tipo de aparelho), que os serviços de hospedagem e de medição de anúncios registram quando você visita o site.</li>
                        </ul>
                        <p>Enquanto você monta o portal, um rascunho (inclusive as fotos e a mensagem) fica salvo <strong className="text-white">no seu próprio navegador</strong>, para você não perder o que escreveu. Ele sai de lá quando o pagamento é concluído ou quando você escolhe &quot;Começar novamente&quot;.</p>
                    </Secao>

                    <Secao titulo="Para que usamos">
                        <ul className="list-disc pl-5 space-y-2">
                            <li>Criar e exibir o seu portal para quem tiver o link.</li>
                            <li>Gerar o Pix, confirmar o pagamento e liberar o portal.</li>
                            <li>Responder ao suporte.</li>
                            <li>Medir visitas e compras vindas de anúncios (veja &quot;Com quem passam&quot;).</li>
                        </ul>
                    </Secao>

                    <Secao titulo="Assistente de IA">
                        <p>Se você usar &quot;Escrever com ajuda da IA&quot;, o que você digitar ali (os nomes, como vocês se conheceram, a memória, o que admira e o tom escolhido) é <strong className="text-white">enviado à Anthropic</strong>, empresa que fornece o modelo de IA, <strong className="text-white">só para gerar a sugestão de texto</strong>. Não enviamos suas fotos, seu e-mail nem a data.</p>
                        <p>A sugestão pode ter erros e é só uma sugestão: ela só entra no portal se você escolher usá-la. Para limitar abusos, guardamos, por <strong className="text-white">até 2 dias</strong>, apenas uma versão embaralhada (hash) do seu IP e um código aleatório do rascunho, junto com a hora do pedido. Não guardamos o IP em si, e o texto que você digitou no assistente não fica registrado por nós.</p>
                    </Secao>

                    <Secao titulo="Com quem passam">
                        <ul className="list-disc pl-5 space-y-2">
                            <li><strong className="text-white">Mercado Pago</strong>: processa o Pix. Recebe seu e-mail e o valor.</li>
                            <li><strong className="text-white">Supabase</strong>: banco de dados onde ficam o portal e as fotos.</li>
                            <li><strong className="text-white">Vercel</strong>: hospedagem do site.</li>
                            <li><strong className="text-white">Anthropic</strong>: somente o texto do assistente de IA, como descrito acima.</li>
                            <li><strong className="text-white">TikTok e Meta (Facebook/Instagram)</strong>: usamos os pixels deles para medir visitas e compras vindas de anúncios. Eles recebem dados de navegação, e o TikTok recebe também o evento de compra, só com o valor e a moeda: o link e o conteúdo do portal não são enviados. O uso desses dados segue as políticas dessas empresas.</li>
                        </ul>
                        <p>Não vendemos seus dados.</p>
                    </Secao>

                    <Secao titulo="Quem vê o seu portal">
                        <p>Depois de pago, o portal pode ser visto por <strong className="text-white">qualquer pessoa que tenha o link</strong> (ou o QR Code). Antes do pagamento, ele não é exibido. Por isso, não coloque no portal informações sensíveis ou que você não queira que outras pessoas vejam, e compartilhe o link só com quem você quiser.</p>
                    </Secao>

                    <Secao titulo="Por quanto tempo guardamos">
                        <p>O portal e seus dados ficam guardados enquanto o Eternity existir, porque o pagamento é único e o portal é para durar. Portais que ainda não foram pagos também ficam guardados, e hoje não há um prazo automático para apagá-los. Os registros de limite do assistente de IA duram até 2 dias.</p>
                    </Secao>

                    <Secao titulo="Seus direitos">
                        <p>Você pode pedir para saber quais dados temos sobre você, corrigir, ou <strong className="text-white">apagar o seu portal e os dados ligados a ele</strong>. É só escrever para <a className="text-rose-400 underline underline-offset-4" href={`mailto:${EMAIL_SUPORTE}`}>{EMAIL_SUPORTE}</a>, de preferência do mesmo e-mail que você usou, informando o link do portal. Esses pedidos são atendidos em até 15 dias.</p>
                    </Secao>

                    <Secao titulo="Mudanças nesta política">
                        <p>Se algo mudar no que fazemos com os dados, atualizamos esta página e a data no topo.</p>
                    </Secao>
                </Card>

                <div className="mt-10"><Rodape /></div>
            </div>
        </div>
    );
}
