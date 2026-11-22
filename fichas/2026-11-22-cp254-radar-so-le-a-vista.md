# cp254-radar-so-le-a-vista — o Radar de Perdas só recalcula quando está na tela

Pedido (Chris, 22/11): "resolver o nosso problema com dados antigos … acúmulo de informação … que só pesa o sistema, deixa ele pesado
e acaba travando … tem que ser cirúrgico e assertivo". Unidade: L1-a (CP254) da varredura de acúmulo · Tipo: erro (peso)

Caso medido (ensaio com os dados reais de 22/11, sonda de rede + tempo):
- O Radar de Perdas (Gerência → Relatórios → Painel Operacional da Amanda; Resumo Executivo do Chris) recalcula a partir de 4 coleções
  inteiras (agendamentos, vídeos, postagens, stories: ~2.500 documentos) e 2 consultas ao servidor (acompanhamentos e demandas do Radar).
- Para a gestão, as 4 coleções vêm da memória dos ouvintes em tempo real (o Firestore reaproveita o alvo já aberto; a sonda não viu
  pedido novo ao servidor). O custo é no aparelho: montar e projetar tudo de novo e redesenhar o Radar. Medido: 12 s por recálculo.
- O agendamento roda a cada 60 s, no foco da janela, quando a aba volta a ficar visível e a cada mudança em tempo real.
- A condição só conferia se o elemento `.radar-i110` EXISTIA. Depois de aberto uma vez, ele fica no DOM (aba escondida) e o recálculo
  continuava em qualquer tela do Escritório, o dia inteiro, para a Amanda e para o Chris.
- A própria tela promete: "Atualiza automaticamente enquanto esta tela está aberta".

Causa-raiz: `agendarRadarI147` (escritorio.html) testava presença no DOM em vez de visibilidade.

Árvore:
RAIZ: agendamento do Radar (`agendarRadarI147` → `atualizarRadarI110` → `calcularRadarPerdas(true)`)
├─ ESCRITORES : nenhum (só leitura)
├─ LEITORES   : Painel Operacional (Amanda), Resumo Executivo (Chris); modal do Radar (`radarModalI110`, atualizado pela mesma função)
├─ PAPÉIS     : Chris e Amanda (os únicos com Radar)
├─ RULES      : n.a. (só leitura, mesmas coleções)
├─ GATILHOS   : intervalo 60 s, foco, visibilidade, `onDadosTempoRealMudaram`; botão "Atualizar Radar" (manual, inalterado)
└─ EFEITO     : fora da tela do Radar, nenhum recálculo; ao voltar (foco ou próximo ciclo) atualiza; ao abrir a aba, o próprio render recalcula

Mudança (só tela, 1 linha): a condição passa a exigir o Radar visível (`getClientRects().length>0`, vale também dentro de contêiner fixo no celular) e a aba do navegador visível.
O que NÃO muda: o cálculo, o botão "Atualizar Radar", a abertura da aba (que já recalcula), os dados.
Testes:
- J109 (nova): vermelha antes (2 recálculos com o Radar fora da tela em 65 s), verde depois (0 fora; ≥1 com o Radar à vista; também no celular, com a J04).
- Bateria inteira no CI (desktop e celular).
Risco residual: com o modal do Radar aberto por cima de outra tela, a atualização automática espera até o Radar voltar à vista
(o botão "Atualizar Radar" continua disponível).
