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
  const doc = document.documentElement; const blattImDom = document.querySelectorAll('.ebene-blatt').length;
  const wurzel = blaetter.length ? huelle : document;
  const tippflaechen = [...wurzel.querySelectorAll('button, a[href], select, input:not([type=hidden]):not(.dateifeld):not([type=file]), label.leise, summary, [role=button]')].filter(sichtbar).filter((e) => !e.closest('.dateifeld'))
    .map((e) => { const r = e.getBoundingClientRect(); return { k: (e.dataset.a || e.dataset.f || e.className || e.tagName).toString().slice(0, 40), w: Math.round(r.width), h: Math.round(r.height), t: (e.textContent || '').trim().slice(0, 20) }; })
    .filter((x) => x.h < 43.5 || x.w < 43.5);
  const rects = [...(blaetter.length ? huelle : app).querySelectorAll('*')].filter(sichtbar).filter((e) => { const r = e.getBoundingClientRect(); return r.right > innerWidth + 1 || r.left < -1; }).filter((e) => !e.closest('.gc-figur-knopf, .gc-figur, .zeki-lebt, .home-bilder, .dateifeld')).map((e) => (e.className || e.tagName).toString().slice(0, 40));
  const fr = document.querySelector('.gc-buehne .gc-figur-knopf') || document.querySelector('.gc-buehne .gc-figur'); const f = fr ? fr.getBoundingClientRect() : null;
  return { blattImDom, buehnen: buehnen.length, blaetter: blaetter.length, figuren: bilderFiguren.length, blasen, ueberlaufX: doc.scrollWidth > innerWidth + 1, rects: rects.slice(0, 4),
    ueberlaufY: doc.scrollHeight - innerHeight, appY: app.scrollHeight - app.clientHeight, text: (app.innerText || '') + ' ' + (huelle ? huelle.innerText : ''), tippflaechen: tippflaechen.slice(0, 5),
    buehneH: buehnen[0] ? Math.round(buehnen[0].getBoundingClientRect().height) : 0, figurMitte: f ? f.left + f.width / 2 : null, figurRechts: f ? f.right : null, figurLinks: f ? f.left : null, breite: innerWidth,
    schritt: (window.__gastrocalc && window.__gastrocalc.stand && window.__gastrocalc.stand.schrittId) || '' };
}"""

# Lesbarkeit: Text gegen den Hintergrund, mindestens 4,5 : 1 (große Schrift ab 24 px / 19 px fett: 3 : 1)
KONTRAST = """() => {
  const num = (c) => { let m = c.match(/^rgba?\\(([^)]+)\\)/); if (m) { const p = m[1].split(/[ ,\\/]+/).filter(Boolean).map(parseFloat); return [p[0], p[1], p[2], p.length > 3 ? p[3] : 1]; }
    m = c.match(/^color\\(srgb ([^)]+)\\)/); if (m) { const p = m[1].split(/[ \\/]+/).filter(Boolean).map(parseFloat); return [p[0] * 255, p[1] * 255, p[2] * 255, p.length > 3 ? p[3] : 1]; } return null; };
  const lum = (r, g, b) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
  const hinter = (e) => { if (e.closest('.schirm > .kopf') && document.querySelector('.gc-buehne')) e = document.querySelector('.gc-buehne'); /* der Kopf liegt über der Bühne */ let lagen = []; for (let x = e; x && x.nodeType === 1; x = x.parentElement) { const c = num(getComputedStyle(x).backgroundColor); if (c && c[3] > 0) { lagen.push(c); if (c[3] >= 0.99) break; } }
    let b = [245, 237, 226]; for (const c of lagen.reverse()) b = [c[0] * c[3] + b[0] * (1 - c[3]), c[1] * c[3] + b[1] * (1 - c[3]), c[2] * c[3] + b[2] * (1 - c[3])]; return b; };
  const aus = []; const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let n = w.nextNode(); n; n = w.nextNode()) {
    if (!n.textContent.trim()) continue; const e = n.parentElement; if (!e || e.closest('script,style,noscript,option,select,[disabled],.versteckt')) continue;
    const r = e.getBoundingClientRect(); if (r.width < 2 || r.height < 2) continue; const s = getComputedStyle(e);
    let op = 1, sichtbar = true; for (let x = e; x && x.nodeType === 1; x = x.parentElement) { const c = getComputedStyle(x); if (c.visibility === 'hidden' || c.display === 'none') sichtbar = false; op *= +c.opacity; }
    if (!sichtbar || op < 0.6) continue;
    if (e.closest('#app') && document.querySelector('.ebene-blatt') && !e.closest('#ebene-huelle')) continue; // hinter dem Blatt abgedunkelt
    const f = num(s.color); if (!f) continue; const b = hinter(e); const fg = [f[0] * f[3] + b[0] * (1 - f[3]), f[1] * f[3] + b[1] * (1 - f[3]), f[2] * f[3] + b[2] * (1 - f[3])];
    const l1 = lum(...fg), l2 = lum(...b), v = (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
    const px = parseFloat(s.fontSize), gross = px >= 24 || (px >= 18.66 && +s.fontWeight >= 700);
    if (v < (gross ? 3 : 4.5)) aus.push(`${(e.className || e.tagName).toString().slice(0, 30)} „${n.textContent.trim().slice(0, 18)}“ ${v.toFixed(2)}`);
  } return aus.slice(0, 5); }"""


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

    async def pruefe(was, einrichtung, blatt=False, figur=True):
        await pg.wait_for_timeout(450)
        m = await pg.evaluate(MESSEN); tag = f"[{sprache} {br}x{ho} {art}] {was}"
        if blatt:
            if m["blaetter"] != 1: befund.append(f"{tag}: {m['blaetter']} sichtbare Blätter statt 1")
        else:
            if m["blaetter"] != 0: befund.append(f"{tag}: Blatt offen, obwohl keins offen sein soll ({m['blaetter']})")
        if m["figuren"] > 1: befund.append(f"{tag}: {m['figuren']} sichtbare Zekis")
        if m["figuren"] < 1 and figur: befund.append(f"{tag}: kein Zeki sichtbar")
        if m["blattImDom"] > 1: befund.append(f"{tag}: {m['blattImDom']} Blätter im DOM (höchstens 1)")
        if blatt and m["buehnen"] and m["figuren"] > 1: befund.append(f"{tag}: Zeki in Blatt UND Bühne")
        if einrichtung and m["buehnen"] != 1: befund.append(f"{tag}: {m['buehnen']} Bühnen statt 1")
        if m["blasen"]: befund.append(f"{tag}: sichtbare Sprechblase {m['blasen']}")
        if m["ueberlaufX"] or m["rects"]: befund.append(f"{tag}: waagrechter Überlauf {m['rects']}")
        if einrichtung and (m["ueberlaufY"] > 1 or m["appY"] > 1): befund.append(f"{tag}: senkrechtes Scrollen (Dokument +{m['ueberlaufY']}, #app +{m['appY']})")
        kon = await pg.evaluate(KONTRAST)
        if kon: befund.append(f"{tag}: Kontrast zu schwach {kon}")
        if m["tippflaechen"]: befund.append(f"{tag}: Tippfläche unter 44 px {m['tippflaechen']}")
        if m["figurLinks"] is not None and not blatt and (m["figurLinks"] < -0.5 or m["figurRechts"] > m["breite"] + 0.5): befund.append(f"{tag}: Zeki/Hilfe-Knopf ragt aus dem Fenster ({m['figurLinks']}…{m['figurRechts']})")
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
    # Sicherung teilen (Passwort-Blatt)
    await nav_hilfe.ins_buero(pg); await pg.wait_for_timeout(300)
    if await pg.locator('#app [data-a="export"]').count():
        await pg.locator('#app [data-a="export"]').first.click(); await pg.wait_for_selector("#ebene-huelle .blatt-passwort"); await pruefe("b5-sicherung", False, blatt=True)
        await pg.click('#ebene-huelle .ikonknopf.zu'); await pg.wait_for_timeout(300)
    else: befund.append(f"[{sprache}] Sicherung teilen im Büro nicht gefunden")
    # Büro-Code setzen (Ziffernfeld), danach der Rettungscode
    await pg.click('#app [data-a="pin-setzen"]'); await pg.wait_for_selector("#ebene-huelle .blatt-pin"); await pruefe("b4-pin", False, blatt=True)
    xs = await pg.evaluate("""() => ['1','2','3'].map((z) => document.querySelector(`#ebene-huelle [data-a="pin-taste"][data-wert="${z}"]`).getBoundingClientRect().left)""")
    if not (xs[0] < xs[1] < xs[2]): befund.append(f"[{sprache}] Ziffern nicht 1, 2, 3 von links nach rechts: {xs}")
    await schnellstart.code_tippen(pg, "1234"); await pg.wait_for_timeout(300); await pruefe("b4-pin-halb", False, blatt=True); await schnellstart.code_tippen(pg, "1234")
    await pg.locator("#ebene-huelle .blatt-rettungscode").wait_for(timeout=20000); await pruefe("b6-rettungscode", False, blatt=True)
    await pg.click('#ebene-huelle [data-a="rettung-ok"]'); await pg.locator("#ebene-huelle .blatt-rettungscode").wait_for(state="detached"); await pg.wait_for_timeout(300)
    # Code abfragen, „Code vergessen?“, Rettungscode-Eingabe, Wartezeit nach Fehlversuchen
    await nav_hilfe.zum_laden(pg); await nav_hilfe.ins_buero(pg); await pg.wait_for_selector("#ebene-huelle .blatt-pin"); await pruefe("b7-pin-buero", False, blatt=True)
    await pg.click('#ebene-huelle [data-a="rettung-start"]'); await pg.wait_for_selector("#ebene-huelle .blatt-rettung"); await pruefe("b8-rettung", False, blatt=True)
    await pg.click('#ebene-huelle .ikonknopf.zu'); await pg.wait_for_timeout(300)
    await nav_hilfe.ins_buero(pg)
    if not await pg.locator("#ebene-huelle .blatt-pin").count(): await pg.click('[data-a="menue-auf"]') if False else None
    await pg.wait_for_selector("#ebene-huelle .blatt-pin")
    for _ in range(9):  # 5 Fehlversuche sperren; unter Last kann die Prüfung (PBKDF2) einen Tipp-Durchgang verschlucken, darum bis zu 9 Anläufe
        if await pg.locator('#ebene-huelle .pintaste[data-wert="9"][disabled]').count(): break
        await schnellstart.code_tippen(pg, "9999")
        for _ in range(130):  # die Prüfung rechnet (PBKDF2): warten, bis die Punkte wieder leer sind oder die Wartezeit steht
            await pg.wait_for_timeout(150)
            if await pg.locator('#ebene-huelle .pin-punkte i.voll').count() == 0: break
    await pruefe("b9-wartezeit", False, blatt=True)
    if not await pg.locator("#ebene-huelle .pin-meldung").inner_text(): befund.append(f"[{sprache}] Wartezeit-Text fehlt")
    await pg.click('#ebene-huelle .pintaste.leer[data-a="blatt-zu"]'); await pg.wait_for_timeout(300)
    # Notfallseite (nur Gestaltung per CSS)
    await pg.evaluate("import('/js/bedienung/zeichnen.js').then((m) => m.notfallSeite())"); await pruefe("n1-notfall", False, figur=False)
    await ctx.close()


asyncio.run(main())
