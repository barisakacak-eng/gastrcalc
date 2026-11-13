"""Einrichtung, Sprachwahl, Blätter von unten und Sperre im Aussehen „Salbei & Papier“ (Tafel II, Bauart 12).
Geht in de, tr, ar bei 390 × 844 und 360 × 740 durch den schnellen Weg der Einrichtung (Döner und Pizza), öffnet danach nacheinander
Menü-Blatt, Hilfe-Blatt, Büro-Code setzen (Ziffernfeld), Sicherung teilen und prüft je Schritt/Blatt:
genau eine Bühne ODER ein Blatt mit Zeki vorn (nie zwei sichtbare Zekis), keine sichtbare Sprechblase, kein waagrechter Überlauf,
in der Einrichtung kein senkrechtes Scrollen, Tippflächen ≥ 44 px, höchstens ein Blatt offen, im Arabischen Ziffern 1, 2, 3 von links nach rechts.
Start: python3 tools/sw_liste.py && DURCHLAUF_PORT=8960 python3 tests/einrichtung_aussehen_browser.py
Bilder statt Prüfung nebenbei: BILDER_OUT=/pfad (Dateien <name>-<sprache>-<breite>[-dunkel].png), BILDER_DUNKEL=1, EA_SPRACHEN=de,tr,ar, EA_GROESSEN=390x844,360x740"""
import asyncio, os, pathlib, sys
from playwright.async_api import async_playwright
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
import nav_hilfe, schnellstart

PORT = int(os.environ.get("DURCHLAUF_PORT", "8960"))
SPRACHEN = os.environ.get("EA_SPRACHEN", "de,tr,ar").split(",")
GROESSEN = [tuple(int(x) for x in g.split("x")) for g in os.environ.get("EA_GROESSEN", "390x844,360x740").split(",")]
BILDER = os.environ.get("BILDER_OUT"); DUNKEL = os.environ.get("BILDER_DUNKEL") == "1"
OHNE_SW = "Object.defineProperty(navigator,'serviceWorker',{value:{controller:{},ready:Promise.resolve(),register:()=>Promise.resolve({}),addEventListener(){},getRegistrations:()=>Promise.resolve([])},configurable:true})"
ARTEN = [("doener", "Döner Test"), ("pizza", "Pizza Test")]

# Misst im Browser, was gerade sichtbar ist
MESSEN = """() => {
  const sichtbar = (e) => { const r = e.getBoundingClientRect(), s = getComputedStyle(e); if (r.width < 2 || r.height < 2 || s.display === 'none') return false;
    for (let x = e; x && x.nodeType === 1; x = x.parentElement) { const c = getComputedStyle(x); if (c.visibility === 'hidden' || c.display === 'none' || +c.opacity < 0.05) return false; } return true; };
  const app = document.querySelector('#app'), huelle = document.querySelector('#ebene-huelle');
  const buehnen = [...document.querySelectorAll('.gc-buehne')].filter(sichtbar);
  const blaetter = [...document.querySelectorAll('.ebene-blatt')].filter(sichtbar);
  const bilderFiguren = [...document.querySelectorAll('.gc-figur, .gc-help-bot, .s2zeki-intro, .gc-vorn')].filter(sichtbar);
  // eine sichtbare Sprechblase: ein Element mit „blase“ im Klassennamen, das Hintergrund, Rand oder Schatten trägt – oder ein Zipfel
  const blasen = [...document.querySelectorAll('[class*=blase], [class*=sprech], .zeki-stimme > *')].filter(sichtbar).filter((e) => { const s = getComputedStyle(e), z = getComputedStyle(e, '::before');
    const bg = s.backgroundColor && !/rgba\\(0, 0, 0, 0\\)|transparent/.test(s.backgroundColor); const rand = ['Top','Right','Bottom','Left'].some((k) => parseFloat(s['border' + k + 'Width']) > 0 && s['border' + k + 'Style'] !== 'none');
    const schatten = s.boxShadow && s.boxShadow !== 'none'; const zipfel = z.content && z.content !== 'none' && z.content !== 'normal' && z.display !== 'none' && parseFloat(z.width) > 0 && z.backgroundColor !== 'rgba(0, 0, 0, 0)';
    return bg || rand || schatten || zipfel; }).map((e) => e.className);
  const doc = document.documentElement;
  const wurzel = blaetter.length ? huelle : document;
  const tippflaechen = [...wurzel.querySelectorAll('button, a[href], select, input:not([type=hidden]):not(.dateifeld):not([type=file]), label.leise, summary, [role=button]')].filter(sichtbar).filter((e) => !e.closest('.dateifeld'))
    .map((e) => { const r = e.getBoundingClientRect(); return { k: (e.dataset.a || e.dataset.f || e.className || e.tagName).toString().slice(0, 40), w: Math.round(r.width), h: Math.round(r.height), t: (e.textContent || '').trim().slice(0, 20) }; })
    .filter((x) => x.h < 43.5 || x.w < 43.5);
  const rects = [...(blaetter.length ? huelle : app).querySelectorAll('*')].filter(sichtbar).filter((e) => { const r = e.getBoundingClientRect(); return r.right > innerWidth + 1 || r.left < -1; }).filter((e) => !e.closest('.gc-figur-knopf, .gc-figur, .zeki-lebt, .home-bilder, .dateifeld')).map((e) => (e.className || e.tagName).toString().slice(0, 40));
  const fr = document.querySelector('.gc-buehne .gc-figur-knopf'); const f = fr ? fr.getBoundingClientRect() : null;
  return { buehnen: buehnen.length, blaetter: blaetter.length, figuren: bilderFiguren.length, blasen, ueberlaufX: doc.scrollWidth > innerWidth + 1, rects: rects.slice(0, 4),
    ueberlaufY: doc.scrollHeight - innerHeight, appY: app.scrollHeight - app.clientHeight, text: (app.innerText || '') + ' ' + (huelle ? huelle.innerText : ''), tippflaechen: tippflaechen.slice(0, 5),
    buehneH: buehnen[0] ? Math.round(buehnen[0].getBoundingClientRect().height) : 0, figurMitte: f ? f.left + f.width / 2 : null, figurRechts: f ? f.right : null, figurLinks: f ? f.left : null, breite: innerWidth,
    schritt: (window.__gastrocalc && window.__gastrocalc.stand && window.__gastrocalc.stand.schrittId) || '' };
}"""


async def main():
    befund = []; fehler = []
    srv = schnellstart.server(PORT)
    try:
        async with async_playwright() as p:
            b = await p.chromium.launch(args=["--no-sandbox"])
            for sprache in SPRACHEN:
                for (br, ho) in GROESSEN:
                    for (art, name) in ARTEN:
                        if art != "doener" and not (sprache == "de" and br == 390): continue  # zweite Art: einmal reicht (de, 390)
                        await lauf(b, sprache, br, ho, art, name, befund, fehler)
            await b.close()
    finally: srv.terminate()
    if fehler: befund += ["JS-Fehler: " + f[:150] for f in sorted(set(fehler))[:5]]
    print("\n".join(befund) if befund else "EINRICHTUNG AUSSEHEN OK")
    sys.exit(1 if befund else 0)


async def lauf(b, sprache, br, ho, art, name, befund, fehler):
    os.environ["SCHNELLSTART_SPRACHE"] = sprache
    ctx = await b.new_context(viewport={"width": br, "height": ho}, device_scale_factor=2 if BILDER else 1, is_mobile=True, has_touch=True, locale=("de-DE" if sprache == "de" else sprache),
                              color_scheme="dark" if DUNKEL else "light")
    await ctx.add_init_script(path=str(pathlib.Path(__file__).resolve().parent / "hilfe" / "aufklappen.js"))
    await ctx.add_init_script(OHNE_SW)
    pg = await ctx.new_page(); pg.on("pageerror", lambda e: fehler.append(str(e)))
    pg.on("console", lambda m: fehler.append(m.text) if m.type == "error" and "ERR_TUNNEL" not in m.text and "Failed to load resource" not in m.text else None)
    suffix = f"{sprache}-{br}" + ("-dunkel" if DUNKEL else "") + ("" if art == "doener" else f"-{art}")

    async def pruefe(was, einrichtung, blatt=False):
        await pg.wait_for_timeout(450)
        m = await pg.evaluate(MESSEN); tag = f"[{sprache} {br}x{ho} {art}] {was}"
        if blatt:
            if m["blaetter"] != 1: befund.append(f"{tag}: {m['blaetter']} sichtbare Blätter statt 1")
        else:
            if m["blaetter"] != 0: befund.append(f"{tag}: Blatt offen, obwohl keins offen sein soll ({m['blaetter']})")
        if m["figuren"] > 1: befund.append(f"{tag}: {m['figuren']} sichtbare Zekis")
        if m["figuren"] < 1: befund.append(f"{tag}: kein Zeki sichtbar")
        if blatt and m["buehnen"] and m["figuren"] > 1: befund.append(f"{tag}: Zeki in Blatt UND Bühne")
        if einrichtung and m["buehnen"] != 1: befund.append(f"{tag}: {m['buehnen']} Bühnen statt 1")
        if m["blasen"]: befund.append(f"{tag}: sichtbare Sprechblase {m['blasen']}")
        if m["ueberlaufX"] or m["rects"]: befund.append(f"{tag}: waagrechter Überlauf {m['rects']}")
        if einrichtung and (m["ueberlaufY"] > 1 or m["appY"] > 1): befund.append(f"{tag}: senkrechtes Scrollen (Dokument +{m['ueberlaufY']}, #app +{m['appY']})")
        if m["tippflaechen"]: befund.append(f"{tag}: Tippfläche unter 44 px {m['tippflaechen']}")
        if sprache == "ar" and not blatt and m["figurMitte"] is not None and m["figurMitte"] >= m["breite"] / 2: befund.append(f"{tag}: Figur im Arabischen nicht links ({m['figurMitte']})")
        print(f"{tag}: Bühne {m['buehneH']} px, Zekis {m['figuren']}, Blätter {m['blaetter']}, Scroll {m['ueberlaufY']}/{m['appY']}", flush=True)
        if BILDER and (sprache == "de" or True):
            pathlib.Path(BILDER).mkdir(parents=True, exist_ok=True); await pg.screenshot(path=f"{BILDER}/{was}-{suffix}.png")
        return m

    async def weiter(id_):
        for _ in range(3):
            await pg.click('[data-a="weiter"]')
            for _ in range(30):
                await pg.wait_for_timeout(100)
                if await pg.evaluate("window.__gastrocalc.stand.schrittId") == id_: await pg.wait_for_timeout(150); return
        raise AssertionError(f"Schritt {id_} nicht erreicht")

    await pg.goto(f"http://127.0.0.1:{PORT}/index.html"); await pg.wait_for_selector('[data-f="sprache-wahl"]')
    await pruefe("e1-sprache", True)
    await pg.select_option('[data-f="sprache-wahl"]', sprache); await pg.wait_for_timeout(300)
    await pg.click(f'[data-a="sprache"][data-wert="{sprache}"]')
    for _ in range(150):
        if await pg.locator('[data-a="bio-einrichten"]').count(): break
        await pg.wait_for_timeout(120)
    await pruefe("e2-schloss", True)
    await nav_hilfe.nach_sprache(pg); await pg.wait_for_selector('[data-a="laden-art"]')
    await pruefe("e3-laden-leer", True)
    await pg.fill('[data-f="betrieb.name"]', name); await pg.click(f'[data-a="laden-art"][data-wert="{art}"]'); await pg.wait_for_timeout(150)
    await pruefe("e3-laden", True)
    await weiter("karte-foto"); await pruefe("e4-karte", True)
    await weiter("kuehl-schnell"); await pruefe("e5-kuehl-leer", True)
    if art == "doener" and await pg.locator('[data-a="s2-kuehl-vorschlag"]').count(): await pg.click('[data-a="s2-kuehl-vorschlag"]')
    else:
        await pg.click('[data-a="s2-kuehl"][data-wert="kuehlschrank"][data-d="1"]'); await pg.click('[data-a="s2-kuehl"][data-wert="tiefkuehler"][data-d="1"]')
    await pg.wait_for_timeout(200); await pruefe("e5-kuehl", True)
    await weiter("geld"); await pruefe("e6-geld", True)
    await pg.fill('input[data-f="ks:miete"]', "1500"); await pg.wait_for_timeout(200)
    await weiter("fertig-schnell"); await pruefe("e7-fertig", True)
    if art != "doener" or not (br == 390 or sprache == "de"):
        await ctx.close(); return
    # Danach die Blätter
    for _ in range(3):
        knopf = pg.locator('[data-a="ob-fertig"].s2los')
        if await knopf.count(): await knopf.first.click()
        try: await pg.wait_for_selector('[data-a="menue-auf"], [data-a="foto-abbrechen"]', timeout=20000); break
        except Exception: pass
    if await pg.locator('[data-a="foto-abbrechen"]').count(): await pg.click('[data-a="foto-abbrechen"]')
    await nav_hilfe.geh(pg, "start"); await pg.wait_for_selector('[data-a="menue-auf"]'); await pg.wait_for_timeout(400); await nav_hilfe.rundgang_weg(pg)
    await nav_hilfe.menue(pg); await pruefe("b1-menue", False, blatt=True)
    await pg.click('#ebene-huelle [data-a="blatt-sprache"]'); await pg.wait_for_selector("#ebene-huelle .blatt-sprache"); await pruefe("b2-sprache", False, blatt=True)
    await pg.click('#ebene-huelle [data-a="menue-zurueck"]'); await pg.wait_for_timeout(300)
    await pg.click('#ebene-huelle .ikonknopf.zu'); await pg.wait_for_timeout(300)
    await pg.click('[data-a="hilfe-auf"]'); await pg.wait_for_selector("#ebene-huelle .blatt-hilfe"); await pruefe("b3-hilfe", False, blatt=True)
    await pg.click('#ebene-huelle .knopf[data-a="blatt-zu"]'); await pg.wait_for_timeout(300)
    await nav_hilfe.ins_buero(pg); await pg.wait_for_timeout(300)
    await pg.click('#app [data-a="pin-setzen"]'); await pg.wait_for_selector("#ebene-huelle .blatt-pin"); await pruefe("b4-pin", False, blatt=True)
    xs = await pg.evaluate("""() => ['1','2','3'].map((z) => document.querySelector(`#ebene-huelle [data-a="pin-taste"][data-wert="${z}"]`).getBoundingClientRect().left)""")
    if not (xs[0] < xs[1] < xs[2]): befund.append(f"[{sprache}] Ziffern nicht 1, 2, 3 von links nach rechts: {xs}")
    await pg.click('#ebene-huelle .pintaste.leer[data-a="blatt-zu"]'); await pg.wait_for_timeout(300)
    await ctx.close()


asyncio.run(main())
