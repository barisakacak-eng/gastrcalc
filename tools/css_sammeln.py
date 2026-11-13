"""Welche CSS-Regeln und welche Deklarationen gelten in der App wirklich? Geht über tools/ansichten.py durch alle Ansichten (hell/dunkel, Sprachen) und fragt
für jedes Element über das Chrome-DevTools-Protokoll die zutreffenden Regeln ab; je Eigenschaft gewinnt die Deklaration mit höchster Wichtigkeit, Spezifität und Reihenfolge.
Ergebnis (JSON): "treffer" = Regeln, die irgendein Element getroffen haben; "gewinner" = Deklarationen, die für irgendein Element (oder Pseudo-Element) gelten.
  python3 tools/sw_liste.py && SAMMELN_PORT=9050 python3 tools/css_sammeln.py <ergebnis.json> [hell,dunkel] [de,ar,tr]"""
import asyncio, json, os, pathlib, re, sys
from playwright.async_api import async_playwright
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent.parent / "tests")); sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
import schnellstart, ansichten as A

PORT = int(os.environ.get("SAMMELN_PORT", "9050"))
ORD = ["tokens", "app", "zielbild", "laden", "heute", "personal", "design-b", "facelift-v1", "zeki", "optik", "buehne", "s-laden", "s-einrichtung", "s-buero"]
if os.environ.get("SAMMELN_ORD"): ORD = os.environ["SAMMELN_ORD"].split(",")
GESEHEN = set()
EXPAND = "(paare) => { const e = document.createElement('i'); const o = {}; for (const [n, v] of paare) { if (n.startsWith('--')) { o[n + '\\u0000' + v] = [n]; continue; } e.style.cssText = ''; e.style.setProperty(n, v); const l = []; for (let i = 0; i < e.style.length; i++) l.push(e.style[i]); o[n + '\\u0000' + v] = l.length ? l : [n]; } return o; }"


async def erfasse(cdp, pg, hdr, treffer, gewinner, cache):
    doc = await cdp.send("DOM.getDocument", {"depth": -1, "pierce": False}); knoten = []
    def attr(n):
        a = n.get("attributes", []); return {a[i]: a[i + 1] for i in range(0, len(a) - 1, 2)}
    def geh(n, pfad):
        if n.get("nodeType") == 1 and n.get("nodeName", "").lower() not in ("script", "style", "meta", "link", "title", "noscript", "head"):
            a = attr(n); eigen = n["nodeName"].lower() + "." + a.get("class", "") + "|" + "|".join(f"{k}={a[k]}" for k in ("data-a", "type", "role", "dir", "disabled", "open", "data-theme", "data-modus", "aria-pressed", "aria-expanded", "aria-current", "hidden") if k in a)
            sig = pfad + ">" + eigen
            if sig not in GESEHEN: GESEHEN.add(sig); knoten.append(n["nodeId"])
            pfad = pfad + ">" + n["nodeName"].lower() + "." + a.get("class", "")
        for c in n.get("children", []): geh(c, pfad)
    geh(doc["root"], "")
    async def eins(nid):
        try: return await cdp.send("CSS.getMatchedStylesForNode", {"nodeId": nid})
        except Exception: return None
    for k in range(0, len(knoten), 25):
        res = await asyncio.gather(*[eins(x) for x in knoten[k:k + 25]])
        paare = set(); aufgaben = []
        for m in res:
            if not m: continue
            gruppen = [("", m.get("matchedCSSRules", []))] + [(pe.get("pseudoType", "?") + (":" + pe["pseudoIdentifier"] if pe.get("pseudoIdentifier") else ""), pe.get("matches", [])) for pe in m.get("pseudoElements", [])]
            aufgaben.append((gruppen, m.get("inlineStyle")))
            for _, regeln in gruppen:
                for r in regeln:
                    rr = r["rule"]
                    if rr.get("origin") != "regular": continue
                    for pr in rr["style"]["cssProperties"]:
                        if pr.get("parsedOk", True) and not pr.get("implicit") and not pr.get("disabled") and pr.get("range"): paare.add((pr["name"], pr["value"]))
        neu = [p for p in paare if p[0] + "\0" + p[1] not in cache]
        if neu: cache.update(await pg.evaluate(EXPAND, neu))
        for gruppen, inline in aufgaben:
            for pseudo, regeln in gruppen:
                best = {}
                for r in regeln:
                    rr = r["rule"]
                    if rr.get("origin") != "regular": continue
                    sid = rr.get("styleSheetId"); datei = hdr.get(sid)
                    if not datei or not rr.get("selectorList", {}).get("selectors") or not rr["selectorList"]["selectors"][0].get("range"): continue
                    r0 = rr["selectorList"]["selectors"][0]["range"]; rk = f"{datei}@{r0['startLine']}:{r0['startColumn']}"
                    treffer.add(rk)
                    sp = (rr["selectorList"]["selectors"][max(r["matchingSelectors"], key=lambda i: tuple(rr["selectorList"]["selectors"][i]["specificity"].values()))]["specificity"] if r["matchingSelectors"] else {"a": 0, "b": 0, "c": 0})
                    sp = (sp["a"], sp["b"], sp["c"]); ordnung = (ORD.index(datei) if datei in ORD else 99, rr["style"]["range"]["startLine"], rr["style"]["range"]["startColumn"])
                    zaehl = {}
                    for pr in rr["style"]["cssProperties"]:
                        nm = pr["name"]
                        if pr.get("implicit") or not pr.get("range"): continue  # Längenschreibweise aus Kurzschreibweise zählt nicht als geschriebene Deklaration
                        occ = zaehl.get(nm, 0); zaehl[nm] = occ + 1
                        if not pr.get("parsedOk", True) or pr.get("disabled"): continue
                        schl = (1 if pr.get("important") else 0, sp, ordnung)
                        for lh in cache.get(nm + "\0" + pr["value"], [nm]):
                            if lh not in best or best[lh][0] < schl: best[lh] = (schl, rk, nm, occ)
                inl = set()
                if inline and not pseudo:
                    for pr in inline.get("cssProperties", []):
                        if pr.get("parsedOk", True) and not pr.get("implicit"):
                            for lh in cache.get(pr["name"] + "\0" + pr["value"], [pr["name"]]): inl.add(lh)
                for lh, (schl, rk, nm, occ) in best.items():
                    if lh in inl and not schl[0]: continue
                    gewinner.add(f"{rk}|{nm}|{occ}")


async def main():
    aus = sys.argv[1]; themen = (sys.argv[2] if len(sys.argv) > 2 else "hell,dunkel").split(","); sprachen = (sys.argv[3] if len(sys.argv) > 3 else "de").split(",")
    srv = schnellstart.server(PORT); treffer = set(); gewinner = set(); cache = {}; n = 0
    try:
        async with async_playwright() as p:
            b = await p.chromium.launch(args=["--no-sandbox"])
            for th in themen:
                for sp in sprachen:
                    state = {}
                    async def messe(name, pg):
                        nonlocal n
                        if id(pg) not in state:
                            cdp = await pg.context.new_cdp_session(pg); hdr = {}
                            cdp.on("CSS.styleSheetAdded", lambda e: hdr.__setitem__(e["header"]["styleSheetId"], pathlib.Path(e["header"].get("sourceURL", "")).stem))
                            await cdp.send("DOM.enable"); await cdp.send("CSS.enable"); await pg.wait_for_timeout(800); state[id(pg)] = (cdp, hdr)
                        cdp, hdr = state[id(pg)]
                        await erfasse(cdp, pg, hdr, treffer, gewinner, cache); n += 1
                        print("erfasst", th, sp, name, len(treffer), len(gewinner), flush=True)
                    await A.lauf(b, PORT, th, sp, messe, set(filter(None, os.environ.get("SAMMELN_NUR", "").split(","))) or None)
            await b.close()
    finally: srv.terminate()
    pathlib.Path(aus).write_text(json.dumps({"ansichten": n, "treffer": sorted(treffer), "gewinner": sorted(gewinner)}))
    print("fertig:", n, "Ansichten,", len(treffer), "Regeln getroffen,", len(gewinner), "Deklarationen gelten")

asyncio.run(main())
