import asyncio, sys, os, pathlib
HERE = pathlib.Path(__file__).resolve().parent; sys.path.insert(0, str(HERE.parent / "tests"))
from playwright.async_api import async_playwright
import schnellstart as ss, nav_hilfe
PORT = 8916; L18 = "ar bg bs de el en es fa fr it ku pl ro ru sq tr uk vi".split()
async def main():
    srv = ss.server(PORT); fehler = []
    try:
        async with async_playwright() as p:
            b = await p.chromium.launch()
            for L in L18:
                ctx, pg = await ss.kontext(b, 360, 740, fehler)
                await pg.goto(f"http://127.0.0.1:{PORT}/index.html"); await pg.wait_for_selector('[data-f="sprache-wahl"]')
                a0 = await pg.evaluate("document.documentElement.lang + '|' + document.documentElement.dir")
                await pg.select_option('[data-f="sprache-wahl"]', L); await pg.click(f'[data-a="sprache"][data-wert="{L}"]'); await nav_hilfe.nach_sprache(pg); await pg.wait_for_timeout(500)
                a1 = await pg.evaluate("document.documentElement.lang + '|' + document.documentElement.dir")
                inp = await pg.evaluate("() => [...document.querySelectorAll('input[data-f]')].slice(0,3).map(e => e.dir + '/' + getComputedStyle(e).direction + '/' + getComputedStyle(e).textAlign)")
                ti = await pg.title()
                await pg.reload(); await pg.wait_for_selector('[data-a="laden-art"], .kachel', timeout=15000); await pg.wait_for_timeout(500)
                a2 = await pg.evaluate("document.documentElement.lang + '|' + document.documentElement.dir")
                print(L, "vorher", a0, "nachher", a1, "nach Neuladen", a2, "title", ti[:30], "inputs", inp, "OK" if a1.split('|')[0] == L and a2.split('|')[0] == L else "<<< FALSCH")
                await ctx.close()
            print("Fehler", len(fehler), fehler[:3]); await b.close()
    finally: srv.terminate()
asyncio.run(main())
