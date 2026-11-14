"""Echte 3D-Ausgabe als lokale WebP-Folgen, jede unter 300 KB. Playwright/Pillow nur hier."""
import asyncio,base64,io,json,pathlib,subprocess,sys
from PIL import Image
from playwright.async_api import async_playwright
R=pathlib.Path(__file__).resolve().parent.parent;O=R/'assets/brand/zeki';O.mkdir(exist_ok=True)
async def main():
 srv=subprocess.Popen([sys.executable,'-m','http.server','8911','--bind','127.0.0.1'],cwd=R,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL);meta={}
 try:
  async with async_playwright() as p:
   b=await p.chromium.launch(args=['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']);pg=await b.new_page(viewport={'width':390,'height':844});await pg.goto('http://127.0.0.1:8911/design/zeki-3d/index.html');await pg.wait_for_function('window.zeki3D');await pg.evaluate('()=>{zeki3D.stop();document.body.innerHTML="<canvas id=export style=width:256px;height:318px></canvas>";window.output=new zeki3D.Zeki3D(document.querySelector("canvas"))}')
   motions=[('zwinkern','zwinkern','neutral',720),('grinsen','laecheln','freude',720),('hand','hand','hilfe',1200),('nicken','nicken','bestaetigt',1200),('kopfschuetteln','nein','fehler',1200),('pruefen','import','import',1200),('preis','preis','preis',1200)]
   for key,m,state,duration in motions:
    count=25;sheet=Image.new('RGBA',(1280,1590))
    for i in range(count):
     u=await pg.evaluate('a=>{output.render({...zeki3D.poseAt(a.m,a.t),state:a.s,halfY:172,transparent:true});return output.canvas.toDataURL()}',dict(m=m,t=i/24,s=state));im=Image.open(io.BytesIO(base64.b64decode(u.split(',')[1])));sheet.paste(im,(i%5*256,i//5*318))
    sheet.save(O/(key+'.webp'),'WEBP',quality=80,method=6);assert (O/(key+'.webp')).stat().st_size<300000
    meta[key]=dict(datei=key+'.webp',dauer=duration,state=state);print(key,(O/(key+'.webp')).stat().st_size,flush=True)
   await b.close()
 finally:srv.terminate()
 (R/'js/zeki-bilder.js').write_text('export const ZEKI_BILDER = '+json.dumps(meta)+';\n')
 with (R/'css/zeki.css').open('a') as f:
  for key in meta:f.write('@keyframes zeki3d-'+key+'{'+''.join(str(100*i/24)+'%{transform:translate('+str(-277*(i%5))+'px,'+str(-344*(i//5))+'px)}' for i in range(25))+'}\n')
  f.write('@media(prefers-reduced-motion:reduce){.zeki *{animation:none!important}.zeki--spielt [data-zeki-teil="zeki"]{opacity:1}.zeki--spielt [data-zeki-teil="bewegung"]{opacity:0}}\n')
asyncio.run(main())
