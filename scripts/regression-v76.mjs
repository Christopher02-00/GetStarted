#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
let total = 0;

function exigir(condicao, mensagem) {
  total++;
  if (!condicao) throw new Error(mensagem);
}

function existe(arquivo) {
  return fs.existsSync(path.join(raiz, arquivo));
}

function ler(arquivo) {
  return fs.readFileSync(path.join(raiz, arquivo), 'utf8');
}

exigir(!existe('preflight.mjs'), 'a cópia antiga de preflight voltou à raiz');
exigir(!existe('regression-critical.mjs'), 'a cópia antiga da regressão crítica voltou à raiz');
exigir(existe('scripts/preflight.mjs'), 'preflight oficial ausente de scripts/');
exigir(existe('scripts/regression-critical.mjs'), 'regressão crítica oficial ausente de scripts/');
exigir(!ler('_config.yml').includes('cópia antiga da raiz'), '_config.yml ainda descreve arquivos removidos');
exigir(ler('calendario.html') === ler('calendarios.html'), 'compatibilidade singular/plural dos calendários divergiu');
exigir(ler('AGENTS.md').includes('Cópias com esses nomes na raiz são legado redundante'),
  'regra permanente contra reintrodução das cópias não foi documentada');

const escritorio = ler('escritorio.html');
exigir(/<meta name="gs-build" content="2026-08-(?:17-(?:auth-carteira-limpeza-v76|central-vendas-v77)|18-(?:contatos-arquivo-unico-v78|calendario-proximo-mes-v79))">/.test(escritorio),
  'marcador do build V76 ou sucessor validado ausente');
exigir(!/^\s*carregarClientesExtras\(\);\s*$/m.test(escritorio),
  'a carteira operacional voltou a consultar o Firebase antes da autenticação');
exigir(!/^\s*renderFuncionarioMesInicio\(\);\s*$/m.test(escritorio),
  'funcionário do mês voltou a consultar o Firebase antes da autenticação');
const mudarUsuario = escritorio.slice(
  escritorio.indexOf('window.mudarUsuarioGlobal = async function'),
  escritorio.indexOf('/* ===== FRENTE C1')
);
exigir(mudarUsuario.includes("await etapaSegura('carregar clientes extras', carregarClientesExtras)"),
  'a carteira operacional perdeu a carga protegida depois da sessão autenticada');
exigir(mudarUsuario.includes("await etapaSegura('funcionário do mês', renderFuncionarioMesInicio)"),
  'funcionário do mês perdeu a carga protegida depois da sessão autenticada');

console.log(`OK — ${total} asserções V76 passaram.`);
