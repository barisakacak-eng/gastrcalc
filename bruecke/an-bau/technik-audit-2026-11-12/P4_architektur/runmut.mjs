import fs from "fs"; import {spawnSync} from "child_process";
const [,, wdir, ...ids]=process.argv; const root=process.cwd();
const muts=JSON.parse(fs.readFileSync(root+"/_audit/mut.json","utf8"));
for(const id of ids){const m=muts.find(x=>x[0]===id);const f=`${root}/_audit/${wdir}/${m[1]}`;const orig=fs.readFileSync(f,"utf8");
 const n=orig.split(m[2]).length-1; if(n!==1){fs.appendFileSync(root+"/_audit/mutres.jsonl",JSON.stringify({id,err:"occurrences "+n})+"\n");continue;}
 fs.writeFileSync(f,orig.replace(m[2],()=>m[3]));
 const t0=Date.now(); let out="";
 try{ const r=spawnSync("sh",["-c","node --test tests/*.mjs 2>&1"],{cwd:`${root}/_audit/${wdir}`,env:{...process.env,TZ:"UTC"},encoding:"utf8",maxBuffer:1<<29}); out=r.stdout||""; }finally{ fs.writeFileSync(f,orig); }
 const fail=+(out.match(/^# fail (\d+)/m)||[])[1]; const pass=+(out.match(/^# pass (\d+)/m)||[])[1];
 const names=[...out.matchAll(/^\s*not ok \d+ - (.+)$/gm)].map(x=>x[1]).filter((v,i,a)=>a.indexOf(v)===i).slice(0,6);
 fs.appendFileSync(root+"/_audit/mutres.jsonl",JSON.stringify({id,fail,pass,secs:Math.round((Date.now()-t0)/1000),names})+"\n");
}
