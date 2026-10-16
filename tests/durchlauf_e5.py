"""E5 (16.10.2026): Passwort für die Sicherung – Browser-Gegenprobe im Handy-Format.
Büro → Sicherung → Blatt sichtbar, Passwort setzen, teilen (Download) → Datei einlesen → Passwort-Blatt → falsches Passwort bleibt offen,
richtiges Passwort → Import-Rückfrage. Dazu „Ohne Passwort teilen“ (alte Datei, unverändert einlesbar). Keine Konsolenfehler.
Start: python3 tests/durchlauf_e5.py  (startet selbst einen kleinen Webserver, Port 8795)"""
import asyncio, subprocess, sys, time, pathlib, os, zipfile
from playwright.async_api import async_playwright
import nav_hilfe

APP = pathlib.Path(__file__).resolve().parent.parent
OUT = pathlib.Path(os.environ.get("E5_OUT", APP.parent / "audit" / "shots")); OUT.mkdir(parents=True, exist_ok=True)
PORT = int(os.environ.get("DURCHLAUF_PORT", "8795"))


async def main():
    srv = subprocess.Popen([sys.executable, "-m", "http.server", str(PORT), "--bind", "127.0.0.1"], cwd=APP, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    time.sleep(0.8)
    fehler = []; dialoge = []
    try:
        async with async_playwright() as p:
            b = await p.chromium.launch()
            ctx = await b.new_context(viewport={"width": 390, "height": 844}, device_scale_factor=2, is_mobile=True, has_touch=True, locale="de-DE")
            pg = await ctx.new_page()
            pg.on("console", lambda m: fehler.append(m.text) if m.type == "error" and "ERR_TUNNEL" not in m.text else None)
            pg.on("pageerror", lambda e: fehler.append(str(e)))
            await pg.goto(f"http://127.0.0.1:{PORT}/index.html"); await pg.wait_for_selector(".kachel")
            for _ in range(240):  # erster Start: warten, bis der Service Worker die Seite hat (er lädt sie nach der Einrichtung einmal neu)
                if await pg.evaluate("!!navigator.serviceWorker.controller"): break
                await pg.wait_for_timeout(500)
            # Schnellster Weg in die App: Schnellweg mit Namen, dann Kostenschritte überspringen
            await pg.click('[data-a="sprache"][data-wert="de"]'); await pg.wait_for_selector('[data-a="laden-art"]')
            await pg.fill('[data-f="betrieb.name"]', "Döner Test"); await pg.click('[data-a="laden-art"][data-wert="doener"]'); await pg.click('[data-a="weiter"]')
            for _ in range(8):
                if await pg.locator('[data-a="weiter"]').count() == 0: break
                await pg.click('[data-a="weiter"]'); await pg.wait_for_timeout(250)
            await pg.locator('[data-a="ob-fertig"].s2los').click(); await pg.wait_for_selector('[data-a="menue-auf"]')
            # Ohne Gerichte landet „Los“ bei „Karte per Foto“ – dort gilt ein Formular als offen. Auf „Heute“ holt der Service Worker sein einmaliges Neuladen nach.
            if await pg.locator('[data-a="foto-abbrechen"]').count(): await pg.click('[data-a="foto-abbrechen"]')
            await nav_hilfe.geh(pg, "start")
            try:
                async with pg.expect_event("load", timeout=8000): await pg.wait_for_timeout(100)
            except Exception: pass  # kein Neuladen nötig (Service Worker hatte die Seite schon)
            await pg.wait_for_selector('[data-a="menue-auf"]'); await pg.wait_for_timeout(400)
            # ---- Büro → Sicherung → Blatt
            await nav_hilfe.ins_buero(pg); await pg.wait_for_timeout(300)
            await pg.click('#app [data-a="export"]'); await pg.wait_for_selector("#ebene-huelle .blatt-passwort")
            blatt = pg.locator("#ebene-huelle .blatt-passwort")
            text = await blatt.inner_text(); woerter = len(text.split())
            assert woerter <= 40, f"Blatt hat {woerter} Wörter: {text!r}"
            assert await blatt.locator('input[type="password"][data-f="passwort"]').count() == 1
            await pg.screenshot(path=str(OUT / "e5_blatt.png"), full_page=False)
            # Sichtbar-Umschalter
            await pg.fill('#ebene-huelle [data-f="passwort"]', "laden2026")
            await pg.click('#ebene-huelle [data-a="passwort-zeigen"]'); assert await pg.get_attribute('#ebene-huelle [data-f="passwort"]', "type") == "text"
            await pg.click('#ebene-huelle [data-a="passwort-zeigen"]'); assert await pg.get_attribute('#ebene-huelle [data-f="passwort"]', "type") == "password"
            await pg.screenshot(path=str(OUT / "e5_blatt_ausgefuellt.png"), full_page=False)
            # zu kurz → Meldung, Blatt bleibt
            await pg.fill('#ebene-huelle [data-f="passwort"]', "abc"); await pg.click('#ebene-huelle [data-a="sicherung-teilen"]'); await pg.wait_for_timeout(200)
            assert await pg.locator("#ebene-huelle .blatt-passwort").count() == 1 and "6" in await pg.inner_text("#ebene-huelle .pin-meldung")
            # mit Passwort teilen → Download .gcs.zip
            await pg.fill('#ebene-huelle [data-f="passwort"]', "laden2026")
            async with pg.expect_download() as dl: await pg.click('#ebene-huelle [data-a="sicherung-teilen"]')
            d = await dl.value; verschl = OUT / "e5_export.gcs.zip"; await d.save_as(str(verschl))
            assert d.suggested_filename.endswith(".gcs.zip"), d.suggested_filename
            with zipfile.ZipFile(verschl) as zf:
                namen = sorted(zf.namelist()); assert namen == ["LIESMICH.txt", "sicherung.enc"], namen
                assert zf.read("sicherung.enc")[:4] == b"GCS1"; assert "GastroCalc" in zf.read("LIESMICH.txt").decode()
            await pg.wait_for_timeout(300); meld = await pg.inner_text(".meldung"); assert "mit Passwort" in meld, meld
            assert await pg.locator("#ebene-huelle .blatt-passwort").count() == 0
            assert "laden2026" not in await pg.evaluate("JSON.stringify(window.__gastrocalc.wurzel) + JSON.stringify(Object.entries(localStorage))")
            # ---- Ohne Passwort teilen → gewöhnliche .zip wie bisher
            await pg.click('#app [data-a="export"]'); await pg.wait_for_selector("#ebene-huelle .blatt-passwort")
            async with pg.expect_download() as dl2: await pg.click('#ebene-huelle [data-a="sicherung-ohne"]')
            d2 = await dl2.value; offen = OUT / "e5_export.zip"; await d2.save_as(str(offen))
            assert d2.suggested_filename.endswith(".zip") and not d2.suggested_filename.endswith(".gcs.zip")
            with zipfile.ZipFile(offen) as zf: assert "gastrocalc-sicherung.json" in zf.namelist()
            await pg.wait_for_timeout(300); meld = await pg.inner_text(".meldung"); assert "ohne Passwort" in meld, meld
            # ---- Einlesen der verschlüsselten Datei: Passwort-Blatt, falsch → bleibt offen, richtig → Import-Rückfrage
            pg.on("dialog", lambda dd: (dialoge.append(dd.message), asyncio.ensure_future(dd.dismiss())))
            await nav_hilfe.geh(pg, "einstellungen")
            await pg.set_input_files('[data-f="import"]', str(verschl)); await pg.wait_for_selector("#ebene-huelle .blatt-passwort")
            assert "Passwort der Sicherung" in await pg.inner_text("#ebene-huelle .blatt-passwort")
            await pg.screenshot(path=str(OUT / "e5_blatt_einlesen.png"), full_page=False)
            await pg.fill('#ebene-huelle [data-f="passwort"]', "falsch99"); await pg.click('#ebene-huelle [data-a="sicherung-einlesen"]')
            await pg.locator("#ebene-huelle .pin-meldung", has_text="falsch").wait_for(timeout=15000)
            assert await pg.locator("#ebene-huelle .blatt-passwort").count() == 1 and not dialoge
            await pg.screenshot(path=str(OUT / "e5_blatt_falsch.png"), full_page=False)
            await pg.fill('#ebene-huelle [data-f="passwort"]', "laden2026"); await pg.click('#ebene-huelle [data-a="sicherung-einlesen"]')
            await pg.locator("#ebene-huelle .blatt-passwort").wait_for(state="detached", timeout=15000)
            await pg.wait_for_timeout(800)
            assert dialoge and ("einlesen" in dialoge[0].lower() or "zusammen" in dialoge[0].lower() or "Laden" in dialoge[0] or "Döner Test" in dialoge[0]), dialoge
            # ---- unverschlüsselte Datei: ohne Rückfrage nach Passwort direkt die Import-Rückfrage
            dialoge.clear()
            await pg.set_input_files('[data-f="import"]', str(offen)); await pg.wait_for_timeout(800)
            assert await pg.locator("#ebene-huelle .blatt-passwort").count() == 0 and dialoge, dialoge
    finally:
        srv.terminate()
    if fehler: print("Konsolenfehler:", fehler); sys.exit(1)
    print("E5 Durchlauf ok, Bilder in", OUT)

asyncio.run(main())
