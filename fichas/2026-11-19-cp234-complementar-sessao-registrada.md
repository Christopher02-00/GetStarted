# cp234-complementar-sessao-registrada — 2º filmmaker envia o que filmou depois que o 1º já registrou a sessão
Pedido (Chris, 19/11, vídeo do Nathan): "o Natan prova que ainda não consegue subir as empresas que ele filmou … corrigir da origem".
Caso real (somente leitura): Zeiss 12/11, equipe Luís (filmmaker) + Nathan (2º). Luís registrou 5 vídeos e a sessão virou
`realizado` para os dois → some de "Qual gravação" do Nathan (vídeo: só aparecem as sessões da Juliane). Mesmo padrão em outras
sessões com 2 filmmakers. O atalho "Gravado avulso" (CP229) não resolvia: o Nathan quer enviar pela sessão que filmou.
Causa-raiz: `registrarGravacaoRealizadaNucleo` só aceita sessão `agendado`; o 1º registro encerra a sessão da equipe inteira.
Todos os ramos: lista do envio (renderMinhaAgendaFilmmaker), recusa no início, checagem na transação, gravação dos totais,
empresa do Otávio por vídeo (empresaExtras), ocupação da pauta (I28), rules de agendamentos.
Mudança: sessão `realizado` com o usuário na equipe, sem nenhum registro dele, até 21 dias → aparece "· complementar o envio";
os vídeos novos somam (conteudosRealizados/producao/qtd), `complementosCp234` guarda quem e quando; nada do 1º é alterado.
Testes: J87 (vermelha: a sessão não aparece; verde: soma, vídeo criado com o Nathan; contraprova: o Luís não vê complemento).
