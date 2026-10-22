"""Nur abgekapselter Browser-Test der freigegebenen Premium-Bildwelt; kein App-Zustand wird gespeichert."""
import json, pathlib
import schnellstart, nav_hilfe

DATEN = pathlib.Path(__file__).parent / "bilder/pilot/visuelle_testdaten_2026-10-22.json"

async def run(browser, port, out):
    beispiel = json.loads(DATEN.read_text(encoding="utf-8"))
    ctx, page = await schnellstart.kontext(browser,390,844,[])
    try:
        await schnellstart.schnellstart(page,port,name="Nur Beispieldaten")
        for art in ("doener","burger"):
            await page.evaluate("""args => {
                const s=window.__gastrocalc.stand;
                s.gerichte=args.gerichte;
                s.artikel=args.artikel;
                s.betrieb.name=args.art+"-Pilot (Beispiel)";
                s.betrieb.kuechen=[args.art];
                s.kosten=[{id:"demo-miete",kategorie:"miete",posten:"miete",betrag:1600,status:"bekannt",periode:"monat",basis:"netto"}];
                window.__gastrocalc.zeichne();
            }""",{"art":art,"gerichte":beispiel[art],"artikel":beispiel["items"]})
            await nav_hilfe.geh(page,"karte")
            await page.wait_for_selector(".kartelaeden .kl-gericht",timeout=20000)
            for width,height in ((390,844),(360,780)):
                await page.set_viewport_size({"width":width,"height":height})
                await page.wait_for_timeout(280)
                details=await page.evaluate("""() => ({
                  breite:document.documentElement.scrollWidth,
                  waren:[...document.querySelectorAll(".kartelaeden .kl-gericht")].map(x=>({
                    name:x.querySelector(".kl-gn")?.textContent,
                    bild:x.querySelector("img.gerichtbild")?.getAttribute("src"),
                    geladen:!!x.querySelector("img.gerichtbild")?.naturalWidth,
                    gewinn:x.querySelector(".kl-nutzen")?.textContent.trim(),
                    zuBreit:x.scrollWidth>x.clientWidth+1
                  }))
                })""")
                assert details["breite"]<=width,(art,width,"Querscroll",details["breite"])
                assert len(details["waren"])==4,(art,"nicht vier",details["waren"])
                assert all(x["geladen"] and x["gewinn"] and not x["zuBreit"] for x in details["waren"]),details
                print("SANJI_PILOTKARTE",art,width,details)
                await page.screenshot(path=str(out/f"pilot_karte_{art}_{width}x{height}.png"),full_page=False)
    finally:
        await ctx.close()
