"""Bilder zum Selbst-Ansehen der neuen Zeki-Figur außerhalb der Bühne: Bildschirmfotos bei 390 × 844 nach /home/claude/au-z-bilder/ (BILDER_OUT).
Start: python3 tools/sw_liste.py && BILDER_PORT=8901 python3 tools/zeki_bilder.py [sprache] [hell|dunkel] [name ...]
Namen: hilfe-blatt fuehrung-1 fuehrung-2 fuehrung-lang intro erst-hinweis abschluss-fertig menue-blatt laden-start"""
import asyncio, os, pathlib, sys
from playwright.async_api import async_playwright
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent.parent / "tests"))
import nav_hilfe, schnellstart

OUT = pathlib.Path(os.environ.get("BILDER_OUT", "/home/claude/au-z-bilder")); OUT.mkdir(parents=True, exist_ok=True)
PORT = int(os.environ.get("BILDER_PORT", "8901"))
ALLE = ["intro", "hilfe-blatt", "fuehrung-1", "fuehrung-2", "intro", "erst-hinweis", "abschluss-fertig", "menue-blatt", "laden-start"]
OHNE_SW = "Object.defineProperty(navigator,'serviceWorker',{value:{controller:{},ready:Promise.resolve(),register:()=>Promise.resolve({}),addEventListener(){},getRegistrations:()=>Promise.resolve([])},configurable:true})"
GERICHTE = """async () => {
  const kl = await import('./js/karte_lesen.js'); const e = await import('./js/engine.js'); const st = await import('./js/stamm.js');
  const s = window.__gastrocalc.stand;
  st.kostenBetragSetzen(s, 'miete', 'miete', 1500); s.team.personen = 0;
  const t = "Döner Kebab ⋯ 7,50\\nDürüm Döner ⋯ 8,00\\nDöner Box ⋯ 7,00\\nDöner-Teller mit Reis ⋯ 12,00\\nLahmacun ⋯ 5,00\\nPommes ⋯ 3,50";
  kl.vorschlaegeUebernehmen(s, kl.vorschlaegeAusText(t, s).map(v => ({...v, an: true}))); s.artikel = e.artikelAusGerichten(s);
  delete s.fuehrung;
  await (await import('./js/store.js')).sofortSpeichern(window.__gastrocalc.wurzel);
}"""


async def main():
    args = sys.argv[1:]; sprache = args[0] if args else "de"; dunkel = len(args) > 1 and args[1] == "dunkel"
    namen = args[2:] or ALLE; os.environ["SCHNELLSTART_SPRACHE"] = sprache
    srv = schnellstart.server(PORT); fehler = []
    try:
        async with async_playwright() as p:
            b = await p.chromium.launch(args=["--no-sandbox"])
            ctx = await b.new_context(viewport={"width": 390, "height": 844}, device_scale_factor=2, is_mobile=True, has_touch=True, locale="de-DE", color_scheme="dark" if dunkel else "light")
            await ctx.add_init_script(path=str(pathlib.Path(schnellstart.APP) / "tests" / "hilfe" / "aufklappen.js"))
            await ctx.add_init_script(OHNE_SW)
            pg = await ctx.new_page(); pg.on("pageerror", lambda e: fehler.append(str(e)))
            pg.on("console", lambda m: fehler.append(m.text) if m.type == "error" and "ERR_TUNNEL" not in m.text else None)
            await schnellstart.schnellstart(pg, PORT)
            suffix = f"-{sprache}" + ("-dunkel" if dunkel else "-hell")
            async def foto(n, warte=700):
                await pg.wait_for_timeout(warte); await pg.screenshot(path=str(OUT / f"{n}{suffix}.png")); print("Bild", n + suffix, flush=True)
            async def erst_weg():
                while await pg.locator('.zeki-erst [data-ze="ok"]').count(): await pg.locator('.zeki-erst [data-ze="ok"]').first.click(); await pg.wait_for_timeout(300)
            for n in namen:
                try:
                    if n == "hilfe-blatt":
                        await nav_hilfe.geh(pg, "muell"); await erst_weg(); await pg.click('[data-a="hilfe-auf"]'); await pg.wait_for_selector("#ebene-huelle .ebene-blatt"); await foto(n, 2200)
                        await pg.click('#ebene-huelle .knopf[data-a="blatt-zu"]'); await pg.wait_for_timeout(400)
                    elif n == "menue-blatt":
                        await nav_hilfe.geh(pg, "start"); await erst_weg(); await nav_hilfe.menue(pg); await foto(n, 2200)
                        await pg.keyboard.press("Escape"); await pg.wait_for_timeout(300)
                    elif n == "laden-start":
                        await nav_hilfe.geh(pg, "start"); await erst_weg(); await foto(n, 2500)
                    elif n == "erst-hinweis":
                        await pg.evaluate("localStorage.removeItem('gc-zeki-erst')"); await nav_hilfe.geh(pg, "kuehl"); await pg.wait_for_selector(".zeki-erst", timeout=5000); await foto(n, 2200)
                        await erst_weg()
                    elif n == "abschluss-fertig":
                        await nav_hilfe.geh(pg, "abschluss"); await erst_weg()
                        await pg.click('[data-a="abschluss-fertig"]'); await pg.wait_for_timeout(600); await erst_weg(); await foto(n, 2200)
                    elif n in ("fuehrung-1", "fuehrung-2"):
                        if n == "fuehrung-1":
                            await pg.evaluate(GERICHTE); await pg.reload(); await pg.wait_for_selector(".rg-huelle", timeout=8000); await foto(n, 3200)
                        else:
                            await pg.click('.rg-huelle [data-rk="weiter"]'); await foto(n, 3200)
                            await nav_hilfe.rundgang_weg(pg)
                    elif n == "intro":
                        await pg.evaluate("sessionStorage.removeItem('gastrocash-intro-gesehen')"); await pg.reload()
                        await pg.wait_for_selector(".zeki-intro", timeout=8000); await pg.wait_for_timeout(1900); await foto(n, 50)
                except Exception as e:
                    print("FEHLER", n, repr(e)[:300], flush=True)
            print("Konsolenfehler:", fehler[:5])
            await b.close()
    finally: srv.terminate()

asyncio.run(main())
