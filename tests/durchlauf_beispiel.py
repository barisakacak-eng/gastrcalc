"""Beispiel-Laden (17.10.2026): Browser-Durchlauf im Handy-Format mit Touch (390×844).
Schnellstart (eigener Laden) → Büro → Läden → „Beispiel-Laden anlegen“ → Heute zeigt Zahl und „Beispiel-Döner“ → Müll-Raster → Kühlung
mit Monatsblatt (Rundgang-Historie) → Putzen → Karte → Büro-Chip → Ordner Gesundheitsamt mit Einträgen und BEISPIEL im Druck → Vergleich →
Inventur → zurück zum eigenen Laden (unverändert) → Knopf öffnet denselben Beispiel-Laden → „Beispiel-Laden löschen“ → eigener Laden aktiv, unverändert.
Start: python3 tests/durchlauf_beispiel.py   (eigener Webserver, Port DURCHLAUF_PORT oder 8773). Bilder: /home/claude/audit/shots/bsp_*.png. Exit 1 bei Fehler."""
import asyncio, sys, os, pathlib, traceback, json
from playwright.async_api import async_playwright
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
import schnellstart as ss, nav_hilfe

PORT = int(os.environ.get("DURCHLAUF_PORT", "8773"))
OUT = pathlib.Path(os.environ.get("DURCHLAUF_OUT", "/home/claude/audit/shots")); OUT.mkdir(parents=True, exist_ok=True)
# Metadaten, die beim Speichern des aktiven Ladens gestempelt werden (kein Inhalt)
EIGEN_JS = "(() => { const b = window.__gastrocalc.wurzel.betriebe.find((x) => !x.beispiel); const { geaendert, stammZeit, abgleich, ...rest } = b; return JSON.stringify(rest); })()"


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
                nonlocal n; n += 1; await pg.screenshot(path=str(OUT / f"bsp_{n:02d}_{name}.png"), full_page=voll)
            async def tipp(sel): await pg.locator(sel).first.tap(); await pg.wait_for_timeout(450)
            async def stand(): return await pg.evaluate("window.__gastrocalc.stand")
            async def text(): return await pg.inner_text("#app")
            async def ueberlauf(): return await pg.evaluate("document.documentElement.scrollWidth - window.innerWidth")

            await ss.schnellstart(pg, PORT, name="Mein Laden")
            eigen_id = (await stand())["id"]
            eigen_vorher = await pg.evaluate(EIGEN_JS)

            # ---- Büro → Läden → Beispiel-Laden anlegen
            await nav_hilfe.geh(pg, "laeden"); t = await text()
            assert "Beispiel-Laden anlegen" in t and "Dein Laden bleibt unberührt" in t, t[-400:]
            await bild("laeden_vorher", True)
            await tipp('#app [data-a="beispiel-anlegen"]'); await pg.wait_for_timeout(600)
            s = await stand(); w = await pg.evaluate("window.__gastrocalc.wurzel")
            assert s["beispiel"] is True and s["id"] != eigen_id and len(w["betriebe"]) == 2, (s.get("beispiel"), len(w["betriebe"]))
            assert s["betrieb"]["name"] == "Beispiel-Döner", s["betrieb"]["name"]
            t = await text(); assert "Beispiel – alle Zahlen erfunden" in t, t[:400]  # Hinweis-Chip im Büro
            await bild("buero_chip")
            assert await pg.evaluate(EIGEN_JS) == eigen_vorher, "eigener Laden verändert (Anlegen)"

            # ---- Laden: Heute mit Zahl und Kennzeichnung
            await nav_hilfe.geh(pg, "start"); t = await text()
            assert "Beispiel-Döner" in t and "€" in t, t[:400]
            assert await ueberlauf() <= 0, "waagrechter Überlauf (Heute)"
            await bild("heute")
            # Name folgt der Sprache (17.10.2026): kurz auf Türkisch und zurück
            async def sprache(c):
                await pg.evaluate("c => { const b = document.createElement('button'); b.dataset.a = 'sprache'; b.dataset.wert = c; document.querySelector('#app').appendChild(b); b.click(); }", c)
                await pg.wait_for_timeout(900)
            await sprache("tr"); t = await text(); assert "Örnek Döner" in t, t[:300]
            await sprache("de"); t = await text(); assert "Beispiel-Döner" in t, t[:300]
            # Müll-Raster mit den Gerichten
            await nav_hilfe.geh(pg, "muell"); await pg.click('[data-a="muell-grund"][data-wert="bruch"]'); await pg.wait_for_timeout(300); t = await text()  # 27.10.2026: Gerichte unter „Ganze Gerichte“
            assert "Döner Kebab" in t and "Dürüm Döner" in t, t[:400]
            await bild("muell")
            # Kühlung: vier Stellen mit letzter Messung, Monatsblatt = Rundgang-Historie
            await nav_hilfe.geh(pg, "kuehl"); t = await text()
            for k in ["Kühlschrank", "Kühlschrank 2", "Tiefkühler", "Saladette"]: assert k in t, (k, t[:500])
            assert "°C" in t, t[:500]
            await bild("kuehl", True)
            await nav_hilfe.ins_buero(pg); await tipp('#app [data-a="nav"][data-wert="kuehl"]')  # Laden-Umbau (20.10.2026): Monatsblatt wohnt im Büro
            await tipp('#app [data-a="kuehl-blatt"]'); t = await text()
            assert "°C" in t or "9,4" in t, t[:500]
            await bild("kuehl_blatt", True)
            # Putzen
            await nav_hilfe.geh(pg, "putzplan"); t = await text()
            assert (await stand())["putzplan"]["aktiv"] and len((await stand())["putzlog"]) > 100
            await bild("putzen")
            # Karte mit Preisen
            await nav_hilfe.geh(pg, "karte"); t = await text()
            assert "Döner Kebab" in t and "8,00" in t, t[:500]
            await bild("karte")

            # ---- Büro: Ordner Gesundheitsamt, Vorschau mit BEISPIEL
            await nav_hilfe.geh(pg, "ordner-amt"); t = await text()
            assert "Kühl" in t, t[:500]
            await bild("ordner_amt", True)
            await tipp('#app [data-a="ordner-vorschau"]'); await pg.wait_for_timeout(400)
            html = await pg.evaluate("(() => { const f = document.querySelector('#app iframe'); return f ? (f.srcdoc || '') : document.querySelector('#app').innerHTML; })()")
            assert "BEISPIEL – keine echten Daten" in html, html[:300]
            assert "Kühlschrank 2" in html and "9,4" in html, "Abweichung fehlt im Kühlprotokoll"
            await bild("ordner_amt_vorschau")
            if await pg.locator('#app [data-a="ordner-vorschau-zu"]').count(): await tipp('#app [data-a="ordner-vorschau-zu"]')
            # Vergleich
            await nav_hilfe.geh(pg, "vergleich"); t = await text()
            assert "Döner Kebab" in t and "%" in t, t[:500]
            await bild("vergleich", True)
            # Inventur: zwei fertige Inventuren, Wert in Euro
            await nav_hilfe.geh(pg, "inventur"); t = await text()
            assert "€" in t, t[:500]
            await bild("inventur", True)
            assert await pg.evaluate(EIGEN_JS) == eigen_vorher, "eigener Laden verändert (Bedienen)"

            # ---- zurück zum eigenen Laden
            await nav_hilfe.geh(pg, "laeden")
            await tipp(f'#app [data-a="laden-wechseln"][data-id="{eigen_id}"]'); await pg.wait_for_timeout(500)
            assert (await stand())["id"] == eigen_id, "nicht zurück im eigenen Laden"
            assert "Beispiel – alle Zahlen erfunden" not in await text()
            await bild("eigener_laden")
            assert await pg.evaluate(EIGEN_JS) == eigen_vorher, "eigener Laden verändert (Wechsel)"
            # Knopf öffnet den vorhandenen Beispiel-Laden (kein zweiter)
            await nav_hilfe.geh(pg, "laeden"); await tipp('#app [data-a="beispiel-anlegen"]'); await pg.wait_for_timeout(500)
            w = await pg.evaluate("window.__gastrocalc.wurzel")
            assert len(w["betriebe"]) == 2 and (await stand())["beispiel"] is True, len(w["betriebe"])

            # ---- Beispiel löschen (Rückfrage wird bestätigt)
            await nav_hilfe.geh(pg, "laeden"); t = await text(); assert "Beispiel-Laden löschen" in t, t[-300:]
            await bild("laeden_beispiel", True)
            await tipp('#app [data-a="beispiel-loeschen"]'); await pg.wait_for_timeout(600)
            assert fragen and "Beispiel-Döner" in fragen[-1], fragen
            w = await pg.evaluate("window.__gastrocalc.wurzel")
            assert len(w["betriebe"]) == 1 and w["aktiv"] == eigen_id and not any(x.get("beispiel") for x in w["betriebe"]), (len(w["betriebe"]), w["aktiv"])
            assert await pg.evaluate(EIGEN_JS) == eigen_vorher, "eigener Laden verändert (Löschen)"
            await pg.reload(); await pg.wait_for_selector(".ebene-kopf"); await pg.wait_for_timeout(500)
            w = await pg.evaluate("window.__gastrocalc.wurzel")
            assert len(w["betriebe"]) == 1 and w["betriebe"][0]["id"] == eigen_id, "nach Neuladen nicht gelöscht"
            await bild("nach_loeschen")

            print("Konsolenfehler:", fehler); assert not fehler, fehler
            print("Durchlauf Beispiel-Laden ok ·", n, "Bilder in", OUT)
            await ctx.close(); await b.close()
        return 0
    except Exception:
        traceback.print_exc(); return 1
    finally:
        srv.terminate()

sys.exit(asyncio.run(main()))
