# Get Started — entrega V75

Data: 17/08/2026  
Build: `2026-08-17-valor-ativacao-reativacao-v75`

## Escopo confirmado

- Permitir que Amanda confira e informe o valor ao ativar um mensalista recebido.
- Exigir valor, vencimento e competência ao reativar mensalista arquivado.
- Reutilizar a mesma identidade, ficha e Portal, sem cadastrar cliente duplicado.
- Não reativar o iPhone Campo Largo nem alterar dados de produção.

## Alterações

### Entrada de mensalista

- “Conferir valor e ativar” abre o formulário oficial, mostra a prévia e foca o valor.
- O primeiro clique não grava nada; somente “Confirmar e ativar mensalista” conclui a transação.
- O valor segue editável nessa entrada para Amanda e Chris.

### Reativação pelo arquivo

- O cartão pede valor mensal, dia de vencimento e primeiro mês após a volta.
- A origem arquivada é relida dentro da transação antes de qualquer atualização.
- Cadastro legado reutiliza o próprio documento; não usa `addDoc()` nem cria outro slug.
- Contrato existente recebe valor datado e histórico. Se o contrato não existir, ele é recuperado no mesmo slug canônico.
- Pagamentos `pago` e `cancelado` são preservados; somente lançamentos reabertos e aplicáveis podem receber o novo valor.
- A saída permanece no histórico como cancelada por soft-delete, e o Portal é confirmado depois.

### Limites de edição financeira

- O valor da ficha de cliente já ativo continua somente leitura.
- Alterações comerciais posteriores continuam exclusivamente em `Contratos`, preservando competências anteriores.

## Provas executadas

- `scripts/regression-v75.mjs`: 37 asserções direcionadas.
- `scripts/regression-critical.mjs`: 608 asserções críticas.
- `scripts/preflight.mjs`: aprovado; 9/9 scripts inline compilam, 950 handlers resolvidos, documentos obrigatórios e invariantes do catálogo preservados.
- Regressões V71–V74: 18 + 50 + 28 + 34 asserções aprovadas.
- Navegador local: DOM confirmou build V75, campo de valor editável e formulário presente; em 390 × 844 a grade caiu para uma coluna e não houve rolagem horizontal.

## Limites reais

- Os testes são locais e não gravam Firestore. Eles provam código, validações, travas, identidade e transações simuladas; a confirmação operacional final exige publicar e testar com uma ficha de teste autorizada.
- Nenhuma alteração foi enviada ao GitHub, Firebase ou produção nesta entrega.
- iPhone Campo Largo permaneceu somente como registro local/arquivado; nenhuma ação operacional foi executada para ele.

## Arquivos da V75

- `escritorio.html`
- `scripts/preflight.mjs`
- `scripts/regression-critical.mjs`
- `scripts/regression-v75.mjs`
- `CATALOGO_DE_ERROS.md`
- `AGENTS.md`
- `RELATORIO_ENTREGA_V75.md`

## Destino local padrão

- Pasta central: `/Users/christopherbrito/site Get — atualizado`.
- Subpasta desta versão: `ATUALIZACAO_ATUAL_V75`.
- Novas entregas não devem ser espalhadas em Documentos ou Downloads.
- Depois de a próxima versão ser validada, a subpasta e o ZIP atuais são substituídos pela nova entrega; a referência histórica `/Users/christopherbrito/Documents/site get` permanece separada e intocada.
