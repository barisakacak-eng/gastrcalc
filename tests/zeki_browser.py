"""Zeki: echte Browser-Animationen, erneutes Tippen, Isolation und reduzierte Bewegung.
Start: python3 tests/zeki_browser.py. Kein echter iPhone-Test.
"""
import asyncio, os, pathlib, sys
from playwright.async_api import async_playwright
import schnellstart
PORT = int(os.environ.get('ZEKI_PORT', '8808'))
ROOT = schnellstart.APP

async def main():
 srv = schnellstart.server(PORT)
 try:
  async with async_playwright() as p:
   b = await p.chromium.launch()
   ctx = await b.new_context(viewport={'width':390,'height':844},is_mobile=True,has_touch=True)
   pg = await ctx.new_page();errors=[];pg.on('pageerror',lambda e:errors.append(str(e)))
   await pg.goto(f'http://127.0.0.1:{PORT}/design/zeki-abnahme.html');await pg.wait_for_selector('#live .zeki')
   # Jede einmalige Bewegung läuft tatsächlich und ihre Klasse wird nach dem Ende entfernt.
   for motion in ['zwinkern','grinsen','hand','nicken','kopfschuetteln']:
    await pg.evaluate('(m)=>window.zekiAbnahme.spielen(m)',motion)
    await pg.wait_for_timeout(80)
    animations=await pg.locator('#live > svg').evaluate('(e)=>e.getAnimations({subtree:true}).map(a=>({name:a.animationName,state:a.playState,frames:a.effect.getKeyframes()}))')
    assert animations,(motion,'keine Animation')
    assert any(a['state']=='running' for a in animations),(motion,animations)
    assert all('transform' in f or 'opacity' in f for a in animations for f in a['frames']),(motion,animations)
    await pg.wait_for_timeout(1250)
    assert not await pg.locator('#live > svg').evaluate('(e)=>[...e.classList].some(x=>["zeki--zwinkern","zeki--grinsen","zeki--hand","zeki--nicken","zeki--kopfschuetteln"].includes(x))'),motion
   # Atmen ist die einzige Endlosschleife; eine andere Bewegung ersetzt sie.
   await pg.evaluate('window.zekiAbnahme.spielen("atmen")')
   assert await pg.locator('#live > svg').evaluate('(e)=>e.getAnimations({subtree:true}).some(a=>a.effect.getTiming().iterations===Infinity)')
   await pg.evaluate('async()=>{const {zekiSpielen}=await import("../js/gastrocash-brand.js");const e=document.querySelector("#live");zekiSpielen(e,"hand");zekiSpielen(e,"hand");}')
   await pg.wait_for_timeout(80)
   assert await pg.locator('#live > svg').evaluate('(e)=>e.classList.contains("zeki--hand")&&!e.classList.contains("zeki--atmen")')
   await pg.wait_for_timeout(1300)
   assert await pg.locator('#live > svg').evaluate('(e)=>!e.classList.contains("zeki--hand")')
   # Zwei Figuren: kein doppeltes ID, kein Übergreifen der Bewegung.
   await pg.evaluate('async()=>{const {mascotMarkup,zekiSpielen}=await import("../js/gastrocash-brand.js");document.querySelector("#live").innerHTML=mascotMarkup()+mascotMarkup("warnung");zekiSpielen(document.querySelector("#live > svg"),"nicken");}')
   assert await pg.locator('#live').evaluate('(e)=>{const ids=[...e.querySelectorAll("[id]")].map(x=>x.id);return ids.length===new Set(ids).size;}')
   assert await pg.locator('#live > svg').nth(1).evaluate('(e)=>e.getAnimations({subtree:true}).length===0')
   await pg.emulate_media(reduced_motion='reduce')
   for motion in ['zwinkern','grinsen','hand','nicken','kopfschuetteln','atmen']:
    await pg.evaluate('(m)=>window.zekiAbnahme.spielen(m)',motion)
    assert await pg.locator('#live > svg').evaluate('(e)=>e.getAnimations({subtree:true}).length===0'),motion
   for motion,part in [('zwinkern','lid-r'),('grinsen','mund-grinsen')]:
    await pg.evaluate('(m)=>window.zekiAbnahme.spielen(m)',motion)
    opacity=await pg.locator(f'#live [data-zeki-teil="{part}"]').evaluate('(e)=>getComputedStyle(e).opacity')
    assert opacity=='1',(motion,opacity)
   assert not errors,errors
   await ctx.close();await b.close()
   print('Zeki Browser: 6 Bewegungen, Neustart, Isolation und reduzierte Bewegung grün')
 finally:srv.terminate()

asyncio.run(main())
