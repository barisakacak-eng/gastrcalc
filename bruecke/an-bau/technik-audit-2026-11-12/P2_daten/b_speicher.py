import sys; sys.path.insert(0, "_audit"); from b_common import *
with sync_playwright() as p:
    b, ctx = neuer_kontext(p); cdp_ctx = ctx
    pg = seite(ctx); bereit(pg); pg.wait_for_timeout(1500)
    print("fixture:", fixture_einspielen(pg)); pg.reload(); pg.wait_for_function("() => window.__gastrocalc && window.__gastrocalc.wurzel"); pg.wait_for_timeout(1500)
    w = pg.evaluate("({n: window.__gastrocalc.wurzel.betriebe.length, persistGefragt: window.__gastrocalc.wurzel.persistGefragt ?? null, modus: window.__gastrocalc.wurzel.modus ?? null})"); print("nach Reload:", w)
    print("persist: aufrufe", pg.evaluate("window.__persistAufrufe"), "| persisted():", pg.evaluate("navigator.storage.persisted()"), "| persistGefragt:", w["persistGefragt"])
    pg.reload(); pg.wait_for_function("() => window.__gastrocalc && window.__gastrocalc.wurzel"); pg.wait_for_timeout(1500)
    print("persist nach 2. Reload: aufrufe", pg.evaluate("window.__persistAufrufe"))
    # ---- Quota
    cdp = ctx.new_cdp_session(pg)
    est = pg.evaluate("navigator.storage.estimate().then(e => ({usage: e.usage, quota: e.quota}))"); print("estimate:", est)
    origin = "http://127.0.0.1:8802"
    cdp.send("Storage.overrideQuotaForOrigin", {"origin": origin, "quotaSize": max(est["usage"] // 1024 // 1024, 1) * 1024 * 1024 // 1 + 0})  # ~ aktuelle Belegung -> kaum Platz
    pg.wait_for_timeout(500)
    res = pg.evaluate("""async () => {
      const st = await import('/js/store.js'); const eng = await import('/js/engine.js'); const w = window.__gastrocalc.wurzel; const b = w.betriebe[0];
      window.__fehler = []; const alt = console.warn; 
      const lauf = [];
      for (let i = 0; i < 6; i++) { // grosse Eintraege bis QuotaExceeded
        b.tagesnotizen.push({ id: 'q' + i + Math.random(), datum: '2027-01-0' + (2 + i % 6), umsatz: 100 + i, erfasst: new Date().toISOString(), storniert: false, geraet: w.geraet, notiz: 'x'.repeat(400000) });
        const ok = await st.sofortSpeichern(w); lauf.push(ok);
      }
      return { lauf, banner: document.querySelector('.warnband')?.textContent || null, verfuegbar: st.speicherVerfuegbar() }; }""")
    print("Quota-Lauf (true=gespeichert):", res)
    pg.wait_for_timeout(500)
    # Quota wieder gross, naechstes Speichern
    cdp.send("Storage.overrideQuotaForOrigin", {"origin": origin})
    res2 = pg.evaluate("""async () => { const st = await import('/js/store.js'); const w = window.__gastrocalc.wurzel; w.betriebe[0].tagesnotizen.push({ id: 'nach-quota', datum: '2027-01-01', umsatz: 1, erfasst: new Date().toISOString(), storniert: false, geraet: w.geraet });
      const ok = await st.sofortSpeichern(w); window.__gastrocalc.zeichne(); await new Promise(r => setTimeout(r, 300)); return { ok, banner: document.querySelector('.warnband')?.textContent || null, imSpeicher: w.betriebe[0].tagesnotizen.length }; }""")
    print("nach Quota-Freigabe:", res2)
    pg.reload(); pg.wait_for_function("() => window.__gastrocalc && window.__gastrocalc.wurzel"); pg.wait_for_timeout(1500)
    print("nach Reload: Tagesnotizen im Speicher:", pg.evaluate("window.__gastrocalc.wurzel.betriebe[0].tagesnotizen.length"), "(Soll mit 'nach-quota': 14+6+1=21 wenn alles klappte); 'nach-quota' da?", pg.evaluate("window.__gastrocalc.wurzel.betriebe[0].tagesnotizen.some(n=>n.id==='nach-quota')"), "| Banner jetzt:", pg.evaluate("document.querySelector('.warnband')?.textContent||null"))
    print("Konsole:", [f[:100] for f in pg.fehler][:5]); b.close()
