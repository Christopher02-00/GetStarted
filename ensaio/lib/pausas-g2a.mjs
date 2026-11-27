// G2a (27/11/2026): rotinas do motor pausadas por custo do Google (limite gratuito). Lê o conjunto direto do escritorio.html:
// enquanto a rotina estiver pausada, a jornada registra a pausa; ao sair do conjunto, a jornada original volta a rodar sozinha.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
export function rotinaPausadaG2a(nome) {
  const html = fs.readFileSync(path.join(RAIZ, 'escritorio.html'), 'utf8');
  const m = html.match(/const ROTINAS_PAUSADAS_G2A = new Set\(\[([\s\S]*?)\]\)/);
  return !!m && m[1].split(',').map(s => s.trim().replace(/^'|'$/g, '')).includes(nome);
}
export function registrarPausaG2a(registrar, jornada, nome) {
  registrar({ jornada, caso: `rotina "${nome}" pausada (G2a, custo do Google) — o teste original volta quando ela for reescrita`, ok: true, ms: 0, detalhe: 'pausada de propósito; nenhuma leitura gasta por ela' });
}
