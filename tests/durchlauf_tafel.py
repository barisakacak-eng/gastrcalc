"""Menütafel (18.10.2026): Browser-Durchlauf im Handy-Format mit Touch (390×844), danach die geteilte Tafel-Datei auf einem „Fernseher“ (1920×1080).
Schnellstart (eigener Laden) → Büro: Kachel „Menütafel“ → Bereich ohne Gerichte mit Preis (ein Satz, kein Teilen-Knopf) → Beispiel-Laden anlegen →
Büro → Menütafel: Vorschau (3 Seiten, verkleinert), Kassen-Hinweis, laufende Aktion, Einstellungen → „Aktionen & Haltbarkeit“: Abverkauf „Auf die Tafel“
→ Menütafel zeigt 2 Aktionen → Seitenwechsel 8 s, Sprache Türkisch (Vorschau „Yemekler“) und zurück auf Deutsch → „Tafel-Datei teilen“ (Teilen-Attrappe fängt
die Datei) → eine HTML-Datei ohne Verweise nach außen → in Chromium im Vollbild 1920×1080 öffnen: Aktion, Speisen, Getränke, automatischer Seitenwechsel →
mit vorgestellter Uhr (Aktionen abgelaufen): Aktionsseite verschwindet von selbst. Kein waagrechter Überlauf, keine Konsolenfehler (App und Tafel).
Start: python3 tests/durchlauf_tafel.py   (eigener Webserver, Port DURCHLAUF_PORT oder 8789). Bilder: /home/claude/audit/shots/tafel_*.png. Exit 1 bei Fehler."""
import asyncio, sys, os, pathlib, traceback, re, datetime, tempfile
from playwright.async_api import async_playwright
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
import schnellstart as ss, nav_hilfe

PORT = int(os.environ.get("DURCHLAUF_PORT", "8789"))
OUT = pathlib.Path(os.environ.get("DURCHLAUF_OUT", "/home/claude/audit/shots")); OUT.mkdir(parents=True, exist_ok=True)
KACHEL = '#app [data-a="nav"][data-wert="tafel"]'
# Teilen-Attrappe: nimmt die Datei an und legt ihren Text ab (wie das Teilen-Blatt des Handys)
TEILEN_ATTRAPPE = """Object.defineProperty(navigator, 'canShare', { configurable: true, value: (d) => !!(d && d.files) });
Object.defineProperty(navigator, 'share', { configurable: true, value: async (d) => { const f = d.files[0]; window.__datei = { name: f.name, typ: f.type, anzahl: d.files.length, text: await f.text() }; } })"""


async def main():
    srv = ss.server(PORT); fehler = []; tv_fehler = []
    try:
        async with async_playwright() as p:
            b = await p.chromium.launch()
            ctx, pg = await ss.kontext(b, 390, 844, fehler)
            pg.on("dialog", lambda d: asyncio.ensure_future(d.accept()))
            n = 0
            async def bild(name, voll=False, seite=None):
                nonlocal n; n += 1; await (seite or pg).screenshot(path=str(OUT / f"tafel_{n:02d}_{name}.png"), full_page=voll)
            async def tipp(sel): await pg.locator(sel).first.tap(); await pg.wait_for_timeout(450)
            async def stand(): return await pg.evaluate("window.__gastrocalc.stand")
            async def text(): return (await pg.inner_text("#app")).replace("\xa0", " ")
            async def ueberlauf(wo):
                x = await pg.evaluate("document.documentElement.scrollWidth - window.innerWidth"); assert x <= 0, f"waagrechter Überlauf ({wo}): {x}px"

            await ss.schnellstart(pg, PORT, name="Mein Laden")

            # ---- eigener Laden: Kachel für alle, ohne Gerichte mit Preis ein klarer Satz und kein Teilen-Knopf
            await nav_hilfe.ins_buero(pg); await pg.wait_for_timeout(300)
            assert await pg.locator(KACHEL).count() == 1, "Kachel „Menütafel“ fehlt im Büro"
            await bild("buero_kachel")
            await tipp(KACHEL); t = await text()
            for w in ["Menütafel", "Vorschau", "Noch kein Gericht mit Preis", "Preise auf Tafel und Kasse müssen gleich sein.", "Einstellungen", "Sprache der Tafel"]:
                assert w.lower() in t.lower(), (w, t[:900])
            assert "0 Seiten" not in t
            assert await pg.locator('#app [data-a="tf-teilen"]').count() == 0
            await ueberlauf("leer"); await bild("leer", voll=True)

            # ---- Beispiel-Laden → Menütafel mit Vorschau
            await nav_hilfe.geh(pg, "laeden"); await tipp('#app [data-a="beispiel-anlegen"]'); await pg.wait_for_timeout(600)
            assert (await stand())["beispiel"] is True
            await nav_hilfe.geh(pg, "tafel"); await pg.wait_for_timeout(300); t = await text()
            for w in ["Menütafel", "Vorschau", "3 Seiten", "Tafel-Datei teilen", "Preise auf Tafel und Kasse müssen gleich sein.", "Aktionen auf der Tafel",
                      "Döner Kebab + Pommes frites + Cola 0,33 l", "Seitenwechsel alle", "Was steht auf der Tafel?", "Aktionen zeigen", "Was heißt das?"]:
                assert w.lower() in t.lower(), (w, t[:1500])
            assert "NaN" not in t and "undefined" not in t and "tafel." not in t, t[:800]
            assert await pg.locator("#app iframe[data-tafel-seite]").count() == 3, "Vorschau: drei Seiten"
            assert t.count("Preise auf Tafel und Kasse") == 1
            # Vorschau ist verkleinert (passt in die Handybreite) und zeigt die Seiten
            br = await pg.locator("#app iframe[data-tafel-seite]").first.bounding_box(); assert br and br["width"] <= 390 and br["height"] < 260, br
            v0 = pg.frame_locator('#app iframe[data-tafel-seite="0"]'); assert "Aktion" in await v0.locator("body").inner_text()
            v1 = pg.frame_locator('#app iframe[data-tafel-seite="1"]'); assert "Döner Kebab" in await v1.locator("body").inner_text()
            await ueberlauf("Menütafel"); await bild("vorschau"); await bild("bereich_ganz", voll=True)

            # ---- „Auf die Tafel“ aus Aktionen & Haltbarkeit (Abverkauf Ayran)
            await nav_hilfe.geh(pg, "aktionen"); await pg.wait_for_timeout(300)
            await pg.locator('#app [data-a="akt-tafel"][data-art="abverkauf"]').first.scroll_into_view_if_needed(); await bild("aktionen_auf_tafel")
            vorher = len((await stand())["aktionen"])
            await tipp('#app [data-a="akt-tafel"][data-art="abverkauf"][data-wert="0"]')
            # Aktion planen (18.10.2026): erst Vorschlag mit Begründung, „Auf die Tafel“ im Plan übernimmt (nie automatisch)
            assert len((await stand())["aktionen"]) == vorher, "nicht automatisch"
            await tipp('#app [data-a="akt-plan-von"]')  # „Ab sofort“ (an einem Ruhetag schlägt die App den nächsten Öffnungstag vor) – damit die Tafel sie gleich zeigt
            await tipp('#app [data-a="akt-plan-ok"]')
            s = await stand(); assert len(s["aktionen"]) == vorher + 1, s["aktionen"]; assert s["aktionen"][-1]["art"] == "abverkauf"
            await nav_hilfe.geh(pg, "tafel"); await pg.wait_for_timeout(300)
            assert await pg.locator("#app [data-tafel-aktion]").count() == 2, "zwei laufende Aktionen"
            assert "Ayran" in await pg.frame_locator('#app iframe[data-tafel-seite="0"]').locator("body").inner_text()

            # ---- Einstellungen: Seitenwechsel 8 s, Sprache Türkisch (Vorschau), zurück auf Deutsch
            await tipp('#app [data-a="tf-sekunden"][data-wert="8"]'); assert (await stand())["tafel"]["sekunden"] == 8
            await pg.select_option('#app [data-f="tf-sprache"]', "tr"); await pg.wait_for_timeout(700)
            assert (await stand())["tafel"]["sprache"] == "tr"
            assert "Yemekler" in await pg.frame_locator('#app iframe[data-tafel-seite="1"]').locator("body").inner_text(), "Vorschau in der Sprache der Tafel"
            assert "Menütafel" in await text(), "Büro bleibt in der App-Sprache"
            await pg.locator('#app [data-f="tf-sprache"]').scroll_into_view_if_needed(); await bild("sprache_tr")
            await pg.select_option('#app [data-f="tf-sprache"]', "de"); await pg.wait_for_timeout(500)

            # ---- Tafel-Datei teilen
            await pg.evaluate(TEILEN_ATTRAPPE)
            await pg.locator('#app [data-a="tf-teilen"]').scroll_into_view_if_needed(); await tipp('#app [data-a="tf-teilen"]'); await pg.wait_for_timeout(800)
            d = await pg.evaluate("window.__datei"); assert d and d["anzahl"] == 1, d
            assert re.match(r"^menuetafel-beispiel-doener-\d{4}-\d{2}-\d{2}\.html$", d["name"]) and d["typ"].startswith("text/html"), d["name"]
            html = d["text"]; print("Tafel-Datei:", d["name"], round(len(html) / 1024), "KB")
            assert not re.search(r"https?://|<link\b|<script\s+src|@import", html), "Verweis nach außen"
            for m in re.finditer(r'\b(?:src|href)\s*=\s*"([^"]*)"', html): assert m.group(1).startswith("data:"), m.group(0)[:80]
            assert html.count("data:image/") >= 10, "Fotos eingebettet"
            datei = pathlib.Path(tempfile.mkdtemp()) / d["name"]; datei.write_text(html, encoding="utf-8")

            # ---- Fernseher: Datei im Browser öffnen, 1920×1080, Vollbild per Tipp
            tv = await b.new_page(viewport={"width": 1920, "height": 1080})
            tv.on("console", lambda m: tv_fehler.append(m.text) if m.type == "error" else None); tv.on("pageerror", lambda e: tv_fehler.append(str(e)))
            tv.on("request", lambda r: tv_fehler.append("Anfrage nach außen: " + r.url) if not r.url.startswith(("file:", "data:")) else None)
            await tv.goto(datei.as_uri()); await tv.wait_for_timeout(400)
            await tv.mouse.click(960, 540); await tv.wait_for_timeout(300)
            async def sichtbar(): return await tv.evaluate("(() => { const s = [...document.querySelectorAll('.seite')]; const i = s.findIndex((x) => getComputedStyle(x).display !== 'none'); return [i, s[i] && s[i].dataset.art, s[i] && s[i].innerText.replace(/\\u00a0/g, ' ')]; })()")
            i0, art0, t0 = await sichtbar(); assert i0 == 0 and art0 == "aktionen" and "Aktion" in t0 and "Döner Kebab + Pommes frites + Cola 0,33 l" in t0 and "Ayran" in t0, (i0, art0, t0[:300])
            assert re.search(r"bis (Mo|Di|Mi|Do|Fr|Sa|So) \d\d\.\d\d\.", t0) and "Stand:" in t0 and "Endpreise in Euro inkl. MwSt." in t0
            ub = await tv.evaluate("[document.documentElement.scrollWidth - innerWidth, document.documentElement.scrollHeight - innerHeight]"); assert ub[0] <= 0 and ub[1] <= 0, ub
            await bild("tv_aktion", seite=tv)
            await tv.wait_for_timeout(8300); i1, art1, t1 = await sichtbar(); assert i1 == 1 and "Speisen" in t1 and "Döner Kebab" in t1 and "8,00 €" in t1, (i1, t1[:300])
            await bild("tv_speisen", seite=tv)
            await tv.wait_for_timeout(8100); i2, art2, t2 = await sichtbar(); assert i2 == 2 and "Getränke" in t2 and "Cola 0,33 l" in t2, (i2, t2[:300])
            await bild("tv_getraenke", seite=tv)
            await tv.wait_for_timeout(8100); i3, _, _ = await sichtbar(); assert i3 == 0, "wieder von vorn"
            print("Seitenwechsel: 0 → 1 → 2 → 0 alle 8 s")

            # ---- Uhr des Anzeigegeräts in zwei Wochen: Aktionen abgelaufen → Aktionsseite fehlt von selbst
            alt = await b.new_page(viewport={"width": 1920, "height": 1080})
            alt.on("pageerror", lambda e: tv_fehler.append(str(e)))
            await alt.clock.install(time=datetime.datetime.now() + datetime.timedelta(days=15))
            await alt.goto(datei.as_uri()); await alt.wait_for_timeout(300)
            leer = await alt.evaluate("document.querySelector('.seite[data-art=\"aktionen\"]').dataset.leer"); assert leer == "1", leer
            assert await alt.evaluate("[...document.querySelectorAll('.aktion')].every((a) => a.hidden)")
            vis = await alt.evaluate("[...document.querySelectorAll('.seite')].findIndex((x) => getComputedStyle(x).display !== 'none')"); assert vis == 1, vis
            await bild("tv_abgelaufen", seite=alt)
            await alt.clock.run_for(8500); vis = await alt.evaluate("[...document.querySelectorAll('.seite')].findIndex((x) => getComputedStyle(x).display !== 'none')"); assert vis == 2, vis
            await alt.clock.run_for(8500); vis = await alt.evaluate("[...document.querySelectorAll('.seite')].findIndex((x) => getComputedStyle(x).display !== 'none')"); assert vis == 1, ("Aktionsseite übersprungen", vis)
            print("Abgelaufen: Aktionsseite ausgeblendet, Wechsel nur zwischen den Kartenseiten")

            # ---- im Laden steht nichts davon
            await nav_hilfe.geh(pg, "start"); t = await text(); assert "Menütafel" not in t and "Tafel" not in t, t[:400]
            await b.close()
        print("Konsolenfehler App:", fehler, "· Tafel:", tv_fehler); assert not fehler, fehler; assert not tv_fehler, tv_fehler
        print("OK – durchlauf_tafel:", n, "Bilder in", OUT)
    except Exception:
        traceback.print_exc(); print("Konsolenfehler:", fehler, tv_fehler); sys.exit(1)
    finally:
        srv.terminate()


asyncio.run(main())
