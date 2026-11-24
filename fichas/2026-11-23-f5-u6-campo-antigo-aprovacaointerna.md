# f5-u6-campo-antigo-aprovacaointerna — aposentar a escrita do campo antigo `aprovacaoInterna` (PREPARADA; publicar depois de janeiro)

Pedido (Chris, 21/11) e decisão (23/11: preparar agora, publicar depois da semana de produção de janeiro). Plano: F5_ESTADO_DO_MES.md.
Unidade: U6 de 6 · Tipo: limpeza.

Retrato (21/11 e 23/11): `aprovacaoInterna` existe em 24 calendários, só em meses até 2026-09 ou documentos sem mês; nenhum mês vivo
depende dele. Mesmo assim o servidor ainda ESPELHA a marca nele, com dois critérios diferentes:
- CP112:162 (`reabrirCalendario`) e CP115:63–64 espelham quando `aprovacaoInterna.mes === mes`;
- I172:141/153/154 (enviar/devolver/publicar) espelham quando `usaLegado(cal, mes)`.
- 4º escritor (achado 24/11 no export): o cadastro de cliente mensalista (`modelarClienteMensalistaUnificado`, escritorio.html ~27871) cria
  o calendário novo com `aprovacaoInterna:{status:'rascunho'}` SEM mês — por isso o campo passou de 24 para 27 calendários (Zeiss Araucária,
  Thiago Vale, Gessyka Vale, 17–18/11). É inofensivo: sem mapa por mês, `aprovacaoCompativel` devolve esse "rascunho" — o estado certo de calendário novo — até a primeira marca
  em `aprovacaoMeses`, que passa a valer (0 calendários com o campo em mês vivo);
  mas a U6 deixa de criá-lo também.
Leitores do campo: `aprovacaoCompativel` (módulo), `estado()` do I172 (U4a), `marcaPublicacaoI92`, `gs-aprovacoes-calendarios-i148:9`,
CP200:58–62, I68:100–107, cópias de `mesDoItem` (guardas Stokki/agendamento).

Mudança (quando publicar): (1) parar de ESCREVER o campo nos 4 escritores (3 espelhos do servidor + o cadastro de cliente) (o mapa `aprovacaoMeses` já é a fonte); (2) manter a LEITURA
compatível só para os documentos antigos (via `aprovacaoCompativel` do módulo), nunca apagar o campo (soft, reversível); (3) Raio-X ganha
uma regra amarela "mês vivo lendo `aprovacaoInterna`" para provar que ninguém volta a depender dele.
Testes previstos: comparação nos dados reais (0 diferença em meses vivos), J06/J55/J56/J57/J104, bateria no CI. Functions com ok nominal.
Depende de: U4a (o `estado()` do I172 deixa de ler o campo direto).
