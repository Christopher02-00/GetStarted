// J76 — A limpeza de duplicatas (motor, rodada diária) não esconde vídeo (CP223, clínicas do Otávio, 16/11/2026).
// Antes: a varredura agrupava vídeos só por cliente + título e marcava `excluido:true, excluidoPor:'sistema (duplicata)'`
// em todos menos o mais antigo. 7 avulsos "<Cliente> — Vídeo", cada um ligado a um conteúdo diferente do calendário,
// viraram 3 e sumiram de "Sem editor — distribuir agora".
// Esperado: vídeos ligados a conteúdos diferentes (ou de envios diferentes) não são o mesmo vídeo. Mesmo a repetição de
// verdade (mesmo conteúdo e mesmo envio) não é escondida quando está sem editor: a Amanda recebe um aviso.
import { entrarComo, foto } from '../lib/navegador.mjs';
export const id = 'J76';
export const nome = 'Limpeza de duplicatas não esconde vídeo sem editor; repetição suspeita vira aviso para a Amanda';
const hoje = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date());
const esperar = async (fn, ms = 120000) => { const f = Date.now() + ms; while (Date.now() < f) { const r = await fn(); if (r) return r; await new Promise(r => setTimeout(r, 1500)); } return null; };
const TIT_DIF = 'Bluefit — Vídeo J76', TIT_REP = 'Bluefit — Vídeo repetido J76';

export async function executar({ amb, seed, nav, erroGrave, registrar }) {
  const caso = 'limpeza roda → os 4 vídeos sem editor continuam na fila';
  const base = { cliente: 'bluefit', clienteNome: 'Bluefit', status: 'aguardando_edicao', editorAtribuido: '', excluido: false, avulso: true, enviadoPor: 'Luís' };
  const videos = {
    'j76-a': { ...base, titulo: TIT_DIF, criadoEm: '2026-11-16T10:00:00.000Z', referenciaLegendaI78: { itemId: 'j76-item-a' }, envioManualI67: 'j76-envio-a' },
    'j76-b': { ...base, titulo: TIT_DIF, criadoEm: '2026-11-16T10:01:00.000Z', referenciaLegendaI78: { itemId: 'j76-item-b' }, envioManualI67: 'j76-envio-b' },
    'j76-c': { ...base, titulo: TIT_REP, criadoEm: '2026-11-16T10:02:00.000Z', referenciaLegendaI78: { itemId: 'j76-item-c' }, envioManualI67: 'j76-envio-c' },
    'j76-d': { ...base, titulo: TIT_REP, criadoEm: '2026-11-16T10:03:00.000Z', referenciaLegendaI78: { itemId: 'j76-item-c' }, envioManualI67: 'j76-envio-c' },
  };
  for (const [k, v] of Object.entries(videos)) await seed.set('videos_producao', k, v);
  await seed.set('sistema', 'motor_lock', { ultimaExecucao: 'liberado-pelo-ensaio', ultimaManutencaoDia: '2000-01-01' });
  const { page, erros, fechar } = await nav.novaPagina(); const t0 = Date.now();
  try {
    page.on('dialog', d => d.accept());
    await entrarComo(page, amb.url(), 'Amanda');
    const rodou = await esperar(async () => (await seed.get('sistema', 'motor_lock'))?.ultimaManutencaoDia === hoje());
    await page.waitForTimeout(6000);
    const depois = await Promise.all(Object.keys(videos).map(k => seed.get('videos_producao', k)));
    const escondidos = Object.keys(videos).filter((k, i) => depois[i]?.excluido === true);
    const aviso = (await seed.listar('demandas')).find(d => d.destinatario === 'Amanda' && d.status === 'pendente' && !d.excluido && /repetid/i.test(d.titulo || '') && (d.descricao || '').includes('j76-c') && (d.descricao || '').includes('j76-d'));
    await page.evaluate(async () => { const c = document.getElementById('gerenciaVideos'); if (c) c.style.display = ''; await window.renderGerenciaVideos(); });
    await page.waitForFunction(() => !/Carregando fila de edição/.test(document.getElementById('gerenciaVideos')?.innerText || ''), null, { timeout: 20000 }).catch(() => {});
    const naFila = await page.evaluate(([a, b]) => { const s = [...document.querySelectorAll('#gerenciaVideos section')].find(x => /Sem editor — distribuir agora/.test(x.innerText)); const t = s?.innerText || '';
      const conta = r => (t.match(new RegExp(r.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '(?! repetido)', 'g')) || []).length; return { dif: conta(a), rep: (t.match(new RegExp(b, 'g')) || []).length }; }, [TIT_DIF, TIT_REP]);
    // Na bateria inteira a rodada diária também confere o vídeo que a J57 deixa ("V118: órfão preservado…"): é a
    // proteção do V118 avisando no console, não erro desta jornada. Só essa mensagem conhecida é ignorada.
    const graves = erros.filter(erroGrave).filter(e => !/V118: órfão preservado para conferência/.test(String(e)));
    await foto(page, 'J76-amanda-sem-editor');
    const ok = !!rodou && !escondidos.length && naFila.dif >= 2 && naFila.rep >= 2 && !!aviso && !graves.length;
    registrar({ jornada: id, caso, ok, ms: Date.now() - t0,
      detalhe: `rodada diária ${rodou ? 'rodou' : 'NÃO rodou'} · escondidos: ${escondidos.join(', ') || 'nenhum'} · "Sem editor": ${naFila.dif} de conteúdos diferentes + ${naFila.rep} repetidos · aviso à Amanda: ${aviso ? '"' + aviso.titulo + '"' : 'NÃO'}` + (graves.length ? ' | ' + graves[0] : '') });
  } catch (e) { await foto(page, 'J76-falha'); registrar({ jornada: id, caso, ok: false, ms: Date.now() - t0, detalhe: String(e).slice(0, 300) }); }
  finally { await fechar(); }
}
