"""GastroCash B: reale Köpfe, Hilfe, Mascot, L3/Personal, PWA; DE/TR/EN bei 390/360."""
import asyncio, pathlib
from playwright.async_api import async_playwright
import schnellstart, nav_hilfe
from work_integration_browser import kontext, tipp, layout

PORT=8807
async def geh(pg,ziel):
    if ziel in nav_hilfe.LADEN_TABS or ziel in nav_hilfe.BLATT:
        return await nav_hilfe.geh(pg,ziel)
    await nav_hilfe.ins_buero(pg)
    if await pg.locator('#ebene-huelle .blatt-pin').count():
        await schnellstart.code_tippen(pg,'1234')
        await pg.locator('#ebene-huelle .blatt-pin').wait_for(state='detached')
        await pg.wait_for_timeout(400)
    if ziel!='buero':await nav_hilfe._tipp(pg,f'#app [data-a="nav"][data-wert="{ziel}"]',420)

async def kopf(pg):
    b=pg.locator('.ebene-kopf .gc-brand')
    assert await b.count()==1
    assert await b.inner_text()=='GastroCash'
    assert await b.locator('.gc-bot[data-gc-state="neutral"]').count()==1
    assert await b.locator('.gc-bot-eyes circle').count()==2
    assert await b.evaluate('(e)=>e.scrollWidth<=e.clientWidth+1')
    await layout(pg,'GastroCash-Kopf')

async def hilfe(pg):
    await tipp(pg,'[data-a="hilfe-auf"]');await pg.wait_for_selector('.gc-help-bot')
    assert await pg.locator('.gc-help-bot .gc-bot-eyes circle').count()==2
    await layout(pg,'Hilfe','[data-a="blatt-zu"].knopf')
    await pg.emulate_media(reduced_motion='reduce')
    assert await pg.locator('.gc-help-bot .gc-bot-eyes').evaluate('(e)=>getComputedStyle(e).animationName')=='none'
    await tipp(pg,'.knopf[data-a="blatt-zu"]');await pg.emulate_media(reduced_motion='no-preference')

async def main():
    server=schnellstart.server(PORT);fehler=[]
    try:
        async with async_playwright() as pw:
            browser=await pw.chromium.launch(headless=True,args=['--no-sandbox'])
            ctx,pg=await kontext(browser,fehler)
            try:
                await schnellstart.schnellstart(pg,PORT,name='BEISPIEL GastroCash')
                await nav_hilfe.ins_buero(pg)
                await pg.evaluate(nav_hilfe.OEFFNEN,'[data-a="pin-setzen"]')
                await schnellstart.code_setzen(pg,'1234')
                await geh(pg,'start');await tipp(pg,'.h-feld.umsatz')
                await pg.fill('[data-f="ul-umsatz"]','820');await tipp(pg,'[data-a="ul-speichern"]')
                await geh(pg,'abschluss');await tipp(pg,'[data-a="abschluss-fertig"]')
                for lang in ('de','tr','en'):
                    await geh(pg,'einstellungen');await tipp(pg,f'[data-a="sprache"][data-wert="{lang}"]')
                    for width,height in ((390,844),(360,780)):
                        await pg.set_viewport_size({'width':width,'height':height})
                        for ziel in ('start','muell','karte','kuehl','abschluss'):
                            await geh(pg,ziel);await kopf(pg);await hilfe(pg)
                            if ziel=='abschluss':
                                bot=pg.locator('.gc-ab-mascot')
                                assert await bot.count()==1
                                assert await bot.locator('.gc-bot-eyes circle').count()==2
                                # Figur darf die tatsächliche Hauptzahl nicht verdecken.
                                a=await bot.bounding_box();z=await pg.locator('.ab-hero .riesig').bounding_box()
                                if z:assert a['x']+a['width']<=z['x'] or z['x']+z['width']<=a['x'] or a['y']+a['height']<=z['y'] or z['y']+z['height']<=a['y'],(a,z)
                        await geh(pg,'buero');await layout(pg,'Büro');await hilfe(pg)
                        await geh(pg,'start');await nav_hilfe.menue(pg)
                        await tipp(pg,'#ebene-huelle [data-a="modus"][data-wert="personal"]')
                        await pg.wait_for_selector('.riesenkachel');await kopf(pg)
                        assert '€' not in await pg.locator('#app').inner_text()
                        await tipp(pg,'[data-a="personal-ziel"][data-wert="kuehl"]')
                        await pg.go_back();await pg.wait_for_timeout(300)
                        if not await pg.locator('.riesenkachel').count():
                            await pg.go_back();await pg.wait_for_timeout(300)
                        assert await pg.locator('.riesenkachel').count()==3,'L3-Rückweg zum Personal-Start'
                        await tipp(pg,'[data-a="schloss"]');await schnellstart.code_tippen(pg,'1234')
                        await pg.wait_for_selector('.tableiste')
                        print('GASTROCASH_BROWSER',lang,f'{width}x{height}','Köpfe/Hilfe/Mascot/Personal OK',flush=True)
                pwa=await pg.evaluate("""async()=>{const r=await fetch('manifest.webmanifest'),m=await r.json();
                  const files=['icons/icon-180.png',...m.icons.map(i=>i.src),'assets/brand/gastrocash-logo.svg','assets/brand/mascot-classic.svg'];
                  return {name:m.name,files:await Promise.all(files.map(async p=>({p,status:(await fetch(p)).status}))),
                    caches:(await caches.keys()).filter(k=>/^gc-\\d/.test(k)),title:document.title};}""")
                assert pwa['name']=='GastroCash' and 'GastroCash' in pwa['title'],pwa
                assert all(x['status']==200 for x in pwa['files']) and len(pwa['caches'])==1,pwa
                cdp=await ctx.new_cdp_session(pg)
                install=await cdp.send('Page.getInstallabilityErrors')
                assert not install['installabilityErrors'],install
                assert not fehler,fehler
                print('GASTROCASH_PWA',pwa,'installierbar; HTTP/JS-Fehler: 0',flush=True)
            except Exception:
                out=schnellstart.APP.parent/'audit'/'regeln';out.mkdir(parents=True,exist_ok=True)
                await pg.screenshot(path=str(out/'gastrocash_fehler.png'),full_page=True)
                raise
            finally:await ctx.close();await browser.close()
    finally:server.terminate();server.wait()

if __name__=='__main__':asyncio.run(main())
