"""Mitmach-Rundgang (28.10.2026, Konzept 7.4): Messung vorher/nachher.
1) Tipps von Heute bis zur ersten Mengenfrage (Waage „Wie viel … kommt in …?“) – kürzester bekannter Weg.
2) Feste Wörter auf der Laden-Karte (Zählweise wie tests/regeln.py: ohne Gerichtnamen, Zahlen, Einheiten, ohne Leiste unten).
Laden: Schnellstart (Deutsch, Döner) plus sechs Gerichte aus Text, ohne Büro-Code, Rundgang übersprungen.
Start: python3 tests/messung_mitmach.py   (Port DURCHLAUF_PORT, Standard 8797). Ergebnis als JSON auf der Konsole."""
import asyncio, json, os, sys
from playwright.async_api import async_playwright
import schnellstart, nav_hilfe, regeln

PORT = int(os.environ.get("DURCHLAUF_PORT", "8797"))
GERICHTE = """async () => {
  const kl = await import('./js/karte_lesen.js'); const e = await import('./js/engine.js');
  const s = window.__gastrocalc.stand;
  const t = "Döner Kebab ⋯ 7,50\\nDürüm Döner ⋯ 8,00\\nDöner Box ⋯ 7,00\\nDöner-Teller mit Reis ⋯ 12,00\\nLahmacun ⋯ 5,00\\nPommes ⋯ 3,50";
  const st = await import('./js/stamm.js'); st.kostenBetragSetzen(s, 'miete', 'miete', 1500); s.team.personen = 0; // erste Zahl vollständig
  kl.vorschlaegeUebernehmen(s, kl.vorschlaegeAusText(t, s).map(v => ({...v, an: true}))); s.artikel = e.artikelAusGerichten(s);
  window.__gastrocalc.zeichne();
}"""
FRAGE = '[data-a="waage-ok"]'


async def weg(pg, schritte):
    """Tippt die Schritte (Selektoren) nacheinander; zählt nur echte Tipps. Liefert die Zahl oder None."""
    n = 0
    for sel in schritte:
        loc = pg.locator(sel).first
        try: await loc.wait_for(state="visible", timeout=4000)
        except Exception: return None
        await loc.click(); n += 1; await pg.wait_for_timeout(450)
        if await pg.locator(FRAGE).count(): return n
    return n if await pg.locator(FRAGE).count() else None


async def heute(pg):
    await nav_hilfe.zum_laden(pg); await nav_hilfe.geh(pg, "start"); await pg.wait_for_timeout(300)


async def main():
    srv = schnellstart.server(PORT); fehler = []; erg = {}
    try:
        async with async_playwright() as p:
            b = await p.chromium.launch(); ctx, pg = await schnellstart.kontext(b, 390, 844, fehler)
            await schnellstart.schnellstart(pg, PORT)
            await pg.evaluate(GERICHTE); await pg.wait_for_timeout(400)
            stand0 = await pg.evaluate("window.__gastrocalc.stand")
            await heute(pg); await pg.wait_for_timeout(300)
            m0 = await regeln.messen(pg, "#app", regeln.ausschluss_fuer(stand0, "Döner Test"))
            erg["heuteWoerter"] = m0["worte"]; erg["heuteWortliste"] = m0["wortliste"]
            wege = {
                "heute-jetzt": ['#app [data-a="rezept-direkt"][data-ort="heute"]'],
                "karte-zeile": ['.tableiste [data-wert="karte"]', '#app [data-a="kl-rezept"]'],
                "karte-buero-rezepte": ['.tableiste [data-wert="karte"]', '#app [data-a="nav"][data-wert="kartebuero"]', '#app [data-a="bearbeiten"][data-schritt="rezepte"]', '#app [data-a="rezept-auf"]', '#app [data-a="waage-start"]'],
                "menue-buero-rezepte": ['[data-a="menue-auf"]', '#ebene-huelle [data-a="modus"][data-wert="buero"]', '#app [data-a="bearbeiten"][data-schritt="rezepte"]', '#app [data-a="rezept-auf"]', '#app [data-a="waage-start"]'],
            }
            for name, schritte in wege.items():
                await heute(pg); erg[name] = await weg(pg, schritte)
                if await pg.locator('[data-a="waage-weiss-nicht"]').count(): await pg.click('[data-a="waage-weiss-nicht"]'); await pg.wait_for_timeout(300)
                await pg.evaluate("window.__gastrocalc.stand.phase = 'app'; window.__gastrocalc.stand.rueckkehr = null; window.__gastrocalc.zeichne()")
            gefunden = [erg[k] for k in wege if erg[k]]
            erg["kuerzester"] = min(gefunden) if gefunden else None
            await heute(pg); await nav_hilfe.geh(pg, "karte"); await pg.wait_for_timeout(400)
            stand = await pg.evaluate("window.__gastrocalc.stand")
            m = await regeln.messen(pg, "#app", regeln.ausschluss_fuer(stand, "Döner Test"))
            erg["karteWoerter"] = m["worte"]; erg["karteWortliste"] = m["wortliste"]
            erg["karteAbsaetze"] = len(m["absaetze"])
            erg["konsolenfehler"] = fehler
            await ctx.close(); await b.close()
    finally:
        srv.terminate()
    print(json.dumps(erg, ensure_ascii=False, indent=1))


if __name__ == "__main__":
    asyncio.run(main())
