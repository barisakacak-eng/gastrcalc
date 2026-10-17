"""Bestand (17.10.2026): Browser-Durchlauf „Lager & Bestellen“ im Handy-Format mit Touch (390×844).
Schnellstart (eigener Laden) → Büro: Einstieg da → ohne Inventur „Mach zuerst eine Inventur“ → Beispiel-Laden anlegen → Büro: Offen-Hinweis
(Dönerspieß, rot) und Einstieg mit der Uhrzeit als Unterzeile → Lager & Bestellen: Satz oben, Bestellliste je Lieferant, Lager jetzt →
Teilen-Knopf (navigator.share, Text auf Deutsch) → Einstellung „14 Tage“ und „Puffer 0“ wirken auf die Liste → Mindestbestand für Cola →
im Laden steht der Satz nicht. Kein waagrechter Überlauf, keine Konsolenfehler.
Start: python3 tests/durchlauf_bestand.py   (eigener Webserver, Port DURCHLAUF_PORT oder 8781). Bilder: /home/claude/audit/shots/best_*.png. Exit 1 bei Fehler."""
import asyncio, sys, os, pathlib, traceback, re
from playwright.async_api import async_playwright
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
import schnellstart as ss, nav_hilfe

PORT = int(os.environ.get("DURCHLAUF_PORT", "8781"))
OUT = pathlib.Path(os.environ.get("DURCHLAUF_OUT", "/home/claude/audit/shots")); OUT.mkdir(parents=True, exist_ok=True)
EINSTIEG = '#app .b-zeile[data-wert="bestand"]'
TEILEN_ATTRAPPE = "Object.defineProperty(navigator, 'share', { configurable: true, value: async (d) => { window.__geteilt = d; } })"


async def main():
    srv = ss.server(PORT); fehler = []
    try:
        async with async_playwright() as p:
            b = await p.chromium.launch()
            ctx, pg = await ss.kontext(b, 390, 844, fehler)
            pg.on("dialog", lambda d: asyncio.ensure_future(d.accept()))
            n = 0
            async def bild(name, voll=True):
                nonlocal n; n += 1; await pg.screenshot(path=str(OUT / f"best_{n:02d}_{name}.png"), full_page=voll)
            async def tipp(sel): await pg.locator(sel).first.tap(); await pg.wait_for_timeout(450)
            async def stand(): return await pg.evaluate("window.__gastrocalc.stand")
            async def text(): return await pg.inner_text("#app")
            async def ueberlauf(wo):
                x = await pg.evaluate("document.documentElement.scrollWidth - window.innerWidth"); assert x <= 0, f"waagrechter Überlauf ({wo}): {x}px"
            async def erste_menge(): return (await pg.locator('#app .karte[data-lieferant="0"] .summenzeile .wert').first.inner_text()).strip()

            await ss.schnellstart(pg, PORT, name="Mein Laden")

            # ---- eigener Laden: Einstieg für alle, ohne Inventur ein klarer Satz
            await nav_hilfe.ins_buero(pg); await pg.wait_for_timeout(300)
            assert await pg.locator(EINSTIEG).count() == 1, "Einstieg „Lager & Bestellen“ fehlt"
            await tipp(EINSTIEG); t = await text()
            assert "Lager & Bestellen" in t and "Mach zuerst eine Inventur" in t, t[:600]
            await ueberlauf("ohne Inventur"); await bild("ohne_inventur")

            # ---- Beispiel-Laden anlegen → Büro: Offen-Hinweis und Einstieg mit der Uhrzeit
            await nav_hilfe.geh(pg, "laeden"); await tipp('#app [data-a="beispiel-anlegen"]'); await pg.wait_for_timeout(600)
            assert (await stand())["beispiel"] is True
            await nav_hilfe.ins_buero(pg); await pg.wait_for_timeout(300)
            chip = pg.locator('#app .b-chip[data-wert="bestand"]')
            assert await chip.count() == 1, "Offen-Hinweis „Lager“ fehlt im Büro"
            ct = await chip.inner_text(); assert "Dönerspieß" in ct, ct
            assert await chip.locator(".b-punkt.rot").count() == 1, "Hinweis sollte rot sein"
            et = await pg.locator(EINSTIEG).inner_text(); assert "Dönerspieß" in et, et
            await bild("buero_hinweis", voll=False)

            # ---- Lager & Bestellen
            await tipp('#app .b-chip[data-wert="bestand"]'); t = await text()
            for w in ["Lager & Bestellen", "Dönerspieß Kalb/Pute", "heute bestellen", "Großhandel (Beispiel)", "Bestellung teilen", "Lager jetzt", "Wert im Lager", "sicher", "Einstellungen", "Reicht für 7 Tage, dazu 2 Tage Puffer"]:
                assert w.lower() in t.lower(), (w, t[:1500])
            assert "NaN" not in t and "undefined" not in t, t[:800]
            await ueberlauf("Lager & Bestellen"); await bild("bestellen", voll=False); await bild("bestellen_ganz")

            # ---- Teilen: navigator.share bekommt den deutschen Text
            await pg.evaluate(TEILEN_ATTRAPPE)
            await tipp('#app [data-a="best-teilen"][data-wert="0"]'); await pg.wait_for_timeout(300)
            geteilt = await pg.evaluate("window.__geteilt")
            assert geteilt and re.match(r"^Bestellung Beispiel-Döner, (Mo|Di|Mi|Do|Fr|Sa|So) \d\d\.\d\d\.: \d+ Kartons? Dönerspieß Kalb/Pute, ", geteilt["text"]), geteilt
            print("Geteilt:", geteilt["text"][:160])

            # ---- Einstellung ändern wirkt: 14 Tage → mehr Dönerspieß; Puffer 0
            vorher = await erste_menge(); zeilen_vorher = await pg.locator('#app .karte[data-lieferant] .summenzeile:not(.gesamt)').count()
            await tipp('#app [data-a="best-tage"][data-wert="14"]')
            s = await stand(); assert s["lager"]["tage"] == 14, s.get("lager")
            nachher = await erste_menge(); t = await text()
            assert "Reicht für 14 Tage" in t, t[:800]
            zahl = lambda x: int(re.match(r"(\d+)", x).group(1))
            assert zahl(nachher) > zahl(vorher), (vorher, nachher)
            assert await pg.locator('#app .karte[data-lieferant] .summenzeile:not(.gesamt)').count() >= zeilen_vorher
            await tipp('#app [data-a="best-puffer"][data-wert="0"]')
            assert (await stand())["lager"]["puffer"] == 0
            assert "dazu 0 Tage Puffer" in await text()
            await bild("einstellung_14_tage", voll=False)

            # ---- Mindestbestand für Cola
            await tipp('#app [data-a="best-mindest-auf"]')
            feld = pg.locator('#app [data-f="best-mindest:Cola 0,33 l"]'); assert await feld.count() == 1
            await feld.fill("12"); await pg.wait_for_timeout(200); await ueberlauf("Mindestbestand"); await bild("mindestbestand")
            await tipp('#app [data-a="best-mindest-speichern"]')
            cola = next(a for a in (await stand())["artikel"] if a["name"] == "Cola 0,33 l"); assert cola.get("mindestbestand") == 12, cola.get("mindestbestand")
            t = await text(); assert "Mindestbestand" in t, t[:800]

            # ---- im Laden steht der Satz nicht (Laden-Änderungen gibt der Eigentümer frei)
            await nav_hilfe.geh(pg, "start"); t = await text()
            assert "fast alle" not in t and "bestellen" not in t.lower(), t[:600]
            await bild("laden_ohne_satz", voll=False)
            await b.close()
        print("Konsolenfehler:", fehler); assert not fehler, fehler
        print("OK – durchlauf_bestand:", n, "Bilder in", OUT)
    except Exception:
        traceback.print_exc(); print("Konsolenfehler:", fehler); sys.exit(1)
    finally:
        srv.terminate()


asyncio.run(main())
