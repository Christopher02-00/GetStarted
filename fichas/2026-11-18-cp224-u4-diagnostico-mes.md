# cp224-u4-diagnostico-mes — "Por que este mês não avança?" no painel de pedidos do mês
Pedido original (literal): "Diagnóstico 'Por que este mês não avança?'."
Unidade: U4 do Bloco 2 do CP224 · Tipo: novo
Sintoma observado: na Fedalto 2026-12, com 10 pedidos abertos, nada dizia de uma vez com quem estava cada pedido nem o que faltava para liberar. Parecia travado.
Reprodução: emulador, J77 (tela do Chris). No código antigo o diagnóstico não existe (vermelho).
Causa-raiz: o painel CP112 mostrava cada pedido e, no fim, uma lista de status, sem dizer de quem é a vez nem o próximo passo.
Árvore:
RAIZ: render() do painel CP112 (gs-ajustes-calendarios-cp112.mjs)
├─ ESCRITORES : nenhum (só leitura do dto que a tela já recebe do servidor)
├─ LEITORES   : Chris e Amanda no editor do mês
├─ RULES / AUTOMAÇÕES / SERVIDOR : nenhuma mudança
└─ COLATERAL  : hashes dos imports (painel → editor → escritorio.html)
Mudança: `diagnosticoCp224()` monta um bloco aberto "Por que este mês não avança?" com:
- "Com o Chris (N)" e "Com a Amanda (N)": cada pedido com o próximo passo pelo status (pendente, rascunho, dependência com o texto, devolvido com o motivo, desatualizado, conteúdo retirado, enviado, inconsistente);
- "Liberação:": o que falta para liberar o mês, ou a liberação das correções aprovadas, ou "nada pendente".
O bloco some quando o mês está liberado e não há nada esperando.
O que NÃO muda: os cartões dos pedidos, os botões, o servidor e as rules. Os ajustes internos CP123 continuam no próprio painel, que já diz quem faz o quê.
Testes: J77 (caso novo; vermelho antes, verde depois); J06, J49, J52, J55, J56, J60, J64 e J71 no computador e no celular; bateria inteira no CI.
Risco residual: nenhum servidor envolvido, então publica só com o merge.
