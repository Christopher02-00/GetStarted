# cp244-video-excluido-encerra-postagem — vídeo na Lixeira não deixa postagem viva

Origem: Programa Estabilidade (pedido do Chris, 20/11: "corrigir, verificar e prever… correção definitiva, aplicada"). Achado do Raio-X da
produção (exportação de 21/11, só leitura), regra D1 "postagem ativa com vídeo excluído".
Unidade: única · Tipo: defeito de caminho

Caso real: Camargo's "Não olhe! (antes e depois)" (`video_GBMxNRsyk8ZUT34LT8el`).
- 07/10: aprovado pelo Chris. 08/10: o cliente aprovou, e depois pediu ajuste ("vamos regravar"). A postagem foi para `em_correcao` e o vídeo para `correcao`.
- 09/10: o João Victor excluiu o vídeo ("Vai ser regravado").
- Hoje: a postagem segue em `em_correcao` há 6 semanas, sem dono.

Causa (lida no código):
- `excluirVideoComMotivo` (escritorio.html, o único núcleo de exclusão do editor e da gerência) só grava `excluido:true` no vídeo e avisa a Amanda;
- o I165 trata vídeo excluído como "fora do escopo" e não gera aviso (`obrigacoesLegadoProgramacaoI165`);
- a retirada do servidor (`operarPublicacaoI165` 'cancelar') só aceita `aguardando_legenda`, `aguardando_agendamento` e `agendado`, e não `em_correcao`;
- resultado: nenhum caminho encerra a postagem.

Correção: um gatilho no servidor (vale para todo caminho de exclusão), `functions-get/video-excluido-postagem-cp244.mjs`, export `videoExcluidoPostagemGetCp244`.
- Vídeo vai para a Lixeira e a postagem ainda não foi para a rede (`em_correcao`, `aguardando_reconfirmacao_cliente`, `aguardando_legenda` ou `aguardando_agendamento`):
  - a postagem vira `arquivada_sem_postagem`, com `notaCorrecao` = "Vídeo excluído por X: motivo";
  - grava a marca `encerradaPorVideoExcluidoCp244` (com a etapa anterior) e uma linha no histórico.
- Postagem já `agendado`: não mexe, porque está na plataforma. Cria UMA demanda para a Cecília, "🗑️ Tirar do agendamento…".
- Vídeo recuperado:
  - só a postagem encerrada por este gatilho volta para a etapa anterior;
  - a demanda aberta da Cecília fecha sozinha.
- Não muda: o calendário (o conteúdo continua previsto, por exemplo para regravar), pedidos de cliente e postagens publicadas.

Árvore:
RAIZ: postagem ligada a vídeo excluído
├─ ESCRITORES : este gatilho (servidor); exclusão e recuperação na tela seguem iguais
├─ LEITORES   : filas de postagem (Cecília/Amanda), I165 (`postagemOperacionalGetI165` reconcilia sozinho), Acompanhamento do Portal
│               (CP205), legenda sem vínculo (CP214 fecha sozinha)
├─ PAPÉIS     : editor/gerência excluem; Amanda recupera; Cecília recebe "Tirar do agendamento" quando já agendada
├─ RULES      : sem mudança (escrita pelo servidor)
├─ AUTOMAÇÕES : gatilho novo em `videos_producao/{id}`; idempotente (reprocessar não duplica nem reabre)
├─ LEGADO     : o caso da Camargo's (anterior ao gatilho) só se resolve com escrita em dado → precisa do ok do Chris
└─ EFEITO     : nenhuma postagem órfã nova; recuperar desfaz

Testes:
- J96 (3 casos, cliques reais):
  - contraprova sem o gatilho: casos 1 e 3 vermelhos;
  - com o gatilho: 5/5.
- Vizinhas: J04, J21, J40, J59, J61, J80, J83, J95.

Publicação: Functions (ok geral do Chris para publicar Functions, 20/11) + docs.
