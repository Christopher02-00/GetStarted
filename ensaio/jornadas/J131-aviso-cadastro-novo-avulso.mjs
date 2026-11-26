// J131 — LZ6b (26/11/2026). Aviso "🆕 Cadastro novo pelo site" e o ciclo do pedido de serviço. Caso real (export 25/11): os 3 pedidos
// avulsos do site (14/10, 26/10 e 05/11) nunca geraram o aviso ao Chris; o motor registrou 126 "erro_verificacao cadastrosNovos"
// ("Avisos de serviço não confirmados: 1/2") entre 14/10 e 13/11, até a Amanda arquivar os pedidos à mão; nenhuma ação dessa família
// (aviso, finalizar/reabrir o serviço, encaminhar à Cecília) gravou em produção desde 09/09. Causa: a ação lê o pedido duas vezes
// (conferência e transação) e compara os dois textos campo a campo NA ORDEM EM QUE O SERVIDOR DEVOLVE; o servidor de produção não
// garante a mesma ordem de campos entre leituras (o export mostra ordens diferentes por documento), então "o pedido mudou" sempre.
// O emulador devolve sempre na mesma ordem; aqui a leitura da transação (documents:batchGet) volta com os campos em ordem invertida,
// mesmo conteúdo — como em produção. Esperado (contraprova vermelha no código anterior):
//  1. o pedido avulso novo vira aviso ao Chris e fica avisado, sem erro de verificação;
//  2. finalizar o serviço pela Entrada grava o ciclo (antes: "O serviço mudou em outra aba");
//  3. quando um aviso falha de verdade, o registro do motor diz o motivo (antes: só "não confirmados: 1").
import { entrarComo, foto } from '../lib/navegador.mjs';
export const id = 'J131';
export const nome = 'Pedido avulso do site vira aviso ao Chris mesmo com o servidor devolvendo os campos em outra ordem; falha diz o motivo';
const LEAD = 'j131lead', LEAD2 = 'j131lead2', RUIM = 'j131ruim';
const esperar = async (fn, ms) => { const fim = Date.now() + ms; while (Date.now() < fim) { const r = await fn(); if (r) return r; await new Promise(r => setTimeout(r, 1500)); } return null; };
const inverter = v => { if (Array.isArray(v)) return v.map(inverter); if (v && typeof v === 'object') { const o = {}; for (const k of Object.keys(v).reverse()) o[k] = inverter(v[k]); return o; } return v; };
const pedido = (id, extra = {}) => ({ nome: 'Prospect ' + id, whatsapp: '(41) 99999-0131', whatsappNormalizado: '5541999990131', instagram: '@' + id,
  segmento: 'Automotivo', canalOrigem: 'instagram', ideiaLivre: 'Gravação de 5 criativos por mês (J131)', estilosDetalhe: [{ estilo: 'tour', nome: 'Tour do espaço/local', qtd: 5 }],
  totalVideos: 5, descontoAplicado: 0, modificadoresCaptacao: {}, eventoAtivo: false, eventoNome: '', eventoLocais: [], eventoMomentos: [], eventoQtdVideos: null,
  eventoDrone: '', eventoFoco: [], referencias: [], pacotes: [], pacotesNomes: [], dataDesejada: '2026-12-10', urgencia: 'normal', observacoes: '',
  status: 'novo', statusGerencia: 'aguardando_validacao', cadastroTipo: 'avulso_solicitacao', origemLead: 'avulso', excluido: false, protocolo: id,
  criadoPorUid: 'visitante-j131', criadoEm: new Date(), ...extra });

export async function executar({ amb, seed, nav, erroGrave, registrar }) {
  const t0 = Date.now(), fim = (caso, ok, detalhe) => registrar({ jornada: id, caso, ok: !!ok, ms: Date.now() - t0, detalhe });
  const logs = async () => (await seed.listar('log_automacoes')).filter(l => l.alvo === 'cadastrosNovos' && l.tipo === 'erro_verificacao');
  const rodadas = async () => (await seed.listar('log_automacoes')).filter(l => l.tipo === 'motor_executado').length;
  const rodar = async (page, pessoa) => { const r0 = await rodadas(); await seed.set('sistema', 'motor_lock', { ultimaExecucao: 'liberado-pelo-ensaio', ultimaManutencaoDia: '2000-01-01' });
    await entrarComo(page, amb.url(), pessoa); return esperar(async () => (await rodadas()) > r0, 120000); };
  const { page, erros, fechar } = await nav.novaPagina();
  try {
    page.on('dialog', d => d.accept());
    await page.route('**/documents:batchGet*', async route => { const r = await route.fetch(); const txt = await r.text();
      let j; try { j = JSON.parse(txt); } catch { return route.fulfill({ response: r, body: txt }); }
      return route.fulfill({ response: r, body: JSON.stringify(inverter(j)) }); });
    await seed.set('leads_avulsos', LEAD, pedido(LEAD));
    const e0 = (await logs()).length;
    const rodou = await rodar(page, 'Amanda');
    const lead = await seed.get('leads_avulsos', LEAD) || {};
    const avisos = (await seed.listar('demandas')).filter(d => d.leadId === LEAD && d.etapaServicoI19 === 'aviso');
    const e1 = (await logs()).length;
    fim('1 pedido avulso novo vira aviso ao Chris e fica avisado (campos em outra ordem na transação)', rodou && lead.avisado === true && avisos.length === 1 && avisos[0].destinatario === 'Chris' && e1 === e0,
      `motor ${rodou ? 'rodou' : 'NÃO rodou'} · avisado ${lead.avisado === true} · avisos ${avisos.length} · erro_verificacao +${e1 - e0}${e1 > e0 ? ' · "' + String((await logs()).slice(-1)[0]?.detalhe || '').slice(0, 160) + '"' : ''}`);

    await seed.set('leads_avulsos', LEAD2, pedido(LEAD2, { avisado: true, avisadoEm: new Date().toISOString() }));
    await page.evaluate(id => window.alterarEstadoServicoManual('leads_avulsos', id, 'finalizar'), LEAD2).catch(() => {});
    await page.waitForTimeout(3000);
    const l2 = await seed.get('leads_avulsos', LEAD2) || {};
    const msgs = await page.evaluate(() => [...document.querySelectorAll('.toast,#toast,[class*="toast"]')].map(t => t.textContent).join(' | ')).catch(() => '');
    fim('2 finalizar o serviço pela Entrada grava o ciclo (campos em outra ordem na transação)', l2.cicloServico?.estado === 'encerrado' && l2.status === 'finalizado',
      `ciclo ${l2.cicloServico?.estado || '—'} · status ${l2.status}${/mudou/i.test(msgs) ? ' · aviso: ' + msgs.slice(0, 160) : ''}`);

    await seed.set('leads_avulsos', RUIM, pedido(RUIM, { avisoDemandaId: 'servico_i19_outro_registro' }));
    const e2 = (await logs()).length;
    await rodar(page, 'Amanda');
    const novos = (await logs()).slice(e2);
    const detalhe = String(novos.slice(-1)[0]?.detalhe || '');
    fim('3 aviso que falha de verdade deixa o motivo no registro do motor', novos.length >= 1 && /recibo de aviso aponta a outro registro/i.test(detalhe),
      `registros novos ${novos.length} · "${detalhe.slice(0, 200)}"`);
    await foto(page, 'J131-aviso-cadastro-novo');
    // só o fluxo desta jornada: outras jornadas da bateria deixam dados que o motor comenta no console (ex.: j121-livre)
    const graves = erros.filter(erroGrave).filter(e => /j131|aviso do servi[cç]o|pedidos recebidos|servico_i19|cadastro novo/i.test(e) && !/j131ruim/.test(e)); // a falha do caso 3 é proposital
    fim('4 sem erro grave no fluxo do aviso (além da falha proposital do caso 3)', !graves.length, graves[0] ? String(graves[0]).slice(0, 300) : 'nenhum');
  } catch (e) { await foto(page, 'J131-falha'); fim('Aviso de cadastro novo', false, String(e).replace(/\s+/g, ' ').slice(0, 300)); }
  finally { await fechar(); }
}
