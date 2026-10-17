"""E7 (17.10.2026): Browser-Durchlauf „Verkauf je Gericht“ im Handy-Format mit Touch (390×844).
Schnellstart (eigener Laden) → Büro ohne Einstieg „Verkauf“ → Beispiel-Laden anlegen → Büro → Verkauf → Auswertung (Rang, Schwund-Verdacht
bei der Cola, Ladenhüter) → erfundene DSFinV-K-Datei (tests/daten/beispiel-dsfinvk-export.zip) einlesen → Vorschau → „Dürüm“ per Chip
zuordnen (wird gelernt) → Übernehmen → Handeingabe für einen Tag → zurück zum eigenen Laden: kein Einstieg; mit ?verkauf=1 sichtbar,
?verkauf=0 wieder weg. Kein waagrechter Überlauf, keine Konsolenfehler.
Start: python3 tests/durchlauf_verkauf.py   (eigener Webserver, Port DURCHLAUF_PORT oder 8779). Bilder: /home/claude/audit/shots/verk_*.png. Exit 1 bei Fehler."""
import asyncio, sys, os, pathlib, traceback
from playwright.async_api import async_playwright
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
import schnellstart as ss, nav_hilfe

PORT = int(os.environ.get("DURCHLAUF_PORT", "8779"))
OUT = pathlib.Path(os.environ.get("DURCHLAUF_OUT", "/home/claude/audit/shots")); OUT.mkdir(parents=True, exist_ok=True)
DATEI = str(pathlib.Path(__file__).resolve().parent / "daten" / "beispiel-dsfinvk-export.zip")
EINSTIEG = '#app [data-a="nav"][data-wert="verkauf"]'


async def main():
    srv = ss.server(PORT); fehler = []
    try:
        async with async_playwright() as p:
            b = await p.chromium.launch()
            ctx, pg = await ss.kontext(b, 390, 844, fehler)
            pg.on("dialog", lambda d: asyncio.ensure_future(d.accept()))
            n = 0
            async def bild(name, voll=True):
                nonlocal n; n += 1; await pg.screenshot(path=str(OUT / f"verk_{n:02d}_{name}.png"), full_page=voll)
            async def tipp(sel): await pg.locator(sel).first.tap(); await pg.wait_for_timeout(450)
            async def stand(): return await pg.evaluate("window.__gastrocalc.stand")
            async def text(): return await pg.inner_text("#app")
            async def ueberlauf(wo):
                x = await pg.evaluate("document.documentElement.scrollWidth - window.innerWidth"); assert x <= 0, f"waagrechter Überlauf ({wo}): {x}px"

            await ss.schnellstart(pg, PORT, name="Mein Laden")
            eigen_id = (await stand())["id"]

            # ---- eigener Laden ohne Schalter: kein Einstieg
            await nav_hilfe.ins_buero(pg); await pg.wait_for_timeout(300)
            assert await pg.locator(EINSTIEG).count() == 0, "Einstieg „Verkauf“ ohne Schalter sichtbar"
            assert "Verkauf je Gericht" not in await text()
            await bild("buero_ohne_schalter")

            # ---- Beispiel-Laden anlegen → Büro zeigt den Einstieg
            await nav_hilfe.geh(pg, "laeden"); await tipp('#app [data-a="beispiel-anlegen"]'); await pg.wait_for_timeout(600)
            assert (await stand())["beispiel"] is True
            await nav_hilfe.ins_buero(pg); await pg.wait_for_timeout(300)
            assert await pg.locator(EINSTIEG).count() == 1, "Einstieg im Beispiel-Laden fehlt"
            await bild("buero_beispiel", voll=False)
            await tipp(EINSTIEG); t = await text()
            for w in ["Verkauf je Gericht", "Am meisten verkauft", "Döner Kebab", "Schwund-Verdacht", "Cola 0,33 l", "Ladenhüter", "Adana-Spieß", "Gebundenes Geld"]:
                assert w.lower() in t.lower(), (w, t[:1500])
            assert "NaN" not in t and "undefined" not in t, t[:800]
            await ueberlauf("Auswertung"); await bild("auswertung")

            # ---- Datei einlesen → Vorschau
            vorher = len((await stand())["verkaeufe"])
            await pg.set_input_files('[data-f="verkauf-datei"]', DATEI); await pg.wait_for_timeout(900)
            t = await text()
            for w in ["Datei prüfen", "Diese Kassentexte kennt die App noch nicht", "Dürüm", "Döner groß", "Nicht als Verkauf gezählt"]:
                assert w.lower() in t.lower(), (w, t[:1500])  # Zwischentitel stehen per CSS in Großbuchstaben
            await ueberlauf("Vorschau"); await bild("vorschau")

            # ---- Zuordnen per Chip (wird gelernt)
            await tipp('#app [data-a="vk-zuordnen"][data-text="Dürüm"][data-id="bsp-g-2"]'); await pg.wait_for_timeout(300)
            g2 = next(g for g in (await stand())["gerichte"] if g["id"] == "bsp-g-2")
            assert "Dürüm" in (g2.get("kassenNamen") or []), g2.get("kassenNamen")
            t = await text(); assert "Datei prüfen" in t and "Döner groß" in t, t[:800]
            await bild("zugeordnet")

            # ---- Übernehmen
            await tipp('#app [data-a="vk-uebernehmen"]'); await pg.wait_for_timeout(500)
            s = await stand(); neu = [v for v in s["verkaeufe"] if not v["id"].startswith("bsp-")]
            assert len(neu) == 7 and len(s["verkaeufe"]) == vorher + 7, (len(neu), len(s["verkaeufe"]), vorher)
            assert any(v["gericht"] == "bsp-g-2" and v.get("text") == "Dürüm" for v in neu), "Dürüm nicht zugeordnet übernommen"
            assert sum(1 for v in s["verkaeufe"] if v["storniert"] and v.get("ersetzt")) > 0, "Beispiel-Tage nicht ersetzt"
            t = (await text()).lower(); assert "am meisten verkauft" in t and "eingelesen" in t, t[:600]
            await bild("nach_import")

            # ---- Handeingabe für einen Tag
            await tipp('#app [data-a="vk-hand"]')
            await pg.locator('[data-f="vk-hand:bsp-g-1"]').fill("42"); await pg.wait_for_timeout(200)
            await ueberlauf("Handeingabe"); await bild("hand")
            await tipp('#app [data-a="vk-hand-speichern"]'); await pg.wait_for_timeout(400)
            s = await stand(); hand = [v for v in s["verkaeufe"] if v["herkunft"] == "hand" and not v["storniert"] and v["gericht"] == "bsp-g-1" and v["menge"] == 42]
            assert len(hand) == 1, "Handeingabe nicht gespeichert"

            # ---- zurück zum eigenen Laden: kein Einstieg; mit ?verkauf=1 sichtbar, mit ?verkauf=0 wieder weg
            await pg.evaluate(f"(() => {{ const b = document.createElement('button'); b.dataset.a = 'laden-wechseln'; b.dataset.id = '{eigen_id}'; document.querySelector('#app').appendChild(b); b.click(); }})()")
            await pg.wait_for_timeout(700); assert (await stand())["id"] == eigen_id
            await nav_hilfe.ins_buero(pg); await pg.wait_for_timeout(300)
            assert await pg.locator(EINSTIEG).count() == 0, "eigener Laden: Einstieg ohne Schalter"
            await pg.goto(f"http://127.0.0.1:{PORT}/index.html?verkauf=1"); await pg.wait_for_selector("#app .schirm"); await pg.wait_for_timeout(600)
            await nav_hilfe.ins_buero(pg); await pg.wait_for_timeout(300)
            assert await pg.locator(EINSTIEG).count() == 1, "?verkauf=1: Einstieg fehlt"
            await tipp(EINSTIEG); t = await text(); assert "Verkauf je Gericht" in t and "Noch keine Verkäufe" in t, t[:600]
            await ueberlauf("eigener Laden leer"); await bild("eigen_mit_schalter")
            await pg.goto(f"http://127.0.0.1:{PORT}/index.html"); await pg.wait_for_selector("#app .schirm"); await pg.wait_for_timeout(600)
            await nav_hilfe.ins_buero(pg); await pg.wait_for_timeout(300)
            assert await pg.locator(EINSTIEG).count() == 1, "Schalter nicht gemerkt"
            await pg.goto(f"http://127.0.0.1:{PORT}/index.html?verkauf=0"); await pg.wait_for_selector("#app .schirm"); await pg.wait_for_timeout(600)
            await nav_hilfe.ins_buero(pg); await pg.wait_for_timeout(300)
            assert await pg.locator(EINSTIEG).count() == 0, "?verkauf=0 nimmt den Einstieg nicht weg"
            await b.close()
        print("Konsolenfehler:", fehler); assert not fehler, fehler
        print("OK – durchlauf_verkauf:", n, "Bilder in", OUT)
    except Exception:
        traceback.print_exc(); print("Konsolenfehler:", fehler); sys.exit(1)
    finally:
        srv.terminate()


asyncio.run(main())
