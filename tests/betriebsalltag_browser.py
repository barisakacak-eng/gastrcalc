"""Mission 2: zwei fiktive Arbeitstage, L3-Schritte, bestätigte Daten und echte Offline-Neustarts.
Der Webserver wechselt vom unveränderten PR-6-Stand zur Arbeitsfassung. Keine Kundendaten.
"""
import asyncio, http.server, io, pathlib, subprocess, tarfile, tempfile, threading
from playwright.async_api import async_playwright
import schnellstart, nav_hilfe
from work_integration_browser import kontext, tipp, layout, snapshot, DATEN, ZEIT

APP = schnellstart.APP
PORT = 8806
BASIS = '5de3a476f98fd10f14b40537a67d5cf29c13a174'

async def profil_kontext(browser, profil, fehler, offline=False):
    ctx=await browser.browser_type.launch_persistent_context(str(profil),headless=True,args=['--no-sandbox'],
        viewport={'width':390,'height':844},device_scale_factor=2,is_mobile=True,has_touch=True,
        locale='de-DE',timezone_id='Europe/Berlin',accept_downloads=True)
    await ctx.set_offline(offline)
    pg=ctx.pages[0] if ctx.pages else await ctx.new_page()
    await pg.clock.install(time=ZEIT)
    pg.on('pageerror',lambda e:fehler.append(str(e)))
    pg.on('console',lambda m:fehler.append(m.text) if m.type=='error' else None)
    pg.on('dialog',lambda d:asyncio.create_task(d.accept()))
    return ctx,pg

async def daten(pg):
    basis = await snapshot(pg)
    basis.update(await pg.evaluate("""() => {const s=window.__gastrocalc.stand;return {
      messungen:s.messungen,rundgaenge:s.rundgaenge,putzlog:s.putzlog,putzplan:s.putzplan,personen:s.personen
    }}"""))
    return basis

async def foto(pg):
    return await pg.evaluate("""async () => {const {holen}=await import('./js/ablage.js');
      const b=await holen(window.__gastrocalc.stand.gerichte[0].fotoMeta);
      return [...new Uint8Array(await crypto.subtle.digest('SHA-256',await b.arrayBuffer()))].join(',');}""")

async def l3_layout(pg, name):
    for w,h in ((390,844),(360,780)):
        await pg.set_viewport_size({'width':w,'height':h})
        await layout(pg,name,'.l3-laden button,.l3-laden input')
        # Wichtige Aktion erreichbar und kein Element unter der festen Navigation.
        main=pg.locator('.l3-laden .knopf').last
        if await main.count():
            await main.scroll_into_view_if_needed()
            box=await main.bounding_box();nav=pg.locator('.tableiste')
            limit=(await nav.bounding_box())['y'] if await nav.count() else h
            assert box['y']+box['height']<=limit+1,(name,box,limit)
    if name in ('leeres Messfeld mit langem türkischem Namen','de Maßnahme'):
        out=APP.parent/'audit'/'regeln';out.mkdir(parents=True,exist_ok=True)
        await pg.screenshot(path=str(out/('alltag_messfeld.png' if name.startswith('leeres') else 'alltag_massnahme.png')))

async def pilot(browser, art, alt, set_root, temp):
    set_root(alt);fehler=[];profil=temp/(art+'-profil');ctx,pg=await profil_kontext(browser,profil,fehler)
    try:
        await schnellstart.schnellstart(pg,PORT,name='BEISPIEL '+art)
        await pg.evaluate("""async a => {const g=window.__gastrocalc,s=g.stand;
          s.gerichte=a.gerichte;s.artikel=a.items;s.ladenArt=a.art==='burger'?'imbiss':'doener';s.betrieb.kuechen=[a.art];
          s.personen=[{id:'chef',kuerzel:'AA',aktiv:true},{id:'schicht',kuerzel:'BB',aktiv:true}];
          s.kuehlstellen[0].name='BEISPIEL Soğutucu – günlük hazırlanan ürünlerin uzun açıklaması';
          const {fehlendeRezepteErgaenzen}=await import('./js/rezept_baukasten.js');fehlendeRezepteErgaenzen(s);
          const {ablegen}=await import('./js/ablage.js'),{gerichtFotoSetzen}=await import('./js/karte_daten.js');
          const b=await (await fetch('foto/'+(a.art==='burger'?'g-burger':'g-doener')+'.webp')).blob();
          gerichtFotoSetzen(s,s.gerichte[0].id,await ablegen(b,{name:'BEISPIEL-eigen.webp',zweck:'gericht',laden:s.id}));
          const {sofortSpeichern}=await import('./js/store.js');await sofortSpeichern(g.wurzel);g.zeichne();
        }""",{'art':art,'gerichte':DATEN[art],'items':DATEN['items']})
        vorher=await daten(pg);bild=await foto(pg);print('BETRIEBSALLTAG_START',art,flush=True)
        # Tatsächliche alte App + alter Service Worker → neue Fassung über regulären Update-Knopf.
        set_root(APP)
        await pg.evaluate('navigator.serviceWorker.getRegistration().then(r=>r.update())')
        await pg.wait_for_selector('[data-a="aktualisieren"]',timeout=30000)
        await tipp(pg,'[data-a="aktualisieren"]');await pg.wait_for_selector('.heute-laden')
        await pg.wait_for_function('() => window.__gastrocalc && window.__gastrocalc.stand')
        assert await daten(pg)==vorher,(art,'Versionswechsel verändert Daten')
        assert await foto(pg)==bild;print('BETRIEBSALLTAG_UPDATE',art,'OK',flush=True)
        await nav_hilfe.geh(pg,'karte')
        await pg.wait_for_function("() => document.querySelector('.kl-gericht img[data-foto]')?.src.startsWith('blob:')")
        assert await pg.locator('.kl-nutzen').count()==4
        await nav_hilfe.geh(pg,'start');await tipp(pg,'.h-feld.umsatz')
        await pg.fill('[data-f="ul-umsatz"]','abc');await tipp(pg,'[data-a="ul-speichern"]')
        assert not await pg.evaluate('window.__gastrocalc.stand.tagesnotizen.length')
        await pg.fill('[data-f="ul-umsatz"]','820');await tipp(pg,'[data-a="ul-speichern"]')
        await nav_hilfe.geh(pg,'muell');await tipp(pg,'[data-a="muell-station-auf"]')
        await tipp(pg,pg.locator('[data-a="muell-tipp"]').first)
        await tipp(pg,'[data-a="muell1-zurueck"]')
        assert await pg.evaluate('window.__gastrocalc.stand.schwund.filter(x=>!x.storniert).length')==0
        await tipp(pg,pg.locator('[data-a="muell-tipp"]').first);await tipp(pg,'[data-a="muell-station-zu"]')
        # Wareneinsatz aus vorhandenem Rezept, Gebinde zählen statt nochmals Zutatenmengen tippen.
        await nav_hilfe.geh(pg,'inventur');await tipp(pg,'[data-a="inv-start"]')
        await tipp(pg,pg.locator('[data-a="inv-d"][data-d="1"]').first)
        await tipp(pg,'[data-a="inv-pause"]');await tipp(pg,'[data-a="inv-liste"]')
        await tipp(pg,'[data-a="inv-fertig"]')
        assert await pg.evaluate('window.__gastrocalc.stand.inventuren.some(x=>x.abgeschlossen)')
        await nav_hilfe.geh(pg,'kuehl');await tipp(pg,'[data-a="kuehl-rundgang-los"]')
        await l3_layout(pg,'leeres Messfeld mit langem türkischem Namen')
        assert await pg.locator('[data-a="station-speichern"]').is_disabled()
        await pg.fill('[data-f="station-wert"]','abc')
        assert await pg.locator('[data-a="station-speichern"]').is_disabled()
        await pg.fill('[data-f="station-wert"]','4')
        # Ein unbestätigter Wert wird beim Neustart nicht zur Messung.
        await pg.reload();await pg.wait_for_selector('.heute-laden')
        await nav_hilfe.geh(pg,'kuehl');await tipp(pg,'[data-a="kuehl-rundgang-los"]')
        assert await pg.input_value('[data-f="station-wert"]')==''
        await pg.fill('[data-f="station-wert"]','4');await tipp(pg,'[data-a="station-speichern"]')
        assert await pg.evaluate('window.__gastrocalc.stand.rundgaenge.find(x=>!x.abgeschlossen).messungen.length')==1
        # Gesamten Browser schließen, Profil wieder öffnen und VOR dem Start offline schalten.
        await ctx.close();ctx,pg=await profil_kontext(browser,profil,fehler,offline=True)
        await pg.goto(f'http://127.0.0.1:{PORT}/index.html');await pg.wait_for_selector('.heute-laden')
        await nav_hilfe.geh(pg,'kuehl');await tipp(pg,'[data-a="kuehl-rundgang-los"]')
        assert await pg.locator('.l3-kopf h1').inner_text()=='Tiefkühler'
        await pg.fill('[data-f="station-wert"]','-20');await tipp(pg,'[data-a="station-speichern"]')
        assert await pg.evaluate('window.__gastrocalc.stand.messungen.length')==2
        # DE/TR/EN, jede neue L3-Unterseite auf beiden Handygrößen, echte Nachkontrolle.
        for lang in ('de','tr','en'):
            await nav_hilfe.geh(pg,'einstellungen');await tipp(pg,f'[data-a="sprache"][data-wert="{lang}"]')
            await nav_hilfe.geh(pg,'kuehl');await tipp(pg,'[data-a="kuehl-einzel"]')
            await pg.fill('[data-f="station-wert"]','12');await tipp(pg,'[data-a="l3-weiter"]')
            await l3_layout(pg,lang+' Maßnahme');await tipp(pg,'[data-a="l3-mass-seite"]')
            await tipp(pg,'[data-a="massnahme"][data-wert="weggeworfen"]');await tipp(pg,'[data-a="l3-weiter"]')
            await l3_layout(pg,lang+' Ware');await tipp(pg,'[data-a="weg-alles"]');await tipp(pg,'[data-a="l3-weiter"]')
            await l3_layout(pg,lang+' Nachkontrolle');await tipp(pg,'[data-a="l3-zurueck"]')
            assert await pg.locator('[data-f="weg-name"]').count()==1
            await tipp(pg,'[data-a="l3-weiter"]');await tipp(pg,'[data-a="station-speichern"]')
            await tipp(pg,'[data-a="kuehl-einzel"]');await pg.fill('[data-f="station-wert"]','4')
            await tipp(pg,'[data-a="station-speichern"]')
            assert await pg.evaluate("import('./js/engine.js').then(m=>m.offeneNachkontrollen(window.__gastrocalc.stand).length)")==0
            print('BETRIEBSALLTAG_L3',art,lang,'390/360 OK',flush=True)
        await nav_hilfe.geh(pg,'einstellungen');await tipp(pg,'[data-a="sprache"][data-wert="de"]')
        await nav_hilfe.geh(pg,'putzplan');await tipp(pg,'[data-a="pp-wer"][data-id="schicht"]')
        ziel=pg.locator('[data-a="pp-haken"]').first;ident=await ziel.get_attribute('data-id')
        await tipp(pg,ziel);assert await pg.evaluate('window.__gastrocalc.stand.putzlog.at(-1).von')=='schicht'
        await tipp(pg,f'[data-a="pp-haken"][data-id="{ident}"]')
        assert await pg.locator(f'[data-a="pp-haken"][data-id="{ident}"]').get_attribute('aria-pressed')=='false'
        await tipp(pg,f'[data-a="pp-haken"][data-id="{ident}"]')
        await nav_hilfe.geh(pg,'abschluss');await tipp(pg,'[data-a="abschluss-fertig"]');await pg.wait_for_selector('.ab-bilanz')
        await nav_hilfe.geh(pg,'einstellungen');await tipp(pg,'.b-sicherung-link')
        async with pg.expect_download() as info:
            await tipp(pg,'[data-a="export"]');await tipp(pg,'[data-a="sicherung-pw-schalter"]');await tipp(pg,'[data-a="sicherung-teilen"]')
        download=await info.value;path=temp/(art+'.zip');await download.save_as(path)
        await tipp(pg,'[data-a="sicherung-ort"][data-wert="handy"]')
        vorher=await daten(pg)
        await pg.set_input_files('[data-f="import"]',{'name':'beschaedigt.zip','mimeType':'application/zip','buffer':path.read_bytes()[:100]})
        await pg.wait_for_selector('.meldung.da');assert await daten(pg)==vorher
        errs=[];restored,pr=await kontext(browser,errs)
        try:
            await pr.goto(f'http://127.0.0.1:{PORT}/index.html')
            await pr.wait_for_selector('[data-f="import"]',state='attached');await pr.set_input_files('[data-f="import"]',str(path))
            await pr.wait_for_selector('.heute-laden');assert await daten(pr)==vorher;assert await foto(pr)==bild
            await nav_hilfe.geh(pr,'karte');await pr.wait_for_function("() => document.querySelector('.kl-gericht img[data-foto]')?.src.startsWith('blob:')")
            assert not errs,errs
        finally:await restored.close()
        assert not fehler,fehler
        print('BETRIEBSALLTAG',art,'Versionswechsel, Arbeitstag, Offline-Neustart, ZIP mit eigenem Foto OK',flush=True)
    except Exception:
        out=APP.parent/'audit'/'regeln';out.mkdir(parents=True,exist_ok=True)
        if not pg.is_closed():
            await pg.screenshot(path=str(out/('betriebsalltag_fehler_'+art+'.png')),full_page=True)
            (out/('betriebsalltag_fehler_'+art+'.txt')).write_text(await pg.locator('body').inner_text())
        raise
    finally:await ctx.close()

async def main():
    with tempfile.TemporaryDirectory(prefix='gastrcalc-alltag-') as d:
        temp=pathlib.Path(d);alt=temp/'vorher';alt.mkdir()
        archiv=subprocess.check_output(['git','archive',BASIS],cwd=APP)
        with tarfile.open(fileobj=io.BytesIO(archiv)) as tar:tar.extractall(alt,filter='data')
        root=[alt]
        class Handler(http.server.SimpleHTTPRequestHandler):
            def __init__(self,*a,**kw):super().__init__(*a,directory=str(root[0]),**kw)
            def log_message(self,*a):pass
        server=http.server.ThreadingHTTPServer(('127.0.0.1',PORT),Handler)
        threading.Thread(target=server.serve_forever,daemon=True).start()
        try:
            async with async_playwright() as pw:
                browser=await pw.chromium.launch(headless=True,args=['--no-sandbox'])
                try:
                    for art in ('doener','burger'):await pilot(browser,art,alt,lambda p:root.__setitem__(0,p),temp)
                finally:await browser.close()
        finally:server.shutdown();server.server_close()

if __name__=='__main__':asyncio.run(main())
