"""Paket 7 (16.10.2026): gemeinsamer Schnellstart für die Regel- und Personal-Durchläufe.
Deutsch → Dönerladen → Karte „Später“ → 1 Kühlschrank + 1 Tiefkühler → Kosten leer → Fertig (Karte per Foto abbrechen) → Laden „Heute“.
Dazu: Büro-Code über das Ziffernblatt tippen und ein Browser-Kontext im Handy-Format."""
import pathlib, subprocess, sys, time

APP = pathlib.Path(__file__).resolve().parent.parent


def server(port):
    p = subprocess.Popen([sys.executable, "-m", "http.server", str(port), "--bind", "127.0.0.1"], cwd=APP, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    time.sleep(0.8); return p


async def kontext(b, breite, hoehe, fehler):
    ctx = await b.new_context(viewport={"width": breite, "height": hoehe}, device_scale_factor=2, is_mobile=True, has_touch=True, locale="de-DE")
    await ctx.add_init_script(path=__import__("os").path.join(__import__("os").path.dirname(__import__("os").path.abspath(__file__)), "hilfe", "aufklappen.js"))  # Büro-Bereiche offen (19.10.2026)
    pg = await ctx.new_page()
    pg.on("console", lambda m: fehler.append(m.text) if m.type == "error" and "ERR_TUNNEL" not in m.text else None)
    pg.on("pageerror", lambda e: fehler.append(str(e)))
    return ctx, pg


async def schnellstart(pg, port, name="Döner Test"):
    import nav_hilfe
    await pg.goto(f"http://127.0.0.1:{port}/index.html"); await pg.wait_for_selector(".kachel, [data-f=\"sprache-wahl\"]")
    for _ in range(240):  # erster Start: warten, bis der Service Worker die Seite übernommen hat (seit 27.10.2026 ohne Neuladen)
        if await pg.evaluate("!!navigator.serviceWorker.controller"): break
        await pg.wait_for_timeout(500)
    await pg.select_option('[data-f="sprache-wahl"]', "de"); await pg.click('[data-a="sprache"][data-wert="de"]'); await nav_hilfe.nach_sprache(pg); await pg.wait_for_selector('[data-a="laden-art"]')
    async def weiter(id_):  # „Weiter“ tippen und warten, bis der Schritt mit dieser Kennung steht (CSP erlaubt kein wait_for_function)
        for versuch in range(3):
            await pg.click('[data-a="weiter"]')
            for _ in range(30):
                await pg.wait_for_timeout(100)
                if await pg.evaluate("window.__gastrocalc.stand.schrittId") == id_: await pg.wait_for_timeout(150); return
        raise AssertionError(f"Schritt {id_} nicht erreicht")
    await pg.fill('[data-f="betrieb.name"]', name); await pg.click('[data-a="laden-art"][data-wert="doener"]'); await pg.wait_for_timeout(150)
    await weiter("karte-foto")
    await weiter("kuehl-schnell")  # Karte: „Später“
    await pg.click('[data-a="s2-kuehl"][data-wert="kuehlschrank"][data-d="1"]'); await pg.wait_for_timeout(150)
    await pg.click('[data-a="s2-kuehl"][data-wert="tiefkuehler"][data-d="1"]'); await pg.wait_for_timeout(150)
    await weiter("geld")
    await weiter("fertig-schnell")  # Kosten leer lassen
    # 28.10.2026: „Später“ bei der Karte wird respektiert – am Ende „Los geht's“ (start), nicht zurück in die Karte
    assert await pg.locator('[data-a="ob-fertig"].s2los').get_attribute("data-ziel") == "start", "Karte „Später“ wurde am Ende überfahren"
    assert await pg.locator('.fuss [data-a="ob-fertig"]').count() == 1, "genau ein Hauptknopf nach „Später“"
    # 17./18.10.: auf langsamen CI-Rechnern ging der erste Tipp gelegentlich ins Leere – bis zu 3 Tipps, je 20 s warten
    for versuch in range(3):
        knopf = pg.locator('[data-a="ob-fertig"].s2los')
        if await knopf.count(): await knopf.first.click()
        try:
            await pg.wait_for_selector('[data-a="menue-auf"], [data-a="foto-abbrechen"]', timeout=20000); break
        except Exception:
            if versuch == 2: raise
    if await pg.locator('[data-a="foto-abbrechen"]').count(): await pg.click('[data-a="foto-abbrechen"]')  # ohne Gerichte landet „Los“ bei „Karte per Foto“
    await nav_hilfe.geh(pg, "start")
    await pg.wait_for_selector('[data-a="menue-auf"]'); await pg.wait_for_timeout(400)
    await nav_hilfe.rundgang_weg(pg)  # 27.10.2026: erster Besuch auf Heute zeigt den Rundgang mit Zeki


async def code_tippen(pg, code):
    """Ziffern auf dem offenen Code-Blatt tippen."""
    for z in code:
        await pg.click(f'#ebene-huelle [data-a="pin-taste"][data-wert="{z}"]'); await pg.wait_for_timeout(60)


async def code_setzen(pg, code="1234"):
    """Im Büro: „Büro-Code“ → zweimal tippen → gesetzt."""
    import nav_hilfe
    await nav_hilfe.ins_buero(pg); await pg.wait_for_timeout(300)
    await pg.click('#app [data-a="pin-setzen"]'); await pg.wait_for_selector("#ebene-huelle .blatt-pin")
    await code_tippen(pg, code); await pg.wait_for_timeout(300); await code_tippen(pg, code)
    await pg.locator("#ebene-huelle .blatt-pin").wait_for(state="detached", timeout=20000)  # PBKDF2 rechnet
    rettungscode = await rettungscode_quittieren(pg)
    await pg.wait_for_timeout(400)
    assert await pg.evaluate("!!window.__gastrocalc.wurzel.bueroPin"), "Büro-Code nicht gesetzt"
    return rettungscode


async def rettungscode_quittieren(pg):
    """Rettung (17.10.2026): nach jedem neuen Büro-Code zeigt die App einmal den Rettungscode – ablesen, „Aufgeschrieben“ tippen."""
    feld = pg.locator('#ebene-huelle .blatt-rettungscode [data-rettungscode]')
    await feld.wait_for(timeout=20000)  # zweites PBKDF2 (Rettungscode)
    code = await feld.input_value()
    await pg.click('#ebene-huelle [data-a="rettung-ok"]'); await pg.locator("#ebene-huelle .blatt-rettungscode").wait_for(state="detached", timeout=5000)
    return code
