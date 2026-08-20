# V93 — consistência de clientes, entrada e saída

Data da auditoria: 20/08/2026.

## Resultado por causa

| Causa | Diagnóstico comprovado | Alteração | Estado |
|---|---|---|---|
| iPhone Campo Largo | O contrato real já estava ativo, mas `clientes_config` ainda dizia que o cliente havia saído da carteira. | No Firebase publicado, `semConteudoRecorrente` foi alterado para `false` e o motivo obsoleto foi removido. Localmente, o escritor do contrato passa a fazer essa limpeza na mesma transação. | Dado real corrigido e relido. Prevenção pronta para publicar. |
| Helo Arquiteta | Setembro existe no documento confirmado, mas tem zero conteúdos. Agosto continua preservado no backup com oito itens; não há versão de setembro perdida em `calendarios_versoes`. | Nenhum conteúdo foi inventado, copiado de agosto ou restaurado por cima. A tela real abriu Helo/setembro e mostrou “ainda não foi produzido”. | Incidente fechado como ausência real de conteúdo, não falha de leitura. A produção do mês pertence à rotina editorial. |
| Zeiss / Zeens | Contrato, configuração e Portal ativos estavam no alias `zeens`; o canônico `zeiss` estava encerrado. Agosto tinha uma mensalidade isenta no canônico e outra aberta no alias. | V93 consolida a leitura sem esconder Zeiss e oferece saneamento transacional específico: preserva token vigente, mensalidade resolvida e calendário; cancela logicamente a duplicata e arquiva aliases. | Preparado e validado localmente. Exige upload e confirmação explícita do botão em produção. |
| Entrada/saída de clientes | A cadeia de mensalistas já possui ID determinístico, ponteiro de saída, soft-delete, arquivo e reativação; porém cartões avulsos ainda ofereciam Portal e saída mensalista. | V93 limita Portal/Calendário/saída a mensalistas. IKN e avulsos do funil recebem somente finalização de projeto; avulso legado não ganha ação recorrente. | Preparado e validado localmente com cliques em desktop e mobile. |
| She Joias x X Joias | O acervo confirma que são identidades distintas. X Joias é avulso; She Joias é outro registro. | Nenhuma fusão ou arquivamento por semelhança de nome foi realizado. | Decisão preservada; evita repetir a fusão indevida Hitech/Rodrigo. |

## Evidências de validação

- Leitura real do Firebase do iPhone após a correção: ativo, mensalista, contrato confirmado, `semConteudoRecorrente=false` e sem o motivo antigo.
- Clique real na Central publicada: iPhone aparece ativo, Básico, R$ 800, vencimento dia 15 e primeira cobrança `2026-09`.
- Clique real na tela publicada de Mensalidades, autenticada como Chris: ao avançar a grade de agosto para setembro, `iphone campo largo` aparece no grupo do dia 15, com `R$ 800,00` e em aberto, sem cortesia. A conferência foi somente leitura e não alterou pagamento.
- Leitura real de Helo: `calendarios/helo-arquiteta` com setembro e zero itens; backup de agosto com oito itens; nenhuma versão de setembro encontrada entre 112 versões auditadas.
- Clique real na Central publicada: Helo/setembro abriu com o estado vazio confirmado, sem transformar falha em vazio.
- Auditoria real de Zeiss/Zeens: contrato, configuração, acesso, pagamentos e calendários lidos antes de desenhar o saneamento. Nenhum token ou dado pessoal é reproduzido neste relatório.
- `regression-v93-consistencia-clientes.mjs`: 23/23 verificações, incluindo execução transacional completa da consolidação Zeiss/Zeens.
- `regression-v93-ui-central-clientes.mjs`: 20/20 verificações com cliques reais em Chrome isolado, desktop e mobile.
- `regression-v92-ui-contrato-incompleto.mjs`: 20/20 verificações com R$ 800, dia 15, setembro e sem cortesia indevida.
- `regression-v92-ciclo-clientes.mjs`: 24/24 verificações de contrato, mensalidade, idempotência e isolamento de Portal/Calendário/Stories.
- `regression-v81-clientes.mjs`: 49/49 verificações do ciclo entrada → saída → arquivo → reativação.
- `regression-v81-contatos.mjs`: 25/25; `regression-v83-contatos-contratos.mjs`: 30/30.
- `regression-critical.mjs`: 608 asserções aprovadas na composição completa V91 + V93.
- Testes históricos de calendário: V87 50, V88 55, V89 papéis 8, V90 carteira 12 e V91 publicados 15, todos aprovados.
- Testes visuais históricos: V89 Calendários 7 cliques aprovados; V91 Publicados 4 cliques aprovados; Hitech/Rodrigo 6 cliques aprovados.
- Preflight completo: todas as verificações funcionais aprovadas; o único erro do roteiro antigo foi a expectativa literal do rótulo `V91`, substituído corretamente por `V93`.

## Estado de publicação

- A limpeza do dado real do iPhone já foi aplicada e conferida no Firebase.
- A V93 local ainda precisa ser enviada manualmente pelo usuário ao GitHub.
- A consolidação persistente Zeiss/Zeens não foi executada em produção. Depois do upload, a Central mostrará o aviso e o botão exclusivo do Chris; a ação exige confirmação porque altera registros reais.
- Nenhuma regra Firebase foi modificada por esta entrega.

## Arquivos da entrega

- `escritorio.html`
- `CATALOGO_DE_ERROS.md`
- `scripts/regression-v92-ciclo-clientes.mjs`
- `scripts/regression-v92-ui-contrato-incompleto.mjs`
- `scripts/regression-v91-1-rodrigo-central.mjs`
- `scripts/regression-v93-consistencia-clientes.mjs`
- `scripts/regression-v93-ui-central-clientes.mjs`
- este relatório, instrução de upload e manifesto SHA-256.
