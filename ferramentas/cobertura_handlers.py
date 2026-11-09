#!/usr/bin/env python3
"""Cobertura de cliques (P10/R3): quais handlers on*= do site rodaram em alguma jornada.

Entrada: ensaio/saida/cobertura.json (gerado por `ENSAIO_COBERTURA=1 node ensaio/rodar.mjs`) e o HTML.
Um handler é "coberto" quando a função global que ele chama executou ao menos uma vez na bateria.

Portão: falha só quando um handler que NÃO existia na linha de base (ferramentas/baseline.json →
"cobertura_universo") entra no código sem jornada. Handler antigo que deixa de ser coberto numa rodada
é só aviso (evita vermelho por instabilidade de tempo); os que passaram a ser cobertos são avisados.

Uso:
    python3 ferramentas/cobertura_handlers.py escritorio.html [--cobertura ensaio/saida/cobertura.json]
    python3 ferramentas/cobertura_handlers.py escritorio.html --gravar-baseline   # só com motivo no PR
"""
import argparse
import json
import os
import sys

AQUI = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, AQUI)
import verificar_caminhos as vc  # noqa: E402

BASELINE = os.path.join(AQUI, 'baseline.json')


def handlers_do_site(html_path):
    html, fontes = vc.coletar(html_path)
    tudo = html + '\n'.join(c for _, c, _ in fontes)
    g = vc.globais(fontes)
    return sorted({n for n, _ in vc.handlers(tudo) if n in g})


def main():
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument('html')
    ap.add_argument('--cobertura', default=os.path.join(AQUI, '..', 'ensaio', 'saida', 'cobertura.json'))
    ap.add_argument('--gravar-baseline', action='store_true')
    a = ap.parse_args()

    if not os.path.exists(a.cobertura):
        print(f'sem {a.cobertura}: rode ENSAIO_COBERTURA=1 node ensaio/rodar.mjs antes'); return 2
    executadas = set()
    for nomes in json.load(open(a.cobertura, encoding='utf-8')).values():
        executadas.update(nomes)
    todos = handlers_do_site(a.html)
    sem = [h for h in todos if h not in executadas]
    rel = os.path.relpath(a.html)
    pct = 100 * (len(todos) - len(sem)) / max(1, len(todos))
    print(f'{rel}: {len(todos)} handlers · {len(todos) - len(sem)} cobertos por jornada ({pct:.0f}%) · {len(sem)} sem jornada')

    base = json.load(open(BASELINE, encoding='utf-8')) if os.path.exists(BASELINE) else {}
    if a.gravar_baseline:
        base.setdefault('cobertura_sem_jornada', {})[rel] = sem
        base.setdefault('cobertura_universo', {})[rel] = todos
        with open(BASELINE, 'w', encoding='utf-8') as f:
            json.dump(base, f, ensure_ascii=False, indent=1, sort_keys=True); f.write('\n')
        print('linha de base de cobertura gravada'); return 0

    conhecido = set(base.get('cobertura_sem_jornada', {}).get(rel, []))
    universo = set(base.get('cobertura_universo', {}).get(rel, []))
    novos = [h for h in sem if h not in universo]
    perderam = [h for h in sem if h in universo and h not in conhecido]
    if perderam:
        print(f'aviso: {len(perderam)} handler(s) cobertos na linha de base não rodaram desta vez: ' + ', '.join(perderam[:10]))
    cobertos_agora = sorted(conhecido - set(sem) & set(todos))
    for h in novos[:25]:
        print('NOVO handler sem jornada:', h)
    if len(novos) > 25:
        print(f'… e mais {len(novos) - 25}')
    if cobertos_agora:
        print(f'{len(cobertos_agora)} handler(s) da linha de base agora têm jornada — atualize com --gravar-baseline')
    print('FALHA' if novos else 'ok (nada novo sem jornada além da linha de base)')
    return 1 if novos else 0


if __name__ == '__main__':
    sys.exit(main())
