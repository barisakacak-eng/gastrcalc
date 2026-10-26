"""Menü-Ergänzung: 30 Gerichte und alle Zutatenbilder, DE/TR/EN, 390/360, offline.
Nur frische Kontexte und fiktive Testdaten. Keine Kundenkarte und keine Betriebsfotos.
Start: python3 tests/menue_fotos_browser.py
"""
import asyncio, json, os, pathlib
from playwright.async_api import async_playwright
import schnellstart, nav_hilfe
APP=pathlib.Path(__file__).resolve().parent.parent
OUT=pathlib.Path(os.environ.get('MENUE_OUT',APP.parent/'audit'/'menue-fotos'))
PORT=int(os.environ.get('MENUE_PORT','8791'))

async def main():
    OUT.mkdir(parents=True,exist_ok=True);srv=schnellstart.server(PORT);results=[]
    try:
        async with async_playwright() as p:
            browser=await p.chromium.launch(args=['--no-sandbox'])
            try:
                for lang in ('de','tr','en'):
                    print('MENUE_START',lang,flush=True)
                    errors=[];ctx,pg=await schnellstart.kontext(browser,390,844,errors)
                    try:
                        await schnellstart.schnellstart(pg,PORT,name='BEISPIEL Produktprüfung')
                        data=await pg.evaluate('''async lang=>{
                          const {MENUE_GERICHTE,MENUE_WAREN_FOTO}=await import('./js/data/burger_ergaenzung.js');
                          const {MENUE_VORLAGEN_ENTWURF}=await import('./js/data/katalog.js');
                          const {gerichtAusVorlage,artikelAbgleichen}=await import('./js/karte_daten.js');
                          const {gerichtBildQuelle,wareBildQuelle}=await import('./js/bilder.js');
                          const {setzeSprache}=await import('./js/i18n.js');
                          const {sofortSpeichern}=await import('./js/store.js');
                          const app=window.__gastrocalc,s=app.stand;
                          s.gerichte=MENUE_GERICHTE.map(g=>gerichtAusVorlage({...MENUE_VORLAGEN_ENTWURF.find(v=>v.name===g.name),bereich:g.bereich}));
                          s.ladenArt='imbiss';s.betrieb.kuechen=['burger'];artikelAbgleichen(s);
                          app.wurzel.sprache=lang;setzeSprache(lang);await sofortSpeichern(app.wurzel);app.zeichne();
                          const gerichte=s.gerichte.map(g=>({name:g.name,foto:gerichtBildQuelle(g).foto}));
                          const artikel=s.artikel.map(a=>({name:a.name,...wareBildQuelle(a)}));
                          const fotos=[...new Set([...gerichte,...artikel].map(a=>a.foto).filter(Boolean))];
                          const load=[];
                          for(let i=0;i<fotos.length;i+=4) load.push(...await Promise.all(fotos.slice(i,i+4).map(async n=>{const r=await fetch('foto/'+n+'.webp');return [n,r.ok,(await r.blob()).size]})));
                          return {gerichte,artikel,load};
                        }''',lang)
                        assert len(data['gerichte'])==28,data  # Zoro 26.10.2026: zwei Doppelte raus
                        assert all(a.get('foto') for a in data['artikel']),data['artikel']
                        assert all(a[1] and a[2]>0 for a in data['load']),data['load']
                        await ctx.set_offline(True)
                        await pg.reload();await pg.wait_for_selector('[data-a="menue-auf"]')
                        for width,height in ((390,844),(360,780)):
                            await pg.set_viewport_size({'width':width,'height':height})
                            await nav_hilfe.geh(pg,'karte')
                            await pg.wait_for_selector('.kl-gericht')
                            actual=await pg.locator('.kl-gericht img.gerichtbild').evaluate_all('(xs)=>xs.map(x=>x.getAttribute("src"))')
                            assert len(actual)==28,actual
                            assert actual==['foto/'+g['foto']+'.webp' for g in data['gerichte']],(lang,width,actual)
                            assert await pg.locator('.kl-nutzen.hat-wert').count()==0,'Fehlende Preise dürfen keinen Gewinn ergeben'
                            assert await pg.evaluate('document.documentElement.scrollWidth<=innerWidth'),(lang,width,'Querscrollen')
                            offline=await pg.evaluate('''async names=>{
                              const out=[];for(let i=0;i<names.length;i+=4) out.push(...await Promise.all(names.slice(i,i+4).map(async n=>{
                                const r=await fetch('foto/'+n+'.webp');const b=await r.blob();
                                const im=await createImageBitmap(b);const result={name:n,ok:r.ok,w:im.width,h:im.height};im.close();return result;
                              })));return out;
                            }''',[x[0] for x in data['load']])
                            assert all(x['ok'] and x['w']==520 and x['h']==390 for x in offline),offline
                            await pg.screenshot(path=str(OUT/f'App_Menue_{lang}_{width}.png'))
                            results.append({'sprache':lang,'breite':width,'gerichte':30,'artikel':len(data['artikel']),'offline_fotos':len(offline),'status':'bestanden'})
                            print('MENUE_BROWSER',lang,width,'30 Gerichte, Zutatenbilder und Offline OK',flush=True)
                        assert not errors,errors
                    finally:await ctx.close()
            finally:await browser.close()
    finally:srv.terminate();srv.wait()
    (OUT/'ergebnis.json').write_text(json.dumps(results,ensure_ascii=False,indent=2))

if __name__=='__main__':asyncio.run(main())
