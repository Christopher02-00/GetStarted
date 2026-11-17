# cp217-adiar-saida-efetiva — adiar uma saída já efetiva sem cobrança nova
Pedido original (Chris, 16/11, essencial): Fior Restaurante teve a saída registrada (avisou 10/10/2026, sai 16/11/2026, último mês 2026-10, motivo "outro", protocolo `saida_fior-restaurante_2026-11-16`). Depois decidiram continuar até as últimas postagens (até 30/11). Como a data é hoje, a saída ficou efetiva e as postagens pendentes sumiram da fila da Cecília. A tela só oferece "Reativar cliente", que pede valor e primeira competência = cobrança nova. Precisa: mudar a data de uma saída efetiva mantendo a mesma última competência (2026-10), sem mensalidade nova, sem identidade nova, sem apagar nada, com quem/quando, e a fila voltar a mostrar os posts até a nova data.
Unidade: B (CP217) · Tipo: novo (caminho que não existia) + erro operacional (fila some)
Sintoma: saída efetiva → `clientes_config.clienteInativo`, `clientes_extras.excluido`, contrato `encerrado`, acesso/token `ativo:false`; arquivo só tem reativação (abre vigência nova e pede valor/competência). O editor de saída (`htmlSaidaClienteCentral`) só abre para cliente ativo; "Cancelar saída programada" só para data futura.
Reprodução: J72 no emulador, estado igual ao de uma saída imediata gravada por `salvarSaidaClienteCentral` (data = hoje).
Causa-raiz: não existe transição "efetiva → programada com outra data". `saidaClienteJaEfetiva` (data ≤ hoje) e `clienteInativoEfetivo` são as únicas fontes que todos os leitores usam.

Árvore:
RAIZ: `clientes_encerrados/{saida}.dataSaida/statusSaida` + `saidaProgramadaPara`/`clienteInativo` em config/extras/contrato/acesso
├─ ESCRITORES: salvarSaidaClienteCentral, efetivarSaidasProgramadas (motor), cancelarProgramacaoSaidaCentral (cancelar/reativar), NOVO adiarSaidaEfetivaCentralCp217
├─ LEITORES: Central/Arquivo (ativos, saídas programadas, arquivados), castas (`projetarCastasI21` + `castas_operacionais` da equipe), clientesForaDoConteudo, motor (kit, aprovação tácita, pendências de quem saiu), fila da Cecília, Portal (acesso/token `ativo`, `ativoAte`)
├─ PAPÉIS: Amanda/Chris (ação, só gerência no DOM do Arquivo); Cecília (fila); cliente (Portal)
├─ RULES: clientes_encerrados/config/contrato/extras/acesso/token — mesmas operações e campos que a reativação/saída já gravam (update por gerência). Sem mudança de rules.
├─ AUTOMAÇÕES: na nova data o motor efetiva de novo (statusSaida programada + data ≤ hoje) com a MESMA competência final
├─ LEGADO: saída sem `ultimaCompetenciaPagamento` não pode adiar (continua FINANCEIRO PENDENTE); alias/fusão não pode; outro `saidaAtivaId` bloqueia
└─ COLATERAL: cliente volta para "ativos" com selo "SAÍDA EM dd/mm"; `pagamentos_mensais` intocado (mês cancelado pela saída continua cancelado)

Mudança: `escritorio.html` — função interna `adiarSaidaEfetivaCentralCp217` (ao lado de `cancelarProgramacaoSaidaCentral`), bloco "Adiar a saída" no cartão do Arquivo (`htmlArquivado`) e listener no render (sem `window.*` novo). Uma transação: saída (mesmo id) → `dataSaida` nova, `statusSaida:'programada'`, `adiamentosSaida[]` com de/para/competência/motivo/por/em/estado e efetivação anteriores; config/extras/cadastro/lead/contrato voltam ao estado de saída programada; acesso canônico + token dele (e Stories se o cliente tinha) voltam ativos até a nova data. Confere na transação: saída ainda efetiva, mesmo slug, mesma competência final no registro e no contrato, ponteiro `saidaAtivaId`. Depois: recibo, limpar caches, republicar castas.
Por que esta: é o inverso exato da efetivação, sem tocar financeiro. Reativação abriria ciclo novo (proibido aqui); reabrir o editor de saída recriaria `fichaSnapshot` e reanalisaria pagamentos.
O que NÃO muda: mensalidades, vigências, valor, contrato (só status/data), onboarding, rules, Functions. Nada é apagado.
Testes: J72 (Amanda adia no Arquivo; Cecília antes/depois; contrato, vigências, mensalidades, nº de registros de saída, Portal); bateria inteira desktop e `--movel`.
Hash antes: escritorio.html 64a6a9e22de003c33659a3e281b0a6768e2d52c4.
Risco residual: onboarding encerrado pela efetivação não é reaberto (só aparência na Central). Outros aliases do Portal continuam desligados (só a credencial canônica volta).
Regra vigente avisada: AGENTS "saída operacional e competência financeira final são um único compromisso" — mantido: a competência final é a mesma; só a data operacional muda.
