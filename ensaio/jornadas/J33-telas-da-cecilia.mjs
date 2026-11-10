// J33 — Telas da Cecília sem travas (U4, áudios de 04–05/11/2026).
// A) recusa do servidor ("A postagem mudou em outra aba") não deixa aviso vermelho nem "Tentativa anterior" guardada;
// C) "✔ Saiu no horário" confirma a publicação com um toque; E) "Não precisa agendar": a Cecília retira sozinha, com motivo;
// B) aviso "Amanda está esperando você" tem saída: "Já respondi" tira das atrasadas.
import { entrarComo, foto, entrarGerencia } from '../lib/navegador.mjs';
export const id = 'J33';
export const nome = 'Cecília: recusa sem lixo, publicação em um toque, retira sem publicar, aviso com saída';
const esperar = async (fn, ms = 15000) => { const fim = Date.now() + ms; while (Date.now() < fim) { const r = await fn(); if (r) return r; await new Promise(r => setTimeout(r, 1000)); } return null; };
const hojeSP = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date());
const VIDS = [['j33-v-pub', 'Ensaio J33 publicação rápida'], ['j33-v-ret', 'Ensaio J33 vídeo de telão']];

export async function executar({ amb, seed, nav, erroGrave, registrar }) {
  const agora = new Date().toISOString();
  for (const [vid, titulo] of VIDS) await seed.set('videos_producao', vid, {
    cliente: 'mochi', clienteNome: 'Mochi', titulo, status: 'aguardando_cliente', data: hojeSP(), editorAtribuido: 'Helo', editorAtribuidoEm: agora,
    editorAtribuidoPor: 'Amanda', enviadoEm: agora, linkFinalizado: 'https://drive.google.com/file/d/' + vid + '/view', aprovadoInternoEm: agora,
    aprovadoPor: 'Chris', clienteAprovou: false, ultimaCorrecaoSolicitada: '', enviadoParaCliente: false, criadoEm: agora, excluido: false, nivelEscalonamento: 0 });
  // B) aviso de espera cuja origem é uma demanda especial da Amanda (o caso do print: origem "indisponível")
  await seed.set('demandas', 'j33-origem', { titulo: 'URGENTE: conferir acessos (ensaio J33)', descricao: 'Ensaio', destinatario: 'Amanda', remetente: 'Chris', origem: 'chris', status: 'pendente', prazoData: '2026-11-02', prazoHora: '19:00', tipoEspecial: 'acesso_upload_post_ensaio', bloqueio: { pessoa: 'Cecília', texto: 'Aguardando disponibilidade', desde: agora, por: 'Amanda' }, criadoEm: agora, excluido: false });
  await seed.set('demandas', 'j33-aviso', { titulo: 'Amanda está esperando você — Aguardando disponibilidade (J33)', descricao: 'Ensaio', destinatario: 'Cecília', remetente: 'Amanda', origem: 'amanda', status: 'pendente', tipoEspecial: 'aguardando_resposta', demandaOrigemId: 'j33-origem', prazoData: '2026-11-02', prazoHora: '18:00', criadoEm: agora, excluido: false });

  const passo = async (caso, pessoa, acao, verificar) => {
    const { page, erros, fechar } = await nav.novaPagina(); const t0 = Date.now();
    try { page.on('dialog', d => d.accept()); await entrarComo(page, amb.url(), pessoa); await page.waitForTimeout(2500);
      const extra = await acao(page); const res = await verificar(page, extra); const graves = erros.filter(erroGrave);
      await foto(page, 'J33-' + caso.replace(/\W+/g, '_'));
      registrar({ jornada: id, caso, ok: !!res && !graves.length, ms: Date.now() - t0, detalhe: (res ? String(res) : 'estado esperado não chegou') + (graves.length ? ' | ' + graves[0] : '') }); return !!res;
    } catch (e) { await foto(page, 'J33-' + caso.replace(/\W+/g, '_') + '-falha'); registrar({ jornada: id, caso, ok: false, ms: Date.now() - t0, detalhe: String(e).slice(0, 220) }); return false; }
    finally { await fechar(); }
  };
  const post = async vid => (await seed.listar('postagens')).find(p => p.videoId === vid && !p.excluido);

  // preparo: Amanda confirma o cliente nos dois vídeos → Chris escreve as legendas
  if (!await passo('preparo Amanda confirma cliente', 'Amanda', async page => {
    await entrarGerencia(page); await page.evaluate(() => navegarGerenciaSub('aprovarVideos'));
    for (const [vid] of VIDS) { const b = page.locator(`[onclick*="marcarClienteAprovouVideo('${vid}')"]`).first(); await b.waitFor({ timeout: 15000 }); await b.click(); await esperar(async () => (await post(vid)) ? 1 : null); }
  }, async () => { const a = await post(VIDS[0][0]), b = await post(VIDS[1][0]); return a && b ? 'postagens ' + a.status + ' / ' + b.status : null; })) return;
  if (!await passo('preparo Chris escreve legendas', 'Chris', async page => {
    await page.evaluate(() => irPara('postagens', document.getElementById('navPostagens')));
    await page.evaluate(() => setPostagensSub('legenda', null)); await page.waitForTimeout(1500); await page.evaluate(() => mudarEtapaLegendasI66('videos'));
    for (const [vid, titulo] of VIDS) { const p = await post(vid); await page.waitForSelector(`#legenda_${p.id}`, { timeout: 15000 });
      await page.fill(`#legenda_${p.id}`, 'Legenda real do ensaio J33 — ' + titulo + ' #mochi'); await page.evaluate(x => window.salvarLegenda(x), p.id);
      await esperar(async () => (await post(vid))?.status === 'aguardando_agendamento' ? 1 : null); }
  }, async () => { const a = await post(VIDS[0][0]), b = await post(VIDS[1][0]); return a?.status === 'aguardando_agendamento' && b?.status === 'aguardando_agendamento' ? 'as duas na fila da Cecília' : null; })) return;
  const P1 = (await post(VIDS[0][0])).id, P2 = (await post(VIDS[1][0])).id;
  // preparo: Cecília agenda a P1 para hoje 00:01 (já passou → entra em "Publicações para conferir")
  if (!await passo('preparo Cecília agenda', 'Cecília', async page => {
    await page.evaluate(() => irPara('postagens', document.getElementById('navPostagens'))); await page.evaluate(() => { try { setPostagensSub('agendar', null); } catch (e) {} });
    await page.waitForSelector(`#dataPost_${P1}`, { timeout: 15000 }); await page.fill(`#dataPost_${P1}`, hojeSP()); await page.fill(`#horaPost_${P1}`, '00:01');
    await page.evaluate(p => window.salvarAgendamentoPostagem(p), P1);
    const check = page.getByText(/Conferi a origem, a data e o horário/).first(); await check.waitFor({ timeout: 15000 }); await check.click();
    await page.getByRole('button', { name: /^Salvar agendamento$/ }).click({ timeout: 10000 });
  }, () => esperar(async () => (await seed.get('postagens', P1))?.status === 'agendado' ? 'P1 agendada' : null))) return;

  // A) a postagem muda enquanto a ficha está aberta → recusa sem lixo
  await passo('A recusa do servidor não fica guardada', 'Cecília', async page => {
    await page.evaluate(() => irPara('postagens', document.getElementById('navPostagens'))); await page.evaluate(() => setPostagensSub('confirmar', null));
    await page.waitForFunction(() => /Publicações para conferir · [1-9]/.test(document.getElementById('view-postagens')?.innerText || ''), null, { timeout: 25000 });
    await page.locator(`[data-cp125-post="${P1}"]:not([data-cp125-rapida])`).first().click();
    await page.locator('text=Conferir a publicação real').first().waitFor({ timeout: 15000 });
    await page.locator('input[type="date"]:visible').last().fill(hojeSP()); await page.locator('input[type="time"]:visible').last().fill('00:15');
    await page.locator('textarea:visible').last().fill('feito');
    const atual = await seed.get('postagens', P1); await seed.set('postagens', P1, { ...atual, observacaoEnsaioJ33: 'mudou em outra aba' }); await page.waitForTimeout(2500);
    await page.locator('button:visible').filter({ hasText: /Confirmar que foi publicado/ }).last().click();
    await page.waitForTimeout(9000);
    return page.evaluate(() => ({ alerta: [...document.querySelectorAll('[data-post165-erro]')].map(e => e.textContent.trim()).filter(Boolean).join(' | '),
      tentativa: /Tentativa anterior|Esta tentativa anterior permanece guardada/.test(document.body.innerText),
      guardadas: Object.keys(localStorage).filter(k => k.startsWith('get_postagem_i165_v1_')).map(k => { try { return JSON.parse(localStorage.getItem(k)).estado; } catch { return '?'; } }).filter(e => ['incerta', 'enviando', 'conferindo'].includes(e)).length }));
  }, async (_p, r) => (!r.alerta && !r.tentativa && !r.guardadas) ? 'sem alerta vermelho, sem tentativa guardada' : null);

  // C) um toque: "Saiu no horário"
  await passo('C publicação confirmada em um toque', 'Cecília', async page => {
    await page.evaluate(() => irPara('postagens', document.getElementById('navPostagens'))); await page.evaluate(() => setPostagensSub('confirmar', null));
    const b = page.locator(`[data-cp125-post="${P1}"][data-cp125-rapida]`).first(); await b.waitFor({ timeout: 25000 }); await b.click();
  }, () => esperar(async () => { const p = await seed.get('postagens', P1); return p?.status === 'postado' ? 'P1 postado' : null; }, 25000));

  // E) "Não precisa agendar": a Cecília retira sozinha, com motivo (decisão do Chris, 10/11/2026)
  await passo('E Cecília retira o vídeo de telão da fila', 'Cecília', async page => {
    await page.evaluate(() => irPara('postagens', document.getElementById('navPostagens'))); await page.evaluate(() => { try { setPostagensSub('agendar', null); } catch (e) {} });
    const b = page.locator(`[onclick*="marcarPostagemSemAgendamento('${P2}')"]`).first(); await b.waitFor({ timeout: 15000 }); await b.click();
    await page.locator('text=Encerrar sem publicação').first().waitFor({ timeout: 15000 });
    await page.locator('textarea:visible').last().fill('Vídeo de telão, não vai ser publicado.');
    await page.locator('button:visible').filter({ hasText: /^Encerrar sem publicar$/ }).last().click();
  }, () => esperar(async () => { const p = await seed.get('postagens', P2); return p?.status === 'arquivada_sem_postagem' ? 'P2 arquivada_sem_postagem por ' + p.arquivadaPor + ' · motivo: ' + p.notaCorrecao : null; }, 20000));

  // B) aviso de espera tem saída
  await passo('B aviso de espera sai das atrasadas', 'Cecília', async page => {
    await page.evaluate(() => window.abrirDemandaMinha('j33-aviso'));
    await page.locator('#respostaEsperaU4').waitFor({ timeout: 15000 });
    await page.fill('#respostaEsperaU4', 'Já passei os horários para a Amanda no WhatsApp.');
    await page.getByRole('button', { name: /Já respondi/ }).click();
  }, () => esperar(async () => { const d = await seed.get('demandas', 'j33-aviso'); return d?.status === 'concluida_aguardando_aprovacao' ? 'aviso respondido: ' + d.provaTexto : null; }));
}
