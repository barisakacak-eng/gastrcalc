"""Lauf 6, Etappe 5 – Draht (13.11.2026), Punkt 4: „Einlesen rückgängig machen“. Laden anlegen, Umsatz eintragen, eine Prüfstand-Sicherung zusammenführend einlesen,
dann im Büro → Einstellungen → Sicherung „Einlesen rückgängig machen“ tippen → der Stand ist wie vorher. Aufruf: DURCHLAUF_PORT=8872 python3 tests/rueckhol_browser.py"""
import asyncio, os, sys, pathlib, json
sys.path.insert(0, str(pathlib.Path(__file__).parent))
import schnellstart, nav_hilfe
from playwright.async_api import async_playwright
APP = pathlib.Path(__file__).parent.parent; PORT = int(os.environ.get("DURCHLAUF_PORT", "8872"))
FIX = APP / "tests" / "fixtures" / "pruefstand" / "pruefstand_sicherung.zip"; befunde = []
def pruefe(ok, text):
    print(("ok   " if ok else "FEHLT") + " " + text)
    if not ok: befunde.append(text)
STAND = "() => { const w = window.__gastrocalc.wurzel; return JSON.stringify({ laeden: w.betriebe.map((b) => [b.id, b.betrieb.name, (b.tagesnotizen || []).filter((n) => !n.storniert).map((n) => [n.datum, n.umsatz])]), aktiv: w.aktiv }); }"
async def main():
    srv = schnellstart.server(PORT); fehler = []; dialoge = []
    try:
        async with async_playwright() as p:
            b = await p.chromium.launch(); ctx, pg = await schnellstart.kontext(b, 390, 844, fehler)
            async def ja(d): dialoge.append(d.message); await d.accept()
            pg.on("dialog", lambda d: asyncio.ensure_future(ja(d)))
            await schnellstart.schnellstart(pg, PORT, name="Mein Laden"); await nav_hilfe.rundgang_weg(pg)
            await nav_hilfe.geh(pg, "umsatz"); await pg.wait_for_selector('[data-f="umsatz"]')
            await pg.fill('[data-f="umsatz"]', "1.850"); await pg.locator('[data-f="umsatz"]').blur(); await pg.wait_for_timeout(600)
            await nav_hilfe.geh(pg, "einstellungen"); await pg.wait_for_timeout(500)
            pruefe(await pg.locator('[data-a="sicherung-zurueckholen"]').count() == 0, "vor dem Einlesen gibt es keinen Rückgängig-Knopf")
            vorher = await pg.evaluate(STAND); print("vorher:", vorher[:160])
            pruefe(len(json.loads(vorher)["laeden"]) == 1 and json.loads(vorher)["laeden"][0][2][0][1] == 1850, "Ausgang: ein Laden, 1850 € Umsatz")
            await pg.set_input_files('[data-f="import"]', str(FIX)); await pg.wait_for_timeout(2500)
            danach = await pg.evaluate(STAND)
            pruefe(len(json.loads(danach)["laeden"]) > 1, f"Einlesen hat Läden dazugebracht ({len(json.loads(danach)['laeden'])})")
            await nav_hilfe.geh(pg, "einstellungen"); await pg.wait_for_timeout(600)
            knopf = pg.locator('#app [data-a="sicherung-zurueckholen"]')
            pruefe(await knopf.count() == 1, "nach dem Einlesen zeigt Einstellungen → Sicherung „Einlesen rückgängig machen“")
            pruefe("Einlesen rückgängig machen" in (await knopf.first.inner_text()), "Knopf trägt den Satz aus l6y_texte")
            await knopf.first.click(); await pg.wait_for_timeout(2000)
            nach = await pg.evaluate(STAND)
            pruefe(nach == vorher, "nach „rückgängig“ ist der Stand wie vorher")
            await nav_hilfe.geh(pg, "einstellungen"); await pg.wait_for_timeout(500)
            pruefe(await pg.locator('#app [data-a="sicherung-zurueckholen"]').count() == 0, "der Punkt ist verbraucht, der Knopf weg")
            # gespeichert? neu laden → derselbe Stand
            await pg.reload(); await pg.wait_for_function("() => window.__gastrocalc && window.__gastrocalc.wurzel", timeout=15000); await pg.wait_for_timeout(800)
            pruefe(await pg.evaluate(STAND) == vorher, "nach dem Neuladen bleibt der Stand wie vorher (gespeichert)")
            print("Rückfragen:", [d[:70] for d in dialoge])
            pruefe(len(dialoge) >= 2, "Rückfragen kamen (Einlesen, Rückgängig)")
            await b.close()
    finally: srv.terminate()
    pruefe(not fehler, f"Konsole sauber {fehler[:3]}")
    print("RUECKHOL " + ("OK" if not befunde else f"{len(befunde)} Befunde")); sys.exit(1 if befunde else 0)
asyncio.run(main())
