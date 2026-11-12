// J57 — Acompanhamento do Portal se atualiza sozinho (CP205, sugestão da Amanda em 11/11/2026).
// Antes: a linha do tempo do cliente só mudava quando alguém da equipe registrava à mão.
// Agora: o vídeo sai da revisão interna para "pronto para sua aprovação" → a frase aparece no Acompanhamento do cliente
// (sem nada interno); com a página aberta, o vídeo é aprovado e uma gravação é agendada → as frases chegam ao vivo.
import { foto } from '../lib/navegador.mjs';
export const id = 'J57';
export const nome = 'Acompanhamento do Portal se atualiza sozinho com o andamento real';
const CLIENTE = 'zeiss', VID = 'v-j57-acompanhamento', GRAV = 'ag-j57-gravacao', TITULO = 'Ensaio J57 vitrine de Natal';
const esperar = async (fn, ms = 25000) => { const f = Date.now() + ms; while (Date.now() < f) { const r = await fn(); if (r) return r; await new Promise(r => setTimeout(r, 1000)); } return null; };

export async function executar({ amb, seed, nav, erroGrave, registrar }) {
  const t0 = Date.now(), d = new Date(Date.now() + 5 * 86400000), dia = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const base = { cliente: CLIENTE, clienteNome: 'Zeiss', titulo: TITULO, data: dia, editorAtribuido: 'Helo', excluido: false };
  await seed.set('videos_producao', VID, { ...base, status: 'aguardando_aprovacao', correcao: 'Texto interno: trocar a cor (não pode vazar).' });
  await amb.aguardarFunctionsOciosas?.();
  await seed.set('videos_producao', VID, { ...base, status: 'aguardando_cliente', correcao: 'Texto interno: trocar a cor (não pode vazar).' });
  const chegou = await esperar(async () => ((await seed.get('processos_cliente', CLIENTE))?.timelineAuto || []).some(x => x.origemId === VID && x.estado === 'aguardando_cliente'));
  registrar({ jornada: id, caso: 'vídeo pronto para aprovação entra sozinho no acompanhamento', ok: !!chegou, ms: Date.now() - t0, detalhe: chegou ? 'entrada automática registrada' : 'nada foi registrado' });
  if (!chegou) return;

  const { page, erros, fechar } = await nav.novaPagina(); let t1 = Date.now();
  try {
    await page.goto(amb.url('portal-cliente.html', `&c=${CLIENTE}&t=tok-${CLIENTE}`), { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('[data-tab="acompanhamento"]', { state: 'attached', timeout: 30000 });
    await page.waitForTimeout(2500);
    await page.evaluate(() => setTab('acompanhamento', document.querySelector('[data-tab="acompanhamento"]')));
    await page.waitForFunction(t => document.getElementById('painelAcompanhamento')?.innerText.includes('Vídeo pronto para a sua aprovação: ' + t), TITULO, { timeout: 25000 });
    const texto = await page.evaluate(() => document.getElementById('painelAcompanhamento').innerText);
    const vazou = /trocar a cor|revisão interna|Texto interno/i.test(texto);
    await foto(page, 'J57-acompanhamento');
    registrar({ jornada: id, caso: 'cliente vê a etapa no Acompanhamento, sem texto interno', ok: !vazou && !erros.filter(erroGrave).length, ms: Date.now() - t1,
      detalhe: vazou ? 'TEXTO INTERNO VISÍVEL' : 'frase do cliente visível · nada interno' });

    // Ao vivo: aprovação do vídeo e gravação agendada chegam sem recarregar a página
    t1 = Date.now();
    await seed.set('videos_producao', VID, { ...base, status: 'aprovado', clienteAprovou: true });
    await seed.set('agendamentos', GRAV, { cliente: CLIENTE, tipo: 'gravacao', data: dia, hora: '14:00', local: 'Loja', status: 'agendado', filmmaker: 'Luís' });
    const aoVivo = await page.waitForFunction(t => { const x = document.getElementById('painelAcompanhamento')?.innerText || ''; return x.includes('Vídeo aprovado: ' + t) && /Gravação agendada para \d{2}\/\d{2} às 14:00/.test(x); }, TITULO, { timeout: 30000 }).then(() => true).catch(() => false);
    await foto(page, 'J57-ao-vivo');
    registrar({ jornada: id, caso: 'aprovação e gravação aparecem ao vivo, sem recarregar', ok: aoVivo && !erros.filter(erroGrave).length, ms: Date.now() - t1,
      detalhe: aoVivo ? 'vídeo aprovado e gravação agendada na linha do tempo' : 'não chegou ao vivo' });
  } catch (e) { await foto(page, 'J57-falha'); registrar({ jornada: id, caso: 'fluxo', ok: false, ms: Date.now() - t1, detalhe: String(e).replace(/\s+/g, ' ').slice(0, 300) }); }
  finally { await fechar(); }
}
