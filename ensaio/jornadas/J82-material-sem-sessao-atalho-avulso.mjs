// J82 — CP229 (19/11/2026, filmmakers, empresas do Otávio): em "Gravação da agenda" a lista "Qual gravação" mostra só sessões
// agendadas. Óticas e clínicas foram gravadas sem sessão na agenda (e a da Zeiss já estava concluída), então a empresa não
// aparecia e a tela só dizia "peça à Cecília". O caminho certo já existe ("🎬 Gravado avulso", que lista todas as empresas),
// mas não estava à vista nesse ponto.
// Esperado: logo abaixo da lista de sessões, um atalho "Enviar como gravado avulso" abre o formulário avulso com a empresa
// para escolher (a Ótica Hauer aparece), sem mexer na agenda.
import { entrarComo, foto } from '../lib/navegador.mjs';
export const id = 'J82';
export const nome = 'Filmmaker sem sessão na agenda acha o atalho "Enviar como gravado avulso" e escolhe a empresa';
const SLUG = 'otica-hauer-j82', NOME = 'Ótica Hauer J82';

export async function executar({ amb, seed, nav, erroGrave, registrar }) {
  await seed.set('clientes_config', SLUG, { modoAprovacaoCliente: 'manual', prazoTacitaHorasUteis: 24, whatsappCobranca: '', excluido: false });
  await seed.set('clientes_extras', SLUG, { slug: SLUG, nome: NOME, ativo: true, excluido: false, criadoEm: new Date().toISOString() });
  const { page, erros, fechar } = await nav.novaPagina(); const t0 = Date.now(), caso = 'Luís: sem sessão da ótica → atalho → formulário avulso com a empresa';
  try {
    page.on('dialog', d => d.accept());
    await entrarComo(page, amb.url(), 'Luís'); await page.waitForTimeout(2500);
    await page.evaluate(() => irPara('videos', document.getElementById('navVideos')));
    await page.evaluate(() => escolherOrigemMaterial('gravado'));
    const sessoes = page.locator('#sessaoEnvioI52'); await sessoes.waitFor({ timeout: 20000 });
    const naLista = await sessoes.evaluate((s, n) => [...s.options].some(o => o.text.includes(n)), NOME);
    const atalho = page.locator('[data-sem-sessao-cp229] button'); await atalho.waitFor({ timeout: 10000 });
    await atalho.scrollIntoViewIfNeeded(); await atalho.click();
    await page.waitForSelector(`#videoCliente option[value="${SLUG}"]`, { state: 'attached', timeout: 20000 });
    const r = await page.evaluate(() => ({ form: getComputedStyle(document.getElementById('formMaterialAvulsoI51')).display !== 'none',
      cliente: !!document.getElementById('videoCliente')?.offsetParent, titulo: document.getElementById('tituloLancarVideos')?.textContent || '',
      avulso: document.getElementById('opAvulsoI67')?.getAttribute('aria-pressed') }));
    await page.selectOption('#videoCliente', SLUG);
    const graves = erros.filter(erroGrave);
    await foto(page, 'J82-luis-atalho-avulso');
    registrar({ jornada: id, caso, ok: !naLista && r.form && r.cliente && r.avulso === 'true' && /Gravado avulso/.test(r.titulo) && !graves.length, ms: Date.now() - t0,
      detalhe: `ótica na lista de sessões: ${naLista ? 'sim' : 'não'} · atalho abre o avulso: ${r.form && r.avulso === 'true' ? 'sim' : 'NÃO'} · empresa para escolher: ${r.cliente ? 'sim' : 'NÃO'} · título "${r.titulo}"` + (graves.length ? ' | ' + graves[0].slice(0, 200) : '') });
  } catch (e) { await foto(page, 'J82-falha'); registrar({ jornada: id, caso, ok: false, ms: Date.now() - t0, detalhe: String(e).replace(/\s+/g, ' ').slice(0, 300) }); }
  finally { await fechar(); }
}
