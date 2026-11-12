"""Echte App = Test-App: ein Lauf auf http://127.0.0.2:<port>. Dort gibt es – wie auf der echten Adresse – kein Debug-Objekt
(window.__gastrocalc lebt nur auf localhost, 127.0.0.1 und [::1]). Darum prüft dieser Lauf NUR über die Oberfläche:
Sprache wählen → Schloss-Schritt (Lauf 6, E5: Code über die Oberfläche setzen, „Code ist festgelegt“ und Haken sichtbar) →
Einrichtung bis „Los geht's“ (Fertig-Seite ohne zweites Code-Angebot) → Laden „Heute“ → Reiter wechseln → Neuladen: der Laden ist noch da →
Büro: der Code steht als „an“. Zweiter Lauf ohne Code: die Fertig-Seite bietet den Code an.
Lauf 6, E5 (H): Die App in einem Rahmen einer fremden Herkunft (127.0.0.3) ist versteckt oder bricht aus.
Aufruf: DURCHLAUF_PORT=8871 python3 tests/echt_browser.py"""
import asyncio, os, pathlib, subprocess, sys, tempfile, time
sys.path.insert(0, str(pathlib.Path(__file__).parent))
import schnellstart, nav_hilfe
from playwright.async_api import async_playwright
APP = str(pathlib.Path(__file__).parent.parent); PORT = int(os.environ.get("DURCHLAUF_PORT", "8871")); HOST = "127.0.0.2"; BEF = []; FEHLER = []

def pruefe(ok, text):
    print(("ok   " if ok else "FEHLT ") + text)
    if not ok: BEF.append(text)

async def bis_los(pg, name):
    """Namen eintragen, Dönerladen wählen, „Weiter“, bis der Schluss-Knopf da ist – ohne in den Stand zu schauen."""
    await pg.wait_for_selector('[data-a="laden-art"]')
    await pg.fill('[data-f="betrieb.name"]', name); await pg.click('[data-a="laden-art"][data-wert="doener"]'); await pg.wait_for_timeout(200)
    for _ in range(10):
        if await pg.locator('[data-a="ob-fertig"].s2los').count(): break
        await pg.click('[data-a="weiter"]'); await pg.wait_for_timeout(500)

async def main():
    srv = subprocess.Popen([sys.executable, "-m", "http.server", str(PORT), "--bind", HOST], cwd=APP, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL); time.sleep(0.8)
    try:
        async with async_playwright() as p:
            b = await p.chromium.launch(); ctx, pg = await schnellstart.kontext(b, 390, 844, FEHLER)
            await pg.goto(f"http://{HOST}:{PORT}/index.html"); await pg.wait_for_selector('[data-f="sprache-wahl"]')
            for _ in range(240):
                if await pg.evaluate("!!navigator.serviceWorker.controller"): break
                await pg.wait_for_timeout(500)
            pruefe(await pg.evaluate("typeof window.__gastrocalc") == "undefined", "kein Debug-Objekt auf 127.0.0.2")
            pruefe(await pg.evaluate("!!navigator.serviceWorker.controller"), "Service Worker hat die Seite übernommen")
            await pg.select_option('[data-f="sprache-wahl"]', "de"); await pg.click('[data-a="sprache"][data-wert="de"]')
            # Lauf 6, E5 (E): Schloss-Schritt – ohne Debug-Objekt muss die Oberfläche den gesetzten Code zeigen
            await pg.wait_for_selector('[data-a="pin-setzen"]')
            pruefe(await pg.locator('.s2schloss-zeile.an[data-a="pin-setzen"]').count() == 0, "Schloss-Schritt: vor dem Setzen kein „Code an“")
            await pg.click('[data-a="pin-setzen"]'); await pg.wait_for_selector("#ebene-huelle .blatt-pin")
            await schnellstart.code_tippen(pg, "1234"); await pg.wait_for_timeout(300); await schnellstart.code_tippen(pg, "1234")
            await pg.locator("#ebene-huelle .blatt-pin").wait_for(state="detached", timeout=20000)
            await schnellstart.rettungscode_quittieren(pg); await pg.wait_for_timeout(400)
            pruefe(await pg.locator('.s2schloss-zeile.an[data-a="pin-setzen"] .haken').count() == 1, "Schloss-Schritt: Haken sichtbar, nachdem der Code gesetzt ist (ohne Debug-Objekt)")
            pruefe("Code ist festgelegt" in await pg.inner_text('.s2schloss-zeile.an[data-a="pin-setzen"]'), "Schloss-Schritt: „Code ist festgelegt“ steht da")
            pruefe(await pg.evaluate("typeof window.__gastrocalc") == "undefined", "auch nach dem Setzen kein Debug-Objekt")
            await nav_hilfe.nach_sprache(pg)
            await bis_los(pg, "Echt Imbiss")
            pruefe(await pg.locator('[data-a="ob-fertig"].s2los').count() == 1, "Einrichtung erreicht „Los geht's“")
            pruefe(await pg.locator('[data-a="ob-fertig"][data-pin="1"]').count() == 0, "Fertig-Seite: Code ist gesetzt – kein zweites Angebot „Büro-Code festlegen“")
            await pg.locator('[data-a="ob-fertig"].s2los').first.click()
            await pg.wait_for_selector('[data-a="menue-auf"], [data-a="foto-abbrechen"]', timeout=20000)
            if await pg.locator('[data-a="foto-abbrechen"]').count(): await pg.click('[data-a="foto-abbrechen"]')
            await pg.wait_for_selector('[data-a="menue-auf"]'); await pg.wait_for_timeout(500)
            await nav_hilfe.rundgang_weg(pg)
            pruefe(await pg.locator('[data-a="menue-auf"]').count() == 1, "Laden „Heute“ steht")
            tab = pg.locator('.leiste [data-wert="muell"], [data-a="nav"][data-wert="muell"]').first
            await tab.click(); await pg.wait_for_timeout(500)
            pruefe("Echt Imbiss" in await pg.evaluate("document.body.innerText") or await pg.locator('#app .schirm').count() >= 1, "Reiter Müll öffnet einen Bildschirm")
            await pg.wait_for_timeout(1200); await pg.reload(); await pg.wait_for_selector('[data-a="menue-auf"]', timeout=20000)
            pruefe(await pg.locator('[data-f="sprache-wahl"]').count() == 0, "nach dem Neuladen ist der Laden noch da (keine Sprachwahl)")
            pruefe(await pg.evaluate("typeof window.__gastrocalc") == "undefined", "auch nach dem Neuladen kein Debug-Objekt")
            # Büro (mit Code erst die Code-Abfrage): der gesetzte Code steht als „an“ – nur über die Oberfläche geprüft
            await pg.click('[data-a="menue-auf"]'); await pg.wait_for_selector("#ebene-huelle .blatt-menue")
            await pg.click('#ebene-huelle [data-a="modus"][data-wert="buero"]'); await pg.wait_for_selector("#ebene-huelle .blatt-pin")
            await schnellstart.code_tippen(pg, "1234"); await pg.locator("#ebene-huelle .blatt-pin").wait_for(state="detached", timeout=20000); await pg.wait_for_timeout(500)
            pruefe(await pg.locator('#app [data-a="pin-setzen"] .b-wert.plus').count() == 1, "Büro: der Code steht als „an“ (sichtbar, ohne Debug-Objekt)")
            pruefe(not FEHLER, "keine Konsolenfehler" + (": " + "; ".join(FEHLER[:3]) if FEHLER else ""))
            await ctx.close()
            # Zweiter Lauf: ohne Code bietet die Fertig-Seite den Code an
            ctx2, pg2 = await schnellstart.kontext(b, 390, 844, [])
            await pg2.goto(f"http://{HOST}:{PORT}/index.html"); await pg2.wait_for_selector('[data-f="sprache-wahl"]')
            await pg2.select_option('[data-f="sprache-wahl"]', "de"); await pg2.click('[data-a="sprache"][data-wert="de"]'); await nav_hilfe.nach_sprache(pg2)
            await bis_los(pg2, "Ohne Code")
            pruefe(await pg2.locator('[data-a="ob-fertig"][data-pin="1"]').count() == 1, "ohne Code bietet die Fertig-Seite „Büro-Code festlegen“ an")
            await ctx2.close()
            # Lauf 6, E5 (H): Rahmen einer fremden Herkunft (127.0.0.3) – die App ist versteckt oder bricht aus
            tmp = tempfile.mkdtemp(prefix="rahmen_")
            pathlib.Path(tmp, "frame.html").write_text(f'<!doctype html><title>fremd</title><iframe id="f" src="http://{HOST}:{PORT}/index.html" width="390" height="800"></iframe>', encoding="utf8")
            srv2 = subprocess.Popen([sys.executable, "-m", "http.server", str(PORT + 1), "--bind", "127.0.0.3"], cwd=tmp, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL); time.sleep(0.8)
            try:
                ctx3 = await b.new_context(viewport={"width": 420, "height": 860}); pg3 = await ctx3.new_page()
                await pg3.goto(f"http://127.0.0.3:{PORT + 1}/frame.html"); await pg3.wait_for_timeout(3500)
                ausgebrochen = pg3.url.startswith(f"http://{HOST}:{PORT}")
                kind = [f for f in pg3.frames if f != pg3.main_frame and f.url.startswith(f"http://{HOST}:{PORT}")]
                versteckt = bool(kind) and (await kind[0].evaluate("getComputedStyle(document.documentElement).display")) == "none"
                pruefe(ausgebrochen or versteckt, f"fremder Rahmen (127.0.0.3): Rahmeninhalt versteckt ({versteckt}) oder Seite ausgebrochen ({ausgebrochen})")
                if kind and not ausgebrochen: pruefe(await kind[0].locator("#app .schirm").is_visible() is False, "fremder Rahmen: die App ist im Rahmen nicht sichtbar")
                await ctx3.close()
            finally: srv2.terminate()
            await b.close()
    finally: srv.terminate()
    print("ECHT " + ("OK" if not BEF else "; ".join(BEF))); sys.exit(1 if BEF else 0)
asyncio.run(main())
