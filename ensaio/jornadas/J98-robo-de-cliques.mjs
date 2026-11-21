// J98 — Robô de cliques (Programa Estabilidade, 21/11/2026; pedido do Chris: "testes de uso real por cada pessoa, cada operação,
// cada botão e clique"). Cada papel entra, abre CADA tela do próprio menu e clica em CADA botão que só navega/abre/filtra (abas,
// filtros, semanas, meses, "abrir", "ver", expandir, detalhes). Fecha o que abriu e segue. Vermelho se um clique gera erro grave no
// console, se a tela some (nenhuma view visível) ou se aparece texto de erro/indisponibilidade.
// Botões que gravam (aprovar, liberar, enviar, salvar, excluir, agendar…) ficam de fora AQUI de propósito: cada um tem a sua jornada
// com o efeito conferido no servidor (J01–J97). O relatório lista quantos botões foram clicados e quais handlers foram exercitados.
// ENSAIO_PAPEIS=Chris,Amanda… limita os papéis; ENSAIO_ROBO_MAX limita botões por tela (padrão 60).
import { entrarComo, foto, menuVisivel } from '../lib/navegador.mjs';
export const id = 'J98';
export const nome = 'Robô de cliques: cada papel clica em cada botão de navegação/abertura de cada tela, sem erro';

const PAPEIS = (process.env.ENSAIO_PAPEIS || 'Chris,Amanda,Cecília,Helo,João Victor,Nathan,Luís').split(',');
const MAX = Number(process.env.ENSAIO_ROBO_MAX || 60);
const RUIM = /Não consegui|não foi possível carregar|indisponível no momento|Erro ao carregar|Missing or insufficient permissions|\bundefined\b|\bNaN\b|\[object Object\]/;
// grava, decide ou sai: nunca clicado pelo robô
export const GRAVA = /excluir|apagar|cancel|remov|arquiv|deslig|aprov|liber|envi|salv|confirm|conclu|public|agend|delet|reset|limp|zer|recuper|restaur|devolv|pag|cobr|gera|cria|adicion|marc|registr|distribu|atribu|reabr|sair|logout|trocar|mudar[A-Z]?[a-z]*Senha|senha|import|export|baix|upload|anex|copiar|whats|mailto|imprim|sincroniz|dispens|recus|aceit|assin|vincul|desvincul|substitu|retir|encerr|finaliz|reivindic|assum|repass|redistribu|pedirAjuste|pedir|solicit|respond|comentar|avaliar|testar|ativar|renovar|notific|lembrar|cobrar/i;
// texto de botão que só mostra/navega (botões com ouvinte em vez de onclick inline)
export const TEXTO_SEGURO = /^(?:[^\p{L}\d]*)(ver|abrir|mostrar|filtrar|atualizar|conferir|detalhes|histórico|próxim|anterior|semana|mês|hoje|amanhã|todos|todas|lista|calendário|voltar|fechar|expandir|recolher|mais|menos|ontem|esta semana|este mês|[◀▶‹›←→«»])/iu;
export const NAVEGA = /irPara|navegar|setTab|subtab|Subtab|aba|Aba|filtro|Filtro|filtrar|mostrar|alternar|toggle|abrir|Abrir|ver[A-Z(]|render|expandir|recolher|semana|Semana|mes[A-Z(]|Mes|selecionar|escolher|focar|rolar|detalhe|Detalhe|historico|Historico|linhaDoTempo|fecharModal|voltar/;

export async function executar({ amb, seed, nav, erroGrave, registrar }) {
  const handlers = new Set();
  for (const pessoa of PAPEIS) {
    const { page, erros, fechar } = await nav.novaPagina(); const t0 = Date.now();
    let cliques = 0, telas = 0; const problemas = [];
    try {
      page.on('dialog', d => d.dismiss().catch(() => {}));
      await entrarComo(page, amb.url(), pessoa); await page.waitForTimeout(4000);
      const itens = (await menuVisivel(page)).filter(idn => /^nav[A-Z]/.test(idn) && !/^navgroup/.test(idn) && !/Sair|Logout/i.test(idn));
      for (const idn of itens) {
        const abriu = await page.evaluate(idn => { const el = document.getElementById(idn); if (!el) return false; el.click(); return true; }, idn).catch(() => false);
        if (!abriu) continue; telas++;
        await page.waitForTimeout(2000);
        const view = await page.evaluate(() => [...document.querySelectorAll('.view')].find(v => getComputedStyle(v).display !== 'none')?.id || '');
        if (!view) { problemas.push(`${idn}: nenhuma view visível`); continue; }
        // os botões seguros desta tela (onclick inline que só navega/abre/filtra, ou <summary>)
        const alvos = await page.evaluate(([view, max, grava, navega, seguro]) => {
          const G = new RegExp(grava, 'i'), N = new RegExp(navega), T = new RegExp(seguro, 'iu');
          const v = document.getElementById(view); if (!v) return [];
          const els = [...v.querySelectorAll('button,a[onclick],[role=tab],[role=button],.chip[onclick],.tab[onclick],summary')];
          const out = [];
          els.forEach((el, i) => {
            if (el.offsetParent === null || el.disabled || el.closest('form')) return;
            const oc = el.tagName === 'SUMMARY' ? 'summary' : (el.getAttribute('onclick') || ''), txt = (el.innerText || el.getAttribute('aria-label') || '').trim().slice(0, 50);
            const dados = [...el.attributes].filter(a => a.name.startsWith('data-')).map(a => a.name + '=' + a.value).join(' ');
            if (el.tagName !== 'SUMMARY') {
              if (G.test(oc) || G.test(txt) || G.test(dados)) return;
              if (!(oc ? N.test(oc) : T.test(txt))) return;
            }
            el.setAttribute('data-robo-j98', view + '-' + i); out.push({ sel: view + '-' + i, oc: (oc || '[' + (dados.split(' ')[0] || 'ouvinte') + ']').slice(0, 80), txt });
          });
          return out.slice(0, max);
        }, [view, MAX, GRAVA.source, NAVEGA.source, TEXTO_SEGURO.source]);
        for (const a of alvos) {
          const antes = erros.length;
          const ok = await page.evaluate(sel => { const el = document.querySelector(`[data-robo-j98="${sel}"]`); if (!el || el.offsetParent === null) return false; el.click(); return true; }, a.sel).catch(() => false);
          if (!ok) continue; cliques++;
          const h = (a.oc.match(/^[\s(]*(?:window\.)?([A-Za-z_$][\w$]*)\s*\(/) || [])[1] || (a.oc.startsWith('[') ? a.oc : ''); if (h) handlers.add(h);
          await page.waitForTimeout(450);
          const novos = erros.slice(antes).filter(erroGrave);
          if (novos.length) { problemas.push(`${idn} → “${a.txt || a.oc}”: ${novos[0].slice(0, 150)}`); await foto(page, `J98-${pessoa}-${idn}-${cliques}`); }
          // fecha modal aberto e volta para a tela, se o clique navegou
          await page.evaluate(() => { const o = document.getElementById('overlayView'); if (o?.classList.contains('show')) { try { window.fecharModal?.(); } catch (e) {} } }).catch(() => {});
          const ainda = await page.evaluate(view => { const v = document.getElementById(view); return !!v && getComputedStyle(v).display !== 'none'; }, view).catch(() => false);
          if (!ainda) { await page.evaluate(idn => document.getElementById(idn)?.click(), idn).catch(() => {}); await page.waitForTimeout(1200); }
        }
        const texto = await page.evaluate(view => (document.getElementById(view)?.innerText || ''), view).catch(() => '');
        const m = texto.match(RUIM); if (m) problemas.push(`${idn} → ${view}: texto "${m[0]}"`);
      }
      registrar({ jornada: id, caso: `${pessoa}: ${telas} telas · ${cliques} cliques`, ok: problemas.length === 0, ms: Date.now() - t0, detalhe: problemas.length ? problemas.slice(0, 5).join(' | ') : `${cliques} cliques sem erro` });
    } catch (e) { registrar({ jornada: id, caso: `${pessoa}: robô`, ok: false, ms: Date.now() - t0, detalhe: String(e).replace(/\s+/g, ' ').slice(0, 240) }); }
    finally { await fechar(); }
  }
  registrar({ jornada: id, caso: `handlers exercitados pelo robô: ${handlers.size}`, ok: true, ms: 0, detalhe: [...handlers].sort().join(', ').slice(0, 900) });
}
