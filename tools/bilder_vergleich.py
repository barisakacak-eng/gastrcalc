"""Bildschirme fotografieren und pixelweise vergleichen (Aufräumen der CSS-Schichten).
  python3 tools/sw_liste.py
  python3 tools/bilder_vergleich.py foto  <ordner> [hell|dunkel] [port]   fotografiert ≈ 55 Bildschirme (Laden, Personal, Büro, Einrichtung; de, 390 × 844)
  python3 tools/bilder_vergleich.py diff  <ordner_vorher> <ordner_nachher> [schwelle_prozent]   meldet Bilder, die mehr als die Schwelle (Standard 0,15 %) abweichen,
                                       und legt je Abweichung <ordner_nachher>/diff/<name>  (vorher | nachher | Unterschied) ab.
Fotos: Laden/Personal über tests/laden_aussehen_browser.py (LA_BILDER), Büro über tools/au_buero_bilder.py, Einrichtung über tests/einrichtung_aussehen_browser.py."""
import os, pathlib, subprocess, sys

APP = pathlib.Path(__file__).resolve().parent.parent


def foto(ordner, thema="hell", port=9010, sprache="de"):
    o = pathlib.Path(ordner); o.mkdir(parents=True, exist_ok=True)
    env = dict(os.environ, LA_BILDER=str(o / "laden"), LA_GROESSEN="390x844", LA_SPRACHEN=sprache, LA_THEMA=thema, DURCHLAUF_PORT=str(port))
    e2 = dict(os.environ, BILDER_OUT=str(o / "buero"), BILDER_PORT=str(port + 1))
    e3 = dict(os.environ, BILDER_OUT=str(o / "einr"), EA_SPRACHEN=sprache, EA_GROESSEN="390x844", BILDER_DUNKEL="1" if thema == "dunkel" else "0", DURCHLAUF_PORT=str(port + 2))
    ps = [subprocess.Popen([sys.executable, str(APP / "tests" / "laden_aussehen_browser.py")], env=env, cwd=APP, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL),
          subprocess.Popen([sys.executable, str(APP / "tools" / "au_buero_bilder.py"), sprache, thema], env=e2, cwd=APP, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL),
          subprocess.Popen([sys.executable, str(APP / "tests" / "einrichtung_aussehen_browser.py")], env=e3, cwd=APP, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)]
    for p in ps: p.wait()
    print(len(list(o.rglob("*.png"))), "Bilder in", o)


def diff(a, b, schwelle=0.15):
    from PIL import Image, ImageChops
    a, b = pathlib.Path(a), pathlib.Path(b); (b / "diff").mkdir(exist_ok=True); n = 0; auff = []
    for pa in sorted(a.rglob("*.png")):
        rel = pa.relative_to(a)
        if rel.parts[0] == "diff": continue
        pb = b / rel
        if not pb.exists(): auff.append((str(rel), "fehlt nachher")); continue
        ia, ib = Image.open(pa).convert("RGB"), Image.open(pb).convert("RGB"); n += 1
        if ia.size != ib.size: auff.append((str(rel), f"Größe {ia.size} → {ib.size}")); continue
        d = ImageChops.difference(ia, ib).convert("L").point(lambda v: 255 if v > 24 else 0)
        anteil = 100 * sum(1 for v in d.getdata() if v) / (d.width * d.height)
        if anteil > schwelle:
            auff.append((str(rel), f"{anteil:.2f} % der Punkte weichen ab"))
            w = Image.new("RGB", (ia.width * 3 + 20, ia.height), "white"); w.paste(ia, (0, 0)); w.paste(ib, (ia.width + 10, 0)); w.paste(d.convert("RGB"), (ia.width * 2 + 20, 0))
            w.thumbnail((2400, 2400)); w.save(b / "diff" / str(rel).replace("/", "__"))
    print(f"{n} Bilder verglichen, {len(auff)} auffällig (Schwelle {schwelle} %)")
    for r, t in auff: print("  ", r, "–", t)


if __name__ == "__main__":
    m = sys.argv[1]
    if m == "foto": foto(sys.argv[2], sys.argv[3] if len(sys.argv) > 3 else "hell", int(sys.argv[4]) if len(sys.argv) > 4 else 9010)
    else: diff(sys.argv[2], sys.argv[3], float(sys.argv[4]) if len(sys.argv) > 4 else 0.15)
