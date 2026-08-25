# V114 — legenda editorial chega à fila da Cecília

Data: 25/08/2026  
Build: `2026-08-25-legenda-editorial-fila-cecilia-v114`  
Tipo: correção isolada e cumulativa sobre a V113

## Resultado

A legenda escrita por Gabrielle no item do calendário deixa de ficar numa fonte paralela. Se a postagem aprovada do mesmo item já existe, o salvamento confirmado move somente esse documento de `aguardando_legenda` para `aguardando_agendamento`. Se o vídeo ainda não gerou postagem, o texto permanece confirmado no calendário e é incorporado automaticamente quando a aprovação futura criar a postagem.

## Causa comprovada

O calendário gravava `calendarios/{slug}.items[].legenda`; a rotina tradicional de Gabrielle gravava `postagens/{id}.legenda`; Cecília lia somente `postagens` em `aguardando_agendamento`. Não havia ponte. Por isso era possível a Gabi ter salvo corretamente no calendário e a fila operacional da Cecília continuar vazia.

## Contrato da correção

- calendário moderno usa `calendarItemId` e nunca cai para índice se o ID existe;
- legado usa cliente + índice apenas quando item, postagem e vídeo não possuem ID;
- título, nome e dia não participam da identidade;
- postagem e vídeo são relidos na mesma transação;
- cliente, item, aprovação e `postagemId` canônico precisam coincidir;
- ambiguidade e divergência ficam zero-write;
- retry não duplica e estado posterior não regride;
- sucesso visual depende da releitura do recibo;
- falha na fila da Cecília aparece como indisponibilidade, nunca como vazio;
- entrega direta, Financeiro, Portal, captação e fluxo Place/Luís/Nathan não mudaram.

## Provas locais

| Camada | Resultado |
|---|---:|
| Reprodução na V113 | falhou como esperado |
| V114 domínio/contrato | 28/28 |
| V114 Chrome real desktop/mobile | 19/19 |
| Legendas V95 | 15/15 |
| Calendários V113 | 23/23 |
| Privacidade V110 | 49/49 |
| Portal V111 | 31/31 |
| Gerência Amanda V112 | 19/19 |
| Regressão crítica | 610/610 |
| Preflight | aprovado; 9/9 scripts inline |

Os testes cobriram sucesso, ausência de postagem aprovada, identidade moderna, legado inequívoco, duplicidade, cliente diferente, soft-delete, vídeo divergente, retry, entrega direta, `permission-denied`, desktop, mobile e falha de leitura da fila.

## Publicação e limite honesto

A V114 não altera `firestore.rules` em relação à V113. Contudo, a produção comprovada ainda está na V112: ao publicar a V114 diretamente, também é necessário publicar no Firebase o `firestore.rules` cumulativo que está dentro do pacote. Isso instala a regra V113 que acompanha o pedido de ajuste do calendário. Nenhum documento real de 24/08 foi consultado ou alterado durante a prova local. Depois da publicação, a jornada real deve ser confirmada com uma legenda controlada da Gabi e a fila da Cecília.

## Rollback

`rollback_v113` preserva os arquivos substituídos. O rollback é somente de frontend/testes e não altera dados já gravados. Uma postagem que tenha avançado legitimamente para `aguardando_agendamento` não deve ser regredida automaticamente.
