# Durchlauf Punkt 7: Pilot-ähnliche Karte → Rezepte → Döner abwiegen → Familie lernt mit (DE/TR/EN)
import asyncio, json, os, subprocess, sys, pathlib, time
APP = pathlib.Path(__file__).resolve().parent.parent
PORT = int(os.environ.get("DURCHLAUF_PORT", "8765"))  # wie die anderen Durchläufe: eigener Port je Arbeitskopie
from playwright.async_api import async_playwright
sys.path.insert(0, str(APP / "tests")); import nav_hilfe  # Wege durch die drei Ebenen
PORT = int(os.environ.get("DURCHLAUF_PORT", "8765"))
S = "/home/claude/pdfbuild/waage-check/"; os.makedirs(S, exist_ok=True)
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); fehler=[]
        for lang in ["de","tr","en"]:
            pg = await b.new_page(viewport={"width":390,"height":844}); pg.on("pageerror", lambda e: fehler.append(str(e)))
            await pg.goto(f"http://127.0.0.1:{PORT}/"); await pg.wait_for_timeout(800)
            # Laden per Import-Logik direkt anlegen: über die App-Funktionen im Modul-Kontext
            await pg.evaluate("""async (lang) => {
              const st = await import('./js/store.js'); const kl = await import('./js/karte_lesen.js'); const e = await import('./js/engine.js');
              const w = st.leereWurzel(); w.sprache = lang; const s = st.leererBetrieb(); s.phase = 'app'; s.ladenArt = 'doener'; s.betrieb.name = 'Test'; s.betrieb.format='imbiss'; s.betrieb.kuechen=['doener']; s.fuehrung = true; /* 28.10.2026: ohne Rundgang mit Zeki, der sonst über allem liegt */
              const t = "Döner Kebab ⋯ 7,50\\nDöner (groß) mit Salat, Soße ⋯ 8,50\\nDürüm Döner ⋯ 8,00\\nDöner Box ⋯ 7,00\\nDöner-Teller mit Reis oder Pommes ⋯ 12,00\\nPide mit Dönerfleisch ⋯ 10,00";
              kl.vorschlaegeUebernehmen(s, kl.vorschlaegeAusText(t, s).map(v => ({...v, an: true}))); s.artikel = e.artikelAusGerichten(s);
              w.betriebe.push(s); w.aktiv = s.id; await st.sofortSpeichern(w);
            }""", lang)
            await pg.reload(); await pg.wait_for_function("() => window.__gastrocalc && window.__gastrocalc.wurzel", timeout=15000); await pg.wait_for_timeout(300)  # 20.10.2026: auf die App warten statt fester Sekunde (Türkisch lädt länger)
            await nav_hilfe.ins_buero(pg)  # Rezepte wohnen im Büro
            await pg.evaluate("document.querySelectorAll('#app details').forEach(d => d.open = true)"); await pg.click('#app [data-a="bearbeiten"][data-schritt="rezepte"] >> visible=true >> nth=0'); await pg.wait_for_timeout(400)
            await pg.screenshot(path=S+f"w_{lang}_1liste.png")
            await pg.click('[data-a="rezept-auf"]'); await pg.wait_for_timeout(400)
            await pg.screenshot(path=S+f"w_{lang}_2detail.png")
            await pg.click('[data-a="waage-start"]'); await pg.wait_for_timeout(400)
            await pg.screenshot(path=S+f"w_{lang}_3frage.png")
            await pg.click('[data-a="waage-chip"] >> nth=0'); await pg.wait_for_timeout(400)
            while await pg.locator('[data-a="waage-ok"]').count():
                await pg.click('[data-a="waage-ok"]'); await pg.wait_for_timeout(450)
            await pg.screenshot(path=S+f"w_{lang}_4fertig.png")
            gruen = await pg.locator(".tipp.gruen").all_inner_texts(); stempel = await pg.locator(".stempel").all_inner_texts()
            assert len(gruen) >= 1 and "6" in gruen[0], gruen; assert stempel and "✓" in stempel[0], stempel
            print(lang, gruen, stempel)
            await pg.close()
        assert not fehler, fehler; print("Durchlauf Waage ok"); await b.close()
srv = subprocess.Popen([sys.executable, "-m", "http.server", str(PORT), "--bind", "127.0.0.1"], cwd=APP, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
try:
    time.sleep(1); asyncio.run(main())
finally: srv.terminate()
