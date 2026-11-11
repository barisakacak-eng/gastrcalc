"""Ausschuss Lauf 3, P5 C1 (Lauf 4, 11.11.2026): Nach „Sicherungsdatei erstellen“ (Download-Weg) muss die Frage „Wo liegt sie jetzt?“ kommen;
nach „Anderes Gerät …“ darf der Status nicht mehr „Noch nicht gesichert“ sagen. Aufruf: DURCHLAUF_PORT=8948 python3 tests/sicherung_status_browser.py"""
import asyncio, os, sys, pathlib
sys.path.insert(0, str(pathlib.Path(__file__).parent))
import schnellstart, nav_hilfe
from playwright.async_api import async_playwright
PORT = int(os.environ.get("DURCHLAUF_PORT", "8948")); befunde = []
def pruefe(ok, text):
    print(("ok   " if ok else "FEHLT") + " " + text)
    if not ok: befunde.append(text)
async def main():
    srv = schnellstart.server(PORT); fehler = []
    try:
        async with async_playwright() as p:
            b = await p.chromium.launch(); ctx, pg = await schnellstart.kontext(b, 390, 844, fehler)
            await schnellstart.schnellstart(pg, PORT)
            vor = await pg.evaluate("window.__gastrocalc.wurzel?.letzteSicherung ?? null")
            await nav_hilfe.geh(pg, "buero"); await pg.wait_for_timeout(400)
            await pg.evaluate("delete Navigator.prototype.share; delete Navigator.prototype.canShare")  # Download-Weg wie am Rechner (P5)
            async with pg.expect_download(timeout=15000) as dl:
                await pg.locator('#app [data-a="export"]').first.click(); await pg.wait_for_timeout(600)
                if await pg.evaluate("!!document.querySelector('#ebene-huelle [data-a=\"sicherung-pw-schalter\"][aria-checked=\"true\"], #ebene-huelle [data-a=\"sicherung-pw-schalter\"].an, #ebene-huelle [data-a=\"sicherung-pw-schalter\"]:checked')"):
                    await pg.locator('#ebene-huelle [data-a="sicherung-pw-schalter"]').first.click(); await pg.wait_for_timeout(300)
                await pg.locator('#ebene-huelle [data-a="sicherung-teilen"]').first.click()
            await dl.value; await pg.wait_for_timeout(800)
            print("Blatt danach:", await pg.evaluate("[...document.querySelectorAll('#ebene-huelle [data-a]')].map(e => e.dataset.a).join(' ')"))
            frage = await pg.locator('#ebene-huelle [data-a="sicherung-ort"][data-wert="woanders"]').count()
            pruefe(frage == 1, "nach dem Download fragt die App „Wo liegt sie jetzt?“")
            if frage: await pg.click('#ebene-huelle [data-a="sicherung-ort"][data-wert="woanders"]'); await pg.wait_for_timeout(600)
            nach = await pg.evaluate("window.__gastrocalc.wurzel?.letzteSicherung ?? null")
            pruefe(nach and nach != vor, f"letzteSicherung gesetzt ({vor} → {nach})")
            txt = await pg.locator("body").inner_text()
            pruefe("Noch nicht gesichert" not in txt, "Status sagt nicht mehr „Noch nicht gesichert“")
            await pg.screenshot(path=os.environ.get("BILD", "/tmp/p5c1.png"))
            await b.close()
    finally: srv.terminate()
    pruefe(not fehler, f"Konsole sauber {fehler[:3]}")
    print("SICHERUNG-STATUS " + ("OK" if not befunde else f"{len(befunde)} Befunde")); sys.exit(1 if befunde else 0)
asyncio.run(main())
