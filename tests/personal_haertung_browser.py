"""Lauf 6, Etappe 11: Personal-Modus im Browser – der normale Ablauf bleibt heil, Fremdes bewirkt nichts.
Ablauf: Schnellstart, Putzplan, Büro-Code, Personal-Modus. Dann Müll mit Foto (ein Nicht-Bild wird abgewiesen), fremde Datei-Felder und Eingabefelder
ohne Wirkung, Ziele und Hilfe nur aus den Personal-Ansichten, Kühl-Rundgang mit Wert und Notiz, Putz-Haken, Schloss mit falschem und richtigem Code,
Wartezeit bei vorgestellter und zurückgestellter Uhr, Rettungscode. Exit 1 bei Verstoß.
Aufruf: DURCHLAUF_PORT=9131 python3 tests/personal_haertung_browser.py"""
import asyncio, base64, datetime, os, sys, pathlib
sys.path.insert(0, str(pathlib.Path(__file__).parent))
import schnellstart, nav_hilfe
from playwright.async_api import async_playwright
PORT = int(os.environ.get("DURCHLAUF_PORT", "9131"))
PNG = base64.b64decode("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==")
STAND = "(k) => { const s = window.__gastrocalc.stand; return JSON.stringify({ uploads: s.uploads.length, schwund: s.schwund.length, messungen: (s.messungen||[]).length, putz: (s.putzlog||[]).length, sprache: window.__gastrocalc.wurzel.sprache || null, modus: window.__gastrocalc.wurzel.modus || 'laden' }); }"
ANSICHT = "async () => (await import('/js/bedienung/zustand.js')).Z.ansicht"
ZAEHLER = """async () => { const z = (await import('/js/bedienung/zustand.js')).Z; const m = await import('/js/modus.js'); return JSON.stringify({fehler: z.wurzel.pinSperre?.fehler || 0, bisInMs: z.wurzel.pinSperre ? z.wurzel.pinSperre.bis - Date.now() : null, restMs: m.sperreRest(z.wurzel)}); }"""
MELDUNG = "() => (document.querySelector('#ebene-huelle .pin-meldung')||{innerText:''}).innerText"
INJEKT = """([html]) => { const d = document.createElement('div'); d.id = 'injekt'; d.innerHTML = html; document.querySelector('#app').appendChild(d); }"""

async def main():
    srv = schnellstart.server(PORT); fehler = []; verstoesse = []
    def pruefe(ok, text):
        print(("ok   " if ok else "FEHLT ") + text, flush=True)
        if not ok: verstoesse.append(text)
    try:
        async with async_playwright() as p:
            b = await p.chromium.launch(); ctx, pg = await schnellstart.kontext(b, 360, 780, fehler)
            async def stand():
                import json; return json.loads(await pg.evaluate(STAND, None))
            async def modus(): return await nav_hilfe.modus(pg)
            async def aus_blatt():
                if await pg.locator("#ebene-huelle .blatt-pin").count() or await pg.locator("#ebene-huelle .blatt").count():
                    try: await pg.keyboard.press("Escape")
                    except Exception: pass
                    await pg.wait_for_timeout(250)
            async def injekt(html):
                await pg.evaluate("() => document.getElementById('injekt')?.remove()"); await pg.evaluate(INJEKT, [html]); await pg.wait_for_timeout(100)
            async def kacheln():
                for _ in range(6):
                    if await pg.locator(".riesenkachel").count() == 3: return True
                    await pg.go_back(); await pg.wait_for_timeout(350)
                return await pg.locator(".riesenkachel").count() == 3
            async def falscher_code(code):
                if await pg.locator("#ebene-huelle .blatt-pin").count() == 0: await pg.click('[data-a="schloss"]'); await pg.wait_for_selector("#ebene-huelle .blatt-pin")
                if await pg.locator('#ebene-huelle .pintaste[data-a="pin-taste"]:disabled').count(): return "gesperrt: " + await pg.evaluate(MELDUNG)
                await schnellstart.code_tippen(pg, code)
                for _ in range(60):
                    await pg.wait_for_timeout(300)
                    m = await pg.evaluate(MELDUNG)
                    if m: return m
                return "?"

            await schnellstart.schnellstart(pg, PORT, name="Döner Test")
            await nav_hilfe.geh(pg, "putzplan"); await pg.wait_for_selector('[data-a="pp-haken"]')
            rettung = await schnellstart.code_setzen(pg, "1234")
            await nav_hilfe.geh(pg, "start"); await nav_hilfe.menue(pg)
            await pg.click('#ebene-huelle [data-a="modus"][data-wert="personal"]'); await pg.wait_for_selector(".riesenkachel"); await pg.wait_for_timeout(400)
            if await pg.locator('[data-a="personal-wer"]').count(): await pg.locator('[data-a="personal-wer"]').first.click(); await pg.wait_for_timeout(300)
            pruefe(await modus() == "personal", "Personal-Modus an")
            s0 = await stand()

            # ---------- Müll mit Foto ----------
            await pg.click('[data-a="personal-ziel"][data-wert="muell"]'); await pg.wait_for_timeout(400)
            await pg.click('[data-a="muell-andere"]'); await pg.wait_for_timeout(300)
            await pg.locator('[data-a="muell-kachel"][data-typ="eimer"]').first.click(); await pg.wait_for_selector('[data-f="muell-menge"]')
            await pg.locator('[data-a="muell-chip"]').first.click(); await pg.wait_for_timeout(200)
            await pg.set_input_files('input[data-f="muell-foto"]', files=[{"name": "x.pdf", "mimeType": "application/pdf", "buffer": b"%PDF-1.4 test"}]); await pg.wait_for_timeout(900)
            pruefe((await stand())["uploads"] == s0["uploads"], "Müll-Foto: eine PDF-Datei wird abgewiesen, nichts abgelegt")
            await pg.set_input_files('input[data-f="muell-foto"]', files=[{"name": "t.txt", "mimeType": "text/plain", "buffer": b"hallo"}]); await pg.wait_for_timeout(700)
            pruefe((await stand())["uploads"] == s0["uploads"], "Müll-Foto: eine Textdatei wird abgewiesen")
            await pg.set_input_files('input[data-f="muell-foto"]', files=[{"name": "m.png", "mimeType": "image/png", "buffer": PNG}])
            for _ in range(40):
                if (await stand())["uploads"] == s0["uploads"] + 1: break
                await pg.wait_for_timeout(250)
            pruefe((await stand())["uploads"] == s0["uploads"] + 1, "Müll-Foto: ein Bild wird abgelegt")
            await pg.wait_for_selector('[data-a="muell-weg-damit"]:not([disabled])'); await pg.click('[data-a="muell-weg-damit"]'); await pg.wait_for_timeout(600)
            pruefe((await stand())["schwund"] == s0["schwund"] + 1, "Müll: Eintrag mit Foto gespeichert")

            # ---------- fremde Datei-Felder, Eingabefelder, Ziele, Hilfe ----------
            s1 = await stand()
            await injekt('<input type="file" data-f="gericht-foto" data-id="x" id="f1"><input type="file" data-f="foto" data-zweck="rechnung" id="f2"><input type="file" data-f="import" id="f3"><input type="file" data-f="zbon-foto" id="f4"><input type="file" data-f="verkauf-datei" id="f5">')
            for i in range(1, 6):
                await pg.set_input_files(f"#f{i}", files=[{"name": "m.png", "mimeType": "image/png", "buffer": PNG}])
            await pg.wait_for_timeout(1200)
            s2 = await stand()
            pruefe(s2["uploads"] == s1["uploads"] and s2["schwund"] == s1["schwund"], "fremde Datei-Felder: nichts eingelesen, nichts abgelegt")
            pruefe(await pg.locator("#ebene-huelle .blatt").count() == 0, "fremde Datei-Felder: kein Blatt, keine Vorschau")
            await injekt('<input id="e1" data-f="sprache-wahl" value=""><input id="e2" data-f="wert:abc" inputmode="decimal"><input id="e3" data-f="stelle-name:k1">')
            await pg.fill("#e1", "tr"); await pg.fill("#e2", "5,00"); await pg.fill("#e3", "Hacked"); await pg.dispatch_event("#e2", "focusout"); await pg.wait_for_timeout(500)
            s3 = await stand()
            pruefe(s3["sprache"] == s1["sprache"] and await pg.evaluate("document.documentElement.lang") != "tr", "Fremdfeld sprache-wahl bewirkt nichts")
            pruefe(await pg.evaluate("(window.__gastrocalc.stand.kuehlstellen || []).every((k) => k.name !== 'Hacked')"), "Fremdfeld stelle-name bewirkt nichts")
            await injekt('<button data-a="personal-ziel" data-wert="buero" id="z1">z</button><button data-a="personal-ziel" data-wert="einstellungen" id="z2">z</button><button data-a="personal-ziel" data-wert="" id="z3">z</button>')
            ans0 = await pg.evaluate(ANSICHT)
            for z in ("z1", "z2", "z3"): await pg.click("#" + z); await pg.wait_for_timeout(300)
            pruefe(await modus() == "personal" and await pg.evaluate(ANSICHT) == ans0, f"personal-ziel mit fremdem Ziel: nichts passiert ({ans0} → {await pg.evaluate(ANSICHT)})")
            await pg.click('[data-a="hilfe-auf"]'); await pg.wait_for_selector("#ebene-huelle .hilfe-inhalt"); await pg.keyboard.press("Escape"); await pg.wait_for_timeout(300)
            await injekt('<button data-a="hilfe-mehr" data-wert="buero" id="h1">h</button><button data-a="hilfe-mehr" data-wert="abschluss" id="h2">h</button>')
            for h in ("h1", "h2"): await pg.click("#" + h); await pg.wait_for_timeout(300)
            pruefe(await pg.locator("#ebene-huelle .hilfe-inhalt").count() == 0, "hilfe-mehr mit fremdem Wert: kein Hilfe-Blatt")
            await injekt('<button data-a="hilfe-mehr" data-wert="muell" id="h3">h</button>'); await pg.click("#h3"); await pg.wait_for_timeout(300)
            pruefe(await pg.locator("#ebene-huelle .hilfe-inhalt").count() == 1, "hilfe-mehr mit Personal-Wert (muell) zeigt die Hilfe")
            await pg.keyboard.press("Escape"); await pg.wait_for_timeout(300); await pg.evaluate("() => document.getElementById('injekt')?.remove()")

            # ---------- Kühl-Rundgang mit Wert und Notiz ----------
            pruefe(await kacheln(), "zurück zu den drei Kacheln")
            await pg.click('[data-a="personal-ziel"][data-wert="kuehl"]'); await pg.wait_for_selector('[data-f="station-wert"]'); await pg.wait_for_timeout(300)
            m0 = await pg.evaluate("(window.__gastrocalc.stand.messungen || []).length")
            await pg.fill('[data-f="station-wert"]', "12"); await pg.wait_for_timeout(300)
            if await pg.locator('[data-a="station-minus"]').count(): await pg.click('[data-a="station-minus"]'); await pg.wait_for_timeout(300)
            await pg.wait_for_selector('[data-a="massnahme"]'); await pg.locator('[data-a="massnahme"]').first.click(); await pg.wait_for_timeout(250)
            await pg.fill('[data-f="station-notiz"]', "Tuer stand offen"); await pg.wait_for_timeout(200)
            await pg.click('[data-a="station-speichern"]:not([disabled])'); await pg.wait_for_timeout(700)
            offen = await pg.evaluate("(((window.__gastrocalc.stand.rundgaenge || []).find((r) => !r.abgeschlossen) || {}).messungen || []).map((m) => [m.wert, m.notiz])")
            pruefe(len(offen) == 1 and offen[0][1] == "Tuer stand offen", f"Kühlung: erste Station mit Wert und Notiz im Rundgang ({offen})")
            await pg.wait_for_selector('[data-f="station-wert"]'); await pg.fill('[data-f="station-wert"]', "-20"); await pg.wait_for_timeout(300)
            await pg.click('[data-a="station-speichern"]:not([disabled])'); await pg.wait_for_timeout(700)
            if await pg.locator('[data-a="rundgang-abschluss"]').count(): await pg.click('[data-a="rundgang-abschluss"]')  # nach der letzten Station schließt der Rundgang meist von selbst
            await pg.wait_for_timeout(900)
            ms = await pg.evaluate("(window.__gastrocalc.stand.messungen || []).map((m) => [m.wert, m.notiz])")
            pruefe(len(ms) == m0 + 2, f"Kühlung: Rundgang abgeschlossen, zwei Messungen gespeichert ({len(ms)})")
            pruefe(any(m[1] == "Tuer stand offen" for m in ms), "Kühlung: Notiz gespeichert")

            # ---------- Putz-Haken ----------
            pruefe(await kacheln(), "zurück zu den drei Kacheln (2)")
            await pg.click('[data-a="personal-ziel"][data-wert="putzplan"]'); await pg.wait_for_selector('[data-a="pp-haken"]'); p0 = (await stand())["putz"]
            await pg.locator('[data-a="pp-haken"]:not([aria-pressed="true"])').first.click(); await pg.wait_for_timeout(400)
            pruefe((await stand())["putz"] == p0 + 1, "Putzplan: Haken gesetzt")
            pruefe(await kacheln(), "zurück zu den drei Kacheln (3)")

            # ---------- Schloss: falscher Code bleibt, richtiger Code → Laden ----------
            m = await falscher_code("9999"); pruefe(await modus() == "personal" and "" != m, f"falscher Code: Personal bleibt ({m!r})")
            await schnellstart.code_tippen(pg, "1234"); await pg.locator("#ebene-huelle .blatt-pin").wait_for(state="detached", timeout=20000); await pg.wait_for_timeout(400)
            pruefe(await modus() == "laden", "richtiger Code führt in den Laden")

            # ---------- Uhr vorstellen, Fehlversuche, Uhr zurück ----------
            await nav_hilfe.menue(pg); await pg.click('#ebene-huelle [data-a="modus"][data-wert="personal"]'); await pg.wait_for_selector(".riesenkachel"); await pg.wait_for_timeout(400)
            await ctx.clock.install(time=datetime.datetime.now()); await pg.wait_for_timeout(300)
            await ctx.clock.set_system_time(datetime.datetime(2099, 1, 1, 12, 0, 0)); await pg.wait_for_timeout(500)
            for c in ("1357", "2468", "1470", "2580", "3691", "7410"):
                r = await falscher_code(c)
                if r.startswith("gesperrt") or "arte" in r or ":" in r: 
                    z = await pg.evaluate(ZAEHLER); 
                    if '"fehler":5' in z or '"fehler":6' in z: break
            await ctx.clock.set_system_time(datetime.datetime.now()); await pg.wait_for_timeout(1500)
            z = await pg.evaluate(ZAEHLER); print("  nach Zurückstellen:", z)
            import json; zj = json.loads(z)
            pruefe(zj["fehler"] >= 5, f"fünf Fehlversuche gezählt ({zj['fehler']})")
            pruefe(zj["bisInMs"] is not None and zj["bisInMs"] <= 15 * 60 * 1000 + 2000, f"gespeichertes „bis“ höchstens 15 min voraus ({zj['bisInMs']} ms)")
            await ctx.clock.fast_forward(15 * 60 * 1000 + 2000); await pg.wait_for_timeout(1500)
            zj = json.loads(await pg.evaluate(ZAEHLER)); pruefe(zj["restMs"] == 0, f"nach 15 min + 2 s ist die Sperre vorbei (Rest {zj['restMs']} ms)")
            if await pg.locator("#ebene-huelle .blatt-pin").count() == 0: await pg.click('[data-a="schloss"]'); await pg.wait_for_selector("#ebene-huelle .blatt-pin")
            pruefe(await pg.locator('#ebene-huelle .pintaste[data-a="pin-taste"]:disabled').count() == 0, "Ziffernblock wieder frei")
            await schnellstart.code_tippen(pg, "1234"); await pg.locator("#ebene-huelle .blatt-pin").wait_for(state="detached", timeout=20000); await pg.wait_for_timeout(400)
            pruefe(await modus() == "laden", "nach der Wartezeit führt der richtige Code in den Laden")

            # ---------- Rettungscode vom Personal-Schloss ----------
            await nav_hilfe.menue(pg); await pg.click('#ebene-huelle [data-a="modus"][data-wert="personal"]'); await pg.wait_for_selector(".riesenkachel"); await pg.wait_for_timeout(400)
            await pg.click('[data-a="schloss"]'); await pg.wait_for_selector("#ebene-huelle .blatt-pin")
            await pg.click('#ebene-huelle [data-a="rettung-start"]'); await pg.wait_for_selector('#ebene-huelle [data-f="rettungscode"]')
            await pg.fill('#ebene-huelle [data-f="rettungscode"]', rettung); await pg.click('#ebene-huelle [data-a="rettung-pruefen"]')
            await pg.wait_for_selector('#ebene-huelle .blatt-pin', timeout=30000); await pg.wait_for_timeout(300)
            await schnellstart.code_tippen(pg, "5555"); await pg.wait_for_timeout(300); await schnellstart.code_tippen(pg, "5555")
            await schnellstart.rettungscode_quittieren(pg); await pg.wait_for_timeout(500)
            pruefe(await modus() == "laden", "Rettungscode: Personal verlassen, neuer Code gesetzt")
            pruefe(not fehler, "keine Konsolenfehler" + (": " + "; ".join(fehler[:3]) if fehler else ""))
            await b.close()
    finally: srv.terminate()
    print("\nVERSTÖSSE:" if verstoesse else "\nALLES OK", *verstoesse, sep="\n" if verstoesse else " ")
    sys.exit(1 if verstoesse else 0)

asyncio.run(main())
