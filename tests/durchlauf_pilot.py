"""Pilot-Durchlauf mit den echten Kartenfotos des Kapitäns (nur lokal, tests/bilder/pilot): Schnellstart → beide Fotos
über die Galerie (Mehrfachauswahl) → Prüfliste. Misst Zeit, zählt richtige Gerichte gegen soll.json, Bilder je Schritt.
Start: python3 tests/durchlauf_pilot.py"""
import asyncio, subprocess, sys, time, pathlib, os, json, re, unicodedata
from playwright.async_api import async_playwright

APP = pathlib.Path(__file__).resolve().parent.parent
PILOT = APP / "tests" / "bilder" / "pilot"
OUT = APP.parent / "pdfbuild" / "pilot-check"; OUT.mkdir(parents=True, exist_ok=True)
PORT = 8767
norm = lambda s: re.sub(r"[^\w&]+", " ", unicodedata.normalize("NFC", s).lower()).strip()

async def main():
    if not (PILOT / "karte_seite1.jpg").exists(): print("Pilotfotos fehlen – übersprungen"); return
    soll = json.loads((PILOT / "soll.json").read_text())
    srv = subprocess.Popen([sys.executable, "-m", "http.server", str(PORT), "--bind", "127.0.0.1"], cwd=APP, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    time.sleep(0.8); fehler = []
    try:
        async with async_playwright() as p:
            b = await p.chromium.launch()
            ctx = await b.new_context(viewport={"width": 390, "height": 844}, device_scale_factor=2, is_mobile=True, has_touch=True, locale="de-DE")
            pg = await ctx.new_page()
            pg.on("console", lambda m: fehler.append(m.text) if m.type == "error" else None)
            pg.on("pageerror", lambda e: fehler.append(str(e)))
            await pg.goto(f"http://127.0.0.1:{PORT}/index.html"); await pg.wait_for_selector(".kachel")
            n = 0
            async def bild(name, voll=True):
                nonlocal n; n += 1; await pg.screenshot(path=str(OUT / f"{n:02d}_{name}.png"), full_page=voll)
            await pg.click('[data-a="sprache"][data-wert="de"]'); await pg.wait_for_selector('[data-a="laden-art"]')
            await pg.fill('[data-f="betrieb.name"]', "Pilotladen"); await pg.click('[data-a="laden-art"][data-wert="doener"]'); await pg.click('[data-a="weiter"]')
            await pg.wait_for_selector('input[data-f="foto"][data-zweck="speisekarte"]', state="attached"); await bild("karte-foto")
            t0 = time.time()
            await pg.locator('input[data-f="foto"]:not([capture])').set_input_files([str(PILOT / "karte_seite1.jpg"), str(PILOT / "karte_seite2.jpg")])
            await pg.wait_for_timeout(1500); await bild("lesen", False)
            await pg.wait_for_selector('[data-a="fv-uebernehmen"]', timeout=400000); dauer = time.time() - t0
            await pg.wait_for_timeout(300); await bild("pruefliste"); await bild("pruefliste-oben", False)
            liste = await pg.evaluate("""[...document.querySelectorAll('.fvz')].map(z => ({ name: z.querySelector('[data-f^=\"fv-name:\"]')?.value || z.querySelector('.n')?.firstChild?.textContent || '', preis: z.querySelector('[data-f^=\"fv-preis:\"]')?.value || z.querySelector('.p')?.textContent || '', gruppe: z.closest('.fvliste.offen') ? 'pruefen' : 'erkannt' }))""")
            alle = soll["1"] + soll["2"]
            preis = lambda s: float(re.sub(r"[^\d,]", "", s).replace(",", ".")) if re.search(r"\d", s) else None
            richtig = [x for x in liste if any(norm(x["name"]) == norm(nm) and preis(x["preis"]) == pr for nm, pr in alle)]
            nur_name = [x for x in liste if any(norm(x["name"]) == norm(nm) for nm, _ in alle)]
            falsch = [x for x in liste if not any(norm(x["name"]) == norm(nm) for nm, _ in alle)]
            fehlt = [nm for nm, _ in alle if not any(norm(x["name"]) == norm(nm) for x in liste)]
            print(f"Lesezeit beide Fotos: {dauer:.0f} s")
            print(f"Liste: {len(liste)} Einträge · richtig mit Preis {len(richtig)}/{len(alle)} · Name richtig {len(nur_name)} · Müll {len(falsch)} · fehlt {len(fehlt)}")
            print("Müll:", [(x['name'], x['gruppe']) for x in falsch]); print("Fehlt:", fehlt)
            print("Erkannt-Gruppe mit falschem Preis:", [(x['name'], x['preis']) for x in nur_name if x not in richtig and x['gruppe'] == 'erkannt'])
            # weiter durch den Schnellstart: übernehmen → Kosten → fertig → Cockpit
            await pg.click('[data-a="fv-uebernehmen"]'); await pg.wait_for_timeout(500); await bild("nach-karte")
            for i in range(6):
                if await pg.locator('[data-a="weiter"]').count() == 0: break
                await bild(f"schritt-{i}"); await pg.click('[data-a="weiter"]'); await pg.wait_for_timeout(500)
            await bild("ende")
            st = await pg.evaluate("window.__gastrocalc.stand")
            ohne = [g["name"] for g in st["gerichte"] if not g["zutaten"]]
            print("Gerichte:", len(st["gerichte"]), "· mit Rezept:", len(st["gerichte"]) - len(ohne), "· Artikel Inventurliste:", len(st["artikel"]), "· Phase:", st.get("phase")); print("Ohne Rezept:", ohne)
            print("Konsolenfehler:", fehler)
            await ctx.close(); await b.close()
    finally:
        srv.terminate()

asyncio.run(main())
