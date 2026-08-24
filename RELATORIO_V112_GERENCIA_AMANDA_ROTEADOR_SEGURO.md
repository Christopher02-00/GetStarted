# V112 — Gerência da Amanda e navegação segura por papel

Data: 24/08/2026  
Build: `2026-08-24-roteador-gerencia-papeis-v112`  
Tipo: entrega cumulativa V111 + V112

## Resultado

O perfil Amanda volta a abrir Painel de controle, Gerência, a tabela Agora, Extras e todas as subabas operacionais autorizadas. A correção não devolve Projetos Avulsos, Funil de Negócios, `negocios`, Financeiro ou outros dados exclusivos do Chris à Amanda.

A navegação também foi endurecida para que uma seção fisicamente ausente por papel não derrube outra seção permitida. Destino inexistente agora falha fechado, preserva a tela atual e explica que a área não está disponível para aquele perfil.

## Causa comprovada

A V110 retirou corretamente `gerenciaAvulsos` do DOM da Amanda por privacidade. O roteador comum, porém, ainda acessava `gerenciaAvulsos.style` antes de verificar qual subaba deveria abrir. Como o nó não existia para Amanda, uma exceção interrompia o fluxo antes de `gerenciaAgora`, renderer ou leitura.

O teste anterior verificava a ausência do módulo restrito, mas não executava todas as rotas permitidas depois da troca Chris → Amanda. A prova vermelha V112 encontrou 7 falhas em 16 verificações estáticas e 9 em 21 verificações no Chrome.

## Alterações

- fonte única liga cada subaba de Gerência ao painel correspondente;
- o roteador altera somente painéis que existem naquele perfil;
- autorização de papel e subaba ocorre antes de renderer ou rede;
- Projetos Avulsos e Funil de Negócios ficam fisicamente exclusivos do Chris;
- `renderFunilNegocios()` repete a guarda antes de consultar dados comerciais e descarta resposta de identidade antiga;
- Extras volta para Amanda e Chris, conforme a matriz canônica;
- o roteador principal valida a view antes de remover a tela atual;
- callbacks antigos sem botão/view não lançam `null.classList` nem deixam a aplicação em branco;
- o build V112 preserva integralmente a proposta protegida V111 e a fronteira de identidade V110.

## O que não mudou

Não houve mudança em dados, coleções, contratos, mensalidades, pagamentos, Fedalto, Joaquim/Açougue, contatos financeiros, calendários, Stories, Place/Luís/Nathan, vídeos, postagens ou captação. A V112 não altera regras Firestore; o arquivo de regras do pacote é a versão cumulativa V111, necessária porque a V111 ainda não havia sido publicada.

## Provas locais

| Camada | Resultado |
|---|---:|
| V112 estática | 19/19 |
| V112 Chrome real | 27/27 |
| V110 estática + UI | 49/49 + 28/28 |
| V111 estática + UI | 31/31 + 25/25 |
| Portal financeiro | 42/42 |
| Segurança | 20/20 |
| UI financeira V109 | 93/93 |
| Núcleo financeiro | 248/248 |
| Emulator Portal V111 | 56/56; orçamento 0 |
| Emulator Financeiro | 144/144; orçamento 0 |
| Regressão crítica | 610/610 |
| Preflight | aprovado |

O Chrome real percorreu todas as subabas permitidas da Amanda, rotas proibidas, retorno ao Chris, sete outros papéis, desktop, mobile, duas abas, reload real e callback antigo. Não houve `pageerror`. Os Emulators são locais e isolados; nenhum Firebase real foi acessado.

## Publicação coordenada

A V112 é cumulativa e substitui a necessidade de publicar a V111 separadamente. O upload exige os arquivos GitHub do manifesto e a publicação de `firestore.rules` no Firebase. O frontend novo com regra antiga falha fechado na proposta protegida; a regra nova com frontend antigo também pode interromper temporariamente o fluxo anterior. Os dois lados devem ser publicados na mesma janela.

## Selo do pacote

A pasta final contém 93 arquivos físicos: 92 entradas no manifesto, sendo 90 publicáveis e 2 arquivos locais em `rollback_v111`; o upload GitHub contém 91 arquivos ao contar o próprio manifesto. O pacote não contém `node_modules`, logs de Emulator, regras geradas, capturas, memória privada ou metadados `__MACOSX`.

## Rollback

`rollback_v111` contém somente `escritorio.html` e `_config.yml` anteriores, os dois arquivos de runtime alterados pela V112. Ele não entra no GitHub. Restaurá-lo reintroduz a falha da Amanda, portanto deve ser usado apenas diante de regressão mais grave e após diagnóstico.

## Estado

Corrigida, validada e empacotada localmente. Ainda não é produção comprovada. A prova final exigirá confirmar build/arquivos publicados, regra Firebase e a jornada autenticada Chris → Amanda → Chris após o upload do responsável.
