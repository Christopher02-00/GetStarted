// J101 — CP247 (21/11/2026, achado do robô de cliques J98 no CI): em Postagens, "Compromissos da programação" dizia só
// "Não consegui conferir N conteúdo(s). A fila e os campos anteriores foram mantidos." — sem dizer quais nem por quê, e sem saída.
// Esperado: a Cecília vê cada conteúdo não conferido com cliente · título, o motivo do servidor e o botão "Abrir este conteúdo na fila",
// que abre a ficha da postagem.
//  2. O vigia diário da operação (Raio-X, regra D5) roda a mesma conferência do servidor, só leitura, e acusa essa postagem.
import path from 'node:path';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { RAIZ, PROJETO } from '../lib/emulador.mjs';
import { entrarComo, foto } from '../lib/navegador.mjs';
export const id = 'J101';
export const nome = 'Fila de programação diz quais conteúdos não conferiu, por quê, e abre cada um';
const POST = 'j101-post', TITULO = 'Sorvete de matcha (J101)';

export async function executar({ amb, seed, nav, erroGrave, registrar }) {
  const t0 = Date.now(), hoje = new Date().toISOString().slice(0, 10);
  const amanha = new Date(Date.now() + 864e5).toISOString().slice(0, 10);
  // postagem agendada com a origem editorial incompleta (tem o conteúdo, falta o calendário e o mês) — o servidor recusa conferir
  await seed.set('postagens', POST, { cliente: 'mochi', clienteNome: 'Mochi', titulo: TITULO, legenda: 'Legenda J101', status: 'agendado', dataAgendada: amanha, horaAgendada: '11:00',
    calendarItemId: 'calitem_j101', origemManual: true, excluido: false, criadoEm: new Date().toISOString() });
  await amb.aguardarFunctionsOciosas?.();
  const { page, erros, fechar } = await nav.novaPagina();
  try {
    page.on('dialog', d => d.accept());
    await entrarComo(page, amb.url(), 'Cecília'); await page.waitForTimeout(3000);
    await page.evaluate(() => irPara('postagens', document.getElementById('navPostagens')));
    const achou = await page.waitForFunction(t => [...document.querySelectorAll('[data-i165-resumo="postagem"]')].some(s => s.innerText.includes(t) || /Não consegui conferir/.test(s.innerText)), TITULO, { timeout: 45000 }).then(() => true).catch(() => false);
    const tela = await page.evaluate(id => { const s = [...document.querySelectorAll('[data-i165-resumo="postagem"]')].map(x => x.innerText).join('\n'); const bloco = document.querySelector('[data-i165-nao-conferidos]');
      return { texto: s.replace(/\s+/g, ' '), bloco: bloco?.innerText.replace(/\s+/g, ' ') || '', botao: !!bloco?.querySelector(`[data-i165-abrir="${id}"]`) }; }, POST);
    let abriu = false;
    if (tela.botao) { await page.locator(`[data-i165-nao-conferidos] [data-i165-abrir="${POST}"]`).click(); abriu = await page.waitForFunction(() => document.getElementById('overlayView')?.classList.contains('show') || /Sorvete de matcha/.test(document.getElementById('modalConteudo')?.innerText || ''), null, { timeout: 15000 }).then(() => true).catch(() => false); }
    const graves = erros.filter(erroGrave);
    await foto(page, 'J101-cecilia');
    registrar({ jornada: id, caso: '1 Cecília vê qual conteúdo não foi conferido, o motivo e abre a ficha', ok: achou && tela.bloco.includes(TITULO) && /Confira os três identificadores/.test(tela.bloco) && tela.botao && abriu && !/Não consegui conferir/.test(tela.texto) && !graves.length, ms: Date.now() - t0,
      detalhe: `lista ${tela.bloco ? '“' + tela.bloco.slice(0, 200) + '”' : 'NÃO'} · botão ${tela.botao ? 'sim' : 'NÃO'} · abriu ${abriu ? 'sim' : 'NÃO'}${/Não consegui conferir/.test(tela.texto) ? ' · AINDA "Não consegui conferir"' : ''}${graves.length ? ' · erro: ' + graves[0] : ''}` });
  } catch (e) { await foto(page, 'J101-falha'); registrar({ jornada: id, caso: 'fila diz o que não conferiu', ok: false, ms: Date.now() - t0, detalhe: String(e).replace(/\s+/g, ' ').slice(0, 260) }); }
  finally { await fechar(); }
  // 2) vigia da operação com o banco do ensaio (mesmo código que roda todo dia nos dados reais)
  try {
    process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:' + amb.portas.firestore;
    const req = createRequire(path.join(RAIZ, 'functions-get/package.json'));
    const { initializeApp, getApps } = req('firebase-admin/app'), { getFirestore } = req('firebase-admin/firestore');
    const app = getApps().find(a => a.name === 'ensaio-j101') || initializeApp({ projectId: PROJETO }, 'ensaio-j101');
    const rx = await import(pathToFileURL(path.join(RAIZ, '.github/scripts/raio-x-operacao.mjs')).href);
    const dados = await rx.lerDadosRaioX(getFirestore(app)), out = rx.raioXOperacao(dados, hoje);
    const d5 = out.find(o => o.regra.startsWith('D5') && o.ref === POST);
    registrar({ jornada: id, caso: '2 vigia da operação acusa a postagem que o servidor não confere (D5, vermelho)', ok: d5?.grav === 'vermelho' && /Confira os três identificadores/.test(d5.detalhe), ms: Date.now() - t0,
      detalhe: d5 ? `${d5.grav}: ${d5.detalhe.slice(0, 160)}` : `D5 não acusou (${dados.__naoConferidas?.length ?? '-'} não conferidas no total)` });
  } catch (e) { registrar({ jornada: id, caso: '2 vigia da operação (D5)', ok: false, ms: Date.now() - t0, detalhe: String(e).replace(/\s+/g, ' ').slice(0, 260) }); }
  const x = await seed.get('postagens', POST); if (x) { const { id: _i, ...dados } = x; await seed.set('postagens', POST, { ...dados, excluido: true }); }
}
