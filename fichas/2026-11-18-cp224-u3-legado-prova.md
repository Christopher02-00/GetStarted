# cp224-u3-legado-prova — processo antigo: a célula 6 da matriz não se forma; a jornada prova isso
Pedido original (literal): "A prova de publicação usa o retrato da mesma publicação, qualquer que seja o status."
Unidade: U3 do Bloco 2 do CP224 · Tipo: dúvida → prova (nenhuma mudança de código)
Hipótese (Bloco 1, lida no código): no processo antigo, com o mês em ajuste pela Amanda ou por revisão interna sem escopo CP115, o pedido do cliente fica sem prova e sem saída.
Reprodução: emulador, J78 (nova; Hitech 2027-05, mês que nenhuma outra jornada usa).
- Caso 1: com dois pedidos do cliente no mesmo mês liberado, os dois oferecem "iniciar correção" (o CP115 tem prova para os dois).
- Casos 2 e 3: o Chris corrige e envia os dois, a Amanda aprova os dois e uma liberação leva os dois.
- Caso 4: com um pedido novo aberto, o Chris abre a revisão do mês inteiro (central_editor_iniciar, sem escopo CP115). O pedido continua com "iniciar correção". O envio do mês inteiro é recusado com o próximo passo ("Abra cada pedido, salve a correção e use Enviar este ajuste para a Amanda"; trava CP182). Sem esse envio, a Amanda não tem o que devolver.
Conclusão: o estado da célula 6 (mês em ajuste pela Amanda sem escopo CP115 e com pedido do cliente) não é alcançável por ações reais. A trava CP182 já impede que se forme. Nenhum código muda; a J78 fica como proteção.
Árvore: RAIZ contextoPublicado (CP115) / envioIndividualCp182. Nenhum escritor, leitor, rule ou automação muda.
Testes: J78 (nova), J71 e J75 no computador e no celular; bateria inteira no CI.
Risco residual: se algum dia o envio do mês inteiro deixar de respeitar os pedidos individuais, a J78 caso 4 fica vermelha.
