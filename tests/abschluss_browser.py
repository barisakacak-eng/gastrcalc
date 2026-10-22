"""Sanji L6: echte Abnahme mit fiktiven Testumsätzen, nie in der Live-App."""
import pathlib
import schnellstart, nav_hilfe

async def run(browser, port, out):
    fehler=[]
    ctx, pg=await schnellstart.kontext(browser,390,844,fehler)
    try:
        await schnellstart.schnellstart(pg,port,name="Tagesbilanz – Beispiel")
        await pg.evaluate("""() => {
          const s=window.__gastrocalc.stand;
          const d=new Date();
          const local=(v)=>{const t=new Date(d);t.setDate(t.getDate()+v);return [t.getFullYear(),String(t.getMonth()+1).padStart(2,"0"),String(t.getDate()).padStart(2,"0")].join("-");};
          s.tagesnotizen=[
            {id:"demo-heute",datum:local(0),umsatz:820,erfasst:d.toISOString(),storniert:false},
            {id:"demo-vorwoche",datum:local(-7),umsatz:650,erfasst:d.toISOString(),storniert:false}
          ];
          s.kosten=[{id:"demo-kosten",kategorie:"miete",posten:"miete",betrag:1600,status:"bekannt",periode:"monat",basis:"netto"}];
          s.betrieb.name="Beispielbetrieb";
          window.__gastrocalc.zeichne();
        }""")
        await nav_hilfe.geh(pg,"abschluss")
        await pg.wait_for_selector(".abschluss-laden .ab-liste")
        assert await pg.locator(".abschluss-laden .ab-zeile").count()==3
        assert await pg.locator(".abschluss-laden [data-a='abschluss-fertig']").count()==1
        await pg.locator(".abschluss-laden [data-a='abschluss-fertig']").click()
        await pg.wait_for_selector(".ab-bilanz .ab-hero")
        for width,height in [(390,844),(360,780)]:
            await pg.set_viewport_size({"width":width,"height":height})
            await pg.wait_for_timeout(250)
            info=await pg.evaluate("""() => ({
              breite:document.documentElement.scrollWidth,
              vor:document.querySelector(".ab-bilanz .alt")?.innerText,
              nach:document.querySelector(".ab-bilanz .riesig")?.innerText,
              tagesvergleich:document.querySelector(".ab-vergleich")?.innerText,
              knopfhoehe:document.querySelector(".ab-zurueck")?.getBoundingClientRect().height,
              bilanz:document.querySelectorAll(".ab-zahlen .summenzeile").length,
              mehr:!!document.querySelector(".ab-details:not([open])"),
              knopf_bottom:Math.round(document.querySelector(".ab-zurueck").getBoundingClientRect().bottom),
              nav_top:Math.round(document.querySelector(".tableiste").getBoundingClientRect().top)
            })""")
            assert info["breite"]<=width,info
            assert info["vor"] and info["nach"],info
            assert info["bilanz"]==5,info
            assert info["tagesvergleich"],info
            assert info["knopfhoehe"]>=56,info
            assert info["mehr"],info
            assert info["knopf_bottom"]<=info["nav_top"]+3,info
            print("SANJI_L6",width,info)
            # Kennzeichnung NUR für den Browser-Test, außerhalb des Kundenbildschirms.
            await pg.screenshot(path=str(out/f"sanji_abschluss_bilanz_{width}x{height}.png"),full_page=False)
        assert not fehler,fehler
    finally:
        await ctx.close()
