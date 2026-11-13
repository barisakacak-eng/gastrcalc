"""Kleiner CSS-Zerleger für das Aufräumen der Schichten (ohne Fremdpakete): zerlegt eine Datei in Regeln und At-Regeln,
gibt sie kompakt wieder aus und beantwortet statische Fragen (kommt eine Klasse noch in js/ oder index.html vor?).
Benutzung als Modul: import css_werkzeug as C; C.zerlege(text) → [Knoten]; C.ausgeben(knoten) → Text."""
import pathlib, re

APP = pathlib.Path(__file__).resolve().parent.parent


def ohne_kommentare(s):
    return re.sub(r"/\*.*?\*/", lambda m: re.sub(r"[^\n]", " ", m.group(0)), s, flags=re.S)


def _block_ende(s, i):
    """i zeigt auf '{'; liefert Index hinter dem passenden '}' (Strings und url() beachten)."""
    tief = 0; n = len(s); q = None
    while i < n:
        c = s[i]
        if q:
            if c == "\\": i += 1
            elif c == q: q = None
        elif c in "\"'": q = c
        elif c == "{": tief += 1
        elif c == "}":
            tief -= 1
            if tief == 0: return i + 1
        i += 1
    return n


def _deklarationen(body):
    out = []; teil = ""; q = None; klammer = 0
    for c in body:
        if q:
            teil += c
            if c == q: q = None
            continue
        if c in "\"'": q = c; teil += c; continue
        if c == "(": klammer += 1
        elif c == ")": klammer -= 1
        if c == ";" and klammer == 0: out.append(teil); teil = ""
        else: teil += c
    if teil.strip(): out.append(teil)
    res = []
    for d in out:
        if ":" not in d: continue
        p, v = d.split(":", 1); v = v.strip(); wichtig = bool(re.search(r"!\s*important\s*$", v))
        if wichtig: v = re.sub(r"\s*!\s*important\s*$", "", v)
        res.append([p.strip(), v, wichtig])
    return res


def zerlege(text, kontext=None):
    s = ohne_kommentare(text)
    return _zerlege(s, 0, len(s), kontext, s)


def _zerlege(s, i, n, kontext, voll):
    knoten = []
    def zeile_spalte(pos):
        z = voll.count("\n", 0, pos); return z, pos - (voll.rfind("\n", 0, pos) + 1)
    while i < n:
        while i < n and s[i].isspace(): i += 1
        if i >= n: break
        if s[i] == "@":
            j = i
            while j < n and s[j] not in "{;": j += 1
            kopf = s[i:j].strip()
            if j < n and s[j] == ";": knoten.append({"t": "at-roh", "text": s[i:j + 1]}); i = j + 1; continue
            e = _block_ende(s, j)
            if re.match(r"@(media|supports|layer|container)", kopf):
                knoten.extend(_zerlege(s, j + 1, e - 1, " ".join(kopf.split()), voll))
            else: knoten.append({"t": "at-roh", "text": s[i:e], "kopf": kopf})
            i = e; continue
        j = i
        while j < n and s[j] != "{": j += 1
        if j >= n: break
        e = _block_ende(s, j); sel = " ".join(s[i:j].split()); body = s[j + 1:e - 1]
        knoten.append({"t": "regel", "sel": sel, "decl": _deklarationen(body), "ctx": kontext, "pos": zeile_spalte(i)}); i = e
    return knoten


def selektoren(sel):
    """Kommagetrennte Alternativen auf oberster Ebene."""
    out = []; tief = 0; teil = ""; q = None
    for c in sel:
        if q:
            teil += c
            if c == q: q = None
            continue
        if c in "\"'": q = c; teil += c; continue
        if c in "([": tief += 1
        elif c in ")]": tief -= 1
        if c == "," and tief == 0: out.append(teil.strip()); teil = ""
        else: teil += c
    if teil.strip(): out.append(teil.strip())
    return out


def ausgeben(knoten):
    """Kompakt: gleiche Kontexte (@media) werden zusammengefasst, Reihenfolge bleibt."""
    out = []; ctx = None
    def zu():
        nonlocal ctx
        if ctx is not None: out.append("}\n"); ctx = None
    for k in knoten:
        if k["t"] == "at-roh": zu(); out.append(k["text"].strip() + "\n"); continue
        if k["ctx"] != ctx: zu(); ctx = k["ctx"]
        if ctx is not None: out.append(ctx + "{\n")
        d = ";".join(f"{p}:{v}{'!important' if w else ''}" for p, v, w in k["decl"])
        out.append(f"{k['sel']}{{{d}}}\n")
    zu()
    # Kontext-Zusammenfassung: nach dem Zusammenfassen steht ein Kontext nur, wenn er durchgehend ist (ctx wechselt = neuer Block)
    return "".join(out)


_korpus = None
def korpus():
    global _korpus
    if _korpus is None:
        t = [(APP / "index.html").read_text(encoding="utf-8")]
        for p in (APP / "js").rglob("*.js"):
            if "/lang/" in str(p): continue
            t.append(p.read_text(encoding="utf-8"))
        _korpus = "\n".join(t)
    return _korpus


def kommt_vor(name):
    k = korpus()
    if name in k: return True
    if "-" in name:  # zusammengesetzt: „a-“ + Zustand
        pre = name.rsplit("-", 1)[0] + "-"
        if re.search(re.escape(pre) + r"(\$\{|[\"'`]\s*\+|[\"'`]\s*\))", k): return True
    return False


def positive_namen(einzel):
    """Klassen und Kennungen eines einzelnen Selektors – ohne die in :not(...), :is(...), :where(...), :has(...)."""
    s = einzel
    for _ in range(4): s = re.sub(r":(not|is|where|has)\([^()]*\)", "", s)
    s = re.sub(r"\[[^\]]*\]", "", s)
    return re.findall(r"[.#]([A-Za-z_][\w-]*)", s)
