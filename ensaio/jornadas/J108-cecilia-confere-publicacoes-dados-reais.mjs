// J108 — Cecília confere as publicações da fila com os dados reais (22/11/2026, reclamação: "assim que ela aperta o botão de já postado ele
// bug, não sai de lá e não vai pra nenhum lugar, não acontece nada, como se travasse"). Só roda com ENSAIO_DADOS_REAIS.
// Para cada linha elegível da fila "Publicações para conferir": a Cecília clica no botão da linha e a jornada registra o que aconteceu
// (ficha aberta? cartão da Stokki? aviso? erro no console? a postagem mudou no servidor?). Nada fica parado sem resposta.
// Limite do emulador: postagens anteriores à migração (lista de legado da programação) são recusadas aqui com "mudou de identidade ou foi recriada",
// porque a cópia dos dados recria os documentos (outra data de criação). Em produção a mesma conferência (fontesPostagemTxI165) roda todo dia no
// Raio-X (D5) e passa.
import { entrarComo, foto } from '../lib/navegador.mjs';
export const id = 'J108';
export const nome = 'Cecília confere cada publicação da fila (dados reais): todo clique abre a conferência ou diz por que não';

export async function executar({ amb, seed, nav, erroGrave, registrar }) {
  if (!process.env.ENSAIO_DADOS_REAIS) { registrar({ jornada: id, caso: 'só com dados reais (ENSAIO_DADOS_REAIS)', ok: true, ms: 0, detalhe: 'pulada na bateria comum' }); return; }
  const t0 = Date.now();
  const { page, erros, fechar } = await nav.novaPagina();
  try {
    page.on('dialog', d => d.accept());
    const toasts = []; await page.exposeFunction('__toastJ108', t => toasts.push(t));
    await entrarComo(page, amb.url(), 'Cecília'); await page.waitForTimeout(3000);
    await page.evaluate(() => { const o = window.mostrarToast; if (typeof o === 'function') window.mostrarToast = (m, ...r) => { try { window.__toastJ108(String(m)); } catch {} return o(m, ...r); }; });
    await page.evaluate(() => irPara('postagens', document.getElementById('navPostagens'))); await page.evaluate(() => { try { setPostagensSub('confirmar', null); } catch {} });
    await page.waitForFunction(() => /Lista conferida na origem|A lista ainda não foi confirmada|Não consegui conferir/.test(document.getElementById('filaPublicacoesCp125')?.innerText || ''), null, { timeout: 60000 });
    const estado = await page.evaluate(() => document.querySelector('#filaPublicacoesCp125 [role=status]')?.textContent || '');
    const linhas = await page.evaluate(() => [...document.querySelectorAll('#filaPublicacoesCp125 article[data-cp125-key]')].map(a => ({ key: a.dataset.cp125Key, titulo: a.querySelector('b')?.textContent || '',
      botoes: [...a.querySelectorAll('button[data-cp125-post]')].map(b => ({ txt: b.textContent.trim(), rapida: b.hasAttribute('data-cp125-rapida'), disabled: b.disabled, post: b.dataset.cp125Post, rede: b.dataset.cp125Rede })) })));
    registrar({ jornada: id, caso: 'fila carregada', ok: /Lista conferida na origem/.test(estado), ms: Date.now() - t0, detalhe: `"${estado}" · ${linhas.length} linha(s)` });
    // Stokki (CP253): cada linha da fila → painel → "Confirmar que publicou nesta plataforma" → conferência NA plataforma, à vista → confirmar
    const irFila = async () => { await page.evaluate(() => { try { window.fecharModal?.(); } catch {} const d = document.querySelector('dialog[data-stokki-painel][open]'); if (d) { d.close(); d.remove(); } });
      await page.evaluate(() => irPara('postagens', document.getElementById('navPostagens'))); await page.evaluate(() => { try { setPostagensSub('confirmar', null); } catch {} });
      await page.waitForFunction(() => /Lista conferida na origem/.test(document.getElementById('filaPublicacoesCp125')?.innerText || ''), null, { timeout: 30000 }).catch(() => {}); await page.waitForTimeout(1500); };
    for (const l of linhas) {
      const b = l.botoes.find(x => x.rede !== 'geral' && /Conferir publicação real/.test(x.txt)); if (!b) continue;
      const t1 = Date.now(), nome = `Stokki ${l.titulo.replace(/^Stokki · /, '').slice(0, 55)} [${b.rede}]`;
      try {
        await irFila();
        await page.locator(`#filaPublicacoesCp125 button[data-cp125-post="${b.post}"][data-cp125-rede="${b.rede}"]:not([data-cp125-rapida])`).first().click();
        const bloco = page.locator(`dialog[data-stokki-painel][open] [data-stokki-post="${b.post}"] [data-stokki-rede="${b.rede}"]`).first(); await bloco.waitFor({ timeout: 20000 });
        await bloco.locator('[data-stokki-acao="publicar"]').first().click(); await page.waitForTimeout(3000);
        const form = page.locator(`#postagemOperacionalI165_stokki_${b.post}`).first(); await form.waitFor({ timeout: 15000 });
        const onde = await page.evaluate(([pid, r]) => { const f = document.getElementById('postagemOperacionalI165_stokki_' + pid), rect = f.getBoundingClientRect(), dr = f.closest('dialog')?.getBoundingClientRect();
          return { naPlataforma: f.closest('[data-stokki-rede]')?.dataset.stokkiRede === r, naVista: rect.height > 0 && rect.top < (dr ? dr.bottom : innerHeight) && rect.bottom > (dr ? dr.top : 0) }; }, [b.post, b.rede]);
        const atualizar = form.locator('[data-post165-acao="abrir"]').first(); if (await atualizar.count() && await atualizar.isVisible()) { await atualizar.click(); await page.waitForTimeout(2500); }
        const linha = (await seed.get('postagens', b.post))?.publicacaoStokki?.redes?.[b.rede] || {};
        await form.locator('[data-post165-campo][type=date]').last().fill(linha.data); await form.locator('[data-post165-campo][type=time]').last().fill(linha.hora || '12:00');
        await form.locator('textarea[data-post165-campo]').last().fill('Conferido no perfil pela Cecília (ensaio J108).');
        for (const cb of await form.locator('input[type=checkbox]').all()) { if (!(await cb.isChecked())) await cb.check().catch(() => {}); }
        await form.locator('[data-post165-acao="confirmar"]').first().click();
        let pub = null; for (let k = 0; k < 25 && !pub; k++) { await page.waitForTimeout(1000); pub = (await seed.get('postagens', b.post))?.publicacaoStokki?.redes?.[b.rede]?.publicadaEm || null; }
        const graves = erros.filter(erroGrave);
        await foto(page, `J108-stokki-${b.post.slice(0, 20)}-${b.rede}`);
        registrar({ jornada: id, caso: `${nome} · confirmada pela Cecília`, ok: onde.naPlataforma && onde.naVista && !!pub, ms: Date.now() - t1, detalhe: `conferência ${onde.naPlataforma ? 'na plataforma' : 'FORA da plataforma'} e ${onde.naVista ? 'à vista' : 'FORA DA VISTA'} · publicadaEm ${pub || 'NÃO gravou'}${graves.length ? ' · erro: ' + graves.at(-1).slice(0, 140) : ''}` });
      } catch (e) { await foto(page, `J108-stokki-${b.post.slice(0, 20)}-${b.rede}-falha`); registrar({ jornada: id, caso: `${nome} · confirmada pela Cecília`, ok: false, ms: Date.now() - t1, detalhe: String(e).replace(/\s+/g, ' ').slice(0, 260) }); }
    }
    await irFila();
    // clientes comuns: o botão de um toque "Saiu no horário" (as linhas sem horário abrem a ficha completa, conferida pela J33)
    for (const l of linhas.filter(x => x.botoes.some(b => b.rede === 'geral' && b.rapida))) {
      const b = l.botoes.find(x => x.rapida); if (!b) continue;
      const t1 = Date.now(), antes = await seed.get('postagens', b.post), nToasts = toasts.length, nErros = erros.length;
      if (b.disabled) { registrar({ jornada: id, caso: `${l.titulo.slice(0, 70)} [${b.rede}] · "${b.txt}"`, ok: false, ms: 0, detalhe: 'BOTÃO DESATIVADO' }); continue; }
      const sel = `#filaPublicacoesCp125 button[data-cp125-post="${b.post}"][data-cp125-rede="${b.rede}"]${b.rapida ? '[data-cp125-rapida]' : ':not([data-cp125-rapida])'}`;
      await page.locator(sel).first().scrollIntoViewIfNeeded(); await page.locator(sel).first().click();
      await page.waitForTimeout(b.rapida ? 9000 : 5000);
      const depoisTela = await page.evaluate(() => ({ overlay: document.getElementById('overlayView')?.classList.contains('show') || false, modal: (document.getElementById('modalConteudo')?.innerText || '').replace(/\s+/g, ' ').slice(0, 160),
        stokki: document.querySelectorAll('[data-stokki-post]').length, view: document.querySelector('.view.active,.view[style*="block"]')?.id || '' }));
      const depois = await seed.get('postagens', b.post), novosToasts = toasts.slice(nToasts), novosErros = erros.slice(nErros).filter(erroGrave);
      const aconteceu = depoisTela.overlay || novosToasts.length || JSON.stringify(depois?.status) !== JSON.stringify(antes?.status) || (b.rede !== 'geral' && depoisTela.stokki);
      await foto(page, `J108-${b.post.slice(0, 20)}-${b.rede}`);
      registrar({ jornada: id, caso: `${l.titulo.slice(0, 70)} [${b.rede}] · "${b.txt}"`, ok: !!aconteceu && !novosErros.length, ms: Date.now() - t1,
        detalhe: `ficha ${depoisTela.overlay ? 'aberta: "' + depoisTela.modal + '"' : 'NÃO abriu'} · aviso ${novosToasts.length ? '"' + novosToasts.join(' | ').slice(0, 160) + '"' : 'nenhum'} · status ${antes?.status}→${depois?.status} · cartões Stokki ${depoisTela.stokki} · tela ${depoisTela.view}${novosErros.length ? ' · erro: ' + novosErros[0].slice(0, 160) : ''}` });
      await page.evaluate(() => { try { window.fecharModal?.(); } catch {} }); await page.waitForTimeout(1000);
      await page.evaluate(() => irPara('postagens', document.getElementById('navPostagens'))); await page.evaluate(() => { try { setPostagensSub('confirmar', null); } catch {} }); await page.waitForTimeout(2500);
    }
  } catch (e) { await foto(page, 'J108-falha'); registrar({ jornada: id, caso: 'execução', ok: false, ms: Date.now() - t0, detalhe: String(e).replace(/\s+/g, ' ').slice(0, 300) }); }
  finally { await fechar(); }
}
