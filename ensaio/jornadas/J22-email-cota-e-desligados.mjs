// J22 — E-mail: cota esgotada não vira tentativa a cada envio, e pessoa desligada não recebe resumo (backlog P39).
// O EmailJS é trocado por um dublê que responde "Monthly request quota exceeded" (o erro real desde setembro).
// Fila: avisos pendentes para Amanda, Helo e Gabrielle (desligada). Motor do Chris roda a manutenção.
// Esperado: nenhuma tentativa para a Gabrielle; no máximo 1 tentativa no total; 1 aviso email_cota_esgotada.
import { entrarComo, foto } from '../lib/navegador.mjs';
export const id = 'J22';
export const nome = 'E-mail: para na cota esgotada e não manda para desligada';
const hoje = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
const esperar = async (fn, ms) => { const f = Date.now() + ms; while (Date.now() < f) { const r = await fn(); if (r) return r; await new Promise(r => setTimeout(r, 1500)); } return null; };

export async function executar({ amb, seed, nav, erroGrave, registrar }) {
  for (const p of ['Amanda', 'Helo', 'Gabrielle']) {
    await seed.set('emails_equipe', p, { email: `j22-${p.toLowerCase()}@ensaio.invalid`, pessoa: p });
    await seed.set('fila_emails', 'j22-' + p, { destinatario: p, tipo: 'demanda', titulo: 'Ensaio J22 aviso para ' + p, itemId: 'j22-' + p, colecao: 'demandas', enviado: false, criadoEm: new Date().toISOString() });
  }
  await seed.set('sistema', 'motor_lock', { ultimaExecucao: 'liberado-pelo-ensaio', ultimaManutencaoDia: '2000-01-01' });
  const conta = async tipo => (await seed.listar('log_automacoes')).filter(l => l.tipo === tipo).length;
  const antes = { falhou: await conta('email_FALHOU'), cota: await conta('email_cota_esgotada'), motor: await conta('motor_executado') };
  const { page, erros, fechar } = await nav.novaPagina(); const t0 = Date.now();
  try {
    await page.addInitScript(() => {
      window.__emailTentativas = [];
      Object.defineProperty(window, 'emailjs', { configurable: true, get: () => ({ init() {}, send: (s, t, dados) => { window.__emailTentativas.push(dados.to_name); return Promise.reject({ status: 426, text: 'Monthly request quota exceeded' }); } }), set() {} });
    });
    await entrarComo(page, amb.url(), 'Chris');
    await esperar(async () => (await conta('motor_executado')) > antes.motor, 120000);
    await page.waitForTimeout(2000);
    const tentativas = await page.evaluate(() => window.__emailTentativas);
    const falhou = (await conta('email_FALHOU')) - antes.falhou, cota = (await conta('email_cota_esgotada')) - antes.cota;
    const marca = await seed.get('sistema', 'email_cota');
    const graves = erros.filter(erroGrave);
    await foto(page, 'J22-chris');
    registrar({ jornada: id, caso: 'Motor com cota esgotada e fila com desligada', ms: Date.now() - t0,
      ok: !tentativas.includes('Gabrielle') && tentativas.length <= 1 && cota === 1 && marca?.dia === hoje() && !graves.length,
      detalhe: `tentativas: ${tentativas.length} [${tentativas.join(', ')}] · email_FALHOU +${falhou} · email_cota_esgotada +${cota} · marca do dia: ${marca?.dia === hoje()}` + (graves.length ? ' | ' + graves[0] : '') });
  } catch (e) { await foto(page, 'J22-falha'); registrar({ jornada: id, caso: 'Motor com cota esgotada e fila com desligada', ok: false, ms: Date.now() - t0, detalhe: String(e).slice(0, 220) }); }
  finally { await fechar(); }
}
