"""Durchlauf des Onboardings im Handy-Format, Bilder je Schritt, Prüfung der Speicherung nach Neuladen.
Start: python3 tests/durchlauf.py  (startet selbst einen kleinen Webserver)"""
import asyncio, subprocess, sys, time, pathlib, json
from playwright.async_api import async_playwright

APP = pathlib.Path(__file__).resolve().parent.parent
OUT = APP.parent / "pdfbuild" / "app-check"; OUT.mkdir(parents=True, exist_ok=True)
PORT = 8765

async def main():
    srv = subprocess.Popen([sys.executable, "-m", "http.server", str(PORT), "--bind", "127.0.0.1"], cwd=APP, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    time.sleep(0.8)
    fehler = []
    try:
        async with async_playwright() as p:
            b = await p.chromium.launch()
            ctx = await b.new_context(viewport={"width": 390, "height": 844}, device_scale_factor=2, is_mobile=True, has_touch=True, locale="de-DE")
            pg = await ctx.new_page()
            pg.on("console", lambda m: fehler.append(m.text) if m.type == "error" and "ERR_TUNNEL" not in m.text else None)
            pg.on("pageerror", lambda e: fehler.append(str(e)))
            await pg.goto(f"http://127.0.0.1:{PORT}/index.html")
            await pg.wait_for_selector(".kachel")
            # Die App ignoriert 300 ms nach einem Bildschirmwechsel einen zweiten Tipp an derselben Stelle (Doppeltipp-Schutz).
            # Ein Mensch tippt nicht schneller über zwei Bildschirme; Playwright schon – also nach jedem Klick kurz warten.
            _klick = pg.click
            async def klick(sel, **kw): await _klick(sel, **kw); await pg.wait_for_timeout(320)
            pg.click = klick
            n = 0
            async def bild(name):
                nonlocal n; n += 1
                await pg.screenshot(path=str(OUT / f"{n:02d}_{name}.png"), full_page=True)

            await bild("sprache")
            await pg.click('[data-a="sprache"][data-wert="de"]')
            await bild("format")
            await pg.click('[data-a="format"][data-wert="imbiss"]'); await pg.click('[data-a="weiter"]')
            await bild("kueche")
            await pg.click('[data-a="kueche"][data-wert="doener"]'); await pg.click('[data-a="weiter"]')
            await bild("betrieb")
            await pg.fill('[data-f="betrieb.name"]', "Döner Baris")
            await pg.click('[data-a="minus"][data-feld="monate"]'); await pg.click('[data-a="minus"][data-feld="monate"]')
            await bild("betrieb-saison")
            await pg.click('[data-a="weiter"]')
            await bild("team")
            await pg.fill('[data-f="team.personen"]', "3"); await pg.fill('[data-f="team.stundenProPerson"]', "160"); await pg.click('[data-a="weiter"]')
            await bild("lohn")
            await pg.fill('[data-f="team.lohnkosten"]', "6200"); await pg.click('[data-a="weiter"]')
            await bild("kosten-intro")
            await pg.click('[data-a="weiter"]')
            await bild("kosten-miete")
            await pg.click('[data-a="posten"][data-posten="miete"]')   # Richtwert → geschätzt
            await bild("kosten-miete-richtwert")
            await pg.fill('[data-f="posten:miete"]', "1450"); await pg.locator('[data-f="posten:miete"]').blur(); await pg.wait_for_timeout(150)
            await pg.click('[data-a="posten"][data-posten="nebenkosten"]')  # kein Richtwert → offen
            await pg.wait_for_timeout(100)
            await bild("kosten-miete-eingetragen")
            await pg.click('[data-a="weiter"]')
            await bild("kosten-energie")
            await pg.click('[data-a="posten"][data-posten="strom"]'); await pg.fill('[data-f="posten:strom"]', "3600"); await pg.click('[data-a="periode"][data-posten="strom"][data-wert="jahr"]')
            await pg.wait_for_timeout(100); await bild("kosten-energie-jahr")
            await pg.click('[data-a="weiter"]')
            # Restliche Kategorien: Versicherung mit Betrag, Rest "nichts davon"
            await pg.click('[data-a="posten"][data-posten="versicherungen"]'); await pg.fill('[data-f="posten:versicherungen"]', "180"); await pg.click('[data-a="weiter"]')
            for _ in range(7):
                await pg.click('[data-a="weiter"]')
            await bild("kanaele")
            await pg.click('[data-a="kanal"][data-wert="portale"]')
            await pg.fill('[data-f="portal:0:name"]', "Lieferando"); await pg.fill('[data-f="portal:0:provision"]', "30")
            await pg.locator('[data-f="portal:0:provision"]').blur(); await pg.wait_for_timeout(150)
            await bild("kanaele-portal")
            await pg.click('[data-a="weiter"]')
            # ---- Etappe 2: Karte
            await bild("karte")
            await pg.fill('[data-f="suche"]', "Döner"); await pg.wait_for_timeout(150)
            assert await pg.evaluate("document.activeElement && document.activeElement.dataset.f") == "suche", "Suchfeld hat den Fokus verloren"
            await bild("karte-suche")
            for nm in ["Döner Kebab", "Dürüm Döner", "Dönerteller"]:
                await pg.click(f'[data-a="vorlage"][data-name="{nm}"]')
            await pg.fill('[data-f="suche"]', ""); await pg.wait_for_timeout(150)
            await pg.click('[data-a="vorlage"][data-name="Cola 0,33 l"]') if await pg.locator('[data-a="vorlage"][data-name="Cola 0,33 l"]').count() else None
            await pg.fill('[data-f="eigenes"]', "Hausspezial"); await pg.click('[data-a="eigenes-neu"]')
            await bild("karte-gewaehlt")
            await pg.click('[data-a="weiter"]')
            # ---- Rezepte
            await bild("rezepte")
            await pg.click('[data-a="rezept-auf"] >> nth=0')
            await bild("rezept-detail")
            await pg.fill('[data-f="zutat:0"]', "200")
            await pg.fill('[data-f="zutat-suche"]', "Peperoni"); await pg.wait_for_timeout(150)
            await pg.click('[data-a="zutat-neu"] >> nth=0')
            n_z = await pg.evaluate("window.__gastrocalc.stand.gerichte[0].zutaten.length")
            await pg.fill(f'[data-f="zutat:{n_z-1}"]', "20")
            await pg.click('[data-a="zeit"][data-d="1"]')
            await bild("rezept-geaendert")
            await pg.click('[data-a="rezept-zu"]')
            await pg.click('[data-a="weiter"]')
            # ---- Einkaufspreise
            await bild("preise")
            async def preis(name, menge, einheit, p):
                await pg.fill(f'[data-f="packung:{name}"]', menge); await pg.click(f'[data-a="packung-einheit"][data-name="{name}"][data-wert="{einheit}"]')
                await pg.fill(f'[data-f="preis:{name}"]', p); await pg.locator(f'[data-f="preis:{name}"]').blur(); await pg.wait_for_timeout(120)
            await preis("Dönerspieß Kalb/Pute", "10", "kg", "74,50")
            await preis("Dönerbrot / Fladen", "100", "stk", "41")
            await pg.click('[data-a="messen"][data-name="Dönerspieß Kalb/Pute"]')
            await pg.fill('[data-f="roh:Dönerspieß Kalb/Pute"]', "1000"); await pg.fill('[data-f="gar:Dönerspieß Kalb/Pute"]', "780")
            await pg.locator('[data-f="gar:Dönerspieß Kalb/Pute"]').blur(); await pg.wait_for_timeout(120)
            await bild("preise-teils")
            # alle übrigen Artikel mit Platzhalterpreisen füllen, damit ein Gericht grün werden kann
            namen = await pg.evaluate("window.__gastrocalc.stand.artikel.filter(a => a.preis === null).map(a => a.name)")
            for nm in namen:
                e = await pg.evaluate(f"(window.__gastrocalc.stand.artikel.find(a => a.name === {nm!r}) || {{}}).einheit")
                await preis(nm, "10", {"kg": "kg", "l": "l"}.get(e, "stk"), "20")
            await pg.click('[data-a="weiter"]')
            # ---- Verkauf
            await bild("verkauf")
            ids = await pg.evaluate("window.__gastrocalc.stand.gerichte.map(g => g.id)")
            for i, gid in enumerate(ids):
                await pg.fill(f'[data-f="preis:{gid}"]', ["7,50", "8", "12,90", "2,50", "9"][i % 5])
            await pg.click(f'[data-a="bestseller"][data-id="{ids[0]}"]'); await pg.fill(f'[data-f="menge:{ids[0]}"]', "120")
            await pg.fill('[data-f="bestellungenTag"]', "200")
            await pg.locator('[data-f="bestellungenTag"]').blur(); await pg.wait_for_timeout(150)
            await bild("verkauf-ausgefuellt")
            await pg.click('[data-a="weiter"]')
            await bild("ergebnis")
            k = await pg.evaluate("window.__gastrocalc.stand.gerichte.length")
            assert k == 5, f"{k} Gerichte statt 5"
            await pg.click('[data-a="fertig"]')
            await pg.wait_for_selector(".kopfband")
            await bild("start")
            # Speicherung: Seite neu laden, Stand muss da sein
            await pg.reload(); await pg.wait_for_selector(".kopfband")
            stand = await pg.evaluate("window.__gastrocalc.stand")
            await bild("start-nach-neuladen")
            assert stand["betrieb"]["name"] == "Döner Baris", "Name nach Neuladen weg"
            assert stand["phase"] == "app"
            miete = next(k for k in stand["kosten"] if k["posten"] == "miete")
            assert miete["betrag"] == 1450 and miete["status"] == "bekannt", miete
            strom = next(k for k in stand["kosten"] if k["posten"] == "strom")
            assert strom["periode"] == "jahr" and strom["betrag"] == 3600, strom
            nk = next(k for k in stand["kosten"] if k["posten"] == "nebenkosten")
            assert nk["status"] == "offen", nk
            assert stand["kanaele"]["portale"][0]["provision"] == 30
            # Bearbeiten aus der Startseite und zurück
            await pg.click('.zeileknopf[data-schritt="kosten-miete"]'); await pg.wait_for_selector('[data-f="posten:miete"]')
            await bild("bearbeiten-miete")
            await pg.click('[data-a="weiter"]'); await pg.wait_for_selector(".kopfband")
            # Doppeltipp darf keinen Schritt überspringen
            await pg.click('.knopf[data-schritt="kosten-miete"]'); await pg.wait_for_selector('[data-f="posten:miete"]')
            await pg.evaluate("() => { const b = document.querySelector('[data-a=\"weiter\"]'); b.click(); b.click(); }")
            await pg.wait_for_timeout(400)
            assert await pg.evaluate("window.__gastrocalc.stand.schritt") == 8, "Doppeltipp hat Schritt übersprungen"
            # Zurück-Geste des Browsers = ein Schritt zurück, nicht raus
            await pg.go_back(); await pg.wait_for_timeout(300)
            assert await pg.evaluate("window.__gastrocalc.stand.schritt") == 7, "Zurück-Geste"
            await pg.go_back(); await pg.wait_for_timeout(300)
            await pg.wait_for_selector(".kopfband")
            # Einstellungen, Sprache Türkisch
            await pg.click('[data-a="nav"][data-wert="einstellungen"]'); await pg.click('[data-a="sprache"][data-wert="tr"]')
            await bild("einstellungen-tr")
            await pg.click('[data-a="nav"][data-wert="start"]'); await bild("start-tr")
            await pg.click('[data-a="nav"][data-wert="karte"]'); await bild("karte-ansicht-tr")
            await pg.click('[data-a="nav"][data-wert="einstellungen"]'); await pg.click('[data-a="sprache"][data-wert="en"]'); await pg.click('[data-a="nav"][data-wert="start"]'); await bild("start-en")
            await pg.click('[data-a="nav"][data-wert="einstellungen"]'); await pg.click('[data-a="sprache"][data-wert="de"]')
            # Export-Datei prüfen
            async with pg.expect_download() as dl:
                await pg.click('[data-a="export"]')
            d = await dl.value; pfad = OUT / "export.json"; await d.save_as(str(pfad))
            kopf, inhalt = pfad.read_text().split("\n", 1); kopfd = json.loads(kopf); daten = json.loads(inhalt)
            assert kopfd["typ"] == "gastrocalc-sicherung" and kopfd["schema"] == 3 and len(kopfd["sha256"]) == 64, kopfd
            assert daten["wurzel"]["betriebe"][0]["betrieb"]["name"] == "Döner Baris"
            assert any(e["art"] == "onboarding-fertig" for e in daten["ereignisse"]), "Ereignisprotokoll fehlt"
            print("Ereignisse:", [e["art"] for e in daten["ereignisse"]][:12], "…", len(daten["ereignisse"]))

            # ---- Etappe 3: Heute (Umsatz, Weggeworfen), Listen
            await pg.click('[data-a="nav"][data-wert="tag"]'); await pg.wait_for_selector('[data-f="umsatz"]')
            await bild("tag-leer")
            await pg.fill('[data-f="umsatz"]', "1.850"); await pg.locator('[data-f="umsatz"]').blur(); await pg.wait_for_timeout(150)
            await pg.click('[data-a="schwund-neu"]'); await bild("tag-form-art")
            await pg.click('[data-a="schwund-art"][data-wert="verderb"]')
            await pg.fill('[data-f="schwund-suche"]', "Döner"); await pg.wait_for_timeout(100)
            await bild("tag-form-suche")
            await pg.click('[data-a="schwund-ref"][data-name="Dönerspieß Kalb/Pute"]')
            await pg.fill('[data-f="schwund-menge"]', "1,2"); await pg.wait_for_timeout(100)
            assert not await pg.locator('[data-a="schwund-speichern"]').is_disabled(), "Eintragen bleibt gesperrt, solange die Tastatur offen ist"
            await pg.locator('[data-f="schwund-menge"]').blur(); await pg.wait_for_timeout(150)
            await pg.click('[data-a="schwund-fraktion"][data-wert="bio"]')
            await bild("tag-form-ausgefuellt")
            await pg.click('[data-a="schwund-speichern"]'); await pg.wait_for_timeout(150)
            sw = await pg.evaluate("window.__gastrocalc.stand.schwund")
            assert len(sw) == 1 and abs(sw[0]["wert"] - 1.2 * 7.45) < 1e-6, sw  # 74,50 € je 10 kg → 7,45 €/kg → 1,2 kg = 8,94 €
            # Personalessen mit Gericht
            await pg.click('[data-a="schwund-neu"]'); await pg.click('[data-a="schwund-art"][data-wert="personal"]')
            await pg.click('[data-a="schwund-ref"][data-typ="gericht"]'); await pg.fill('[data-f="schwund-menge"]', "2"); await pg.locator('[data-f="schwund-menge"]').blur(); await pg.wait_for_timeout(150)
            await pg.click('[data-a="schwund-mahlzeit"][data-wert="abend"]'); await pg.click('[data-a="schwund-speichern"]'); await pg.wait_for_timeout(150)
            await bild("tag-mit-eintraegen")
            # Zurücknehmen bleibt sichtbar
            pg.once("dialog", lambda d: asyncio.ensure_future(d.accept()))
            await pg.click('[data-a="schwund-storno"]'); await pg.wait_for_timeout(150)
            sw = await pg.evaluate("window.__gastrocalc.stand.schwund")
            assert len(sw) == 2 and sum(1 for e in sw if e.get("storniert")) == 1, "Storno löscht statt zu kennzeichnen"
            await bild("tag-storno")
            await pg.click('[data-a="nav"][data-wert="listen"]'); await pg.wait_for_selector(".kopfband"); await bild("listen-woche")
            await pg.click('[data-a="listen-zeitraum"][data-wert="monat"]'); await bild("listen-monat")
            # Neuladen: Einträge und Umsatz bleiben
            await pg.reload(); await pg.wait_for_selector(".kopfband")
            w = await pg.evaluate("window.__gastrocalc.wurzel")
            assert w["schema"] == 3 and len(w["betriebe"]) == 1 and len(w["betriebe"][0]["schwund"]) == 2
            assert w["betriebe"][0]["tagesnotizen"][0]["umsatz"] == 1850, w["betriebe"][0]["tagesnotizen"]
            await bild("start-mit-heute")
            # ---- Läden: zweiten Laden anlegen, Übersicht, wechseln
            await pg.click('[data-a="nav"][data-wert="laeden"]'); await pg.wait_for_selector('[data-a="laden-neu"]'); await bild("laeden-ein-laden")
            await pg.click('[data-a="laden-neu"]'); await pg.wait_for_selector('[data-a="format"]')
            assert await pg.evaluate("window.__gastrocalc.stand.schritt") == 1, "neuer Laden startet nicht beim Format"
            await bild("laden-neu-format")
            # Zurück auf Schritt 1 verwirft den leeren Laden
            await pg.click('[data-a="zurueck"]'); await pg.wait_for_selector('[data-a="laden-neu"]')
            assert await pg.evaluate("window.__gastrocalc.wurzel.betriebe.length") == 1, "leerer Laden nicht verworfen"
            await pg.click('[data-a="laden-neu"]'); await pg.wait_for_selector('[data-a="format"]')
            await pg.click('[data-a="format"][data-wert="cafe"]'); await pg.click('[data-a="weiter"]')
            await pg.click('[data-a="kueche"][data-wert="fruehstueck"]'); await pg.click('[data-a="weiter"]')
            await pg.fill('[data-f="betrieb.name"]', "Café Murre"); await pg.click('[data-a="weiter"]')
            # Rest bis zum Ende überspringen
            for _ in range(60):
                if await pg.locator('[data-a="fertig"]').count(): break
                if not await pg.locator('[data-a="weiter"]').count(): await pg.click('[data-a="vorlage"] >> nth=0')  # Karte braucht ein Gericht
                await pg.click('[data-a="weiter"]'); await pg.wait_for_timeout(400)
            await pg.click('[data-a="fertig"]'); await pg.wait_for_selector(".kopfband")
            assert await pg.evaluate("window.__gastrocalc.stand.betrieb.name") == "Café Murre"
            await pg.click('[data-a="nav"][data-wert="laeden"]'); await pg.wait_for_selector('[data-a="laden-wechseln"]'); await bild("laeden-zwei")
            await pg.click('[data-a="laden-wechseln"]'); await pg.wait_for_selector(".kopfband")
            assert await pg.evaluate("window.__gastrocalc.stand.betrieb.name") == "Döner Baris", "Wechsel zurück klappt nicht"
            await bild("start-nach-wechsel")
            await pg.reload(); await pg.wait_for_selector(".kopfband")
            w = await pg.evaluate("window.__gastrocalc.wurzel")
            assert len(w["betriebe"]) == 2 and w["aktiv"] == w["betriebe"][0]["id"], (len(w["betriebe"]), w["aktiv"], [b["id"] for b in w["betriebe"]], [b["betrieb"]["name"] for b in w["betriebe"]])
            # Import einer Schema-1-Datei (alte Sicherung) muss als dritter Laden dazukommen
            alt = {"typ": "gastrocalc-sicherung", "schema": 1, "stand": {"id": "alt-1", "phase": "app", "schritt": 21, "sprache": "de",
                   "betrieb": {"name": "Altes Bistro", "format": "bistro", "kuechen": [], "tageProWoche": 6, "monate": 12},
                   "kosten": [{"id": "k1", "kategorie": "miete", "posten": "miete", "betrag": 900, "status": "bekannt", "periode": "monat"}]}, "ereignisse": []}
            altp = OUT / "alt.json"; altp.write_text(json.dumps(alt))
            await pg.click('[data-a="nav"][data-wert="einstellungen"]')
            pg.once("dialog", lambda d: asyncio.ensure_future(d.accept()))
            await pg.set_input_files('[data-f="import"]', str(altp)); await pg.wait_for_timeout(500)
            w = await pg.evaluate("window.__gastrocalc.wurzel")
            assert len(w["betriebe"]) == 3 and any(b["betrieb"]["name"] == "Altes Bistro" for b in w["betriebe"]), [b["betrieb"]["name"] for b in w["betriebe"]]
            await pg.wait_for_selector('[data-a="laden-wechseln"]'); await bild("laeden-drei-nach-import")
            assert await pg.evaluate("window.__gastrocalc.stand.betrieb.name") == "Döner Baris", "Import hat den aktiven Laden gewechselt"
            await pg.click('[data-a="nav"][data-wert="einstellungen"]')
            pg.once("dialog", lambda d: asyncio.ensure_future(d.accept()))
            await pg.set_input_files('[data-f="import"]', str(altp)); await pg.wait_for_timeout(500)
            assert await pg.evaluate("window.__gastrocalc.wurzel.betriebe.length") == 3, "Altdatei zweimal → vierter Laden"
            # Personalessen: kein Artikel wählbar
            await pg.click('[data-a="nav"][data-wert="tag"]'); await pg.click('[data-a="schwund-neu"]'); await pg.click('[data-a="schwund-art"][data-wert="personal"]')
            assert await pg.locator('[data-a="schwund-ref"][data-typ="artikel"]').count() == 0, "Artikel bei Personalessen wählbar"
            await pg.click('[data-a="schwund-abbruch"]')
            # ---- Etappe 4: Kühlkontrolle
            await pg.click('[data-a="laden-wechseln"] >> nth=0') if await pg.evaluate("window.__gastrocalc.stand.betrieb.name") != "Döner Baris" else None
            await pg.click('[data-a="nav"][data-wert="tag"]'); await pg.click('[data-a="nav"][data-wert="kuehl"]'); await bild("kuehl-leer")
            await pg.click('[data-a="kuehl-einrichtung"]'); await bild("kuehl-einrichtung-leer")
            for nm in ["Theke vorne", "Fleischkühlschrank", "TK Keller"]:
                await pg.fill('[data-f="stelle-neu"]', nm); await pg.click('[data-a="stelle-neu"]')
            ids = await pg.evaluate("window.__gastrocalc.stand.kuehlstellen.map(k => k.id)")
            await pg.fill(f'[data-f="stelle-max:{ids[0]}"]', "7"); await pg.fill(f'[data-f="stelle-max:{ids[1]}"]', "4")
            await pg.click(f'[data-a="stelle-art"][data-id="{ids[2]}"][data-wert="tk"]'); await pg.fill(f'[data-f="stelle-max:{ids[2]}"]', "-18")
            await pg.locator(f'[data-f="stelle-max:{ids[2]}"]').blur(); await pg.wait_for_timeout(150)
            await pg.click('[data-a="kuehl-ruhetag"][data-wert="0"]')
            await pg.fill('[data-f="person-neu"]', "MU"); await pg.click('[data-a="person-neu"]')
            await pg.fill('[data-f="person-neu"]', "Ayşe"); await pg.click('[data-a="person-neu"]')
            await bild("kuehl-einrichtung")
            st = await pg.evaluate("window.__gastrocalc.stand.kuehlstellen")
            assert st[2]["max"] == -18 and st[2]["art"] == "tk" and st[0]["max"] == 7, st
            await pg.click('[data-a="kuehl-einrichtung-fertig"]'); await bild("kuehl-start")
            # Rundgang: Person, heute
            await pg.click('[data-a="kuehl-rundgang"]'); await bild("kuehl-rundgang-wer")
            assert await pg.locator('[data-a="rundgang-start"]').is_disabled(), "ohne Kürzel darf es nicht losgehen, wenn Kürzel angelegt sind"
            await pg.click('[data-a="start-von"] >> nth=0'); await pg.click('[data-a="rundgang-start"]'); await bild("kuehl-rundgang-liste")
            # Station 1: Wert in Ordnung – Knopf muss ohne Blur freigeschaltet werden
            await pg.click(f'[data-a="station"][data-id="{ids[0]}"]'); await bild("kuehl-station-leer")
            assert await pg.locator('[data-a="station-speichern"]').is_disabled()
            assert (await pg.input_value('[data-f="station-wert"]')) == "", "Wert darf nicht vorbelegt sein"
            await pg.fill('[data-f="station-wert"]', "4,5"); await pg.wait_for_timeout(150)
            assert not await pg.locator('[data-a="station-speichern"]').is_disabled()
            await pg.click('[data-a="station-speichern"]')
            # Station 2: Abweichung → Maßnahme Pflicht, Ware weggeworfen → Schwund ohne Wert
            await pg.click(f'[data-a="station"][data-id="{ids[1]}"]'); await pg.fill('[data-f="station-wert"]', "11"); await pg.wait_for_timeout(200)
            await bild("kuehl-station-abweichung")
            assert await pg.locator('[data-a="station-speichern"]').is_disabled(), "Abweichung ohne Maßnahme darf nicht speicherbar sein"
            await pg.click('[data-a="massnahme"][data-wert="tuer"]'); await pg.click('[data-a="massnahme"][data-wert="weggeworfen"]')
            await pg.fill('[data-f="weg-name"]', "Döner"); await pg.wait_for_timeout(100); await pg.click('[data-a="weg-artikel"] >> nth=0')
            await pg.fill('[data-f="weg-menge"]', "3"); await pg.click('[data-a="weg-hinzu"]')
            await pg.click('[data-a="weg-alles"]'); await bild("kuehl-station-weggeworfen")
            await pg.click('[data-a="nachkontrolle"][data-wert="h1"]'); await pg.click('[data-a="station-speichern"]')
            # Station 3: nicht gemessen
            await pg.click(f'[data-a="station"][data-id="{ids[2]}"]'); await pg.click('[data-a="station-grund"][data-wert="geraetAus"]'); await pg.click('[data-a="station-speichern"]')
            await bild("kuehl-rundgang-fertig")
            # Unterbrechen und Neuladen: offener Rundgang bleibt
            await pg.reload(); await pg.wait_for_selector(".kopfband")  # Neuladen mit offenem Rundgang
            r = await pg.evaluate("window.__gastrocalc.stand.rundgaenge")
            assert len(r) == 1 and r[0]["abgeschlossen"] is None and len(r[0]["messungen"]) == 3, r
            await pg.click('[data-a="nav"][data-wert="tag"]'); await pg.click('[data-a="nav"][data-wert="kuehl"]'); await pg.click('[data-a="kuehl-rundgang"]')
            await pg.click('[data-a="rundgang-abschluss"]')
            await pg.wait_for_timeout(300); await bild("kuehl-nach-abschluss")
            st = await pg.evaluate("window.__gastrocalc.stand")
            assert len(st["messungen"]) == 3 and st["messungen"][1]["abweichung"] and st["messungen"][1]["nachkontrolle"]["art"] == "h1", st["messungen"]
            assert [m["lfd"] for m in st["messungen"]] == [1, 2, 3]
            neu_schwund = [e for e in st["schwund"] if e.get("quelle") == "kuehl"]
            assert len(neu_schwund) == 2 and neu_schwund[1]["wert"] is None and neu_schwund[1]["wertOffen"], neu_schwund
            assert abs(neu_schwund[0]["wert"] - 3 * 7.45) < 1e-6 or neu_schwund[0]["wert"] is None, neu_schwund[0]
            # Startseite: Nachkontrolle und Wert fehlt als offene Punkte
            await pg.click('[data-a="nav"][data-wert="start"]'); await bild("start-mit-kuehl")
            html = await pg.content(); assert "Nachkontrolle" in html and "ohne Wert" in html
            # Wert nachtragen auf Heute
            await pg.click('[data-a="nav"][data-wert="tag"]'); await bild("tag-mit-kuehl")
            wid = neu_schwund[1]["id"]
            await pg.fill(f'[data-f="wert:{wid}"]', "180"); await pg.locator(f'[data-f="wert:{wid}"]').blur(); await pg.wait_for_timeout(200)
            e = await pg.evaluate(f"window.__gastrocalc.stand.schwund.find(x => x.id === {wid!r})")
            assert e["wert"] == 180 and not e["wertOffen"], e
            # Nacherfassung: gestern Umsatz
            await pg.click('[data-a="tag-datum"] >> nth=1'); await bild("tag-gestern")
            await pg.fill('[data-f="umsatz"]', "1200"); await pg.locator('[data-f="umsatz"]').blur(); await pg.wait_for_timeout(200)
            tn = await pg.evaluate("window.__gastrocalc.stand.tagesnotizen"); g = [n for n in tn if n["umsatz"] == 1200]
            assert g and g[0]["nacherfasst"], tn
            await pg.click('[data-a="tag-datum"] >> nth=0')
            # Kontrollblatt und Druckansicht
            await pg.click('[data-a="nav"][data-wert="kuehl"]'); await pg.click('[data-a="kuehl-blatt"]'); await pg.click(f'[data-a="blatt-stelle"][data-id="{ids[1]}"]'); await bild("kuehl-blatt")
            await pg.emulate_media(media="print"); await pg.screenshot(path=str(OUT / "99_blatt-druck.png"), full_page=True); await pg.emulate_media(media="screen")
            # Zweite Messung schließt die Nachkontrolle
            await pg.click('[data-a="kuehl-start"]'); await pg.click(f'[data-a="kuehl-einzel"][data-id="{ids[1]}"]'); await bild("kuehl-einzel-wer")
            await pg.click('[data-a="start-von"] >> nth=1'); await pg.click('[data-a="rundgang-start"]')
            assert await pg.locator('[data-f="station-wert"]').count() == 1, "Einzelmessung öffnet die Stelle direkt"
            # Tippen Zeichen für Zeichen: Komma und Minus müssen überleben
            await pg.type('[data-f="station-wert"]', "3,5", delay=60); await pg.wait_for_timeout(150)
            assert (await pg.input_value('[data-f="station-wert"]')) == "3,5", await pg.input_value('[data-f="station-wert"]')
            await pg.click('[data-a="station-speichern"]'); await pg.wait_for_timeout(300)
            assert await pg.evaluate("window.__gastrocalc.stand.rundgaenge.every(r => r.abgeschlossen)"), "Einzelmessung muss sofort abgeschlossen sein"
            assert await pg.evaluate("window.__gastrocalc.stand.messungen.at(-1).wert") == 3.5
            html = await pg.content(); assert "Nachkontrolle fällig" not in html and "Nachkontrolle offen" not in html, "Nachkontrolle nicht geschlossen"
            await bild("kuehl-nach-zweitem-rundgang")
            # Türkisch auf den neuen Seiten
            await pg.click('[data-a="nav"][data-wert="einstellungen"]'); await pg.click('[data-a="sprache"][data-wert="tr"]')
            await pg.click('[data-a="nav"][data-wert="tag"]'); await pg.click('[data-a="nav"][data-wert="kuehl"]'); await bild("kuehl-tr")
            await pg.click('[data-a="nav"][data-wert="tag"]'); await bild("tag-tr")
            await pg.click('[data-a="nav"][data-wert="laeden"]'); await bild("laeden-tr")
            await pg.click('[data-a="nav"][data-wert="einstellungen"]'); await pg.click('[data-a="sprache"][data-wert="de"]')
            await b.close()
    finally:
        srv.terminate()
    if fehler: print("FEHLER IN DER SEITE:", *fehler, sep="\n  "); sys.exit(1)
    print("Durchlauf ok,", n, "Bilder in", OUT)

asyncio.run(main())
