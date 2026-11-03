"""Prüfstand Freitag (02.11.2026): die Sicherungsdatei tests/fixtures/pruefstand/pruefstand_sicherung.zip wird auf einem frischen Gerät
über Büro → Einstellungen → Sicherung „Einlesen“ geladen. Danach: beide Beispiel-Läden da, je 14 Tage, Cockpit-Zahl gleich den Sollwerten.
Aufruf: DURCHLAUF_PORT=8846 python3 tests/pruefstand_browser.py"""
import asyncio, os, sys, pathlib, subprocess, time, json
sys.path.insert(0, str(pathlib.Path(__file__).parent))
import schnellstart, nav_hilfe
from playwright.async_api import async_playwright
APP = pathlib.Path(__file__).parent.parent; PORT = int(os.environ.get("DURCHLAUF_PORT", "8846"))
FIX = APP / "tests" / "fixtures" / "pruefstand"; SOLL = json.loads((FIX / "pruefstand_soll.json").read_text(encoding="utf-8"))
ZAHLEN = """async (H) => { const Z = await import('./js/zaehler.js'); const LZ = await import('./js/laden_zahlen.js'); const r2 = (x) => Math.round(x * 100) / 100;
  return window.__gastrocalc.wurzel.betriebe.map((b) => { const z = Z.zaehler(b, { datum: H }); const hz = LZ.heuteZiel(b, z, H);
    return { name: b.betrieb.name, tage: [...new Set((b.tagesnotizen || []).filter((n) => !n.storniert && typeof n.umsatz === 'number').map((n) => n.datum))].length,
      cockpit: { stufe: hz.stufe, zahl: hz.zahl === null ? null : r2(hz.zahl) } }; }); }"""

async def main():
    srv = subprocess.Popen([sys.executable, "-m", "http.server", str(PORT), "--bind", "127.0.0.1"], cwd=str(APP), stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    time.sleep(0.8); fehler = []; befunde = []
    try:
        async with async_playwright() as p:
            b = await p.chromium.launch(); ctx, pg = await schnellstart.kontext(b, 390, 844, fehler)
            dialoge = []
            async def ja(d): dialoge.append(d.message); await d.accept()
            pg.on("dialog", lambda d: asyncio.ensure_future(ja(d)))
            await schnellstart.schnellstart(pg, PORT, name="Neues Gerät"); await nav_hilfe.rundgang_weg(pg)
            await nav_hilfe.geh(pg, "einstellungen"); await pg.wait_for_timeout(400)
            await pg.set_input_files('[data-f="import"]', str(FIX / "pruefstand_sicherung.zip")); await pg.wait_for_timeout(2500)
            ist = await pg.evaluate(ZAHLEN, SOLL["datum"])
            for L in SOLL["laeden"]:
                x = next((y for y in ist if y["name"] == L["name"]), None)
                if not x: befunde.append(f"Laden fehlt: {L['name']}"); continue
                if x["tage"] != len(L["tage"]): befunde.append(f"{L['name']}: {x['tage']} statt {len(L['tage'])} Tage")
                if x["cockpit"] != L["cockpit"]: befunde.append(f"{L['name']}: Cockpit {x['cockpit']} statt {L['cockpit']}")
                print("ok  " if x["cockpit"] == L["cockpit"] else "FEHLT", L["name"], x)
            # Nachtrag 03.11.2026: nach dem Einlesen startet der kurze Rundgang im eingelesenen Laden nicht neu und blockiert keine Tipps
            await nav_hilfe.geh(pg, "laeden"); await pg.wait_for_timeout(500)
            for z in await pg.locator('#app [data-a="laden-wechseln"]').all():
                if "Döner-Grill (Probe)" in (await z.inner_text()): await z.click(); break
            await pg.wait_for_timeout(800); await nav_hilfe.zum_laden(pg); await pg.wait_for_timeout(2000)
            aktiv = await pg.evaluate("window.__gastrocalc.stand.betrieb.name")
            if aktiv != "Döner-Grill (Probe)": befunde.append(f"Wechsel in den Prüf-Laden ging nicht ({aktiv})")
            if await pg.locator(".rg-huelle").count(): befunde.append("kurzer Rundgang startet nach dem Einlesen neu")
            await pg.locator('.tableiste [data-a="nav"][data-wert="muell"]').click(); await pg.wait_for_timeout(500)
            if not await pg.locator('.tableiste .tab.an[data-wert="muell"]').count(): befunde.append("Tipp auf Müll kam nicht an")
            else: print("ok   Prüf-Laden: kein Rundgang, Tipps kommen an")
            await b.close()
    finally: srv.terminate()
    if fehler: befunde.append(f"Konsole: {fehler[:3]}")
    print("Rückfragen:", [d[:80] for d in dialoge])
    print("PRÜFSTAND " + ("OK" if not befunde else "; ".join(befunde))); sys.exit(1 if befunde else 0)
asyncio.run(main())
