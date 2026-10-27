"""Zeki-Bewegungsbögen prüfen, bevor Baris sie ansieht (Übernahmeauftrag 27.10.2026, Punkt 3: „fehlende Qualitätskontrollen“).

Aufruf:  python3 tools/sprite_pruefung.py DATEI.webp [DATEI2.webp …] [--blatt AUSGABE.png] [--referenz assets/brand/zeki/hand.webp]

Prüft je Bogen maschinell, was in den Sanji-Runden immer wieder schiefging:
  1. Format: 1280 × 1590 px, RGBA, Dateigröße unter 180 KB, Raster 5 × 5 (256 × 318 je Bild).
  2. Jedes der 25 Felder enthält die Figur (kein leeres Feld, kein 6-Spalten-Raster).
  3. Keine Rasterlinien: keine durchgehend deckenden Zeilen/Spalten an den Feldgrenzen.
  4. Fußpunkt: unterste deckende Pixelzeile je Feld höchstens ±6 px Abweichung (Figur „hüpft“ sonst).
  5. Größe: Höhe der Figur je Feld höchstens ±8 % Abweichung vom Median (wechselnde Größen).
  6. Übergänge: Abstand zwischen Nachbarbildern; ein Sprung über das 3-Fache des Medians wird gemeldet (abrupte Übergänge).
  7. Gleiche Figur wie die Referenz: Farbmittel der Figur (deckende Pixel) gegen den Referenzbogen, Abweichung je Kanal ≤ 18.
Zusätzlich entsteht ein Kontaktblatt (alle Felder nummeriert) für die Sichtfreigabe durch Baris – die Maschine ersetzt die Freigabe nicht.
"""
import sys, os, statistics
from PIL import Image, ImageDraw

W, H, SP, ZE = 1280, 1590, 5, 5
FW, FH = W // SP, H // ZE


def felder(im):
    return [im.crop((c * FW, r * FH, (c + 1) * FW, (r + 1) * FH)) for r in range(ZE) for c in range(SP)]


def figur_daten(f):
    a = f.getchannel("A"); bbox = a.point(lambda v: 255 if v > 40 else 0).getbbox()
    if not bbox: return None
    px = [p for p in f.getdata() if p[3] > 200]
    mittel = tuple(sum(p[i] for p in px) / len(px) for i in range(3)) if px else (0, 0, 0)
    return {"bbox": bbox, "unten": bbox[3], "hoehe": bbox[3] - bbox[1], "mittel": mittel}


def abstand(a, b):
    a = a.convert("RGBA").resize((64, 80)); b = b.convert("RGBA").resize((64, 80))
    return sum(abs(x - y) for p, q in zip(a.getdata(), b.getdata()) for x, y in zip(p, q)) / (64 * 80 * 4)


def pruefe(pfad, referenz=None):
    befunde = []; im = Image.open(pfad)
    groesse = os.path.getsize(pfad)
    if im.size != (W, H): befunde.append(f"Format {im.size[0]}×{im.size[1]} statt {W}×{H}")
    if im.mode != "RGBA": befunde.append(f"Modus {im.mode} statt RGBA"); im = im.convert("RGBA")
    if groesse >= 180 * 1024: befunde.append(f"Datei {groesse // 1024} KB (Grenze 180 KB)")
    if im.size != (W, H): return befunde, None, []
    fs = felder(im); daten = [figur_daten(f) for f in fs]
    leer = [i + 1 for i, d in enumerate(daten) if d is None]
    if leer: befunde.append(f"leere Felder: {leer}")
    a = im.getchannel("A")
    for x in [c * FW for c in range(1, SP)]:
        spalte = [a.getpixel((x, y)) for y in range(0, H, 2)]
        if sum(v > 200 for v in spalte) > 0.9 * len(spalte): befunde.append(f"Rasterlinie senkrecht bei x={x}")
    for y in [r * FH for r in range(1, ZE)]:
        zeile = [a.getpixel((x, y)) for x in range(0, W, 2)]
        if sum(v > 200 for v in zeile) > 0.9 * len(zeile): befunde.append(f"Rasterlinie waagrecht bei y={y}")
    ok = [d for d in daten if d]
    if ok:
        u = statistics.median(d["unten"] for d in ok); h = statistics.median(d["hoehe"] for d in ok)
        huepf = [i + 1 for i, d in enumerate(daten) if d and abs(d["unten"] - u) > 6]
        gross = [i + 1 for i, d in enumerate(daten) if d and abs(d["hoehe"] - h) > 0.08 * h]
        if huepf: befunde.append(f"Fußpunkt springt in Feld {huepf} (Median Zeile {u:.0f})")
        if gross: befunde.append(f"Figurhöhe weicht ab in Feld {gross} (Median {h:.0f} px)")
    sprung = [abstand(fs[i], fs[i + 1]) for i in range(len(fs) - 1)]
    if sprung:
        m = statistics.median(sprung) or 0.01
        harte = [f"{i + 1}→{i + 2}" for i, s in enumerate(sprung) if s > 3 * m and s > 4]
        if harte: befunde.append(f"abrupte Übergänge: {', '.join(harte)}")
    if referenz and ok:
        ref = [figur_daten(f) for f in felder(Image.open(referenz).convert("RGBA"))]
        ref = [d for d in ref if d]
        if ref:
            rm = [statistics.mean(d["mittel"][i] for d in ref) for i in range(3)]
            fm = [statistics.mean(d["mittel"][i] for d in ok) for i in range(3)]
            if max(abs(x - y) for x, y in zip(rm, fm)) > 18: befunde.append(f"Farben weichen von der Referenz ab (RGB {[round(v) for v in fm]} statt {[round(v) for v in rm]})")
    return befunde, im, fs


def blatt(ergebnisse, ziel):
    k = 0.32; fw, fh = int(FW * k), int(FH * k)
    out = Image.new("RGB", (SP * fw * 2 + 40, (fh * ZE + 40) * ((len(ergebnisse) + 1) // 2) + 20), (246, 239, 229))
    d = ImageDraw.Draw(out)
    for n, (name, fs) in enumerate(ergebnisse):
        ox = (n % 2) * (SP * fw + 20) + 10; oy = (n // 2) * (fh * ZE + 40) + 10
        d.text((ox, oy), name, fill=(30, 40, 30))
        for i, f in enumerate(fs):
            x = ox + (i % SP) * fw; y = oy + 18 + (i // SP) * fh
            hint = Image.new("RGBA", f.size, (255, 255, 255, 255)); hint.alpha_composite(f)
            out.paste(hint.convert("RGB").resize((fw, fh)), (x, y)); d.text((x + 3, y + 2), str(i + 1), fill=(168, 68, 31))
    out.save(ziel)


if __name__ == "__main__":
    args = sys.argv[1:]; ziel = None; ref = None
    if "--blatt" in args: i = args.index("--blatt"); ziel = args[i + 1]; del args[i:i + 2]
    if "--referenz" in args: i = args.index("--referenz"); ref = args[i + 1]; del args[i:i + 2]
    alle = []; fehler = 0
    for p in args:
        b, im, fs = pruefe(p, ref)
        print(f"{'OK ' if not b else 'BEFUND'} {os.path.basename(p)}" + ("" if not b else "\n  - " + "\n  - ".join(b)))
        fehler += bool(b)
        if fs: alle.append((os.path.basename(p), fs))
    if ziel and alle: blatt(alle, ziel); print("Kontaktblatt:", ziel)
    sys.exit(1 if fehler else 0)
