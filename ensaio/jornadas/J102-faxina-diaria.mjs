// J102 — CP248 (21/11/2026, decisão do Chris: "correção definitiva" dos números enormes de abertos da Amanda e da Cecília, opções recomendadas).
// A faxina do servidor (a cada 2 h) roda aqui com o banco do ensaio, como se 3 dias tivessem passado:
//  1. Postagem agendada pela Cecília (legenda e agendamento pela tela, como na J04), 2 dias depois da data: vira publicada pelo caminho oficial
//     ("Sistema (confirmação automática)", vídeo finalizado) e sai de "Publicações para conferir" da Cecília.
//  2. A mesma faxina, rodando no horário real (data ainda não vencida), não toca na postagem (a Cecília confirma ou retira antes).
//  3. Tarefa antiga do sistema concluída pela Amanda e presa em "aguardando aprovação" fecha (legado), e sai do "Aguardando" da tela dela.
//  4. Stokki (confirmação por plataforma) não é confirmada sozinha: fica com a Cecília e aparece no relatório.
//  5. O relatório da rodada fica em sistema/faxina_cp248.
//  6. O legado (sem nenhuma escrita, como as 143 de produção) é fechado pela própria faxina (banco em memória, sem gatilho).
//  8. Produção: o agendamento de 5 min só pede a rodada; a função própria (gatilho do pedido) roda e grava o relatório.
import path from 'node:path';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { RAIZ, PROJETO } from '../lib/emulador.mjs';
import { entrarComo, foto } from '../lib/navegador.mjs';
export const id = 'J102';
export const nome = 'Faxina do servidor: agendada vencida vira publicada, tarefa sem aprovador fecha, Stokki fica com a Cecília';
const VID = 'j102-video', POST = 'video_' + VID, TIT = 'Mochi — Vídeo J102 da faxina', DEM = 'j102-legado-amanda', STK = 'j102-stokki';
const esperar = async (fn, ms = 20000) => { const f = Date.now() + ms; let r; while (Date.now() < f) { r = await fn(); if (r) return r; await new Promise(x => setTimeout(x, 1000)); } return r; };
const agoraSP = () => { const p = Object.fromEntries(new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date()).map(x => [x.type, x.value])); return { data: `${p.year}-${p.month}-${p.day}`, min: Number(p.hour) * 60 + Number(p.minute) }; };
const ontemSP = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date(Date.now() - 864e5));
const passadoSP = () => { const a = agoraSP(); return a.min >= 40 ? { data: a.data, agenda: '00:01' } : { data: ontemSP(), agenda: '23:30' }; };

export async function executar({ amb, seed, nav, erroGrave, registrar }) {
  const t0 = Date.now(), fim = (caso, ok, detalhe) => registrar({ jornada: id, caso, ok, ms: Date.now() - t0, detalhe });
  const hoje = new Date().toISOString().slice(0, 10), origem = { calendarItemId: null, calendarItemIdx: null, calendarClienteSlug: null, calendarCompetencia: null, vinculoSessao: 'declarado_em_campo' };
  await seed.set('videos_producao', VID, { cliente: 'mochi', clienteNome: 'Mochi', titulo: TIT, status: 'aprovado', clienteAprovou: true, clienteAprovouPor: 'Amanda', aprovadoPor: 'Chris',
    linkFinalizado: 'https://drive.google.com/file/d/EnsaioJ102/view', postagemId: POST, data: hoje, criadoEm: new Date(), excluido: false, ...origem });
  await seed.set('postagens', POST, { videoId: VID, cliente: 'mochi', clienteNome: 'Mochi', titulo: TIT, linkVideo: 'https://drive.google.com/file/d/EnsaioJ102/view', legenda: '', status: 'aguardando_legenda',
    demandaLegendaCriada: true, excluido: false, criadoEm: new Date(), ...origem });
  await seed.set('demandas', DEM, { titulo: '🎬 Distribuir 3 vídeo(s) pros editores (J102)', descricao: 'Tarefa automática antiga (J102)', destinatario: 'Amanda', origem: 'sistema', status: 'concluida_aguardando_aprovacao',
    provaTexto: 'Distribuídos (J102)', provaImagemUrl: '', concluidaEm: '2026-08-20T12:00:00.000Z', prazoData: '2026-08-20', prazoHora: '19:00', criadoEm: '2026-08-20T09:00:00.000Z', excluido: false });
  await seed.set('postagens', STK, { cliente: 'stokki', clienteNome: 'Stokki', titulo: 'Stokki — post J102', status: 'agendado', dataAgendada: '2026-11-10', horaAgendada: '10:00', excluido: false, criadoEm: new Date(),
    publicacaoStokki: { versao: 1, selecionadas: ['instagram', 'linkedin'], redes: {} } });
  await amb.aguardarFunctionsOciosas?.();
  const passo = async (pessoa, acao) => { const { page, erros, fechar } = await nav.novaPagina(); try { page.on('dialog', d => d.accept()); await entrarComo(page, amb.url(), pessoa); await page.waitForTimeout(2500); await acao(page); return erros.filter(erroGrave); } finally { await fechar(); } };
  // legenda (Chris) e agendamento (Cecília) pela tela — caminho real, como na J04
  try {
    await passo('Chris', async page => {
      await page.evaluate(() => irPara('postagens', document.getElementById('navPostagens')));
      await page.evaluate(() => setPostagensSub('legenda', null)); await page.waitForTimeout(1500);
      await page.evaluate(() => mudarEtapaLegendasI66('videos'));
      await page.waitForSelector(`#legenda_${POST}`, { timeout: 15000 }); await page.fill(`#legenda_${POST}`, 'Legenda do ensaio J102 #mochi');
      await page.evaluate(p => window.salvarLegenda(p), POST);
      await esperar(async () => (await seed.get('postagens', POST))?.status === 'aguardando_agendamento');
    });
    const { data, agenda } = passadoSP();
    await passo('Cecília', async page => {
      await page.evaluate(() => irPara('postagens', document.getElementById('navPostagens')));
      await page.evaluate(() => { try { setPostagensSub('agendar', null); } catch (e) {} });
      await page.waitForSelector(`#dataPost_${POST}`, { timeout: 15000 });
      await page.fill(`#dataPost_${POST}`, data); await page.fill(`#horaPost_${POST}`, agenda);
      await page.evaluate(p => window.salvarAgendamentoPostagem(p), POST);
      const check = page.getByText(/Conferi a origem, a data e o horário/).first(); await check.waitFor({ timeout: 15000 }); await check.click();
      await page.getByRole('button', { name: /^Salvar agendamento$/ }).click({ timeout: 10000 });
      await esperar(async () => (await seed.get('postagens', POST))?.status === 'agendado');
    });
  } catch (e) { fim('preparação (legenda e agendamento pela tela)', false, String(e).replace(/\s+/g, ' ').slice(0, 240)); return; }
  const agendada = await seed.get('postagens', POST);
  if (agendada?.status !== 'agendado') { fim('preparação (legenda e agendamento pela tela)', false, 'postagem não ficou agendada: ' + agendada?.status); return; }
  await amb.aguardarFunctionsOciosas?.();

  process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:' + amb.portas.firestore;
  const req = createRequire(path.join(RAIZ, 'functions-get/package.json'));
  const { initializeApp, getApps } = req('firebase-admin/app'), { getFirestore } = req('firebase-admin/firestore');
  const db = getFirestore(getApps().find(a => a.name === 'ensaio-j102') || initializeApp({ projectId: PROJETO }, 'ensaio-j102'));
  const fx = await import(pathToFileURL(path.join(RAIZ, 'functions-get/faxina-diaria-cp248.mjs')).href);

  // 2) no horário real a data ainda não venceu: nada muda
  try { const r0 = await fx.executarFaxinaCp248(db, { gravarRelatorio: false }); const p0 = await seed.get('postagens', POST);
    fim('2 faxina no horário real não toca na agendada ainda não vencida', p0?.status === 'agendado' && !r0.publicadas.includes(POST), `postagem ${p0?.status} · publicadas nesta rodada: ${r0.publicadas.length}`);
  } catch (e) { fim('2 faxina no horário real', false, String(e).slice(0, 240)); }

  // 1, 3, 4, 5) três dias depois
  let r = null;
  try { r = await fx.executarFaxinaCp248(db, { agora: new Date(Date.now() + 3 * 864e5) }); } catch (e) { fim('faxina 3 dias depois', false, String(e).replace(/\s+/g, ' ').slice(0, 240)); return; }
  await amb.aguardarFunctionsOciosas?.();
  const p1 = await seed.get('postagens', POST), v1 = await seed.get('videos_producao', VID);
  let naFila = null;
  const graves1 = await passo('Cecília', async page => {
    await page.evaluate(() => irPara('postagens', document.getElementById('navPostagens')));
    await page.evaluate(() => { try { setPostagensSub('confirmar', null); } catch (e) {} }); await page.waitForTimeout(4000);
    naFila = await page.evaluate(t => (document.getElementById('filaPublicacoesCp125')?.innerText || '').includes(t), TIT);
    await foto(page, 'J102-cecilia');
  });
  fim('1 agendada com 2 dias passados vira publicada (caminho oficial) e sai da fila da Cecília', p1?.status === 'postado' && p1?.postadoPor === fx.POR_CP248 && p1?.confirmacaoAutomaticaCp248?.schema === 1 && p1?.provasPublicacaoI165?.geral?.automaticaCp248 === true && v1?.status === 'finalizado' && naFila === false && !graves1.length,
    `postagem ${p1?.status} por ${p1?.postadoPor || '-'} · vídeo ${v1?.status} · na fila da Cecília ${naFila ? 'AINDA' : 'não'}${graves1.length ? ' · erro: ' + graves1[0] : ''}`);
  const d1 = await seed.get('demandas', DEM);
  let aguardando = null;
  const graves3 = await passo('Amanda', async page => {
    await page.evaluate(() => irPara('minhasDemandasAtribuidas', document.getElementById('navMinhasDemandasAtribuidas'))); await page.waitForTimeout(3000);
    aguardando = await page.evaluate(t => (document.getElementById('view-minhasDemandasAtribuidas')?.innerText || '').includes(t), 'Distribuir 3 vídeo(s) pros editores (J102)');
  });
  fim('3 tarefa antiga do sistema da Amanda fecha e sai da tela dela', d1?.status === 'aprovada' && d1?.fechamentoSemAprovadorCp245?.schema === 1 && /J102/.test(d1?.provaTexto || '') && aguardando === false && !graves3.length,
    `status ${d1?.status} · marca ${d1?.fechamentoSemAprovadorCp245 ? 'sim' : 'NÃO'} · prova intacta ${/J102/.test(d1?.provaTexto || '') ? 'sim' : 'NÃO'} · na tela ${aguardando ? 'AINDA' : 'não'}${graves3.length ? ' · erro: ' + graves3[0] : ''}`);
  const s1 = await seed.get('postagens', STK);
  // CP262 (23/11): a Stokki é confirmada por plataforma vencida (J116); sem plataforma agendada vencida, nada é tocado
  fim('4 Stokki sem plataforma vencida não é tocada', s1?.status === 'agendado' && !r.publicadas.some(x => String(x).startsWith(STK)), `Stokki ${s1?.status} · confirmadas ${r.publicadas.filter(x => String(x).startsWith(STK)).length}`);
  const rel = await seed.get('sistema', 'faxina_cp248');
  fim('5 relatório da rodada em sistema/faxina_cp248', !!rel?.totais && rel.totais.publicadas >= 1 && Array.isArray(rel.publicadas) && rel.publicadas.includes(POST), rel?.totais ? JSON.stringify(rel.totais) : 'sem relatório');
  // 6) o legado de verdade não recebe escrita (em produção nenhum gatilho dispara nas 143 antigas): a faxina sozinha fecha.
  //    No emulador o gatilho da CP245 fecha a tarefa semeada na hora; aqui a mesma rodada roda sobre um banco em memória sem gatilho.
  try {
    const docs = new Map([['demandas/legado-j102', { titulo: '📸 Aprovar os stories (legado J102)', destinatario: 'Amanda', origem: 'sistema', status: 'concluida_aguardando_aprovacao', provaTexto: 'feito', excluido: false }]]);
    const snap = (k) => ({ exists: docs.has(k), id: k.split('/').pop(), data: () => docs.get(k) && structuredClone(docs.get(k)) });
    const mem = { doc: k => ({ path: k, get: async () => snap(k), set: async v => { docs.set(k, v); } }),
      collection: c => ({ where: (campo, _op, valor) => ({ get: async () => ({ docs: [...docs.keys()].filter(k => k.startsWith(c + '/') && docs.get(k)[campo] === valor).map(k => ({ ...snap(k), ref: mem.doc(k) })) }) }) }),
      runTransaction: async fn => fn({ get: async r => snap(r.path), update: (r, v) => docs.set(r.path, { ...docs.get(r.path), ...v }) }) };
    const rm = await fx.executarFaxinaCp248(mem, { agora: new Date() }), d = docs.get('demandas/legado-j102');
    fim('6 faxina fecha o legado sem nenhuma escrita prévia (como as 143 de produção)', rm.fechadasSemAprovador.includes('legado-j102') && d.status === 'aprovada' && d.fechamentoSemAprovadorCp245?.schema === 1 && d.provaTexto === 'feito' && !!docs.get('sistema/faxina_cp248'),
      `fechadas ${rm.fechadasSemAprovador.length} · status ${d.status} · relatório ${docs.get('sistema/faxina_cp248') ? 'sim' : 'NÃO'}`);
    // 7) no agendamento de 5 min: logo depois de uma rodada completa, espera 2 h; rodada parcial (limite de tempo) roda de novo na próxima volta
    const a1 = await fx.faxinaSeDevidaCp248(mem, { agora: new Date() });
    docs.set('sistema/faxina_cp248', { ...docs.get('sistema/faxina_cp248'), parcial: true });
    const a2 = await fx.faxinaSeDevidaCp248(mem, { agora: new Date() });
    const a3 = await fx.faxinaSeDevidaCp248(mem, { agora: new Date(Date.now() + 2.1 * 3600e3) });
    fim('7 faxina no agendamento de 5 min: espera 2 h, retoma rodada parcial', a1.estado === 'aguardando' && a2.estado === 'completa' && a3.estado === 'completa', `logo depois: ${a1.estado} · após parcial: ${a2.estado} · 2 h depois: ${a3.estado}`);
  } catch (e) { fim('6/7 faxina no banco em memória', false, String(e).replace(/\s+/g, ' ').slice(0, 240)); }
  // 8) produção: o agendamento só PEDE (sistema/faxina_cp248_pedido) e a função própria roda a rodada — aqui o gatilho real do emulador
  try {
    const antes = Date.now();
    await db.doc('sistema/faxina_cp248').set({ em: new Date(Date.now() - 3 * 3600e3).toISOString(), parcial: false, emAndamento: false, totais: {} });
    const ped = await fx.pedirFaxinaSeDevidaCp248(db, { agora: new Date() });
    const rel8 = await esperar(async () => { const x = await seed.get('sistema', 'faxina_cp248'); return x && Date.parse(x.em) >= antes - 1000 && x.emAndamento === false ? x : null; }, 90000);
    const ped2 = await fx.pedirFaxinaSeDevidaCp248(db, { agora: new Date() });
    fim('8 o agendamento só pede; a função própria roda a rodada e grava o relatório; logo depois não pede de novo', ped.estado === 'pedida' && !!rel8 && ['aguardando', 'pedido_recente'].includes(ped2.estado),
      `pedido: ${ped.estado} · relatório da função: ${rel8 ? JSON.stringify(rel8.totais) : 'NÃO chegou'} · logo depois: ${ped2.estado}`);
  } catch (e) { fim('8 faxina pela função própria', false, String(e).replace(/\s+/g, ' ').slice(0, 240)); }
  // limpeza
  for (const [c, k] of [['postagens', POST], ['postagens', STK], ['videos_producao', VID], ['demandas', DEM]]) { const x = await seed.get(c, k); if (!x) continue; const { id: _i, ...dados } = x; await seed.set(c, k, { ...dados, excluido: true }); }
}
