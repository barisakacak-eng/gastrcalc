"""Büro „Zurück“ = eine Ebene zurück (Baris 01.11.2026, Klicker K2 Runde 2, B1).
Weg: Büro-Start → Lager → „Zur Inventur“ → Zurück (Lager) → Zurück (Büro-Start). Dazu: Einstellungen → Zurück (Büro-Start),
Ordner Steuer → Zurück (Büro-Start), Zurück-Geste des Browsers aus der Inventur → Lager.
Aufruf: DURCHLAUF_PORT=8845 python3 tests/buero_zurueck_browser.py"""
import asyncio, os, sys, pathlib, subprocess, time
sys.path.insert(0, str(pathlib.Path(__file__).parent))
import schnellstart, nav_hilfe
from playwright.async_api import async_playwright
APP = str(pathlib.Path(__file__).parent.parent); PORT = int(os.environ.get("DURCHLAUF_PORT", "8845"))
befunde = []
def pruefe(ok, text):
    print(("ok   " if ok else "FEHLT") + " " + text)
    if not ok: befunde.append(text)

async def ansicht(pg):  # Büro-Start erkennt man an der Zeile „‹ Laden“ oben
    await pg.wait_for_timeout(350)
    if await pg.locator('.ebene-kopf [data-a="modus"][data-wert="laden"]').count(): return "buero"
    return "anders:" + await pg.evaluate("(document.querySelector('#app .inhalt, #app .b-inhalt')?.className || '')")

async def zurueck(pg):
    await pg.locator('.ebene-kopf .zurueckzeile').first.click(); await pg.wait_for_timeout(350)

async def main():
    srv = subprocess.Popen([sys.executable, "-m", "http.server", str(PORT), "--bind", "127.0.0.1"], cwd=APP, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    time.sleep(0.8); fehler = []
    try:
        async with async_playwright() as p:
            b = await p.chromium.launch(); ctx, pg = await schnellstart.kontext(b, 390, 844, fehler)
            await schnellstart.schnellstart(pg, PORT); await nav_hilfe.rundgang_weg(pg)
            await nav_hilfe.ins_buero(pg); await pg.wait_for_timeout(300)
            pruefe(await ansicht(pg) == "buero", "Start im Büro")
            # Lager → Inventur → Zurück → Zurück
            await pg.evaluate("""() => { for (const d of document.querySelectorAll('#app details')) d.open = true; }""")
            await pg.locator('#app [data-a="nav"][data-wert="bestand"]').first.click(); await pg.wait_for_timeout(400)
            pruefe(await pg.locator('#app [data-a="nav"][data-wert="inventur"]').count() > 0, "Lager offen, Knopf „Zur Inventur“ da")
            kopf = await pg.locator('.ebene-kopf .zurueckzeile').first.inner_text()
            pruefe("Büro" in kopf, f"vom Büro-Start kommend heißt Zurück „Büro“ ({kopf.strip()})")
            await pg.locator('#app [data-a="nav"][data-wert="inventur"]').first.click(); await pg.wait_for_timeout(400)
            kopf = await pg.locator('.ebene-kopf .zurueckzeile').first.inner_text()
            pruefe("Zurück" in kopf, f"in der Inventur heißt Zurück „Zurück“ ({kopf.strip()})")
            await zurueck(pg)
            pruefe(await pg.locator('#app [data-a="nav"][data-wert="inventur"]').count() > 0, "Zurück aus der Inventur → Lager (eine Ebene)")
            await zurueck(pg)
            pruefe(await ansicht(pg) == "buero", "Zurück aus dem Lager → Büro-Start")
            # Browser-Zurück-Geste: Lager → Inventur → Geste → Lager
            await pg.evaluate("""() => { for (const d of document.querySelectorAll('#app details')) d.open = true; }""")
            await pg.locator('#app [data-a="nav"][data-wert="bestand"]').first.click(); await pg.wait_for_timeout(400)
            await pg.locator('#app [data-a="nav"][data-wert="inventur"]').first.click(); await pg.wait_for_timeout(400)
            await pg.evaluate("window.dispatchEvent(new PopStateEvent('popstate', { state: null }))"); await pg.wait_for_timeout(400)
            pruefe(await pg.locator('#app [data-a="nav"][data-wert="inventur"]').count() > 0, "Zurück-Geste aus der Inventur → Lager")
            await zurueck(pg)
            # Ordner Steuer und Einstellungen: vom Büro-Start aus → Zurück = Büro-Start
            for ziel in ("ordner-steuer", "einstellungen"):
                await pg.evaluate("""() => { for (const d of document.querySelectorAll('#app details')) d.open = true; }""")
                await pg.locator(f'#app [data-a="nav"][data-wert="{ziel}"]').first.click(); await pg.wait_for_timeout(400)
                offen = await ansicht(pg); pruefe(offen != "buero", f"{ziel} offen ({offen[:40]})")
                await zurueck(pg)
                pruefe(await ansicht(pg) == "buero", f"Zurück aus {ziel} → Büro-Start")
            # In den Laden und zurück ins Büro: der Weg beginnt neu (Zurück aus Lager → Büro-Start)
            await nav_hilfe.zum_laden(pg); await nav_hilfe.ins_buero(pg); await pg.wait_for_timeout(300)
            await pg.evaluate("""() => { for (const d of document.querySelectorAll('#app details')) d.open = true; }""")
            await pg.locator('#app [data-a="nav"][data-wert="bestand"]').first.click(); await pg.wait_for_timeout(400)
            await zurueck(pg)
            pruefe(await ansicht(pg) == "buero", "nach Laden → Büro beginnt der Weg neu")
            await b.close()
    finally: srv.terminate()
    pruefe(not fehler, f"Konsole sauber {fehler[:3]}")
    print("BÜRO-ZURÜCK " + ("OK" if not befunde else f"{len(befunde)} Befunde")); sys.exit(1 if befunde else 0)
asyncio.run(main())
