"""Erzeugt die Dateiliste für den Service Worker und zählt die Fassung hoch.
Aufruf vor jeder Veröffentlichung: python3 tools/sw_liste.py"""
import pathlib, re, datetime, hashlib
APP = pathlib.Path(__file__).resolve().parent.parent
dateien = ["./", "index.html"]; fotos = {}
# W2-D: Fassungsnummer auch für die App selbst (Einstellungen, Diagnose, Sicherung) – js/fassung.js, gleiche Nummer wie sw.js
_sw = (APP / "sw.js").read_text(); _m = re.search(r'const V = "(\d{4}-\d{2}-\d{2})\.(\d+)"', _sw)
_heute = datetime.date.today().isoformat(); _n = int(_m.group(2)) + 1 if _m and _m.group(1) == _heute else 1
(APP / "js" / "fassung.js").write_text(f'// Wird von tools/sw_liste.py geschrieben – nicht von Hand ändern.\nexport const FASSUNG = "{_heute}.{_n}";\n')
for p in sorted(APP.rglob("*")):
    if p.is_file() and p.suffix in (".js", ".css", ".png", ".svg", ".webp", ".woff2", ".webmanifest") and "tests" not in p.parts and "tools" not in p.parts and "vendor" not in p.parts and p.name != "sw.js" and not any(t.startswith(".") for t in p.relative_to(APP).parts) and not ({"design", "design-handoffs", "bruecke", "node_modules"} & set(p.parts)):
        rel = p.relative_to(APP).as_posix()
        if rel.startswith("js/lang/") and p.stem not in ("de", "tr", "en"): continue  # weitere Sprachen: erst beim Wählen laden und dann zwischenspeichern
        if rel.startswith("foto/"): fotos[rel] = hashlib.sha1(p.read_bytes()).hexdigest()[:8]; continue  # Fotos: eigener Cache, nur Geändertes neu laden
        if rel not in dateien: dateien.append(rel)
assert len(dateien) == len(set(dateien)), "doppelte Einträge in der Dateiliste"
sw = APP / "sw.js"; txt = sw.read_text()
heute = datetime.date.today().isoformat()
m = re.search(r'const V = "(\d{4}-\d{2}-\d{2})\.(\d+)"', txt)
n = int(m.group(2)) + 1 if m and m.group(1) == heute else 1
txt = re.sub(r'const V = "[^"]*"', f'const V = "{heute}.{n}"', txt)
txt = re.sub(r"const DATEIEN = \[[^\]]*\]", "const DATEIEN = [" + ", ".join(f'"{d}"' for d in dateien) + "]", txt, flags=re.S)
txt = re.sub(r"const FOTOS_H = \{[^}]*\}", "const FOTOS_H = {" + ", ".join(f'"{k}": "{v}"' for k, v in sorted(fotos.items())) + "}", txt, flags=re.S)
# Inhalts-Fingerabdruck: ändert sich eine gelistete Datei ohne neuen Lauf dieses Skripts, schlägt tests/fassung.test.mjs fehl
h = hashlib.sha1()
for d in dateien:
    if d == "./": continue
    h.update(d.encode()); h.update((APP / d).read_bytes())
for k in sorted(fotos): h.update(k.encode()); h.update(fotos[k].encode())
inhalt = h.hexdigest()[:12]
if re.search(r'const INHALT = "[^"]*"', txt): txt = re.sub(r'const INHALT = "[^"]*"', f'const INHALT = "{inhalt}"', txt)
else: txt = txt.replace('const DATEIEN = [', f'const INHALT = "{inhalt}"; // Fingerabdruck der gelisteten Dateien (tools/sw_liste.py), geprüft in tests/fassung.test.mjs\nconst DATEIEN = [', 1)
sw.write_text(txt)
print("sw.js:", f"{heute}.{n}", len(dateien), "Dateien,", len(fotos), "Fotos")
