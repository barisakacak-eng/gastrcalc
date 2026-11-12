import asyncio, sys, pathlib, json
HERE = pathlib.Path(__file__).resolve().parent; sys.path.insert(0, str(HERE.parent / "tests"))
from playwright.async_api import async_playwright
import schnellstart as ss, nav_hilfe
PORT = 8837
async def main():
    srv = ss.server(PORT); fehler = []
    try:
        async with async_playwright() as p:
            b = await p.chromium.launch(); ctx, pg = await ss.kontext(b, 390, 844, fehler)
            await ss.schnellstart(pg, PORT); await nav_hilfe.rundgang_weg(pg)
            await nav_hilfe.geh(pg, "abschluss"); await pg.wait_for_timeout(500)
            await pg.screenshot(path=str(HERE/"fotos"/"A_abschluss_vor_doppeltipp.png"))
            box = await pg.locator('[data-a="abschluss-fertig"]').first.bounding_box(); x=box["x"]+box["width"]/2; y=box["y"]+box["height"]/2
            await pg.touchscreen.tap(x,y); await pg.touchscreen.tap(x,y); await pg.wait_for_timeout(1200)
            ab = await pg.evaluate("() => window.__gastrocalc.stand.abschluesse")
            print(json.dumps(ab, ensure_ascii=False, indent=1)[:1500])
            await pg.screenshot(path=str(HERE/"fotos"/"A_abschluss_nach_doppeltipp.png"))
            print("Text:", (await pg.inner_text("#app"))[:300].replace("\n"," | "))
            await nav_hilfe.geh(pg, "start"); print("Heute:", (await pg.inner_text("#app"))[:300].replace("\n"," | "))
            await b.close()
    finally: srv.terminate()
asyncio.run(main())
