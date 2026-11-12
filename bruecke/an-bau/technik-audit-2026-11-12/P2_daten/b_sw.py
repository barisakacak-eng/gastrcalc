import sys, os, subprocess, re, pathlib; sys.path.insert(0, "_audit"); os.environ["PORT"] = "8861"; from b_common import *
SITE = pathlib.Path("/tmp/claude-0/-home-claude/1541ff5f-3ba8-5391-9a66-723963096393/scratchpad/audit/sw_site")
def neu_bauen(marker):
    app = SITE / "js/app.js"; s = app.read_text(); s = re.sub(r'\nwindow\.__MARK = "[^"]*";', "", s) + f'\nwindow.__MARK = "{marker}";'; app.write_text(s)
    return subprocess.run([sys.executable, "tools/sw_liste.py"], cwd=SITE, capture_output=True, text=True).stdout.strip()
print("Bau ALT:", neu_bauen("ALT"))
INFO = """async () => { const st = await import('/js/store.js'); const f = (await import('/js/fassung.js?x=' + Math.random())).FASSUNG; const reg = await navigator.serviceWorker.getRegistration();
  return { mark: window.__MARK, fassungSeite: st.APP_FASSUNG, fassungCacheJetzt: f, caches: await caches.keys(), aktiv: !!reg.active, wartet: !!reg.waiting, installiert: !!reg.installing }; }"""
with sync_playwright() as p:
    b, ctx = neuer_kontext(p)
    pa = seite(ctx); bereit(pa); pa.wait_for_function("() => navigator.serviceWorker.controller", timeout=20000); pa.wait_for_timeout(1500)
    fixture_einspielen(pa); pa.evaluate("""async () => { const st = await import('/js/store.js'); const w = window.__gastrocalc.wurzel; w.aktiv = w.betriebe.find(x => x.tagesnotizen.length > 5).id; await st.sofortSpeichern(w); }"""); pa.reload(); pa.wait_for_function("() => window.__gastrocalc && window.__gastrocalc.wurzel"); pa.wait_for_timeout(2000)
    print("1) Start mit ALT:", pa.evaluate(INFO))
    print("Bau NEU:", neu_bauen("NEU"))
    pa.evaluate("navigator.serviceWorker.getRegistration().then(r => r.update())"); pa.wait_for_timeout(6000)
    print("2) nach Update-Pruefung (Seite A laeuft weiter):", pa.evaluate(INFO))
    print("   Hinweis 'aktualisieren' sichtbar:", pa.evaluate("!!document.querySelector('[data-a=\"aktualisieren\"]')"))
    # 3) zweiter Tab (alte Fassung aus dem Cache?) 
    pb = seite(ctx); pb.goto(URL); pb.wait_for_function("() => window.__gastrocalc && window.__gastrocalc.wurzel"); pb.wait_for_timeout(1500)
    print("3) neuer Tab B waehrend NEU wartet:", pb.evaluate(INFO))
    # 4) Tab A: Eingabe offen (Fokus), Tab B uebernimmt Update
    pa.evaluate("window.__vorher = 'A-lebt'; const i = document.createElement('input'); i.id='probe'; document.body.appendChild(i); i.focus(); i.value = 'halb getippt';")
    pb.evaluate("navigator.serviceWorker.getRegistration().then(r => r.waiting && r.waiting.postMessage('uebernehmen'))"); pb.wait_for_timeout(5000)
    print("4a) Tab A mitten in der Eingabe, Update kommt:", pa.evaluate("({ lebt: window.__vorher, eingabe: document.getElementById('probe')?.value, url: location.href })"))
    print("    Tab A Info (Seite alt, Cache neu?):", pa.evaluate(INFO))
    print("    Tab B Info:", pb.evaluate(INFO))
    pa.evaluate("document.getElementById('probe').remove(); document.activeElement.blur()"); pa.wait_for_timeout(5000)
    print("4b) nach Ende der Eingabe: Tab A neu geladen?", pa.evaluate("({ lebt: window.__vorher || null, mark: window.__MARK })"))
    print("Konsole A:", [f[:100] for f in pa.fehler][:4]); b.close()
