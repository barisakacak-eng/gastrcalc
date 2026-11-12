import sys, os, json; sys.path.insert(0, "_audit"); from b_common import *
THR = float(os.environ.get("THR", "1"))
GEN = """async () => {
  const { jahresStand } = await import('/tests/hilfe/jahr.mjs'); const st = await import('/js/store.js'); const sm = await import('/js/stamm.js'); const sc = await import('/js/schichten.js'); const U = await import('/js/util.js');
  const t0 = performance.now(); const w = jahresStand(730); const b = w.betriebe[0]; const tGen = performance.now() - t0;
  const namen = ['AB','CD','EF','GH','IJ','KL','MN','OP']; b.personen = namen.map(k => ({ id: 'p-' + k, kuerzel: k, aktiv: true, entfernt: false, stundenlohn: 13.5 }));
  const tag = (i) => U.heute(new Date(Date.now() - i * 86400000));
  for (let i = 729; i >= 0; i--) { const d = tag(i); sm.teamTagSetzen(b, d, b.personen.map(p => ({ person: p.id, name: p.kuerzel, stunden: 8, satz: 13.5, von: '10:00', bis: '18:00' })));
    for (const p of b.personen) sc.schichtEintragen(b, { datum: d, person: p.id, von: '10:00', bis: '18:00' }); }
  w.geraet = window.__gastrocalc.wurzel.geraet; const cur = window.__gastrocalc.wurzel; cur.betriebe = w.betriebe; cur.aktiv = b.id; cur.modus = 'laden'; cur.sprache = 'de';
  const counts = {}; for (const j of st.JOURNALE) counts[j] = (b[j] || []).length; counts.schichten = b.schichten.length; counts.teamTage = b.teamTage.length;
  return { tGen: Math.round(tGen), counts, json: JSON.stringify(cur).length }; }"""
FOTOS = """async (n) => { const ab = await import('/js/ablage.js'); const w = window.__gastrocalc.wurzel; const b = w.betriebe[0]; const t0 = performance.now();
  for (let i = 0; i < n; i++) { const buf = new Uint8Array(500 * 1024); for (let k = 0; k < buf.length; k += 65536) crypto.getRandomValues(buf.subarray(k, Math.min(k + 65536, buf.length))); const m = await ab.ablegen(new Blob([buf], { type: 'image/jpeg' }), { name: 'r' + i + '.jpg', zweck: 'rechnung' }); }
  return Math.round(performance.now() - t0); }"""
SPEICHERN = """async () => { const st = await import('/js/store.js'); const w = window.__gastrocalc.wurzel; const r = {}; const b = w.betriebe[0];
  let t = performance.now(); r.erstesSpeichernMs = await st.sofortSpeichern(w).then(() => Math.round(performance.now() - t));
  b.tagesnotizen.push({ id: 'n1', datum: '2027-01-01', umsatz: 5, erfasst: new Date().toISOString(), storniert: false, geraet: w.geraet }); t = performance.now(); await st.sofortSpeichern(w); r.einEintragMs = Math.round(performance.now() - t);
  b.tagesnotizen.push({ id: 'n2', datum: '2027-01-01', umsatz: 6, erfasst: new Date().toISOString(), storniert: false, geraet: w.geraet }); t = performance.now(); await st.sofortSpeichern(w); r.zweiterEintragMs = Math.round(performance.now() - t);
  const e = await navigator.storage.estimate(); r.usageMB = Math.round(e.usage / 1e5) / 10; return r; }"""
GROESSE = """async () => new Promise((res) => { const q = indexedDB.open('gastrocalc'); q.onsuccess = () => { const d = q.result; const tx = d.transaction(['stand', 'teile'], 'readonly'); const out = { kopfKB: 0, teileMB: 0, teile: 0 };
  tx.objectStore('stand').get('kopf').onsuccess = (e) => { const k = e.target.result; out.kopfKB = Math.round((k.wurzel.length + (k.stempel||'').length) / 1024); };
  tx.objectStore('teile').getAll().onsuccess = (e) => { out.teile = e.target.result.length; out.teileMB = Math.round(e.target.result.reduce((s, v) => s + v.t.length, 0) / 1e5) / 10; };
  tx.oncomplete = () => { d.close(); res(out); }; }; })"""
SICHERN = """async () => { const st = await import('/js/store.js'); const w = window.__gastrocalc.wurzel; const r = {}; let t = performance.now();
  const e = await st.exportDatei(w, { mitAblage: false }); r.ohneFotosMs = Math.round(performance.now() - t); r.ohneFotosMB = Math.round(e.blob.size / 1e5) / 10;
  t = performance.now(); const e2 = await st.exportDatei(w, { mitAblage: true }); r.mitFotosMs = Math.round(performance.now() - t); r.mitFotosMB = Math.round(e2.blob.size / 1e5) / 10; r.fotos = e2.dateien;
  t = performance.now(); const ein = await st.importSicherung(e2.blob); r.einlesenMs = Math.round(performance.now() - t); r.pruefsumme = ein.pruefsumme;
  const ziel = st.leereWurzel(); t = performance.now(); st.zusammenfuehren(ziel, ein.wurzel); r.mergeNeuMs = Math.round(performance.now() - t);
  t = performance.now(); st.zusammenfuehren(structuredClone(w), structuredClone(ein.wurzel)); r.mergeGleichMs = Math.round(performance.now() - t); return r; }"""
with sync_playwright() as p:
    b, ctx = neuer_kontext(p)
    pg = seite(ctx); pg.set_default_timeout(900000); bereit(pg); pg.wait_for_timeout(1200)
    pg.evaluate("window.__lt = []; try { new PerformanceObserver(l => { for (const e of l.getEntries()) window.__lt.push(Math.round(e.duration)); }).observe({ entryTypes: ['longtask'] }); } catch (e) {}")
    print("Erzeugung:", pg.evaluate(GEN))
    print(f"--- CPU-Drosselung {THR}x ---")
    cdp = ctx.new_cdp_session(pg); cdp.send("Emulation.setCPUThrottlingRate", {"rate": THR})
    pg.evaluate("window.__lt = []")
    print("Speichern:", pg.evaluate(SPEICHERN)); print("Langaufgaben beim Speichern (ms):", pg.evaluate("window.__lt.slice(0,12)"))
    cdp.send("Emulation.setCPUThrottlingRate", {"rate": 1}); print("Speichergroesse in IDB:", pg.evaluate(GROESSE)); cdp.send("Emulation.setCPUThrottlingRate", {"rate": THR})
    cdp.send("Emulation.setCPUThrottlingRate", {"rate": 1}); print("Fotos anlegen (200 x 0,5 MB):", pg.evaluate(FOTOS, 200), "ms"); cdp.send("Emulation.setCPUThrottlingRate", {"rate": THR})
    pg.evaluate("window.__lt = []"); print("Sicherung/Einlesen:", pg.evaluate(SICHERN)); print("Langaufgaben (ms):", pg.evaluate("window.__lt.slice(0,12)"))
    # Ladezeit nach Neustart
    for i in range(2):
        t0 = time.time(); pg.reload(); pg.wait_for_function("() => window.__gastrocalc && window.__gastrocalc.wurzel", timeout=900000)
        t1 = time.time(); pg.wait_for_selector('[data-a="menue-auf"], .kachel', timeout=900000); t2 = time.time()
        print(f"Neustart {i+1}: Daten da nach {t1-t0:.1f}s, erster Bildschirm nach {t2-t0:.1f}s; Langaufgaben:", pg.evaluate("window.__lt?.slice(0,8) ?? null"), "Eintraege:", pg.evaluate("window.__gastrocalc.wurzel.betriebe[0].schwund.length"))
    b.close()
