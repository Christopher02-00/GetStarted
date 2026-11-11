# ficha-do-cliente-avisa-chris (CP198) — mudar a ficha do cliente depois do documento confirmado avisa o Chris
Pedido: achado E2 da auditoria (equipe). Decisão do Chris (10/11, no chat): "Avisar o Chris" (a trava continua).
Unidade: auditoria do percurso · Tipo: ajuste
Antes: quando alguém edita `info_extras_cliente/{slug}` depois que o documento único do mês foi confirmado, o editor do mês trava para o Chris e a Amanda ("A ficha do cliente mudou…", CP183). Nada avisava, e o mês ficava parado até alguém tentar abrir.
Mudança: gatilho novo `fichaClienteGetCp198` (onDocumentWritten info_extras_cliente/{slug}).
- Quando a ficha muda de verdade (retrato I164 antes ≠ depois), procura os ciclos do cliente a partir do mês anterior.
- Se a base única confirmada guarda outra ficha, cria UMA demanda para o Chris por ciclo e versão da ficha (id `cp198_ficha_<hash>`, transação): "Ficha do cliente mudou · cliente · mês", com o caminho para readotar.
O que NÃO muda: a trava do CP183 e o documento/histórico.
Testes: J49 (nova, vermelha → verde, demanda visível em Minhas Demandas) + portão completo.
