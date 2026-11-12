import asyncio, sys, os, pathlib, json
HERE = pathlib.Path(__file__).resolve().parent; sys.path.insert(0, str(HERE.parent / "tests"))
from playwright.async_api import async_playwright
import schnellstart as ss, nav_hilfe
LANG = sys.argv[1]; PORT = int(sys.argv[2]); os.environ["SCHNELLSTART_SPRACHE"] = LANG
JUNK = ["12,5", "-3", "1e9", " ", "😀", "x" * 500, "99999999999999999999", "0,0001", "1.5.5", "٣٤٥"]
FLACH = """() => { const out = {}; const seen = new Set(); const walk = (o, p, d) => { if (d > 7 || o === null || typeof o !== 'object' || seen.has(o)) return; seen.add(o); for (const k of Object.keys(o)) { const v = o[k]; if (typeof v === 'number') out[p + '.' + k] = v; else walk(v, p + '.' + k, d + 1); } }; walk(window.__gastrocalc.stand, 's', 0); return out; }"""
FELDER = """() => [...document.querySelectorAll('#app input, #app textarea')].filter(e => { const r = e.getBoundingClientRect(); const t = e.type; return r.width > 4 && r.height > 4 && !['checkbox','radio','file','hidden','date','range','button','submit','color','time'].includes(t) && getComputedStyle(e).visibility !== 'hidden' && !e.disabled; }).map(e => ({f: e.dataset.f || '', n: e.name || '', a: e.dataset.a || '', t: e.type, m: e.inputMode || '', id: e.id || ''}))"""
res = []; fehler = []
async def main():
    srv = ss.server(PORT)
    try:
        async with async_playwright() as p:
            b = await p.chromium.launch(); ctx, pg = await ss.kontext(b, 390, 844, fehler)
            pg.on("dialog", lambda d: asyncio.ensure_future(d.accept()))
            await ss.schnellstart(pg, PORT); await nav_hilfe.rundgang_weg(pg)
            await pg.evaluate("() => { try { localStorage.setItem('gc-zeki-erst', JSON.stringify(['muell','kuehl','putzplan','karte','umsatzheute'])); } catch (e) {} }")
            await nav_hilfe.geh(pg, "laeden")
            if await pg.locator('#app [data-a="beispiel-anlegen"]').count(): await pg.locator('#app [data-a="beispiel-anlegen"]').first.tap(); await pg.wait_for_timeout(800)
            ziele = [("laden", z) for z in ("start", "muell", "kuehl", "putzplan", "karte")] + [("buero", z) for z in ("laeden", "bestand", "aktionen", "umsatz", "preisrunde", "verkauf", "geld3", "ware", "inventur", "lieferanten", "beleg", "getraenke", "kartebuero", "tafel", "einstellungen", "hinweise", "listen", "vergleich")] + [("sub", "umsatzheute")]
            n = 0
            for art, z in ziele:
                try:
                    async def hin():
                        if art == "sub":
                            await nav_hilfe.geh(pg, "start"); await pg.click('#app [data-a="nav"][data-wert="umsatzheute"]'); await pg.wait_for_timeout(400)
                        else: await nav_hilfe.geh(pg, z)
                    await hin(); felder = await pg.evaluate(FELDER)
                except Exception as e: res.append(f"NAV-FEHLER {z}: {str(e)[:100]}"); continue
                for i, f in enumerate(felder):
                    for junk in JUNK:
                        n += 1
                        try:
                            loc = pg.locator("#app input, #app textarea").filter(visible=True).nth(0)  # placeholder
                            sel = f'#app [data-f="{f["f"]}"]' if f["f"] else None
                            if not sel: continue
                            el = pg.locator(sel).first
                            if not await el.count() or not await el.is_visible(): await hin(); 
                            vor = await pg.evaluate(FLACH)
                            await el.scroll_into_view_if_needed(timeout=2000); await el.tap(timeout=2000)
                            await pg.keyboard.press("Control+A"); await pg.keyboard.insert_text(junk) if junk.strip() else await pg.keyboard.press("Backspace")
                            await pg.keyboard.press("Tab"); await pg.wait_for_timeout(120)
                            nach = await pg.evaluate(FLACH); txt = await pg.inner_text("body")
                            schlecht = {k: v for k, v in nach.items() if (k not in vor or vor[k] != v) and (v != v or abs(v) == float('inf') or v < 0 or abs(v) >= 1e8)}
                            import re
                            bad = [w for w in ("NaN", "undefined", "Infinity", "[object") if re.search(r"(?<![„\"“'»])" + re.escape(w), txt)]
                            wert = await pg.evaluate("(s) => { const e = document.querySelector(s); return e ? e.value : null }", sel)
                            if schlecht or bad: res.append(f"{LANG} {art}/{z} Feld {f['f']} Eingabe {junk[:12]!r} -> Feldwert {str(wert)[:20]!r} Stand {json.dumps(schlecht)[:160]} Text {bad}")
                        except Exception as e:
                            res.append(f"AUSNAHME {z} {f['f']} {junk[:8]!r}: {str(e)[:90]}")
                            try: await hin()
                            except Exception: pass
                    await hin()
            res.append(f"{LANG}: {n} Eingaben, Konsolenfehler {len(fehler)} {fehler[:3]}")
            await b.close()
    finally: srv.terminate()
    (HERE / "log" / f"zahlen_{LANG}.txt").write_text("\n".join(res)); print("\n".join(res[-40:]))
asyncio.run(main())
