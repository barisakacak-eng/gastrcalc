"""Paket 7 (16.10.2026): Personal-Modus im Handy-Format 360×780 – Browser-Gegenprobe.
Schnellstart → Büro-Code 1234 setzen → Putzplan übernehmen und eine Aufgabe abhaken (putzlog wächst) → Personal-Modus:
genau drei Kacheln, kein „€“ auf Start, Müll, Kühlung, Putzen, Browser-Zurück bleibt im Personal-Modus, falscher Code bleibt,
richtiger Code → Laden. Danach die drei Büro-Ordner (Gesundheitsamt, Steuerberater, Buchhalter) ohne Konsolenfehler. Exit 1 bei Verstoß.
Start: python3 tests/durchlauf_personal.py  (Webserver Port 8796)"""
import asyncio, os, pathlib, sys
from playwright.async_api import async_playwright
import nav_hilfe, schnellstart

APP = schnellstart.APP
OUT = pathlib.Path(os.environ.get("DURCHLAUF_OUT", APP.parent / "audit" / "shots")); OUT.mkdir(parents=True, exist_ok=True)
PORT = int(os.environ.get("DURCHLAUF_PORT", "8796"))


async def main():
    srv = schnellstart.server(PORT); fehler = []; verstoesse = []
    def pruefe(bedingung, text):
        if not bedingung: verstoesse.append(text); print("VERSTOSS:", text)
    try:
        async with async_playwright() as p:
            b = await p.chromium.launch(); ctx, pg = await schnellstart.kontext(b, 360, 780, fehler)
            n = 0
            async def bild(name):
                nonlocal n; n += 1; await pg.screenshot(path=str(OUT / f"personal_{n:02d}_{name}.png"), full_page=False)
            async def text(): return await pg.inner_text("#app")
            async def modus(): return await nav_hilfe.modus(pg)
            async def putzlog(): return await pg.evaluate("(window.__gastrocalc.stand.putzlog || []).length")

            await schnellstart.schnellstart(pg, PORT, name="Döner Test")
            # ---- Büro: Code setzen
            await schnellstart.code_setzen(pg, "1234"); await bild("code-gesetzt")
            pruefe(await pg.locator('#app [data-a="pin-setzen"] .b-wert.plus').count() == 1, "Büro zeigt den Code nicht als gesetzt")
            # ---- Putzplan übernehmen und eine Aufgabe abhaken
            await nav_hilfe.geh(pg, "putzplan"); await pg.click('[data-a="pp-uebernehmen"]'); await pg.wait_for_selector('[data-a="pp-haken"]')
            pruefe(await pg.evaluate("!!window.__gastrocalc.stand.putzplan?.aktiv"), "Putzplan nicht aktiv nach Übernehmen")
            vorher = await putzlog(); await pg.locator('[data-a="pp-haken"]').first.click(); await pg.wait_for_timeout(300)
            pruefe(await putzlog() == vorher + 1, f"putzlog wächst nicht: {vorher} → {await putzlog()}")
            pruefe(await pg.locator('[data-a="pp-haken"][aria-pressed="true"]').count() >= 1, "abgehakte Aufgabe nicht markiert")
            await bild("putzplan-abgehakt")
            # ---- Personal-Modus über das Menü-Blatt (Code ist gesetzt → direkt)
            await nav_hilfe.geh(pg, "start"); await nav_hilfe.menue(pg)
            await pg.click('#ebene-huelle [data-a="modus"][data-wert="personal"]'); await pg.wait_for_selector(".riesenkachel"); await pg.wait_for_timeout(300)
            pruefe(await modus() == "personal", "Modus ist nicht personal")
            pruefe(await pg.locator(".riesenkachel").count() == 3, f"nicht genau drei Kacheln: {await pg.locator('.riesenkachel').count()}")
            pruefe(await pg.locator(".tableiste").count() == 0, "Leiste unten im Personal-Modus sichtbar")
            await bild("personal-start")
            pruefe("€" not in await text(), "€ auf dem Personal-Start")
            for ziel in ("muell", "kuehl", "putzplan"):
                await pg.click(f'[data-a="personal-ziel"][data-wert="{ziel}"]'); await pg.wait_for_timeout(400)
                pruefe(await modus() == "personal", f"{ziel}: Modus verlassen")
                tx = await text(); pruefe("€" not in tx, f"€ im Personal-Modus auf {ziel}: {tx[:120]!r}")
                await bild(f"personal-{ziel}")
                # Browser-Zurück: zurück zu den drei Kacheln, Modus bleibt
                await pg.go_back(); await pg.wait_for_timeout(400)
                pruefe(await modus() == "personal", f"{ziel}: Browser-Zurück verlässt den Personal-Modus")
                if await pg.locator(".riesenkachel").count() != 3:  # aus einer Unteransicht (z. B. Rundgang) führt Zurück erst eine Ebene hoch
                    await pg.go_back(); await pg.wait_for_timeout(400)
                pruefe(await pg.locator(".riesenkachel").count() == 3, f"{ziel}: nach Zurück nicht die drei Kacheln")
            # Im Personal-Modus gibt es kein Einrichten (Putzplan anpassen, Kühlstellen)
            pruefe(await pg.locator('[data-a="pp-ansicht"][data-wert="einrichten"]').count() == 0, "Putzplan anpassen im Personal-Modus sichtbar")
            # Browser-Zurück auf dem Personal-Start: bleibt
            await pg.go_back(); await pg.wait_for_timeout(400)
            pruefe(await modus() == "personal" and await pg.locator(".riesenkachel").count() == 3, "Browser-Zurück auf dem Personal-Start verlässt den Modus")
            # ---- Schloss: falscher Code bleibt, richtiger Code → Laden
            await pg.click('[data-a="schloss"]'); await pg.wait_for_selector("#ebene-huelle .blatt-pin")
            await schnellstart.code_tippen(pg, "9999"); await pg.locator("#ebene-huelle .pin-meldung.fehler").wait_for(timeout=20000); await pg.wait_for_timeout(300)
            pruefe(await pg.locator("#ebene-huelle .blatt-pin").count() == 1, "Code-Blatt nach falschem Code weg")
            pruefe(await modus() == "personal", "falscher Code verlässt den Personal-Modus")
            await bild("falscher-code")
            await schnellstart.code_tippen(pg, "1234"); await pg.locator("#ebene-huelle .blatt-pin").wait_for(state="detached", timeout=20000); await pg.wait_for_timeout(400)
            pruefe(await modus() == "laden", f"richtiger Code führt nicht in den Laden: {await modus()}")
            pruefe(await pg.locator(".tableiste").count() == 1, "Laden ohne Leiste unten")
            await bild("laden-nach-code")
            # ---- Büro-Ordner: Gesundheitsamt, Steuerberater, Buchhalter
            for ordner, titel in (("amt", "Gesundheitsamt"), ("steuer", "Steuerberater"), ("buch", "Buchhalter")):
                vor = len(fehler)
                await nav_hilfe.ins_buero(pg); await pg.wait_for_timeout(200)
                if await pg.locator("#ebene-huelle .blatt-pin").count():  # Laden → Büro fragt mit gesetztem Code nach dem Code
                    await schnellstart.code_tippen(pg, "1234"); await pg.locator("#ebene-huelle .blatt-pin").wait_for(state="detached", timeout=20000); await pg.wait_for_timeout(400)
                pruefe(await modus() == "buero", f"Büro mit Code nicht erreicht ({ordner})")
                await pg.click(f'#app [data-a="nav"][data-wert="ordner-{ordner}"]'); await pg.wait_for_timeout(500)
                pruefe(await pg.locator(".b-ordnerseite").count() == 1, f"Ordner {ordner} nicht geöffnet")
                pruefe(len(fehler) == vor, f"Konsolenfehler im Ordner {ordner}: {fehler[vor:]}")
                await bild(f"ordner-{ordner}")
            await ctx.close(); await b.close()
    finally:
        srv.terminate()
    if fehler: print("Konsolenfehler:", fehler)
    if verstoesse or fehler:
        print(f"Personal-Durchlauf: {len(verstoesse)} Verstöße, {len(fehler)} Konsolenfehler"); sys.exit(1)
    print("Personal-Durchlauf ok, Bilder in", OUT)


asyncio.run(main())
