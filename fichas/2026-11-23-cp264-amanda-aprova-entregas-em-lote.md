# cp264 — a Amanda aprova as entregas comuns de uma pessoa de uma vez

Pedido original (literal, Chris, 23/11): "simplificar para a Cecília e Amanda aprovar mais de uma coisa de uma vez por exemplo aprovar tudo
de uma semana inteira … site todo … sem gerar problemas em outras áreas … verificação após isso tem que ser perfeita completa".
Caixa de perguntas: "Aprovações em lote → Sim, começar".
Unidade: C4b (1ª de 3 do lote: entregas da Amanda → publicações da Cecília → agendamentos da Cecília) · Tipo: novo.

Mapa (15 filas uma por uma, 23/11) e volume real em 30 dias (export de 22/11, só leitura):
- **Amanda aprova entregas da equipe: 283 em 30 dias, até 33 num dia; 262 sem tipo especial** ← maior carga dela.
- Cecília registra agendamento ≈ 46/semana; confirma publicação ≈ 12/semana (o resto já é automático: CP248/CP262).
- Vídeos: 248 aprovações de qualidade (227 do Chris) — ficam um por um (regra vigente, abaixo).

Causa: a fila "Aprovações" (`renderDemandasAguardandoDetalhe` → `htmlFaixaAprovacao`) só tinha o "✔ Aprovar" de cada cartão.
A barra de seleção do Painel de Demandas tem prazo, aviso e exclusão — não aprova.

Árvore:
RAIZ: `demandas.status` concluida_aguardando_aprovacao → aprovada (pela Amanda/Chris)
├─ ESCRITORES: `aprovarDemanda` (transação que relê e compara `assinaturaEntregaI161`); faxina CP248/CP263 (servidor, outros tipos)
├─ LEITORES: Aprovações (faixas por pessoa), cartão "Demandas aguardando aprovação" (Central), badge da Gerência, Minhas Demandas de quem entregou
├─ HUMANOS: Amanda (aprova), Chris (aprova as de origem chris), quem entregou (recebe "✅ Aprovado" por e-mail, como no cartão)
├─ RULES: sem mudança (a mesma gravação do cartão)
├─ AUTOMAÇÕES: `sincronizarStatusDemandaCliente`, `sincronizarAvisosEsperaCp149`, agendamento aprovado — iguais, por item
├─ LEGADO: tipos especiais e caminhos documentais NÃO entram no lote (continuam um por um)
└─ EFEITO COLATERAL: nenhum fora da fila; o redesenho e o aviso acontecem uma vez só, no fim

Mudança (só `escritorio.html`):
- `entregaComumCp264(d,pessoa)`: a entrega que o cartão aprova direto — sem `tipoEspecial`, sem entrada CP150/I54 (CP112), providência CP140,
  exclusão I112, documento CP138/CP154 ou espera CP149; `podeConferirEntregaCp149` e `aprovacaoEhDe` verdadeiros.
- Na faixa de cada pessoa com 2 ou mais entregas comuns: "✔ Aprovar as N entregas de Fulano" (clique delegado no contêiner, sem global novo).
  Confirmação lista os títulos. O lote chama o MESMO `aprovarDemanda(id,{loteCp264:true})` item a item.
- "Só aprova o que foi lido": a faixa guarda a assinatura de cada entrega como foi desenhada; no clique, a que mudou no aparelho fica,
  e a transação de sempre recusa a que mudou só no servidor. Resumo: "N aprovadas; M ficaram na lista para abrir: …".
- `aprovarDemanda` em modo lote: recusa (sem abrir fluxo) o que não for comum, guarda o motivo da recusa e não redesenha por item.

O que NÃO muda: o botão de cada cartão, "Pedir pra refazer", tipos especiais, documentos, vídeos, calendários, rules, servidor.

Testes: J118 (Amanda, tela real) 7/7 — vermelha antes (sem botão, 2/4) → verde: 4 comuns lidas, 3 aprovadas, a que mudou durante a
confirmação fica com o texto novo, a especial e a única do Luís ficam, cartão da Central 6 → 3. Vizinhas J02/J54/J58/J110 + J118 = 14/14;
celular J118/J58 8/8. Bateria inteira no CI.

Regra vigente avisada ao Chris e DECIDIDA na caixa de perguntas (23/11): qualidade de vídeo, calendário que vai ao cliente (J85/CP238) e
conferência de 8 itens da Stokki → "Manter um por um". Agendamento da Cecília em lote com conferência única → "Sim" (unidade C4a, a seguir).
Risco residual: um e-mail "✅ Aprovado" por entrega (igual ao cartão; o limitador de e-mails já existe).
