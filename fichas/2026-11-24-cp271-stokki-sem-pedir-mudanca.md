# cp271 — Stokki sem "Pedir mudança à Amanda" por plataforma; a combinação com a Amanda aparece no próprio retirar

Pedido (Chris, 24/11): "Pode" — resposta à proposta da CP270 de tirar da Stokki o "Pedir mudança à Amanda" (vídeo do tablet da Cecília:
o bloco "Organização desta publicação" repete o botão em cada plataforma de cada cartão).
Unidade: 1 · Tipo: ajuste (simplificação da tela), sem mudança de regra.

Retrato (código + export só leitura de 23/11):
- o botão abria `solicitar_excecao` com tipo `agendar` — depois da CP269 agendar em qualquer data não pede exceção: sem função;
- o mesmo formulário também serve para `cancelar` (retirar sem publicar), que AINDA pede a Amanda quando há orientação dela
  (`validarOperacaoProgramacaoI165`; stokki.mjs:30 'retirar' → 'cancelar'). Tirar o botão sem outra saída deixaria "A Amanda precisa
  decidir esta mudança" sem botão (regra 2b da árvore) → a saída vai para o lugar onde a necessidade aparece: a conferência do retirar;
- dados: 24 controles da Stokki, **0 com orientação** da Amanda (hoje nenhuma retirada da Stokki precisa dela);
- cada cartão também mostrava "Pedidos e recados da Amanda — Nenhum pedido registrado" (uma consulta por cartão).

Árvore:
RAIZ: `anexarStokki` (gs-postagem-controles-i165.mjs) — bloco por cartão do painel da Stokki
├─ LEITORES/HUMANOS: Cecília e Chris (viam o botão por plataforma), Amanda (orientar a data; conferir diferença de datas)
├─ SAÍDA PRESERVADA: retirar com orientação → "Combinar esta retirada com a Amanda" na conferência do retirar (mesmo padrão e mesmo
│  handler `data-fato165-pedir` do "Encerrar sem publicação" das postagens comuns, agora com a plataforma)
├─ PEDIDOS JÁ ABERTOS: continuam na fila da Amanda e no histórico do cartão quando existem
├─ SERVIDOR/RULES/FUNCTIONS: sem mudança
└─ HASH: gs-postagem-controles-i165.mjs → escritorio.html

Mudança:
1. Bloco "Organização desta publicação" só para a Amanda ("Definir data, semana e prioridade" + "Conferir diferença de datas" onde há prova);
   sem "Pedir mudança à Amanda".
2. Conferência do retirar (Stokki): "Combinar esta retirada com a Amanda" abre o pedido de retirada DESTA plataforma.
3. "Pedidos e recados da Amanda" só aparece no cartão da Stokki quando há pedido.
O que NÃO muda: a ficha das postagens comuns (fora deste pedido), regra de agendar/retirar, pedidos já abertos, decisões da Amanda.

Testes: J126 (nova) — vermelha no main (bloco e 2 "Pedir mudança à Amanda" no cartão da Cecília; retirar sem a combinação); com a mudança 4/4.
Vizinhas J25, J116, J124 (CP269), J88, J121: 32/32 com a J126. Celular e bateria no CI.
Achado à parte (não entra aqui): 8 pedidos "Não precisa mais agendar" pendentes com a Amanda (09–17/11; Bluefit 6, Fedalto 1,
Vitalle 1) apontam para postagens já arquivadas sem postagem — pedido que perdeu o objeto e não fecha sozinho.
