#!/usr/bin/env python3
"""Rechtschreibprüfung der deutschen App-Texte (20.10.2026).

Prüft alle Texte aus js/lang/de.js und die deutschen Daten-Texte aus js/data/*.js mit einem echten deutschen
Hunspell-Wörterbuch (igerman98 de_DE, über libhunspell per ctypes). Dazu eigene Regeln: ß/ss-Liste, doppelte
Leerzeichen, doppelte Wörter, Kleinschreibung am Satzanfang, falsche Anführungszeichen, „z.B.“ ohne Leerzeichen.
Zusammengesetzte Wörter, die Hunspell nicht kennt, werden in bekannte Teile zerlegt (mit Fugen-s/-n/-en/-es/-er/-e),
erst wenn das nicht geht, gilt das Wort als Fund. Fachwörter und Gerichte: tools/rechtschreibung_ausnahmen.txt.

Wörterbuch (einmalig, außerhalb des Repos):
  git clone --depth 1 --filter=blob:none --sparse https://github.com/wooorm/dictionaries.git /tmp/rs/dicts
  cd /tmp/rs/dicts && git sparse-checkout set dictionaries/de
Braucht: node (zum Lesen der JS-Texte), libhunspell-1.7 (apt: libhunspell-1.7-0).
Aufruf: python3 tools/rechtschreibung.py   → /tmp/zaehlung/rechtschreibung.md (+ .json)
Umgebung: RS_DICT=/pfad/zu/index (ohne .aff/.dic), RS_OUT=/tmp/zaehlung
Ändert keine App-Datei.
"""
import ctypes, json, os, pathlib, re, subprocess, sys, unicodedata

APP = pathlib.Path(__file__).resolve().parent.parent
DICT = os.environ.get("RS_DICT", "/tmp/rs/dicts/dictionaries/de/index")
OUT = pathlib.Path(os.environ.get("RS_OUT", "/tmp/zaehlung")); OUT.mkdir(parents=True, exist_ok=True)
AUSNAHMEN_DATEI = APP / "tools" / "rechtschreibung_ausnahmen.txt"

# ---------------------------------------------------------------- Texte aus den JS-Dateien holen
SAMMLER = r"""
const APP = process.argv[1];
const SPRACHEN = new Set(["tr","en","ar","bg","bs","el","es","fa","fr","it","ku","pl","ro","ru","sq","uk","vi","wtr","wen"]);
const NICHT = new Set(["id","quellen","quelle","url","einheit","kachel","gruppe","kat","basis","art","takt","stufe","gilt","typ","familie","icon","symbol","bild","foto","farbe","abruf","stand","e","g","vor","still","version"]);
const out = [];
const seen = new Set();
const add = (datei, schluessel, text) => { if (typeof text !== "string") return;
  if (datei.startsWith("js/data/") && /^[a-z0-9_.\/-]*$/.test(text)) return; // Kennungen, Dateinamen (doener, grill_spiess, js/data/x.js)
  if (/(^|\.)(datei|dateiname)(\.|$)|Datei$/.test(schluessel.replace(/\(\)$/, ""))) return; /* Dateinamen – bewusst ohne Umlaute (Aenderungen.csv) */
  const k = datei + "|" + schluessel + "|" + text; if (seen.has(k)) return; seen.add(k); out.push({ datei, schluessel, text }); };
const ARGS = [[2, "X", "X", "X"], [1, "X", "X", "X"], ["X", "X", "X", "X"], [0, 0, 0, 0], [5, 3, 2, 1]];
function geh(datei, pfad, v, tiefe, nurDe) {
  if (tiefe > 12 || v == null) return;
  if (typeof v === "string") { add(datei, pfad, v); return; }
  if (typeof v === "function") {
    for (const a of ARGS) { try { const r = v(...a.slice(0, Math.max(v.length, 1))); if (typeof r === "string" && /undefined|NaN|\[object Object\]/.test(r)) continue; if (typeof r === "string") add(datei, pfad + "()", r); else if (Array.isArray(r)) r.forEach((x, i) => typeof x === "string" && add(datei, pfad + "()[" + i + "]", x)); } catch {} }
    return;
  }
  if (v instanceof Set) { return; }
  if (Array.isArray(v)) { v.forEach((x, i) => geh(datei, pfad + "[" + i + "]", x, tiefe + 1, nurDe)); return; }
  if (typeof v === "object") {
    for (const [k, x] of Object.entries(v)) {
      if (SPRACHEN.has(k)) continue;
      if (nurDe && NICHT.has(k)) continue;
      geh(datei, pfad ? pfad + "." + k : k, x, tiefe + 1, nurDe);
    }
  }
}
const de = (await import(APP + "/js/lang/de.js")).default;
geh("js/lang/de.js", "", de, 0, false);
const fs = await import("node:fs");
const NUR_SCHLUESSEL = new Set(["ARTIKELNAMEN", "SUCHNAMEN", "RICHTPREIS_INDEX", "RICHTPREIS_ALIAS"]);
for (const f of fs.readdirSync(APP + "/js/data").filter((f) => f.endsWith(".js")).sort()) {
  if (f === "putzplan_texte.js" || f === "fotos.js") continue; // putzplan_texte.js: nur fremde Sprachen (kein „de“); fotos.js: Dateinamen
  let m; try { m = await import(APP + "/js/data/" + f); } catch (e) { out.push({ datei: "js/data/" + f, schluessel: "(Ladefehler)", text: "", fehler: String(e) }); continue; }
  for (const [name, v] of Object.entries(m)) {
    if (typeof v === "function") continue;
    if (NUR_SCHLUESSEL.has(name)) { for (const k of Object.keys(v)) add("js/data/" + f, name + "[key]", k); continue; }
    geh("js/data/" + f, name, v, 0, true);
  }
}
process.stdout.write(JSON.stringify(out));
"""


def texte_holen():
    r = subprocess.run(["node", "--input-type=module", "-e", SAMMLER, str(APP)], capture_output=True, text=True, cwd="/tmp")
    if r.returncode: sys.exit("node-Fehler:\n" + r.stderr)
    return json.loads(r.stdout)


# ---------------------------------------------------------------- Hunspell
class Hunspell:
    def __init__(self, basis):
        if not os.path.exists(basis + ".dic"):
            sys.exit(f"Wörterbuch fehlt: {basis}.dic – siehe Kopf dieser Datei (git sparse-checkout wooorm/dictionaries).")
        self.lib = ctypes.CDLL("libhunspell-1.7.so.0")
        self.lib.Hunspell_create.restype = ctypes.c_void_p
        self.lib.Hunspell_create.argtypes = [ctypes.c_char_p, ctypes.c_char_p]
        self.lib.Hunspell_spell.argtypes = [ctypes.c_void_p, ctypes.c_char_p]
        self.lib.Hunspell_suggest.argtypes = [ctypes.c_void_p, ctypes.POINTER(ctypes.POINTER(ctypes.c_char_p)), ctypes.c_char_p]
        self.lib.Hunspell_free_list.argtypes = [ctypes.c_void_p, ctypes.POINTER(ctypes.POINTER(ctypes.c_char_p)), ctypes.c_int]
        self.h = self.lib.Hunspell_create((basis + ".aff").encode(), (basis + ".dic").encode())
        self.cache = {}

    def ok(self, w):
        if w not in self.cache: self.cache[w] = bool(self.lib.Hunspell_spell(self.h, w.encode("utf-8")))
        return self.cache[w]

    def vorschlag(self, w, n=3):
        lst = ctypes.POINTER(ctypes.c_char_p)()
        k = self.lib.Hunspell_suggest(self.h, ctypes.byref(lst), w.encode("utf-8"))
        res = [lst[i].decode("utf-8", "replace") for i in range(min(k, n))]
        self.lib.Hunspell_free_list(self.h, ctypes.byref(lst), k)
        return res


def ausnahmen_lesen():
    s = set()
    for z in AUSNAHMEN_DATEI.read_text(encoding="utf-8").splitlines():
        z = z.strip()
        if z and not z.startswith("#"): s.add(z.lower())
    return s


# ---------------------------------------------------------------- Prüfregeln
SS_REGELN = [  # (Muster, Vorschlag, nur Hinweis?)
    (r"\b[Ss]trasse(n)?\b", "Straße", False), (r"\b[Gg]r[öo]sse(n|r|s)?\b", "Größe", False),
    (r"\bgross(e|en|er|es|em)?\b", "groß", False), (r"\bGross(e|en|er|es|em)?\b", "Groß…", False),
    (r"\b[Ff]uss\b", "Fuß", False), (r"\bheiss(e|en|er|es|t)?\b", "heiß", False), (r"\bschliess(en|t|e)\b", "schließen", False),
    (r"\b[Gg]russ\b", "Gruß", False), (r"\b[Gg]rüsse\b", "Grüße", False), (r"\bweiss(e|en|er|es|t)?\b", "weiß", False),
    (r"\b[Ss]pass\b", "Spaß", False), (r"\bausser\b", "außer", False), (r"\b[Aa]usserdem\b", "außerdem", False),
    (r"\b[Gg]emäss\b", "gemäß", False), (r"\bbloss\b", "bloß", False), (r"\bmässig\b", "mäßig", False),
    (r"\b[Rr]egelmässig\w*\b", "regelmäßig", False), (r"\b[Mm]assnahme\w*\b", "Maßnahme", False), (r"\b[Ss]chliesslich\b", "schließlich", False),
    (r"\b[Ff]liess\w*\b", "fließ…", False), (r"\b[Gg]iess\w*\b", "gieß…", False), (r"\b[Ss]chluss\b", None, None),
    (r"\b[Dd]ass\b", None, None),
    (r"\b[Mm]asse\b", "„Masse“ (Menge/Gewicht) oder „Maße“ (Abmessungen)? – kontextabhängig", True),
    (r"\b[Mm]aß(e|en)?\b(?=\s*(an|von|der|des)?\s*(Teig|Fleisch|Ware|Hack))", "hier vermutlich „Masse“ (Menge), nicht „Maße“", True),
    (r"\bdaß\b", "dass (alte Schreibung)", False), (r"\bmuß\b", "muss (alte Schreibung)", False), (r"\bläßt\b", "lässt (alte Schreibung)", False),
    (r"\b[Ss]chloß\b", "Schloss (alte Schreibung)", False), (r"\b[Ss]chluß\b", "Schluss (alte Schreibung)", False),
]
SS_REGELN = [(re.compile(m), v, h) for m, v, h in SS_REGELN if v]
VERWECHSLUNG = [(re.compile(m), v) for m, v in [  # häufige Fehler, die das Wörterbuch (oder die Zerlegung) durchlässt
    (r"\b[Vv]orraus\w*", "voraus…"), (r"\b[Ss]tandart\b", "Standard"), (r"\b[Ss]eperat\w*", "separat"), (r"\b[Rr]abbat\w*", "Rabatt"),
    (r"\b[Ww]iederspiegel\w*", "widerspiegeln"), (r"\b[Aa]ddress\w*", "Adresse"), (r"\b[Pp]acket\w*", "Paket"), (r"\b[Ee]ntgültig\w*", "endgültig"),
    (r"\b[Ii]ntressant\w*", "interessant"), (r"\b[Ss]ympatisch\w*", "sympathisch"), (r"\b[Rr]eperatur\w*", "Reparatur"), (r"\b[Ee]inzigste\w*", "einzige"),
    (r"\b[Zz]uende\b", "zu Ende"), (r"\b[Bb]ischen\b", "bisschen"), (r"\b[Ww]ieviel(e)?\b", "wie viel(e)"), (r"\b[Ss]elbstständig\w*|\b[Ss]elbständig\w*", None),
    (r"\b[Tt]otal\s+gut\b", None), (r"\b[Ee]mail\b", "E-Mail"), (r"\b[Ss]tandby\b", None), (r"\b[Ll]ebensmittelhygiene-?Verordnung\b", None),
    (r"\bin\s+[Ss]achen\b", None), (r"\b(?:des|dem|den)\s+[Ll]aden(?:s)?\b", None),
] if v]
ABK = re.compile(r"\b(z|d|u|o|v|s|bzw|ca|Nr|Std|Min|Mio|Tsd|inkl|ggf|evtl|zzgl|usw|etc|vgl|bspw|Abs|Art|Kap|Tel|Str|max|min|St|Stk|Pkg|lt|gem|Mo|Di|Mi|Do|Fr|Sa|So|Jan|Feb|Mär|Apr|Jun|Jul|Aug|Sep|Sept|Okt|Nov|Dez|ä|a|B|h|T|U|Ä)\.\s*$")
OHNE_LEER = re.compile(r"\b(z\.B\.|d\.h\.|u\.a\.|o\.ä\.|z\.T\.|u\.U\.|i\.d\.R\.|v\.a\.|s\.o\.|s\.u\.|bzw\.\w)")
WORT = re.compile(r"[A-Za-zÄÖÜäöüßÀ-ÿĞğŞşİıÇç]+(?:[-‑][A-Za-zÄÖÜäöüßÀ-ÿĞğŞşİıÇç0-9]+)*")
FUGEN = ["", "s", "es", "n", "en", "er", "e", "ns"]


def text_putzen(s):
    s = re.sub(r"<[^>]+>", " ", s)                              # HTML-Schnipsel
    s = re.sub(r"&[a-z]+;|&#\d+;", " ", s)
    s = re.sub(r"https?://\S+", " ", s)
    s = re.sub(r"\b[\w-]+\.(csv|json|zip|pdf|js|png|jpg|txt|html)\b", " ", s)  # Dateinamen im Text (lines.csv)
    s = s.replace("\u00ad", "").replace("\u2066", "").replace("\u2069", "").replace("\u2068", "")
    return s


class Pruefer:
    def __init__(self):
        self.hs = Hunspell(DICT); self.aus = ausnahmen_lesen(); self.zcache = {}; self.zerlegt = set()

    def bekannt(self, w):
        if w.lower() in self.aus: return True
        return self.hs.ok(w) or self.hs.ok(w[0].upper() + w[1:]) or self.hs.ok(w.lower())

    def zerlegbar(self, w, tiefe=0):
        """Kompositum: Anfang (≥3 Buchstaben, ggf. ohne Fugenlaut) bekannt + Rest bekannt oder weiter zerlegbar."""
        key = (w, tiefe)
        if key in self.zcache: return self.zcache[key]
        res = False
        if tiefe < 4 and len(w) >= 6:
            for i in range(len(w) - 2, 2, -1):
                vorn, hinten = w[:i], w[i:]
                hintenG = hinten[0].upper() + hinten[1:]
                # Rest: als ganzes Wort bekannt (auch kurz: Öl, Tag, Box) oder – ab 4 Buchstaben – selbst wieder zerlegbar
                if not (self.bekannt(hintenG) or self.bekannt(hinten) or (len(hinten) >= 4 and self.zerlegbar(hintenG, tiefe + 1))): continue
                for f in FUGEN:
                    if f and not vorn.lower().endswith(f): continue
                    stamm = vorn[: len(vorn) - len(f)] if f else vorn
                    if len(stamm) >= 3 and (self.bekannt(stamm) or (stamm.endswith("e") is False and self.bekannt(stamm + "e"))):
                        res = True; break
                if res: break
        self.zcache[key] = res
        return res

    def wort_ok(self, w):
        if len(w) < 2 or any(c.isdigit() for c in w): return True
        if w.isupper() and len(w) <= 6: return True                  # Abkürzungen (TSE, MwSt-artige)
        if re.search(r"[a-zäöüß][A-ZÄÖÜ]", w): return True          # Binnenmajuskel (GastroCalc, iPhone)
        if w == "X": return True                                     # Platzhalter beim Aufruf von Textfunktionen
        if self.bekannt(w): return True
        if "-" in w or "‑" in w:
            teile = [t for t in re.split(r"[-‑]", w) if t]
            return all(self.wort_ok(t) or (t[-1:] == "s" and len(t) > 4 and self.bekannt(t[:-1])) for t in teile)
        ok = self.zerlegbar(w[0].upper() + w[1:]) or self.zerlegbar(w)
        if ok: self.zerlegt.add(w)
        return ok

    def pruefe(self, text):
        funde = []
        roh = text
        s = text_putzen(text)
        # Wörterbuch
        gesehen = set()
        for m in WORT.finditer(s):
            w = m.group(0)
            if w in gesehen: continue
            gesehen.add(w)
            if not self.wort_ok(w):
                funde.append(("Wörterbuch", w, ", ".join(self.hs.vorschlag(w)) or "–"))
        # ß/ss
        for rx, v, hinweis in SS_REGELN:
            for m in rx.finditer(s): funde.append(("ß/ss-Hinweis" if hinweis else "ß/ss", m.group(0), v))
        for rx, v in VERWECHSLUNG:
            for m in rx.finditer(s): funde.append(("Verwechslung", m.group(0), v))
        # Leerzeichen
        if re.search(r"\S  +\S", s) and not re.search(r"\n", roh): funde.append(("Doppelleerzeichen", re.search(r"\S  +\S", s).group(0), "ein Leerzeichen"))
        # doppelte Wörter
        for m in re.finditer(r"\b(\w{2,})\s+\1\b", s, re.I):
            if m.group(1).lower() not in ("die", "das", "der"):  # „die die“ kann richtig sein – trotzdem prüfen lassen
                funde.append(("Doppeltes Wort", m.group(0), m.group(1)))
            else: funde.append(("Doppeltes Wort (prüfen)", m.group(0), m.group(1)))
        # Satzanfang klein (nur innerhalb eines Textes, nicht am Textanfang – Bruchstücke sind dort normal)
        for m in re.finditer(r"([.!?])\s+([a-zäöü][a-zäöüß]*)", s):
            vor = s[: m.start() + 1]
            if m.group(1) == "." and ABK.search(vor): continue
            if re.search(r"\d\.$", vor): continue                      # 1. 2. usw., Datumsangaben
            if re.search(r"\.\.\.$|…$", vor): continue
            if m.group(2) in ("z", "d", "u", "ca", "bzw", "inkl", "ggf", "kg", "l", "ml", "g", "cm", "m"): continue
            funde.append(("Satzanfang klein", s[max(0, m.start() - 12): m.end()], m.group(2)[0].upper() + m.group(2)[1:]))
        # Anführungszeichen
        if '"' in roh and not re.search(r'="|<|\{', roh): funde.append(("Anführungszeichen", '"', "„…“ (deutsch: unten auf, oben zu)"))
        for m in re.finditer(r"(^|[\s(])([“”‟\"])(?=\w)", s): funde.append(("Anführungszeichen", m.group(2) + s[m.end():m.end() + 10], "„ (unten) zum Öffnen"))
        if "”" in s: funde.append(("Anführungszeichen", "”", "“ (deutsches Schlusszeichen)"))
        for m in re.finditer(r"„[^“”\"]*$", s): funde.append(("Anführungszeichen", m.group(0)[:20], "Schlusszeichen “ fehlt"))
        # Zeichensetzung und Schreibweise (DIN 5008 / Duden-Empfehlungen)
        for m in re.finditer(r"\w \- \w", s): funde.append(("Gedankenstrich", m.group(0), m.group(0).replace("-", "–")))
        if "..." in s: funde.append(("Auslassungspunkte", "...", "…"))
        for m in re.finditer(r"\w \s*[,.;:!?](?=\s|$)", s):
            if not re.search(r"\d \s*[.:]", m.group(0)): funde.append(("Leerzeichen vor Satzzeichen", m.group(0), m.group(0).replace(" ", "")))
        for m in re.finditer(r"[a-zäöüß][,;](?=[A-Za-zÄÖÜäöü])", s): funde.append(("Leerzeichen fehlt", s[max(0, m.start() - 8): m.end() + 8], "Leerzeichen nach dem Komma"))
        for m in re.finditer(r"\b\d+(?:[.,]\d+)?(€|%|kg|ml|cm|km|Std|Min)\b|\b\d+(?:[.,]\d+)?€", s):
            funde.append(("Einheit ohne Leerzeichen", m.group(0), re.sub(r"(\d)(\D)", r"\1 \2", m.group(0), 1)))
        for m in re.finditer(r"(?<![.!?:]\s)(?<!^)(?<!„)\b(Sie|Ihnen|Ihr|Ihre|Ihren|Ihrem|Ihrer)\b", s):
            vor = s[: m.start()].rstrip()
            if vor and vor[-1] not in ".!?:„\"(–-": funde.append(("Anrede Sie (App sagt du)", s[max(0, m.start() - 15): m.end() + 10], "du/dein …"))
        # Abkürzungen ohne Leerzeichen
        for m in OHNE_LEER.finditer(s): funde.append(("Abkürzung", m.group(0), m.group(0).replace(".", ". ").strip().replace(". ", ". ", 1)))
        return funde


def main():
    eintraege = texte_holen()
    p = Pruefer()
    alle = []; doppelt = set()
    for e in eintraege:
        if e.get("fehler"): alle.append({**e, "art": "Ladefehler", "fund": e["fehler"], "vorschlag": ""}); continue
        for art, fund, vorschlag in p.pruefe(e["text"]):
            k = (e["datei"], re.sub(r"\(\)", "", e["schluessel"]), art, fund if art != "Anführungszeichen" else re.sub(r"\w", "", fund))
            if k in doppelt: continue  # Textfunktionen werden mehrmals aufgerufen – ein Fund je Schlüssel
            doppelt.add(k)
            alle.append({"datei": e["datei"], "schluessel": e["schluessel"], "text": e["text"], "art": art, "fund": fund, "vorschlag": vorschlag})
    # Häufigkeit je Wort (ein Tippfehler, der 1× vorkommt, ist eher echt als ein Fachwort, das 40× vorkommt)
    haeufig = {}
    for f in alle:
        if f["art"] == "Wörterbuch": haeufig[f["fund"]] = haeufig.get(f["fund"], 0) + 1
    (OUT / "rechtschreibung.json").write_text(json.dumps(alle, ensure_ascii=False, indent=1), encoding="utf-8")
    z = ["# Rechtschreibung – deutsche Texte der App", "",
         f"Geprüft: {len(eintraege)} Texte (js/lang/de.js und js/data/*.js), Wörterbuch: igerman98 de_DE (Hunspell, {DICT}), "
         f"Ausnahmen: {len(p.aus)} Wörter aus tools/rechtschreibung_ausnahmen.txt. Funde gesamt: {len(alle)}.", "",
         "Wörterbuch-Funde sind nach Häufigkeit sortiert: seltene Wörter zuerst (eher echte Tippfehler), häufige zuletzt (eher Fachwörter → Ausnahmeliste).", ""]
    arten = ["Verwechslung", "Anrede Sie (App sagt du)", "Einheit ohne Leerzeichen", "Leerzeichen fehlt", "Leerzeichen vor Satzzeichen", "Gedankenstrich", "Auslassungspunkte", "ß/ss", "Abkürzung", "Doppeltes Wort", "Doppelleerzeichen", "Anführungszeichen", "Satzanfang klein", "ß/ss-Hinweis", "Doppeltes Wort (prüfen)", "Wörterbuch", "Ladefehler"]
    md = lambda x: str(x).replace("|", "\\|").replace("\n", " ⏎ ")
    for art in arten:
        fs = [f for f in alle if f["art"] == art]
        if not fs: continue
        if art == "Wörterbuch": fs.sort(key=lambda f: (haeufig[f["fund"]], f["fund"].lower(), f["schluessel"]))
        z += [f"## {art} ({len(fs)})", "", "| Schlüssel | Text | Fund | Vorschlag |", "|---|---|---|---|"]
        for f in fs:
            t = f["text"] if len(f["text"]) <= 160 else f["text"][:157] + "…"
            z.append(f"| `{md(f['datei'].split('/')[-1])}:{md(f['schluessel'])}` | {md(t)} | **{md(f['fund'])}**{' (' + str(haeufig[f['fund']]) + '×)' if art == 'Wörterbuch' else ''} | {md(f['vorschlag'])} |")
        z.append("")
    z += ["## Nur über Zerlegung angenommen (zum Überfliegen)", "",
          "Diese Wörter kennt das Wörterbuch nicht als Ganzes; angenommen, weil sie sich in bekannte Teile zerlegen lassen. Ein Tippfehler kann sich hier verstecken (z. B. „Einkaufpreise“ ohne Fugen-s).", "",
          ", ".join(sorted(p.zerlegt, key=str.lower)), ""]
    (OUT / "rechtschreibung.md").write_text("\n".join(z), encoding="utf-8")
    zaehl = {a: sum(1 for f in alle if f["art"] == a) for a in arten}
    print(f"{len(eintraege)} Texte, {len(alle)} Funde:", {k: v for k, v in zaehl.items() if v})
    print("→", OUT / "rechtschreibung.md")


if __name__ == "__main__":
    main()
