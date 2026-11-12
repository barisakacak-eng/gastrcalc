import asyncio, sys, os, random, json, time, pathlib, subprocess
HERE = pathlib.Path(__file__).resolve().parent; APP = HERE.parent
sys.path.insert(0, str(APP / "tests"))
from playwright.async_api import async_playwright
import schnellstart, nav_hilfe

LANG = sys.argv[1]; PORT = int(sys.argv[2]); N = int(sys.argv[3]) if len(sys.argv) > 3 else 2000
SEED = int(sys.argv[4]) if len(sys.argv) > 4 else 3
W, H = (int(os.environ.get("MK_W", 390)), int(os.environ.get("MK_H", 844))); TAG = os.environ.get("MK_TAG", "")
os.environ["SCHNELLSTART_SPRACHE"] = LANG
JUNK = ["12,5", "-3", "1e9", " ", "😀🍕", "x" * 500, "0", "999999999999", "1.5.5", "٣٤٥", "", "<b>x</b>", "NaN", "Infinity", "00012", "-0", "1,000.50", "  7  ", "Ünïcödé ß", "9" * 30]
BAD = ["NaN", "undefined", "Infinity", "[object", "null €", "€ null"]
LOG = open(HERE / "log" / f"monkey_{LANG}{TAG}.log", "w")
def log(*a):
    LOG.write(" ".join(str(x) for x in a) + "\n"); LOG.flush()

COLLECT = """() => {
  const out = []; const vw = innerWidth, vh = innerHeight;
  const sel = 'button,a[href],[data-a],input,select,textarea,summary,[role=button],[tabindex]';
  for (const e of document.querySelectorAll(sel)) {
    if (e.disabled) continue;
    const r = e.getBoundingClientRect(); if (r.width < 2 || r.height < 2) continue;
    const cs = getComputedStyle(e); if (cs.visibility === 'hidden' || cs.display === 'none' || cs.pointerEvents === 'none') continue;
    const cx = Math.min(Math.max(r.left + r.width / 2, 1), vw - 1), cy = Math.min(Math.max(r.top + r.height / 2, 1), vh - 1);
    if (r.bottom < 0 || r.top > vh || r.right < 0 || r.left > vw) continue;
    const top = document.elementFromPoint(cx, cy); if (!top || !(e === top || e.contains(top) || top.contains(e))) continue;
    if (/sprache/.test(e.dataset.a || '') || /sprache/.test(e.dataset.f || '')) continue;
    out.push({x: cx, y: cy, tag: e.tagName.toLowerCase(), type: e.type || '', a: e.dataset.a || '', f: e.dataset.f || '', t: (e.innerText || e.value || e.getAttribute('aria-label') || '').slice(0, 30), file: e.type === 'file'});
  }
  return out; }"""

async def main():
    srv = schnellstart.server(PORT)
    rnd = random.Random(SEED)
    fehler = []; funde = []; zaehler = {"console": 0, "pageerror": 0, "leer": 0, "stuck": 0, "bad": 0, "extern": 0}
    letzte = []
    stand_n = [0]
    try:
        async with async_playwright() as p:
            b = await p.chromium.launch()
            ctx, pg = await schnellstart.kontext(b, W, H, fehler)
            # Ereignisse mit Kontext protokollieren
            def on_console(m):
                if m.type in ("error",) and "ERR_TUNNEL" not in m.text:
                    zaehler["console"] += 1; log(f"[#{stand_n[0]}] CONSOLE-{m.type}: {m.text[:300]} | letzte: {letzte[-4:]}")
                elif m.type == "warning":
                    log(f"[#{stand_n[0]}] console-warning: {m.text[:200]}")
            def on_pe(e):
                zaehler["pageerror"] += 1; log(f"[#{stand_n[0]}] PAGEERROR: {str(e)[:400]} | letzte: {letzte[-4:]}")
            pg.on("console", on_console); pg.on("pageerror", on_pe)
            async def kappe(route):
                u = route.request.url
                if u.startswith(f"http://127.0.0.1:{PORT}") or u.startswith("data:") or u.startswith("blob:"): await route.continue_()
                else: zaehler["extern"] += 1; log(f"extern blockiert: {u[:120]}"); await route.abort()
            await ctx.route("**/*", kappe)
            ctx.on("page", lambda np: asyncio.ensure_future(np.close()) if np != pg else None)
            await schnellstart.schnellstart(pg, PORT, name="Monkey Imbiss")
            log("Start ok", LANG)
            async def zustand():
                return await pg.evaluate("""() => { const a = document.getElementById('app'); const t = document.body.innerText || ''; const eh = document.getElementById('ebene-huelle');
                  return {len: t.trim().length, applen: a ? a.innerText.trim().length : -1, html: document.documentElement.lang + '|' + document.documentElement.dir, url: location.pathname + location.hash, text: t.slice(0, 4000), modus: (window.__gastrocalc && window.__gastrocalc.wurzel && window.__gastrocalc.wurzel.modus) || ''}; }""")
            async def foto(name):
                try: await pg.screenshot(path=str(HERE / "fotos" / f"monkey_{LANG}{TAG}_{name}.png"))
                except Exception: pass
            gemeldet = set()
            async def pruefen(i):
                try: z = await zustand()
                except Exception as e:
                    log(f"[#{i}] zustand-Fehler {str(e)[:120]}"); await asyncio.sleep(1); return
                if z["len"] < 3:
                    zaehler["leer"] += 1; log(f"[#{i}] LEERER BILDSCHIRM url={z['url']} letzte={letzte[-6:]}"); await foto(f"leer_{i}")
                    return "leer"
                for w in BAD:
                    import re
                    m_ = [m for m in re.finditer(re.escape(w), z["text"]) if not (m.start() > 0 and z["text"][m.start()-1] in "„\"“'»«‚‘")]
                    if m_:
                        k = (w, z["url"], z["modus"])
                        if k not in gemeldet:
                            gemeldet.add(k); zaehler["bad"] += 1
                            idx = m_[0].start(); log(f"[#{i}] BAD-TEXT '{w}' url={z['url']} modus={z['modus']} ...{z['text'][max(0, idx-60):idx+40]!r} letzte={letzte[-5:]}"); await foto(f"bad_{i}")
                if LANG == "ar" and not z["html"].endswith("rtl") and k_once("rtl"): log(f"[#{i}] A11Y lang/dir bei ar: {z['html']}")
                if z["html"].split("|")[0][:2] != LANG and k_once("lang"+z["html"]): log(f"[#{i}] A11Y lang-Attribut {z['html']} (erwartet {LANG})")
                if not pg.url.startswith(f"http://127.0.0.1:{PORT}"):
                    log(f"[#{i}] EXTERN gelandet {pg.url}"); await pg.goto(f"http://127.0.0.1:{PORT}/index.html")
            once = set()
            def k_once(k):
                if k in once: return False
                once.add(k); return True
            async def sackgasse(i):
                # Rückweg-Test: kann man aus jedem Zustand zum Laden/Heute zurück?
                try:
                    await asyncio.wait_for(nav_hilfe.geh(pg, "start"), 40)
                    ok = await pg.locator('[data-a="menue-auf"]').count() > 0
                    if not ok: raise Exception("kein Menü-Knopf nach geh(start)")
                except Exception as e:
                    gerettet = False
                    for versuch in range(6):
                        n = await pg.evaluate("""() => { const re = /zur(ü|u)ck|geri|رجوع|^ok$|tamam|حسنا|schlie|kapat|إغلاق|‹|<|weg|\\bx\\b|×|✕|später|abbr|iptal|إلغاء/i; for (const e of document.querySelectorAll('button,a,[role=button],summary')) { const r = e.getBoundingClientRect(); if (r.width < 2 || r.height < 2 || r.bottom < 0 || r.top > innerHeight) continue; const t = (e.innerText || e.getAttribute('aria-label') || '').trim(); if (re.test(t) || /blatt-zu|hilfe-zu|abbrechen|zurueck|ob-zurueck/.test(e.dataset.a || '')) { e.click(); return t.slice(0, 20) || e.dataset.a; } } return null; }""")
                        if not n: break
                        await pg.wait_for_timeout(400)
                        try:
                            await asyncio.wait_for(nav_hilfe.geh(pg, "start"), 15); gerettet = True; break
                        except Exception: pass
                    if gerettet: log(f"[#{i}] Ausgang vorhanden (Harness-Hilfe scheiterte nur, Rückweg über sichtbaren Knopf gefunden) letzte={letzte[-3:]}")
                    else:
                        zaehler["stuck"] += 1; log(f"[#{i}] SACKGASSE? geh(start) scheitert: {str(e)[:150]} letzte={letzte[-8:]}"); await foto(f"stuck_{i}")
                        try:
                            await pg.go_back(); await pg.wait_for_timeout(500)
                            await asyncio.wait_for(nav_hilfe.geh(pg, "start"), 20); log(f"   → durch Browser-Zurück gerettet")
                        except Exception:
                            log(f"   → NICHT gerettet, Neuladen"); await pg.reload(); await pg.wait_for_timeout(1500)
            for i in range(N):
                stand_n[0] = i
                try:
                    r = rnd.random()
                    els = await pg.evaluate(COLLECT)
                    if r < 0.03:
                        await pg.go_back(); letzte.append("history.back")
                    elif r < 0.10:
                        x = rnd.randint(5, W - 5); y = rnd.randint(5, H - 5); dx = rnd.choice([-1, 1]) * rnd.randint(60, 250); dy = rnd.choice([-1, 1]) * rnd.randint(60, 400)
                        await pg.evaluate("""([x,y,dx,dy]) => { const t = document.elementFromPoint(x,y)||document.body; const mk=(n,px,py)=>{try{const to=new Touch({identifier:1,target:t,clientX:px,clientY:py});t.dispatchEvent(new TouchEvent(n,{touches:n==='touchend'?[]:[to],changedTouches:[to],bubbles:true,cancelable:true}));}catch(e){}}; mk('touchstart',x,y); mk('touchmove',x+dx/2,y+dy/2); mk('touchmove',x+dx,y+dy); mk('touchend',x+dx,y+dy); window.scrollBy(0,-dy); }""", [x, y, dx, dy]); letzte.append(f"swipe({x},{y},{dx},{dy})")
                    elif r < 0.14:
                        x = rnd.randint(2, W - 2); y = rnd.randint(2, H - 2); await pg.touchscreen.tap(x, y); letzte.append(f"tap@({x},{y})")
                    elif els:
                        # Eingabefelder bevorzugen, wenn sichtbar
                        inputs = [e for e in els if e["tag"] in ("input", "textarea") and e["type"] not in ("file", "checkbox", "radio", "button", "submit", "range", "color")]
                        if inputs and rnd.random() < 0.35:
                            e = rnd.choice(inputs); v = rnd.choice(JUNK)
                            sel = f'{e["tag"]}[data-f="{e["f"]}"]' if e["f"] else None
                            await pg.touchscreen.tap(e["x"], e["y"])
                            try:
                                await pg.keyboard.press("Control+A"); await pg.keyboard.insert_text(v) if v else await pg.keyboard.press("Delete")
                            except Exception: pass
                            if rnd.random() < 0.7: await pg.keyboard.press("Enter") if rnd.random() < 0.3 else await pg.evaluate("document.activeElement && document.activeElement.blur()")
                            letzte.append(f"fill[{e['f'] or e['type']}]={v[:12]!r}")
                        else:
                            e = rnd.choice([x for x in els if not x["file"]] or els)
                            if e["tag"] == "select":
                                opts = await pg.evaluate("([x,y]) => { const s=document.elementFromPoint(x,y); const sl = s && (s.tagName==='SELECT'?s:s.closest('select')); if(!sl) return null; const o=[...sl.options].map(o=>o.value); const v=o[Math.floor(Math.random()*o.length)]; sl.value=v; sl.dispatchEvent(new Event('input',{bubbles:true})); sl.dispatchEvent(new Event('change',{bubbles:true})); return v; }", [e["x"], e["y"]])
                                letzte.append(f"select={opts}")
                            else:
                                await pg.touchscreen.tap(e["x"], e["y"]); letzte.append(f"tap {e['a'] or e['tag']}:{e['t'][:14]!r}")
                                if rnd.random() < 0.08: await pg.touchscreen.tap(e["x"], e["y"]); letzte.append("(doppelt)")
                    else:
                        await pg.keyboard.press("Escape"); letzte.append("escape (keine Ziele)")
                    await pg.wait_for_timeout(rnd.choice([40, 60, 80, 120]))
                    if i % 10 == 0:
                        if await pruefen(i) == "leer": await sackgasse(i)
                    if i % 250 == 249: await sackgasse(i)
                    if len(letzte) > 30: del letzte[:15]
                except Exception as ex:
                    msg = str(ex)[:160]
                    log(f"[#{i}] Harness-Ausnahme {msg}")
                    if "closed" in msg.lower(): log("Seite/Browser geschlossen, Abbruch"); break
            await pruefen(N)
            log("ENDE", json.dumps(zaehler))
            await b.close()
    finally:
        srv.terminate()
    print(LANG, json.dumps(zaehler))
asyncio.run(main())
