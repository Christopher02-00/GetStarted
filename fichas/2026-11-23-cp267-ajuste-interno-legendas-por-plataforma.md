# cp267 — ajuste interno em todo mês liberado (Stokki inclusive) e legendas por plataforma

Pedido original (Chris, 23/11, urgente): "Correção no Site Get: Stokki 2026-12 (liberado) não tem como receber ajuste interno, e o ajuste
interno não edita as legendas por plataforma. Correção na raiz, para todos os clientes. … Rules e functions em produção: só com o meu ok
nominal." Ficha do pedido: `claude/fichas/2026-11-23-stokki-ajuste-interno-indisponivel.md`.
Unidade: 1 (erro + ajuste, inseparáveis: abrir o ajuste da Stokki sem as legendas por plataforma faria a correção cair no campo errado).

Caso real (export só leitura de 23/11 12:25 UTC): stokki · 2026-12 liberado pela Amanda em 20/11 19:53; 9 conteúdos, nenhum agendado,
publicado ou gravado; todos com legendaInstagram/Tiktok/Youtube/Linkedin (algumas vazias). A Mochi 2026-12 abre normalmente.

Causa-raiz (functions-get/ajustes-internos-cp123.mjs, desde a CP123 de 28/10):
- `alvoDisponivel` tinha `c.cliente!=='stokki'` → todo conteúdo da Stokki "não apto" → `aptos=[]` → o quadro escondia o início;
- `CAMPOS=['desc','legenda','obs']` → o ajuste não tinha as legendas por plataforma; e `conteudoVirtualInternoCp123` copiava a legenda
  principal por cima de toda variante preenchida (na Stokki, as quatro legendas diferentes virariam uma só);
- o contrato da ação (`editorial-contrato-i172.mjs`) só aceitava desc/legenda/obs/preparação no salvar;
- a liberação só marcava "legenda atualizada" e pedia nova revisão do cliente quando a legenda principal mudava.

Árvore:
RAIZ: registro `calendarios_ajustes_internos_cp123` (conteudo) → liberação I172 → `calendarios.items` + `aprovacaoMeses[m].retratoLiberadoV115`
├─ ESCRITORES: iniciar/salvar/enviar/decidir CP123 (servidor), `prepararPublicacaoInternosCp123` na liberação da Amanda
├─ LEITORES: quadro "Ajustes internos" (gs-ajustes-internos-cp123.mjs no editor do mês), cópia do cliente `calendarios_cliente` (gatilho),
│            calendário do cliente (gs-legenda-cliente-i95: mostra cada legenda por plataforma), fila de legendas e criação de postagem
│            (lê o item publicado: `textosPorPlataformaI164`)
├─ HUMANOS: Chris (inicia/edita/envia), Amanda (aprova/libera), cliente (vê no Portal), Gabi/Cecília (fila de legendas/postagem)
├─ RULES: sem mudança
├─ AUTOMAÇÕES: cópia do cliente (gatilho existente), backup `calendarios_versoes` da liberação (guarda a versão anterior)
├─ LEGADO: registros antigos sem as legendas por plataforma seguem como antes; conteúdo só com legenda principal (Mochi) idem
└─ EFEITO COLATERAL: peça adicional (CP142) continua fora para Stokki (sem legenda por plataforma) e Zeiss (sem empresa) — agora com o motivo

Mudança:
- servidor `ajustes-internos-cp123.mjs`: sem exclusão pelo nome; `motivoNaoAptoCp267` (retirado, publicado, agendado, gravado no processo
  novo, duplicado) decide o apto; conteúdo "multiplataforma" (alguma legenda por plataforma preenchida e diferente da principal) leva as
  quatro legendas ao iniciar; salvar confere a contagem com elas; o conteúdo virtual não sobrescreve a legenda por plataforma que está no
  ajuste; a liberação marca `legendaAtualizadaPor/Em` e usa `revisar(...,{forcar})` quando uma plataforma muda (mesmo padrão do editor do
  mês, editorial-calendarios-i172.mjs:133, agora pelos dados); o retorno traz `naoAptosCp267`, `motivoInicioCp267`, `motivoAdicionarCp267`.
- servidor `editorial-contrato-i172.mjs`: o salvar aceita as quatro legendas por plataforma (opcionais; o registro decide quais).
- tela `gs-ajustes-internos-cp123.mjs`: campos "Legenda · Instagram/TikTok/YouTube/LinkedIn" quando o registro os tem; quadro mostra
  "Conteúdos que não podem receber ajuste interno agora" com o motivo, o motivo do início fechado e o da peça adicional.
- cadeia `?v=`: gs-ajustes-internos-cp123 → gs-editor-calendario-central-i172 → escritório (2 imports).

O que NÃO muda: vídeo, postagem publicada/agendada, outros conteúdos, rules, I68 (`campos` da assinatura de todos os clientes).

Testes: J122 7/7 — vermelha no main (Stokki: "no início: NENHUM", 3/7) → verde: tela do Chris mostra A e C para iniciar e "Dia 10 ·
Já agendado — já está agendado na plataforma"; o ajuste tem os 4 campos; Chris muda TikTok e YouTube e envia; Amanda aprova e libera;
calendário e versão liberada com TikTok/YouTube novos e Instagram/LinkedIn/principal iguais; legenda atualizada por Chris; aprovação
anterior do cliente guardada; backup da liberação com as legendas antigas; Portal (calendário do cliente) mostra as novas; Mochi com os
três campos de sempre (inclusive a variante que só repete a principal). Vizinhas CP123/I172/Stokki no CI e local.

Publicação: Pages no merge (tela tolerante: só mostra os campos que o servidor manda). Functions SÓ com o ok nominal do Chris.
Caso real depois: Stokki 2026-12 — aplicar as correções de `claude/clientes/stokki/2026-12-correcoes-andrea.md` e enviar à Amanda.
