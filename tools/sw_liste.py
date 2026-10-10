"""Erzeugt die Dateiliste für den Service Worker und zählt die Fassung hoch.
Aufruf vor jeder Veröffentlichung: python3 tools/sw_liste.py"""
import pathlib, re, datetime
APP = pathlib.Path(__file__).resolve().parent.parent
dateien = ["./", "index.html"]
for p in sorted(APP.rglob("*")):
    if p.is_file() and p.suffix in (".js", ".css", ".png", ".svg", ".webmanifest") and "tests" not in p.parts and "tools" not in p.parts and p.name != "sw.js":
        rel = p.relative_to(APP).as_posix()
        if rel not in dateien: dateien.append(rel)
assert len(dateien) == len(set(dateien)), "doppelte Einträge in der Dateiliste"
sw = APP / "sw.js"; txt = sw.read_text()
heute = datetime.date.today().isoformat()
m = re.search(r'const V = "(\d{4}-\d{2}-\d{2})\.(\d+)"', txt)
n = int(m.group(2)) + 1 if m and m.group(1) == heute else 1
txt = re.sub(r'const V = "[^"]*"', f'const V = "{heute}.{n}"', txt)
txt = re.sub(r"const DATEIEN = \[[^\]]*\]", "const DATEIEN = [" + ", ".join(f'"{d}"' for d in dateien) + "]", txt, flags=re.S)
sw.write_text(txt)
print("sw.js:", f"{heute}.{n}", len(dateien), "Dateien")
