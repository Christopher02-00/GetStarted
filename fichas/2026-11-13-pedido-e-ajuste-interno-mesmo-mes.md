# pedido-e-ajuste-interno-mesmo-mes — pedido do cliente e ajuste interno no mesmo mês não se travam (CP215)
Pedido original (literal): "O mês ficou travado porque dois caminhos de ajuste no mesmo mês estão se bloqueando … Fedalto Eletro Comercial · 2026-12".
Unidade: U1 de 1 · Tipo: erro
Reprodução: produção RO 13/11 — Fedalto 2026-12 (processo novo I155): marca `ajuste_interno` por 'Cliente' (pedidos de 13/11 10:02);
2 peças adicionais CP142 versão 2 "enviado", com `basePublicacao.hash` IGUAL à publicação atual (15e9b0c8…, 11/11 20:42).
A trava não era base antiga: `publicacaoI155CoerenteCp140`/`baseValida` exigiam a marca 'liberado' → com o pedido aberto a base dos
ajustes internos ficava inválida ("A publicação deste mês mudou…"), a Amanda não tinha "aprovar"; e `resumoInternosCp123` contava as
correções aprovadas dos pedidos como "outra versão editorial" → a liberação dos pedidos ficava bloqueada. J60b no código antigo
reproduz as duas mensagens.
Decisão (menor diff): uma única liberação leva os dois juntos quando os dois estiverem aprovados — o caminho de publicação já
prepara pedidos (CP121) e ajustes internos (CP123) na mesma operação.
Mudança (functions-get/ajustes-internos-cp123.mjs): (1) a base vale com o mês em ajuste por pedido do cliente (`pedidoClienteAbertoCp215`);
(2) a comparação ignora os conteúdos dos pedidos abertos (conferidos pela revisão CP112/CP121); (3) motivos dizem QUEM faz O QUÊ;
(4) "Trazer para a versão atual" (`central_editor_interno_rebase_cp123`): rascunho sobre publicação anterior ganha registro na base atual
com o mesmo texto (volta a rascunho), o anterior fica `substituido` no histórico. Tela: aviso + botão + campos que diferem do publicado.
editorial-contrato-i172.mjs: ação nova na lista. `?v=` em cascata.
O que NÃO muda: rules; pedidos do cliente; publicação; conteúdo já liberado.
Testes: J60b (Fedalto no processo novo) e J67 (trazer para a versão atual) vermelhas antes, verdes depois; portão + --movel.
Fedalto 2026-12: sem escrita minha — depois do deploy, a Amanda aprova os 2 carrosséis e clica "Liberar correções ao cliente" (leva os 2
pedidos aprovados e os 2 carrosséis). Deploy de functions com ok nominal do Chris.
