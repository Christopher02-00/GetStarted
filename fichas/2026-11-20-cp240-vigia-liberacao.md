# cp240-vigia-liberacao — todo dia, o código do servidor confere, como a Amanda, se cada mês com ajuste tem saída

Pedido (Chris, 20/11): "o objetivo é que não volte a acontecer nunca mais … eu quero certezas, não quero trabalhar com suposições".
Unidade: U5 de 5 (U4 "prova com cópia real" foi juntada aqui: J91 reproduz Fedalto e Stokki; o vigia roda nos dados reais todo dia).
Tipo: novo (proteção contra regressão em produção)

Por que: Fedalto e Stokki ficaram presos dias com tudo aprovado e sem botão; as correções CP233/CP237 foram dadas como prontas sem
conferir a liberação no mês real. Ninguém via o estado "tudo aprovado e sem saída" até a Amanda reclamar.

O que faz (`.github/scripts/vigia-liberacao.mjs` + `.github/workflows/vigia-liberacao.yml`, 09:23 e 16:47 BRT e manual):
- lista os meses (até ~40 dias para trás) com mês reaberto/em revisão, pedido do cliente aberto ou ajuste interno não final;
- para cada um, chama `operarEditorialCalendariosI172` (`central_editor_ler`) como a Amanda — o mesmo código que a tela dela usa;
- VERMELHO: tudo aprovado, há o que liberar e a Amanda sem botão; pedido "precisa de conferência"; editor que não abre → o run falha e
  o GitHub avisa; o resumo do run diz cliente, mês e motivo do servidor. AMARELO: com quem está. VERDE: nada pendente.
- SÓ LEITURA: a transação entregue ao código recusa escrita (`somenteLeitura`) e a conta do workflow é Cloud Datastore Viewer.

Todos os ramos (Passo 2b): nenhuma ação nova no servidor; nenhuma tela; nenhuma regra; nenhum dado gravado. Usa o secret existente
`FIREBASE_SERVICE_ACCOUNT` (o mesmo da exportação R2). O resumo do run tem títulos de conteúdo e slugs de cliente (sem dado pessoal),
visível só a quem tem acesso ao repositório.

Testes: J93 (arquivo J60j): verde sem pendência; amarelo com pedido aprovado; VERMELHO com a publicação incoerente (dado corrompido de
propósito no emulador) e a Amanda vê o mesmo motivo (prova também a caixa CP239); escrita recusada; restaurado → amarelo → liberado → verde.
Primeira execução real: manual, depois do merge (resultado no PR de docs).
Risco residual: o vigia acusa, não conserta; quem resolve é quem a mensagem do servidor indicar.
