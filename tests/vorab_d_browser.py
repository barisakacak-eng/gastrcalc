"""Vorab-Prüfung 03.11.2026, Klasse D (04.11.2026) bei 360 px:
ar: Ladenart-Beschriftung rechtsbündig, Weiter-Pfeile gespiegelt, Fassung in der Versionszeile isoliert (nicht vertauscht).
tr: „sa. toplam“ in einer Zeile, Miete-Feld zeigt 10 Stellen ganz, langer Gerichtname im Preis-Blatt nicht nach einem Wort abgeschnitten.
Aufruf: DURCHLAUF_PORT=8852 python3 tests/vorab_d_browser.py"""
import asyncio, os, sys, pathlib, subprocess, time
sys.path.insert(0, str(pathlib.Path(__file__).parent))
import schnellstart, nav_hilfe
from playwright.async_api import async_playwright
APP = pathlib.Path(__file__).parent.parent; PORT = int(os.environ.get("DURCHLAUF_PORT", "8852"))

async def main():
    srv = subprocess.Popen([sys.executable, "-m", "http.server", str(PORT), "--bind", "127.0.0.1"], cwd=str(APP), stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    time.sleep(0.8); fehler = []; befunde = []
    try:
        async with async_playwright() as p:
            b = await p.chromium.launch()
            # ---- ar: Einrichtung, Ladenart-Kacheln
            ctx, pg = await schnellstart.kontext(b, 360, 780, fehler)
            await pg.goto(f"http://127.0.0.1:{PORT}/index.html"); await pg.wait_for_selector('[data-f="sprache-wahl"]')
            for _ in range(240):
                if await pg.evaluate("!!navigator.serviceWorker.controller"): break
                await pg.wait_for_timeout(500)
            await pg.select_option('[data-f="sprache-wahl"]', "ar"); await pg.click('[data-a="sprache"][data-wert="ar"]'); await nav_hilfe.nach_sprache(pg); await pg.wait_for_selector('[data-a="laden-art"]')
            ta = await pg.evaluate("getComputedStyle(document.querySelector('[data-a=\"laden-art\"] b')).textAlign")
            print("ar Ladenart text-align:", ta)
            if ta not in ("right", "start"): befunde.append(f"ar Ladenart-Beschriftung {ta}")
            await ctx.close()
            # ---- ar: Heute und Einstellungen
            os.environ["SCHNELLSTART_SPRACHE"] = "ar"
            ctx, pg = await schnellstart.kontext(b, 360, 780, fehler); await schnellstart.schnellstart(pg, PORT)
            sc = await pg.evaluate("[...document.querySelectorAll('#app svg.sym.richtung')].map(e => getComputedStyle(e).scale)")
            print("ar Heute Pfeile scale:", sc)
            if not sc or any(x != "-1 1" for x in sc): befunde.append(f"ar Weiter-Pfeile nicht gespiegelt: {sc}")
            await nav_hilfe.ins_buero(pg); await nav_hilfe.geh(pg, "einstellungen"); await pg.wait_for_timeout(400)
            f = await pg.evaluate("(() => { const e = document.querySelector('.kopfband .unter .fassung-nr'); return e ? [e.getAttribute('dir'), e.textContent] : null; })()")
            print("ar Fassung:", f)
            if not f or f[0] != "ltr" or not f[1].startswith("20"): befunde.append(f"ar Versionszeile: {f}")
            await ctx.close()
            # ---- tr: Umsatz-Feld, Miete, Preis-Blatt
            os.environ["SCHNELLSTART_SPRACHE"] = "tr"
            ctx, pg = await schnellstart.kontext(b, 360, 780, fehler)
            await ctx.add_init_script("try { localStorage.setItem('gc-zeki-erst', JSON.stringify(['muell','kuehl','putzplan','karte','umsatzheute'])); } catch (e) {}")
            await schnellstart.schnellstart(pg, PORT)
            await pg.evaluate("() => { const s = window.__gastrocalc.stand; s.personen = [{ id: 'p1', kuerzel: 'AB', name: 'AB', stundenlohn: 14, lohnArt: 'angestellt', lohnModell: 'stunde' }]; window.__gastrocalc.zeichne(); }")
            await nav_hilfe.geh(pg, "start"); await pg.click('#app [data-a="nav"][data-wert="umsatzheute"]'); await pg.wait_for_selector('[data-f="ul-umsatz"]'); await pg.wait_for_timeout(400)
            h = await pg.evaluate("[...document.querySelectorAll('.ul-team-zahlen .einheit')].map(e => Math.round(e.getBoundingClientRect().height))")
            print("tr Team-Beschriftung Höhen:", h)
            if len(h) != 2 or h[1] > h[0] * 1.3: befunde.append(f"tr „sa. toplam“ bricht um: {h}")
            await pg.evaluate("""async () => { const kl = await import('./js/karte_lesen.js'); const s = window.__gastrocalc.stand;
              kl.vorschlaegeUebernehmen(s, kl.vorschlaegeAusText("Tavuk Döner Dürüm Menü Büyük ⋯ 12,50", s).map((v) => ({ ...v, an: true }))); window.__gastrocalc.zeichne(); }""")
            await nav_hilfe.geh(pg, "start"); await pg.locator('.tableiste [data-a="nav"][data-wert="karte"]').click(); await pg.wait_for_timeout(700)
            await pg.evaluate("document.querySelectorAll('.zeki-erst').forEach(e => e.remove())")
            await pg.locator('#app [data-a="kl-auf"]').last.click(); await pg.wait_for_timeout(700)
            t = await pg.evaluate("(() => { const e = document.querySelector('.kl-preiskopf b'); return e ? [e.textContent, getComputedStyle(e).whiteSpace, Math.round(e.getBoundingClientRect().height), parseFloat(getComputedStyle(e).lineHeight) || 0] : null; })()")
            print("tr Preis-Blatt Titel:", t)
            if not t or t[1] == "nowrap": befunde.append(f"tr Gerichtname im Preis-Blatt einzeilig abgeschnitten: {t}")
            await pg.click('button.kl-x[data-a="kl-zu"]'); await pg.wait_for_timeout(500)
            await nav_hilfe.geh(pg, "start"); await pg.click('#app .h-ziel-fehlt'); await pg.wait_for_timeout(900)
            await pg.locator('[data-a="posten"]').first.click(); await pg.wait_for_timeout(600)
            feld = pg.locator('[data-f="posten:miete"]'); await feld.fill(""); await feld.click(); await pg.keyboard.type("1234567,89"); await pg.wait_for_timeout(200)
            w = await pg.evaluate("(() => { const e = document.querySelector('[data-f=\"posten:miete\"]'); return [e.value, e.scrollWidth, e.clientWidth]; })()")
            print("tr Miete-Feld:", w)
            if w[1] > w[2] + 1: befunde.append(f"Miete-Feld schneidet ab: {w}")
            await b.close()
    finally: srv.terminate()
    print("VORAB-D " + ("OK" if not befunde else "; ".join(befunde))); sys.exit(1 if befunde else 0)
asyncio.run(main())
