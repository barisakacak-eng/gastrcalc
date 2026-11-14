"""Native SVG-Front aus freigegebenen Meshes. Entwicklungswerkzeug: numpy, shapely."""
from pathlib import Path
import json,xml.etree.ElementTree as E
import numpy as np
from shapely.geometry import Polygon
from shapely.ops import unary_union
R=Path(__file__).resolve().parent.parent;S=R/'design/zeki-3d';m=json.loads((S/'modell.json').read_text());colors=set();features={}
for p in m['parts']:
 if not p.get('state') and p.get('kind')!='lid':continue
 v=np.array(p['v'])+m['pivots'][p['node']];xy=np.column_stack([v[:,0]+114,164-v[:,1]]);shape=unary_union([Polygon(xy[f]) for f in p['f']]).buffer(.00005).buffer(-.00005).simplify(.025);polys=[shape] if shape.geom_type=='Polygon' else list(shape.geoms);d=''
 for q in polys:
  if q.area<.001:continue
  for ring in [q.exterior,*q.interiors]:d+='M'+' '.join(f'{x:.3f},{y:.3f}' for x,y in ring.coords)+'Z'
 features.setdefault(p.get('state','lid'),{})[p['name']]=(d,p['color']);colors.add(p['color'])
paint=[dict(e.attrib) for e in E.parse(S/'atlas.svg').getroot() if e.tag.endswith('path')];colors.update(p['fill'] for p in paint);palette={c:'--zeki-3d-'+str(i) for i,c in enumerate(sorted(colors))}
tokens=':root{'+''.join(k+':'+c+';' for c,k in palette.items())+'}\n';t=R/'css/tokens.css';s=t.read_text();tag='/* Zeki 3D 26.10.2026 */';s=s.split(tag)[0]+tag+'\n'+tokens;t.write_text(s)
cv=lambda c:'var('+palette[c]+')';styles='.zeki-variante,.zeki-lid{opacity:0}';paths=''.join('<path d="'+p['d']+'" transform="'+p.get('transform','')+'" fill="'+cv(p['fill'])+'"/>' for p in paint);defs='<defs><g id="clip-farbe">'+paths+'</g>'
for name,d in dict(kopf='M0 0H237V146H0Z',koerper='M41 146H188V328H41Z',arm_r='M170 143H237V270H188L179 182Z',hand_r='M187 218H230V256H187Z',arm_l='M0 143H71L54 190L44 265H0Z',muenze='M78 180H151V219H78Z').items():defs+='<clipPath id="clip-'+name+'"><path d="'+d+'"/></clipPath>'
defs+='</defs>'
def base(n):return '<use href="#clip-farbe" clip-path="url(#clip-'+n+')"/>'
body='<g id="koerper">'+base('koerper')+'</g><g id="arm-l">'+base('arm_l')+'</g><g id="arm-r">'+base('arm_r')+'<g id="hand-r">'+base('hand_r')+'</g></g><g id="muenze">'+base('muenze')+'</g><g id="kopf">'+base('kopf')
for name in ['braue-l','braue-r','auge-l','auge-r','lid-l','lid-r','mund-neutral','mund-grinsen','mund-o']:
 body+='<g id="'+name+'">'
 for state,parts in features.items():
  key='mund' if name.startswith('mund-') else name
  if key not in parts:continue
  if name.startswith('mund-') and name!=('mund-grinsen' if state in ['freude','hilfe','bestaetigt','erleichtert'] else 'mund-o' if state=='frage' else 'mund-neutral'):continue
  d,c=parts[key];body+='<path class="zeki-variante" data-variante="'+state+'" d="'+d+'" fill="'+cv(c)+'" fill-rule="evenodd"/>'
 body+='</g>'
body+='</g>'
for state in features:styles+='.zeki[data-zeki-zustand="'+state+'"] [data-variante="'+state+'"]{opacity:1}'
svg='<svg xmlns="http://www.w3.org/2000/svg" class="zeki" data-zeki-zustand="neutral" viewBox="0 0 237 328" aria-hidden="true"><style>'+tokens.replace(':root','.zeki')+styles+'</style>'+defs+'<g id="zeki">'+body+'</g><svg id="bewegung" x="-24.5" y="-8" width="277" height="344" viewBox="0 0 277 344" overflow="hidden" opacity="0"><image id="film" preserveAspectRatio="none"/></svg></svg>'
(R/'assets/brand/zeki.svg').write_text(svg);(R/'js/zeki-svg.js').write_text('export const ZEKI_SVG = '+json.dumps(svg)+';\n');(R/'css/zeki.css').write_text(styles+'\n.zeki{display:block;overflow:visible}.zeki--spielt [data-zeki-teil="zeki"]{opacity:0}.zeki--spielt [data-zeki-teil="bewegung"]{opacity:1}.zeki--spielt [data-zeki-teil="film"]{animation:var(--zeki-ablauf) var(--zeki-dauer) steps(1,end) both}\n')
