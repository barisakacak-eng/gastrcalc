"""Lauf 3, Phase 4 (09.11.2026): Laden-Bildschirme unter 15 Wörter messen – nach der Regel in tests/regeln.py (Tab-Leiste, Zahlen,
Gericht-/Warennamen, Putzaufgaben zählen nicht; alles andere Sichtbare zählt).
Misst Heute, Müll, Kühlung, Putzen, Karte, Preis-Blatt, Rezept-Blatt, Umsatz heute, Tagesabschluss bei 390 × 844, mit einem Laden mit Daten.
Seit Baris' Ja (09.11.2026 17:21) ohne Schalter. L15=1 heißt nur noch „nachher“ im Dateinamen. SCHNELLSTART_SPRACHE=de|tr|ar.
L15_VOLL=1 misst zusätzlich den Beispiel-Laden (30 Tage Daten) mit Kühl-Alarm: Ruhezustand ≤ 15 und, getrennt, die Zeki-Blase im Moment des Sprechens.
Schreibt <L15_OUT>/<sprache>_<vorher|nachher>.json und je Bildschirm ein Bild. Exit 1, wenn mit L15=1 ein Bildschirm über 15 liegt.
Aufruf: L15=1 SCHNELLSTART_SPRACHE=tr DURCHLAUF_PORT=8861 python3 tests/laden15.py"""
import asyncio, json, os, pathlib, sys
sys.path.insert(0, str(pathlib.Path(__file__).parent))
import schnellstart, nav_hilfe, regeln
from playwright.async_api import async_playwright

PORT = int(os.environ.get("DURCHLAUF_PORT", "8861")); SP = os.environ.get("SCHNELLSTART_SPRACHE", "de"); AN = os.environ.get("L15") == "1"
OUT = pathlib.Path(os.environ.get("L15_OUT", "/tmp/laden15")); OUT.mkdir(parents=True, exist_ok=True)
ART = "nachher" if AN else "vorher"; VOLL = os.environ.get("L15_VOLL") == "1"
KARTE = "Döner Kebab 7,50\nDürüm 8,00\nLahmacun 5,50\nPommes 3,50\nAyran 2,00"


def regeln_woerter(text, aus):
    import re as _re
    w = [_re.sub(r"^[^\w]+|[^\w]+$", "", x) for x in text.split()]
    return [x for x in w if x and _re.search(r"[^\W\d_]", x) and not _re.search(r"\d", x) and x.lower() not in aus]


async def main():
    srv = schnellstart.server(PORT); fehler = []; erg = {}
    try:
        async with async_playwright() as p:
            b = await p.chromium.launch()
            ctx, pg = await schnellstart.kontext(b, 390, 844, fehler)
            await ctx.add_init_script("try { localStorage.setItem('gc-zeki-erst', JSON.stringify(['muell','kuehl','putzplan','karte','umsatzheute','abschluss'])); } catch (e) {}")
            await schnellstart.schnellstart(pg, PORT, name="Imbiss Test")
            await pg.evaluate("""async (txt) => { const kl = await import('./js/karte_lesen.js'); const s = window.__gastrocalc.stand;
              kl.vorschlaegeUebernehmen(s, kl.vorschlaegeAusText(txt, s).map((v) => ({ ...v, an: true }))); window.__gastrocalc.zeichne(); }""", KARTE)
            stand = await pg.evaluate("window.__gastrocalc.stand"); aus = regeln.ausschluss_fuer(stand, "") | await regeln.datumsnamen(pg)
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
            if VOLL:
                await nav_hilfe.geh(pg, "laeden"); await pg.click('#app [data-a="beispiel-anlegen"]'); await pg.wait_for_timeout(800)
                stand = await pg.evaluate("window.__gastrocalc.stand"); aus2 = regeln.ausschluss_fuer(stand, "") | await regeln.datumsnamen(pg)
                for n in await pg.evaluate("""async () => { const i = await import('./js/i18n.js'); const s = window.__gastrocalc.stand;
                    return [...(s.artikel || []).map((a) => i.artikelText(a.name)), ...(s.gerichte || []).map((g) => i.gerichtText(g.name))]; }"""):
                    for t in (n or "").split():
                        t = t.strip(".,:;!?()[]«»\"'"); aus2.add(t.lower()) if t else None
                aus.clear(); aus.update(aus2)
                for ziel, name in (("start", "voll-heute"), ("muell", "voll-muell"), ("kuehl", "voll-kuehlung"), ("putzplan", "voll-putzen"), ("karte", "voll-karte")):
                    await nav_hilfe.geh(pg, ziel); await messe(name)
                await pg.evaluate("document.querySelectorAll('.zeki-erst').forEach(e => e.remove())")
                await pg.locator('#app [data-a="kl-auf"]').first.click(); await pg.wait_for_selector(".kl-blatt"); await messe("voll-preis-blatt", ".kl-blatt")
                await pg.click('button.kl-x[data-a="kl-zu"]'); await pg.wait_for_timeout(300)
                # Kühl-Alarm: eine Stelle mit 12 °C, ohne Nachkontrolle – auf Heute eingetragen, damit Zeki gleich spricht
                await nav_hilfe.geh(pg, "start"); await pg.wait_for_timeout(8000)
                await pg.evaluate("""async () => { const E = await import('./js/engine.js'); const s = window.__gastrocalc.stand; const k = E.aktiveStellen(s).find((x) => x.art !== 'tk' && x.art !== 'warm') || E.aktiveStellen(s)[0];
                  const r = E.rundgangStarten(s, { einzel: k.id }); E.stationEintragen(r, k, { wert: 12, massnahmen: ['umgeraeumt'] }); E.rundgangAbschliessen(s, r, () => 999, null); window.__gastrocalc.zeichne(); }""")
                await pg.wait_for_timeout(600)
                alarm = await pg.locator('[data-dran="kuehlAlarm"]').count(); print("Kühl-Alarm auf Heute:", alarm)
                blase = " ".join(await pg.locator(".zeki-sprech").all_inner_texts()); bw = len(regeln_woerter(blase, aus))
                erg["zeki-blase"] = {"worte": bw, "wortliste": blase.split(), "scroll": False}; print(f"{SP} {ART} zeki-blase      {bw:3d}  {blase[:120]}")
                await messe("voll-heute-alarm"); await nav_hilfe.geh(pg, "kuehl"); await messe("voll-kuehlung-alarm")
            await ctx.close(); await b.close()
    finally:
        srv.terminate()
    (OUT / f"{SP}_{ART}.json").write_text(json.dumps({"sprache": SP, "art": ART, "bildschirme": erg, "konsolenfehler": fehler}, ensure_ascii=False, indent=1), encoding="utf-8")
    ueber = [k for k, v in erg.items() if v["worte"] > 15 and k != "zeki-blase"]
    print(f"{SP} {ART}: über 15 Wörter: {ueber or 'keiner'} · Konsolenfehler: {len(fehler)}")
    return 1 if ueber or fehler else 0

if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
