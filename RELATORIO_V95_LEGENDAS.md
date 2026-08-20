# V95 — salvamento de legendas da Gabi

## Problema reproduzido

Ao salvar uma legenda de uma postagem em `aguardando_legenda`, o fluxo tentava atualizar ao mesmo tempo `postagens/{id}` e `videos_producao/{videoId}`. As regras publicadas permitem que Gabrielle atualize a postagem, mas não o vídeo. O Firebase rejeitava a transação inteira e nenhuma legenda era persistida.

## Correção local

- O vídeo continua sendo lido dentro da transação para impedir que uma cópia não canônica avance.
- O salvamento grava apenas a postagem: legenda, autoria, horário e estado `aguardando_agendamento`.
- A permissão de vídeo da Gabi não foi ampliada.
- A trava de clique duplo, a revalidação transacional e o recibo de persistência foram preservados.

## Evidências de validação

| Prova | Resultado |
|---|---|
| Regressão V95 do papel Gabrielle, incluindo fronteira que nega escrita em vídeo | 15/15 aprovada |
| Clique duplo real no formulário sintético com o handler extraído do Escritório | 1 gravação; estado `aguardando_agendamento` |
| Recarregamento da legenda persistida | texto reapareceu integralmente |
| Regressão V74 do fluxo de legendas/vídeos | 37/37 aprovada |
| Regressão crítica | 608/608 aprovada |
| Regressão V81 de vídeos externos | 72/72 aprovada |
| `calendario.html` x `calendarios.html` | byte a byte idênticos; não alterados |
| `firestore.rules` | hash inalterado; nenhuma regra precisa ser publicada nesta entrega |

O preflight funcional passou todos os controles do site e apontou uma única falha de higiene já existente na base V94: a cópia redundante `regression-critical.mjs` na raiz, além da versão correta em `scripts/`. Ela não participa do runtime do site e não foi misturada nesta correção.

## Estado de publicação

Preparado localmente. A versão publicada consultada ainda era V94 quando este relatório foi criado. A V95 só poderá ser comprovada em produção depois do upload manual do usuário e de um salvamento real com a conta da Gabi.

