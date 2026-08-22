# Firebase Emulator — Financeiro V103

Laboratório isolado, sem credenciais e sem conexão com o projeto real. Usa o
project ID `demo-get-financeiro-v103`, dados integralmente sintéticos e portas
locais próprias.

```bash
pnpm install --frozen-lockfile
pnpm test
```

O executor também reutiliza, quando disponível, as dependências pinadas do
harness V101. A regra testada é sempre uma cópia efêmera byte a byte de
`../../firestore.rules`; a cópia é apagada ao final.

O contrato cobre, com fixtures sem dados pessoais: ledger privado do Chris e
append-only; mensalidades abertas e estados terminais; comprovante do próprio
cliente; alterações financeiras de contrato com revisão/`operationId`; e
atomicidade entre contrato, lançamento e ledger. O log do emulador é reiniciado
a cada execução e o teste falha se houver qualquer estouro do limite de
expressões das regras.
