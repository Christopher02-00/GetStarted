// J111 — L1-d (22/11/2026, varredura de acúmulo, pedido do Chris: "dados antigos … que só pesam o sistema"). A Saúde das Automações
// (Gerência → Relatórios) lia do servidor TODOS os registros de log_automacoes (15.646, 3,4 MB nos dados reais) a cada abertura para mostrar
// janelas de 24 h e 7 dias. Esperado: a tela pede ao servidor só os últimos 30 dias (consulta com filtro) e continua mostrando a falha
// recente e a última rodada do motor; o registro de 100 dias atrás não é lido.
import { entrarComo, foto, entrarGerencia } from '../lib/navegador.mjs';
export const id = 'J111';
export const nome = 'Saúde das Automações lê só os últimos 30 dias do log (não os 15 mil registros)';

function alvosDoCorpo(corpo) {
  const out = [];
  for (const par of String(corpo || '').split('&')) {
    const i = par.indexOf('___data__='); if (i < 0) continue;
    let j; try { j = JSON.parse(decodeURIComponent(par.slice(i + 10).replace(/\+/g, ' '))); } catch { continue; }
    const sq = j?.addTarget?.query?.structuredQuery; if (sq) out.push({ colecao: sq.from?.[0]?.collectionId || '', filtro: !!sq.where });
  }
  return out;
}

export async function executar({ amb, seed, nav, erroGrave, registrar }) {
  const t0 = Date.now(), dia = 24 * 3600 * 1000;
  await seed.set('log_automacoes', 'j111-antigo', { tipo: 'email_FALHOU', alvo: 'J111', detalhe: 'J111 falha antiga (100 dias)', executadoEm: new Date(Date.now() - 100 * dia), disparadoPor: 'sistema' });
  await seed.set('log_automacoes', 'j111-recente', { tipo: 'email_FALHOU', alvo: 'J111', detalhe: 'J111 falha recente (2 dias)', executadoEm: new Date(Date.now() - 2 * dia), disparadoPor: 'sistema' });
  await seed.set('log_automacoes', 'j111-motor', { tipo: 'motor_executado', alvo: 'J111', detalhe: 'J111 rodada do motor', executadoEm: new Date(Date.now() - 3600 * 1000), disparadoPor: 'sistema' });
  const { page, erros, fechar } = await nav.novaPagina();
  try {
    page.on('dialog', d => d.accept());
    let contando = false; const alvos = [];
    page.on('request', r => { if (contando && r.method() === 'POST' && /\/Listen\/channel/.test(r.url())) alvos.push(...alvosDoCorpo(r.postData())); });
    await entrarComo(page, amb.url(), 'Chris'); await page.waitForTimeout(3000);
    await entrarGerencia(page);
    contando = true;
    await page.evaluate(() => window.setGerenciaSub('saudeAutomacoes', document.querySelector('.subtab[data-sub="saudeAutomacoes"]')));
    await page.waitForFunction(() => /Saúde das Automações/.test(document.getElementById('gerenciaSaudeAutomacoes')?.innerText || '') && !/Lendo o log/.test(document.getElementById('gerenciaSaudeAutomacoes')?.innerText || ''), null, { timeout: 30000 });
    await page.waitForTimeout(1500); contando = false;
    const tela = await page.evaluate(() => { const c = document.getElementById('gerenciaSaudeAutomacoes'); return { txt: c.innerText, html: c.innerHTML }; });
    const doLog = alvos.filter(a => a.colecao === 'log_automacoes'), inteiras = doLog.filter(a => !a.filtro).length;
    const recente = tela.html.includes('J111 falha recente'), antiga = tela.html.includes('J111 falha antiga'), motorOk = !/Desde a última rodada/.test(tela.txt) || /\b[01]h\b/.test(tela.txt);
    const graves = erros.filter(erroGrave);
    await foto(page, 'J111-saude');
    registrar({ jornada: id, caso: '1 a tela pede ao servidor só a janela (nenhuma leitura do log inteiro)', ok: doLog.length >= 1 && inteiras === 0, ms: Date.now() - t0,
      detalhe: `${doLog.length} consulta(s) ao log · ${inteiras} do log inteiro` });
    registrar({ jornada: id, caso: '2 continua mostrando a falha recente e a última rodada; o registro de 100 dias não é lido', ok: recente && !antiga && motorOk && !graves.length, ms: Date.now() - t0,
      detalhe: `falha recente ${recente ? 'na tela' : 'FALTANDO'} · falha antiga ${antiga ? 'AINDA LIDA' : 'fora'} · última rodada ${motorOk ? 'ok' : 'NÃO MOSTRA'}${graves.length ? ' · erro: ' + graves[0] : ''}` });
  } catch (e) { await foto(page, 'J111-falha'); registrar({ jornada: id, caso: 'Saúde lê só a janela', ok: false, ms: Date.now() - t0, detalhe: String(e).replace(/\s+/g, ' ').slice(0, 300) }); }
  finally { await fechar(); }
  for (const k of ['j111-antigo', 'j111-recente', 'j111-motor']) { try { await seed.del?.('log_automacoes', k); } catch {} }
}
