"""Erzeugt die Dateilisten für den Service Worker, die Vorlade-Zeilen in index.html und zählt die Fassung hoch.
Aufruf vor jeder Veröffentlichung: python3 tools/sw_liste.py

Zwei Stufen (Etappe 10 „Schneller Start“):
  START   (sw.js: DATEIEN)  – nur der Start-Kern: index.html, Stile, alle Module, die js/app.js statisch importiert, Schrift und Bilder des
                              Start-Bildschirms. Der Service Worker legt sie bei der Installation ab und prüft je Datei die Prüfsumme (HASH):
                              stimmt eine nicht, scheitert die Installation und die alte Fassung bleibt.
  SPÄTER  (sw.js: SPAETER)  – alles Übrige (Büro-Module, übrige Sprachen, große Daten, Bilder): die Seite stößt das Nachladen im Leerlauf an
                              (Nachricht „nachladen“), der Service Worker meldet „alles da“. Jede Datei wird gegen HASH geprüft.
  Fotos und Zeki-Folgen (NACHLADE)  – eigener Cache „gcf“ mit Prüfsumme im Schlüssel (FOTOS_H), ebenfalls im Leerlauf.
index.html bekommt zwischen den Markierungen „modulepreload:anfang“ und „modulepreload:ende“ je ein <link rel="modulepreload"> für jedes
Modul des Start-Kerns: der Browser lädt sie dann alle gleichzeitig, statt Stufe für Stufe zu entdecken."""
import pathlib, re, datetime, hashlib
APP = pathlib.Path(__file__).resolve().parent.parent
NACHLADE = ("foto/", "assets/brand/zeki-klein/")  # Ordner mit eigenem Nachlade-Cache (sw.js: FOTOS_H, Cache „gcf“); gleiche Liste in sw.js (NACHLADE)
NUR_ENTWURF = ()  # Zeki als Vektor-Entwurf (design): die App lädt sie zur Laufzeit nicht, darum nicht in den Offline-Speicher
# Bilder, Schriften und Symbole, die der Start-Bildschirm braucht (Einrichtung: Sprache; Laden: Heute mit Bühne). Alles andere wartet.
START_DATEIEN = (
    "manifest.webmanifest", "icons/icon-180.png",
    "fonts/NotoSans-Regular.woff2", "fonts/NotoSans-Bold.woff2",
    "assets/brand/gastrocash-logo.svg", "assets/brand/heute-icons.svg",
    "assets/brand/zeki-buehne/sprache.webp", "assets/brand/zeki-buehne/start.webp", "assets/brand/zeki-buehne/heute-morgen.webp",
    "assets/brand/zeki-buehne/heute-mittendrin.webp", "assets/brand/zeki-buehne/heute-abend.webp",
)
ENDUNGEN = (".js", ".css", ".png", ".jpeg", ".svg", ".webp", ".woff2", ".woff", ".ttf", ".webmanifest")
IMPORT = re.compile(r'(?:import|export)\s[^"\';]*?from\s*["\']([^"\']+)["\']|(?:^|[\n;])\s*import\s*["\']([^"\']+)["\']')  # statisch, wie tools/importtiefe.mjs

def hash8(p): return hashlib.sha1((APP / p).read_bytes()).hexdigest()[:8]

# W2-D: Fassungsnummer auch für die App selbst (Einstellungen, Diagnose, Sicherung) – js/fassung.js, gleiche Nummer wie sw.js
_sw = (APP / "sw.js").read_text(); _m = re.search(r'const V = "(\d{4}-\d{2}-\d{2})\.(\d+)"', _sw)
_heute = datetime.date.today().isoformat(); _n = int(_m.group(2)) + 1 if _m and _m.group(1) == _heute else 1
(APP / "js" / "fassung.js").write_text(f'// Wird von tools/sw_liste.py geschrieben – nicht von Hand ändern.\nexport const FASSUNG = "{_heute}.{_n}";\n')

# ---- alle App-Dateien
alle = []; fotos = {}
for p in sorted(APP.rglob("*")):
    if p.is_file() and p.suffix in ENDUNGEN and "tests" not in p.parts and "tools" not in p.parts and "vendor" not in p.parts and p.name != "sw.js" and not any(t.startswith((".", "_")) for t in p.relative_to(APP).parts) and not ({"design", "design-handoffs", "bruecke", "node_modules"} & set(p.parts)):
        rel = p.relative_to(APP).as_posix()
        if rel in NUR_ENTWURF: continue
        if rel.startswith(NACHLADE): fotos[rel] = hash8(rel); continue  # Fotos und Zeki-Folgen (3,5 MB): eigener Cache, nur Geändertes neu laden
        alle.append(rel)
assert len(alle) == len(set(alle)), "doppelte Einträge in der Dateiliste"

# ---- Start-Kern: Module ab js/app.js (Breitensuche, damit die Vorlade-Zeilen in Entdeckungsreihenfolge stehen)
def statisch(f):
    out = []
    for m in IMPORT.finditer((APP / f).read_text()):
        sp = m.group(1) or m.group(2)
        if sp.startswith("."):
            z = (pathlib.PurePosixPath(f).parent / sp); parts = []
            for t in z.parts:
                if t == "..": parts.pop()
                elif t != ".": parts.append(t)
            out.append("/".join(parts))
    return out
module = ["js/app.js"]; i = 0
while i < len(module):
    for d in statisch(module[i]):
        if d not in module: module.append(d)
    i += 1
index = (APP / "index.html").read_text()
aus_index = [m for m in re.findall(r'(?:href|src)="([^"#?:]+\.[a-z0-9]+)"', index) if not m.startswith(("http", "//"))]  # Stile, Skript, Manifest, Symbole der Seite
start = ["./", "index.html"]
for d in aus_index + list(START_DATEIEN) + module:
    if d in alle and d not in start: start.append(d)
fehlt = [d for d in list(START_DATEIEN) + module if d not in alle]
assert not fehlt, "Start-Datei nicht gefunden: " + ", ".join(fehlt)

# ---- index.html: Vorlade-Zeilen für den Start-Kern
anfang, ende = "<!-- modulepreload:anfang", "<!-- modulepreload:ende -->"
zeilen = "\n".join(f'  <link rel="modulepreload" href="{m}">' for m in module)
block = f'{anfang} (schreibt tools/sw_liste.py, nicht von Hand ändern) -->\n{zeilen}\n  {ende}'
if anfang in index: index = re.sub(re.escape(anfang) + r'.*?' + re.escape(ende), lambda _m: block, index, flags=re.S)
else: index = index.replace("  <title>", "  " + block + "\n  <title>", 1)
(APP / "index.html").write_text(index)

# ---- später: alles Übrige, Code und gewählte Sprachen zuerst, Bilder zuletzt
def rang(d):
    if d.endswith(".js") and d.startswith("js/lang/"): return 1 if pathlib.PurePosixPath(d).stem in ("tr", "en") else 3
    if d.endswith(".js"): return 0 if not d.startswith("js/data/") else 2
    if d.endswith(".css") or d.endswith(".woff2") or d.endswith(".woff") or d.endswith(".ttf"): return 2
    return 4
spaeter = sorted((d for d in alle if d not in start), key=lambda d: (rang(d), d))

# ---- sw.js: Fassung, Listen, Prüfsummen, Fingerabdruck
sw = APP / "sw.js"; txt = sw.read_text()
heute = datetime.date.today().isoformat()
m = re.search(r'const V = "(\d{4}-\d{2}-\d{2})\.(\d+)"', txt)
n = int(m.group(2)) + 1 if m and m.group(1) == heute else 1
txt = re.sub(r'const V = "[^"]*"', f'const V = "{heute}.{n}"', txt)
hashes = {d: hash8(d) for d in start + spaeter if d != "./"}
js = lambda x: "[" + ", ".join(f'"{d}"' for d in x) + "]"
txt = re.sub(r"const DATEIEN = \[[^\]]*\]", lambda _m: "const DATEIEN = " + js(start), txt, flags=re.S)
txt = re.sub(r"const SPAETER = \[[^\]]*\]", lambda _m: "const SPAETER = " + js(spaeter), txt, flags=re.S)
txt = re.sub(r"const HASH = \{[^}]*\}", lambda _m: "const HASH = {" + ", ".join(f'"{k}": "{v}"' for k, v in sorted(hashes.items())) + "}", txt, flags=re.S)
txt = re.sub(r"const FOTOS_H = \{[^}]*\}", lambda _m: "const FOTOS_H = {" + ", ".join(f'"{k}": "{v}"' for k, v in sorted(fotos.items())) + "}", txt, flags=re.S)
# Inhalts-Fingerabdruck: ändert sich eine gelistete Datei ohne neuen Lauf dieses Skripts, schlägt tests/fassung.test.mjs fehl
h = hashlib.sha1()
for d in start + spaeter:
    if d == "./": continue
    h.update(d.encode()); h.update((APP / d).read_bytes())
for k in sorted(fotos): h.update(k.encode()); h.update(fotos[k].encode())
inhalt = h.hexdigest()[:12]
txt = re.sub(r'const INHALT = "[^"]*"', f'const INHALT = "{inhalt}"', txt)
sw.write_text(txt)
print("sw.js:", f"{heute}.{n}", len(start), "Start-Dateien,", len(spaeter), "später,", len(fotos), "Fotos;", len(module), "Vorlade-Zeilen")
