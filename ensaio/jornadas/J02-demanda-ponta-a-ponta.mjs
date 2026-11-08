// J02 — Chris cria demanda pela UI → Cecília a encontra em Minhas Demandas e envia prova → Chris aprova → status final.
import { entrarComo, foto } from '../lib/navegador.mjs';

export const id = 'J02';
export const nome = 'Demanda: Chris cria → Cecília encontra e prova → Chris aprova';

const TITULO = 'ENSAIO J02 · Confirmar gravação Stokki';
const amanha = () => { const d = new Date(Date.now() + 86400000); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };

async function esperarDemanda(seed, filtro, ms = 10000) {
  const fim = Date.now() + ms;
  while (Date.now() < fim) { const d = (await seed.listar('demandas')).find(filtro); if (d) return d; await new Promise(r => setTimeout(r, 300)); }
  return null;
}

export async function executar({ amb, seed, nav, erroGrave, registrar }) {
  // --- 1. Chris cria pela UI
  let demanda = null, t0 = Date.now();
  { const { page, erros, fechar } = await nav.novaPagina();
    try {
      await entrarComo(page, amb.url(), 'Chris');
      await page.waitForTimeout(2500);
      await page.evaluate(() => window.abrirModalNovaDemanda());
      await page.waitForSelector('#novoTituloModal', { timeout: 8000 });
      await page.fill('#novoTituloModal', TITULO);
      await page.fill('#novaDescModal', 'Criada automaticamente pelo ensaio J02.');
      await page.selectOption('#novoDestinatarioModal', 'Cecília');
      await page.fill('#novoDataModal', amanha());
      await page.fill('#novoHoraModal', '18:00');
      await page.click('#btnCriarModal');
      demanda = await esperarDemanda(seed, d => d.titulo === TITULO && !d.excluido);
      await foto(page, 'J02-1-chris-criou');
      const graves = erros.filter(erroGrave);
      registrar({ jornada: id, caso: '1 Chris cria pela UI', ok: !!demanda && demanda.destinatario === 'Cecília' && demanda.status === 'pendente' && !graves.length, ms: Date.now() - t0,
        detalhe: demanda ? `id ${demanda.id} · status ${demanda.status} · dest ${demanda.destinatario}` + (graves.length ? ' | ' + graves[0] : '') : 'demanda NÃO chegou ao Firestore' });
    } catch (e) { await foto(page, 'J02-1-falha'); registrar({ jornada: id, caso: '1 Chris cria pela UI', ok: false, ms: Date.now() - t0, detalhe: String(e).slice(0, 200) }); }
    finally { await fechar(); } }
  if (!demanda) { registrar({ jornada: id, caso: '2-3', ok: false, ms: 0, detalhe: 'pulado: sem demanda' }); return; }

  // --- 2. Cecília encontra e envia prova
  t0 = Date.now();
  { const { page, erros, fechar } = await nav.novaPagina();
    try {
      await entrarComo(page, amb.url(), 'Cecília');
      await page.waitForTimeout(2500);
      await page.evaluate(() => irPara('minhasDemandasAtribuidas', document.getElementById('navMinhasDemandasAtribuidas')));
      // a demanda cai em "Próximos 7 dias" (grupo recolhido por padrão): o usuário abre o grupo e vê o cartão
      await page.waitForFunction(t => document.getElementById('view-minhasDemandasAtribuidas')?.innerHTML.includes(t), TITULO, { timeout: 12000 });
      // ACHADO F-01 (08/11): o grupo "Próximos 7 dias" nasce recolhido mesmo quando o filtro é esse — contador 2, zero cartões visíveis.
      const grupo = page.locator('#view-minhasDemandasAtribuidas').getByText(/⚪ Próximos 7 dias/).first();
      await grupo.click();
      await page.waitForFunction(t => document.getElementById('view-minhasDemandasAtribuidas')?.innerText.includes(t), TITULO, { timeout: 8000 });
      await foto(page, 'J02-2-cecilia-ve');
      await page.evaluate(idd => window.abrirDemandaMinha(idd), demanda.id);
      await page.waitForSelector('#provaTextoInput', { timeout: 8000 });
      await page.fill('#provaTextoInput', 'Gravação confirmada no ensaio J02.');
      await page.click('#btnEnviarProva');
      const depois = await esperarDemanda(seed, d => d.id === demanda.id && d.status !== 'pendente');
      await foto(page, 'J02-2-cecilia-provou');
      const graves = erros.filter(erroGrave);
      registrar({ jornada: id, caso: '2 Cecília encontra e prova', ok: !!depois && /concluida|aguardando_aprovacao|andamento/.test(depois.status) && !graves.length, ms: Date.now() - t0,
        detalhe: depois ? `status ${depois.status}` + (graves.length ? ' | ' + graves[0] : '') : 'status não mudou após a prova' });
      demanda = depois || demanda;
    } catch (e) { await foto(page, 'J02-2-falha'); registrar({ jornada: id, caso: '2 Cecília encontra e prova', ok: false, ms: Date.now() - t0, detalhe: String(e).slice(0, 200) }); }
    finally { await fechar(); } }

  // --- 3. Chris aprova
  t0 = Date.now();
  { const { page, erros, fechar } = await nav.novaPagina();
    try {
      await entrarComo(page, amb.url(), 'Chris');
      await page.waitForTimeout(2500);
      page.on('dialog', d => d.accept());
      await page.evaluate(idd => window.aprovarDemanda(idd), demanda.id);
      const fim = await esperarDemanda(seed, d => d.id === demanda.id && /aprovad|concluid/.test(d.status) && !/aguardando/.test(d.status));
      await foto(page, 'J02-3-chris-aprovou');
      const graves = erros.filter(erroGrave);
      registrar({ jornada: id, caso: '3 Chris aprova', ok: !!fim && !graves.length, ms: Date.now() - t0, detalhe: fim ? `status final ${fim.status}` : 'não aprovou' });
    } catch (e) { await foto(page, 'J02-3-falha'); registrar({ jornada: id, caso: '3 Chris aprova', ok: false, ms: Date.now() - t0, detalhe: String(e).slice(0, 200) }); }
    finally { await fechar(); } }
}
