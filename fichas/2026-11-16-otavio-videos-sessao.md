# otavio-videos-sessao — vídeo avulso sai completo e "Agendar a mesma saída" para outro cliente (CP221)
Pedido original (16/11, Luís): "a sessão aberta no site é Zeiss, mas preciso subir para Ótica Hauer, Ótica São José e as clínicas — pode abrir a sessão?" · Amanda viu 3 vídeos "Clínica dos Olhos Hauer — Vídeo", com "Identificar conteúdo" ainda na tela.
Unidade: U1 de 1 · Tipo: erro (A) + ajuste (B)
Reprodução: emulador, J68 vermelha no código do `main` (passos 1, 2 e 3).

## Causa-raiz
- A: `lancarVideos` (Gravado avulso) monta o título com o nome digitado e grava só a referência editorial (`referenciaLegendaI78`). Sem `calendarItemId/calendarCompetencia/calendarClienteSlug`, a distribuição mostra "Identificar conteúdo" (condição `!v.calendarItemId&&!v.calendarCompetencia`).
- B: sessão = 1 `agendamentos` com 1 cliente. A saída conjunta foi agendada só como Zeiss e não havia como repetir a mesma saída para os outros clientes sem redigitar tudo.

## Árvore
```
RAIZ A: videos_producao criado por lancarVideos (origem gravado, cliente da carteira, conteúdo escolhido)
├─ ESCRITORES : lancarVideos (muda); registrarGravacaoRealizadaNucleo (não muda; já grava ligação nativa + ocupação I28)
├─ LEITORES   : renderGerenciaVideos (botão Identificar), identificarVideoI106 (recusa vídeo com ligação nativa),
│               referenciaI106/resolverI106 (nativa vence a referência), criação da postagem (copia calendarItemId e só
│               copia referenciaLegendaI78 quando não há calendarItemId), postagemComVinculoDaProducao, associação I28,
│               Central de legendas (cards por item), Functions (fontes/orientacao-cp108/publicacao leem os mesmos campos)
├─ HUMANOS    : Luís/Nathan/Chris/Amanda (enviam), Amanda (distribui), Chris/Cecília (legenda e postagem)
├─ RULES      : videos_producao create = ah && aV && dB && dD; dB exige i28 pronto + ocupação com o mesmo videoId
│               (calendarios_ocupacao create origem 'gravacao', aV, status aguardando_edicao). Já permitido → SEM mudança de rules
├─ AUTOMAÇÕES : nenhuma nova; aviso de distribuição igual
├─ LEGADO     : pauta já gravada/postada/ocupada, i28 não pronto, calendário sob alias → fica como hoje (só referência)
└─ COLATERAL  : vídeo nativo não pode ser re-identificado na distribuição (mesma regra da sessão)
RAIZ B: lista de gravações agendadas (renderListaAgendamentos) — só Chris/Amanda/Cecília têm o botão no DOM
└─ agendarGravacao não muda (conferências, aprovação de 3ª gravação/cliente novo, idempotência I29)
```

## Mudança (escritorio.html)
- `tituloAvulsoCp221`: nome genérico ("Vídeo", "Vídeo 2", vazio de texto) + conteúdo escolhido → `<Cliente> — <título do conteúdo>`; nome real digitado fica.
- `ligarAvulsosAoCalendarioCp221` (dentro da transação do envio, depois de `validarEscolhasEnvioI106`): reaproveita os helpers I28 da sessão (`refOcupacaoI28`, `itemExatoOcupacaoI28`, `dadosReciboOcupacaoI28`) e grava os campos nativos + ocupação no mesmo commit. Qualquer impedimento → vídeo como hoje (referência I106). A ligação nativa substitui `referenciaLegendaI78`, como no checklist da sessão.
- Digest/ids `i67_` não mudam (entrada do digest é a mesma); "Conferir último envio" segue igual.
- Lista de gravações: botão "Agendar a mesma saída para outro cliente" (clique por delegação no contêiner, sem `window.*` novo) → `preencherMesmaSaidaCp221` copia data, hora, local, tipo, equipe, estilo, referências e observações, limpa e foca o cliente. Aviso fixo no formulário: "Gravação com vários clientes? Agende uma sessão por cliente — cada um vê o próprio calendário."
- Ficou inline (não em módulo): depende dos helpers I28 inline e evita a cascata de `?v=` (i106 → i78 → escritório).

## O que NÃO muda
Rules, Functions, sessão (checklist/CP207), "Só edição" (✂️ só ganha o título; ligação nativa fora do escopo), modelo de sessão com vários clientes (não criado), dados de produção.

## Testes
J68 (Luís avulso → Amanda distribuição → Cecília mesma saída), vermelha no main e verde com a correção; bateria completa desktop e `--movel`.

## Risco residual
- Em produção a ligação nativa depende de `calendarios_vinculos_controle/i28` pronto (não conferido daqui; sem ele, cai no comportamento de hoje, só com o título novo).
- 3ª gravação do dia ainda pede liberação da Amanda para cada cliente da saída conjunta (regra vigente, mantida).
- Os 3 vídeos já criados em produção (Clínica dos Olhos Hauer) continuam como estão; corrigi-los é escrita em produção (ok nominal do Chris).
Hash escritorio.html (git hash-object): 64a6a9e2… → 1ab63130…
