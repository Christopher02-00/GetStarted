# cp223-duplicata-video — a limpeza de duplicatas não esconde vídeo sem editor nem junta conteúdos diferentes
Pedido original (literal): "A limpeza de duplicatas nunca exclui vídeos ligados a conteúdos diferentes do calendário (itemId diferente) nem vídeos de envios diferentes (envioManualI67 diferente)… nunca faz exclusão silenciosa de vídeo gravado sem editor. Se suspeitar, avisa a Amanda em vez de esconder."
Unidade: U1 de 1 (+ listar outros vídeos excluídos como duplicata, sem restaurar) · Tipo: erro
Sintoma observado: em 16/11, 11:07Z, 7 avulsos das clínicas do Otávio ("<Cliente> — Vídeo", cada um ligado a um conteúdo diferente) viraram 3. Os outros 4 ficaram `excluido:true, excluidoPor:'sistema (duplicata)'` e sumiram de "Sem editor".
Reprodução: emulador. A J76, no código antigo, escondeu j76-b (conteúdo diferente) e j76-d (sem editor); a fila mostrou 1+1 em vez de 2+2 e não houve aviso (vermelho).
Causa-raiz: `varrerDuplicatas` (escritorio.html, rodada diária do motor) agrupava vídeos só por `cliente + norm(titulo)` e marcava todos menos o mais antigo como excluídos, sem olhar conteúdo, envio ou editor.
Árvore:
RAIZ: videos_producao.excluido escrito por varrerDuplicatas
├─ ESCRITORES : varrerDuplicatas (motor diário); o Luís cria os avulsos (CP221 já dá título do conteúdo)
├─ LEITORES   : renderGerenciaVideos ("Sem editor", filtra !excluido), filas dos editores, contadores
├─ HUMANOS    : Amanda distribui; editores; cliente (postagens param se o vídeo some)
├─ RULES      : nenhuma mudança (updateDoc e criação de demanda já permitidos ao motor)
├─ AUTOMAÇÕES : motor diário; criarDemandaSegura já evita aviso repetido (mesmo título pendente)
└─ COLATERAL  : a varredura de demandas agrupa por destinatário + título; o aviso tem título por cliente + vídeo, então não colide
Mudança: a chave do vídeo passa a ser cliente + título + itemId (`referenciaLegendaI78.itemId` ou `calendarItemId`) + `envioManualI67`. Num grupo com algum vídeo sem editor, nada é excluído e a Amanda recebe "Vídeos possivelmente repetidos · <Cliente> · <título>" (criarDemandaSegura, com `origemCp223`). Com todos já atribuídos, vale a regra antiga (soft-delete do mais novo, histórico mantido).
O que NÃO muda: a varredura de demandas; `videoJaExiste`; rules; nenhum vídeo é apagado.
Testes: J76 (nova; vermelha antes, verde depois); J04, J08, J17 e J39 (motor e vídeos), no computador e no celular; bateria inteira no CI.
Risco residual: vídeos antigos já excluídos pela regra velha não voltam sozinhos. Vão para uma lista para o Chris decidir (item 3 do pedido).
