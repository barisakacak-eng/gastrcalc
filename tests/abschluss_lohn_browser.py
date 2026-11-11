"""Ausschuss Lauf 3, P1 C4 (Lauf 4, 11.11.2026): Tagesabschluss – Löhne von heute (Umsatz heute: Personen, Stunden, Stundenlohn) müssen nach dem
Abschließen als Zeile „Löhne heute“ sichtbar sein (unter „Mehr“). Aufruf: DURCHLAUF_PORT=8947 python3 tests/abschluss_lohn_browser.py"""
import asyncio, os, sys, pathlib
sys.path.insert(0, str(pathlib.Path(__file__).parent))
import schnellstart, nav_hilfe
from playwright.async_api import async_playwright
PORT = int(os.environ.get("DURCHLAUF_PORT", "8947")); befunde = []
def pruefe(ok, text):
    print(("ok   " if ok else "FEHLT") + " " + text)
    if not ok: befunde.append(text)
async def main():
    srv = schnellstart.server(PORT); fehler = []
    try:
        async with async_playwright() as p:
            b = await p.chromium.launch(); ctx, pg = await schnellstart.kontext(b, 390, 844, fehler)
            await ctx.add_init_script("try { localStorage.setItem('gc-zeki-erst', JSON.stringify(['muell','kuehl','putzplan','karte','umsatzheute','abschluss'])); } catch (e) {}")
            await schnellstart.schnellstart(pg, PORT)
            await nav_hilfe.geh(pg, "start"); await pg.click('#app [data-a="nav"][data-wert="umsatzheute"]'); await pg.wait_for_selector('[data-f="ul-umsatz"]')
            await pg.fill('[data-f="ul-umsatz"]', "1100")
            for f, w in (("ul-team-pers", "2"), ("ul-team-std", "24"), ("ul-team-satz", "12")):
                el = pg.locator(f'[data-f="{f}"]')
                if await el.count(): await el.first.fill(w); await el.first.dispatch_event("change")
            await pg.wait_for_timeout(300)
            knopf = pg.locator('#app [data-a="ul-speichern"], #app [data-a="umsatz-speichern"]')
            if await knopf.count(): await knopf.first.click(); await pg.wait_for_timeout(500)
            lohn = await pg.evaluate("(() => { const s = window.__gastrocalc.stand; return JSON.stringify((s.teamTage || s.lohnTage || []).slice(-1)); })()")
            print("Lohn-Eintrag:", lohn)
            await nav_hilfe.geh(pg, "abschluss"); await pg.wait_for_timeout(500)
            await pg.click('#app [data-a="abschluss-fertig"]'); await pg.wait_for_timeout(700)
            await pg.locator("#app .ab-details summary").click(); await pg.wait_for_timeout(300)
            txt = await pg.locator("#app").inner_text()
            pruefe("Löhne heute" in txt, "nach dem Abschließen steht „Löhne heute“ in der Bilanz")
            await pg.screenshot(path=os.environ.get("BILD", "/tmp/p1c4.png"))
            await b.close()
    finally: srv.terminate()
    pruefe(not fehler, f"Konsole sauber {fehler[:3]}")
    print("ABSCHLUSS-LOHN " + ("OK" if not befunde else f"{len(befunde)} Befunde")); sys.exit(1 if befunde else 0)
asyncio.run(main())
