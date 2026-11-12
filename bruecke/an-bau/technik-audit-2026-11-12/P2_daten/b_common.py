import base64, json, pathlib, sys, time
from playwright.sync_api import sync_playwright
APP = pathlib.Path(__file__).resolve().parent.parent
import os
PORT = os.environ.get("PORT", "8802")
URL = f"http://127.0.0.1:{PORT}/index.html"
FIX = APP / "tests/fixtures/pruefstand/pruefstand_sicherung.zip"
JETZT = "2027-01-01T20:00:00+01:00"
INIT_PERSIST = """
window.__persistAufrufe = []; try { const s = navigator.storage; const p = s.persist.bind(s); s.persist = async () => { const r = await p(); window.__persistAufrufe.push(r); return r; }; } catch (e) {}
"""
def neuer_kontext(p, **kw):
    b = p.chromium.launch(args=["--no-sandbox"])
    ctx = b.new_context(viewport={"width": 390, "height": 844}, locale="de-DE", timezone_id="Europe/Berlin", service_workers="allow", **kw)
    ctx.add_init_script(INIT_PERSIST)
    return b, ctx
def seite(ctx, uhr=True):
    pg = ctx.new_page(); fehler = []
    pg.on("console", lambda m: fehler.append(m.text) if m.type == "error" else None); pg.on("pageerror", lambda e: fehler.append("PAGEERROR " + str(e)))
    if uhr: pg.clock.install(time=JETZT)
    pg.fehler = fehler
    return pg
def bereit(pg):
    pg.goto(URL); pg.wait_for_function("() => window.__gastrocalc && window.__gastrocalc.wurzel", timeout=20000)
def fixture_einspielen(pg):
    b64 = base64.b64encode(FIX.read_bytes()).decode()
    return pg.evaluate("""async (b64) => {
      const st = await import('/js/store.js'); const bytes = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
      const r = await st.importSicherung(new Blob([bytes])); const w = window.__gastrocalc.wurzel;
      const z = st.zusammenfuehren(w, r.wurzel); await st.sofortSpeichern(w); return { neu: z.neu, ersetzt: z.ersetzt, laeden: w.betriebe.length, pruefsumme: r.pruefsumme }; }""", b64)
