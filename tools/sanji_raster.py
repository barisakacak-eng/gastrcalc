"""Raster-Bildauftrag an Sanji (19.10.2026): ChatGPT liefert bei mehreren Bildern ohnehin eine Collage. Deshalb bestellen wir
genau das – ein Raster aus 3 × 3 gleich großen Feldern pro Bild, in fester Reihenfolge – und Zoro schneidet es mit
tools/raster_schneiden.py in die einzelnen App-Fotos. Ein Bild = 9 Fotos, ein Auftrag (Datei) = 2 Raster = 18 Fotos.
Aufruf: node tools/bildliste.mjs && python3 tools/sanji_raster.py
Schreibt: bruecke/an-sanji/raster/raster_XX.md, bruecke/an-sanji/raster/belegung.csv, bruecke/an-sanji/RASTERAUFTRAG.md"""
import csv, pathlib, importlib.util

WURZEL = pathlib.Path(__file__).resolve().parent.parent
AUS = WURZEL / "bruecke" / "an-sanji"
spec = importlib.util.spec_from_file_location("ba", WURZEL / "tools" / "sanji_bildauftrag.py")
ba = importlib.util.module_from_spec(spec)
import sys; _argv = sys.argv; sys.argv = ["x"]
src = (WURZEL / "tools" / "sanji_bildauftrag.py").read_text(encoding="utf-8").replace("\nmain()\n", "\n")
exec(compile(src, "sanji_bildauftrag", "exec"), ba.__dict__); sys.argv = _argv

JE_RASTER = 9
RASTER_JE_DATEI = 2
ROH = "https://raw.githubusercontent.com/barisakacak-eng/gastrcalc/main/bruecke/an-sanji/raster/"

RASTER_REGEL = ("Erzeuge EIN Bild im Querformat 1536 × 1024 px. Teile es exakt in ein Raster aus 3 Spalten und 3 Reihen mit 9 gleich großen Feldern "
                "(je 512 × 341 px), getrennt durch durchgehende, 8 px breite, reinweiße Linien, außen ebenfalls 8 px weißer Rand. "
                "Jedes Feld zeigt GENAU EIN Motiv in der unten angegebenen Reihenfolge – zeilenweise von links oben nach rechts unten (Feld 1–3 obere Reihe, 4–6 mittlere, 7–9 untere). "
                "Das Motiv bleibt vollständig in seinem Feld, mittig, mit etwas Luft zum Rand, nichts ragt über die weißen Linien. "
                "KEIN Text, KEINE Nummern, KEINE Beschriftung, keine Logos, keine Marken, keine Personen, keine Hände. "
                "Alle 9 Felder im gleichen Stil, gleiches Licht, gleicher Holztisch: ")


def main():
    zeilen = list(csv.DictReader(open(AUS / "bildliste.csv", encoding="utf-8"), delimiter=";"))
    zeilen.sort(key=lambda z: (z["status"] == "vorhanden", int(z["prio"]), z["gruppe"], z["datei"]))
    fotos = [{"datei": "foto/" + (z["datei"] if z["datei"].endswith(".webp") else z["datei"] + ".webp"), "name": z["name"],
              "motiv": (z["motiv"].split(". Keine")[0] + ". " + ba.ART.get(z["gruppe"], "")).strip(), "status": z["status"]} for z in zeilen]
    raster = [fotos[i:i + JE_RASTER] for i in range(0, len(fotos), JE_RASTER)]
    ordner = AUS / "raster"; ordner.mkdir(exist_ok=True)
    for alt in ordner.glob("*.md"): alt.unlink()
    with open(ordner / "belegung.csv", "w", encoding="utf-8", newline="") as f:
        w = csv.writer(f, delimiter=";"); w.writerow(["raster", "feld", "datei", "name"])
        for r, teil in enumerate(raster, 1):
            for feld, b in enumerate(teil, 1): w.writerow([f"{r:03d}", feld, b["datei"], b["name"]])
    n_dat = (len(raster) + RASTER_JE_DATEI - 1) // RASTER_JE_DATEI
    index = ["# Rasterauftrag an Sanji – alle App-Fotos (Design B, Holztisch-Stil)", "",
             f"{len(fotos)} Fotos in {len(raster)} Rastern zu je 9 Feldern, verteilt auf {n_dat} Auftragsdateien (je 2 Raster).",
             "Sanji erzeugt je Raster EIN Bild (3 × 3 Felder). Zoro schneidet die Raster selbst in Einzelbilder und benennt sie – Sanji muss nichts zuschneiden oder umbenennen.", "",
             "Lieferung je Auftragsdatei: die Rasterbilder als PNG, benannt raster_NNN.png (Nummer steht in der Datei), zusammen in EINER ZIP raster_XX.zip.", ""]
    for d in range(n_dat):
        teil = raster[d * RASTER_JE_DATEI:(d + 1) * RASTER_JE_DATEI]
        nr0 = d * RASTER_JE_DATEI + 1
        t = [f"# Rasterauftrag {d + 1:02d} von {n_dat} – {sum(len(x) for x in teil)} Fotos in {len(teil)} Rasterbildern", "",
             "Für jedes Raster unten: genau EIN Bild erzeugen. Prompt steht fertig im Kasten. Danach alle Rasterbilder als PNG mit dem angegebenen Namen in EINE ZIP "
             f"`raster_{d + 1:02d}.zip` packen und Block „FÜR ZORO:“ (fertig / ZIP-Name / was fehlt). Nicht zuschneiden, nicht umbenennen – das macht Zoro.", ""]
        for k, felder in enumerate(teil):
            rnr = nr0 + k
            liste = " ".join(f"Feld {i}: {b['motiv']}" for i, b in enumerate(felder, 1))
            if len(felder) < JE_RASTER: liste += f" Felder {len(felder) + 1}–9: leer, nur dunkler Holztisch."
            t += [f"## Raster {rnr:03d} → Datei `raster_{rnr:03d}.png`", "", "```", RASTER_REGEL + ba.STIL_FOTO, "", liste, "```", "",
                  "Belegung (nur zur Kontrolle): " + " · ".join(f"{i} {b['name']}" for i, b in enumerate(felder, 1)), ""]
        (ordner / f"raster_{d + 1:02d}.md").write_text("\n".join(t), encoding="utf-8")
        index.append(f"- Auftrag {d + 1:02d}: {ROH}raster_{d + 1:02d}.md – {teil[0][0]['name']} … {teil[-1][-1]['name']}")
    (AUS / "RASTERAUFTRAG.md").write_text("\n".join(index), encoding="utf-8")
    print(f"Raster: {len(fotos)} Fotos, {len(raster)} Raster, {n_dat} Auftragsdateien")


main()
