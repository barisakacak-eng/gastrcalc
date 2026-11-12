"""Echte App = Test-App: ein Lauf auf http://127.0.0.2:<port>. Dort gibt es – wie auf der echten Adresse – kein Debug-Objekt
(window.__gastrocalc lebt nur auf localhost, 127.0.0.1 und [::1]). Darum prüft dieser Lauf NUR über die Oberfläche:
Sprache wählen → Einrichtung bis „Los geht's“ → Laden „Heute“ → Reiter wechseln → Neuladen: der Laden ist noch da.
Aufruf: DURCHLAUF_PORT=8871 python3 tests/echt_browser.py"""
import asyncio, os, pathlib, subprocess, sys, time
sys.path.insert(0, str(pathlib.Path(__file__).parent))
import schnellstart, nav_hilfe
from playwright.async_api import async_playwright
APP = str(pathlib.Path(__file__).parent.parent); PORT = int(os.environ.get("DURCHLAUF_PORT", "8871")); HOST = "127.0.0.2"; BEF = []; FEHLER = []

def pruefe(ok, text):
    print(("ok   " if ok else "FEHLT ") + text)
    if not ok: BEF.append(text)

async def main():
    srv = subprocess.Popen([sys.executable, "-m", "http.server", str(PORT), "--bind", HOST], cwd=APP, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL); time.sleep(0.8)
    try:
        async with async_playwright() as p:
            b = await p.chromium.launch(); ctx, pg = await schnellstart.kontext(b, 390, 844, FEHLER)
            await pg.goto(f"http://{HOST}:{PORT}/index.html"); await pg.wait_for_selector('[data-f="sprache-wahl"]')
            for _ in range(240):
                if await pg.evaluate("!!navigator.serviceWorker.controller"): break
                await pg.wait_for_timeout(500)
            pruefe(await pg.evaluate("typeof window.__gastrocalc") == "undefined", "kein Debug-Objekt auf 127.0.0.2")
            pruefe(await pg.evaluate("!!navigator.serviceWorker.controller"), "Service Worker hat die Seite übernommen")
            await pg.select_option('[data-f="sprache-wahl"]', "de"); await pg.click('[data-a="sprache"][data-wert="de"]')
            await nav_hilfe.nach_sprache(pg); await pg.wait_for_selector('[data-a="laden-art"]')
            await pg.fill('[data-f="betrieb.name"]', "Echt Imbiss"); await pg.click('[data-a="laden-art"][data-wert="doener"]'); await pg.wait_for_timeout(200)
            for _ in range(10):  # „Weiter“, bis der Schluss-Knopf da ist – ohne in den Stand zu schauen
                if await pg.locator('[data-a="ob-fertig"].s2los').count(): break
                await pg.click('[data-a="weiter"]'); await pg.wait_for_timeout(500)
            pruefe(await pg.locator('[data-a="ob-fertig"].s2los').count() == 1, "Einrichtung erreicht „Los geht's“")
            await pg.locator('[data-a="ob-fertig"].s2los').first.click()
            await pg.wait_for_selector('[data-a="menue-auf"], [data-a="foto-abbrechen"]', timeout=20000)
            if await pg.locator('[data-a="foto-abbrechen"]').count(): await pg.click('[data-a="foto-abbrechen"]')
            await pg.wait_for_selector('[data-a="menue-auf"]'); await pg.wait_for_timeout(500)
            await nav_hilfe.rundgang_weg(pg)
            pruefe(await pg.locator('[data-a="menue-auf"]').count() == 1, "Laden „Heute“ steht")
            tab = pg.locator('.leiste [data-wert="muell"], [data-a="nav"][data-wert="muell"]').first
            await tab.click(); await pg.wait_for_timeout(500)
            pruefe("Echt Imbiss" in await pg.evaluate("document.body.innerText") or await pg.locator('#app .schirm').count() >= 1, "Reiter Müll öffnet einen Bildschirm")
            await pg.wait_for_timeout(1200); await pg.reload(); await pg.wait_for_selector('[data-a="menue-auf"]', timeout=20000)
            pruefe(await pg.locator('[data-f="sprache-wahl"]').count() == 0, "nach dem Neuladen ist der Laden noch da (keine Sprachwahl)")
            pruefe(await pg.evaluate("typeof window.__gastrocalc") == "undefined", "auch nach dem Neuladen kein Debug-Objekt")
            pruefe(not FEHLER, "keine Konsolenfehler" + (": " + "; ".join(FEHLER[:3]) if FEHLER else ""))
            await b.close()
    finally: srv.terminate()
    print("ECHT " + ("OK" if not BEF else "; ".join(BEF))); sys.exit(1 if BEF else 0)
asyncio.run(main())
