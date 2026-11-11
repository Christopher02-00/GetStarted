# cobranca-grupo-sem-empresa-encerrada — empresa que saiu não entra na conta da cobrança agrupada
Pedido original (literal, 10/11): "…tem que convergir diretamente com o financeiro, não pode ter nenhum tipo de erro lá." + achado E3 da auditoria (entrada e saída de clientes).
Decisão do Chris (10/11, no chat): "Sim, pode" — empresa encerrada sai da soma e aparece um aviso para revisar o grupo; nenhum pagamento é alterado.
Unidade: V11 da auditoria · Tipo: erro (financeiro)
Sintoma: uma empresa do grupo encerra o contrato e o grupo não é editado. A parte dela continua sendo descontada do pagador, então a parte própria da Zeiss sai menor do que é, e nada avisa.
Reprodução: emulador. A J46 dá vermelho no código antigo ("Zeiss (restante): R$ 3.000,00 · sem aviso").
Causa-raiz: `projetarGruposCobranca` (financeiro-core.mjs) soma `p.parte` de todos os membros. O campo `temContrato` era calculado e ignorado.
Mudança:
- `financeiro-core.mjs`: membro sem contrato no mês fica fora da soma, e entra o conflito `MEMBRO_DO_GRUPO_SEM_CONTRATO`, com a mensagem em `financeiro-ui-v104.mjs`.
- Portal (CP195): só entra empresa com contrato `ativo`, a mesma regra.
- Atualizados os `?v=` em cascata (core → entrada-i94 → ui-v104 → escritorio).
O que NÃO muda: nenhum pagamento ou contrato é gravado; o grupo continua como o Chris salvou; a Régua não muda.
Produção (somente leitura, 10/11): as 4 empresas do grupo da Zeiss têm contrato ativo, então nada muda hoje.
Testes: J46 (nova, vermelha → verde) + J44 + J29 + portão completo.
