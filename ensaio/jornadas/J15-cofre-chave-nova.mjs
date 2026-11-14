// J15 — Cofre só com a chave nova (P9 fase B, 09/11/2026): a chave antiga e o PBKDF2 saíram do escritorio.html.
// Seed: chave v2 em cofre_chaves, 2 registros v2 e 1 sobra v1. Esperado: Cecília revela os v2; o HTML não tem a chave
// antiga nem a nova; a prévia aponta a sobra sem gravar; a sobra não abre; credencial nova nasce v2. Rules: só o Chris cria a chave; Helo não lê.
import fs from 'node:fs';
import path from 'node:path';
import { webcrypto as wc } from 'node:crypto';
import { entrarComo, foto, entrarGerencia } from '../lib/navegador.mjs';
import { RAIZ } from '../lib/emulador.mjs';
export const id = 'J15';
export const nome = 'Cofre: só a chave nova (fase B), sobra antiga não abre; rules da chave';

const REGISTROS = [
  { id: 'j15-instagram', cliente: 'Ensaio J15 — Instagram', usuario: 'j15@ensaio', segredo: 'J15-segredo-instagram-1' },
  { id: 'j15-meta', cliente: 'Ensaio J15 — Meta Business', usuario: 'j15b@ensaio', segredo: 'J15-segredo-meta-2' },
  { id: 'j15-arquivado', cliente: 'Ensaio J15 — Antigo', usuario: 'j15c@ensaio', segredo: 'J15-segredo-arquivado-3', excluido: true },
];
const NOVO = { cliente: 'Ensaio J15 — Novo depois', usuario: 'j15d@ensaio', segredo: 'J15-segredo-novo-4' };

const b64 = u8 => Buffer.from(u8).toString('base64');
const esperar = async (fn, ms = 20000) => { const fim = Date.now() + ms; while (Date.now() < fim) { const r = await fn(); if (r) return r; await new Promise(r => setTimeout(r, 1000)); } return null; };

const CHAVE_V2 = wc.getRandomValues(new Uint8Array(32));
async function cifrar(bytesChave, texto, versao) {
  const chave = await wc.subtle.importKey('raw', bytesChave, { name: 'AES-GCM' }, false, ['encrypt']);
  const iv = wc.getRandomValues(new Uint8Array(12));
  const c = await wc.subtle.encrypt({ name: 'AES-GCM', iv }, chave, new TextEncoder().encode(texto));
  return { iv: b64(iv), dados: b64(new Uint8Array(c)), ...(versao === 2 ? { versao: 2 } : {}) };
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
    return esperar(() => page.evaluate(i => (document.getElementById('senhaCeciliaRevelada_' + i)?.innerText || '').replace('🔓', '').trim(), docId), 10000);
  };
  const abrirCofreGerencia = async page => {
    await entrarGerencia(page);
    await page.evaluate(() => setGerenciaSub('cofreSenhas', document.querySelector('[data-sub="cofreSenhas"]')));
  };

  // 1. Rules, antes de existir a chave: Helo não lê; Cecília e Amanda não criam.
  await passo('1 Rules: só o Chris cria a chave; Helo não lê', 'Helo', async page => {
    const leHelo = await tentarNoBanco(page, 'ler');
    return { ok: /permission/i.test(leHelo), detalhe: `Helo lê cofre_chaves/v2 → ${leHelo}` };
  });
  const faixa = linhasRegraChaves();
  if (faixa) esperarNegacao(id, 'create', faixa, 2);
  for (const pessoa of ['Cecília', 'Amanda']) {
    await passo(`1 Rules: ${pessoa} não cria a chave`, pessoa, async page => {
      const cria = await tentarNoBanco(page, 'criar');
      const existe = await seed.get('cofre_chaves', 'v2');
      return { ok: /permission/i.test(cria) && !existe, detalhe: `${pessoa} cria cofre_chaves/v2 → ${cria} · chave no banco: ${!!existe}` };
    });
  }

  // Estado de produção depois da proteção: chave v2 criada e registros v2; um v1 sobrando para provar que não abre.
  await seed.set('cofre_chaves', 'v2', { chave: b64(CHAVE_V2), criadoPor: 'Chris' });
  for (const [n, r] of REGISTROS.entries()) {
    const pacote = n === 1 ? await cifrar(wc.getRandomValues(new Uint8Array(32)), r.segredo, 1) : await cifrar(CHAVE_V2, r.segredo, 2);
    await seed.set('cofre_senhas', r.id, { cliente: r.cliente, usuario: r.usuario, notas: '', senhaCriptografada: pacote, criadoPor: 'Amanda', ...(r.excluido ? { excluido: true } : {}) });
  }

  // 2. Cecília revela com a chave nova; o HTML servido não tem a chave antiga, o PBKDF2 nem a chave nova.
  await passo('2 Cecília revela; HTML sem chave', 'Cecília', async page => {
    const t = await revelarComoCecilia(page, REGISTROS[0].id);
    const html = await (await fetch(amb.url().split('?')[0])).text();
    const antiga = /SENHA_GERENCIA_COFRE|PBKDF2/.test(html), nova = html.includes(b64(CHAVE_V2));
    return { ok: t === REGISTROS[0].segredo && !antiga && !nova, detalhe: `revelado ${t === REGISTROS[0].segredo ? 'igual ao original' : JSON.stringify(t)} · chave antiga/PBKDF2 no HTML: ${antiga} · chave nova no HTML: ${nova}` };
  });

  // 3. Prévia do Chris aponta a sobra antiga e não grava nada.
  await passo('3 Chris vê a prévia sem gravar', 'Chris', async page => {
    await abrirCofreGerencia(page);
    await page.waitForSelector('#cofreProtecaoPrevia', { timeout: 20000 }); await page.click('#cofreProtecaoPrevia');
    const st = await esperar(() => page.evaluate(() => { const t = document.getElementById('cofreProtecaoStatus')?.innerText || ''; return /chave antiga/.test(t) ? t : null; }));
    const sobra = (await seed.get('cofre_senhas', REGISTROS[1].id))?.senhaCriptografada;
    return { ok: /na chave antiga: 1/.test(st || '') && /já na chave nova: 2/.test(st || '') && sobra && sobra.versao !== 2, detalhe: `${(st || '').replace(/\s+/g, ' ').slice(0, 120)} · sobra intacta: ${!!sobra && sobra.versao !== 2}` };
  });

  // 4. Credencial nova nasce v2 (Chris); a sobra antiga não abre para a Cecília (sem chave antiga no código).
  await passo('4 Credencial nova nasce v2', 'Chris', async page => {
    await abrirCofreGerencia(page);
    await page.waitForSelector('#cofreCliente', { timeout: 20000 });
    await page.fill('#cofreCliente', NOVO.cliente); await page.fill('#cofreUsuario', NOVO.usuario); await page.fill('#cofreSenha', NOVO.segredo);
    await page.evaluate(() => salvarSenhaCofre());
    const novo = await esperar(async () => (await seed.listar('cofre_senhas')).find(d => d.cliente === NOVO.cliente));
    return { ok: novo?.senhaCriptografada?.versao === 2, detalhe: `novo registro versão: ${novo?.senhaCriptografada?.versao ?? 'ausente'}` };
  });
  await passo('4 Sobra antiga não abre', 'Cecília', async page => {
    const t = await revelarComoCecilia(page, REGISTROS[1].id);
    return { ok: t !== REGISTROS[1].segredo, detalhe: `revelado: ${t === REGISTROS[1].segredo ? 'ABRIU com chave antiga' : 'não abriu'}` };
  });
}
