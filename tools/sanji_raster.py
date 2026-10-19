"""Raster-Bildauftrag an Sanji (19.10.2026): ChatGPT liefert bei mehreren Bildern ohnehin eine Collage. Deshalb bestellen wir
genau das – ein Raster aus 3 × 3 gleich großen Feldern pro Bild, in fester Reihenfolge – und Zoro schneidet es mit
tools/raster_schneiden.py in die einzelnen App-Fotos. Ein Bild = 9 Fotos, ein Auftrag (Datei) = 2 Raster = 18 Fotos.
Aufruf: node tools/bildliste.mjs && python3 tools/sanji_raster.py
Schreibt: bruecke/an-sanji/raster/raster_XX.md, bruecke/an-sanji/raster/belegung.csv, bruecke/an-sanji/RASTERAUFTRAG.md"""
import csv, re, pathlib, importlib.util

WURZEL = pathlib.Path(__file__).resolve().parent.parent
AUS = WURZEL / "bruecke" / "an-sanji"
spec = importlib.util.spec_from_file_location("ba", WURZEL / "tools" / "sanji_bildauftrag.py")
ba = importlib.util.module_from_spec(spec)
import sys; _argv = sys.argv; sys.argv = ["x"]
src = (WURZEL / "tools" / "sanji_bildauftrag.py").read_text(encoding="utf-8").replace("\nmain()\n", "\n")
exec(compile(src, "sanji_bildauftrag", "exec"), ba.__dict__); sys.argv = _argv

JE_RASTER = 9
RASTER_JE_DATEI = 12  # 19.10. 13:45: Sanji ist schnell – 108 Fotos je Lieferung
R0, D0 = 110, 13  # Serie 2 (nach Lieferung 11 weitergezählt)  # alt: Serie 2 (19.10. 03:40): Nummern ab raster_101 / Auftrag 11, damit nichts mit Serie 1 verwechselt wird
ROH = "https://raw.githubusercontent.com/barisakacak-eng/gastrcalc/main/bruecke/an-sanji/raster/"

RASTER_REGEL = ("Erzeuge EIN Bild im Querformat 1536 × 1024 px. Teile es exakt in ein Raster aus 3 Spalten und 3 Reihen mit 9 gleich großen Feldern "
                "(je 512 × 341 px), getrennt durch durchgehende, 8 px breite, reinweiße Linien, außen ebenfalls 8 px weißer Rand. "
                "Jedes Feld zeigt GENAU EIN Motiv in der unten angegebenen Reihenfolge – zeilenweise von links oben nach rechts unten (Feld 1–3 obere Reihe, 4–6 mittlere, 7–9 untere). "
                "Das Motiv bleibt vollständig in seinem Feld, mittig, mit etwas Luft zum Rand, nichts ragt über die weißen Linien. "
                "KEIN Text, KEINE Nummern, KEINE Beschriftung, keine Logos, keine Marken, keine Personen, keine Hände. "
                "Alle 9 Felder im gleichen Stil, gleiches Licht, gleicher Holztisch: ")

REGELN = """## Feste Regeln (gelten für jede Lieferung)
1. Nie verwerfen. Weicht ein Feld ab, trotzdem liefern – Zoro ordnet jedes brauchbare Foto selbst zu.
2. Jedes Motiv nur EINMAL. Schon fertig und NICHT mehr malen: Döner/Dürüm/Box, Falafel, Pizza Margherita/Salami/Gemüse, Pommes (auch Süßkartoffel, Wedges, Curly), Zwiebelringe, Nuggets, Currywurst, Schnitzel, Bowls, Salate (gemischt, griechisch, Thunfisch, Kraut, Bohnen), Pasta (Penne, Spaghetti, Bandnudeln), Reis, Bulgur, Couscous, Suppen (Tomate, Linse, Gemüse), alle Brote/Brötchen/Wraps, Grundgemüse, Saucen, Cola/Orange/Sprite/Tee/Kaffee/Wasser/Cappuccino/Limonade, Tiramisu, Baklava, Käsekuchen, Schokokuchen, Muffin, Eis, Cookie, Donut, Hähnchen, Frikadellen, Garnelen, Calamari, Fischfilet. Male stattdessen genau die Motive der Belegungsliste – auch ungewöhnliche (Getränke in Flaschen, Verpackungen, Rohware).
3. Lieber ein anderes Motiv aus DIESER Liste als ein Lieblingsgericht von dir.
4. Kopier-Regel: Deine Antwort endet mit GENAU EINEM Codeblock, den Baris unverändert an Zoro weitergibt – ohne Tabelle, ohne Text außerhalb. Form:

```
FÜR ZORO:
1. Fertig: raster_NNN bis raster_NNN
2. Datei: raster_XX.zip
3. Felder (was wirklich zu sehen ist, je Raster EINE Zeile, 9 Einträge in Feldreihenfolge mit | getrennt):
R NNN: … | … | … | … | … | … | … | … | …
R NNN: … | … | … | … | … | … | … | … | …
4. Weiter mit: raster_YY.md
```
5. Keine kostenpflichtigen Apps oder Dienste vorschlagen."""


def main():
    zeilen = list(csv.DictReader(open(AUS / "bildliste.csv", encoding="utf-8"), delimiter=";"))
    # Ähnliche Motive zusammen (alle Pizzen in ein Raster usw.), konkrete Gerichte/Waren zuerst, abstrakte Bereichs-Bilder zuletzt –
    # so trifft die Bild-KI die Reihenfolge zuverlässiger (Sanji 19.10.: Raster 001 mit abstrakten Motiven misslungen).
    def familie(z):
        m = re.search(r"zeigt bis dahin (\S+)", z["status"]); return m.group(1) if m else z["datei"].split("-")[0]
    zeilen = [z for z in zeilen if z["status"] != "vorhanden"]
    zeilen.sort(key=lambda z: ("EDGFHIABC".index(z["gruppe"][0]), familie(z), z["gruppe"], z["name"].lower()))
    fotos = [{"datei": "foto/" + (z["datei"] if z["datei"].endswith(".webp") else z["datei"] + ".webp"), "name": z["name"],
              "motiv": (z["motiv"].split(". Keine")[0].rstrip(".") + ". " + ba.ART.get(z["gruppe"], "")).strip(), "status": z["status"]} for z in zeilen]
    raster = [fotos[i:i + JE_RASTER] for i in range(0, len(fotos), JE_RASTER)]
    ordner = AUS / "raster"; ordner.mkdir(exist_ok=True)
    for alt in ordner.glob("*.md"): alt.unlink()
    with open(ordner / "belegung.csv", "w", encoding="utf-8", newline="") as f:
        w = csv.writer(f, delimiter=";"); w.writerow(["raster", "feld", "datei", "name"])
        for r, teil in enumerate(raster, 1):
            for feld, b in enumerate(teil, 1): w.writerow([f"{r + R0:03d}", feld, b["datei"], b["name"]])
    n_dat = (len(raster) + RASTER_JE_DATEI - 1) // RASTER_JE_DATEI
    index = ["# Rasterauftrag an Sanji – alle App-Fotos (Design B, Holztisch-Stil)", "",
             f"{len(fotos)} Fotos in {len(raster)} Rastern zu je 9 Feldern, verteilt auf {n_dat} Auftragsdateien (je 2 Raster).",
             "Sanji erzeugt je Raster EIN Bild (3 × 3 Felder). Zoro schneidet die Raster selbst in Einzelbilder und benennt sie – Sanji muss nichts zuschneiden oder umbenennen.", "",
             "Lieferung je Auftragsdatei: die Rasterbilder als PNG, benannt raster_NNN.png (Nummer steht in der Datei), zusammen in EINER ZIP raster_XX.zip.", ""]
    for d in range(n_dat):
        teil = raster[d * RASTER_JE_DATEI:(d + 1) * RASTER_JE_DATEI]
        nr0 = d * RASTER_JE_DATEI + 1 + R0
        t = [f"# Rasterauftrag {d + 1 + D0:02d} (letzter: {n_dat + D0:02d}) – {sum(len(x) for x in teil)} Fotos in {len(teil)} Rasterbildern", "",
             "## Ablauf (in EINER Antwort, ohne Zwischenfragen)",
             "0. PFLICHT: Jedes Raster ist eine EIGENE Bildgenerierung in voller Größe 1536 × 1024. NIEMALS mehrere Raster in ein Bild packen und danach zerschneiden oder vergrößern – solche Lieferungen sind unscharf und werden komplett abgelehnt (19.10.: raster_14 abgelehnt). Lieber weniger Raster liefern als ein Sammelbild.",
             f"1. Für jedes der {len(teil)} Raster unten genau EIN Bild erzeugen – Prompt steht fertig im Kasten. Die Bilder NICHT einzeln im Chat zeigen oder kommentieren, nur intern erzeugen und speichern.",
             f"2. Alle Rasterbilder als PNG mit dem angegebenen Namen in EINE ZIP `raster_{d + 1 + D0:02d}.zip` packen und als Download anbieten. Nicht zuschneiden, nicht umbenennen – das macht Zoro.",
             "3. Im Chat genau EIN Übersichtsbild zeigen: alle Raster dieses Auftrags verkleinert nebeneinander (eine Kontrollcollage). Mehr Bilder nicht.",
             "4. Dann der Kopier-Block „FÜR ZORO:“ (Regel 4). Sonst kein Text.",
             "Reicht das Kontingent nicht für alle Raster: liefere, was fertig ist, und schreib im Block, ab welchem Raster es weitergeht.", "", REGELN, ""]
        for k, felder in enumerate(teil):
            rnr = nr0 + k
            liste = "\n".join(f"Feld {i} = {b['name'].upper()}: {b['motiv']}" for i, b in enumerate(felder, 1))
            if len(felder) < JE_RASTER: liste += f" Felder {len(felder) + 1}–9: leer, nur dunkler Holztisch."
            t += [f"## Raster {rnr:03d} → Datei `raster_{rnr:03d}.png`", "", "```", RASTER_REGEL + ba.STIL_FOTO, "", "Belegung – genau diese 9 Motive, genau in dieser Reihenfolge, nichts ersetzen oder ergänzen:", liste, "```", "",
                  "Belegung (nur zur Kontrolle): " + " · ".join(f"{i} {b['name']}" for i, b in enumerate(felder, 1)), ""]
        (ordner / f"raster_{d + 1 + D0:02d}.md").write_text("\n".join(t), encoding="utf-8")
        index.append(f"- Auftrag {d + 1 + D0:02d}: {ROH}raster_{d + 1 + D0:02d}.md – {teil[0][0]['name']} … {teil[-1][-1]['name']}")
    (AUS / "RASTERAUFTRAG.md").write_text("\n".join(index), encoding="utf-8")
    print(f"Raster: {len(fotos)} Fotos, {len(raster)} Raster, {n_dat} Auftragsdateien")


main()
