"""Büro im Aussehen „Salbei & Papier“: geht in de, tr, ar bei 390 × 844 und 360 × 740 mit dem Beispiel-Laden durch ALLE Büro-Ansichten
(auch aufgeklappte Bereiche) und prüft: kein waagrechter Überlauf, alle sichtbaren Knöpfe/Links/summary/Felder ≥ 44 px hoch,
kein Weinrot, höchstens ein Element in Glut, genau eine Bühne mit genau einem Zeki.
Aufruf: DURCHLAUF_PORT=8945 python3 tests/buero_aussehen_browser.py   (BUERO_SPRACHEN=de,tr,ar  BUERO_GROESSEN=390x844,360x740  BUERO_ZIELE=a,b)"""
import asyncio, os, sys, pathlib
sys.path.insert(0, str(pathlib.Path(__file__).parent))
import schnellstart, nav_hilfe, au_buero_hilfe as H
from playwright.async_api import async_playwright
PORT = int(os.environ.get("DURCHLAUF_PORT", "8945"))
SPRACHEN = os.environ.get("BUERO_SPRACHEN", "de,tr,ar").split(",")
GROESSEN = [tuple(map(int, g.split("x"))) for g in os.environ.get("BUERO_GROESSEN", "390x844,360x740").split(",")]
ZIELE = os.environ.get("BUERO_ZIELE", "").split(",") if os.environ.get("BUERO_ZIELE") else [z for z, _ in H.ZIELE]
# Ausnahmen von der 44-px-Regel (Selektor-Teil → Grund). Nur mit Grund.
AUSNAHMEN = {}
PRUEFE = r"""() => {
  const out = { ueberlauf: document.documentElement.scrollWidth - window.innerWidth, klein: [], weinrot: [], glut: [], buehnen: document.querySelectorAll('.gc-buehne').length, zekis: document.querySelectorAll('.gc-buehne .gc-figur, .zeki-bild, .gc-figur-knopf img').length };
  const sicht = (e) => { const r = e.getBoundingClientRect(); if (r.width < 1 || r.height < 1) return false; const s = getComputedStyle(e); if (s.visibility === 'hidden' || s.display === 'none' || +s.opacity === 0) return false;
    for (let p = e; p; p = p.parentElement) { if (p.hidden || p.getAttribute('aria-hidden') === 'true' && p.tagName !== 'BODY') return false; if (p.tagName === 'DETAILS' && !p.open && !(e.tagName === 'SUMMARY' && e.parentElement === p)) { if (e !== p) { const sm = [...p.children].find(c => c.tagName === 'SUMMARY'); if (!sm || !sm.contains(e)) return false; } } }
    return true; };
  const name = (e) => e.tagName.toLowerCase() + (e.dataset && e.dataset.a ? `[${e.dataset.a}]` : '') + (e.className && typeof e.className === 'string' ? '.' + e.className.trim().split(/\s+/).slice(0, 2).join('.') : '');
  for (const e of document.querySelectorAll('button, a[href], summary, input:not([type=hidden]), select, textarea, [role=button]')) {
    if (!sicht(e)) continue; const r = e.getBoundingClientRect();
    if (e.type === 'checkbox' || e.type === 'radio') { const l = e.closest('label'); if (l && l.getBoundingClientRect().height >= 44) continue; }
    if (r.height < 43.5 || r.width < 43.5) out.klein.push(`${name(e)} ${Math.round(r.width)}x${Math.round(r.height)} "${(e.textContent || e.value || '').trim().slice(0, 24)}"`);
  }
  const WEIN = 'rgb(139, 58, 46)', GLUT = 'rgb(232, 118, 58)'; const glutEl = new Set();
  for (const e of document.querySelectorAll('#app *, #ebene-huelle *')) {
    if (!sicht(e)) continue; const s = getComputedStyle(e);
    const werte = [s.color, s.backgroundColor, s.borderTopColor, s.borderBottomColor, s.borderLeftColor, s.borderRightColor, s.outlineColor, s.fill, s.stroke, s.boxShadow, s.textDecorationColor, s.backgroundImage].join('|');
    if (werte.includes(WEIN)) out.weinrot.push(name(e));
    const hatRand = (c, w, st) => c === GLUT && parseFloat(w) > 0 && st !== 'none';
    if (s.color === GLUT && e.textContent.trim() || s.backgroundColor === GLUT || hatRand(s.borderTopColor, s.borderTopWidth, s.borderTopStyle) || hatRand(s.borderBottomColor, s.borderBottomWidth, s.borderBottomStyle) || hatRand(s.borderLeftColor, s.borderLeftWidth, s.borderLeftStyle) || hatRand(s.borderRightColor, s.borderRightWidth, s.borderRightStyle) || (s.fill === GLUT && e.closest('svg') && !e.closest('.gc-figur')) || (s.stroke === GLUT && e.closest('svg')) || s.boxShadow.includes(GLUT)) glutEl.add(name(e));
  }
  out.glut = [...glutEl]; return out;
}"""


async def main():
    befunde = []; ausnahme_log = []; n = 0
    srv = schnellstart.server(PORT)
    try:
        async with async_playwright() as p:
            b = await p.chromium.launch(args=["--no-sandbox"])
            for sprache in SPRACHEN:
                os.environ["SCHNELLSTART_SPRACHE"] = sprache
                for (w, h) in GROESSEN:
                    fehler = []
                    ctx = await b.new_context(viewport={"width": w, "height": h}, device_scale_factor=1, is_mobile=True, has_touch=True, locale="de-DE")
                    await ctx.add_init_script("Object.defineProperty(navigator,'serviceWorker',{value:{controller:{},ready:Promise.resolve(),register:()=>Promise.resolve({}),addEventListener(){},getRegistrations:()=>Promise.resolve([])},configurable:true})")
                    pg = await ctx.new_page(); pg.on("pageerror", lambda e: fehler.append(str(e)))
                    await schnellstart.schnellstart(pg, PORT); await H.beispiel_laden(pg)
                    print(f"-- {sprache} {w}x{h}", flush=True)
                    for z in ZIELE:
                        try:
                            await H.zu_ziel(pg, z)
                            # erst zu (so wie geöffnet), dann alles aufgeklappt
                            for zustand in ("zu", "offen"):
                                if zustand == "offen": await pg.evaluate(nav_hilfe.OEFFNEN, "details"); await pg.wait_for_timeout(150)
                                if zustand == "zu" and z != "buero": continue
                                r = await pg.evaluate(PRUEFE); n += 1; wo = f"{sprache} {w}x{h} {z} ({zustand})"
                                if zustand == "zu":
                                    await pg.evaluate("() => document.querySelectorAll('details').forEach(d => d.open = false)"); r = await pg.evaluate(PRUEFE); await pg.evaluate("() => 0")
                                if r["ueberlauf"] > 0: befunde.append(f"{wo}: waagrechter Überlauf {r['ueberlauf']} px")
                                for k in r["klein"]:
                                    if any(a in k for a in AUSNAHMEN): ausnahme_log.append(f"{wo}: {k}"); continue
                                    befunde.append(f"{wo}: Tippfläche < 44 px: {k}")
                                if r["weinrot"]: befunde.append(f"{wo}: Weinrot: {sorted(set(r['weinrot']))[:4]}")
                                if len(r["glut"]) > 1: befunde.append(f"{wo}: mehr als ein Element in Glut: {r['glut'][:5]}")
                                if r["buehnen"] != 1: befunde.append(f"{wo}: {r['buehnen']} Bühnen")
                        except Exception as e:
                            print("Fehler", z, repr(e)[:100], flush=True); befunde.append(f"{sprache} {w}x{h} {z}: Fehler {repr(e)[:160]}")
                    if fehler: befunde.append(f"{sprache} {w}x{h}: JS-Fehler {fehler[:2]}")
                    await ctx.close()
            await b.close()
    finally: srv.terminate()
    print(f"{n} Messungen"); [print("Ausnahme:", a) for a in ausnahme_log[:40]]
    for f in befunde: print("BEFUND", f)
    print("buero_aussehen_browser:", "grün" if not befunde else f"{len(befunde)} Befunde"); sys.exit(1 if befunde else 0)

asyncio.run(main())
