"""„Go beide“ (19.10.2026): Browser-Durchlauf selbst gemacht + Gebinde in Stück, Handy 390×844 mit Touch.
Schnellstart Döner → Pizza und Lahmacun auf die Karte (direkt im Stand) → Büro: Einkaufspreise → Pizzateig-Kachel antippen (Blatt),
Zutat dazu, Menge, Ausbeute als 1650 g Teig gesamt, 275 g je Stück (= 6 Stück), Minuten → Wert je Ansatz/kg/Stück/50 g steht → Mehl-Preis eintragen → Werte da →
eine gekaufte Ware „Stück“ wählen: 40 × 250 g → Inhalt 10 000 g, Preis je Stück steht. Kein waagrechter Überlauf, keine Konsolenfehler.
Start: python3 tests/durchlauf_selbst.py (Port DURCHLAUF_PORT oder 8783). Bilder: /home/claude/audit/shots/selbst_*.png. Exit 1 bei Fehler."""
import asyncio, sys, os, pathlib, traceback
from playwright.async_api import async_playwright
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
import schnellstart as ss, nav_hilfe

PORT = int(os.environ.get("DURCHLAUF_PORT", "8783"))
OUT = pathlib.Path(os.environ.get("DURCHLAUF_OUT", "/home/claude/audit/shots")); OUT.mkdir(parents=True, exist_ok=True)

async def main():
    srv = ss.server(PORT); fehler = []
    try:
        async with async_playwright() as p:
            b = await p.chromium.launch()
            ctx, pg = await ss.kontext(b, 390, 844, fehler)
            n = 0
            async def bild(name, voll=True):
                nonlocal n; n += 1; await pg.screenshot(path=str(OUT / f"selbst_{n:02d}_{name}.png"), full_page=voll)
            async def ueberlauf(wo):
                x = await pg.evaluate("document.documentElement.scrollWidth - window.innerWidth"); assert x <= 0, f"waagrechter Überlauf ({wo}): {x}px"
            async def tippe(feld, wert):
                el = pg.locator(f'[data-f="{feld}"]').first; await el.fill(str(wert)); await pg.wait_for_timeout(150)
            async def art(name): return await pg.evaluate(f"window.__gastrocalc.stand.artikel.find((a) => a.name === {name!r})")

            await ss.schnellstart(pg, PORT, name="Pizza Test")
            await pg.evaluate("""() => { const s = window.__gastrocalc.stand; s.selbst = ["teig"];
              s.gerichte.push({ id: "pz", name: "Pizza Margherita", klasse: "haupt", zeit: 6, vorlage: false, zutaten: [{ name: "Pizzateig", menge: 1, einheit: "stk" }, { name: "Mozzarella", menge: 120, einheit: "g" }], preis: 8.5, mengeTag: 20, steuer: 0.07 }); }""")
            await nav_hilfe.ins_buero(pg); await pg.wait_for_timeout(300)
            await pg.locator('[data-a="bearbeiten"][data-schritt="preise"]').first.tap(); await pg.wait_for_timeout(600)
            # 20.10.2026: Bilderwand – Kachel antippen öffnet das Blatt; „Mehr“ klappt die Testhilfe auf
            if await pg.locator('[data-a="ep-filter"][data-wert="alle"]').count(): await pg.locator('[data-a="ep-filter"][data-wert="alle"]').tap(); await pg.wait_for_timeout(300)
            async def blatt_auf(name):
                if await pg.locator(f'.ep-blatt[aria-label="{name}"]').count(): return
                if await pg.locator('.fuss [data-a="ep-zu"]').count(): await pg.locator('.fuss [data-a="ep-zu"]').tap(); await pg.wait_for_timeout(300)
                await pg.locator(f'.ep-kachel[data-name="{name}"]').tap(); await pg.wait_for_selector(f'.ep-blatt[aria-label="{name}"]')
            await blatt_auf("Pizzateig")
            # selbst gemacht an (falls Vorauswahl nicht schon an) – der Knopf liegt im Blatt
            if await pg.locator('[data-a="selbst-an"][data-name="Pizzateig"]').count():
                await pg.locator('[data-a="selbst-an"][data-name="Pizzateig"]').first.tap(); await pg.wait_for_timeout(400)
            assert await pg.locator('.ep-kachel[data-name="Pizzateig"] .ep-marke.selbst').count(), "Kachel Pizzateig ohne Marke „selbst“"
            zeile = pg.locator('.ep-blatt.sz').first
            assert await zeile.count(), "Blatt Pizzateig (selbst gemacht) fehlt"
            await zeile.scroll_into_view_if_needed(); await bild("editor_start", voll=False); await ueberlauf("Editor")
            # eigene Zutatenliste: alles weg, Mehl dazu
            while await zeile.locator('[data-a="sz-weg"]').count():
                await zeile.locator('[data-a="sz-weg"]').first.tap(); await pg.wait_for_timeout(250); zeile = pg.locator('.ep-blatt.sz').first
            await zeile.locator('select.sz-neu').select_option("Pizzamehl Typ 00"); await pg.wait_for_timeout(400)
            zeile = pg.locator('.ep-blatt.sz').first
            assert await zeile.locator('[data-f="sz-menge#0:Pizzateig"]').count(), "Blatt nach neuer Zutat zu"
            await tippe("sz-menge#0:Pizzateig", "1000")
            await zeile.locator('[data-a="sz-art"][data-wert="stueck"]').tap(); await pg.wait_for_timeout(300)
            await tippe("sz-masse:Pizzateig", "1650"); await tippe("sz-gewicht:Pizzateig", "275"); await tippe("sz-arbeit:Pizzateig", "20")
            a = await art("Pizzateig")
            assert a["rezept"]["quelle"] == "eigen" and a["rezept"]["ausbeute"] == {"menge": 1650, "einheit": "g"}, a["rezept"]
            assert "6 Stück" in await pg.locator(".ep-blatt .ep-ergebnis").inner_text(), "Ergebnis zeigt die Stückzahl live"
            # Mehlpreis: 15 € je 25 kg
            await blatt_auf("Pizzamehl Typ 00")
            await tippe("packung:Pizzamehl Typ 00", "25"); await tippe("preis:Pizzamehl Typ 00", "15")
            assert "0,60" in await pg.locator(".ep-blatt .ep-ergebnis").inner_text(), "1 kg Mehl = 0,60 €"
            await blatt_auf("Pizzateig")
            await pg.evaluate("window.__gastrocalc.zeichne()"); await pg.wait_for_timeout(300)
            zeile = pg.locator('.ep-blatt.sz').first
            erg = await zeile.locator(".ep-ergebnis").inner_text()
            assert "6 Stück" in erg and "0,10" in erg, "1 kg Mehl zu 0,60 € / 6 Ballen = 0,10 € je Stück: " + erg
            werte = await zeile.locator(".ep-werte").inner_text()
            assert "je Stück" in werte and "je 50 g" in werte and "je Ansatz" in werte, werte
            assert "0,10" in await pg.locator('.ep-kachel[data-name="Pizzateig"]').inner_text(), "Kachel zeigt Preis je Stück"
            await zeile.scroll_into_view_if_needed(); await bild("editor_fertig", voll=False); await ueberlauf("Editor fertig")
            # Gebinde in Stück: Mozzarella 40 × 250 g
            await blatt_auf("Mozzarella")
            moz = pg.locator('.ep-blatt:has([data-f="preis:Mozzarella"])').first
            await moz.locator('[data-a="packung-einheit"][data-wert="stk"]').tap(); await pg.wait_for_timeout(300)
            await tippe("stk-anzahl:Mozzarella", "40"); await tippe("stk-gewicht:Mozzarella", "250"); await tippe("preis:Mozzarella", "60")
            m = await art("Mozzarella")
            assert m["packung"] == {"menge": 10000, "einheit": "g"} and m["stueckGewicht"] == 250, m
            await pg.evaluate("window.__gastrocalc.zeichne()"); await pg.wait_for_timeout(300)
            moz = pg.locator('.ep-blatt:has([data-f="preis:Mozzarella"])').first
            e2 = await moz.locator(".ep-ergebnis").inner_text(); assert "je Stück" in e2 and "1,50" in e2, e2
            await moz.scroll_into_view_if_needed(); await bild("gebinde_stueck", voll=False); await ueberlauf("Gebinde Stück")
            await pg.locator('.fuss [data-a="ep-zu"]').tap(); await pg.wait_for_timeout(300)
            assert not await pg.locator(".ep-blatt").count(), "Fertig schließt das Blatt"
            assert not fehler, "Konsolenfehler: " + "; ".join(fehler)
            print("durchlauf_selbst: ok"); return 0
    except Exception:
        traceback.print_exc(); return 1
    finally:
        srv.terminate()

sys.exit(asyncio.run(main()))
