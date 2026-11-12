import fs from "fs"; import path from "path";
const order=["tokens","app","optik","zielbild","laden","heute","schnell","personal","buero","design-b","facelift-v1","zeki"];
const rules=[]; // {file, sel, props:Set, media}
function parse(file,src){
  src=src.replace(/\/\*[\s\S]*?\*\//g,"");
  let i=0;const stack=[];let cur="";
  const out=[];
  function block(text,media){
    let j=0;
    while(j<text.length){
      const o=text.indexOf("{",j); if(o<0)break;
      const sel=text.slice(j,o).trim();
      let d=1,k=o+1;while(k<text.length&&d>0){if(text[k]=="{")d++;else if(text[k]=="}")d--;k++;}
      const body=text.slice(o+1,k-1);
      if(sel.startsWith("@media")||sel.startsWith("@supports")){block(body,sel);}
      else if(sel.startsWith("@")){/*keyframes, font-face*/}
      else out.push({sel,body,media});
      j=k;
    }
  }
  block(src,"");
  for(const r of out){const props=[...r.body.matchAll(/([a-z-]+)\s*:\s*([^;]+)(;|$)/g)].map(m=>m[1].trim());
    for(const s of r.sel.split(",").map(x=>x.trim()).filter(Boolean))rules.push({file,sel:s.replace(/\s+/g," "),props:new Set(props),media:r.media,imp:/!important/.test(r.body)});}
}
for(const f of order)parse(f,fs.readFileSync(`css/${f}.css`,"utf8"));
console.log("rules(selectors)",rules.length);
// same selector across files with overlapping props
const by=new Map();for(const r of rules){const k=r.media+"|"+r.sel;(by.get(k)||by.set(k,[]).get(k)).push(r);}
let multi=0,overlap=0,files=new Map(),ex=[];
for(const [k,l] of by){const fs2=new Set(l.map(x=>x.file));if(fs2.size>1){multi++;let ov=false;for(let a=0;a<l.length;a++)for(let b=a+1;b<l.length;b++){if(l[a].file!==l[b].file&&[...l[a].props].some(p=>l[b].props.has(p)))ov=true;}
 if(ov){overlap++;ex.push([k,[...fs2].join(">")]);}
 const key=[...fs2].sort().join("+");files.set(key,(files.get(key)||0)+1);}}
console.log("selectors in >1 file:",multi,"with overlapping properties (override):",overlap);
console.log(ex.slice(0,8).map(e=>e.join("  ")).join("\n"));
console.log([...files].sort((a,b)=>b[1]-a[1]).slice(0,5));
// same-selector same-property pairs count
let pairs=0;for(const [k,l] of by){for(let a=0;a<l.length;a++)for(let b=a+1;b<l.length;b++){if(l[a].file!==l[b].file)for(const p of l[a].props)if(l[b].props.has(p))pairs++;}}
console.log("selector+property overridden pairs",pairs);
// unused classes
const classes=new Set();for(const r of rules)for(const m of r.sel.matchAll(/\.([A-Za-z_][\w-]*)/g))classes.add(m[1]);
function walk(d){return fs.readdirSync(d,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(d,e.name)):[path.join(d,e.name)]);}
const corpus=walk("js").filter(f=>f.endsWith(".js")&&!f.includes("/lang/")).map(f=>fs.readFileSync(f,"utf8")).join("\n")+fs.readFileSync("index.html","utf8")+" "+fs.readFileSync("js/lang/de.js","utf8");
const unused=[...classes].filter(c=>!new RegExp("(?<![\\w-])"+c.replace(/[-]/g,"\\-")+"(?![\\w-])").test(corpus));
// prefix dynamic: class built like "h-"+x -> crude: check prefix up to last hyphen present in corpus with quote and concatenation? skip
console.log("distinct classes",classes.size,"not found as whole word in js/index:",unused.length);
console.log(unused.slice(0,40).join(" "));
// specificity depth: selectors with > 3 compound parts
console.log("long selectors(>=4 parts):",rules.filter(r=>r.sel.split(/\s+|>|\+|~/).filter(Boolean).length>=4).length);
// body/#app/ancestor-prefix override hacks
console.log("sel starting with html/body/#app:",rules.filter(r=>/^(html|body|#app)\b/.test(r.sel)).length);
const dynamicOk=c=>{const i=c.lastIndexOf("-");if(i<1)return false;const pre=c.slice(0,i+1);return corpus.includes(pre+"\"")||corpus.includes(pre+"`")||corpus.includes(pre+"'")||corpus.includes(pre+"${")||new RegExp("[\"'`]"+pre.replace(/-/g,"\\-")+"[\"'`]").test(corpus)||corpus.includes('"'+pre+'" +')||corpus.includes("'"+pre+"' +");};
const strictUnused=unused.filter(c=>!dynamicOk(c));
console.log("unused after dynamic-prefix filter:",strictUnused.length);
// rules whose every class is unused
const un=new Set(strictUnused);const deadRules=rules.filter(r=>{const cs=[...r.sel.matchAll(/\.([A-Za-z_][\w-]*)/g)].map(m=>m[1]);return cs.length&&cs.some(c=>un.has(c));});
console.log("rules referencing a surely-unused class:",deadRules.length,"of",rules.length);
