// J110 — CP255 (22/11/2026, pedido do Chris: "dados antigos … acúmulo … que só pesa o sistema e acaba travando"). Depois de cada ação, a tela
// da gestão (Amanda/Chris) relia do servidor TODAS as demandas (5.387 nos dados reais, 98% encerradas) só para confirmar a demanda que acabou
// de mudar — ~18 lugares, entre eles toda conclusão em Minhas Demandas. O ouvinte em tempo real da gestão já entrega as outras mudanças.
// Esperado: a Amanda conclui uma tarefa → a tela confere no servidor só aquela demanda (nenhum pedido da coleção inteira) e a lista dela
// atualiza na hora (a tarefa sai das pendentes).
// Medido com os dados reais (sonda no navegador): como o ouvinte da gestão já tem a coleção aberta, o Firestore responde da memória
// (nenhum pedido novo ao servidor), mas montar as 5.395 demandas custa ~0,37 s a cada ação, com o botão esperando.
// Como a jornada conta: a releitura completa da gestão registra "Demandas da gestão: leitura direta da coleção (servidor)." no console;
// a conferência só da demanda tocada abre um alvo de documento no canal Listen.
import { entrarComo, foto } from '../lib/navegador.mjs';
export const id = 'J110';
export const nome = 'Gestão confere só a demanda tocada depois de concluir (sem reler todas as demandas do servidor)';
const esperar = async (fn, ms = 30000) => { const f = Date.now() + ms; let r; while (Date.now() < f) { r = await fn(); if (r) return r; await new Promise(x => setTimeout(x, 500)); } return r; };

// alvos abertos no canal Listen (WebChannel: corpo "count=…&ofs=…&req0___data__=<json>&req1___data__=…")
function alvosDoCorpo(corpo) {
  const out = [];
  for (const par of String(corpo || '').split('&')) {
    const i = par.indexOf('___data__='); if (i < 0) continue;
    let j; try { j = JSON.parse(decodeURIComponent(par.slice(i + 10).replace(/\+/g, ' '))); } catch { continue; }
    const t = j?.addTarget; if (!t) continue;
    const sq = t.query?.structuredQuery;
    if (sq) out.push({ tipo: 'consulta', colecao: sq.from?.[0]?.collectionId || '', filtro: !!sq.where, pai: t.query.parent || '' });
    else if (t.documents) out.push({ tipo: 'documento', docs: t.documents.documents || [] });
  }
  return out;
}

export async function executar({ amb, seed, nav, erroGrave, registrar }) {
  const t0 = Date.now(), hoje = new Date().toISOString().slice(0, 10), k = 'j110-amanda', titulo = '🎬 Distribuir 1 vídeo pros editores (J110)';
  await seed.set('demandas', k, { titulo, descricao: 'Tarefa automática do ensaio J110.', destinatario: 'Amanda', origem: 'sistema', status: 'pendente',
    prazoData: hoje, prazoHora: '18:00', criadoEm: new Date(), excluido: false, provaTexto: '', provaImagemUrl: '' });
  await amb.aguardarFunctionsOciosas?.();
  const { page, erros, fechar } = await nav.novaPagina();
  try {
    page.on('dialog', d => d.accept());
    let contando = false; const alvos = [], completas = [];
    page.on('console', m => { if (contando && /Demandas da gestão: leitura direta da coleção/.test(m.text())) completas.push(m.text()); });
    page.on('request', r => { if (!contando || r.method() !== 'POST' || !/\/Listen\/channel/.test(r.url())) return; alvos.push(...alvosDoCorpo(r.postData())); });
    await entrarComo(page, amb.url(), 'Amanda'); await page.waitForTimeout(2500);
    await page.evaluate(() => irPara('minhasDemandasAtribuidas', document.getElementById('navMinhasDemandasAtribuidas')));
    await page.waitForFunction(t => document.getElementById('view-minhasDemandasAtribuidas')?.innerHTML.includes(t), titulo, { timeout: 20000 });
    await page.waitForTimeout(4000); // ouvintes da gestão já confirmados (a lista acima veio deles)
    await page.evaluate(idd => window.abrirDemandaMinha(idd), k);
    await page.waitForSelector('#provaTextoInput', { timeout: 10000 });
    await page.fill('#provaTextoInput', 'Feito no ensaio J110 pela Amanda.');
    contando = true;
    await page.click('#btnEnviarProva');
    const d = await esperar(async () => { const x = await seed.get('demandas', k); return x?.status === 'aprovada' ? x : null; }, 30000);
    // a lista dela atualiza: a tarefa sai das pendentes (formulário fecha e o cartão some ou vira concluído)
    const saiu = await page.waitForFunction(t => { const v = document.getElementById('view-minhasDemandasAtribuidas'); if (!v) return false;
      const pend = [...v.querySelectorAll('.item')].filter(el => (el.innerText || '').includes(t) && !el.querySelector('.item') && !/aprovad|conclu|fechad/i.test(el.innerText || ''));
      return !document.getElementById('overlayView')?.classList.contains('show') && pend.length === 0; }, titulo, { timeout: 20000 }).then(() => true).catch(() => false);
    const tela = saiu ? '' : await page.evaluate(t => ({ modal: document.getElementById('overlayView')?.classList.contains('show') ? (document.getElementById('modalConteudo')?.innerText || '').replace(/\s+/g, ' ').slice(0, 140) : '',
      cartoes: [...document.querySelectorAll('#view-minhasDemandasAtribuidas .item')].filter(el => (el.innerText || '').includes(t) && !el.querySelector('.item')).map(el => el.innerText.replace(/\s+/g, ' ').slice(0, 120)) }), titulo);
    await page.waitForTimeout(3000);
    contando = false;
    const inteiras = alvos.filter(a => a.tipo === 'consulta' && a.colecao === 'demandas' && !a.filtro && !/\/documents\/./.test(a.pai)).length + completas.length;
    const daDemanda = alvos.filter(a => a.tipo === 'documento' && a.docs.some(x => x.endsWith('/demandas/' + k)));
    const graves = erros.filter(erroGrave);
    await foto(page, 'J110-amanda-concluiu');
    registrar({ jornada: id, caso: '1 Amanda conclui: a tarefa fecha e sai da lista dela na hora', ok: !!d && saiu && !graves.length, ms: Date.now() - t0,
      detalhe: `status ${d?.status || '(não mudou)'} · ${saiu ? 'saiu da lista' : 'NÃO SAIU: ' + JSON.stringify(tela).slice(0, 260)}${graves.length ? ' · erro: ' + graves[0] : ''}` });
    registrar({ jornada: id, caso: '2 depois de concluir, a tela não relê todas as demandas do servidor', ok: inteiras === 0, ms: Date.now() - t0,
      detalhe: `${inteiras} releitura(s) da coleção inteira de demandas · ${daDemanda.length} conferência(s) só da demanda tocada · ${alvos.length} alvo(s) no total` });
  } catch (e) { await foto(page, 'J110-falha'); registrar({ jornada: id, caso: 'gestão confere só a demanda tocada', ok: false, ms: Date.now() - t0, detalhe: String(e).replace(/\s+/g, ' ').slice(0, 300) }); }
  finally { await fechar(); }
  const x = await seed.get('demandas', k); if (x) { const { id: _i, ...dados } = x; await seed.set('demandas', k, { ...dados, excluido: true }); }
}
