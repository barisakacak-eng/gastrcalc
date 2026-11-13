"""Etappe 10 „Schneller Start“: der erste Start bleibt leicht.
Misst wie tools/startmessung.py (Chromium 390 x 844, unkomprimiert, kalt ungedrosselt / kalt gedrosselt = CPU 4x + langsames 4G / warm):
Anfragen und Bytes bis zum ersten bedienbaren Bild sind HART begrenzt (Obergrenzen unten = gemessener Stand + kleiner Spielraum, damit nichts Schweres
unbemerkt in den Start zurückkehrt); Zeiten dürfen 30 % schwanken (langsame Rechner). Zusätzlich: kein Büro-Modul, keine Fremdsprache und kein
Zeki-Folgenbild vor dem ersten Bild.
Aufruf: DURCHLAUF_PORT=9060 python3 tests/start_browser.py"""
import asyncio, os, sys, pathlib, subprocess, time
sys.path.insert(0, str(pathlib.Path(__file__).parent.parent / "tools"))
import startmessung
from playwright.async_api import async_playwright
APP = pathlib.Path(__file__).parent.parent; PORT = int(os.environ.get("DURCHLAUF_PORT", "9060"))
# Obergrenzen (hart): Anfragen, Bytes (unkomprimiert, nur Antwortkörper), Sekunden (mit 30 % Spielraum)
GRENZE = {"anfragen": 190, "bytes": 3_300_000}
ZEIT = {"kalt": 3.0, "gedrosselt": 18.0, "warm": 5.0}
NICHT_VORM_BILD = ("js/screens/buero.js", "js/screens/ordner.js", "js/bedienung/paket_buero.js", "js/data/namen_mehr.js", "js/data/zeki_mehrsprachig.js", "js/lang/tr.js", "js/lang/en.js", "assets/brand/zeki-klein/")

async def main():
    srv = subprocess.Popen([sys.executable, "-m", "http.server", str(PORT), "--bind", "127.0.0.1"], cwd=str(APP), stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    time.sleep(0.8); befunde = []
    def pruefe(ok, text):
        print(("ok   " if ok else "FEHLT ") + text, flush=True)
        if not ok: befunde.append(text)
    try:
        erg = await startmessung.messen(f"http://127.0.0.1:{PORT}/index.html", ["kalt", "gedrosselt", "warm"])
        k = erg["kalt"]
        pruefe(k["anfragen"] <= GRENZE["anfragen"], f"kalt: {k['anfragen']} Anfragen bis zum ersten bedienbaren Bild (Grenze {GRENZE['anfragen']})")
        pruefe(k["bytes"] <= GRENZE["bytes"], f"kalt: {k['bytes'] / 1e6:.2f} MB bis zum ersten bedienbaren Bild (Grenze {GRENZE['bytes'] / 1e6:.2f} MB)")
        schwer = [n for n in k["liste"] for x in NICHT_VORM_BILD if x in n]
        pruefe(not schwer, "vor dem ersten Bild kein Büro-Modul, keine Fremdsprache, kein Zeki-Folgenbild" + (": " + ", ".join(schwer[:4]) if schwer else ""))
        for name, grenze in ZEIT.items():
            e = erg[name]; pruefe(e["bedienbar_s"] is not None and e["bedienbar_s"] <= grenze * 1.3, f"{name}: bedienbar nach {e['bedienbar_s']} s (Richtwert {grenze} s, 30 % Spielraum)")
    finally: srv.terminate()
    print("Start-Test", "ok" if not befunde else f"FEHLER: {len(befunde)}"); sys.exit(1 if befunde else 0)
asyncio.run(main())
