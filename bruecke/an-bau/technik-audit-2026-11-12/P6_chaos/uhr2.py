import asyncio, sys, pathlib
from datetime import datetime
from zoneinfo import ZoneInfo
HERE = pathlib.Path(__file__).resolve().parent; sys.path.insert(0, str(HERE.parent / "tests"))
from playwright.async_api import async_playwright
import schnellstart as ss, nav_hilfe
PORT = 8847; BER = ZoneInfo("Europe/Berlin")
async def main():
    srv = ss.server(PORT); fehler = []
    try:
        async with async_playwright() as p:
            b = await p.chromium.launch()
            ctx = await b.new_context(viewport={"width": 390, "height": 844}, device_scale_factor=2, is_mobile=True, has_touch=True, locale="de-DE", timezone_id="Europe/Berlin")
            await ctx.add_init_script(path=str(HERE.parent / "tests" / "hilfe" / "aufklappen.js"))
            pg = await ctx.new_page(); pg.on("pageerror", lambda e: fehler.append(str(e)))
            await pg.clock.install(time=datetime(2026, 11, 12, 22, 30, tzinfo=BER)); await ss.schnellstart(pg, PORT); await nav_hilfe.rundgang_weg(pg)
            await nav_hilfe.geh(pg, "start")
            k = lambda: pg.evaluate("() => document.querySelector('#app').innerText.slice(0,40).replace(/\\n/g,' | ')")
            print("22:30:", await k())
            await pg.evaluate("() => { Object.defineProperty(document, 'visibilityState', {value: 'hidden', configurable: true}); Object.defineProperty(document, 'hidden', {value: true, configurable: true}); document.dispatchEvent(new Event('visibilitychange')); }")
            await pg.clock.fast_forward(9 * 3600 * 1000)  # Handy gesperrt bis 07:30
            await pg.evaluate("() => { Object.defineProperty(document, 'visibilityState', {value: 'visible', configurable: true}); Object.defineProperty(document, 'hidden', {value: false, configurable: true}); document.dispatchEvent(new Event('visibilitychange')); }")
            await pg.wait_for_timeout(1500)
            print("Uhr:", await pg.evaluate("new Date().toString().slice(0,33)")); print("nach Rückkehr 07:30 ohne Tipp:", await k())
            await pg.screenshot(path=str(HERE / "fotos" / "B_heute_veraltet_nach_nacht.png"))
            # Umsatz speichern auf dem noch alten Bildschirm: welcher Tag?
            await pg.click('#app [data-a="nav"][data-wert="umsatzheute"]'); await pg.wait_for_selector('[data-f="ul-umsatz"]')
            print("Umsatz-Bildschirm:", (await pg.inner_text("#app"))[:60].replace("\n", " | "))
            await nav_hilfe.geh(pg, "muell"); await nav_hilfe.geh(pg, "start"); print("nach Tabwechsel:", await k())
            print("Fehler", fehler); await b.close()
    finally: srv.terminate()
asyncio.run(main())
