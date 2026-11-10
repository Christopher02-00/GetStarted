# nao-precisa-agendar-sem-ponteiro — "Não precisa agendar" funciona quando o item ainda não aponta para a postagem
Pedido original (literal, áudio 10/11 12:37): "Tem vídeos que não precisam ser publicados… antes eu ia, não precisa agendar… Só que não vai, tá bugado."
Unidade: urgente U4 de 10/11 · Tipo: erro
Sintoma: Fedalto "VÍDEO 2 (ANÚNCIO DARK POST)". "Encerrar sem publicação" responde "O item aponta para outra postagem. A pauta foi preservada."
Reprodução:
- Produção (somente leitura): a postagem `video_8r8BYGmfPy6n4b20rtat` está `aguardando_agendamento`, e o item `calitem_1792089646154_oetiisi` não tem `postagemId`.
- A J43 reproduz a mensagem exata no código antigo.
Causa-raiz: `prepararItemCalendarioConfirmacaoR5` exige `item.postagemId === postagem` também para sair SEM publicar. Item nunca agendado não tem ponteiro.
Árvore:
RAIZ: calendarios.items[].postagemId × saída sem publicação (arquivar/devolver)
├─ ESCRITORES : publicacao.mjs (servidor), escritorio.html (cópia local da mesma função)
├─ HUMANOS    : Cecília (tira da fila com motivo, decisão do Chris de 10/11)
└─ COLATERAL  : nenhum. Publicar/regularizar continua exigindo o ponteiro exato
Mudança: para `arquivar`/`devolver`, quando o item não aponta para esta postagem, a pauta fica intacta (retorna sem alterar itens) e só a postagem sai. Alterado em `functions-get/lib/guardas-agendamento-cp101-i165.mjs` e na cópia do `escritorio.html`.
Testes: J43 (nova, vermelha → verde) + portão completo.
