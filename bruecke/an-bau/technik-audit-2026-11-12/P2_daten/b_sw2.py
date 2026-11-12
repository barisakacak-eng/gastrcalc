import sys, os, subprocess, re, pathlib, shutil; sys.path.insert(0, "_audit"); os.environ["PORT"] = "8861"; from b_common import *
SITE = pathlib.Path("/tmp/claude-0/-home-claude/1541ff5f-3ba8-5391-9a66-723963096393/scratchpad/audit/sw_site")
def bau(marker=None):
    if marker:
        app = SITE / "js/app.js"; s = app.read_text(); s = re.sub(r'\nwindow\.__MARK = "[^"]*";', "", s) + f'\nwindow.__MARK = "{marker}";'; app.write_text(s)
    return subprocess.run([sys.executable, "tools/sw_liste.py"], cwd=SITE, capture_output=True, text=True).stdout.strip()
def setze_mark(marker):
    app = SITE / "js/app.js"; s = app.read_text(); s = re.sub(r'\nwindow\.__MARK = "[^"]*";', "", s) + f'\nwindow.__MARK = "{marker}";'; app.write_text(s)
INFO = "async () => { const reg = await navigator.serviceWorker.getRegistration(); return { mark: window.__MARK, caches: await caches.keys(), wartet: !!reg.waiting, installiert: !!reg.installing, aktivV: reg.active && reg.active.scriptURL.slice(-6) }; }"
print("Bau A:", bau("A"))
with sync_playwright() as p:
    b, ctx = neuer_kontext(p); pa = seite(ctx); bereit(pa); pa.wait_for_function("() => navigator.serviceWorker.controller", timeout=20000); pa.wait_for_timeout(1500)
    print("0) Start:", pa.evaluate(INFO))
    # 1) Update scheitert: eine gelistete Datei fehlt (404)
    print("Bau B:", bau("B")); css = SITE / "css/tokens.css"; sicher = SITE / "css/tokens.css.weg"; css.rename(sicher)
    pa.evaluate("navigator.serviceWorker.getRegistration().then(r => r.update().catch(() => {}))"); pa.wait_for_timeout(5000)
    print("1) Update mit fehlender Datei (404):", pa.evaluate(INFO), "Hinweis sichtbar:", pa.evaluate("!!document.querySelector('[data-a=\"aktualisieren\"]')"))
    sicher.rename(css)
    pa.reload(); pa.wait_for_function("() => window.__gastrocalc && window.__gastrocalc.wurzel"); pa.wait_for_timeout(5000)
    print("   Datei wieder da, nach Neustart der Seite:", pa.evaluate(INFO))
    # 2) Mischstand: sw_liste lief, danach aendert sich app.js noch einmal (wie ein halb verteilter Release) 
    print("Bau C:", bau("C")); setze_mark("C-MISCH")   # Inhalt weicht vom Fingerabdruck INHALT in sw.js ab
    pa.evaluate("navigator.serviceWorker.getRegistration().then(r => r.update())"); pa.wait_for_timeout(5000)
    print("2) Mischstand installiert?", pa.evaluate(INFO))
    pa.evaluate("navigator.serviceWorker.getRegistration().then(r => r.waiting && r.waiting.postMessage('uebernehmen'))"); pa.wait_for_timeout(6000)
    pa.wait_for_function("() => window.__gastrocalc && window.__gastrocalc.wurzel"); print("   nach Uebernahme:", pa.evaluate(INFO), "| sw.js INHALT passt zu Dateien? (SW prueft zur Laufzeit nichts)")
    b.close()
setze_mark("A")
