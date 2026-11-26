# lz3d-stories — Stories sai do Escritório (tela, Stories Diários, automações, checklist e atalhos)
Pedido (Chris, 26/11): catálogo Limpeza 2027 (menu-stories) — "No geral ok pode começar".
Unidade: LZ3d (menu, parte 4) · Tipo: ajuste (remoção)
Prova de desuso (export 25/11): stories_semanais parado desde 02/10, stories_clientes desde 14/09; a tela já estava escondida para
Chris e Amanda pelo processo novo (27/10); quem produzia (Gabrielle) saiu da equipe. Nenhuma demanda de stories aberta; o aviso de fila
aviso_fila_i83b_stories está encerrado ("aprovada") desde 02/10.
Árvore (levantamento só leitura, 26/11):
RAIZ: navStories/view-stories + bloco "Tela própria de Stories" (~70 funções) + Stories Diários (no Meu Checklist de Chris e Amanda)
├─ AUTOMAÇÕES que saem: cobrarStoriesDaSemana (motor 'storiesDaSemana'), verificarStoriesParadosAmanda (motor 'storiesEsperandoRevisao')
├─ CHECKLIST: bloco Stories Diários sai do Meu Checklist; item g_d_10 e sua conferência automática (template da Gabrielle) saem;
│  incluirItemStoriesObrigatorio fica só com o ramo da Cecília; o texto especial do item "story divina" da Amanda sai (não existe mais no
│  modelo salvo dela)
├─ AVISO DE FILA I83B: fica só para a distribuição de vídeos (tipo 'stories' recusado; modal só com "Abrir distribuição de vídeos")
├─ RADAR: a fonte stories_semanais deixa de ser lida (antes: leitura inteira + ouvinte em tempo real para a gestão); o módulo recebe a
│  lista vazia, então os alertas antigos do elo F se encerram sozinhos; a origem "Stories" agora só avisa que a tela saiu
├─ RESUMO DO DIA (foto diária): não lê mais stories_semanais ("Pediu ajuste em story" sai)
├─ ATALHOS: "Aprovar e enviar stories" (Amanda), botão "Revisar e liberar Stories" em Aprovações, área "stories" da Central R87
│  (gs-central-unificada-r87.mjs sem o item e sem navStories; ?v atualizado)
└─ FICAM: escritas de ciclo de vida em stories_clientes (entrada/saída de cliente), rrIncluiStories/ecaStories, aba Stories do Portal
   do Cliente (só leitura do que já existe), coleções (dados guardados)
Testes: sintaxe e caminhos verdes; RPR1 verde local; jornadas J109 (Radar), J102, J118, J113, J114, J115, J41, J60h, J12, J01: 94/95 (a J91 só falha por depender de J06/J56/J60–J60g, fora da seleção; roda completa no CI).
