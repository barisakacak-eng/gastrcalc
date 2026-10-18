"""Aktion planen und Getränke (18.10.2026): Browser-Durchlauf im Handy-Format mit Touch (390×844).
Schnellstart → Beispiel-Laden anlegen → Büro „Aktionen & Haltbarkeit“: laufende Aktion mit Fortschritt und geplanter Begründung →
Abverkauf „Auf die Tafel“: Plan mit Vorschlag + Begründung (MHD, Verkauf), änderbar (Bis Datum, Datum ändern) – erst „Auf die Tafel“ im Plan speichert →
laufende Aktion: Zeitraum ändern (Start gesperrt) → Kombi per Chips, Stufe „Normal“ → Plan → „Bis Ware weg“ → übernommen → Menütafel zeigt „solange der Vorrat reicht“ →
Büro „Getränke“: Liste (Glasflasche, Fritz-Kola, Pfand, Eistee offen aus der 1,5-l-Flasche), Ayran ändern (Marke), neues Getränk aus dem Katalog (offen aus der Bag-in-Box) →
im Laden steht nichts davon. Kein waagrechter Überlauf, keine Konsolenfehler.
Start: python3 tests/durchlauf_aktion_plan.py   (eigener Webserver, Port DURCHLAUF_PORT oder 8791). Bilder: /home/claude/audit/shots/plan_*.png. Exit 1 bei Fehler."""
import asyncio, sys, os, pathlib, traceback, datetime
from playwright.async_api import async_playwright
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
import schnellstart as ss, nav_hilfe

PORT = int(os.environ.get("DURCHLAUF_PORT", "8791"))
OUT = pathlib.Path(os.environ.get("DURCHLAUF_OUT", "/home/claude/audit/shots")); OUT.mkdir(parents=True, exist_ok=True)


async def main():
    srv = ss.server(PORT); fehler = []
    try:
        async with async_playwright() as p:
            b = await p.chromium.launch()
            ctx, pg = await ss.kontext(b, 390, 844, fehler)
            pg.on("dialog", lambda d: asyncio.ensure_future(d.accept()))
            n = 0
            async def bild(name, voll=False):
                nonlocal n; n += 1; await pg.screenshot(path=str(OUT / f"plan_{n:02d}_{name}.png"), full_page=voll)
            async def tipp(sel): await pg.locator(sel).first.tap(); await pg.wait_for_timeout(450)
            async def stand(): return await pg.evaluate("window.__gastrocalc.stand")
            async def text(): return (await pg.inner_text("#app")).replace("\xa0", " ")
            async def ueberlauf(wo):
                x = await pg.evaluate("document.documentElement.scrollWidth - window.innerWidth"); assert x <= 0, f"waagrechter Überlauf ({wo}): {x}px"
            def sauber(t): assert "NaN" not in t and "undefined" not in t and "plan." not in t and "getraenke." not in t, t[:900]

            await ss.schnellstart(pg, PORT, name="Mein Laden")
            await nav_hilfe.geh(pg, "laeden"); await tipp('#app [data-a="beispiel-anlegen"]'); await pg.wait_for_timeout(600)
            assert (await stand())["beispiel"] is True

            # ---- Aktionen & Haltbarkeit: laufende Aktion mit Fortschritt und der Begründung, die der Wirt gesehen hat
            await nav_hilfe.geh(pg, "aktionen"); await pg.wait_for_timeout(300); t = await text(); sauber(t)
            for w in ["Laufende Aktionen", "Döner Kebab + Pommes frites + Cola 0,33 l", "Geplant: 7 Tage:", "Verkauf", "gerechnet mit +", "Zeitraum ändern", "Beenden"]:
                assert w.lower() in t.lower(), (w, t[:1500])
            await pg.locator('#app [data-aktion-lauf]').first.scroll_into_view_if_needed(); await ueberlauf("laufend"); await bild("laufend")

            # ---- Abverkauf → Plan: Vorschlag + Begründung, nichts gespeichert
            vorher = len((await stand())["aktionen"])
            await pg.locator('#app [data-a="akt-tafel"][data-art="abverkauf"]').first.scroll_into_view_if_needed()
            await tipp('#app [data-a="akt-tafel"][data-art="abverkauf"][data-wert="0"]')
            assert len((await stand())["aktionen"]) == vorher, "nie automatisch"
            t = await text(); sauber(t)
            for w in ["Aktion planen", "Vorschlag:", "Bis Ware weg, längstens", "MHD Ayran 0,25 l", "Ab sofort", "Bis Datum", "Bis Ware weg", "Du entscheidest.", "Auf die Tafel", "Abbrechen"]:
                assert w.lower() in t.lower(), (w, t[:1500])
            assert await pg.locator('#app [data-a="akt-plan-ende"][data-wert="ware"].an').count() == 1
            await ueberlauf("Plan"); await bild("plan_abverkauf"); await bild("plan_abverkauf_ganz", voll=True)
            # ändern: „Bis Datum“, Ende auf übermorgen (ab dem Vorschlag)
            await tipp('#app [data-a="akt-plan-ende"][data-wert="datum"]')
            von = await pg.locator('#app [data-f="akt-von"]').input_value()
            ziel = (datetime.date.fromisoformat(von) + datetime.timedelta(days=1)).isoformat()
            await pg.locator('#app [data-f="akt-bis"]').fill(ziel); await pg.wait_for_timeout(450)
            assert "Du hast den Vorschlag geändert." in await text()
            await bild("plan_geaendert")
            await tipp('#app [data-a="akt-plan-ok"]')
            s = await stand(); assert len(s["aktionen"]) == vorher + 1, s["aktionen"]; a = s["aktionen"][-1]
            assert a["art"] == "abverkauf" and a["ende"] == "datum" and a["bis"] == ziel and a["ware"] == "Ayran 0,25 l" and "MHD Ayran" in a["plan"]["satz"], a

            # ---- laufende Aktion: Zeitraum ändern (Start gesperrt)
            await tipp('#app [data-a="akt-zeit"][data-wert="bsp-aktion-1"]'); t = await text(); sauber(t)
            assert "zeitraum ändern" in t.lower() and "Du hast den Vorschlag geändert." not in t and await pg.locator('#app [data-f="akt-von"][disabled]').count() == 1
            alt = next(x for x in (await stand())["aktionen"] if x["id"] == "bsp-aktion-1")
            neu_bis = (datetime.date.fromisoformat(alt["bis"]) + datetime.timedelta(days=3)).isoformat()
            await pg.locator('#app [data-f="akt-bis"]').fill(neu_bis); await pg.wait_for_timeout(450); await bild("zeitraum_aendern")
            await tipp('#app [data-a="akt-zeit-ok"]')
            x = next(x for x in (await stand())["aktionen"] if x["id"] == "bsp-aktion-1"); assert x["bis"] == neu_bis and x["von"] == alt["von"] and x.get("geaendertZeit"), x

            # ---- Kombi per Chips → Stufe „Normal“ → Plan → „Bis Ware weg“ → übernehmen
            ids = {g["name"]: g["id"] for g in (await stand())["gerichte"]}
            await tipp(f'#app [data-a="akt-kombi"][data-wert="{ids["Dürüm Döner"]}"]'); await tipp(f'#app [data-a="akt-kombi"][data-wert="{ids["Ayran 0,25 l"]}"]')
            await pg.locator('#app [data-kombi="1"] [data-a="akt-tafel"][data-wert="normal"]').scroll_into_view_if_needed()
            await tipp('#app [data-kombi="1"] [data-a="akt-tafel"][data-wert="normal"]'); t = await text(); sauber(t)
            assert "aktion planen" in t.lower() and "Dürüm Döner + Ayran 0,25 l" in t and " Tage: " in t, t[:1200]
            await bild("plan_kombi")
            await tipp('#app [data-a="akt-plan-ende"][data-wert="ware"]'); await bild("plan_kombi_ware")
            await tipp('#app [data-a="akt-plan-ok"]')
            k = (await stand())["aktionen"][-1]; assert k["art"] == "kombi" and k["ende"] == "ware" and k["plan"]["satz"], k

            # ---- Menütafel: „solange der Vorrat reicht“
            await nav_hilfe.geh(pg, "tafel"); await pg.wait_for_timeout(400)
            tafel = await pg.frame_locator('#app iframe[data-tafel-seite="0"]').locator("body").inner_text()
            assert "solange der Vorrat reicht" in tafel, tafel[:600]
            await bild("tafel")

            # ---- Getränke
            await nav_hilfe.geh(pg, "getraenke"); await pg.wait_for_timeout(300); t = await text(); sauber(t)
            for w in ["Getränke", "Deine Getränke", "Cola 0,33 l", "Glasflasche", "Fritz-Kola", "Pfand 0,08", "Eistee 0,33 l", "offen 0,33 l aus Eistee", "Ware je Glas", "Becher", "Neues Getränk", "Was heißt das?"]:
                assert w.lower() in t.lower(), (w, t[:1500])
            await ueberlauf("Getränke"); await bild("getraenke"); await bild("getraenke_ganz", voll=True)
            ay = ids["Ayran 0,25 l"]
            await tipp(f'#app [data-a="gt-auf"][data-wert="{ay}"]'); t = await text(); sauber(t)
            for w in ["Getränk ändern", "Wie verkaufst du es?", "Dose", "Glasflasche", "PET-Flasche", "Glas offen", "Becher", "Größe / Ausschank in Litern", "Marke", "Pfand je Flasche", "Pfand nur zur Info", "Lieferant"]:
                assert w.lower() in t.lower(), (w, t[:1500])
            await pg.locator('#app [data-f="gt-marke"]').fill("Sütaş"); await pg.wait_for_timeout(150); await bild("getraenk_aendern")
            await tipp('#app [data-a="gt-speichern"]')
            a = next(x for x in (await stand())["artikel"] if x["name"] == "Ayran 0,25 l"); assert a["getraenk"]["marke"] == "Sütaş", a
            # neu aus dem Katalog: offen aus der Bag-in-Box
            await tipp('#app [data-a="gt-neu"]'); await tipp('#app [data-a="gt-vorlage"][data-wert="Cola offen 0,3 l"]'); t = await text(); sauber(t)
            assert all(w.lower() in t.lower() for w in ["Aus dem Katalog", "Ausgeschenkt aus", "Schankverlust in %"]), t[:1500]
            await pg.locator('#app [data-f="gt-preis"]').fill("2,40"); await pg.wait_for_timeout(150)
            await pg.locator('#app [data-f="gt-schank"]').fill("3"); await pg.wait_for_timeout(150)
            await ueberlauf("Neues Getränk"); await bild("getraenk_neu", voll=True)
            await tipp('#app [data-a="gt-anlegen"]')
            g = next(x for x in (await stand())["gerichte"] if x["name"] == "Cola offen 0,3 l")
            assert g["preis"] == 2.4 and g["getraenk"]["quelle"] == "Cola Bag-in-Box (Postmix)" and abs(g["getraenk"]["schankverlust"] - 0.03) < 1e-9, g
            t = await text(); assert "Cola offen 0,3 l" in t and "Einkaufspreis fehlt" in t, t[:1500]
            await bild("getraenke_neu_in_liste")

            # ---- im Laden steht nichts davon
            await nav_hilfe.geh(pg, "start"); t = await text()
            assert "Kombi" not in t and "Schankverlust" not in t and "aktion planen" not in t.lower(), t[:600]
            await b.close()
        print("Konsolenfehler:", fehler); assert not fehler, fehler
        print("OK – durchlauf_aktion_plan:", n, "Bilder in", OUT)
    except Exception:
        traceback.print_exc(); print("Konsolenfehler:", fehler); sys.exit(1)
    finally:
        srv.terminate()


asyncio.run(main())
