// J117 — CP263 (23/11/2026, Chris: "demandas que chegam e que nunca saem" + "tudo que for antigo do mês passado vc pode concluir"; aprovado
// "Encerrar todos" na caixa de perguntas). Em 22/11 a Amanda tinha 17 itens parados de agosto a outubro: 10 avisos "X está esperando você"
// cuja origem já estava encerrada (ou apagada), 4 decisões "pular legenda?" de postagens já canceladas e 3 entregas antigas. Esperado:
//  1. aviso "esperando você" com a origem aprovada ou apagada fecha sozinho na rodada da faxina; com a origem ainda pendente, continua aberto;
//  2. decisão "pular legenda?" de postagem encerrada fecha sozinha; de postagem ainda em andamento, continua;
//  3. item da lista autorizada pelo Chris fecha com a nota da autorização; entrega antiga FORA da lista continua (nada é aprovado às cegas);
//  4. repetir a rodada não muda nada; 5. o cartão "Demandas aguardando aprovação" da Central de Comando do Chris (onde esses itens apareciam)
//     cai exatamente o número de itens fechados. (Nas telas da Amanda eles nem apareciam: era acúmulo invisível para ela.)
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { RAIZ } from '../lib/emulador.mjs';
import { adminDb } from '../lib/chegada.mjs';
import { entrarComo, foto, entrarGerencia } from '../lib/navegador.mjs';
export const id = 'J117';
export const nome = 'Itens antigos presos fecham: aviso com origem encerrada, decisão de postagem encerrada e a lista autorizada (o resto fica)';

export async function executar({ amb, seed, nav, erroGrave, registrar }) {
  const t0 = Date.now(), fim = (caso, ok, detalhe) => registrar({ jornada: id, caso, ok, ms: Date.now() - t0, detalhe });
  const db = adminDb(amb), velho = '2026-09-20T12:00:00.000Z';
  const base = (titulo, extra) => ({ titulo, descricao: 'Ensaio J117', destinatario: 'Amanda', status: 'concluida_aguardando_aprovacao', prazoData: '2026-09-20', prazoHora: '18:00', criadoEm: velho, excluido: false, provaTexto: 'Respondido (J117)', ...extra });
  const docs = {
    'j117-origem-aprovada': { titulo: 'Origem aprovada J117', destinatario: 'Gabrielle', status: 'aprovada', criadoEm: velho, excluido: false },
    'j117-origem-apagada': { titulo: 'Origem apagada J117', destinatario: 'Luís', status: 'pendente', criadoEm: velho, excluido: true },
    'j117-origem-viva': { titulo: 'Origem viva J117', destinatario: 'Cecília', status: 'pendente', criadoEm: velho, excluido: false },
    'j117-aviso-aprovada': base('🔔 Gabrielle está esperando você — J117 origem aprovada', { tipoEspecial: 'aguardando_resposta', demandaOrigemId: 'j117-origem-aprovada' }),
    'j117-aviso-apagada': base('🔔 Luís está esperando você — J117 origem apagada', { tipoEspecial: 'aguardando_resposta', demandaOrigemId: 'j117-origem-apagada' }),
    'j117-aviso-viva': base('🔔 Cecília está esperando você — J117 origem viva', { tipoEspecial: 'aguardando_resposta', demandaOrigemId: 'j117-origem-viva' }),
    'j117-pular-cancelada': base('🙋 Decisão sua: liberar pular a legenda? — J117 cancelada', { tipoEspecial: 'pular_legenda', postagemId: 'j117-post-cancelada' }),
    'j117-pular-viva': base('🙋 Decisão sua: liberar pular a legenda? — J117 viva', { tipoEspecial: 'pular_legenda', postagemId: 'j117-post-viva' }),
    'Aino1OSTAgT2yvGMUuRg': base('🤝 Capa para destaque de cliente (J117, item autorizado)', { origem: 'cecília' }),
    'j117-entrega-fora-da-lista': base('🤝 Entrega antiga fora da lista (J117)', { origem: 'cecília' })
  };
  for (const [k, v] of Object.entries(docs)) await seed.set('demandas', k, v);
  await seed.set('postagens', 'j117-post-cancelada', { cliente: 'mochi', clienteNome: 'Mochi', titulo: 'J117 cancelada', status: 'cancelada_manual', excluido: false, criadoEm: new Date() });
  await seed.set('postagens', 'j117-post-viva', { cliente: 'mochi', clienteNome: 'Mochi', titulo: 'J117 viva', status: 'aguardando_legenda', excluido: false, criadoEm: new Date() });
  const st = async k => (await seed.get('demandas', k))?.status;
  const cartaoChris = async () => { const { page, fechar } = await nav.novaPagina(); try {
      await entrarComo(page, amb.url(), 'Chris'); await page.waitForTimeout(3000); await entrarGerencia(page);
      await page.waitForFunction(() => /demandas aguardando aprova/i.test(document.getElementById('gerenciaComando')?.innerText || ''), null, { timeout: 45000 }); await page.waitForTimeout(2500);
      const n = await page.evaluate(() => { const c = [...document.querySelectorAll('#gerenciaComando .resumoCard')].find(x => /demandas aguardando aprova/i.test(x.innerText)); return c ? Number(c.querySelector('.num')?.textContent) : NaN; });
      await foto(page, 'J117-chris-central'); return n; } finally { await fechar(); } };
  try {
    const antes = await cartaoChris();
    const fx = await import(pathToFileURL(path.join(RAIZ, 'functions-get/faxina-diaria-cp248.mjs')).href);
    const r = await fx.executarFaxinaCp248(db, { gravarRelatorio: false });
    const s = {}; for (const k of Object.keys(docs).filter(k => !k.startsWith('j117-origem'))) s[k] = await st(k);
    const a = s['j117-aviso-aprovada'] === 'aprovada' && s['j117-aviso-apagada'] === 'aprovada' && s['j117-aviso-viva'] === 'concluida_aguardando_aprovacao';
    fim('1 aviso com a origem encerrada ou apagada fecha; com a origem viva continua', a, `origem aprovada → ${s['j117-aviso-aprovada']} · apagada → ${s['j117-aviso-apagada']} · viva → ${s['j117-aviso-viva']}`);
    const b = s['j117-pular-cancelada'] === 'aprovada' && s['j117-pular-viva'] === 'concluida_aguardando_aprovacao';
    fim('2 decisão "pular legenda" de postagem encerrada fecha; de postagem em andamento continua', b, `cancelada → ${s['j117-pular-cancelada']} · em andamento → ${s['j117-pular-viva']}`);
    const aut = await seed.get('demandas', 'Aino1OSTAgT2yvGMUuRg');
    const c = aut?.status === 'aprovada' && /autorização do Chris/.test(aut?.notaConclusao || '') && aut?.encerramentoCp263?.tipo === 'autorizado' && s['j117-entrega-fora-da-lista'] === 'concluida_aguardando_aprovacao';
    fim('3 item da lista autorizada fecha com a nota; entrega fora da lista continua', c, `autorizado → ${aut?.status} (${String(aut?.notaConclusao || '').slice(0, 60)}) · fora da lista → ${s['j117-entrega-fora-da-lista']}`);
    const r2 = await fx.executarFaxinaCp248(db, { gravarRelatorio: false });
    const repetidos = (r2.encerradosCp263 || []).filter(x => String(x.id).startsWith('j117') || x.id === 'Aino1OSTAgT2yvGMUuRg');
    fim('4 repetir a rodada não muda nada', repetidos.length === 0, `1ª rodada: ${(r.encerradosCp263 || []).length} encerrado(s) · 2ª rodada: ${repetidos.length} destes`);
    const depois = await cartaoChris(), fechados = 4; // aviso origem aprovada, aviso origem apagada, pular-legenda cancelada, item autorizado
    fim('5 o cartão "Demandas aguardando aprovação" do Chris cai exatamente os itens fechados', Number.isFinite(antes) && antes - depois === fechados, `antes ${antes} · depois ${depois} (esperado −${fechados})`);
  } catch (e) { fim('itens antigos presos', false, String(e).replace(/\s+/g, ' ').slice(0, 300)); }
  for (const k of Object.keys(docs)) { const x = await seed.get('demandas', k); if (x) { const { id: _i, ...d } = x; await seed.set('demandas', k, { ...d, excluido: true }); } }
}
