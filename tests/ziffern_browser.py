"""Ausschuss Lauf 3, P5 B1/B2 (09.11.2026): Ziffern Taste für Taste tippen.
B1 Büro → Geld & Finanzamt → „Geld heute“: 3 0 0 0 tippen ergibt 3000 (vorher „0“: nach jedem Tippen neu gezeichnet, Fokus markierte alles).
B2 Laden „Umsatz heute“ mit Wert 592,5: Feld antippen, sofort 9 8 tippen ergibt „98“ (vorher Wettlauf: „8“ oder „9592,5“).
Aufruf: DURCHLAUF_PORT=8946 python3 tests/ziffern_browser.py"""
import asyncio, os, sys, pathlib
sys.path.insert(0, str(pathlib.Path(__file__).parent))
import schnellstart, nav_hilfe
from playwright.async_api import async_playwright
PORT = int(os.environ.get("DURCHLAUF_PORT", "8946")); befunde = []
def pruefe(ok, text):
    print(("ok   " if ok else "FEHLT") + " " + text)
    if not ok: befunde.append(text)
async def main():
    srv = schnellstart.server(PORT); fehler = []
    try:
        async with async_playwright() as p:
            b = await p.chromium.launch(); ctx, pg = await schnellstart.kontext(b, 390, 844, fehler)
            await schnellstart.schnellstart(pg, PORT)
            # B2 zuerst im Laden
            for lauf in range(4):
                await nav_hilfe.geh(pg, "start"); await pg.click('#app [data-a="nav"][data-wert="umsatzheute"]'); await pg.wait_for_selector('[data-f="ul-umsatz"]')
                f = pg.locator('[data-f="ul-umsatz"]'); await f.fill("592,5"); await pg.locator("h1").first.click(); await pg.wait_for_timeout(200)
                await f.tap(); await pg.wait_for_timeout(80); await pg.keyboard.type("98", delay=30)  # 80 ms: schneller als ein Mensch nach dem Antippen, die Tastatur erscheint am Handy erst danach; await pg.wait_for_timeout(300)
                w = await f.input_value(); pruefe(w == "98", f"B2 Lauf {lauf + 1}: Umsatz-Feld zeigt „{w}“")
            # B1 im Büro
            await schnellstart.code_setzen(pg, "1234"); await nav_hilfe.geh(pg, "geld3"); await pg.wait_for_timeout(400)
            await pg.evaluate("() => { for (const d of document.querySelectorAll('#app details')) d.open = true; }")
            g = pg.locator('[data-f="g3-geld"]'); await g.click(); await pg.keyboard.type("3000", delay=120); await pg.wait_for_timeout(500)
            w = await pg.locator('[data-f="g3-geld"]').input_value(); pruefe(w.replace(".", "").startswith("3000") or w.startswith("3.000"), f"B1 Geld heute zeigt „{w}“")
            betrag = await pg.evaluate("(window.__gastrocalc.stand.liquiditaet || {}).betrag ?? null"); pruefe(betrag == 3000, f"B1 gespeichert {betrag}")
            await b.close()
    finally: srv.terminate()
    pruefe(not fehler, f"Konsole sauber {fehler[:3]}")
    print("ZIFFERN " + ("OK" if not befunde else f"{len(befunde)} Befunde")); sys.exit(1 if befunde else 0)
asyncio.run(main())
