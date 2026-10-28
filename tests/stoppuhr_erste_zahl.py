"""Stoppuhr bis zur ersten Euro-Zahl (28.10.2026): Wie lange braucht ein LANGSAMER Nutzer vom ersten Bild bis zur ersten Euro-Zahl auf „Heute“?
Langsamer Nutzer: 300 ms je Tastendruck, 1,5 s Denkpause vor jedem Bildschirm und vor jedem Tipp. Schnellstart Döner & Grill, Deutsch,
Handy 390×844, Karte „Später“, 1 Kühlschrank, Geld leer. Die Uhr startet, sobald das erste Bild (Willkommen) steht und der Service Worker
die Seite übernommen hat (das Warten darauf ist Technik, kein Nutzerschritt) und stoppt, wenn auf „Heute“ die erste Euro-Zahl sichtbar steht.
Muss unter GRENZE_S = 120 Sekunden liegen, sonst Exit 1.
Start: python3 tests/stoppuhr_erste_zahl.py   (eigener Webserver, Port über Umgebung DURCHLAUF_PORT, sonst 8799)"""
import asyncio, os, pathlib, re, sys, time
from playwright.async_api import async_playwright
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
import schnellstart as S

PORT = int(os.environ.get("DURCHLAUF_PORT", "8799"))
TASTE_MS = 300      # je Tastendruck
DENK_MS = 1500      # Denkpause je Bildschirm / Tipp
GRENZE_S = 120      # Setzung 28.10.2026: erste Euro-Zahl in unter 2 Minuten
EURO = re.compile(r"\d[\d. ]*(?:,\d+)?\s*€")


async def main():
    srv = S.server(PORT); fehler = []; marken = []
    try:
        async with async_playwright() as p:
            b = await p.chromium.launch(); ctx, pg = await S.kontext(b, 390, 844, fehler)
            await pg.goto(f"http://127.0.0.1:{PORT}/index.html"); await pg.wait_for_selector('[data-f="sprache-wahl"]')
            for _ in range(240):
                if await pg.evaluate("!!navigator.serviceWorker.controller"): break
                await pg.wait_for_timeout(500)
            t0 = time.time()
            def marke(name): marken.append((name, time.time() - t0))
            async def denken(): await pg.wait_for_timeout(DENK_MS)
            async def schritt_id(): return await pg.evaluate("window.__gastrocalc.stand.schrittId")
            async def weiter(ziel):
                await denken()
                for _ in range(3):
                    await pg.click('[data-a="weiter"]')
                    for _ in range(30):
                        await pg.wait_for_timeout(100)
                        if await schritt_id() == ziel: marke(ziel); return
                raise AssertionError(f"Schritt {ziel} nicht erreicht")

            marke("willkommen")
            await denken(); await pg.click('[data-a="sprache"][data-wert="de"]')
            for _ in range(150):  # Schloss-Schritt: „Später“ = Weiter
                if await pg.locator('[data-a="bio-einrichten"]').count(): break
                await pg.wait_for_timeout(120)
            marke("schloss")
            await weiter("laden-schnell")
            await denken(); await pg.click('[data-f="betrieb.name"]'); await pg.keyboard.type("Döner", delay=TASTE_MS)   # 5 Tasten × 300 ms
            await denken(); await pg.click('[data-a="laden-art"][data-wert="doener"]')
            await weiter("karte-foto")
            await weiter("kuehl-schnell")                                                                              # Karte: „Später“
            await denken(); await pg.click('[data-a="s2-kuehl"][data-wert="kuehlschrank"][data-d="1"]')
            await weiter("geld")
            await weiter("fertig-schnell")                                                                             # Geld leer lassen
            await denken()
            for versuch in range(3):
                knopf = pg.locator('[data-a="ob-fertig"].s2los')
                if await knopf.count(): await knopf.first.click()
                try:
                    await pg.wait_for_selector('[data-a="menue-auf"], [data-a="foto-abbrechen"]', timeout=20000); break
                except Exception:
                    if versuch == 2: raise
            if await pg.locator('[data-a="foto-abbrechen"]').count():  # ohne Gerichte landet „Los“ bei „Karte per Foto“: Nutzer tippt „Abbrechen“
                await denken(); await pg.click('[data-a="foto-abbrechen"]'); await pg.wait_for_timeout(400)
            if not await pg.locator('[data-a="nav"][data-wert="umsatzheute"], .h-jetzt').count():  # noch nicht auf Heute: Reiter „Heute“ tippen
                await denken(); await pg.click('.tableiste [data-a="nav"][data-wert="start"]')
            marke("heute-offen")
            # erste Euro-Zahl auf „Heute“ (Text im Hauptbereich, sichtbar)
            gefunden = None
            for _ in range(400):
                text = await pg.evaluate("document.querySelector('#app')?.innerText || ''")
                if await pg.evaluate("window.__gastrocalc.stand.phase") == "app" and EURO.search(text): gefunden = EURO.search(text).group(0); break
                await pg.wait_for_timeout(50)
            ende = time.time() - t0; marke("erste-euro-zahl")
            await b.close()
    finally:
        srv.terminate()
    print("Stoppuhr (langsamer Nutzer: 300 ms je Taste, 1,5 s Denkpause):")
    for name, s in marken: print(f"  {s:6.1f} s  {name}")
    print(f"Erste Euro-Zahl auf Heute: „{gefunden}“ nach {ende:.1f} s (Grenze {GRENZE_S} s)")
    assert gefunden, "keine Euro-Zahl auf Heute gefunden"
    assert not fehler, fehler
    assert ende < GRENZE_S, f"zu langsam: {ende:.1f} s ≥ {GRENZE_S} s"
    print("STOPPUHR OK")


if __name__ == "__main__":
    asyncio.run(main())
