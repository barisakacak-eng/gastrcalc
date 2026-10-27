"""17.10.2026 Fehler F1/F2: Wirt ohne Kartenfoto, im Handy-Format mit Touch (390×844, dann 360×780).
Schnellstart Döner, Karte „Später“ → Büro „Rezepte“ öffnet die Gerichte-Auswahl (F1, vorher leere Seite mit „Übernehmen“) →
Inventur ohne Waren zeigt „Karte anlegen“ (F2, vorher leere Liste) → Vorlagen wählen und übernehmen → Rezepte mit Startwerten →
Müll-Raster, Vergleich, Einrichtung zeigen die Gerichte → Inventur zählen (+, ½, große Karte), Pause, Neuladen, abschließen.
Start: python3 tests/durchlauf_vorlagen.py   (eigener Webserver, Port DURCHLAUF_PORT oder 8771). Exit 1 bei Fehler."""
import asyncio, sys, os, pathlib, traceback
from playwright.async_api import async_playwright
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
import schnellstart as ss, nav_hilfe

PORT = int(os.environ.get("DURCHLAUF_PORT", "8771"))
OUT = pathlib.Path(os.environ.get("DURCHLAUF_OUT", "/home/claude/pdfbuild/vorlagen-check")); OUT.mkdir(parents=True, exist_ok=True)
GERICHTE = ["Döner Kebab", "Dürüm Döner", "Pommes frites (Beilage)", "Cola 0,33 l"]


async def main():
    srv = ss.server(PORT); fehler = []
    try:
        async with async_playwright() as p:
            b = await p.chromium.launch()
            ctx, pg = await ss.kontext(b, 390, 844, fehler)
            fragen = []
            pg.on("dialog", lambda d: (fragen.append(d.message), asyncio.ensure_future(d.accept())))
            n = 0
            async def bild(name, voll=False):
                nonlocal n; n += 1; await pg.screenshot(path=str(OUT / f"{n:02d}_{name}.png"), full_page=voll)
            async def tipp(sel): await pg.locator(sel).first.tap(); await pg.wait_for_timeout(300)
            async def stand(): return await pg.evaluate("window.__gastrocalc.stand")
            async def schritt(): return await pg.evaluate("window.__gastrocalc.stand.phase + '/' + (window.__gastrocalc.stand.phase === 'onboarding' ? window.__gastrocalc.stand.schrittId : '')")
            async def ueberlauf(): return await pg.evaluate("document.documentElement.scrollWidth - window.innerWidth")
            plus = lambda name: f'.inv-posten[data-name="{name}"] [data-a="inv-d"][data-d="1"]'
            teil = lambda name, t: f'.inv-posten[data-name="{name}"] [data-a="inv-t"][data-t="{t}"]'

            await ss.schnellstart(pg, PORT)
            assert not (await stand())["gerichte"], "Schnellstart ohne Karte darf keine Gerichte haben"

            # ---- F1: Büro → „Rezepte“ ohne Gerichte öffnet die Gerichte-Auswahl mit Vorlagen (vorher: leere Seite, „Übernehmen“ ohne Wirkung)
            await nav_hilfe.ins_buero(pg); await tipp('#app [data-a="bearbeiten"][data-schritt="rezepte"]')
            assert await schritt() == "onboarding/karte", await schritt()
            vorlagen = await pg.eval_on_selector_all('[data-a="vorlage"]', "els => els.map(e => e.dataset.name)")
            assert "Döner Kebab" in vorlagen and len(vorlagen) >= 20, vorlagen[:10]
            await bild("f1_rezepte_fuehrt_zur_auswahl")
            await tipp('[data-a="zurueck"]')  # ohne Wahl zurück ins Büro, nichts angelegt
            assert (await schritt()).startswith("app/") and not (await stand())["gerichte"]

            # ---- F2: Inventur ohne Waren erklärt und führt zur Karte (vorher: leere Liste, „Fertig“ gesperrt)
            await nav_hilfe.geh(pg, "inventur"); await pg.wait_for_selector('[data-a="inv-start"]')
            text = await pg.inner_text("#app")
            assert "Noch keine Waren" in text, text[:300]
            assert await pg.locator('#app [data-a="bearbeiten"][data-schritt="karte"]').count() == 1, "Knopf „Karte anlegen“ fehlt"
            assert await pg.locator('#app [data-a="nav"][data-wert="beleg"]').count() == 1, "Knopf „Belege einlesen“ fehlt"
            await bild("f2_inventur_leer", True)
            await tipp('#app [data-a="bearbeiten"][data-schritt="karte"]')
            assert await schritt() == "onboarding/karte", await schritt()

            # ---- Vorlagen übernehmen (Touch)
            for g in GERICHTE: await tipp(f'[data-a="vorlage"][data-name="{g}"]')
            assert sorted(x["name"] for x in (await stand())["gerichte"]) == sorted(GERICHTE)
            await tipp('.fuss [data-a="weiter"]')
            assert await schritt() == "onboarding/rezepte", await schritt()
            zeilen = await pg.eval_on_selector_all('[data-a="rezept-auf"]', "els => els.map(e => e.innerText)")
            assert len(zeilen) == 4 and all("Startwert" in z for z in zeilen if "Cola" not in z), zeilen
            await bild("f1_rezepte_startwerte")
            await tipp('.fuss [data-a="weiter"]')  # „Übernehmen“ → zurück zur Inventur
            assert (await schritt()).startswith("app/"), await schritt()
            s = await stand()
            for g in s["gerichte"]:
                assert g["vorlage"] and g["zutaten"] and all(z["menge"] > 0 for z in g["zutaten"]), g
                assert g["klasse"] == "getraenk" or g.get("rezeptFamilie"), g
            assert any(a["name"] == "Cola 0,33 l" for a in s["artikel"]) and not any(a["name"] == "Cola 0,2 l" for a in s["artikel"]), [a["name"] for a in s["artikel"]]
            assert "Noch keine Waren" not in await pg.inner_text("#app")

            # ---- Müll-Raster, Vergleich, Einrichtung zeigen die Gerichte
            await nav_hilfe.geh(pg, "muell"); await pg.click('[data-a="muell-grund"][data-wert="bruch"]'); await pg.wait_for_timeout(300); text = await pg.inner_text("#app")  # 27.10.2026: Gerichte unter „Ganze Gerichte“; await bild("muell")
            assert "Döner Kebab" in text and "Dürüm Döner" in text, text[:400]
            await nav_hilfe.geh(pg, "vergleich"); text = await pg.inner_text("#app")
            assert "Döner Kebab" in text and "Verkaufspreis fehlt" in text, text[:400]
            await nav_hilfe.ins_buero(pg); text = await pg.inner_text("#app")
            assert "Einrichtung 0 %" not in text, text[:300]
            # Büro → Rezepte mit Gerichten: wieder der normale Rezepte-Schritt
            await tipp('#app [data-a="bearbeiten"][data-schritt="rezepte"]'); assert await schritt() == "onboarding/rezepte", await schritt()
            await tipp('[data-a="zurueck"]')

            # ---- Inventur zählen, Pause, Neuladen, abschließen
            await nav_hilfe.geh(pg, "inventur"); await tipp('[data-a="inv-start"]'); await pg.wait_for_selector(".inv-posten")
            namen = await pg.eval_on_selector_all(".inv-posten", "els => els.map(e => e.dataset.name)")
            for w in ["Dönerspieß Kalb/Pute", "Dürüm-Wrap", "Pommes frites", "Cola 0,33 l", "Dönertüte"]: assert w in namen, (w, namen)
            assert "Cola 0,2 l" not in namen, namen
            await tipp(plus("Dönerspieß Kalb/Pute")); await tipp(plus("Dönerspieß Kalb/Pute")); await tipp(teil("Dönerspieß Kalb/Pute", "0.5"))
            await tipp(plus("Cola 0,33 l"))
            await tipp('.inv-posten[data-name="Pommes frites"] [data-a="inv-karte"]'); await pg.wait_for_selector(".inv-karte")
            await tipp('[data-a="inv-k-d"][data-d="1"]'); await tipp('[data-a="inv-k-t"][data-t="0.75"]'); await bild("inventur_karte")
            await tipp('[data-a="inv-weiter"]'); await tipp('[data-a="inv-liste"]'); await pg.wait_for_selector(".inv-posten")
            po = (await stand())["inventuren"][0]["posten"]
            assert po["Dönerspieß Kalb/Pute"] == 2.5 and po["Cola 0,33 l"] == 1 and po["Pommes frites"] == 1.75, po
            await bild("inventur_liste")
            await tipp('[data-a="inv-pause"]'); await pg.wait_for_timeout(500)
            await pg.reload(); await pg.wait_for_selector('[data-a="menue-auf"], .ebene-kopf'); await pg.wait_for_timeout(400)
            await nav_hilfe.geh(pg, "inventur"); await pg.wait_for_selector(".inv-posten")
            assert (await stand())["inventuren"][0]["posten"]["Pommes frites"] == 1.75, "Pause/Neuladen hat Zählung verloren"

            # 360×780: Liste ohne waagrechten Überlauf, Knöpfe tippbar
            await pg.set_viewport_size({"width": 360, "height": 780}); await pg.wait_for_timeout(200)
            assert await ueberlauf() <= 0, "waagrechter Überlauf bei 360"
            await tipp(plus("Dönertüte")); assert (await stand())["inventuren"][0]["posten"]["Dönertüte"] == 1
            await bild("inventur_360")
            await tipp('[data-a="inv-fertig"]'); await pg.wait_for_selector(".inv-ergebnis")
            assert fragen and "noch nicht gezählt" in fragen[-1], fragen
            text = await pg.inner_text(".inv-ergebnis")
            assert "Deine erste Inventur" in text and "Einkaufspreis" in text, text[:400]
            await bild("inventur_ergebnis", True)
            s = await stand(); assert s["inventuren"][0]["abgeschlossen"], "Inventur nicht abgeschlossen"

            print("Konsolenfehler:", fehler); assert not fehler, fehler
            print("Durchlauf Vorlagen ok ·", n, "Bilder in", OUT)
            await ctx.close(); await b.close()
        return 0
    except Exception:
        traceback.print_exc(); return 1
    finally:
        srv.terminate()

sys.exit(asyncio.run(main()))
