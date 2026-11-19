# cp226-substituicao-processo-novo — "Substituir conteúdo" também no processo novo, com formato, e ajuste comum vira substituição
Pedido original (literal): "No ajuste interno (gs-ajustes-internos-cp123.mjs), a opção “Substituir conteúdo” (substituicao_cp129) só aparece no modo continuar_legado. Liberar essa opção também no modo normal, para Chris e Amanda poderem trocar título (name), formato (fmt), referência (ref) e data (day/dataPostagem) de um conteúdo já liberado, passando pela mesma revisão da Amanda. Caso real: Camargo’s 2026-12, com 11 ajustes internos já enviados. Depois da correção, aplicar título, formato e data (dia 25 → 24/12) nesses mesmos ajustes, sem começar de novo."
Unidade: U1 de 2 (U2 = aplicar nos 11 da Camargo's, escrita em produção) · Tipo: ajuste (muda regra vigente CP208)
Regra vigente avisada ao Chris: CP208 dizia "substituição editorial segue exclusiva da continuidade antiga". Chris decidiu em 18/11: mudar a regra; incluir o formato; transformar os 11 no mesmo registro.
Sintoma: no processo novo o seletor só oferece "Corrigir roteiro, legenda ou edição" e "Retirar peça adicional"; o servidor recusa tipoAjuste substituicao_cp129 ("A preparação I155 conserva a origem e não permite substituição editorial"). A substituição antiga não troca `fmt`. Ajuste comum enviado/aprovado não pode virar substituição.
Reprodução: produção RO — Camargo's 2026-12 (ciclo I155, liberado): 11 ajustes comuns (7 aprovados, 4 enviados), motivo "trocar este conteúdo pelo do documento novo Roteiro Camargo's".
Causa-raiz: guarda em `operarInternoCp123` (origem I155) e em `conferirEscopoPreparacaoI155Cp140`; tela esconde a opção com `!normal`; `CAMPOS_SUBSTITUICAO` sem `fmt`; não existe passagem ajuste comum → substituição.
Árvore:
RAIZ: calendarios_ajustes_internos_cp123 (tipoAjuste, conteudo)
├─ ESCRITORES : operarInternoCp123 (iniciar/salvar/enviar/decidir + converter_cp226 novo), rebaseInternoCp215, concluirPublicacaoInternosCp123
├─ LEITORES   : dtoInternosCp123 (editor), filaInternosCp123 (quadro "Meus ajustes internos"/Amanda), resumoInternosCp123 (liberação)
├─ PUBLICAÇÃO : prepararPublicacaoInternosCp123 → conteudoVirtualInternoCp123 (name/fmt/ref/day/dataPostagem entram no item) → entrega do ciclo (mesmo caminho da CP208)
├─ HUMANOS    : Chris inicia/transforma/salva/envia; Amanda aprova/devolve/libera; cliente vê só após a liberação
├─ CONTRATO   : editorial-contrato-i172 (ACOES_INTERNOS_CP123 + conferir_cp142 aceitam converter_cp226)
├─ RULES      : nenhuma (coleção só pelo servidor)
├─ LEGADO     : substituições antigas sem `fmt` continuam válidas; preparação I155 continua só preparação
└─ COLATERAL  : hash de gs-ajustes-internos-cp123 em gs-editor-calendario-central-i172; hash do editor no escritorio.html (2 imports)
Mudança: functions-get/ajustes-internos-cp123.mjs, functions-get/editorial-contrato-i172.mjs, gs-ajustes-internos-cp123.mjs, imports ?v=.
O que NÃO muda: quem inicia (só Chris), quem aprova e libera (só Amanda), completude da substituição (textos novos), peça adicional, retirada, preparação I155, Stokki/Zeiss.
Testes: J60e (nova) — tela mostra o tipo; substituição com formato e data; ajuste comum aprovado vira substituição no mesmo registro; contraprova Amanda não transforma; liberação leva título/formato/dia/data ao retrato e à cópia do cliente. Dependências J06, J56, J60. Vermelha no main, verde na branch; bateria inteira no CI.
Risco residual: deploy das Functions (ok nominal do Chris) precisa ir antes da tela; tela nova com servidor antigo mostra a opção e o servidor recusa com mensagem.
