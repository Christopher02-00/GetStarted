# Entrega V73 — WhatsApp do cadastro até os fluxos internos

Data: 17/08/2026
Base verificada: `main` no commit `0716210601c4d713e08e0c9a46756468654faf2d`

## Entendimento comprovado

Os formulários públicos já pediam WhatsApp, mas a ativação interna de mensalistas e avulsos criava `clientes_config` sem `whatsappCobranca`. Por isso, o contato podia existir na ficha recebida e ainda assim faltar na Central de Mensagens, em Mensalidades e na Régua de Cobrança.

## Correção implementada

- Os quatro caminhos públicos validam WhatsApp brasileiro com DDD e preservam uma versão canônica com DDI 55.
- A ativação gerencial de mensalista e avulso transfere o contato confirmado para `clientes_config.whatsappCobranca`.
- A edição de cliente ativo usa a mesma validação e recupera o número operacional quando a ficha legada estiver vazia.
- O formulário anônimo não recebeu acesso direto a `clientes_config`; não houve ampliação das regras Firestore.
- Nenhum número de cliente foi fixado no HTML. Os consumidores continuam lendo a fonte central existente.

## Arquivos da entrega

- `avulso.html`
- `escritorio.html`
- `scripts/preflight.mjs`
- `scripts/regression-critical.mjs`
- `scripts/regression-v72.mjs`
- `scripts/regression-v73.mjs`
- `CATALOGO_DE_ERROS.md`
- `AGENTS.md`

## Provas locais

- `node scripts/regression-v73.mjs`: aprovado, 28 asserções.
- `node --experimental-vm-modules scripts/preflight.mjs`: aprovado.
- `node --experimental-vm-modules scripts/regression-critical.mjs`: aprovado, 607 asserções.
- `node scripts/regression-v71.mjs`: aprovado, 18 asserções.
- `node scripts/regression-v72.mjs`: aprovado, 50 asserções.
- Comparação completa contra a base oficial: somente os oito arquivos acima e este relatório foram alterados; uma mudança herdada e fora do escopo foi detectada e removida antes desta entrega.

## Limites reais

Os testes comprovam a cadeia de código e as regressões locais. Eles não simulam uma nova ficha real sendo enviada e confirmada no Firebase de produção. Telefones legados que já estavam ausentes continuam exigindo preenchimento único no cadastro existente; a V73 evita que novos cadastros percam o dado durante a ativação.
