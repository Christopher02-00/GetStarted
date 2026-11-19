// J87 — CP234 (19/11/2026, Nathan, Zeiss 12/11): sessão com 2 filmmakers (Luís + Nathan). O Luís registrou só os vídeos dele e a
// sessão virou "realizado" para os dois; em "Enviar materiais → Gravação da agenda" ela sumiu da lista do Nathan e ele não
// conseguia enviar o que filmou (o vídeo dele mostra só as sessões da Juliane).
// Esperado: quem é da equipe e ainda não registrou nada nesta sessão vê "… · complementar o envio" por 21 dias; os vídeos
// dele SOMAM aos do Luís (nada do Luís é apagado), com o responsável certo. O Luís, que já registrou, não vê o complemento.
import { entrarComo, foto, abrirMenuSeMovel } from '../lib/navegador.mjs';
export const id = 'J87';
export const nome = 'Sessão com 2 filmmakers já registrada pelo 1º: o 2º complementa o envio (os vídeos somam)';
const AG = 'ag-j87-zeiss';
const esperar = async (fn, ms = 25000) => { const f = Date.now() + ms; while (Date.now() < f) { const r = await fn(); if (r) return r; await new Promise(r => setTimeout(r, 1000)); } return null; };

export async function executar({ amb, seed, nav, erroGrave, registrar }) {
  const ontem = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  await seed.set('agendamentos', AG, { cliente: 'zeiss', clienteSlug: 'zeiss', clienteNome: 'Zeiss', data: ontem, hora: '11:00', local: 'Loja Zeiss (J87)', tipo: 'fixo', aprovado: true,
    filmmaker: 'Luís', equipe: [{ nome: 'Luís', papel: 'Filmmaker' }, { nome: 'Nathan', papel: '2º Filmmaker' }], status: 'realizado', qtdVideosPlanejados: 4, qtdVideosRealizados: 1,
    conteudosRealizados: [{ ordem: 1, nome: 'Vídeo do Luís (J87)', filmmaker: 'Luís' }], producaoPorFilmmaker: [{ filmmaker: 'Luís', quantidade: 1, conteudos: ['Vídeo do Luís (J87)'] }],
    finalizadoPor: 'Luís', registradoPor: 'Luís', finalizadoEm: new Date().toISOString(), criadoEm: new Date().toISOString(), excluido: false });
  await amb.aguardarFunctionsOciosas?.();
  const abrirEnvio = async (page) => {
    await page.evaluate(() => irPara('videos', document.getElementById('navVideos'))); await page.waitForTimeout(1200);
    await page.evaluate(() => escolherOrigemMaterial('gravado'));
    const sel = page.locator('#sessaoEnvioI52'); await sel.waitFor({ state: 'attached', timeout: 25000 });
    return sel.evaluate((s, ag) => ({ tem: [...s.options].some(o => o.value === ag), rotulo: [...s.options].find(o => o.value === ag)?.text || '' }), AG);
  };
  // Contraprova: o Luís já registrou → não vê complemento
  { const { page, fechar } = await nav.novaPagina(); const t0 = Date.now();
    try { page.on('dialog', d => d.accept()); await entrarComo(page, amb.url(), 'Luís'); await page.waitForTimeout(2500); const r = await abrirEnvio(page);
      registrar({ jornada: id, caso: 'contraprova: o Luís, que já registrou, não vê a sessão para complementar', ok: !r.tem, ms: Date.now() - t0, detalhe: r.tem ? 'VÊ: ' + r.rotulo : 'não vê' });
    } catch (e) { registrar({ jornada: id, caso: 'contraprova: o Luís, que já registrou, não vê a sessão para complementar', ok: false, ms: Date.now() - t0, detalhe: String(e).slice(0, 200) }); }
    finally { await fechar(); } }
  const { page, erros, fechar } = await nav.novaPagina(); const t0 = Date.now(), caso = 'Nathan complementa a sessão já registrada pelo Luís';
  try {
    page.on('dialog', d => d.accept());
    await entrarComo(page, amb.url(), 'Nathan'); await page.waitForTimeout(2500);
    const r = await abrirEnvio(page);
    if (!r.tem) { await foto(page, 'J87-sem-sessao'); registrar({ jornada: id, caso, ok: false, ms: Date.now() - t0, detalhe: 'a sessão da Zeiss não aparece em "Qual gravação"' }); return; }
    await page.selectOption('#sessaoEnvioI52', AG); await page.waitForTimeout(2500);
    await page.locator('#extras_' + AG).waitFor({ state: 'attached', timeout: 20000 });
    await page.evaluate(ag => { const set = (el, v) => { if (!el) return; el.value = v; el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })); };
      set(document.getElementById('extras_' + ag), 'Vídeo do Nathan (J87)');
      const resp = document.getElementById('responsavelExtras_' + ag); if (resp) { const o = [...resp.options || []].find(x => /Nathan/.test(x.value || x.text)); set(resp, o ? o.value : 'Nathan'); }
      const emp = document.getElementById('empresaExtras_' + ag); if (emp && emp.options && emp.options.length > 1 && !emp.value) set(emp, emp.options[1].value); }, AG);
    await page.waitForTimeout(800);
    await page.evaluate(ag => { const b = document.getElementById('btnConfirmarGravacao_' + ag); if (b) { b.disabled = false; b.click(); } }, AG);
    const ag = await esperar(async () => { const x = await seed.get('agendamentos', AG); return (x?.conteudosRealizados || []).length >= 2 ? x : null; });
    const vids = (await seed.listar('videos_producao')).filter(v => v.cliente === 'zeiss' && /Vídeo do Nathan \(J87\)/.test(v.titulo || v.nome || '') && !v.excluido);
    const toast = await page.evaluate(() => [...document.querySelectorAll('.toast,[role=alert]')].map(t => t.innerText).filter(Boolean).slice(-2).join(' | '));
    const graves = erros.filter(erroGrave);
    await foto(page, 'J87-nathan-complementou');
    const okAg = !!ag && ag.qtdVideosRealizados === 2 && ag.conteudosRealizados[0]?.filmmaker === 'Luís' && ag.conteudosRealizados[1]?.filmmaker === 'Nathan' && ag.finalizadoPor === 'Luís' && (ag.complementosCp234 || []).some(c => c.por === 'Nathan');
    registrar({ jornada: id, caso, ok: /complementar/.test(r.rotulo) && okAg && vids.length === 1 && !graves.length, ms: Date.now() - t0,
      detalhe: `rótulo "${r.rotulo}" · sessão ${ag ? ag.qtdVideosRealizados + ' vídeos (' + ag.conteudosRealizados.map(c => c.filmmaker).join('+') + ')' : 'NÃO somou'} · vídeo do Nathan ${vids.length ? 'criado (' + (vids[0].filmmaker || '?') + ')' : 'NÃO criado'} · tela: ${toast.slice(0, 160)}` + (graves.length ? ' | ' + graves[0].slice(0, 200) : '') });
  } catch (e) { await foto(page, 'J87-falha'); registrar({ jornada: id, caso, ok: false, ms: Date.now() - t0, detalhe: String(e).replace(/\s+/g, ' ').slice(0, 300) }); }
  finally { await fechar(); }
}
