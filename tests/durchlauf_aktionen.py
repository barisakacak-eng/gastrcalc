"""Stufe 1 (17.10.2026): Browser-Durchlauf „Aktionen & Haltbarkeit“ im Handy-Format mit Touch (390×844).
Schnellstart (eigener Laden) → Büro: Einstieg da → Bereich ohne Daten (ein Satz, „Läuft ab“ leer, Kombi braucht Gerichte) → Beleg einlesen,
übernehmen → freiwilliger Schritt „Haltbarkeit“: Datum eintragen, Speichern → Datum steht an der Belegzeile → Beispiel-Laden anlegen →
Büro: Offen-Hinweis „Hähnchenspieß bis morgen verbrauchen“ (rot) → Bereich: Läuft ab (Hähnchenspieß), Abverkauf (Ayran, Teilen-Text),
Kombi-Vorschlag rechnen (drei Stufen, Teilen-Text), Kombi per Chips → im Laden steht nichts davon. Kein waagrechter Überlauf, keine Konsolenfehler.
Start: python3 tests/durchlauf_aktionen.py   (eigener Webserver, Port DURCHLAUF_PORT oder 8783). Bilder: /home/claude/audit/shots/akt_*.png. Exit 1 bei Fehler."""
import asyncio, sys, os, pathlib, traceback, re, datetime
from playwright.async_api import async_playwright
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
import schnellstart as ss, nav_hilfe
# Prüfgremium 17.10.2026 (4): Beispiel-Laden hat Sonntag Ruhetag – ist morgen Sonntag, heißt es „heute verbrauchen“ (Geschäftstag bis 4 Uhr)
_gt = datetime.datetime.now() - datetime.timedelta(hours=4)
ERWARTET = "Hähnchenspieß heute verbrauchen" if (_gt + datetime.timedelta(days=1)).weekday() == 6 else "Hähnchenspieß bis morgen verbrauchen"

PORT = int(os.environ.get("DURCHLAUF_PORT", "8783"))
OUT = pathlib.Path(os.environ.get("DURCHLAUF_OUT", "/home/claude/audit/shots")); OUT.mkdir(parents=True, exist_ok=True)
EINSTIEG = '#app .b-zeile[data-wert="aktionen"]'
TEILEN_ATTRAPPE = "Object.defineProperty(navigator, 'share', { configurable: true, value: async (d) => { window.__geteilt = d; } })"
BELEG = """METRO Cash & Carry Deutschland
Rechnung Nr. 4711 vom 11.10.2026
4001234 Tomaten rund KI 6kg 2 9,90 19,80 A
4015512 Hackfleisch gemischt 2kg PK 1 14,00 14,00 A
Summe Netto 33,80
"""


async def main():
    srv = ss.server(PORT); fehler = []
    try:
        async with async_playwright() as p:
            b = await p.chromium.launch()
            ctx, pg = await ss.kontext(b, 390, 844, fehler)
            pg.on("dialog", lambda d: asyncio.ensure_future(d.accept()))
            n = 0
            async def bild(name, voll=True):
                nonlocal n; n += 1; await pg.screenshot(path=str(OUT / f"akt_{n:02d}_{name}.png"), full_page=voll)
            async def tipp(sel): await pg.locator(sel).first.tap(); await pg.wait_for_timeout(450)
            async def stand(): return await pg.evaluate("window.__gastrocalc.stand")
            async def text(): return (await pg.inner_text("#app")).replace("\xa0", " ")
            async def ueberlauf(wo):
                x = await pg.evaluate("document.documentElement.scrollWidth - window.innerWidth"); assert x <= 0, f"waagrechter Überlauf ({wo}): {x}px"

            await ss.schnellstart(pg, PORT, name="Mein Laden")

            # ---- eigener Laden: Einstieg für alle, ohne Daten ein klarer Satz
            await nav_hilfe.ins_buero(pg); await pg.wait_for_timeout(300)
            assert await pg.locator(EINSTIEG).count() == 1, "Einstieg „Aktionen & Haltbarkeit“ fehlt"
            await tipp(EINSTIEG); t = await text()
            for w in ["Aktionen & Haltbarkeit", "Nichts läuft bald ab.", "Läuft ab", "Keine Ware mit Datum", "Abverkauf", "Kombi-Angebot", "Preise auf Aushang und Kasse müssen gleich sein."]:
                assert w.lower() in t.lower(), (w, t[:900])
            await ueberlauf("leer"); await bild("leer")

            # ---- Beleg: übernehmen → freiwilliger Schritt Haltbarkeit
            await nav_hilfe.geh(pg, "beleg"); await tipp('#app [data-a="beleg-text-zeigen"]')
            await pg.fill('[data-f="beleg-text"]', BELEG); await pg.wait_for_timeout(150)
            await tipp('#app [data-a="beleg-zerlegen"]')
            for _ in range(8):
                if await pg.locator('[data-a="beleg-zuordnen"][data-name="neu"]').count(): await tipp('[data-a="beleg-zuordnen"][data-name="neu"]')
                elif await pg.locator('[data-a="beleg-antwort"]').count(): await tipp('[data-a="beleg-antwort"]')
                elif await pg.locator('[data-a="beleg-basis"][data-wert="netto"]').count() and not await pg.locator('[data-a="beleg-basis"][data-wert="netto"].an').count(): await tipp('[data-a="beleg-basis"][data-wert="netto"]')
                else: break
            assert not await pg.locator('[data-a="beleg-uebernehmen"]').is_disabled(), "Übernehmen gesperrt"
            await tipp('#app [data-a="beleg-uebernehmen"]'); t = await text()
            assert "Haltbarkeit (freiwillig)" in t and "Datum eintragen" in t, t[:900]
            await ueberlauf("Beleg fertig"); await bild("beleg_fertig", voll=False)
            await tipp('#app [data-a="hb-auf"]')
            felder = pg.locator('#app input[type="date"][data-f^="hb-datum:"]'); assert await felder.count() >= 1
            datum = (datetime.date.today() + datetime.timedelta(days=2)).isoformat()
            await felder.first.fill(datum); await pg.wait_for_timeout(200)
            await ueberlauf("Haltbarkeit eintragen"); await bild("beleg_haltbar")
            await tipp('#app [data-a="hb-speichern"]')
            s = await stand(); l = s["lieferungen"][-1]
            mit = [z for z in l["zeilen"] if z.get("haltbar")]
            assert len(mit) == 1 and mit[0]["haltbar"]["datum"] == datum and mit[0]["haltbar"]["art"] in ("mhd", "verbrauch"), l["zeilen"]
            assert "1 Datum eingetragen" in await text()

            # ---- Beispiel-Laden anlegen → Büro: Offen-Hinweis und Einstieg mit der Uhrzeit
            await nav_hilfe.geh(pg, "laeden"); await tipp('#app [data-a="beispiel-anlegen"]'); await pg.wait_for_timeout(600)
            assert (await stand())["beispiel"] is True
            await nav_hilfe.ins_buero(pg); await pg.wait_for_timeout(300)
            chip = pg.locator('#app .b-chip[data-wert="aktionen"]')
            assert await chip.count() == 1, "Offen-Hinweis „Aktionen“ fehlt im Büro"
            ct = await chip.inner_text(); assert ERWARTET in ct, (ERWARTET, ct)
            assert await chip.locator(".b-punkt.rot").count() == 1, "Hinweis sollte rot sein"
            et = await pg.locator(EINSTIEG).inner_text(); assert "Hähnchenspieß" in et, et
            await bild("buero_hinweis", voll=False)

            # ---- Bereich mit Daten
            await tipp('#app .b-chip[data-wert="aktionen"]'); t = await text()
            for w in [ERWARTET, "Läuft ab", "Hähnchenspieß", "nicht mehr verwenden ab", "Abverkauf", "Ayran 0,25 l für 1,50 € statt 2,00 €", "Wegwerfen kostet", "Aktion bringt",
                      "Kombi-Angebot", "Vorschläge", "Renner", "Was heißt das?"]:
                assert w.lower() in t.lower(), (w, t[:1500])
            assert "NaN" not in t and "undefined" not in t and "aktionen." not in t, t[:800]
            assert t.count("Preise auf Aushang und Kasse") == 1
            await ueberlauf("Aktionen"); await bild("aktionen", voll=False); await bild("aktionen_ganz")

            # ---- Teilen: Abverkauf
            await pg.evaluate(TEILEN_ATTRAPPE)
            await tipp('#app [data-a="akt-teilen"][data-art="abverkauf"][data-wert="0"]')
            g = await pg.evaluate("window.__geteilt"); assert g and re.match(r"^Ayran 0,25 l nur 1,50\s€ statt 2,00\s€ – bis (Mo|Di|Mi|Do|Fr|Sa|So) \d\d\.\d\d\.$", g["text"]), g
            print("Geteilt (Abverkauf):", g["text"])

            # ---- Kombi-Vorschlag rechnen → drei Stufen → Teilen
            await tipp('#app [data-a="akt-kombi-vorschlag"][data-wert="0"]')
            assert await pg.locator('#app [data-kombi="1"] [data-stufe]').count() == 3
            t = await text()
            for w in ["Döner Kebab + Pommes frites (Beilage) + Cola 0,33 l", "Einzeln", "Vorsichtig", "Normal", "Stark", "bleibt", "Kombis mehr nötig"]: assert w.lower() in t.lower(), (w, t[:1500])
            await ueberlauf("Kombi"); await pg.locator('#app [data-kombi="1"]').scroll_into_view_if_needed(); await bild("kombi", voll=False)
            await pg.evaluate("window.__geteilt = null")
            await tipp('#app [data-kombi="1"] [data-a="akt-teilen"][data-wert="normal"]')
            g = await pg.evaluate("window.__geteilt"); assert g and re.match(r"^Döner Kebab \+ Pommes frites \+ Cola 0,33 l nur \d+,\d0\s€$", g["text"]), g
            print("Geteilt (Kombi):", g["text"])

            # ---- Kombi per Chips
            await tipp('#app [data-a="akt-kombi-leeren"]'); assert await pg.locator('#app [data-kombi="1"]').count() == 0
            ids = {x["name"]: x["id"] for x in (await stand())["gerichte"]}
            await tipp(f'#app [data-a="akt-kombi"][data-wert="{ids["Dürüm Döner"]}"]'); assert await pg.locator('#app [data-kombi="1"]').count() == 0, "eins reicht nicht"
            await tipp(f'#app [data-a="akt-kombi"][data-wert="{ids["Ayran 0,25 l"]}"]')
            assert await pg.locator('#app [data-kombi="1"] [data-stufe]').count() == 3
            assert "Dürüm Döner + Ayran 0,25 l" in await text()
            await ueberlauf("Kombi Chips"); await pg.locator('#app [data-kombi="1"]').scroll_into_view_if_needed(); await bild("kombi_chips", voll=False)

            # ---- im Laden steht nichts davon
            await nav_hilfe.geh(pg, "start"); t = await text()
            assert "verbrauchen" not in t and "Hähnchenspieß" not in t and "Aktion" not in t, t[:600]
            await bild("laden_ohne_satz", voll=False)
            await b.close()
        print("Konsolenfehler:", fehler); assert not fehler, fehler
        print("OK – durchlauf_aktionen:", n, "Bilder in", OUT)
    except Exception:
        traceback.print_exc(); print("Konsolenfehler:", fehler); sys.exit(1)
    finally:
        srv.terminate()


asyncio.run(main())
