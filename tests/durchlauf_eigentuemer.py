"""Eigentümer-Ebene (18.10.2026): Browser-Durchlauf im Handy-Format mit Touch (390×844).
Schnellstart (Laden „Döner Eins“) → Büro → Alle Läden: Satz und eine Karte, Hinweis „Vergleich ab zwei Läden“ → Beispiel-Laden anlegen →
Alle Läden zeigt den Beispiel-Laden mit Kennzeichnung (eigener Laden leer) → „Weiteren Laden anlegen“ („Döner Zwei“, Schnellweg) →
Umsatz eintragen → Alle Läden: Satz, zwei Karten, Beispiel-Laden draußen, Zeitraum Monat/Frei, CSV, Tipp auf Karte = Wechsel.
Start: python3 tests/durchlauf_eigentuemer.py   (eigener Webserver, Port DURCHLAUF_PORT oder 8779). Bilder: /home/claude/audit/shots/eig_*.png. Exit 1 bei Fehler."""
import asyncio, sys, os, pathlib, traceback
from playwright.async_api import async_playwright
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
import schnellstart as ss, nav_hilfe

PORT = int(os.environ.get("DURCHLAUF_PORT", "8779"))
OUT = pathlib.Path(os.environ.get("DURCHLAUF_OUT", "/home/claude/audit/shots")); OUT.mkdir(parents=True, exist_ok=True)


async def zweiter_laden(pg, name):
    """„Weiteren Laden anlegen“ → Schnellweg wie schnellstart(), aber ab dem Namen (Sprache ist schon gewählt)."""
    await pg.locator('#app [data-a="laden-neu"]').first.tap(); await pg.wait_for_selector('[data-a="laden-art"]')
    async def weiter(id_):
        for versuch in range(3):
            await pg.click('[data-a="weiter"]')
            for _ in range(30):
                await pg.wait_for_timeout(100)
                if await pg.evaluate("window.__gastrocalc.stand.schrittId") == id_: await pg.wait_for_timeout(150); return
        raise AssertionError(f"Schritt {id_} nicht erreicht")
    await pg.fill('[data-f="betrieb.name"]', name); await pg.click('[data-a="laden-art"][data-wert="doener"]'); await pg.wait_for_timeout(150)
    await weiter("karte-foto"); await weiter("kuehl-schnell")
    await pg.click('[data-a="s2-kuehl"][data-wert="kuehlschrank"][data-d="1"]'); await pg.wait_for_timeout(150)
    await weiter("geld"); await weiter("fertig-schnell")
    for versuch in range(3):
        knopf = pg.locator('[data-a="ob-fertig"].s2los')
        if await knopf.count(): await knopf.first.click()
        try:
            await pg.wait_for_selector('[data-a="menue-auf"], [data-a="foto-abbrechen"], .ebene-kopf', timeout=20000); break
        except Exception:
            if versuch == 2: raise
    if await pg.locator('[data-a="foto-abbrechen"]').count(): await pg.click('[data-a="foto-abbrechen"]')
    await pg.wait_for_timeout(400)


async def main():
    srv = ss.server(PORT); fehler = []
    try:
        async with async_playwright() as p:
            b = await p.chromium.launch()
            ctx, pg = await ss.kontext(b, 390, 844, fehler)
            n = 0
            async def bild(name, voll=False):
                nonlocal n; n += 1; await pg.screenshot(path=str(OUT / f"eig_{n:02d}_{name}.png"), full_page=voll)
            async def tipp(sel): await pg.locator(sel).first.tap(); await pg.wait_for_timeout(450)
            async def stand(): return await pg.evaluate("window.__gastrocalc.stand")
            async def text(): return await pg.inner_text("#app")
            async def ueberlauf(): return await pg.evaluate("document.documentElement.scrollWidth - window.innerWidth")
            async def karten(): return await pg.locator('#app [data-eig-laden]').count()

            await ss.schnellstart(pg, PORT, name="Döner Eins")
            eins_id = (await stand())["id"]

            # ---- 1. Ein eigener, leerer Laden: Satz „kein Umsatz“, eine Karte, Hinweis „Vergleich ab zwei Läden“
            await nav_hilfe.geh(pg, "laeden"); t = await text()
            assert await pg.locator('#app [data-eig-satz]').count() == 1, "kein Satz"
            assert "Döner Eins: kein Umsatz im Zeitraum" in t, t[:400]
            assert await karten() == 1 and "Vergleich ab zwei Läden" in t, t[:600]
            assert "7 Tage" in t and "Monat" in t and "Frei" in t, "Zeitraum-Wahl fehlt"
            assert await ueberlauf() <= 0, f"Seite läuft über: {await ueberlauf()} px"
            await bild("ein_laden", True)

            # ---- 2. Beispiel-Laden anlegen → Ebene zeigt ihn mit Kennzeichnung (eigener Laden hat keine Daten)
            await tipp('#app [data-a="beispiel-anlegen"]'); await pg.wait_for_timeout(600)
            assert (await stand())["beispiel"] is True
            await nav_hilfe.geh(pg, "laeden"); t = await text()
            assert await karten() == 2, f"{await karten()} Karten statt 2 (Beispiel + eigener)"
            assert "Beispiel-Döner" in t and "Beispiel" in t and "Beispiel-Döner:" in t, t[:600]
            assert await pg.locator('#app [data-eig-laden] .abzeichen').count() >= 1, "Kennzeichnung „Beispiel“ fehlt"
            assert "Platz 1 von 2" in t or "keine Daten" in t, "Vergleich fehlt: " + t[:600]
            await bild("beispiel_in_ebene", True)

            # ---- 3. Zweiten eigenen Laden anlegen und Umsatz eintragen
            await zweiter_laden(pg, "Döner Zwei")
            s = await stand(); zwei_id = s["id"]; assert s["betrieb"]["name"] == "Döner Zwei" and s["phase"] == "app", (s["betrieb"]["name"], s["phase"])
            await nav_hilfe.geh(pg, "umsatz")
            await pg.fill('[data-f="umsatz"]', "850"); await pg.locator('[data-f="umsatz"]').blur(); await pg.wait_for_timeout(500)
            assert any(x.get("umsatz") == 850 for x in (await stand())["tagesnotizen"]), "Umsatz nicht gespeichert"

            # ---- 4. Alle Läden: Satz, zwei Karten, Beispiel draußen (nur noch als einfache Karte mit „Öffnen“)
            await nav_hilfe.geh(pg, "laeden"); t = await text()
            assert await karten() == 2, f"{await karten()} Eigentümer-Karten statt 2"
            assert await pg.locator('#app [data-eig-satz]').count() == 1, "kein Satz"
            satz = await pg.locator('#app [data-eig-satz]').inner_text()
            assert satz.startswith("Döner Zwei:") or satz.startswith("Döner Eins:"), satz
            assert "Beispiel-Döner" in t and await pg.locator(f'#app [data-eig-laden][data-eig-laden="{(await pg.evaluate("window.__gastrocalc.wurzel.betriebe.find((x) => x.beispiel).id"))}"]').count() == 0, "Beispiel-Laden in der Ebene"
            assert "Umsatz" in t and "Wareneinsatz" in t and "Weggeworfen" in t and "Bis null" in t and "Lager-Wert" in t, t[:800]
            assert "850" in t, "Umsatz von Döner Zwei fehlt auf der Karte"
            assert "Unvollständig" in t and "fehlt" in t, "Kennzeichnung unvollständiger Daten fehlt"
            assert "NaN" not in t and "undefined" not in t
            assert await ueberlauf() <= 0, f"Seite läuft über: {await ueberlauf()} px"
            await bild("zwei_laeden", True)

            # ---- 5. Zeitraum: Monat, dann Frei mit Datumsfeldern
            await tipp('#app [data-a="eig-zeit"][data-wert="monat"]')
            assert await pg.locator('#app [data-a="eig-zeit"][data-wert="monat"][aria-pressed="true"]').count() == 1, "Monat nicht gewählt"
            assert await karten() == 2
            await bild("monat", True)
            await tipp('#app [data-a="eig-zeit"][data-wert="frei"]')
            assert await pg.locator('#app [data-f="eig-von"]').count() == 1 and await pg.locator('#app [data-f="eig-bis"]').count() == 1, "Datumsfelder fehlen"
            await bild("frei")
            await tipp('#app [data-a="eig-zeit"][data-wert="woche"]')

            # ---- 6. CSV (Download ohne Teilen-Dialog) und Druck-Knopf vorhanden
            async with pg.expect_download(timeout=8000) as dl:
                await tipp('#app [data-a="eig-csv"]')
            d = await dl.value; assert d.suggested_filename.startswith("Eigentuemer_") and d.suggested_filename.endswith(".csv"), d.suggested_filename
            assert await pg.locator('#app [data-a="eig-druck"]').count() == 1
            await bild("csv")

            # ---- 7. Tipp auf die Karte von Döner Eins = Laden wechseln
            await tipp(f'#app [data-eig-laden="{eins_id}"]')
            assert (await stand())["id"] == eins_id, "Tipp auf die Karte wechselt nicht"
            await bild("nach_wechsel")
            # und über den Satz (Ziel = der genannte Laden)
            await nav_hilfe.geh(pg, "laeden")
            ziel = await pg.locator('#app [data-eig-satz]').get_attribute("data-id")
            if ziel:
                await tipp('#app [data-eig-satz]'); assert (await stand())["id"] == ziel, "Satz führt nicht zum Laden"
            await bild("satz_wechsel")

            assert not fehler, fehler
            print("Eigentümer-Durchlauf ok:", n, "Bilder,", await pg.evaluate("window.__gastrocalc.wurzel.betriebe.length"), "Läden")
            await b.close()
    except Exception:
        traceback.print_exc(); print("Konsolenfehler:", fehler); sys.exit(1)
    finally:
        srv.terminate()


asyncio.run(main())
