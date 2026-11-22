---
name: get-guardiao-operacao
description: Usar todo dia, antes de qualquer correção e depois de toda publicação no Site Get — lê os vigias (operação e liberação), acha o que travou sem dono, corrige o CAMINHO (não só o dado), transforma cada erro novo em regra do Raio-X + jornada, e impede a volta do mesmo erro. Protocolo do Programa Estabilidade (21/11/2026).
---

# Guardião da operação — nenhum item parado sem dono, nenhum erro duas vezes

Pedido do Chris (20/11): *"corrigir, verificar e prever os próximos erros… correção definitiva, aplicada… testes de uso real… para que nenhum erro aconteça mais"*.
Por que havia manutenção todo dia, por 7 meses (diagnóstico do Raio-X de 21/11):
1. **Estados sem saída.** Um item entrava num estado que ninguém podia mudar:
   - postagem `em_correcao` de vídeo excluído (CP244);
   - entrega do sistema esperando uma aprovação que ninguém podia dar (CP245, 143 presas);
   - mês "tudo aprovado" sem botão de liberar (CP238).
   Ninguém via, até alguém reclamar.
2. **Caminho novo sem fechar o antigo.** Cada correção abriu um caminho (I54, I165, CP112, CP123…) e deixou o anterior vivo, e telas diferentes liam estados diferentes.
3. **Detecção por pessoas.** O erro só aparecia quando a Amanda, a Cecília ou o cliente tropeçavam nele. Não havia vigia que dissesse "isto travou".
4. **Avisos que não chegam.** Só o Chris e a Helo têm o celular ligado aos avisos, e o e-mail está cortado (cota). O resto só vê o que travou quando abre o site.

## O ciclo (sempre nesta ordem)
1. **Ler os vigias:**
   - **Vigia da operação**: `.github/workflows/vigia-operacao.yml`, 08:41 BRT; regras em `.github/scripts/raio-x-operacao.mjs`;
   - **Vigia da liberação**: `vigia-liberacao.yml`, 09:23 e 16:47;
   - **Checagem prévia dos calendários**: `prevoo-calendarios.yml`, 07:31 BRT. Lista, cliente a cliente, se o Chris consegue iniciar, editar e enviar o mês corrente e o seguinte, e quem resolve quando não. Script: `.github/scripts/prevoo-calendarios.mjs`. Vermelho = o Chris travaria no editor; amarelo = esperando alguém (normalmente a preparação da Amanda).
   - **Antes de um mês de produção**, rode a `J104` com dados reais, nos clientes com histórico de problema: `ENSAIO_DADOS_REAIS=<exportação> node ensaio/rodar.mjs --jornadas J104`. Ela cobre preparação → criação → liberação → cliente → filmmaker, com `ENSAIO_MES` e `ENSAIO_CLIENTES` opcionais.
   Um run vermelho é prioridade antes de qualquer pedido novo. No local:
   `node .github/scripts/raio-x-operacao.mjs --exportacao <pasta da exportação> --detalhe` (exportação pelo workflow só-leitura; nunca commitar).
2. **Para cada vermelho, achar o caminho no código** (quem escreveu aquele estado, por que nada tira dele). A pergunta é sempre: *qual estado não tem saída, e quem deveria dar a saída?*
3. **Corrigir o caminho, nunca só o dado.**
   - A correção vale para todo caminho que leva ao estado. Prefira o servidor (gatilho idempotente com marca `…CpNNN` e reversão), como CP214, CP244 e CP245.
   - Dado antigo só com ok nominal do Chris, e depois da correção do caminho.
   - Até o ok, o item entra em `.github/raio-x-conhecidos.json` (amarelo "conhecido") com o motivo.
4. **Provar** (skill get-prova-de-jornada): jornada nova com o caso real, **vermelha sem a correção e verde com ela**, mais as vizinhas.
5. **Prevenir:** todo erro novo que o Raio-X não pegou vira **regra nova** em `raio-x-operacao.mjs`, na família certa (A a G abaixo), testada na exportação real: nenhum falso positivo (como o E2 das peças programadas da CP202).
6. **Publicar e conferir** (get-publicacao-e-rollback) e **rodar o vigia de novo** (workflow_dispatch). Fechar só com o vigia sem o item.

## Famílias de regras do Raio-X (o que NUNCA pode acontecer)
- **A · demanda**:
  - aberta para pessoa desligada (A1);
  - edição para quem não edita (A2);
  - pendente vencida (A4);
  - entrega esperando aprovação (A5);
  - entrega sem ninguém para aprovar (A6).
- **B · pedido do cliente**:
  - sem demanda (B1);
  - para pessoa desligada (B2);
  - mês reaberto sem nada pendente (B3);
  - correção esperando a Amanda (B4).
- **C · vídeo**:
  - sem editor (C1);
  - com quem não edita (C2);
  - aprovado sem postagem (C3);
  - ponteiro trocado (C4).
- **D · postagem**:
  - viva com vídeo excluído (D1);
  - agendada que passou sem confirmação (D2);
  - esperando legenda (D3);
  - esperando agendamento (D4).
- **E · calendário**:
  - conteúdo sem identidade ou com identidade repetida (E1);
  - cópia do cliente diferente do liberado (E2).
- **F · entrada do cliente**:
  - aviso que devia virar demanda e não virou (F1);
  - aviso para pessoa desligada (F2).
- **G · avisos**:
  - pendente para pessoa desligada (G1);
  - pessoa sem celular ligado aos avisos (G2).

## Regras de desenho que evitam erro (aplicar em toda mudança)
1. **Todo estado de espera tem dono e saída.** Se um estado novo espera alguém, diga quem (`aprovacaoEhDe`, destinatário, revisor explícito) e qual botão tira dele. Sem dono possível, o servidor fecha sozinho com nota (CP245).
2. **Excluir fecha os dependentes, recuperar reabre.** Vídeo → postagem (CP244), postagem → demandas do ciclo (`demandasCicloTxI165`), pedido → demanda (CP143).
3. **Uma regra, um lugar.** Lista de pessoas e papéis em uma fonte (`papeis-funcoes.json`, `EDITORES_*`), estado do mês em uma função. Ao abrir um caminho novo, feche ou redirecione o antigo no mesmo PR.
4. **A tela diz a verdade do servidor.** Mensagem de "pode/não pode" vem da mesma função que decide (CP239). Nada de texto que promete um botão.
5. **Pessoa que sai ou muda de papel:** troque as listas, não os dados (CP242/CP243). O histórico fica, e o Raio-X (A1, A2, C2, F2, G1) prova que nada novo vai para ela.
6. **Regra que ajuda, não atrapalha.** Antes de criar uma trava, mostre a saída na própria tela. Se a trava não tem saída para o papel que a vê, ela é um defeito.

## O que só o Chris autoriza (inalterado)
`firestore.rules`, deploy de `functions-get/` (ok geral dado em 20/11), qualquer escrita em dados de produção (inclusive fechar legado do Raio-X), coleções financeiras e `negocios`, identidade de clientes, reativar pessoas, exclusão física.
