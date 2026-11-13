"""Euro-Zähler im wirklichen Heute-Bildschirm, nur isolierte fiktive Testdaten."""
import json

async def pruefe_nutzen(pg, art, lang, width, out, pruefe_heute):
    vorher = await pg.evaluate("""() => {
      const s=window.__gastrocalc.stand;
      return {schwund:s.schwund,abschluesse:s.abschluesse,nutzen:s.betrieb.nutzen??null};
    }""")
    snapshots={}
    try:
        for fall in ("ohne-beginn", "laeuft", "nur-geschaetzt", "gemessen", "null"):
            erwartung=await pg.evaluate("""async fall => {
              const {heuteGeschaeft}=await import('./js/util.js');
              const {nutzenStand}=await import('./js/nutzen.js');
              const {t}=await import('./js/i18n.js');
              const {datumLesbar}=await import('./js/anzeige_text.js');
              const s=window.__gastrocalc.stand,H=heuteGeschaeft();
              const tag=n=>{const d=new Date(H+'T12:00:00');d.setDate(d.getDate()+n);return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');};
              s.schwund=[];s.abschluesse=[];
              delete s.betrieb.nutzen;
              if(['gemessen','null'].includes(fall)) {
                for(let i=-20;i<=0;i++)s.schwund.push({id:'nutzen-test-'+i,datum:tag(i),art:'rohware',wert:fall==='null'||i < -6?10:2,storniert:false});
              } else if(fall!=='ohne-beginn')s.schwund=[{id:'nutzen-test',datum:tag(-4),art:'rohware',wert:10,storniert:false}];
              if(['nur-geschaetzt','gemessen'].includes(fall))s.betrieb.nutzen={papierMinutenVorher:120,stundensatz:30};
              const n=nutzenStand(s,H);window.__gastrocalc.zeichne();
              return {summe:n.summe,geschaetzt:n.geschaetzt,leer:n.leer,text:n.ab?t('nutzen.laueft',datumLesbar(n.ab)):t('nutzen.start')};
            }""",fall)
            await pruefe_heute()
            karte=pg.locator('.h-nutzen')
            if fall=='ohne-beginn':  # Baris 27.10.2026: ohne Messbeginn keine Karte mehr („Ab erstem Müll-Eintrag“ entfällt)
                await pg.wait_for_timeout(300); assert await karte.count()==0; continue
            await karte.wait_for()
            if erwartung['leer']:
                assert await karte.inner_text()==erwartung['text'],(fall,await karte.inner_text())
                assert '€' not in await karte.inner_text(),"Ohne Messung keine Nutzenzahl"
                assert await karte.locator('.h-nutzen-summe,.h-nutzen-posten').count()==0
            else:
                wert=await pg.evaluate("""async n=>{const{fmtEuro}=await import('./js/util.js');return fmtEuro(n,{dezimal:2})}""",erwartung['summe'])
                assert await karte.locator('.h-nutzen-summe').inner_text()==wert
                # Lauf 5 (L15b Standard, Baris 11.11.): im Laden nur Symbol und Summe – geschätzte Posten stehen nicht mehr im Laden
                assert await karte.locator('.h-nutzen-geschaetzt').count()==0
            # Neues Aussehen: Zekis Stimmung hängt nicht mehr am Nutzen (keine Puppe .gc-bot mehr); er steht als EIN Bild in der Bühne (Haltung je Tageszeit)
            assert await pg.locator('.zeki-knopf .gc-figur img.gc-zeki').count()==1 and await pg.locator('.gc-bot').count()==0
            assert await karte.locator('button,a,input').count()==0,"Nutzenkarte führt keine zweite Hauptaktion ein"
            grenzen=await karte.evaluate("""k=>({unten:k.getBoundingClientRect().bottom,nav:document.querySelector('.tableiste').getBoundingClientRect().top,scroll:document.documentElement.scrollHeight,viewport:innerHeight})""")
            assert grenzen['unten']<=grenzen['nav'] and grenzen['scroll']<=grenzen['viewport'],(fall,grenzen)
            if width==390:
                snapshots[fall]=await pg.locator('#app').inner_html()
            if fall=='gemessen':
                await pg.screenshot(path=str(out/f'nutzen_{art}_{lang}_{width}.png'))
        if width==390:
            (out/f'nutzen_{art}_{lang}_ansichten.json').write_text(json.dumps(snapshots,ensure_ascii=False))
        print('NUTZEN_BROWSER',art,lang,width,'5 Zustände OK',flush=True)
    finally:
        await pg.evaluate("""v=>{
          const s=window.__gastrocalc.stand;s.schwund=v.schwund;s.abschluesse=v.abschluesse;
          if(v.nutzen===null)delete s.betrieb.nutzen;else s.betrieb.nutzen=v.nutzen;
          window.__gastrocalc.zeichne();
        }""",vorher)
