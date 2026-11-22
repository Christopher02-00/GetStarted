# cp257-saude-le-so-a-janela — a Saúde das Automações lê só os últimos 30 dias do log

Pedido (Chris, 22/11): varredura de acúmulo, "dados antigos … que só pesam o sistema". Unidade: L1-d1 (CP257) · Tipo: erro (peso)

Caso medido (dados reais de 22/11):
- Gerência → Relatórios → Saúde das Automações lia do servidor TODOS os registros de `log_automacoes` a cada abertura: 15.646 documentos, 3,4 MB.
- `log_automacoes` não tem ouvinte em tempo real, então essas leituras vão de fato ao servidor e são cobradas.
- A tela mostra janelas de 24 h e 7 dias, os 25 mais recentes de cada lista e os 40 últimos registros.
- 4.652 registros têm mais de 90 dias; 4.529 são "email_FALHOU" de agosto a outubro (cota do EmailJS).

Causa-raiz: leitura da coleção inteira para mostrar só janelas recentes.

Árvore:
RAIZ: `renderSaudeAutomacoes` (escritorio.html)
├─ ESCRITORES : `registrarLogAutomacao` (executadoEm = serverTimestamp), resumo das 19 h (doc com `quando`, sem executadoEm)
├─ LEITORES   : só esta tela (e o selo da subaba)
├─ PAPÉIS     : Chris e Amanda (Gerência)
├─ RULES      : a mesma leitura, agora com filtro (`list` já permitido)
├─ ÍNDICE     : filtro de um campo (`executadoEm >=`), índice automático; o projeto não tem isenção de índice
└─ EFEITO     : listas e totais passam a dizer "nos últimos 30 dias"; o resumo das 19 h (sem executadoEm) já ficava no fim das listas e sai

Mudança (só tela): consulta `where('executadoEm','>=',30 dias atrás)`. Os rótulos dizem a janela e o rodapé mostra "Últimos 30 dias: N registro(s)".
O que NÃO muda: os cartões (24 h e 7 dias), o diagnóstico do e-mail, a conferência de arquivos do Chris, o selo.
Testes:
- J111 (nova): vermelha antes (1 leitura do log inteiro; registro de 100 dias lido), verde depois (só a janela; falha recente e última rodada na tela).
- Bateria inteira no CI.
Risco residual: se o motor ficar mais de 30 dias sem rodar, o cartão "Desde a última rodada" mostra "—" em vermelho em vez das horas.
Continua contando como problema.
