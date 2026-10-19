"""Schneidet Sanjis Rasterbilder (3 × 3 Felder, weiße Trennlinien) in einzelne App-Fotos (19.10.2026).
Aufruf: python3 tools/raster_schneiden.py <ordner-mit-raster_NNN.png> [--ziel foto]
Belegung aus bruecke/an-sanji/raster/belegung.csv. Jedes Feld wird an den weißen Linien gefunden, innen etwas beschnitten,
mittig auf 4:3 zugeschnitten und als WebP 520 × 390 (Qualität 72) gespeichert. Schreibt eine Kontaktseite _kontrolle.png."""
import sys, csv, pathlib
from PIL import Image

WURZEL = pathlib.Path(__file__).resolve().parent.parent


def weisse_linien(werte, n):
    """Grenzen der n Felder entlang einer Achse: Bereiche, in denen fast alles weiß ist, sind Trennlinien."""
    hell = [v > 238 for v in werte]
    felder, start = [], None
    for i, h in enumerate(hell + [True]):
        if not h and start is None: start = i
        if h and start is not None:
            if i - start > len(werte) / (n * 3): felder.append((start, i))
            start = None
    if len(felder) == n: return felder
    s = len(werte) / n  # Rückfall: gleichmäßig teilen
    return [(int(k * s), int((k + 1) * s)) for k in range(n)]


def schneide(raster_png, ziel_dateien, ziel_ordner):
    im = Image.open(raster_png).convert("RGB"); g = im.convert("L"); w, h = im.size
    spalten = [sum(g.getpixel((x, y)) for y in range(0, h, 8)) / len(range(0, h, 8)) for x in range(w)]
    reihen = [sum(g.getpixel((x, y)) for x in range(0, w, 8)) / len(range(0, w, 8)) for y in range(h)]
    xs, ys = weisse_linien(spalten, 3), weisse_linien(reihen, 3)
    fertig = []
    for i, datei in enumerate(ziel_dateien):
        if not datei: continue
        (x0, x1), (y0, y1) = xs[i % 3], ys[i // 3]
        rand = int(min(x1 - x0, y1 - y0) * 0.02)
        x0, x1, y0, y1 = x0 + rand, x1 - rand, y0 + rand, y1 - rand
        bw, bh = x1 - x0, y1 - y0
        if bw / bh > 4 / 3: neu = int(bh * 4 / 3); x0 += (bw - neu) // 2; x1 = x0 + neu
        else: neu = int(bw * 3 / 4); y0 += (bh - neu) // 2; y1 = y0 + neu
        feld = im.crop((x0, y0, x1, y1)).resize((520, 390), Image.LANCZOS)
        pfad = ziel_ordner / pathlib.Path(datei).name; feld.save(pfad, "WEBP", quality=72, method=6); fertig.append(pfad)
    return fertig


def main():
    quelle = pathlib.Path(sys.argv[1]); ziel = WURZEL / (sys.argv[sys.argv.index("--ziel") + 1] if "--ziel" in sys.argv else "foto")
    belegung = {}
    for z in csv.DictReader(open(WURZEL / "bruecke/an-sanji/raster/belegung.csv", encoding="utf-8"), delimiter=";"):
        belegung.setdefault(z["raster"], [None] * 9)[int(z["feld"]) - 1] = z["datei"]
    ziel.mkdir(parents=True, exist_ok=True); alle = []
    for png in sorted(quelle.rglob("raster_*.png")):
        nr = png.stem.split("_")[1].zfill(3)
        if nr not in belegung: print("unbekannt:", png.name); continue
        alle += schneide(png, belegung[nr], ziel); print(png.name, "→", sum(1 for d in belegung[nr] if d), "Fotos")
    if alle:
        k = Image.new("RGB", (6 * 264, ((len(alle) + 5) // 6) * 198), "white")
        for i, p in enumerate(alle): k.paste(Image.open(p).resize((260, 195)), ((i % 6) * 264, (i // 6) * 198))
        k.save(quelle / "_kontrolle.png")
    print(len(alle), "Fotos geschrieben nach", ziel)


if __name__ == "__main__": main()
