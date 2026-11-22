// J105 — CP249 (22/11/2026, caso real): em 20/11 a Amanda enviou os documentos de janeiro da Master Chef e da Divina Cantina e eles foram para
// JANEIRO DE 2026 (mês que já tinha passado). O topo da Central era um campo de mês do navegador ("2026-12"): trocando só o mês, o ano ficava.
// Em janeiro de 2027 o Chris não achava o documento ("sumiu"). Esperado:
//  1. o mês dos conteúdos aparece por extenso, com o ano, e os meses passados vêm marcados "já passou (só consulta)";
//  2. enviar para um mês que já passou é recusado pelo servidor, dizendo o mês por extenso, e nada é gravado;
//  3. a checagem prévia diária acusa, no mês certo, um documento que foi para um mês que já passou (com quem resolve);
//  4. o Raio-X diário acusa o mesmo (regra H1).
// Meses relativos a hoje (a jornada não envelhece): passado = 10 meses atrás (como o caso real), certo = o mesmo mês no ano seguinte.
import path from 'node:path';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { RAIZ, PROJETO } from '../lib/emulador.mjs';
import { entrarComo, foto, abrirMenuSeMovel } from '../lib/navegador.mjs';
export const id = 'J105';
export const nome = 'Documento da Amanda nunca vai para um mês que já passou (mês por extenso, servidor recusa, vigias acusam)';
const { mesPorExtenso, mesAtualBRT, somarMes } = await import(pathToFileURL(path.join(RAIZ, 'gs-estado-mes.mjs')).href);
const ATUAL = mesAtualBRT(), PASSADO = somarMes(ATUAL, -10), CERTO = somarMes(PASSADO, 12);
const CLIENTE = 'stokki', ERRADO = 'zeiss';

async function abrirCentral(page) {
  await page.waitForSelector('#navPlanejamentoPreparacaoR80', { timeout: 20000 });
  await abrirMenuSeMovel(page); await page.click('#navPlanejamentoPreparacaoR80');
  await page.waitForFunction(() => { const v = document.getElementById('view-planejamentoPreparacaoR80'); return v && getComputedStyle(v).display !== 'none' && v.innerText.trim().length > 50; }, null, { timeout: 20000 });
}

export async function executar({ amb, seed, nav, erroGrave, registrar }) {
  const t0 = Date.now();
  const { page, erros, fechar } = await nav.novaPagina();
  try {
    page.on('dialog', d => d.accept());
    await entrarComo(page, amb.url(), 'Amanda'); await page.waitForTimeout(2500);
    await abrirCentral(page); await page.waitForTimeout(3000);
    const v = page.locator('#view-planejamentoPreparacaoR80');
    // 1) o mês dos conteúdos
    const mes = await page.evaluate(([passado, certo]) => { const el = document.querySelector('#view-planejamentoPreparacaoR80 [data-field="competencia"]');
      if (!el) return { existe: false }; const op = [...(el.options || [])];
      return { existe: true, tag: el.tagName, certo: op.find(o => o.value === certo)?.textContent || '', passado: op.find(o => o.value === passado)?.textContent || '' }; }, [PASSADO, CERTO]);
    registrar({ jornada: id, caso: '1 mês dos conteúdos por extenso, com o ano; meses passados marcados', ok: mes.tag === 'SELECT' && mes.certo.startsWith(mesPorExtenso(CERTO)) && mes.passado.startsWith(mesPorExtenso(PASSADO)) && /já passou/.test(mes.passado), ms: Date.now() - t0,
      detalhe: mes.existe ? `${mes.tag} · ${CERTO}="${mes.certo}" · ${PASSADO}="${mes.passado}"` : 'campo do mês não encontrado' });
    // 2) tentar enviar para o mês que já passou (o gesto da Amanda em 20/11)
    const campo = v.locator('[data-field="competencia"]').first();
    if (mes.tag === 'SELECT') await campo.selectOption(PASSADO); else { await campo.fill(PASSADO); await campo.dispatchEvent('change'); }
    await page.waitForFunction(m => (document.getElementById('view-planejamentoPreparacaoR80')?.innerText || '').includes(m), mesPorExtenso(PASSADO), { timeout: 15000 }).catch(() => {});
    await page.waitForTimeout(2500);
    const aviso = await page.evaluate(() => !!document.querySelector('#view-planejamentoPreparacaoR80 [data-mes-passado-cp249]'));
    const sel = v.locator('select[data-field="documentoClienteCp120"]').first(); await sel.waitFor({ timeout: 15000 }); await sel.selectOption(CLIENTE);
    await v.getByRole('button', { name: /Abrir documentos deste cliente/ }).click();
    await v.getByRole('button', { name: /^Confirmar esta ação$/ }).click({ timeout: 10000 }).catch(() => {});
    const msg = await page.waitForFunction(() => { const t = document.getElementById('view-planejamentoPreparacaoR80')?.innerText || ''; return /já passou\. Nada foi gravado/.test(t) || /No ciclo|revisão \d/.test(t) ? t : null; }, null, { timeout: 20000 }).then(h => h.jsonValue()).catch(() => '');
    await page.waitForTimeout(1500);
    const criado = (await seed.listar('planejamento_social_i155')).some(c => c.id === `${PASSADO}__${CLIENTE}`);
    const recusa = /já passou\. Nada foi gravado/.test(msg) && msg.includes(mesPorExtenso(PASSADO).replace(/^./, c => c.toUpperCase())) && msg.includes(mesPorExtenso(CERTO));
    const graves = erros.filter(erroGrave);
    await foto(page, 'J105-amanda-mes-passado');
    registrar({ jornada: id, caso: '2 enviar para um mês que já passou é recusado e nada é gravado', ok: recusa && !criado && aviso && !graves.length, ms: Date.now() - t0,
      detalhe: `recusa ${recusa ? 'sim' : 'NÃO'} · ciclo ${PASSADO}__${CLIENTE} ${criado ? 'CRIADO' : 'não criado'} · aviso na tela ${aviso ? 'sim' : 'NÃO'}${graves.length ? ' · erro: ' + graves[0] : ''}` });
  } catch (e) { await foto(page, 'J105-falha'); registrar({ jornada: id, caso: 'documento no mês errado (tela/servidor)', ok: false, ms: Date.now() - t0, detalhe: String(e).replace(/\s+/g, ' ').slice(0, 300) }); }
  finally { await fechar(); }

  // 3 e 4) vigias: um documento que já está num mês passado (o caso real) aparece no mês certo
  const errado = `${PASSADO}__${ERRADO}`, enviadoEm = new Date().toISOString();
  await seed.set('planejamento_social_i155', errado, { schema: 1, cliente: ERRADO, clienteNome: 'Zeiss', competencia: PASSADO, incluido: true, criadoEm: enviadoEm, autorNome: 'Amanda', revisao: 2,
    documentos: { consolidadoEnviado: 'doc_campanha_j105', enviadoPor: 'Amanda', enviadoEm } });
  let app;
  try {
    process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:' + amb.portas.firestore;
    const req = createRequire(path.join(RAIZ, 'functions-get/package.json'));
    const { initializeApp, getApps } = req('firebase-admin/app'), { getFirestore } = req('firebase-admin/firestore');
    app = getApps().find(a => a.name === 'ensaio-j105') || initializeApp({ projectId: PROJETO }, 'ensaio-j105');
    const db = getFirestore(app);
    const pv = await import(pathToFileURL(path.join(RAIZ, '.github/scripts/prevoo-calendarios.mjs')).href);
    const linha = (await pv.prevooCalendarios(db, { competencias: [CERTO] })).find(l => l.cliente === ERRADO);
    const txt = (linha?.itens || []).join(' | ');
    registrar({ jornada: id, caso: '3 checagem prévia acusa o documento que foi para um mês que já passou', ok: txt.includes(`foi para ${mesPorExtenso(PASSADO)}`) && /reenviar/.test(linha?.quem || ''), ms: Date.now() - t0,
      detalhe: linha ? `${linha.nivel}: ${txt.slice(0, 200)} · quem: ${linha.quem}` : `${ERRADO} fora da checagem de ${CERTO}` });
    const rx = await import(pathToFileURL(path.join(RAIZ, '.github/scripts/raio-x-operacao.mjs')).href);
    const out = rx.raioXOperacao(await rx.lerDadosRaioX(db), new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' }));
    const h1 = out.find(o => o.regra.startsWith('H1') && o.ref === errado);
    registrar({ jornada: id, caso: '4 Raio-X acusa o mesmo documento (H1)', ok: !!h1 && h1.detalhe.includes(mesPorExtenso(CERTO)), ms: Date.now() - t0, detalhe: h1 ? `${h1.grav}: ${h1.detalhe}` : 'H1 não acusou' });
    await db.doc('planejamento_social_i155/' + errado).delete(); // dado só do ensaio
  } catch (e) { registrar({ jornada: id, caso: '3/4 vigias do documento no mês errado', ok: false, ms: Date.now() - t0, detalhe: String(e).replace(/\s+/g, ' ').slice(0, 300) }); }
}
