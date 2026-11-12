import asyncio, sys, os, pathlib, json
HERE = pathlib.Path(__file__).resolve().parent; APP = HERE.parent
sys.path.insert(0, str(APP / "tests"))
from playwright.async_api import async_playwright
import schnellstart as ss, nav_hilfe
PORT = 8836
ZAHL = "(j) => { const s = window.__gastrocalc.stand; return (s[j] || []).filter((x) => !x.storniert && !x.entwurf).length; }"
res = []
def R(*a):
    l = " ".join(str(x) for x in a); res.append(l); print(l, flush=True)

async def ready(pg):
    await pg.wait_for_function("() => window.__gastrocalc && window.__gastrocalc.stand", timeout=20000); await pg.wait_for_timeout(500)

async def main():
    srv = ss.server(PORT); fehler = []
    try:
        async with async_playwright() as p:
            b = await p.chromium.launch(); ctx, pg = await ss.kontext(b, 390, 844, fehler)
            pg.on("dialog", lambda d: asyncio.ensure_future(d.accept()))
            await ss.schnellstart(pg, PORT); await nav_hilfe.rundgang_weg(pg)
            await pg.evaluate("() => { try { localStorage.setItem('gc-zeki-erst', JSON.stringify(['muell','kuehl','putzplan','karte','umsatzheute'])); } catch (e) {} }")
            # ---- 2a Neuladen mitten im Speichern (Abstand 0..300 ms), Müll-Tipp / Umsatz / Abschluss
            for ms in (0, 3, 10, 30, 60, 150, 300):
                await nav_hilfe.geh(pg, "muell"); await pg.wait_for_timeout(400)
                vor = await pg.evaluate(ZAHL, "schwund")
                await pg.locator('#app [data-a="muell-tipp"]').first.tap()
                await pg.wait_for_timeout(ms); await pg.reload(); await ready(pg)
                n = await pg.evaluate(ZAHL, "schwund"); R(f"2a Müll-Tipp, Neuladen nach {ms} ms: {vor} -> {n}", "OK" if n == vor + 1 else "<<< VERLOREN" if n == vor else "<<< ANDERS")
            for ms in (0, 10, 50, 150):
                await nav_hilfe.geh(pg, "start"); await pg.click('#app [data-a="nav"][data-wert="umsatzheute"]'); await pg.wait_for_selector('[data-f="ul-umsatz"]')
                wert = str(1000 + ms)
                await pg.locator('[data-f="ul-umsatz"]').fill(wert); await pg.locator('[data-a="ul-speichern"]').tap()
                await pg.wait_for_timeout(ms); await pg.reload(); await ready(pg)
                u = await pg.evaluate("(w) => (window.__gastrocalc.stand.tagesnotizen || []).filter((x) => !x.storniert && x.umsatz === +w).length", wert)
                R(f"2a Umsatz {wert} speichern, Neuladen nach {ms} ms:", "OK" if u >= 1 else "<<< VERLOREN", "(eventuell Rückfrage-Blatt)")
            # ---- 2b offline / online
            vor = await pg.evaluate(ZAHL, "schwund"); await nav_hilfe.geh(pg, "muell"); await pg.wait_for_timeout(400)
            await ctx.set_offline(True)
            await pg.locator('#app [data-a="muell-tipp"]').first.tap(); await pg.wait_for_timeout(300)
            await pg.reload(); await ready(pg)
            n = await pg.evaluate(ZAHL, "schwund"); R(f"2b offline Müll-Tipp + Neuladen offline: {vor} -> {n}", "OK" if n == vor + 1 else "<<< ANDERS")
            txt = await pg.inner_text("body"); R("2b offline: Seite nach Neuladen sichtbar, Textlänge", len(txt))
            await ctx.set_offline(False); await pg.wait_for_timeout(500)
            for i in range(10):
                await ctx.set_offline(i % 2 == 0)
                if await pg.locator('#app [data-a="muell-tipp"]').count(): await pg.locator('#app [data-a="muell-tipp"]').first.tap(timeout=3000)
                await pg.wait_for_timeout(80)
            R("2b nach Flackern, URL/Text:", (await pg.inner_text('#app'))[:80].replace(chr(10),' | '))
            await ctx.set_offline(False); await pg.wait_for_timeout(1500)
            R("2b Offline-Flackern: Fehler bisher", len(fehler), fehler[-3:])
            # ---- 2c Hintergrund / Einfrieren
            await nav_hilfe.geh(pg, 'muell'); await pg.wait_for_timeout(400)
            cdp = await ctx.new_cdp_session(pg)
            vor = await pg.evaluate(ZAHL, "schwund")
            await pg.locator('#app [data-a="muell-tipp"]').first.tap()
            await cdp.send("Page.setWebLifecycleState", {"state": "frozen"}); await asyncio.sleep(1.5); await cdp.send("Page.setWebLifecycleState", {"state": "active"}); await pg.wait_for_timeout(800)
            n = await pg.evaluate(ZAHL, "schwund"); R(f"2c Tipp, dann Seite einfrieren/auftauen: {vor} -> {n}", "OK" if n == vor + 1 else "<<< ANDERS")
            await pg.evaluate("() => { Object.defineProperty(document, 'hidden', {value: true, configurable: true}); document.dispatchEvent(new Event('visibilitychange')); }"); await pg.wait_for_timeout(300)
            await pg.evaluate("() => { Object.defineProperty(document, 'hidden', {value: false, configurable: true}); document.dispatchEvent(new Event('visibilitychange')); }"); await pg.wait_for_timeout(500)
            R("2c Sichtbarkeitswechsel: Textlänge", len(await pg.inner_text("#app")))
            # ---- 2d Doppeltipp auf Speichern
            async def dbl(sel, wartet=0):
                loc = pg.locator(sel).first; box = await loc.bounding_box(); x = box["x"] + box["width"] / 2; y = box["y"] + box["height"] / 2
                await pg.touchscreen.tap(x, y); await pg.wait_for_timeout(wartet); await pg.touchscreen.tap(x, y); await pg.wait_for_timeout(700)
            for w in (0, 40, 120):
                await nav_hilfe.geh(pg, "start"); await pg.click('#app [data-a="nav"][data-wert="umsatzheute"]'); await pg.wait_for_selector('[data-f="ul-umsatz"]')
                v0 = await pg.evaluate("() => (window.__gastrocalc.stand.tagesnotizen || []).length")
                await pg.locator('[data-f="ul-umsatz"]').fill(str(777 + w)); await dbl('[data-a="ul-speichern"]', w)
                v1 = await pg.evaluate("() => { const t = window.__gastrocalc.stand.tagesnotizen || []; return [t.length, t.filter(x=>!x.storniert).length]; }")
                R(f"2d Doppeltipp Umsatz-Speichern (Abstand {w} ms): Notizen gesamt vorher {v0}, nachher {v1}")
            await nav_hilfe.geh(pg, "muell"); await pg.wait_for_timeout(400)
            vor = await pg.evaluate(ZAHL, "schwund"); await dbl('#app [data-a="muell-tipp"]', 0); n = await pg.evaluate(ZAHL, "schwund"); R(f"2d Doppeltipp Müll-Tipp: {vor} -> {n}", "(2 Tipps = 2 Einträge erwartbar)")
            await nav_hilfe.geh(pg, "kuehl"); await pg.wait_for_timeout(400)
            if await pg.locator('#app [data-a="kuehl-einzel"]').count():
                await pg.locator('#app [data-a="kuehl-einzel"]').first.tap(); await pg.wait_for_timeout(400)
                vor = await pg.evaluate(ZAHL, "messungen"); await pg.fill('[data-f="station-wert"]', "4")
                await dbl('[data-a="station-speichern"]', 0); n = await pg.evaluate(ZAHL, "messungen"); R(f"2d Doppeltipp Kühlwert speichern: {vor} -> {n}", "OK" if n == vor + 1 else "<<< DOPPELT/ANDERS")
            await nav_hilfe.geh(pg, "abschluss"); await pg.wait_for_timeout(400)
            if await pg.locator('[data-a="abschluss-fertig"]').count():
                vor = await pg.evaluate(ZAHL, "abschluesse"); await dbl('[data-a="abschluss-fertig"]', 0); n = await pg.evaluate(ZAHL, "abschluesse"); R(f"2d Doppeltipp Tag abschließen: {vor} -> {n}", "OK" if n <= vor + 1 else "<<< DOPPELT")
            await nav_hilfe.geh(pg, "putzplan"); await pg.wait_for_timeout(400)
            if await pg.locator('#app [data-a="pp-haken"]').count():
                vor = await pg.evaluate(ZAHL, "putzlog"); await dbl('#app [data-a="pp-haken"]', 0); n = await pg.evaluate(ZAHL, "putzlog"); R(f"2d Doppeltipp Putz-Haken: {vor} -> {n}", "(0 = abhaken+zurück, 1 = nur einmal, 2 = doppelt)")
            # ---- 2e Tabs rasend wechseln
            await nav_hilfe.geh(pg, "start"); n0 = len(fehler)
            seq = ["start", "muell", "kuehl", "putzplan", "karte"]; last = None
            import random; rnd = random.Random(3)
            for i in range(300):
                last = rnd.choice(seq); loc = pg.locator(f'.tableiste [data-a="nav"][data-wert="{last}"]')
                try: await loc.tap(timeout=1500, no_wait_after=True)
                except Exception as e: R("2e Tab nicht tippbar:", i, str(e)[:100]); break
                await pg.wait_for_timeout(rnd.choice([0, 5, 20, 50]))
            await pg.wait_for_timeout(800)
            akt = await pg.evaluate("() => document.querySelector('.tableiste [aria-current], .tableiste .an, .tableiste .aktiv')?.dataset.wert || null")
            R(f"2e 300 Tab-Wechsel: letzter Tipp={last}, aktiver Tab={akt}, neue Fehler={len(fehler)-n0}, Textlänge={len(await pg.inner_text('#app'))}")
            R("FEHLER gesamt:", len(fehler), fehler[:5])
            await b.close()
    finally: srv.terminate()
    (HERE / "log" / "unterbrechung.txt").write_text("\n".join(res))
asyncio.run(main())
