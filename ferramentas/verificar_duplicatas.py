#!/usr/bin/env python3
"""Confere as duplicatas intencionais do Site Get (passo 3 do portão).

1. calendario.html e calendarios.html byte a byte iguais (AGENTS.md).
2. Todo módulo que existe na raiz e também em functions-get/ (mesmo nome de arquivo)
   é byte a byte igual nas duas cópias (contratos compartilhados cliente/servidor).

Pares que já divergiam em 09/11/2026 (o site e as Functions evoluíram separados) estão
em ferramentas/baseline.json → "duplicatas_divergentes": não falham, mas são listados.
Divergência nova falha; par da linha de base que voltou a ficar igual é avisado.

Uso: python3 ferramentas/verificar_duplicatas.py [raiz]   → sai 1 se algo novo divergir.
"""
import hashlib
import json
import os
import sys

BASELINE = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'baseline.json')

IGNORAR = {'node_modules', '.git', '.runtime', 'saida', 'cdn'}
# Nomes genéricos que podem existir dos dois lados sem serem contrato compartilhado.
NAO_CONTRATO = {'package.json', 'package-lock.json', 'index.mjs', 'index.js', 'README.md', '.gitignore'}


def sha(caminho):
    with open(caminho, 'rb') as f:
        return hashlib.sha256(f.read()).hexdigest()


def main():
    raiz = os.path.abspath(sys.argv[1] if len(sys.argv) > 1 else '.')
    falhas = []

    a, b = os.path.join(raiz, 'calendario.html'), os.path.join(raiz, 'calendarios.html')
    if not (os.path.exists(a) and os.path.exists(b)):
        falhas.append('calendario.html ou calendarios.html ausente')
    elif sha(a) != sha(b):
        falhas.append('calendario.html difere de calendarios.html')
    else:
        print('ok  calendario.html == calendarios.html')

    da_raiz = {n: os.path.join(raiz, n) for n in os.listdir(raiz)
               if os.path.isfile(os.path.join(raiz, n)) and n.endswith(('.mjs', '.js')) and n not in NAO_CONTRATO}
    fn = os.path.join(raiz, 'functions-get')
    pares = 0
    for pasta, subpastas, arquivos in os.walk(fn):
        subpastas[:] = [s for s in subpastas if s not in IGNORAR]
        for n in arquivos:
            if n in da_raiz:
                pares += 1
                outro = os.path.join(pasta, n)
                rel = os.path.relpath(outro, raiz)
                if sha(da_raiz[n]) != sha(outro):
                    falhas.append(f'{n} (raiz) difere de {rel}')
    conhecidas = set()
    if os.path.exists(BASELINE):
        conhecidas = set(json.load(open(BASELINE, encoding='utf-8')).get('duplicatas_divergentes', []))
    novas = [f for f in falhas if f not in conhecidas]
    for f in falhas:
        if f in conhecidas:
            print('base', f, '(divergência pré-existente)')
    for f in sorted(conhecidas - set(falhas)):
        print('aviso', f, 'não diverge mais — tire da linha de base')
    for f in novas:
        print('FALHA', f)
    print(f'{pares} par(es) raiz × functions-get conferido(s); {len(novas)} divergência(s) nova(s)')
    return 1 if novas else 0


if __name__ == '__main__':
    sys.exit(main())
