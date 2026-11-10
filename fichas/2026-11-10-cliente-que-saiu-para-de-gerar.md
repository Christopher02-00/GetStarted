# cliente-que-saiu-para-de-gerar — cliente encerrado não gera kit, demanda nem aprovação tácita; pendências viram 1 demanda
Pedido original (literal): "…verificação completa no quesito de entrada dos clientes e saída para o sistema portal etc…"
Unidade: V8 da auditoria do percurso (10/11) · Tipo: erro
Decisão do Chris (10/11, no chat): "Parar e avisar". O sistema para kits, demandas e avisos automáticos do cliente encerrado e manda 1 aviso para Amanda/Cecília listando o que cancelar. Nada é apagado sozinho.
Sintoma: o cliente sai com uma gravação marcada e uma postagem na fila. O filmmaker e a Cecília recebem o kit de véspera, a Cecília ganha "📲 Confirmar publicação" do encerrado, e a aprovação tácita tenta aprovar todo dia.
Reprodução: emulador. A J39 deu vermelho no código antigo ("Confirmar publicação: 1 · pendências para: ninguém").
Causa-raiz: a saída (`salvarSaidaClienteCentral`) não toca `agendamentos`/`postagens`, e as rotinas do motor não olham se o cliente está ativo:
- `enviarKitsGravacaoAmanha`;
- `verificarPostagensEsquecidas`;
- `confirmarAprovacoesTacitas`.
Árvore:
RAIZ: clientes_config.clienteInativo / saída efetiva (clienteInativoEfetivo)
├─ LEITORES   : motor da gerência (kits, postagens esquecidas, aprovação tácita)
├─ ESCRITORES : demandas (nova `saida_pendencias_<slug>_<hash>_<ce|am>`, id determinístico pelo conjunto de pendências)
├─ HUMANOS    : Cecília e Amanda (cancelam ou arquivam), filmmaker (deixa de receber o kit)
├─ RULES      : sem mudança (mesmas escritas de demanda do motor)
└─ COLATERAL  : as Functions já recusavam agir no cliente inativo, e isso não muda
Mudança:
- Funções locais `clienteSaiuMotorAud` (cache por rodada; a config que não pode ser lida mantém o comportamento antigo) e `avisarPendenciasClienteQueSaiuAud`.
- O kit pula o cliente que saiu.
- A conferência de postagens pula a postagem dele e junta as gravações futuras dele numa demanda única por pessoa (Cecília e Amanda).
- A aprovação tácita pula o cliente que saiu.
O que NÃO muda: a saída em si (transação financeira e de acessos); nada é cancelado ou apagado sozinho.
Testes: J39 (nova, vermelha → verde, 2 rodadas sem repetir) + portão completo desktop e --movel.
Risco residual: quando o mesmo conjunto de pendências muda (uma é cancelada e sobra outra), nasce uma demanda nova com a lista atual.
