# rules-tamanho-remove-ajuste-antigo — rules voltam abaixo de 256 KB compilados: sai a validação antiga do pedido de ajuste
Contexto: o merge do #100 (CP199) criou o ruleset, mas o Firebase recusou o release: "Total size of compiled executables must be smaller than 256000 bytes (actual: 256241 bytes)". As rules antigas continuaram no ar, e nada quebrou porque o front não depende do CP199.
Causa: o arquivo já estava no limite, e as 2 comparações do CP199 passaram 241 bytes.
Mudança (`firestore.rules`): removidas as funções `dd()`, `db()` e `dP()`, que validavam o pedido de ajuste do cliente gravado direto pelo navegador (calendário + aviso `ajuste_calendario`). Desde 10/11 (#89, CP193), esse pedido é gravado pelo servidor:
- o ramo do cliente em `calendarios` fica só com `hasOnly(['items','comments','updatedAt'])&&clienteNaoApagaCp199()`;
- a criação de aviso pelo cliente recusa `tipo:'ajuste_calendario'`, que só o servidor cria.
Economia: 2.664 bytes de fonte (124.124 → 121.460), compilado bem abaixo do limite.
Risco: página antiga em cache de um cliente (anterior ao #89) que tente pedir ajuste recebe recusa, e o próprio front mostra "Não consegui confirmar o ajuste…". Recarregar resolve.
Testes: J05, J06, J20, J34, J35, J38, J42 (pedido de ajuste pelo servidor), J48 e J51 verdes; o sentinela das rules não viu nenhuma escrita legítima negada. Portão completo no CI.
