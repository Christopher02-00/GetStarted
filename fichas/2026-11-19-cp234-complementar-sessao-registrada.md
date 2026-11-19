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

Achado no caminho (2º defeito do mesmo gesto): em sessão da Zeiss (grupo do Otávio) um vídeo marcado como "extra" quebrava o
"Confirmar identificação" (`Cannot read properties of null`) quando a etiqueta antiga de empresa estava vazia — o campo não é
desenhado e o diálogo lia `empresa.value`. Corrigido em `gs-identidade-conteudo-i106.mjs` (usa a empresa fixa do envio ou nenhuma).
Recibo pós-gravação também reconhece o complemento (antes dizia "não consegui confirmar o recibo").
Provas: J87 vermelha no main (sessão não aparece) → verde 4/4; vizinhas J03/J68/J82/J87 11/11; --movel 4/4.
