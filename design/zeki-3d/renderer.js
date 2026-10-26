// Native WebGL, only in the review viewer. Source is a real mesh with XYZ coordinates and joints.
const source=await (await fetch('modell.json')).json();
const atlasImage=new Image();atlasImage.src='atlas.svg';await atlasImage.decode();
const I=()=>new Float32Array([1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]);
function mul(a,b){let o=new Float32Array(16);for(let c=0;c<4;c++)for(let r=0;r<4;r++)for(let k=0;k<4;k++)o[c*4+r]+=a[k*4+r]*b[c*4+k];return o}
function T(p){let m=I();m[12]=p[0];m[13]=p[1];m[14]=p[2];return m}
function R(axis,d){let a=d*Math.PI/180,c=Math.cos(a),s=Math.sin(a),m=I();if(axis==='x'){m[5]=c;m[6]=s;m[9]=-s;m[10]=c}if(axis==='y'){m[0]=c;m[2]=-s;m[8]=s;m[10]=c}if(axis==='z'){m[0]=c;m[1]=s;m[4]=-s;m[5]=c}return m}
export class Zeki3D{
 constructor(canvas){
  this.canvas=canvas;const gl=canvas.getContext('webgl',{antialias:true,alpha:true,preserveDrawingBuffer:true});if(!gl)throw Error('3D-Ansicht konnte nicht geöffnet werden');this.gl=gl;
  const compile=(type,src)=>{let s=gl.createShader(type);gl.shaderSource(s,src);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s));return s};
  const vs=compile(gl.VERTEX_SHADER,`attribute vec3 a_pos;attribute vec3 a_n;attribute vec2 a_uv;varying vec2 v_uv;uniform mat4 u_node;uniform mat4 u_view;uniform vec2 u_frame;uniform float u_center;uniform float u_eyeScale;uniform float u_eyeCenter;uniform float u_look;varying vec3 v_n;void main(){vec3 p=a_pos;p.y=(p.y-u_eyeCenter)*u_eyeScale+u_eyeCenter;p.x+=u_look;vec4 q=u_view*u_node*vec4(p,1.0);gl_Position=vec4(q.x/u_frame.x,(q.y-u_center)/u_frame.y,-q.z/500.0,1.0);v_n=mat3(u_view*u_node)*a_n;v_uv=a_uv;}`);
  const fs=compile(gl.FRAGMENT_SHADER,`precision mediump float;uniform vec3 u_color;uniform float u_lit;uniform float u_paint;uniform sampler2D u_tex;varying vec2 v_uv;varying vec3 v_n;void main(){float light=0.86+0.14*abs(dot(normalize(v_n+vec3(0.0,0.0,0.00001)),normalize(vec3(-0.3,0.5,1.0))));vec4 paint=texture2D(u_tex,v_uv);vec3 color=mix(u_color,paint.rgb,u_paint*paint.a);gl_FragColor=vec4(color*mix(1.0,light,u_lit),1.0);}`);
  const program=gl.createProgram();gl.attachShader(program,vs);gl.attachShader(program,fs);gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(program));gl.useProgram(program);this.program=program;
  this.a={p:gl.getAttribLocation(program,'a_pos'),n:gl.getAttribLocation(program,'a_n'),uv:gl.getAttribLocation(program,'a_uv')};this.u={};for(let n of ['node','view','frame','center','eyeScale','eyeCenter','look','color','lit','paint','tex'])this.u[n]=gl.getUniformLocation(program,'u_'+n);
  const tex=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,tex);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,atlasImage);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.uniform1i(this.u.tex,0);
  this.meshes=source.parts.map(p=>{const vertices=new Float32Array(p.v.flat()),normals=new Float32Array(vertices.length);for(let f of p.f){const a=p.v[f[0]],b=p.v[f[1]],c=p.v[f[2]],u=b.map((x,i)=>x-a[i]),v=c.map((x,i)=>x-a[i]),n=[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]];for(let k of f)for(let j=0;j<3;j++)normals[k*3+j]+=n[j]}for(let i=0;i<normals.length;i+=3){const len=Math.hypot(...normals.slice(i,i+3))||1;for(let j=0;j<3;j++)normals[i+j]/=len}
   const buffer=(type,data)=>{let b=gl.createBuffer();gl.bindBuffer(type,b);gl.bufferData(type,data,gl.STATIC_DRAW);return b};
   return {...p,centerY:p.v.reduce((a,v)=>a+v[1],0)/p.v.length,uvbo:buffer(gl.ARRAY_BUFFER,new Float32Array(p.v.flatMap(v=>[(v[0]+source.pivots[p.node][0]+114)/237,1-(164-v[1]-source.pivots[p.node][1])/328]))),vbo:buffer(gl.ARRAY_BUFFER,vertices),nbo:buffer(gl.ARRAY_BUFFER,normals),ibo:buffer(gl.ELEMENT_ARRAY_BUFFER,new Uint16Array(p.f.flat())),count:p.f.length*3,rgb:[1,3,5].map(i=>parseInt(p.color.slice(i,i+2),16)/255)};
  });
  gl.enable(gl.DEPTH_TEST);gl.disable(gl.CULL_FACE);this.pose={state:'neutral',pitch:0,yaw:0,bodyYaw:0,arm:0,wink:0,look:0,head:false};this.render();
 }
 render(next={}){
  Object.assign(this.pose,next);const p=this.pose,gl=this.gl,canvas=this.canvas,rect=canvas.getBoundingClientRect(),dpr=Math.min(devicePixelRatio||1,3);let w=Math.max(1,Math.round(rect.width*dpr)),h=Math.max(1,Math.round(rect.height*dpr));if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h}gl.viewport(0,0,w,h);gl.useProgram(this.program);gl.clearColor(245/255,235/255,221/255,p.transparent?0:1);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
  const halfY=p.head?Math.max(73,110*h/w):(p.halfY||180);gl.uniform2f(this.u.frame,halfY*w/h,halfY);gl.uniform1f(this.u.center,p.head?91:0);gl.uniformMatrix4fv(this.u.view,false,R('y',p.bodyYaw));
  const matrices={};for(let [name,pivot] of Object.entries(source.pivots)){let rot=I();if(name==='kopf')rot=mul(R('x',p.pitch),R('y',p.yaw));if(name==='arm-r')rot=R('z',p.arm);matrices[name]=mul(T(pivot),rot)}
  for(let m of this.meshes){if(m.state&&m.state!==p.state)continue;if(m.kind==='lid'&&!(m.name==='lid-r'&&p.wink>.5))continue;
   const eye=m.name==='auge-r'&&m.state,eyeL=m.name==='auge-l'&&m.state;let scale=eye?Math.max(.04,1-p.wink):1;if(eye&&p.wink>.65)continue;
   gl.uniformMatrix4fv(this.u.node,false,matrices[m.node]);gl.uniform1f(this.u.eyeScale,scale);gl.uniform1f(this.u.eyeCenter,m.centerY);gl.uniform1f(this.u.look,(eye||eyeL)?p.look:0);gl.uniform3fv(this.u.color,m.rgb);gl.uniform1f(this.u.lit,m.name.includes('-hinten')?1:0);gl.uniform1f(this.u.paint,m.paint?1:0);
   gl.bindBuffer(gl.ARRAY_BUFFER,m.vbo);gl.enableVertexAttribArray(this.a.p);gl.vertexAttribPointer(this.a.p,3,gl.FLOAT,false,0,0);gl.bindBuffer(gl.ARRAY_BUFFER,m.nbo);gl.enableVertexAttribArray(this.a.n);gl.vertexAttribPointer(this.a.n,3,gl.FLOAT,false,0,0);gl.bindBuffer(gl.ARRAY_BUFFER,m.uvbo);gl.enableVertexAttribArray(this.a.uv);gl.vertexAttribPointer(this.a.uv,2,gl.FLOAT,false,0,0);gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,m.ibo);gl.drawElements(gl.TRIANGLES,m.count,gl.UNSIGNED_SHORT,0);
  }
  gl.finish();return {pitch:p.pitch,yaw:p.yaw,scale:[1,1,1]};
 }
}
export const model=source;
const poses={neutral:{state:'neutral'},frage:{state:'frage'},import:{state:'import'},preis:{state:'preis'},hilfe:{state:'hilfe'},warnung:{state:'warnung'},bestaetigt:{state:'bestaetigt'},freude:{state:'freude'},aufmerksam:{state:'aufmerksam'},erleichtert:{state:'erleichtert'},fehler:{state:'fehler'}};
export function poseAt(m,t){let pitch=0,yaw=0,arm=0,wink=0,look=0,state='neutral';t=Math.max(0,Math.min(1,t));
 if(m==='nicken'){state='bestaetigt';pitch=15*Math.sin(Math.PI*t)**2}
 if(m==='nein'){state='fehler';yaw=16*Math.sin(4*Math.PI*t)*Math.sin(Math.PI*t)}
 if(m==='drehen')yaw=0;
 if(m==='hand'){const ts=[0,.24,.38,.52,.66,.80,1],as=[0,137,116,140,116,137,0];let i=ts.findIndex(x=>x>=t);i=Math.max(1,i);let f=(t-ts[i-1])/(ts[i]-ts[i-1]);f=(1-Math.cos(Math.PI*f))/2;arm=as[i-1]*(1-f)+as[i]*f}
 if(m==='zwinkern'||m==='laecheln'){state=m==='laecheln'?'freude':'neutral';wink=t<.22||t>.63?0:t<.33?(t-.22)/.11:t<.52?1:1-(t-.52)/.11}
 if(m==='import'){state='import';look=3*Math.sin(2*Math.PI*t)}if(m==='preis'){state='preis';look=4*Math.sin(2*Math.PI*t)}
 return {state,pitch,yaw,arm,wink,look};
}
export function reaktion(s={}){if(s.warnung)return 'warnung';if(s.fehler)return 'fehler';if(s.fehlendeAngabe)return 'frage';if(s.arbeitet)return 'import';if(s.eingabeAktiv)return 'aufmerksam';return ({neutral:'neutral',gespeichert:'bestaetigt',fehlt:'frage',kuehlwarnung:'warnung',ungueltig:'fehler',import:'import',preis:'preis',hilfe:'hilfe',abschluss:'erleichtert',ziel:'freude',rueckgaengig:'neutral'})[s.ereignis]||'neutral'}
const canvas=document.querySelector('#modell');const viewer=canvas?new Zeki3D(canvas):null;let raf=0,bodyYaw=0,current='neutral';
function stop(){cancelAnimationFrame(raf);raf=0}
function show(state){stop();current=state;viewer.render({...poses[state],pitch:0,yaw:0,arm:0,wink:0,look:0,bodyYaw});document.querySelector('#zustand').textContent=({frage:'Angabe fehlt',import:'Import prüfen',preis:'Preis vergleichen',hilfe:'Hilfe: Ich bin da.',neutral:'Bereit',warnung:'Warnung',bestaetigt:'Gespeichert',freude:'Ziel bestätigt',aufmerksam:'Eingabe aktiv',erleichtert:'Tag abgeschlossen',fehler:'Wert korrigieren'})[state]}
function play(m){stop();const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;if(reduced){let p=poseAt(m,0);if(m==='laecheln')p={...p,state:'freude',wink:1};if(m==='zwinkern')p.wink=1;viewer.render({...p,bodyYaw});return}let start=performance.now();function tick(now){let t=Math.min(1,(now-start)/1200);viewer.render({...poseAt(m,t),bodyYaw});if(t<1)raf=requestAnimationFrame(tick);else raf=0}raf=requestAnimationFrame(tick)}
if(viewer){document.querySelectorAll('[data-state]').forEach(b=>b.addEventListener('click',()=>show(b.dataset.state)));document.querySelectorAll('[data-motion]').forEach(b=>b.addEventListener('click',()=>play(b.dataset.motion)));document.querySelector('#drehen').addEventListener('input',e=>{stop();bodyYaw=Number(e.target.value);viewer.render({bodyYaw})});document.querySelector('#nicken').addEventListener('input',e=>{stop();viewer.render({pitch:Number(e.target.value)})});show('neutral')}
const eingabe=document.querySelector('#probe');if(eingabe){eingabe.addEventListener('focus',()=>{if(!['warnung','fehler','frage','import'].includes(current))show('aufmerksam')});eingabe.addEventListener('blur',()=>{if(current==='aufmerksam')show('neutral')})}
window.zeki3D={viewer,Zeki3D,model:source,poseAt,show,play,stop,reaktion};
