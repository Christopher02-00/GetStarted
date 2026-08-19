#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const raiz=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const ler=arquivo=>fs.readFileSync(path.join(raiz,arquivo),'utf8');
const escritorio=ler('escritorio.html');
const avulso=ler('avulso.html');
const index=ler('index.html');
const links=ler('links.html');
const pdf=fs.readFileSync(path.join(raiz,'Planos.pdf'));
let total=0;
function exigir(condicao,mensagem){ total++; if(!condicao) throw new Error('FALHOU: '+mensagem); console.log('PASS ',mensagem); }
function trecho(fonte,inicio,fim){ const a=fonte.indexOf(inicio),b=fonte.indexOf(fim,a); if(a<0||b<0) throw new Error('Trecho ausente: '+inicio); return fonte.slice(a,b); }

exigir(/<meta name="gs-build" content="2026-08-(?:18-(?:planos-premium-conteudos-vivos-v80|ciclo-clientes-propostas-v81)|19-calendarios-stories-v91)">/.test(escritorio),'build V80 ou sucessor identificado no Escritório');
exigir(avulso.includes('<meta name="gs-build" content="2026-08-18-planos-premium-conteudos-vivos-v80">'),'build V80 identificado no cadastro');
exigir((pdf.toString('latin1').match(/\/Type\s*\/Page\b/g)||[]).length===9,'PDF final preserva as nove páginas');
exigir(pdf.length<25*1024*1024,'PDF final cabe no limite de upload pelo navegador');

const versao='Planos.pdf?v=2026-08-18-premium-conteudos-vivos-v80';
exigir((avulso.match(new RegExp(versao.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'),'g'))||[]).length===2,'pré-cadastro e onboarding usam o mesmo PDF versionado');
exigir(index.includes(versao)&&links.includes(versao)&&escritorio.includes(versao),'site, perfil e área interna usam o mesmo catálogo');

for(const nome of ['Básico','Intermediário','Premium','Premium Presença 2x','Premium Presença 3x','Premium Conteúdos Vivos']){
  exigir(avulso.includes(`data-plano="${nome}"`),'cadastro final oferece '+nome);
  exigir(escritorio.includes(`'${nome}'`)||escritorio.includes(`value="${nome}"`),'Central reconhece '+nome);
}
for(const [nome,valor] of [['Básico',1200],['Intermediário',1700],['Premium',2700],['Premium Presença 2x',2900],['Premium Presença 3x',3500]]){
  exigir(avulso.includes(`'${nome}':${valor}`),'valor de catálogo preservado para '+nome);
}
exigir(avulso.includes("'Premium Conteúdos Vivos':null")&&avulso.includes("Number.isFinite(preco)?String(preco):''"),'Conteúdos Vivos não recebe preço inventado');
exigir(avulso.includes("plano==='Básico'?'entrega_direta':'postagem_completa'")&&avulso.includes("plano.startsWith('Premium Presença')||plano==='Premium Conteúdos Vivos'?'sim':'nao'"),'seleção sugere entrega e Stories coerentes com o catálogo');

const editor=trecho(escritorio,'const PLANOS_MENSAIS_OFICIAIS','  window.editarClienteAtivoCentral');
exigir(editor.includes("...(atual?[atual]:[])")&&editor.includes('opcoesPlanosMensais(v.plano)'),'editor preserva nome legado desconhecido');
exigir(!fs.existsSync(path.join(raiz,'Plano_Conteudo_Organico_Get_Setembro_2026.pdf')),'documento orgânico interno não entrou no repositório');
exigir(![avulso,index,links,escritorio].some(f=>f.includes('24 vídeos · 6 pessoas')),'páginas públicas não expõem o planejamento orgânico interno');

for(const arquivo of ['escritorio.html','avulso.html','index.html','links.html']){
  const fonte=ler(arquivo);
  const blocos=[...fonte.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/gi)].filter(m=>!(/\bsrc\s*=/.test(m[1])));
  for(const bloco of blocos){ if(/\btype\s*=\s*["']module["']/.test(bloco[1])) new vm.SourceTextModule(bloco[2]); else new vm.Script(bloco[2]); }
}
exigir(true,'scripts inline alterados compilam');

console.log(`RESULTADO: APROVADO (${total} asserções V80)`);
