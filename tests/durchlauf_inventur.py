"""Durchlauf Inventur (Punkt 3) im Handy-Format: Laden anlegen (direkt im Stand), Inventur über das Menü öffnen, in der Liste zählen (A1),
eine Ware groß öffnen (A2) mit ¼, Pause und Neuladen, abschließen (erste Inventur), dann Beleg und Umsatz dazu, zweite Inventur,
Ergebnis A–E prüfen (Texte und Zahlen), Türkisch und 360 px, keine Konsolenfehler. Bilder nach /home/claude/pdfbuild/inventur-check/.
Start: python3 tests/durchlauf_inventur.py  (startet selbst einen kleinen Webserver, Port DURCHLAUF_PORT oder 8767)"""
import asyncio, subprocess, sys, time, pathlib, os
from playwright.async_api import async_playwright
import nav_hilfe  # Wege durch die drei Ebenen

APP = pathlib.Path(__file__).resolve().parent.parent
OUT = pathlib.Path(os.environ.get("DURCHLAUF_OUT", "/home/claude/pdfbuild/inventur-check")); OUT.mkdir(parents=True, exist_ok=True)
PORT = int(os.environ.get("DURCHLAUF_PORT", "8767"))

# Ein kleiner Dönerladen: Preise je Packung netto, Gebinde wie eingekauft, zwei Gerichte mit Rezept
LADEN = """(async () => {
  const g = window.__gastrocalc; const s = g.stand;
  const A = (name, gruppe, einheit, menge, art, preis) => ({ name, gruppe, einheit, packung: { menge, einheit }, gebinde: { art, zwischen: null }, preis, preisBasis: "netto", preisHistorie: [], status: preis === null ? "offen" : "bekannt" });
  s.betrieb.name = "Döner Baris"; s.betrieb.format = "imbiss"; s.betrieb.kuechen = ["doener"]; s.betrieb.steuerSatz = 0.07;
  s.artikel = [A("Dönerspieß Kalb/Pute", "fleisch", "kg", 15, "packung", 96), A("Tomaten", "gemuese", "kg", 6, "kiste", 11.9), A("Eisbergsalat", "gemuese", "kg", 10, "kiste", 13.5),
    A("Zwiebeln", "gemuese", "kg", 10, "sack", 8.9), A("Dönerbrot / Fladen", "teig", "stk", 30, "karton", 13.5), A("Pommes frites", "teig", "kg", 10, "karton", 19.8),
    A("Knoblauchsauce", "sauce", "kg", 5, "eimer", null), A("Sonnenblumenöl", "gewuerz", "l", 10, "kanister", 21), A("Dönertüte", "verpackung", "stk", 1000, "karton", 40),
    A("Alufolie-Bogen", "verpackung", "stk", 500, "packung", 9.9), A("Müllbeutel", "verpackung", "stk", 25, "packung", 4.5)];
  s.gerichte = [
    { id: "g1", name: "Döner im Brot", bereich: "doener", klasse: "haupt", zeit: 3, preis: 7.5, mengeTag: 80, steuer: 0.07,
      zutaten: [{ name: "Dönerspieß Kalb/Pute", menge: 150, einheit: "g" }, { name: "Dönerbrot / Fladen", menge: 1, einheit: "stk" }, { name: "Tomaten", menge: 40, einheit: "g" },
        { name: "Eisbergsalat", menge: 30, einheit: "g" }, { name: "Zwiebeln", menge: 20, einheit: "g" }, { name: "Knoblauchsauce", menge: 40, einheit: "g" }, { name: "Dönertüte", menge: 1, einheit: "stk" }] },
    { id: "g2", name: "Pommes", bereich: "imbiss", klasse: "kleinigkeit", zeit: 3, preis: 3.5, mengeTag: 30, steuer: 0.07,
      zutaten: [{ name: "Pommes frites", menge: 200, einheit: "g" }, { name: "Sonnenblumenöl", menge: 15, einheit: "ml" }] }];
  s.phase = "app"; s.einrichtungFertig = true; g.zeichne(); return s.artikel.length;
})()"""

async def main():
    srv = subprocess.Popen([sys.executable, "-m", "http.server", str(PORT), "--bind", "127.0.0.1"], cwd=APP, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    time.sleep(0.8); fehler = []
    try:
        async with async_playwright() as p:
            b = await p.chromium.launch()
            ctx = await b.new_context(viewport={"width": 390, "height": 844}, device_scale_factor=2, is_mobile=True, has_touch=True, locale="de-DE")
            pg = await ctx.new_page()
            # 17.10.2026: feste Tageszeit 12:00 (heutiges Datum) – der Durchlauf mischt Kalendertag (Inventur, Belege) und Geschäftstag
            # (Umsatz bis 4 Uhr = Vortag, Paket 3); nachts zwischen 0 und 4 Uhr wären sonst ein Umsatztag doppelt belegt
            import datetime as _dt
            await pg.clock.set_system_time(_dt.datetime.combine(_dt.date.today(), _dt.time(12, 0)))
            pg.on("console", lambda m: fehler.append(m.text) if m.type == "error" and "ERR_TUNNEL" not in m.text else None)
            pg.on("pageerror", lambda e: fehler.append(str(e)))
            fragen = []
            pg.on("dialog", lambda d: (fragen.append(d.message), asyncio.ensure_future(d.accept())))
            n = 0
            async def bild(name, voll=True):
                nonlocal n; n += 1; await pg.screenshot(path=str(OUT / f"{n:02d}_{name}.png"), full_page=voll)
            async def klick(sel): await pg.click(sel); await pg.wait_for_timeout(260)
            async def geh(ziel): await nav_hilfe.geh(pg, ziel)
            async def stand(): return await pg.evaluate("window.__gastrocalc.stand")
            async def ueberlauf():
                return await pg.evaluate("document.documentElement.scrollWidth - window.innerWidth")
            plus = lambda name: f'.inv-posten[data-name="{name}"] [data-a="inv-d"][data-d="1"]'
            teil = lambda name, t: f'.inv-posten[data-name="{name}"] [data-a="inv-t"][data-t="{t}"]'

            await pg.goto(f"http://127.0.0.1:{PORT}/index.html"); await pg.wait_for_selector(".kachel, [data-f=\"sprache-wahl\"]")
            await pg.select_option('[data-f="sprache-wahl"]', "de"); await klick('[data-a="sprache"][data-wert="de"]')
            assert await pg.evaluate(LADEN) == 11
            await pg.wait_for_selector('[data-a="menue-auf"]')

            # ---- Büro → Inventur (Übersicht)
            await nav_hilfe.ins_buero(pg); await pg.wait_for_selector('#app [data-a="nav"][data-wert="inventur"]'); await bild("buero", False)
            await klick('#app [data-a="nav"][data-wert="inventur"]')
            await pg.wait_for_selector('[data-a="inv-start"]'); await bild("start")
            assert "Noch keine Inventur" in await pg.inner_text(".inhalt")

            # ---- Erste Inventur: Liste A1
            await klick('[data-a="inv-start"]'); await pg.wait_for_selector(".inv-posten")
            namen = await pg.eval_on_selector_all(".inv-posten", "els => els.map(e => e.dataset.name)")
            assert "Dönerspieß Kalb/Pute" in namen and "Dönertüte" in namen and "Müllbeutel" in namen, namen
            koepfe = await pg.eval_on_selector_all(".inv-gruppenkopf", "els => els.map(e => e.innerText.split('\\n')[0].trim())")
            assert koepfe[:2] == ["Kühlhaus", "Tiefkühler"], koepfe
            assert "Reinigung und Betriebsmittel" in " ".join(koepfe), koepfe
            await bild("liste-leer", False)
            await klick(plus("Dönerspieß Kalb/Pute")); await klick(plus("Dönerspieß Kalb/Pute")); await klick(teil("Dönerspieß Kalb/Pute", "0.5"))  # 2 ½ Spieße
            for _ in range(3): await klick(plus("Tomaten"))
            await klick(teil("Tomaten", "0.25")); await klick(teil("Tomaten", "0.25"))  # ¼ an und wieder aus → 3
            await klick(plus("Dönerbrot / Fladen")); await klick(plus("Dönerbrot / Fladen")); await klick(plus("Dönerbrot / Fladen")); await klick(plus("Dönerbrot / Fladen"))
            await klick(plus("Knoblauchsauce"))  # ohne Preis
            s = await stand(); po = s["inventuren"][0]["posten"]
            assert po["Dönerspieß Kalb/Pute"] == 2.5 and po["Tomaten"] == 3 and po["Dönerbrot / Fladen"] == 4 and po["Knoblauchsauce"] == 1, po
            zeile = await pg.inner_text('.inv-posten[data-name="Dönerspieß Kalb/Pute"]')
            assert "2 ½" in zeile and "240,00" in zeile, zeile
            assert "Preis fehlt noch" in await pg.inner_text('.inv-posten[data-name="Knoblauchsauce"]')
            await pg.evaluate("window.scrollTo(0, 0)"); await bild("liste-gezaehlt", False)

            # ---- Karte A2: Pommes groß, + + ¼, Weiter
            await klick('.inv-posten[data-name="Pommes frites"] [data-a="inv-karte"]'); await pg.wait_for_selector(".inv-karte")
            assert "Pommes frites" in await pg.inner_text(".inv-karte h2")
            assert "Tiefkühler" in await pg.inner_text(".inv-ort")
            await klick('[data-a="inv-k-d"][data-d="1"]'); await klick('[data-a="inv-k-d"][data-d="1"]'); await klick('[data-a="inv-k-t"][data-t="0.25"]')
            assert (await stand())["inventuren"][0]["posten"]["Pommes frites"] == 2.25
            assert "44,55" in await pg.inner_text(".inv-wertzeile")  # 2 ¼ × 19,80
            await bild("karte-pommes")
            await klick('[data-a="inv-weiter"]'); await pg.wait_for_selector(".inv-karte")
            naechste = await pg.inner_text(".inv-karte h2"); await bild("karte-naechste", False)
            assert naechste == "Dönerbrot / Fladen", naechste  # nächste Ware in der Reihenfolge der Liste (Trockenlager)
            await klick('[data-a="inv-weiter"]'); await pg.wait_for_selector(".inv-karte")
            assert (await stand())["inventuren"][0]["posten"][naechste] == 4, "Weiter lässt eine gezählte Zahl stehen"
            await klick('[data-a="inv-weiter"]'); await pg.wait_for_selector(".inv-karte")  # Knoblauchsauce (1) bleibt
            dritte = await pg.inner_text(".inv-karte h2"); assert dritte == "Sonnenblumenöl", dritte
            assert (await stand())["inventuren"][0]["posten"].get(dritte) is None
            await klick('[data-a="inv-weiter"]')  # „Weiter" ohne Zahl = 0 bestätigt
            assert (await stand())["inventuren"][0]["posten"][dritte] == 0, dritte
            await klick('[data-a="inv-liste"]'); await pg.wait_for_selector(".inv-posten")

            # ---- Pause, neu laden: nichts verloren
            await klick('[data-a="inv-pause"]'); await pg.wait_for_selector('[data-a="inv-liste"]'); await bild("pause")
            await pg.wait_for_timeout(500); await pg.reload(); await pg.wait_for_selector('.ebene-kopf')
            await geh("inventur"); await pg.wait_for_selector(".inv-posten")
            s = await stand(); assert s["inventuren"][0]["posten"]["Pommes frites"] == 2.25 and not s["inventuren"][0]["abgeschlossen"]

            # ---- Abschließen (Rückfrage wegen nicht Gezähltem)
            await klick('[data-a="inv-fertig"]'); await pg.wait_for_selector(".inv-ergebnis")
            assert fragen and "noch nicht gezählt" in fragen[-1], fragen
            text = (await pg.inner_text(".inv-ergebnis")).replace("\xa0", " ")
            assert "Deine erste Inventur" in text and "ab der zweiten Inventur" in text, text
            erste = 2.5 * 96 + 3 * 11.9 + 4 * 13.5 + 2.25 * 19.8
            erw = f"{erste:,.0f}".replace(",", ".") + " €"
            assert erw in text, (erw, text[:300])
            assert "Knoblauchsauce" in text and "Einkaufspreis" in text, "fehlender Preis muss genannt werden"
            await bild("ergebnis-erste")

            # ---- Zeit vergeht: erste Inventur vor 30 Tagen, dazu Belege (einer storniert), Umsatz und Müll im Zeitraum
            await pg.evaluate("""(async () => { const E = await import('./js/engine.js'); const s = window.__gastrocalc.stand; const h = E.tagPlus(new Date().toISOString().slice(0,10), 0);
              const H = (await import('./js/util.js')).heute(); const vor = (n) => E.tagPlus(H, -n);
              s.inventuren[0].datum = vor(30);
              s.lieferungen.push({ id: "l1", datum: vor(20), erfasst: new Date().toISOString(), lieferant: "Metro", typ: "rechnung", basis: "netto", summeNetto: 640, summeBrutto: null, zeilen: [], storniert: false },
                { id: "l2", datum: vor(10), erfasst: new Date().toISOString(), lieferant: "Metro", typ: "rechnung", basis: "netto", summeNetto: 360, summeBrutto: null, zeilen: [], storniert: false },
                { id: "l3", datum: vor(5), erfasst: new Date().toISOString(), lieferant: "Metro", typ: "rechnung", basis: "netto", summeNetto: 999, summeBrutto: null, zeilen: [], storniert: true });
              for (let i = 1; i <= 20; i++) s.tagesnotizen.push({ id: "u" + i, datum: vor(i), umsatz: 160.5, erfasst: new Date().toISOString(), nacherfasst: true, storniert: false });
              s.schwund.push({ id: "m1", datum: vor(3), erfasst: new Date().toISOString(), art: "rohware", vorgang: 1, ref: { typ: "artikel", name: "Tomaten" }, menge: 2, einheit: "kg", wert: 3.97, storniert: false });
            })()""")
            # Umsatz für heute über die Oberfläche
            await geh("umsatz"); await pg.fill('[data-f="umsatz"]', "214"); await pg.locator('[data-f="umsatz"]').blur(); await pg.wait_for_timeout(300)

            # ---- Zweite Inventur
            await geh("inventur"); await pg.wait_for_selector('[data-a="inv-start"]'); await bild("start-mit-verlauf")
            await klick('[data-a="inv-start"]'); await pg.wait_for_selector(".inv-posten")
            letztes = await pg.inner_text('.inv-posten[data-name="Tomaten"]')
            await klick(plus("Dönerspieß Kalb/Pute")); await klick(teil("Dönerspieß Kalb/Pute", "0.75"))  # 1 ¾
            await klick(plus("Tomaten")); await klick(plus("Dönerbrot / Fladen")); await klick(plus("Dönerbrot / Fladen"))
            await klick('.inv-posten[data-name="Tomaten"] [data-a="inv-karte"]'); await pg.wait_for_selector(".inv-letztes")
            assert "Letztes Mal: 3 × Kiste" in await pg.inner_text(".inv-letztes")
            await klick('[data-a="inv-liste"]')
            # Ware dazuholen über die Suche (Türkisch „domates“ findet nichts Neues, „halloumi“ schon)
            await pg.fill('[data-f="inv-suche"]', "hallou"); await pg.wait_for_selector('[data-a="inv-dazu"]')
            await klick('[data-a="inv-dazu"][data-name="Halloumi"]'); await pg.wait_for_selector('.inv-posten[data-name="Halloumi"]')
            await klick('[data-a="inv-fertig"]'); await pg.wait_for_selector(".inv-rechnung")
            text = (await pg.inner_text(".inv-ergebnis")).replace("\xa0", " "); await bild("ergebnis-zweite")
            v = await pg.evaluate("""(async () => { const I = await import('./js/inventur.js'); const s = window.__gastrocalc.stand; const f = I.inventurenFertig(s); return I.inventurVergleich(s, f[f.length - 1]); })()""")
            zweite = 1.75 * 96 + 1 * 11.9 + 2 * 13.5
            assert abs(v["anfang"] - erste) < 0.01 and abs(v["ende"] - zweite) < 0.01, v
            assert abs(v["einkauf"] - 1000) < 0.01 and v["belege"] == 2 and v["tage"] == 30, v  # stornierter Beleg zählt nicht
            assert abs(v["umsatzNetto"] - (20 * 160.5 + 214) / 1.07) < 0.01 and v["umsatzTage"] == 21, v
            eur0 = lambda x: f"{x:,.0f}".replace(",", ".") + " €"
            for teiltext in ["Was ist verbraucht worden?", "Eingekauft (2 Belege)", "Verbraucht in 30 Tagen", eur0(v["verbrauch"]), "Stimmt nur, wenn alle Einkaufsbelege drin sind",
                             "Wareneinsatz: gerechnet gegen echt", "Echt, laut Inventur", "Von jedem Euro Umsatz", "Was heißt das?", "an 21 von 30 Tagen"]:
                assert teiltext.lower() in text.lower(), (teiltext, text)
            assert v["luecke"] is not None
            if v["luecke"] > 0: assert "mehr Ware weg als gedacht" in text and "als Müll oder Personalessen eingetragen" in text and "3,97" in text, text
            else: assert "weniger Ware weg als gedacht" in text, text
            await pg.evaluate("window.scrollTo(0, 0)"); await bild("ergebnis-oben", False)
            assert await ueberlauf() <= 0, "waagrechter Überlauf (390)"
            s = await stand(); assert len([i for i in s["inventuren"] if i["abgeschlossen"]]) == 2 and s["inventuren"][1]["preise"]

            # ---- 360 px und Türkisch
            await pg.set_viewport_size({"width": 360, "height": 780})
            await pg.evaluate("(async () => { const i = await import('./js/i18n.js'); window.__gastrocalc.wurzel.sprache = 'tr'; i.setzeSprache('tr'); window.__gastrocalc.zeichne(); })()")
            await pg.wait_for_timeout(200); await bild("tr-ergebnis")
            assert "Başta mal" in await pg.inner_text(".inv-ergebnis")
            assert await ueberlauf() <= 0, "waagrechter Überlauf (360, tr)"
            await klick('[data-a="inv-uebersicht"]'); await klick('[data-a="inv-start"]'); await pg.wait_for_selector(".inv-posten")
            await klick(plus("Dönerspieß Kalb/Pute")); await klick(teil("Dönerspieß Kalb/Pute", "0.5"))
            await pg.evaluate("window.scrollTo(0, 0)"); await bild("tr-liste", False)
            assert await ueberlauf() <= 0, "waagrechter Überlauf (360, tr, Liste)"
            await klick('.inv-posten[data-name="Dönerspieß Kalb/Pute"] [data-a="inv-karte"]'); await pg.wait_for_selector(".inv-karte"); await bild("tr-karte")
            assert await ueberlauf() <= 0, "waagrechter Überlauf (360, tr, Karte)"
            # Zurück-Geste: Karte → Liste → Übersicht
            await pg.go_back(); await pg.wait_for_selector(".inv-posten"); await pg.go_back(); await pg.wait_for_selector('[data-a="inv-liste"]')
            await klick('[data-a="inv-verwerfen"]'); await pg.wait_for_selector('[data-a="inv-start"]')
            s = await stand(); assert len(s["inventuren"]) == 2 and all(i["abgeschlossen"] for i in s["inventuren"]), "verwerfen nur die offene"
            await bild("tr-start")
            print("Konsolenfehler:", fehler); assert not fehler, fehler
            print("Durchlauf Inventur ok ·", n, "Bilder in", OUT)
            await ctx.close(); await b.close()
    finally:
        srv.terminate()

asyncio.run(main())
