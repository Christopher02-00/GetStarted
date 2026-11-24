// J127 — CP272 (24/11/2026, ok nominal do Chris: "Sim, fechar e prevenir"). Caso real: 8 pedidos "não precisa mais agendar" (Bluefit 6,
// Fedalto 1, Vitalle 1, de 09 a 17/11) pendentes na tela de aprovar vídeos da Amanda, com as postagens já arquivadas sem postagem — a
// decisão recusa ("O conteúdo e a diretriz precisam estar ativos"), então ficavam para sempre. Esperado:
//  1. a faxina do servidor fecha, com nota e estado anterior, o pedido de postagem arquivada e o de postagem que não existe mais;
//  2. não toca o pedido de postagem ainda na operação nem o já decidido;
//  3. repetir não muda nada (idempotente);
//  4. na tela de aprovar vídeos, a Amanda vê só o pedido que ainda dá para decidir.
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { RAIZ } from '../lib/emulador.mjs';
import { adminDb } from '../lib/chegada.mjs';
import { entrarComo, foto, entrarGerencia } from '../lib/navegador.mjs';
export const id = 'J127';
export const nome = 'Pedido de mudança à Amanda com a postagem fora da operação fecha sozinho (faxina) e sai da tela dela';

const pedido = (postagemId, estado = 'pendente') => ({ schema: 1, estado, postagemId, cliente: 'bluefit', motivo: 'Ensaio J127: não precisa mais agendar',
  proposta: { acao: 'cancelar', rede: 'geral', data: '', hora: '', chave: 'cancelar|geral' }, em: new Date(Date.now() - 7 * 864e5).toISOString(),
  autoria: { uid: 'ensaio', papel: 'Cecília', atorReal: 'Cecília' }, operacaoId: 'j127-' + postagemId });
const SOL = { arquivada: 'j127-sol-arquivada', sumiu: 'j127-sol-sumiu', ativa: 'j127-sol-ativa', decidida: 'j127-sol-decidida' };

export async function executar({ amb, seed, nav, erroGrave, registrar }) {
  const t0 = Date.now(), fim = (caso, ok, detalhe) => registrar({ jornada: id, caso, ok: !!ok, ms: Date.now() - t0, detalhe });
  const base = { cliente: 'bluefit', clienteNome: 'Bluefit', excluido: false, criadoEm: new Date() };
  await seed.set('postagens', 'j127-post-arquivada', { ...base, titulo: 'Bluefit — J127 arquivada', status: 'arquivada_sem_postagem', arquivadaPor: 'Cecília' });
  await seed.set('postagens', 'j127-post-ativa', { ...base, titulo: 'Bluefit — J127 agendada', status: 'agendado', dataAgendada: '2099-01-10', horaAgendada: '10:00' });
  await seed.set('programacao_solicitacoes_i165', SOL.arquivada, pedido('j127-post-arquivada'));
  await seed.set('programacao_solicitacoes_i165', SOL.sumiu, pedido('j127-post-que-nao-existe'));
  await seed.set('programacao_solicitacoes_i165', SOL.ativa, pedido('j127-post-ativa'));
  await seed.set('programacao_solicitacoes_i165', SOL.decidida, pedido('j127-post-arquivada', 'negada'));
  const db = adminDb(amb), ler = async () => Object.fromEntries(await Promise.all(Object.entries(SOL).map(async ([k, v]) => [k, (await db.doc('programacao_solicitacoes_i165/' + v).get()).data() || {}])));
  try {
    const fx = await import(pathToFileURL(path.join(RAIZ, 'functions-get/faxina-diaria-cp248.mjs')).href);
    const r1 = await fx.executarFaxinaCp248(db, { gravarRelatorio: false });
    const s1 = await ler();
    fim('1 a faxina fecha o pedido de postagem arquivada e o de postagem que não existe, com nota e estado anterior',
      s1.arquivada.estado === 'encerrada_sem_decisao' && s1.arquivada.encerramentoCp272?.estadoAnterior === 'pendente' && /arquivada_sem_postagem/.test(s1.arquivada.encerramentoCp272?.situacaoPostagem || '') &&
      s1.sumiu.estado === 'encerrada_sem_decisao' && s1.sumiu.encerramentoCp272?.situacaoPostagem === 'inexistente',
      `arquivada: ${s1.arquivada.estado} (${s1.arquivada.encerramentoCp272?.situacaoPostagem || '-'}) · sem postagem: ${s1.sumiu.estado} · relatório: ${(r1.solicitacoesOrfasCp272 || []).filter(x => x.startsWith('j127')).length} desta jornada`);
    fim('2 não toca o pedido de postagem ainda na operação nem o já decidido', s1.ativa.estado === 'pendente' && !s1.ativa.encerramentoCp272 && s1.decidida.estado === 'negada' && !s1.decidida.encerramentoCp272,
      `ativa: ${s1.ativa.estado} · decidida: ${s1.decidida.estado}`);
    await fx.executarFaxinaCp248(db, { gravarRelatorio: false });
    const s2 = await ler();
    fim('3 repetir não muda nada', JSON.stringify(s2) === JSON.stringify(s1), JSON.stringify(Object.fromEntries(Object.entries(s2).map(([k, v]) => [k, v.estado]))));
  } catch (e) { fim('faxina', false, String(e).replace(/\s+/g, ' ').slice(0, 300)); }
  // 4. tela da Amanda (Aprovar vídeos): "Mudanças de postagem para conferir" lista só o que dá para decidir
  const { page, erros, fechar } = await nav.novaPagina();
  try {
    await entrarComo(page, amb.url(), 'Amanda'); await page.waitForTimeout(2500);
    await entrarGerencia(page); await page.evaluate(() => navegarGerenciaSub('aprovarVideos'));
    await page.waitForFunction(() => !!document.querySelector('[data-pedidos-excecao-i165]'), null, { timeout: 30000 });
    const lista = await page.evaluate(() => { const s = document.querySelector('[data-pedidos-excecao-i165]'); return { titulo: s?.querySelector('h3')?.innerText || '', ids: [...(s?.querySelectorAll('[data-pedido-excecao-i165]') || [])].map(b => b.dataset.pedidoExcecaoI165) }; });
    await foto(page, 'J127-amanda-pedidos');
    fim('4 a Amanda vê só o pedido que ainda dá para decidir', lista.ids.includes(SOL.ativa) && !lista.ids.includes(SOL.arquivada) && !lista.ids.includes(SOL.sumiu),
      `${lista.titulo} · ${lista.ids.filter(x => x.startsWith('j127')).join(', ') || 'nenhum desta jornada'}`);
    const graves = erros.filter(erroGrave);
    fim('5 sem erro grave no console', !graves.length, graves[0] || 'nenhum');
  } catch (e) { await foto(page, 'J127-falha'); fim('tela da Amanda', false, String(e).replace(/\s+/g, ' ').slice(0, 300)); }
  finally { await fechar(); }
}
