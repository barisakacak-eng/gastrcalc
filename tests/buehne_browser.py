"""Bühne (Salbei & Papier, Teil 1): Jede Ansicht hat genau EINE Bühne mit höchstens EINER sichtbaren Zeki-Figur, genau einen Hilfe-Knopf,
keine sichtbare Sprechblase, keinen waagerechten Überlauf; in Laden und Personal (390 × 844) kein senkrechtes Scrollen; Personal ohne „€“;
Arabisch: Figur links der Mitte, Code-Tasten in der Reihenfolge 1, 2, 3.
Start: python3 tools/sw_liste.py && DURCHLAUF_PORT=8861 python3 tests/buehne_browser.py"""
import asyncio, os, pathlib, sys
from playwright.async_api import async_playwright
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
import nav_hilfe, schnellstart

PORT = int(os.environ.get("DURCHLAUF_PORT", "8861"))
LADEN = ["start", "muell", "kuehl", "putzplan", "karte"]
BUERO = ["buero", "einstellungen", "umsatz", "kartefoto", "abschluss", "inventur", "vergleich", "aktionen", "beleg", "getraenke"]
OHNE_SW = "Object.defineProperty(navigator,'serviceWorker',{value:{controller:{},ready:Promise.resolve(),register:()=>Promise.resolve({}),addEventListener(){},getRegistrations:()=>Promise.resolve([])}})"

# Misst im Browser: liefert ein Wörterbuch der Befunde einer Ansicht
MESSEN = """() => {
  const sichtbar = (e) => { const r = e.getBoundingClientRect(), s = getComputedStyle(e); return r.width > 1 && r.height > 1 && s.visibility !== 'hidden' && s.display !== 'none' && +s.opacity > 0.05; };
  const app = document.querySelector('#app');
  const b = [...document.querySelectorAll('.gc-buehne')];
  const figuren = [...document.querySelectorAll('.gc-buehne .gc-figur')].filter(sichtbar);
  const bl = [...app.querySelectorAll('[class*=blase]')].filter(sichtbar).map((e) => e.className);
  const doc = document.documentElement, r = b[0] ? b[0].getBoundingClientRect() : null, f = document.querySelector('.gc-buehne .gc-figur-knopf');
  const fr = f ? f.getBoundingClientRect() : null;
  return { buehnen: b.length, figuren: figuren.length, hilfe: document.querySelectorAll('#app [data-a="hilfe-auf"]').length, blasen: bl,
    ueberlaufX: doc.scrollWidth > innerWidth + 1, ueberlaufY: doc.scrollHeight - innerHeight, appY: app.scrollHeight - app.clientHeight,
    hoehe: r ? Math.round(r.height) : 0, text: app.innerText || '', figurMitte: fr ? (fr.left + fr.width / 2) : null, breite: innerWidth,
    hilfeGroesse: f ? [Math.round(fr.width), Math.round(fr.height)] : null };
}"""


async def main():
    fehler = []; befund = []
    srv = schnellstart.server(PORT)
    try:
        async with async_playwright() as p:
            b = await p.chromium.launch(args=["--no-sandbox"])
            async def lauf(sprache):
                os.environ["SCHNELLSTART_SPRACHE"] = sprache
                ctx = await b.new_context(viewport={"width": 390, "height": 844}, device_scale_factor=1, is_mobile=True, has_touch=True, locale="de-DE")
                await ctx.add_init_script(path=str(pathlib.Path(__file__).resolve().parent / "hilfe" / "aufklappen.js"))
                if os.environ.get("BUEHNE_MIT_SW") != "1": await ctx.add_init_script(OHNE_SW)
                pg = await ctx.new_page(); pg.on("pageerror", lambda e: fehler.append(str(e)))
                await schnellstart.schnellstart(pg, PORT)
                async def pruefe(name, laden):
                    for _ in range(3):  # Hinweis-Karte „Zeki erklärt“ wegtippen wie ein Mensch
                        if await pg.locator('.zeki-erst [data-ze="ok"]').count(): await pg.locator('.zeki-erst [data-ze="ok"]').first.click(); await pg.wait_for_timeout(250)
                    await pg.wait_for_timeout(450)
                    m = await pg.evaluate(MESSEN); tag = f"[{sprache}] {name}"
                    if m["buehnen"] != 1: befund.append(f"{tag}: {m['buehnen']} Bühnen statt 1")
                    if m["figuren"] > 1: befund.append(f"{tag}: {m['figuren']} sichtbare Figuren")
                    if m["hilfe"] != 1: befund.append(f"{tag}: {m['hilfe']} Hilfe-Knöpfe statt 1")
                    if m["hilfeGroesse"] and min(m["hilfeGroesse"]) < 44: befund.append(f"{tag}: Hilfe-Knopf kleiner als 44 px {m['hilfeGroesse']}")
                    if m["blasen"]: befund.append(f"{tag}: sichtbare Sprechblase {m['blasen']}")
                    if m["ueberlaufX"]: befund.append(f"{tag}: waagerechter Überlauf")
                    if laden and (m["ueberlaufY"] > 1 or m["appY"] > 1): befund.append(f"{tag}: senkrechtes Scrollen (Dokument +{m['ueberlaufY']}, #app +{m['appY']})")
                    if sprache == "ar" and m["figurMitte"] is not None and m["figurMitte"] >= m["breite"] / 2: befund.append(f"{tag}: Figur nicht links der Mitte ({m['figurMitte']})")
                    print(f"{tag}: Bühne {m['hoehe']} px, Figuren {m['figuren']}, Scroll {m['ueberlaufY']}/{m['appY']}", flush=True)
                    return m
                for z in LADEN:
                    await nav_hilfe.geh(pg, z); await pruefe(z, True)
                await nav_hilfe.geh(pg, "muell"); await pg.locator('[data-a="muell-detail"]').first.click(); await pg.wait_for_timeout(300); await pruefe("muell-menge", True)
                if sprache == "de":
                    for z in BUERO:
                        try: await nav_hilfe.geh(pg, z)
                        except Exception as e: befund.append(f"[{sprache}] {z}: nicht erreichbar ({repr(e)[:80]})"); continue
                        await pruefe(z, False)
                    # Personal: Büro-Code setzen, in den Personal-Modus wechseln
                    await schnellstart.code_setzen(pg, "1234"); await nav_hilfe.geh(pg, "start"); await nav_hilfe.menue(pg)
                    await pg.click('#ebene-huelle [data-a="modus"][data-wert="personal"]'); await pg.wait_for_selector(".riesenkachel"); await pg.wait_for_timeout(400)
                    m = await pruefe("personal", True)
                    if "€" in m["text"]: befund.append("[de] personal: „€“ im sichtbaren Text")
                    await pg.locator('[data-a="personal-ziel"][data-wert="muell"]').first.click(); await pg.wait_for_timeout(500)
                    m = await pruefe("personal-muell", True)
                    if "€" in m["text"]: befund.append("[de] personal-muell: „€“ im sichtbaren Text")
                if sprache == "ar":
                    await nav_hilfe.geh(pg, "buero"); await pruefe("buero", False)
                    await schnellstart.code_setzen(pg, "1234")
                    await pg.click('#app [data-a="schloss"], [data-a="schloss"]') if await pg.locator('[data-a="schloss"]').count() else None
                    # Ziffernblatt öffnen (Büro-Code ändern) und die Reihenfolge der Tasten lesen
                    await nav_hilfe.ins_buero(pg); await pg.click('#app [data-a="pin-setzen"]'); await pg.wait_for_selector("#ebene-huelle .blatt-pin")
                    xs = await pg.evaluate("""() => ['1','2','3'].map((z) => document.querySelector(`#ebene-huelle [data-a="pin-taste"][data-wert="${z}"]`).getBoundingClientRect().left)""")
                    if not (xs[0] < xs[1] < xs[2]): befund.append(f"[ar] Code-Tasten nicht 1,2,3 von links nach rechts: {xs}")
                    print("[ar] Tasten links:", [round(x) for x in xs], flush=True)
                await ctx.close()
            await lauf("de"); await lauf("ar")
            await b.close()
    finally: srv.terminate()
    if fehler: befund += ["JS-Fehler: " + f[:150] for f in fehler[:5]]
    print("\n".join(befund) if befund else "BÜHNE OK")
    sys.exit(1 if befund else 0)

asyncio.run(main())
