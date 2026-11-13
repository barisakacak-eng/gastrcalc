# Baut das ganze Zeki-Paket aus rig.py + bewegungen.py. Ausgabe: /home/claude/zeki_paket/
import os, re, json, base64, subprocess, shutil, io
from PIL import Image
import rig, bewegungen as B
AUS='/home/claude/zeki_paket'; shutil.rmtree(AUS,ignore_errors=True)
for d in ['assets/brand/zeki','assets/brand/zeki-klein','assets/brand/zeki-buehne','assets/brand/zeki-mienen','design','quelle']: os.makedirs(AUS+'/'+d)
VB='-80 -45 420 521.71875'; ZW,ZH=512,636
def render(html,png,w,h,tr='1'):
    open('tmp.html','w').write(html); subprocess.run(['node','render.js','tmp.html',png,str(w),str(h),tr],check=True)
def svg(inner,w,h,vb=VB,stil=''): return '<svg xmlns="http://www.w3.org/2000/svg" width="%d" height="%d" viewBox="%s" style="display:block;%s">%s</svg>'%(w,h,vb,stil,inner)
KOPF='<!doctype html><body style="margin:0;background:transparent">'
ablauf=[]
# 1 Bewegungen
for name,(f,dauer,miene) in B.BEWEGUNGEN.items():
    zellen=''.join(svg(rig.figur(f(i))[0],ZW,ZH,stil='float:left') for i in range(25))
    render(KOPF+'<div style="width:%dpx">%s</div>'%(ZW*5,zellen),'tmp.png',ZW*5,ZH*5)
    im=Image.open('tmp.png').convert('RGBA'); assert im.size==(2560,3180)
    im.save('%s/assets/brand/zeki/%s.webp'%(AUS,name),'WEBP',quality=86,method=6)
    im.resize((1280,1590),Image.LANCZOS).save('%s/assets/brand/zeki-klein/%s.webp'%(AUS,name),'WEBP',quality=84,method=6)
    im.save('quelle_%s.png'%name)
    ablauf.append(dict(name=name,datei=name+'.webp',raster=[5,5],bilder=25,zelle=[ZW,ZH],zelle_klein=[256,318],dauer_ms=dauer,miene=miene,registrierung_viewBox=[-80,-45,420,521.71875],
        endet_in_ruhe=name!='abgehen',beginnt_in_ruhe=name!='auftreten',schleife=name=='warten'))
    print(name,flush=True)
json.dump(ablauf,open(AUS+'/assets/brand/zeki/ablauf.json','w'),indent=1,ensure_ascii=False)
# 2 Bühne (Hüfte aufwärts, Schnitt y 245)
zu=[]
for bauart,(bew,bild,miene) in B.BUEHNE.items():
    render(KOPF+svg(rig.figur(B.haltung(bauart))[0],512,354,vb='-80 -45 420 290.390625'),'tmp.png',512,354)
    im=Image.open('tmp.png').convert('RGBA'); p='%s/assets/brand/zeki-buehne/%s.webp'%(AUS,bauart); im.save(p,'WEBP',quality=88,method=6)
    zu.append(dict(ansicht=bauart,haltung=bew,miene=miene,datei='assets/brand/zeki-buehne/%s.webp'%bauart,masse=[512,354],schnitt_y=245,bytes=os.path.getsize(p)))
json.dump(zu,open(AUS+'/assets/brand/zeki-buehne/zuordnung.json','w'),indent=1,ensure_ascii=False)
# 3 Mienen (ganze Figur, Ruhe)
for m in rig.MIENEN:
    render(KOPF+svg(rig.figur(dict(miene=m))[0],ZW,ZH),'tmp.png',ZW,ZH)
    Image.open('tmp.png').convert('RGBA').save('%s/assets/brand/zeki-mienen/zeki-%s.webp'%(AUS,m),'WEBP',quality=90,method=6)
# 4 Grundfigur als eine SVG-Datei mit eingebetteten Teilen und allen Mienen
def einbetten(s):
    def r(mo):
        b=base64.b64encode(open(mo.group(1),'rb').read()).decode(); return 'href="data:image/png;base64,%s"'%b
    return re.sub(r'href="(teile/[a-z_]+\.png)"',r,s)
fig=rig.figur({})[0]
neutral=rig.gesicht('neutral')
varianten=''.join('<g class="zeki-variante" data-variante="%s">%s</g>'%(m, rig.gesicht(m) if m=='neutral' else re.sub(r' id="[^"]+"','',rig.gesicht(m))) for m in rig.MIENEN)
fig=fig.replace(neutral,varianten)
css=('.zeki-variante{opacity:0}'+''.join('svg[data-zeki-zustand="%s"] .zeki-variante[data-variante="%s"]{opacity:1}'%(m,m) for m in rig.MIENEN)
     +'svg:not([data-zeki-zustand]) .zeki-variante[data-variante="neutral"]{opacity:1}')
master='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 237 328" overflow="visible" role="img" aria-label="Zeki" data-zeki-zustand="neutral"><style>%s</style>%s</svg>'%(css,einbetten(fig))
open(AUS+'/assets/brand/zeki.svg','w').write(master)
gel=dict(viewBox=[0,0,237,328],kopf=rig.HALS,schulter=rig.SCHULTER,auge_l=[rig.MX-rig.AUGE_DX,rig.AUGE_Y],auge_r=[rig.MX+rig.AUGE_DX,rig.AUGE_Y],mund=[rig.MX,rig.MUND_Y],buehne_schnitt_y=245,
    figur_oben=8,figur_unten=318,filmfenster=[-80,-45,420,521.71875],mienen=list(rig.MIENEN))
json.dump(gel,open(AUS+'/assets/brand/zeki-gelenke.json','w'),indent=1)
for f in ['rig.py','bewegungen.py','teile.py','build.py','render.js']: shutil.copy(f,AUS+'/quelle/'+f)
shutil.copytree('teile',AUS+'/quelle/teile',ignore=shutil.ignore_patterns('*.jpg','helm_alt.png'))
print('fertig')
