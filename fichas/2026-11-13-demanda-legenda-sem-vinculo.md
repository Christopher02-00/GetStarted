# demanda-legenda-sem-vinculo — vídeo aprovado sem conteúdo no calendário vira demanda de legenda da Amanda (CP214)
Pedido original (literal): "vídeo aprovado que não tem conteúdo no calendário passa a ter um caminho próprio de legenda, pela demanda da Amanda."
Decisão do Chris (13/11): proposta C da Amanda aprovada (a regra "primeiro liga ao calendário" ganha esta exceção). B (Amanda ajustar
título em mês liberado) NÃO entra — a CP214 resolve o caso dela.
Unidade: U2 de 2 · Tipo: novo
Árvore: RAIZ postagens (status aguardando_legenda, sem calendarItemId/referenciaLegendaI78/origemForaCalendario, com vídeo aprovado ou
material manual) · ESCRITOR novo gatilho `legendaSemVinculoGetCp214` (onDocumentWritten postagens/{id}) → `demandas/legenda_sem_vinculo_cp214_<postId>`
(id fixo = nunca duplica) · LEITORES Minhas Demandas da Amanda (`abrirDemandaMinha` → modal CP214) · SAÍDAS existentes: fila de legendas
(salvarLegenda — Amanda já pode pela CP209), ligação CP207 (`abrirReferenciaLegendaI78`), encerramento CP211 (painel I165) · FECHAMENTO
automático no mesmo gatilho quando a postagem deixa o estado (legenda → Cecília; ligado; não vai para o feed; retirada), com motivo em
`notaConclusao` e `fechamentoCp214` · RULES sem mudança (escrita pelo servidor) · NÃO mexe em calendário fechado, reabertura, pedidos de cliente.
Mudança: functions-get/legenda-sem-vinculo-cp214.mjs (novo) + gatilho em index.mjs; escritorio.html — modal da demanda com
"✍️ Escrever a legenda", "🔗 Este vídeo é de um conteúdo do calendário", "🚫 Não vai para o feed".
Testes: J66 (a) 1 demanda → legenda da Amanda vai para a Cecília e a demanda fecha; (b) ligar pela fila fecha; (c) não vai para o feed
encerra (CP211) e fecha; (d) reprocessar e mexer na postagem não duplica. Portão + --movel.
Produção (ok nominal do Chris): deploy de functions; depois, uma sincronização única dos 8 parados (lista conferida em 13/11: Dra Júlia
"3 procedimentos", Fior "cardápio" e "arte do delivery", iPhone "Vídeo substituído" 1–3, Master Chef "Vídeo substituído", Vitalle
"Aviso agenda"). Divina "Vídeo substituição" já não está mais em legenda.
