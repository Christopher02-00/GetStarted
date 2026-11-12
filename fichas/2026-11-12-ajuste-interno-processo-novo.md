# ajuste-interno-processo-novo — mês liberado do processo novo aceita conteúdo novo e ajuste interno (CP208)
Pedido original (literal): "Não dá para incluir conteúdo novo num mês FUTURO que já foi liberado ao cliente. Caso real: Fedalto
Eletro Comercial · dezembro de 2026 … A Amanda pediu 2 carrosséis novos (dias 8 e 22) e não há como adicionar."
Unidade: U1 de 1 · Tipo: ajuste (contraria a regra CP140 — decisão do Chris em 12/11: "Sim, mude e publique")
Reprodução: J60 no código antigo — quadro "Preparação para gravação", servidor `adicionar=false`, `preparacaoSomenteCp140=true`.
Causa-raiz: não é mês futuro nem quantidade. Place 2026-11 foi montado na continuidade antiga (`modo:'continuar_legado'`);
Fedalto 2026-12 no processo novo I155 (ciclo sem `modo`). A regra CP140 (functions-get/ajustes-internos-cp123.mjs) deixava o mês
liberado do processo novo só com a preparação pública; a inclusão (CP142) exigia `continuar_legado` (também em adicao-interna-cp142.mjs);
o editor só montava o quadro quando o servidor dizia "só preparação".
Árvore: RAIZ ajustes_internos_cp123 + ciclo I155 · ESCRITORES Chris (rascunho/salvar/enviar), Amanda (decidir, publicar) ·
LEITORES editor oficial (gs-editor-calendario-central-i172 → gs-ajustes-internos-cp123), fila de ajustes, retrato liberado, cópia
do cliente (CP200), entrega do ciclo (publicacaoAtual, CP203) · RULES sem mudança · LEGADO registros de preparação com
`preparacaoI155Cp140` continuam só preparação; continuidade antiga igual.
Mudança: servidor — processo novo com escopo completo (registro novo marcado `origemI155Cp208`), inclusão aceita, sinal
`processoNovoCp208`; substituição editorial segue só na continuidade antiga. Tela — "só preparação" passa a ser o que o servidor diz;
botão de inclusão e envio do tipo de ajuste liberados no processo novo; editor monta o quadro pelo sinal novo.
O que NÃO muda: base do ciclo I155, rules, publicação (continua pela entrega do ciclo), continuidade antiga.
Testes: J60 (tela + rascunho → Amanda aprova → libera; retrato, cópia do cliente e entrega do ciclo) vermelha antes, verde depois;
J06/J56 junto; portão completo + --movel.
Risco residual: se o Chris abrir uma rodada nova do ciclo (novo documento), a peça incluída aqui não está no documento-base —
conferir na rodada. Publicação de functions com ok nominal do Chris (12/11).
