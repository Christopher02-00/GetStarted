# Matriz — mudanças em mês já liberado (CP224, 17/11/2026)

Objetivo: nenhuma combinação de mudanças em mês liberado pode deixar um pedido, ajuste ou peça sem próximo passo na tela, para o papel certo.

Fonte de cada célula:
- **P** = provado no ensaio (jornada citada);
- **C** = lido no código (função citada);
- **?** = a provar na jornada de combinações (Bloco 3).

Marcação de resultado: 🟥 trava ou fica sem saída hoje · 🟨 funciona, mas a tela engana ou não diz o próximo passo · 🟩 ok.

## Estados do mês

- `L`: `aprovacaoMeses[mês].status='liberado'`, com o `retratoLiberadoV115` da Amanda.
- `AC`: `ajuste_interno` aberto pelo **Cliente** (CP193: `pedidoAjusteOperationId` + `pedidoAjusteItemId`; todo pedido do cliente pelo link aponta um conteúdo).
- `AA`: `ajuste_interno` aberto pela **Amanda** (devolução CP155).
- `AI` / `AP`: `aguardando_interna` / `aprovado_interno`, depois do envio do Chris.

Flags que mudam o caminho:
- processo **novo** (I155, `planejamentoBasesI155`) ou **antigo** (`continuar_legado`);
- escopo CP115 aberto;
- ajuste CP123 aberto;
- peça CP142 no retrato;
- ficha mudou (CP183/CP198).

## Ações

| # | Ação | Quem |
|---|---|---|
| a1 | pede ajuste num conteúdo (CP193) | cliente |
| a2 | pede de novo no MESMO conteúdo | cliente |
| a3 | corrige o pedido: editor + explicação + enviar (CP112; no antigo, CP115) | Chris |
| a4 | ajuste interno (CP123: correção, substituição, peça nova CP142) | Chris |
| a5 | retira peça CP142 liberada (CP219) | Chris |
| a6 | retira conteúdo com pedido aberto (CP212/CP143) | Chris |
| a7 | aprova ou devolve cada pedido e ajuste (CP112/CP123) | Amanda |
| a8 | libera o mês (CP121 reliberação) | Amanda |
| a9 | ficha muda depois do documento confirmado | — |
| a10 | readota a base (CP222) | Chris |

## Processo NOVO (I155): Fedalto, Bluefit, Little Elephant, Mochi

| Estado ＼ Ação | a1 | a2 | a3 | a4 | a5 | a6 | a7 | a8 | a9/a10 |
|---|---|---|---|---|---|---|---|---|---|
| **L** | 🟩 P J56/J77 | — | — | 🟩 P J60/J60B | 🟩 P J74 | — | — | — | 🟩 P J49b |
| **AC** (1 pedido) | 🟩 P J77 (7): conteúdo que já teve pedido resolvido antes da última liberação aceita novo pedido (U5, 18/11) | 🟩 P J77: recusa certa, "Este conteúdo já está em ajuste" | 🟨 P J77 (1) | 🟩 C CP215: o pedido aberto vale como base | ? | 🟩 P J64 | 🟩 P J56/J77 | 🟩 P J56/J77 | 🟩 P J49b (2) |
| **AC** (N pedidos + CP142 + CP123 liberados = Fedalto) | 🟨 P J77 (3) | 🟩 | 🟨 P J77 (1) | ? | ? | ? | 🟩 P J77 | 🟩 P J77 | ? |
| **AA** (devolução) | ? | — | 🟩 P J52 | ? | ? | ? | 🟩 | 🟩 | ? |
| **AI / AP** | ? (4) | — | — | 🟨 C (5) | ? | ? | 🟩 | 🟩 | ? |

## Processo ANTIGO (continuar_legado)

| Estado ＼ Ação | a1 | a3 (CP115) | a4 (CP123) | a7/a8 |
|---|---|---|---|---|
| **L** + fase publicada | 🟩 | 🟩 C `contextoPublicado` | 🟩 P J71/J75 | 🟩 |
| **AC** (reabertura CP182) | 🟩 | 🟩 C `reaberturaClienteCp182`, só para o ÚLTIMO pedido (m.pedidoAjusteOperationId) | ? | 🟩 |
| **AC** + escopo CP115 aberto | 🟩 P J78 (2 pedidos) | 🟩 C escopado | 🟩 P J71 (CP216) | 🟩 |
| **AA**/AI/AP sem escopo CP115 | — | 🟩 P J78 (6): não se forma | ? | 🟩 |

## Notas (as células marcadas)

1. **🟩 (U1, 18/11) Fedalto, a causa real do "sem saída".**
   - Em todo pedido do processo novo, o Chris vê "A publicação anterior e a origem deste pedido precisam de conferência… Use Conferir pedidos no servidor". A frase sai de `dtoCorrecaoCp115` (functions-get/correcao-conteudo-pedido-cp115.mjs), porque `contextoPublicado` exige `c.modo==='continuar_legado'`. O CP115 nunca vale no processo novo.
   - O caminho do processo novo existe e funciona (P J77): corrigir no editor ("Salvar conteúdos"), escrever a explicação ("Salvar explicação e execução"), enviar; a Amanda aprova cada um; "Liberar correções ao cliente".
   - A tela não diz isso, e "Conferir pedidos no servidor" não muda nada.
   - Em produção (17/11, leitura): o editor da Fedalto 2026-12 abre editável, com os 10 pedidos "Ainda não executado".
2. **Ficha mudou:** com a ficha nova, o editor recusa salvar até readotar (CP222 resolveu com o botão).
3. **🟩 (U2, 18/11; J77 casos 6 e 7) Tela do cliente:** dois pedidos seguidos sem recarregar entram os dois (a recusa vinha da trava da U5). Quando a conferência da tela recusa porque a equipe mudou o conteúdo aberto, a mensagem agora manda copiar o texto e atualizar a página. Antes: depois do 1º pedido, o próximo sem recarregar a página é recusado ("Este conteúdo mudou desde que você abriu"). O cliente vê "Não consegui confirmar o ajuste no servidor… tente novamente", e não "atualize a página".
4. **CP193:** aceita novo pedido com `liberadoEmAnterior` preenchido. Falta provar com o mês já enviado à Amanda.
5. **CP140 complemento de preparação** só com `aguardando_interna`. Falta provar ajuste interno novo com pedido do cliente já enviado.
6. **🟩 (U3, 18/11; J78) Processo antigo: o estado não se forma.** Com dois pedidos, os dois têm prova. Com um pedido aberto, o mês inteiro não pode ser enviado (trava CP182, que diz o próximo passo), então a Amanda não tem o que devolver por cima dele. Hipótese original: o CP115 só tem prova com `liberado`+publicada, escopo CP115 ou reabertura do cliente. Com o mês em `ajuste_interno` aberto pela Amanda ou por ajuste interno (sem escopo CP115), o pedido do cliente fica sem prova e sem saída. É a mesma família do CP201 e do CP216.

7. **🟩 (U5, 18/11) CP193 contava pedido antigo como aberto** (achado na J77, 17/11). `jaAberto` olha todos os pedidos do mesmo conteúdo na competência, inclusive os de antes da última liberação, já resolvidos. Depois de qualquer novo pedido reabrir o mês, aquele conteúdo fica recusado com "Este conteúdo já está em ajuste", sem saída para o cliente. Correção: U5 (só pedidos criados depois de `liberadoEmAnterior`).

## Regra (vai para o AGENTS.md)

- Nenhuma combinação de mudanças em mês liberado pode deixar um pedido, ajuste ou peça sem próximo passo na tela para o papel certo.
- Cada mudança é independente por conteúdo; só a liberação final do mês junta tudo.
- Toda recusa diz o motivo e o próximo passo, com o botão para quem resolve.
- "Precisa de conferência" sem saída é proibido.

## Situação em 18/11 (CP224 concluído)
- U1 a U5 no ar. As células marcadas 🟥 e 🟨 viraram 🟩, com jornada.
- As células "?" que sobram ainda não têm jornada própria. Não apareceram na varredura de produção e não são caminhos de travamento conhecidos. Cada uma vira jornada (vermelha antes, verde depois) no primeiro caso real.
- Varredura de produção (só leitura): nenhum mês sem saída além da Fedalto 2026-12, que agora mostra o caminho.
