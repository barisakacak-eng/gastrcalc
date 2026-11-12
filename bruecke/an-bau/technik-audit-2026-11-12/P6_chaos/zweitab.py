import asyncio, sys, pathlib
HERE = pathlib.Path(__file__).resolve().parent; sys.path.insert(0, str(HERE.parent / "tests"))
from playwright.async_api import async_playwright
import schnellstart as ss, nav_hilfe
PORT = 8857
Z = "(j) => (window.__gastrocalc.stand[j] || []).filter((x) => !x.storniert && !x.entwurf).length"
async def main():
    srv = ss.server(PORT); fehler = []
    try:
        async with async_playwright() as p:
            b = await p.chromium.launch(); ctx, pg = await ss.kontext(b, 390, 844, fehler)
            await ss.schnellstart(pg, PORT); await nav_hilfe.rundgang_weg(pg)
            pg2 = await ctx.new_page(); pg2.on("pageerror", lambda e: fehler.append(str(e)))
            await pg2.goto(f"http://127.0.0.1:{PORT}/index.html"); await pg2.wait_for_function("() => window.__gastrocalc && window.__gastrocalc.stand", timeout=20000); await pg2.wait_for_timeout(800)
            await nav_hilfe.rundgang_weg(pg2)
            for tab, name in ((pg, "A"), (pg2, "B"), (pg, "A"), (pg2, "B")):
                await tab.bring_to_front(); await nav_hilfe.geh(tab, "muell"); await tab.wait_for_timeout(300)
                await tab.locator('#app [data-a="muell-tipp"]').first.tap(); await tab.wait_for_timeout(700)
            await pg.reload(); await pg.wait_for_function("() => window.__gastrocalc && window.__gastrocalc.stand"); await pg.wait_for_timeout(600)
            await pg2.reload(); await pg2.wait_for_function("() => window.__gastrocalc && window.__gastrocalc.stand"); await pg2.wait_for_timeout(600)
            print("4 Müll-Tipps über 2 Tabs abwechselnd -> Tab A sieht", await pg.evaluate(Z, "schwund"), "Tab B sieht", await pg2.evaluate(Z, "schwund"), "(erwartet 4)")
            print("Fehler", fehler); await b.close()
    finally: srv.terminate()
asyncio.run(main())
