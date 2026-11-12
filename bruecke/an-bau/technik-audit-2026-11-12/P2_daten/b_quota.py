import sys; sys.path.insert(0, "_audit"); from b_common import *
with sync_playwright() as p:
    b, ctx = neuer_kontext(p)
    pg = seite(ctx); bereit(pg); pg.wait_for_timeout(1200)
    print("fixture:", fixture_einspielen(pg)); pg.reload(); pg.wait_for_function("() => window.__gastrocalc && window.__gastrocalc.wurzel"); pg.wait_for_timeout(1500)
    cdp = ctx.new_cdp_session(pg); origin = "http://127.0.0.1:8802"
    est = pg.evaluate("navigator.storage.estimate().then(e => e.usage)")
    cdp.send("Storage.overrideQuotaForOrigin", {"origin": origin, "quotaSize": 3 * 1024 * 1024})   # 3 MB gesamt (Belegung vorher: %d)
    pg.wait_for_timeout(300); print("quota nach override:", pg.evaluate("navigator.storage.estimate().then(e => [e.usage, e.quota])"), "usage vorher", est)
    res = pg.evaluate("""async () => {
      const st = await import('/js/store.js'); const w = window.__gastrocalc.wurzel; const b = w.betriebe.find(x => x.tagesnotizen.length > 5) || w.betriebe[0]; w.aktiv = b.id; const lauf = [];
      for (let i = 0; i < 8; i++) { b.tagesnotizen.push({ id: 'q' + i, datum: '2027-01-0' + (2 + i % 6), umsatz: 100 + i, erfasst: new Date().toISOString(), storniert: false, geraet: w.geraet, notiz: 'x'.repeat(1500000) });
        lauf.push(await st.sofortSpeichern(w)); }
      await new Promise(r => setTimeout(r, 400));
      return { lauf, banner: document.querySelector('.warnband')?.textContent || null, verfuegbar: st.speicherVerfuegbar(), n: b.tagesnotizen.length }; }""")
    print("Quota-Lauf:", res)
    cdp.send("Storage.overrideQuotaForOrigin", {"origin": origin}); pg.wait_for_timeout(300)
    res2 = pg.evaluate("""async () => { const st = await import('/js/store.js'); const w = window.__gastrocalc.wurzel; const b = w.betriebe.find(x => x.id === w.aktiv); b.tagesnotizen.push({ id: 'nach-quota', datum: '2027-01-01', umsatz: 1, erfasst: new Date().toISOString(), storniert: false, geraet: w.geraet });
      const ok = await st.sofortSpeichern(w); window.__gastrocalc.zeichne(); await new Promise(r => setTimeout(r, 300)); return { ok, banner: !!document.querySelector('.warnband'), n: b.tagesnotizen.length }; }""")
    print("nach Freigabe:", res2)
    pg.reload(); pg.wait_for_function("() => window.__gastrocalc && window.__gastrocalc.wurzel"); pg.wait_for_timeout(1500)
    print("nach Reload: Eintraege im Speicher:", pg.evaluate("(() => { const w = window.__gastrocalc.wurzel; const b = w.betriebe.find(x => x.id === w.aktiv); return [b.tagesnotizen.length, b.tagesnotizen.filter(n=>String(n.id).startsWith('q')).length, b.tagesnotizen.some(n => n.id==='nach-quota')]; })()"), "Banner:", pg.evaluate("!!document.querySelector('.warnband')"))
    b.close()
