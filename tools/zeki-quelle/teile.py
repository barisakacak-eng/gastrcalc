# Schritt 1: gemalte Teile aus Sanjis Atlas schneiden, Ränder säubern, Helm in die Form des Probeblatts bringen.
import numpy as np, cv2, json, os
SRC='/tmp/claude-0/-home-claude/4f62d415-ed38-506b-9c27-694709d0c6de/scratchpad/zk/teil0.png'
OUT='/home/claude/zeki_bau/teile'; os.makedirs(OUT,exist_ok=True)
A=cv2.imread(SRC,cv2.IMREAD_UNCHANGED).astype(np.float32)  # BGRA
def saeubern(im):
    a=im[:,:,3]/255.0
    hart=(a>0.92).astype(np.float32)
    # Farbe der sicheren Pixel nach außen tragen (kein gelber Saum)
    rgb=im[:,:,:3]*hart[:,:,None]; w=hart.copy()
    for _ in range(6):
        rgb=cv2.blur(rgb,(5,5)); w=cv2.blur(w,(5,5))
    aus=rgb/np.maximum(w[:,:,None],1e-4)
    neu=im.copy(); m=(hart<1)[:,:,None]
    neu[:,:,:3]=np.where(m,aus,im[:,:,:3])
    # Deckkraft: 1 px nach innen, weich
    a2=cv2.erode((a*255).astype(np.uint8),np.ones((3,3),np.uint8),iterations=2).astype(np.float32)
    a2=cv2.GaussianBlur(a2,(0,0),1.1); a2=np.clip((a2-40)*1.35,0,255)
    neu[:,:,3]=a2
    return neu
def schnitt(x0,y0,x1,y1): return saeubern(A[y0:y1,x0:x1].copy())
def bbox(im,th=60):
    m=im[:,:,3]>th; ys=np.where(m.any(1))[0]; xs=np.where(m.any(0))[0]; return int(xs[0]),int(ys[0]),int(xs[-1])+1,int(ys[-1])+1
def helm_formen(im,k=0.055,flach=0.06):
    h,w=im.shape[:2]; x0,y0,x1,y1=bbox(im)
    # Helm ohne Hals: Hals beginnt, wo die Breite stark einbricht
    br=(im[:,:,3]>60).sum(1); mitte=np.argmax(br); hals=mitte+np.argmax(br[mitte:]<0.45*br.max())
    H=hals-y0; cx=(x0+x1)/2
    yy,xx=np.mgrid[0:h,0:w].astype(np.float32)
    t=np.clip((yy-y0)/H,0,1)
    g=np.where(t<0.5,np.sin(np.pi*np.minimum(t,0.5)/0.5)**2,0)          # oben breiter: eckig-runde Kuppel
    f=1+k*g
    mapx=cx+(xx-cx)/f
    # Kuppel leicht flacher: obere Zeilen etwas stauchen
    mapy=yy.copy()
    out=cv2.remap(im,mapx.astype(np.float32),mapy.astype(np.float32),cv2.INTER_CUBIC,borderMode=cv2.BORDER_CONSTANT,borderValue=0)
    return out,int(hals)
teile={}
helm=schnitt(20,60,500,500); helm2,hals=helm_formen(helm)
cv2.imwrite(OUT+'/helm_alt.png',helm); cv2.imwrite(OUT+'/helm.png',helm2)
rumpf=schnitt(590,40,940,500); cv2.imwrite(OUT+'/rumpf.png',rumpf)
arml=schnitt(130,550,350,1010); cv2.imwrite(OUT+'/arm_l.png',arml)
armr=schnitt(670,550,890,1010); cv2.imwrite(OUT+'/arm_r.png',armr)
kugel=schnitt(120,1145,395,1420); cv2.imwrite(OUT+'/kugel.png',kugel)
hand=schnitt(630,1145,905,1420); cv2.imwrite(OUT+'/hand_r.png',hand); cv2.imwrite(OUT+'/hand_l.png',hand[:,::-1].copy())
info={}
for n,im in [('helm',helm2),('rumpf',rumpf),('arm_l',arml),('arm_r',armr),('kugel',kugel),('hand_r',hand)]:
    info[n]={'size':[im.shape[1],im.shape[0]],'bbox':bbox(im)}
info['helm']['hals_y']=hals
# Visier: dunkle Fläche im Helm
hsv=helm2[:,:,:3].sum(2); m=(hsv<200)&(helm2[:,:,3]>200); m[hals-20:,:]=False
ys=np.where(m.any(1))[0]; xs=np.where(m.any(0))[0]; info['helm']['visier']=[int(xs[0]),int(ys[0]),int(xs[-1]),int(ys[-1])]
# Armachse: Mittellinie je Zeile
for n,im in [('arm_l',arml),('arm_r',armr)]:
    m=im[:,:,3]>120; mitte={}
    for y in range(im.shape[0]):
        xs=np.where(m[y])[0]
        if len(xs): mitte[y]=[float(xs.mean()),int(xs[-1]-xs[0])]
    ys=sorted(mitte); info[n]['oben']=ys[0]; info[n]['unten']=ys[-1]
    info[n]['achse']={str(y):mitte[y] for y in ys[::10]}
    # dunkle Manschette: erste Zeile, in der es dunkel wird
    d=[y for y in ys if im[y,int(mitte[y][0]),:3].sum()<260]; info[n]['manschette']=d[0] if d else None
json.dump(info,open(OUT+'/info.json','w'),indent=1); print(json.dumps({k:{a:b for a,b in v.items() if a!='achse'} for k,v in info.items()}))
# Vergleichsbild Helm alt/neu auf Papier
def auf(im,bg=(226,237,245)):
    a=im[:,:,3:4]/255; return (im[:,:,:3]*a+np.array(bg)*(1-a)).astype(np.uint8)
cv2.imwrite(OUT+'/vergleich_helm.jpg',np.hstack([auf(helm),auf(helm2)]))

# --- Zusatzteile: Arm in Ober- und Unterarm, Münze ganz, Taschenrand ---
def speichern(n,im): cv2.imwrite(OUT+'/'+n+'.png',np.clip(im,0,255).astype(np.uint8))
ARMP={'arm_l':dict(p0=(134,66),pe=(82,192)),'arm_r':dict(p0=(86,66),pe=(138,192))}
for n,im0 in [('arm_l',arml),('arm_r',armr)]:
    im=cv2.resize(im0,(220,368),interpolation=cv2.INTER_AREA)      # Arm kürzer, wie auf dem Probeblatt
    h,w=im.shape[:2]; yy,xx=np.mgrid[0:h,0:w].astype(np.float32)
    def kreis(p,r): return np.clip(r+1-np.sqrt((xx-p[0])**2+(yy-p[1])**2),0,1)
    p0,pe=ARMP[n]['p0'],ARMP[n]['pe']
    vx,vy=pe[0]-p0[0],pe[1]-p0[1]; tt=np.clip(((xx-p0[0])*vx+(yy-p0[1])*vy)/(vx*vx+vy*vy),0,1)
    ds=np.sqrt((xx-(p0[0]+tt*vx))**2+(yy-(p0[1]+tt*vy))**2)
    ob=im.copy(); ob[:,:,3]*=np.clip(57-ds,0,1)
    speichern(n+'_ober',ob)
    un=im.copy(); un[:,:,3]*=np.maximum((yy>=pe[1]).astype(np.float32),kreis(pe,54)); speichern(n+'_unter',un)
    uk=un.copy(); uk[:,:,3]*=np.clip((272-yy)/14,0,1); speichern(n+'_unter_kurz',uk)
for n in ['helm','rumpf','kugel','hand_r','hand_l']:
    speichern(n,cv2.imread(OUT+'/'+n+'.png',cv2.IMREAD_UNCHANGED).astype(np.float32)) if False else None
speichern('helm',helm2); speichern('rumpf',rumpf); speichern('kugel',kugel); speichern('hand_r',hand); speichern('hand_l',hand[:,::-1])
b,g,r=rumpf[:,:,0],rumpf[:,:,1],rumpf[:,:,2]
orange=(r>190)&(g>80)&(g<170)&(b<110)&(rumpf[:,:,3]>200)
orange=cv2.morphologyEx(orange.astype(np.uint8),cv2.MORPH_OPEN,np.ones((5,5),np.uint8)).astype(bool)
ys=np.where(orange.any(1))[0]; xs=np.where(orange.any(0))[0]
mx0,mx1,my0,my1=int(xs[0]),int(xs[-1])+1,int(ys[0]),int(ys[-1])+1
rad=(mx1-mx0)/2; cy=my0+rad; print('muenze',mx0,mx1,my0,my1,'r',rad,'sichtbar',my1-my0)
gross=int(2*rad)+8; mz=np.zeros((gross,gross,4),np.float32); ox=mx0-4; oy=my0-4
maske=cv2.dilate(orange.astype(np.uint8),np.ones((5,5),np.uint8)).astype(bool)
for y in range(gross):
    sy=oy+y
    if sy>cy: sy=int(round(cy-(sy-cy)))
    if 0<=sy<rumpf.shape[0]:
        zeile=rumpf[sy,ox:ox+gross].copy(); zeile[:,3]=np.where(maske[sy,ox:ox+gross],255,0); mz[y]=zeile
yy,xx=np.mgrid[0:gross,0:gross]; kreis=((xx-gross/2)**2+(yy-(cy-oy))**2)<=(rad+1)**2
mz[:,:,3]=np.where(kreis,255,0).astype(np.float32)
# Farbe in den Kreis hinein auffüllen, wo die Spiegelung Lücken hat
leer=(mz[:,:,:3].sum(2)<5)&kreis
if leer.any():
    f=cv2.inpaint(np.clip(mz[:,:,:3],0,255).astype(np.uint8),leer.astype(np.uint8),5,cv2.INPAINT_TELEA); mz[:,:,:3]=f
mz[:,:,3]=cv2.GaussianBlur(mz[:,:,3],(0,0),0.8); speichern('muenze',mz)
# Taschenrand: Rumpf unterhalb der sichtbaren Münze (liegt vor der Münze)
tr=np.zeros_like(rumpf); 
for x in range(max(0,mx0-12),min(rumpf.shape[1],mx1+12)):
    col=np.where(orange[:,x])[0]
    y0=(col[-1]+1) if len(col) else my1-2
    y1=min(rumpf.shape[0],int(cy+rad+30)); tr[y0:y1,x]=rumpf[y0:y1,x]
speichern('taschenrand',tr)
info['muenze']={'ox':ox,'oy':oy,'gross':gross,'rad':rad,'cy':float(cy),'bbox':[mx0,my0,mx1,my1]}
json.dump(info,open(OUT+'/info.json','w'),indent=1)
