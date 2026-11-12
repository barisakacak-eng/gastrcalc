import asyncio, json, sys, time
from playwright.async_api import async_playwright
URL="http://localhost:8804/index.html"
SLOW4G=dict(offline=False, downloadThroughput=1.6*1024*1024/8*0.9, uploadThroughput=750*1024/8*0.9, latency=150*1.25)
async def run(p, name, cpu, net, warm=False):
    b=await p.chromium.launch()
    ctx=await b.new_context(viewport={"width":390,"height":844}, device_scale_factor=2, is_mobile=True, has_touch=True)
    page=await ctx.new_page()
    reqs=[]
    page.on("requestfinished", lambda r: reqs.append(r))
    cdp=await ctx.new_cdp_session(page)
    async def throttle():
        await cdp.send("Network.enable")
        await cdp.send("Emulation.setCPUThrottlingRate", {"rate":cpu})
        if net: await cdp.send("Network.emulateNetworkConditions", net)
    if warm:
        # first visit unthrottled to fill SW cache + IDB, wait SW ready
        await page.goto(URL, wait_until="load"); 
        await page.evaluate("navigator.serviceWorker.ready.then(()=>1)")
        await page.wait_for_timeout(4000)
        reqs.clear()
    await throttle()
    t0=time.time()
    await page.goto(URL, wait_until="commit")
    t_first=None; t_inter=None
    # first content: #app has more than the placeholder; interactive: first [data-a]
    for i in range(6000):
        r=await page.evaluate("()=>({txt:(document.querySelector('#app')||{}).innerText||'', a:!!document.querySelector('[data-a]'), rs:document.readyState})")
        if t_first is None and r["txt"].strip() not in ("","…") : t_first=time.time()-t0
        if r["a"]: t_inter=time.time()-t0; break
        await asyncio.sleep(0.05)
        if time.time()-t0>180: break
    nav=await page.evaluate("()=>{const n=performance.getEntriesByType('navigation')[0];return {dcl:n.domContentLoadedEventEnd,load:n.loadEventEnd}}")
    res=await page.evaluate("()=>performance.getEntriesByType('resource').map(r=>({n:r.name.split('/').slice(3).join('/'),t:r.transferSize,e:r.encodedBodySize,d:r.responseEnd}))")
    await page.wait_for_timeout(1500)
    res2=await page.evaluate("()=>performance.getEntriesByType('resource').length")
    before=[x for x in res if (not t_inter) or x["d"]<=t_inter*1000]
    out=dict(name=name,cpu=cpu,net=bool(net),first_content_s=t_first and round(t_first,2),interactive_s=t_inter and round(t_inter,2),dcl_ms=round(nav["dcl"]),load_ms=round(nav["load"]),
      req_until_interactive=len(before),bytes_until_interactive=sum(x["e"] for x in before),req_total_after=res2,bytes_total=sum(x["e"] for x in res))
    # by type
    def typ(n):
        for k in (".js",".css",".woff",".ttf",".webp",".png",".svg",".html",".json"):
            if n.split("?")[0].endswith(k): return k
        return "other"
    from collections import Counter
    c=Counter();cb=Counter()
    for x in before: c[typ(x["n"])]+=1; cb[typ(x["n"])]+=x["e"]
    out["until_by_type"]={k:(c[k],cb[k]) for k in c}
    print(json.dumps(out,ensure_ascii=False),flush=True)
    await b.close()
async def main():
    async with async_playwright() as p:
        await run(p,"cold_nothrottle",1,None)
        await run(p,"cold_cpu4",4,None)
        await run(p,"cold_cpu4_slow4g",4,SLOW4G)
        await run(p,"warm_cpu4_slow4g",4,SLOW4G,warm=True)
        await run(p,"warm_nothrottle",1,None,warm=True)
asyncio.run(main())
