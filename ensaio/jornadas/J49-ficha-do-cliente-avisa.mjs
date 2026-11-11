// J49 — A ficha do cliente mudou depois do documento confirmado → o Chris recebe a demanda para readotar (CP198,
// decisão do Chris 10/11/2026). Usa o ciclo da Bluefit que a J06 cria (documento único confirmado em dezembro).
// Antes: o editor do mês travava ("A ficha do cliente mudou…") e nada avisava. A trava continua (proteção da base).
import { entrarComo, foto } from '../lib/navegador.mjs';
export const id = 'J49';
export const nome = 'Ficha do cliente alterada depois do documento confirmado: demanda para o Chris readotar';
const CLIENTE = 'bluefit';
const esperar = async (fn, ms = 20000) => { const f = Date.now() + ms; while (Date.now() < f) { const r = await fn(); if (r) return r; await new Promise(r => setTimeout(r, 1000)); } return null; };

export async function executar({ amb, seed, nav, erroGrave, registrar }) {
  const caso = 'ficha muda → demanda para o Chris';
  const ciclo = (await seed.listar('planejamento_social_i155')).find(c => c.id === '2026-12__' + CLIENTE);
  if (!ciclo) { registrar({ jornada: id, caso, ok: false, ms: 0, detalhe: 'depende da J06 (ciclo da Bluefit)' }); return; }
  const atual = await seed.get('info_extras_cliente', CLIENTE) || {};
  const { id: _x, ...semId } = atual;
  await seed.set('info_extras_cliente', CLIENTE, { ...semId, texto: (semId.texto || '') + '\nEnsaio J49: novo horário de funcionamento aos sábados.', atualizadoPor: 'Amanda', atualizadoEm: new Date().toISOString() });
  const dem = await esperar(async () => (await seed.listar('demandas')).find(d => /^cp198_ficha_/.test(d.id) && d.destinatario === 'Chris' && d.cliente === CLIENTE));
  const { page, erros, fechar } = await nav.novaPagina(); const t0 = Date.now();
  try {
    let naTela = false;
    if (dem) {
      await entrarComo(page, amb.url(), 'Chris'); await page.waitForTimeout(2500);
      await page.evaluate(() => irPara('minhasDemandasAtribuidas', document.getElementById('navMinhasDemandasAtribuidas')));
      naTela = await page.waitForFunction(t => document.getElementById('view-minhasDemandasAtribuidas')?.innerHTML.includes(t), dem.titulo, { timeout: 15000 }).then(() => true).catch(() => false);
    }
    const graves = erros.filter(erroGrave);
    await foto(page, 'J49-chris');
    registrar({ jornada: id, caso, ok: !!dem && naTela && !graves.length, ms: Date.now() - t0, detalhe: dem ? `"${dem.titulo}"${naTela ? ' visível em Minhas Demandas' : ' NÃO aparece na tela'}` : 'nenhuma demanda para o Chris' + (graves.length ? ' | ' + graves[0] : '') });
  } catch (e) { registrar({ jornada: id, caso, ok: false, ms: Date.now() - t0, detalhe: String(e).slice(0, 240) }); }
  finally { await fechar(); }
}
