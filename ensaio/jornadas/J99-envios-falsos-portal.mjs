// J99 — Envios falsos do Portal (Programa Estabilidade, 21/11/2026; pedido do Chris: "envios fakes para ver como chega a outro lugar").
// O cliente (Mochi) manda pelo Portal, com cliques reais, cada tipo de pedido que existe hoje. Esperado: cada um vira UMA demanda para a
// pessoa ATIVA certa, e aparece em Minhas Demandas dela:
//   pedido geral → Amanda · pedido de agendamento → Cecília · pedido de calendário → Chris · referência → Chris · ideia → Amanda.
// (Pedido de legenda tem jornada própria: J48. Ajuste/observação no calendário: J06, J91, J92.)
import crypto from 'node:crypto';
import { entrarComo, foto } from '../lib/navegador.mjs';
export const id = 'J99';
export const nome = 'Envios falsos do Portal: cada pedido do cliente chega como demanda à pessoa ativa certa e aparece na tela dela';
const CLIENTE = 'mochi', MARCA = 'J99-' + Date.now().toString(36);
const esperar = async (fn, ms = 60000) => { const f = Date.now() + ms; let r; while (Date.now() < f) { r = await fn(); if (r) return r; await new Promise(x => setTimeout(x, 1500)); } return r; };
const idDemanda = avisoId => 'entrada_i54_' + crypto.createHash('sha256').update(JSON.stringify(['avisos_do_cliente', avisoId])).digest('hex');

export async function executar({ amb, seed, nav, erroGrave, registrar }) {
  const t0 = Date.now(), fim = (caso, ok, detalhe) => registrar({ jornada: id, caso, ok, ms: Date.now() - t0, detalhe });
  const ENVIOS = [
    { caso: 'pedido geral', para: 'Amanda', tipo: 'pedido_geral', texto: `Preciso da arte do cardápio de dezembro (${MARCA}-geral)` },
    { caso: 'pedido de agendamento', para: 'Cecília', tipo: 'pedido_agendamento', texto: `Podem mudar o post de sexta para sábado? (${MARCA}-agenda)` },
    { caso: 'pedido de calendário', para: 'Chris', tipo: 'pedido_calendario', texto: `Quero incluir o festival de sushi no calendário (${MARCA}-cal)` },
    { caso: 'referência', para: 'Chris', ref: true, texto: `Gostei deste vídeo de bastidores (${MARCA}-ref)` },
    { caso: 'ideia', para: 'Amanda', ideia: true, texto: `Rodízio temático de Natal (${MARCA}-ideia)` }
  ];
  // 1) o cliente envia tudo pelo Portal
  const p = await nav.novaPagina(); const errosPortal = [];
  try {
    p.page.on('dialog', d => d.accept());
    await p.page.goto(amb.url('portal-cliente.html', `&c=${CLIENTE}&t=tok-${CLIENTE}`), { waitUntil: 'domcontentloaded' });
    await p.page.waitForSelector('[data-tab="demandas"]', { state: 'attached', timeout: 30000 }); await p.page.waitForTimeout(2000);
    for (const e of ENVIOS) {
      const antes = p.erros.length;
      if (e.ref) {
        await p.page.evaluate(() => setTab('referencias', document.querySelector('[data-tab="referencias"]')));
        await p.page.waitForSelector('#novaRefDesc', { state: 'visible', timeout: 20000 });
        await p.page.fill('#novaRefLink', 'https://www.instagram.com/reel/ensaioJ99/'); await p.page.fill('#novaRefDesc', e.texto);
        await p.page.locator('button', { hasText: 'Adicionar referência' }).first().click();
      } else if (e.ideia) {
        await p.page.evaluate(() => setTab('ideias', document.querySelector('[data-tab="ideias"]')));
        await p.page.waitForSelector('#novaIdeiaTitulo', { state: 'visible', timeout: 20000 });
        await p.page.fill('#novaIdeiaTitulo', e.texto); await p.page.fill('#novaIdeiaDesc', 'Ideia do ensaio J99');
        await p.page.locator('button', { hasText: 'Registrar ideia' }).first().click();
      } else {
        await p.page.evaluate(() => setTab('demandas', document.querySelector('[data-tab="demandas"]')));
        await p.page.waitForSelector('#novaDemandaDestino', { state: 'visible', timeout: 20000 });
        await p.page.selectOption('#novaDemandaDestino', e.tipo); await p.page.fill('#novaDemandaTexto', e.texto);
        await p.page.locator('button', { hasText: 'Enviar pedido à equipe' }).first().click();
      }
      e.aviso = await esperar(async () => (await seed.listar('avisos_do_cliente')).find(a => a.cliente === CLIENTE && JSON.stringify([a.titulo, a.descricao]).includes(e.texto.match(/\(([^)]+)\)/)[1])), 30000);
      errosPortal.push(...p.erros.slice(antes).filter(erroGrave));
    }
    await foto(p.page, 'J99-portal');
  } catch (e) { fim('cliente envia pelo Portal', false, String(e).replace(/\s+/g, ' ').slice(0, 240)); await p.fechar(); return; }
  await p.fechar();
  fim('cliente envia os 5 tipos pelo Portal sem erro', ENVIOS.every(e => e.aviso) && !errosPortal.length,
    ENVIOS.map(e => `${e.caso}: ${e.aviso ? 'chegou (para ' + e.aviso.paraQuem + ')' : 'NÃO chegou'}`).join(' · ') + (errosPortal.length ? ' · erro: ' + errosPortal[0] : ''));
  await amb.aguardarFunctionsOciosas?.();

  // 2) cada destinatário entra (o escritório converte o que é dele) e encontra a demanda em Minhas Demandas
  const ativos = new Set((await seed.listar('usuarios_equipe')).filter(u => u.ativo === true && !u.excluido).map(u => u.pessoa));
  for (const pessoa of [...new Set(ENVIOS.map(e => e.para))]) {
    const meus = ENVIOS.filter(e => e.para === pessoa && e.aviso);
    const { page, erros, fechar } = await nav.novaPagina();
    try { page.on('dialog', d => d.accept());
      await entrarComo(page, amb.url(), pessoa); await page.waitForTimeout(3000);
      // o pedido vira demanda quando a pessoa abre Minhas Demandas (conferência I55 do escritório) ou, nos editoriais, pelo servidor (CP175)
      const abrirMinhas = () => page.evaluate(() => irPara('minhasDemandasAtribuidas', document.getElementById('navMinhasDemandasAtribuidas'))).catch(() => {});
      await abrirMinhas(); let ultimaAbertura = Date.now();
      for (const e of meus) {
        const t1 = Date.now();
        const dem = await esperar(async () => { const d = await seed.get('demandas', idDemanda(e.aviso.id)) || (e.aviso.demandaInternaId ? await seed.get('demandas', e.aviso.demandaInternaId) : null);
          if (d) return d; const a = await seed.get('avisos_do_cliente', e.aviso.id); if (a?.demandaInternaId) return await seed.get('demandas', a.demandaInternaId);
          if (Date.now() - ultimaAbertura > 20000) { await abrirMinhas(); ultimaAbertura = Date.now(); } return null; }, 90000);
        e.segundos = Math.round((Date.now() - t1) / 1000);
        await abrirMinhas();
        const chave = e.texto.match(/\(([^)]+)\)/)[1];
        const naTela = !!dem && await page.waitForFunction(([t, c]) => { const h = document.getElementById('view-minhasDemandasAtribuidas')?.innerText || ''; return h.includes(c) || h.includes(t); }, [String(dem.titulo || '').slice(0, 40), chave], { timeout: 20000 }).then(() => true).catch(() => false);
        e.resultado = { dem, naTela };
        const ok = !!dem && dem.destinatario === pessoa && ativos.has(pessoa) && !dem.excluido && ['pendente', undefined].includes(dem.status) && naTela;
        fim(`${e.caso} → ${pessoa}: demanda criada e na tela`, ok && !erros.filter(erroGrave).length,
          dem ? `demanda para ${dem.destinatario} · ${dem.status || 'sem status'} · “${String(dem.titulo || '').slice(0, 60)}” · na tela ${naTela ? 'sim' : 'NÃO'} · ${e.segundos}s depois de abrir` : 'a demanda NÃO foi criada · aviso: ' + JSON.stringify(await seed.get('avisos_do_cliente', e.aviso.id).then(a => ({ lido: a?.lido, vira: a?.viraDemanda, tipo: a?.tipo, para: a?.paraQuem, dem: a?.demandaInternaId, dc: a?.demandaClienteId, conv: a?.conversaoVersao, erro: a?.erroConversao || a?.falhaI54 }))) + ' · console: ' + (erros.slice(-3).join(' | ').slice(0, 400)));
      }
      await foto(page, 'J99-' + pessoa.normalize('NFD').replace(/[^A-Za-z]/g, '').toLowerCase());
    } catch (err) { await foto(page, 'J99-falha'); fim(`${pessoa} recebe`, false, String(err).replace(/\s+/g, ' ').slice(0, 240)); } finally { await fechar(); }
  }
  // limpeza: as demandas do ensaio saem da fila
  for (const e of ENVIOS) { const d = e.resultado?.dem; if (!d) continue; const { id: k, ...dados } = d; await seed.set('demandas', k, { ...dados, excluido: true }); }
}
