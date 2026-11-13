# nao-precisa-agendar-sem-vinculo — tirar da fila vídeo sem ligação com o calendário (CP211)
Pedido original (literal): "4 vídeos da Bluefit são material de tráfego pago … Ao clicar em '🚫 Não precisa agendar' … abre a janela
'Conteúdo e legenda da postagem' exigindo escolher um conteúdo do calendário … não há como tirá-los da fila."
Unidade: U2 de 2 · Tipo: erro (não reproduzido)
Reprodução: ensaio (Cecília e Chris) e produção somente leitura (Cecília, Bluefit — Comparação, 12/11): o botão abre o painel I165
"Encerrar sem publicação" com "Conta o motivo" e "Encerrar sem publicar". No ensaio: sem motivo nada muda; com motivo a postagem
vai para `arquivada_sem_postagem`, o vídeo para `finalizado` e o motivo fica no histórico. A janela "Conteúdo e legenda" não abriu
em nenhum perfil — provavelmente veio de "Conferir origem e compromissos"/"Conferir arquivo e legenda", que ficam no mesmo cartão.
Mudança: nenhuma no código. J63 entra como jornada permanente desse caminho (protege motivo obrigatório + saída da fila).
O que NÃO muda: regra da CP207 (legenda sem ligação não vira agendamento).
Próximo passo operacional: Cecília (ou Chris) usa "Não precisa agendar" → motivo "material de tráfego pago" → "Encerrar sem publicar"
nos 4 vídeos da Bluefit.
