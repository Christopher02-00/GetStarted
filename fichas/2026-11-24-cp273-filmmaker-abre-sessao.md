# cp273 — o filmmaker abre a sessão do mensalista na hora do envio (fim do "avulso" para cliente da carteira)

Pedido original (Chris, 24/11): "um problema que a gente está tendo com os filmmakers, pois eles ainda não conseguem abrir sessão dos
clientes. Faz pelo menos 2 semanas que eles estão subindo como avulso os clientes nossos, os mensalistas normais, porque eles não
conseguem abrir sessão na hora de subir o vídeo… corrija isso definitivamente… desde a origem até o final".
Regra vigente avisada (V100, 21/08): "Somente Chris, Amanda ou Cecília cria e atribui gravações; Luís/Nathan executam apenas sessões
da própria equipe". Decisão do Chris (caixa de perguntas, 24/11): **"Filmmaker abre a sessão"** — revoga a V100 para este caso.
Unidade: 1 · Tipo: ajuste de regra + erro de processo.

Caso real (export só leitura 23/11):
- desde 14/11 nenhuma gravação de mensalista foi criada na agenda; nos dias 16, 19 e 23/11 Luís e Nathan gravaram Clínica dos Olhos
  Hauer, Clínica São José, Ótica Hauer, Ótica São José, Place, Master Chef, Cookiery, VIP, Bluefit e Divina — **0 sessões** ±7 dias;
- sem sessão, a lista "Qual gravação" fica vazia e a aba "Marcar Nova Gravação" nunca existiu para filmmaker ("Você não tem permissão
  para agendar gravações"); as rules de `agendamentos` só deixam a gestão criar (`aa()`);
- saída usada: "Gravado avulso" (atalho da CP229) → 110 vídeos avulsos de clientes da carteira; 50 sem ligação ao calendário
  (10 desde 10/11: Divina 5, Place 3, Cookiery 1, VIP 1); nenhum conta como gravação do mês.
- a Cecília consegue marcar (testado no emulador com os dados reais), mas a gravação já aconteceu quando o vídeo sobe.

Árvore:
RAIZ: sessão (`agendamentos`) para a gravação de um mensalista que não foi marcada antes
├─ ESCRITORES: agenda da gestão (`agendarGravacao`); NOVO: `abrirSessaoFilmmakerCp273` (filmmaker, no envio); baixa (`registrar…Nucleo`, sem mudança)
├─ LEITORES: "Qual gravação" (renderMinhaAgendaFilmmaker), agenda/controle da gestão (rótulo "aberta pelo filmmaker"), Raio-X, I28
├─ RULES: `agendamentos` create ganha `aberturaFilmmakerCp273()` — só Luís/Nathan, id `cp273_<cliente>_<data>_<pessoa>`, ele sozinho
│  na equipe, `agendado`, aprovada, sem `precisaAprovacao`, data ≤ hoje, marca `aberturaFilmmakerCp273.por` = ele (OK NOMINAL)
├─ CHECKLIST: o MESMO `planejarSessaoGravacao` + `avaliarPlanejamentoSessaoParaPersistir` da agenda; mês = o do dia, ou o mês com
│  pauta pendente (`diagnosticarCompetenciaPendenteV115`); sem checklist → modo declaração da V100 (sessão continua válida)
├─ AVULSO: filmmaker + cliente mensalista (carteira, sem entrega direta, não externo) → aviso "abra a sessão"; enviar como avulso só
│  marcando "conteúdo extra, fora do calendário" (CP221/J68 continua valendo nesse caso); gestão e externos sem mudança
└─ LEGADO: os 50 avulsos sem ligação seguem com "Identificar conteúdo" no cartão da Amanda (saída existente); nada é regravado

Mudança: escritorio.html (bloco "Abrir sessão" no envio, `abrirSessaoFilmmakerCp273`, aviso no avulso, rótulo na agenda) e
firestore.rules (`aberturaFilmmakerCp273`). Functions: não.
O que NÃO muda: a agenda da Cecília, aprovação de "cliente novo/3ª do dia" para sessões marcadas pela gestão, 2º filmmaker (CP234),
"Só edição", trabalho externo/pontual, conteúdo extra.

Testes: J128 (nova) — vermelha no main (não existe como abrir sessão) → 11/11: oferece abrir; data futura recusada; sessão no nome
dele, aprovada, checklist do mês, selecionada; repetir não duplica; Cecília vê "aberta pelo filmmaker"; marca o conteúdo e envia →
sessão realizada e vídeo ligado ao calendário; avulso de mensalista manda abrir a sessão; rules sem negação inesperada.
J68 atualizada (avulso de mensalista agora marcado como conteúdo extra). Vizinhas J82, J68, J87, J03, J04, J41: 27/29 → 29/29 com a
J68 atualizada; celular J128/J82/J68/J87 17/17.
Publicação: rules publicam no merge → **ok nominal do Chris antes do merge**.
