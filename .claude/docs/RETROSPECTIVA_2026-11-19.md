# Retrospectiva 19/11/2026 — erros que se repetiram e o que mudou

O Chris: "quero que esses erros nunca mais voltem a acontecer … corrigido da origem até o final … e velocidade".

| Erro repetido | Casos | Origem | Regra nova |
|---|---|---|---|
| Corrigir o sintoma sem abrir o caso real de quem reclamou | Nathan (CP229 virou atalho; o vídeo mostra que ele ainda não sobe as empresas) | ficha escrita a partir do texto do pedido, sem ver a tela/dado/vídeo | arvore Passo 1b: ouvir/ver tudo, abrir o caso no ar no papel e aparelho real, necessidade ≠ sintoma |
| Esquecer caminhos paralelos | CP226b (lista EDITORIAL), CP232 (estado guardado), CP230 (Amanda no fluxo de orientação), CP228 (painel em aba escondida) | árvore listava arquivos, não a lista fixa de "onde mais isso passa" | arvore Passo 2b: lista de conferência obrigatória na ficha |
| Mensagem que manda usar um botão inexistente | "use Trazer para a versão atual" (CP232) → Fedalto sem saída | texto escrito sem conferir a condição do botão | toda mensagem aponta para saída existente; jornada clica o botão citado |
| Prova por chamada direta ao servidor | CP226b, CP230 | jornadas copiadas de outras que só chamam o callable | prova pelo clique no papel real; seed = estado real; --movel para tablet/celular |
| Lentidão (10–48 h por pedido) | bateria 50–60 min por PR, em série; reexecuções por tempo/memória | 1 PR = 1 bateria inteira serial; espera ociosa | bateria do CI em fatias paralelas; pipeline (preparar a próxima enquanto o CI roda); empilhar unidades do mesmo arquivo; vigia que publica/junta com ok |

Aplicado agora em: `.claude/skills/get-arvore-do-pedido`, `get-prova-de-jornada`, `get-mudanca-segura`, `.github/workflows/ensaio-jornadas.yml` (fatias).
