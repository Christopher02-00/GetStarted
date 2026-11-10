# mes-com-postagem-manual-nao-libera — postagem manual agendada antes do mês existir não trava o mês
Pedido original (literal): "…se o que eu faço vai pra Amanda aprovar certinho… identificar erros e fazer corrigir-los definitivamente"
Unidade: V4 da auditoria do percurso (10/11) · Tipo: erro
Sintoma: a Cecília agenda uma postagem manual de um mês que o Chris ainda não montou. O servidor (`programar.mjs:65`) cria no calendário um item com `mes`, mas sem `aprovacaoMeses`. Depois disso o mês não pode ser montado:
- o servidor (`estado()` em `editorial-calendarios-i172.mjs:29`) responde "liberado";
- a tela da Central (CP109) mostra "Este mês tem conteúdos no calendário oficial" sem o botão do editor e recusa abrir ("Confira a origem…").
Reprodução: emulador. A J36 deu vermelho no código antigo (a tela não oferece o editor).
Causa-raiz: duas regras de "o mês já existe" contam o item que nasceu da postagem manual (`origemAgendamentoManualV118:true`) como se fosse o calendário montado. O servidor ainda trata como "liberado sem marca" um calendário que já usa meses explícitos. O escritório (`estadoMesCal`) diz "rascunho" nesse caso.
Árvore:
RAIZ: calendarios/{slug}.items[] do mês × aprovacaoMeses[mes]
├─ ESCRITORES : programar.mjs (item manual), editor I172
├─ LEITORES   : estado() do I172 (servidor), estadoMesCal (escritório), calendario.html (estadoAprovacao), CP109 (semPlanejamentoCp165, consultaExistente, abrir editor)
├─ HUMANOS    : Chris (monta o mês), Amanda (revisa), Cecília (agenda manual)
├─ RULES      : sem mudança
└─ COLATERAL  : calendário antigo (sem meses explícitos, ou o mês do `mesLegado`) continua "liberado sem marca", como antes
Mudança:
- `estado()` do I172: "liberado sem marca" só quando `usaLegado(cal,mes)`, igual ao escritório.
- CP109: `itensMontadosCp109()` ignora os itens `origemAgendamentoManualV118` nas 3 checagens.
- Atualizado o `?v=` do import no `escritorio.html`.
O que NÃO muda: a postagem manual continua criando o item com `itemId` (J28); o calendário antigo continua igual; nenhuma escrita nova.
Testes: J36 (nova, vermelha → verde) + portão completo desktop e --movel.
Risco residual: um mês só com itens manuais aparece "em criação" para o Chris e "em preparação" para o cliente até ser montado e liberado, que é o comportamento esperado.
