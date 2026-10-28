"""Durchlauf Etappe 5 im Handy-Format: Onboarding (mit Kühlstellen, eigenem Lohn, Brutto/Netto, Gebinde), Cockpit, Müll in zwei Tipps,
Umsatz und Zähler, Beleg einlesen, Tag abschließen, Kühlkontrolle mit Standardgrenzen, Sicherung, Sprachen. Bilder je Schritt.
Start: python3 tests/durchlauf.py  (startet selbst einen kleinen Webserver)"""
import asyncio, subprocess, sys, time, pathlib, json, os
from playwright.async_api import async_playwright
import nav_hilfe  # Wege durch die drei Ebenen (Laden-Leiste, Menü-Blatt, Büro)

APP = pathlib.Path(__file__).resolve().parent.parent
OUT = pathlib.Path(os.environ.get("DURCHLAUF_OUT", APP.parent / "pdfbuild" / "app-check")); OUT.mkdir(parents=True, exist_ok=True)
PORT = int(os.environ.get("DURCHLAUF_PORT", "8765"))

BELEG = """METRO Cash & Carry Deutschland
Rechnung Nr. 4711 vom 11.10.2026
4001234 Tomaten rund KI 6kg 2 9,90 19,80 A
4022871 aro Sonnenblumenöl 10 l KA 1 18,90 18,90 A
4035512 Dönerbrot / Fladen 10er PK 5 3,30 16,50 A
4099000 Ayran 0,25 l 24x0,25l KT 1 9,60 9,60 B
PFAND MEHRWEG KASTEN 1 1,50 1,50 A
Summe Netto 66,30
MwSt A 7% 3,97
MwSt B 19% 1,82
Gesamtbetrag 72,09"""

async def main():
    srv = subprocess.Popen([sys.executable, "-m", "http.server", str(PORT), "--bind", "127.0.0.1"], cwd=APP, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    time.sleep(0.8)
    fehler = []
    try:
        async with async_playwright() as p:
            b = await p.chromium.launch()
            VID = os.environ.get("DURCHLAUF_VIDEO")
            ctx = await b.new_context(viewport={"width": 390, "height": 844}, device_scale_factor=2, is_mobile=True, has_touch=True, locale="de-DE",
                                      **({"record_video_dir": VID, "record_video_size": {"width": 390, "height": 844}} if VID else {}))
            await ctx.add_init_script(path=__import__("os").path.join(__import__("os").path.dirname(__import__("os").path.abspath(__file__)), "hilfe", "aufklappen.js"))  # Büro-Bereiche offen (19.10.2026)
            pg = await ctx.new_page()
            pg.on("console", lambda m: fehler.append(m.text) if m.type == "error" and "ERR_TUNNEL" not in m.text else None)
            pg.on("pageerror", lambda e: fehler.append(str(e)))
            await pg.goto(f"http://127.0.0.1:{PORT}/index.html")
            await pg.wait_for_selector(".kachel, [data-f=\"sprache-wahl\"]")
            # E5 (16.10.2026): erster Start – der Service Worker übernimmt die Seite und lädt sie einmal neu, sobald die App-Phase erreicht ist.
            # Damit das nicht mitten in einem Bildschirm passiert: erst warten, bis er die Seite hat (seit 27.10.2026 ohne Neuladen beim ersten Besuch).
            for _ in range(240):
                if await pg.evaluate("!!navigator.serviceWorker.controller"): break
                await pg.wait_for_timeout(500)
            _klick = pg.click
            async def klick(sel, **kw): await _klick(sel, **kw); await pg.wait_for_timeout(900 if os.environ.get("DURCHLAUF_VIDEO") else 320)
            pg.click = klick
            n = 0
            async def geh(ziel):  # drei Ebenen: Laden-Reiter unten, Tag abschließen im Menü-Blatt, alles andere im Büro
                await nav_hilfe.geh(pg, ziel)
            async def bild(name):
                nonlocal n; n += 1
                await pg.screenshot(path=str(OUT / f"{n:02d}_{name}.png"), full_page=True)
            async def stand(): return await pg.evaluate("window.__gastrocalc.stand")

            # ---- Onboarding
            await bild("sprache"); await pg.select_option('[data-f="sprache-wahl"]', "de"); await pg.click('[data-a="sprache"][data-wert="de"]'); await nav_hilfe.nach_sprache(pg); await pg.click('[data-a="s2-hilfe"]'); await pg.click('[data-a="weg-genau"]')  # Schnellweg 2: „Alles genau einrichten“ hinter dem „?“
            await pg.click('[data-a="format"][data-wert="imbiss"]'); await pg.click('[data-a="weiter"]')
            await pg.click('[data-a="kueche"][data-wert="doener"]'); await pg.click('[data-a="weiter"]')
            await pg.fill('[data-f="betrieb.name"]', "Döner Baris"); await pg.click('[data-a="weiter"]')
            assert await pg.locator('[data-a="rechtsform"]').count() == 0, "Rechtsform gehört nicht mehr in die Einrichtung (28.10.2026), sie steht im Büro"
            await pg.fill('[data-f="team.personen"]', "3"); await pg.fill('[data-f="team.stundenProPerson"]', "160"); await pg.click('[data-a="weiter"]')
            await bild("lohn-mit-eigenem")
            await pg.fill('[data-f="team.lohnkosten"]', "6000")
            assert (await pg.input_value('[data-f="team.eigenerLohn"]')) == "", "eigener Lohn darf nicht vorbelegt sein, nur als Richtwert gezeigt"
            await pg.fill('[data-f="team.eigenerLohn"]', "2500"); await pg.locator('[data-f="team.eigenerLohn"]').blur(); await pg.wait_for_timeout(150)
            s = await stand(); assert s["team"]["eigenerLohn"] == 2500 and s["team"]["eigenerLohnStatus"] == "eigen", s["team"]
            await pg.click('[data-a="weiter"]'); await pg.click('[data-a="weiter"]')
            # Kosten: Miete netto (Standard), Strom brutto (Standard) → umschalten auf netto und zurück
            await pg.click('[data-a="posten"][data-posten="miete"]'); await pg.fill('[data-f="posten:miete"]', "2000"); await pg.locator('[data-f="posten:miete"]').blur(); await pg.wait_for_timeout(150)
            await bild("kosten-miete-basis")
            await pg.click('[data-a="weiter"]')
            await pg.click('[data-a="posten"][data-posten="strom"]'); await pg.fill('[data-f="posten:strom"]', "714"); await pg.locator('[data-f="posten:strom"]').blur(); await pg.wait_for_timeout(150)
            s = await stand(); strom = next(k for k in s["kosten"] if k["posten"] == "strom"); assert strom["basis"] == "brutto", strom
            await pg.click('[data-a="basis-posten"][data-posten="strom"][data-wert="netto"]')
            s = await stand(); assert next(k for k in s["kosten"] if k["posten"] == "strom")["basis"] == "netto"
            await pg.click('[data-a="basis-posten"][data-posten="strom"][data-wert="brutto"]'); await bild("kosten-strom-brutto")
            await pg.click('[data-a="weiter"]')
            for _ in range(8): await pg.click('[data-a="weiter"]')
            # Reinigung (Punkt 5, B1): beides, Firma 280 €, 30 Min. Team
            await pg.wait_for_selector('[data-a="rein-wer"]'); await pg.click('[data-a="rein-wer"][data-wert="beides"]')
            await pg.click('[data-a="rein-min"][data-d="-15"]'); await pg.fill('[data-f="rein-firma"]', "280"); await pg.locator('[data-f="rein-firma"]').blur(); await pg.wait_for_timeout(150)
            r = (await stand())["betrieb"]["reinigung"]; assert r["wer"] == "beides" and r["firmaBetrag"] == 280 and r["minutenTag"] == 30, r
            await bild("ob-reinigung"); await pg.click('[data-a="weiter"]')
            # Kanäle
            await pg.click('[data-a="weiter"]')
            # ---- Kühlstellen im Onboarding
            await pg.wait_for_selector('[data-a="plus"][data-feld="stellen"]'); await bild("ob-kuehl-leer")
            await pg.click('[data-a="plus"][data-feld="stellen"]'); await pg.click('[data-a="plus"][data-feld="stellen"]'); await pg.click('[data-a="plus"][data-feld="stellen"]')
            s = await stand(); ks = [k for k in s["kuehlstellen"] if not k["archiviert"]]
            assert len(ks) == 3 and ks[0]["name"] == "Kühlschrank 1" and ks[1]["art"] == "tk" and ks[1]["name"] == "Tiefkühler", ks
            await pg.fill(f'[data-f="ob-stelle:{ks[0]["id"]}"]', "Theke vorne"); await pg.locator(f'[data-f="ob-stelle:{ks[0]["id"]}"]').blur(); await pg.wait_for_timeout(150)
            await pg.click(f'[data-a="ob-art"][data-id="{ks[2]["id"]}"][data-wert="warm"]')
            await bild("ob-kuehl-drei")
            s = await stand(); ks = [k for k in s["kuehlstellen"] if not k["archiviert"]]
            assert ks[0]["name"] == "Theke vorne" and ks[2]["art"] == "warm" and ks[2]["name"] == "Warmhalter" and ks[0]["max"] is None, ks
            await pg.click('[data-a="minus"][data-feld="stellen"]')
            assert len([k for k in (await stand())["kuehlstellen"] if not k["archiviert"]]) == 2
            await pg.click('[data-a="weiter"]')
            s = await stand(); assert s["kuehl"]["eingerichtet"] is True and s["kuehl"]["seit"], s["kuehl"]
            # ---- Karte
            await pg.fill('[data-f="suche"]', "Döner"); await pg.wait_for_timeout(150)
            for nm in ["Döner Kebab", "Dürüm Döner", "Dönerteller"]: await pg.click(f'[data-a="vorlage"][data-name="{nm}"]')
            await pg.fill('[data-f="suche"]', ""); await pg.wait_for_timeout(150)
            if await pg.locator('[data-a="vorlage"][data-name="Cola 0,33 l"]').count(): await pg.click('[data-a="vorlage"][data-name="Cola 0,33 l"]')
            await pg.click('[data-a="weiter"]')
            await pg.click('[data-a="rezept-auf"] >> nth=0'); await pg.fill('[data-f="zutat:0"]', "200"); await pg.click('[data-a="rezept-zu"]'); await pg.click('[data-a="weiter"]')
            # ---- Einkaufspreise mit Gebinde (Variante C)
            await bild("preise-gebinde")
            # 20.10.2026: Bilderwand – Filter „Alle“, Kachel antippen öffnet das Blatt, „Fertig“ schließt es
            if await pg.locator('[data-a="ep-filter"][data-wert="alle"]').count(): await pg.click('[data-a="ep-filter"][data-wert="alle"]')
            async def auf(name):
                if await pg.locator(f'.ep-blatt [data-f="preis:{name}"]').count(): return
                if await pg.locator('.fuss [data-a="ep-zu"]').count(): await pg.click('.fuss [data-a="ep-zu"]'); await pg.wait_for_timeout(120)
                await pg.click(f'.ep-kachel[data-name="{name}"]'); await pg.wait_for_selector(f'.ep-blatt [data-f="preis:{name}"]')
            async def preis(name, menge, einheit, p, art=None, basis=None, zwischen=None):
                await auf(name)
                if art: await pg.click(f'[data-a="gebinde-art"][data-name="{name}"][data-wert="{art}"]')
                await pg.click(f'[data-a="packung-einheit"][data-name="{name}"][data-wert="{einheit}"]')
                await pg.fill(f'[data-f="packung:{name}"]', menge)
                await pg.fill(f'[data-f="preis:{name}"]', p); await pg.locator(f'[data-f="preis:{name}"]').blur(); await pg.wait_for_timeout(120)
                if basis: await pg.click(f'[data-a="preis-basis"][data-name="{name}"][data-wert="{basis}"]')
                if zwischen:
                    await pg.click(f'[data-a="zwischen-auf"][data-name="{name}"]'); await pg.fill(f'[data-f="zwischen:{name}"]', zwischen); await pg.locator(f'[data-f="zwischen:{name}"]').blur(); await pg.wait_for_timeout(120)
            await preis("Dönerspieß Kalb/Pute", "10", "kg", "74,50", art="karton")
            await preis("Dönerbrot / Fladen", "200", "stk", "60", art="karton", zwischen="4")
            await preis("Tomaten", "6", "kg", "9,60", art="kiste")
            await auf("Dönerbrot / Fladen"); await bild("preise-falafel-kette")
            s = await stand(); brot = next(a for a in s["artikel"] if a["name"] == "Dönerbrot / Fladen")
            assert brot["gebinde"]["art"] == "karton" and brot["gebinde"]["zwischen"]["anzahl"] == 4 and brot["packung"]["menge"] == 200, brot
            html = await pg.content(); assert "Karton à 4 Beutel à 200 Stück" in html or "Karton à 4 Beutel à 50 Stück" in html, "Gebindesatz fehlt"
            assert "à 50 Stück" in html, "Inhalt je Beutel muss 50 sein"
            namen = await pg.evaluate("window.__gastrocalc.stand.artikel.filter(a => a.preis === null && a.benutzt !== false).map(a => a.name)")
            for nm in namen:
                e = await pg.evaluate(f"(window.__gastrocalc.stand.artikel.find(a => a.name === {nm!r}) || {{}}).einheit")
                await preis(nm, "10", {"kg": "kg", "l": "l"}.get(e, "stk"), "20")
            # Cola brutto vom Supermarkt
            if await pg.locator('[data-a="preis-basis"][data-name="Cola 0,33 l"]').count():
                await auf("Cola 0,33 l"); await pg.click('[data-a="preis-basis"][data-name="Cola 0,33 l"][data-wert="brutto"]')
            if await pg.locator('.fuss [data-a="ep-zu"]').count(): await pg.click('.fuss [data-a="ep-zu"]'); await pg.wait_for_timeout(120)
            await pg.click('[data-a="weiter"]')
            ids = await pg.evaluate("window.__gastrocalc.stand.gerichte.map(g => g.id)")
            for i, gid in enumerate(ids): await pg.fill(f'[data-f="preis:{gid}"]', ["7,50", "8", "12,90", "2,50"][i % 4])
            await pg.click(f'[data-a="bestseller"][data-id="{ids[0]}"]'); await pg.fill(f'[data-f="menge:{ids[0]}"]', "120")
            await pg.fill('[data-f="bestellungenTag"]', "200"); await pg.locator('[data-f="bestellungenTag"]').blur(); await pg.wait_for_timeout(150)
            await pg.click('[data-a="weiter"]'); await bild("ergebnis")
            await pg.click('[data-a="fertig"]')  # 27.10.2026: der erste Service Worker lädt die Seite nicht mehr neu (tests/durchlauf_erststart.py)
            await pg.wait_for_selector(".cockpit")
            await nav_hilfe.rundgang_weg(pg)  # 28.10.2026: der Mitmach-Rundgang endet erst mit „Verstanden“ (3 s) – vorher ging die alte Führung sofort zu
            # ---- Cockpit
            await bild("cockpit-leer")
            html = await pg.content(); assert "Bis null" in html and "umsatzheute" in html and "appleiste" in html and "Umsatz im Monat" not in html  # Drei Ebenen: Monatskurve wohnt im Büro
            z = await pg.evaluate("(async () => { const m = await import('./js/zaehler.js'); return m.zaehler(window.__gastrocalc.stand); })()")
            assert z["stufe"] == 2 and z["keinUmsatz"] and z["quote"] > 0.05, {k: z[k] for k in ("stufe", "keinUmsatz", "quote")}
            # Drei Ebenen: fünf Reiter unten, kein Schnellknopf; ☰ öffnet ein Blatt mit großen Kacheln, ohne den Bildschirm neu zu zeichnen
            assert await pg.locator('.tableiste .tab').count() == 5 and await pg.locator('.fab').count() == 0 and await pg.locator('[data-a="menue-auf"]').count() == 1
            assert await pg.locator('.tableiste .tab.an[data-wert="start"]').count() == 1
            await pg.evaluate("document.querySelector('#app .schirm').dataset.probe = '1'")
            await pg.click('[data-a="menue-auf"]'); await pg.wait_for_selector('#ebene-huelle .blatt-menue'); await bild("menue")
            assert await pg.locator('#ebene-huelle .grosskachel').count() == 3, "ein Laden: Tag abschließen, Personal, Büro"
            assert await pg.locator('#ebene-huelle [data-a="modus"][data-wert="buero"]').count() == 1 and await pg.locator('#ebene-huelle [data-a="blatt-sprache"]').count() == 1
            await pg.click('#ebene-huelle .ebene-dimmer', position={"x": 200, "y": 60}); await pg.wait_for_timeout(150); assert await pg.locator('#ebene-huelle .ebene-blatt').count() == 0
            await pg.click('[data-a="menue-auf"]'); await pg.go_back(); await pg.wait_for_timeout(200); assert await pg.locator('#ebene-huelle .ebene-blatt').count() == 0, "Zurück schließt das Blatt"
            assert await pg.evaluate("document.querySelector('#app .schirm').dataset.probe") == "1", "Blatt auf/zu darf den Bildschirm nicht neu zeichnen"
            await pg.click('[data-a="hilfe-auf"]'); await pg.wait_for_selector('#ebene-huelle .blatt-hilfe'); await bild("hilfe")
            await pg.click('#ebene-huelle [data-a="blatt-zu"] >> nth=-1'); await pg.wait_for_timeout(150)
            await bild("cockpit-einrichtung"); assert await pg.locator('#app .ring').count() == 0  # Einrichtungsring wohnt im Büro (Offen im Büro)
            # ---- Umsatz eintragen
            await geh("umsatz"); await pg.wait_for_selector('[data-f="umsatz"]'); await bild("umsatz-leer")
            await pg.fill('[data-f="umsatz"]', "1.850"); await pg.locator('[data-f="umsatz"]').blur(); await pg.wait_for_timeout(200)
            s = await stand(); assert s["tagesnotizen"][0]["umsatz"] == 1850
            await bild("umsatz-zaehler")
            html = await pg.content(); assert "So rechnet die App" in html and "Dein Weg durch den Monat" in html
            # netto-Schalter: Anzeige wechselt, gespeichert bleibt brutto
            await pg.click('[data-a="umsatz-basis"][data-wert="netto"]')
            v = await pg.input_value('[data-f="umsatz"]'); assert v != "1850" and v != "", v
            await pg.click('[data-a="umsatz-basis"][data-wert="brutto"]')
            assert (await pg.input_value('[data-f="umsatz"]')) == "1850"
            # ---- Müll mit einem Tipp (Drei Ebenen, Punkt 8): Foto antippen = eingetragen, „Rückgängig" storniert, „…" = Detail, „Andere" = Suche + Eimer
            await geh("muell"); await pg.wait_for_selector('.muellraster'); await bild("muell-raster-leer")
            html = await pg.content(); assert "Çöp gir" not in html and "Add waste" not in html, "keine dreisprachigen Untertitel mehr"
            assert await pg.locator('[data-a="muell-tipp"]').count() <= 8 and await pg.locator('[data-a="muell-andere"]').count() == 1
            await pg.click('[data-a="muell-grund"][data-wert="bruch"]'); await pg.wait_for_timeout(250)  # 27.10.2026: Gerichte unter „Ganze Gerichte“
            await pg.click(f'[data-a="muell-tipp"][data-typ="gericht"][data-id="{ids[0]}"]'); await pg.wait_for_selector('.muelltoast'); await bild("muell-getippt")
            s = await stand(); g = [e for e in s["schwund"] if e["art"] == "gericht" and not e["storniert"]]
            assert len(g) == 1 and g[0]["menge"] == 1 and g[0]["wert"] is not None, g
            assert await pg.locator('.ware.frisch .haken').count() == 1 and "1×" in await pg.locator('.ware.frisch').inner_text()
            # Rückgängig storniert, löscht nie
            await pg.click('[data-a="muell1-zurueck"]'); await pg.wait_for_timeout(150)
            s = await stand(); assert len(s["schwund"]) == 1 and s["schwund"][0]["storniert"]
            # „…" öffnet das Detail: 2 Teller (bleibt stehen)
            await pg.click(f'[data-a="muell-detail"][data-typ="gericht"][data-id="{ids[0]}"]'); await bild("muell-blatt")
            await pg.click('[data-a="muell-d"][data-d="1"]'); await pg.wait_for_timeout(100)
            assert "in der Tonne" in await pg.locator(".muellwert").inner_text()
            await pg.click('[data-a="muell-weg-damit"]'); await pg.wait_for_selector('[data-a="muell1-zurueck"]'); await bild("muell-eingetragen")
            s = await stand(); g = [e for e in s["schwund"] if e["art"] == "gericht" and not e["storniert"]]
            assert len(g) == 1 and g[0]["menge"] == 2 and g[0]["wert"] is not None, g
            # Rohware über „Andere" und die Suche
            await pg.click('[data-a="muell-andere"]'); await pg.fill('[data-f="muell-suche"]', "Toma"); await pg.wait_for_timeout(150); await bild("muell-suche")
            await pg.click('[data-a="muell-kachel"][data-name="Tomaten"]')
            if await pg.locator('[data-a="muell-einheit"][data-wert="kg"]').count(): await pg.click('[data-a="muell-einheit"][data-wert="kg"]')
            await pg.fill('[data-f="muell-menge"]', "1,2"); await pg.wait_for_timeout(100)
            assert not await pg.locator('[data-a="muell-weg-damit"]').is_disabled()
            await pg.locator('[data-f="muell-menge"]').blur(); await pg.wait_for_timeout(150); await bild("muell-blatt-rohware"); await pg.click('[data-a="muell-weg-damit"]')
            s = await stand(); r = [e for e in s["schwund"] if e["art"] == "rohware"]; assert len(r) == 1 and abs(r[0]["wert"] - 1.2 * 1.6) < 1e-6 and r[0]["fraktion"] == "bio", r
            # Eimer (über „Andere"): gemeldete Teller werden abgezogen
            await pg.click('[data-a="muell-andere"]'); await pg.click('[data-a="muell-kachel\"][data-typ="eimer"]')
            await pg.fill('[data-f="muell-menge"]', "3"); await pg.wait_for_timeout(150); await pg.locator('[data-f="muell-menge"]').blur(); await pg.wait_for_timeout(200)
            await bild("muell-eimer"); await pg.click('[data-a="muell-weg-damit"]')
            s = await stand(); ei = [e for e in s["schwund"] if e["art"] == "eimer"]; assert len(ei) == 1 and ei[0]["gewogen"] == 3 and ei[0]["menge"] < 3 and ei[0]["gemeldet"] > 0, ei
            # Personalessen über den Schalter im Detail
            await pg.click('[data-a="muell-andere"]'); await pg.click(f'[data-a="muell-kachel\"][data-typ="gericht"][data-id="{ids[1]}"]')
            await pg.click('[data-a="muell-personal"]'); await pg.wait_for_timeout(100); await bild("muell-personal"); await pg.click('[data-a="muell-weg-damit"]')
            s = await stand(); pe = [e for e in s["schwund"] if e["art"] == "personal"]; assert len(pe) == 1, pe
            await bild("muell-raster-voll")
            # Wochen-Statistik wohnt jetzt im Büro unter Listen
            await geh("listen"); html = await pg.content(); assert "Am meisten weg" in html and "muellkarte" in html; await bild("listen-muell-statistik")
            # ---- Cockpit mit Zahlen
            await geh("start"); await bild("cockpit-mit-zahlen")
            html = await pg.content(); assert "h-feld muell" in html and "1.850" in html  # Laden-Umbau (20.10.2026): Feld „Müll“ in der Reihe
            # ---- Beleg einlesen
            await geh("beleg"); await bild("beleg-leer"); await pg.click('[data-a="beleg-text-zeigen"]'); await pg.wait_for_selector('[data-f="beleg-text"]')
            assert await pg.locator('[data-a="beleg-zerlegen"]').is_disabled()
            await pg.fill('[data-f="beleg-text"]', BELEG); await pg.wait_for_timeout(150)
            assert not await pg.locator('[data-a="beleg-zerlegen"]').is_disabled()
            await pg.click('[data-a="beleg-zerlegen"]'); await bild("beleg-pruefen")
            html = await pg.content(); assert "Zeilen erkannt" in html and "stimmt" in html, "Summenprobe fehlt"
            # Ayran ist unbekannt → Frage: neu anlegen
            for _ in range(6):
                if await pg.locator('[data-a="beleg-zuordnen"][data-name="neu"]').count(): await pg.click('[data-a="beleg-zuordnen"][data-name="neu"] >> nth=0')
                elif await pg.locator('[data-a="beleg-antwort"]').count(): await pg.click('[data-a="beleg-antwort"] >> nth=0')
                else: break
            await bild("beleg-geklaert")
            assert not await pg.locator('[data-a="beleg-uebernehmen"]').is_disabled(), "Übernehmen bleibt gesperrt"
            await pg.click('[data-a="beleg-uebernehmen"]'); await pg.wait_for_timeout(300); await bild("beleg-fertig")
            s = await stand(); assert len(s["lieferungen"]) == 1 and s["lieferungen"][0]["lieferant"] == "Metro" and abs(s["lieferungen"][0]["summeNetto"] - 64.8) < 0.01, s["lieferungen"][0]
            tom = next(a for a in s["artikel"] if a["name"] == "Tomaten"); assert tom["preis"] == 9.9 and tom["packung"]["menge"] == 6 and len(tom["preisHistorie"]) == 1, tom
            assert any(a["name"].startswith("Ayran") for a in s["artikel"]), "neuer Artikel nicht angelegt"
            html = await pg.content(); assert "Tomaten" in html and "+3 %" in html, "Preisänderung Tomaten fehlt (9,60 → 9,90)"
            # Zähler: ein kleiner Beleg unter der Karten-Schätzung macht den Zähler nicht grüner (bleibt Stufe 2), der Beleg zählt aber
            z = await pg.evaluate("(async () => { const m = await import('./js/zaehler.js'); return m.zaehler(window.__gastrocalc.stand); })()")
            assert z["stufe"] == 2 and z["belege"] == 1 and z["ware"] > 64.8, (z["stufe"], z["ware"])
            await geh("umsatz"); await bild("umsatz-nach-beleg-preise")
            html = await pg.content(); assert "Ware (geschätzt" in html and "Tomaten" in html
            # ---- Tag abschließen
            await geh("start"); await geh("abschluss"); await pg.wait_for_selector('[data-a="abschluss-fertig"]'); await bild("abschluss-haken")
            await pg.click('[data-a="abschluss-fertig"]'); await pg.wait_for_timeout(300); await bild("abschluss-bilanz")
            s = await stand(); assert len(s["abschluesse"]) == 1 and s["abschluesse"][0]["umsatz"] == 1850, s["abschluesse"]
            html = await pg.content(); assert "Tag geschafft" in html
            await geh("start"); html = await pg.content(); assert "Tag abschließen" not in await pg.inner_text(".cockpit")  # Abschluss steht nicht mehr in „Jetzt dran"
            await bild("cockpit-abgeschlossen")
            # ---- Neuladen: alles da, Schema 4
            await pg.reload(); await pg.wait_for_selector(".cockpit")
            w = await pg.evaluate("window.__gastrocalc.wurzel")
            assert w["schema"] == 6 and len(w["betriebe"][0]["lieferungen"]) == 1 and len(w["betriebe"][0]["abschluesse"]) == 1
            # ---- Kühlkontrolle mit Standardgrenzen
            await geh("kuehl"); await bild("kuehl-start")
            html = await pg.content(); assert "Standard" in html, "Standardgrenze nicht sichtbar"
            await pg.click('[data-a="kuehl-rundgang-los"]'); await pg.wait_for_selector('[data-f="station-wert"]')  # Laden-Umbau (20.10.2026): direkt an der ersten Stelle
            kids = await pg.evaluate("window.__gastrocalc.stand.kuehlstellen.filter(k => !k.archiviert).map(k => k.id)")
            await pg.fill('[data-f="station-wert"]', "8,5"); await pg.wait_for_timeout(200)
            await bild("kuehl-abweichung-standard")
            assert await pg.locator('[data-a="station-speichern"]').is_disabled(), "8,5 °C über Standard 7 muss Abweichung sein"
            await pg.click('[data-a="massnahme"][data-wert="tuer"]'); await pg.click('[data-a="station-speichern"]')
            await pg.wait_for_selector('[data-f="station-wert"]')  # Gremium 1 (24.10.2026): nach dem Speichern öffnet sich direkt die nächste Stelle
            assert await pg.evaluate("document.querySelector('.ebene-kopf, h1')?.textContent || ''") is not None
            await pg.fill('[data-f="station-wert"]', "-19"); await pg.wait_for_timeout(150); await pg.click('[data-a="station-speichern"]')
            await pg.wait_for_timeout(300)  # W2-H: nach der letzten Stelle schließt sich der Rundgang selbst
            assert await pg.locator('[data-a="rundgang-abschluss"]').count() == 0, "Rundgang hätte sich selbst schließen sollen"
            s = await stand(); assert len(s["messungen"]) == 2 and s["messungen"][0]["abweichung"] and s["messungen"][0]["grenzeStandard"] and s["messungen"][0]["max"] == 7, s["messungen"]
            # eigene Grenze setzen und Monatsblatt – Laden-Umbau (20.10.2026): beides im Büro
            await nav_hilfe.ins_buero(pg); await pg.evaluate("document.querySelectorAll('details').forEach(d => d.open = true)")
            await pg.click('#app [data-a="kuehl-einrichtung-oeffnen"]'); await bild("kuehl-einrichtung-standard")
            await pg.fill(f'[data-f="stelle-max:{kids[0]}"]', "4"); await pg.locator(f'[data-f="stelle-max:{kids[0]}"]').blur(); await pg.wait_for_timeout(200)
            html = (await pg.inner_text("#app")).replace("\u00a0", " ").replace("\u2066", "").replace("\u2069", ""); assert "≤ 4,0 °C" in html and "(Standard)" not in html.split("≤ 4,0 °C")[1][:30], html[:400]  # 20.10.2026: Temperaturen mit geschütztem Leerzeichen und LTR-Isolierung
            await pg.click('[data-a="kuehl-einrichtung-fertig"]'); await pg.click('[data-a="kuehl-blatt"]'); await bild("kuehl-blatt")
            # ---- Mehr: Zähler-Einstellungen
            await geh("einstellungen"); await bild("mehr")
            await pg.fill('[data-f="warenQuote"]', "35"); await pg.locator('[data-f="warenQuote"]').blur(); await pg.wait_for_timeout(200)
            s = await stand(); assert abs(s["verkauf"]["warenQuote"] - 0.35) < 1e-9
            # Export: Schema 4 mit Prüfsumme
            await pg.click('[data-a="export"]'); await pg.wait_for_selector("#ebene-huelle .blatt-passwort")  # E5 (16.10.2026): erst das Passwort-Blatt
            await pg.click('#ebene-huelle [data-a="sicherung-pw-schalter"]')  # Laden-Umbau (20.10.2026): Passwort ist vorgewählt – Schalter aus
            async with pg.expect_download() as dl: await pg.click('#ebene-huelle [data-a="sicherung-teilen"]')
            d = await dl.value; pfad = OUT / "export.zip"; await d.save_as(str(pfad))  # W2-D: Sicherung als ZIP mit Fotos
            await pg.wait_for_selector("#ebene-huelle .blatt-sicherungort"); await pg.click('#ebene-huelle [data-a="sicherung-ort"][data-wert="woanders"]'); await pg.wait_for_timeout(300)
            assert await pg.evaluate("!!window.__gastrocalc.wurzel.letzteSicherung"), "Anderes Gerät zählt als Sicherung"
            import zipfile
            with zipfile.ZipFile(pfad) as zf: roh = zf.read("gastrocalc-sicherung.json").decode()
            kopf, inhalt = roh.split("\n", 1); kopfd = json.loads(kopf); daten = json.loads(inhalt)
            assert kopfd["schema"] == 6 and len(kopfd["sha256"]) == 64 and daten["wurzel"]["betriebe"][0]["lieferungen"], kopfd
            # Alte Schema-3-Sicherung einlesen: Posten bekommen basis netto, Artikel Gebinde
            alt = {"typ": "gastrocalc-sicherung", "schema": 3, "wurzel": {"schema": 3, "betriebe": [{"id": "alt-3", "phase": "app", "betrieb": {"name": "Altes Café", "format": "cafe", "kuechen": [], "tageProWoche": 6, "monate": 12},
                   "kosten": [{"id": "k1", "kategorie": "energie", "posten": "strom", "betrag": 119, "status": "bekannt", "periode": "monat"}], "artikel": [{"name": "Milch", "gruppe": "kaese", "einheit": "l", "packung": {"menge": 1, "einheit": "l"}, "preis": 1}]}], "aktiv": "alt-3"}, "ereignisse": []}
            altp = OUT / "alt3.json"; altp.write_text(json.dumps(alt))
            ja = lambda dd: asyncio.ensure_future(dd.accept()); pg.on("dialog", ja)  # W2-D: ohne Prüfsumme kommt erst eine Rückfrage, dann die Import-Frage
            await pg.set_input_files('[data-f="import"]', str(altp)); await pg.wait_for_timeout(800); pg.remove_listener("dialog", ja)
            w = await pg.evaluate("window.__gastrocalc.wurzel"); altb = next(x for x in w["betriebe"] if x["id"] == "alt-3")
            assert altb["kosten"][0]["basis"] == "netto" and altb["artikel"][0]["gebinde"]["art"] == "packung" and altb["artikel"][0]["preisBasis"] == "netto", altb
            await bild("laeden-nach-import")
            # ---- Sprachen auf den neuen Seiten
            await geh("einstellungen"); await pg.click('[data-a="sprache"][data-wert="tr"]')
            await geh("start"); await bild("cockpit-tr")
            await geh("muell"); await bild("muell-tr")
            await geh("umsatz"); await bild("umsatz-tr")
            await geh("einstellungen"); await pg.click('[data-a="sprache"][data-wert="en"]')
            await geh("start"); await bild("cockpit-en")
            await geh("beleg"); await bild("beleg-en")
            await geh("einstellungen"); await pg.click('[data-a="sprache"][data-wert="de"]')
            # Zurück-Geste aus Müll-Unterseite: eine Ebene hoch
            await geh("muell"); await pg.click('[data-a="muell-andere"]'); await pg.wait_for_selector('[data-a="muell-kachel"]')
            await pg.go_back(); await pg.wait_for_timeout(300)
            assert await pg.locator('[data-a="muell-kachel"]').count() == 0 and await pg.locator('.muellraster').count() == 1, "Zurück schließt die Suche und zeigt wieder das Foto-Raster"
            await pg.go_back(); await pg.wait_for_timeout(300); await pg.wait_for_selector(".cockpit")
            await ctx.close(); await b.close()
    finally:
        srv.terminate()
    if fehler: print("FEHLER IN DER SEITE:", *fehler, sep="\n  "); sys.exit(1)
    print("Durchlauf ok,", n, "Bilder in", OUT)

asyncio.run(main())
