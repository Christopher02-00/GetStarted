# ensaio-cp196-e-meia-noite — jornada permanente do CP196 e horários da J04/J25 sem virada de meia-noite
Pendências de 10/11/2026, concluídas a pedido do Chris em 11/11. Só testes; nenhum código do site muda.
1) J53 (nova) prova o CP196 (#91) com dados fictícios, no caminho real da tela. Continua a J52 (Zeiss, dezembro em ajuste):
   - o Chris reenvia (base A);
   - a Amanda envia o documento novo (base B);
   - o Chris clica "Confirmar nova base após comparação";
   - a Amanda devolve.
   Contraprova: com o CP196 desfeito, o passo 4 fica vermelho ("estado esperado não chegou"). Com o CP196, fica verde ("ajuste_interno na base B · 2 conteúdos intactos").
2) J04/J25 agendavam "hoje 00:01" e confirmavam "hoje 00:15". Rodando entre 00:00 e 00:15 de São Paulo, o horário ainda era futuro e o servidor recusava "fato futuro" (o CI do #102 caiu às 00:0x).
   - Agora `passadoSP()` usa hoje 00:01/00:15 depois das 00:40 e ontem 23:30/23:40 antes disso, sempre no fuso de São Paulo (Intl), qualquer que seja o fuso da máquina.
   - Provado nos dois modos (`ENSAIO_MADRUGADA=1` força a madrugada): J04 e J25 verdes.
