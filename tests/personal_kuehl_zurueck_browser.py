"""Ausschuss Lauf 3, P1 A1 (09.11.2026): Personal-Modus, Kühl-Rundgang – Wert eintragen, Speichern, dann oben „Zurück“-Pfeil.
Die eingetragenen Werte dürfen nicht verloren gehen: Sie stehen im offenen Rundgang und sind nach erneutem Tipp auf Kühlung wieder da.
Aufruf: DURCHLAUF_PORT=8943 python3 tests/personal_kuehl_zurueck_browser.py"""
import asyncio, os, sys, pathlib
sys.path.insert(0, str(pathlib.Path(__file__).parent))
import schnellstart, nav_hilfe
from playwright.async_api import async_playwright
PORT = int(os.environ.get("DURCHLAUF_PORT", "8943")); befunde = []
def pruefe(ok, text):
    print(("ok   " if ok else "FEHLT") + " " + text)
    if not ok: befunde.append(text)
async def main():
    srv = schnellstart.server(PORT); fehler = []
    try:
        async with async_playwright() as p:
            b = await p.chromium.launch(); ctx, pg = await schnellstart.kontext(b, 390, 844, fehler)
            await schnellstart.schnellstart(pg, PORT); await schnellstart.code_setzen(pg, "1234")
            await nav_hilfe.zum_laden(pg); await nav_hilfe.menue(pg)
            await pg.click('#ebene-huelle [data-a="modus"][data-wert="personal"]'); await pg.wait_for_selector(".riesenkachel")
            await pg.locator('.riesenkachel[data-wert="kuehl"], .riesenkachel[data-ziel="kuehl"], .riesenkachel').filter(has_text="Kühl").first.click(); await pg.wait_for_timeout(700)
            feld = pg.locator('[data-f="station-wert"]'); await feld.wait_for(timeout=8000); await feld.fill("4"); await pg.wait_for_timeout(200)
            await pg.click('[data-a="station-speichern"]'); await pg.wait_for_timeout(600)
            vor = await pg.evaluate("(() => { const r = (window.__gastrocalc.stand.rundgaenge || []).find((x) => !x.abgeschlossen); return r ? r.messungen.length : -1; })()")
            pruefe(vor == 1, f"nach Speichern 1 Messung im offenen Rundgang ({vor})")
            await pg.click('.ebene-kopf .zurueckknopf'); await pg.wait_for_timeout(700)
            nach = await pg.evaluate("(() => { const s = window.__gastrocalc.stand; const r = (s.rundgaenge || []).find((x) => !x.abgeschlossen); return { offen: r ? r.messungen.length : -1, fertig: (s.messungen || []).length, alle: (s.rundgaenge || []).map((x) => [!!x.abgeschlossen, x.messungen.length]) }; })()")
            print("nach Zurück:", nach)
            pruefe(nach["offen"] == 1 or nach["fertig"] >= 1, "nach Zurück ist die Messung noch da (offen oder gespeichert)")
            await pg.locator('.riesenkachel').filter(has_text="Kühl").first.click(); await pg.wait_for_timeout(700)
            txt = await pg.locator("#app").inner_text()
            pruefe("4" in txt, "Kühlung zeigt den eingetragenen Wert wieder")
            await pg.screenshot(path=os.environ.get("BILD", "/tmp/p1a1.png"))
            await b.close()
    finally: srv.terminate()
    pruefe(not fehler, f"Konsole sauber {fehler[:3]}")
    print("PERSONAL-KÜHL-ZURÜCK " + ("OK" if not befunde else f"{len(befunde)} Befunde")); sys.exit(1 if befunde else 0)
asyncio.run(main())
