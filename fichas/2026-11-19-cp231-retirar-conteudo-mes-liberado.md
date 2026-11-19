# cp231-retirar-conteudo-mes-liberado — retirar conteúdo normal de mês liberado; ajuste devolvido sempre tem saída
Pedido original: "1) RETIRAR CONTEÚDO NORMAL DE UM MÊS JÁ LIBERADO" (Chris, 19/11; Cookiery 2026-11, dia 23).
Unidade: U1 de 2 · Tipo: erro (a liberação travava) + ajuste (CP219 passa a valer para conteúdo normal)
Sintoma: o ajuste interno devolvido do dia 23 ("pode excluir também do calendário") não tinha saída; a retirada aceitava só peça adicional; a liberação ficava presa e os dias 21, 25 e 26 aprovados não chegavam ao cliente.
Reprodução: J84 no main → a liberação diz só "conclua e envie à Amanda"; `retirar_cp231` é desconhecida.
Causa-raiz: functions-get/ajustes-internos-cp123.mjs iniciar: `if(retirar&&!idAdicionalCp142(...))return recusar(...)`; nenhum caminho encerra um ajuste devolvido.

Árvore:
RAIZ: calendarios_ajustes_internos_cp123 (estado/tipoAjuste) → liberação (prepararPublicacaoInternosCp123)
├─ ESCRITORES  : operarInternoCp123 (iniciar; novas ações retirar_cp231 e descartar_cp231)
├─ LEITORES    : DTO internosCp123 (capacidades retirarCp231/descartarCp231, avisoFilaCp231, motivos); gs-ajustes-internos-cp123.mjs
├─ PAPÉIS      : Chris pede/descarta; Amanda revisa e libera; cliente deixa de ver o conteúdo após a liberação
├─ RULES       : sem mudança (coleção só do servidor)
├─ CONTRATO    : editorial-contrato-i172 (ações + motivo obrigatório); tela: lista EDITORIAL de gs-central-preparacao-http-r80.mjs (lição CP226b)
├─ LEGADO      : estado 'substituido' já é ignorado pela liberação e escondido no quadro; o descarte reaproveita com `descarteCp231`
└─ EFEITO      : postagens lidas (só leitura) para bloquear agendada/publicada e avisar sobre vídeo na fila

Mudança: retirada para conteúdo normal (bloqueio de postagem agendada/publicada; aviso para vídeo na fila: quem arquiva é a Amanda, CP228); ajuste em preparação ou devolvido vira retirada no mesmo registro (`substituidoPorRetiradaCp231` com o anterior) ou é descartado com motivo; a mensagem de bloqueio lista as saídas.
O que NÃO muda: peça adicional (CP219), vídeo, arquivo do Drive, postagem, outros conteúdos; retirar pelo editor continua desligado em mês liberado.
Testes: J84 (7 casos, descarte pela tela; vermelha no main 2/4), vizinhas J06/J55/J56/J60*/J62/J67/J71/J75 54/54, J84 --movel 9/9.
Publicação: Functions antes da tela (ok nominal do Chris). Caso real: Cookiery 2026-11, retirar o dia 23.
