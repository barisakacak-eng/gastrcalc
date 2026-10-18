"""Lieferanten (18.10.2026): Browser-Durchlauf „Lieferanten“ im Handy-Format mit Touch (390×844), feste Uhr Montag 19.10.2026 12:00 (Europe/Berlin).
Schnellstart → Beispiel-Laden → Büro: Hinweis „Bestellschluss Großhandel (Beispiel) heute 18 Uhr – … Waren“ (rot) und Einstieg „Lieferanten“ mit dem Satz →
Liste (Liefertage, Bestellschluss) → Großhandel bearbeiten: Bestellweg WhatsApp mit Nummer → Lager & Bestellen: Liefertermin je Lieferant,
Mindestbestellwert-Hinweis beim Getränkehändler, „Per WhatsApp bestellen“ öffnet wa.me mit dem Bestelltext (Liefertag, Kundennummer) →
Waren zuordnen (Cola zum Großhandel) → neuer Lieferant mit Abholung → im Laden steht kein Satz → Kürzel ausscheiden lassen: Hinweis im Büro mit Datum,
im Kühl-Rundgang nicht mehr wählbar. Kein waagrechter Überlauf, keine Konsolenfehler.
Start: python3 tests/durchlauf_lieferanten.py   (eigener Webserver, Port DURCHLAUF_PORT oder 8783). Bilder: /home/claude/audit/shots/lief_*.png. Exit 1 bei Fehler."""
import asyncio, sys, os, pathlib, traceback, re, datetime, urllib.parse
from playwright.async_api import async_playwright
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
import schnellstart as ss, nav_hilfe

PORT = int(os.environ.get("DURCHLAUF_PORT", "8783"))
OUT = pathlib.Path(os.environ.get("DURCHLAUF_OUT", "/home/claude/audit/shots")); OUT.mkdir(parents=True, exist_ok=True)
EINSTIEG = '#app .b-zeile[data-wert="lieferanten"]'
OEFFNEN_ATTRAPPE = "window.open = (u) => { window.__geoeffnet = u; return null; }"


async def main():
    srv = ss.server(PORT); fehler = []
    try:
        async with async_playwright() as p:
            b = await p.chromium.launch()
            ctx = await b.new_context(viewport={"width": 390, "height": 844}, device_scale_factor=2, is_mobile=True, has_touch=True, locale="de-DE", timezone_id="Europe/Berlin")
            pg = await ctx.new_page()
            await pg.clock.set_system_time(datetime.datetime(2026, 10, 19, 12, 0, tzinfo=datetime.timezone(datetime.timedelta(hours=2))))  # Montag, Sommerzeit
            pg.on("console", lambda m: fehler.append(m.text) if m.type == "error" and "ERR_TUNNEL" not in m.text else None)
            pg.on("pageerror", lambda e: fehler.append(str(e)))
            fragen = []
            pg.on("dialog", lambda d: (fragen.append(d.message), asyncio.ensure_future(d.accept())))
            n = 0
            async def bild(name, voll=True):
                nonlocal n; n += 1; await pg.screenshot(path=str(OUT / f"lief_{n:02d}_{name}.png"), full_page=voll)
            async def tipp(sel): await pg.locator(sel).first.tap(); await pg.wait_for_timeout(450)
            async def stand(): return await pg.evaluate("window.__gastrocalc.stand")
            async def text(): return await pg.inner_text("#app")
            async def ueberlauf(wo):
                x = await pg.evaluate("document.documentElement.scrollWidth - window.innerWidth"); assert x <= 0, f"waagrechter Überlauf ({wo}): {x}px"
            def lf(s, id_): return next(x for x in s["lieferanten"] if x["id"] == id_)

            await ss.schnellstart(pg, PORT, name="Mein Laden")
            await nav_hilfe.geh(pg, "laeden"); await tipp('#app [data-a="beispiel-anlegen"]'); await pg.wait_for_timeout(600)
            s = await stand(); assert s["beispiel"] is True and len(s["lieferanten"]) == 2, s.get("lieferanten")

            # ---- Büro: Hinweis und Einstieg
            await nav_hilfe.ins_buero(pg); await pg.wait_for_timeout(300)
            chip = pg.locator('#app .b-chip', has_text="Bestellschluss Großhandel (Beispiel) heute 18 Uhr")
            assert await chip.count() == 1, "Büro-Hinweis Bestellschluss fehlt: " + (await text())[:500]
            assert await chip.locator(".b-punkt.rot").count() == 1, "Bestellschluss heute ist rot"
            assert await pg.locator(EINSTIEG).count() == 1, "Einstieg „Lieferanten“ fehlt"
            et = await pg.locator(EINSTIEG).inner_text(); assert "Bestellschluss" in et, et
            await bild("buero", voll=False)

            # ---- Liste
            await tipp(EINSTIEG); t = await text()
            for w in ["Lieferanten", "Großhandel (Beispiel)", "Getränkehändler (Beispiel)", "liefert Di, Fr · Bestellschluss am Vortag 18 Uhr", "liefert Mi · Bestellschluss am Vortag 12 Uhr",
                      "Nächste Lieferung Di 20.10., bestellen bis Mo 19.10. 18 Uhr", "ab 150 €", "Neuer Lieferant", "Waren zuordnen", "Was heißt das?"]:
                assert w in t.replace(" ", " "), (w, t[:1200])
            assert "NaN" not in t and "undefined" not in t
            await ueberlauf("Liste"); await bild("liste")

            # ---- Großhandel bearbeiten: WhatsApp mit Nummer
            await tipp('#app [data-a="lf-auf"][data-wert="bsp-lf-gross"]')
            assert await pg.locator('#app [data-lf-form="bsp-lf-gross"]').count() == 1
            t = await text(); assert "bleiben nur auf diesem Handy" in t, t[:800]
            await tipp('#app [data-a="lf-weg"][data-wert="whatsapp"]')
            feld = pg.locator('#app [data-f="lf-kontakt"]'); assert await feld.count() == 1, "Feld für die Nummer fehlt"
            await feld.fill("0151 23456789"); await pg.wait_for_timeout(150)
            await ueberlauf("Formular"); await bild("formular")
            await tipp('#app [data-a="lf-speichern"]')
            s = await stand(); g = lf(s, "bsp-lf-gross"); assert g["weg"] == "whatsapp" and g["kontakt"] == "0151 23456789", g
            assert g["tage"] == [2, 5] and g["schluss"] == {"uhr": "18:00", "tageVorher": 1}, g

            # ---- Lager & Bestellen: Termin, Mindestbestellwert, WhatsApp
            await tipp('#app [data-a="nav"][data-wert="bestand"]'); t = (await text()).replace(" ", " ")
            for w in ["Lieferung Di 20.10., bestellen bis Mo 19.10. 18 Uhr", "Lieferung Mi 21.10.", "Mit Liefertagen: reicht bis zur Lieferung danach", "Per WhatsApp bestellen", "bis Mindestbestellwert", "Bestellschluss Großhandel (Beispiel) heute 18 Uhr"]:
                assert w in t, (w, t[:1500])
            assert await pg.locator('#app [data-best-mindest]').count() >= 1, "Mindestbestellwert-Hinweis fehlt"
            await ueberlauf("Lager & Bestellen"); await bild("bestand", voll=False); await bild("bestand_ganz")
            await pg.evaluate(OEFFNEN_ATTRAPPE)
            await tipp('#app [data-lieferant-id="bsp-lf-gross"] [data-a="best-wa"]')
            url = await pg.evaluate("window.__geoeffnet"); assert url and url.startswith("https://wa.me/4915123456789?text="), url
            nachricht = urllib.parse.unquote(url.split("text=", 1)[1])
            assert re.match(r"^Bestellung Beispiel-Döner, Mo 19\.10\.: \d+ Kartons? Dönerspieß Kalb/Pute, .* – Lieferung Di 20\.10\. · Kundennr\. BSP-1001$", nachricht), nachricht
            assert "0151" not in nachricht
            print("WhatsApp:", nachricht[:160])
            # Getränkehändler ohne Nummer: Teilen wie bisher
            assert await pg.locator('#app [data-lieferant-id="bsp-lf-getraenke"] [data-a="best-wa"]').count() == 0
            assert await pg.locator('#app [data-lieferant-id="bsp-lf-getraenke"] [data-a="best-teilen"]').count() == 1

            # ---- Waren zuordnen: Cola zum Großhandel
            await tipp('#app [data-a="nav"][data-wert="lieferanten"]'); await tipp('#app [data-a="lf-zuordnen"]')
            sel = pg.locator('#app [data-f="lf-haupt:Cola 0,33 l"]'); assert await sel.count() == 1
            await sel.select_option("bsp-lf-gross"); await pg.wait_for_timeout(450)
            cola = next(a for a in (await stand())["artikel"] if a["name"] == "Cola 0,33 l"); assert cola.get("lieferantId") == "bsp-lf-gross", cola.get("lieferantId")
            await ueberlauf("Zuordnen"); await bild("zuordnen", voll=False)
            await tipp('#app [data-a="lf-zuordnen-zu"]')

            # ---- neuer Lieferant mit Abholung
            await tipp('#app [data-a="lf-neu"]'); await pg.locator('#app [data-f="lf-name"]').fill("Markt (Beispiel)"); await pg.wait_for_timeout(120)
            await tipp('#app [data-a="lf-art"][data-wert="supermarkt"]'); await tipp('#app [data-a="lf-modus"][data-wert="abholung"]'); await tipp('#app [data-a="lf-tag"][data-wert="6"]')
            assert await pg.locator('#app [data-f="lf-uhr"]').count() == 0, "Abholung: kein Bestellschluss"
            await bild("neu_abholung")
            await tipp('#app [data-a="lf-anlegen"]'); t = await text()
            assert "Markt (Beispiel)" in t and "Abholung Sa" in t, t[:900]
            m = next(x for x in (await stand())["lieferanten"] if x["name"] == "Markt (Beispiel)"); assert m["modus"] == "abholung" and m["tage"] == [6], m
            await bild("liste_neu")

            # ---- im Laden: kein Satz
            await nav_hilfe.geh(pg, "start"); t = await text()
            assert "Bestellschluss" not in t and "Lieferant" not in t and "Mindestbestellwert" not in t, t[:600]
            await bild("laden_ohne_satz", voll=False)

            # ---- Kürzel ausgeschiedener Mitarbeiter: CD scheidet aus
            await nav_hilfe.ins_buero(pg); await tipp('#app [data-a="kuehl-einrichtung-oeffnen"]')
            await tipp('#app [data-a="person-weg"][data-id="bsp-p-cd"]')
            assert any("CD" in f for f in fragen), fragen
            p_cd = next(x for x in (await stand())["personen"] if x["id"] == "bsp-p-cd"); assert p_cd["entfernt"] is True and p_cd["ausgeschieden"] == "2026-10-19", p_cd
            t = await text(); assert "Ausgeschieden: CD (ausgeschieden am 19.10.2026)" in t and "Alte Einträge und Nachweise mit dem Kürzel bleiben" in t, t[:1500]
            await pg.locator('#app [data-ausgeschieden]').first.scroll_into_view_if_needed(); await bild("ausgeschieden", voll=False)
            await tipp('#app [data-a="kuehl-einrichtung-fertig"]'); await nav_hilfe.geh(pg, "kuehl"); await tipp('#app [data-a="kuehl-rundgang"]')
            wahl = [x.strip() for x in await pg.locator('#app [data-a="start-von"]').all_inner_texts()]
            assert "AB" in wahl and "CD" not in wahl, wahl
            await bild("rundgang_ohne_cd", voll=False)
            await b.close()
        print("Konsolenfehler:", fehler); assert not fehler, fehler
        print("OK – durchlauf_lieferanten:", n, "Bilder in", OUT)
    except Exception:
        traceback.print_exc(); print("Konsolenfehler:", fehler); sys.exit(1)
    finally:
        srv.terminate()


asyncio.run(main())
