# cp255-gestao-confere-so-a-demanda-tocada — depois de uma ação, a gestão confere só a demanda que mudou

Pedido (Chris, 22/11): "dados antigos … acúmulo de informação … que só pesa o sistema e acaba travando … cirúrgico e assertivo".
Unidade: L1-b (CP255) da varredura de acúmulo · Tipo: erro (peso)

Caso medido (dados reais de 22/11, sonda direto no navegador):
- `carregarTodasDemandas({servidor:true})` aparece em ~18 lugares depois de ações da Amanda e do Chris: concluir em Minhas Demandas,
  entregar pedido de legenda, abrir demanda pelo Radar, pelo aviso, pela Central, pela agenda e pela direção; repasse; aviso de espera; providências.
- Para a gestão, a releitura vai à coleção inteira: 5.395 demandas, das quais 98% estão encerradas.
- Como o ouvinte em tempo real da gestão já tem a coleção aberta, o Firestore responde da memória (nenhum pedido novo ao servidor).
  Mesmo assim, montar e converter as 5.395 demandas custa ~0,37 s a cada ação (310 ms + 62 ms), com o botão esperando.
  No celular, o custo é maior.
- Quase todos esses lugares só precisam da demanda que acabou de mudar (procuram `todasDemandas.find(x=>x.id===id)`).
  As outras mudanças (por exemplo, a demanda seguinte criada pelo servidor) chegam pelo ouvinte e redesenham a tela sozinhas.

Causa-raiz: a confirmação "pós-ação" relia a coleção inteira em vez de conferir a demanda tocada.

Árvore:
RAIZ: `carregarTodasDemandas` (escritorio.html) com `servidor:true`
├─ ESCRITORES : nenhum novo (só leitura; `todasDemandas` em memória)
├─ LEITORES   : as telas que, depois da releitura, procuram a demanda tocada; badges e Meu Dia (seguem lendo `todasDemandas`)
├─ PAPÉIS     : Amanda e Chris (gestão). Demais pessoas: caminho inalterado (consultas filtradas por destinatário)
├─ RULES      : n.a. (`get` de um documento que a gestão já lê)
├─ OUVINTE    : continua sendo a fonte da lista. Se ele não está confirmado ou deu erro, volta a leitura completa, como antes
└─ EFEITO     : a demanda tocada é conferida no servidor (1 leitura) e atualizada na lista na hora; as demais chegam pelo ouvinte

Mudança (só tela):
- `carregarTodasDemandas` aceita `ids`. Com gestão, `servidor:true`, ouvinte confirmado do mesmo perfil e sem erro, confere só esses ids
  (`getDocFromServer`), aplica o mesmo filtro (`demandaOperacionalVisivel`) e a mesma ordem. Até 20 ids; senão, leitura completa.
- 13 chamadores que sabem qual demanda mudou passam `ids`.
- Ficam com a leitura completa (listas inteiras ou raros): fila de exclusão, recepção de documentos, providências (atualizar lista)
  e regularização.

O que NÃO muda: caminho das outras pessoas; leitura completa quando o ouvinte não está confirmado; servidor; dados.
Testes:
- J110 (nova): vermelha antes (1 releitura completa ao concluir), verde depois (0; só a demanda tocada; a tarefa sai da lista na hora).
- Vizinhas: J02, J97, J48, J33 e J60.
- Bateria inteira (desktop e celular) no CI.
Risco residual: se o ouvinte atrasar e trouxer um retrato anterior logo depois da conferência, a lista pode piscar até o próximo retrato.
O risco é igual ao de antes, porque a releitura completa também era substituída pelo próximo retrato do ouvinte.
