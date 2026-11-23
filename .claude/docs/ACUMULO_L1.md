# Varredura de acúmulo (L1) — o que pesa no sistema, medido, e o que fazer

Pedido do Chris (22/11/2026): "verificação completa … dados antigos … acúmulo de informação … que só pesa o sistema … eliminar …
cirúrgico e assertivo, sem prejudicar outras áreas".

Base da medida:
- Cópia anonimizada da produção de 22/11: 116 coleções, todas medidas.
- Todo o código: `escritorio.html` (3,97 MB, 1,07 MB compactado), os módulos `gs-*` e as Functions.
- Sonda no navegador com os dados reais (ensaio): o que vai ao servidor e quanto custa no aparelho.
- O emulador é bem mais lento que o site no ar com 16 mil documentos. Por isso, os tempos abaixo foram medidos no navegador, não no emulador.

## 1. Onde o peso aparece para a equipe

| O que | Medido | Situação |
|---|---|---|
| Entrar no Escritório (Amanda e Chris) | Baixa ~15 MB a cada entrada e em cada aparelho: demandas 5,9 MB (98% encerradas), calendários 4,5 MB, vídeos 2,6 MB, postagens 1,5 MB. São ~228 consultas ao abrir. O mesmo acontece quando o Chris troca de perfil. | Proposta 4 (abaixo) |
| Cada ação da gestão (concluir, entregar, abrir pelo aviso, repasse…) | +0,37 s para remontar as 5.395 demandas, mesmo vindo da memória | **CP255** (PR) |
| Radar de Perdas | Recalculava a cada minuto em qualquer tela (4 coleções, 2 consultas, redesenho) | **CP254** (PR #190) |
| Saúde das Automações (Chris) | Lê os 15.646 registros (3,4 MB) do servidor a cada abertura | **CP257** (lê só 30 dias) + retenção |
| Resgate de versões de calendário (Chris) | A busca baixaria as 894 versões (80 MB) para achar as de 1 cliente. Mas com a Central nova ativa (como está no ar), a aba "Resgatar" redireciona para a Central e essa busca não roda para ninguém. | Sem mudança (sem ganho real hoje) |
| Início do Chris, de sexta a domingo | O Panorama da Semana relia os 116 resumos diários (0,9 MB) a cada minuto com a tela aberta | **CP259** (lê só a semana) |
| Armazenamento do aparelho | As tentativas de aprovação e de postagem ficam guardadas para sempre, uma por vídeo ou postagem. A lista é relida inteira a cada tela. Se o espaço do navegador encher, o aparelho recusa guardar a próxima tentativa e nada é enviado. O histórico local chegava a 21 cópias e nenhuma tela lê. | **CP258** (saem as confirmadas; histórico ≤ 5) |

Todos os temporizadores do Escritório foram conferidos (8 ao todo):
- **Corrigidos:** Radar (CP254) e Resumo do Dia do Chris (CP259).
- **Já estavam corretos:**
  - Central de Comando: para sozinha fora da tela.
  - Agenda da equipe: é desmontada ao sair do Início e da agenda.
  - Aviso do checklist: lê só a pessoa e o dia.
  - Motor: de hora em hora, a partir da memória.
  - Acompanhamento de trabalhos da Central: só enquanto há trabalho em andamento.
  - Mascote: só animação.

## 2. Dados antigos no servidor (proposta de retenção)

A exclusão física é ok nominal do Chris. Antes de apagar: cópia completa (exportação) e uma rodada só de contagem.

| Coleção | Hoje | Quem usa | Proposta | Fica |
|---|---|---|---|---|
| `fila_emails` | 15.471 (5,7 MB): 13.736 enviados e 1.735 que nunca vão sair | Ninguém: o resumo por e-mail foi desligado em 09/11 (decisão do Chris). A tela não enfileira mais e a Function `digestsI165` não é chamada por ninguém. | Apagar tudo | 0 |
| `email_throttle` | 11.981 (1,4 MB) | A trava de 2 h dos e-mails imediatos | Apagar mais de 7 dias (~10.100) | ~1.800 |
| `log_automacoes` | 15.646 (3,4 MB). 4.529 são "email_FALHOU" de agosto a outubro (cota do EmailJS). | Só a tela Saúde (janelas de 24 h e 7 dias) | Apagar mais de 90 dias (4.652) | ~11.000 |
| `log_acessos` | 2.300 | Botão de consulta | Apagar mais de 90 dias (609) | ~1.700 |
| `calendarios_versoes` | 894 (80,6 MB) | Rede de segurança do resgate | **Manter** (quase tudo tem menos de 90 dias; a economia seria de só 12 MB) | 894 |
| `notificacoes_operacionais_i165` resolvidas | 1.811 | Histórico dos avisos | Manter: todas têm menos de 30 dias | — |
| `transmissoes_i165` recusadas | 1.920 | Recibos dos avisos no celular | Manter: todas têm menos de 30 dias (ver sinal no item 5) | — |
| `log_operacoes_delegadas` | 5.166 | Auditoria do Chris operando outro perfil | Manter (auditoria) | — |

Resultado da retenção: cerca de 31 mil documentos e 11 MB a menos, sem tocar em nada que a equipe usa.
Ela não muda a velocidade de entrada: essas coleções não são baixadas ao abrir. O ganho está na Saúde, na cota de leitura e na organização.

## 3. Dado antigo que pesa na entrada (o maior)

`demandas`: 5.387 documentos (5,9 MB). São 4.636 aprovadas, 235 canceladas, 479 pendentes e 26 aguardando aprovação.
O ouvinte em tempo real da gestão traz todas a cada entrada. As telas do dia a dia usam só as abertas.
O histórico (Arquivo de entregas, linha do tempo do cliente, relatório mensal, histórico de Minhas Demandas, rotinas que evitam aviso repetido)
usa as encerradas.

**Proposta 4 (código, sem apagar nada, reversível):**
- O ouvinte da gestão passa a trazer só as abertas (~505 em vez de 5.387, ~0,6 MB em vez de 5,9 MB por entrada).
- O histórico é lido sob demanda, só quando a tela de histórico abre.
- É uma mudança compartilhada (muitas telas leem a mesma lista). Exige a árvore inteira, a conversão das rotinas anti-repetição e prova em todas as telas de histórico.
- Recomendo fazer depois da semana de produção dos calendários de janeiro, como unidade própria.

`calendarios` (4,5 MB em 41 documentos; o maior tem 320 KB): 1,8 MB são retratos de aprovação de meses passados e 0,7 MB são itens de meses
anteriores a outubro. São baixados por Chris, Amanda e Cecília e pela página do cliente. O domínio do mês está congelado até a F5, por isso fica para depois.

## 4. Código acumulado

- **Arquivos mortos** (ninguém importa): `gs-conferencia-cecilia-i63.js` e `gs-gravacoes-cliente-i61.js`.
  Nenhuma tela baixa esses arquivos, então eles não pesam para quem usa. Saem na próxima limpeza de repositório, sem PR próprio.
  O `financeiro-ui-v103.mjs` ainda é usado por testes do financeiro, então fica.
- **Trechos mortos no `escritorio.html`**: código depois de um `return` (marcado "código histórico preservado"), `decidirEditor` (nunca chamado),
  uma verificação fora do motor e uma função sem chamador. Somam poucos KB de 3,97 MB.
  Removê-los não deixa nada mais fluido, então ficam até alguém mexer nessas áreas (decisão: não vale o risco de um PR só para isso).
- **Function sem uso**: `digestsI165` (resumo por e-mail desligado). Fica registrada; a remoção entra junto com a próxima publicação das Functions.

## 5. Sinal operacional encontrado (não é acúmulo)

Nos últimos 30 dias, 1.872 avisos no celular não foram entregues porque a pessoa não tem aparelho ativo confirmado:
Cecília 835, Amanda 662, João Victor 296, Helo 72, Chris 48.
Os avisos continuam no sistema. Para receber no celular, basta seguir o passo de instalação do Escritório (CP246) em cada aparelho.

## 6. Medidas que mudaram a lista inicial (para não exagerar o ganho)

- Para a gestão, uma leitura "do servidor" de uma coleção que já tem ouvinte inteiro (demandas, vídeos, postagens, agendamentos, stories)
  **não vai ao servidor**: o Firestore responde da memória. O custo é no aparelho (de 1 a 370 ms por leitura), não leitura cobrada.
- Por isso, o "conserto do cache depois de gravar" (CP256) foi **descartado**: o ganho seria de milissegundos e o risco não compensa.
- Os 12 s por recálculo do Radar vistos no ensaio eram lentidão do emulador, não do site no ar.

## 7. Situação em 23/11

No ar, com prova vermelha e verde de cada um e bateria de 353/353 nas duas telas (desktop e celular):
- CP254: Radar (PR #190);
- CP255: demanda tocada (PR #191);
- CP257: Saúde (PR #192);
- CP258: aparelho (PR #193);
- CP259: panorama (PR #194).

Retenção dos dados (item 2): contagem de produção em 23/11 deu 45.416 registros, dos quais 31.179 saem. Ok nominal do Chris dado sobre esses números. CP260 (contagem diária no vigia) e CP261 (rotina a cada 2 h que copia para o Storage e só então apaga).

## 8. Ordem de execução (planejada)

1. CP254 Radar à vista (PR #190).
2. CP255 conferir só a demanda tocada.
3. CP257 Saúde lê só 30 dias (J111 verde) · CP258 aparelho sem acúmulo (J112 6/6 verde) · CP259 panorama lê só a semana (J113 verde). Um PR cada.
4. Retenção dos dados (item 2), com ok do Chris: Function de faxina com rodada só de contagem primeiro, depois a exclusão, e conferência pelo vigia.
5. Proposta 4 (demandas abertas na entrada), depois da semana de produção de janeiro, com ficha própria.
