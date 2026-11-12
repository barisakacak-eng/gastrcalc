"""Lauf 6, E5 (A, B): Doppeltipp und Uhrsprung im Browser.
A  „Tag abschließen“: 5× Doppeltipp (Abstand 0–30 ms, per Skript, damit der Abstand stimmt) = genau EIN Abschluss. Runde 1 tippt zweimal auf den
   frischen Knopf, die Runden 2–5 öffnen „Tag abschließen“ neu und tippen wieder doppelt (der Tag ist schon abgeschlossen: nur die Bilanz).
B  Uhrsprung: Uhr 22:30 → 07:30 am Folgetag (Berliner Zeit); nach visibilitychange zeigt Heute den neuen Tag ohne Tipp.
   Zweiter Fall: nur der Minuten-Takt (60 s). Dritter Fall: ein Feld mit Text hat den Fokus – nicht neu zeichnen; nach dem Verlassen schon.
Aufruf: DURCHLAUF_PORT=8861 python3 tests/doppeltipp_browser.py"""
import asyncio, os, sys, pathlib, subprocess, time
sys.path.insert(0, str(pathlib.Path(__file__).parent))
import schnellstart, nav_hilfe
from playwright.async_api import async_playwright
APP = pathlib.Path(__file__).parent.parent; PORT = int(os.environ.get("DURCHLAUF_PORT", "8861"))
ABSCHLUESSE = "() => (window.__gastrocalc.stand.abschluesse || []).filter((x) => !x.storniert).length"
ZEKI_AUS = "try { localStorage.setItem('gc-zeki-erst', JSON.stringify(['muell','kuehl','putzplan','karte','umsatzheute','abschluss'])); } catch (e) {}"
DOPPEL = """([sel, gap]) => { const b = document.querySelector(sel); if (!b) return false; b.click(); setTimeout(() => b.click(), gap); return true; }"""

async def main():
    srv = subprocess.Popen([sys.executable, "-m", "http.server", str(PORT), "--bind", "127.0.0.1"], cwd=str(APP), stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    time.sleep(0.8); fehler = []; befunde = []
    def pruefe(ok, text):
        print(("ok   " if ok else "FEHLT ") + text)
        if not ok: befunde.append(text)
    try:
        async with async_playwright() as p:
            b = await p.chromium.launch()
            # ---------- A: Doppeltipp auf „Tag abschließen“ ----------
            ctx, pg = await schnellstart.kontext(b, 390, 844, fehler); await ctx.add_init_script(ZEKI_AUS)
            await schnellstart.schnellstart(pg, PORT)
            vor = await pg.evaluate(ABSCHLUESSE)
            for runde, gap in enumerate([0, 5, 10, 20, 30], 1):
                await nav_hilfe.geh(pg, "start"); await pg.wait_for_timeout(300)
                await nav_hilfe.geh(pg, "abschluss"); await pg.wait_for_selector('[data-a="abschluss-fertig"]'); await pg.wait_for_timeout(700)
                await pg.evaluate(DOPPEL, ['#app [data-a="abschluss-fertig"]', gap]); await pg.wait_for_timeout(900)
                n = await pg.evaluate(ABSCHLUESSE) - vor
                pruefe(n == 1, f"A Runde {runde}: Doppeltipp im Abstand {gap} ms → {n} Abschluss (soll 1)")
                pruefe(await pg.locator(".ab-bilanz").count() == 1, f"A Runde {runde}: Bilanz steht")
            await ctx.close()
            # ---------- B: Uhrsprung ----------
            for fall in ("visibilitychange", "minutentakt", "feld-mit-text"):
                ctx, pg = await schnellstart.kontext(b, 390, 844, fehler); await ctx.add_init_script(ZEKI_AUS)
                await ctx.clock.install(time="2026-11-13T22:30:00+01:00")  # fließt weiter wie echte Zeit; set_system_time springt
                await schnellstart.schnellstart(pg, PORT)
                await nav_hilfe.geh(pg, "start"); await pg.wait_for_selector(".h-datum"); await pg.wait_for_timeout(500)
                kopf0 = (await pg.inner_text(".h-datum")).strip(); print(f"B {fall}: Kopf um 22:30 = {kopf0!r}")
                if fall == "feld-mit-text":  # ein Feld mit Text im Bildschirm: Müll → „Andere“ hat eines; einfacher: ein eigenes Feld einsetzen
                    await pg.evaluate("""() => { const i = document.createElement('input'); i.id = 'testfeld'; i.setAttribute('inputmode','text'); i.value = 'tippe'; document.querySelector('#app').appendChild(i); i.focus(); }""")
                await ctx.clock.set_system_time("2026-11-14T07:30:00+01:00")
                if fall == "visibilitychange": await pg.evaluate("() => document.dispatchEvent(new Event('visibilitychange'))")
                elif fall == "minutentakt": await ctx.clock.run_for(61000)
                else:
                    await pg.evaluate("() => document.dispatchEvent(new Event('visibilitychange'))"); await pg.wait_for_timeout(400)
                    pruefe((await pg.inner_text(".h-datum")).strip() == kopf0, "B Feld mit Text: kein Neuzeichnen, solange es den Fokus hat")
                    pruefe(await pg.locator("#testfeld").count() == 1, "B Feld mit Text: das Feld ist noch da (nicht überzeichnet)")
                    await pg.evaluate("() => document.getElementById('testfeld').blur()")
                await pg.wait_for_timeout(700)
                kopf1 = (await pg.inner_text(".h-datum")).strip(); print(f"B {fall}: Kopf um 07:30 = {kopf1!r}")
                pruefe(kopf1 != kopf0 and kopf1 != "", f"B {fall}: Datumskopf zeigt den neuen Tag ohne Tipp ({kopf0!r} → {kopf1!r})")
                await ctx.close()
            pruefe(not fehler, "keine Konsolenfehler" + (": " + "; ".join(fehler[:3]) if fehler else ""))
            await b.close()
    finally: srv.terminate()
    print("DOPPELTIPP " + ("OK" if not befunde else "; ".join(befunde))); sys.exit(1 if befunde else 0)
asyncio.run(main())
