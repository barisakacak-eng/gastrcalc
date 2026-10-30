"""Richtpreise (17.10.2026): Browser-Gegenprobe im Handy-Format (390×844, Touch).
Schnellstart Döner ohne Karte → Vorlagen übernehmen (Döner-Gerichte) → Verkaufspreis Döner Kebab → Büro Einkaufspreise →
Fladen und Knoblauchsauce „doch kaufen“, Eisbergsalat als eigener Preis (hat keinen Richtpreis) → „Richtpreise einsetzen“ → Liste zeigt ≈ und „Richtpreis“ →
Cockpit zeigt ≈-Zahl und die Zeile „Richtwert · Preise eintragen ›“ (Quote aus der Karte mit Richtpreisen) →
Gerichte im Vergleich zeigt den Wareneinsatz mit ≈ → Inventur zeigt einen Wert mit ≈ → „Richtpreise wieder entfernen“.
Start: python3 tests/durchlauf_richtpreise.py   (eigener Webserver, Port DURCHLAUF_PORT oder 8773). Exit 1 bei Fehler.
Bilder: /home/claude/audit/shots/rp_*.png (DURCHLAUF_OUT setzt den Ordner)."""
import asyncio, sys, os, pathlib, traceback
from playwright.async_api import async_playwright
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
import schnellstart as ss, nav_hilfe

PORT = int(os.environ.get("DURCHLAUF_PORT", "8773"))
OUT = pathlib.Path(os.environ.get("DURCHLAUF_OUT", "/home/claude/audit/shots")); OUT.mkdir(parents=True, exist_ok=True)
GERICHTE = ["Döner Kebab", "Dürüm Döner", "Pommes frites (Beilage)", "Cola 0,33 l"]


async def main():
    srv = ss.server(PORT); fehler = []
    try:
        async with async_playwright() as p:
            b = await p.chromium.launch()
            ctx, pg = await ss.kontext(b, 390, 844, fehler)
            meldungen = []
            n = 0
            async def bild(name, voll=False):
                nonlocal n; n += 1; await pg.screenshot(path=str(OUT / f"rp_{n:02d}_{name}.png"), full_page=voll)
            async def tipp(sel): await pg.locator(sel).first.tap(); await pg.wait_for_timeout(300)
            async def stand(): return await pg.evaluate("window.__gastrocalc.stand")
            async def schritt(): return await pg.evaluate("window.__gastrocalc.stand.phase + '/' + (window.__gastrocalc.stand.phase === 'onboarding' ? window.__gastrocalc.stand.schrittId : '')")
            async def meldung(): return await pg.evaluate("document.querySelector('.meldung')?.textContent || ''")
            async def zaehler(): return await pg.evaluate("import('./js/zaehler.js').then(m => { const z = m.zaehler(window.__gastrocalc.stand); return { quelle: z.quoteQuelle, rp: z.quoteRichtpreis, geschaetzt: z.geschaetzt }; })")

            await ss.schnellstart(pg, PORT)
            assert not (await stand())["gerichte"], "Schnellstart ohne Karte darf keine Gerichte haben"

            # ---- Vorlagen übernehmen (Büro → Rezepte → Gerichte-Auswahl)
            await nav_hilfe.ins_buero(pg); await tipp('#app [data-a="bearbeiten"][data-schritt="rezepte"]')
            assert await schritt() == "onboarding/karte", await schritt()
            for g in GERICHTE: await tipp(f'[data-a="vorlage"][data-name="{g}"]')
            await tipp('.fuss [data-a="weiter"]'); assert await schritt() == "onboarding/rezepte", await schritt()
            await tipp('.fuss [data-a="weiter"]'); assert (await schritt()).startswith("app/"), await schritt()

            # ---- Verkaufspreis für den Döner (sonst gibt es keinen Vergleich und keine Quote aus der Karte)
            await nav_hilfe.ins_buero(pg); await tipp('#app [data-a="bearbeiten"][data-schritt="verkauf"]')
            assert await schritt() == "onboarding/verkauf", await schritt()
            gid = next(g["id"] for g in (await stand())["gerichte"] if g["name"] == "Döner Kebab")
            feld = pg.locator(f'[data-f="preis:{gid}"]'); await feld.fill("7,50"); await feld.blur(); await pg.wait_for_timeout(200)
            await tipp('[data-a="zurueck"]'); assert (await schritt()).startswith("app/"), await schritt()
            assert next(g for g in (await stand())["gerichte"] if g["name"] == "Döner Kebab")["preis"] == 7.5

            # ---- Büro → Einkaufspreise: Knopf und Satz da, Eisbergsalat als eigener Preis
            await nav_hilfe.ins_buero(pg); await tipp('#app [data-a="bearbeiten"][data-schritt="preise"]')
            assert await schritt() == "onboarding/preise", await schritt()
            text = await pg.inner_text("#app")
            assert "Richtpreise einsetzen" in text and "Deine eigenen Preise bleiben." in text, text[:600]
            assert await pg.locator('[data-a="richtpreise-weg"]').count() == 0, "Entfernen nur, wenn Richtpreise aktiv sind"
            # Schnellstart Döner macht Fladen und Knoblauchsauce „selbst“ – deren Rohstoffe (Mehl, Hefe, Joghurt …) haben keinen Richtpreis.
            # Der Wirt stellt beide auf „doch kaufen“, dann greifen die Richtpreise für Fladen und Sauce.
            # 20.10.2026: Bilderwand – Filter „Alle“, Kachel antippen öffnet das Blatt, „Fertig“ schließt es („Mehr“ klappt die Testhilfe auf)
            await tipp('[data-a="ep-filter"][data-wert="alle"]')
            async def blatt(name):
                if await pg.locator('.fuss [data-a="ep-zu"]').count(): await tipp('.fuss [data-a="ep-zu"]')
                await tipp(f'.ep-kachel[data-name="{name}"]'); assert await pg.locator(f'.ep-blatt[aria-label="{name}"]').count() == 1, name
            async def zu(): await tipp('.fuss [data-a="ep-zu"]'); assert await pg.locator(".ep-blatt").count() == 0
            for name in ["Dönerbrot / Fladen", "Knoblauchsauce"]: await blatt(name); await tipp(f'[data-a="selbst-aus"][data-name="{name}"]'); await zu()
            await blatt("Eisbergsalat")
            await pg.fill('[data-f="packung:Eisbergsalat"]', "10")
            f = pg.locator('[data-f="preis:Eisbergsalat"]'); await f.fill("13,50"); await f.blur(); await pg.wait_for_timeout(200)
            await zu()
            z0 = await zaehler(); assert z0["quelle"] == "richtwert", z0  # ohne Richtpreise fehlt dem Döner noch fast alles
            await bild("preise_vorher")

            await tipp('[data-a="richtpreise-ein"]')
            m = await meldung(); meldungen.append(m)
            assert "Preise eingesetzt" in m and "ohne Richtpreis" in m, m
            s = await stand()
            eis = next(a for a in s["artikel"] if a["name"] == "Eisbergsalat")
            assert eis["preis"] == 13.5 and eis["status"] == "bekannt" and "richtpreis" not in eis, eis
            d = next(a for a in s["artikel"] if a["name"] == "Dönerspieß Kalb/Pute")
            assert d["status"] == "richtpreis" and d["preis"] == 15.62 and d["packung"] == {"menge": 1, "einheit": "kg"}, d
            await tipp('[data-a="ep-filter"][data-wert="alle"]')
            assert await pg.locator('.ep-kachel[data-name="Dönerspieß Kalb/Pute"] .ep-marke.ca').count() == 1, "Kachel mit Richtpreis ohne ≈"
            assert await pg.locator('.ep-kachel[data-name="Eisbergsalat"] .ep-marke.ca').count() == 0, "eigener Preis: Kachel ohne ≈"
            await blatt("Dönerspieß Kalb/Pute")
            zeile = await pg.inner_text('.ep-blatt')
            assert "≈" in zeile and "Richtpreis" in zeile, zeile
            assert await pg.locator('.ep-blatt .ep-kopf .marke.geschaetzt').count() == 1
            await blatt("Eisbergsalat")
            assert "≈" not in await pg.inner_text('.ep-blatt'), "eigener Preis ohne ≈"
            await zu()
            assert await pg.locator('[data-a="richtpreise-weg"]').count() == 1
            await tipp('[data-a="richtpreise-quelle"]'); assert "17.10.2026" in await pg.inner_text("#app")
            await bild("preise_nachher", True)
            await tipp('[data-a="zurueck"]'); assert (await schritt()).startswith("app/"), await schritt()

            # ---- Cockpit (Laden „Heute“): ≈-Zahl und Richtwert-Zeile, Quote aus der Karte mit Richtpreisen
            z1 = await zaehler(); assert z1["quelle"] == "karte" and z1["rp"] and z1["geschaetzt"], z1
            # Welle 0 (28.10.2026): ohne Miete zeigt „Heute“ „?“ und „Miete eintragen“ – für die ≈-Zahl braucht der Laden feste Kosten
            await pg.evaluate("import('./js/stamm.js').then(m => { const s = window.__gastrocalc.stand; m.kostenBetragSetzen(s, 'miete', 'miete', 1500); s.team.personen = 0; window.__gastrocalc.zeichne(); })")
            await nav_hilfe.geh(pg, "start"); await pg.wait_for_selector(".h-ziel")
            riesig = await pg.inner_text(".h-riesig"); assert riesig.startswith("≈"), riesig
            assert await pg.locator(".h-richtwert").count() == 0, "Laden-Umbau (20.10.2026): Richtwert-Zeile wohnt im Büro, nicht im Laden"
            await bild("cockpit")

            # ---- Gerichte im Vergleich: Wareneinsatz mit ≈
            await nav_hilfe.geh(pg, "vergleich"); text = await pg.inner_text("#app")
            karte = await pg.inner_text('.vergleichkarte:has-text("Döner Kebab")')
            assert "Wareneinsatz" in karte and "≈" in karte, karte
            await bild("vergleich")

            # ---- Inventur: Wert mit ≈
            await nav_hilfe.geh(pg, "inventur"); await tipp('[data-a="inv-start"]'); await pg.wait_for_selector(".inv-posten")
            plus = '.inv-posten[data-name="Dönerspieß Kalb/Pute"] [data-a="inv-d"][data-d="1"]'
            await tipp(plus); await tipp(plus)
            posten = await pg.inner_text('.inv-posten[data-name="Dönerspieß Kalb/Pute"]'); assert "≈" in posten and "31,24" in posten, posten
            summe = await pg.inner_text(".inv-summe"); assert "≈" in summe and "31" in summe, summe
            await bild("inventur")
            await tipp('[data-a="inv-pause"]')

            # ---- Richtpreise wieder entfernen: eigener Preis bleibt
            await nav_hilfe.ins_buero(pg); await tipp('#app [data-a="bearbeiten"][data-schritt="preise"]')
            await tipp('[data-a="richtpreise-weg"]'); m = await meldung(); meldungen.append(m); assert "Richtpreise entfernt" in m, m
            s = await stand()
            assert not any(a.get("status") == "richtpreis" for a in s["artikel"]), [a["name"] for a in s["artikel"] if a.get("status") == "richtpreis"]
            assert next(a for a in s["artikel"] if a["name"] == "Eisbergsalat")["preis"] == 13.5
            await bild("preise_entfernt")

            print("Meldungen:", meldungen)
            print("Konsolenfehler:", fehler); assert not fehler, fehler
            print("Durchlauf Richtpreise ok ·", n, "Bilder in", OUT)
            await ctx.close(); await b.close()
        return 0
    except Exception:
        traceback.print_exc(); return 1
    finally:
        srv.terminate()

sys.exit(asyncio.run(main()))
