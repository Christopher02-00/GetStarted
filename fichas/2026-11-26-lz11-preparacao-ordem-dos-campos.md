# lz11-preparacao-ordem-dos-campos — comparações da Preparação no servidor sem depender da ordem dos campos
Pedido (Chris, 26/11): "eu dou ok e confirmo que pode fazer tudo" — item "corrigir as comparações da Preparação no servidor" (ok para
publicar Functions).
Unidade: LZ11 · Tipo: erro (prevenção; mesma classe da LZ6b)
Achado (auditoria só leitura, 26/11): a Preparação compara dados por JSON.stringify na ordem em que os campos chegam — informação do
cliente (mesmaInfoClienteI164: "As informações do cliente mudaram…"), ficha da Organização das datas (conferirVinculoAgendaI167 /
projetarFontesAgendaI167: "As datas ou o responsável mudaram…" e "desatualizada"), atribuição histórica (atribuicaoAnteriorPreservadaR81 e
validação de ausências), etapa concluída/fixa, origem legada, adoção de vínculo, confirmação do documento único e o rótulo da versão
liberada (gs-planejamento-social-i155). Um literal montado pelo código comparado com um mapa lido do servidor, ou duas leituras
diferentes, acusam "mudou" sem nada ter mudado. Produção hoje: 0 vínculos da Organização e 36 infoCliente — sem sintoma registrado.
Mudança: cada módulo ganha `jsonOrdenadoLz11` (chaves ordenadas, recursivo; Timestamp intacto) e as 11 comparações passam a usá-lo
(servidor functions-get/central/lib + central-preparacao-validacao-r80; as 3 cópias do navegador continuam idênticas).
O que NÃO muda: regras de negócio, mensagens, rules, dados; mudança real continua detectada.
Testes: J135 nova chama as funções reais com o mesmo conteúdo em ordem invertida — código anterior: "mudou" nos 3 casos; corrigido:
igual, e mudança real detectada (3/3). J06, J104, J105, J106, J107, J14, J27, J36, J52, J53, J60, J65, J84, J89 + J49/J49b: verdes;
duplicatas: 0 divergência nova. Publicação: Functions (modo publicar) depois do merge, junto com a LZ10.
