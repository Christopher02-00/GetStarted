# otavio-u3-etiquetas-i144 — aposentar as 4 etiquetas dentro da Zeiss

Unidade: 3 de 4 · Tipo: ajuste (código; sem rules)
Depende de: U2.

## Situação
`gs-empresas-otavio-i144.js` (out/2026) põe uma etiqueta `empresaOtavio` nos conteúdos da Zeiss (114 usos no escritório, 42 no Portal, 25 no calendário, cópia em `functions-get/lib/empresas-cp101-i165.mjs`).
Uso real na exportação: 3 registros com etiqueta (`otica_sao_jose`: 1 vídeo, 1 postagem, 1 controle de programação); 0 itens de calendário etiquetados.

## Problema que a mudança resolve
Com 6 empresas × 9 vídeos num só documento `calendarios/zeiss`, seriam ~54 itens por mês × ~3 KB = ~160 KB por mês. O documento passaria de 1 MB (limite do Firestore) em cerca de 6 meses. Clientes separados = 1 documento por empresa, como os outros clientes.

## Mudança
Parar de oferecer a escolha de empresa para conteúdo novo; os 3 registros antigos continuam mostrando a etiqueta (só leitura). Sem migração de dados.
Atualizar AGENTS.md: as 6 empresas do Otávio são clientes distintos e a cobrança é agrupada (U1).
