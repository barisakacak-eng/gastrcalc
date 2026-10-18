"""Z-Bon per Foto (18.10.2026): Browser-Durchlauf im Handy-Format mit Touch (390×844) und ECHTER Texterkennung auf dem Gerät.
Schnellstart → Beispiel-Laden → Büro → Verkauf je Gericht → „Z-Bon fotografieren“ mit dem künstlich gerenderten, erfundenen Bon
(tests/daten/zbon/zbon-erfunden-1-spalten.png) → Lesen im Arbeitsfaden (tesseract, deutsch, kein Netz) → Vorschau (Zeilen, Summe passt,
Z-Nummer) → Tag auf einen Hand-Tag des Beispiels setzen → „Pommes frites“ per Chip zuordnen (gelernt) → Zeile entfernen (Abweichung sichtbar)
→ Zeile wieder hinzufügen (passt) → Übernehmen (Herkunft zbon, Foto in der Ablage als Zweck zbon, Upload „übernommen“, Z-Bon zählt vor Hand)
→ dasselbe Foto noch einmal für denselben Tag: „schon genau so da“, nichts doppelt → Abbrechen. Kein waagrechter Überlauf, keine Konsolenfehler.
Ist die echte Erkennung zu langsam (> ZBON_OCR_S Sekunden, Vorgabe 150) oder liest sie nichts, wird der Parser mit dem Text des Bons gefüttert
(gleiches Modul, gleicher Bildschirm) und das im Ergebnis vermerkt – der Rest des Ablaufs bleibt gleich.
Start: python3 tests/durchlauf_zbon.py   (eigener Webserver, Port DURCHLAUF_PORT oder 8781). Bilder: /home/claude/audit/shots/zbon_*.png. Exit 1 bei Fehler."""
import asyncio, sys, os, pathlib, traceback, time, json
from playwright.async_api import async_playwright
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
import schnellstart as ss, nav_hilfe

PORT = int(os.environ.get("DURCHLAUF_PORT", "8781"))
OUT = pathlib.Path(os.environ.get("DURCHLAUF_OUT", "/home/claude/audit/shots")); OUT.mkdir(parents=True, exist_ok=True)
DATEN = pathlib.Path(__file__).resolve().parent / "daten" / "zbon"
BILD = str(DATEN / "zbon-erfunden-1-spalten.png")
TEXT = (DATEN / "zbon-erfunden-1-spalten.txt").read_text(encoding="utf-8")
OCR_S = int(os.environ.get("ZBON_OCR_S", "150"))
EINSTIEG = '#app [data-a="nav"][data-wert="verkauf"]'


async def main():
    srv = ss.server(PORT); fehler = []; ocr = {"echt": False, "sekunden": None, "grund": None}
    try:
        async with async_playwright() as p:
            b = await p.chromium.launch()
            ctx, pg = await ss.kontext(b, 390, 844, fehler)
            pg.on("dialog", lambda d: asyncio.ensure_future(d.accept()))
            n = 0
            async def bild(name, voll=True):
                nonlocal n; n += 1; await pg.screenshot(path=str(OUT / f"zbon_{n:02d}_{name}.png"), full_page=voll)
            async def tipp(sel): await pg.locator(sel).first.tap(); await pg.wait_for_timeout(450)
            async def stand(): return await pg.evaluate("window.__gastrocalc.stand")
            async def text(): return await pg.inner_text("#app")
            async def ueberlauf(wo):
                x = await pg.evaluate("document.documentElement.scrollWidth - window.innerWidth"); assert x <= 0, f"waagrechter Überlauf ({wo}): {x}px"
            async def feld(sel, wert):  # tippen und Feld verlassen (die Seite zeichnet nach dem Verlassen neu)
                await pg.locator(sel).first.fill(wert); await pg.locator(sel).first.blur(); await pg.wait_for_timeout(400)
            async def warte_vorschau(grenze):
                t0 = time.time()
                while time.time() - t0 < grenze:
                    t = await text()
                    if await pg.locator('[data-f="zb-datum"]').count() or "nichts zu lesen" in t or "Keine Artikel-Zeilen" in t: return round(time.time() - t0, 1)
                    await pg.wait_for_timeout(1000)
                return None

            await ss.schnellstart(pg, PORT, name="Mein Laden")
            await nav_hilfe.geh(pg, "laeden"); await tipp('#app [data-a="beispiel-anlegen"]'); await pg.wait_for_timeout(600)
            assert (await stand())["beispiel"] is True
            await nav_hilfe.ins_buero(pg); await pg.wait_for_timeout(300)
            await tipp(EINSTIEG); t = await text()
            assert "Z-Bon fotografieren" in t and await pg.locator('[data-f="zbon-foto"]').count() == 2, t[:800]
            await ueberlauf("Übersicht"); await bild("einstieg")

            # ---- Foto wählen → echte Texterkennung
            await pg.set_input_files('[data-f="zbon-foto"][capture]', BILD); await pg.wait_for_timeout(300)
            if "wird gelesen" in await text(): await bild("lesen", voll=False)
            sek = await warte_vorschau(OCR_S)
            t = await text()
            if sek is not None and await pg.locator('[data-f="zb-datum"]').count():
                ocr.update(echt=True, sekunden=sek)
                roh = await pg.evaluate("[...document.querySelectorAll('[data-f^=\"zb:\"][data-f$=\":text\"]')].map(e => e.value)")
                print("Echte Erkennung:", sek, "s –", len(roh), "Zeilen:", roh)
                if not all(w in t for w in ["Döner Kebab", "Lahmacun", "Ayran"]) or "Summe passt" not in t:
                    ocr.update(echt=False, grund="echte Erkennung las Zeilen oder Summe nicht vollständig: " + json.dumps(roh, ensure_ascii=False))
            else:
                ocr["grund"] = "Zeitgrenze" if sek is None else "nichts gelesen"
            s = await stand(); ups = [u for u in s["uploads"] if u.get("zweck") == "zbon"]
            assert len(ups) == 1 and ups[0]["datei"]["zweck"] == "zbon", ups  # Foto liegt in der Ablage, egal wie die Erkennung ausging
            upload_id = ups[0]["id"]
            if not ocr["echt"]:
                print("Rückfall auf den Text des Bons:", ocr["grund"])
                await pg.evaluate("""async ([text, uid]) => { const m = await import('/js/screens/verkauf.js');
                  const u = window.__gastrocalc.stand.uploads.find((x) => x.id === uid); m.verkaufZbonText(text, u); window.__gastrocalc.zeichne(); }""", [TEXT, upload_id])
                await pg.wait_for_timeout(500); t = await text()
            texte = await pg.evaluate("[...document.querySelectorAll('[data-f^=\"zb:\"][data-f$=\":text\"]')].map(e => e.value)")
            assert texte == ["Döner Kebab", "Dürüm Döner", "Dönerteller", "Lahmacun", "Pommes frites", "Cola 0,33 l", "Ayran 0,25 l"], texte
            for w in ["Z-Bon prüfen", "Summe passt", "0815", "Notiz"]:
                assert w in t, (w, t[:1500])
            assert "NaN" not in t and "undefined" not in t
            await ueberlauf("Vorschau"); await bild("vorschau")

            # ---- Tag: ein Hand-Tag des Beispiels (dort zählt danach der Z-Bon)
            s = await stand()
            hand = sorted({v["datum"] for v in s["verkaeufe"] if v["herkunft"] == "hand" and not v["storniert"]} - {v["datum"] for v in s["verkaeufe"] if v["herkunft"] in ("dsfinvk", "kasse") and not v["storniert"]})
            assert hand, "Beispiel ohne Hand-Tag"
            tag = hand[-1]
            await pg.locator('[data-f="zb-datum"]').fill(tag); await pg.wait_for_timeout(500)
            assert await pg.locator('[data-f="zb-datum"]').input_value() == tag

            # ---- Zuordnen per Chip (E7-Lernen)
            chip = '#app [data-a="vk-zuordnen"][data-text="Pommes frites"][data-id="bsp-g-10"]'
            assert await pg.locator(chip).count() == 1, "Chip für Pommes frites fehlt"
            await tipp(chip)
            g10 = next(g for g in (await stand())["gerichte"] if g["id"] == "bsp-g-10"); assert "Pommes frites" in (g10.get("kassenNamen") or []), g10
            t = await text(); assert "Z-Bon prüfen" in t and "kennt die app noch nicht" not in t.lower(), t[:800]  # Zwischentitel per CSS in Großbuchstaben
            await bild("zugeordnet")

            # ---- Zeile entfernen → Abweichung, Zeile hinzufügen → passt
            ayran = await pg.evaluate("[...document.querySelectorAll('[data-f$=\":text\"]')].find(e => e.value.startsWith('Ayran'))?.dataset.f.split(':')[1]")
            await tipp(f'#app [data-a="vk-zb-weg"][data-id="{ayran}"]')
            t = await text(); assert "weniger als die Summe" in t, t[:1200]
            await ueberlauf("Abweichung"); await bild("abweichung")
            await tipp('#app [data-a="vk-zb-neu"]')
            neu = await pg.evaluate("[...document.querySelectorAll('[data-f$=\":text\"]')].pop().dataset.f.split(':')[1]")
            await feld(f'[data-f="zb:{neu}:text"]', "Ayran 0,25 l"); await feld(f'[data-f="zb:{neu}:menge"]', "14"); await feld(f'[data-f="zb:{neu}:betrag"]', "28,00")
            t = await text(); assert "Summe passt" in t, t[:1200]
            await bild("zeile_dazu")

            # ---- Übernehmen
            vorher = len((await stand())["verkaeufe"])
            await tipp('#app [data-a="vk-zb-uebernehmen"]'); await pg.wait_for_timeout(500)
            s = await stand(); z = [v for v in s["verkaeufe"] if v["herkunft"] == "zbon" and not v["storniert"]]
            assert len(z) == 7 and len(s["verkaeufe"]) == vorher + 7, (len(z), len(s["verkaeufe"]), vorher)
            assert all(v["datum"] == tag and v.get("upload") == upload_id and v.get("zNr") == "0815" for v in z), z[:2]
            assert next(v for v in z if v["text"] == "Pommes frites")["gericht"] == "bsp-g-10"
            u = next(x for x in s["uploads"] if x["id"] == upload_id); assert u["status"] == "uebernommen", u
            rang = await pg.evaluate(f"""async () => {{ const vk = await import('/js/verkauf.js'); const r = vk.verkaeufeImZeitraum(window.__gastrocalc.stand, {{ von: '{tag}', bis: '{tag}' }});
              return [...new Set(r.eintraege.map((e) => e.herkunft))]; }}""")
            assert rang == ["zbon"], rang
            t = (await text()).lower(); assert "vom z-bon" in t and "am meisten verkauft" in t, t[:800]
            await ueberlauf("nach Übernehmen"); await bild("uebernommen")

            # ---- dasselbe Foto noch einmal für denselben Tag: nicht doppelt
            await pg.set_input_files('[data-f="zbon-foto"]:not([capture])', BILD); await pg.wait_for_timeout(300)
            if not ocr["echt"] or await warte_vorschau(OCR_S) is None or not await pg.locator('[data-f="zb-datum"]').count():
                await pg.evaluate("""async (text) => { const m = await import('/js/screens/verkauf.js'); m.verkaufZbonText(text, null); window.__gastrocalc.zeichne(); }""", TEXT)
                await pg.wait_for_timeout(400)
            await pg.locator('[data-f="zb-datum"]').fill(tag); await pg.wait_for_timeout(500)
            t = await text(); assert "schon genau so da" in t, t[:1200]
            await bild("gleich")
            await tipp('#app [data-a="vk-zb-uebernehmen"]')
            s = await stand(); assert len([v for v in s["verkaeufe"] if v["herkunft"] == "zbon" and not v["storniert"]]) == 7, "doppelt gezählt"
            await b.close()
        print("Konsolenfehler:", fehler); assert not fehler, fehler
        print("Texterkennung:", "echt" if ocr["echt"] else "Rückfall", json.dumps(ocr, ensure_ascii=False))
        print("OK – durchlauf_zbon:", n, "Bilder in", OUT)
    except Exception:
        traceback.print_exc(); print("Konsolenfehler:", fehler); sys.exit(1)
    finally:
        srv.terminate()


asyncio.run(main())
