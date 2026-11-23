# cp265 — a Cecília confirma de uma vez as publicações que saíram no horário

Pedido original (literal, Chris, 23/11): "simplificar para a Cecília e Amanda aprovar mais de uma coisa de uma vez por exemplo aprovar tudo
de uma semana inteira … sem gerar problemas em outras áreas". Caixa de perguntas: "Aprovações em lote → Sim, começar".
Unidade: C4c (2ª de 3 do lote) · Tipo: novo.

Volume real (30 dias, export 22/11): 50 publicações confirmadas à mão pela Cecília (≈ 12/semana); 164 já saíram pela confirmação
automática da faxina (CP248, 2 dias depois). O botão rápido "✔ Saiu no horário — conferi no perfil" (U4) exigia um toque por postagem.

Árvore:
RAIZ: `postagens.status` agendado → postado (ação `publicacao` do servidor, prova por rede)
├─ ESCRITORES: `abrirPublicacaoDaFilaCp125` → `tratarFato` → `fluxo.confirmar('publicacao')` (o mesmo do botão rápido)
├─ LEITORES: fila "Publicações para conferir" (CP125), avisos do canal (`gs-avisos-canal-i165.mjs`), vigia D2, faxina CP248
├─ HUMANOS: Cecília (declara que conferiu no perfil); cliente/Amanda veem o "postado"
├─ RULES: sem mudança
├─ AUTOMAÇÕES: `aposConfirmar` (fecha a ficha, relê a fila) — igual, por item
├─ LEGADO: Stokki (8 itens por plataforma — decisão do Chris: continua por plataforma), tentativa anterior e data a conferir NÃO entram
└─ EFEITO COLATERAL: nenhum fora da fila; o resumo aparece uma vez, no fim

Mudança:
- `gs-fila-publicacoes-cp125.mjs`: com 2 ou mais linhas rápidas (`rapidaCp125`), "✔ Confirmar as N que saíram no horário — conferi no
  perfil". A confirmação lista cliente, título, data e hora. `confirmarLote` chama o MESMO `abrir` do botão rápido, uma por uma, e só conta
  como feita quando o controlador devolve 'confirmada'. Para na que mudou depois da confirmação (deixou de ser rápida) ou que não confirmou
  (orientação a ler, recusa do servidor: a ficha fica aberta com os campos preenchidos).
- `escritorio.html`: o caminho rápido de `abrirPublicacaoDaFilaCp125` devolve 'confirmada' quando o servidor confirmou e a ficha fechou
  (antes devolvia só "tratada"); `?v=` atualizado na cadeia fila → avisos-canal → escritório.

O que NÃO muda: o botão rápido de cada linha, a conferência completa, Stokki, "Já foi ao ar?", servidor, rules.

Testes: J119 (Cecília, tela real, caminho completo vídeo → legenda → agendamento) 6/6 — vermelha antes (sem botão) → verde: 4 vencidas e
1 futura; durante a confirmação a 3ª é reprogramada; o lote confirma a 1ª e a 2ª (prova "saiu no horário agendado"), para na 3ª, a 4ª fica
na lista e a futura continua agendada. Vizinhas J33/J116/J61b + J119 = 34/34; celular J119/J33 13/13.
J108 (dados reais de 22/11) 8/17 — IGUAL no main e no commit da CP253 (ab976c3): as 9 linhas da Stokki recusam no emulador com
"Esta postagem anterior mudou de identidade ou foi recriada" (limite descrito no cabeçalho da J108: a cópia recria os documentos).
Em produção a mesma conferência roda no vigia (D5) sem alerta, e as 9 plataformas de outubro já foram confirmadas pela CP262 (export 23/11).
