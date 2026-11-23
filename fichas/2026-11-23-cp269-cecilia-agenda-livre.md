# cp269 — a Cecília agenda em qualquer data; o combinado vira sugestão e fica registrado

Pedido original (Chris, 23/11, com prints da Zeiss — "A expectativa já começou"): "Cecília continua reclamando de problemas em sua aba de
trabalho que persistem mesmo após semanas … Segundo ela o erro aponta que não pode ser agendado pois está com data diferente do calendário
só que isso daí tem que ser livre pra ela, ela não pode se prender uma coisa dessa porque quem decide quando vai ser postado basicamente é
dependendo da falta de conteúdo e etc. Corrija isso definitivamente."
Caixa de perguntas (23/11): **"Livre em tudo"** — data fixa do calendário, campanha e orientação da Amanda; a postagem registra o combinado.
Regra vigente avisada: CP235 (19/11, decisão do Chris "Pedido à Amanda") — **revogada por esta decisão**.
Unidade: 1 · Tipo: ajuste (regra de negócio).

Sintoma (print): ao salvar o agendamento, "Esta data é diferente da combinada no calendário. Abri o pedido para a Amanda — confira a data e
escreva o motivo"; a postagem fica parada até a Amanda decidir.
Causa (servidor): `validarProgramacaoCp111` (compat-legado-programacao-r83.mjs) exigia exceção da Amanda para data fixa do calendário e
campanha; `validarOperacaoProgramacaoI165` (lib/gs-diretriz-publicacao-i165.mjs) exigia exceção fora da orientação da Amanda.

Árvore:
RAIZ: ação de AGENDAR (programar / stokki por plataforma) → `validarAcaoFonteProgramacaoI165` → as duas funções acima
├─ ESCRITORES: programar.mjs (agendar comum), stokki.mjs (agendar por plataforma), lote CP266 (mesmo fluxo)
├─ LEITORES: motor de obrigações (gs-obrigacoes-operacionais-i165: `conferir_agendamento_divergente` para a Amanda), ficha da postagem
├─ HUMANOS: Cecília (agenda), Amanda (orienta; antes decidia a mudança, agora só vê o registro), Chris
├─ RULES: sem mudança (gravação do servidor)
├─ AUTOMAÇÕES: faxina/confirmação automática (usam 'publicar', não 'agendar' — sem mudança)
└─ LEGADO: exceções já autorizadas pela Amanda continuam valendo; pedidos de mudança abertos continuam na fila dela (podem ser decididos ou ignorados)

Mudança:
- `compat-legado-programacao-r83.mjs` e `lib/gs-diretriz-publicacao-i165.mjs`: AGENDAR fora do combinado é permitido sem exceção e devolve
  `foraDoCombinadoCp269` (modo, data/hora combinadas, semana, prazo). RETIRAR sem publicar segue como antes (U4).
- `programar.mjs` e `stokki.mjs`: gravam `agendamentoForaDoCombinadoCp269` na postagem (por plataforma na Stokki; null dentro do combinado).
- `gs-postagem-controles-i165.mjs`: textos ("data combinada é sugestão … a mudança fica registrada"); a ficha mostra "Agendada fora da data
  combinada … o combinado era X · por Cecília" (`htmlForaDoCombinadoCp269`); `?v=` no escritório.
- A cópia da raiz `gs-diretriz-publicacao-i165.mjs` não valida agendamento na tela (a tela usa só `normalizarDiretrizI165`): sem mudança.

O que NÃO muda: retirar sem publicar, confirmação de publicação, conferência CP110 (ler a orientação), exceções já autorizadas, rules.

Testes: J124 5/5 — vermelha no main (2/6 com J88: "A Amanda precisa decidir esta mudança", pedido aberto, postagem parada) → verde: regra
pura (data fixa, campanha, orientação = permitido com o combinado guardado; retirar continua pedindo a Amanda); tela real: Amanda define a
orientação (10/11), Cecília agenda 17/11 → salva direto, registro; Amanda vê na ficha. J88 e J121 reescritas para a regra nova (antes
provavam a CP235): salvam direto com o registro. Vizinhas de agendamento/Stokki/lote e bateria inteira no CI.
Publicação: Functions **só com o ok nominal do Chris**.
