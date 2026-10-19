"""Bildauftrag an Sanji (19.10.2026): erzeugt aus bruecke/an-sanji/bildliste.csv (node tools/bildliste.mjs) und der festen
Liste der Oberflächen-Grafiken einen vollständigen Auftrag mit einem fertigen Prompt je Bild, aufgeteilt in Durchläufe.
Aufruf: node tools/bildliste.mjs && python3 tools/sanji_bildauftrag.py
Schreibt: bruecke/an-sanji/BILDAUFTRAG_DESIGN_B.md und bruecke/an-sanji/bildauftrag_design_b.csv"""
import csv, pathlib, datetime

WURZEL = pathlib.Path(__file__).resolve().parent.parent
AUS = WURZEL / "bruecke" / "an-sanji"
JE_DURCHLAUF = 20

STIL_FOTO = ("Fotorealistisches Produktfoto im Querformat 4:3, im Stil der freigegebenen Vorlage "
             "(https://github.com/barisakacak-eng/gastrcalc/blob/main/design-handoffs/sanji/2026-10-19_richtung-b/foto-stil/originalcollage.jpeg, von Baris gewählt am 19.10.2026): "
             "Motiv auf einem warmen, geölten Holztisch, Hintergrund dunkel und unscharf mit angedeutetem grünem Kraut. Gerichte auf schlichtem dunklem Teller oder in dunkler Schale, "
             "Getränke im Glas, Rohware direkt auf Holz oder Brett. Licht: warmes, weiches Seitenlicht von links, natürliche, appetitliche Farben, nicht übersättigt. "
             "Perspektive: leichte Aufsicht von etwa 30–45 Grad. Motiv mittig, füllt etwa 75 % der Fläche, nichts angeschnitten. "
             "Keine Schrift, keine Logos, keine Marken, keine Etiketten, keine Personen, keine Hände, keine weißen Ränder.")

ART = {
    "A Laden-Art": "Außenansicht der Theke bzw. des Ladens als freundliches, aufgeräumtes Foto; der Hintergrund darf hier ein echter, unscharfer Laden sein.",
    "B Bereich": "Stillleben aus 3–5 typischen Dingen dieses Bereichs, locker gruppiert.",
    "C Warengruppe": "3–4 typische Waren dieser Gruppe nebeneinander.",
    "D Gericht-Familie": "Ein typisches Gericht dieser Familie, eine Portion, so wie ein kleiner Imbiss es über die Theke reicht.",
    "E Gericht": "Eine Portion, so wie ein kleiner Imbiss sie über die Theke reicht – in der typischen Verpackung oder auf einfachem Teller.",
    "F Artikel": "Ware so, wie sie geliefert wird bzw. in der Küche liegt.",
    "G Selbst gemacht": "Selbst zubereitet in einer Edelstahl- oder Kunststoff-Gastronorm-Schale.",
    "H Kühlung": "Gastronomie-Gerät frontal leicht seitlich, Tür geschlossen, Edelstahl/weiß, ohne Marke; Hintergrund eine unscharfe Imbissküche.",
    "I Müll": "Sachlich und sauber fotografiert, nicht eklig.",
}

TECH = ("Ausgabe: WebP, 520 × 390 px, Qualität 72, Ziel 25–45 KB, Dateiname exakt wie angegeben (Kleinbuchstaben, Bindestriche, .webp).")

# Oberflächen-Grafiken (nicht in bildliste.csv): Datei, Ort in der App, Prompt
UI = [
    # Marke und System
    ("icons/app-icon-1024.png", "App-Symbol auf dem Handy (wird zu 180/192/512 px verkleinert)", "App-Symbol 1024 × 1024 px, quadratisch, randlos: die Servierhaube mit kleiner oranger Flamme (aus logo.svg) in Weiß, mittig auf vollflächigem Dunkelgrün #0F3D2E. Flaches Vektor-Design, keine Schrift, kein Verlauf, kein Schatten. Motiv füllt 60 % der Fläche (sicher für runde Masken). PNG."),
    ("icons/app-icon-maskable-512.png", "Android-Symbol mit runder Maske", "Wie das App-Symbol, 512 × 512 px, Motiv nur 50 % der Fläche, damit es in Kreis- und Tropfenmasken nicht abgeschnitten wird. PNG."),
    ("bilder/startbild.svg", "Ladebildschirm beim Öffnen der App", "Hochformat-Grafik als SVG: Servierhaube-Zeichen mittig, darunter viel Luft, Hintergrund #FAFBF8. Kein Text. Ruhig, in 0,3 s erfassbar."),
    ("bilder/logo-kopf-druck.svg", "Kopfzeile der PDF-Ordner (Gesundheitsamt, Steuerberater, Buchhalter)", "Schmale Kopfleiste als SVG, 1200 × 120: links das Servierhaube-Zeichen in Dunkelgrün, rechts ein freier Bereich (dort setzt die App Ladenname und Datum als Text ein). Dünne Linie #DCE5E0 unten. Druckfreundlich, ohne Flächenfarbe."),
    # Leere Zustände (eine Illustration + App-Text darunter)
    ("bilder/leer-karte.svg", "Speisekarte noch leer (Laden „Karte“, Müll ohne Gerichte)", "Flache Vektor-Illustration 320 × 240: eine aufgeklappte Speisekarte mit einer Handykamera davor, Linien in Dunkelgrün #0F3D2E, eine Akzentfläche in Orange #FF7A3D, Rest Weiß/#E5F2EB. Freundlich, einfach, 3–4 Formen, keine Schrift."),
    ("bilder/leer-muell.svg", "Müll heute noch nichts eingetragen", "Flache Vektor-Illustration 320 × 240 im selben Stil: ein sauberer Abfalleimer mit einem kleinen Plus-Zeichen daneben."),
    ("bilder/leer-kuehlung.svg", "Kühlung noch nicht eingerichtet", "Flache Vektor-Illustration 320 × 240: ein Kühlschrank mit Thermometer daneben, ein kleines Plus."),
    ("bilder/leer-putzplan.svg", "Putzplan noch nicht eingerichtet", "Flache Vektor-Illustration 320 × 240: Sprühflasche und Tuch neben einer Checkliste mit zwei Haken."),
    ("bilder/leer-inventur.svg", "Noch nie gezählt (Inventur, Lager ohne Inventur)", "Flache Vektor-Illustration 320 × 240: ein Regal mit drei Kartons und ein Klemmbrett mit Strichliste."),
    ("bilder/leer-belege.svg", "Noch keine Rechnung fotografiert (Belege)", "Flache Vektor-Illustration 320 × 240: ein Kassenbon/Rechnung mit Handykamera-Rahmen darüber."),
    ("bilder/leer-verkauf.svg", "Noch keine Verkäufe eingelesen (Verkauf je Gericht)", "Flache Vektor-Illustration 320 × 240: eine kleine Kasse, aus der ein Bon in einen Ordner läuft."),
    ("bilder/leer-lieferanten.svg", "Noch kein Lieferant angelegt", "Flache Vektor-Illustration 320 × 240: ein kleiner Lieferwagen mit einem Karton."),
    ("bilder/leer-aktionen.svg", "Nichts läuft bald ab (Aktionen & Haltbarkeit)", "Flache Vektor-Illustration 320 × 240: ein Kalenderblatt mit grünem Haken und ein Lebensmittel-Behälter."),
    ("bilder/leer-getraenke.svg", "Noch keine Getränke angelegt", "Flache Vektor-Illustration 320 × 240: drei neutrale Getränke (Dose, Flasche, Glas) ohne Etikett."),
    ("bilder/leer-tafel.svg", "Menütafel noch nicht eingerichtet", "Flache Vektor-Illustration 320 × 240: ein Fernseher an der Wand mit drei angedeuteten Preiszeilen (Striche statt Text)."),
    ("bilder/leer-ordner.svg", "Ordner noch leer (Steuerberater, Buchhalter)", "Flache Vektor-Illustration 320 × 240: ein offener Ordner mit zwei Blättern, ein kleiner Stern."),
    ("bilder/leer-laeden.svg", "Nur ein Laden / weitere Läden anlegen", "Flache Vektor-Illustration 320 × 240: zwei kleine Ladenfronten nebeneinander mit Markise, ohne Schrift."),
    # Erfolg und Hinweise
    ("bilder/erfolg-tag.svg", "Tag abgeschlossen (statt Pokal, falls Baris den Pokal zu verspielt findet)", "Flache Vektor-Illustration 320 × 240: großer grüner Haken in einem Kreis #187A4C, drei kleine orange Funken. Ruhig, nicht kindlich."),
    ("bilder/erfolg-einrichtung.svg", "Einrichtung fertig (letzter Schritt Schnellstart)", "Flache Vektor-Illustration 320 × 240: Servierhaube-Zeichen mit einem grünen Haken-Abzeichen."),
    ("bilder/erfolg-inventur.svg", "Inventur abgeschlossen", "Flache Vektor-Illustration 320 × 240: Klemmbrett mit drei Haken und einem Euro-Zeichen."),
    ("bilder/erfolg-sicherung.svg", "Sicherung erstellt", "Flache Vektor-Illustration 320 × 240: Ordner mit Schloss und grünem Haken."),
    ("bilder/hinweis-offline.svg", "Fehlerseite / Speicher gesperrt / offline", "Flache Vektor-Illustration 320 × 240: ein Handy mit kleiner Wolke und Strich durch die Wolke, ruhig, nicht alarmierend."),
    ("bilder/hinweis-beispiel.svg", "Beispiel-Laden (alle Zahlen erfunden)", "Kleines Abzeichen 120 × 120 als SVG: Ladenfront mit einem Stern, Gelb #F4B400 auf Weiß."),
    # Büro
    ("bilder/ordner-amt.svg", "Büro: Ordner-Kachel Gesundheitsamt", "Ordner-Symbol 96 × 96, flach: Ordner in Rot #D64545 mit weißem Schild-Symbol mit Haken. Gleiche Form wie die anderen zwei Ordner."),
    ("bilder/ordner-steuer.svg", "Büro: Ordner-Kachel Steuerberater", "Ordner-Symbol 96 × 96, flach: Ordner in Gelb #F4B400 mit weißem Taschenrechner-Symbol."),
    ("bilder/ordner-buch.svg", "Büro: Ordner-Kachel Buchhalter", "Ordner-Symbol 96 × 96, flach: Ordner in Grau #8C9A93 mit weißem Beleg-Symbol."),
    ("bilder/bereich-geld.svg", "Büro: Bereich Geld", "Bereichs-Symbol 64 × 64, flach, Dunkelgrün #187A4C: steigendes Balkendiagramm mit Euro-Münze."),
    ("bilder/bereich-ware.svg", "Büro: Bereich Ware", "Bereichs-Symbol 64 × 64, flach, Rot #D64545: Einkaufswagen mit Karton."),
    ("bilder/bereich-karte.svg", "Büro: Bereich Karte & Preise", "Bereichs-Symbol 64 × 64, flach, Gelb #F4B400: Besteck neben Preisschild."),
    ("bilder/bereich-laden.svg", "Büro: Bereich Laden einrichten", "Bereichs-Symbol 64 × 64, flach, Dunkelgrün #187A4C: Ladenfront mit Zahnrad."),
    # Personal-Modus
    ("bilder/personal-muell.svg", "Personal-Modus: große Kachel Müll", "Große Kachel-Illustration 300 × 300, flach: Abfalleimer mit Plus, Rot #D64545 auf #FCEAEA. Sofort verständlich ohne Sprache."),
    ("bilder/personal-kuehlung.svg", "Personal-Modus: große Kachel Kühlung", "Große Kachel-Illustration 300 × 300, flach: Kühlschrank mit Schneeflocke und Thermometer, Blau #2B6CB0 auf #E5EDF2."),
    ("bilder/personal-putzen.svg", "Personal-Modus: große Kachel Putzen", "Große Kachel-Illustration 300 × 300, flach: Sprühflasche mit Glanz-Funken, Dunkelgrün #187A4C auf #E5F2EB."),
    # Einrichtung / Hilfe
    ("bilder/hilfe-karte-foto.svg", "Schnellstart: Karte fotografieren (wie halte ich das Handy)", "Erklär-Illustration 320 × 240, flach: Handy über einer Speisekarte, gestrichelter Rahmen zeigt den Bildausschnitt, kleiner Haken. Keine Schrift."),
    ("bilder/hilfe-zbon.svg", "Verkauf: Z-Bon fotografieren", "Erklär-Illustration 320 × 240, flach: ein langer Kassenbon (Striche statt Text) vor einem Handy-Rahmen, kleiner Haken."),
    ("bilder/hilfe-kassenexport.svg", "Verkauf: Datei aus der Kasse holen", "Erklär-Illustration 320 × 240, flach: Kasse → Pfeil → USB-Stick/Datei → Pfeil → Handy."),
    ("bilder/hilfe-thermometer.svg", "Kühlung: richtig messen", "Erklär-Illustration 320 × 240, flach: Einstech-Thermometer in einem Behälter im Kühlschrank, Anzeige mit „°C“-Zeichen ohne Zahl."),
    ("bilder/hilfe-inventur-viertel.svg", "Inventur: angebrochene Packung in Vierteln zählen", "Erklär-Illustration 320 × 240, flach: vier Packungen nebeneinander, voll, ¾, ½, ¼ gefüllt (Füllstand als Fläche)."),
    # Menütafel (TV)
    ("bilder/tafel-hintergrund-hell.svg", "Menütafel am Fernseher, helle Variante", "Querformat 1920 × 1080 als SVG: ruhiger Hintergrund #FAFBF8, links oben Platz für Ladenname, große Fläche für Preisliste, unten rechts das Servierhaube-Zeichen klein. Nur Flächen und Linien, kein Text."),
    ("bilder/tafel-hintergrund-dunkel.svg", "Menütafel am Fernseher, dunkle Variante", "Wie hell, aber Hintergrund Dunkelgrün #0F3D2E, Linien #1F5A45, Zeichen in Weiß/Orange."),
    ("bilder/tafel-aktion-banner.svg", "Menütafel: Aktions-Streifen", "Streifen 1920 × 200 als SVG in Orange #FF7A3D mit leichtem diagonalen Muster aus dünnen Linien, rechts Platz für Text."),
]


def main():
    zeilen = list(csv.DictReader(open(AUS / "bildliste.csv", encoding="utf-8"), delimiter=";"))
    # fehlende zuerst (nach Prio), vorhandene zuletzt als „neu im Stil B“
    zeilen.sort(key=lambda z: (z["status"] == "vorhanden", int(z["prio"]), z["gruppe"], z["datei"]))
    fotos = []
    for z in zeilen:
        datei = z["datei"] if z["datei"].endswith(".webp") else z["datei"] + ".webp"
        prompt = f'Stilblatt anwenden. Motiv: {z["motiv"]} {ART.get(z["gruppe"], "")}'.strip()
        fotos.append({"datei": "foto/" + datei, "art": z["gruppe"], "name": z["name"], "status": "neu im Stil B (vorhanden)" if z["status"] == "vorhanden" else "fehlt", "prompt": prompt})

    with open(AUS / "bildauftrag_design_b.csv", "w", encoding="utf-8", newline="") as f:
        w = csv.writer(f, delimiter=";")
        w.writerow(["durchlauf", "nr", "datei", "art", "name", "status", "prompt"])
        for i, (d, ort, p) in enumerate(UI, 1): w.writerow(["UI", i, d, "Oberfläche", ort, "fehlt", p])
        for i, b in enumerate(fotos):
            w.writerow([i // JE_DURCHLAUF + 1, i % JE_DURCHLAUF + 1, b["datei"], b["art"], b["name"], b["status"], b["prompt"]])

    n_dl = (len(fotos) + JE_DURCHLAUF - 1) // JE_DURCHLAUF
    fehlen = sum(1 for b in fotos if b["status"] == "fehlt")
    md = [f"# Bildauftrag an Sanji – Design B „Klar & Modern“ (erzeugt {datetime.date.today():%d.%m.%Y})",
          "", "Erzeugt mit `node tools/bildliste.mjs && python3 tools/sanji_bildauftrag.py` aus den echten App-Daten. Nicht von Hand ändern.", "",
          f"Umfang: **{len(UI)} Oberflächen-Grafiken** (Teil 1) und **{len(fotos)} Fotos** (Teil 2: {fehlen} fehlen, {len(fotos) - fehlen} sind vorhanden und werden zuletzt im Stil B neu gemacht), aufgeteilt in **{n_dl} Durchläufe zu je {JE_DURCHLAUF} Bildern**.",
          "Die gleiche Liste als Tabelle mit allen Prompts: `bildauftrag_design_b.csv`.", "",
          "## So arbeitest du (Sanji)",
          "1. Ein Durchlauf = die 20 Bilder eines Abschnitts. Jedes Bild mit seinem Prompt einzeln erzeugen.",
          "2. Fotos: auf 520 × 390 px zuschneiden, als WebP (Qualität 72) speichern, Dateiname exakt wie angegeben. Grafiken: SVG bzw. PNG wie im Prompt.",
          "3. Am Ende jedes Durchlaufs EINE ZIP-Datei zum Herunterladen: `bilder_durchlauf_XX.zip` (UI-Teil: `bilder_ui.zip`), Ordnerstruktur wie die Dateinamen (foto/…, bilder/…, icons/…).",
          "4. Danach Block „FÜR ZORO:“: 1. welche Dateien fertig sind, 2. Name der ZIP, 3. welche Bilder du nicht geschafft hast oder anders gelöst hast.",
          "5. Prüfe vor dem Packen jedes Bild: keine Schrift, keine Marke, keine Person, Motiv eindeutig erkennbar, gleiche Lichtstimmung wie die vorigen.", "",
          "## Stilblatt für alle Fotos (gilt für jedes Bild)", "", STIL_FOTO, "", TECH, "",
          "## Teil 1 – Oberflächen-Grafiken (zuerst, ein Durchlauf)", ""]
    for i, (d, ort, p) in enumerate(UI, 1):
        md += [f"**UI-{i:02d} · `{d}`** – {ort}", "", "```", p, "```", ""]
    ordner = AUS / "bildauftrag"; ordner.mkdir(exist_ok=True)
    for alt in ordner.glob("*.md"): alt.unlink()
    kopf = lambda titel, zip_: [f"# {titel}", "", "## Stilblatt (gilt für jedes Foto dieser Datei)", "", STIL_FOTO, "", TECH, "",
                                f"Am Ende: alle Dateien als EINE ZIP `{zip_}` (Ordner wie die Dateinamen), dann Block „FÜR ZORO:“ (fertig / ZIP-Name / was fehlt oder anders gelöst).", ""]
    ui = kopf("Bildauftrag UI – Oberflächen-Grafiken (Design B)", "bilder_ui.zip")[:1] + ["", "Grafiken sind flache Vektor-Illustrationen im Design B (Farben siehe jeweiliger Prompt), keine Fotos.", "", "Am Ende: alle Dateien als EINE ZIP `bilder_ui.zip`, dann Block „FÜR ZORO:“.", ""]
    for i, (d, ort, p) in enumerate(UI, 1): ui += [f"**UI-{i:02d} · `{d}`** – {ort}", "", p, ""]
    (ordner / "00_ui.md").write_text("\n".join(ui), encoding="utf-8")
    md += ["## Teil 2 – Fotos: eine Datei je Durchlauf", ""]
    for dl in range(n_dl):
        teil = fotos[dl * JE_DURCHLAUF:(dl + 1) * JE_DURCHLAUF]
        name = f"durchlauf_{dl + 1:02d}.md"; zip_ = f"bilder_durchlauf_{dl + 1:02d}.zip"
        t = kopf(f"Bildauftrag Durchlauf {dl + 1:02d} von {n_dl} (Design B)", zip_)
        for j, b in enumerate(teil, 1): t += [f"**{dl + 1:02d}-{j:02d} · `{b['datei']}`** – {b['name']} ({b['art']}, {b['status']})", "", b["prompt"], ""]
        (ordner / name).write_text("\n".join(t), encoding="utf-8")
        md.append(f"- Durchlauf {dl + 1:02d}: https://raw.githubusercontent.com/barisakacak-eng/gastrcalc/main/bruecke/an-sanji/bildauftrag/{name} – {teil[0]['name']} … {teil[-1]['name']}")
    md[md.index("## Teil 1 – Oberflächen-Grafiken (zuerst, ein Durchlauf)") + 1:] = [l for l in md[md.index("## Teil 1 – Oberflächen-Grafiken (zuerst, ein Durchlauf)") + 1:] if l.startswith("- Durchlauf") or l.startswith("## Teil 2")]
    md.insert(md.index("## Teil 2 – Fotos: eine Datei je Durchlauf"), "- UI: https://raw.githubusercontent.com/barisakacak-eng/gastrcalc/main/bruecke/an-sanji/bildauftrag/00_ui.md")
    md.insert(md.index("## Teil 2 – Fotos: eine Datei je Durchlauf"), "")
    (AUS / "BILDAUFTRAG_DESIGN_B.md").write_text("\n".join(md), encoding="utf-8")
    print(f"Bildauftrag: {len(UI)} Grafiken + {len(fotos)} Fotos in {n_dl} Durchläufen")


main()
