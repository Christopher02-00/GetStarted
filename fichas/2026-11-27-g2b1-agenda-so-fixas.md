# G2b-1 — Agenda da gestão lê só as funções fixas
Pedido original (literal): "não tenho o valor para pagar que eles querem vamos ter que contornar isso de um jeito que não tenha mais essas cobranças absurdas e não tenha mais erros também de maneira definitiva"
Unidade: G2b-1 de G2b (abertura da gerência) · Tipo: erro (custo/cota)

Sintoma: abrir o Escritório da gestão lia as ~5.700 demandas duas vezes (a escuta em tempo real e a Agenda).
Reprodução: medidor no navegador com a cópia real + marcadores temporários em toda leitura grande:
`listarFuncoesFixasAgendaI167` (montarAgenda → recarregar) chama `_getDocsFromServerFB(collection(db,'demandas'))` em toda abertura da gestão.
`projetarFuncoesFixasI167` descarta tudo sem `tipoFuncaoFixa` — na cópia real, 248 de 5.701 têm o campo (sempre texto).

Árvore:
RAIZ: listarFuncoesFixasAgendaI167 (escritorio.html)
├─ LEITORES: gs-agenda-organizacao-i167.mjs (bloco "rotinas"), início compacto da agenda
├─ HUMANOS: Chris (Agenda da equipe) e Amanda (Organização das datas); equipe usa consultas por destinatario/paraQuem (sem mudança)
├─ RULES: gestão já lê demandas inteiras; uma consulta filtrada é permitida
└─ LEGADO: `tipoFuncaoFixa` é sempre texto não vazio nas fixas; demanda sem o campo nunca entrou na projeção

Mudança: a gestão consulta `where('tipoFuncaoFixa','>','')` (índice automático de campo único). O que NÃO muda: a projeção, os modelos, a equipe.
Medição: −5.453 leituras por abertura da gestão (5.701 → 248).
Achado do medidor (registrado no AGENTS): o emulador reenvia a lista inteira de uma escuta quando um documento muda; o Google envia só o que mudou.
Testes: J139 (nova) Amanda e Chris veem a rotina fixa e não a demanda comum — verde; contraprova com a consulta quebrada — vermelha.
