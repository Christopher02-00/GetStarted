# cp262-faxina-stokki-por-plataforma — a faxina confirma por plataforma a publicação vencida da Stokki

Pedido (Chris, 23/11): "tudo que for antigo do mês passado vc pode concluir sem problemas eu autorizo … na parte da Cecília principalmente
ali do problema que estávamos tendo … com verificação claro antes para confirmação"; e que os números grandes nunca mais voltem.
Verificação apresentada ao Chris (dados reais de 22/11): 9 plataformas da Stokki de outubro nunca confirmadas
(20/10 IG+LinkedIn; 22/10 LinkedIn+TikTok; 26/10 IG+LinkedIn+TikTok; 28/10 IG+LinkedIn).
Unidade: C2 (CP262) · Tipo: erro (acúmulo sem saída)

Causa-raiz: a faxina CP248 (21/11) confirma sozinha a postagem agendada vencida há 2 dias, mas pulava a Stokki ("confirmação por plataforma").
Resultado: as plataformas da Stokki ficavam na fila da Cecília para sempre.

Árvore:
RAIZ: passo 3 de `executarFaxinaCp248` + `confirmarRedeStokkiAutomaticaCp262` (functions-get/stokki-confirmacao-automatica-cp262.mjs)
├─ ESCRITORES : mesma transação da confirmação manual: `lib/stokki-publicacao.mjs` `alterar` 'publicar', prova por rede, histórico,
│               calendário/vídeo/demandas do ciclo quando todas as plataformas fecham
├─ LEITORES   : fila "Publicações para conferir" (gs-fila-publicacoes-cp125.mjs; plataforma com prova automaticaCp262 não pede os 8 itens),
│               Raio-X D2/D5, painel da Stokki
├─ PAPÉIS     : Sistema (a Stokki é operada no perfil da Cecília; a autoria registrada é "Sistema (confirmação automática)")
├─ HONESTIDADE: a conferência de 8 itens NÃO é marcada; a prova diz que foi automática e como desfazer
├─ DESFAZER   : "Desfazer publicação" da plataforma continua valendo
└─ HASHES     : gs-fila-publicacoes-cp125.mjs → gs-avisos-canal-i165.mjs → escritorio.html

Testes:
- J116 (nova), vermelha antes (rotina inexistente) e verde depois (5/5), com a postagem nascendo pelo caminho real
  (distribuição → entrega → qualidade → cliente → legendas por plataforma → agendamento):
  1. a plataforma vencida é publicada pelo Sistema, com prova automática e sem os 8 itens marcados;
  2. ela sai da fila da Cecília e a pendente fica;
  3. com todas confirmadas, a postagem vira "postado" e o vídeo conclui;
  4. repetir não muda nada;
  5. a faxina tenta só a plataforma vencida.
- J102 caso 4 atualizado: Stokki sem plataforma vencida não é tocada.
- Vizinhas: J25 e J33. Total: 37/37.
- Bateria inteira no CI.
Depois da publicação: a próxima rodada da faxina (no máximo 2 h) confirma as 9 de outubro; conferir pelo vigia (D2) e pela fila da Cecília.
