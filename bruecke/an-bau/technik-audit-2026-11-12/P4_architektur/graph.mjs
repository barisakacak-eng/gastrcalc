import fs from "fs"; import path from "path";
const root=process.cwd();
function walk(d){return fs.readdirSync(d,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(d,e.name)):[path.join(d,e.name)]);}
const files=walk("js").filter(f=>f.endsWith(".js"));
const g={}; const dyn={};
for(const f of files){const s=fs.readFileSync(f,"utf8");g[f]=new Set();
 const re=/(?:import|export)\s[^"';]*?from\s*["']([^"']+)["']|import\s*["']([^"']+)["']|import\(\s*["']([^"']+)["']\s*\)/g;let m;
 while((m=re.exec(s))){const sp=m[1]||m[2]||m[3];if(!sp.startsWith("."))continue;const p=path.normalize(path.join(path.dirname(f),sp));g[f].add(p);if(m[3])(dyn[f]??=new Set()).add(p);}}
// extra: new Worker / sw
const out=[];
// cycles Tarjan
let idx=0,st=[],on={},ind={},low={},sccs=[];
function sc(v){ind[v]=low[v]=idx++;st.push(v);on[v]=1;for(const w of g[v]||[]){if(!(w in g))continue;if(ind[w]===undefined){sc(w);low[v]=Math.min(low[v],low[w]);}else if(on[w])low[v]=Math.min(low[v],ind[w]);}
 if(low[v]===ind[v]){const c=[];let w;do{w=st.pop();on[w]=0;c.push(w);}while(w!==v);if(c.length>1)sccs.push(c);}}
for(const v of files)if(ind[v]===undefined)sc(v);
console.log("SCC>1:",sccs.length);sccs.forEach(c=>console.log(c.length,c.join(",")));
// in-degree / out-degree
const inn={};for(const f of files)inn[f]=0;for(const f of files)for(const w of g[f])if(w in inn)inn[w]++;
const outd=files.map(f=>[f,g[f].size]).sort((a,b)=>b[1]-a[1]).slice(0,10);
console.log("TOP out",outd.map(x=>x.join(":")).join(" "));
const ind2=Object.entries(inn).sort((a,b)=>b[1]-a[1]).slice(0,12);console.log("TOP in",ind2.map(x=>x.join(":")).join(" "));
// referenced elsewhere (html, tests, tools, sw, worker)
const other=[...walk("tests"),...walk("tools"),"index.html","sw.js"].filter(f=>/\.(mjs|js|py|html)$/.test(f)).map(f=>fs.readFileSync(f,"utf8")).join("\n");
const allJs=files.map(f=>fs.readFileSync(f,"utf8")).join("\n");
const dead=[];const testonly=[];
for(const f of files){if(inn[f]>0)continue;const b=path.basename(f);
 const inAppRefs=allJs.includes(b)&&false;
 const refd=new RegExp(b.replace(".","\\.")).test(fs.readFileSync("index.html","utf8")+fs.readFileSync("js/app.js","utf8"));
 const t=other.includes(b); (t?testonly:dead).push(f);}
console.log("NO importers (excl tests):",dead.join(" "));
console.log("ONLY tests/tools/sw reference:",testonly.join(" "));
// screens -> js imports of screens by core (core importing screens)
const core=files.filter(f=>f.startsWith("js/")&&!f.startsWith("js/screens/")&&!f.startsWith("js/lang")&&!f.startsWith("js/data"));
for(const f of core)for(const w of g[f])if(w.startsWith("js/screens/"))console.log("CORE->SCREEN",f,w);
fs.writeFileSync("_audit/graph.json",JSON.stringify(Object.fromEntries(Object.entries(g).map(([k,v])=>[k,[...v]]))));
