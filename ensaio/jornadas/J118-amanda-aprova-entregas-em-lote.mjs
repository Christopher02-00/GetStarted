// J118 — CP264 (23/11/2026, Chris: "simplificar para a Cecília e Amanda aprovar mais de uma coisa de uma vez, por exemplo aprovar tudo
// de uma semana inteira … sem gerar problemas em outras áreas"; aprovado "Sim, começar"). Em 30 dias a Amanda aprovou 283 entregas da
// equipe uma por uma (até 33 num dia). Esperado, na tela real da Amanda (Gerência → Aprovações):
//  1. a faixa da Gabrielle (4 entregas comuns + 1 de tipo especial) mostra "✔ Aprovar as 4 entregas de Gabrielle"; a do Luís (1 entrega) não
//     mostra botão de lote (com uma só, o botão do cartão basta);
//  2. um clique + confirmação aprova as comuns pelo MESMO caminho do cartão (status 'aprovada', aprovadoPor Amanda);
//  3. a entrega que mudou no servidor depois de a Amanda ler NÃO é aprovada (fica na lista com o texto novo) — o lote só aprova o que foi lido;
//  4. a de tipo especial e a do Luís continuam esperando, intocadas;
//  5. o resumo aparece uma vez e a faixa deixa de oferecer o lote; o cartão "Demandas aguardando aprovação" cai exatamente as aprovadas.
import { entrarComo, foto, entrarGerencia } from '../lib/navegador.mjs';
export const id = 'J118';
export const nome = 'Amanda aprova as entregas comuns de uma pessoa de uma vez (o que mudou depois de ler e os tipos especiais ficam)';

export async function executar({ amb, seed, nav, erroGrave, registrar }) {
  const t0 = Date.now(), fim = (caso, ok, detalhe) => registrar({ jornada: id, caso, ok, ms: Date.now() - t0, detalhe });
  const agora = new Date().toISOString();
  const base = (titulo, destinatario, extra) => ({ titulo, descricao: 'Ensaio J118', destinatario, remetente: 'Amanda', origem: 'amanda', status: 'concluida_aguardando_aprovacao',
    prazoData: '2026-11-20', prazoHora: '18:00', criadoEm: agora, concluidaEm: agora, excluido: false, provaTexto: 'Feito e conferido (J118 ' + titulo + ')', ...extra });
  const docs = {
    'j118-g1': base('Arte do cardápio J118', 'Gabrielle'),
    'j118-g2': base('Capa do reels J118', 'Gabrielle'),
    'j118-g3': base('Legenda da semana J118', 'Gabrielle'),
    'j118-g4-muda': base('Banner do site J118', 'Gabrielle'),
    'j118-g-especial': base('Stories da semana J118', 'Gabrielle', { tipoEspecial: 'stories_semana' }),
    'j118-l1': base('Edição única J118', 'Luís')
  };
  for (const [k, v] of Object.entries(docs)) await seed.set('demandas', k, v);
  const st = async k => (await seed.get('demandas', k)) || {};
  const { page, erros, fechar } = await nav.novaPagina();
  try {
    await entrarComo(page, amb.url(), 'Amanda'); await page.waitForTimeout(3000); await entrarGerencia(page);
    // o cartão da Central é desenhado ao entrar na Gerência: lido numa página nova (como a Amanda abrindo de novo), igual à J117
    const cartao = async () => { const p2 = await nav.novaPagina(); try {
        await entrarComo(p2.page, amb.url(), 'Amanda'); await p2.page.waitForTimeout(3000); await entrarGerencia(p2.page);
        await p2.page.waitForFunction(() => /demandas aguardando aprova/i.test(document.getElementById('gerenciaComando')?.innerText || ''), null, { timeout: 45000 }); await p2.page.waitForTimeout(2500);
        return await p2.page.evaluate(() => { const c = [...document.querySelectorAll('#gerenciaComando .resumoCard')].find(x => /demandas aguardando aprova/i.test(x.innerText)); return c ? Number(c.querySelector('.num')?.textContent) : NaN; });
      } finally { await p2.fechar(); } };
    const antes = await cartao();
    await page.evaluate(() => setGerenciaSub('demandasAguardando', document.querySelector('.subtab[data-sub=demandasAguardando]')));
    const botaoG = page.locator('#gerenciaDemandasAguardando [data-aprovar-lote-cp264="Gabrielle"]');
    const viu = await botaoG.waitFor({ state: 'visible', timeout: 45000 }).then(() => true).catch(() => false);
    await page.waitForFunction(() => /J118/.test(document.getElementById('gerenciaDemandasAguardando')?.innerText || ''), null, { timeout: 20000 }).catch(() => {});
    const textoBotao = viu ? (await botaoG.innerText()).trim() : '';
    const botaoLuis = await page.locator('#gerenciaDemandasAguardando [data-aprovar-lote-cp264="Luís"]').count();
    await foto(page, 'J118-antes');
    fim('1 a faixa da Gabrielle oferece "Aprovar as 4"; a do Luís (1 entrega) não oferece lote', viu && /Aprovar as 4 entregas de Gabrielle/.test(textoBotao) && botaoLuis === 0,
      `botão Gabrielle: ${viu ? '“' + textoBotao + '”' : 'NÃO apareceu'} · botão Luís: ${botaoLuis}`);
    if (!viu) throw Error('sem botão de lote');
    // a confirmação mostra a lista; enquanto ela está aberta, a entrega "banner" muda no servidor (a Gabrielle reenviou outro texto)
    let textoDialogo = '';
    page.once('dialog', async d => { textoDialogo = d.message(); const { id: _i, ...x } = await st('j118-g4-muda'); await seed.set('demandas', 'j118-g4-muda', { ...x, provaTexto: 'Texto NOVO enviado depois (J118)' }); await d.accept(); });
    await botaoG.click();
    await page.waitForFunction(() => /aprovada\(s\) de Gabrielle|entregas de Gabrielle aprovadas/.test(document.body.innerText), null, { timeout: 60000 }).catch(() => {});
    const toast = await page.evaluate(() => [...document.querySelectorAll('.toast, #toast, [class*=toast]')].map(x => x.innerText).join(' | ').slice(0, 300));
    const s = {}; for (const k of Object.keys(docs)) s[k] = await st(k);
    const aprovadas = ['j118-g1', 'j118-g2', 'j118-g3'].filter(k => s[k].status === 'aprovada' && s[k].aprovadoPor === 'Amanda');
    fim('2 um clique aprova as entregas comuns lidas, pelo mesmo caminho do cartão', aprovadas.length === 3 && /Aprovar de uma vez as 4 entregas de Gabrielle/.test(textoDialogo) && /Arte do cardápio J118/.test(textoDialogo),
      `aprovadas ${aprovadas.length}/3 (aprovadoPor ${s['j118-g1'].aprovadoPor || '-'}) · confirmação: “${textoDialogo.split('\n')[0]}”`);
    fim('3 a entrega que mudou depois de lida NÃO é aprovada', s['j118-g4-muda'].status === 'concluida_aguardando_aprovacao' && /NOVO/.test(s['j118-g4-muda'].provaTexto || ''),
      `banner → ${s['j118-g4-muda'].status} (“${String(s['j118-g4-muda'].provaTexto || '').slice(0, 40)}”) · resumo: ${toast || '(sem toast)'}`);
    fim('4 tipo especial e a entrega do Luís continuam esperando', s['j118-g-especial'].status === 'concluida_aguardando_aprovacao' && s['j118-l1'].status === 'concluida_aguardando_aprovacao',
      `especial → ${s['j118-g-especial'].status} · Luís → ${s['j118-l1'].status}`);
    await page.waitForTimeout(3000);
    const botaoDepois = await botaoG.count();
    await foto(page, 'J118-depois');
    const depois = await cartao();
    fim('5 a faixa deixa de oferecer o lote e o cartão "Demandas aguardando aprovação" cai exatamente as aprovadas', botaoDepois === 0 && Number.isFinite(antes) && antes - depois === aprovadas.length && !erros.filter(erroGrave).length,
      `botão depois: ${botaoDepois} · cartão antes ${antes} · depois ${depois} (esperado −${aprovadas.length}) · erros: ${erros.filter(erroGrave).slice(-2).join(' | ').slice(0, 200) || 'nenhum'}`);
  } catch (e) { await foto(page, 'J118-falha').catch(() => {}); fim('aprovação em lote das entregas', false, String(e).replace(/\s+/g, ' ').slice(0, 300)); }
  finally { await fechar(); }
  for (const k of Object.keys(docs)) { const x = await seed.get('demandas', k); if (x) { const { id: _i, ...d } = x; await seed.set('demandas', k, { ...d, excluido: true }); } }
}
