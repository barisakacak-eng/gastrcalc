"""Baut nur die Inline-Kopie von assets/brand/zeki.svg (keine zweite Zeichnung).
Aufruf nach jeder Änderung an zeki.svg: python3 tools/zeki_bauen.py
Im Browser: IDs werden zu data-zeki-teil, damit mehrere Figuren keine doppelten IDs erzeugen.
"""
import json
from pathlib import Path
root = Path(__file__).resolve().parent.parent
svg = (root / 'assets/brand/zeki.svg').read_text().strip()
(root / 'js/zeki-svg.js').write_text('// Erzeugt aus assets/brand/zeki.svg durch tools/zeki_bauen.py.\nexport const ZEKI_SVG = ' + json.dumps(svg, ensure_ascii=False) + ';\n')
print('Zeki: Inline-Kopie erzeugt')

# Isolierte <img>-Dateien verwenden dieselbe Figur wie die Inline-Ausgabe.
static = svg.replace('aria-hidden="true"', 'role="img" aria-label="GastroCash"')
for name in ['assets/brand/mascot-classic.svg', 'icons/logo-zeichen.svg']:
    (root / name).write_text((static.replace('href="zeki-referenz.jpeg"', 'href="../assets/brand/zeki-referenz.jpeg"') if name.startswith('icons/') else static) + '\n')
inner = svg[svg.index('>')+1:svg.rindex('</svg>')]
logo = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1077 328" role="img" aria-label="GastroCash">' + inner + '<text x="266" y="241" font-family="Inter,system-ui,-apple-system,sans-serif" font-size="145" font-weight="350" letter-spacing="-5.4" fill="var(--zeki-kontur, #1B2819)">Gastro<tspan font-weight="800">Cash</tspan></text></svg>'
for name in ['assets/brand/gastrocash-logo.svg', 'icons/logo.svg']:
    (root / name).write_text((logo.replace('href="zeki-referenz.jpeg"', 'href="../assets/brand/zeki-referenz.jpeg"') if name.startswith('icons/') else logo) + '\n')
