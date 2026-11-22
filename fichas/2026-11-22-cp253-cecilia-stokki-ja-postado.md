# cp253-cecilia-stokki-ja-postado — o "já postado" da Stokki responde onde a Cecília está olhando

Pedido (Chris, 22/11): "a Cecília reclamou … a parte onde ela coloca os conteúdos como já postado … assim que ela aperta o botão de já postado
ele bug, não sai de lá e não vai pra nenhum lugar, basicamente não acontece nada, como se travasse. Corrigir isso definitivamente".
Unidade: C1 (CP253) · Tipo: erro

Caso real (dados reais de 22/11, emulador, J108 com a fila verdadeira da Cecília):
- A fila "Publicações para conferir" tinha 15 linhas: 12 da Stokki (uma por plataforma, paradas desde 20/10) e 3 de clientes comuns.
- Clientes comuns: "✔ Saiu no horário" funciona (as 3 foram confirmadas).
- Stokki: "Conferir publicação real" abre o painel da Stokki. Lá, "Confirmar que publicou nesta plataforma" não mudava nada na tela e a postagem continuava sem publicação.
  - O retorno ("Confira a ação no formulário deste cartão") aparecia no topo do painel, fora da vista.

Causa-raiz (três peças do mesmo caminho):
1. A conferência de publicação (dia real, horário real, prova) era montada no FIM do cartão da postagem, abaixo de todas as plataformas e fora da vista.
2. Cada redesenho do painel (`painel.innerHTML`) recria os cartões sem a marca "veio da fila" (`data-publicacao-cp125`).
   - O `anexarStokki` então mostrava a recuperação em vez do formulário.
   - Ao remontar, colocava o formulário de novo no fim do cartão.
3. A mensagem ficava no topo do painel, longe do botão.

Árvore:
RAIZ: conferência de publicação por plataforma da Stokki (fluxo I165 'stokki', ação publicar)
├─ ESCRITORES : servidor (fluxo I165, inalterado) · tela: montagem do formulário (`montar`), painel da Stokki (`desenhar`)
├─ LEITORES   : fila CP125 da Cecília, painel da Stokki, Raio-X D2 (agendada vencida), faxina CP248 (a Stokki fica com a Cecília)
├─ PAPÉIS     : Cecília (confirma); Amanda e Chris (mesmo painel)
├─ RULES      : n.a. (servidor)
└─ EFEITO     : agendar, retirar e corrigir continuam como antes (o formulário só muda de lugar na confirmação de publicação)

Mudança (só tela):
- `escritorio.html` (`salvarAcaoStokkiI30`): usa o cartão do painel aberto e, na ação publicar, a plataforma clicada como lugar da conferência.
  - `abrirDestinoStokkiPostagemR83` grava a marca da fila também no painel, que sobrevive ao redesenho.
- `gs-postagem-controles-i165.mjs`:
  - `tratarStokki` aceita a marca do painel;
  - `anexarStokki` (a cada redesenho) remonta a conferência de publicação dentro da plataforma dela, com a marca do painel.
- `stokki-publicacao.mjs`: com a conferência aberta, a tela rola até ela e põe o foco no primeiro campo. A mensagem diz o que fazer.

O que NÃO muda: servidor; regras da conferência (CP110: reconferir a orientação depois de uma nova abertura); agendar, retirar e corrigir.
Testes:
- J25 4a: vermelha antes (formulário fora da plataforma e fora da vista), verde depois (na plataforma, à vista, também depois de um redesenho).
- J25, J33 e J61b: 28/28.
- J108 com os dados reais: cada linha da Stokki da fila verdadeira confirmada pela Cecília (resultado no PR).
Risco residual: depois de um redesenho a conferência pede "Atualizar esta proposta" (regra de segurança CP110). O botão fica à vista.
