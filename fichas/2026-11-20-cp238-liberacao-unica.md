# cp238-liberacao-unica — mudança feita direto no editor num mês publicado passa pelo checklist da Amanda e chega ao cliente

Pedido (Chris, 20/11): "não consegue enviar o ajuste que o cliente pediu e a Amanda não consegue aprovar para que vá para o calendário…
correção de verdade, definitiva, que não volte a acontecer… verificação geral em todos os clientes". Áudio da Amanda (20/11 08:54):
"está tudo aprovado… deveria aparecer um botão… como um checklist… libera para o cliente… aviso verde… some das minhas demandas.
Porém não está indo" (Fedalto e Stokki). Vídeo da Amanda (08:53): Início "0 para revisar · 13 aprovados" → "Conferir e liberar" →
editor da Fedalto 2026-12 com tudo "Aprovado pela Amanda" e, no fim, "O mês ainda tem pedidos sem aprovação individual · O mês
contém outra versão editorial ainda não reconciliada", sem botão de liberar ("Salvar conteúdos" e "Enviar para a Amanda" desligados).

Unidade: U1 de 5 · Tipo: erro (classe: qualquer mudança direta no editor em mês publicado reaberto por pedido)

Caso real (somente leitura, exportação anonimizada de 20/11 11:54, código do servidor rodado sobre os dados):
- Fedalto 2026-12: 11 pedidos aprovados + 1 cancelado, 3 ajustes internos aprovados; mês ajuste_interno por 'Amanda'. Diferenças
  fora de registro: "Lançamento da Caixa dos Desejos" (texto mudado em 18/11 17:29), "Vai construir piscina pro verão?" e "A Fedalto
  vestida de Natal" (retirados em 18/11 19:57), "Você não é… mas…" (retirado no cancelamento 18/11 12:35). Todas por
  `central_editor_salvar` (backups `calendarios_versoes`). Os 12 pedidos aprovados não mudaram depois da aprovação.
- Stokki 2026-12: 1 pedido aprovado (19/11 20:24); conteúdo novo "Feliz Natal · papel rasgado" (`ed_…`) incluído pelo editor em 19/11.
- Varredura dos 50 meses publicados desde 2026-11: só esses dois presos.

Causa-raiz: o editor deixa o Chris mudar qualquer conteúdo do mês reaberto (`editar` em `ajuste_interno`), mas as duas liberações
do mês publicado — CP121 (`elegibilidadeReliberacaoAjustesCp121`, "O conteúdo do mês mudou depois da publicação") e CP123
(`resumoInternosCp123`, "outra versão editorial ainda não reconciliada") — só aceitam diferença coberta por registro aprovado; e o
envio do mês inteiro fica travado pelo pedido (CP182). Nenhuma saída. A publicação (`central_editor_decidir` → retrato) já é montada
do calendário atual: só a conferência barrava.

Todos os ramos (Passo 2b):
- Ação nova/alterada: nenhuma ação nova; campo novo `assinaturaMudancasDiretasCp238` no `central_editor_decidir` → contrato
  `validarEntradaEditorialI172` (chaves + formato) ✅; lista `EDITORIAL` sem mudança (mesma ação) ✅.
- Resposta nova do servidor: `mudancasDiretasCp238` + `assinaturaMudancasDiretasCp238` no dto do editor; a tela não valida chaves
  extras (`validarDTO`) ✅; não há estado guardado da lista (vem sempre do dto) ✅.
- Papéis: só a Amanda decide; Chris não vê o checklist (elegibilidade CP121 devolve indisponível para o Chris) ✅.
- Onde monta: caixa de confirmação `[data-decisao]` do editor I172, a mesma que a Amanda já usa ("Revisei os conteúdos…") ✅.
- Mensagem → saída existente: a recusa sem conferência manda abrir o mês e conferir a lista, que aparece no mesmo botão ✅.
- Estado que trava: o mês reaberto libera pela Amanda; a lista mostra tudo o que muda para o cliente ✅.
- Outros produtores do mesmo estado: editor (Chris e Amanda), cancelamento CP143 com conteúdo retirado, programação (já tratada
  pela CP201/CP202 em `comparacaoPublicacaoCp202`) — todos caem na mesma lista ✅.

Árvore:
RAIZ: conferência "mês igual ao publicado" das liberações do mês publicado
├─ ESCRITORES  : central_editor_salvar (itens, excluirIds), cancelamento CP143, programar (datas, CP201)
├─ LEITORES    : elegibilidadeReliberacaoAjustesCp121 (cp112 dto + i172 dto + decidir), resumoInternosCp123 (i172 dto, fila CP232,
│                prepararPublicacaoInternosCp123), editor I172 (botão publicar-form, htmlBloqueioCp112)
├─ PAPÉIS      : Amanda (libera), Chris (edita), cliente (recebe pelo retrato/cópia CP200)
├─ RULES       : nenhuma mudança (tudo pela Function)
├─ AUTOMAÇÕES  : gatilho da cópia do cliente CP200 (já acompanha o retrato)
├─ LEGADO      : processo antigo usa as mesmas funções — a lista vale igual
└─ EFEITO      : "pode liberar" da fila CP232 passa a coincidir com a liberação real nesses meses

Mudança:
1. `functions-get/ajustes-calendarios-cp112.mjs`: `mudancasDiretasCp238(cmp,mes)` (novo/retirado/alterado + campos) e
   `assinaturaMudancasDiretasCp238`; a elegibilidade CP121 não recusa mais por diferença fora de registro.
2. `functions-get/ajustes-internos-cp123.mjs`: `resumoInternosCp123` não recusa mais por "outra versão editorial".
3. `functions-get/editorial-calendarios-i172.mjs`: uma lista só por mês (retrato × atual, fora os pedidos aprovados desta liberação e os
   ajustes internos aprovados) no dto; `central_editor_decidir` publicar exige a assinatura dessa lista quando ela não está vazia.
4. `functions-get/editorial-contrato-i172.mjs`: aceita e valida `assinaturaMudancasDiretasCp238`.
5. `gs-editor-calendario-central-i172.mjs`: a caixa de confirmação da Amanda mostra a lista (`[data-mudancas-diretas-cp238]`) e envia a
   assinatura; o "Confirmar" só solta com o checklist marcado. Hash do import no `escritorio.html`.
O que NÃO muda: registros de pedidos e ajustes internos, aprovações individuais, regras, dados de produção, envio do mês inteiro (CP182).
Testes: J91 (arquivo J60h) vermelha no main → verde; vizinhas J06/J56/J60–J60g/J64/J75/J77/J78/J84/J85 desktop e --movel; bateria no CI.
Risco residual: a Amanda passa a liberar mudanças feitas direto no editor depois de vê-las na lista (decisão do Chris, 20/11: "liberação
única com checklist"). Mensagens enganosas restantes (diagnóstico CP224, "pode liberar" CP232, título fixo do bloqueio) ficam na U2.
Publicação: Functions (ok nominal do Chris em 20/11: "Pode sim") + site.
