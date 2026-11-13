// node render.js <html> <png> <breite> <hoehe> [durchsichtig=1]
const {chromium}=require('playwright');(async()=>{
const [html,png,w,h,tr]=process.argv.slice(2);
const b=await chromium.launch();const p=await b.newPage({viewport:{width:+w,height:+h},deviceScaleFactor:1});
await p.goto('file://'+require('path').resolve(html));await p.waitForTimeout(500);
await p.screenshot({path:png,omitBackground:tr!=='0'});await b.close()})()
