# f5-u5-uma-decisao-de-liberacao — "a Amanda pode liberar este mês?" decidido num lugar só (PREPARADA; publicar depois de janeiro)

Pedido (Chris, 21/11) e decisão (23/11: preparar agora, publicar depois da semana de produção de janeiro). Plano: F5_ESTADO_DO_MES.md.
Unidade: U5 de 6 · Tipo: ajuste (o maior da F5). Mapa completo (23/11, só leitura, file:line) em F5_ESTADO_DO_MES.md §Mapa U5.

Retrato — 5 caminhos decidem partes da mesma pergunta:
- CP121 reliberação: `elegibilidadeReliberacaoAjustesCp121` (ajustes-calendarios-cp112:111–137);
- CP123 ajustes internos: `resumoInternosCp123` (ajustes-internos-cp123:126–136) → `liberacaoPermitida`/`disponivel`;
- I172 decidir: editorial-calendarios-i172:142–155 (reliberar = CP121 || CP123; depois CP238; depois autoridade por modo;
  publicar roda `exigirLiberacaoAjustesCp112`, preparação CP123 e `reciboPublicacaoI148`);
- CP238 mudanças diretas: só calculadas quando Amanda e (CP121 ou CP123) — nunca na primeira liberação;
- CP112 pedidos do cliente: `resumoAjustesCp112` (cp112:108) usado em todo publicar; fila CP232 (`podeLiberar`, cp123:222) ignora a marca.
Condições escritas mais de uma vez: "pedido do cliente aberto" (5 versões: cp123:65, cp112:119/161, cp115:14, cp109:95/149, cp205:55),
"marca publicada" (7 lugares), "prova do retrato" (8 lugares), "cadeia de base I155" (3), "escopo CP115/CP216" (2), "conjunto em revisão" (7).
Foram exatamente essas cópias que divergiram nos incidentes de novembro (CP215, CP233, CP237, CP238, CP241).

Medição (24/11, `node ferramentas/f5_comparar_pedido_aberto_u5.mjs <exportacao>/calendarios.json`; a ferramenta para com erro se uma
das 5 cópias mudar de texto):
- dados reais de 23/11: 102 marcas de mês, 4 em `ajuste_interno`; as 5 cópias **concordam em todos os meses vivos** (só Zeiss 2026-08,
  pedido antigo sem operação, discorda);
- tabela-verdade (24 casos possíveis): **13 discordam**. Os que importam para a U5a (decidir UMA resposta antes de trocar chamadores):
  · Amanda devolveu o pedido (por Amanda + operação + retrato — o caso CP237 da Stokki): CP123/CP112 dizem "pedido aberto"; CP115 e o
    aviso ao cliente (CP205) dizem que não (o cliente recebe "em preparação pela equipe");
  · pedido sem retrato (publicação antiga): só a reliberação CP112:119 e o CP205 veem pedido;
  · marca por Chris com operação: só o processo novo CP112:161 vê pedido;
  · pedido antigo sem operação: só o CP205 vê pedido.
  Parte disso é intencional (CP115 é a correção individual, só do cliente; CP205 é o texto do aviso) — a U5a escreve qual é a regra de cada
  caso e as primitivas recebem o "para quê" (liberar, corrigir, avisar) em vez de cada um reescrever a condição.

Proposta de fronteira única (sem código ainda) — módulo `functions-get/lib/gs-liberacao-mes.mjs`:
`decisaoLiberacaoMes(c, cal, {ajustesCp112, internosCp123, ator, agora})` → `{origem ('legado'|'i155'|'estrategico'), estado (efetivo),
marca (crua), publicacao:{conferida, retrato, prova, motivo}, pedidoClienteAberto, caminho ('revisao'|'reliberacao'|null),
componentes:{pedidosCp112, internosCp123, diretasCp238} (quantidade, permitida, motivos, assinatura), disponivel, motivos[]}`;
primitivas: `pedidoClienteAberto(marca)`, `marcaPublicada(marca)`, `publicacaoConferida(c,cal)`, `baseI155Coerente(c,cal)`, `emRevisao(estado)`.
Chamadores: I172 (DTO :84 e decidir :143–152), CP112 DTO :147, fila CP232 :222, `prepararPublicacaoInternosCp123` :200.
`resumoInternosCp123` fica só com os motivos por registro.

Ordem segura (cada passo um PR, comportamento igual provado antes de trocar o próximo):
U5a primitivas + testes de equivalência contra cada cópia atual (tabela-verdade com os estados reais do export) → U5b CP121 e CP123
passam a usar as primitivas → U5c I172 decidir usa `decisaoLiberacaoMes` → U5d fila CP232 e vigia da liberação usam a mesma função
(o vigia passa a ler exatamente o que a Amanda vê).

Testes previstos: J60–J60k, J62, J67, J71, J84, J85, J88, J121–J123, J104 (dados reais), vigia da liberação em produção (só leitura)
antes e depois com a mesma saída; bateria no CI. Functions com ok nominal.
Risco: é o coração da liberação — por isso só depois da semana de produção de janeiro e em passos com equivalência provada.
