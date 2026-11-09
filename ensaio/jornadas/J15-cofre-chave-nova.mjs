// J15 — Cofre: a chave que protege as credenciais sai do HTML público (P9, ficha 2026-11-09-cofre-chave-fora-do-html).
// Registros antigos (chave do HTML) continuam legíveis; o Chris vê a prévia sem gravar, protege, e depois disso
// Cecília revela o mesmo texto com a chave nova, que não aparece no código. Rules: só Chris cria a chave; Helo não lê.
import fs from 'node:fs';
import path from 'node:path';
import { webcrypto as wc } from 'node:crypto';
import { entrarComo, foto, entrarGerencia } from '../lib/navegador.mjs';
import { RAIZ } from '../lib/emulador.mjs';
export const id = 'J15';
export const nome = 'Cofre: chave nova fora do HTML, prévia sem gravar, migração e leitura por papel';

const REGISTROS = [
  { id: 'j15-instagram', cliente: 'Ensaio J15 — Instagram', usuario: 'j15@ensaio', segredo: 'J15-segredo-instagram-1' },
  { id: 'j15-meta', cliente: 'Ensaio J15 — Meta Business', usuario: 'j15b@ensaio', segredo: 'J15-segredo-meta-2' },
  { id: 'j15-arquivado', cliente: 'Ensaio J15 — Antigo', usuario: 'j15c@ensaio', segredo: 'J15-segredo-arquivado-3', excluido: true },
];
const NOVO = { cliente: 'Ensaio J15 — Novo depois', usuario: 'j15d@ensaio', segredo: 'J15-segredo-novo-4' };

const b64 = u8 => Buffer.from(u8).toString('base64');
const esperar = async (fn, ms = 20000) => { const fim = Date.now() + ms; while (Date.now() < fim) { const r = await fn(); if (r) return r; await new Promise(r => setTimeout(r, 1000)); } return null; };

// A chave antiga é lida do próprio escritorio.html do checkout (nunca copiada para o ensaio).
function chaveLegadaTexto() {
  const html = fs.readFileSync(path.join(RAIZ, 'escritorio.html'), 'utf8');
  const m = html.match(/const SENHA_GERENCIA_COFRE = '([^']+)';/);
  if (!m) throw new Error('chave antiga não encontrada no escritorio.html');
  return m[1];
}
async function cifrarV1(texto) {
  const material = await wc.subtle.importKey('raw', new TextEncoder().encode(chaveLegadaTexto()), 'PBKDF2', false, ['deriveKey']);
  const chave = await wc.subtle.deriveKey({ name: 'PBKDF2', salt: new TextEncoder().encode('get-started-cofre-salt'), iterations: 100000, hash: 'SHA-256' },
    material, { name: 'AES-GCM', length: 256 }, false, ['encrypt']);
  const iv = wc.getRandomValues(new Uint8Array(12));
  const c = await wc.subtle.encrypt({ name: 'AES-GCM', iv }, chave, new TextEncoder().encode(texto));
  return { iv: b64(iv), dados: b64(new Uint8Array(c)) };
}

// Escrita/leitura direta pelo SDK da própria página (mesmo app, mesma sessão, mesmas rules).
async function tentarNoBanco(page, op) {
  return page.evaluate(async op => {
    try {
      const { getApp } = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js');
      const f = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js');
      const db = f.getFirestore(getApp()); const ref = f.doc(db, 'cofre_chaves', 'v2');
      if (op === 'ler') { await f.getDoc(ref); return 'permitido'; }
      await f.setDoc(ref, { chave: 'A'.repeat(43) + '=', criadoEm: 'ensaio', criadoPor: 'ensaio' }); return 'permitido';
    } catch (e) { return String(e.code || e.message); }
  }, op);
}

// Linhas do bloco match/cofre_chaves no firestore.rules do checkout (para a negação esperada).
function linhasRegraChaves() {
  const L = fs.readFileSync(path.join(RAIZ, 'firestore.rules'), 'utf8').split('\n');
  const a = L.findIndex(l => l.startsWith('match/cofre_chaves/')); if (a < 0) return null;
  const b = L.findIndex((l, i) => i > a && l.trim() === '}');
  return [a + 1, b + 1];
}

export async function executar({ amb, seed, nav, erroGrave, registrar, esperarNegacao }) {
  for (const r of REGISTROS) {
    await seed.set('cofre_senhas', r.id, { cliente: r.cliente, usuario: r.usuario, notas: '', senhaCriptografada: await cifrarV1(r.segredo), criadoPor: 'Amanda', ...(r.excluido ? { excluido: true } : {}) });
  }

  const passo = async (caso, pessoa, corpo) => {
    const { page, erros, fechar } = await nav.novaPagina(); const t0 = Date.now();
    try {
      page.on('dialog', d => d.type() === 'prompt' ? d.accept('ensaio-senha-pessoal-123') : d.accept());
      await entrarComo(page, amb.url(), pessoa); await page.waitForTimeout(2500);
      const res = await corpo(page);
      const graves = erros.filter(erroGrave);
      await foto(page, `J15-${caso.replace(/\W+/g, '_')}`);
      registrar({ jornada: id, caso, ok: !!res?.ok && !graves.length, ms: Date.now() - t0, detalhe: (res?.detalhe || 'estado esperado não chegou') + (graves.length ? ' | ' + graves[0] : '') });
      return !!res?.ok;
    } catch (e) { await foto(page, `J15-${caso.replace(/\W+/g, '_')}-falha`); registrar({ jornada: id, caso, ok: false, ms: Date.now() - t0, detalhe: String(e).slice(0, 220) }); return false; }
    finally { await fechar(); }
  };

  const revelarComoCecilia = async (page, docId) => {
    await page.evaluate(() => irPara('cofreCecilia', document.getElementById('navCofreCecilia')));
    const btn = `button[onclick*="revelarSenhaCofreCecilia('${docId}')"]`;
    await page.waitForSelector(btn, { timeout: 20000 }); await page.click(btn);
    return esperar(() => page.evaluate(i => (document.getElementById('senhaCeciliaRevelada_' + i)?.textContent || '').replace('🔓', '').trim(), docId), 10000);
  };
  const abrirCofreGerencia = async page => {
    await entrarGerencia(page);
    await page.evaluate(() => setGerenciaSub('cofreSenhas', document.querySelector('[data-sub="cofreSenhas"]')));
  };

  // 1. Antes da migração: Cecília revela um registro antigo normalmente.
  await passo('1 Cecília revela credencial antiga', 'Cecília', async page => {
    const t = await revelarComoCecilia(page, 'j15-instagram');
    return { ok: t === REGISTROS[0].segredo, detalhe: `revelado ${t === REGISTROS[0].segredo ? 'igual ao original' : JSON.stringify(t)}` };
  });

  // 2. Rules: Cecília e Amanda não criam a chave; Helo nem lê.
  await passo('2 Rules: só o Chris cria a chave; Helo não lê', 'Helo', async page => {
    const leHelo = await tentarNoBanco(page, 'ler');
    return { ok: /permission/i.test(leHelo), detalhe: `Helo lê cofre_chaves/v2 → ${leHelo}` };
  });
  const faixa = linhasRegraChaves();
  if (faixa) esperarNegacao(id, 'create', faixa, 2); // Cecília e Amanda tentam criar a chave → a regra precisa negar
  for (const pessoa of ['Cecília', 'Amanda']) {
    await passo(`2 Rules: ${pessoa} não cria a chave`, pessoa, async page => {
      const cria = await tentarNoBanco(page, 'criar');
      const existe = await seed.get('cofre_chaves', 'v2');
      return { ok: /permission/i.test(cria) && !existe, detalhe: `${pessoa} cria cofre_chaves/v2 → ${cria} · chave no banco: ${!!existe}` };
    });
  }

  // 3. Prévia do Chris: mostra os 3 antigos e não grava nada.
  await passo('3 Chris vê a prévia sem gravar', 'Chris', async page => {
    await abrirCofreGerencia(page);
    await page.waitForSelector('#cofreProtecaoPrevia', { timeout: 20000 }); await page.click('#cofreProtecaoPrevia');
    const st = await esperar(() => page.evaluate(() => { const t = document.getElementById('cofreProtecaoStatus')?.innerText || ''; return /chave antiga/.test(t) ? t : null; }));
    const chave = await seed.get('cofre_chaves', 'v2');
    const docs = (await seed.listar('cofre_senhas')).filter(d => d.id.startsWith('j15-'));
    const intactos = docs.every(d => d.senhaCriptografada?.versao !== 2);
    const botao = await page.evaluate(() => !document.getElementById('cofreProtecaoAplicar')?.disabled);
    return { ok: /na chave antiga: 3/.test(st || '') && !chave && intactos && botao, detalhe: `${(st || '').replace(/\s+/g, ' ').slice(0, 120)} · chave criada: ${!!chave} · registros intactos: ${intactos}` };
  });

  // 4. Chris protege: chave nova criada, os 3 registros (inclusive o arquivado) passam para a versão 2.
  await passo('4 Chris protege o cofre', 'Chris', async page => {
    await abrirCofreGerencia(page);
    await page.waitForSelector('#cofreProtecaoPrevia', { timeout: 20000 }); await page.click('#cofreProtecaoPrevia');
    await page.waitForFunction(() => !document.getElementById('cofreProtecaoAplicar')?.disabled, null, { timeout: 20000 });
    await page.click('#cofreProtecaoAplicar');
    const st = await esperar(() => page.evaluate(() => { const t = document.getElementById('cofreProtecaoStatus')?.innerText || ''; return /Convertidos/.test(t) ? t : null; }), 40000);
    const chave = await seed.get('cofre_chaves', 'v2');
    const docs = (await seed.listar('cofre_senhas')).filter(d => d.id.startsWith('j15-'));
    const v2 = docs.filter(d => d.senhaCriptografada?.versao === 2).length;
    return { ok: /Convertidos: 3/.test(st || '') && chave?.chave?.length === 44 && v2 === 3, detalhe: `${(st || '').replace(/\s+/g, ' ').slice(0, 90)} · chave: ${chave ? 'criada' : 'ausente'} · v2: ${v2}/3` };
  });

  // 5. Depois: Cecília revela o mesmo texto; a chave nova não está no HTML servido.
  await passo('5 Cecília revela com a chave nova; chave fora do HTML', 'Cecília', async page => {
    const t = await revelarComoCecilia(page, 'j15-meta');
    const chave = (await seed.get('cofre_chaves', 'v2'))?.chave || '';
    const html = await (await fetch(amb.url().split('?')[0])).text();
    const fora = chave.length === 44 && !html.includes(chave);
    return { ok: t === REGISTROS[1].segredo && fora, detalhe: `revelado ${t === REGISTROS[1].segredo ? 'igual ao original' : JSON.stringify(t)} · chave nova no HTML: ${!fora}` };
  });

  // 6. Segunda rodada não faz nada (idempotente) e credencial nova já nasce na versão 2.
  await passo('6 Prévia de novo = nada a fazer; credencial nova nasce protegida', 'Chris', async page => {
    await abrirCofreGerencia(page);
    await page.waitForSelector('#cofreProtecaoPrevia', { timeout: 20000 }); await page.click('#cofreProtecaoPrevia');
    const st = await esperar(() => page.evaluate(() => { const t = document.getElementById('cofreProtecaoStatus')?.innerText || ''; return /chave antiga/.test(t) ? t : null; }));
    const desligado = await page.evaluate(() => document.getElementById('cofreProtecaoAplicar')?.disabled === true);
    await page.fill('#cofreCliente', NOVO.cliente); await page.fill('#cofreUsuario', NOVO.usuario); await page.fill('#cofreSenha', NOVO.segredo);
    await page.evaluate(() => salvarSenhaCofre());
    const novo = await esperar(async () => (await seed.listar('cofre_senhas')).find(d => d.cliente === NOVO.cliente));
    return { ok: /na chave antiga: 0/.test(st || '') && desligado && novo?.senhaCriptografada?.versao === 2, detalhe: `${(st || '').replace(/\s+/g, ' ').slice(0, 80)} · botão desligado: ${desligado} · novo registro versão: ${novo?.senhaCriptografada?.versao ?? 'ausente'}` };
  });
}
