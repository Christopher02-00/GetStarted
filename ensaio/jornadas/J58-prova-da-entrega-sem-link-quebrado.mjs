// J58 — CP206 (12/11/2026, Amanda): "Abrir a prova" não abria. O campo do link da prova também recebe recado curto
// ("Ok", "Feito" — 160 demandas em produção) e virava <a href="Ok">, uma página quebrada do próprio site. E a prova que
// é página do Claude (claude.ai) só abre para quem o dono compartilhou. A Amanda abre Aprovações → Demandas e confere:
// recado aparece como texto (sem link), endereço web vira link seguro e a página do Claude traz o aviso.
import { entrarComo, foto } from '../lib/navegador.mjs';
export const id = 'J58';
export const nome = 'Prova da entrega: recado não vira link quebrado; link web abre; página do Claude avisa';

export async function executar({ amb, seed, nav, erroGrave, registrar }) {
  const base = { descricao: 'Ensaio J58', destinatario: 'Cecília', remetente: 'Amanda', origem: 'amanda', status: 'concluida_aguardando_aprovacao', prazoData: '2026-11-12', concluidaEm: new Date().toISOString() };
  await seed.set('demandas', 'j58-recado', { ...base, titulo: 'Conferir recado J58', provaTexto: 'feito', provaImagemUrl: 'Ok' });
  await seed.set('demandas', 'j58-claude', { ...base, titulo: 'Conferir arte J58', provaTexto: 'Direção de arte', provaImagemUrl: 'https://claude.ai/artifact/EnsaioJ58abc' });
  await seed.set('demandas', 'j58-drive', { ...base, titulo: 'Conferir drive J58', provaTexto: 'print', provaImagemUrl: 'drive.google.com/file/d/EnsaioJ58xyz/view' });
  const caso = 'Amanda confere as provas';
  const { page, erros, fechar } = await nav.novaPagina(); const t0 = Date.now();
  try {
    await entrarComo(page, amb.url(), 'Amanda'); await page.waitForTimeout(6000);
    await page.evaluate(() => { irPara('gerencia', document.getElementById('navitemGerencia')); });
    await page.waitForTimeout(1500);
    await page.evaluate(() => { const b = [...document.querySelectorAll('[onclick^="setGerenciaSub(\'demandasAguardando\'"]')][0]; setGerenciaSub('demandasAguardando', b); });
    const viu = await page.waitForFunction(() => /Conferir recado J58/.test(document.getElementById('gerenciaDemandasAguardando')?.textContent || ''), null, { timeout: 20000 }).then(() => true, () => false);
    if (!viu) throw new Error('demandas J58 não apareceram: ' + await page.evaluate(() => (document.getElementById('gerenciaDemandasAguardando')?.textContent || 'sem contêiner').replace(/\s+/g, ' ').slice(0, 200) + ' | total=' + (window.todasDemandas?.length ?? '?')));
    await page.evaluate(() => filtrarAprovacoes('demandas')); await page.waitForTimeout(1500);
    const r = await page.evaluate(() => {
      const cont = document.getElementById('gerenciaDemandasAguardando');
      const cartao = t => [...cont.querySelectorAll('.item')].find(x => x.innerText.includes(t));
      const links = c => [...(c?.querySelectorAll('a') || [])].map(a => a.getAttribute('href'));
      const rec = cartao('Conferir recado J58'), cla = cartao('Conferir arte J58'), dri = cartao('Conferir drive J58');
      return {
        recadoSemLink: !!rec && !links(rec).some(h => h === 'Ok' || /\/Ok$/.test(h || '')) && /Recado da entrega: Ok/.test(rec.innerText),
        claudeLink: !!cla && links(cla).includes('https://claude.ai/artifact/EnsaioJ58abc') && /abre só se quem criou compartilhou/.test(cla.innerText),
        driveLink: !!dri && links(dri).includes('https://drive.google.com/file/d/EnsaioJ58xyz/view'),
        seguro: [...cont.querySelectorAll('a[data-prova-link-cp206]')].every(a => a.target === '_blank' && /noopener/.test(a.rel)),
      };
    });
    const graves = erros.filter(erroGrave);
    await foto(page, 'J58-amanda');
    registrar({ jornada: id, caso, ok: r.recadoSemLink && r.claudeLink && r.driveLink && r.seguro && !graves.length, ms: Date.now() - t0,
      detalhe: `recado ${r.recadoSemLink ? 'como texto' : 'VIROU LINK QUEBRADO'} · claude ${r.claudeLink ? 'link + aviso' : 'SEM aviso/link'} · drive sem https ${r.driveLink ? 'abre' : 'NÃO abre'} · ${r.seguro ? 'links seguros' : 'link sem noopener'}` + (graves.length ? ' | ' + graves[0] : '') });
  } catch (e) { registrar({ jornada: id, caso, ok: false, ms: Date.now() - t0, detalhe: String(e).slice(0, 240) }); }
  finally { await fechar(); }
}
