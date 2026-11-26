# lz6b-aviso-cadastro-novo — pedido do site vira aviso ao Chris; finalizar/encaminhar serviço volta a gravar
Pedido (Chris, 26/11): "Central de vendas … tirar os erros dela" (LZ6); achado do levantamento: o aviso "🆕 Cadastro novo pelo site"
falhou 126 vezes.
Unidade: LZ6b · Tipo: erro
Caso real (export 25/11, só leitura): log_automacoes tem 126 "erro_verificacao cadastrosNovos" de 14/10 a 13/11 ("Avisos de serviço não
confirmados: 1" — e "2" nos dias com 2 pedidos abertos); os 3 pedidos avulsos do site (14/10, 26/10, 05/11) nunca ficaram "avisado" e
nenhuma demanda de aviso existe; a Amanda arquivou os 3 à mão. Nenhum pedido tem cicloServico: finalizar/reabrir/encaminhar também nunca
gravaram desde que a conferência foi criada (09/09).
Causa-raiz (reproduzida): a família do serviço (I18/I19) lê o pedido duas vezes — conferência no servidor e leitura da transação — e
compara JSON.stringify das duas. O servidor de produção não garante a mesma ordem de campos entre leituras (o export mostra ordens
diferentes por documento); o texto muda sem nada ter mudado → "O pedido mudou durante a conferência" / "O serviço mudou em outra aba".
No emulador a ordem é sempre igual, por isso a bateria nunca pegou. J131 inverte a ordem dos campos da leitura da transação (mesmo
conteúdo): código anterior VERMELHO com a mesma mensagem de produção; corrigido VERDE.
Árvore: RAIZ comparação de documentos em alterarEstadoServicoManual, relerClienteServicoI19, avisarUmServicoI19 (+ aviso legado) e
encaminharServicoCeciliaI19 · ESCRITORES leads_avulsos/leads_pessoa_fisica/leads_mensalista (avisado, cicloServico), demandas
(aviso ao Chris, encaminhamento à Cecília) · LEITORES Entrada da Central de Clientes, Minhas Demandas do Chris, motor (cadastrosNovos) ·
HUMANOS Chris (recebe o aviso), Amanda/Chris (finalizar, reabrir, encaminhar), Cecília (recebe o encaminhamento) · RULES sem mudança.
Mudança: as 9 comparações usam assinaturaDadosClienteI21 (já existia: chaves ordenadas, recursivo); o motor registra o motivo da 1ª
falha ("Motivo: <pedido>: <erro>"). As outras 14 comparações do arquivo comparam dados montados pelo próprio site (formulário, contexto,
folha) — não têm o problema.
O que NÃO muda: regras de quem pode, textos, rules, servidor, dados.
Testes: J131 nova 6/6 (contraprova: 2/6 no código anterior, casos 1–4 vermelhos); J130, J50, J08, J01 verdes; portão 1–3 verde.
Depois de publicar: o próximo pedido avulso do site vira aviso na Minhas Demandas do Chris no primeiro login da gestão.
