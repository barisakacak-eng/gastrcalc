"""Lauf 3, Phase 6 (09.11.2026): Frist-Erinnerung auf Heute. Uhr 07.12.2026 16:00 Berlin, USt monatlich → Zeki sagt einmal
„ESt-Vorauszahlung, USt-Voranmeldung am 10.12. fällig.“; beim zweiten Besuch am selben Tag nicht mehr. Ruhezustand ≤ 15 Wörter bleibt (Blase ≈ 7 s).
Aufruf: DURCHLAUF_PORT=8944 python3 tests/frist_heute_browser.py"""
import asyncio, os, sys, pathlib
from datetime import datetime
from zoneinfo import ZoneInfo
sys.path.insert(0, str(pathlib.Path(__file__).parent))
import schnellstart, nav_hilfe
from playwright.async_api import async_playwright
PORT = int(os.environ.get("DURCHLAUF_PORT", "8944")); befunde = []
def pruefe(ok, text):
    print(("ok   " if ok else "FEHLT") + " " + text)
    if not ok: befunde.append(text)
async def main():
    srv = schnellstart.server(PORT); fehler = []
    try:
        async with async_playwright() as p:
            b = await p.chromium.launch()
            ctx = await b.new_context(viewport={"width": 390, "height": 844}, is_mobile=True, has_touch=True, locale="de-DE", timezone_id="Europe/Berlin")
            pg = await ctx.new_page(); pg.on("pageerror", lambda e: fehler.append(str(e)))
            await pg.clock.install(time=datetime(2026, 12, 7, 16, 0, tzinfo=ZoneInfo("Europe/Berlin")))
            await schnellstart.schnellstart(pg, PORT)
            await pg.evaluate("() => { const s = window.__gastrocalc.stand; s.betrieb.ustRhythmus = 'monat'; window.__gastrocalc.zeichne(); }")
            await nav_hilfe.geh(pg, "muell"); await nav_hilfe.geh(pg, "start"); await pg.wait_for_timeout(900)
            txt = " ".join(await pg.locator(".zeki-sprech").all_inner_texts())
            print("Zeki:", txt)
            pruefe("10.12." in txt and "fällig" in txt, "Zeki nennt den Termin 10.12.")
            await pg.clock.run_for(8000); await nav_hilfe.geh(pg, "muell"); await nav_hilfe.geh(pg, "start"); await pg.wait_for_timeout(900)
            txt2 = " ".join(await pg.locator(".zeki-sprech").all_inner_texts())
            pruefe("fällig" not in txt2, f"zweiter Besuch am selben Tag ohne Erinnerung ({txt2[:60]})")
            await b.close()
    finally: srv.terminate()
    pruefe(not fehler, f"Konsole sauber {fehler[:3]}")
    print("FRIST-HEUTE " + ("OK" if not befunde else f"{len(befunde)} Befunde")); sys.exit(1 if befunde else 0)
asyncio.run(main())
