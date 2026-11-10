# portal-composicao-cobranca-grupo (CP195) — o Portal da Zeiss mostra quanto da mensalidade é de cada empresa
Pedido original (literal, 10/11): "Preciso saber quando que a atualização das cobranças das óticas… vai vir com a nova atualização… Com o valor atualizado para cada uma das óticas… tem que convergir diretamente com o financeiro."
Decisões do Chris (10/11, no chat): manter R$ 4.500 no total (sem a Clínica Zeiss Araucária, a parte própria da Zeiss fica R$ 1.500); mostrar a divisão no Portal.
Unidade: novo · Tipo: novo
Antes: o Portal da Zeiss mostrava só o total. A divisão existia apenas em Mensalidades do escritório (J29). O cliente não pode ler `config_financeiro`.
Mudança:
- Ação pública de leitura `cliente_cobranca_composicao_cp195` (`functions-get/composicao-cobranca-cliente-cp195.mjs`) confere a sessão e o token do link (CP193). Para cada mensalidade do pagador a partir do `desde` do grupo, devolve o total, a parte do pagador (valor − soma das partes, a mesma conta de `projetarGruposCobranca`) e a parte de cada empresa.
- Conta que não fecha não é mostrada.
- No `portal-cliente.html`, embaixo do valor da cobrança liberada aparece "Como se divide este valor". Se a consulta falhar, a cobrança continua igual.
Conferência em produção (somente leitura, 10/11): grupo Zeiss = 4 empresas × R$ 750, Zeiss R$ 4.500 aberto, `projetarGruposCobranca` fecha (parte da Zeiss R$ 1.500, sem conflitos).
Testes: J44 (nova, vermelha → verde: "Zeiss R$ 3.000 · Hitech R$ 750 · Mochi R$ 750") + portão completo.
