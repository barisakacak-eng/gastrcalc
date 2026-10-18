"""Erzeugt aus einem erfundenen Test-Z-Bon (Textdatei) ein künstliches Bild (PNG) für den Browser-Durchlauf mit echter Texterkennung.
Einfache Monospace-Schrift (DejaVu Sans Mono), schwarz auf weiß, leicht grauer Rand wie Thermopapier. Kein echter Bon.
Aufruf: python3 tests/daten/zbon/zbon_bild.py [quelle.txt] [ziel.png]"""
import sys, pathlib
from PIL import Image, ImageDraw, ImageFont
HIER = pathlib.Path(__file__).resolve().parent
quelle = pathlib.Path(sys.argv[1]) if len(sys.argv) > 1 else HIER / "zbon-erfunden-1-spalten.txt"
ziel = pathlib.Path(sys.argv[2]) if len(sys.argv) > 2 else quelle.with_suffix(".png")
zeilen = quelle.read_text(encoding="utf-8").splitlines()
schrift = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf", 28)
breite = max(int(schrift.getlength(z)) for z in zeilen) + 120; hoehe = 40 * len(zeilen) + 120
bild = Image.new("L", (breite + 40, hoehe + 40), 225)
ImageDraw.Draw(bild).rectangle([20, 20, breite + 20, hoehe + 20], fill=252)
d = ImageDraw.Draw(bild)
for i, z in enumerate(zeilen): d.text((80, 70 + 40 * i), z, font=schrift, fill=18)
bild.save(ziel, optimize=True); print(ziel, bild.size)
