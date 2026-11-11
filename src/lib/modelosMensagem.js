// Modelos prontos para quando o assistente de IA estiver indisponível.
// Linguagem sem gênero para quem escreve. Os trechos entre [colchetes] são para a pessoa trocar.

export function modelosMensagem(paraQuem) {
    const nome = paraQuem?.trim() || 'Meu amor';
    return [
        {
            id: 'memoria',
            titulo: 'Começando por uma lembrança',
            texto: `${nome}, tem um momento nosso que eu nunca esqueço: [conte aqui um momento que vocês viveram]. Toda vez que lembro dele, sinto de novo a sorte que é ter você por perto. Você deixa os meus dias mais leves, e eu quero que esta página guarde isso.`,
        },
        {
            id: 'admiracao',
            titulo: 'Falando do que você admira',
            texto: `${nome}, eu admiro muito [algo que você admira em ${nome}]. Desde que a gente se conheceu [como vocês se conheceram], você me ensina a ver as coisas com mais calma e mais carinho. Agradeço por cada dia ao seu lado.`,
        },
        {
            id: 'leve',
            titulo: 'Leve e bem-humorado',
            texto: `${nome}, você [uma mania engraçada de ${nome}], e mesmo assim (ou justamente por isso) eu escolho você todos os dias. Com você até os dias comuns ficam divertidos. Ainda bem que a gente se encontrou.`,
        },
    ];
}
