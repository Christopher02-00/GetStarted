# cp270 — no painel da Stokki, o que já foi publicado sai do caminho da Cecília; a lista fica por etapa

Pedido original (Chris, 24/11, vídeo do tablet da Cecília no painel "Stokki — publicações e conferências"): "Nessa área da Stokki a Cecília
precisa tirar os vídeos que já foram postados senão eles vão ficar todos misturados isso não ajuda ela na organização dela entenda o problema
analise inteira nessa etapa do processo ali analise o que pode ser mudado e simplifique".
Unidade: 1 · Tipo: erro (duas telas discordam do que é "terminado") + ajuste (organização por etapa).

O que a Cecília tenta fazer: abrir o painel e ver só o que ela ainda precisa agendar/confirmar.
Caso real (export só leitura 23/11): 6 cartões abertos; **4 são vídeos de outubro já postados em todas as plataformas** (Arquitetura de
Armazenagem, O mito do Volume, engenharia de processos, Bildade de Expedição), misturados com os 2 que ainda têm plataforma para agendar
(Logística reversa, Os maiores gargalos) e o novo "Ranqueando práticas". Das 12 plataformas "publicada — falta conferir", **11 foram
confirmadas pelo Sistema (CP262, prova `automaticaCp262`)**; só 1 é conferência de verdade (O mito do Volume · Instagram, confirmado pelo Chris).

Causa-raiz: a CP262 definiu que plataforma confirmada pelo Sistema NÃO pede a conferência de 8 itens, e a fila "Publicações para conferir"
(gs-fila-publicacoes-cp125.mjs:16) segue isso. Mas o painel (`stokki-publicacao.mjs`: `encerrado` e `pendencias`) continuou exigindo
`conferidaEm` em toda plataforma → o vídeo postado fica para sempre na lista de trabalho, pedindo 8 caixinhas que ninguém é chamado a marcar.

Árvore:
RAIZ: "esta plataforma da Stokki está terminada?" (stokki-publicacao.mjs, raiz — a cópia de functions-get/lib não desenha o painel nem usa `pendencias`)
├─ LEITORES: painel `desenhar` (`encerrado`, rótulo e caixinhas do `formulario`), `pendencias` (aviso fora do menu, portal), fila CP125 (já certa)
├─ HUMANOS: Cecília (agenda/confirma), Amanda e Chris (abrem o mesmo painel)
├─ ESCRITORES: nenhum novo (o servidor `alterar` 'conferir' continua igual; quem quiser ainda pode conferir a automática)
├─ RULES/SERVIDOR: sem mudança · Functions: sem deploy
└─ HASHES: stokki-publicacao.mjs → gs-legenda-cliente-i95.mjs → calendario.html = calendarios.html; escritorio.html; portal-cliente.html (2)

Mudança:
1. `conferenciaDispensadaCp270(p, rede)` (exportada): publicada + prova `automaticaCp262` — a MESMA regra da fila CP125.
   `encerrado` e `pendencias` tratam como terminada a plataforma retirada, conferida, dispensada pela CP262 ou com dispensa retroativa (I118).
2. Rótulo "Publicada pelo Sistema — conferência dispensada"; as 8 caixinhas ficam num "Conferir mesmo assim (opcional)" fechado.
3. Lista por etapa, nesta ordem, com título e quantidade: **Para agendar** → **Agendadas — falta confirmar a publicação** → **Já publicadas —
   só falta a conferência** (no fim, separadas) → (com o botão de histórico) **Concluídos e retirados**.
Efeito esperado no caso real: saem da lista Arquitetura, engenharia de processos e Bildade; O mito do Volume fica só em "Já publicadas"
(a conferência real do Instagram); Logística reversa, Os maiores gargalos e Ranqueando ficam em "Para agendar".

O que NÃO muda: regra de agendar/confirmar/conferir no servidor, a conferência de 8 itens para publicação confirmada por pessoa (decisão
do Chris 23/11: "manter um por um"), fila CP125, calendário do cliente, botão "Desfazer confirmação".
Fica para decisão do Chris (não entra aqui): "Pedir mudança à Amanda" por plataforma no bloco "Organização desta publicação" perdeu o
sentido para AGENDAR depois da CP269 (data livre) — proposta de retirar da Stokki numa unidade própria.

Testes: J125 (nova) com 4 postagens no emulador — publicada pelo Sistema some da lista e vai ao histórico; mista fica em "Já publicadas"
com a automática dispensada; "Para agendar" vem primeiro; contraprova vermelha no main. Vizinhas J25, J116, J61b, J119 (fila CP125); `--movel`; bateria no CI.
