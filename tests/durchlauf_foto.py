"""Durchlauf Etappe 6a im Handy-Format (echter Browser, echte Texterkennung im Arbeitsfaden):
Schnellweg 2 (Sprache → Laden → Karte als Foto → Prüfliste → Kühlung → Geld → fertig) → Stromrechnung fotografieren →
als Strom zuweisen → Zähler; Großhandelsbon → Ware; PDF-Speisekarte über „Karte". Bilder je Schritt.
Start: python3 tests/durchlauf_foto.py"""
import asyncio, subprocess, sys, time, pathlib, os
from playwright.async_api import async_playwright
import nav_hilfe  # Wege durch die drei Ebenen

APP = pathlib.Path(__file__).resolve().parent.parent
OUT = pathlib.Path(os.environ.get("DURCHLAUF_OUT", APP.parent / "pdfbuild" / "foto-check")); OUT.mkdir(parents=True, exist_ok=True)
PORT = int(os.environ.get("DURCHLAUF_PORT", "8766"))
BILD = APP / "tests" / "bilder"

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
            warte = 900 if VID else 300
            async def klick(sel): await pg.click(sel); await pg.wait_for_timeout(warte)
            n = 0
            async def bild(name):
                nonlocal n; n += 1
                await pg.screenshot(path=str(OUT / f"{n:02d}_{name}.png"), full_page=True)
            stand = lambda: pg.evaluate("window.__gastrocalc.stand")
            t0 = time.time()

            # 1 Sprache
            await bild("sprache"); await pg.select_option('[data-f="sprache-wahl"]', "de"); await klick('[data-a="sprache"][data-wert="de"]')
            # 2 Laden
            await pg.wait_for_selector('[data-a="laden-art"]'); await bild("laden")
            await pg.fill('[data-f="betrieb.name"]', "Döner Haus"); await klick('[data-a="laden-art"][data-wert="doener"]')
            await bild("laden-gewaehlt"); await klick('[data-a="weiter"]')
            # 2b „Was macht ihr selbst?“ fragt der Schnellweg 2 nicht mehr: Vorauswahl nach Laden-Art still (Dönerladen: Teig, Brot, Lahmacun, Soßen)
            s = await stand(); assert len(s["selbst"]) == 5, f"Vorauswahl Dönerladen (seit 20.10.2026 mit Adana): {s.get('selbst')}"
            # 3 Speisekarte fotografieren (Galerie-Eingang: setInputFiles; der Kamera-Eingang hat capture)
            await pg.wait_for_selector('input[data-f="foto"][data-zweck="speisekarte"]', state="attached"); await bild("karte-foto")
            assert await pg.locator('input[data-f="foto"][capture]').count() == 1, "Kamera-Eingang fehlt"
            await pg.locator('input[data-f="foto"]:not([capture])').set_input_files(str(BILD / "karte_foto.jpg"))
            await pg.wait_for_selector('[data-a="fv-uebernehmen"]', timeout=60000); await pg.wait_for_timeout(300)
            await bild("karte-pruefen")
            s = await stand(); assert len(s["uploads"]) == 1 and s["uploads"][0]["status"] == "gelesen", s["uploads"]
            namen = await pg.evaluate("[...document.querySelectorAll('.fvz')].map(z => z.querySelector('[data-f^=\\'fv-name:\\']')?.value || z.querySelector('.n')?.firstChild?.textContent || '')")
            assert len(namen) >= 7, namen
            # eine Zeile ausschalten, einen Preis ändern
            await klick('[data-a="fv-an"] >> nth=-1')
            await klick('.fvliste:not(.offen) [data-a="fv-auf"] >> nth=0'); await bild("karte-aufgeklappt")
            geaendert = await pg.locator('.fvz.auf [data-f^="fv-name:"]').input_value()
            erster = pg.locator('.fvz.auf [data-f^="fv-preis:"]'); await erster.fill("7,90"); await erster.blur(); await pg.wait_for_timeout(200)
            await bild("karte-geaendert"); await klick('[data-a="fv-uebernehmen"]')
            s = await stand(); assert len(s["gerichte"]) == len(namen) - 1, (len(s["gerichte"]), namen)
            g7 = next(g for g in s["gerichte"] if g["name"] == geaendert); assert g7["preis"] == 7.9, g7
            assert len(s["artikel"]) >= 10, len(s["artikel"])
            assert any(a["name"] == "Dönerspieß Kalb/Pute" for a in s["artikel"])
            # 4 Kühlung: ein Kühlschrank, ein Tiefkühler
            await pg.wait_for_selector('[data-a="s2-kuehl"]'); await klick('[data-a="s2-kuehl"][data-wert="kuehlschrank"][data-d="1"]'); await klick('[data-a="s2-kuehl"][data-wert="tiefkuehler"][data-d="1"]')
            await bild("kuehlung"); await klick('[data-a="weiter"]')
            # 5 Geld: Kosten und Reinigung auf einem Bildschirm (Punkt 5)
            await pg.wait_for_selector('[data-f="ks:miete"]')
            for f, w in (("ks:miete", "1800"), ("ks:personal", "6000"), ("ks:eigen", "2500"), ("ks:energie", "450")):
                await pg.fill(f'[data-f="{f}"]', w); await pg.locator(f'[data-f="{f}"]').blur(); await pg.wait_for_timeout(120)
            await klick('[data-a="rein-wer"][data-wert="selbst"]'); await bild("geld"); await klick('[data-a="weiter"]')
            # 6 Fertig: ein Hauptknopf („Los geht's“, weil Gerichte da sind)
            await pg.wait_for_selector('[data-a="ob-fertig"]'); await bild("fertig")
            s = await stand(); assert s["team"]["lohnkosten"] == 6000 and any(k["posten"] == "miete" and k["betrag"] == 1800 for k in s["kosten"])
            assert s["betrieb"]["reinigung"]["wer"] == "selbst" and len([k for k in s["kuehlstellen"] if not k["archiviert"]]) == 2
            assert await pg.locator('.fuss [data-a="ob-fertig"]').count() == 1, "genau ein Hauptknopf"
            dauer = time.time() - t0
            await klick('.fuss [data-a="ob-fertig"][data-ziel="start"]')
            s = await stand(); assert s["phase"] == "app", s["phase"]
            await nav_hilfe.geh(pg, "beleg")
            # 6 Stromrechnung fotografieren → Strom, jeden Monat
            await pg.wait_for_selector('input[data-f="foto"][data-zweck="rechnung"]', state="attached"); await bild("beleg-foto")
            await pg.locator('input[data-f="foto"][data-zweck="rechnung"]:not([capture])').set_input_files(str(BILD / "strom_foto.jpg"))
            await pg.wait_for_selector('[data-a="zw-stelle"]', timeout=60000); await pg.wait_for_timeout(300); await bild("strom-zuweisen")
            assert await pg.locator('[data-a="zw-stelle"][data-wert="strom"].an').count() == 1, "Strom nicht erkannt"
            assert (await pg.input_value('[data-f="zw-betrag"]')) == "310,92"
            await klick('[data-a="zw-speichern"]'); await bild("strom-gespeichert")
            s = await stand(); k = [x for x in s["kosten"] if x["posten"] == "strom"][0]
            assert k["betrag"] == 310.92 and k["basis"] == "netto" and k["status"] == "bekannt", k
            assert len(s["kostenbelege"]) == 1 and s["uploads"][-1]["status"] == "uebernommen"
            # 7 Großhandelsbon → Ware → Prüfen
            await klick('[data-a="beleg-neu"]')
            await pg.locator('input[data-f="foto"][data-zweck="rechnung"]:not([capture])').set_input_files(str(BILD / "bon_foto.jpg"))
            await pg.wait_for_selector('[data-a="zw-stelle"]', timeout=60000); await pg.wait_for_timeout(300)
            assert await pg.locator('[data-a="zw-stelle"][data-wert="ware"].an').count() == 1, "Ware nicht erkannt"
            await bild("bon-zuweisen"); await klick('[data-a="beleg-zerlegen"]')
            await pg.wait_for_selector('[data-a="beleg-uebernehmen"]'); await bild("bon-pruefen")
            # 8 PDF-Speisekarte über Karte
            await nav_hilfe.geh(pg, "karte"); await bild("karte-app")
            await nav_hilfe.geh(pg, "kartefoto"); await pg.wait_for_selector('input[data-f="foto"]', state="attached")
            await pg.locator('input[data-f="foto"]:not([capture])').set_input_files(str(BILD / "karte2.pdf"))
            await pg.wait_for_selector('[data-a="fv-uebernehmen"]', timeout=60000); await pg.wait_for_timeout(300); await bild("pdf-pruefen")
            pdfnamen = await pg.evaluate("[...document.querySelectorAll('.fvz')].map(z => z.querySelector('[data-f^=\\'fv-name:\\']')?.value || z.querySelector('.n')?.firstChild?.textContent || '')")
            assert len(pdfnamen) == 8 and any("Margherita" in x for x in pdfnamen), pdfnamen
            await klick('[data-a="fv-uebernehmen"]'); await bild("karte-nach-pdf")
            s = await stand(); assert any("Margherita" in g["name"] for g in s["gerichte"])
            # 8b Kamera-Serie: zwei Fotos nacheinander, dann „Fertig – Liste prüfen" (Pilot 14.10.)
            await nav_hilfe.geh(pg, "kartefoto"); await pg.wait_for_selector('input[capture]', state="attached")
            await pg.locator('input[data-f="foto"][capture]').set_input_files(str(BILD / "karte_foto.jpg"))
            await pg.wait_for_selector('.karte.serie', timeout=10000); await bild("serie-1")
            await pg.locator('input[data-f="foto"][capture]').set_input_files(str(BILD / "karte2_foto.jpg"))
            await pg.wait_for_selector('[data-a="fv-fertig"]'); await bild("serie-2"); await klick('[data-a="fv-fertig"]')
            await pg.wait_for_selector('[data-a="fv-uebernehmen"]', timeout=120000); await pg.wait_for_timeout(300); await bild("serie-pruefen")
            serie = await pg.evaluate("[...document.querySelectorAll('.fvz')].map(z => z.querySelector('[data-f^=\\'fv-name:\\']')?.value || z.querySelector('.n')?.firstChild?.textContent || '')")
            assert len(serie) >= 3, serie
            await klick('[data-a="fv-uebernehmen"]')
            # 9 Cockpit
            await nav_hilfe.geh(pg, "start"); await bild("cockpit")
            # Türkisch: Schnellstart-Texte vorhanden
            await ctx.close(); await b.close()
            print(f"Schnellstart bis fertig: {dauer:.1f} s (Testautomat, ohne Denkpausen)")
    finally:
        srv.terminate()
    if fehler: print("FEHLER IN DER SEITE:", *fehler, sep="\n  "); sys.exit(1)
    print("Durchlauf Foto ok,", n, "Bilder in", OUT)

asyncio.run(main())
