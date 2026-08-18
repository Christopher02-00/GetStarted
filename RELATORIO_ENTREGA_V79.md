# Get Started — entrega V79: envio do calendário do próximo mês

Data: 18/08/2026  
Build: `2026-08-18-calendario-proximo-mes-v79`

## Objetivo entregue

A V79 preserva a V78 e corrige a rotina real em que a equipe prepara, no mês vigente, o calendário do mês seguinte. Amanda continua aprovando o conteúdo; Cecília passa a liberar e copiar o link da competência aprovada, sem depender de uma segunda ação escondida da Amanda.

## Fluxo oficial

1. Em agosto, a ferramenta começa em setembro.
2. O iframe recebe `&mes=2026-09` e abre exatamente essa competência.
3. A tela confirma no Firestore quantos itens existem e qual é o estado.
4. Se estiver `aguardando_interna`, Cecília espera a decisão da Amanda.
5. Se estiver `aprovado_interno`, “Liberar e copiar este mês” relê o documento em transação, libera somente setembro e prepara o link com `&mes=2026-09`.
6. Se o mês não possuir itens, o sistema informa que ele realmente não foi produzido e não libera nada.

## Arquivos da entrega

- todos os arquivos relacionados em `RELATORIO_ENTREGA_V78.md`
- `escritorio.html`
- `calendario.html`
- `calendarios.html`
- `AGENTS.md`
- `CATALOGO_DE_ERROS.md`
- `scripts/preflight.mjs`
- `scripts/regression-v72.mjs`
- `scripts/regression-v76.mjs`
- `scripts/regression-v77.mjs`
- `scripts/regression-v78.mjs`
- `scripts/regression-v79.mjs`
- `RELATORIO_ENTREGA_V79.md`

## Segurança e compatibilidade

- Rascunho, ajuste e revisão pendente não podem ser liberados por cópia.
- A transação valida novamente itens, competência e estado.
- O cliente continua vendo somente meses `liberado`.
- Nenhum conteúdo é restaurado ou recriado por parecer vazio.
- Os dois endereços compatíveis do calendário permanecem idênticos.

## Validação exigida

- `scripts/preflight.mjs`
- `scripts/regression-critical.mjs`
- `scripts/regression-v71.mjs` a `scripts/regression-v79.mjs`
- inspeção do DOM da Cecília, seleção de competência, falha/vazio e versões desktop/mobile
- leitura de produção por competência antes de concluir quais calendários não foram feitos

## Limite operacional

Copiar prepara o link e libera a visualização no Portal, mas não envia mensagem automaticamente no WhatsApp. A entrega ao cliente continua dependendo de Cecília colar e enviar o link. Calendários realmente vazios precisam ser produzidos pela equipe; a V79 não inventa nem restaura conteúdo.
