import sys; sys.path.insert(0, "_audit"); from b_common import *
SIM = """
window.__quotaVoll = false; const put = IDBObjectStore.prototype.put;
IDBObjectStore.prototype.put = function (...a) { const r = put.apply(this, a); if (window.__quotaVoll) { try { this.transaction.abort(); } catch (e) {} } return r; };
"""
with sync_playwright() as p:
    b, ctx = neuer_kontext(p); ctx.add_init_script(SIM)
    pg = seite(ctx); bereit(pg); pg.wait_for_timeout(1200)
    print("fixture:", fixture_einspielen(pg)); pg.reload(); pg.wait_for_function("() => window.__gastrocalc && window.__gastrocalc.wurzel"); pg.wait_for_timeout(1500)
    pg.evaluate("""async () => { const st = await import('/js/store.js'); const w = window.__gastrocalc.wurzel; w.aktiv = w.betriebe.find(x => x.tagesnotizen.length > 5).id; await st.sofortSpeichern(w); }""")
    res = pg.evaluate("""async () => {
      const st = await import('/js/store.js'); const w = window.__gastrocalc.wurzel; const b = w.betriebe.find(x => x.id === w.aktiv); const out = {};
      b.tagesnotizen.push({ id: 'ok-1', datum: '2027-01-02', umsatz: 11, erfasst: new Date().toISOString(), storniert: false, geraet: w.geraet }); out.vorher = await st.sofortSpeichern(w);
      window.__quotaVoll = true;
      b.tagesnotizen.push({ id: 'voll-1', datum: '2027-01-03', umsatz: 22, erfasst: new Date().toISOString(), storniert: false, geraet: w.geraet }); out.voll1 = await st.sofortSpeichern(w);
      b.tagesnotizen.push({ id: 'voll-2', datum: '2027-01-04', umsatz: 33, erfasst: new Date().toISOString(), storniert: false, geraet: w.geraet }); out.voll2 = await st.sofortSpeichern(w);
      await new Promise(r => setTimeout(r, 500)); out.banner = document.querySelector('.warnband')?.textContent || null; out.toast = document.body.innerText.includes('Speichern fehlgeschlagen');
      window.__quotaVoll = false;   // Platz wieder frei
      out.nachFreigabe = await st.sofortSpeichern(w); window.__gastrocalc.zeichne(); await new Promise(r => setTimeout(r, 300)); out.bannerNachFreigabe = !!document.querySelector('.warnband'); return out; }""")
    print("Quota (Abort simuliert):", res)
    pg.reload(); pg.wait_for_function("() => window.__gastrocalc && window.__gastrocalc.wurzel"); pg.wait_for_timeout(1500)
    print("nach Reload:", pg.evaluate("(() => { const w = window.__gastrocalc.wurzel; const b = w.betriebe.find(x => x.tagesnotizen.some(n=>n.id==='ok-1')); return b ? b.tagesnotizen.filter(n=>/^(ok|voll)-/.test(n.id)).map(n=>n.id) : 'Laden weg'; })()"), "Banner nach Reload:", pg.evaluate("!!document.querySelector('.warnband')"))
    # Variante: Quota bleibt voll, App wird geschlossen -> was ist weg?
    pg.evaluate("""async () => { const st = await import('/js/store.js'); const w = window.__gastrocalc.wurzel; const b = w.betriebe.find(x => x.id === w.aktiv); window.__quotaVoll = true; b.tagesnotizen.push({ id: 'verloren-1', datum: '2027-01-05', umsatz: 44, erfasst: new Date().toISOString(), storniert: false, geraet: w.geraet }); await st.sofortSpeichern(w); }""")
    pg.wait_for_timeout(300); print("Banner bei vollem Speicher (nach Reload-Zustand):", pg.evaluate("document.querySelector('.warnband')?.textContent||null"))
    print("Konsole:", [f[:90] for f in pg.fehler][:4]); b.close()
