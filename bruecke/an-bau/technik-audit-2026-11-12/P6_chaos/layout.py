import asyncio, sys, os, pathlib, json
HERE = pathlib.Path(__file__).resolve().parent; sys.path.insert(0, str(HERE.parent / "tests"))
from playwright.async_api import async_playwright
import schnellstart as ss, nav_hilfe
LANG = sys.argv[1]; PORT = int(sys.argv[2]); BREITE = int(sys.argv[3]) if len(sys.argv) > 3 else 360; HOEHE = 740 if BREITE == 360 else 844
os.environ["SCHNELLSTART_SPRACHE"] = LANG
MESS = r"""() => {
  const vw = innerWidth; const out = {seite: document.documentElement.scrollWidth - vw, ueber: [], klein: [], ohneName: [], ohneLabel: [], bilderOhneAlt: [], abgeschnitten: []};
  const sig = (e) => { const t = (e.innerText || e.value || e.getAttribute('aria-label') || e.placeholder || '').trim().replace(/\s+/g, ' ').slice(0, 28); return e.tagName.toLowerCase() + (e.dataset.a ? '[' + e.dataset.a + ']' : '') + (e.dataset.f ? '{' + e.dataset.f + '}' : '') + (e.className && typeof e.className === 'string' ? '.' + e.className.split(' ').slice(0, 2).join('.') : '') + (t ? ' "' + t + '"' : ''); };
  const sichtbar = (e) => { const r = e.getBoundingClientRect(); if (r.width < 1 || r.height < 1) return false; const cs = getComputedStyle(e); if (cs.visibility === 'hidden' || cs.display === 'none' || +cs.opacity === 0) return false; for (let p = e; p && p !== document.body; p = p.parentElement) { if (p.tagName === 'DETAILS' && !p.open && !(e.tagName === 'SUMMARY' && e.parentElement === p)) return false; if (getComputedStyle(p).display === 'none') return false; } return true; };
  const wurzeln = [document.getElementById('app'), document.getElementById('ebene-huelle'), ...document.querySelectorAll('.tableiste, .ebene-kopf')].filter(Boolean);
  const alle = new Set(); for (const w of wurzeln) { alle.add(w); for (const e of w.querySelectorAll('*')) alle.add(e); }
  for (const e of alle) {
    if (!sichtbar(e)) continue; const r = e.getBoundingClientRect(); const cs = getComputedStyle(e);
    if (e.closest('svg') && e.tagName !== 'svg') continue;
    // Überlauf aus dem Fenster
    if (r.right > vw + 1 || r.left < -1) { const innerhalb = e.closest('[style*="overflow-x"], .chips, .scroll, .karussell'); out.ueber.push({s: sig(e), l: Math.round(r.left), r: Math.round(r.right), w: Math.round(r.width), scroller: !!innerhalb}); }
    // Text abgeschnitten
    const hat = [...e.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
    if (hat) {
      const clipX = e.scrollWidth > e.clientWidth + 1 && (cs.overflowX !== 'visible'); const clipY = e.scrollHeight > e.clientHeight + 2 && (cs.overflowY === 'hidden' || cs.overflowY === 'clip');
      const ell = cs.textOverflow === 'ellipsis' && e.scrollWidth > e.clientWidth + 1;
      if (clipX || clipY || ell) out.abgeschnitten.push({s: sig(e), sw: e.scrollWidth, cw: e.clientWidth, sh: e.scrollHeight, ch: e.clientHeight, ell});
    }
    const klick = e.matches('button, a[href], select, textarea, summary, [role=button], [data-a], input:not([type=hidden])') ;
    if (klick) {
      if ((r.width < 44 || r.height < 44) && !e.closest('.tableiste') || (e.closest('.tableiste') && (r.width < 44 || r.height < 44))) out.klein.push({s: sig(e), w: Math.round(r.width), h: Math.round(r.height)});
      const name = (e.getAttribute('aria-label') || '').trim() || (e.getAttribute('aria-labelledby') ? (document.getElementById(e.getAttribute('aria-labelledby'))?.textContent || '').trim() : '') || (e.innerText || '').trim() || (e.getAttribute('title') || '').trim() || (e.querySelector('img[alt]:not([alt=""])') ? 'img' : '') || (e.querySelector('svg title') ? 'svgtitle' : '');
      if (['BUTTON', 'A', 'SUMMARY'].includes(e.tagName) || e.getAttribute('role') === 'button') { if (!name) out.ohneName.push({s: sig(e)}); }
      else if (['INPUT', 'SELECT', 'TEXTAREA'].includes(e.tagName) && e.type !== 'hidden') { const lab = name || (e.labels && e.labels.length) || e.placeholder; if (!lab && !e.closest('label')) out.ohneLabel.push({s: sig(e)}); }
    }
    if (e.tagName === 'IMG' && !e.hasAttribute('alt')) out.bilderOhneAlt.push({s: sig(e)});
  }
  return out; }"""
async def main():
    srv = ss.server(PORT); fehler = []; ergebnis = {}
    try:
        async with async_playwright() as p:
            b = await p.chromium.launch()
            ctx, pg = await ss.kontext(b, BREITE, HOEHE, fehler)
            pg.on("dialog", lambda d: asyncio.ensure_future(d.accept()))
            await ss.schnellstart(pg, PORT)
            await nav_hilfe.rundgang_weg(pg)
            await pg.evaluate("() => { try { localStorage.setItem('gc-zeki-erst', JSON.stringify(['muell','kuehl','putzplan','karte','umsatzheute'])); } catch (e) {} }")
            # Beispiel-Laden für gefüllte Bildschirme
            await nav_hilfe.geh(pg, "laeden"); 
            if await pg.locator('#app [data-a="beispiel-anlegen"]').count(): await pg.locator('#app [data-a="beispiel-anlegen"]').first.tap(); await pg.wait_for_timeout(800)
            await nav_hilfe.rundgang_weg(pg)
            besucht = {}
            async def messen(name):
                await pg.wait_for_timeout(350)
                m = await pg.evaluate(MESS); m["lang"] = await pg.evaluate("document.documentElement.lang + '|' + document.documentElement.dir")
                m["text"] = len((await pg.inner_text("#app")).strip()); ergebnis[name] = m
            # Laden-Reiter + Abschluss
            for z in ("start", "muell", "kuehl", "putzplan", "karte", "abschluss"):
                await nav_hilfe.geh(pg, z); await messen("laden/" + z)
            # Menü-Blatt
            await nav_hilfe.geh(pg, "start"); await nav_hilfe.menue(pg); await messen("blatt/menue")
            await pg.keyboard.press("Escape")
            # Büro: Breitensuche über nav-Ziele
            await nav_hilfe.geh(pg, "buero"); await messen("buero/start")
            ziele = await pg.evaluate("() => [...new Set([...document.querySelectorAll('#app [data-a=\"nav\"]')].map(e => e.dataset.wert))]")
            queue = [[z] for z in ziele if z not in ("start", "muell", "kuehl", "putzplan", "karte", "abschluss")]; gesehen = set(ziele) | set(); n = 0
            while queue and n < 70:
                pfad = queue.pop(0); n += 1
                try:
                    await nav_hilfe.ins_buero(pg)
                    for z in pfad: await nav_hilfe._tipp(pg, f'#app [data-a="nav"][data-wert="{z}"]', 400)
                    await messen("buero/" + ">".join(pfad))
                    if len(pfad) < 2:
                        sub = await pg.evaluate("() => [...new Set([...document.querySelectorAll('#app [data-a=\"nav\"]')].map(e => e.dataset.wert))]")
                        for s in sub:
                            if s not in gesehen and s not in ("start", "buero", "muell", "kuehl", "putzplan", "karte", "abschluss"): gesehen.add(s); queue.append(pfad + [s])
                except Exception as e: ergebnis["FEHLER/" + ">".join(pfad)] = {"fehler": str(e)[:150]}
            await b.close()
    finally: srv.terminate()
    json.dump({"fehler": fehler, "screens": ergebnis}, open(HERE / "log" / f"layout_{LANG}_{BREITE}.json", "w"), ensure_ascii=False, indent=1)
    print(LANG, BREITE, "Bildschirme:", len(ergebnis), "Konsolenfehler:", len(fehler))
asyncio.run(main())
