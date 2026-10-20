"""Rettung (17.10.2026): Rettungscode für den Büro-Code und Sicherung ohne Code auf der Fehlerseite – Browser-Gegenprobe im Handy-Format 390×844.
Code festlegen → Rettungscode sehen (einmal, nur Abdruck gespeichert) → Code vergessen → falscher Rettungscode bremst → richtiger Rettungscode →
neuer Büro-Code → neuer Rettungscode → Büro offen; alter Code gilt nicht mehr. Personal-Modus: „Code vergessen?“ nur am Schloss (→ Laden). Alter Laden ohne
Rettungscode: Hinweis im Büro. Fehlerseite: verschlüsselte Sicherung ohne Büro-Code einlesen (Passwort bleibt Pflicht), deutliche Rückfrage,
danach sind die Daten wieder da und der Büro-Code gilt weiter. Bilder: audit/shots/rett_*.png. Exit 1 bei Verstoß.
Start: python3 tests/durchlauf_rettung.py  (Webserver Port 8797)"""
import asyncio, os, pathlib, re, sys
from playwright.async_api import async_playwright
import nav_hilfe, schnellstart

APP = schnellstart.APP
OUT = pathlib.Path(os.environ.get("DURCHLAUF_OUT", APP.parent / "audit" / "shots")); OUT.mkdir(parents=True, exist_ok=True)
PORT = int(os.environ.get("DURCHLAUF_PORT", "8797"))
FORM = re.compile(r"^[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{4}-[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{4}-[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{4}$")


async def main():
    srv = schnellstart.server(PORT); fehler = []; verstoesse = []; dialoge = []
    def pruefe(bedingung, text):
        if not bedingung: verstoesse.append(text); print("VERSTOSS:", text)
    try:
        async with async_playwright() as p:
            b = await p.chromium.launch(); ctx, pg = await schnellstart.kontext(b, 390, 844, fehler)
            async def bild(name): await pg.screenshot(path=str(OUT / f"rett_{name}.png"), full_page=False)
            async def modus(): return await nav_hilfe.modus(pg)
            async def alles(): return await pg.evaluate("JSON.stringify(window.__gastrocalc.wurzel) + JSON.stringify(Object.entries(localStorage))")
            async def code_blatt(code):
                await schnellstart.code_tippen(pg, code); await pg.wait_for_timeout(300); await schnellstart.code_tippen(pg, code)
            async def ins_buero_mit(code):
                await nav_hilfe.zum_laden(pg); await nav_hilfe.ins_buero(pg); await pg.wait_for_selector("#ebene-huelle .blatt-pin")
                await schnellstart.code_tippen(pg, code)

            await schnellstart.schnellstart(pg, PORT, name="Döner Test")
            # ---- 1. Büro-Code festlegen → Rettungscode einmal sehen
            await nav_hilfe.ins_buero(pg); await pg.wait_for_timeout(300)
            await pg.click('#app [data-a="pin-setzen"]'); await pg.wait_for_selector("#ebene-huelle .blatt-pin")
            await code_blatt("1234")
            feld = pg.locator('#ebene-huelle .blatt-rettungscode [data-rettungscode]'); await feld.wait_for(timeout=20000)
            await bild("01_rettungscode")
            code1 = await feld.input_value()
            pruefe(FORM.match(code1), f"Rettungscode hat nicht die Form XXXX-XXXX-XXXX ohne 0/O/1/I/L: {code1!r}")
            blatt = await pg.inner_text("#ebene-huelle .blatt-rettungscode")
            pruefe("Papier" in blatt, "Aufforderung „auf Papier“ fehlt"); pruefe(len(blatt.split()) <= 45, f"Blatt zu lang: {len(blatt.split())} Wörter")
            pruefe(await pg.evaluate("(window.__gastrocalc.wurzel.rettungPin || '').startsWith('pbkdf2$')"), "kein PBKDF2-Abdruck gespeichert")
            roh = code1.replace("-", "")
            pruefe(roh not in await alles() and code1 not in await alles(), "Rettungscode steht im Klartext im Speicher")
            await pg.click('#ebene-huelle [data-a="rettung-ok"]'); await pg.locator("#ebene-huelle .blatt-rettungscode").wait_for(state="detached")
            pruefe(await modus() == "buero", "nach „Aufgeschrieben“ nicht im Büro")
            pruefe(await pg.locator('#app [data-a="rettung-neu"]').count() == 0, "Hinweis „Rettungscode anlegen“ trotz Rettungscode")
            # ---- 2. Code vergessen: Laden → Büro → „Code vergessen?“
            await nav_hilfe.zum_laden(pg); await nav_hilfe.ins_buero(pg); await pg.wait_for_selector("#ebene-huelle .blatt-pin")
            pruefe(await pg.locator('#ebene-huelle [data-a="rettung-start"]').count() == 1, "„Code vergessen?“ fehlt an der Code-Abfrage")
            await bild("02_code_vergessen")
            await pg.click('#ebene-huelle [data-a="rettung-start"]'); await pg.wait_for_selector("#ebene-huelle .blatt-rettung")
            await pg.fill('#ebene-huelle [data-f="rettungscode"]', "ZZZZ-ZZZZ-ZZZZ"); await pg.click('#ebene-huelle [data-a="rettung-pruefen"]')
            await pg.locator("#ebene-huelle .pin-meldung.fehler").wait_for(timeout=20000); await pg.wait_for_timeout(200)
            await bild("03_falsch")
            pruefe(await pg.evaluate("window.__gastrocalc.wurzel.pinSperre?.fehler") == 1, "falscher Rettungscode zählt nicht als Fehlversuch")
            pruefe(await modus() == "laden", "falscher Rettungscode öffnet etwas")
            # richtig (klein geschrieben, mit Leerzeichen) → neuen Code wählen
            await pg.fill('#ebene-huelle [data-f="rettungscode"]', code1.lower().replace("-", " ")); await pg.click('#ebene-huelle [data-a="rettung-pruefen"]')
            await pg.wait_for_selector("#ebene-huelle .blatt-pin", timeout=20000); await pg.wait_for_timeout(200)
            pruefe("neuen Büro-Code" in await pg.inner_text("#ebene-huelle .blatt-pin"), "nach dem Rettungscode keine Aufforderung „neuen Büro-Code“")
            pruefe(await pg.evaluate("window.__gastrocalc.wurzel.pinSperre") is None, "Bremse nach richtigem Rettungscode nicht gelöst")
            await bild("04_neuer_code")
            await code_blatt("5678")
            await feld.wait_for(timeout=20000); code2 = await feld.input_value()
            pruefe(FORM.match(code2) and code2 != code1, f"kein neuer Rettungscode: {code1} → {code2}")
            await bild("05_neuer_rettungscode")
            await pg.click('#ebene-huelle [data-a="rettung-ok"]'); await pg.wait_for_timeout(500)
            pruefe(await modus() == "buero" and await pg.locator(".b-offen, .b-abschnitt").count() > 0, f"nach der Rettung nicht im Büro: {await modus()}")
            await bild("06_buero_offen")
            # alter Code gilt nicht mehr, neuer schon
            await ins_buero_mit("1234"); await pg.locator("#ebene-huelle .pin-meldung.fehler").wait_for(timeout=20000)
            pruefe(await modus() == "laden", "alter Büro-Code öffnet das Büro noch")
            await schnellstart.code_tippen(pg, "5678"); await pg.locator("#ebene-huelle .blatt-pin").wait_for(state="detached", timeout=20000); await pg.wait_for_timeout(300)
            pruefe(await modus() == "buero", "neuer Büro-Code öffnet das Büro nicht")
            # alter Rettungscode gilt nicht mehr
            await nav_hilfe.zum_laden(pg); await nav_hilfe.ins_buero(pg); await pg.wait_for_selector("#ebene-huelle .blatt-pin")
            await pg.click('#ebene-huelle [data-a="rettung-start"]'); await pg.wait_for_selector("#ebene-huelle .blatt-rettung")
            await pg.fill('#ebene-huelle [data-f="rettungscode"]', code1); await pg.click('#ebene-huelle [data-a="rettung-pruefen"]')
            await pg.locator("#ebene-huelle .pin-meldung.fehler").wait_for(timeout=20000)
            pruefe(await pg.locator("#ebene-huelle .blatt-rettung").count() == 1, "alter Rettungscode wird noch angenommen")
            await pg.click('#ebene-huelle .ebene-dimmer', position={"x": 10, "y": 10}); await pg.wait_for_timeout(300)
            # ---- 3. Personal-Modus: kein „Code vergessen?“
            await nav_hilfe.menue(pg); await pg.click('#ebene-huelle [data-a="modus"][data-wert="personal"]'); await pg.wait_for_selector(".riesenkachel")
            await pg.click('[data-a="schloss"]'); await pg.wait_for_selector("#ebene-huelle .blatt-pin")
            pruefe(await pg.locator('#ebene-huelle [data-a="rettung-start"]').count() == 1, "„Code vergessen?“ fehlt am Personal-Schloss")
            await bild("07_personal_schloss")
            pruefe(await pg.locator('#app [data-a="rettung-neu"], #app [data-a="pin-setzen"]').count() == 0, "Code-Änderung im Personal-Modus sichtbar")
            await pg.click('#ebene-huelle [data-a="rettung-start"]'); await pg.wait_for_selector("#ebene-huelle .blatt-rettung")
            await pg.fill('#ebene-huelle [data-f="rettungscode"]', "ZZZZ-ZZZZ-ZZZZ"); await pg.click('#ebene-huelle [data-a="rettung-pruefen"]')
            await pg.locator("#ebene-huelle .pin-meldung.fehler").wait_for(timeout=20000)
            pruefe(await modus() == "personal", "falscher Rettungscode am Schloss verlässt den Personal-Modus")
            pruefe((await pg.evaluate("window.__gastrocalc.wurzel.pinSperre?.fehler") or 0) >= 1, "falscher Rettungscode am Schloss zählt nicht")
            await pg.fill('#ebene-huelle [data-f="rettungscode"]', code2); await pg.click('#ebene-huelle [data-a="rettung-pruefen"]')
            await pg.wait_for_selector("#ebene-huelle .blatt-pin", timeout=20000); await pg.wait_for_timeout(200)
            await code_blatt("2468")
            await feld.wait_for(timeout=20000); code_p = await feld.input_value()
            pruefe(FORM.match(code_p) and code_p != code2, "kein neuer Rettungscode nach Rettung am Schloss")
            await bild("07b_personal_neuer_rettungscode")
            await pg.click('#ebene-huelle [data-a="rettung-ok"]'); await pg.wait_for_timeout(500)
            pruefe(await modus() == "laden", f"Rettung am Personal-Schloss führt nicht in den Laden: {await modus()}")
            # zurück auf 5678 für den Rest des Durchlaufs
            await ins_buero_mit("2468"); await pg.locator("#ebene-huelle .blatt-pin").wait_for(state="detached", timeout=20000); await pg.wait_for_timeout(300)
            pruefe(await modus() == "buero", "neuer Code vom Schloss öffnet das Büro nicht")
            await pg.click('#app [data-a="pin-setzen"]'); await pg.wait_for_selector("#ebene-huelle .blatt-pin"); await code_blatt("5678")
            await schnellstart.rettungscode_quittieren(pg); await pg.wait_for_timeout(300)
            await nav_hilfe.zum_laden(pg); await pg.wait_for_timeout(300)
            # ---- 4. Alter Laden: Code ohne Rettungscode → Hinweis im Büro
            await pg.evaluate("delete window.__gastrocalc.wurzel.rettungPin")
            await ins_buero_mit("5678"); await pg.locator("#ebene-huelle .blatt-pin").wait_for(state="detached", timeout=20000); await pg.wait_for_timeout(300)
            hinweis = pg.locator('#app .b-offen [data-a="rettung-neu"]')
            pruefe(await hinweis.count() == 1, "Offen-Hinweis „Rettungscode anlegen“ fehlt")
            await bild("08_offen_hinweis")
            await hinweis.click(); await feld.wait_for(timeout=20000); code3 = await feld.input_value()
            pruefe(FORM.match(code3), f"Rettungscode aus dem Hinweis falsch geformt: {code3!r}")
            await pg.click('#ebene-huelle [data-a="rettung-ok"]'); await pg.wait_for_timeout(400)
            pruefe(await pg.locator('#app .b-offen [data-a="rettung-neu"]').count() == 0, "Hinweis bleibt nach dem Anlegen")
            # ---- 5. Sicherung mit Passwort, dann Fehlerseite → ohne Büro-Code einlesen
            await pg.click('#app [data-a="export"]'); await pg.wait_for_selector("#ebene-huelle .blatt-passwort")
            await pg.fill('#ebene-huelle [data-f="passwort"]', "laden2026")
            async with pg.expect_download() as dl: await pg.click('#ebene-huelle [data-a="sicherung-teilen"]')
            datei = OUT / "rett_sicherung.gcs.zip"; await (await dl.value).save_as(str(datei)); await pg.wait_for_timeout(400)
            await pg.wait_for_selector("#ebene-huelle .blatt-sicherungort"); await pg.click('#ebene-huelle [data-a="sicherung-ort"][data-wert="woanders"]'); await pg.wait_for_timeout(300)  # Laden-Umbau (20.10.2026)
            await nav_hilfe.zum_laden(pg); await pg.wait_for_timeout(300)
            pin_vorher = await pg.evaluate("window.__gastrocalc.wurzel.bueroPin")
            # kaputter Stand: der Bildschirm lässt sich nicht mehr zeichnen
            await pg.evaluate("(() => { const s = window.__gastrocalc.stand; s.betrieb = null; s.gerichte = 7; window.__gastrocalc.zeichne(); })()")
            fehler.clear()  # der absichtlich ausgelöste Fehler steht in der Konsole
            await pg.wait_for_selector('#app [data-f="import"][data-ersetzen="1"]', state="attached", timeout=5000)
            pruefe("ohne Büro-Code" in await pg.inner_text("#app"), "Fehlerseite sagt nicht, dass es ohne Büro-Code geht")
            await bild("09_fehlerseite")
            pg.on("dialog", lambda d: (dialoge.append(d.message), asyncio.ensure_future(d.accept())))
            await pg.set_input_files('#app [data-f="import"]', str(datei)); await pg.wait_for_selector("#ebene-huelle .blatt-passwort")
            pruefe(await pg.locator("#ebene-huelle .blatt-pin").count() == 0, "Fehlerseite fragt nach dem Büro-Code")
            await pg.fill('#ebene-huelle [data-f="passwort"]', "falsch99"); await pg.click('#ebene-huelle [data-a="sicherung-einlesen"]')
            await pg.locator("#ebene-huelle .pin-meldung", has_text="falsch").wait_for(timeout=20000)
            pruefe(not dialoge, "falsches Passwort führt zur Rückfrage")
            await bild("10_passwort")
            await pg.fill('#ebene-huelle [data-f="passwort"]', "laden2026"); await pg.click('#ebene-huelle [data-a="sicherung-einlesen"]')
            await pg.locator("#ebene-huelle .blatt-passwort").wait_for(state="detached", timeout=20000)
            await pg.wait_for_selector('[data-a="menue-auf"]', timeout=20000); await pg.wait_for_timeout(600)
            pruefe(len(dialoge) == 1 and "ersetzt alle Daten" in dialoge[0] and "Döner Test" in dialoge[0], f"keine deutliche Rückfrage vor dem Ersetzen: {dialoge}")
            pruefe(await pg.evaluate("window.__gastrocalc.stand.betrieb?.name") == "Döner Test", "Daten nach dem Einlesen nicht wieder da")
            pruefe(await pg.evaluate("window.__gastrocalc.wurzel.bueroPin") == pin_vorher, "Büro-Code nach dem Ersetzen verändert")
            pruefe(await pg.evaluate("!!window.__gastrocalc.wurzel.rettungPin"), "Rettungscode nach dem Ersetzen weg")
            pruefe(await modus() == "laden", f"nach dem Ersetzen nicht im Laden: {await modus()}")
            await bild("11_daten_wieder_da")
            await ins_buero_mit("5678"); await pg.locator("#ebene-huelle .blatt-pin").wait_for(state="detached", timeout=20000); await pg.wait_for_timeout(300)
            pruefe(await modus() == "buero", "Büro-Code gilt nach dem Ersetzen nicht")
            # ---- 6. Neustart: Abdruck und Daten bleiben
            await pg.reload(); await pg.wait_for_selector('[data-a="menue-auf"]'); await pg.wait_for_timeout(400)
            pruefe(await pg.evaluate("(window.__gastrocalc.wurzel.rettungPin || '').startsWith('pbkdf2$')"), "Rettungscode-Abdruck übersteht den Neustart nicht")
            pruefe(await pg.evaluate("window.__gastrocalc.stand.betrieb?.name") == "Döner Test", "Daten nach dem Neustart weg")
    finally:
        srv.terminate()
    if fehler: print("Konsolenfehler:", fehler); verstoesse.append("Konsolenfehler")
    if verstoesse: print(len(verstoesse), "Verstöße"); sys.exit(1)
    print("Rettung Durchlauf ok, Bilder in", OUT)

asyncio.run(main())
