"""Bedienschicht (Pilotfest P1, 30.10.2026): Ursachen für verlorene Tipps und „hängende“ Bildschirme – je Ursache ein Test.
U1 Doppeltipp-Schutz: zwei Tipps an derselben Stelle (z. B. „Weiter“ → „Weiter“) im Abstand 120 ms nach dem Bildwechsel dürfen nicht verloren gehen.
U2 Zeki-Hilfe: der OK-Knopf muss bei 390×844 (und 360×780) im sichtbaren Bereich liegen oder das Blatt scrollbar sein, mit erreichbarem Schließen.
U3 Rundgang-Start: der Rundgang darf nicht über die Mengenfrage/Einrichtung legen, wenn der Chef in den ersten 400 ms nach „Heute“ tippt.
U4 Langsamer Tipp aus einem Feld: Feld hat Fokus, Knopf wird 150 ms gedrückt → der Tipp zählt (focusout darf den Knopf nicht wegzeichnen).
U5 Erster Tipp nach „Los geht's“ (Menü ☰) kommt an.
Aufruf: DURCHLAUF_PORT=8840 python3 tests/bedienung_browser.py"""
import asyncio, os, sys, pathlib, subprocess, time
sys.path.insert(0, str(pathlib.Path(__file__).parent))
import schnellstart, nav_hilfe
from playwright.async_api import async_playwright
APP = str(pathlib.Path(__file__).parent.parent); PORT = int(os.environ.get("DURCHLAUF_PORT", "8840"))
GERICHTE = """async () => { const kl = await import('./js/karte_lesen.js'); const e = await import('./js/engine.js'); const st = await import('./js/stamm.js'); const s = window.__gastrocalc.stand;
  const t = "Döner Kebab ⋯ 7,50\\nDürüm Döner ⋯ 8,00\\nPommes ⋯ 3,50"; kl.vorschlaegeUebernehmen(s, kl.vorschlaegeAusText(t, s).map(v => ({...v, an: true}))); s.artikel = e.artikelAusGerichten(s);
  st.kostenBetragSetzen(s, 'miete', 'miete', 1500); s.team.personen = 0; window.__gastrocalc.zeichne(); }"""
befunde = []
def pruefe(ok, text):
    print(("ok   " if ok else "FEHLT") + " " + text);
    if not ok: befunde.append(text)

async def tap(pg, sel):
    box = await pg.locator(sel).first.bounding_box(); await pg.touchscreen.tap(box["x"] + box["width"] / 2, box["y"] + box["height"] / 2)

async def main():
    srv = subprocess.Popen([sys.executable, "-m", "http.server", str(PORT), "--bind", "127.0.0.1"], cwd=APP, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL); time.sleep(0.8)
    fehler = []
    try:
        async with async_playwright() as p:
            b = await p.chromium.launch()
            # ---- U1 und U5: frischer Start
            ctx, pg = await schnellstart.kontext(b, 390, 844, fehler)
            await pg.goto(f"http://127.0.0.1:{PORT}/index.html"); await pg.wait_for_selector('[data-f="sprache-wahl"]')
            for _ in range(60):
                if await pg.evaluate("!!navigator.serviceWorker.controller"): break
                await pg.wait_for_timeout(250)
            await pg.select_option('[data-f="sprache-wahl"]', "de"); await tap(pg, '[data-a="sprache"][data-wert="de"]'); await pg.wait_for_timeout(600)
            verloren = 0
            for _ in range(5):  # Schloss → „Weiter“ 120 ms nach dem Zeichnen, an derselben Stelle wie der vorige Tipp
                await pg.evaluate("() => { const s = window.__gastrocalc.stand; s.schritt = 1; s.schrittId = 'schloss'; window.__gastrocalc.zeichne(); }"); await pg.wait_for_timeout(120)
                await tap(pg, '[data-a="weiter"]'); await pg.wait_for_timeout(450)
                if await pg.evaluate("window.__gastrocalc.stand.schrittId") == "schloss": verloren += 1
            pruefe(verloren == 0, f"U1 Doppeltipp-Schutz: {verloren} von 5 „Weiter“-Tipps 120 ms nach dem Bildwechsel verloren")
            await ctx.close()
            # ---- U5: „Los geht's“ → sofort ☰
            ctx, pg = await schnellstart.kontext(b, 390, 844, fehler)
            await pg.goto(f"http://127.0.0.1:{PORT}/index.html"); await pg.wait_for_selector('[data-f="sprache-wahl"]')
            for _ in range(60):
                if await pg.evaluate("!!navigator.serviceWorker.controller"): break
                await pg.wait_for_timeout(250)
            await pg.select_option('[data-f="sprache-wahl"]', "de"); await pg.click('[data-a="sprache"][data-wert="de"]'); await nav_hilfe.nach_sprache(pg); await pg.wait_for_selector('[data-a="laden-art"]')
            await pg.fill('[data-f="betrieb.name"]', "Test"); await pg.click('[data-a="laden-art"][data-wert="doener"]'); await pg.wait_for_timeout(300)
            for ziel in ["karte-foto", "kuehl-schnell", "geld", "fertig-schnell"]:
                for _ in range(3):
                    await pg.click('[data-a="weiter"]'); await pg.wait_for_timeout(400)
                    if await pg.evaluate("window.__gastrocalc.stand.schrittId") == ziel: break
            await pg.click('[data-a="ob-fertig"].s2los'); await pg.wait_for_selector('[data-a="menue-auf"]', timeout=20000)
            await pg.wait_for_timeout(100); await tap(pg, '[data-a="menue-auf"]'); await pg.wait_for_timeout(500)
            pruefe(await pg.locator("#ebene-huelle .blatt-menue").count() == 1 or await pg.locator(".rg-huelle").count() == 1, "U5 erster Tipp nach „Los geht's“: Menü offen (oder Rundgang hat übernommen)")
            await ctx.close()
            # ---- U2, U3, U4: Laden mit Gerichten
            for (w, h) in [(390, 844), (360, 780)]:
                ctx, pg = await schnellstart.kontext(b, w, h, fehler)
                await schnellstart.schnellstart(pg, PORT); await pg.evaluate(GERICHTE); await pg.wait_for_timeout(400)
                await tap(pg, '.appleiste [data-a="hilfe-auf"]'); await pg.wait_for_timeout(500)
                ok = pg.locator('#ebene-huelle .ebene-blatt button[data-a="blatt-zu"]'); box = await ok.bounding_box()
                sichtbar = bool(box) and box["y"] + box["height"] <= h and box["y"] >= 0
                pruefe(sichtbar, f"U2 Zeki-Hilfe {w}×{h}: OK-Knopf ganz sichtbar (y {round(box['y']) if box else '?'}–{round(box['y'] + box['height']) if box else '?'}, Fenster {h})")
                if box: await pg.touchscreen.tap(box["x"] + 20, min(h - 4, box["y"] + 8)); await pg.wait_for_timeout(300)
                if await pg.locator("#ebene-huelle .ebene-blatt").count(): await pg.keyboard.press("Escape"); await pg.wait_for_timeout(200)
                if w == 390:
                    # U3: Heute frisch zeichnen (Rundgang noch nie gesehen), nach 150 ms „Rezept eintragen“ tippen, 1,2 s später darf kein Rundgang über der Mengenfrage liegen
                    await pg.evaluate("() => { const s = window.__gastrocalc.stand; delete s.fuehrung; window.__gastrocalc.zeichne(); }"); await pg.wait_for_timeout(150)
                    await tap(pg, '#app [data-a="rezept-direkt"]'); await pg.wait_for_timeout(1200)
                    waage = await pg.locator('[data-a="waage-ok"]').count(); rg = await pg.locator(".rg-huelle").count()
                    pruefe(waage == 1 and rg == 0, f"U3 Rundgang legt sich nicht über die Mengenfrage (Mengenfrage {waage}, Rundgang-Hülle {rg})")
                    if rg: await nav_hilfe.rundgang_weg(pg)
                    if await pg.evaluate("window.__gastrocalc.stand.phase") != "app": await pg.evaluate("() => { const s = window.__gastrocalc.stand; s.phase = 'app'; s.fuehrung = true; window.__gastrocalc.zeichne(); }")
                    # U4: Umsatz heute – Feld hat Fokus, „Speichern“ 150 ms gedrückt (Maus wie Stift/Trackpad)
                    await nav_hilfe.geh(pg, "start"); await pg.click('#app [data-a="nav"][data-wert="umsatzheute"]'); await pg.wait_for_selector('[data-f="ul-umsatz"]')
                    await pg.locator('[data-f="ul-umsatz"]').fill("850"); await pg.wait_for_timeout(50)
                    kb = await pg.locator('[data-a="ul-speichern"]').bounding_box()
                    await pg.mouse.move(kb["x"] + kb["width"] / 2, kb["y"] + kb["height"] / 2); await pg.mouse.down(); await pg.wait_for_timeout(150); await pg.mouse.up(); await pg.wait_for_timeout(800)
                    gespeichert = await pg.evaluate("() => (window.__gastrocalc.stand.tagesnotizen||[]).some(n => n.umsatz === 850)")
                    pruefe(gespeichert, "U4 langsamer Tipp auf „Speichern“ aus dem Umsatz-Feld zählt")
                await ctx.close()
            await b.close()
    finally: srv.terminate()
    print("Konsole:", fehler[:5])
    if befunde or fehler: sys.exit(1)
asyncio.run(main())
