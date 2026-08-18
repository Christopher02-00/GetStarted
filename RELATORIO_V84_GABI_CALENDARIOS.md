# V84 — abertura interna de calendários para Gabi

Data: 18/08/2026

## Defeito comprovado

O botão interno do Escritório chamava `garantirTokensDoCliente(slug, 'equipe')` antes de abrir o editor. Para um cliente novo ou sem acesso canônico confirmado, Gabi não pode listar tokens históricos e a abertura era bloqueada, embora a conta dela tenha papel de equipe para trabalhar no calendário.

## Mudança local

- `escritorio.html`: o iframe interno abre com `interno=1` e deixa de solicitar a credencial externa do cliente.
- `calendario.html` e `calendarios.html`: no modo interno, reutilizam a sessão Google padrão já autenticada no Escritório. No modo externo, preservam app anônimo isolado e token obrigatório.
- `scripts/regression-v81-calendarios.mjs`: quatro verificações novas cobrem a separação interno/externo.
- `CATALOGO_DE_ERROS.md`: incidente 70.24 registra causa, prevenção e gate.

Nenhum dado, calendário, token, regra do Firebase ou serviço externo foi alterado.

## Validação executada

- `regression-v81-calendarios.mjs`: aprovado, 69/69.
- `preflight.mjs`: aprovado.
- `regression-critical.mjs`: aprovado, 608/608.
- `git diff --check`: aprovado.
- `calendario.html` e `calendarios.html`: byte a byte idênticos.

## Limite real

O fluxo foi corrigido e validado localmente, mas ainda não está validado na conta real da Gabi nem no iPhone Campo Largo em produção. Essa confirmação depende do upload manual dos arquivos pelo usuário e de um novo teste funcional com a sessão Google da Gabi.

## Arquivos para upload no GitHub

1. `escritorio.html`
2. `calendario.html`
3. `calendarios.html`
4. `CATALOGO_DE_ERROS.md`
5. `scripts/regression-v81-calendarios.mjs`

Não há `firestore.rules` nesta entrega.
