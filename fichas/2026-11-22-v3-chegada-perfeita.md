# v3-chegada-perfeita — prova de que o calendário chega à Amanda para aprovar e ao cliente exatamente como aprovado

Pedido (Chris, 22/11): "nessa bateria de testes e arrumações a chegada perfeita do calendário ao cliente e à Amanda para aprovar deve estar
presente com testes e comprovações de 99% de acertividade e não erros".
Unidade: V3 · Tipo: prova (não muda o site nem o servidor)

O que já havia: a J06 e a J104 conferiam que o mês era liberado e que os títulos apareciam para o cliente.
O que faltava:
- (a) a Amanda receber o calendário pelo caminho dela: o aviso "Calendário para revisar", gerado pela rodada de 5 min do servidor;
- (b) conferir campo por campo que o que ela revisa é o que o Chris salvou;
- (c) conferir que o que o cliente vê é exatamente o que ela aprovou;
- (d) rodar isso em todos os clientes com os dados reais.

Mudança (só ensaio):
- `ensaio/lib/chegada.mjs`:
  - `chegadaAmanda` roda a mesma função do agendamento (`sincronizarOcorrenciasI165`, sem push e sem e-mail). Confere o aviso da Amanda (`calendario_revisao`, destinatário Amanda), abre a revisão pelo botão do aviso e compara título, dia e legenda com o calendário salvo.
  - `chegadaCliente` compara, campo por campo: retrato liberado (o que a Amanda aprovou) = calendário = cópia do cliente (`calendarios_cliente`) = o que o cliente abre no link (título, dia, legenda).
- J06 ganha os casos 2b e 4b (rodam em todo PR, desktop e celular).
- J104 ganha os mesmos casos por cliente e `ENSAIO_CLIENTES=carteira`, que roda todos os clientes da carteira do mês com a regra do servidor.
- `ensaio/lib/seed.mjs`: o dado de teste espera e tenta de novo no 409 "Transaction lock timeout" do emulador.
  - Origem: o CI do `main` (J101) falhou por isso depois da publicação do PR #186; a reexecução passou.

Provas:
- J06 10/10.
- Contraprova: legenda trocada na cópia do cliente → 4b vermelho, com "legenda na cópia ≠ calendário" e "legenda aberta ≠ calendário".
- J104 com a carteira inteira e os dados reais: resultado no PR.
Risco residual: n.a. (só ensaio). Os vigias diários (Raio-X E2: cópia do cliente ≠ liberado) já conferem o mesmo nos dados reais todo dia.
