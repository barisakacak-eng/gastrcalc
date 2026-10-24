"""Reproduzierbare PR-Bilder/GIFs und App-Icons aus der unveränderten Referenz.
Braucht nur die ohnehin für Browser-Prüfungen verwendeten Werkzeuge Playwright und ffmpeg.
Keine App-Logik, keine Bildsynthese, kein Canvas. Nur Browser-Aufnahmen.
"""
import asyncio, os, pathlib, subprocess, tempfile
from playwright.async_api import async_playwright
ROOT = pathlib.Path(__file__).resolve().parent.parent
PORT = 8810

async def main():
 srv = subprocess.Popen(['python3','-m','http.server',str(PORT),'--bind','127.0.0.1'],cwd=ROOT,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
 try:
  async with async_playwright() as p:
   b = await p.chromium.launch()
   pg = await b.new_page(viewport={'width':1120,'height':1100},device_scale_factor=1)
   await pg.goto(f'http://127.0.0.1:{PORT}/design/zeki-abnahme.html');await pg.wait_for_selector('#live .zeki')
   await pg.screenshot(path=str(ROOT/'design/zeki-abnahme.png'),full_page=True)
   await pg.locator('#comparison').screenshot(path=str(ROOT/'design/zeki-vergleich.png'))
   out=ROOT/'design/zeki-animationen';out.mkdir(exist_ok=True)
   for motion,duration in [('zwinkern',.7),('grinsen',1),('hand',1.2),('nicken',1),('kopfschuetteln',1),('atmen',3.6)]:
    await pg.evaluate('(m)=>{window.zekiAbnahme.spielen("none");document.querySelector("#live svg").classList.add("zeki--"+m);for(const a of document.querySelector("#live svg").getAnimations({subtree:true}))a.pause();}',motion)
    with tempfile.TemporaryDirectory(prefix='zeki-') as d:
     frames=max(2,round(duration*15))
     for i in range(frames+1):
      time=min(i/15,duration-.002)*1000
      await pg.evaluate('(ms)=>{for(const a of document.querySelector("#live svg").getAnimations({subtree:true}))a.currentTime=ms;}',time)
      await pg.locator('#live').screenshot(path=str(pathlib.Path(d)/f'{i:03}.png'),animations='allow')
     subprocess.run(['ffmpeg','-hide_banner','-loglevel','error','-y','-framerate','15','-i',d+'/%03d.png','-filter_complex','split[a][b];[a]palettegen=stats_mode=diff[p];[b][p]paletteuse=dither=bayer','-loop','0',str(out/(motion+'.gif'))],check=True)
    print('GIF:',motion,flush=True)
   # Die PWA-Icons bleiben ein exakter Ausschnitt der gelieferten App-Icon-Referenz.
   # Die Illustration im App-Icon hat bewusst die andere Komposition aus dem Original (ohne Füße).
   # Kein Austausch durch eine eigenständig neu gestaltete Icon-Figur.
   for name,size,mask in [('icon-180.png',180,False),('icon-192.png',192,False),('icon-512.png',512,False),('icon-maskable-512.png',512,True)]:
    inner=size*.8 if mask else size;offset=(size-inner)/2;scale=inner/538
    html=f'''<style>*{{box-sizing:border-box}}html,body{{margin:0;background:transparent}}#icon{{width:{size}px;height:{size}px;position:relative;overflow:hidden;background:#182519;border-radius:{0 if mask else size*.167}px}}.crop{{position:absolute;left:{offset}px;top:{offset}px;width:{inner}px;height:{inner}px;overflow:hidden;border-radius:{inner*.167}px}}img{{position:absolute;max-width:none;width:{2048*scale}px;height:{1143*scale}px;left:{-230*scale}px;top:{-442*scale}px}}</style><div id="icon"><div class="crop"><img src="http://127.0.0.1:{PORT}/design/referenz/zeki-brand-2026.jpeg"></div></div>'''
    await pg.set_content(html);await pg.locator('img').evaluate('(i)=>i.decode()')
    await pg.locator('#icon').screenshot(path=str(ROOT/'icons'/name),omit_background=True)
    print('Icon:',name,flush=True)
   await b.close()
 finally:srv.terminate()

asyncio.run(main())
