"""Erststart jeder Ladenart (Pilotfest P2, 30.10.2026): Schnellweg von der Sprache bis „Heute“, dann der lange Weg (alle Schritte) im Büro.
Misst je Schritt die Zeit bis zum nächsten Bildschirm, zählt verlorene „Weiter“-Tipps und Konsolenfehler.
Aufruf: DURCHLAUF_PORT=8850 python3 tests/erststart_alle.py   (ERSTSTART_SPRACHEN=de,tr,ar · ERSTSTART_ARTEN=doener,pizza,…)"""
import asyncio, os, sys, pathlib, subprocess, time, json
sys.path.insert(0, str(pathlib.Path(__file__).parent))
import schnellstart, nav_hilfe
from playwright.async_api import async_playwright
APP = str(pathlib.Path(__file__).parent.parent); PORT = int(os.environ.get("DURCHLAUF_PORT", "8850"))
SPRACHEN = os.environ.get("ERSTSTART_SPRACHEN", "de,tr,ar").split(",")
ARTEN = os.environ.get("ERSTSTART_ARTEN", "doener,pizza,asia,foodtruck,baeckerei,kiosk,imbiss,cafe,anders").split(",")
GRENZE_MS = 2000  # Setzung: ein Schritt darf nach „Weiter“ höchstens 2 s brauchen
befunde = []; zeiten = {}

async def warte_schritt(pg, alt, timeout=6000):
    t0 = time.time()
    while time.time() - t0 < timeout / 1000:
        await pg.wait_for_timeout(50)
        if await pg.evaluate("window.__gastrocalc?.stand?.schrittId") != alt or await pg.evaluate("window.__gastrocalc?.stand?.phase") == "app": return round((time.time() - t0) * 1000)
    return None

async def weiter(pg, art, sprache, name):
    """Ein „Weiter“ wie ein Mensch (ein Tipp). Kommt der nächste Schritt nicht, ist das ein Befund – dann noch zwei Versuche, damit der Lauf weitergeht."""
    alt = await pg.evaluate("window.__gastrocalc.stand.schrittId")
    await pg.wait_for_timeout(250)  # schneller Mensch: ≈ 250 ms nach dem Bildwechsel
    for versuch in range(3):
        k = pg.locator('[data-a="weiter"], [data-a="ob-fertig"].s2los').first
        if not await k.count(): befunde.append(f"{art}/{sprache} {name}: kein Weiter-Knopf"); return None
        box = await k.bounding_box()
        if not box: befunde.append(f"{art}/{sprache} {name}: Weiter nicht sichtbar"); return None
        await pg.touchscreen.tap(box["x"] + box["width"] / 2, box["y"] + box["height"] / 2)
        ms = await warte_schritt(pg, alt)
        if ms is not None:
            if versuch: befunde.append(f"{art}/{sprache} {name}: Weiter erst beim {versuch + 1}. Tipp")
            if ms > GRENZE_MS: befunde.append(f"{art}/{sprache} {name}: {ms} ms bis zum nächsten Schritt")
            zeiten.setdefault(f"{art}/{sprache}", {})[name] = ms; return ms
    befunde.append(f"{art}/{sprache} {name}: Weiter kommt nicht an (3 Tipps)"); return None

async def main():
    srv = subprocess.Popen([sys.executable, "-m", "http.server", str(PORT), "--bind", "127.0.0.1"], cwd=APP, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL); time.sleep(0.8)
    fehler = []
    try:
        async with async_playwright() as p:
            b = await p.chromium.launch()
            for sprache in SPRACHEN:
                for art in ARTEN:
                    if sprache != "de" and art not in ("doener", "pizza"): continue  # tr/ar: zwei Ladenarten reichen für die Texte
                    ctx, pg = await schnellstart.kontext(b, 390, 844, fehler)
                    t_start = time.time()
                    await pg.goto(f"http://127.0.0.1:{PORT}/index.html"); await pg.wait_for_selector('[data-f="sprache-wahl"]')
                    for _ in range(60):
                        if await pg.evaluate("!!navigator.serviceWorker.controller"): break
                        await pg.wait_for_timeout(250)
                    await pg.select_option('[data-f="sprache-wahl"]', sprache); await pg.click(f'[data-a="sprache"][data-wert="{sprache}"]'); await pg.wait_for_timeout(900)
                    sid = await pg.evaluate("window.__gastrocalc.stand.schrittId")
                    if sid != "schloss": befunde.append(f"{art}/{sprache}: nach Sprache steht {sid} statt schloss")
                    await weiter(pg, art, sprache, "schloss")
                    if not await pg.locator(f'[data-a="laden-art"][data-wert="{art}"]').count(): befunde.append(f"{art}/{sprache}: Ladenart-Kachel fehlt"); await ctx.close(); continue
                    await pg.fill('[data-f="betrieb.name"]', "Test " + art); await pg.click(f'[data-a="laden-art"][data-wert="{art}"]'); await pg.wait_for_timeout(200)
                    await weiter(pg, art, sprache, "laden")
                    await weiter(pg, art, sprache, "karte-foto (Später)")
                    # Kühlgeräte: erstes an
                    k = pg.locator('[data-a="s2-kuehl"][data-d="1"]').first
                    if await k.count(): await k.click(); await pg.wait_for_timeout(150)
                    else: befunde.append(f"{art}/{sprache}: keine Kühl-Vorschläge")
                    await weiter(pg, art, sprache, "kuehl")
                    # Geld: Miete und Personen
                    for f, v in [("posten:miete", "1500"), ("team.personen", "2"), ("team.stundenProPerson", "120")]:
                        el = pg.locator(f'[data-f="{f}"]')
                        if await el.count(): await el.fill(v); await pg.wait_for_timeout(60)
                    await weiter(pg, art, sprache, "geld")
                    los = pg.locator('[data-a="ob-fertig"].s2los')
                    if not await los.count(): befunde.append(f"{art}/{sprache}: kein „Los geht's“"); await ctx.close(); continue
                    await pg.wait_for_timeout(250); t0 = time.time(); await los.first.click()
                    try: await pg.wait_for_selector('[data-a="menue-auf"], [data-a="foto-abbrechen"]', timeout=15000)
                    except Exception: befunde.append(f"{art}/{sprache}: nach „Los geht's“ kein Laden-Bildschirm (15 s)"); await ctx.close(); continue
                    zeiten.setdefault(f"{art}/{sprache}", {})["los"] = round((time.time() - t0) * 1000)
                    zeiten[f"{art}/{sprache}"]["gesamt_schnell"] = round((time.time() - t_start) * 1000)
                    if await pg.locator('[data-a="foto-abbrechen"]').count(): await pg.click('[data-a="foto-abbrechen"]')
                    await nav_hilfe.geh(pg, "start"); await pg.wait_for_timeout(500); await nav_hilfe.rundgang_weg(pg)
                    # Langer Weg: Büro → Einrichtung bearbeiten ab „format“ bis zum Ergebnis
                    await nav_hilfe.ins_buero(pg); await pg.wait_for_timeout(300)
                    await pg.evaluate("() => { const b = document.createElement('button'); b.dataset.a = 'bearbeiten'; b.dataset.schritt = 'format'; b.dataset.bis = 'ergebnis'; document.querySelector('#app').appendChild(b); b.click(); }")
                    await pg.wait_for_timeout(500)
                    for i in range(40):
                        sid = await pg.evaluate("window.__gastrocalc.stand.schrittId"); phase = await pg.evaluate("window.__gastrocalc.stand.phase")
                        if phase == "app": break
                        if sid == "kueche":  # eine Küche muss an sein
                            if not await pg.locator('[data-a="kueche"][aria-pressed="true"], [data-a="kueche"].an').count():
                                k = pg.locator('[data-a="kueche"]').first
                                if await k.count(): await k.click(); await pg.wait_for_timeout(150)
                        if sid == "karte":
                            k = pg.locator('[data-a="karte-vorlagen"], [data-a="vorlage"]').first
                            if await k.count() and not await pg.evaluate("window.__gastrocalc.stand.gerichte.length"): await k.click(); await pg.wait_for_timeout(300)
                        if sid == "ergebnis":
                            k = pg.locator('[data-a="fertig"], [data-a="einrichtung-fertig-ok"], [data-a="weiter"]').first
                            if await k.count():
                                await pg.wait_for_timeout(250); t0 = time.time(); await k.click()
                                for _ in range(160):
                                    await pg.wait_for_timeout(50)
                                    if await pg.evaluate("window.__gastrocalc.stand.phase") == "app": break
                                ms = round((time.time() - t0) * 1000); zeiten[f"{art}/{sprache}"]["lang:ergebnis→app"] = ms
                                if ms > GRENZE_MS: befunde.append(f"{art}/{sprache} ergebnis→Startseite: {ms} ms")
                            break
                        ms = await weiter(pg, art, sprache, "lang:" + str(sid))
                        if ms is None: break
                    phase = await pg.evaluate("window.__gastrocalc.stand.phase")
                    if phase != "app": befunde.append(f"{art}/{sprache}: langer Weg endet nicht in der App (phase {phase}, schritt {await pg.evaluate('window.__gastrocalc.stand.schrittId')})")
                    await ctx.close()
            await b.close()
    finally: srv.terminate()
    print(json.dumps(zeiten, ensure_ascii=False))
    print("Befunde:", len(befunde)); [print(" -", x) for x in befunde]
    print("Konsole:", fehler[:8])
    if befunde or fehler: sys.exit(1)
asyncio.run(main())
