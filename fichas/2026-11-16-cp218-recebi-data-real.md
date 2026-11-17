# cp218-recebi-data-real — "Recebi" grava a data real do pagamento
Pedido original (Chris, 16/11, essencial): Cookiery pagou a competência 2026-04 (R$ 1.700) em 10/04/2026 e aparece "aberto". O "Recebi" grava `pagoEm = hoje` → o caixa cairia em novembro. Precisa: ao confirmar, informar a data real (padrão hoje, nunca no futuro, limite inferior sensato); caixa usa essa data; competência continua a original; recibo e histórico como hoje.
Unidade: C (CP218) · Tipo: erro
Sintoma: `materializarOuAtualizarMensalidade` (financeiro-ui-v104.mjs) grava `pagoEm: hojeLocal()`. O caixa (`financeiro-core` → `mesDaData(pagamento.pagoEm)`) soma no mês do clique.
Reprodução: J73 no emulador (mensalidade aberta de 7 meses atrás).
Causa-raiz: o escritor não aceita data; lançamentos (`financeiro_lancamentos`) já têm "Data real do pagamento", mensalidades não.

Árvore:
RAIZ: `pagamentos_mensais/{id}.pagoEm`
├─ ESCRITORES: materializarOuAtualizarMensalidade (Recebi/Já recebi/Cortesia/Abrir), entrada i94 (primeiro pagamento — fora do escopo), V108/V109 (Fedalto)
├─ LEITORES: financeiro-core (caixa por `pagoEm`, conflito PAGAMENTO_PAGO_SEM_DATA_CAIXA), Mensalidades, Financeiro (caixa real), Régua, Portal (status)
├─ PAPÉIS: só Chris (canFinanceiro); DOM financeiro não existe para outros papéis
├─ RULES: update aberto→pago (`cT`) não restringe `pagoEm`; create por gerência. Sem mudança de rules.
├─ AUTOMAÇÕES: nenhuma
├─ LEGADO: botão sem campo (não existe mais nas telas) cai no padrão hoje
└─ COLATERAL: as três telas do "Recebi" (Mensalidades, Régua x2) ganham o mesmo campo de data
Mudança: `financeiro-ui-v104.mjs` — `limitesDataRecebimentoMensalidade`/`validarDataRecebimentoMensalidade` (puras, exportadas), campo "Data real do pagamento" ao lado de cada "Recebi" (valor hoje, `min`/`max`), `marcarMensalidadeV103` valida e mostra a data no confirm, escritor grava a data e o recibo confere `pagoEm`. `?v=` do v104 no escritorio.html.
Limite decidido: de 1º dia do mês ANTERIOR à competência (pagamento adiantado) até hoje. Ex.: 2026-04 aceita 01/03/2026…hoje. Futuro e data inválida são recusados sem gravar.
O que NÃO muda: competência, valor, estado terminal (pago/isento/cancelado continua imutável), primeiro pagamento i94, core, rules.
Testes: J73 (data futura recusada; pagoEm = data real; competência intacta; caixa do mês do pagamento +1.700, mês atual igual); bateria inteira desktop e `--movel`.
Hash antes: financeiro-ui-v104.mjs 81583e3c8e3899ac1cff9d4ed9b5dbac219b49c9 (sha256 408cdb66…).
Risco residual: pagamentos já marcados com a data errada não são corrigidos por esta tela (estado terminal exige correção auditada).
Revisão (17/11): a mesma mensalidade pode estar em Mensalidades e na Régua ao mesmo tempo (dois campos `mensPagoEm_<id>`). `getElementById` pegaria o primeiro (talvez o da tela escondida, valendo hoje). O botão agora passa `this` e a função lê o campo da mesma `.btnrow`. J73 injeta um campo duplicado valendo hoje: sem a correção fica vermelha (pagoEm 2026-11-17, caixa em novembro), com ela verde.
