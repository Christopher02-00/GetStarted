// J12 — Tour: cada papel abre TODAS as telas do próprio menu e espera a tela assentar.
// Vermelho se: erro grave no console, tela sem conteúdo (view vazia), ou texto de indisponibilidade/erro na tela.
// Feito para rodar sobre a cópia anonimizada do banco real (ENSAIO_DADOS_REAIS) — é onde formato legado aparece.
import { entrarComo, foto, menuVisivel } from '../lib/navegador.mjs';
export const id = 'J12';
export const nome = 'Tour: cada papel abre todas as telas do seu menu sem erro';

const PAPEIS = (process.env.ENSAIO_PAPEIS || 'Chris,Amanda,Cecília,Helo,João Victor,Nathan,Luís,Yas').split(',');
const RUIM = /Não consegui|não foi possível carregar|indisponível no momento|Erro ao carregar|Missing or insufficient permissions|undefined|NaN\b|\[object Object\]/;

export async function executar({ amb, seed, nav, erroGrave, registrar }) {
  for (const pessoa of PAPEIS) {
    const { page, erros, fechar } = await nav.novaPagina(); const t0 = Date.now();
    try {
      page.on('dialog', d => d.dismiss().catch(() => {}));
      await entrarComo(page, amb.url(), pessoa); await page.waitForTimeout(4000);
      const itens = (await menuVisivel(page)).filter(idn => /^nav[A-Z]/.test(idn) && !/^navgroup/.test(idn));
      const problemas = []; let abertas = 0;
      for (const idn of itens) {
        const antes = erros.length;
        const ok = await page.evaluate(idn => { const el = document.getElementById(idn); if (!el) return false; el.click(); return true; }, idn).catch(() => false);
        if (!ok) continue;
        await page.waitForTimeout(2500);
        // a view visível depois do clique
        const info = await page.evaluate(() => { const v = [...document.querySelectorAll('.view')].find(v => getComputedStyle(v).display !== 'none'); return v ? { id: v.id, texto: (v.innerText || '').trim(), n: v.querySelectorAll('*').length } : null; });
        abertas++;
        const novos = erros.slice(antes).filter(erroGrave);
        if (novos.length) problemas.push(`${idn}: ${novos[0].slice(0, 140)}`);
        else if (!info) problemas.push(`${idn}: nenhuma view visível`);
        else if (info.texto.length < 20 && info.n < 5) problemas.push(`${idn} → ${info.id}: tela vazia`);
        else { const m = info.texto.match(RUIM); if (m) problemas.push(`${idn} → ${info.id}: "${m[0]}"`); }
        if (problemas.length && problemas.at(-1).startsWith(idn)) await foto(page, `J12-${pessoa}-${idn}`);
      }
      registrar({ jornada: id, caso: `${pessoa} abre ${abertas} telas`, ok: problemas.length === 0, ms: Date.now() - t0, detalhe: problemas.length ? problemas.slice(0, 4).join(' | ') : `${abertas} telas sem erro` });
    } catch (e) { registrar({ jornada: id, caso: `${pessoa} tour`, ok: false, ms: Date.now() - t0, detalhe: String(e).slice(0, 220) }); }
    finally { await fechar(); }
  }
}
