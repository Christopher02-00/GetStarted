fix(financeiro): "Recebi" grava a data real do pagamento (CP218, Cookiery)

## 1. Entendimento
Pedido do Chris (16/11): a Cookiery pagou a competência 2026-04 (R$ 1.700) em 10/04/2026 e a mensalidade aparece "aberto". O "Recebi" gravava `pagoEm` = hoje, então o dinheiro cairia no caixa de novembro. Precisa informar a data real (padrão hoje, nunca futuro, limite inferior sensato), caixa pela data real, competência original. Unidade C (CP218). Ficha: `fichas/2026-11-16-cp218-recebi-data-real.md`.

## 2. Alterações
- `financeiro-ui-v104.mjs` (sha256 antes 408cdb66… → depois 974b259c…): `limitesDataRecebimentoMensalidade` e `validarDataRecebimentoMensalidade` (puras, exportadas); campo "Data real do pagamento" (padrão hoje, `min`/`max`) ao lado de cada "Recebi"/"Já recebi" (Mensalidades e as duas listas da Régua; não aparece no primeiro pagamento i94); `marcarMensalidadeV103` valida e mostra a data no confirm; o escritor grava `pagoEm` = data informada; o recibo confere a data.
- Limite decidido: de 1º dia do mês ANTERIOR à competência (pagamento adiantado) até hoje. Ex.: 2026-04 aceita 01/03/2026 até hoje. Futuro ou data inválida: recusado sem gravar.
- `escritorio.html`: `?v=` do `financeiro-ui-v104.mjs` atualizado. `financeiro-core.mjs` e `financeiro-entrada-i94.mjs` não mudaram (cadeia core → i94 intacta).
- Jornada `ensaio/jornadas/J73-recebi-com-data-real.mjs`; linha no `ensaio/README.md`; invariante no `AGENTS.md`; contagem no `CLAUDE.md`.
- Rules: o update aberto→pago (`pagamentos_mensais`) não restringe `pagoEm`; sem mudança em `firestore.rules`/Functions.

## 3. Provas
- Sintaxe: `node --check financeiro-ui-v104.mjs` e scripts inline ok. Caminhos: 0 handlers quebrados. Duplicatas: 0 divergência nova.
- Contraprova (main + J73): sem campo de data; `pagoEm` 2026-11-16 em vez de 2026-04-10; caixa 2026-04 0 → 0 e caixa 2026-11 0 → 1.700 ❌.
- Na branch: J73 4/4 (data futura recusada; `pagoEm` 2026-04-10, competência 2026-04; caixa 2026-04 0 → 1.700, caixa 2026-11 0 → 0; sem erro grave).
- Portão inteiro: desktop 178/178 verde · `--movel` 178/178 verde.

## 4. Riscos / pendências
- Mensalidade já marcada como paga com a data errada não é corrigida por esta tela (estado terminal exige correção auditada).
- Correção real da Cookiery depende do ok do Chris depois da publicação: Financeiro → Mensalidades → mês abril/2026 → linha da Cookiery → "Data real do pagamento" 10/04/2026 → "✔ Recebi" → confirmar.

## 5. Próximo passo
Aguardar revisão; publicar pela skill `get-publicacao-e-rollback` (só código) e então o Chris faz a baixa da Cookiery na tela.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
