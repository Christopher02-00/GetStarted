# cp239-mensagens-liberacao — as mensagens da liberação dizem a causa que o servidor devolveu

Pedido (Chris, 20/11): "ele fala que tá tudo pronto mas ao mesmo tempo não está pronto"; "eu quero certezas". Vídeo da Amanda (20/11 08:53,
Fedalto 2026-12): todos os pedidos "Aprovado pela Amanda" e, no fim do editor, "O mês ainda tem pedidos sem aprovação individual · O mês
contém outra versão editorial ainda não reconciliada" + "Revisar cada pedido acima". O painel de pedidos dizia "Todos os pedidos estão
aprovados. A Amanda libera o mês na revisão do calendário".

Unidade: U2 de 5 · Tipo: erro (mensagem que aponta para uma saída inexistente — regra da retrospectiva de 19/11)

Causa-raiz (tela, lido no código):
- `htmlBloqueioCp112` (gs-editor-calendario-central-i172.mjs) tem título e botão fixos de "pedidos", mas `bloqueioMensalCp112` também
  dispara quando só os ajustes internos travam (`internosCp123.liberacaoPermitida !== true`). No vídeo, todos os pedidos estavam aprovados.
- `diagnosticoCp224` (gs-ajustes-calendarios-cp112.mjs) promete "A Amanda libera" só porque os pedidos estão aprovados; não sabe dos
  ajustes internos nem consulta a elegibilidade (`reliberacaoCp121`).
- Sem liberação disponível e sem bloqueio (ex.: publicação anterior que não confere), a Amanda não via botão nem motivo.

Todos os ramos (Passo 2b): ação nova n.a.; resposta nova do servidor n.a. (só lê `ajustesCp112`, `internosCp123`, `reliberacaoCp121` que já
vêm no dto); papéis: Amanda (caixa e motivo), Chris (painel) ✅; onde monta: área de ações do editor I172 e painel CP112 dentro dele ✅;
mensagem → saída existente: "Ver os ajustes internos" rola até o quadro de ajustes internos, que tem os botões de cada ajuste ✅; estado que
trava: cada motivo do servidor já diz quem faz o quê ✅; outros produtores: n.a. (só texto).

Mudança (só tela, sem Functions):
1. `htmlBloqueioCp112`: título, botão e explicação conforme a causa (`pedidosTravamCp239`); `data-bloqueio-cp239="pedidos|internos"`.
2. `htmlSemLiberacaoCp239`: Amanda, mês em ajuste com pedidos/ajustes e sem liberação → "Ainda não dá para liberar este mês" + motivo do servidor.
3. `diagnosticoCp224`: com os pedidos aprovados, não promete o botão; mostra o motivo da elegibilidade quando ela recusa por outra causa, ou
   aponta o fim do editor ("lá aparece o botão da Amanda ou o que ainda falta").
4. Hashes: `gs-ajustes-calendarios-cp112.mjs` no import do editor; editor no `escritorio.html`.
O que NÃO muda: servidor, regras, dados, quem pode liberar.
Testes: J92 (arquivo J60i) vermelha no código anterior → verde; J91/J90/J86/J77 vizinhas; --movel.
Risco residual: a caixa "Ainda não dá para liberar" só aparece com dado incoerente (publicação que não confere) — sem jornada própria; o
texto vem do servidor.
