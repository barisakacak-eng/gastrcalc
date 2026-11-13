"""Salbei & Papier, Laden und Personal (Etappe „Aussehen Laden“): geht in de, tr, ar bei 390 × 844 und 360 × 740 durch alle Laden- und
Personal-Ansichten (Heute, Müll mit Menge / Andere / Übrig, Kühlung mit Rundgang und Wert, Putzplan mit Haken, Karte mit Preis- und Rezept-Blatt,
Portion, Umsatz heute, Abschluss, „geschafft“, Personal-Start mit Müll, Kühlung, Putzen) mit dem Beispiel-Laden (30 Tage Daten, wie tests/laden15.py ihn lädt) und prüft je Ansicht:
  überlauf   kein waagrechter Überlauf
  scroll     kein senkrechtes Scrollen (Ausnahmen mit Grund: Karte mit mehr als 8 Gerichten, Putzliste mit mehr als 6 Aufgaben, Suchblatt „Andere“ = Blatt von unten)
  tippflaeche  alle sichtbaren Knöpfe, Links und Felder ≥ 44 px in Breite UND Höhe (Ausnahmen stehen in AUSNAHMEN, je mit Grund)
  glut       höchstens EIN Element in der berechneten Farbe des Tokens --glut (Farbe, Grund, Rand, Füllung, Strich)
  weinrot    Elemente in der Farbe --weinrot nur, wenn die Ansicht Müll heißt
  euro       im Personal-Modus kein „€“
Umgebung: DURCHLAUF_PORT (Standard 8920) · LA_SPRACHEN=de,tr,ar · LA_GROESSEN=390x844,360x740 · LA_THEMA=hell|dunkel · LA_BILDER=<Ordner> legt je Ansicht ein Bild ab ·
LA_NUR=start,muell (nur diese Ansichten). Exit 1 bei Verstoß.
Aufruf: python3 tools/sw_liste.py && DURCHLAUF_PORT=8921 python3 tests/laden_aussehen_browser.py"""
import asyncio, json, os, pathlib, sys
sys.path.insert(0, str(pathlib.Path(__file__).parent))
import schnellstart, nav_hilfe
from playwright.async_api import async_playwright

PORT = int(os.environ.get("DURCHLAUF_PORT", "8920"))
SPRACHEN = os.environ.get("LA_SPRACHEN", "de,tr,ar").split(",")
GROESSEN = [tuple(int(x) for x in g.split("x")) for g in os.environ.get("LA_GROESSEN", "390x844,360x740").split(",")]
THEMA = os.environ.get("LA_THEMA", "hell")
BILDER = pathlib.Path(os.environ["LA_BILDER"]) if os.environ.get("LA_BILDER") else None
NUR = set(filter(None, os.environ.get("LA_NUR", "").split(",")))
KARTE = "Döner Kebab 7,50\nDürüm 8,00\nLahmacun 5,50\nPommes 3,50\nAyran 2,00"

# Ausnahmen (Ansicht, Regel) → Grund. Alles andere gilt ohne Ausnahme.
AUSNAHMEN = {
    ("karte", "scroll"): "Karte mit mehr als 8 Gerichten: die Liste darf wachsen (Regel in tests/regeln.py)",
    ("karte-preis", "scroll"): "Preis-Blatt liegt über der Karte mit vielen Gerichten; gemessen wird die Seite darunter",
    ("karte-rezept", "scroll"): "Rezept-Blatt liegt über der Karte mit vielen Gerichten; gemessen wird die Seite darunter",
    ("putzplan", "scroll"): "Putzliste mit mehr als 6 Aufgaben (Regel in tests/regeln.py)",
    ("putzplan-haken", "scroll"): "Putzliste mit mehr als 6 Aufgaben (Regel in tests/regeln.py)",
    ("muell-andere", "scroll"): "Suchblatt „Andere“ ist ein Blatt von unten über allen Waren und scrollt in sich",
    ("personal-putzen", "scroll"): "Putzliste mit mehr als 6 Aufgaben (Regel in tests/regeln.py)",
}
# Tippflächen, die kleiner sein dürfen (Selektor → Grund)
KLEIN_ERLAUBT = [
    ("input[type=checkbox], input[type=radio]", "Kästchen sitzt in einer Zeile oder einem Label ≥ 44 px, das Label ist die Tippfläche"),
    (".versteckt", "unsichtbares Dateifeld hinter einer Kachel"),
]

MESSEN = r"""
(a) => {
  const rgb = (s) => { const m = /rgba?\(([^)]+)\)/.exec(s || ""); if (!m) return null; const p = m[1].split(/[ ,\/]+/).filter(Boolean).map(Number); return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 }; };
  const probe = document.createElement("i"); document.body.appendChild(probe);
  const token = (n) => { probe.style.color = `var(${n})`; return rgb(getComputedStyle(probe).color); };
  const glut = token("--glut"), wein = token("--weinrot"); probe.remove();
  const gleich = (c, t) => c && t && c.a > 0.99 && Math.abs(c.r - t.r) < 1.5 && Math.abs(c.g - t.g) < 1.5 && Math.abs(c.b - t.b) < 1.5;
  const stil = (e) => getComputedStyle(e);
  const sichtbar = (e) => { const s = stil(e); if (s.display === "none" || s.visibility === "hidden" || Number(s.opacity) === 0) return false;
    if (e.closest("details:not([open])") && !e.closest("summary")) return false;
    const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0; };
  const nm = (e) => (e.tagName.toLowerCase() + (e.className && typeof e.className === "string" ? "." + e.className.trim().split(/\s+/).slice(0, 2).join(".") : "") + ((e.getAttribute("data-a") ? "[" + e.getAttribute("data-a") + "]" : "")));
  const alle = [...document.querySelectorAll("body *")].filter((e) => !e.closest("script,style,#ebene-huelle:empty") && sichtbar(e));
  const farbig = (e, t) => { const s = stil(e); const pr = [s.color, s.backgroundColor, s.fill, s.stroke];
    for (const k of ["Top", "Right", "Bottom", "Left"]) if (parseFloat(s["border" + k + "Width"]) > 0 && s["border" + k + "Style"] !== "none") pr.push(s["border" + k + "Color"]);
    if (s.outlineStyle !== "none" && parseFloat(s.outlineWidth) > 0) pr.push(s.outlineColor);
    // Farbe nur zählen, wo sie sichtbar wird: Text braucht eigenen Text; Fläche braucht Größe
    return pr.some((c, i) => { if (!gleich(rgb(c), t)) return false; if (i === 0) return [...e.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim()) || e.matches("svg, svg *"); return true; }); };
  const glutEl = alle.filter((e) => !e.closest(".tableiste") && farbig(e, glut)).map(nm);
  const weinEl = alle.filter((e) => farbig(e, wein)).map(nm);
  const tippSel = "button, a[href], input:not([type=hidden]), select, textarea, summary, [role=button], [role=tab], [role=switch]";
  const erlaubt = a.klein;
  const tipp = [...document.querySelectorAll(tippSel)].filter((e) => sichtbar(e) && !erlaubt.some((x) => e.matches(x))).map((e) => { const r = e.getBoundingClientRect();
    return { el: nm(e), text: (e.textContent || e.getAttribute("aria-label") || "").replace(/\s+/g, " ").trim().slice(0, 24), w: Math.round(r.width * 10) / 10, h: Math.round(r.height * 10) / 10 }; })
    .filter((x) => x.w < 43.5 || x.h < 43.5);
  const bilder = [...document.querySelectorAll("#app img")].filter(sichtbar).map((i) => i.getAttribute("src") || "");
  const kaputt = [...document.querySelectorAll("#app img")].filter((i) => sichtbar(i) && i.complete && i.naturalWidth === 0).map((i) => i.getAttribute("src"));
  const el = document.documentElement;
  return { ueberlaufX: Math.max(el.scrollWidth, document.body.scrollWidth) > innerWidth + 1, hoehe: el.scrollHeight, innen: innerHeight, glutEl, weinEl, tipp, kaputt, bilder: bilder.length,
    text: document.querySelector("#app")?.innerText || "", ebeneText: document.querySelector("#ebene-huelle")?.innerText || "" };
}
"""


async def ruhig(pg, lang=False):
    await pg.wait_for_timeout(450)
    await pg.evaluate("document.querySelectorAll('.zeki-erst').forEach(e => e.remove())")
    if await pg.locator(".zeki-sprech").count():
        for _ in range(40):
            await pg.wait_for_timeout(250)
            if not await pg.locator(".zeki-sprech").count(): break
    if lang: await pg.wait_for_timeout(300)


async def main():
    srv = schnellstart.server(PORT); fehler = []; verstoesse = []; zusammen = []; ausnahmen_gebraucht = set(); kleinste = {}
    try:
        async with async_playwright() as p:
            b = await p.chromium.launch(args=["--no-sandbox"])
            for sp in SPRACHEN:
                os.environ["SCHNELLSTART_SPRACHE"] = sp
                for (w, h) in GROESSEN:
                    ctx = await b.new_context(viewport={"width": w, "height": h}, device_scale_factor=2 if BILDER else 1, is_mobile=True, has_touch=True, locale="de-DE", color_scheme="dark" if THEMA == "dunkel" else "light")
                    await ctx.add_init_script(path=str(pathlib.Path(schnellstart.APP) / "tests" / "hilfe" / "aufklappen.js"))
                    await ctx.add_init_script("try { localStorage.setItem('gc-zeki-erst', JSON.stringify(['muell','kuehl','putzplan','karte','umsatzheute','abschluss','personal','start'])); } catch (e) {}")
                    pg = await ctx.new_page()
                    pg.on("console", lambda m: fehler.append(m.text) if m.type == "error" and "ERR_TUNNEL" not in m.text else None)
                    pg.on("pageerror", lambda e: fehler.append(str(e)))
                    await schnellstart.schnellstart(pg, PORT, name="Imbiss Test")
                    await nav_hilfe.geh(pg, "laeden"); await pg.click('#app [data-a="beispiel-anlegen"]'); await pg.wait_for_timeout(900)
                    kennung = f"{sp} {w}x{h}"

                    async def messe(name, ebene="laden"):
                        if NUR and name not in NUR: return
                        await ruhig(pg)
                        m = await pg.evaluate(MESSEN, {"klein": [x[0] for x in KLEIN_ERLAUBT]})
                        if BILDER:
                            BILDER.mkdir(parents=True, exist_ok=True)
                            suffix = ("" if sp == "de" else f"-{sp}") + ("-dunkel" if THEMA == "dunkel" else "") + ("" if w == 390 else f"-{w}")
                            await pg.screenshot(path=str(BILDER / f"{name}{suffix}.png"))
                        def pruefe(regel, ok, text):
                            if ok: return
                            if (name, regel) in AUSNAHMEN: ausnahmen_gebraucht.add((name, regel, kennung)); return
                            verstoesse.append(f"{kennung} {name}: {regel} – {text}"); print("VERSTOSS", kennung, name, regel, text, flush=True)
                        pruefe("ueberlauf", not m["ueberlaufX"], "waagrechter Überlauf")
                        pruefe("scroll", m["hoehe"] <= m["innen"] + 1, f"Seite {m['hoehe']} px > Fenster {m['innen']} px")
                        pruefe("tippflaeche", not m["tipp"], "; ".join(f"{x['el']} „{x['text']}“ {x['w']}×{x['h']}" for x in m["tipp"][:5]))
                        pruefe("glut", len(m["glutEl"]) <= 1, f"{len(m['glutEl'])} Elemente in Glut: {m['glutEl'][:4]}")
                        pruefe("weinrot", not m["weinEl"] or name.startswith("muell") or name.startswith("personal-muell"), f"Weinrot außerhalb Müll: {m['weinEl'][:4]}")
                        pruefe("bilder", not m["kaputt"], f"Bild fehlt: {m['kaputt'][:3]}")
                        if ebene == "personal": pruefe("euro", "€" not in m["text"] and "€" not in m["ebeneText"], "„€“ im Personal-Modus")
                        k = min([min(x["w"], x["h"]) for x in m["tipp"]] or [44]); kleinste[name] = min(kleinste.get(name, 999), k)
                        zusammen.append((kennung, name, m["hoehe"], m["innen"], len(m["glutEl"]), len(m["weinEl"]), len(m["tipp"])))

                    # ---------------- Laden ----------------
                    await nav_hilfe.geh(pg, "start"); await messe("start")
                    await nav_hilfe.geh(pg, "muell"); await messe("muell")
                    await pg.locator('[data-a="muell-detail"]').first.click(); await pg.wait_for_timeout(350); await messe("muell-menge")
                    await pg.locator('[data-a="muell-auswahl"]').first.click(); await pg.wait_for_timeout(350); await messe("muell-andere")
                    await pg.locator('[data-a="muell-auswahl-zu"]').first.click(); await pg.wait_for_timeout(250)
                    await pg.locator('[data-a="muell-start"]').first.click(); await pg.wait_for_timeout(300)
                    await pg.locator('[data-a="muell-station-auf"]').first.click(); await pg.wait_for_timeout(350); await messe("muell-uebrig")
                    await pg.locator('[data-a="muell-station-zu"]').first.click(); await pg.wait_for_timeout(300)
                    await nav_hilfe.geh(pg, "kuehl"); await messe("kuehl")
                    await pg.locator('[data-a="kuehl-rundgang-los"]').first.click(); await pg.wait_for_selector('[data-f="station-wert"]'); await pg.wait_for_timeout(250); await messe("kuehl-wert")
                    await pg.fill('[data-f="station-wert"]', "4"); await pg.wait_for_timeout(250); await messe("kuehl-wert-4")
                    await pg.fill('[data-f="station-wert"]', "14"); await pg.wait_for_timeout(300); await messe("kuehl-warnung")
                    await pg.fill('[data-f="station-wert"]', "4"); await pg.wait_for_timeout(150)
                    await pg.locator('[data-a="station-speichern"]').first.click(); await pg.wait_for_timeout(450); await messe("kuehl-rundgang")
                    await nav_hilfe.geh(pg, "putzplan"); await messe("putzplan")
                    await pg.locator('[data-a="pp-haken"]').first.click(); await pg.wait_for_timeout(500); await messe("putzplan-haken")
                    await nav_hilfe.geh(pg, "karte"); await messe("karte")
                    await pg.locator('[data-a="kl-auf"]').first.click(); await pg.wait_for_selector(".kl-blatt"); await pg.wait_for_timeout(300); await messe("karte-preis")
                    await pg.click('button.kl-x[data-a="kl-zu"]'); await pg.wait_for_timeout(350)
                    gid = await pg.evaluate("(window.__gastrocalc.stand.gerichte.find((g) => (g.zutaten || []).length) || {}).id || null")
                    if gid:
                        await pg.evaluate("async (gid) => { const m = await import('./js/screens/karte_laden.js'); m.karteLadenRezeptBlatt(window.__gastrocalc.stand, gid); window.__gastrocalc.zeichne(); }", gid)
                        await pg.wait_for_selector(".kl-rezeptblatt"); await pg.wait_for_timeout(300); await messe("karte-rezept")
                        await pg.click('#app .kl-rezeptblatt [data-a="kl-zu"].knopf'); await pg.wait_for_timeout(350)
                    pid = await pg.evaluate("""async () => { const W = await import('./js/ware.js'); const s = window.__gastrocalc.stand; return (s.gerichte.find((g) => W.hauptZutat(s, g)) || {}).id || null; }""")
                    if pid:
                        await pg.evaluate("(pid) => { const b = document.createElement('button'); b.dataset.a = 'nav'; b.dataset.wert = 'portion'; b.dataset.id = pid; b.id = 'testportion'; document.querySelector('#app').appendChild(b); }", pid)
                        await pg.evaluate("document.getElementById('testportion').click()"); await pg.wait_for_selector(".po"); await pg.wait_for_timeout(300); await messe("portion")
                        await pg.locator('[data-a="po-pruefen"]').first.click(); await pg.wait_for_timeout(400); await messe("portion-ergebnis")
                        await pg.locator('[data-a="po-fertig"]').first.click(); await pg.wait_for_timeout(300)
                    await nav_hilfe.geh(pg, "start"); await pg.click('#app [data-a="nav"][data-wert="umsatzheute"]'); await pg.wait_for_selector('[data-f="ul-umsatz"]'); await pg.wait_for_timeout(250); await messe("umsatz-heute")
                    await nav_hilfe.geh(pg, "abschluss"); await messe("abschluss")
                    if await pg.locator('[data-a="abschluss-fertig"]').count():
                        await pg.locator('[data-a="abschluss-fertig"]').first.click(); await pg.wait_for_timeout(700); await messe("geschafft")
                    await nav_hilfe.geh(pg, "start")
                    # ---------------- Personal ----------------
                    await schnellstart.code_setzen(pg, "1234"); await nav_hilfe.geh(pg, "start"); await nav_hilfe.menue(pg)
                    await pg.click('#ebene-huelle [data-a="modus"][data-wert="personal"]'); await pg.wait_for_selector(".riesenkachel, .personwahl"); await pg.wait_for_timeout(350)
                    if await pg.locator(".personwahl").count():
                        await messe("personal-wer", "personal"); await pg.locator(".personwahl").first.click(); await pg.wait_for_selector(".riesenkachel")
                    await messe("personal", "personal")
                    for ziel, name in (("muell", "personal-muell"), ("kuehl", "personal-kuehl"), ("putzplan", "personal-putzen")):
                        await pg.click(f'[data-a="personal-ziel"][data-wert="{ziel}"]'); await pg.wait_for_timeout(500); await messe(name, "personal")
                        if ziel == "muell":
                            await pg.locator('[data-a="muell-detail"]').first.click(); await pg.wait_for_timeout(350); await messe("personal-muell-menge", "personal")
                        await pg.go_back(); await pg.wait_for_timeout(400)
                        if await pg.locator(".riesenkachel").count() != 3:
                            await pg.go_back(); await pg.wait_for_timeout(400)
                    await ctx.close()
            await b.close()
    finally:
        srv.terminate()
    print(f"\n{len(zusammen)} Messungen · Konsolenfehler: {len(fehler)}")
    for f in fehler[:5]: print("  KONSOLE", f[:200])
    print("Ausnahmen (mit Grund):")
    for (name, regel, k) in sorted(ausnahmen_gebraucht): print(f"  {name} / {regel} ({k}): {AUSNAHMEN[(name, regel)]}")
    for sel, grund in KLEIN_ERLAUBT: print(f"  Tippfläche ausgenommen: {sel} – {grund}")
    print("Kleinste Tippfläche je Ansicht (px):", json.dumps(kleinste, ensure_ascii=False))
    print(f"VERSTÖSSE: {len(verstoesse)}")
    for v in verstoesse: print("  -", v)
    return 1 if verstoesse or fehler else 0


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
