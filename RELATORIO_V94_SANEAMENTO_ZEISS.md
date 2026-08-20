# V94 — saneamento Zeiss/Zeens e fechamento da consistência de clientes

Data da auditoria: 20/08/2026.

## Resultado por causa

| Causa | Diagnóstico comprovado | Alteração | Estado |
|---|---|---|---|
| iPhone Campo Largo | O contrato real já estava ativo, mas `clientes_config` ainda dizia que o cliente havia saído da carteira. | No Firebase publicado, `semConteudoRecorrente` foi alterado para `false` e o motivo obsoleto foi removido. Localmente, o escritor do contrato passa a fazer essa limpeza na mesma transação. | Dado real corrigido e relido. Prevenção pronta para publicar. |
| Helo Arquiteta | Setembro existe no documento confirmado, mas tem zero conteúdos. Agosto continua preservado no backup com oito itens; não há versão de setembro perdida em `calendarios_versoes`. | Nenhum conteúdo foi inventado, copiado de agosto ou restaurado por cima. A tela real abriu Helo/setembro e mostrou “ainda não foi produzido”. | Incidente fechado como ausência real de conteúdo, não falha de leitura. A produção do mês pertence à rotina editorial. |
| Zeiss / Zeens | A V93 publicada exibiu corretamente a divergência. A tentativa real relêu 9 itens ativos do calendário e 4 competências, mas o Firestore abortou a transação ao criar `zeiss_2026-10`: `deleteField()` foi usado em `Transaction.set()` sem merge. | V94 acrescenta `{merge:true}` ao ramo que cria competência canônica e amplia o laboratório com outubro existente somente no alias. | Falha real reproduzida sem escrita parcial; correção V94 preparada e validada localmente. |
| Entrada/saída de clientes | A cadeia de mensalistas já possui ID determinístico, ponteiro de saída, soft-delete, arquivo e reativação; porém cartões avulsos ainda ofereciam Portal e saída mensalista. | V93 limita Portal/Calendário/saída a mensalistas. IKN e avulsos do funil recebem somente finalização de projeto; avulso legado não ganha ação recorrente. | V93 publicada e conferida na Central real. |
| She Joias x X Joias | O acervo confirma que são identidades distintas. X Joias é avulso; She Joias é outro registro. | Nenhuma fusão ou arquivamento por semelhança de nome foi realizado. | Decisão preservada; evita repetir a fusão indevida Hitech/Rodrigo. |

## Evidências de validação

- Leitura real do Firebase do iPhone após a correção: ativo, mensalista, contrato confirmado, `semConteudoRecorrente=false` e sem o motivo antigo.
- Clique real na Central publicada: iPhone aparece ativo, Básico, R$ 800, vencimento dia 15 e primeira cobrança `2026-09`.
- Clique real na tela publicada de Mensalidades, autenticada como Chris: ao avançar a grade de agosto para setembro, `iphone campo largo` aparece no grupo do dia 15, com `R$ 800,00` e em aberto, sem cortesia. A conferência foi somente leitura e não alterou pagamento.
- Leitura real de Helo: `calendarios/helo-arquiteta` com setembro e zero itens; backup de agosto com oito itens; nenhuma versão de setembro encontrada entre 112 versões auditadas.
- Clique real na Central publicada: Helo/setembro abriu com o estado vazio confirmado, sem transformar falha em vazio.
- Auditoria real de Zeiss/Zeens: contrato, configuração, acesso, pagamentos e calendários lidos antes de desenhar o saneamento. Nenhum token ou dado pessoal é reproduzido neste relatório.
- Tentativa real de Zeiss/Zeens na V93: a confirmação mostrou 9 itens ativos e 4 competências; a transação falhou antes do commit e a Central informou “Nada foi consolidado”.
- O novo laboratório executado contra o código V93 falha exatamente em `deleteField() exige set com merge`, reproduzindo o SDK real.
- `regression-v93-consistencia-clientes.mjs` na V94: 25/25 verificações, incluindo competência existente somente no alias, criação canônica com merge e cancelamento lógico da duplicata.
- `regression-v93-ui-central-clientes.mjs`: 20/20 verificações com cliques reais em Chrome isolado, desktop e mobile.
- `regression-v92-ui-contrato-incompleto.mjs`: 20/20 verificações com R$ 800, dia 15, setembro e sem cortesia indevida.
- `regression-v92-ciclo-clientes.mjs`: 24/24 verificações de contrato, mensalidade, idempotência e isolamento de Portal/Calendário/Stories.
- `regression-v81-clientes.mjs`: 49/49 verificações do ciclo entrada → saída → arquivo → reativação.
- `regression-v81-contatos.mjs`: 25/25; `regression-v83-contatos-contratos.mjs`: 30/30.
- `regression-critical.mjs`: 608 asserções aprovadas novamente na composição completa com a V94.
- `scripts/preflight.mjs`: resultado integral aprovado após reconhecer a cadeia V91.1 → V93 → V94.
- Central real da V93: 24 mensalistas ativos, 2 trabalhos avulsos, 2 saídas programadas e 5 arquivados. IKN possui apenas “Finalizar projeto e arquivar”; Mayk não recebe Portal, Calendário ou saída mensalista.
- Contatos reais da V93, autenticado como Chris: as buscas por `X Joias` e `IKN` retornaram “Nenhum cliente ativo corresponde à busca”; `iphone campo largo` retornou “CONTATO PRONTO” e o botão “Abrir conversa no WhatsApp”. Nenhuma mensagem foi enviada.
- Testes históricos de calendário: V87 50, V88 55, V89 papéis 8, V90 carteira 12 e V91 publicados 15, todos aprovados.
- Testes visuais históricos: V89 Calendários 7 cliques aprovados; V91 Publicados 4 cliques aprovados; Hitech/Rodrigo 6 cliques aprovados.

## Estado de publicação

- A limpeza do dado real do iPhone já foi aplicada e conferida no Firebase e nas telas publicadas Central e Mensalidades.
- A V93 foi publicada pelo usuário e validada na Central real.
- A tentativa de consolidação Zeiss/Zeens na V93 foi abortada atomicamente; nenhum registro parcial foi persistido.
- A V94 precisa ser enviada manualmente pelo usuário. Depois do upload e da conferência do build, o mesmo botão será executado novamente e seus recibos serão relidos.
- Nenhuma regra Firebase foi modificada por esta entrega.

## Arquivos da entrega

- `escritorio.html`
- `CATALOGO_DE_ERROS.md`
- `scripts/regression-v92-ciclo-clientes.mjs`
- `scripts/regression-v92-ui-contrato-incompleto.mjs`
- `scripts/regression-v91-1-rodrigo-central.mjs`
- `scripts/regression-v93-consistencia-clientes.mjs`
- `scripts/regression-v93-ui-central-clientes.mjs`
- `scripts/preflight.mjs`
- este relatório, instrução de upload e manifesto SHA-256.
