"""Masterauftrag 0.3 (28.10.2026): Umzug auf eine neue Adresse. Browserdaten hängen an der Adresse – vor dem Pilot zieht die App auf eine
eigene Domain. Nachweis: Laden auf Adresse A (127.0.0.1) mit Daten → Sicherungsdatei → auf Adresse B (localhost, anderer Speicher, leer)
in drei Schritten einlesen: 1 Adresse öffnen, 2 „Sicherung einlesen“ antippen und Datei wählen, 3 Frage mit OK bestätigen. Danach gleiche Daten.
Start: DURCHLAUF_PORT=8791 python3 tests/umzug_browser.py"""
import asyncio, os, sys, pathlib, tempfile, base64
from playwright.async_api import async_playwright
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
import schnellstart as S

PORT = int(os.environ.get("DURCHLAUF_PORT", "8791"))

async def main():
    srv = S.server(PORT); fehler = []
    try:
        async with async_playwright() as p:
            b = await p.chromium.launch()
            ctx, pg = await S.kontext(b, 390, 844, fehler)
            await S.schnellstart(pg, PORT, name="Umzug Test")
            await pg.evaluate("""(() => { const s = window.__gastrocalc.stand; const d = new Date().toISOString().slice(0, 10);
              s.tagesnotizen.push({ id: 'u1', datum: d, umsatz: 777, erfasst: d + 'T20:00:00Z', storniert: false }); window.__gastrocalc.zeichne(); })()""")
            daten = await pg.evaluate("""async () => { const st = await import('./js/store.js'); await st.sofortSpeichern(window.__gastrocalc.wurzel);
              const r = await st.exportDatei(window.__gastrocalc.wurzel); const buf = new Uint8Array(await r.blob.arrayBuffer());
              let s = ''; for (const x of buf) s += String.fromCharCode(x); return btoa(s); }""")
            datei = pathlib.Path(tempfile.mkdtemp()) / "sicherung.zip"; datei.write_bytes(base64.b64decode(daten))
            # Neue Adresse: anderer Ursprung, leerer Speicher
            ctx2 = await b.new_context(viewport={"width": 390, "height": 844}, locale="de-DE"); pg2 = await ctx2.new_page()
            pg2.on("dialog", lambda d: asyncio.ensure_future(d.accept()))  # Schritt 3: „OK“
            await pg2.goto(f"http://localhost:{PORT}/index.html"); await pg2.wait_for_selector('[data-f="import"]', state="attached")  # Schritt 1
            sichtbar = await pg2.locator('label:has([data-f="import"])').first.is_visible()
            assert sichtbar, "„Sicherung einlesen“ auf dem ersten Bildschirm nicht sichtbar"
            await pg2.set_input_files('[data-f="import"]', str(datei))  # Schritt 2
            for _ in range(60):
                await pg2.wait_for_timeout(250)
                n = await pg2.evaluate("(window.__gastrocalc?.wurzel?.betriebe || []).find(b => b.betrieb?.name === 'Umzug Test')?.tagesnotizen?.length || 0")
                if n: break
            name = await pg2.evaluate("(window.__gastrocalc?.wurzel?.betriebe || []).map(b => b.betrieb?.name)")
            assert "Umzug Test" in name, f"Laden nicht übernommen: {name}"
            assert n >= 1, "Umsatz nicht übernommen"
            assert not [f for f in fehler if "ERR_" not in f], fehler
            print("UMZUG OK: 3 Schritte, Laden und Umsatz auf neuer Adresse")
            await b.close()
    finally:
        srv.terminate()

asyncio.run(main())
