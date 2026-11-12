import fs from "fs";
let tot=0, files=0, byFile=[];
for(const f of fs.readdirSync("tests").filter(x=>x.endsWith(".mjs"))){
  const s=fs.readFileSync("tests/"+f,"utf8");
  const vars=new Set();
  for(const m of s.matchAll(/(?:const|let)\s+([A-Za-z_$][\w$]*)\s*=\s*(?:await\s+)?[^;\n]*?(?:readFileSync|lies|read)\([^;\n]*?(?:js\/|\.js|\.css|css\/|index\.html|sw\.js|JS|SCREENS|CSS|APP)[^;\n]*/g)) vars.add(m[1]);
  if(!vars.size)continue;
  let c=0;
  for(const v of vars){ const re=new RegExp("assert\\.(?:match|doesNotMatch|ok|equal)\\(\\s*!?\\s*"+v+"(?:\\.includes|\\.test|\\b)","g"); c+=(s.match(re)||[]).length; const re2=new RegExp("/[^/\\n]+/[a-z]*\\.test\\(\\s*"+v+"\\b","g"); c+=(s.match(re2)||[]).length;}
  if(c){tot+=c;files++;byFile.push([c,f,[...vars].join(",")]);}
}
byFile.sort((a,b)=>b[0]-a[0]);console.log("source-regex asserts",tot,"files",files);console.log(byFile.slice(0,10).map(x=>x.join(" ")).join("\n"));
