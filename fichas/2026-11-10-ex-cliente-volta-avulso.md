# ex-cliente-volta-avulso — ex-cliente mensalista volta para trabalho avulso no mesmo cadastro
Pedido: achado E4 da auditoria (entrada e saída). Decisão do Chris (10/11, no chat): "Permitir voltar avulso".
Unidade: auditoria do percurso · Tipo: ajuste
Antes: `ativarAvulsoRecebido` chamava `identidadeClienteParaNovoTrabalho`, que recusa cliente arquivado ("Use 'Reativar cliente'"). A reativação força mensalista quando a saída era de mensalista. Resultado: o ex-cliente não entrava como avulso.
Mudança (escritorio.html):
- Na ativação avulsa, o diagnóstico de identidade só recusa cliente ATIVO. O arquivado volta no mesmo cadastro, sem criar outro.
- Quando a config estava inativa, saem `inativoDesde`/`saidaProgramadaPara`/`dataSaida`, que senão manteriam o cliente "inativo efetivo", e entram `voltouComoAvulsoEm/Por`.
O que NÃO muda: o contrato mensal continua encerrado; nenhum Portal é criado (avulso não tem); `identidadeClienteParaNovoTrabalho` continua igual para os outros fluxos; mensalista ativo continua recusado.
Testes: J50 (nova, vermelha → verde, sem escrita negada pelas rules) + portão completo.
