"""Sample pinned KanjiVG cubic paths. Derived data: CC BY-SA 3.0, Ulrich Apel.
Run from repo root: python scripts/generate-strokes.py
Fails closed if upstream introduces an unsupported SVG command.
"""
import json
import re
from pathlib import Path

result = {}
for code in ['03042', '03044', '03046', '03048', '0304a']:
    source = Path(f'public/strokes/{code}.svg').read_text(encoding='utf-8')
    paths = re.findall(r'<path\b[^>]*\bd="([^"]+)"', source)
    strokes = []
    for path in paths:
        tokens = re.findall(r'[A-Za-z]|[-+]?(?:\d*\.\d+|\d+)(?:[eE][-+]?\d+)?', path)
        assert tokens.pop(0) == 'M'
        current = [float(tokens.pop(0)), float(tokens.pop(0))]
        points = [current[:]]
        while tokens:
            assert tokens.pop(0) == 'c', 'Unsupported path command'
            values = [float(tokens.pop(0)) for _ in range(6)]
            a = current[:]
            b, c, d = [[a[0]+values[i], a[1]+values[i+1]] for i in (0, 2, 4)]
            for step in range(1, 33):
                t = step / 32
                points.append([round((1-t)**3*a[k]+3*(1-t)**2*t*b[k]+3*(1-t)*t*t*c[k]+t**3*d[k], 5) for k in (0, 1)])
            current = d
        strokes.append(points)
    result[chr(int(code, 16))] = strokes
Path('src/data/writing-strokes.json').write_text(json.dumps(result, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
