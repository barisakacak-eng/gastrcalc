"""Vorab-Prüfung 03.11.2026, A1: Laden-Einträge überstehen ein Neuladen 100 ms nach dem Tipp (vorher: 900 ms Verzögerung beim Speichern,
200/300/700 ms nach dem Tipp war der Eintrag weg). Je Eintragsart: tippen → 100 ms → Seite neu laden → Eintrag noch da.
Aufruf: DURCHLAUF_PORT=8847 python3 tests/speichern_sofort_browser.py"""
import asyncio, os, sys, pathlib, subprocess, time
sys.path.insert(0, str(pathlib.Path(__file__).parent))
import schnellstart, nav_hilfe
from playwright.async_api import async_playwright
APP = pathlib.Path(__file__).parent.parent; PORT = int(os.environ.get("DURCHLAUF_PORT", "8847")); WARTE = int(os.environ.get("NEULADEN_MS", "100"))
ZAHL = "(j) => { const s = window.__gastrocalc.stand; return (s[j] || []).filter((x) => !x.storniert && !x.entwurf).length; }"

async def neu(pg):
    await pg.wait_for_timeout(WARTE); await pg.reload(); await pg.wait_for_function("() => window.__gastrocalc && window.__gastrocalc.stand", timeout=15000); await pg.wait_for_timeout(600)

async def main():
    srv = subprocess.Popen([sys.executable, "-m", "http.server", str(PORT), "--bind", "127.0.0.1"], cwd=str(APP), stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    time.sleep(0.8); fehler = []; befunde = []
    try:
        async with async_playwright() as p:
            b = await p.chromium.launch(); ctx, pg = await schnellstart.kontext(b, 390, 844, fehler)
            pg.on("dialog", lambda d: asyncio.ensure_future(d.accept()))
            await schnellstart.schnellstart(pg, PORT); await nav_hilfe.rundgang_weg(pg)
            await pg.evaluate("() => { try { localStorage.setItem('gc-zeki-erst', JSON.stringify(['muell','kuehl','putzplan','karte','umsatzheute'])); } catch (e) {} }")
            # Müll
            vor = await pg.evaluate(ZAHL, "schwund")
            await pg.locator('.tableiste [data-a="nav"][data-wert="muell"]').click(); await pg.wait_for_timeout(500)
            await pg.locator('#app [data-a="muell-tipp"]').first.click(); await neu(pg)
            n = await pg.evaluate(ZAHL, "schwund"); print("Müll", vor, "→", n)
            if n != vor + 1: befunde.append(f"Müll: {n - vor} statt 1 nach Neuladen {WARTE} ms")
            # Putzen
            vor = await pg.evaluate(ZAHL, "putzlog")
            await nav_hilfe.rundgang_weg(pg); await pg.locator('.tableiste [data-a="nav"][data-wert="putzplan"]').click(); await pg.wait_for_timeout(500)
            await pg.locator('#app [data-a="pp-haken"]').first.click(); await neu(pg)
            n = await pg.evaluate(ZAHL, "putzlog"); print("Putzen", vor, "→", n)
            if n != vor + 1: befunde.append(f"Putzen: {n - vor} statt 1")
            # Kühlung
            vor = await pg.evaluate(ZAHL, "messungen")
            await pg.locator('.tableiste [data-a="nav"][data-wert="kuehl"]').click(); await pg.wait_for_timeout(500)
            await pg.locator('#app [data-a="kuehl-einzel"]').first.click(); await pg.wait_for_timeout(400)
            await pg.fill('[data-f="station-wert"]', "4"); await pg.click('[data-a="station-speichern"]'); await neu(pg)
            n = await pg.evaluate(ZAHL, "messungen"); print("Kühlung", vor, "→", n)
            if n != vor + 1: befunde.append(f"Kühlung: {n - vor} statt 1")
            # Umsatz
            await nav_hilfe.geh(pg, "start"); await pg.click('#app [data-a="nav"][data-wert="umsatzheute"]'); await pg.wait_for_selector('[data-f="ul-umsatz"]')
            await pg.locator('[data-f="ul-umsatz"]').fill("850"); await pg.click('[data-a="ul-speichern"]'); await neu(pg)
            u = await pg.evaluate("() => { const s = window.__gastrocalc.stand; return (s.tagesnotizen || []).filter((x) => !x.storniert && x.umsatz === 850).length; }"); print("Umsatz 850 →", u)
            if u < 1: befunde.append("Umsatz weg")
            # Tagesabschluss
            vor = await pg.evaluate(ZAHL, "abschluesse")
            await nav_hilfe.geh(pg, "abschluss"); await pg.wait_for_timeout(400); await pg.click('[data-a="abschluss-fertig"]'); await neu(pg)
            n = await pg.evaluate(ZAHL, "abschluesse"); print("Abschluss", vor, "→", n)
            if n != vor + 1: befunde.append(f"Tagesabschluss: {n - vor} statt 1")
            await b.close()
    finally: srv.terminate()
    print("SOFORT " + ("OK" if not befunde else "; ".join(befunde))); sys.exit(1 if befunde else 0)
asyncio.run(main())
