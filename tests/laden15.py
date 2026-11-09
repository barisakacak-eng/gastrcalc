"""Lauf 3, Phase 4 (09.11.2026): Laden-Bildschirme unter 15 Wörter messen – nach der Regel in tests/regeln.py (Tab-Leiste, Zahlen,
Gericht-/Warennamen, Putzaufgaben zählen nicht; alles andere Sichtbare zählt).
Misst Heute, Müll, Kühlung, Putzen, Karte, Preis-Blatt, Rezept-Blatt, Umsatz heute, Tagesabschluss bei 390 × 844, mit einem Laden mit Daten.
L15=1 schaltet den Entwurf window.__gcL15 vor dem ersten Laden ein (Bildpaket L15 „nachher“). SCHNELLSTART_SPRACHE=de|tr.
Schreibt <L15_OUT>/<sprache>_<vorher|nachher>.json und je Bildschirm ein Bild. Exit 1, wenn mit L15=1 ein Bildschirm über 15 liegt.
Aufruf: L15=1 SCHNELLSTART_SPRACHE=tr DURCHLAUF_PORT=8861 python3 tests/laden15.py"""
import asyncio, json, os, pathlib, sys
sys.path.insert(0, str(pathlib.Path(__file__).parent))
import schnellstart, nav_hilfe, regeln
from playwright.async_api import async_playwright

PORT = int(os.environ.get("DURCHLAUF_PORT", "8861")); SP = os.environ.get("SCHNELLSTART_SPRACHE", "de"); AN = os.environ.get("L15") == "1"
OUT = pathlib.Path(os.environ.get("L15_OUT", "/tmp/laden15")); OUT.mkdir(parents=True, exist_ok=True)
ART = "nachher" if AN else "vorher"
KARTE = "Döner Kebab 7,50\nDürüm 8,00\nLahmacun 5,50\nPommes 3,50\nAyran 2,00"


async def main():
    srv = schnellstart.server(PORT); fehler = []; erg = {}
    try:
        async with async_playwright() as p:
            b = await p.chromium.launch()
            ctx, pg = await schnellstart.kontext(b, 390, 844, fehler)
            if AN: await ctx.add_init_script("window.__gcL15 = true;")
            await ctx.add_init_script("try { localStorage.setItem('gc-zeki-erst', JSON.stringify(['muell','kuehl','putzplan','karte','umsatzheute','abschluss'])); } catch (e) {}")
            await schnellstart.schnellstart(pg, PORT, name="Imbiss Test")
            await pg.evaluate("""async (txt) => { const kl = await import('./js/karte_lesen.js'); const s = window.__gastrocalc.stand;
              kl.vorschlaegeUebernehmen(s, kl.vorschlaegeAusText(txt, s).map((v) => ({ ...v, an: true }))); window.__gastrocalc.zeichne(); }""", KARTE)
            stand = await pg.evaluate("window.__gastrocalc.stand"); aus = regeln.ausschluss_fuer(stand, "")
            for n in await pg.evaluate("""async () => { const i = await import('./js/i18n.js'); const s = window.__gastrocalc.stand;
                return [...(s.artikel || []).map((a) => i.artikelText(a.name)), ...(s.gerichte || []).map((g) => i.gerichtText(g.name))]; }"""):
                for t in (n or "").split():
                    t = t.strip(".,:;!?()[]«»\"'"); aus.add(t.lower()) if t else None

            async def messe(name, wurzel="#app"):
                await pg.wait_for_timeout(400)
                if await pg.locator(".zeki-sprech, .h-zeki--neu .h-zeki-blase").count(): await pg.wait_for_timeout(7600)  # Ruhezustand nach Zekis Blase
                m = await regeln.messen(pg, wurzel, aus)
                await pg.screenshot(path=str(OUT / f"{SP}_{ART}_{name}.png"))
                erg[name] = {"worte": m["worte"], "wortliste": m["wortliste"], "scroll": m["hoehe"] > m["innen"] + 1}
                print(f"{SP} {ART} {name:14s} {m['worte']:3d}  {' '.join(m['wortliste'])[:160]}")

            for ziel, name in (("start", "heute"), ("muell", "muell"), ("kuehl", "kuehlung"), ("putzplan", "putzen"), ("karte", "karte")):
                await nav_hilfe.geh(pg, ziel); await messe(name)
            await pg.evaluate("document.querySelectorAll('.zeki-erst').forEach(e => e.remove())")
            await pg.locator('#app [data-a="kl-auf"]').first.click(); await pg.wait_for_selector(".kl-blatt"); await messe("preis-blatt", ".kl-blatt")
            await pg.click('button.kl-x[data-a="kl-zu"]'); await pg.wait_for_timeout(400)
            # Rezept-Blatt: Gericht mit Zutaten (Richtrezept) über den Laden-Zustand öffnen
            gid = await pg.evaluate("(window.__gastrocalc.stand.gerichte.find((g) => (g.zutaten || []).length) || {}).id || null")
            if gid:
                await pg.evaluate("async (gid) => { const m = await import('./js/screens/karte_laden.js'); m.karteLadenRezeptBlatt(window.__gastrocalc.stand, gid); window.__gastrocalc.zeichne(); }", gid)
                await pg.wait_for_selector(".kl-rezeptblatt"); await messe("rezept-blatt", ".kl-blatt")
                await pg.click('#app .kl-rezeptblatt [data-a="kl-zu"].knopf'); await pg.wait_for_timeout(400)
            else: print("kein Gericht mit Zutaten – Rezept-Blatt nicht gemessen")
            await nav_hilfe.geh(pg, "start"); await pg.click('#app [data-a="nav"][data-wert="umsatzheute"]'); await pg.wait_for_selector('[data-f="ul-umsatz"]'); await messe("umsatz-heute")
            await nav_hilfe.geh(pg, "abschluss"); await messe("abschluss")
            await ctx.close(); await b.close()
    finally:
        srv.terminate()
    (OUT / f"{SP}_{ART}.json").write_text(json.dumps({"sprache": SP, "art": ART, "bildschirme": erg, "konsolenfehler": fehler}, ensure_ascii=False, indent=1), encoding="utf-8")
    ueber = [k for k, v in erg.items() if v["worte"] > 15]
    print(f"{SP} {ART}: über 15 Wörter: {ueber or 'keiner'} · Konsolenfehler: {len(fehler)}")
    return 1 if (AN and ueber) or fehler else 0

if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
