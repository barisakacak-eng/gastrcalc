"""Lesbarkeit: geht hell und dunkel durch alle Ansichten (Laden, Personal, Büro, Blätter, Einrichtung), liest je sichtbares Text-Element die berechnete
Textfarbe und die wirksame Hintergrundfarbe (Vorfahren mit Hintergrundfarbe übereinandergelegt; Text auf Hintergrundbildern wird übersprungen und aufgelistet)
und meldet alles unter 4,5 : 1 (3 : 1 bei Schrift ab 24 px oder ab 18,66 px fett).
  python3 tools/sw_liste.py && KONTRAST_PORT=9030 python3 tools/kontrast.py [hell|dunkel|beide] [sprache]
Ausgabe: Zahl der Messungen, Funde je Ansicht (Selektor, Text, Farben, Verhältnis); Exit 1 bei Funden. KONTRAST_NUR=start,muell begrenzt die Ansichten."""
import asyncio, json, os, pathlib, sys
from playwright.async_api import async_playwright
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent.parent / "tests"))
import nav_hilfe, schnellstart, au_buero_hilfe as H

PORT = int(os.environ.get("KONTRAST_PORT", "9030"))
NUR = set(filter(None, os.environ.get("KONTRAST_NUR", "").split(",")))
OHNE_SW = "Object.defineProperty(navigator,'serviceWorker',{value:{controller:{},ready:Promise.resolve(),register:()=>Promise.resolve({}),addEventListener(){},getRegistrations:()=>Promise.resolve([])},configurable:true})"

MESSEN = r"""
() => {
  const cv = document.createElement("canvas"); cv.width = cv.height = 1; const cx = cv.getContext("2d", { willReadFrequently: true });
  const rgba = (s) => { cx.clearRect(0, 0, 1, 1); cx.fillStyle = "#000"; cx.fillStyle = s; cx.fillRect(0, 0, 1, 1); const d = cx.getImageData(0, 0, 1, 1).data; return [d[0], d[1], d[2], d[3] / 255]; };
  // Farben mit Alpha: getImageData liefert vormultipliziert zurück → über transparenten Grund besser direkt parsen
  const roh = (s) => { const m = /^rgba?\(([^)]+)\)$/.exec(s); if (m) { const p = m[1].split(/[ ,\/]+/).filter(Boolean).map(Number); return [p[0], p[1], p[2], p.length > 3 ? p[3] : 1]; }
    const c = /^color\(srgb ([^)]+)\)$/.exec(s); if (c) { const p = c[1].split(/[ \/]+/).filter(Boolean).map(Number); return [p[0] * 255, p[1] * 255, p[2] * 255, p.length > 3 ? p[3] : 1]; }
    return rgba(s); };
  const ueber = (v, h) => { const a = v[3] + h[3] * (1 - v[3]); if (a <= 0) return [0, 0, 0, 0]; return [0, 1, 2].map((i) => (v[i] * v[3] + h[i] * h[3] * (1 - v[3])) / a).concat([a]); };
  const lum = (c) => { const f = (x) => { x /= 255; return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4); }; return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]); };
  const sichtbar = (e) => { for (let x = e; x && x.nodeType === 1; x = x.parentElement) { const s = getComputedStyle(x); if (s.display === "none" || s.visibility === "hidden" || Number(s.opacity) < 0.05) return false; if (x.closest && x.parentElement && x.parentElement.tagName === "DETAILS" && !x.parentElement.open && x.tagName !== "SUMMARY") return false; } const r = e.getBoundingClientRect(); return r.width > 1 && r.height > 1; };
  const nm = (e) => e.tagName.toLowerCase() + (typeof e.className === "string" && e.className.trim() ? "." + e.className.trim().split(/\s+/).slice(0, 3).join(".") : "") + (e.getAttribute("data-a") ? "[" + e.getAttribute("data-a") + "]" : "");
  const funde = [], foto = []; let n = 0;
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const gesehen = new Set();
  while (walker.nextNode()) {
    const t = walker.currentNode; const txt = t.textContent.replace(/\s+/g, " ").trim(); if (!txt) continue;
    const e = t.parentElement; if (!e || gesehen.has(e) || e.closest("script,style,noscript,svg")) continue; gesehen.add(e);
    if (!sichtbar(e)) continue;
    const r = document.createRange(); r.selectNodeContents(t); const rr = r.getBoundingClientRect(); if (rr.width < 1 || rr.height < 1 || rr.bottom < 0 || rr.top > innerHeight * 3) continue;
    const s = getComputedStyle(e); let farbe = roh(s.color), opa = 1;
    for (let x = e; x && x.nodeType === 1; x = x.parentElement) opa *= Number(getComputedStyle(x).opacity);
    // Hintergrund: Vorfahren von innen nach außen sammeln, bis einer deckt
    let schichten = [], bild = false;
    for (let x = e; x && x.nodeType === 1; x = x.parentElement) { const sx = getComputedStyle(x); const bg = roh(sx.backgroundColor);
      if (sx.backgroundImage !== "none" && /url\(/.test(sx.backgroundImage)) { bild = true; break; }
      if (bg[3] > 0) { schichten.push(bg); if (bg[3] >= 0.999) break; } }
    if (bild) { foto.push(nm(e) + " „" + txt.slice(0, 20) + "“"); continue; }
    let grund = [255, 255, 255, 1]; // Seitenfläche
    const bodyBg = roh(getComputedStyle(document.body).backgroundColor); const htmlBg = roh(getComputedStyle(document.documentElement).backgroundColor);
    let base = ueber(bodyBg, ueber(htmlBg, [255, 255, 255, 1]));
    for (const sch of schichten.reverse()) base = ueber(sch, base);
    grund = base; farbe = [farbe[0], farbe[1], farbe[2], farbe[3] * opa]; const f = ueber(farbe, grund);
    const l1 = lum(f), l2 = lum(grund), v = (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
    const px = parseFloat(s.fontSize), fett = Number(s.fontWeight) >= 700, gross = px >= 24 || (px >= 18.66 && fett); const soll = gross ? 3 : 4.5; n++;
    if (v < soll - 0.005) funde.push({ el: nm(e), text: txt.slice(0, 28), v: Math.round(v * 100) / 100, soll, f: f.slice(0, 3).map(Math.round).join(","), g: grund.slice(0, 3).map(Math.round).join(",") });
  }
  return { n, funde, foto };
}
"""


async def main():
    import ansichten as A
    thema = sys.argv[1] if len(sys.argv) > 1 else "beide"; sprache = sys.argv[2] if len(sys.argv) > 2 else "de"
    themen = ["hell", "dunkel"] if thema == "beide" else [thema]; srv = schnellstart.server(PORT); alle = {}; fotos = set(); gesamt = 0
    try:
        async with async_playwright() as p:
            b = await p.chromium.launch(args=["--no-sandbox"])
            for th in themen:
                async def messe(name, pg):
                    nonlocal gesamt
                    m = await pg.evaluate(MESSEN); gesamt += m["n"]; alle.setdefault(f"{th}/{name}", []).extend(m["funde"]); fotos.update(m["foto"])
                await A.lauf(b, PORT, th, sprache, messe, NUR or None)
            await b.close()
    finally: srv.terminate()
    unique = {}
    for ans, fl in alle.items():
        for f in fl: unique.setdefault((f["el"], f["f"], f["g"], f["soll"]), []).append((ans, f))
    print(f"{gesamt} Text-Messungen, {sum(len(v) for v in alle.values())} Funde, {len(unique)} verschiedene (Selektor + Farbpaar); {len(fotos)} Texte auf Fotos übersprungen")
    for (el, f, g, soll), l in sorted(unique.items(), key=lambda kv: kv[1][0][1]["v"]):
        print(f"  {l[0][1]['v']:5.2f} < {soll}  {el}  „{l[0][1]['text']}“  Farbe {f}  Grund {g}  ({len(l)}×, z. B. {l[0][0]})")
    if os.environ.get("KONTRAST_FOTOS"): print("Auf Fotos übersprungen:", sorted(fotos)[:40])
    return 1 if unique else 0

sys.exit(asyncio.run(main()))
