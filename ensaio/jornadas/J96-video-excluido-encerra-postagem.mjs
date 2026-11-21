// J96 — CP244 (21/11/2026, Programa Estabilidade, Raio-X da produção). Caso real: Camargo's "Não olhe! (antes e depois)" — o cliente
// pediu ajuste depois de aprovar (postagem → em_correcao), o editor excluiu o vídeo ("Vai ser regravado") e a postagem ficou em_correcao
// para sempre, sem dono. Esperado agora, por qualquer caminho de exclusão:
//  1. A editora (Helo) cancela o vídeo em "Precisa corrigir" → a postagem que ainda não foi para a rede é encerrada com o motivo.
//  2. A Amanda recupera o vídeo na Lixeira (botão "Recuperar esse vídeo") → a postagem volta para a etapa anterior (em_correcao).
//  3. Vídeo de postagem JÁ agendada na rede vai para a Lixeira → a postagem não muda (está na plataforma) e a Cecília recebe UMA tarefa
//     "Tirar do agendamento", que aparece em Minhas Demandas.
import { entrarComo, entrarGerencia, foto } from '../lib/navegador.mjs';
export const id = 'J96';
export const nome = 'Vídeo na Lixeira encerra a postagem dele (ou pede à Cecília para tirar do agendamento); recuperar desfaz';
const A = 'j96-em-correcao', B = 'j96-agendado', TA = 'Mochi — Vídeo J96 antes e depois', TB = 'Mochi — Vídeo J96 já agendado';
const MOTIVO = 'Vai ser regravado (J96)';
// escrita do seed com nova tentativa: um gatilho ainda rodando segura o documento por alguns segundos no emulador
const gravar = async (seed, col, k, dados) => { for (let t = 0; ; t++) { try { return await seed.set(col, k, dados); } catch (e) { if (t >= 4 || !/409|ABORTED|lock/i.test(String(e))) throw e; await new Promise(x => setTimeout(x, 5000)); } } };
const esperar = async (fn, ms = 30000) => { const f = Date.now() + ms; let r; while (Date.now() < f) { r = await fn(); if (r) return r; await new Promise(x => setTimeout(x, 1000)); } return r; };

export async function executar({ amb, seed, nav, erroGrave, registrar }) {
  const t0 = Date.now(), hoje = new Date().toISOString().slice(0, 10);
  const fim = (caso, ok, detalhe) => registrar({ jornada: id, caso, ok, ms: Date.now() - t0, detalhe });
  // mesma origem das jornadas J59/J61 (vídeo declarado em campo, sem conteúdo do calendário): identidade completa para os gatilhos I165
  const origem = { calendarItemId: null, calendarItemIdx: null, calendarClienteSlug: null, calendarCompetencia: null, vinculoSessao: 'declarado_em_campo' };
  const vid = (titulo, extra) => ({ cliente: 'mochi', clienteNome: 'Mochi', titulo, excluido: false, avulso: true, enviadoPor: 'Nathan', filmmaker: 'Nathan',
    editorAtribuido: 'Helo', clienteAprovou: true, linkOriginal: 'https://drive.google.com/file/d/j96/view', linkFinalizado: 'https://drive.google.com/file/d/j96f/view',
    clienteAprovouPor: 'Amanda', aprovadoPor: 'Chris', data: hoje, criadoEm: new Date(), ...origem, ...extra });
  const post = (videoId, titulo, extra) => ({ cliente: 'mochi', clienteNome: 'Mochi', titulo, videoId, linkVideo: 'https://drive.google.com/file/d/j96f/view', excluido: false,
    criadoEm: new Date(), historico: [], legenda: '', demandaLegendaCriada: true, ...origem, ...extra });
  await seed.set('videos_producao', A, vid(TA, { status: 'correcao', postagemId: 'video_' + A, motivoCorrecao: '[Cliente pediu ajuste] Não ficou bom o depois' }));
  await seed.set('postagens', 'video_' + A, post(A, TA, { status: 'em_correcao' }));
  await amb.aguardarFunctionsOciosas?.();

  // 1) Helo cancela o vídeo em "Precisa corrigir" (mesmo cartão da J80)
  { const { page, erros, fechar } = await nav.novaPagina();
    try { page.on('dialog', d => d.type() === 'prompt' ? d.dismiss() : d.accept());
      await entrarComo(page, amb.url(), 'Helo'); await page.waitForTimeout(2500);
      await page.evaluate(async () => { const c = document.getElementById('videosMeus'); let p = c; while (p) { if (p.style) p.style.display = ''; p = p.parentElement; } await window.renderMeusVideos(); });
      await page.locator('#videosMeus button', { hasText: 'Cancelar esse vídeo' }).first().waitFor({ state: 'attached', timeout: 20000 }); await page.waitForTimeout(2000);
      for (let t = 0; t < 3 && (await seed.get('videos_producao', A))?.excluido !== true; t++) {
        const caixa = page.locator('#cancelarVideoBox_' + A);
        await page.locator(`#videosMeus button`, { hasText: 'Cancelar esse vídeo' }).evaluateAll((bs, id) => { const b = bs.find(x => (x.getAttribute('onclick') || '').includes(id)) || bs[0]; b?.click(); }, A);
        const campo = caixa.locator('textarea'); if (!await campo.waitFor({ state: 'attached', timeout: 10000 }).then(() => true).catch(() => false)) continue;
        await campo.evaluate((el, m) => { el.value = m; el.dispatchEvent(new Event('input', { bubbles: true })); }, MOTIVO);
        await caixa.locator('button', { hasText: 'Confirmar cancelamento' }).evaluate(el => el.click());
        await esperar(async () => (await seed.get('videos_producao', A))?.excluido === true, 30000);
      }
      const v = await seed.get('videos_producao', A);
      await amb.aguardarFunctionsOciosas?.();
      const p = await esperar(async () => { const x = await seed.get('postagens', 'video_' + A); return x?.status === 'arquivada_sem_postagem' ? x : null; }, 45000) || await seed.get('postagens', 'video_' + A);
      const graves = erros.filter(erroGrave);
      fim('1 editora cancela o vídeo em correção: a postagem é encerrada com o motivo', v?.excluido === true && p?.status === 'arquivada_sem_postagem' && p?.encerradaPorVideoExcluidoCp244?.statusAnterior === 'em_correcao' && String(p?.notaCorrecao || '').includes(MOTIVO) && !graves.length,
        `vídeo excluído ${v?.excluido === true ? 'sim' : 'NÃO'} · postagem ${p?.status} · etapa guardada ${p?.encerradaPorVideoExcluidoCp244?.statusAnterior || '-'} · motivo ${String(p?.notaCorrecao || '').includes(MOTIVO) ? 'ok' : JSON.stringify(p?.notaCorrecao || '')}${graves.length ? ' · erro: ' + graves[0] : ''}`);
      await foto(page, 'J96-helo');
    } catch (e) { await foto(page, 'J96-falha-helo'); fim('1 editora cancela', false, String(e).replace(/\s+/g, ' ').slice(0, 260)); } finally { await fechar(); } }

  // 2) Amanda recupera na Lixeira
  { const { page, erros, fechar } = await nav.novaPagina();
    try { page.on('dialog', d => d.type() === 'prompt' ? d.accept('Foi engano, volta (J96)') : d.accept());
      await entrarComo(page, amb.url(), 'Amanda'); await page.waitForTimeout(2500);
      await entrarGerencia(page); await page.evaluate(() => navegarGerenciaSub('lixeiraVideos'));
      const item = page.locator('#gerenciaLixeiraVideos .item', { hasText: TA }).first(); await item.waitFor({ timeout: 20000 });
      await item.locator('button', { hasText: 'Recuperar esse vídeo' }).click();
      await esperar(async () => (await seed.get('videos_producao', A))?.excluido === false, 20000);
      await amb.aguardarFunctionsOciosas?.();
      const p = await esperar(async () => { const x = await seed.get('postagens', 'video_' + A); return x?.status === 'em_correcao' ? x : null; }, 45000) || await seed.get('postagens', 'video_' + A);
      const v = await seed.get('videos_producao', A), graves = erros.filter(erroGrave);
      fim('2 Amanda recupera da Lixeira: a postagem volta para em correção', v?.excluido === false && p?.status === 'em_correcao' && !p?.encerradaPorVideoExcluidoCp244 && !graves.length,
        `vídeo de volta ${v?.excluido === false ? 'sim' : 'NÃO'} · postagem ${p?.status} · marca ${p?.encerradaPorVideoExcluidoCp244 ? 'AINDA' : 'limpa'}${graves.length ? ' · erro: ' + graves[0] : ''}`);
      await foto(page, 'J96-amanda');
    } catch (e) { await foto(page, 'J96-falha-amanda'); fim('2 Amanda recupera', false, String(e).replace(/\s+/g, ' ').slice(0, 260)); } finally { await fechar(); } }

  // 3) vídeo de postagem já agendada vai para a Lixeira (o gatilho vale para qualquer caminho de exclusão)
  { const { page, erros, fechar } = await nav.novaPagina();
    try {
      // semeado só aqui: fora da sessão da Amanda (o conciliador dela confere a identidade completa de postagens agendadas)
      await gravar(seed, 'videos_producao', B, vid(TB, { status: 'aprovado', postagemId: 'video_' + B }));
      await gravar(seed, 'postagens', 'video_' + B, post(B, TB, { status: 'agendado', dataAgendada: hoje, horaAgendada: '23:50', legenda: 'Legenda J96' }));
      await amb.aguardarFunctionsOciosas?.();
      const v0 = await seed.get('videos_producao', B); const { id: _i, ...dados } = v0;
      await gravar(seed, 'videos_producao', B, { ...dados, excluido: true, excluidoPor: 'Amanda', excluidoEm: new Date().toISOString(), motivoExclusao: 'Cliente desistiu (J96)' });
      await amb.aguardarFunctionsOciosas?.();
      const dem = await esperar(async () => (await seed.listar('demandas')).find(d => d.tipoEspecial === 'desagendar_video_excluido_cp244' && d.postagemId === 'video_' + B), 45000);
      const p = await seed.get('postagens', 'video_' + B);
      await entrarComo(page, amb.url(), 'Cecília'); await page.waitForTimeout(2500);
      await page.evaluate(() => irPara('minhasDemandasAtribuidas', document.getElementById('navMinhasDemandasAtribuidas')));
      const naTela = await page.waitForFunction(() => /Tirar do agendamento/.test(document.getElementById('view-minhasDemandasAtribuidas')?.innerText || ''), null, { timeout: 20000 }).then(() => true).catch(() => false);
      const quantas = (await seed.listar('demandas')).filter(d => d.tipoEspecial === 'desagendar_video_excluido_cp244' && d.postagemId === 'video_' + B).length;
      const graves = erros.filter(erroGrave);
      fim('3 postagem já agendada: não muda e a Cecília recebe "Tirar do agendamento"', p?.status === 'agendado' && dem?.destinatario === 'Cecília' && dem?.status === 'pendente' && quantas === 1 && naTela && !graves.length,
        `postagem ${p?.status} · tarefa ${dem ? dem.destinatario + '/' + dem.status : 'NÃO criada'} · ${quantas} tarefa(s) · na tela da Cecília ${naTela ? 'sim' : 'NÃO'}${graves.length ? ' · erro: ' + graves[0] : ''}`);
      await foto(page, 'J96-cecilia');
    } catch (e) { await foto(page, 'J96-falha-cecilia'); fim('3 postagem agendada', false, String(e).replace(/\s+/g, ' ').slice(0, 260)); } finally { await fechar(); } }

  await amb.aguardarFunctionsOciosas?.();
  // limpeza: tira os itens da J96 da operação para não mudar a carga das jornadas seguintes
  for (const [col, k] of [['videos_producao', A], ['videos_producao', B]]) { const x = await seed.get(col, k); if (!x) continue; const { id: _i, ...dados } = x; await gravar(seed, col, k, { ...dados, excluido: true, excluidoPor: 'ensaio-j96', excluidoEm: new Date().toISOString() }); }
  await amb.aguardarFunctionsOciosas?.();
  for (const k of ['video_' + A, 'video_' + B]) { const x = await seed.get('postagens', k); if (!x) continue; const { id: _i, ...dados } = x; await gravar(seed, 'postagens', k, { ...dados, excluido: true }); }
  for (const d of (await seed.listar('demandas')).filter(d => d.tipoEspecial === 'desagendar_video_excluido_cp244')) { const { id: k, ...dados } = d; await gravar(seed, 'demandas', k, { ...dados, excluido: true, status: 'cancelada' }); }
}
