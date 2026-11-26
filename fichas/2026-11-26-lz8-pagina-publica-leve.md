# lz8-pagina-publica-leve — index.html sem imagens embutidas
Pedido (26/11): catálogo Limpeza 2027, item pag-index ("No geral ok pode começar").
Unidade: LZ8 · Tipo: ajuste (desempenho, sem mudança visual)
Antes: index.html com 1.064.362 bytes; 15 imagens em base64, a logo repetida 4 vezes (ícone, menu, abertura, rodapé).
Depois: index.html com ~35 KB; 12 arquivos em img/inicio/ (logo.png, destaque.jpg, 5 pôsteres dos vídeos, 5 depoimentos),
mesmos bytes das imagens originais (extraídos do base64, sem recompressão). A logo baixa uma vez e fica no cache do navegador.
Árvore: RAIZ index.html (página pública) · LEITORES: visitantes; nenhum teste, jornada ou página carrega index.html ·
_config.yml não exclui img/ · videos/ e Planos.pdf intactos.
Prova: renderização antes × depois (Playwright, http local): 0 imagem quebrada, 0 requisição falha; celular 390 px idêntico
byte a byte; computador 1366 px com 937 pixels diferentes (0,008%), só na animação da abertura.
Risco residual: nenhum além de o primeiro acesso baixar 12 arquivos pequenos em vez de 1 grande.
