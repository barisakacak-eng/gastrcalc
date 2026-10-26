"""Zeki: räumliche Geometrie aus der Frontreferenz, eigene Gelenke, keine Bildflächen."""
from pathlib import Path
import math,json,re,struct,xml.etree.ElementTree as ET
import numpy as np
from svgpathtools import parse_path
from shapely.geometry import Polygon,LineString,Point,box
from shapely import affinity
import trimesh
B=Path(__file__).resolve().parent;P=B;LOW=list(ET.parse(B/'traced-low.svg').getroot());HIGH=list(ET.parse(B/'traced-high.svg').getroot())
C={'kontur':'#1F2718','helm':'#EFE4CB','schatten':'#D3C5A6','visier':'#1F2A1C','glanz':'#2E3E2E','auge':'#EBE5CE','mund':'#E7E2CD','schuerze':'#6C846B','tasche':'#3F533F','hand':'#2E3B2D','muenze':'#E57638','muenzeRand':'#C65519'}
PIV={'koerper':np.array([0.,0.,0.]),'kopf':np.array([0.,15.,-10.]),'arm-r':np.array([63.,3.,0.]),'arm-l':np.array([-57.,3.,0.])}
parts=[]
def polygon(e):
 path=parse_path(e.attrib['d']);xy=[float(v) for v in re.findall(r'-?[\d.]+',e.attrib.get('transform','translate(0 0)'))];off=complex(*xy[:2]);polys=[]
 for sub in path.continuous_subpaths():
  n=max(12,round(sub.length()/2.5));pts=[sub.point(t/n)+off for t in range(n)];poly=Polygon([(p.real,p.imag) for p in pts]).buffer(0)
  if not poly.is_empty:polys.append(poly)
 polys.sort(key=lambda p:p.area,reverse=True);out=polys[0]
 for poly in polys[1:]:out=out.difference(poly) if out.contains(poly.representative_point()) else out.union(poly)
 return out.buffer(0)
SH=[polygon(e) for e in LOW]
def polygons(s):return [s] if s.geom_type=='Polygon' else list(s.geoms)
def world(xy,z):return np.column_stack([xy[:,0]-114,164-xy[:,1],z])
def add(name,v,f,color,node,state=None):
 v=np.array(v,float)-PIV[node];parts.append({'name':name,'v':np.round(v,5).tolist(),'f':np.array(f,int).tolist(),'color':color,'node':node,**({'state':state} if state else {})})
def volume(shape,center,front,back):
 coords=np.array(shape.exterior.coords[:-1]);cx,cy=center;angles=np.arctan2(coords[:,1]-cy,coords[:,0]-cx);radii=np.hypot(coords[:,0]-cx,coords[:,1]-cy);order=np.argsort(angles);a=angles[order];r=radii[order]
 def z(xy):
  d=xy-np.array([cx,cy]);theta=np.arctan2(d[:,1],d[:,0]);boundary=np.interp(theta,np.r_[a[-1]-2*math.pi,a,a[0]+2*math.pi],np.r_[r[-1],r,r[0]]);q=np.clip(np.hypot(d[:,0],d[:,1])/boundary,0,1);return front*np.sqrt(np.maximum(0,1-q*q))
 return {'shape':shape,'center':np.array(center),'front':front,'back':back,'z':z}
def loft(name,desc,node,frontcolor,backcolor):
 poly=desc['shape'];line=poly.exterior;n=min(100,max(32,round(line.length/5)));bd=np.array([[line.interpolate(i/n,normalized=True).x,line.interpolate(i/n,normalized=True).y] for i in range(n)]);center=desc['center'];rings=[.0,.35,.65,.86,.96,1.,.96,.86,.65,.35,.0];v=[]
 for ri,r in enumerate(rings):
  xy=center+(bd-center)*max(r,.0001);z=np.full(n,(desc['front'] if ri<=5 else -desc['back'])*math.sqrt(max(0,1-r*r)));v.extend(world(xy,z))
 frontfaces=[];backfaces=[]
 for j in range(len(rings)-1):
  for i in range(n):
   k=(i+1)%n;faces=[[j*n+i,j*n+k,(j+1)*n+k],[j*n+i,(j+1)*n+k,(j+1)*n+i]];(frontfaces if j<5 else backfaces).extend(faces)
 v.extend([np.array([center[0]-114,164-center[1],desc['front']]),np.array([center[0]-114,164-center[1],-desc['back']])]);fi=len(v)-2;bi=len(v)-1
 for i in range(n):
  frontfaces.append([fi,(i+1)%n,i]);backfaces.append([bi,(len(rings)-1)*n+i,(len(rings)-1)*n+(i+1)%n])
 add(name+'-vorn',v,frontfaces,frontcolor,node);add(name+'-hinten',v,backfaces,backcolor,node)
 # Attach facial pieces to the actual curved mesh, not to an approximate analytic plane.
 vv=np.array(v);tri=vv[np.array(frontfaces)];tx=tri[:,:,0]+114;ty=164-tri[:,:,1];tz=tri[:,:,2];den=(ty[:,1]-ty[:,2])*(tx[:,0]-tx[:,2])+(tx[:,2]-tx[:,1])*(ty[:,0]-ty[:,2]);valid=np.abs(den)>1e-8;tx,ty,tz,den=tx[valid],ty[valid],tz[valid],den[valid];fallback=desc['z']
 def surface_z(xy):
  result=[]
  for x,y in xy:
   a=((ty[:,1]-ty[:,2])*(x-tx[:,2])+(tx[:,2]-tx[:,1])*(y-ty[:,2]))/den;b=((ty[:,2]-ty[:,0])*(x-tx[:,2])+(tx[:,0]-tx[:,2])*(y-ty[:,2]))/den;c=1-a-b;ok=(a>=-1e-6)&(b>=-1e-6)&(c>=-1e-6)
   result.append(np.max((a*tz[:,0]+b*tz[:,1]+c*tz[:,2])[ok]) if ok.any() else fallback(np.array([[x,y]]))[0])
  return np.array(result)
 desc['z']=surface_z
def surface(name,shape,desc,color,node,epsilon=.5,state=None):
 for pi,poly in enumerate(polygons(shape)):
  if poly.area<.2:continue
  vertices,faces=trimesh.creation.triangulate_polygon(poly,engine='earcut');vv=vertices.tolist();out=[]
  # Split long triangles so facial layers stay attached to the curved helmet.
  def split(a,b,c,level=0):
   pts=np.array([vv[a],vv[b],vv[c]]);edges=[np.linalg.norm(pts[0]-pts[1]),np.linalg.norm(pts[1]-pts[2]),np.linalg.norm(pts[2]-pts[0])];idx=int(np.argmax(edges))
   if max(edges)<=19 or level>=6:out.append([a,b,c]);return
   aa,bb,cc=[a,b,c][idx],[a,b,c][(idx+1)%3],[a,b,c][(idx+2)%3];mid=len(vv);vv.append(((np.array(vv[aa])+vv[bb])/2).tolist());split(aa,mid,cc,level+1);split(mid,bb,cc,level+1)
  for a,b,c in faces:split(int(a),int(b),int(c))
  xy=np.array(vv);add(name+('' if pi==0 else '-'+str(pi)),world(xy,desc['z'](xy)+epsilon),out,color,node,state)
def line(points,width=2.4):return LineString(points).buffer(width/2,cap_style='round',join_style='round')
def bezier(p0,p1,p2,n=18):return [(1-t)**2*np.array(p0)+2*(1-t)*t*np.array(p1)+t*t*np.array(p2) for t in np.linspace(0,1,n)]
OUT=SH[0];HEAD=OUT.intersection(box(0,0,237,146));h=volume(HEAD,(114,78),43,37);loft('helm-volumen',h,'kopf',C['kontur'],C['helm']);surface('helm',SH[3],h,C['helm'],'kopf',.4);surface('helm-schatten',SH[4],h,C['schatten'],'kopf',.7);surface('visier',SH[2],h,C['visier'],'kopf',1.0);surface('visier-glanz',polygon(HIGH[7]),h,C['glanz'],'kopf',1.3)
TORSO=OUT.intersection(box(41,143,188,288));torso=volume(TORSO,(114,222),29,25);loft('rumpf',torso,'koerper',C['kontur'],C['schuerze'])
for i in [1,5,9,10,11]:surface(['','','','','','','','','',''][0] if False else 'koerper-flaeche-'+str(i),SH[i],torso,LOW[i].attrib['fill'],'koerper',.4+i*.03)
for i in [6,12,16,17,20,22,23,24]:surface('muenze-'+str(i),SH[i],torso,LOW[i].attrib['fill'],'koerper',2.0+i*.03)
surface('tasche',SH[13],torso,C['tasche'],'koerper',3.1)
for side,poly,cx,light,hand in [('r',Polygon([(174,147),(196,155),(217,195),(224,226),(224,252),(200,256),(189,233),(186,207),(177,180),(170,160)]),199,8,15),('l',Polygon([(70,143),(51,144),(34,158),(19,184),(6,221),(4,248),(24,259),(44,247),(49,221),(54,190),(64,169)]),31,7,14)]:
 shape=OUT.intersection(poly);arm=volume(shape,(cx,204),15,16);loft('arm-'+side,arm,'arm-'+side,C['kontur'],C['helm']);surface('arm-'+side+'-hell',SH[light],arm,LOW[light].attrib['fill'],'arm-'+side,.5);surface('hand-'+side,SH[hand],arm,C['hand'],'arm-'+side,1.0)
for side,l,r in [('l',49,113),('r',114,181)]:
 foot=OUT.intersection(box(l,282,r,328));d=volume(foot,(foot.centroid.x,foot.centroid.y),19,20);loft('fuss-'+side,d,'koerper',C['kontur'],C['kontur'])
# A real short neck behind the helmet and apron.
neck=Point(114,148).buffer(24,resolution=20).intersection(box(70,140,158,158));neckd=volume(neck,(114,149),18,18);loft('hals',neckd,'koerper',C['kontur'],C['kontur'])
STATES=['neutral','frage','import','preis','hilfe','warnung','bestaetigt','freude','aufmerksam','erleichtert','fehler']
for state in STATES:
 # Both brows exist and remain visible in every expression.
 brows=[[(77,64),(87,61),(98,64)],[(129,64),(140,61),(151,64)]]
 eyes=[SH[18],affinity.translate(SH[18],52.5,0)];mouth=line([(104,107),(129,107)],4.4)
 if state=='frage':
  brows=[[(77,62),(87,56),(98,61)],[(129,61),(140,56),(151,62)]];eyes=[affinity.translate(e,0,-1) for e in eyes];mouth=Point(116,107).buffer(4.7,resolution=18).difference(Point(116,107).buffer(2.3,resolution=18))
 elif state=='import':
  brows=[[(77,67),(87,66),(98,67)],[(129,67),(140,66),(151,67)]];eyes=[affinity.translate(affinity.scale(e,1,.6,origin='centroid'),0,2) for e in eyes];mouth=line([(107,109),(125,109)],3.9)
 elif state=='preis':
  brows=[[(77,61),(87,56),(98,61)],[(129,66),(140,64),(151,65)]];eyes=[affinity.scale(eyes[0],1,.95,origin='centroid'),affinity.scale(eyes[1],1,.55,origin='centroid')];mouth=line([(115,108),(130,104)],4.1)
 elif state=='hilfe':
  brows=[[(77,63),(87,58),(98,62)],[(129,62),(140,58),(151,63)]];eyes=[affinity.scale(e,1.04,.87,origin='centroid') for e in eyes];mouth=line(bezier((102,103),(116,116),(131,103)),4.6)
 elif state in ['warnung','fehler']:
  brows=[[(77,63),(87,62),(98,67)],[(129,67),(140,62),(151,63)]];eyes=[affinity.scale(e,1,.8,origin='centroid') for e in eyes];mouth=line(bezier((103,110),(116,104),(129,110)),4.1)
 elif state in ['bestaetigt','erleichtert']:
  eyes=[affinity.scale(e,1,.85 if state=='bestaetigt' else .65,origin='centroid') for e in eyes];mouth=line(bezier((103,104),(116,115),(130,104)),4.5)
 elif state=='freude':mouth=SH[19]
 elif state=='aufmerksam':eyes=[affinity.translate(e,0,2) for e in eyes]
 for side,pts,eye in zip(['l','r'],brows,eyes):
  surface('braue-'+side,line(bezier(*pts),2.6),h,C['auge'],'kopf',6.0,state);surface('auge-'+side,eye,h,C['auge'],'kopf',5.5,state)
 surface('mund',mouth,h,C['mund'],'kopf',5.5,state)
for side,cx in [('l',88),('r',140.5)]:
 surface('lid-'+side,line(bezier((cx-7,81),(cx,75),(cx+7,81)),4.1),h,C['auge'],'kopf',6.2)
 parts[-1]['kind']='lid'
# Front paint is generated from vector paths, not from the reference photo.
# It is mapped onto the real curved solids, so the paint cannot intersect the shell.
svgpaths=[]
for i,el in enumerate(LOW):
 if i in [18,19,21]:continue
 svgpaths.append('<path d="'+el.attrib['d']+'" transform="'+el.attrib['transform']+'" fill="'+el.attrib['fill']+'"/>')
el=HIGH[7];svgpaths.append('<path d="'+el.attrib['d']+'" transform="'+el.attrib['transform']+'" fill="'+el.attrib['fill']+'"/>')
(P/'atlas.svg').write_text('<svg xmlns="http://www.w3.org/2000/svg" width="1896" height="2624" viewBox="0 0 237 328">'+''.join(svgpaths)+'</svg>')
parts=[p for p in parts if p.get('state') or p.get('kind') or p['name'].endswith('-vorn') or p['name'].endswith('-hinten') or p['name'].startswith('muenze-')]
for p in parts:p['paint']=p['name'].endswith('-vorn')
model={'version':1,'source':'Referenzfront 2026; Seiten und Rückseite ergänzt','coordinates':'x rechts, y oben, z zur Kamera; echte XYZ-Geometrie','colors':C,'pivots':{k:v.tolist() for k,v in PIV.items()},'parts':parts,'states':STATES}
(P/'modell.json').write_text(json.dumps(model,separators=(',',':')))
# GLB with hierarchy, real meshes and rotation animations. No textures, images or scale animation.
scene=trimesh.Scene(base_frame='zeki')
for name,pivot in PIV.items():scene.graph.update(frame_to=name,frame_from='zeki',matrix=trimesh.transformations.translation_matrix(pivot))
for state in STATES:scene.graph.update(frame_to='mimik-'+state,frame_from='kopf',matrix=np.eye(4) if state=='neutral' else np.diag([0.,0.,0.,1.]))
for i,part in enumerate(parts):
 mesh=trimesh.Trimesh(vertices=part['v'],faces=part['f'],process=False);rgb=tuple(bytes.fromhex(part['color'][1:]));mesh.visual=trimesh.visual.ColorVisuals(mesh,vertex_colors=rgb+(255,));parent='mimik-'+part['state'] if part.get('state') else part['node'];scene.add_geometry(mesh,geom_name=part['name']+'-'+str(i),node_name=part['name']+'-'+str(i),parent_node_name=parent,transform=np.diag([0.,0.,0.,1.]) if part.get('kind')=='lid' else np.eye(4))
raw=scene.export(file_type='glb');jl=struct.unpack_from('<I',raw,12)[0];doc=json.loads(raw[20:20+jl]);off=20+jl;bl=struct.unpack_from('<I',raw,off)[0];binary=bytearray(raw[off+8:off+8+bl]);node={v.get('name'):i for i,v in enumerate(doc['nodes'])}
def accessor(array,kind):
 a=np.array(array,dtype='<f4');pad=(-len(binary))%4;binary.extend(b'\0'*pad);start=len(binary);binary.extend(a.tobytes());view=len(doc['bufferViews']);doc['bufferViews'].append({'buffer':0,'byteOffset':start,'byteLength':a.nbytes});idx=len(doc['accessors']);entry={'bufferView':view,'componentType':5126,'count':len(a),'type':kind}
 if kind=='SCALAR':entry.update(min=[float(a.min())],max=[float(a.max())])
 doc['accessors'].append(entry);return idx
for joint in ['kopf','arm-r']:
 target=doc['nodes'][node[joint]];target.pop('matrix',None);target.update(translation=PIV[joint].tolist(),rotation=[0.,0.,0.,1.],scale=[1.,1.,1.])
times=np.linspace(0,1.2,25);ain=accessor(times,'SCALAR');doc['animations']=[]
def armwinkel(t):
 ts=[0,.24,.38,.52,.66,.80,1];aa=[0,137,116,140,116,137,0];tau=t/1.2;i=max(1,next((i for i,v in enumerate(ts) if v>=tau),6));f=(tau-ts[i-1])/(ts[i]-ts[i-1]);f=(1-math.cos(math.pi*f))/2;return aa[i-1]*(1-f)+aa[i]*f
for name,target,axis,angles in [('Nicken','kopf',(1,0,0),[15*math.sin(math.pi*t/1.2)**2 for t in times]),('Kopfschuetteln','kopf',(0,1,0),[16*math.sin(4*math.pi*t/1.2)*math.sin(math.pi*t/1.2) for t in times]),('Hand_heben','arm-r',(0,0,1),[armwinkel(t) for t in times])]:
 q=[[*(np.array(axis)*math.sin(math.radians(a)/2)),math.cos(math.radians(a)/2)] for a in angles];out=accessor(q,'VEC4');doc['animations'].append({'name':name,'samplers':[{'input':ain,'output':out,'interpolation':'LINEAR'}],'channels':[{'sampler':0,'target':{'node':node[target],'path':'rotation'}}]})
for mat in doc.get('materials',[]):mat['doubleSided']=True
if (P/'atlas.webp').exists():
 import io
 from PIL import Image
 image_buffer=io.BytesIO();Image.open(P/'atlas.webp').save(image_buffer,'PNG');data=image_buffer.getvalue();binary.extend(b'\0'*((-len(binary))%4));start=len(binary);binary.extend(data);iv=len(doc['bufferViews']);doc['bufferViews'].append({'buffer':0,'byteOffset':start,'byteLength':len(data)})
 doc['images']=[{'name':'Vektorfarbe','bufferView':iv,'mimeType':'image/png'}];doc['samplers']=[{'magFilter':9729,'minFilter':9729,'wrapS':33071,'wrapT':33071}];doc['textures']=[{'sampler':0,'source':0}]
 mi=len(doc.setdefault('materials',[]));doc['materials'].append({'name':'Vektorfarbe auf 3D-Koerper','pbrMetallicRoughness':{'baseColorTexture':{'index':0},'metallicFactor':0,'roughnessFactor':1},'doubleSided':True,'extensions':{'KHR_materials_unlit':{}}});doc.setdefault('extensionsUsed',[]).append('KHR_materials_unlit')
 byname={m.get('name'):m for m in doc['meshes']}
 for i,part in enumerate(parts):
  if not part.get('paint'):continue
  va=np.array(part['v'])+PIV[part['node']];uv=np.column_stack([(va[:,0]+114)/237,(164-va[:,1])/328]);uvindex=accessor(uv,'VEC2');mesh=byname[part['name']+'-'+str(i)]
  for prim in mesh['primitives']:prim['attributes']['TEXCOORD_0']=uvindex;prim['attributes'].pop('COLOR_0',None);prim['material']=mi
 doc['asset']['extras']={'frontPaint':'Generated from native SVG paths; no reference JPEG used as texture.'}
doc['buffers'][0]['byteLength']=len(binary);js=json.dumps(doc,separators=(',',':')).encode();js+=b' '*((-len(js))%4);binary.extend(b'\0'*((-len(binary))%4));total=12+8+len(js)+8+len(binary);(P/'Zeki_3D.glb').write_bytes(struct.pack('<III',0x46546C67,2,total)+struct.pack('<II',len(js),0x4E4F534A)+js+struct.pack('<II',len(binary),0x004E4942)+binary)
print('Echtes 3D-Modell:',len(parts),'Teile,',sum(len(p['f']) for p in parts),'Dreiecke,',len((P/'Zeki_3D.glb').read_bytes()),'Bytes GLB; 3 Gelenkanimationen, keine Fototeile.')
