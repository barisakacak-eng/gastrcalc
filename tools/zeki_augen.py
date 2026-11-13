#!/usr/bin/env python3
"""Zekis Augen messen (13.11.2026): „Jedes ruhende Zeki-Bild hat zwei offene Augen.“

Wie das Werkzeug misst (Pillow + numpy + scipy, kein Netz):
  1. Das Gesicht ist ein dunkles Visier (≈ #22301F) im hellen Helm. Je Bild wird die größte, breite dunkle Fläche im oberen Teil gesucht
     (Hände und Schuhe sind dunkel, aber klein oder tief).
  2. Im Visier (Löcher gefüllt) liegen helle Flecken: Augen, Brauen, Mund. Aus den Flecken wählt das Werkzeug je Seite (links / rechts der
     Visier-Mitte, Mittelstreifen ausgenommen wegen des Mundes) den größten Fleck im oberen Teil des Visiers = das Auge.
  3. Ein Auge ist OFFEN, wenn seine Höhe ≥ 60 % seiner Breite ist (rund oder oval); ein flacher Strich oder Bogen (zu, lachend, Schlitz) ist ZU.
Ergebnis: assets/brand/zeki-buehne/augen.json – je Bild Dateigröße, Maße, beide Augen (Breite, Höhe, Verhältnis, offen) und die Zahl offener Augen.
Der Node-Test tests/zeki_ruhebilder.test.mjs liest diese Datei und verlangt „offen: 2“ für jedes Bild.
Start:  python3 tools/zeki_augen.py            (schreibt augen.json)      python3 tools/zeki_augen.py --bilder  (legt Kontrollbilder ab: ZEKI_AUGEN_BILDER=<Ordner>)
Ändert keine App-Datei außer augen.json."""
import json, os, pathlib, sys

import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage

APP = pathlib.Path(__file__).resolve().parent.parent
ORDNER = [APP / "assets" / "brand" / "zeki-buehne", APP / "assets" / "brand" / "zeki-mienen"]
AUS = APP / "assets" / "brand" / "zeki-buehne" / "augen.json"
OFFEN_AB = 0.60          # Höhe ≥ 60 % der Breite
HALB_BIS = 0.90          # Höhe < 90 % der Breite: zählt als offen, ist aber sichtbar zusammengekniffen (Normalaugen ≈ 150 %) – nur ein Hinweis
DUNKEL, HELL = 110, 130  # Helligkeitsgrenzen (0–255)


def messen(pfad):
    im = Image.open(pfad).convert("RGBA")
    a = np.asarray(im).astype(float)
    lum = 0.299 * a[..., 0] + 0.587 * a[..., 1] + 0.114 * a[..., 2]
    deckend = a[..., 3] > 200
    dunkel = deckend & (lum < DUNKEL)
    lab, n = ndimage.label(dunkel)
    h, w = dunkel.shape
    best, bestA = None, 0
    for i, sl in enumerate(ndimage.find_objects(lab), 1):
        hh, ww = sl[0].stop - sl[0].start, sl[1].stop - sl[1].start
        fl = int((lab[sl] == i).sum()); cy = (sl[0].start + sl[0].stop) / 2
        if ww >= 0.12 * w and ww >= 1.15 * hh and cy < 0.55 * h and fl > bestA:
            best, bestA = (i, sl), fl
    if not best: return {"fehler": "Visier nicht gefunden"}
    i, sl = best
    visier = ndimage.binary_fill_holes(lab == i)
    hell = visier & ~(lab == i) & (lum > HELL)
    y0, y1, x0, x1 = sl[0].start, sl[0].stop, sl[1].start, sl[1].stop
    mitte = (x0 + x1) / 2; vb = x1 - x0; vh = y1 - y0
    fl, m = ndimage.label(hell, structure=np.ones((3, 3)))
    flecken = []
    for j, s in enumerate(ndimage.find_objects(fl), 1):
        fw, fh = s[1].stop - s[1].start, s[0].stop - s[0].start
        ar = int((fl[s] == j).sum())
        if ar < 6: continue
        cx, cy = (s[1].start + s[1].stop) / 2, (s[0].start + s[0].stop) / 2
        flecken.append({"x": round(cx, 1), "y": round(cy, 1), "b": fw, "h": fh, "flaeche": ar})
    augen = []
    for seite, vorz in (("links", -1), ("rechts", 1)):
        kand = [f for f in flecken if vorz * (f["x"] - mitte) > 0.11 * vb and f["y"] < y0 + 0.78 * vh]
        if not kand: augen.append({"seite": seite, "gefunden": False, "offen": False}); continue
        f = max(kand, key=lambda f: f["flaeche"])
        v = f["h"] / f["b"]
        augen.append({"seite": seite, "gefunden": True, "x": f["x"], "y": f["y"], "breite": f["b"], "hoehe": f["h"], "verhaeltnis": round(v, 2), "offen": v >= OFFEN_AB})
    return {"visier": [x0, y0, x1, y1], "augen": augen, "offen": sum(1 for g in augen if g["offen"]), "halb": sum(1 for g in augen if g["offen"] and g["verhaeltnis"] < HALB_BIS), "flecken": len(flecken)}


def kontrollbild(pfad, erg, ziel):
    im = Image.open(pfad).convert("RGBA"); bg = Image.new("RGBA", im.size, (120, 160, 120, 255)); bg.alpha_composite(im)
    d = ImageDraw.Draw(bg)
    if "visier" in erg:
        d.rectangle(erg["visier"], outline=(255, 0, 255, 255))
        for g in erg["augen"]:
            if g.get("gefunden"):
                c = (0, 255, 0, 255) if g["offen"] else (255, 0, 0, 255)
                d.rectangle([g["x"] - g["breite"] / 2 - 2, g["y"] - g["hoehe"] / 2 - 2, g["x"] + g["breite"] / 2 + 2, g["y"] + g["hoehe"] / 2 + 2], outline=c)
    bg.convert("RGB").save(ziel)


def main():
    bilder = "--bilder" in sys.argv
    kdir = pathlib.Path(os.environ.get("ZEKI_AUGEN_BILDER", "/home/claude/uebersicht/augen"));
    if bilder: kdir.mkdir(parents=True, exist_ok=True)
    ergebnis = {}
    for o in ORDNER:
        for f in sorted(o.glob("*.webp")):
            e = messen(f); e["bytes"] = f.stat().st_size
            e["groesse"] = list(Image.open(f).size)
            ergebnis[f"{o.name}/{f.name}"] = e
            if bilder: kontrollbild(f, e, kdir / f"kontrolle-{o.name}-{f.stem}.png")
    AUS.write_text(json.dumps({"regel": f"offen = Höhe ≥ {int(OFFEN_AB * 100)} % der Breite; zwei Augen je Bild", "bilder": ergebnis}, ensure_ascii=False, indent=1), encoding="utf-8")
    schlecht = {k: v for k, v in ergebnis.items() if v.get("offen") != 2}
    print(f"{len(ergebnis)} Bilder gemessen, {len(ergebnis) - len(schlecht)} mit zwei offenen Augen.")
    for k, v in schlecht.items():
        print("  NICHT zwei offene Augen:", k, v.get("fehler") or [(g["seite"], g.get("breite"), g.get("hoehe"), g.get("verhaeltnis")) for g in v["augen"]])
    halb = [k for k, v in ergebnis.items() if v.get("halb")]
    if halb: print("  Hinweis – offen, aber zusammengekniffen (Höhe < 90 % der Breite):", ", ".join(halb))
    return 1 if schlecht else 0


if __name__ == "__main__":
    sys.exit(main())
