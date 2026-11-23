# cp266 — a Cecília agenda várias postagens de uma vez, com conferência única

Pedido original (literal, Chris, 23/11): "simplificar para a Cecília e Amanda aprovar mais de uma coisa de uma vez por exemplo aprovar tudo
de uma semana inteira … sem gerar problemas em outras áreas … verificação após isso tem que ser perfeita completa".
Decisão do Chris na caixa de perguntas (23/11): "Agendamento em lote da Cecília → Sim, conferência única (no lugar da marcação por postagem,
CP110)". Unidade: C4a (3ª de 3 do lote) · Tipo: novo (ajuste de regra decidido pelo Chris).

Volume real (30 dias, export 22/11): a Cecília registrou 184 agendamentos (≈ 46/semana), um por um, cada um com a sua conferência CP110.

Árvore:
RAIZ: `postagens.status` aguardando_agendamento → agendado (ação `programar` do servidor, via `preparar_programacao` + assinatura)
├─ ESCRITORES: `fluxo.confirmar('programar')` (gs-postagem-controles-i165.mjs) — o único caminho; o lote não grava nada fora dele
├─ LEITORES: fila "Para agendar", Publicações para conferir (CP125), calendário, vigia D2/D4, faxina CP248 (confirmação após 2 dias)
├─ HUMANOS: Cecília (agenda), Amanda (orientação; decide data diferente — CP235), Chris (auditoria; o botão existe para os 3 papéis, como hoje)
├─ RULES: sem mudança (a gravação é do servidor)
├─ AUTOMAÇÕES: `aposConfirmar` (relê a fila, toast, redesenha) — igual, por item
├─ LEGADO: Stokki (por plataforma, no cartão dela) e postagem com legenda pendente NÃO entram no lote
└─ EFEITO COLATERAL: a lista redesenha a cada agendamento salvo; por isso o painel do lote vive na janela (`#modalConteudo`), fora da lista

Mudança:
- `gs-postagem-controles-i165.mjs` → `agendarLoteCp266(itens,painel)` dentro de `criarUiPostagensI165`: para cada postagem,
  `fluxo.abrir('programar')` (servidor confere origem, orientação e assinatura; data da lista ou a sugerida pela orientação) e separa
  prontas × "ficam para a ficha" (sem data/horário, origem a conferir, tentativa anterior). O painel mostra, de cada pronta, a data e a
  orientação integral (`htmlOrientacaoIntegralCp110`, o mesmo bloco da ficha), uma caixa "Incluir no lote" e UMA conferência para as
  marcadas. Ao salvar: cada uma recebe `orientacaoConferidaCp110` e passa por `fluxo.confirmar`, uma por uma.
  Para na que mudou depois da conferência (marca de data/hora/assinatura) ou que o servidor recusou; data diferente da combinada (CP235)
  abre na postagem o pedido à Amanda, como no caminho de uma por uma.
- `escritorio.html` → "📅 Agendar várias de uma vez (N)" no topo de "Para agendar" (2 ou mais comuns com legenda pronta; clique delegado,
  sem global novo); `?v=` do módulo atualizado.

O que NÃO muda: o "Revisar agendamento" de cada postagem, a conferência da ficha, Stokki, "Não precisa agendar", servidor, rules.

Testes: J120 (Cecília, tela real) 6/6 — vermelha antes (sem botão) → verde: 5 prontas, a sem data fica para a ficha; sem a conferência
nada grava; salva a 1ª e a 2ª, para na 3ª que mudou no servidor, a 4ª fica. J121 2/2 (CP235 no lote: salva a de data livre, para na de data
marcada e abre o pedido à Amanda com 23/10 às 12:00). Vizinhas J33/J61b/J63/J72/J88 + J120 = 28/28; celular J120/J88 7/7.
Risco residual: o painel prepara até 30 postagens por vez (uma chamada ao servidor cada); acima disso, o resto fica para o próximo lote.
