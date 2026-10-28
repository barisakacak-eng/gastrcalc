"""Rauchtest der LIVE-Seite (28.10.2026): lädt https://barisakacak-eng.github.io/gastrcalc/ in Chromium (Handy 390×844) und prüft
  1 die Seite lädt (Willkommen-Bild mit Sprachauswahl steht),
  2 keine Konsolenfehler und keine Skriptfehler beim Laden und beim Schnellstart,
  3 die Fassung aus js/fassung.js der Live-Seite ist gleich der lokalen (nur mit --erwartet <Pfad zur lokalen js/fassung.js>; Live-Fassung wird immer genannt),
  4 „Heute“ zeigt nach dem Schnellstart (Deutsch, Döner & Grill, Karte „Später“) eine Euro-Zahl.
Es werden keine Zugangsdaten gebraucht und nichts auf der Seite dauerhaft verändert (frischer Browser, Daten bleiben nur im Testbrowser).
Ist das Netz gesperrt oder die Seite nicht erreichbar, endet das Skript sauber mit einem Hinweis und Exit-Code 2 (= nicht prüfbar, nicht „kaputt“).
Exit 0 = alles in Ordnung · Exit 1 = Prüfung fehlgeschlagen · Exit 2 = Live-Seite nicht erreichbar.
Start: python3 tools/rauchtest_live.py [--url <Adresse>] [--erwartet js/fassung.js]"""
import argparse, asyncio, pathlib, re, sys
from urllib.parse import urljoin

LIVE = "https://barisakacak-eng.github.io/gastrcalc/"
APP = pathlib.Path(__file__).resolve().parent.parent
EURO = re.compile(r"\d[\d.]*(?:,\d+)?\s*€")
FASSUNG_RE = re.compile(r'FASSUNG\s*=\s*"([^"]+)"')


def fassung_aus(text):
    m = FASSUNG_RE.search(text or "")
    return m.group(1) if m else None


async def pruefen(url, erwartet_pfad):
    from playwright.async_api import async_playwright
    ergebnis = []  # (name, ok, text)
    def ok(name, gut, text=""): ergebnis.append((name, bool(gut), text))
    fehler = []
    async with async_playwright() as p:
        b = await p.chromium.launch()
        ctx = await b.new_context(viewport={"width": 390, "height": 844}, device_scale_factor=2, is_mobile=True, has_touch=True, locale="de-DE")
        pg = await ctx.new_page()
        pg.on("console", lambda m: fehler.append("Konsole: " + m.text) if m.type == "error" else None)
        pg.on("pageerror", lambda e: fehler.append("Skript: " + str(e)))
        try:
            antwort = await pg.goto(url, timeout=30000, wait_until="load")
            if antwort is None or antwort.status >= 400:
                raise RuntimeError(f"Antwort {antwort.status if antwort else 'keine'}")
            await pg.wait_for_selector('[data-f="sprache-wahl"], .kachel', timeout=30000)
        except Exception as e:
            await b.close()
            return None, f"{type(e).__name__}: {str(e).splitlines()[0][:160]}"
        ok("Seite lädt", True, url)
        # Fassung: js/fassung.js der Live-Seite lesen
        try:
            r = await pg.request.get(urljoin(url, "js/fassung.js"), timeout=20000)
            live_fassung = fassung_aus(await r.text()) if r.ok else None
        except Exception:
            live_fassung = None
        quelltext = await pg.content()
        if erwartet_pfad:
            lokal = fassung_aus(pathlib.Path(erwartet_pfad).read_text(encoding="utf-8"))
            ok("Fassung gleich der lokalen", live_fassung is not None and live_fassung == lokal, f"live {live_fassung} · lokal {lokal}")
        else:
            ok("Fassung lesbar", live_fassung is not None, f"live {live_fassung} (kein --erwartet angegeben, nur gemeldet)")
        # Schnellstart bis Heute
        try:
            for _ in range(240):  # erster Start: Service Worker übernimmt die Seite
                if await pg.evaluate("!!navigator.serviceWorker && !!navigator.serviceWorker.controller"): break
                await pg.wait_for_timeout(500)
            await pg.select_option('[data-f="sprache-wahl"]', "de"); await pg.click('[data-a="sprache"][data-wert="de"]')
            for _ in range(150):  # Schloss-Schritt überspringen
                if await pg.locator('[data-a="laden-art"]').count(): break
                if await pg.locator('[data-a="bio-einrichten"]').count():
                    try: await pg.click('[data-a="weiter"]', timeout=3000)
                    except Exception: pass
                await pg.wait_for_timeout(120)
            await pg.wait_for_selector('[data-a="laden-art"]', timeout=10000)
            async def weiter(id_):
                for _ in range(3):
                    await pg.click('[data-a="weiter"]')
                    for _ in range(30):
                        await pg.wait_for_timeout(100)
                        if await pg.evaluate("window.__gastrocalc.stand.schrittId") == id_: await pg.wait_for_timeout(150); return
                raise AssertionError(f"Schritt {id_} nicht erreicht")
            await pg.fill('[data-f="betrieb.name"]', "Rauchtest"); await pg.click('[data-a="laden-art"][data-wert="doener"]'); await pg.wait_for_timeout(150)
            await weiter("karte-foto"); await weiter("kuehl-schnell")
            await pg.click('[data-a="s2-kuehl"][data-wert="kuehlschrank"][data-d="1"]'); await pg.wait_for_timeout(150)
            await weiter("geld"); await weiter("fertig-schnell")
            for versuch in range(3):
                knopf = pg.locator('[data-a="ob-fertig"].s2los')
                if await knopf.count(): await knopf.first.click()
                try: await pg.wait_for_selector('[data-a="menue-auf"], [data-a="foto-abbrechen"]', timeout=20000); break
                except Exception:
                    if versuch == 2: raise
            if await pg.locator('[data-a="foto-abbrechen"]').count(): await pg.click('[data-a="foto-abbrechen"]'); await pg.wait_for_timeout(400)
            if not await pg.locator('.h-jetzt, [data-a="nav"][data-wert="umsatzheute"]').count():
                await pg.click('.tableiste [data-a="nav"][data-wert="start"]')
            zahl = None
            for _ in range(200):
                m = EURO.search(await pg.evaluate("document.querySelector('#app')?.innerText || ''"))
                if m: zahl = m.group(0); break
                await pg.wait_for_timeout(50)
            ok("Heute zeigt nach Schnellstart eine Euro-Zahl", zahl, f"„{zahl}“" if zahl else "keine Zahl gefunden")
        except Exception as e:
            ok("Schnellstart bis Heute", False, f"{type(e).__name__}: {str(e).splitlines()[0][:160]}")
        ok("Keine Konsolen- und Skriptfehler", not fehler, "; ".join(fehler[:3]))
        await b.close()
    return ergebnis, None


def main():
    ap = argparse.ArgumentParser(description="Rauchtest der Live-Seite")
    ap.add_argument("--url", default=LIVE)
    ap.add_argument("--erwartet", help="Pfad zur lokalen js/fassung.js; die Live-Fassung muss gleich sein")
    a = ap.parse_args()
    try:
        import playwright  # noqa: F401
    except ImportError:
        print("Hinweis: Playwright ist nicht installiert (pip install playwright && playwright install chromium) – Rauchtest nicht ausgeführt."); sys.exit(2)
    ergebnis, nicht_erreichbar = asyncio.run(pruefen(a.url, a.erwartet))
    if ergebnis is None:
        print(f"HINWEIS: {a.url} ist von hier nicht erreichbar ({nicht_erreichbar}).")
        print("Das Netz ist vermutlich gesperrt oder die Seite ist gerade offline. Rauchtest NICHT ausgeführt (kein Befund über die Seite). Exit 2.")
        sys.exit(2)
    for name, gut, text in ergebnis:
        print(f"  {'OK    ' if gut else 'FEHLER'} {name}" + (f" – {text}" if text else ""))
    if all(g for _, g, _ in ergebnis): print("RAUCHTEST LIVE OK"); sys.exit(0)
    print("RAUCHTEST LIVE: FEHLER"); sys.exit(1)


if __name__ == "__main__":
    main()
