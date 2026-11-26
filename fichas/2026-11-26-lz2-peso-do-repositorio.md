# lz2-peso-do-repositorio — versões antigas, módulos sem tela e scripts aposentados saem do repositório
Pedido (26/11): catálogo Limpeza 2027, itens cod-rollback e cod-modulos ("No geral ok pode começar"); scripts legados já aposentados pelo Chris em 09/11 (P15).
Unidade: LZ2 de 8 · Tipo: ajuste (remoção, sem efeito na tela)
Árvore:
RAIZ: rollback_v95…v107 (11 pastas, 31 MB); gs-gravacoes-cliente-i61.js; gs-conferencia-cecilia-i63.js; financeiro-ui-v103.mjs (122 KB);
      scripts/preflight.mjs, scripts/regression-*.mjs, scripts/firebase-emulator-v101/v103/v111 (86 itens); MANIFESTO_SHA256_*.txt e UPLOAD_V*.txt (manifestos de entrega do Codex)
├─ LEITORES  : nenhuma página importa os 3 módulos (busca no repo inteiro); financeiro-ui-v103 só era lido pelos scripts legados;
│              CI (.qa-get), jornadas (ensaio) e workflows não usam nada disso; scripts/papeis-cp225.mjs (CI das jornadas) e as ferramentas CP200/CP214 ficam
├─ HUMANOS   : ninguém (fora do Pages pelo _config.yml)
├─ RULES/AUTOMAÇÕES: nada
├─ LEGADO    : o histórico do Git guarda tudo (git show <sha>:caminho)
└─ EFEITO    : _config.yml sem exclusões de arquivos que não existem mais
Mantidos de propósito: RELATORIO_*, CATALOGO_DE_ERROS.md, LEIA-ME_*, DIAGNOSTICO_* (conhecimento, ~0,6 MB, fora do Pages).
Docs: AGENTS.md (suíte oficial), PASSAGEM (estrutura e legado), ACUMULO_L1 §4.
Testes: duplicatas 0 nova; jornadas do financeiro J10, J16, J29, J44, J46, J72, J73 (52/52); bateria inteira no CI do PR.
