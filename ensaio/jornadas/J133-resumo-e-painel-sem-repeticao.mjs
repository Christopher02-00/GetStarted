// J133 — Limpeza 2027 (26/11/2026, decisão do Chris: "simplificar"). LZ5b: o Resumo Executivo e o Painel Operacional da Amanda ficam só
// com o que não existe em outra tela; o que repetia a aba Agora (ou contava por outra regra) sai. Esperado:
//  1. Resumo Executivo do Chris: "O que a Amanda decidiu", até quando, pedido pelo site, Radar, Backup completo e — logo depois do
//     backup — a conferência manual "Envio de arquivos" (I166, que morava na Saúde das Automações); sem semáforo, placar de calendários
//     e os cartões de extras / vídeos atrasados / atrasadas do time;
//  2. redesenhar o Resumo destrói a conferência anterior: continua UMA só;
//  3. o mesmo cockpit no Financeiro (sem organização) não leva a conferência de arquivos nem os cartões que saíram;
//  4. Painel Operacional da Amanda: pedidos para pular legenda (com Aprovar/Recusar), "você resolveu hoje", Radar; sem "Como está o
//     dia", carga por editor, vídeos por cliente, criar demanda, por funcionário, disciplina, calendários, folha de extras, pedidos de
//     prazo; o Resumo Executivo da Amanda não leva a conferência de arquivos (é do Chris).
import { entrarComo, foto, entrarGerencia } from '../lib/navegador.mjs';
export const id = 'J133';
export const nome = 'Resumo Executivo e Painel da Amanda sem o que repete o Agora (LZ5b)';

const SAI_RESUMO = [/Saúde geral da operação/, /extra\(s\) da folha/, /vídeo\(s\) atrasado\(s\)/, /atrasada\(s\) no time/, /Calendários do mês/];
const SAI_PAINEL = [/Como está o dia/, /Carga por editor/, /Vídeos por Cliente/, /Criar nova demanda/, /Por funcionário/, /Disciplina de hoje/,
  /Calendários do mês/, /Folha de extras/, /Pedidos de novo prazo/, /Aprovações Pendentes/, /Em aberto no total/];

async function abrirSub(page, sub, pronto) {
  await page.evaluate(s => setGerenciaSub(s, document.querySelector(`.subtab[data-sub="${s}"]`)), sub);
  await page.waitForFunction(pronto, null, { timeout: 60000 });
  await page.waitForTimeout(2500);
}

export async function executar({ amb, seed, nav, erroGrave, registrar }) {
  const t0 = Date.now(), fim = (caso, ok, detalhe) => registrar({ jornada: id, caso, ok, ms: Date.now() - t0, detalhe });
  const agora = new Date().toISOString();
  const pular = { titulo: '🙋 Decisão sua: liberar pular a legenda? — J133', descricao: 'Ensaio J133: a Gabi pede para pular a legenda.', destinatario: 'Amanda',
    origem: 'gabrielle', status: 'pendente', tipoEspecial: 'pular_legenda', postagemId: 'p-hitech-1', prazoData: '2026-12-20', prazoHora: '18:00', criadoEm: agora, excluido: false };
  await seed.set('demandas', 'j133-pular', pular);
  try {
    // ---- 1 a 3: Chris
    {
      const { page, erros, fechar } = await nav.novaPagina();
      try {
        page.on('dialog', d => d.accept());
        await entrarComo(page, amb.url(), 'Chris'); await page.waitForTimeout(3000); await entrarGerencia(page);
        const prontoResumo = () => !!document.querySelector('#gerenciaChris #btnBackupCompleto') && !!document.querySelector('#gerenciaChris [data-saude-midia-i166] [data-conferir]');
        await abrirSub(page, 'chris', prontoResumo);
        const r = await page.evaluate(() => {
          const c = document.getElementById('gerenciaChris'), t = c.innerText;
          const backup = c.querySelector('#btnBackupCompleto')?.closest('.card'), midia = c.querySelector('[data-saude-midia-i166]');
          return { t, depois: !!(backup && midia && (backup.compareDocumentPosition(midia) & Node.DOCUMENT_POSITION_FOLLOWING)), radar: !!c.querySelector('.radar-i110'),
            conferencias: c.querySelectorAll('[data-saude-midia-i166] [data-conferir]').length };
        });
        const fica = [/O que a Amanda decidiu/, /Até quando cada cliente tem postagem/, /pedido\(s\) pelo site em aberto/, /Backup completo/, /Envio de arquivos/];
        const faltam = fica.filter(re => !re.test(r.t)).map(String), sobram = SAI_RESUMO.filter(re => re.test(r.t)).map(String);
        await foto(page, 'J133-resumo-chris');
        fim('LZ5b 1 Resumo Executivo do Chris: fica o que é único (com "Envio de arquivos" logo depois do backup), sai o que repete o Agora',
          !faltam.length && !sobram.length && r.depois && r.radar && r.conferencias === 1,
          `faltam: ${faltam.join(', ') || '—'} · sobram: ${sobram.join(', ') || '—'} · conferência depois do backup: ${r.depois} · Radar: ${r.radar}`);
        // 2: redesenha duas vezes; a conferência antiga é destruída (continua uma)
        await abrirSub(page, 'chris', prontoResumo);
        await abrirSub(page, 'chris', prontoResumo);
        const n = await page.evaluate(() => ({ dentro: document.querySelectorAll('#gerenciaChris [data-saude-midia-i166] [data-conferir]').length,
          total: [...document.querySelectorAll('h2')].filter(h => /Envio de arquivos/.test(h.textContent)).length }));
        fim('LZ5b 2 redesenhar o Resumo não duplica a conferência de arquivos', n.dentro === 1 && n.total === 1, `${n.dentro} no Resumo · ${n.total} na página`);
        // 3: o Financeiro usa o mesmo cockpit, sem organização
        const fin = await page.evaluate(async () => { const d = document.createElement('div'); d.innerHTML = await htmlCockpitCompleto({ organizacao: false }); return d.innerText; });
        const sobramFin = [...SAI_RESUMO, /Envio de arquivos/, /Até quando cada cliente/].filter(re => re.test(fin)).map(String);
        fim('LZ5b 3 Financeiro (mesmo cockpit, sem organização): backup e Radar ficam; nada do que saiu, sem a conferência de arquivos',
          /Backup completo/.test(fin) && /Radar/.test(fin) && !sobramFin.length, `sobram: ${sobramFin.join(', ') || '—'}`);
        const graves = erros.filter(erroGrave);
        if (graves.length) fim('LZ5b Chris sem erro grave', false, graves[0].slice(0, 200));
      } finally { await fechar(); }
    }
    // ---- 4: Amanda
    {
      const { page, erros, fechar } = await nav.novaPagina();
      try {
        page.on('dialog', d => d.accept());
        await entrarComo(page, amb.url(), 'Amanda'); await page.waitForTimeout(3000); await entrarGerencia(page);
        await abrirSub(page, 'amanda', () => /você resolveu hoje/.test(document.getElementById('gerenciaAmanda')?.innerText || '') && !!document.querySelector('#gerenciaAmanda .radar-i110'));
        const p = await page.evaluate(() => { const c = document.getElementById('gerenciaAmanda'); const item = [...c.querySelectorAll('.item')].find(i => /J133/.test(i.innerText));
          return { t: c.innerText, botoes: item ? [...item.querySelectorAll('button')].map(b => b.textContent.trim()) : [] }; });
        const sobram = SAI_PAINEL.filter(re => re.test(p.t)).map(String);
        const pularOk = /Pedidos pra pular legenda/.test(p.t) && p.botoes.some(b => /Aprovar/.test(b)) && p.botoes.some(b => /Recusar/.test(b));
        await foto(page, 'J133-painel-amanda');
        await abrirSub(page, 'chris', () => !!document.querySelector('#gerenciaChris #btnBackupCompleto'));
        const midiaAmanda = await page.evaluate(() => document.querySelectorAll('#gerenciaChris [data-saude-midia-i166] [data-conferir]').length);
        fim('LZ5b 4 Painel da Amanda: pular legenda (Aprovar/Recusar), "você resolveu hoje" e Radar ficam; sai o que repete o Agora; Resumo da Amanda sem a conferência de arquivos',
          pularOk && !sobram.length && midiaAmanda === 0, `pular legenda: ${pularOk ? 'ok' : 'NÃO'} (${p.botoes.join(' / ') || 'sem item'}) · sobram: ${sobram.join(', ') || '—'} · conferência no Resumo da Amanda: ${midiaAmanda}`);
        const graves = erros.filter(erroGrave);
        if (graves.length) fim('LZ5b Amanda sem erro grave', false, graves[0].slice(0, 200));
      } finally { await fechar(); }
    }
  } catch (e) { fim('J133 execução', false, String(e).replace(/\s+/g, ' ').slice(0, 300)); }
  finally {
    // o pedido da jornada não fica na fila de quem vem depois
    await seed.set('demandas', 'j133-pular', { ...pular, excluido: true, excluidoPor: 'ensaio J133', excluidoEm: new Date().toISOString() }).catch(() => {});
  }
}
