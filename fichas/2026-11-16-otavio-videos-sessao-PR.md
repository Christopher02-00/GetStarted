fix(gravacoes): vídeo avulso sai completo e "Agendar a mesma saída" para outro cliente (CP221)

## Entendimento
Luís (16/11): a sessão aberta era só da Zeiss e ele precisava subir vídeos da Ótica Hauer, Ótica São José e clínicas. Subiu pelo "Gravado avulso" e a Amanda recebeu "Clínica dos Olhos Hauer — Vídeo", com "Identificar conteúdo" ainda na tela, mesmo com o conteúdo escolhido. Unidade U1 de 1 (ficha `fichas/2026-11-16-otavio-videos-sessao.md`).

## Alterações
- `escritorio.html` (git hash-object 64a6a9e2 → 1ab63130):
  - `lancarVideos`: título `<Cliente> — <conteúdo do calendário>` quando o nome digitado é genérico ("Vídeo", "Vídeo 2"). Na transação, `ligarAvulsosAoCalendarioCp221` grava `calendarItemId/calendarCompetencia/calendarClienteSlug/calendarItemIdx` + ocupação I28 no mesmo commit, com os helpers da sessão. Se a pauta não puder ser ocupada, o vídeo fica como hoje (referência I106). Digest e ids `i67_` sem mudança.
  - Lista de gravações (Chris/Amanda/Cecília): botão "Agendar a mesma saída para outro cliente", com clique por delegação (nenhum `window.*` novo). Copia data, hora, local, tipo, equipe, estilo, referências e observações, depois limpa e foca o cliente. `agendarGravacao` não mudou.
  - Aviso no formulário: "Gravação com vários clientes? Agende uma sessão por cliente — cada um vê o próprio calendário."
- `ensaio/jornadas/J68-avulso-completo-e-mesma-saida.mjs` (nova), `ensaio/README.md` (linha J68), `CLAUDE.md` (portão 177/177).
- Nenhum `.mjs` importado foi alterado, então nenhum `?v=` foi trocado. Rules e Functions não mudaram.

## Provas de validação
- `extrair_inline.py | node --check`: ok. `verificar_caminhos.py`: 0 handlers quebrados, nada novo além da linha de base. `verificar_duplicatas.py`: 0 divergências novas. `cmp calendario.html calendarios.html`: iguais.
- J68 no código do `main`: ❌❌❌ (título "Ótica Hauer — Vídeo", só referência e sem ocupação · "Identificar conteúdo" ainda aparece · botão ausente).
- J68 com a correção: ✅✅✅ (título com o conteúdo, ligação nativa, ocupação ok · cartão sem "Identificar conteúdo" · formulário preenchido, cliente vazio e com foco).
- Bateria completa: desktop 177/177 e `--movel` 177/177 (174 + 3 da J68). Sentinela RULES sem escrita negada.
- Não testado: "Só edição" (✂️) com ligação nativa (fica fora, só o título muda) e produção.

## Riscos/pendências
- Em produção, a ligação nativa depende de `calendarios_vinculos_controle/i28` com `pronto:true` (não conferido daqui). Sem ele, o envio funciona como hoje, só com o título novo.
- Na saída conjunta, cada cliente além da 2ª gravação do dia continua pedindo liberação da Amanda (regra vigente, mantida).
- Os 3 vídeos já criados (Clínica dos Olhos Hauer) não foram tocados. Corrigir exige escrita em produção, só com ok nominal do Chris.

## Próximo passo
CI verde → merge → conferir no ar (skill `get-publicacao-e-rollback`). Rollback = `git revert`.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
