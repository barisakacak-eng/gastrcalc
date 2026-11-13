"""Bilder zum Selbst-Ansehen (Salbei & Papier): Bildschirmfotos bei 390 × 844 nach /home/claude/agb-bilder/ (oder BILDER_OUT).
Start: python3 tools/sw_liste.py && BILDER_PORT=8851 python3 tools/buehne_bilder.py [sprache] [hell|dunkel] [name ...]
Namen: laden-start muell muell-menge kuehl putzplan karte personal buero buero-karte einstellungen umsatz hinweise"""
import asyncio, os, pathlib, sys
from playwright.async_api import async_playwright
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent.parent / "tests"))
import nav_hilfe, schnellstart

OUT = pathlib.Path(os.environ.get("BILDER_OUT", "/home/claude/agb-bilder")); OUT.mkdir(parents=True, exist_ok=True)
PORT = int(os.environ.get("BILDER_PORT", "8851"))
ALLE = ["laden-start", "muell", "muell-menge", "kuehl", "putzplan", "karte", "buero", "buero-karte", "einstellungen", "umsatz", "hinweise", "personal"]


async def main():
    args = sys.argv[1:]; sprache = args[0] if args else "de"; dunkel = len(args) > 1 and args[1] == "dunkel"
    namen = args[2:] or ALLE; os.environ["SCHNELLSTART_SPRACHE"] = sprache
    srv = schnellstart.server(PORT); fehler = []
    try:
        async with async_playwright() as p:
            b = await p.chromium.launch(args=["--no-sandbox"])
            ctx = await b.new_context(viewport={"width": 390, "height": 844}, device_scale_factor=2, is_mobile=True, has_touch=True, locale="de-DE", color_scheme="dark" if dunkel else "light")
            await ctx.add_init_script(path=str(pathlib.Path(schnellstart.APP) / "tests" / "hilfe" / "aufklappen.js"))
            if os.environ.get("BILDER_MIT_SW") != "1":  # schneller: ohne Service Worker (der Start wartet sonst bis zu 2 Minuten auf ihn)
                await ctx.add_init_script("Object.defineProperty(navigator,'serviceWorker',{value:{controller:{},ready:Promise.resolve(),register:()=>Promise.resolve({}),addEventListener(){},getRegistrations:()=>Promise.resolve([])},configurable:true})")
            pg = await ctx.new_page(); pg.on("pageerror", lambda e: fehler.append(str(e)))
            pg.on("console", lambda m: fehler.append(m.text) if m.type == "error" and "ERR_TUNNEL" not in m.text else None)
            await schnellstart.schnellstart(pg, PORT)
            suffix = f"-{sprache}" + ("-dunkel" if dunkel else "") if (sprache != "de" or dunkel) else "-de"
            async def foto(n):
                await pg.wait_for_timeout(500)
                while await pg.locator('.zeki-erst [data-ze="ok"]').count(): await pg.locator('.zeki-erst [data-ze="ok"]').first.click(); await pg.wait_for_timeout(300)
                await pg.wait_for_timeout(200); await pg.screenshot(path=str(OUT / f"{n}{suffix}.png")); print("Bild", n + suffix, flush=True)
            for n in namen:
                try:
                    if n == "laden-start": await nav_hilfe.geh(pg, "start")
                    elif n == "muell": await nav_hilfe.geh(pg, "muell")
                    elif n == "muell-menge":
                        await nav_hilfe.geh(pg, "muell"); await pg.locator('[data-a="muell-detail"]').first.click(); await pg.wait_for_timeout(300)
                    elif n in ("kuehl", "putzplan", "karte"): await nav_hilfe.geh(pg, n)
                    elif n == "buero": await nav_hilfe.geh(pg, "buero")
                    elif n == "buero-karte": await nav_hilfe.geh(pg, "kartebuero")
                    elif n in ("einstellungen", "umsatz", "hinweise"): await nav_hilfe.geh(pg, n)
                    elif n == "personal":
                        await schnellstart.code_setzen(pg, "1234"); await nav_hilfe.geh(pg, "start"); await nav_hilfe.menue(pg)
                        await pg.click('#ebene-huelle [data-a="modus"][data-wert="personal"]'); await pg.wait_for_selector(".riesenkachel"); await pg.wait_for_timeout(300)
                    await foto(n)
                    if n == "personal":
                        await pg.click('[data-a="schloss"]'); await pg.wait_for_timeout(500); await foto("personal-schloss")
                        for z in "1234": await pg.click(f'[data-a="pin-taste"][data-wert="{z}"]')
                        await pg.wait_for_timeout(800)
                except Exception as e:
                    print("FEHLER", n, repr(e)[:200], flush=True)
            print("Konsolenfehler:", fehler[:5])
            await b.close()
    finally: srv.terminate()

asyncio.run(main())
