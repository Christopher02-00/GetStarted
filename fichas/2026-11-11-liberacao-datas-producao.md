# liberacao-datas-producao — conteúdo programado depois da publicação não trava a liberação das correções (CP201)
Pedido original (literal): Chris, 11/11 (print + áudio da Amanda): "A Amanda acabou de catalogar um problema… A gente precisa corrigir isso do início ao fim para que não aconteça com nenhum cliente, da origem". Amanda: "eu já liberei a alteração e tudo, mas não tá indo pro cliente… tá ali como notificação".
Unidade: 1 de 1 · Tipo: erro
Sintoma: Início da Amanda → "Alterações de calendário para revisar" → Fedalto · Novembro 2026 → "1 aprovada, ainda sem liberar ao cliente". "Conferir e liberar" não libera; o cartão fica para sempre.
Reprodução: produção, só leitura (11/11): ajuste interno CP123 `interno_cp123_6da2f5a3…` aprovado pela Amanda às 08:57; `resumoInternosCp123` → liberacaoPermitida=false, motivo "O mês contém outra versão editorial ainda não reconciliada". Diferença entre calendário e retrato publicado (04/11): só `day`/`dataPostagem` de 4 conteúdos que a Cecília programou depois (agendado=true, postagem ligada).
Causa-raiz: a conferência de liberação compara o calendário atual com o retrato publicado campo a campo, inclusive dia/data. Programar uma postagem muda dia/data (fato da produção, mesma regra do retrato do cliente em `aprovacaoNoRetrato`), então todo mês com postagem programada depois da publicação ficava sem liberação de correção.
Árvore:
RAIZ: comparação "calendário atual × retrato publicado"
├─ CP123 resumoInternosCp123 (liberar ajuste interno — caso da Amanda)
├─ CP121 elegibilidadeReliberacaoAjustesCp121 (reliberar pedidos do cliente — mesmo defeito)
├─ CP129 provaAdocao (adotar mês publicado — mesmo defeito)
├─ LEITORES: Início/Aprovações da Amanda (fila CP123, contador), Central do editor (botão Publicar)
├─ ESCRITORES: agendamento (atualizarItemAgendamentoPautaR1a) muda day/dataPostagem — correto
└─ EFEITO: nenhum na publicação (o retrato novo nasce do calendário atual)
Mudança: `alinharDatasProducaoCp201` em ajustes-calendarios-cp112.mjs — para comparar, o item publicado recebe o dia/data do atual quando o atual está programado/publicado com data válida (mesma regra do retrato). Usada nos 3 pontos.
O que NÃO muda: mudança de texto, nome, ordem, exclusão ou data de conteúdo NÃO programado continua bloqueando (precisa revisão completa).
Testes: RPR3 (.qa-get) com conteúdo programado depois da publicação — vermelho no main ("Aprovação deve oferecer próximo passo de liberação"), verde com a correção; portão completo.
Produção: com a correção, a mesma conferência (só leitura) da Fedalto dá liberacaoPermitida=true. Depois do deploy a Amanda clica de novo em "Conferir e liberar".
