# G2a — motor: rotinas que liam coleções inteiras ficam pausadas
Pedido original (literal): "não tenho o valor para pagar que eles querem vamos ter que contornar isso de um jeito que não tenha mais essas cobranças absurdas e não tenha mais erros também de maneira definitiva"
Decisão do Chris (27/11, pergunta direta): "Pausar os caros hoje" — reescrever uma por uma para ler só o que está aberto.
Unidade: G2a de G2 · Tipo: erro (custo/cota)

Sintoma: com o Google no limite gratuito (50 mil leituras/dia), a cota acabava logo que a gerência abria o Escritório.
Reprodução: medidor no navegador (proxy entre a tela e o emulador, cópia real): sessão do Chris = ~670 mil leituras; sem o motor, ~15 mil.
Por rotina (uma rodada, cópia real): lembretesPrazoHoje ~108 mil · coberturaPostagensAmanda ~89 mil · postagensEsquecidas ~55 mil ·
emailsDemandasNovas ~46 mil · demandasEscalonamento ~28 mil · videosAtrasados ~24 mil · gravacoesFantasma ~18 mil · demandasSubstituidas ~17 mil ·
choquesDeData ~11 mil · retaFinalPrazos ~11 mil · 9 rotinas de ~4–6 mil (uma leitura inteira de demandas cada) · alertasDeGargalo ~1,3 mil ·
digestsDeEmail lê fila_emails (1.702) a cada hora, e os e-mails não saem desde setembro (cota do EmailJS).

Árvore:
RAIZ: motorAutomacoes (escritorio.html) — lista de verificações frequentes (de hora em hora) e diárias
├─ ESCRITORES: as rotinas criam/fecham demandas de alerta (prazo, cobertura, atrasos, fantasmas, duplicatas) e e-mails
├─ LEITORES: painel Agora/Meu Dia (mostra prazos, atrasos e pendências pelos dados, sem depender do alerta), Saúde (log motor_executado)
├─ HUMANOS: Amanda/Cecília deixam de receber esses avisos automáticos enquanto pausados
├─ RULES: nada muda
├─ CONTINUAM: aprovação tácita, tarefas fixas, saídas programadas, calendário novo, cadastros novos, vínculo de pedidos, kits, resumos 17h/19h
└─ JORNADAS: J39, J70, J76 registram a pausa (ensaio/lib/pausas-g2a.mjs); voltam sozinhas quando a rotina sair do conjunto

Mudança: `ROTINAS_PAUSADAS_G2A` filtra a lista do motor; o log da rodada diz quantas estão pausadas. Manutenção diária continua carimbando.
Medição depois: sessão do Chris com o motor completo ~670 mil → ~21 mil leituras; parado = 0.
Testes: J08, J17, J23, J39, J70, J76, J131, J69, J11, J110 — 63/63.
Próximo: G2b (abertura da gerência lê as demandas 3 vezes inteiras) e reescrever cada rotina pausada para ler só o que está aberto.
