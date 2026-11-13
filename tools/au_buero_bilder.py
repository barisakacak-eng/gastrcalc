"""Bilder aller Büro-Ansichten: BILDER_PORT=8941 python3 tools/au_buero_bilder.py [sprache] [hell|dunkel] [breite] [name ...]
Bilder nach /home/claude/au-v2-bilder (BILDER_OUT). Beispiel-Laden, ganze Seite (full_page)."""
import asyncio, os, pathlib, sys
from playwright.async_api import async_playwright
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent.parent / "tests"))
import nav_hilfe, schnellstart, au_buero_hilfe as H

OUT = pathlib.Path(os.environ.get("BILDER_OUT", "/home/claude/au-v2-bilder")); OUT.mkdir(parents=True, exist_ok=True)
PORT = int(os.environ.get("BILDER_PORT", "8941"))


async def main():
    a = sys.argv[1:]; sprache = a[0] if a else "de"; dunkel = len(a) > 1 and a[1] == "dunkel"; breite = int(a[2]) if len(a) > 2 else 390
    namen = a[3:] or [z for z, _ in H.ZIELE]; os.environ["SCHNELLSTART_SPRACHE"] = sprache
    srv = schnellstart.server(PORT); fehler = []
    try:
        async with async_playwright() as p:
            b = await p.chromium.launch(args=["--no-sandbox"])
            ctx = await b.new_context(viewport={"width": breite, "height": 844}, device_scale_factor=1.5, is_mobile=True, has_touch=True, locale="de-DE", color_scheme="dark" if dunkel else "light")
            await ctx.add_init_script("Object.defineProperty(navigator,'serviceWorker',{value:{controller:{},ready:Promise.resolve(),register:()=>Promise.resolve({}),addEventListener(){},getRegistrations:()=>Promise.resolve([])},configurable:true})")
            pg = await ctx.new_page(); pg.on("pageerror", lambda e: fehler.append(str(e)))
            pg.on("console", lambda m: fehler.append(m.text) if m.type == "error" and "ERR_TUNNEL" not in m.text else None)
            await schnellstart.schnellstart(pg, PORT); await H.beispiel_laden(pg)
            suffix = f"-{sprache}" + ("-dunkel" if dunkel else "") + ("" if breite == 390 else f"-{breite}")
            for n in namen:
                try:
                    await H.zu_ziel(pg, n)
                    while await pg.locator('.zeki-erst [data-ze="ok"]').count(): await pg.locator('.zeki-erst [data-ze="ok"]').first.click(); await pg.wait_for_timeout(350)
                    if os.environ.get("OFFEN") == "1": await pg.evaluate(nav_hilfe.OEFFNEN, "details"); await pg.wait_for_timeout(200)
                    pfad = OUT / f"{n}{suffix}.png"; await pg.screenshot(path=str(pfad), full_page=True)
                    from PIL import Image  # lange Seiten in Stücke zu je 1000 px teilen (Lesbarkeit)
                    im = Image.open(pfad); hh = int(1000 * 1.5)
                    for i in range(min(3, (im.height + hh - 1) // hh)): im.crop((0, i * hh, im.width, min(im.height, (i + 1) * hh))).save(OUT / f"{n}{suffix}_{i + 1}.png")
                    print("Bild", n + suffix, im.height // 1.5, flush=True)
                except Exception as e: print("FEHLER", n, repr(e)[:200], flush=True)
            print("Konsolenfehler:", fehler[:5]); await b.close()
    finally: srv.terminate()

asyncio.run(main())
