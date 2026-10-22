"""Work-Abnahme: beide fiktiven Piloten, DE/TR/EN, zwei Größen, echte Speicherung/ZIP/Offline.
Start: python3 tests/work_integration_browser.py. Ausschließlich frische Browser-Kontexte.
"""
import asyncio, datetime, json, os, pathlib, re, tempfile
from playwright.async_api import async_playwright
import schnellstart, nav_hilfe

PORT = int(os.environ.get("WORK_PORT", "8803"))
OUT = pathlib.Path(os.environ.get("WORK_OUT", schnellstart.APP.parent / "audit" / "regeln"))
DATEN = json.loads((schnellstart.APP / "tests/bilder/pilot/visuelle_testdaten_2026-10-22.json").read_text())
ZEIT = datetime.datetime(2026, 10, 22, 12, tzinfo=datetime.timezone.utc)

async def kontext(browser, fehler):
    # Absichtlich ohne die alte Testhilfe, die alle Büro-Ordner automatisch aufklappt.
    ctx = await browser.new_context(viewport={"width":390,"height":844}, device_scale_factor=2,
        is_mobile=True, has_touch=True, locale="de-DE", timezone_id="Europe/Berlin", accept_downloads=True)
    pg = await ctx.new_page()
    await pg.clock.install(time=ZEIT)
    pg.on("pageerror", lambda e: fehler.append(str(e)))
    pg.on("console", lambda m: fehler.append(m.text) if m.type == "error" else None)
    pg.on("dialog", lambda d: asyncio.create_task(d.accept()))
    return ctx, pg

async def tipp(pg, ziel):
    # Die App schützt doppelte Tipps zeitlich; der Test wartet wie ein Benutzer zwischen Handlungen.
    await pg.wait_for_timeout(220)
    await (pg.locator(ziel).first if isinstance(ziel,str) else ziel).click()
    await pg.wait_for_timeout(220)

async def layout(pg, label, controls=""):
    await pg.wait_for_timeout(90)
    m = await pg.evaluate("""sel => ({width:innerWidth, scroll:document.documentElement.scrollWidth,
      bad:[...document.querySelectorAll(sel || '[data-nicht-vorhanden]')].filter(e=>e.getClientRects().length && !e.disabled).map(e=>({
        text:e.innerText.slice(0,55), height:e.getBoundingClientRect().height,
        clipped:e.scrollWidth>e.clientWidth+1
      })).filter(x=>x.height<55.5 || x.clipped)})""", controls)
    assert m["scroll"] <= m["width"], (label, "Querscrollen", m)
    assert not m["bad"], (label, "Touchfläche/Text", m)

async def heute(pg, art):
    await nav_hilfe.geh(pg,"start")
    assert await pg.locator('.heute-laden.pilot-'+art).count()==1
    assert await pg.locator('.h-schaetzung').count()==1
    assert await pg.locator('.h-haupt').count()<=1
    # Sichtbare feste Wörter einschließlich der unteren Navigation. Geschäftsnamen/Datum und SVG-Zahlen sind Daten.
    words = await pg.evaluate(r"""() => {
      const w=document.createTreeWalker(document.querySelector('#app'),NodeFilter.SHOW_TEXT);let n;const out=[];
      while(n=w.nextNode()) {const p=n.parentElement;if(p.closest('.h-kopf,svg,script,style')||!p.getClientRects().length)continue;
        out.push(...(n.textContent.match(/\p{L}[\p{L}'’-]*/gu)||[]).filter(x=>!['€','kg','g','ml','l','°C'].includes(x)));}
      return out;
    }""")
    assert len(words)<=15,(art,"L1 Wortbudget mit Navigation",words)
    await layout(pg,"Heute",'.h-ziel,.h-feld,.h-haupt')
    cta=pg.locator('.h-haupt')
    if await cta.count():
        r=await cta.bounding_box(); nav=await pg.locator('.tableiste').bounding_box()
        assert r['y']+r['height']<=nav['y']+1,("Heute Hauptknopf verdeckt",r,nav)

async def ordner(pg, art):
    await nav_hilfe.ins_buero(pg)
    assert await pg.locator('.b-bereich[open]').count()==0,"Büro-Bereiche müssen anfangs geschlossen sein"
    await layout(pg,"Büro",'.b-werkzeuge button,.b-ordnerkachel')
    for typ in ('amt','steuer','buch'):
        await tipp(pg,f'.b-ordnerkachel[data-wert="ordner-{typ}"]')
        await pg.wait_for_selector('.b-ordnerseite')
        await layout(pg,typ,'.b-unten button,.b-mini,.b-rund,.b-segment button')
        assert 'undefined' not in await pg.locator('.b-ordnerseite').inner_text()
        await tipp(pg,pg.locator('[data-a="ordner-vorschau"]'))
        await pg.wait_for_selector('.b-vorschau iframe')
        await layout(pg,typ+' Vorschau','.b-vorschau-leiste button')
        frame=pg.frame_locator('.b-vorschau iframe')
        assert (await frame.locator('body').inner_text()).strip(),"Leere Dokumentvorschau"
        await tipp(pg,'[data-a="ordner-vorschau-zu"]')
        # CSV ist ein bestehender, tatsächlich ausführbarer Exportweg.
        if typ=='buch':
            async with pg.expect_download() as info:
                await tipp(pg,pg.locator('.b-unten [data-a="ordner-csv"]'))
            download=await info.value
            assert pathlib.Path(await download.path()).stat().st_size>0
        await tipp(pg,'.ebene-kopf [data-wert="buero"]')

async def snapshot(pg):
    return await pg.evaluate("""async () => {
      // Verglichen werden die gespeicherten Fachdaten nach derselben Migration wie beim Laden.
      // Flüchtige Sitzungskennungen und ergänzte Schema-Standardwerte sind kein Datenverlust.
      const {migrierenBetrieb}=await import('./js/store.js');
      const s=migrierenBetrieb(window.__gastrocalc.stand);return {
      id:s.id,name:s.betrieb.name,gerichte:s.gerichte,artikel:s.artikel,
      schwund:s.schwund,tagesnotizen:s.tagesnotizen,inventuren:s.inventuren,abschluesse:s.abschluesse
    };}""")

async def pilot(browser, art, temp):
    fehler=[];ctx,pg=await kontext(browser,fehler)
    try:
        await schnellstart.schnellstart(pg,PORT,name="Beispielbetrieb")
        await pg.evaluate("""async a => {const g=window.__gastrocalc,s=g.stand;
          s.gerichte=a.gerichte;s.artikel=a.items;s.ladenArt=a.art==='burger'?'imbiss':'doener';
          s.betrieb.kuechen=[a.art];s.betrieb.name='BEISPIEL '+a.art;
          s.kosten=[{id:'test-miete',kategorie:'miete',posten:'miete',betrag:1600,status:'bekannt',periode:'monat',basis:'netto'}];
          const {fehlendeRezepteErgaenzen}=await import('./js/rezept_baukasten.js');
          fehlendeRezepteErgaenzen(s); // Dieselbe Familien-Zuordnung wie beim regulären App-Start.
          const {sofortSpeichern}=await import('./js/store.js');await sofortSpeichern(g.wurzel);g.zeichne();
        }""",{"art":art,"gerichte":DATEN[art],"items":DATEN['items']})
        await heute(pg,art)
        # Umsatz über den echten Eingabeweg speichern, dann echte Müllbuchung mit Rückgängig.
        await tipp(pg,'.h-feld.umsatz');await pg.fill('[data-f="ul-umsatz"]','820');await tipp(pg,'[data-a="ul-speichern"]')
        await pg.wait_for_selector('.heute-laden')
        await nav_hilfe.geh(pg,'muell');await tipp(pg,'[data-a="muell-station-auf"]')
        assert '€' not in await pg.locator('.muell-station').inner_text()
        assert await pg.locator('.tableiste').count()==0
        count=lambda:pg.evaluate('window.__gastrocalc.stand.schwund.filter(x=>!x.storniert).length')
        vorher=await count()
        await tipp(pg,pg.locator('.muell-station [data-a="muell-tipp"]').first)
        assert await count()==vorher+1
        await tipp(pg,'[data-a="muell1-zurueck"]');assert await count()==vorher
        await tipp(pg,pg.locator('.muell-station [data-a="muell-tipp"]').first)
        await tipp(pg,'[data-a="muell-station-zu"]')
        # Inventur wirklich zählen und pausieren, nicht nur den Einstieg ansehen.
        await nav_hilfe.geh(pg,'inventur');await tipp(pg,'[data-a="inv-start"]')
        await tipp(pg,pg.locator('[data-a="inv-d"][data-d="1"]').first)
        await tipp(pg,'[data-a="inv-pause"]')
        # Der bereits fertige Tagesabschluss wird benutzt, nicht neu gebaut.
        await nav_hilfe.geh(pg,'abschluss');await tipp(pg,'[data-a="abschluss-fertig"]')
        await pg.wait_for_selector('.ab-bilanz')
        for width,height in ((390,844),(360,780)):
            await pg.set_viewport_size({'width':width,'height':height})
            await layout(pg,'L6','.ab-zurueck')
        await nav_hilfe.geh(pg,'start')
        # Einstellungen → Sicherung ohne neue Route/Hash, echter ZIP-Download.
        await nav_hilfe.ins_buero(pg);await tipp(pg,'.b-werkzeuge [data-wert="einstellungen"]')
        await tipp(pg,'.b-sicherung-link')
        r=await pg.locator('#sicherung').bounding_box();assert 55<=r['y']<=100,r
        async with pg.expect_download() as info:
            await tipp(pg,'[data-a="export"]');await tipp(pg,'[data-a="sicherung-pw-schalter"]')
            await tipp(pg,'[data-a="sicherung-teilen"]')
        backup=await info.value;path=temp/(art+'.zip');await backup.save_as(path)
        assert path.stat().st_size>0
        await tipp(pg,'[data-a="sicherung-ort"][data-wert="handy"]')
        # Ungültiger Import: verständliche Meldung und kein verlorener Testzustand.
        before=await snapshot(pg)
        await pg.set_input_files('[data-f="import"]',{'name':'ungueltig.zip','mimeType':'application/zip','buffer':b'keine Sicherung'})
        await pg.wait_for_selector('.meldung.da');assert await snapshot(pg)==before
        # Frischer zweiter Browserkontext: Sicherung wiederherstellen, keine Löschung erforderlich.
        errors2=[];restored,pr=await kontext(browser,errors2)
        try:
            await pr.goto(f'http://127.0.0.1:{PORT}/index.html');await pr.wait_for_selector('[data-f="import"]',state='attached')
            await pr.set_input_files('[data-f="import"]',str(path));await pr.wait_for_selector('[data-a="menue-auf"]')
            after=await snapshot(pr)
            assert after==before, (art,'ZIP-Unterschiede',{k:{'vor':before[k],'nach':after[k]} for k in before if before[k]!=after[k]})
            assert not errors2,errors2
        finally:await restored.close()
        # Sprache über echte Einstellung wechseln. DE/TR/EN sind auch offline lokal vorhanden.
        print('WORK_SICHERUNG',art,'ZIP und ungültiger Import OK',flush=True)
        await ctx.set_offline(True);await pg.reload();await pg.wait_for_selector('.ebene-kopf')
        offline=await snapshot(pg)
        assert offline==before,(art,'Offline-Unterschiede',{k:{'vor':before[k],'nach':offline[k]} for k in before if before[k]!=offline[k]})
        for lang in ('de','tr','en'):
            await nav_hilfe.geh(pg,'einstellungen')
            if lang!='de':
                await tipp(pg,pg.locator(f'[data-a="sprache"][data-wert="{lang}"]'))
                await pg.wait_for_function('l=>document.documentElement.lang===l',arg=lang)
                await pg.wait_for_timeout(300)
            for width,height in ((390,844),(360,780)):
                await pg.set_viewport_size({'width':width,'height':height})
                await heute(pg,art)
                if lang=='de' and width==390:await pg.screenshot(path=str(OUT/f'work_heute_{art}.png'))
                await nav_hilfe.geh(pg,'karte')
                pics=await pg.locator('.kl-gericht img.gerichtbild').evaluate_all('(xs)=>xs.map(x=>({src:x.getAttribute("src"),ok:x.complete&&x.naturalWidth>0}))')
                assert len(pics)==4 and all(x['ok'] for x in pics),(art,lang,pics)
                expected={'doener':['g-doener','g-doener-teller','g-duerum','g-doener-box'],
                    'burger':['g-burger','g-cheeseburger','g-double-smash-burger','g-burger-menue']}[art]
                assert {x['src'] for x in pics}=={f'foto/{x}.webp' for x in expected}
                assert await pg.locator('.kl-nutzen').count()==4
                await layout(pg,'Karte')
                await ordner(pg,art)
                await tipp(pg,'.b-werkzeuge [data-wert="einstellungen"]')
                await layout(pg,'Einstellungen','.b-sicherung-link,.einstellungen-inhalt .knopf,.einstellungen-inhalt .zeileknopf,.einstellungen-inhalt .chip')
                await tipp(pg,'.b-sicherung-link')
                await tipp(pg,'.ebene-kopf [data-wert="buero"]')
                assert await pg.locator('.b-ordner').count()==1
                print('WORK_BROWSER',art,lang,f'{width}x{height}','OK',flush=True)
        assert not fehler,fehler
    finally:await ctx.close()

async def main():
    OUT.mkdir(parents=True,exist_ok=True);server=schnellstart.server(PORT)
    try:
        async with async_playwright() as pw:
            browser=await pw.chromium.launch(headless=True,args=['--no-sandbox'])
            try:
                with tempfile.TemporaryDirectory(prefix='gastrcalc-test-') as d:
                    for art in ('doener','burger'):await pilot(browser,art,pathlib.Path(d))
            finally:await browser.close()
    finally:server.terminate();server.wait()

if __name__=='__main__':asyncio.run(main())
