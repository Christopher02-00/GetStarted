# otavio-u3-etiquetas-i144 — aposentar as 4 etiquetas dentro da Zeiss

Unidade: 3 de 4 · Tipo: ajuste (código; sem rules)
Depende de: U2.

## Situação
`gs-empresas-otavio-i144.js` (out/2026) põe uma etiqueta `empresaOtavio` nos conteúdos da Zeiss (114 usos no escritório, 42 no Portal, 25 no calendário, cópia em `functions-get/lib/empresas-cp101-i165.mjs`).
Uso real na exportação: 3 registros com etiqueta (`otica_sao_jose`: 1 vídeo, 1 postagem, 1 controle de programação); 0 itens de calendário etiquetados.

## Problema que a mudança resolve
Com 6 empresas × 9 vídeos num só documento `calendarios/zeiss`, seriam ~54 itens por mês × ~3 KB = ~160 KB por mês. O documento passaria de 1 MB (limite do Firestore) em cerca de 6 meses. Clientes separados = 1 documento por empresa, como os outros clientes.

## Mudança feita
- `gs-empresas-otavio-i144.js`: `campo()` só aparece para registro já etiquetado (rótulo "etiqueta antiga"); `opcoes()` oferece só Geral + a etiqueta atual; `abas()` não desenha mais as abas; `selecao()` é sempre "todos" (nenhum filtro esconde conteúdo, nem por link antigo `?empresa=`); `selo()` só aparece em registro etiquetado. `campos`/`conferir`/`bruto` iguais: a validação de origem dos 3 registros antigos continua.
- `gs-editor-calendario-central-i172.mjs`: o seletor "Empresa" do card só aparece em item já etiquetado.
- `calendario.html` = `calendarios.html` (byte a byte): o campo Empresa do modal só aparece em item etiquetado.
- `functions-get/lib/empresas-cp101-i165.mjs` **não muda** (sem deploy de Functions): o servidor usa só `campos`/`conferir`/`bruto`.
- Junto (U1.1): `financeiro-core.mjs` mostra a parte do grupo também na mensalidade isenta já gravada (1º mês em cortesia do cadastro da Central).
- `?v=` com sha256: i144 (4 páginas), editor I172 (2 imports), cadeia financeira.

## Testes
J30 nova e J29 ampliada: vermelhas no main (7/12), verdes aqui (12/12).
