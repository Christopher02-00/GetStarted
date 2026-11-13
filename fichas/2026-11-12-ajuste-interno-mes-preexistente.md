# ajuste-interno-mes-preexistente — mês liberado antes do registro editorial aceita ajuste interno (CP210)
Pedido original (literal): "Cookiery · novembro de 2026 travado para ajuste interno … o quadro 'Ajustes internos' não oferece
nenhum conteúdo para ajustar … Descobrir qual condição falha nesse ciclo e corrigir a causa, sem afrouxar a conferência para os outros clientes."
Unidade: U1 de 2 · Tipo: erro
Reprodução: produção RO 12/11 — `continuidade_calendarios_i164/2026-11__cookiery`: `editorialI172 = {fase:'publicada', rodada:0, revisao:1}`,
sem histórico, sem `publicacaoAtual`, sem `publicacaoPreservadaCp129`; marca liberada pela Amanda em 16/10 (antes do registro I172).
`provaPublicacaoCorrecaoTxCp115` e `provaPublicacaoAdotadaCp129` → null → `baseValida` falso → `aptos=[]`, `adicionar=false`.
Divina/Place funcionam porque foram republicadas pela Central em 11/11 e 13/11 (têm `publicacaoAtual`).
Alcance: 28 continuidades nesse estado; 11 meses de novembro liberados (Cookiery, Camargo's, Dom Carv, Dra Júlia, Fior, iPhone
Campo Largo, Little Elephant, Master Chef, Verde Limão Kids, Vip, Vitalle) — todos com retrato coerente (aprovadoEm === publicadoEm).
Causa-raiz: a continuidade foi semeada como "publicada" para meses já liberados, sem a prova que o CP123 exige.
Mudança: functions-get/ajustes-internos-cp123.mjs — `provaRetratoPreexistenteCp210` só quando a continuidade está INTOCADA
(publicada, rodada 0, sem histórico, sem publicacaoAtual, sem adoção CP129, sem correção CP115) e a marca/retrato são coerentes;
`baseValida` aceita essa prova somente nesse estado. Depois da primeira publicação pela Central, volta a valer a prova de sempre.
O que NÃO muda: meses com publicação registrada (Divina, Place), processo novo I155, rules, dados.
Testes: J62 (estado real da Cookiery no ensaio: aptos + inclusão; ajuste → Amanda aprova → libera → publicação registrada) vermelha
antes, verde depois; diagnóstico RO em produção: Cookiery passa a mostrar "Dia 20 · Trend caminho"; Divina/Place iguais. Portão + --movel.
Publicação: functions com ok nominal do Chris.
