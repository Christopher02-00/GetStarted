# liberar-pedido-do-cliente — pedido feito pelo cliente, aprovado pela Amanda, volta ao cliente (CP202)
Pedido original (literal): Chris, 11/11: "Pedido: liberar ao cliente os ajustes que o próprio cliente pediu pelo portal … de urgência isso agora mesmo e com velocidade" + comportamento esperado (liberar com o mês em ajuste_interno vindo do cliente; mês volta a liberado; Cecília avisada; peça adicional aceita; nada muda para devolução da Amanda nem para pedido pendente).
Unidade: 1 de 1 · Tipo: erro
Reprodução (produção, só leitura, 11/11): Bluefit 2026-11 — pedido "Vem aí: 26 e 27 de novembro" aprovado; CP121 {disponivel:false}. Divina 2026-11 igual. Place 2026-11: 2 pedidos ainda "enviado" (Amanda aprova antes). Zeiss 2026-11 e Vitalle 2026-12 são do processo novo (I155) — outro caminho, fora desta unidade.
Causa-raiz: CP121 (elegibilidadeReliberacaoAjustesCp121) só aceitava mês `liberado` com fase `publicada` e `publicacaoAtual` registrada. Pedido do cliente põe o mês em `ajuste_interno` (por 'Cliente'); o Chris abre a continuidade para corrigir (fase `aberta`); meses publicados pelo caminho antigo não têm `publicacaoAtual`. E a comparação calendário × retrato acusava o próprio conteúdo corrigido e os posts criados pela programação da Cecília.
Árvore:
RAIZ: CP121 elegibilidade + comparação calendário × retrato
├─ ESCRITORES: CP193 (pedido do cliente → ajuste_interno por Cliente), editor (Chris corrige), CP112 (Amanda aprova), decisão publicar (Amanda libera)
├─ LEITORES: Central do editor (botão "Liberar correções ao cliente" = reliberacaoCp121.disponivel), gs-ajustes-calendarios-cp112 (revisar liberação)
├─ AUTOMAÇÕES: aviso à Cecília na publicação (mesmo caminho de hoje)
└─ EFEITO: depois da liberação o mês fica `liberado` → peça adicional (CP142/CP123) volta a ser aceita
Mudança (functions-get/ajustes-calendarios-cp112.mjs): CP121 aceita também mês em `ajuste_interno` por 'Cliente' com pedido CP193 (fase nao_iniciada/aberta/publicada), com a mesma exigência de última publicação da Amanda (retrato + marca; publicacaoAtual quando existir). Comparação `comparacaoPublicacaoCp202`: fica de fora só o conteúdo dos pedidos aprovados que esta liberação publica (hash = versão aprovada) e a peça criada pela programação (programada/publicada); datas de produção seguem a CP201. Usada também na liberação de ajustes internos (CP123).
O que NÃO muda: devolução da Amanda (por 'Amanda'), pedido pendente ou só enviado, edição do Chris fora dos pedidos aprovados (continua bloqueando), processo novo I155.
Testes: RPR5 (.qa-get) pedido do cliente → recepção → Chris corrige e envia → Amanda aprova → Amanda libera: vermelho sem a correção ("…precisa ver Liberar correções ao cliente…: {disponivel:false}"), verde com ela; RPR1–RPR4 verdes; portão completo.
Produção (só leitura, com a correção): Bluefit e Divina → disponivel:true; Place → aguarda aprovação; Fedalto → CP123 disponível.
Publicação: Functions — ok nominal do Chris antes do deploy.
