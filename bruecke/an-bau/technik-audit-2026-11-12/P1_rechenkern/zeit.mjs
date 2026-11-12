import { beispielLaden } from "../js/beispiel.js";
import { kalkulation } from "../js/engine.js";
import { zaehler } from "../js/zaehler.js";
let t=performance.now(); const s=beispielLaden("2026-11-11"); console.log("beispielLaden ms", (performance.now()-t).toFixed(1));
t=performance.now(); for(let i=0;i<20;i++) kalkulation(s); console.log("kalk ms/Aufruf", ((performance.now()-t)/20).toFixed(1));
t=performance.now(); for(let i=0;i<20;i++) zaehler(s,{datum:"2026-11-10"}); console.log("zaehler ms/Aufruf", ((performance.now()-t)/20).toFixed(1));
const a=JSON.stringify(s); kalkulation(s); kalkulation(s); console.log("kalkulation verändert den Stand?", a!==JSON.stringify(s));
