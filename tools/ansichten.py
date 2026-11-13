"""Alle Ansichten der App nacheinander ansteuern (Einrichtung, Laden, Blätter, Büro, Personal) und je Ansicht eine Funktion aufrufen.
Gemeinsame Grundlage für tools/kontrast.py und tools/css_sammeln.py.  ansichten.lauf(browser, port, thema, sprache, messe)  –  messe(name, seite) ist async."""
import os, pathlib, sys
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent.parent / "tests"))
import nav_hilfe, schnellstart, au_buero_hilfe as H

OHNE_SW = "Object.defineProperty(navigator,'serviceWorker',{value:{controller:{},ready:Promise.resolve(),register:()=>Promise.resolve({}),addEventListener(){},getRegistrations:()=>Promise.resolve([])},configurable:true})"
ERST = "try { localStorage.setItem('gc-zeki-erst', JSON.stringify(['muell','kuehl','putzplan','karte','umsatzheute','abschluss','personal','start'])); } catch (e) {}"


async def neuer_kontext(b, thema, breite=390, hoehe=844, skala=1):
    ctx = await b.new_context(viewport={"width": breite, "height": hoehe}, device_scale_factor=skala, is_mobile=True, has_touch=True, locale="de-DE", color_scheme="dark" if thema == "dunkel" else "light")
    await ctx.add_init_script(OHNE_SW); await ctx.add_init_script(path=str(pathlib.Path(schnellstart.APP) / "tests" / "hilfe" / "aufklappen.js")); await ctx.add_init_script(ERST)
    return ctx


async def klick(pg, sel): await pg.evaluate("(s) => document.querySelector(s).click()", sel)


async def lauf(b, port, thema, sprache, messe, nur=None):
    os.environ["SCHNELLSTART_SPRACHE"] = sprache
    async def m(name, pg):
        try:
            await pg.wait_for_timeout(450)
            if await pg.locator(".zeki-sprech").count():  # Zekis flüchtiger Satz soll weg sein (wie in tests/laden_aussehen_browser.py)
                for _ in range(40):
                    await pg.wait_for_timeout(250)
                    if not await pg.locator(".zeki-sprech").count(): break
            if nur and name not in nur: return
            await pg.evaluate("document.querySelectorAll('.zeki-erst').forEach(e => e.remove())"); await messe(name, pg)
        except Exception as e: print("MESSFEHLER", name, repr(e)[:160], flush=True)
    ctx = await neuer_kontext(b, thema); pg = await ctx.new_page(); pg.on("pageerror", lambda e: print("SEITENFEHLER", str(e)[:120]))
    await pg.goto(f"http://127.0.0.1:{port}/index.html"); await pg.wait_for_selector('.kachel, [data-f="sprache-wahl"]'); await pg.wait_for_timeout(500)
    await m("einrichtung-sprache", pg)
    await pg.select_option('[data-f="sprache-wahl"]', sprache); await pg.click(f'[data-a="sprache"][data-wert="{sprache}"]'); await nav_hilfe.nach_sprache(pg); await pg.wait_for_selector('[data-a="laden-art"]')
    await m("einrichtung-art", pg)
    await pg.fill('[data-f="betrieb.name"]', "Imbiss Test"); await pg.click('[data-a="laden-art"][data-wert="doener"]'); await pg.wait_for_timeout(200); await m("einrichtung-name", pg)
    await ctx.close()
    ctx = await neuer_kontext(b, thema); pg = await ctx.new_page(); pg.on("pageerror", lambda e: print("SEITENFEHLER", str(e)[:120]))
    await schnellstart.schnellstart(pg, port, name="Imbiss Test"); await H.beispiel_laden(pg)
    await nav_hilfe.geh(pg, "start"); await m("laden-start", pg)
    await nav_hilfe.geh(pg, "muell"); await m("laden-muell", pg)
    await klick(pg, '[data-a="muell-detail"]'); await pg.wait_for_timeout(350); await m("laden-muell-menge", pg)
    await klick(pg, '[data-a="muell-auswahl"]'); await pg.wait_for_timeout(350); await m("laden-muell-andere", pg)
    await klick(pg, '[data-a="muell-auswahl-zu"]'); await pg.wait_for_timeout(250)
    await klick(pg, '[data-a="muell-start"]'); await pg.wait_for_timeout(300)
    await klick(pg, '[data-a="muell-station-auf"]'); await pg.wait_for_timeout(350); await m("laden-muell-uebrig", pg)
    await klick(pg, '[data-a="muell-station-zu"]'); await pg.wait_for_timeout(300)
    await nav_hilfe.geh(pg, "kuehl"); await m("laden-kuehl", pg)
    await klick(pg, '[data-a="kuehl-rundgang-los"]'); await pg.wait_for_selector('[data-f="station-wert"]'); await pg.wait_for_timeout(250); await m("laden-kuehl-wert", pg)
    await pg.fill('[data-f="station-wert"]', "14"); await pg.wait_for_timeout(300); await m("laden-kuehl-warnung", pg)
    await pg.fill('[data-f="station-wert"]', "4"); await pg.wait_for_timeout(150); await klick(pg, '[data-a="station-speichern"]'); await pg.wait_for_timeout(450); await m("laden-kuehl-rundgang", pg)
    await nav_hilfe.geh(pg, "putzplan"); await m("laden-putzplan", pg)
    await klick(pg, '[data-a="pp-haken"]'); await pg.wait_for_timeout(500); await m("laden-putzplan-haken", pg)
    await nav_hilfe.geh(pg, "karte"); await m("laden-karte", pg)
    await klick(pg, '[data-a="kl-auf"]'); await pg.wait_for_selector(".kl-blatt"); await pg.wait_for_timeout(300); await m("laden-karte-preis", pg)
    await pg.click('button.kl-x[data-a="kl-zu"]'); await pg.wait_for_timeout(350)
    gid = await pg.evaluate("(window.__gastrocalc.stand.gerichte.find((g) => (g.zutaten || []).length) || {}).id || null")
    if gid:
        await pg.evaluate("async (gid) => { const m = await import('./js/screens/karte_laden.js'); m.karteLadenRezeptBlatt(window.__gastrocalc.stand, gid); window.__gastrocalc.zeichne(); }", gid)
        await pg.wait_for_selector(".kl-rezeptblatt"); await pg.wait_for_timeout(300); await m("laden-karte-rezept", pg)
        await pg.click('#app .kl-rezeptblatt [data-a="kl-zu"].knopf'); await pg.wait_for_timeout(350)
    pid = await pg.evaluate("""async () => { const W = await import('./js/ware.js'); const s = window.__gastrocalc.stand; return (s.gerichte.find((g) => W.hauptZutat(s, g)) || {}).id || null; }""")
    if pid:
        await pg.evaluate("(pid) => { const b = document.createElement('button'); b.dataset.a = 'nav'; b.dataset.wert = 'portion'; b.dataset.id = pid; b.id = 'testportion'; document.querySelector('#app').appendChild(b); }", pid)
        await pg.evaluate("document.getElementById('testportion').click()"); await pg.wait_for_selector(".po"); await pg.wait_for_timeout(300); await m("laden-portion", pg)
        await klick(pg, '[data-a="po-pruefen"]'); await pg.wait_for_timeout(400); await m("laden-portion-ergebnis", pg)
        await klick(pg, '[data-a="po-fertig"]'); await pg.wait_for_timeout(300)
    await nav_hilfe.geh(pg, "start"); await pg.click('#app [data-a="nav"][data-wert="umsatzheute"]'); await pg.wait_for_selector('[data-f="ul-umsatz"]'); await pg.wait_for_timeout(250); await m("laden-umsatz-heute", pg)
    await nav_hilfe.geh(pg, "abschluss"); await m("laden-abschluss", pg)
    if await pg.locator('[data-a="abschluss-fertig"]').count(): await klick(pg, '[data-a="abschluss-fertig"]'); await pg.wait_for_timeout(700); await m("laden-geschafft", pg)
    await nav_hilfe.geh(pg, "start"); await nav_hilfe.menue(pg); await m("blatt-menue", pg)
    await klick(pg, '#ebene-huelle [data-a="blatt-sprache"]'); await pg.wait_for_timeout(500); await m("blatt-sprache", pg)
    await pg.click('#ebene-huelle [data-a="menue-zurueck"]'); await pg.wait_for_timeout(300); await pg.click('#ebene-huelle .ikonknopf.zu'); await pg.wait_for_timeout(300)
    await pg.click('[data-a="hilfe-auf"]'); await pg.wait_for_selector("#ebene-huelle .blatt-hilfe"); await pg.wait_for_timeout(300); await m("blatt-hilfe", pg)
    await pg.click('#ebene-huelle .knopf[data-a="blatt-zu"]'); await pg.wait_for_timeout(300)
    await nav_hilfe.geh(pg, "start")
    for z, _ in H.ZIELE:
        try: await H.zu_ziel(pg, z); await m("buero-" + z, pg)
        except Exception as e: print("FEHLER", z, repr(e)[:120], flush=True)
    await nav_hilfe.geh(pg, "start")
    await schnellstart.code_setzen(pg, "1234"); await nav_hilfe.geh(pg, "start"); await nav_hilfe.menue(pg)
    await pg.click('#ebene-huelle [data-a="modus"][data-wert="personal"]'); await pg.wait_for_selector(".riesenkachel, .personwahl"); await pg.wait_for_timeout(350)
    if await pg.locator(".personwahl").count(): await m("personal-wer", pg); await pg.evaluate("document.querySelector('.personwahl').click()"); await pg.wait_for_selector(".riesenkachel")
    await m("personal", pg)
    for ziel, name in (("muell", "personal-muell"), ("kuehl", "personal-kuehl"), ("putzplan", "personal-putzen")):
        await pg.click(f'[data-a="personal-ziel"][data-wert="{ziel}"]'); await pg.wait_for_timeout(500); await m(name, pg)
        await pg.go_back(); await pg.wait_for_timeout(400)
        if await pg.locator(".riesenkachel").count() != 3: await pg.go_back(); await pg.wait_for_timeout(400)
    await ctx.close()
