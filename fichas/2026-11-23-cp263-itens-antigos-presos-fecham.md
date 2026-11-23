# cp263-itens-antigos-presos-fecham — avisos e decisões presos fecham sozinhos; os 18 antigos autorizados fecham

Pedido (Chris, 23/11): "tudo que for antigo do mês passado vc pode concluir … não quero que deixe nada que não é desse mês" e
"demandas que chegam e que nunca saem". Caixa de perguntas, 23/11: "Encerrar todos" (os 17 da Amanda) e "Pode continuar".
Unidade: C3 (CP263) · Tipo: erro (acúmulo sem saída) + encerramento autorizado

Caso real (dados de 22/11): 17 itens da Amanda em "aguardando aprovação", de agosto a outubro, e 1 da Cecília.
- 10 avisos "X está esperando você" (CP149): 8 com a tarefa de origem JÁ APROVADA, 1 com a origem APAGADA (Luís) e 1 de alerta recorrente da Cecília.
  O aviso só fechava quando a origem recebia uma decisão com data posterior; se a origem fechava por outro caminho, ficava preso para sempre.
- 4 decisões "liberar pular a legenda?" de agosto, todas de postagens já CANCELADAS.
- 3 entregas antigas: capa para destaque, conferir meninas da marmita Fior e vídeo do dia das crianças da Mochi.
- Cecília: "Vídeo retirado da sua fila: Place — Provador na rua", sem prazo.
- Onde apareciam: não nas telas da Amanda (acúmulo invisível para ela), mas no cartão "Demandas aguardando aprovação"
  da Central de Comando do Chris.

Árvore:
RAIZ: `executarEncerramentosCp263` (functions-get/encerramento-antigos-cp263.mjs), passo 1b da faxina CP248 (a cada 2 h)
├─ REGRAS     : aviso aguardando_resposta aberto cuja origem está encerrada/apagada/inexistente → fecha;
│               pular_legenda aberto cuja postagem está encerrada/apagada/inexistente → fecha
├─ AUTORIZADO : 18 ids fixos (lista mostrada ao Chris); fecham só se ainda abertos; nada fora da lista fecha por autorização
├─ ESCRITA    : status 'aprovada' (como a CP245), nota com o motivo, marca `encerramentoCp263` {tipo, em, statusAnterior, motivo}
├─ FICA ABERTO: aviso com a origem viva; decisão de postagem em andamento; entrega antiga fora da lista (nada é aprovado às cegas)
└─ LEITORES   : Central de Comando (cartão do Chris), Raio-X, relatório da faxina (totais.encerradosCp263)

Testes:
- J117 (nova), vermelha antes e verde depois (5/5):
  1. aviso com a origem encerrada ou apagada fecha; com a origem viva, fica;
  2. pular-legenda de postagem encerrada fecha; de postagem viva, fica;
  3. o item autorizado fecha com a nota; o que está fora da lista fica;
  4. repetir não muda nada;
  5. o cartão do Chris cai exatamente os 4 fechados (7 → 3; na contraprova ficou em 7).
- Vizinhas J102 e J97: 17/17.
- Bateria inteira no CI.
Risco residual: entregas antigas que esperam aprovação de alguém que já não aprova (fora da lista) continuam abertas.
Elas precisam de decisão. Próximo passo (aprovações em lote): a Amanda e o Chris aprovam várias de uma vez.
