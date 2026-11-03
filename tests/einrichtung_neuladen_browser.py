"""Vorab-Prüfung 03.11.2026, A3: Neuladen mitten in der Einrichtung (300 ms nach der Eingabe) – gleicher Schritt, Eingaben bleiben
(Funktionsinventar 1.8). Vorher: zurück auf die Sprachwahl, Name, Kühlgeräte und Kosten weg (Ursache wie A1: 900 ms Speicher-Verzögerung).
Aufruf: DURCHLAUF_PORT=8849 python3 tests/einrichtung_neuladen_browser.py"""
import asyncio, sys, subprocess, time, os, json, pathlib
sys.path.insert(0, str(pathlib.Path(__file__).parent))
import schnellstart, nav_hilfe
from playwright.async_api import async_playwright
APP = str(pathlib.Path(__file__).parent.parent); PORT = int(os.environ.get("DURCHLAUF_PORT", "8849")); BEF = []
INFO = "() => { const g = window.__gastrocalc; const s = g && g.stand; return JSON.stringify({ schritt: s && s.schrittId, phase: s && s.phase, name: s && s.betrieb && s.betrieb.name, kuehl: s && (s.kuehlstellen||[]).length, miete: s && JSON.stringify((s.kosten||[]).filter(k=>k.betrag)).slice(0,80), art: s && s.ladenArt, sichtbar: (document.querySelector('#app h1, #app h2')||{}).textContent }); }"
async def neu(pg):
    vor = json.loads(await pg.evaluate(INFO)); await pg.wait_for_timeout(int(os.environ.get("NEULADEN_MS", "300"))); await pg.reload(); await pg.wait_for_timeout(1800)
    nach = json.loads(await pg.evaluate(INFO))
    for k in ("schritt", "name", "kuehl", "miete", "art"):
        if vor.get(k) != nach.get(k): BEF.append(f"{vor.get('schritt')}: {k} {vor.get(k)!r} → {nach.get(k)!r}")
    return json.dumps(nach, ensure_ascii=False)
async def main():
    srv = subprocess.Popen([sys.executable, "-m", "http.server", str(PORT), "--bind", "127.0.0.1"], cwd=APP, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL); time.sleep(0.8)
    try:
        async with async_playwright() as p:
            b = await p.chromium.launch(); ctx, pg = await schnellstart.kontext(b, 390, 844, [])
            await pg.goto(f"http://127.0.0.1:{PORT}/index.html"); await pg.wait_for_selector('[data-f="sprache-wahl"]')
            for _ in range(240):
                if await pg.evaluate("!!navigator.serviceWorker.controller"): break
                await pg.wait_for_timeout(500)
            await pg.select_option('[data-f="sprache-wahl"]', "de"); await pg.click('[data-a="sprache"][data-wert="de"]'); await nav_hilfe.nach_sprache(pg); await pg.wait_for_selector('[data-a="laden-art"]')
            await pg.fill('[data-f="betrieb.name"]', "Reload Test"); await pg.click('[data-a="laden-art"][data-wert="doener"]'); await pg.wait_for_timeout(300)
            print("1 Name getippt:", await pg.evaluate(INFO)); print("  nach Neuladen:", await neu(pg))
            async def weiter(id_):
                for _ in range(3):
                    await pg.click('[data-a="weiter"]')
                    for _ in range(30):
                        await pg.wait_for_timeout(100)
                        if await pg.evaluate("window.__gastrocalc.stand.schrittId") == id_: return True
                return False
            assert await weiter("karte-foto"), "karte-foto"; print("2 Karte:", await pg.evaluate(INFO)); print("  nach Neuladen:", await neu(pg))
            assert await weiter("kuehl-schnell"), "kuehl"
            await pg.click('[data-a="s2-kuehl"][data-wert="kuehlschrank"][data-d="1"]'); await pg.wait_for_timeout(300)
            print("3 Kühl:", await pg.evaluate(INFO)); print("  nach Neuladen:", await neu(pg))
            assert await weiter("geld"), "geld"
            ms = pg.locator('input[data-f="ks:miete"]')
            if await ms.count(): await ms.first.fill("1500"); await pg.wait_for_timeout(300)
            print("4 Geld:", await pg.evaluate(INFO)); print("  nach Neuladen:", await neu(pg))
    finally: srv.terminate()
    print("NEULADEN " + ("OK" if not BEF else "; ".join(BEF))); sys.exit(1 if BEF else 0)
asyncio.run(main())
