import asyncio, sys, os, pathlib, json
from datetime import datetime, timedelta, timezone
from zoneinfo import ZoneInfo
HERE = pathlib.Path(__file__).resolve().parent; sys.path.insert(0, str(HERE.parent / "tests"))
from playwright.async_api import async_playwright
import schnellstart as ss, nav_hilfe
BER = ZoneInfo("Europe/Berlin"); PORT = 8846
res = []
def R(*a):
    l = " ".join(str(x) for x in a); res.append(l); print(l, flush=True)
async def neu(b, start, fehler):
    ctx = await b.new_context(viewport={"width": 390, "height": 844}, device_scale_factor=2, is_mobile=True, has_touch=True, locale="de-DE", timezone_id="Europe/Berlin")
    await ctx.add_init_script(path=str(HERE.parent / "tests" / "hilfe" / "aufklappen.js"))
    pg = await ctx.new_page(); pg.on("pageerror", lambda e: fehler.append(str(e))); pg.on("console", lambda m: fehler.append(m.text) if m.type == "error" and "ERR_TUNNEL" not in m.text else None)
    await pg.clock.install(time=start); await ss.schnellstart(pg, PORT); await nav_hilfe.rundgang_weg(pg)
    await pg.evaluate("() => { try { localStorage.setItem('gc-zeki-erst', JSON.stringify(['muell','kuehl','putzplan','karte','umsatzheute'])); } catch (e) {} }")
    return ctx, pg
async def jetzt(pg): return await pg.evaluate("() => { const d = new Date(); return d.toString().slice(0, 33); }")
async def kopf(pg): return (await pg.inner_text("#app"))[:60].replace("\n", " | ")
async def umsatz_speichern(pg, wert):
    await nav_hilfe.geh(pg, "start"); await pg.click('#app [data-a="nav"][data-wert="umsatzheute"]'); await pg.wait_for_selector('[data-f="ul-umsatz"]')
    await pg.locator('[data-f="ul-umsatz"]').fill(str(wert)); await pg.locator('[data-a="ul-speichern"]').tap(); await pg.wait_for_timeout(500)
    for k in ('[data-a="ul-trotzdem"]', '[data-a="umsatz-ja"]'):
        if await pg.locator(k).count(): await pg.locator(k).first.tap(); await pg.wait_for_timeout(300)
async def notizen(pg): return await pg.evaluate("() => (window.__gastrocalc.stand.tagesnotizen||[]).filter(x=>!x.storniert).map(x=>x.datum+'='+x.umsatz)")
async def main():
    srv = ss.server(PORT); fehler = []
    try:
        async with async_playwright() as p:
            b = await p.chromium.launch()
            # ---- 3a Geschäftstag-Wechsel 03:59 -> 04:01
            ctx, pg = await neu(b, datetime(2026, 11, 12, 3, 57, 0, tzinfo=BER), fehler)
            R("3a Uhr:", await jetzt(pg)); await nav_hilfe.geh(pg, "start"); R("3a Heute-Kopf 03:57:", await kopf(pg))
            await umsatz_speichern(pg, 111); R("3a Umsatz 111 um 03:57 gespeichert ->", await notizen(pg))
            # Umsatz-Bildschirm offen lassen, Uhr über 04:00
            await nav_hilfe.geh(pg, "start"); await pg.click('#app [data-a="nav"][data-wert="umsatzheute"]'); await pg.wait_for_selector('[data-f="ul-umsatz"]')
            txt_vor = (await pg.inner_text("#app"))[:120].replace("\n", " | ")
            await pg.clock.run_for(4 * 60 * 1000); R("3a Uhr:", await jetzt(pg))
            txt_nach = (await pg.inner_text("#app"))[:120].replace("\n", " | ")
            R("3a offener Umsatz-Bildschirm vorher :", txt_vor); R("3a offener Umsatz-Bildschirm nachher:", txt_nach, "(unverändert = Tag nicht umgesprungen)" if txt_vor == txt_nach else "")
            await pg.locator('[data-f="ul-umsatz"]').fill("222"); await pg.locator('[data-a="ul-speichern"]').tap(); await pg.wait_for_timeout(500)
            R("3a Umsatz 222 um 04:01 auf altem offenem Bildschirm ->", await notizen(pg))
            await nav_hilfe.geh(pg, "muell"); await nav_hilfe.geh(pg, "start"); R("3a Heute-Kopf 04:01 nach Tabwechsel:", await kopf(pg))
            await umsatz_speichern(pg, 333); R("3a Umsatz 333 frisch geöffnet um 04:01 ->", await notizen(pg))
            await nav_hilfe.geh(pg, "muell"); await pg.wait_for_timeout(300); await pg.locator('#app [data-a="muell-tipp"]').first.tap(); await pg.wait_for_timeout(300)
            R("3a Müll-Tipp 04:01 Datum:", await pg.evaluate("() => (window.__gastrocalc.stand.schwund||[]).slice(-1).map(x=>x.datum+' '+(x.erfasst||''))"))
            await nav_hilfe.geh(pg, "abschluss"); await pg.wait_for_timeout(300); await pg.locator('[data-a="abschluss-fertig"]').tap(); await pg.wait_for_timeout(500)
            R("3a Abschluss 04:01 Datum:", await pg.evaluate("() => window.__gastrocalc.stand.abschluesse.map(x=>x.datum)"))
            # Home-Bildschirm offen über 04:00 (ohne Neuzeichnen)
            await ctx.close()
            ctx, pg = await neu(b, datetime(2026, 11, 12, 3, 58, 0, tzinfo=BER), fehler); await nav_hilfe.geh(pg, "start")
            vor = await kopf(pg); await pg.clock.run_for(3 * 60 * 1000); await pg.wait_for_timeout(1200); nach = await kopf(pg)
            R("3a Heute offen über 04:00 (ohne Eingriff):", vor, "->", nach)
            await ctx.close()
            # ---- 3b über Mitternacht
            ctx, pg = await neu(b, datetime(2026, 11, 12, 23, 57, 0, tzinfo=BER), fehler); await nav_hilfe.geh(pg, "putzplan"); await pg.wait_for_timeout(400)
            v = (await pg.inner_text("#app"))[:100].replace("\n", " | "); n0 = await pg.evaluate("() => { const s = window.__gastrocalc.stand; return (s.putzlog||[]).length; }")
            await pg.locator('#app [data-a="pp-haken"]').first.tap(); await pg.wait_for_timeout(300)
            R("3b Putzplan 23:57 abgehakt, putzlog Datum:", await pg.evaluate("() => (window.__gastrocalc.stand.putzlog||[]).slice(-1).map(x=>x.datum)"))
            await pg.clock.run_for(5 * 60 * 1000); R("3b Uhr:", await jetzt(pg)); await pg.wait_for_timeout(800)
            R("3b Putzplan nach Mitternacht (offen, ohne Eingriff):", (await pg.inner_text("#app"))[:120].replace("\n", " | "))
            await nav_hilfe.geh(pg, "muell"); await nav_hilfe.geh(pg, "putzplan"); R("3b Putzplan nach Tabwechsel:", (await pg.inner_text("#app"))[:120].replace("\n", " | "))
            await nav_hilfe.geh(pg, "start"); R("3b Heute-Kopf 00:02 (soll noch 12.11. sein):", await kopf(pg))
            await umsatz_speichern(pg, 444); R("3b Umsatz 444 um 00:02 ->", await notizen(pg), "(soll 2026-11-12 sein)")
            await nav_hilfe.geh(pg, "kuehl"); await pg.wait_for_timeout(300); R("3b Kühlung 00:02:", (await pg.inner_text("#app"))[:140].replace("\n", " | "))
            await ctx.close()
            # ---- 3c Datum einen Tag zurück
            ctx, pg = await neu(b, datetime(2026, 11, 12, 12, 0, 0, tzinfo=BER), fehler)
            await umsatz_speichern(pg, 555); await nav_hilfe.geh(pg, "muell"); await pg.locator('#app [data-a="muell-tipp"]').first.tap(); await pg.wait_for_timeout(300)
            await nav_hilfe.geh(pg, "abschluss"); await pg.locator('[data-a="abschluss-fertig"]').tap(); await pg.wait_for_timeout(400)
            R("3c vorher:", await notizen(pg)); n0 = len(fehler)
            await pg.clock.set_system_time(datetime(2026, 11, 11, 12, 0, 0, tzinfo=BER)); await pg.reload(); await pg.wait_for_function("() => window.__gastrocalc && window.__gastrocalc.stand", timeout=20000); await pg.wait_for_timeout(800)
            await nav_hilfe.rundgang_weg(pg)
            R("3c Uhr:", await jetzt(pg)); await nav_hilfe.geh(pg, "start"); R("3c Heute-Kopf (Datum zurück):", await kopf(pg), "| Fehler neu:", len(fehler) - n0)
            for z in ("muell", "kuehl", "putzplan", "karte", "abschluss"):
                await nav_hilfe.geh(pg, z); await pg.wait_for_timeout(250); t = await pg.inner_text("#app"); R(f"3c {z}: Textlänge {len(t)}", "LEER" if len(t) < 5 else "", "NaN" if "NaN" in t or "undefined" in t else "")
            await umsatz_speichern(pg, 666); R("3c Umsatz 666 bei Datum zurück ->", await notizen(pg))
            await nav_hilfe.geh(pg, "abschluss"); await pg.wait_for_timeout(300); await pg.screenshot(path=str(HERE / "fotos" / "uhr_3c_abschluss_datum_zurueck.png"))
            R("3c Abschluss-Text:", (await pg.inner_text("#app"))[:220].replace("\n", " | "))
            await pg.screenshot(path=str(HERE / "fotos" / "uhr_3c_abschluss_datum_zurueck.png"))
            R("3c Fehler gesamt:", len(fehler) - n0, fehler[n0:n0 + 3]); await ctx.close()
            # ---- 3d Zeitumstellung 25.10.2026 (03:00 CEST -> 02:00 CET), UTC 01:00
            utc = lambda h, m: datetime(2026, 10, 25, h, m, tzinfo=timezone.utc)
            ctx, pg = await neu(b, utc(0, 55), fehler)  # 02:55 CEST
            R("3d Uhr:", await jetzt(pg)); await umsatz_speichern(pg, 100); R("3d Umsatz 02:55 CEST ->", await notizen(pg))
            await pg.clock.run_for(10 * 60 * 1000); R("3d Uhr nach 10 min (springt zurück):", await jetzt(pg)); await nav_hilfe.geh(pg, "start"); R("3d Heute-Kopf:", await kopf(pg))
            await nav_hilfe.geh(pg, "kuehl"); await pg.wait_for_timeout(300); R("3d Kühlung:", (await pg.inner_text("#app"))[:120].replace("\n", " | "))
            await nav_hilfe.geh(pg, "muell"); await pg.locator('#app [data-a="muell-tipp"]').first.tap(); await pg.wait_for_timeout(300)
            R("3d Müll-Tipp:", await pg.evaluate("() => (window.__gastrocalc.stand.schwund||[]).slice(-1).map(x=>x.datum+' '+x.erfasst)"))
            # 03:59 CET -> 04:01 CET  (=02:59Z -> 03:01Z)
            await pg.clock.set_system_time(utc(2, 58)); await pg.clock.run_for(1000); R("3d Uhr:", await jetzt(pg)); await nav_hilfe.geh(pg, "start"); R("3d Heute-Kopf 03:58 CET:", await kopf(pg))
            await pg.clock.run_for(3 * 60 * 1000); R("3d Uhr:", await jetzt(pg)); await nav_hilfe.geh(pg, "muell"); await nav_hilfe.geh(pg, "start"); R("3d Heute-Kopf 04:01 CET:", await kopf(pg))
            R("3d Fehler:", len(fehler), fehler[:3]); await ctx.close()
            # 3e Frühjahr 28.3.2027 (02:00 CET -> 03:00 CEST)
            ctx, pg = await neu(b, datetime(2027, 3, 28, 0, 55, tzinfo=timezone.utc), fehler)  # 01:55 CET
            R("3e Uhr:", await jetzt(pg)); await pg.clock.run_for(10 * 60 * 1000); R("3e Uhr (springt vor):", await jetzt(pg)); await nav_hilfe.geh(pg, "start"); R("3e Heute-Kopf:", await kopf(pg))
            await umsatz_speichern(pg, 80); R("3e Umsatz ->", await notizen(pg)); R("3e Fehler:", len(fehler), fehler[:3])
            await b.close()
    finally: srv.terminate()
    (HERE / "log" / "uhr.txt").write_text("\n".join(res))
asyncio.run(main())
