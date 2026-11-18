# cp225-legenda-papeis-unificados — quem legenda salva a legenda em qualquer cliente; papéis num lugar só
Pedido original (literal): "'Missing or insufficient permissions' ao salvar legenda (caso da Amanda na Stokki, 18/11). Correção na raiz, para todos os clientes e papéis."
Unidade: U1 de 1 · Tipo: erro
Sintoma observado: a Amanda salva a primeira legenda de um vídeo da Stokki e recebe "Missing or insufficient permissions".
Reprodução: emulador, J79, vermelha no main:
- Amanda e Cecília são barradas na Stokki com 4 redes.
- A Cecília também é barrada em qualquer vídeo cujo `postagemId` ainda está vazio.
- O Chris passa.
Causa-raiz (duas):
1. `dH` (primeira legenda por plataforma da Stokki) só aceitava Z4/Z2/Z1. O outro ramo exige `operacaoId`, que a tela grava vazio. `dI` (correção da legenda pendente) só aceitava Z4/Z2.
2. Na transação da legenda, gravar `postagemId` no vídeo para a Cecília caía na regra grande do `videos_producao`, que estoura 1000 expressões. A Amanda e o Chris passavam por `ae()`.
Hipótese descartada: `be()` não era o que barrava a Amanda, porque ela já passava por `ae()`.
Árvore:
RAIZ: quem pode legendar (tela CP209 × rules dH/dI × vínculo do vídeo)
├─ ESCRITORES : salvarLegenda (escritorio.html)
├─ LEITORES   : fila de legendas, painel da Stokki, fila da Cecília
├─ HUMANOS    : Chris, Amanda, Cecília (Fernanda e Gabrielle saíram; barradas pela saída da equipe CP183)
├─ RULES      : postagens dH/dI; videos_producao (nova regra curta do postagemId)
├─ LEGADO     : vídeo sem ponteiro usa a confirmação manual (corredor V123, sem publicacaoStokki), sem mudança
└─ COLATERAL  : J25, J61, J66, J04, J06, J35, J19 verdes no computador; J25, J61 e J79 no celular
Mudança:
- `papeis-funcoes.json` é a fonte única (legendar, agendar, ativos).
- `scripts/papeis-cp225.mjs` gera o bloco das rules e a lista da tela, e confere a divergência no CI.
- `dH`/`dI` usam `papeisLegendarCp225`/`papeisAgendarCp225`.
- O `videos_producao` ganhou uma regra própria e curta para o `postagemId` vazio, a primeira da lista, com as condições baratas primeiro.
- O `permission-denied` na legenda mostra quem pode, guarda o texto e abre uma demanda com id fixo para o Chris.
O que NÃO muda: legendas já salvas, histórico, vínculos existentes e quem legenda na tela (mesma lista).
Testes:
- J79, 12 casos: Amanda, Cecília e Chris × Stokki com 4 redes, Stokki sem ponteiro e vídeo comum sem ponteiro. Mais a contraprova da Helo (editora), barrada com mensagem clara.
- Divergência: mudar só a tela faz o script falhar.
Risco residual:
- O tamanho compilado das rules só é medido no deploy.
- O caminho `permission-denied` da tela não é exercitado por jornada, porque nenhum papel da fila é negado depois da correção.
Publicação: as rules exigem o ok nominal do Chris (o merge publica pelo workflow).
