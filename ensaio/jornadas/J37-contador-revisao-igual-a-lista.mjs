// J37 — O contador "Esperando sua revisão" usa o mesmo filtro de carteira da fila (auditoria do percurso, 10/11/2026).
// Um cliente que saiu (clienteInativo) com o mês ainda em `aguardando_interna` sumia da fila, mas continuava no número
// do contador da Amanda — número sem lista. Esperado: incluir esse calendário não muda o contador.
import { entrarComo, entrarGerencia, foto } from '../lib/navegador.mjs';
export const id = 'J37';
export const nome = 'Contador "Esperando sua revisão" não conta cliente fora da carteira';
const SLUG = 'j37antigo', MES = '2026-12';

async function lerContador(page) {
  await entrarGerencia(page);
  await page.evaluate(() => irParaPainelDeControle());
  await page.waitForFunction(() => [...document.querySelectorAll('.resumoCard .lbl')].some(e => /Esperando sua revisão/.test(e.textContent)), null, { timeout: 30000 });
  return page.evaluate(() => { const l = [...document.querySelectorAll('.resumoCard .lbl')].find(e => /Esperando sua revisão/.test(e.textContent)); return l?.parentElement?.querySelector('.num')?.textContent.trim(); });
}

export async function executar({ amb, seed, nav, erroGrave, registrar }) {
  const caso = 'Cliente inativo com mês em revisão não entra no contador';
  const { page, erros, fechar } = await nav.novaPagina(); const t0 = Date.now();
  try {
    page.on('dialog', d => d.accept());
    await entrarComo(page, amb.url(), 'Amanda'); await page.waitForTimeout(3000);
    const antes = await lerContador(page);
    const agora = new Date().toISOString();
    await seed.set('clientes_extras', SLUG, { slug: SLUG, nome: 'Cliente J37 antigo', ativo: false, excluido: true, criadoEm: agora });
    await seed.set('clientes_config', SLUG, { modoAprovacaoCliente: 'manual', clienteInativo: true, inativoDesde: '2026-10-01', excluido: false });
    await seed.set('calendarios', SLUG, { cliente: SLUG, client: 'Cliente J37 antigo', items: [{ itemId: 'calitem_j37', mes: MES, day: 4, name: 'Ensaio J37 — conteúdo', desc: '', legenda: '', excluido: false }],
      aprovacaoMeses: { [MES]: { status: 'aguardando_interna', por: 'Chris', em: agora, motivoAjuste: '' } }, updatedAt: agora });
    await fechar();
    const p2 = await nav.novaPagina(); var pagina2 = p2;
    p2.page.on('dialog', d => d.accept());
    await entrarComo(p2.page, amb.url(), 'Amanda'); await p2.page.waitForTimeout(3000);
    const depois = await lerContador(p2.page);
    erros.push(...p2.erros);
    const graves = erros.filter(erroGrave);
    await foto(p2.page, 'J37-contador-amanda'); await p2.fechar();
    registrar({ jornada: id, caso, ok: antes === depois && !graves.length, ms: Date.now() - t0,
      detalhe: `contador antes ${antes} · depois ${depois}${antes === depois ? ' (igual à fila)' : ' (contou o cliente que saiu)'}` + (graves.length ? ' | ' + graves[0] : '') });
  } catch (e) { await foto(page, 'J37-falha').catch(() => {}); registrar({ jornada: id, caso, ok: false, ms: Date.now() - t0, detalhe: String(e).slice(0, 260) }); }
  finally { await fechar().catch(() => {}); }
}
