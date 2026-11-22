# cp258-aparelho-sem-acumulo — as tentativas já confirmadas saem do armazenamento do aparelho

Pedido (Chris, 22/11): "acúmulo de coisas … que ele armazena … que pesa o sistema". Unidade: L1-d2 (CP258) · Tipo: erro (acúmulo)

Caso (código e jornada):
- Toda aprovação de vídeo (Amanda e Chris) deixa um registro `get_i165_aprovacao_v1_*` no armazenamento do navegador.
- Toda conferência de postagem deixa um registro `get_postagem_i165_v1_*`: agendar, já postado, Stokki por plataforma, exceções (Cecília, Amanda, Chris).
- Cada registro leva a conferência inteira do servidor (`snapshot`) e nunca era apagado.
- O registro de postagem tem um `historico` que ganha uma cópia da tentativa anterior a cada reabertura. Ele só é gravado: nenhuma tela lê.
  Na contraprova chegou a 21 itens.
- A cada tela, a lista inteira é lida e decodificada (`listar`, `listarAbertas`, `listarPendentes`).
- Quando o espaço do navegador enche, gravar a tentativa obrigatória falha. A pessoa vê "Não consegui guardar … Nada foi enviado".
  Isso travaria o "já postado" da Cecília e a aprovação da Amanda.

Causa-raiz: estados locais sem fim de vida e histórico local que só cresce.

Árvore:
RAIZ: armazenamento local dos fluxos I165 (`gs-operacional-ui-i165.mjs`, `gs-postagem-controles-i165.mjs`)
├─ ESCRITORES : `salvar` dos dois fluxos
├─ LEITORES   : `restaurar`/`obter` (abrir a mesma tentativa), `listar*` (recuperação de tentativas pendentes e abertas)
├─ PAPÉIS     : Amanda, Chris (aprovação); Cecília, Amanda, Chris (postagens)
├─ RULES      : n.a. (só o aparelho)
├─ SERVIDOR   : inalterado (a verdade continua no servidor; o registro local só guarda tentativa em curso e rascunho)
└─ EFEITO     : reabrir uma tentativa confirmada já zerava o estado (`abrir`); sem o registro, abre igual, só que limpo

Mudança (só tela):
- Aprovação: na listagem, saem os registros `confirmada` com a etapa seguinte `conferida` que não estão em uso nesta tela.
- Postagem: na listagem, saem os `confirmada` cuja etapa seguinte foi feita (`continuidade` = operação) há mais de 7 dias.
  Ao gravar, o histórico local fica nos 5 últimos.
- Ficam sempre: pendentes (enviando, incerta, conferindo), rascunhos e abertas, e os que ainda pedem conferência ou atualização da fila.
- Hashes: `gs-operacional-ui-i165.mjs` (também importado por `gs-postagem-controles-i165.mjs`) e `gs-postagem-controles-i165.mjs` no `escritorio.html`.

O que NÃO muda: servidor, regras de conferência (CP110), recuperação de tentativa pendente, rascunhos.
Testes:
- J112 (nova), vermelha antes e verde depois (6/6):
  - A: os dois módulos com armazenamento simulado (o que sai, o que fica, histórico ≤ 5).
  - B: navegador real (Cecília em Postagens → Agendar; Amanda em Aprovar vídeos).
- Vizinhas: J25 (Stokki por plataforma), J33 (telas da Cecília), J31 e J40 (aprovação), J61b.
- Bateria inteira no CI.
Risco residual: um aparelho que já está perto do limite só é limpo quando a pessoa abre uma tela que lista as tentativas.
Isso acontece em Postagens e na aprovação, ou seja, no uso normal.
