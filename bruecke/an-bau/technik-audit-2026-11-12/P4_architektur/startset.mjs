import fs from "fs"; import path from "path";
const g=JSON.parse(fs.readFileSync("_audit/graph.json","utf8"));
const seen=new Set();const q=["js/app.js"];while(q.length){const f=q.pop();if(seen.has(f))continue;seen.add(f);for(const w of g[f]||[])q.push(w);}
let bytes=0;for(const f of seen)bytes+=fs.statSync(f).size;
console.log("static module closure from app.js:",seen.size,"files",bytes,"bytes");
const rest=Object.keys(g).filter(f=>!seen.has(f)&&!f.includes("/lang/"));console.log("not in static closure:",rest.join(" "));
const top=[...seen].map(f=>[fs.statSync(f).size,f]).sort((a,b)=>b[0]-a[0]).slice(0,10);console.log(top.map(x=>x.join(" ")).join("\n"));
const dataB=[...seen].filter(f=>f.includes("/data/")).reduce((a,f)=>a+fs.statSync(f).size,0);console.log("data/ share:",dataB);
const langs=fs.readdirSync("js/lang").map(f=>fs.statSync("js/lang/"+f).size);console.log("lang sizes:",langs.join(","),"de:",fs.statSync("js/lang/de.js").size);
