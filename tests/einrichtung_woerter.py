"""Wörter je Einrichtungsbildschirm messen (28.10.2026) – Deutsch und Türkisch, Handy 390×844.
Läuft den Schnellstart (Sprache → Schloss → Laden → Karte → Kühlung → Geld → Fertig) wie ein Mensch durch und zählt auf jedem Bildschirm
die erklärenden Wörter – mit derselben Zählweise wie tests/regeln.py (sichtbarer fester Text ohne Zahlen, Einheiten, Namen, Antwort-Knöpfe).
Grenze GRENZE_EINRICHTUNG ist eine Setzung vom 28.10.2026; das Skript MELDET Überschreitungen, schlägt aber vorerst NICHT fehl
(nur Bericht, damit wir die Ausgangslage messen). Fehlschlagen nur bei Konsolenfehlern oder wenn ein Bildschirm nicht erreicht wird.
Start: python3 tests/einrichtung_woerter.py   (eigener Webserver, Port DURCHLAUF_PORT oder 8798)"""
import asyncio, os, pathlib, sys
from playwright.async_api import async_playwright
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
import schnellstart as S
import nav_hilfe
import regeln as R

GRENZE_EINRICHTUNG = 60  # Setzung 28.10.2026: höchstens 60 erklärende Wörter je Einrichtungsbildschirm (Meldung bei Überschreitung, noch kein Fehler)
PORT = int(os.environ.get("DURCHLAUF_PORT", "8798"))
SPRACHEN = ["de", "tr"]
SCHRITTE = ["sprache", "schloss", "laden-schnell", "karte-foto", "kuehl-schnell", "geld", "fertig-schnell"]


async def schritt_id(pg):
    return await pg.evaluate("window.__gastrocalc.stand.schrittId")


async def einrichtung(pg, lang):
    """Durchläuft die Einrichtung und liefert {schrittId: Wörter}."""
    mess = {}
    aus = R.ausschluss_fuer({"gerichte": [], "artikel": [], "kuehlstellen": []}, "Döner Test")

    async def messen(id_):
        await pg.wait_for_timeout(300)
        m = await R.messen(pg, "#app", aus)
        mess[id_] = {"woerter": m["worte"], "liste": m["wortliste"]}

    async def weiter(ziel):
        for _ in range(3):
            await pg.click('[data-a="weiter"]')
            for _ in range(30):
                await pg.wait_for_timeout(100)
                if await schritt_id(pg) == ziel: await pg.wait_for_timeout(150); return
        raise AssertionError(f"Schritt {ziel} nicht erreicht ({lang})")

    await pg.goto(f"http://127.0.0.1:{PORT}/index.html"); await pg.wait_for_selector('[data-f="sprache-wahl"]')
    for _ in range(240):  # erster Start: Service Worker abwarten
        if await pg.evaluate("!!navigator.serviceWorker.controller"): break
        await pg.wait_for_timeout(500)
    await pg.select_option('[data-f="sprache-wahl"]', lang); await pg.wait_for_timeout(400)
    await messen("sprache")
    await pg.click(f'[data-a="sprache"][data-wert="{lang}"]')
    for _ in range(150):  # Schloss-Schritt
        if await pg.locator('[data-a="bio-einrichten"]').count(): break
        await pg.wait_for_timeout(120)
    await messen("schloss")
    await weiter("laden-schnell") if await schritt_id(pg) != "laden-schnell" else None
    await pg.wait_for_selector('[data-a="laden-art"]')
    await pg.fill('[data-f="betrieb.name"]', "Döner Test"); await pg.click('[data-a="laden-art"][data-wert="doener"]'); await pg.wait_for_timeout(200)
    await messen("laden-schnell")
    await weiter("karte-foto"); await messen("karte-foto")
    await weiter("kuehl-schnell")
    await pg.click('[data-a="s2-kuehl"][data-wert="kuehlschrank"][data-d="1"]'); await pg.wait_for_timeout(150)
    await pg.click('[data-a="s2-kuehl"][data-wert="tiefkuehler"][data-d="1"]'); await pg.wait_for_timeout(150)
    await messen("kuehl-schnell")
    await weiter("geld"); await messen("geld")
    await weiter("fertig-schnell"); await messen("fertig-schnell")
    return mess


async def main():
    srv = S.server(PORT); fehler = []; ergebnis = {}
    try:
        async with async_playwright() as p:
            b = await p.chromium.launch()
            for lang in SPRACHEN:
                ctx, pg = await S.kontext(b, 390, 844, fehler)
                try:
                    ergebnis[lang] = await einrichtung(pg, lang)
                finally:
                    await ctx.close()
            await b.close()
    finally:
        srv.terminate()
    print(f"Wörter je Einrichtungsbildschirm (390×844), Grenze {GRENZE_EINRICHTUNG} (Setzung 28.10.2026)")
    print(f"  {'Bildschirm':<15}" + "".join(f"{l:>6}" for l in SPRACHEN))
    ueber = []
    for sid in SCHRITTE:
        zeile = f"  {sid:<15}"
        for lang in SPRACHEN:
            n = ergebnis[lang].get(sid, {}).get("woerter")
            zeile += f"{'-' if n is None else n:>6}"
            if n is not None and n > GRENZE_EINRICHTUNG: ueber.append((lang, sid, n))
        print(zeile)
    for lang in SPRACHEN:
        print(f"  Summe {lang}: {sum(v['woerter'] for v in ergebnis[lang].values())} Wörter über {len(ergebnis[lang])} Bildschirme")
    if ueber:
        print(f"MELDUNG: {len(ueber)} Überschreitung(en) der Grenze {GRENZE_EINRICHTUNG} (nur Bericht, kein Fehler):")
        for lang, sid, n in ueber: print(f"  {lang} {sid}: {n} Wörter ({n - GRENZE_EINRICHTUNG} zu viel)")
    else:
        print(f"Keine Überschreitung der Grenze {GRENZE_EINRICHTUNG}.")
    if fehler:
        print("Konsolenfehler:", fehler); sys.exit(1)
    print("EINRICHTUNG-WÖRTER OK (Bericht)")


if __name__ == "__main__":
    asyncio.run(main())
