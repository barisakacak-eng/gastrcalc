import fs from "fs"; import path from "path";
function walk(d){return fs.readdirSync(d,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(d,e.name)):[path.join(d,e.name)]);}
const files=walk("js").filter(f=>f.endsWith(".js")&&!f.includes("/lang/")&&!f.includes("/data/"));
const dataF=walk("js/data").filter(f=>f.endsWith(".js"));
const src={};for(const f of [...files,...dataF,"js/lang/de.js"])src[f]=fs.readFileSync(f,"utf8");
const tests=walk("tests").filter(f=>/\.(mjs|py|js)$/.test(f)).map(f=>fs.readFileSync(f,"utf8")).join("\n")+walk("tools").filter(f=>/\.(mjs|js|py)$/.test(f)).map(f=>fs.readFileSync(f,"utf8")).join("\n");
let total=0,deadProd=[],deadAll=[];
for(const f of [...files,...dataF]){const s=src[f];const names=new Set();let m;
 const re=/export\s+(?:async\s+)?(?:function\*?|const|let|class)\s+([A-Za-z0-9_$]+)/g;while((m=re.exec(s)))names.add(m[1]);
 const re2=/export\s*\{([^}]*)\}/g;while((m=re2.exec(s)))m[1].split(",").forEach(x=>{const n=x.trim().split(/\s+as\s+/).pop();if(n)names.add(n)});
 for(const n of names){total++;const rx=new RegExp("(?<![A-Za-z0-9_$.])"+n.replace("$","\\$")+"(?![A-Za-z0-9_$])");
  let usedProd=false;for(const g in src){if(g===f)continue;if(rx.test(src[g])){usedProd=true;break;}}
  // used within own file other than definition?
  const own=(s.match(new RegExp("(?<![A-Za-z0-9_$])"+n.replace("$","\\$")+"(?![A-Za-z0-9_$])","g"))||[]).length;
  if(!usedProd){const t=rx.test(tests);(t?deadProd:deadAll).push(`${f}:${n}${own>1?"(intern)":""}`);}}}
console.log("exports",total,"only-tests/intern",deadProd.length,"nowhere",deadAll.length);
console.log("NOWHERE:",deadAll.join(" "));
fs.writeFileSync("_audit/deadprod.txt",deadProd.join("\n"));
