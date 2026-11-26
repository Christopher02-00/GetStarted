# lz1-paginas-de-risco — páginas soltas com senha no código e sem uso saem do site
Pedido original (literal, 26/11): "esses 12 acredito que nenhum é funcional mais pode apagar o risco que encontrou logo · No geral ok pode começar"
Catálogo: https://claude.ai/artifact/M91tkpvgWfhNqShYSdXBfu (itens pag-demandas, pag-calendarios-get, pag-lapides, pag-editorial-antigo, pag-links, ger-tv)
Unidade: LZ1 de 8 (Programa Limpeza 2027) · Tipo: ajuste (remoção)
Sintoma: páginas publicadas que ninguém usa; duas com a mesma senha escrita no HTML (repositório público); uma lista 16 clientes.
Medição do risco real (não exagerar): as páginas não fazem login, então o banco já recusava a leitura (rules exigem a equipe logada);
os links de calendário sem chave já não abriam (calendario.html exige `t`/`e` desde a V-acesso). Resta: senha exposta (trava só visual)
e a lista de clientes. Se a mesma senha for usada em outro lugar, trocar lá.
Árvore:
RAIZ: arquivos demandas.html, painel-tv.html, Calendarios_Clientes_Get.html, cadastros.html, roteiros.html, links.html, Calendario_Editorial_Interativo_Get.html
├─ ESCRITORES : nenhum (páginas estáticas)
├─ LEITORES   : escritorio.html só aponta para painel-tv.html (aba Gerência › Painel de TV, iframe); nenhuma outra página/sw/manifest aponta
├─ HUMANOS    : Chris e Amanda (aba Painel de TV); público com o endereço
├─ RULES      : nada muda
├─ AUTOMAÇÕES : nenhuma; CI (.qa-get) e ensaio não carregam estas páginas; scripts/regression-v77/v80 e preflight (antigos, fora do CI) citam links.html/cadastros.html
├─ LEGADO     : links antigos para estas páginas passam a dar 404 (decisão do Chris)
└─ EFEITO     : Gerência perde a aba Painel de TV (grupo Relatórios segue com 4 abas)
Mudança: git rm das 7 páginas; escritorio.html sem a aba/tela/iframe/limpeza do Painel de TV, sem 'painelTV' em GERENCIA_SUBTABS e no mapa,
sem a resposta do Bit sobre o Painel de TV; _config.yml sem a exclusão da página que não existe mais; PASSAGEM §1 lista de páginas.
O que NÃO muda: calendarios.html (cópia do calendário; links antigos de cliente), cadastro.html, avulso.html, pedido-cliente.html, plano-acao.html.
Testes: portão 1–3 verde; jornadas da Gerência J109, J11, J111, J118, J15, J58 (59/59); bateria inteira no CI do PR.
Risco residual: alguém com link salvo para links.html (bio) ou painel-tv.html recebe 404 — decisão do Chris.
