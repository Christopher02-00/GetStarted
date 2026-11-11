# liberar-pedido-do-cliente-processo-novo — o mesmo caminho do CP202 no processo novo I155 (CP203)
Pedido original (literal): Chris, 11/11: "Zeiss 2026-11, Vitalle 2026-12 e Divina 2026-11: vão passar pelo mesmo caminho." + "Pode seguir."
Unidade: continuação do CP202 · Tipo: erro
Reprodução (produção, só leitura, 11/11): Zeiss 2026-11 e Vitalle 2026-12 são do processo novo (planejamento_social_i155, entrega já feita); pedidos do cliente ainda "enviado" à Amanda. Quando ela aprovar, o CP121 respondia indisponível (só aceitava a continuidade antiga) → mês travado.
Causa-raiz: elegibilidadeReliberacaoAjustesCp121 começava com `c.modo!=='continuar_legado' → não`.
Mudança: no processo novo, com o mês em ajuste_interno por 'Cliente' (pedido CP193), a liberação vale quando a base enviada à Amanda é a do calendário, já houve entrega e a publicação atual do ciclo é exatamente o retrato publicado pela Amanda. A publicação usa o caminho de hoje: a "entrega" do ciclo aceita nova publicação (preserva a primeira, atualiza publicacaoAtual).
O que NÃO muda: continuidade antiga (CP202), estratégico CP109, devolução da Amanda, pedido pendente.
Testes: J56 (ensaio) — cliente pede pelo link → recepção → Chris corrige e envia → Amanda aprova → Amanda libera: vermelha no main ("indisponível: {disponivel:false}"), verde com a correção (mês liberado, correção no retrato e na cópia do cliente, publicação atual do ciclo atualizada). Produção (só leitura): Zeiss e Vitalle atendem às condições do processo novo.
Publicação: Functions.
