# devolucao-longa-aceita — devolução com recado longo é aceita (até 30 mil) e a recusa explica o tamanho
Pendência de 10/11/2026 (achado E5 da auditoria), concluída a pedido do Chris em 11/11.
Sintoma: a Amanda devolve o calendário com recado geral + observações por conteúdo. Juntos, passam de 10.000 caracteres. A devolução era recusada com "Conte ao Chris o que precisa ajustar." (mensagem errada) e ela ficava sem saída.
Causa: o editor (gs-editor-calendario-central-i172.mjs) juntava recado + observações e exigia ≤ 10.000. O servidor (editorial-contrato-i172.mjs) tinha o mesmo limite.
Mudança:
- Limite de 30.000 no editor e no servidor, o mesmo das legendas.
- Acima disso, a mensagem diz o total ("somam N caracteres; o limite é 30.000. Resuma…").
- `?v=` do editor atualizado no escritório.
O que NÃO muda: o campo do recado geral continua com 10.000; o limite novo vale para o total.
Testes: J52 (nova; fluxo da J06 com a Zeiss: Amanda inclui o documento → Chris cria e envia → Amanda devolve com 12.000 caracteres), vermelha → verde + portão completo.
