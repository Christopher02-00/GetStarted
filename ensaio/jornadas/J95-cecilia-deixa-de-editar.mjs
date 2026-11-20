// J95 — CP242 (20/11/2026, demanda da Amanda "Tirar Cecília de editora no site", pedido do Chris): a Cecília não é mais editora — faz
// parte só da secretaria/produção; as edições ficam entre Helo e João Victor. Como na saída da Gabrielle, o histórico fica: vídeos
// antigos continuam com o nome dela (autoria), e um vídeo ainda atribuído a ela aparece como "revisar responsável" para a Amanda trocar.
//  1. Amanda, "Sem editor — distribuir agora": o seletor oferece só Helo e João Victor.
//  2. Vídeo antigo ainda com a Cecília: a Amanda vê "revisar responsável" e "Mudar pra…" oferece só Helo e João Victor.
//  3. "Somente edição" (CP194): a tela oferece só Helo e João Victor e o servidor não aceita a Cecília.
//  4. A Cecília entra: sem "Meus Vídeos" (fila de editor); os menus da secretaria/produção continuam.
// CP243 (20/11/2026, Chris: "pode tirar ele da edição, ele é só filmmaker"): o Nathan também sai da edição.
//  5. O Nathan entra: sem "Meus Vídeos"; continua com "Lançar gravação" (filmmaker); o servidor não o aceita no somente edição.
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { RAIZ } from '../lib/emulador.mjs';
import { entrarComo, entrarGerencia, foto } from '../lib/navegador.mjs';
export const id = 'J95';
export const nome = 'Cecília e Nathan deixam de editar: só Helo e João Victor recebem edição; o histórico fica, a Cecília mantém a secretaria e o Nathan a filmagem';
const A = 'j95-sem-editor', B = 'j95-da-cecilia', C = 'j95-somente-edicao';
const TA = 'Mochi — Vídeo J95 sem editor', TB = 'Mochi — Vídeo J95 ainda com a Cecília', TC = 'Mochi — Vídeo J95 somente edição';
const ESPERADOS = ['Helo', 'João Victor'];
const iguais = (a, b) => a.length === b.length && a.every((x, i) => x === b[i]);

export async function executar({ amb, seed, nav, erroGrave, registrar }) {
  const agora = new Date().toISOString(), hoje = agora.slice(0, 10), mes = hoje.slice(0, 7), t0 = Date.now();
  const fim = (caso, ok, detalhe) => registrar({ jornada: id, caso, ok, ms: Date.now() - t0, detalhe });
  const base = { cliente: 'mochi', clienteNome: 'Mochi', data: hoje, criadoEm: new Date(), excluido: false, avulso: true, enviadoPor: 'Nathan', filmmaker: 'Nathan', linkOriginal: 'https://drive.google.com/file/d/j95/view' };
  await seed.set('videos_producao', A, { ...base, titulo: TA, status: 'aguardando_edicao', editorAtribuido: '' });
  await seed.set('videos_producao', B, { ...base, titulo: TB, status: 'aguardando_edicao', editorAtribuido: 'Cecília', editorAtribuidoEm: agora, editorAtribuidoPor: 'Amanda' });
  await seed.set('videos_producao', C, { ...base, titulo: TC, status: 'aguardando_encaminhamento', editorAtribuido: '', soEdicao: true, vinculoSessao: 'somente_edicao_calendario_i34', agendamentoId: 'ag-j95',
    materialUrl: 'https://drive.google.com/drive/folders/ensaio-j95', calendarCompetencia: mes, registradoPor: 'Luís', dataRegistro: hoje, origemMaterial: 'recebido', observacao: 'Takes avulsos (J95)',
    edicaoManual: { versao: 1, revisao: 1, uid: 'uid-luis', tratadoPor: '', enviadoEm: agora, tratadoEm: '', por: 'Luís', estado: 'pendente', materialConfirmado: false, tratadoUid: '', observacao: 'Takes avulsos (J95)' },
    historico: [{ em: agora, por: 'Luís', detalhe: 'Enviado para Amanda pelo checklist; sem gravação.', acao: 'Sinalizado como somente edição' }] });
  await amb.aguardarFunctionsOciosas?.();

  // 1–3) tela da Amanda
  { const { page, erros, fechar } = await nav.novaPagina();
    try { page.on('dialog', d => d.accept());
      await entrarComo(page, amb.url(), 'Amanda'); await page.waitForTimeout(2500);
      await page.evaluate(async () => { const c = document.getElementById('gerenciaVideos'); if (c) c.style.display = ''; await window.renderGerenciaVideos(); });
      await page.waitForFunction(() => !/Carregando fila de edição/.test(document.getElementById('gerenciaVideos')?.innerText || ''), null, { timeout: 20000 }).catch(() => {});
      const tela = await page.evaluate(([ta, tb]) => {
        const cartao = t => [...document.querySelectorAll('#gerenciaVideos .item, #gerenciaVideos article, #gerenciaVideos .card')].filter(x => x.innerText.includes(t)).sort((x, y) => x.innerText.length - y.innerText.length)[0];
        const opcoes = el => [...(el?.querySelectorAll('select.editorSelect option') || [])].map(o => o.value).filter(Boolean);
        const resumo = [...document.querySelectorAll('#gerenciaVideos .resumoCard')].map(x => x.innerText.replace(/\s+/g, ' ')).find(t => /Cecília/.test(t)) || '';
        return { semEditor: opcoes(cartao(ta)), daCecilia: opcoes(cartao(tb)), achouB: !!cartao(tb), resumo };
      }, [TA, TB]);
      fim('1 distribuir: só Helo e João Victor', iguais(tela.semEditor, ESPERADOS), 'opções: ' + (tela.semEditor.join(', ') || 'nenhuma'));
      fim('2 vídeo antigo com a Cecília: "revisar responsável" e troca só para Helo/João Victor', tela.achouB && iguais(tela.daCecilia, ESPERADOS) && /revisar responsável/.test(tela.resumo),
        `mudar para: ${tela.daCecilia.join(', ') || 'nenhuma'} · resumo: ${tela.resumo.slice(0, 90) || '-'}`);
      await entrarGerencia(page); await page.evaluate(() => navegarGerenciaSub('videos'));
      const card = page.locator(`[data-edicao-video="${C}"]`); await card.waitFor({ timeout: 20000 });
      const opcoesC = (await card.locator('[data-edicao-editor] option').evaluateAll(os => os.map(o => o.value))).filter(Boolean);
      const { EDITORES_SOMENTE_EDICAO_CP194 } = await import(pathToFileURL(path.join(RAIZ, 'functions-get/encaminhamento-somente-edicao-cp194.mjs')).href);
      fim('3 somente edição: a tela oferece só Helo e João Victor e o servidor não aceita a Cecília', iguais(opcoesC, ESPERADOS) && !EDITORES_SOMENTE_EDICAO_CP194.includes('Cecília'),
        `tela: ${opcoesC.join(', ')} · servidor aceita: ${EDITORES_SOMENTE_EDICAO_CP194.join(', ')}`);
      const graves = erros.filter(erroGrave); if (graves.length) fim('1–3 console da Amanda sem erro grave', false, graves[0]);
      await foto(page, 'J95-amanda');
    } catch (e) { await foto(page, 'J95-falha-amanda'); fim('1–3 tela da Amanda', false, String(e).replace(/\s+/g, ' ').slice(0, 260)); } finally { await fechar(); } }

  // 4) Cecília: sem fila de editor; secretaria/produção intactas
  { const { page, erros, fechar } = await nav.novaPagina();
    try { page.on('dialog', d => d.accept());
      await entrarComo(page, amb.url(), 'Cecília'); await page.waitForTimeout(3000);
      const menus = await page.evaluate(() => Object.fromEntries(['navPostagens', 'navCofreCecilia', 'navMinhasDemandasAtribuidas', 'navInicio'].map(i => [i, !!document.getElementById(i)])));
      await page.evaluate(() => irPara('videos', document.getElementById('navVideos'))).catch(() => {});
      await page.waitForTimeout(1500);
      const meus = await page.evaluate(() => { const s = document.getElementById('subtabMeusVideos'); return !!s && getComputedStyle(s).display !== 'none'; });
      const fila = await page.evaluate(() => /Nova gravação|Controle de gravações/.test(document.body.innerText));
      const graves = erros.filter(erroGrave);
      fim('4 Cecília sem "Meus Vídeos"; menus da secretaria/produção continuam', !meus && Object.values(menus).every(Boolean) && fila && !graves.length,
        `Meus Vídeos ${meus ? 'AINDA aparece' : 'fora'} · menus ${Object.entries(menus).map(([k, v]) => k.replace('nav', '') + (v ? '✓' : '✗')).join(' ')} · gravações ${fila ? '✓' : '✗'}${graves.length ? ' · erro: ' + graves[0] : ''}`);
      await foto(page, 'J95-cecilia');
    } catch (e) { await foto(page, 'J95-falha-cecilia'); fim('4 Cecília', false, String(e).replace(/\s+/g, ' ').slice(0, 260)); } finally { await fechar(); } }

  // 5) Nathan: só filmmaker (CP243)
  { const { page, erros, fechar } = await nav.novaPagina();
    try { page.on('dialog', d => d.accept());
      await entrarComo(page, amb.url(), 'Nathan'); await page.waitForTimeout(3000);
      await page.evaluate(() => irPara('videos', document.getElementById('navVideos'))).catch(() => {});
      await page.waitForTimeout(1500);
      const vis = id => page.evaluate(i => { const s = document.getElementById(i); return !!s && getComputedStyle(s).display !== 'none'; }, id);
      const meus = await vis('subtabMeusVideos'), lancar = await vis('subtabLancarGravacao');
      const { EDITORES_SOMENTE_EDICAO_CP194 } = await import(pathToFileURL(path.join(RAIZ, 'functions-get/encaminhamento-somente-edicao-cp194.mjs')).href);
      const graves = erros.filter(erroGrave);
      fim('5 Nathan sem "Meus Vídeos", com "Lançar gravação"; o servidor não o aceita no somente edição', !meus && lancar && !EDITORES_SOMENTE_EDICAO_CP194.includes('Nathan') && !graves.length,
        `Meus Vídeos ${meus ? 'AINDA aparece' : 'fora'} · Lançar gravação ${lancar ? '✓' : '✗'} · servidor aceita: ${EDITORES_SOMENTE_EDICAO_CP194.join(', ')}${graves.length ? ' · erro: ' + graves[0] : ''}`);
      await foto(page, 'J95-nathan');
    } catch (e) { await foto(page, 'J95-falha-nathan'); fim('5 Nathan', false, String(e).replace(/\s+/g, ' ').slice(0, 260)); } finally { await fechar(); } }

  // os vídeos da J95 saem da fila (soft-delete) para não mudar a carga dos editores nas jornadas seguintes
  for (const k of [A, B, C]) { const x = await seed.get('videos_producao', k); if (!x) continue; const { id: _i, ...dados } = x; await seed.set('videos_producao', k, { ...dados, excluido: true, excluidoPor: 'ensaio-j95', excluidoEm: new Date().toISOString() }); }
}
