// J23 — Resumo por e-mail cortado (decisão do Chris, 09/11/2026): a fila antiga não vira e-mail.
// EmailJS dublê que aceita e conta. Fila com avisos pendentes para Amanda e Helo; motor do Chris roda.
// Esperado: nenhuma tentativa de envio de resumo; a fila fica como estava (nada marcado como enviado).
import { entrarComo, foto } from '../lib/navegador.mjs';
export const id = 'J23';
export const nome = 'E-mail: resumo diário desligado não envia a fila';
const esperar = async (fn, ms) => { const f = Date.now() + ms; while (Date.now() < f) { const r = await fn(); if (r) return r; await new Promise(r => setTimeout(r, 1500)); } return null; };

export async function executar({ amb, seed, nav, erroGrave, registrar }) {
  for (const p of ['Amanda', 'Helo']) {
    await seed.set('emails_equipe', p, { email: `j23-${p.toLowerCase()}@ensaio.invalid`, pessoa: p });
    await seed.set('fila_emails', 'j23-' + p, { destinatario: p, tipo: 'prazo_hoje', titulo: 'Ensaio J23 aviso para ' + p, itemId: 'j23-' + p, colecao: 'demandas', enviado: false, criadoEm: new Date().toISOString() });
  }
  await seed.set('sistema', 'motor_lock', { ultimaExecucao: 'liberado-pelo-ensaio', ultimaManutencaoDia: '2000-01-01' });
  const motorAntes = (await seed.listar('log_automacoes')).filter(l => l.tipo === 'motor_executado').length;
  const { page, erros, fechar } = await nav.novaPagina(); const t0 = Date.now();
  try {
    await page.addInitScript(() => {
      window.__emailTentativas = [];
      Object.defineProperty(window, 'emailjs', { configurable: true, get: () => ({ init() {}, send: (s, t, d) => { window.__emailTentativas.push(d.tipo_aviso + ':' + d.to_name); return Promise.resolve({ status: 200 }); } }), set() {} });
    });
    await entrarComo(page, amb.url(), 'Chris');
    await esperar(async () => (await seed.listar('log_automacoes')).filter(l => l.tipo === 'motor_executado').length > motorAntes, 120000);
    await page.waitForTimeout(2000);
    const resumos = (await page.evaluate(() => window.__emailTentativas)).filter(t => t.startsWith('digest:'));
    const fila = (await seed.listar('fila_emails')).filter(f => String(f.id).startsWith('j23-'));
    const intacta = fila.length === 2 && fila.every(f => f.enviado === false);
    const graves = erros.filter(erroGrave);
    await foto(page, 'J23-chris');
    registrar({ jornada: id, caso: 'Motor com fila de resumo pendente', ok: !resumos.length && intacta && !graves.length, ms: Date.now() - t0,
      detalhe: `resumos enviados: ${resumos.length} [${resumos.join(', ')}] · fila intacta: ${intacta}` + (graves.length ? ' | ' + graves[0] : '') });
  } catch (e) { await foto(page, 'J23-falha'); registrar({ jornada: id, caso: 'Motor com fila de resumo pendente', ok: false, ms: Date.now() - t0, detalhe: String(e).slice(0, 220) }); }
  finally { await fechar(); }
}
