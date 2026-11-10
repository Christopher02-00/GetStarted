# legenda-calendario-chega-na-postagem (CP190) — a legenda corrigida no calendário chega à postagem
Pedido original (literal): "…se o que eu faço vai pra Amanda aprovar certinho e o que eles enviam chega pra mim certo também desde correções de legendas e etc…"
Unidade: V3 da auditoria do percurso (10/11) · Tipo: erro
Sintoma: a legenda é corrigida no calendário (Chris no editor, Amanda ou o cliente pelo link) depois que a postagem já nasceu. O Portal mostra o texto novo e a Cecília publica o antigo. Quando o cliente troca o texto, ninguém fica sabendo.
Reprodução: emulador. A J35 deu vermelho no código antigo ("postagem A: continua com a antiga · Chris: sem demanda" e "Cecília: sem demanda").
Causa-raiz:
- A postagem copia a legenda do calendário uma única vez, na aprovação do cliente (`confirmarAprovacaoClienteCore`, escritorio ~8937/9013).
- Os escritores que mexem no item depois disso não tocam na postagem: I172 (`editorial-calendarios-i172.mjs:123`), V134, CP115 e o cliente pelo link (I68, `calendario.html` ~4676).
- Não existe gatilho em `calendarios`, e o I68 não avisa ninguém.
Árvore:
RAIZ: calendarios/{slug}.items[].legenda × postagens/{id}.legenda
├─ ESCRITORES : I172, V134, CP115, I68 (cliente), programar.mjs (item manual)
├─ LEITORES   : fila da Cecília (postagens.legenda), Portal (calendário primeiro, gs-legenda-cliente-i95), Upload-Post
├─ HUMANOS    : Cecília (publica), Chris (confere o texto do cliente), cliente
├─ RULES      : nenhuma mudança (a Function grava com admin)
├─ AUTOMAÇÕES : novo gatilho `calendarioLegendaGetCp190` (onDocumentWritten calendarios/{slug})
└─ COLATERAL  : a assinatura da postagem muda quando ela é atualizada, então uma aba aberta da Cecília pede para reabrir (comportamento existente)
Mudança (decisão do Chris de 10/11):
- `functions-get/legenda-calendario-cp190.mjs` compara o antes e o depois de cada gravação do calendário e só olha o item cuja legenda mudou. Postagens ligadas: `calendarClienteSlug/ItemId/Competencia` ou `item.postagemId`.
- Postagem em `aguardando_agendamento` que ainda tem o texto antigo do calendário recebe o novo, se for legenda utilizável pelo I79, com o carimbo `legendaSincronizadaCp190`.
- Postagem `agendado`: a postagem não muda, e a Cecília recebe a demanda "Legenda mudou depois de agendada" com o texto novo.
- Postagem já corrigida direto (texto diferente do antigo do calendário): nada é sobrescrito, e o Chris recebe a demanda "Duas legendas diferentes".
- Comentário `texto_cliente_i68` novo: o Chris recebe a demanda "Cliente alterou o texto", com o antes e o depois.
- As demandas têm id determinístico (`cp190_*`) e são criadas em transação: nunca duplicam.
O que NÃO muda:
- `aguardando_legenda` continua oferecendo a legenda do calendário.
- Stokki (legenda por rede, escritor próprio) fica de fora.
- Postado, arquivado e cancelado ficam de fora.
- Nenhuma tela foi alterada.
Testes: J35 (A cliente pelo link, B agendada → Cecília, C correção direta preservada), vermelha → verde. Portão completo desktop e --movel.
Risco residual:
- Correções feitas na postagem ainda não voltam para o calendário/Portal (achado 3a da auditoria, unidade própria).
- O pedido de legenda pelo Portal (CP152) segue fora (achado 5).
