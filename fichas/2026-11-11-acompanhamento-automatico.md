# acompanhamento-automatico — o Acompanhamento do Portal se atualiza sozinho (CP205)
Pedido original (literal): Amanda (áudio de 11/11, encaminhado pelo Chris): "a parte do acompanhamento … tem que ficar atualizando de forma manual e é bem complexo com bastante cliente … o sistema pode de forma automatizada identificar o período que seu vídeo … está em uma edição, em ajuste e atualizar em tempo real lá na aba do painel do cliente … ou quando você estiver criando análise … ir na linha do tempo e atualizando de forma automática." Chris: "Vamos aplicar … de uma maneira completa … sendo para todos funcional."
Unidade: 3 de 3 do pedido de 11/11 à tarde · Tipo: novo
Hoje: Portal → aba Acompanhamento lê processos_cliente/{slug}.timeline (getDoc, uma vez); só a equipe escreve (escritorio salvarEtapaAcomp), à mão.
Árvore:
RAIZ: processos_cliente/{slug}
├─ ESCRITORES: equipe à mão (timeline, etapaAtual, melhorias) · NOVO servidor (timelineAuto, etapaAtualAuto) — campos separados, sem disputa
├─ FONTES: videos_producao.status (aguardando_edicao, correcao, aguardando_cliente, aprovado; aguardando_aprovacao = interno, não entra) · postagens (agendado com data, postado) · calendarios.aprovacaoMeses (preparação / pedido do cliente / disponível) · analises_mensais_i108 (em elaboração / concluído) · agendamentos tipo gravacao (agendada, remarcada, realizada, cancelada)
├─ GATILHOS: novos acompanhamento{Video,Postagem,Analise,Gravacao}GetCp205; calendário no calendarioLegendaGetCp190
├─ LEITORES: Portal (agora onSnapshot, ao vivo, lista única ordenada); tela da equipe "Acompanhamento do Cliente" (mesma lista); "parado há 30 dias" passa a contar a atualização automática
├─ RULES: sem mudança (cliente lê só o próprio slug; só servidor/equipe gravam)
└─ PRIVACIDADE: frases fixas pensadas para o cliente; nunca motivo de ajuste, parecer, revisão interna, nome de quem revisou; empresa do grupo Otávio filtrada no Portal
Mudança: functions-get/acompanhamento-cliente-cp205.mjs + index.mjs (4 gatilhos + 1 linha no gatilho do calendário); portal-cliente.html (aba ao vivo); escritorio.html (lista da equipe).
Idempotência: uma entrada por mudança de estado de cada origem (o gatilho repetido não duplica); guarda as últimas 150.
Testes: J57 — vídeo sai da revisão interna para "pronto para aprovação" → frase no Acompanhamento do cliente sem texto interno; com a página aberta, vídeo aprovado e gravação agendada aparecem ao vivo. Vermelha no main, verde aqui.
Publicação: Functions (novos gatilhos) + Pages.
