import asyncio,subprocess,sys,pathlib
from playwright.async_api import async_playwright
R=pathlib.Path(__file__).resolve().parent.parent
async def main():
 srv=subprocess.Popen([sys.executable,'-m','http.server','8920','--bind','127.0.0.1'],cwd=R,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
 try:
  async with async_playwright() as p:
   b=await p.chromium.launch();pg=await b.new_page(viewport={'width':390,'height':844},device_scale_factor=3);errors=[];pg.on('pageerror',lambda e:errors.append(str(e)));await pg.goto('http://127.0.0.1:8920/design/zeki-abnahme.html');await pg.wait_for_selector('#live svg');await pg.evaluate('()=>{document.querySelector("#live").style.position="fixed";document.querySelector("#live").style.inset="0"}')
   for m in ['zwinkern','grinsen','hand','nicken','kopfschuetteln','pruefen']:
    await pg.evaluate('async m=>{const x=await import("../js/gastrocash-brand.js");x.zekiSpielen(document.querySelector("#live"),m)}',m);await pg.wait_for_selector('.zeki--spielt',state='attached');await pg.wait_for_timeout(1400);assert await pg.locator('.zeki--spielt').count()==0,m
   await pg.emulate_media(reduced_motion='reduce');await pg.evaluate('async()=>{const x=await import("../js/gastrocash-brand.js");x.zekiSpielen(document.querySelector("#live"),"hand")}');assert await pg.locator('.zeki--spielt').count()==0;assert not errors,errors;await b.close();print('Sechs Bewegungen, Ende und reduzierte Bewegung in Chromium 390×844 DPR3 bestanden')
 finally:srv.terminate()
asyncio.run(main())
