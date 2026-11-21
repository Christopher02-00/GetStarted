// J97 — CP245 (21/11/2026, Programa Estabilidade, Raio-X da produção). Retrato de 21/11: 143 tarefas do sistema concluídas pela Amanda
// paradas em "aguardando aprovação" desde agosto/setembro (ex.: "🎬 Distribuir 3 vídeo(s) pros editores"). Quem aprova uma entrega de
// origem 'sistema' é a Amanda, e ela não aprova a própria → ninguém aprova. Esperado agora:
//  1. A Amanda conclui uma tarefa do sistema em Minhas Demandas (prova escrita) → a tarefa fecha sozinha ('aprovada', com a nota
//     da CP245) e não fica em "Aguardando" na lista dela.
//  2. A Cecília conclui uma tarefa do sistema → continua indo para a aprovação da Amanda (nada muda para quem tem aprovador).
import { entrarComo, foto } from '../lib/navegador.mjs';
export const id = 'J97';
export const nome = 'Tarefa do sistema concluída pela Amanda fecha direto; a da Cecília continua com a aprovação da Amanda';
const esperar = async (fn, ms = 30000) => { const f = Date.now() + ms; let r; while (Date.now() < f) { r = await fn(); if (r) return r; await new Promise(x => setTimeout(x, 1000)); } return r; };

export async function executar({ amb, seed, nav, erroGrave, registrar }) {
  const hoje = new Date().toISOString().slice(0, 10), t0 = Date.now();
  const fim = (caso, ok, detalhe) => registrar({ jornada: id, caso, ok, ms: Date.now() - t0, detalhe });
  const tarefa = (para, titulo) => ({ titulo, descricao: 'Tarefa automática do ensaio J97.', destinatario: para, origem: 'sistema', status: 'pendente',
    prazoData: hoje, prazoHora: '18:00', criadoEm: new Date(), excluido: false, provaTexto: '', provaImagemUrl: '' });
  const casos = [
    ['Amanda', 'j97-amanda', '🎬 Distribuir 2 vídeo(s) pros editores (J97)', d => d?.status === 'aprovada' && d?.fechamentoSemAprovadorCp245?.schema === 1 && /não há outra pessoa para aprovar/.test(d?.notaConclusao || '') && /J97/.test(d?.provaTexto || ''), '1 Amanda conclui tarefa do sistema: fecha direto, sem ficar em "Aguardando"'],
    ['Cecília', 'j97-cecilia', '📅 Conferir a programação da semana (J97)', d => d?.status === 'concluida_aguardando_aprovacao' && !d?.fechamentoSemAprovadorCp245, '2 Cecília conclui tarefa do sistema: segue para a aprovação da Amanda']
  ];
  for (const [p, k, t] of casos) await seed.set('demandas', k, tarefa(p, t));
  await amb.aguardarFunctionsOciosas?.();
  for (const [pessoa, k, titulo, esperado, caso] of casos) {
    const { page, erros, fechar } = await nav.novaPagina();
    try { page.on('dialog', d => d.accept());
      await entrarComo(page, amb.url(), pessoa); await page.waitForTimeout(2500);
      await page.evaluate(() => irPara('minhasDemandasAtribuidas', document.getElementById('navMinhasDemandasAtribuidas')));
      await page.waitForFunction(t => document.getElementById('view-minhasDemandasAtribuidas')?.innerHTML.includes(t), titulo, { timeout: 20000 });
      await page.evaluate(idd => window.abrirDemandaMinha(idd), k);
      await page.waitForSelector('#provaTextoInput', { timeout: 10000 });
      await page.fill('#provaTextoInput', 'Feito no ensaio J97 por ' + pessoa + '.');
      await page.click('#btnEnviarProva');
      await esperar(async () => (await seed.get('demandas', k))?.status !== 'pendente', 20000);
      await amb.aguardarFunctionsOciosas?.();
      const d = await esperar(async () => { const x = await seed.get('demandas', k); return esperado(x) ? x : null; }, 30000) || await seed.get('demandas', k);
      let aguardandoNaTela = null;
      if (pessoa === 'Amanda') {
        await page.evaluate(() => { try { window.fecharModal?.(); } catch (e) {} irPara('minhasDemandasAtribuidas', document.getElementById('navMinhasDemandasAtribuidas')); });
        await page.waitForTimeout(3000);
        aguardandoNaTela = await page.evaluate(t => [...document.querySelectorAll('#view-minhasDemandasAtribuidas .selo.aguardando')].some(s => (s.closest('.item,.card,article,div')?.innerText || '').includes(t)), titulo);
      }
      const graves = erros.filter(erroGrave);
      fim(caso, esperado(d) && aguardandoNaTela !== true && !graves.length, `status ${d?.status} · nota ${String(d?.notaConclusao || '-').slice(0, 70)}${aguardandoNaTela ? ' · AINDA "Aguardando" na tela' : ''}${graves.length ? ' · erro: ' + graves[0] : ''}`);
      await foto(page, 'J97-' + pessoa.normalize('NFD').replace(/[^A-Za-z]/g, '').toLowerCase());
    } catch (e) { await foto(page, 'J97-falha'); fim(caso, false, String(e).replace(/\s+/g, ' ').slice(0, 260)); } finally { await fechar(); }
  }
  for (const [, k] of casos) { const x = await seed.get('demandas', k); if (!x) continue; const { id: _i, ...dados } = x; await seed.set('demandas', k, { ...dados, excluido: true }); }
}
