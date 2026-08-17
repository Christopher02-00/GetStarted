[RELATORIO_ENTREGA_V71.md](https://github.com/user-attachments/files/31149737/RELATORIO_ENTREGA_V71.md)
# Entrega V71 — recibo de demandas e mensagens para clientes

Data: 17/08/2026  
Base oficial: `main` em `8ad88b13d051d6845221a8f9e6be3caaa7969aef`

## Incidente recuperado

- Gabi recebeu confirmação visual de uma demanda para Chris, mas não existe hoje uma demanda aberta correspondente na fila dele.
- O escritor antigo mostrava sucesso depois de `addDoc()`, sem reler a referência, conferir o roteamento ou atualizar a fila local.
- Demandas colaborativas eram escritas em várias etapas e podiam ficar parciais.

## Correção preparada

- Reserva todos os IDs e grava principal + colaboradores em um lote atômico.
- Relê cada ID e valida protocolo, título, origem, destinatário e estado antes de anunciar sucesso.
- Em falha de confirmação, mantém os mesmos IDs para nova leitura sem duplicação.
- Mostra um protocolo curto de confirmação e atualiza a fila local.
- Inclui o destinatário principal na notificação posterior ao recibo.

## Mensagens para clientes

- Novo item **Mensagens para clientes**, logo abaixo de **Régua de Cobrança**, exclusivo do DOM e da porta do Chris.
- Lista derivada da Central única de clientes, incluindo compatibilidade legada e exclusão correta de saídas efetivas.
- Contato brasileiro validado com DDD; sem contato válido, o botão é bloqueado e aponta para a Central.
- Mensagem aceita `{cliente}` ou `{nome}` e abre `wa.me` com o texto pronto.
- A tela informa que o WhatsApp Web deve estar conectado ao número (41) 99908-8357. O clique final de envio continua manual.

## Arquivos da entrega

- `escritorio.html`
- `scripts/preflight.mjs`
- `scripts/regression-v71.mjs`
- `CATALOGO_DE_ERROS.md`
- `AGENTS.md`
- `RELATORIO_ENTREGA_V71.md`

## Validação concluída

- `scripts/regression-v71.mjs`: aprovado com 18 asserções dirigidas, incluindo commit atômico, falha de releitura, retentativa no mesmo ID, validação de destinatário e normalização do WhatsApp.
- `scripts/preflight.mjs`: aprovado; 9/9 scripts inline têm sintaxe válida e o build é `2026-08-17-demandas-whatsapp-clientes-v71`.
- `scripts/regression-critical.mjs`: aprovado com 604 asserções de regressão.
- `calendario.html` e `calendarios.html`: byte a byte idênticos; nenhum arquivo da cadeia de calendários foi modificado.
- DOM real sem login: Financeiro, botão e view de mensagens não existem no documento.
- Layout: conferido em desktop 1280×900 e mobile 390×844; menu, cartões, busca, indicadores e botão permaneceram legíveis, sem sobreposição.
- Git diff: aprovado com CRLF reconhecido como terminação de linha; não há exclusão física nem mudança em `firestore.rules`.

## Limite real

Os testes locais comprovam lógica, DOM, isolamento por papel, retentativa e URLs. A existência da correção em produção só pode ser afirmada após o upload e a comparação do build publicado. Nenhuma demanda real nem mensagem real foi criada durante esta etapa.

