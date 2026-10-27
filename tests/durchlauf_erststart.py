"""Erststart ohne Neuladen (27.10.2026, Persona-Test): beim allerersten Besuch übernimmt der Service Worker die Seite per
clients.claim(). Das löste „controllerchange“ aus und die App lud einmal komplett neu (Führung begann von vorn, Browser-Tests sahen
kurz kein window.__gastrocalc). Nachweis hier:
  1. erster Start bis „Heute“: genau EIN Ladevorgang (der erste Aufruf), kein zusätzliches Neuladen, Controller ist gesetzt;
  2. echtes Update (neue Fassung in sw.js): kein stilles Neuladen, Hinweis „aktualisieren“ erscheint, ein Tipp → genau ein Neuladen.
Die App wird dafür in ein Arbeitsverzeichnis kopiert, damit sw.js für Schritt 2 geändert werden kann.
Start: python3 tests/durchlauf_erststart.py"""
import asyncio, os, pathlib, re, shutil, subprocess, sys, tempfile, time
from playwright.async_api import async_playwright
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
import schnellstart as S

APP = pathlib.Path(__file__).resolve().parent.parent
PORT = int(os.environ.get("DURCHLAUF_PORT", "8791"))
WEG = {".git", ".claude", "design", "design-handoffs", "docs", "tests", "tools", "bruecke", "node_modules"}


async def main():
    tmp = pathlib.Path(tempfile.mkdtemp(prefix="gc-erststart-")); kopie = tmp / "app"
    shutil.copytree(APP, kopie, ignore=lambda d, n: [x for x in n if pathlib.Path(d) == APP and x in WEG])
    srv = subprocess.Popen([sys.executable, "-m", "http.server", str(PORT), "--bind", "127.0.0.1"], cwd=kopie, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    time.sleep(0.8); fehler = []
    try:
        async with async_playwright() as p:
            b = await p.chromium.launch(); ctx, pg = await S.kontext(b, 390, 844, fehler)
            ladungen = []; pg.on("load", lambda: ladungen.append(time.time()))
            # 1 Erster Start (schnellstart wartet zuerst auf den Controller, dann Einrichtung bis „Heute“)
            await S.schnellstart(pg, PORT)
            await pg.wait_for_timeout(4000)  # das alte Neuladen kam erst, wenn „Heute“ stand
            assert await pg.evaluate("!!navigator.serviceWorker.controller"), "kein Service Worker übernommen"
            assert await pg.evaluate("typeof window.__gastrocalc === 'object' && window.__gastrocalc.stand?.phase === 'app'"), "App nicht bereit"
            assert len(ladungen) == 1, f"erster Start: {len(ladungen) - 1} zusätzliche(s) Neuladen"
            print("1 erster Start: 1 Ladevorgang, 0 Neuladungen – ok")
            # 2 Echtes Update: neue Fassung bereitstellen, Seite fragt nach
            sw = kopie / "sw.js"; text = sw.read_text(encoding="utf-8")
            sw.write_text(re.sub(r'const V = "([^"]+)";', r'const V = "\1-test";', text, count=1), encoding="utf-8")
            await pg.evaluate("navigator.serviceWorker.getRegistration().then(r => r.update())")
            knopf = pg.locator('[data-a="aktualisieren"]')
            for _ in range(100):
                if await knopf.count(): break
                await pg.wait_for_timeout(200)
            assert await knopf.count(), "Update-Hinweis erscheint nicht"
            await pg.wait_for_timeout(1500)
            assert len(ladungen) == 1, "Update hat ohne Tipp neu geladen"
            async with pg.expect_event("load", timeout=20000): await knopf.first.click()
            await pg.wait_for_selector('[data-a="menue-auf"]'); await pg.wait_for_timeout(1500)
            assert len(ladungen) == 2, f"Update: {len(ladungen) - 1} Neuladungen statt 1"
            print("2 Update nach Tipp: genau 1 Neuladen – ok")
            assert not fehler, fehler
            await b.close()
    finally:
        srv.terminate(); shutil.rmtree(tmp, ignore_errors=True)
    print("ERSTSTART OK")

asyncio.run(main())
