# lz5c-numeros-uma-regra — cada número da gestão com uma regra só
Pedido (Chris, 26/11, catálogo Limpeza 2027): num-prazo, num-aguardando, num-duas-regras, num-resolveu, num-editor, num-gravacoes e
ger-agora-painel ("contadores calculados e nunca mostrados") → "simplificar".
Unidade: LZ5c · Tipo: erro (números) · Sem rules, servidor ou dados.
Antes → agora (J133 casos LZ5c 1–7; contraprova: os 7 vermelhos no código anterior, 6/13; corrigido 13/13):
1. "Pediu novo prazo": Agora e badge da Gerência contavam pedido guardado em demanda já aprovada (3 regras) → `pedidoDePrazoAbertoLz5c`,
   a regra da Aprovações, nos 3 lugares (Agora 2 → 1; badge +2 → +1 no caso semeado).
2. "Vídeo atrasado": `videoEstaAtrasado` (Meus Vídeos, Meu Dia, resumo diário, Painel da Amanda) inventava prazo quando não havia
   (criação + 1 dia útil) — contra a regra de 04/08 do `videoAtrasado` → delega a `videoAtrasado` (mantém "editor ausente não é cobrado").
3. "Você resolveu hoje" (Amanda): procurava concluidoEm/concluidoPor, que a aprovação não grava (sempre 0) → `eventoFinalDemandaI119`.
4. "Esperando outros" por editor: saía da lista só de vídeos em edição (sempre 0) → vídeos dele em aguardando_aprovacao/aguardando_cliente.
5. Meu Dia do Luís/Nathan: mostrava as gravações de todos → só as em que ele está (`pessoaNaEquipe`, como o resto do Meu Dia).
6. Resumo do Dia "gravações hoje": só status 'agendado' (a realizada sumia) → a regra do Agora (não cancelada, com captação, aprovada).
7. Agora → 📆 Agenda: "o que vai ao ar na semana" → "as postagens agendadas para os próximos 7 dias" (o número é de postagens).
Saem (calculados e nunca mostrados — htmlIndicadores só desenha as chaves listadas): "Produção andando sem plano", "Esperando confirmar
que foi postado" (a aba Confirmar tem badge própria), "Trabalho de cliente que saiu" (lia clientes_encerrados inteira a cada cálculo do
Agora; o vigia diário do servidor confere saídas) e "Calendário do mês passado". "Cliente sem nada montado" continua igual.
Árvore: calcularIndicadores (Agora, cache por pessoa) · atualizarBadgeGerencia · renderAprovacoes · renderGerenciaVideos (Resumo por
editor) · htmlResumoDoDiaAmanda · renderMeuDia (filmmakers) · coletarResumoDiario (foto do dia) · renderMeusVideos.
Testes: portão 1–3 verde; J133 + J37, J109, J117, J118, J01, J12, J95, J69, J03, J04, J113, J16, J128, J08, J10: 147/147;
celular J133, J37, J03: 17/17.
