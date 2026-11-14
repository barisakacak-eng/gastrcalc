"""Wendet das Ergebnis von tools/css_sammeln.py auf die alten CSS-Schichten an: je Regel entscheiden, ob sie gilt (mindestens eine Deklaration gewinnt irgendwo),
nie getroffen wird (Zustand nicht fotografiert: bleibt, wenn alle Klassen noch in js/ oder index.html vorkommen) oder tot ist (gestrichen).
Farben als Hex/rgb()/Namen werden dabei auf Tokens umgeschrieben (nächste Mischung aus den sechs Farben).
  python3 tools/css_auswerten.py <ergebnis.json> <ausgabe.css> datei1 datei2 …   (Dateinamen ohne .css, in Ladereihenfolge)   – schreibt außerdem einen Bericht auf die Standardausgabe"""
import json, pathlib, re, sys
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
import css_werkzeug as C

APP = C.APP
TOKEN = {"papier": (245, 237, 226), "tinte": (34, 48, 31), "salbei": (76, 107, 85), "glut": (232, 118, 58), "holz": (226, 205, 178), "weinrot": (139, 58, 46)}
NAMEN = {"white": (255, 255, 255), "black": (0, 0, 0), "red": (255, 0, 0), "green": (0, 128, 0), "blue": (0, 0, 255), "gray": (128, 128, 128), "grey": (128, 128, 128), "orange": (255, 165, 0),
         "yellow": (255, 255, 0), "silver": (192, 192, 192), "gold": (255, 215, 0), "brown": (165, 42, 42), "tomato": (255, 99, 71), "ivory": (255, 255, 240), "beige": (245, 245, 220)}
FARB = re.compile(r"#[0-9a-fA-F]{3,8}\b|\b(?:rgba?|hsla?)\([^()]*\)|(?<![\w-])(?:white|black|red|green|blue|gray|grey|orange|yellow|silver|gold|brown|tomato|ivory|beige)(?![\w-])")


def rgba(txt):
    t = txt.strip().lower()
    if t in NAMEN: return NAMEN[t] + (1.0,)
    if t.startswith("#"):
        h = t[1:]
        if len(h) in (3, 4): h = "".join(c * 2 for c in h)
        r, g, b = int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16); a = int(h[6:8], 16) / 255 if len(h) == 8 else 1.0
        return (r, g, b, a)
    m = re.match(r"(rgba?|hsla?)\((.*)\)", t)
    if not m: return None
    p = [x for x in re.split(r"[\s,/]+", m.group(2)) if x]
    if m.group(1).startswith("hsl"):
        import colorsys
        h = float(p[0].rstrip("deg")) / 360; s = float(p[1].rstrip("%")) / 100; l = float(p[2].rstrip("%")) / 100; a = 1.0
        if len(p) > 3: a = float(p[3].rstrip("%")) / (100 if p[3].endswith("%") else 1)
        r, g, b = colorsys.hls_to_rgb(h, l, s); return (r * 255, g * 255, b * 255, a)
    def z(x): return float(x.rstrip("%")) * 2.55 if x.endswith("%") else float(x)
    a = 1.0
    if len(p) > 3: a = float(p[3].rstrip("%")) / 100 if p[3].endswith("%") else float(p[3])
    return (z(p[0]), z(p[1]), z(p[2]), a)


_cache = {}
def nach_token(txt):
    c = rgba(txt)
    if c is None: return txt
    if txt in _cache: return _cache[txt]
    r, g, b, a = c; best = None
    namen = list(TOKEN)
    def d(x): return (x[0] - r) ** 2 + (x[1] - g) ** 2 + (x[2] - b) ** 2
    for n in namen:
        k = d(TOKEN[n])
        if best is None or k < best[0]: best = (k, f"var(--{n})")
    for i, n1 in enumerate(namen):
        for n2 in namen[i + 1:]:
            for pct in range(10, 100, 10):
                mix = tuple(TOKEN[n1][j] * pct / 100 + TOKEN[n2][j] * (100 - pct) / 100 for j in range(3))
                k = d(mix)
                if k < best[0] - 40: best = (k, f"color-mix(in srgb,var(--{n1}) {pct}%,var(--{n2}))")
    farbe = best[1]
    if a < 0.995:
        pct = max(1, round(a * 100)); farbe = f"color-mix(in srgb,{farbe} {pct}%,transparent)" if not farbe.startswith("color-mix") else f"color-mix(in srgb,{farbe} {pct}%,transparent)"
    _cache[txt] = farbe; return farbe


def _alt():
    t = (APP / "css" / "tokens.css").read_text(); i = t.index("ÜBERGANG"); j = t.index("}", i)
    return {m.group(1): m.group(2).strip() for m in re.finditer(r"(--[\w-]+):([^;]+);", t[i:j])}
ALT = None


def alt_ersetzen(wert):
    global ALT
    if ALT is None: ALT = _alt()
    for _ in range(4):
        neu = re.sub(r"var\((--[\w-]+)\s*(?:,\s*(?:[^()]|\([^()]*\))*)?\)", lambda m: ALT.get(m.group(1), m.group(0)) if m.group(1) in ALT else m.group(0), wert)
        if neu == wert: break
        wert = neu
    return wert


def farben_ersetzen(wert):
    wert = alt_ersetzen(wert)
    return FARB.sub(lambda m: nach_token(m.group(0)), wert)


def main():
    erg = json.loads(pathlib.Path(sys.argv[1]).read_text()); aus = pathlib.Path(sys.argv[2]); dateien = sys.argv[3:]
    treffer = set(erg["treffer"]); gew = set(erg["gewinner"]); out = []; bericht = []
    andere = "".join((APP / "css" / f"{f}.css").read_text() for f in ["tokens", "app", "zeki", "optik", "buehne", "s-laden", "s-einrichtung", "s-buero"] if f not in dateien) + C.korpus()
    ORD = ["tokens", "app", "zielbild", "laden", "heute", "personal", "design-b", "facelift-v1", "zeki", "optik", "buehne", "s-laden", "s-einrichtung", "s-buero"]
    spaeter = {}
    for fi, f in enumerate(ORD):
        for ri, k in enumerate(C.zerlege((APP / "css" / f"{f}.css").read_text())):
            if k["t"] != "regel": continue
            for sel in C.selektoren(k["sel"]):
                for p_, v_, w_ in k["decl"]: spaeter.setdefault((k["ctx"], sel, p_), []).append((fi, ri, w_))
    for f in dateien:
        fi = ORD.index(f)
        text = (APP / "css" / f"{f}.css").read_text(); knoten = C.zerlege(text); a = dict(regeln=0, gilt=0, ungetroffen_behalten=0, tot=0, decl_vor=0, decl_nach=0)
        neu = []
        for k in knoten:
            if k["t"] == "at-roh":
                m = re.match(r"@keyframes\s+([\w-]+)", k.get("kopf", ""))
                if m and not re.search(r"animation[^;}]*\b" + re.escape(m.group(1)) + r"\b", andere + "".join(x.get("sel", "") + "".join(d[1] for d in x.get("decl", [])) for x in knoten if x["t"] == "regel")): a["tot"] += 1; continue
                neu.append(k); continue
            a["regeln"] += 1; a["decl_vor"] += len(k["decl"]); schluessel = f"{f}@{k['pos'][0]}:{k['pos'][1]}"
            if schluessel in treffer:
                zaehl = {}; behalten = []
                for p, v, w in k["decl"]:
                    occ = zaehl.get(p, 0); zaehl[p] = occ + 1
                    if f"{schluessel}|{p}|{occ}" in gew: behalten.append([p, v, w])
                if not behalten: a["tot"] += 1; continue
                a["gilt"] += 1; k = dict(k, decl=behalten)
            else:
                lebend = [s for s in C.selektoren(k["sel"]) if all(C.kommt_vor(n) for n in C.positive_namen(s))]
                if not lebend: a["tot"] += 1; continue
                ri = knoten.index(k)
                def ueber(p_, w_): return all(any((fj, rj) > (fi, ri) and (wj or not w_) for fj, rj, wj in spaeter.get((k["ctx"], sel, p_), [])) for sel in lebend)
                rest = [d for d in k["decl"] if not ueber(d[0], d[2])]
                if not rest: a["tot"] += 1; continue
                a["ungetroffen_behalten"] += 1; k = dict(k, sel=", ".join(lebend), decl=rest)
            k["decl"] = [[p, farben_ersetzen(v), w] for p, v, w in k["decl"]]; a["decl_nach"] += len(k["decl"]); neu.append(k)
        out.append(f"/* ---- aus {f}.css (gilt: {a['gilt']}, nicht fotografierter Zustand: {a['ungetroffen_behalten']}, gestrichen: {a['tot']}) ---- */\n" + C.ausgeben(neu))
        bericht.append((f, a, len(text), len(C.ausgeben(neu))))
    aus.write_text("".join(out))
    for f, a, vor, nach in bericht: print(f"{f}: {a}  {vor} → {nach} Bytes")

main()
