// J16 — Cecília classifica os clientes igual à Amanda, sem ler coleções financeiras (F-12 / P1).
// Amanda (gerência) classifica com contratos/saídas e publica a projeção `castas_operacionais`; Cecília lê a projeção.
// Uma mudança feita pela gerência chega à Cecília na próxima abertura. Cecília não consegue gravar a projeção.
import fs from 'node:fs';
import path from 'node:path';
import { entrarComo, foto } from '../lib/navegador.mjs';
import { RAIZ } from '../lib/emulador.mjs';
export const id = 'J16';
export const nome = 'Casta: Cecília classifica igual à Amanda, sem ler o financeiro';

const esperar = async (fn, ms = 20000) => { const fim = Date.now() + ms; while (Date.now() < fim) { const r = await fn(); if (r) return r; await new Promise(r => setTimeout(r, 1000)); } return null; };
const resumo = m => Object.entries(m || {}).map(([s, c]) => `${s}=${c.tipo}`).sort();

function linhasRegra() {
  const L = fs.readFileSync(path.join(RAIZ, 'firestore.rules'), 'utf8').split('\n');
  const a = L.findIndex(l => l.startsWith('match/castas_operacionais/')); if (a < 0) return null;
  const b = L.findIndex((l, i) => i > a && l.trim() === '}');
  return [a + 1, b + 1];
}

export async function executar({ amb, seed, nav, erroGrave, registrar, esperarNegacao }) {
  // classificação não trivial: um contrato ativo, uma saída efetiva, um avulso marcado à mão
  await seed.set('contratos_cliente', 'mochi', { cliente: 'mochi', clienteNome: 'Mochi', ativo: true, status: 'ativo', excluido: false });
  await seed.set('clientes_encerrados', 'enc-j16-zeiss', { slug: 'zeiss', nome: 'Zeiss', dataSaida: '2026-01-31', excluido: false });
  await seed.set('clientes_config', 'hitech', { modoAprovacaoCliente: 'manual', prazoTacitaHorasUteis: 24, whatsappCobranca: '', excluido: false, tipoCliente: 'avulso' });

  const passo = async (caso, pessoa, corpo) => {
    const { page, erros, fechar } = await nav.novaPagina(); const t0 = Date.now();
    try {
      page.on('dialog', d => d.accept());
      await entrarComo(page, amb.url(), pessoa); await page.waitForTimeout(2500);
      const res = await corpo(page, erros);
      const graves = erros.filter(erroGrave);
      await foto(page, `J16-${caso.replace(/\W+/g, '_')}`);
      registrar({ jornada: id, caso, ok: !!res?.ok && !graves.length, ms: Date.now() - t0, detalhe: (res?.detalhe || 'estado esperado não chegou') + (graves.length ? ' | ' + graves[0] : '') });
      return res;
    } catch (e) { await foto(page, `J16-${caso.replace(/\W+/g, '_')}-falha`); registrar({ jornada: id, caso, ok: false, ms: Date.now() - t0, detalhe: String(e).slice(0, 220) }); return null; }
    finally { await fechar(); }
  };
  const casta = page => page.evaluate(async () => { limparCacheCasta(); return castaDosClientes(); });

  // 1. Amanda classifica e publica a projeção.
  const amanda = await passo('1 Amanda classifica e publica para a equipe', 'Amanda', async page => {
    const m = await casta(page);
    const proj = await esperar(async () => { const l = await seed.listar('castas_operacionais'); return l.length >= Object.keys(m).length && l.length ? l : null; });
    const igual = !!proj && Object.entries(m).every(([s, c]) => proj.find(p => p.id === s)?.tipo === c.tipo);
    const temTipos = ['mochi', 'zeiss', 'hitech'].map(s => `${s}=${m[s]?.tipo}`).join(' ');
    return { ok: igual && m.mochi?.tipo === 'mensalista' && m.zeiss?.tipo === 'encerrado' && m.hitech?.tipo === 'avulso', detalhe: `${Object.keys(m).length} clientes · ${temTipos} · projeção ${proj ? proj.length : 0} docs igual: ${igual}`, m };
  });

  // 2. Cecília vê exatamente a mesma classificação, sem erro de leitura financeira.
  await passo('2 Cecília vê a mesma classificação', 'Cecília', async (page, erros) => {
    const m = await casta(page);
    const a = resumo(amanda?.m), c = resumo(m);
    const igual = a.length > 0 && a.join('|') === c.join('|');
    const semErro = !erros.some(e => /classificar as castas/.test(e));
    return { ok: igual && semErro, detalhe: `Amanda ${a.length} · Cecília ${c.length} · iguais: ${igual} · erro de casta no console: ${!semErro}` };
  });

  // 3. Cecília não grava a projeção (rules negam).
  const faixa = linhasRegra();
  if (faixa) esperarNegacao(id, 'update', faixa, 1);
  await passo('3 Cecília não grava a projeção', 'Cecília', async page => {
    const r = await page.evaluate(async () => {
      try {
        const { getApp } = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js');
        const f = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js');
        await f.setDoc(f.doc(f.getFirestore(getApp()), 'castas_operacionais', 'mochi'), { tipo: 'avulso', origem: 'ensaio', atualizadoEm: 'x', atualizadoPor: 'Cecília' });
        return 'permitido';
      } catch (e) { return String(e.code || e.message); }
    });
    const doc = await seed.get('castas_operacionais', 'mochi');
    return { ok: /permission/i.test(r) && doc?.tipo === 'mensalista', detalhe: `Cecília grava → ${r} · mochi continua ${doc?.tipo}` };
  });

  // 4. Mudança da gerência chega à Cecília: Hitech deixa de ser avulso → Amanda abre → Cecília vê.
  await seed.set('clientes_config', 'hitech', { modoAprovacaoCliente: 'manual', prazoTacitaHorasUteis: 24, whatsappCobranca: '', excluido: false, tipoCliente: 'mensalista' });
  await passo('4 Amanda reabre e a mudança é publicada', 'Amanda', async page => {
    const m = await casta(page);
    const doc = await esperar(async () => { const d = await seed.get('castas_operacionais', 'hitech'); return d?.tipo === 'mensalista' ? d : null; });
    return { ok: m.hitech?.tipo === 'mensalista' && !!doc, detalhe: `Amanda hitech=${m.hitech?.tipo} · projeção hitech=${doc?.tipo || 'não mudou'}` };
  });
  await passo('5 Cecília vê a mudança', 'Cecília', async page => {
    const m = await casta(page);
    return { ok: m.hitech?.tipo === 'mensalista', detalhe: `Cecília hitech=${m.hitech?.tipo}` };
  });
}
