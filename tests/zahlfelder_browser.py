"""F1 (Sonderauftrag 6b, 28.10.2026): Zahlenfelder zeigen „1234“, „120,5“, „38,5“ und „12“ ganz – 390×844 und 360×780, de und tr.
Aufruf: DURCHLAUF_PORT=8810 python3 tests/zahlfelder_browser.py"""
import asyncio, sys, subprocess, time, os, pathlib
sys.path.insert(0, str(pathlib.Path(__file__).parent))
import schnellstart, nav_hilfe
from playwright.async_api import async_playwright
APP = str(pathlib.Path(__file__).parent.parent); PORT = int(os.environ.get("DURCHLAUF_PORT", "8810"))
PRUEF = """(wert) => {  const out = []; for (const el of document.querySelectorAll('input[inputmode="decimal"], input[inputmode="numeric"], input[type="number"]')) {
  const r = el.getBoundingClientRect(); if (!r.width) continue; const alt = el.value; el.value = wert; const zu = el.scrollWidth > el.clientWidth + 1; el.value = alt;
  if (zu) out.push((el.dataset.f || '?') + ' ' + Math.round(el.clientWidth) + 'px/' + el.scrollWidth); } return out; }"""
async def main():
    srv = subprocess.Popen([sys.executable, "-m", "http.server", str(PORT), "--bind", "127.0.0.1"], cwd=APP, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL); time.sleep(0.8)
    fehler = []; funde = []
    try:
        async with async_playwright() as p:
            b = await p.chromium.launch()
            for (w, h) in [(390, 844), (360, 780)]:
              for lang in ["de", "tr"]:
                ctx, pg = await schnellstart.kontext(b, w, h, fehler)
                await schnellstart.schnellstart(pg, PORT)
                if await pg.locator(".rg-huelle").count(): await nav_hilfe.rundgang_weg(pg)
                if lang == "tr":
                    await nav_hilfe.menue(pg); await pg.click('#ebene-huelle [data-a="blatt-sprache"]'); await pg.click('#ebene-huelle [data-a="sprache"][data-wert="tr"]'); await pg.wait_for_timeout(1200)
                await nav_hilfe.geh(pg, "start"); await pg.click('#app [data-a="nav"][data-wert="umsatzheute"]'); await pg.wait_for_selector('[data-f="ul-umsatz"]')
                for wert in ["1234", "120,5", "38,5", "12"]:
                    r = await pg.evaluate(PRUEF, wert)
                    if r: funde.append(f"{w} {lang} umsatzheute {wert}: {r}")
                for ziel in ["muell", "kuehl", "abschluss"]:
                    try:
                        await nav_hilfe.geh(pg, ziel); await pg.wait_for_timeout(300)
                        for wert in ["1234", "120,5", "38,5"]:
                            r = await pg.evaluate(PRUEF, wert)
                            if r: funde.append(f"{w} {lang} {ziel} {wert}: {r}")
                    except Exception as e: funde.append(f"{w} {lang} {ziel}: FEHLER {str(e)[:60]}")
                await ctx.close()
            await b.close()
    finally: srv.terminate()
    print("\n".join(funde) or "alle Zahlenfelder ganz sichtbar"); print("konsole:", fehler[:5])
    if funde or fehler: sys.exit(1)
asyncio.run(main())
