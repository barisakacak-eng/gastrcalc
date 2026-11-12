import sys, os; sys.path.insert(0, "_audit"); from b_common import *
with sync_playwright() as p:
    b, ctx = neuer_kontext(p); pg = seite(ctx); bereit(pg); pg.wait_for_timeout(1200); print(fixture_einspielen(pg))
    pg.evaluate("""async () => { const st = await import('/js/store.js'); const w = window.__gastrocalc.wurzel; w.aktiv = w.betriebe.find(x => x.tagesnotizen.length > 5).id; await st.sofortSpeichern(w); }""")
    pg.reload(); pg.wait_for_function("() => window.__gastrocalc && window.__gastrocalc.wurzel"); pg.wait_for_timeout(2500)
    print(pg.evaluate("({phase: window.__gastrocalc.stand.phase, ansicht: document.body.innerText.slice(0,150).replace(/\\n/g,' | '), inputs: [...document.querySelectorAll('input')].map(i => i.dataset.f || i.name || i.type).slice(0,8), fassung: null})"))
    print(pg.evaluate("[...document.querySelectorAll('[data-a]')].map(e => e.dataset.a).slice(0,25)"))
    b.close()
