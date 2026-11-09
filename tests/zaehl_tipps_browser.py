"""Vorab-Prüfung 03.11.2026, B1–B3: schnelle Mehrfach-Tipps.
B1 Müll-Kachel 5× im Abstand von 100 ms → 5 Einträge (Zähl-Kacheln zählen jeden Tipp; der Doppeltipp-Schutz gilt nur für Navigation).
B2 Putzplan: Doppeltipp (80 ms) auf die erste Aufgabe hakt genau EINE Aufgabe ab (vorher traf der zweite Tipp die nachgerückte Zeile).
B3 Einrichtung: Doppeltipp (150 ms) auf „Weiter“ überspringt keinen Schritt (vorher: Kartenschritt übersprungen).
Aufruf: DURCHLAUF_PORT=8851 python3 tests/zaehl_tipps_browser.py"""
import asyncio, os, sys, pathlib, subprocess, time
sys.path.insert(0, str(pathlib.Path(__file__).parent))
import schnellstart, nav_hilfe
from playwright.async_api import async_playwright
APP = pathlib.Path(__file__).parent.parent; PORT = int(os.environ.get("DURCHLAUF_PORT", "8851"))
ZAHL = "(j) => (window.__gastrocalc.stand[j] || []).filter((x) => !x.storniert).length"

async def tipps(pg, sel, n, abstand):
    box = await pg.locator(sel).first.bounding_box(); x, y = box["x"] + box["width"] / 2, box["y"] + box["height"] / 2
    for i in range(n):
        await pg.mouse.click(x, y)
        if i < n - 1: await pg.wait_for_timeout(abstand)

async def main():
    srv = subprocess.Popen([sys.executable, "-m", "http.server", str(PORT), "--bind", "127.0.0.1"], cwd=str(APP), stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    time.sleep(0.8); fehler = []; befunde = []
    try:
        async with async_playwright() as p:
            b = await p.chromium.launch()
            # B3 zuerst: Einrichtung mit Doppeltipp auf „Weiter“
            ctx, pg = await schnellstart.kontext(b, 390, 844, fehler)
            await pg.goto(f"http://127.0.0.1:{PORT}/index.html"); await pg.wait_for_selector('[data-f="sprache-wahl"]')
            for _ in range(240):
                if await pg.evaluate("!!navigator.serviceWorker.controller"): break
                await pg.wait_for_timeout(500)
            await pg.select_option('[data-f="sprache-wahl"]', "de"); await pg.click('[data-a="sprache"][data-wert="de"]'); await nav_hilfe.nach_sprache(pg); await pg.wait_for_selector('[data-a="laden-art"]')
            await pg.fill('[data-f="betrieb.name"]', "Doppel"); await pg.click('[data-a="laden-art"][data-wert="doener"]'); await pg.wait_for_timeout(300)
            schritte = []
            vor = await pg.evaluate("window.__gastrocalc.stand.schrittId")
            await tipps(pg, '[data-a="weiter"]', 2, 150); await pg.wait_for_timeout(700)
            nach = await pg.evaluate("window.__gastrocalc.stand.schrittId"); schritte.append((vor, nach))
            # Gerichte aus Vorlagen wählen, dann Doppeltipp „Weiter“ (Vorab-Prüfung: übersprang den Kühlgeräte-Schritt)
            if nach == "karte-foto":
                await pg.click('[data-a="karte-vorlagen"]'); await pg.wait_for_timeout(700)
                for i in range(2): await pg.locator('#app [data-a="vorlage"]').nth(i).click(); await pg.wait_for_timeout(200)
                vor = await pg.evaluate("window.__gastrocalc.stand.schrittId")
                await tipps(pg, '[data-a="weiter"]', 2, 150); await pg.wait_for_timeout(900)
                nach = await pg.evaluate("window.__gastrocalc.stand.schrittId"); schritte.append((vor, nach))
            print("B3 Schritte:", schritte)
            if schritte[0] != ("laden-schnell", "karte-foto"): befunde.append(f"B3: Doppeltipp „Weiter“ im ersten Schritt: {schritte[0]}")
            if len(schritte) > 1 and schritte[1][1] != "kuehl-schnell": befunde.append(f"B3: Doppeltipp „Weiter“ nach der Gerichtewahl: {schritte[1]} statt Kühlgeräte")
            await ctx.close()
            # B1/B2 im fertigen Laden
            ctx, pg = await schnellstart.kontext(b, 390, 844, fehler)
            await ctx.add_init_script("try { localStorage.setItem('gc-zeki-erst', JSON.stringify(['muell','kuehl','putzplan','karte','umsatzheute'])); } catch (e) {}")
            await schnellstart.schnellstart(pg, PORT); await nav_hilfe.rundgang_weg(pg)
            await pg.locator('.tableiste [data-a="nav"][data-wert="muell"]').click(); await pg.wait_for_timeout(600)
            vor = await pg.evaluate(ZAHL, "schwund"); await tipps(pg, '#app [data-a="muell-tipp"]', 5, 100); await pg.wait_for_timeout(900)
            n = await pg.evaluate(ZAHL, "schwund") - vor; print("B1 Müll 5 Tipps/100 ms →", n)
            if n != 5: befunde.append(f"B1: {n} von 5 Müll-Tipps gezählt")
            await pg.locator('.tableiste [data-a="nav"][data-wert="putzplan"]').click(); await pg.wait_for_timeout(600)
            vor = await pg.evaluate(ZAHL, "putzlog"); await tipps(pg, '#app [data-a="pp-haken"]', 2, 80); await pg.wait_for_timeout(900)
            n = await pg.evaluate(ZAHL, "putzlog") - vor; print("B2 Putzen Doppeltipp →", n)
            if n != 1: befunde.append(f"B2: Doppeltipp hakte {n} Aufgaben ab")
            # Ausschuss Lauf 3, P4 B1: Doppeltipp auf die Heute-Kachel „Müll“ bucht nichts auf dem neuen Müll-Bildschirm (60–350 ms)
            for ms in (60, 200, 330):
                await nav_hilfe.geh(pg, "start"); await pg.wait_for_timeout(500)
                vor = await pg.evaluate(ZAHL, "schwund"); await tipps(pg, '#app .h-feld.muell', 2, ms); await pg.wait_for_timeout(900)
                n = await pg.evaluate(ZAHL, "schwund") - vor; print(f"P4 B1 Heute-Müll Doppeltipp {ms} ms →", n)
                if n != 0: befunde.append(f"P4 B1: Doppeltipp {ms} ms auf Heute-Müll buchte {n} Eintrag")
            # Ausschuss Lauf 3, P4 B2: Doppeltipp auf ☰ lässt das Menü offen (vorher auf und gleich wieder zu)
            await nav_hilfe.geh(pg, "start"); await pg.wait_for_timeout(500)
            await tipps(pg, '[data-a="menue-auf"]', 2, 150); await pg.wait_for_timeout(700)
            offen = await pg.locator("#ebene-huelle .blatt-menue").count(); print("P4 B2 Menü nach Doppeltipp offen:", offen)
            if not offen: befunde.append("P4 B2: Doppeltipp auf ☰ schließt das Menü gleich wieder")
            if offen: await pg.click('#ebene-huelle button[data-a="blatt-zu"]'); await pg.wait_for_timeout(400)
            # B4: Preis-Blatt eines Gerichts ohne Preis – Tippen „750“ ergibt 7,50 bzw. „750“, nie „0750,00“
            await pg.evaluate("""async () => { const kl = await import('./js/karte_lesen.js'); const s = window.__gastrocalc.stand;
              kl.vorschlaegeUebernehmen(s, kl.vorschlaegeAusText("Döner Kebab ⋯ 7,50\\nOhnepreis Teller", s).map((v) => ({ ...v, an: true }))); window.__gastrocalc.zeichne(); }""")
            await pg.locator('.tableiste [data-a="nav"][data-wert="karte"]').click(); await pg.wait_for_timeout(700)
            await pg.evaluate("document.querySelectorAll('.zeki-erst').forEach(e => e.remove())")
            await pg.locator('#app [data-a="kl-auf"]').last.click(); await pg.wait_for_timeout(600)
            feld = pg.locator('[data-f="kl-preis"]')
            if await feld.count():
                await feld.click(); await pg.wait_for_timeout(150); await pg.keyboard.type("750"); await pg.wait_for_timeout(200)
                w = await feld.input_value(); print("B4 Preisfeld nach „750“:", repr(w))
                if w.startswith("0") or w.endswith(",00750") or "0750" in w: befunde.append(f"B4: Preisfeld {w!r}")
            else: befunde.append("B4: Preis-Blatt nicht geöffnet")
            await b.close()
    finally: srv.terminate()
    print("TIPPS " + ("OK" if not befunde else "; ".join(befunde))); sys.exit(1 if befunde else 0)
asyncio.run(main())
