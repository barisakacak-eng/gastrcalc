"""Schrift-Teilmengen für Salbei & Papier (Noto Sans, Noto Sans Arabic) als woff2.

Erzeugen:  PYTHONPATH=/home/claude/agp-werkzeug python3 tools/schrift_teilmenge.py <Ordner mit den TTF-Quellen>
Prüfen:    PYTHONPATH=/home/claude/agp-werkzeug python3 tools/schrift_teilmenge.py <Ordner> --pruefen

Die TTF-Quellen (NotoSans-Regular/Bold.ttf, NotoSansArabic-Regular/Bold.ttf, SIL OFL) liegen nicht im Repo (Paket "Salbei & Papier").
PYTHONPATH nur nötig, wenn das Python-Modul brotli fehlt (dann Ersatzmodul brotli.py mit Node/zlib, nicht im Repo).
Zeichenvorrat = Pflichtbereiche der 18 Sprachen + jedes Zeichen aus js/lang/*.js, js/data/*.js und index.html.
Schreibt fonts/zeichen.json (Codepunkte je Schrift, gelesen aus den fertigen woff2) – tests/schrift.test.mjs prüft damit ohne fontTools."""
import sys, json, glob, pathlib, unicodedata
from fontTools import subset
from fontTools.ttLib import TTFont

APP = pathlib.Path(__file__).resolve().parent.parent
ARABISCH = [(0x0600, 0x06FF), (0x0750, 0x077F), (0xFB50, 0xFDFF), (0xFE70, 0xFEFF)]
# Pflichtbereiche Latein: de tr pl ro bs sq fr it es vi, Kurdisch (lateinisch), Kyrillisch ru uk bg, Griechisch
LATEIN_PFLICHT = [(0x20, 0x7E), (0xA0, 0xFF), (0x100, 0x17F), (0x1A0, 0x1B0), (0x218, 0x21B), (0x1EA0, 0x1EF9),
                  (0x300, 0x308), (0x30A, 0x30C), (0x323, 0x328), (0x400, 0x45F), (0x490, 0x491),
                  (0x386, 0x386), (0x388, 0x38A), (0x38C, 0x38C), (0x38E, 0x3CE),
                  (0x2010, 0x2015), (0x2018, 0x201E), (0x2020, 0x2022), (0x2026, 0x2026), (0x2030, 0x2030), (0x2032, 0x2033),
                  (0x2039, 0x203A), (0x20AC, 0x20AC), (0x20BA, 0x20BA), (0x20B4, 0x20B4), (0x20BD, 0x20BD), (0x2116, 0x2116),
                  (0x2122, 0x2122), (0x2190, 0x2193), (0x2212, 0x2212), (0x2248, 0x2248), (0x2713, 0x2713),
                  (0x200B, 0x200F), (0x2060, 0x2060), (0x2066, 0x2069)]
ARABISCH_PFLICHT = [(0x20, 0x7E), (0xA0, 0xA0), (0x600, 0x6FF), (0x200B, 0x200F), (0x2066, 0x2069)]
DATEIEN = {"latein": ["NotoSans-Regular", "NotoSans-Bold"], "arabisch": ["NotoSansArabic-Regular", "NotoSansArabic-Bold"]}


def ist_arabisch(cp):
    return any(a <= cp <= b for a, b in ARABISCH)


def ist_steuerzeichen(cp):
    return unicodedata.category(chr(cp)) in ("Cc", "Cf")


def gesammelt():
    """Alle Codepunkte aus Texten der App (ohne ASCII-Steuerzeichen), getrennt in (latein, arabisch)."""
    dateien = sorted(glob.glob(str(APP / "js/lang/*.js")) + glob.glob(str(APP / "js/data/*.js"))) + [str(APP / "index.html")]
    alle = set()
    for f in dateien:
        alle |= {ord(c) for c in pathlib.Path(f).read_text(encoding="utf8")}
    alle = {cp for cp in alle if cp >= 0x20 and cp != 0x7F}
    return {cp for cp in alle if not ist_arabisch(cp)}, {cp for cp in alle if ist_arabisch(cp)}


def bereiche(liste):
    return {cp for a, b in liste for cp in range(a, b + 1)}


def zielmenge(schrift):
    latein, arabisch = gesammelt()
    if schrift == "latein":
        return bereiche(LATEIN_PFLICHT) | latein
    # Arabisch: alles Arabische aus den Texten plus Pflichtbereich; Ziffern/Satzzeichen, die in den Texten stehen, kommen aus dem Latein-Font nicht mit
    return bereiche(ARABISCH_PFLICHT) | arabisch | {cp for cp in latein if cp < 0x80 or cp in (0xA0,)}


def erzeugen(quelle, ziel, zeichen):
    opt = subset.Options()
    opt.flavor = "woff2"; opt.layout_features = ["*"]; opt.hinting = False; opt.desubroutinize = True
    opt.notdef_outline = True; opt.name_IDs = [0, 1, 2, 3, 4, 5, 6, 13, 14]; opt.drop_tables += ["DSIG"]
    font = subset.load_font(str(quelle), opt)
    sub = subset.Subsetter(opt); sub.populate(unicodes=sorted(zeichen)); sub.subset(font)
    subset.save_font(font, str(ziel), opt); font.close()


def cmap_von(pfad):
    f = TTFont(str(pfad)); cm = set(f.getBestCmap()); f.close()
    return cm


def main(argv):
    pruefen = "--pruefen" in argv
    args = [a for a in argv if not a.startswith("--")]
    if len(args) != 1:
        print(__doc__); return 2
    quelle = pathlib.Path(args[0]); fonts = APP / "fonts"; fehler = 0
    zeichen_json = {}
    for schrift, namen in DATEIEN.items():
        ziel_cp = zielmenge(schrift)
        for name in namen:
            ziel = fonts / (name + ".woff2")
            if not pruefen:
                erzeugen(quelle / (name + ".ttf"), ziel, ziel_cp)
            cm = cmap_von(ziel)
            fehlt = sorted(cp for cp in ziel_cp if cp not in cm and not ist_steuerzeichen(cp))
            quelle_cm = cmap_von(quelle / (name + ".ttf")) if (quelle / (name + ".ttf")).exists() else None
            echte = [cp for cp in fehlt if unicodedata.category(chr(cp))[0] in "LMN"]
            symbole = [cp for cp in fehlt if cp not in echte]
            print(f"{name}.woff2: {ziel.stat().st_size} Byte, {len(cm)} Zeichen" + (f", {len(echte)} Buchstaben/Ziffern fehlen" if echte else "") + (f", {len(symbole)} Symbole ohne Glyph (Systemschrift)" if symbole else ""))
            if echte:
                # Nur Zeichen aus den App-Texten zählen als Fehler; Pflichtbereiche, die die Quelle selbst nicht hat, nur als Hinweis
                aus_texten = zielmenge_texte(schrift)
                kritisch = [cp for cp in echte if cp in aus_texten]
                for cp in kritisch:
                    print(f"  FEHLT in {name}: U+{cp:04X} {chr(cp)!r} {unicodedata.name(chr(cp), '?')}"); fehler += 1
            if name.endswith("Regular"):
                zeichen_json[schrift] = sorted(cm)
                zeichen_json.setdefault("systemschrift", {})[schrift] = [cp for cp in symbole if cp in zielmenge_texte(schrift)]
    if not pruefen:
        (fonts / "zeichen.json").write_text(json.dumps({
            "hinweis": "Von tools/schrift_teilmenge.py erzeugt. Codepunkte der woff2-Dateien (Regular; Bold hat dieselbe Menge). systemschrift = Symbole der App-Texte ohne Glyph in Noto Sans, sie kommen aus der Systemschrift.",
            "latein": zeichen_json["latein"], "arabisch": zeichen_json["arabisch"],
            "systemschrift": sorted(set(zeichen_json["systemschrift"]["latein"]) | set(zeichen_json["systemschrift"]["arabisch"]))}, separators=(",", ":")), encoding="utf8")
        print("fonts/zeichen.json geschrieben")
    print("FEHLER:" if fehler else "OK: alle Zeichen der App-Texte sind in der passenden Schrift (Symbole ohne Glyph kommen aus der Systemschrift)", fehler or "")
    return 1 if fehler else 0


def zielmenge_texte(schrift):
    latein, arabisch = gesammelt()
    return {cp for cp in (latein if schrift == "latein" else arabisch) if not ist_steuerzeichen(cp)}


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
