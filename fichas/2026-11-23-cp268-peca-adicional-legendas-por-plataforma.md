# cp268 — a peça adicional da Stokki nasce com as legendas por plataforma

Pedido (Chris, 23/11): "Se vc recomenda fazer isso que vai melhorar tudo eu aprovo pode fazer" — sobre liberar a peça adicional
("+ Adicionar conteúdo interno") para a Stokki com legenda por plataforma, pendente depois da CP267. Unidade: 1 · Tipo: ajuste.

Causa: `functions-get/ajustes-internos-cp123.mjs` ainda tinha `!['stokki','zeiss'].includes(c.cliente)` no `adicionar` (retorno e início)
desde a CP142 (30/10), sem registro do motivo. Motivos reais: a Stokki precisa de legenda por plataforma; a Zeiss separa conteúdo por
empresa (módulo `lib/empresas-cp101-i165.mjs`, `ativo(cliente)`), e a peça adicional não tem empresa.

Árvore:
RAIZ: registro CP123 `tipoAjuste:'adicao_cp142'` (conteudo) → liberação → `materializarAdicaoCp142` → item novo do calendário + retrato
├─ ESCRITORES: iniciar/salvar/enviar/decidir CP123; contrato do salvar (`validarConteudoAdicaoCp142`); liberação da Amanda
├─ LEITORES: quadro "Ajustes internos" (tela), cópia do cliente, calendário do cliente (gs-legenda-cliente-i95), fila de legendas/postagem
├─ HUMANOS: Chris (cria), Amanda (aprova/libera), cliente (vê), equipe (grava/legenda)
├─ RULES: sem mudança
└─ LEGADO: peças já criadas sem legendas por plataforma continuam válidas (o registro decide; o contrato aceita os campos como opcionais)

Mudança:
- `adicao-interna-cp142.mjs`: `REDES_ADICAO_CP268` opcionais no contrato (texto ≤ 30.000); `conteudoInicialAdicaoCp142(redes)`.
- `ajustes-internos-cp123.mjs`: `mesMultiplataformaCp268` (algum conteúdo do mês com legenda própria por plataforma) → a peça nasce com as
  quatro legendas; salvar exige os mesmos campos com que nasceu; `adicionar` deixa de excluir pelo nome: só o cliente com empresas ativas
  (`empresasCp101.ativo`) fica fora, com o motivo na tela; a validação do registro aceita as legendas por plataforma também na peça adicional.
- `gs-ajustes-internos-cp123.mjs`: a peça adicional mostra os campos por plataforma quando o registro os tem; cadeia `?v=` até o escritório.

O que NÃO muda: a peça adicional da Mochi e dos demais (mesmos campos), a Zeiss (segue fora, agora pelo módulo de empresas), rules, vídeo.

Testes: J123 7/7 — vermelha no main (4/7: "a tela não oferece '+ Adicionar conteúdo interno' para a Stokki") → verde: Stokki cria a peça
pela tela com os 4 campos, Amanda aprova e libera, calendário e versão liberada com as quatro legendas, Portal mostra 4/4; Mochi com os
campos de sempre; Zeiss sem peça adicional e com o motivo, corrigir disponível. Vizinhas CP123/CP142 no CI e local.
Publicação: Functions com o ok do Chris ("eu aprovo pode fazer", 23/11).
