# cp224-u2-cliente-atualizar — recusa da tela do cliente diz o motivo e manda atualizar a página
Pedido original (literal): "Toda recusa diz o motivo e o próximo passo."
Unidade: U2 do Bloco 2 do CP224 · Tipo: erro
Sintoma observado: quando a conferência da própria tela recusa o pedido do cliente (por exemplo, a equipe mudou o conteúdo enquanto ele estava aberto), o cliente lê "Não consegui confirmar o ajuste no servidor… tente novamente". Repetir sem atualizar a página nunca resolve.
Reprodução: emulador, J77 caso 7. O cliente abre o conteúdo, a equipe muda o roteiro e o cliente envia o pedido. No código antigo aparece a mensagem genérica (vermelho).
Também conferido (J77 caso 6): dois pedidos seguidos sem recarregar a página, com ou sem pausa, entram os dois. A célula 3 da matriz vinha da trava da U5, já corrigida.
Causa-raiz: `enviarObsDoCliente` (calendario.html/calendarios.html) só traduzia os códigos `gs/legado-sem-estado-explicito` e `gs/ajuste-ja-aberto`. Os erros da conferência local (`conferirAprovacaoI56`, sem código; `gs/item-divergente`; `gs/estado-alterado`) caíam na mensagem genérica.
Árvore:
RAIZ: mensagem do catch de enviarObsDoCliente
├─ ESCRITORES : nenhum (só a tela)
├─ LEITORES   : cliente pelo link
├─ RULES / AUTOMAÇÕES : nenhuma
└─ COLATERAL  : calendario.html e calendarios.html continuam byte a byte iguais
Mudança: esses erros passam a mostrar "Este conteúdo mudou desde que você abriu a página. Copie seu texto, atualize a página e envie o pedido de novo." A falha de servidor de verdade continua com a mensagem de tentar de novo.
O que NÃO muda: as conferências, o servidor, as rules e o texto dos outros avisos.
Testes: J77 casos 6 e 7; J06, J49, J52, J55, J56, J60, J64 e J71 no computador e no celular; bateria inteira no CI.
Risco residual: nenhum servidor envolvido, então publica só com o merge.
