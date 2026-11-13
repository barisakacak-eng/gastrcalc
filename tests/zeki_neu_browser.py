"""Zeki neu (Salbei & Papier, Teil Zeki): Je Bildschirm höchstens EINE sichtbare Zeki-Figur, kein Kreis und kein Rahmen um sie, keine sichtbare Sprechblase;
„Bewegung reduzieren“ → keine laufende Animation an der Figur und kein Folge-Überzug; ohne Reduzierung läuft nach dem Ankommen genau eine Folge und endet wieder (Überzug weg, ruhendes Bild da).
Bildschirme: Laden-Start, Müll, Kühlung, Putzplan, Karte, Personal-Start, Büro-Start, Hilfe-Blatt offen, Menü-Blatt offen, Führung (erster Besuch).
Start: python3 tools/sw_liste.py && DURCHLAUF_PORT=8905 python3 tests/zeki_neu_browser.py"""
import asyncio, os, pathlib, sys
from playwright.async_api import async_playwright
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
import nav_hilfe, schnellstart

PORT = int(os.environ.get("DURCHLAUF_PORT", "8905"))
OHNE_SW = "Object.defineProperty(navigator,'serviceWorker',{value:{controller:{},ready:Promise.resolve(),register:()=>Promise.resolve({}),addEventListener(){},getRegistrations:()=>Promise.resolve([])}})"
GERICHTE = """async () => {
  const kl = await import('./js/karte_lesen.js'); const e = await import('./js/engine.js'); const st = await import('./js/stamm.js');
  const s = window.__gastrocalc.stand;
  st.kostenBetragSetzen(s, 'miete', 'miete', 1500); s.team.personen = 0;
  const t = "Döner Kebab ⋯ 7,50\\nDürüm Döner ⋯ 8,00\\nDöner Box ⋯ 7,00\\nLahmacun ⋯ 5,00\\nPommes ⋯ 3,50";
  kl.vorschlaegeUebernehmen(s, kl.vorschlaegeAusText(t, s).map(v => ({...v, an: true}))); s.artikel = e.artikelAusGerichten(s);
  delete s.fuehrung;
  await (await import('./js/store.js')).sofortSpeichern(window.__gastrocalc.wurzel);
}"""
# Läufer im Browser: zählt jeden Start eines Folge-Überzugs (.gc-zeki-folge von „none“ auf „block“) und wie viele gleichzeitig laufen
LAEUFER = """(() => {
  const z = window.__zekiLauf = { starts: 0, max: 0, aktiv: 0, reset() { z.starts = 0; z.max = 0; }, an: new WeakMap() };
  const sichtbar = (o) => o.isConnected && getComputedStyle(o).display === 'block';
  const takt = () => {
    let jetzt = 0;
    for (const o of document.querySelectorAll('.gc-zeki-folge')) { const an = sichtbar(o); if (an) jetzt++; if (an && !z.an.get(o)) z.starts++; z.an.set(o, an); }
    z.aktiv = jetzt; z.max = Math.max(z.max, jetzt); requestAnimationFrame(takt);
  };
  requestAnimationFrame(takt);
})();"""
MESSEN = """() => {
  const sichtbar = (e) => { const r = e.getBoundingClientRect(), s = getComputedStyle(e); return r.width > 1 && r.height > 1 && s.visibility !== 'hidden' && s.display !== 'none' && +s.opacity > 0.05; };
  const figuren = [...document.querySelectorAll('.gc-figur, .gc-zeki-vorn')].filter(sichtbar);
  const bilder = [...document.querySelectorAll('img.gc-zeki')];
  const kreis = [];
  for (const img of bilder) {
    if (!sichtbar(img)) continue;
    const ri = img.getBoundingClientRect(); let e = img.parentElement;
    for (let i = 0; i < 4 && e && e !== document.body; i++, e = e.parentElement) {
      const s = getComputedStyle(e), r = e.getBoundingClientRect();
      const rund = ['borderTopLeftRadius', 'borderTopRightRadius', 'borderBottomLeftRadius', 'borderBottomRightRadius'].some((k) => parseFloat(s[k]) > 0 && (s[k].includes('%') || parseFloat(s[k]) >= Math.min(r.width, r.height) / 2 - 0.5));
      const rahmen = ['Top', 'Right', 'Bottom', 'Left'].some((k) => parseFloat(s['border' + k + 'Width']) > 0 && s['border' + k + 'Style'] !== 'none');
      const fuellung = s.backgroundColor !== 'rgba(0, 0, 0, 0)' && s.backgroundColor !== 'transparent';
      const eng = r.width <= ri.width * 1.7 && r.height <= ri.height * 1.7; // ein Behälter, der kaum größer ist als die Figur (kein Karten- oder Bühnenhintergrund)
      if (eng && (rund && s.overflow !== 'visible' && !e.classList.contains('gc-figur') && !e.classList.contains('gc-figur-knopf'))) kreis.push(e.className + ' (rund + beschnitten)');
      if (eng && (rahmen || fuellung || s.boxShadow !== 'none') && !e.classList.contains('gc-figur') && !e.classList.contains('gc-figur-knopf')) kreis.push(e.className + ' (Rahmen/Fläche um die Figur)');
    }
  }
  const blasen = [...document.querySelectorAll('[class*=blase]')].filter(sichtbar).filter((e) => {
    const s = getComputedStyle(e), v = getComputedStyle(e, '::before');
    return s.backgroundColor !== 'rgba(0, 0, 0, 0)' || ['Top', 'Right', 'Bottom', 'Left'].some((k) => parseFloat(s['border' + k + 'Width']) > 0 && s['border' + k + 'Style'] !== 'none') || s.boxShadow !== 'none' || (v.content !== 'none' && v.display !== 'none');
  }).map((e) => e.className);
  const laeufe = [...document.querySelectorAll('img.gc-zeki, .gc-figur, .gc-zeki-vorn, .gc-zeki-folge, .gc-figur-knopf, .rg-zeki, .ze-zeki, .gc-help-bot')];
  const animiert = laeufe.filter((e) => getComputedStyle(e).animationName !== 'none').map((e) => e.className + ':' + getComputedStyle(e).animationName);
  const ueberzug = [...document.querySelectorAll('.gc-zeki-folge')].filter((o) => getComputedStyle(o).display !== 'none').length;
  return { figuren: figuren.length, kreis, blasen, animiert, ueberzug, text: (document.querySelector('#app') || document.body).innerText };
}"""


async def main():
    befund = []; fehler = []
    srv = schnellstart.server(PORT)
    try:
        async with async_playwright() as p:
            b = await p.chromium.launch(args=["--no-sandbox"])
            for reduziert in (False, True):
                ctx = await b.new_context(viewport={"width": 390, "height": 844}, device_scale_factor=1, is_mobile=True, has_touch=True, locale="de-DE", reduced_motion="reduce" if reduziert else "no-preference")
                await ctx.add_init_script(path=str(pathlib.Path(__file__).resolve().parent / "hilfe" / "aufklappen.js"))
                await ctx.add_init_script(OHNE_SW); await ctx.add_init_script(LAEUFER)
                pg = await ctx.new_page(); pg.on("pageerror", lambda e: fehler.append(str(e)))
                await schnellstart.schnellstart(pg, PORT)
                modus = "reduziert" if reduziert else "bewegt"

                async def erst_weg():
                    for _ in range(4):
                        if await pg.locator('.zeki-erst [data-ze="ok"]').count(): await pg.locator('.zeki-erst [data-ze="ok"]').first.click(); await pg.wait_for_timeout(250)

                async def pruefe(name, erwartet_folgen, vorher=None):
                    """erwartet_folgen: 0 = keine Folge zu erwarten, 1 = genau eine, None = egal (≤ 1). Messung nach dem Ankommen."""
                    await pg.wait_for_timeout(3300)
                    m = await pg.evaluate(MESSEN); l = await pg.evaluate("({ starts: __zekiLauf.starts, max: __zekiLauf.max, aktiv: __zekiLauf.aktiv })"); tag = f"[{modus}] {name}"
                    if m["figuren"] > 1: befund.append(f"{tag}: {m['figuren']} sichtbare Zeki-Figuren")
                    if m["kreis"]: befund.append(f"{tag}: Kreis/Rahmen um Zeki {m['kreis']}")
                    if m["blasen"]: befund.append(f"{tag}: sichtbare Sprechblase {m['blasen']}")
                    if reduziert:
                        if m["animiert"]: befund.append(f"{tag}: laufende Animation an der Figur {m['animiert']}")
                        if m["ueberzug"] or l["starts"]: befund.append(f"{tag}: Folge-Überzug trotz „Bewegung reduzieren“ (Starts {l['starts']})")
                    else:
                        if l["max"] > 1: befund.append(f"{tag}: {l['max']} Folgen gleichzeitig")
                        if m["ueberzug"] or l["aktiv"]: befund.append(f"{tag}: Überzug bleibt stehen (Folge endet nicht)")
                        if erwartet_folgen is not None and l["starts"] != erwartet_folgen: befund.append(f"{tag}: {l['starts']} Folgen gelaufen, erwartet {erwartet_folgen}")
                    print(f"{tag}: Figuren {m['figuren']}, Folgen {l['starts']}, gleichzeitig ≤ {l['max']}", flush=True)
                    return m

                async def los(): await pg.evaluate("__zekiLauf.reset()")
                # Laden: je Reiter genau eine Ankunfts-Folge (Haltung ≠ warten)
                await nav_hilfe.geh(pg, "karte"); await erst_weg(); await pg.wait_for_timeout(4000)
                for z in ["start", "muell", "kuehl", "putzplan", "karte"]:
                    await los(); await nav_hilfe.geh(pg, z); await erst_weg(); await pruefe("laden-start" if z == "start" else z, 1)
                # Hilfe-Blatt: Zeki tritt vor, Bühne leer; Menü-Blatt
                await nav_hilfe.geh(pg, "muell"); await erst_weg(); await pg.wait_for_timeout(500)
                await los(); await pg.click('[data-a="hilfe-auf"]'); await pg.wait_for_selector("#ebene-huelle .ebene-blatt"); await pruefe("hilfe-blatt", 1)
                await pg.click('#ebene-huelle .knopf[data-a="blatt-zu"]'); await pg.wait_for_timeout(500)
                await nav_hilfe.geh(pg, "start"); await erst_weg(); await los(); await nav_hilfe.menue(pg); await pruefe("menue-blatt", None)
                await pg.keyboard.press("Escape"); await pg.wait_for_timeout(500)
                if await pg.locator("#ebene-huelle .ebene-blatt").count(): await pg.click('#ebene-huelle [data-a="blatt-zu"] >> nth=0', force=True); await pg.wait_for_timeout(400)
                # Büro-Start (Haltung „warten“: beim Ankommen keine Folge)
                await los(); await nav_hilfe.geh(pg, "buero"); await pruefe("buero-start", 1)  # im Büro läuft die Leerlauf-Folge warten (einmal)
                # Personal-Start
                await schnellstart.code_setzen(pg, "1234"); await nav_hilfe.geh(pg, "start"); await nav_hilfe.menue(pg)
                await los(); await pg.click('#ebene-huelle [data-a="modus"][data-wert="personal"]'); await pg.wait_for_selector(".riesenkachel"); await pruefe("personal-start", 1)
                await ctx.close()

                # Führung (erster Besuch): neuer Kontext, Stand ohne Merkzeichen, Neuladen
                ctx = await b.new_context(viewport={"width": 390, "height": 844}, device_scale_factor=1, is_mobile=True, has_touch=True, locale="de-DE", reduced_motion="reduce" if reduziert else "no-preference")
                await ctx.add_init_script(path=str(pathlib.Path(__file__).resolve().parent / "hilfe" / "aufklappen.js")); await ctx.add_init_script(OHNE_SW); await ctx.add_init_script(LAEUFER)
                pg = await ctx.new_page(); pg.on("pageerror", lambda e: fehler.append(str(e)))
                await schnellstart.schnellstart(pg, PORT)
                await pg.evaluate(GERICHTE); await pg.reload(); await pg.wait_for_selector(".rg-huelle", timeout=10000)
                m = await pruefe("fuehrung", None)   # Zeki tritt vor: auftreten, dann Zeigen (nacheinander)
                if m["figuren"] != 1: befund.append(f"[{modus}] fuehrung: erwartet genau 1 Zeki, sichtbar {m['figuren']}")
                await pg.click('.rg-huelle [data-rk="weiter"]'); await los(); await pg.wait_for_timeout(300)
                m = await pruefe("fuehrung-station-2", None)
                await nav_hilfe.rundgang_weg(pg)
                # aus dem alten tests/zeki_browser.py übernommen (Puppe gibt es nicht mehr): die Folgen laufen bis zum Ende und räumen auf; bei „Bewegung reduzieren“ läuft keine
                r = await pg.evaluate("""async (reduziert) => {
                  const z = await import('./js/zeki_figur.js'); const aus = [];
                  for (const name of ['nicken', 'kopfschuetteln', 'zeigen-rechts', 'zeigen-oben', 'pruefen']) {
                    const h = document.createElement('div'); h.innerHTML = z.vornHtml({ miene: 'neutral' }); document.body.appendChild(h);
                    const lauf = z.zekiSpielen(h.querySelector('[data-zeki-vorn]'), name);
                    if (!lauf) { aus.push(name + ':null'); h.remove(); continue; }
                    const ende = await Promise.race([lauf.fertig, new Promise((r) => setTimeout(() => r('zeit'), 6000))]);
                    aus.push(name + ':' + ende + ':' + [...h.querySelectorAll('.gc-zeki-folge')].filter((o) => getComputedStyle(o).display !== 'none').length); h.remove();
                  }
                  return aus;
                }""", reduziert)
                if reduziert: 
                    if not all(x.endswith(':null') for x in r): befund.append(f"[{modus}] Folgen laufen trotz „Bewegung reduzieren“: {r}")
                elif not all(x.split(':')[1] == 'ende' and x.split(':')[2] == '0' for x in r): befund.append(f"[{modus}] Folge endet nicht von selbst: {r}")
                print(f"[{modus}] Folgen einzeln: {r}", flush=True)
                await ctx.close()
            await b.close()
    finally: srv.terminate()
    if fehler: befund += ["JS-Fehler: " + f[:150] for f in fehler[:5]]
    print("\n".join(befund) if befund else "ZEKI NEU OK")
    sys.exit(1 if befund else 0)

asyncio.run(main())
