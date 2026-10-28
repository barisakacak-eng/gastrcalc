"""Mitmach-Rundgang (28.10.2026): Browser-Durchlauf 390×844.
1) Voller Rundgang (de und tr): jede Station antippen wie ein Mensch, „Überspringen“ ≥ 44 px auf jeder Station, Stoppuhr ≤ 3 min,
   am Ende „Nein, war Übung“ → gespeicherter Stand byte-gleich wie vorher (JSON, ohne Merkzeichen fuehrung und Zeki-Verlauf).
2) Überspringen auf jeder Station, die sich direkt anspringen lässt → (ohne Rezept) Fenster „Achtung Chef“ → „Später“ → Station 16.
   Station 16: kein Überspringen, Escape und Zurück schließen nicht, „Verstanden“ erst nach 3 Sekunden.
3) Abbruch und Fortsetzen: Neuladen mitten im Rundgang → Übungseintrag ist weg, der Rundgang geht an der Station weiter.
4) Station 9 mit echtem Rezept → „Behalten?“ → Ja → das Rezept bleibt, alles andere nicht.
Bilder (BILDER=1): Stationen 0, 2, 8, 9, 11, 12, 16, Überspring-Fenster, je de und tr → .claude/tmp/bildpaket/mitmach/ (BILDER_ORDNER setzt den Ordner).
Start: python3 tests/durchlauf_mitmach.py   (Port DURCHLAUF_PORT, Standard 8797)"""
import asyncio, json, os, time
from playwright.async_api import async_playwright
import schnellstart, nav_hilfe

PORT = int(os.environ.get("DURCHLAUF_PORT", "8797"))
BILDER = os.environ.get("BILDER") == "1"
ORDNER = os.environ.get("BILDER_ORDNER", str(schnellstart.APP.parent.parent / "tmp" / "bildpaket" / "mitmach"))
GERICHTE = """async () => {
  const kl = await import('./js/karte_lesen.js'); const e = await import('./js/engine.js'); const st = await import('./js/stamm.js');
  const s = window.__gastrocalc.stand;
  st.kostenBetragSetzen(s, 'miete', 'miete', 1500); s.team.personen = 0;
  const t = "Döner Kebab ⋯ 7,50\\nDürüm Döner ⋯ 8,00\\nDöner Box ⋯ 7,00\\nDöner-Teller mit Reis ⋯ 12,00\\nLahmacun ⋯ 5,00\\nPommes ⋯ 3,50";
  kl.vorschlaegeUebernehmen(s, kl.vorschlaegeAusText(t, s).map(v => ({...v, an: true}))); s.artikel = e.artikelAusGerichten(s);
  delete s.fuehrung;
  await (await import('./js/store.js')).sofortSpeichern(window.__gastrocalc.wurzel);
}"""
# Vergleich: der ganze gespeicherte Stand, nur das Merkzeichen „Rundgang gesehen“ und der Zeki-Verlauf (nur angehängt) zählen nicht
STAND = """() => { const w = structuredClone(window.__gastrocalc.wurzel); for (const b of w.betriebe) { delete b.fuehrung; delete b.zekiLog; } return JSON.stringify(w); }"""
BILD_STATIONEN = {"0": "00_station0", "2": "02_station2", "8": "08_station8", "9": "09_station9", "11": "11_station11", "12": "12_station12", "16": "16_station16", "achtung": "17_ueberspring_fenster"}
# Was der Mensch je Schritt antippt (Station, Schritt) – sonst die Mitte des Lichtkegels
TIPP = {("3", "0"): '#app [data-f="ul-team-pers"]', ("6", "2"): '#app [data-a="station-speichern"]', ("9", "2"): '[data-a="waage-ok"]',
        ("2", "1"): '#app [data-f="ul-umsatz"]', ("11", "2"): '#app [data-f="ordner-mail:steuer"]', ("4", "1"): '#app [data-a="muell-tipp"]'}


async def neu(b, fehler, sprache="de"):
    ctx, pg = await schnellstart.kontext(b, 390, 844, fehler)
    await schnellstart.schnellstart(pg, PORT)
    if sprache != "de":
        await nav_hilfe.menue(pg); await pg.click('#ebene-huelle [data-a="blatt-sprache"]'); await pg.click(f'#ebene-huelle [data-a="sprache"][data-wert="{sprache}"]'); await pg.wait_for_timeout(1500)
    await pg.evaluate(GERICHTE)
    await ctx.add_init_script("window.__gcFuehrungZeigen = true")
    return ctx, pg


async def neu_laden(pg):
    await pg.reload(); await pg.wait_for_function("() => window.__gastrocalc && window.__gastrocalc.wurzel", timeout=15000)


async def station(pg):
    return await pg.evaluate("() => { const h = document.querySelector('.rg-huelle'); return h ? [h.dataset.station || '', h.dataset.schritt || ''] : null; }")


async def warte_huelle(pg):
    await pg.wait_for_selector(".rg-huelle[data-station]", timeout=8000)


async def ueberspringen_pruefen(pg):
    k = pg.locator('.rg-huelle [data-rg="ueberspringen"]')
    if not await k.count(): return False
    box = await k.bounding_box(); assert box["height"] >= 44 and box["width"] >= 44, box
    return True


async def bild(pg, name, sprache):
    if BILDER:
        os.makedirs(ORDNER, exist_ok=True); await pg.screenshot(path=f"{ORDNER}/{name}_{sprache}.png")


async def tippen(pg, st):
    """Einen Schritt erledigen wie ein Mensch. Gibt False zurück, wenn nichts zu tun war (z. B. Zeki lobt gerade)."""
    if st and st[1] == "lob": return False
    for sel in ('.rg-huelle [data-rg="weiter"]', '.rg-huelle [data-rg="ja"]', '.rg-huelle [data-rg="verwerfen"]'):
        if await pg.locator(sel).count() and await pg.locator(sel).is_visible():
            await pg.click(sel); return True
    sel = TIPP.get(tuple(st))
    if sel and await pg.locator(sel).count():
        await pg.locator(sel).first.click(); return True
    if await pg.locator(".rg-huelle .rg-loch").count():
        r = await pg.locator(".rg-huelle .rg-loch").bounding_box()
        if r and r["width"] > 0: await pg.mouse.click(r["x"] + r["width"] / 2, r["y"] + r["height"] / 2); return True
    return False


async def voller_rundgang(b, fehler, sprache):
    ctx, pg = await neu(b, fehler, sprache)
    try:
        await neu_laden(pg); await warte_huelle(pg); await pg.wait_for_timeout(300)
        vorher = await pg.evaluate(STAND)  # Station 0: der Stand ist gesichert (Übung beginnt), noch nichts geübt
        t0 = time.time(); gesehen = []; fotografiert = set(); zuletzt = None
        for _ in range(400):
            st = await station(pg)
            if st is None: break
            if st[0] not in gesehen: gesehen.append(st[0])
            if os.environ.get("DEBUG"): print("  ", st, round(time.time() - t0, 1))
            if st[0] != "16" and st[0] not in ("behalten", "achtung") and st[1] != "lob": assert await ueberspringen_pruefen(pg), f"Überspringen fehlt auf Station {st}"
            if os.environ.get("DEBUG") and st[0] in ("15", "16", "behalten"): print("  geaendert bei", st, await pg.evaluate("window.__gastrocalc.stand.geaendert"))
            if st[0] in BILD_STATIONEN and st[0] not in fotografiert:
                await pg.wait_for_timeout(1200 if st[0] in ("12", "16") else 700); await bild(pg, BILD_STATIONEN[st[0]], sprache); fotografiert.add(st[0])
            if st[0] == "16":
                k = pg.locator('[data-rg="verstanden"]'); await k.wait_for()
                await pg.wait_for_selector('[data-rg="verstanden"]:not([disabled])', timeout=5000)
                if os.environ.get("DEBUG"): print("  vor Verstanden:", await pg.evaluate("window.__gastrocalc.stand.geaendert"))
                await k.click(); await pg.wait_for_timeout(500)
                if os.environ.get("DEBUG"): print("  nach Verstanden:", await pg.evaluate("window.__gastrocalc.stand.geaendert"))
                break
            if st == zuletzt: await pg.wait_for_timeout(250)
            zuletzt = st
            await pg.wait_for_timeout(350)
            if await station(pg) != st: continue  # inzwischen weiter (Lob vorbei) – erst neu lesen
            await tippen(pg, st); await pg.wait_for_timeout(450)
        dauer = time.time() - t0
        assert await pg.locator(".rg-huelle").count() == 0, "Rundgang ist nicht zu Ende"
        erwartet = ["0", "1", "2", "3", "4", "5", "6", "7", "9", "10", "8", "11", "12", "13", "14", "15"]
        assert [x for x in gesehen if x in erwartet] == erwartet, gesehen
        assert dauer <= 180, f"Rundgang dauert {dauer:.0f} s"
        await pg.wait_for_timeout(600)
        assert await pg.evaluate("window.__gastrocalc.stand.fuehrung && window.__gastrocalc.stand.fuehrung.ergebnis") == "verstanden"
        if os.environ.get("DEBUG"): print("  im Speicher geaendert:", json.loads(await pg.evaluate(STAND))["betriebe"][0].get("geaendert"), "vorher:", json.loads(vorher)["betriebe"][0].get("geaendert"))
        await neu_laden(pg); nachher = await pg.evaluate(STAND)
        if nachher != vorher and os.environ.get("DEBUG"):
            a, z = json.loads(vorher), json.loads(nachher)
            def unterschied(x, y, pfad=""):
                if type(x) != type(y): print("  Unterschied", pfad, str(x)[:120], "→", str(y)[:120]); return
                if isinstance(x, dict):
                    for k in sorted(set(x) | set(y)): unterschied(x.get(k), y.get(k), pfad + "." + k)
                    if list(x) != list(y): print("  Reihenfolge", pfad)
                elif isinstance(x, list):
                    if len(x) != len(y): print("  Länge", pfad, len(x), len(y))
                    for i, (p1, p2) in enumerate(zip(x, y)): unterschied(p1, p2, f"{pfad}[{i}]")
                elif x != y: print("  Unterschied", pfad, str(x)[:120], "→", str(y)[:120])
            unterschied(a, z)
        assert nachher == vorher, "gespeicherter Stand nach dem Rundgang nicht byte-gleich"
        log = await pg.evaluate("window.__gastrocalc.stand.zekiLog.filter(e => e.art === 'rundgang').map(e => e.inhalt)")
        assert "start" in log and "verstanden" in log, log
        fehlt = await pg.evaluate("window.__gastrocalc.stand.zekiLog.filter(e => e.inhalt === 'ziel-fehlt').map(e => e.station + '.' + e.schritt)")
        assert not fehlt, f"Ziel nicht gefunden (Schritt übersprungen): {fehlt}"
        return dauer, gesehen
    finally:
        await ctx.close()


async def ueberspringen_alle(b, fehler):
    ctx, pg = await neu(b, fehler)
    geprueft = []
    try:
        await neu_laden(pg); await warte_huelle(pg)
        laden = await pg.evaluate("window.__gastrocalc.stand.id")
        for nr in ["0", "1", "2", "4", "6", "7", "9", "8", "14", "15"]:
            await pg.evaluate("([l, n]) => localStorage.setItem('gastrocash-rundgang', JSON.stringify({ laden: l, station: Number(n) }))", [laden, nr])
            await neu_laden(pg); await warte_huelle(pg)
            for _ in range(40):
                st = await station(pg)
                if st and st[0] == nr: break
                await pg.wait_for_timeout(150)
            assert st and st[0] == nr, (nr, st)
            assert await ueberspringen_pruefen(pg)
            await pg.click('.rg-huelle [data-rg="ueberspringen"]')
            await pg.wait_for_selector('.rg-huelle[data-station="achtung"]', timeout=5000)
            if nr == "0": await pg.wait_for_timeout(700); await bild(pg, "17_ueberspring_fenster", "de")
            assert await pg.locator('[data-rg="rezept"]').count() == 1 and await pg.locator('[data-rg="spaeter"]').count() == 1
            await pg.click('[data-rg="spaeter"]'); await pg.wait_for_selector('.rg-huelle[data-station="16"]')
            assert await pg.locator('.rg-huelle [data-rg="ueberspringen"]').count() == 0, "Station 16 hat kein Überspringen"
            assert await pg.locator('[data-rg="verstanden"][disabled]').count() == 1, "„Verstanden“ ist sofort aktiv"
            await pg.keyboard.press("Escape"); await pg.evaluate("history.back()"); await pg.wait_for_timeout(400)
            assert await pg.locator('.rg-huelle[data-station="16"]').count() == 1, "Station 16 ließ sich schließen"
            await pg.wait_for_timeout(1500)
            assert await pg.locator('[data-rg="verstanden"][disabled]').count() == 1, "„Verstanden“ vor 3 s aktiv"
            await pg.wait_for_selector('[data-rg="verstanden"]:not([disabled])', timeout=4000)
            geprueft.append(nr)
            # wieder zurück auf „Rundgang offen“ für die nächste Station (ohne Verstanden zu tippen)
        return geprueft
    finally:
        await ctx.close()


async def abbruch_fortsetzen(b, fehler):
    ctx, pg = await neu(b, fehler)
    try:
        await neu_laden(pg); await warte_huelle(pg); await pg.wait_for_timeout(300); vorher = await pg.evaluate(STAND)
        for _ in range(200):  # bis Station 5 (Müll ist dann schon eingetragen)
            st = await station(pg)
            if st and st[0] == "5": break
            await pg.wait_for_timeout(350)
            if await station(pg) != st: continue
            await tippen(pg, st); await pg.wait_for_timeout(450)
        assert (await station(pg))[0] == "5"
        assert await pg.evaluate("window.__gastrocalc.stand.schwund.length") > 0, ("Übungseintrag Müll fehlt", await pg.evaluate("JSON.stringify(window.__gastrocalc.stand.zekiLog.slice(-8))"))
        await neu_laden(pg)
        assert await pg.evaluate(STAND) == vorher, "nach Neuladen nicht der alte Stand"
        await warte_huelle(pg); await pg.wait_for_timeout(300)
        assert (await station(pg))[0] == "4", "Fortsetzen: Station 5 beginnt bei Station 4 (Müll)"
    finally:
        await ctx.close()


async def behalten(b, fehler):
    ctx, pg = await neu(b, fehler)
    try:
        await neu_laden(pg); await warte_huelle(pg)
        laden = await pg.evaluate("window.__gastrocalc.stand.id")
        await pg.evaluate("l => localStorage.setItem('gastrocash-rundgang', JSON.stringify({ laden: l, station: 9 }))", laden)
        await neu_laden(pg); await warte_huelle(pg)
        for _ in range(60):
            st = await station(pg)
            if st and st[0] == "10": break
            await pg.wait_for_timeout(350)
            if await station(pg) != st: continue
            await tippen(pg, st); await pg.wait_for_timeout(450)
        assert (await station(pg))[0] == "10"
        await pg.click('.rg-huelle [data-rg="ueberspringen"]'); await pg.wait_for_selector('.rg-huelle[data-station="behalten"]')
        await pg.click('[data-rg="behalten"]'); await pg.wait_for_selector('.rg-huelle[data-station="16"]', timeout=5000)
        await pg.wait_for_selector('[data-rg="verstanden"]:not([disabled])', timeout=5000); await pg.click('[data-rg="verstanden"]'); await pg.wait_for_timeout(800)
        await neu_laden(pg)
        eigen = await pg.evaluate("window.__gastrocalc.stand.gerichte.some(g => g.zutaten.some(z => z.quelle === 'eigen'))")
        assert eigen, "behaltenes Rezept fehlt"
        assert await pg.evaluate("window.__gastrocalc.stand.schwund.length") == 0, "Übung (Müll) darf nicht bleiben"
    finally:
        await ctx.close()


async def achtung_bild(b, fehler, sprache):
    ctx, pg = await neu(b, fehler, sprache)
    try:
        await neu_laden(pg); await warte_huelle(pg); await pg.click('.rg-huelle [data-rg="ueberspringen"]')
        await pg.wait_for_selector('.rg-huelle[data-station="achtung"]'); await pg.wait_for_timeout(700); await bild(pg, "17_ueberspring_fenster", sprache)
    finally:
        await ctx.close()


async def main():
    srv = schnellstart.server(PORT); fehler = []
    try:
        async with async_playwright() as p:
            b = await p.chromium.launch()
            for sprache in ("de", "tr", "ar"):  # F2 (6b): auch rechts nach links
                dauer, gesehen = await voller_rundgang(b, fehler, sprache)
                print(f"voller Rundgang {sprache}: {len(gesehen)} Stationen, {dauer:.0f} s, Stand byte-gleich")
            geprueft = await ueberspringen_alle(b, fehler)
            print("Überspringen → Achtung-Fenster → Station 16 (nicht schließbar, 3 s) auf Station", ", ".join(geprueft))
            await abbruch_fortsetzen(b, fehler); print("Abbruch und Fortsetzen ok")
            await behalten(b, fehler); print("Station 9 „Behalten“ ok")
            if BILDER: await achtung_bild(b, fehler, "tr")
            await b.close()
        echt = [f for f in fehler if "favicon" not in f]
        assert not echt, echt
        print("Mitmach-Durchlauf ok")
    finally:
        srv.terminate()


if __name__ == "__main__":
    asyncio.run(main())
