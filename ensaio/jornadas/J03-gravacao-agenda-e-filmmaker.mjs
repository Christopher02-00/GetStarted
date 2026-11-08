// J03 — gravação: Cecília agenda pela UI (cliente, data, hora, local, equipe) → Luís vê a sessão dele em Gravações →
// Nathan NÃO vê a sessão do Luís (itens de papel fora do DOM dos outros).
import { entrarComo, foto } from '../lib/navegador.mjs';
export const id = 'J03';
export const nome = 'Gravação: Cecília agenda → Luís vê a sua → Nathan não vê a do Luís';

const LOCAL = 'Rua do Ensaio J03, 123 — Curitiba';
const iso = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const DATA = iso(new Date(Date.now() + 6 * 86400000)); // +6 dias: dia diferente das gravações do seed
const esperar = async (fn, ms = 12000) => { const fim = Date.now() + ms; while (Date.now() < fim) { const r = await fn(); if (r) return r; await new Promise(r => setTimeout(r, 300)); } return null; };

export async function executar({ amb, seed, nav, erroGrave, registrar }) {
  const passo = async (caso, pessoa, acao, verificar) => {
    const { page, erros, fechar } = await nav.novaPagina(); const t0 = Date.now();
    try {
      page.on('dialog', d => d.accept());
      await entrarComo(page, amb.url(), pessoa); await page.waitForTimeout(2500);
      await acao(page);
      const res = await verificar(page);
      const graves = erros.filter(erroGrave);
      await foto(page, `J03-${caso.replace(/\W+/g, '_')}`);
      registrar({ jornada: id, caso, ok: !!res && !graves.length, ms: Date.now() - t0, detalhe: (res ? String(res) : 'estado esperado não chegou') + (graves.length ? ' | ' + graves[0] : '') });
      return !!res;
    } catch (e) { await foto(page, `J03-${caso.replace(/\W+/g, '_')}-falha`); registrar({ jornada: id, caso, ok: false, ms: Date.now() - t0, detalhe: String(e).slice(0, 220) }); return false; }
    finally { await fechar(); }
  };
  const nova = async () => (await seed.listar('agendamentos')).find(a => a.local === LOCAL && !a.excluido);

  // 1. Cecília agenda pela UI
  if (!await passo('1 Cecília agenda gravação Bluefit com Luís', 'Cecília', async page => {
    await page.evaluate(() => irPara('agendamento', document.getElementById('navAgendamento')));
    // lista de clientes confirmada pelo servidor (botão "Atualizar clientes" é o mesmo caminho)
    await page.waitForFunction(() => [...document.querySelectorAll('#agCliente option')].some(o => o.value === 'bluefit'), null, { timeout: 15000 });
    await page.selectOption('#agCliente', 'bluefit');
    await page.fill('#agData', DATA); await page.dispatchEvent('#agData', 'change');
    await page.fill('#agHora', '09:30');
    await page.waitForTimeout(1200); // sugerirQtdPeloBloco pode limpar a estimativa quando não há calendário → a pessoa preenche
    await page.fill('#agQtdPlanejada', '3'); await page.dispatchEvent('#agQtdPlanejada', 'input');
    await page.fill('#agLocal', LOCAL);
    await page.waitForSelector('#agEquipeLinhas select.agEquipePessoa', { timeout: 8000 });
    await page.selectOption('#agEquipeLinhas select.agEquipePessoa >> nth=0', 'Luís');
    await page.click('#btnAgendar');
    // se a casa já tem gravação nesta pauta (mesmo cliente/mês/bloco), o app pede conferência: marcar "outra sessão" e confirmar de novo
    const outra = page.locator('#agOutraSessaoI85');
    try { await outra.waitFor({ timeout: 6000 }); await outra.check(); await page.click('#btnAgendar'); } catch {}
    // REGRA DO ENSAIO: não listar a coleção pelo REST enquanto a transação do app está em voo — o emulador aborta o commit
    // ("Transaction lock timeout", 409). Espera o sinal da própria UI (botão volta ao normal) antes de conferir o banco.
    await page.waitForFunction(() => { const b = document.getElementById('btnAgendar'); return b && !b.disabled && /Agendar/.test(b.textContent) && !/Conferindo|Confirmando/.test(b.textContent); }, null, { timeout: 30000 });
  }, () => esperar(async () => { const a = await nova(); return a && a.status === 'agendado' ? `id ${a.id} · data ${a.data} · filmmaker ${a.filmmaker} · aprovacao=${a.precisaAprovacao}` : null; }, 20000))) return;
  const ag = await nova();

  // 2. Luís vê a própria sessão
  if (!await passo('2 Luís vê a gravação dele', 'Luís', async page => {
    await page.evaluate(() => irPara('agendamento', document.getElementById('navAgendamento')));
    await page.waitForFunction(l => (document.getElementById('view-agendamento')?.innerText || '').includes(l), LOCAL, { timeout: 15000 });
  }, async page => {
    const txt = await page.evaluate(() => document.getElementById('view-agendamento')?.innerText || '');
    if (!txt.includes(LOCAL)) return null;
    if (txt.includes('Hitech')) return null; // a sessão do Nathan não pode aparecer para o Luís
    return 'sessão do Luís visível; sessão do Nathan (Hitech) ausente';
  })) return;

  // 3. Nathan não vê a sessão do Luís
  await passo('3 Nathan não vê a gravação do Luís', 'Nathan', async page => {
    await page.evaluate(() => irPara('agendamento', document.getElementById('navAgendamento')));
    await page.waitForFunction(() => (document.getElementById('view-agendamento')?.innerText || '').includes('Hitech'), null, { timeout: 15000 });
    await page.waitForTimeout(1500);
  }, async page => {
    const txt = await page.evaluate(() => document.getElementById('view-agendamento')?.innerText || '');
    return txt.includes('Hitech') && !txt.includes(LOCAL) && !txt.includes('Bluefit') ? 'só Hitech no DOM do Nathan' : null;
  });
}
