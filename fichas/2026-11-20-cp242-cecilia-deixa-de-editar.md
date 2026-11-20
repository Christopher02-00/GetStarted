# cp242-cecilia-deixa-de-editar — a Cecília sai da edição; Helo e João Victor dividem as edições

Pedido (Chris, 20/11): "retirar a Cecília como editora — ela não é mais editora da nossa agência, faz parte só da secretaria agora; as
edições serão divididas entre a Heloísa e o João … retirada correta, sem prejudicar outras áreas … assim como fizemos com a Gabrielle …
vá além". Demanda no portal: "Tirar Cecília de editora no site" (Amanda → Chris, 20/11 11:57, `wZme1hS62LhqzhaJ1YJE`).
Unidade: única · Tipo: ajuste (mudança de papel; a Cecília continua na equipe)

Caso real (somente leitura, exportação de 20/11 13:35): a Cecília não tem vídeo para editar nem corrigir (a Amanda já redistribuiu às 11:58:
"Vídeo retirado da sua fila: Place — Provador na rua" → Helo); histórico: 212 finalizados e 40 aprovados com o nome dela (autoria, fica);
1 demanda informativa aberta ("Vídeo retirado da sua fila"). Carga atual: Helo 16, João Victor 7, Nathan 0.

Todos os pontos em que ela é editora (lido no código):
- `EDITORES_GERAL` (distribuição automática, carga, alvo, todos os seletores via `editoresAtuaisI53()`: sem editor, mudar pra, correção I53,
  somente edição, reatribuir) e `EDITORES_SELECIONAVEIS` (aba "Meus Vídeos", `papelPodeEditarVideos`, ouvinte em tempo real da própria fila,
  Meu Dia de editor) — `escritorio.html`.
- `EDITORES_CONFIG` (capacidade 2) — `escritorio.html`.
- Mensagem com nomes à mão: "Escolha um editor atual: Helo, Cecília ou João Victor" — `escritorio.html`.
- `EDITORES_SOMENTE_EDICAO_CP194` (servidor) — `functions-get/encaminhamento-somente-edicao-cp194.mjs`.
- `firestore.rules` linha ~3048 (`d.editorAtribuido in['Helo','João Victor',fO(),'Nathan']`): caminho antigo do navegador para o
  encaminhamento CP194, que a tela não usa desde a CP194 (vai pelo servidor). NÃO muda (rules só com ok nominal; sem efeito na operação).

O que NÃO muda (ela continua na secretaria/produção): listas de pessoas (`FUNCIONARIOS`, `PAPEIS_OPERAVEIS_POR_CHRIS`, responsável de
gravação, organização I167, demandas), agenda/gravações, postagens/agendamento/publicação (ouvinte próprio da Cecília), legendas
(`papeis-funcoes.json`), cofre, "Entregas finalizadas", `papelPodeAbrirVideos` (explícito para ela), menus da J01. Histórico de vídeos e
autoria intactos; nenhum dado é gravado. Nathan sem mudança (já não estava na distribuição; segue selecionável só para a própria fila).

Árvore:
RAIZ: listas de editores (tela e servidor)
├─ ESCRITORES : distribuição automática (I53), seletores da Amanda (sem editor / mudar pra / correção / somente edição), CP194 no servidor
├─ LEITORES   : Meus Vídeos, Meu Dia do editor, ouvinte de `videos_producao` por editorAtribuido, carga por editor, alvo/capacidade
├─ PAPÉIS     : Amanda (distribui), Helo/João Victor (recebem), Cecília (deixa de receber; vê o resto igual)
├─ RULES      : sem mudança (caminho antigo, sem uso)
├─ AUTOMAÇÕES : atraso de vídeo por editorAtribuido — sem vídeo novo para ela, nada dispara
├─ LEGADO     : vídeo ainda atribuído a ela → "revisar responsável" + "Mudar pra…" (Helo/João Victor) — mesmo tratamento da Gabrielle
└─ EFEITO     : Cecília não vê mais "Meus Vídeos"; a Amanda não vê mais a Cecília nas escolhas

Testes: J95 (vermelha no código anterior → verde); J80 passa a usar a Helo (o cartão é o mesmo para todo editor); vizinhas J01, J33, J41, J76.
Publicação: Functions (CP194; ok do Chris 20/11: "Você pode publicar vc mesmo") + site.
Depois do ar: marcar a demanda "Tirar Cecília de editora no site" como feita (escrita no portal — esta sessão só lê a produção).
