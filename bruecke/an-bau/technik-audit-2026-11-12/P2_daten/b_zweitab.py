import sys; sys.path.insert(0, "_audit"); from b_common import *
ADD = """async (spec) => { const st = await import('/js/store.js'); const sm = await import('/js/stamm.js'); const w = window.__gastrocalc.wurzel; const b = w.betriebe.find(x => x.tagesnotizen.length > 5); w.aktiv = b.id;
  b.tagesnotizen.push({ id: spec.id, datum: spec.datum, umsatz: spec.umsatz, erfasst: new Date().toISOString(), storniert: false, geraet: w.geraet });
  if (spec.team) sm.teamTagSetzen(b, spec.datum, [{ person: null, name: 'Aushilfe', stunden: 6, satz: 13 }]);
  const ok = await st.sofortSpeichern(w); await new Promise(r => setTimeout(r, 600)); return { ok, gen: st._generation() }; }"""
LIES = """() => { const w = window.__gastrocalc.wurzel; const b = w.betriebe.find(x => x.tagesnotizen.length > 5); return { tn: b.tagesnotizen.filter(n => /^t[12]-/.test(n.id)).map(n => n.id), team: (b.teamTage||[]).map(x => x.datum), hinweis: document.querySelector('.warnband')?.textContent || null }; }"""
with sync_playwright() as p:
    br, ctx = neuer_kontext(p)
    p1 = seite(ctx); bereit(p1); p1.wait_for_timeout(1200); print("fixture:", fixture_einspielen(p1))
    p1.reload(); p1.wait_for_function("() => window.__gastrocalc && window.__gastrocalc.wurzel"); p1.wait_for_timeout(1500)
    p2 = seite(ctx); bereit(p2); p2.wait_for_timeout(1500)
    print("Tab1 schreibt t1-a:", p1.evaluate(ADD, {"id": "t1-a", "datum": "2027-01-02", "umsatz": 111, "team": False}))
    print("Tab2 (veraltet) schreibt t2-a + Mitarbeiterstunden:", p2.evaluate(ADD, {"id": "t2-a", "datum": "2027-01-03", "umsatz": 222, "team": True}))
    print("Tab2 danach:", p2.evaluate(LIES))
    p3 = seite(ctx); bereit(p3); p3.wait_for_timeout(1500); print("Wahrheit in IndexedDB (neuer Tab):", p3.evaluate(LIES))
    # Gegenprobe: Tab1 schreibt JETZT mit Mitarbeiterstunden, obwohl Tab2/Tab3 inzwischen neuer ist
    p3.evaluate(ADD, {"id": "t1-b", "datum": "2027-01-04", "umsatz": 5, "team": False})
    print("Tab1 (jetzt veraltet) schreibt t1-c + Mitarbeiterstunden:", p1.evaluate(ADD, {"id": "t1-c", "datum": "2027-01-05", "umsatz": 7, "team": True}))
    p4 = seite(ctx); bereit(p4); p4.wait_for_timeout(1200); print("IndexedDB danach:", p4.evaluate("""() => { const w = window.__gastrocalc.wurzel; const b = w.betriebe.find(x => x.tagesnotizen.length > 5); return { tn: b.tagesnotizen.filter(n => /^t[0-9]-/.test(n.id)).map(n => n.id), team: (b.teamTage||[]).map(x => x.datum) }; }"""))
    # ---- versionchange: ein Fenster hebt die DB-Version (neuere Fassung)
    r = p4.evaluate("""() => new Promise(res => { const q = indexedDB.open('gastrocalc', 3); q.onupgradeneeded = () => {}; q.onsuccess = () => { q.result.close(); res('v3 geoeffnet'); }; q.onerror = () => res('Fehler ' + q.error); q.onblocked = () => res('blockiert'); })""")
    print("Fenster 4 hebt DB auf v3:", r); p1.wait_for_timeout(500)
    print("Tab1 nach versionchange:", p1.evaluate("""async () => { const st = await import('/js/store.js'); const w = window.__gastrocalc.wurzel; const b = w.betriebe.find(x => x.tagesnotizen.length > 5); b.tagesnotizen.push({ id: 'nach-vc', datum: '2027-01-06', umsatz: 9, erfasst: new Date().toISOString(), storniert: false, geraet: w.geraet }); const ok = await st.sofortSpeichern(w); window.__gastrocalc.zeichne(); await new Promise(r => setTimeout(r, 200)); return { gespeichert: ok, verfuegbar: st.speicherVerfuegbar(), banner: document.querySelector('.warnband')?.textContent || null }; }"""))
    # alte Fassung (v2-Code) trifft auf DB v3
    p5 = seite(ctx, uhr=True); p5.goto(URL); p5.wait_for_timeout(2500); print("Neuer Tab mit v2-Code gegen v3-DB: Text:", p5.evaluate("document.body.innerText.slice(0,200).replace(/\\n/g,' | ')"))
    br.close()
