# cp230-amanda-aprova-videos — a Amanda aprova a qualidade dos vídeos, como o Chris
Pedido original (literal): "precisamos deixar que seja possivela para a amanda aprovar videos assim como eu faco"
Unidade: U1 de 1 · Tipo: ajuste (muda a regra CP108)
Sintoma: em Gerência → Aprovar vídeos, a Amanda recebe "A revisão principal de qualidade é do Chris. A Amanda organiza a postagem na fila dela." (servidor) ou "Novas aprovações de qualidade são do Chris." (tela).
Causa-raiz: regra CP108, "aprovação de qualidade só do Chris", gravada em 3 pontos.

Árvore:
RAIZ: aprovação de qualidade (videos_producao: aguardando_aprovacao → aguardando_cliente)
├─ ESCRITORES  : functions-get/aprovacao.mjs prepararAprovacaoVideoI165 + aprovarVideoI165 (servidor, programação ativa);
│                escritorio.html aprovarVideo / aprovarVideosSelecionados (caminho antigo)
├─ LEITORES    : gs-operacional-ui-i165.mjs tratarAprovacao (1 clique só para o Chris); lista "Aprovar vídeos"
├─ PAPÉIS      : Chris (hoje), Amanda (passa a aprovar); editores e Cecília continuam sem aprovar
├─ RULES       : sem mudança (com a programação ativa, a escrita é pelo servidor)
├─ AUTOMAÇÕES  : modo automático do cliente segue igual depois da aprovação
├─ LEGADO      : recibo continua com tipo 'qualidade_chris_cp108' (nome de dado, não de pessoa); aprovadoPor = quem aprovou
└─ EFEITO      : depois da aprovação, nada exige aprovadoPor==='Chris' (conferido por grep em telas, servidor e rules)

Mudança: liberar 'Amanda' no servidor (preparar e aprovar), no módulo da tela (1 clique; para a Amanda a tela tenta primeiro a
preparação de qualidade e, se o vídeo não está esperando qualidade, segue para a orientação de postagem dela) e na lista
"Aprovar vídeos" (a Amanda passa a ver a mesma lista e os mesmos botões do Chris, em vez do bloco só de leitura).
O que NÃO muda: orientação de postagem da Amanda, confirmação do cliente, pedido de correção, rules.
Testes: J83 nova (vermelha no main: sem botão; verde 13/13 com J04/J31/J40); vizinhas J04/J25/J31/J32/J33/J40/J43/J59/J83 33/33; --movel 4/4.
Publicação: deploy das Functions (ok nominal do Chris) antes do merge da tela.
Regra vigente avisada: CP108 dizia "só o Chris"; o Chris pediu a mudança nesta conversa.
