"""„Go beide“ (19.10.2026): Browser-Durchlauf selbst gemacht + Gebinde in Stück, Handy 390×844 mit Touch.
Schnellstart Döner → Pizza und Lahmacun auf die Karte (direkt im Stand) → Büro: Einkaufspreise → Pizzateig: „Ansatz eintragen“ aufklappen,
Zutat dazu, Menge, Ausbeute als 6 Stück × 275 g, Minuten → Wert je Ansatz/kg/Stück/50 g steht → Mehl-Preis eintragen → Werte da →
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
            async def auf():
                if not await pg.locator('details[data-klapp="selbst:Pizzateig"][open]').count(): await pg.locator('details[data-klapp="selbst:Pizzateig"] summary').click(); await pg.wait_for_timeout(250)
            async def art(name): return await pg.evaluate(f"window.__gastrocalc.stand.artikel.find((a) => a.name === {name!r})")

            await ss.schnellstart(pg, PORT, name="Pizza Test")
            await pg.evaluate("""() => { const s = window.__gastrocalc.stand; s.selbst = ["teig"];
              s.gerichte.push({ id: "pz", name: "Pizza Margherita", klasse: "haupt", zeit: 6, vorlage: false, zutaten: [{ name: "Pizzateig", menge: 1, einheit: "stk" }, { name: "Mozzarella", menge: 120, einheit: "g" }], preis: 8.5, mengeTag: 20, steuer: 0.07 }); }""")
            await nav_hilfe.ins_buero(pg); await pg.wait_for_timeout(300)
            await pg.locator('[data-a="bearbeiten"][data-schritt="preise"]').first.tap(); await pg.wait_for_timeout(600)
            # selbst gemacht an (falls Vorauswahl nicht schon an)
            if await pg.locator('[data-a="selbst-an"][data-name="Pizzateig"]').count():
                await pg.locator('[data-a="selbst-an"][data-name="Pizzateig"]').first.tap(); await pg.wait_for_timeout(400)
            zeile = pg.locator('.zeile.selbst', has_text="Pizzateig").first
            assert await zeile.count(), "Zeile Pizzateig (selbst gemacht) fehlt"
            await auf(); # Testhilfe klappt .einklapp schon auf (tests/hilfe/aufklappen.js) – sonst hier öffnen
            await zeile.scroll_into_view_if_needed(); await bild("editor_start", voll=False); await ueberlauf("Editor")
            # eigene Zutatenliste: alles weg, Mehl dazu
            while await zeile.locator('[data-a="sz-weg"]').count():
                await zeile.locator('[data-a="sz-weg"]').first.tap(); await pg.wait_for_timeout(250); zeile = pg.locator('.zeile.selbst', has_text="Pizzateig").first
                await auf()
            await zeile.locator('select.sz-neu').select_option("Pizzamehl Typ 00"); await pg.wait_for_timeout(400)
            zeile = pg.locator('.zeile.selbst', has_text="Pizzateig").first
            assert await zeile.locator("details[open]").count(), "Editor nach neuer Zutat zu"
            await tippe("sz-menge#0:Pizzateig", "1000")
            await zeile.locator('[data-a="sz-art"][data-wert="stueck"]').tap(); await pg.wait_for_timeout(300)
            await tippe("sz-anzahl:Pizzateig", "6"); await tippe("sz-gewicht:Pizzateig", "275"); await tippe("sz-arbeit:Pizzateig", "20")
            a = await art("Pizzateig")
            assert a["rezept"]["quelle"] == "eigen" and a["rezept"]["ausbeute"] == {"menge": 1650, "einheit": "g"}, a["rezept"]
            # Mehlpreis: 15 € je 25 kg
            await tippe("packung:Pizzamehl Typ 00", "25"); await tippe("preis:Pizzamehl Typ 00", "15")
            await pg.evaluate("window.__gastrocalc.zeichne()"); await pg.wait_for_timeout(300)
            zeile = pg.locator('.zeile.selbst', has_text="Pizzateig").first
            erg = await zeile.locator(".ergebnis").inner_text()
            assert "je Stück" in erg and "je 50 g" in erg and "je Ansatz" in erg, erg
            assert "0,10" in erg, "1 kg Mehl zu 0,60 € / 6 Ballen = 0,10 € je Stück: " + erg
            await zeile.scroll_into_view_if_needed(); await bild("editor_fertig", voll=False); await ueberlauf("Editor fertig")
            # Gebinde in Stück: Mozzarella 40 × 250 g
            moz = pg.locator('.zeile:has([data-f="preis:Mozzarella"])').first
            await moz.locator('[data-a="packung-einheit"][data-wert="stk"]').tap(); await pg.wait_for_timeout(300)
            await tippe("stk-anzahl:Mozzarella", "40"); await tippe("stk-gewicht:Mozzarella", "250"); await tippe("preis:Mozzarella", "60")
            m = await art("Mozzarella")
            assert m["packung"] == {"menge": 10000, "einheit": "g"} and m["stueckGewicht"] == 250, m
            await pg.evaluate("window.__gastrocalc.zeichne()"); await pg.wait_for_timeout(300)
            moz = pg.locator('.zeile:has([data-f="preis:Mozzarella"])').first
            e2 = await moz.locator(".ergebnis").inner_text(); assert "je Stück" in e2 and "1,50" in e2, e2
            await moz.scroll_into_view_if_needed(); await bild("gebinde_stueck", voll=False); await ueberlauf("Gebinde Stück")
            assert not fehler, "Konsolenfehler: " + "; ".join(fehler)
            print("durchlauf_selbst: ok"); return 0
    except Exception:
        traceback.print_exc(); return 1
    finally:
        srv.terminate()

sys.exit(asyncio.run(main()))
