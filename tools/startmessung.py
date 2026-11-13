"""Startmessung (Etappe 10 „Schneller Start“): misst den ersten Start wie das Audit (perf.py), Chromium, 390 x 844.
Aufruf: python3 tools/startmessung.py [--port 9060] [--url http://…/index.html] [--nur kalt,gedrosselt,warm,warm_frei]
Startet ohne --url selbst `python3 -m http.server` (unkomprimiert) im App-Ordner. Ausgabe: je Lauf eine JSON-Zeile.
Läufe: kalt (ungedrosselt), gedrosselt (CPU 4x + langsames 4G), warm (nach erstem Besuch, CPU 4x + 4G), warm_frei (ungedrosselt)."""
import argparse, asyncio, json, os, pathlib, subprocess, sys, time
from playwright.async_api import async_playwright

APP = pathlib.Path(__file__).resolve().parent.parent
SLOW4G = dict(offline=False, downloadThroughput=1.6 * 1024 * 1024 / 8 * 0.9, uploadThroughput=750 * 1024 / 8 * 0.9, latency=150 * 1.25)


async def lauf(p, url, name, cpu, netz, warm=False):
    b = await p.chromium.launch()
    ctx = await b.new_context(viewport={"width": 390, "height": 844}, device_scale_factor=2, is_mobile=True, has_touch=True)
    page = await ctx.new_page()
    cdp = await ctx.new_cdp_session(page)
    if warm:  # erster Besuch ungedrosselt: Service Worker und Speicher füllen, „alles da“ abwarten
        await page.goto(url, wait_until="load")
        await page.evaluate("navigator.serviceWorker.ready.then(()=>1)")
        await page.wait_for_timeout(6000)
    await cdp.send("Network.enable")
    await cdp.send("Emulation.setCPUThrottlingRate", {"rate": cpu})
    if netz: await cdp.send("Network.emulateNetworkConditions", netz)
    t0 = time.time()
    await page.goto(url, wait_until="commit")
    t_erst = t_bedienbar = None
    while time.time() - t0 < 180:
        try:
            r = await page.evaluate("()=>({txt:(document.querySelector('#app')||{}).innerText||'', a:!!document.querySelector('[data-a]')})")
        except Exception:
            await asyncio.sleep(0.05); continue
        if t_erst is None and r["txt"].strip() not in ("", "…"): t_erst = time.time() - t0
        if r["a"]: t_bedienbar = time.time() - t0; break
        await asyncio.sleep(0.05)
    res = await page.evaluate("()=>performance.getEntriesByType('resource').map(r=>({n:r.name.split('/').slice(3).join('/'),e:r.encodedBodySize,d:r.responseEnd}))")
    vor = [x for x in res if t_bedienbar is None or x["d"] <= t_bedienbar * 1000]
    out = dict(name=name, cpu=cpu, netz=bool(netz), erstes_s=t_erst and round(t_erst, 2), bedienbar_s=t_bedienbar and round(t_bedienbar, 2),
               anfragen=len(vor), bytes=sum(x["e"] for x in vor), js_anfragen=sum(1 for x in vor if x["n"].split("?")[0].endswith(".js")))
    out["liste"] = [x["n"] for x in vor]
    await b.close()
    return out


async def messen(url, welche):
    erg = {}
    async with async_playwright() as p:
        plan = {"kalt": (1, None, False), "gedrosselt": (4, SLOW4G, False), "warm": (4, SLOW4G, True), "warm_frei": (1, None, True)}
        for n in welche:
            cpu, netz, warm = plan[n]
            erg[n] = await lauf(p, url, n, cpu, netz, warm)
    return erg


def main(argv=None):
    ap = argparse.ArgumentParser()
    ap.add_argument("--port", type=int, default=int(os.environ.get("DURCHLAUF_PORT", "9060")))
    ap.add_argument("--url"); ap.add_argument("--nur", default="kalt,gedrosselt,warm,warm_frei"); ap.add_argument("--liste", action="store_true")
    a = ap.parse_args(argv)
    srv = None; url = a.url
    if not url:
        srv = subprocess.Popen([sys.executable, "-m", "http.server", str(a.port), "--bind", "127.0.0.1"], cwd=APP, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        time.sleep(0.8); url = f"http://127.0.0.1:{a.port}/index.html"
    try:
        erg = asyncio.run(messen(url, a.nur.split(",")))
    finally:
        if srv: srv.terminate()
    for e in erg.values():
        if not a.liste: e = {k: v for k, v in e.items() if k != "liste"}
        print(json.dumps(e, ensure_ascii=False), flush=True)
    return erg


if __name__ == "__main__":
    main()
