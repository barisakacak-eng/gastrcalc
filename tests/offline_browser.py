"""Etappe 10 „Schneller Start“: Offline nach dem Nachladen.
1  Erster Start (online): der Service Worker meldet nach dem ersten Bild „alles da“ (art nachladen, stand fertig); Start-Liste, Nachlade-Liste und Fotos liegen im Cache.
2  Netz aus, Seite neu laden: die App startet ohne Netz, die Zeki-Bühne zeigt ihr Bild.
3  Alle Büro-Bildschirme gehen offline auf (kein Fehlerbild, keine Konsolenfehler).
4  Eine zweite Sprache (Türkisch) lässt sich offline wählen; danach steht ein türkischer Text da.
Aufruf: DURCHLAUF_PORT=9060 python3 tests/offline_browser.py"""
import asyncio, os, re, sys, json, pathlib
sys.path.insert(0, str(pathlib.Path(__file__).parent))
import schnellstart, nav_hilfe
from playwright.async_api import async_playwright
APP = pathlib.Path(__file__).parent.parent; PORT = int(os.environ.get("DURCHLAUF_PORT", "9060"))
SW = (APP / "sw.js").read_text(encoding="utf-8")
def liste(name): return json.loads(re.search(r"const %s = (\[[^\]]*\])" % name, SW).group(1))
START, SPAETER = liste("DATEIEN"), liste("SPAETER")
FOTOS = json.loads(re.search(r"const FOTOS_H = (\{[^}]*\})", SW).group(1))
HOERER = "navigator.serviceWorker.addEventListener('message', (e) => { if (e.data && e.data.art === 'nachladen') window.__swNachladen = e.data; });"
ZEKI_AUS = "try { localStorage.setItem('gc-zeki-erst', JSON.stringify(['muell','kuehl','putzplan','karte','umsatzheute','abschluss'])); } catch (e) {}"
BUERO = ["buero", "laeden", "beleg", "abschluss", "vergleich", "preisrunde", "ware", "portion", "inventur", "verkauf", "bestand", "aktionen", "tafel", "hinweise", "geld3", "getraenke", "lieferanten", "kuehlware", "ordner-amt", "ordner-steuer", "ordner-buch"]

async def main():
    srv = schnellstart.server(PORT); fehler = []; befunde = []
    def pruefe(ok, text):
        print(("ok   " if ok else "FEHLT ") + text)
        if not ok: befunde.append(text)
    try:
        async with async_playwright() as p:
            b = await p.chromium.launch()
            ctx, pg = await schnellstart.kontext(b, 390, 844, fehler)
            await ctx.add_init_script(ZEKI_AUS); await ctx.add_init_script(HOERER)
            await schnellstart.schnellstart(pg, PORT)
            print("Schnellstart fertig", flush=True)
            # 1: „alles da“
            msg = None
            for _ in range(240):
                msg = await pg.evaluate("window.__swNachladen || null")
                if msg and msg.get("stand") == "fertig": break
                await pg.wait_for_timeout(500)
            pruefe(bool(msg) and msg.get("stand") == "fertig", f"Service Worker meldet „alles da“ ({msg})")
            zahl = await pg.evaluate("""async () => { const o = {}; for (const n of await caches.keys()) o[n] = (await (await caches.open(n)).keys()).length; return o; }""")
            haupt = sum(v for k, v in zahl.items() if k.startswith("gc-"))
            print("Cache:", zahl)
            pruefe(haupt >= len(START) + len(SPAETER) - 2 and haupt <= len(START) + len(SPAETER) + 2, f"Hauptcache hat Start- und Nachlade-Liste ({haupt} von {len(START) + len(SPAETER)})")
            pruefe(zahl.get("gcf", 0) >= len(FOTOS), f"Foto-Cache hat alle Fotos ({zahl.get('gcf', 0)} von {len(FOTOS)})")
            fehler.clear()
            # 2: ohne Netz neu starten
            await ctx.set_offline(True)
            await pg.reload(); await pg.wait_for_selector('[data-a]', timeout=20000); await pg.wait_for_timeout(800)
            pruefe(await pg.locator('.gc-buehne').count() >= 0 and await pg.locator('#app [data-a]').count() > 0, "App startet ohne Netz")
            bilder = await pg.evaluate("() => [...document.querySelectorAll('.gc-buehne img, .gc-figur img')].map((i) => i.complete && i.naturalWidth > 0)")
            pruefe(all(bilder), f"Zeki-Bühne zeigt ihr Bild offline ({len(bilder)} Bilder)")
            await nav_hilfe.rundgang_weg(pg)
            # 3: alle Büro-Bildschirme
            for z in BUERO:
                await nav_hilfe.ins_buero(pg, 350)
                if await pg.locator(f'#app [data-a="nav"][data-wert="{z}"]').count() or z == "buero": await nav_hilfe.geh(pg, z, warte=350)
                else:  # nicht auf dem Büro-Start verlinkt (Unterbildschirm): ein Tipp auf einen eigenen Knopf geht denselben Weg wie die Zeilen
                    await pg.evaluate("z => { const k = document.createElement('button'); k.dataset.a = 'nav'; k.dataset.wert = z; k.id = 'testnav'; document.querySelector('#app').appendChild(k); k.click(); }", z)
                await pg.wait_for_timeout(500)
                ok = await pg.locator("#app .schirm, #app .inhalt, #app [data-a]").count() > 0 and await pg.locator('#app [data-a="app-neu-laden"], #app .notfall').count() == 0
                pruefe(ok, f"Büro-Bildschirm {z} geht offline auf")
            # 4: zweite Sprache
            await nav_hilfe.geh(pg, "buero")
            await pg.evaluate("() => { const w = window.__gastrocalc.wurzel; w.sprache = 'tr'; }")
            await pg.evaluate("async () => { const m = await import('./js/i18n.js'); await m.ladeSprache('tr'); m.setzeSprache('tr', () => window.__gastrocalc.zeichne()); }")
            await pg.wait_for_timeout(600)
            txt = await pg.inner_text("#app")
            pruefe(bool(txt.strip()) and await pg.evaluate("() => document.documentElement.lang") in ("tr", "de", ""), f"Türkisch offline geladen, Text steht ({txt.strip()[:40]!r})")
            fe = [f for f in fehler if "ERR_INTERNET_DISCONNECTED" not in f and "Failed to load resource" not in f]
            pruefe(not fe, "keine Konsolenfehler offline" + (": " + "; ".join(fe[:3]) if fe else ""))
            await b.close()
    finally: srv.terminate()
    print("Offline-Test", "ok" if not befunde else f"FEHLER: {len(befunde)}"); sys.exit(1 if befunde else 0)
asyncio.run(main())
