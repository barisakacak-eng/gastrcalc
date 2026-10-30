"""Bildpaket „Pilotfest C“ (freigegeben 30.10.2026 16:30): die sechs sichtbaren Änderungen im echten Browser.
C1 Ladenart mehrfach: zwei Kacheln an, Küchen vereint, Weiter geht; eine abwählen → eine bleibt.
C2 Zeki-Hilfe kurz: höchstens 1 Satz + 2 Fragen, „Mehr“ zeigt den Rest; Blatt schließt per Wischen nach unten (Menü-Blatt).
C3 Zeki-Einlauf: Klasse „einlauf“ steht beim Start kurz am Knopf (nur bei frischer Sitzung).
C4 Fortschritt: beim Lesen der Speisekarte steht der Stufen-Balken (kein Kreisel mehr).
C6 Büro „Fehler melden“: Karte da, Probefehler zählt, Text ohne Zahlen, „Liste leeren“ leert.
Aufruf: DURCHLAUF_PORT=8845 python3 tests/pilotfest_c_browser.py"""
import asyncio, os, sys, pathlib, subprocess, time
sys.path.insert(0, str(pathlib.Path(__file__).parent))
import schnellstart, nav_hilfe
from playwright.async_api import async_playwright
APP = str(pathlib.Path(__file__).parent.parent); PORT = int(os.environ.get("DURCHLAUF_PORT", "8845"))
BILD = str(pathlib.Path(__file__).parent / "bilder" / "karte_foto.jpg")
befunde = []
def pruefe(ok, text):
    print(("ok   " if ok else "FEHLT") + " " + text)
    if not ok: befunde.append(text)

async def sw_warten(pg):
    for _ in range(120):
        if await pg.evaluate("!!navigator.serviceWorker.controller"): break
        await pg.wait_for_timeout(250)

async def main():
    srv = subprocess.Popen([sys.executable, "-m", "http.server", str(PORT), "--bind", "127.0.0.1"], cwd=APP, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL); time.sleep(0.8)
    fehler = []
    try:
        async with async_playwright() as p:
            b = await p.chromium.launch()
            # ---- C1 Ladenart mehrfach + C3 Einlauf (frische Sitzung)
            ctx, pg = await schnellstart.kontext(b, 390, 844, fehler)
            await pg.goto(f"http://127.0.0.1:{PORT}/index.html"); await pg.wait_for_selector('[data-f="sprache-wahl"]'); await sw_warten(pg)
            await pg.select_option('[data-f="sprache-wahl"]', "de"); await pg.click('[data-a="sprache"][data-wert="de"]'); await nav_hilfe.nach_sprache(pg); await pg.wait_for_selector('[data-a="laden-art"]')
            await pg.fill('[data-f="betrieb.name"]', "Test"); await pg.click('[data-a="laden-art"][data-wert="doener"]'); await pg.wait_for_timeout(200)
            await pg.click('[data-a="laden-art"][data-wert="pizza"]'); await pg.wait_for_timeout(300)
            an = await pg.locator('[data-a="laden-art"].an').count(); arten = await pg.evaluate("window.__gastrocalc.stand.ladenArten"); kuechen = await pg.evaluate("window.__gastrocalc.stand.betrieb.kuechen")
            pruefe(an == 2 and arten == ["doener", "pizza"] and sorted(kuechen) == ["doener", "pizza"], f"C1 zwei Ladenarten an ({an} Kacheln, {arten}, Küchen {kuechen})")
            pruefe(await pg.locator('[data-a="weiter"]').count() == 1 and await pg.locator(".s2mehrere").count() == 1, "C1 Weiter da, Zeile „Mehrere möglich“ da")
            await pg.click('[data-a="laden-art"][data-wert="doener"]'); await pg.wait_for_timeout(300)
            pruefe(await pg.evaluate("window.__gastrocalc.stand.ladenArt") == "pizza" and await pg.locator('[data-a="laden-art"].an').count() == 1, "C1 Döner abgewählt → Pizza ist Hauptart")
            for ziel in ["karte-foto", "kuehl-schnell", "geld", "fertig-schnell"]:
                for _ in range(3):
                    await pg.click('[data-a="weiter"]'); await pg.wait_for_timeout(400)
                    if await pg.evaluate("window.__gastrocalc.stand.schrittId") == ziel: break
            await pg.click('[data-a="ob-fertig"].s2los'); await pg.wait_for_selector('[data-a="menue-auf"]', timeout=20000)
            await pg.wait_for_timeout(600); await nav_hilfe.rundgang_weg(pg); await pg.wait_for_timeout(300)
            # C3: der Auftritt läuft erst ab dem zweiten Start (beim ersten läuft der kurze Rundgang) – neue Sitzung, dann Einlauf
            await pg.evaluate("() => sessionStorage.clear()"); await pg.reload(); await pg.wait_for_selector(".appleiste .zeki-knopf")
            einlauf = False
            for _ in range(30):
                if await pg.locator(".zeki-knopf.einlauf").count(): einlauf = True; break
                await pg.wait_for_timeout(50)
            pruefe(einlauf, "C3 Zeki-Einlauf-Klasse beim Start gesetzt")
            await pg.wait_for_timeout(2600); await nav_hilfe.rundgang_weg(pg)
            # ---- C2 Zeki-Hilfe kurz
            await nav_hilfe.geh(pg, "start"); await pg.wait_for_timeout(300)
            await pg.click('.appleiste [data-a="hilfe-auf"]'); await pg.wait_for_timeout(500)
            saetze = await pg.evaluate("() => (document.querySelector('#ebene-huelle .hilfe-inhalt.kurz > p')?.textContent || '').split(/[.!?](\\s|$)/).filter(x => x.trim().length > 1).length")
            fragen = await pg.locator("#ebene-huelle .hilfe-inhalt.kurz details").count(); mehr = await pg.locator('#ebene-huelle [data-a="hilfe-mehr"]').count()
            pruefe(saetze <= 1 and fragen <= 2 and mehr == 1, f"C2 Hilfe kurz: {saetze} Satz, {fragen} Fragen, Mehr {mehr}")
            await pg.click('#ebene-huelle [data-a="hilfe-mehr"]'); await pg.wait_for_timeout(400)
            pruefe(await pg.locator("#ebene-huelle .hilfe-inhalt:not(.kurz)").count() == 1 and await pg.locator("#ebene-huelle details").count() > 2, "C2 „Mehr“ zeigt die ganze Hilfe")
            await pg.keyboard.press("Escape"); await pg.wait_for_timeout(200)
            await nav_hilfe.menue(pg); await pg.wait_for_timeout(300)
            bl = await pg.locator("#ebene-huelle .ebene-blatt").bounding_box(); x, y = bl["x"] + bl["width"] / 2, bl["y"] + 30
            await pg.mouse.move(x, y); await pg.mouse.down(); await pg.mouse.move(x, y + 60, steps=4); await pg.mouse.move(x, y + 130, steps=4); await pg.mouse.up(); await pg.wait_for_timeout(400)
            pruefe(await pg.locator("#ebene-huelle .ebene-blatt").count() == 0, "C2 Menü-Blatt schließt per Wischen nach unten")
            await nav_hilfe.menue(pg); await pg.wait_for_timeout(300)
            bl = await pg.locator("#ebene-huelle .ebene-blatt").bounding_box(); x, y = bl["x"] + bl["width"] / 2, bl["y"] + 30
            await pg.mouse.move(x, y); await pg.mouse.down(); await pg.mouse.move(x, y + 40, steps=3); await pg.mouse.up(); await pg.wait_for_timeout(300)
            pruefe(await pg.locator("#ebene-huelle .ebene-blatt").count() == 1, "C2 kurzer Zug (40 px) schließt nicht")
            await pg.keyboard.press("Escape"); await pg.wait_for_timeout(200)
            # ---- C6 Büro Fehler melden
            await nav_hilfe.ins_buero(pg); await pg.wait_for_timeout(300); await pg.click('#app [data-a="nav"][data-wert="einstellungen"]'); await pg.wait_for_timeout(400)
            pruefe(await pg.locator(".fehler-karte").count() == 1 and await pg.locator('[data-a="fehler-melden"]').count() == 1, "C6 Karte „Fehler melden“ in den Einstellungen")
            await pg.evaluate("() => { const e = new Error('Probe 42 bei Mustafa'); window.dispatchEvent(new ErrorEvent('error', { error: e, message: e.message, filename: location.origin + '/js/x.js', lineno: 7 })); window.__gastrocalc.zeichne(); }"); await pg.wait_for_timeout(300)
            txt = await pg.evaluate("window.__gastrocalc.fehlerText()")
            pruefe("42" not in txt and "Mustafa" not in txt and "x.js:7" in txt and await pg.locator('[data-a="fehler-leeren"]').count() == 1, "C6 Probefehler gespeichert, ohne Zahl und Name, mit Datei:Zeile")
            await pg.click('[data-a="fehler-leeren"]'); await pg.wait_for_timeout(300)
            pruefe("Keine Fehler" in await pg.evaluate("window.__gastrocalc.fehlerText()"), "C6 „Liste leeren“ leert")
            # ---- C4 Fortschritt beim Speisekarten-Foto (Büro → Karte per Foto → Serie läuft)
            await nav_hilfe.geh(pg, "start"); await nav_hilfe.ins_buero(pg); await pg.wait_for_timeout(300)
            await pg.locator('#app [data-a="nav"][data-wert="kartefoto"]').first.click(); await pg.wait_for_timeout(400)
            if os.path.exists(BILD):
                await pg.locator('input[data-f="foto"]').first.set_input_files(BILD)
                gesehen = False
                for _ in range(100):
                    await pg.wait_for_timeout(50)
                    if await pg.locator(".fortschritt").count(): gesehen = True; break
                pruefe(gesehen and await pg.locator(".kreisel").count() == 0, "C4 Stufen-Balken statt Kreisel beim Lesen")
            else: print("     C4 übersprungen: kein Testbild", BILD)
            await ctx.close(); await b.close()
    finally: srv.terminate()
    print("Konsole:", fehler[:5])
    if befunde or fehler: sys.exit(1)
asyncio.run(main())
