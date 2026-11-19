# cp233-devolucao-pedido-nao-trava-internos — devolver um pedido do cliente não deixa os ajustes internos do mês sem saída
Pedido (Chris, 19/11): Fedalto 2026-12 — ajustes internos mandam usar "Trazer para a versão atual", mas o botão não existe; a Amanda não devolve o 16 nem libera.
Unidade: U1 · Tipo: erro (classe: qualquer devolução de pedido do cliente em mês liberado do processo novo)
Caso real (somente leitura, 19/11): marca 2026-12 = ajuste_interno, por 'Amanda', motivoAjuste da devolução das 10h18, pedidoAjusteOperationId do cliente;
o ciclo I155 teve a criação reaberta (enviadoRevisao:false) pela mesma devolução.
Reprodução: J86 (arquivo J60f), Bluefit 2026-12 processo novo, peças próprias → vermelho 13/16 no main com a MESMA mensagem da Fedalto.
Causa-raiz: CP112 `reabrirCalendario` (devolução) grava por 'Amanda' e reabre a criação; o servidor dos ajustes internos só reconhecia
"publicado com pedido aberto" com por 'Cliente' e exigia enviadoRevisao:true → base inválida → todo interno "a publicação mudou", sem
"Trazer" (rebase exige base válida), e a liberação (`entrega`) também exigia enviadoRevisao:true.

Todos os ramos (Passo 2b): ação nova n.a.; resposta nova n.a.; papéis Chris/Amanda ✅ (J86 por servidor e Amanda pela tela);
painel ✅ (Revisar este conteúdo abre o ajuste com Devolver); mensagem → saída existente ✅ ("Trazer" só quando disponível);
estado que trava ✅ (liberação volta); outros produtores ✅ (toda devolução CP112 passa por reabrirCalendario; processo antigo conferido: não trava).

Mudança: `pedidoClienteAbertoCp215` aceita por 'Cliente' ou 'Amanda' (com pedido do cliente e retrato publicado);
`publicacaoI155CoerenteCp140` aceita a criação reaberta nesse estado; a liberação (`entrega`) reativa enviadoRevisao da MESMA base
publicada (validador e campos da etapa permitem só isso); a mensagem de ajuste só cita "Trazer" quando o botão existe.
O que NÃO muda: dados de produção (a Fedalto destrava sem conserto no banco), textos, aprovações, pedidos.
Testes: J86 vermelha 13/16 → verde 16/16, --movel 16/16; vizinhas (CP112/CP123/CP219/CP231/CP232) 68/69 (J53 só sem a J52).
Publicação: Functions (ok nominal do Chris) + site.
