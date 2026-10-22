"""Paket 7 (16.10.2026): Regelprüfung im Browser – macht die verbindlichen Vorgaben der App messbar.
Schnellstart (Deutsch, Dönerladen, Karte „Später“, 1 Kühlschrank + 1 Tiefkühler, Kosten leer) in 390×844 und 360×780, dann je Bildschirm:
  woerter      sichtbarer fester Text ohne Zahlen, Datum, Einheiten, Gericht-/Kühlstellen-/Sprachnamen, Putzaufgaben, ohne Leiste unten (Laden ≤ 15, Personal ≤ 10, Büro ≤ 120)
  scroll       Seitenhöhe gegen Viewport (Laden scrollt nicht; Ausnahme Karte > 8 Gerichte, Putzliste > 6 Aufgaben)
  knopfhoehe   Hauptknopf (.knopf.glut) ≥ 64 px; dazu die Zahl der Knöpfe mit Klasse knopf/glut
  absaetze     Erklärabsätze (p, small, .hinweis, .fein, .unter, li) mit ≥ 12 Wörtern im Laden: 0
  verboten     verbotene Wörter im sichtbaren Text und in js/lang/de.js: 0 Treffer
  schrift      kleinste Schrift im Laden ≥ 12 px · tippflaeche: Tippflächen ≥ 44 px · kontrast: Leisten-Beschriftung ≥ 4,5:1
Schreibt tests/regeln_stand.json und eine Zusammenfassung auf die Konsole. Bekannte Verletzungen stehen in tests/regeln_ausnahmen.json
(Bildschirm, Regel, Grund) – nur Verletzungen außerhalb dieser Liste geben Exit 1.
Start: python3 tests/regeln.py   (Webserver Port 8797; REGELN_OUT setzt den Ordner für Bilder)"""
import asyncio, json, os, pathlib, re, subprocess, sys, time
from playwright.async_api import async_playwright
import nav_hilfe, schnellstart, pilot_karten_browser, abschluss_browser

APP = schnellstart.APP
TESTS = APP / "tests"
OUT = pathlib.Path(os.environ.get("REGELN_OUT", APP.parent / "audit" / "regeln")); OUT.mkdir(parents=True, exist_ok=True)
PORT = int(os.environ.get("DURCHLAUF_PORT", "8797"))
VIEWPORTS = [(390, 844), (360, 780)]

VERBOTEN = ["revolutionär", "disruptiv", "Marktführer", "GoBD-konform", "betriebsprüfungsfest", "steuersicher", "rechtssicher",
            "HACCP-konform", "zertifiziert", "lückenlos", "manipulationssicher"]
WOERTER_SOLL = {"laden": 15, "personal": 10, "buero": 120}
KNOPF_SOLL, SCHRIFT_SOLL, TIPP_SOLL, KONTRAST_SOLL, ABSATZ_WOERTER = 64, 12, 44, 4.5, 12

# Was nicht als fester Text zählt: Einheiten, Wochentage, Monate (deutsch), dazu je Lauf Gericht-, Kühlstellen-, Sprach- und Ladenname
AUSGESCHLOSSEN = set("""€ % °c ° kg g ml l cl min std h uhr
montag dienstag mittwoch donnerstag freitag samstag sonntag mo di mi do fr sa so
januar februar märz april mai juni juli august september oktober november dezember jan feb mär apr jun jul aug sep sept okt nov dez""".split())

# Messung im Browser: ein Aufruf je Bildschirm, Wurzel „#app“ (Bildschirm) oder „#ebene-huelle“ (Blatt)
MESSEN_JS = r"""
(args) => {
  const { wurzel, ausschluss, verboten } = args;
  const root = document.querySelector(wurzel) || document.body;
  const aus = new Set(ausschluss);
  const stil = (el) => getComputedStyle(el);
  const sichtbar = (el) => { if (!el || el.nodeType !== 1) return false; const s = stil(el);
    if (s.display === "none" || s.visibility === "hidden" || Number(s.opacity) === 0) return false;
    const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0; };
  const inLeiste = (el) => !!el.closest(".tableiste");
  const sauber = (s) => s.replace(/­/g, "");
  const token = (t) => sauber(t).replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, "");
  const istWort = (w) => /\p{L}/u.test(w) && !/\p{N}/u.test(w) && !aus.has(w.toLowerCase());
  const woerterVon = (text) => text.split(/\s+/).map(token).filter((w) => /\p{L}/u.test(w) && !/\p{N}/u.test(w));
  // sichtbare Textknoten
  const texte = []; const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let n; while ((n = w.nextNode())) { const t = n.textContent.replace(/\s+/g, " ").trim(); if (!t) continue; const p = n.parentElement;
    if (!p || inLeiste(p) || p.closest("script,style") || p.closest(".aufgabe .atext b, .phinweis") || !sichtbar(p)) continue; texte.push(t); } // Laden-Umbau (20.10.2026): Putzaufgaben zählen wie Gerichtnamen nicht
  const ganz = texte.join(" ");
  const wortliste = ganz.split(/\s+/).map(token).filter(istWort);
  // Knöpfe
  // Hauptknopf = .knopf.glut, die „Jetzt dran“-Zeile auf Heute (.h-jetzt) und die Riesenkacheln im Personal-Modus
  const knoepfe = [...root.querySelectorAll(".knopf, .glut, .riesenkachel, .h-jetzt")].filter((b) => sichtbar(b) && !inLeiste(b))
    .map((b) => { const r = b.getBoundingClientRect(); return { text: sauber(b.textContent).replace(/\s+/g, " ").trim().slice(0, 40), h: Math.round(r.height * 10) / 10, w: Math.round(r.width), haupt: b.classList.contains("glut") || b.classList.contains("h-jetzt"), kachel: b.classList.contains("riesenkachel") }; });
  // Erklärabsätze
  const absaetze = [...root.querySelectorAll("p, small, .hinweis, .fein, .unter, li")].filter((el) => sichtbar(el) && !inLeiste(el))
    .map((el) => { const t = sauber(el.textContent).replace(/\s+/g, " ").trim(); return { text: t.slice(0, 80), worte: woerterVon(t).length }; }).filter((a) => a.worte >= args.absatzWoerter);
  // kleinste Schrift (Elemente mit eigenem Text)
  let minFont = null;
  for (const el of root.querySelectorAll("*")) {
    if (inLeiste(el) || !sichtbar(el)) continue;
    const eigen = [...el.childNodes].some((c) => c.nodeType === 3 && c.textContent.trim()); if (!eigen) continue;
    const px = parseFloat(stil(el).fontSize); if (!minFont || px < minFont.px) minFont = { px, text: sauber(el.textContent).trim().slice(0, 30) };
  }
  // Tippflächen
  const tipp = [...root.querySelectorAll("button, a[href], input:not([type=hidden]), label.knopf, [role=button], select, textarea")]
    .filter((el) => sichtbar(el) && !el.matches(".dateifeld, .versteckt") && !el.closest(".dateifeld"))
    .map((el) => { const r = el.getBoundingClientRect(); return { text: (sauber(el.textContent).replace(/\s+/g, " ").trim() || el.getAttribute("aria-label") || el.tagName).slice(0, 30), w: Math.round(r.width * 10) / 10, h: Math.round(r.height * 10) / 10 }; });
  const tippKlein = tipp.filter((x) => x.w < args.tippSoll - 0.5 || x.h < args.tippSoll - 0.5);
  // verbotene Wörter im sichtbaren Text
  const klein = sauber(ganz).toLowerCase(); const treffer = verboten.filter((v) => klein.includes(v.toLowerCase()));
  // Kontrast der Leisten-Beschriftung (Leiste unten und Kopfleiste)
  const rgb = (s) => { const m = /rgba?\(([^)]+)\)/.exec(s || ""); if (!m) return null; const [r, g, b, a = 1] = m[1].split(",").map(Number); return a === 0 ? null : [r, g, b]; };
  const lum = ([r, g, b]) => { const f = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
  const hintergrund = (el) => { for (let e = el; e; e = e.parentElement) { const c = rgb(stil(e).backgroundColor); if (c) return c; } return [255, 255, 255]; };
  const kontrast = [...document.querySelectorAll(".tableiste .tab, .ebene-kopf .zurueckzeile, .ebene-kopf .kopftitel")].filter(sichtbar).map((el) => {
    const fg = rgb(stil(el).color) || [0, 0, 0]; const bg = hintergrund(el); const [a, b] = [lum(fg), lum(bg)];
    return { text: sauber(el.textContent).trim().slice(0, 20), verhaeltnis: Math.round(((Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)) * 100) / 100 }; });
  return { worte: wortliste.length, wortliste, texte, hoehe: document.documentElement.scrollHeight, innen: innerHeight,
    knoepfe, anzahlKnoepfe: knoepfe.length, absaetze, minFont, tippKlein, tippAnzahl: tipp.length, verboten: treffer, kontrast };
}
"""


def ausschluss_fuer(stand, name):
    s = set(AUSGESCHLOSSEN)
    namen = [g.get("name", "") for g in stand.get("gerichte", [])] + [a.get("name", "") for a in stand.get("artikel", [])] + [k.get("name", "") for k in stand.get("kuehlstellen", [])] + [name]  # Artikel = Zutatenliste im Müll
    for n in namen:
        for t in re.split(r"\s+", n):
            t = re.sub(r"^[^\w]+|[^\w]+$", "", t)
            if t: s.add(t.lower())
    return s


async def messen(pg, wurzel, ausschluss):
    return await pg.evaluate(MESSEN_JS, {"wurzel": wurzel, "ausschluss": sorted(ausschluss), "verboten": VERBOTEN, "absatzWoerter": ABSATZ_WOERTER, "tippSoll": TIPP_SOLL})


def regeln_pruefen(schirm, ebene, m, zusatz):
    """Liefert die Regelbefunde eines Bildschirms: [(regel, ok, ist, soll, hinweis)]."""
    r = []
    r.append(("woerter", m["worte"] <= WOERTER_SOLL[ebene], m["worte"], f"≤ {WOERTER_SOLL[ebene]}", ""))
    if ebene == "laden" and schirm != "menue":
        scrollt = m["hoehe"] > m["innen"] + 1
        frei = (schirm == "karte" and zusatz.get("gerichte", 0) > 8) or (schirm.startswith("putzen") and zusatz.get("aufgaben", 0) > 6 and zusatz.get("plan"))
        r.append(("scroll", (not scrollt) or frei, f"{m['hoehe']} px", f"≤ {m['innen']} px", "Ausnahme nach Regel" if scrollt and frei else ""))
        r.append(("absaetze", len(m["absaetze"]) == 0, len(m["absaetze"]), "0", "; ".join(a["text"][:40] for a in m["absaetze"][:3])))
        r.append(("schrift", (m["minFont"] or {"px": 99})["px"] >= SCHRIFT_SOLL, (m["minFont"] or {}).get("px"), f"≥ {SCHRIFT_SOLL} px", (m["minFont"] or {}).get("text", "")))
        r.append(("tippflaeche", len(m["tippKlein"]) == 0, len(m["tippKlein"]), "0 unter 44 px", "; ".join(f"{x['text']} {x['w']}×{x['h']}" for x in m["tippKlein"][:4])))
        if m["kontrast"]:
            mk = min(x["verhaeltnis"] for x in m["kontrast"])
            r.append(("kontrast", mk >= KONTRAST_SOLL, mk, f"≥ {KONTRAST_SOLL}:1", ""))
    haupt = [k for k in m["knoepfe"] if k["haupt"] or k["kachel"]]
    if haupt:
        mh = min(k["h"] for k in haupt)
        r.append(("knopfhoehe", mh >= KNOPF_SOLL, f"{mh} px", f"≥ {KNOPF_SOLL} px", "; ".join(f"{k['text'][:25]} {k['h']}" for k in haupt if k["h"] < KNOPF_SOLL)[:120]))
    r.append(("verboten", not m["verboten"], len(m["verboten"]), "0", ", ".join(m["verboten"])))
    return r


async def lauf(b, breite, hoehe, fehler):
    """Ein Durchlauf je Viewport: Schnellstart, Laden-Bildschirme, Menü-Blatt, Büro (Code), Personal, Putzplan mit Plan."""
    vp = f"{breite}x{hoehe}"; ctx, pg = await schnellstart.kontext(b, breite, hoehe, fehler)
    stand_mess = {}; befunde = []
    try:
        await schnellstart.schnellstart(pg, PORT, name="Döner Test")
        stand = await pg.evaluate("window.__gastrocalc.stand"); aus = ausschluss_fuer(stand, "Döner Test")
        n = 0
        async def bild(name):
            nonlocal n; n += 1; await pg.screenshot(path=str(OUT / f"{vp}_{n:02d}_{name}.png"), full_page=False)
        async def schirm(name, ebene, wurzel="#app", zusatz=None):
            await pg.wait_for_timeout(250); m = await messen(pg, wurzel, aus); await bild(name)
            stand_mess[name] = {**m, "ebene": ebene, **(zusatz or {})}
            for regel, ok, ist, soll, hinweis in regeln_pruefen(name, ebene, m, zusatz or {}):
                befunde.append({"viewport": vp, "bildschirm": name, "regel": regel, "ok": ok, "ist": ist, "soll": soll, "hinweis": hinweis})
        # ---- Laden
        for ziel, name in (("start", "heute"), ("muell", "muell"), ("kuehl", "kuehlung"), ("putzplan", "putzen"), ("karte", "karte")):
            await nav_hilfe.geh(pg, ziel)
            zusatz = {"gerichte": len(stand["gerichte"])} if name == "karte" else {"plan": True, "aufgaben": await pg.locator('[data-a="pp-haken"]').count()} if name == "putzen" else {}  # Laden-Umbau (20.10.2026): Plan nach Laden-Art gleich da
            await schirm(name, "laden", zusatz=zusatz)
            if name == "muell":
                # Echte Browser-Abnahme der neuen Müll-Station: eine Aufnahme, keine Demo-Zahlen.
                await pg.click('#app [data-a="muell-station-auf"]')
                await pg.wait_for_selector(".muell-station")
                assert "€" not in await pg.locator(".muell-station").inner_text()
                assert await pg.locator(".tableiste").count() == 0
                assert await pg.locator(".muell-station-raster [data-a='muell-tipp']").count() > 0
                await bild("muell-station")
                await pg.click('#app [data-a="muell-station-zu"]')
                await pg.wait_for_selector(".muell1")
        # Laden-Umbau (20.10.2026): „Umsatz heute“ (Feld auf Heute) und „Tag abschließen“
        await nav_hilfe.geh(pg, "start"); await pg.click('#app [data-a="nav"][data-wert="umsatzheute"]'); await pg.wait_for_selector('[data-f="ul-umsatz"]')
        await schirm("umsatz-heute", "laden")
        await nav_hilfe.geh(pg, "abschluss"); await schirm("abschluss", "laden")
        await nav_hilfe.geh(pg, "start"); await nav_hilfe.menue(pg)
        await schirm("menue", "laden", wurzel="#ebene-huelle .blatt-menue")
        await pg.click('#ebene-huelle button[data-a="blatt-zu"]'); await pg.wait_for_timeout(200)
        # ---- Büro: Code 1234 setzen, Büro-Start messen
        await schnellstart.code_setzen(pg, "1234")
        await schirm("buero", "buero")
        # ---- Personal: über das Menü-Blatt (Code ist gesetzt → direkt hinein)
        await nav_hilfe.zum_laden(pg); await nav_hilfe.menue(pg)
        await pg.click('#ebene-huelle [data-a="modus"][data-wert="personal"]'); await pg.wait_for_selector(".riesenkachel")
        assert await nav_hilfe.modus(pg) == "personal"
        await schirm("personal", "personal")
        # zurück in den Laden: Schloss → Code
        await pg.click('[data-a="schloss"]'); await pg.wait_for_selector("#ebene-huelle .blatt-pin"); await schnellstart.code_tippen(pg, "1234")
        await pg.locator("#ebene-huelle .blatt-pin").wait_for(state="detached", timeout=20000); await pg.wait_for_timeout(300)
        assert await nav_hilfe.modus(pg) == "laden"
        # ---- Putzen mit übernommenem Plan (Vorschlag für den Dönerladen)
        await nav_hilfe.geh(pg, "putzplan"); await pg.wait_for_selector('[data-a="pp-haken"]')  # Laden-Umbau (20.10.2026): kein „Plan übernehmen“ mehr im Laden
        aufgaben = await pg.locator('[data-a="pp-haken"]').count()
        await schirm("putzen-plan", "laden", zusatz={"plan": True, "aufgaben": aufgaben})
    finally:
        await ctx.close()
    return stand_mess, befunde


def de_js_pruefen():
    """Verbotene Wörter in js/lang/de.js (zusammengesetzte Wörter; „HACCP“ und „Nachweis“ allein sind erlaubt)."""
    text = (APP / "js" / "lang" / "de.js").read_text(encoding="utf-8")
    treffer = []
    for i, zeile in enumerate(text.splitlines(), 1):
        for v in VERBOTEN:
            if v.lower() in zeile.lower(): treffer.append({"zeile": i, "wort": v})
    return treffer


def main():
    t0 = time.time()
    ausnahmen_datei = TESTS / "regeln_ausnahmen.json"
    ausnahmen = json.loads(ausnahmen_datei.read_text(encoding="utf-8")) if ausnahmen_datei.exists() else []
    bekannt = {(a["bildschirm"], a["regel"]) for a in ausnahmen}
    fehler = []; stand = {}; befunde = []
    srv = schnellstart.server(PORT)
    try:
        async def alles():
            async with async_playwright() as p:
                b = await p.chromium.launch()
                for breite, hoehe in VIEWPORTS:
                    s, f = await lauf(b, breite, hoehe, fehler); stand[f"{breite}x{hoehe}"] = s; befunde.extend(f)
                if os.environ.get("SANJI_PILOT_BILDER") == "1":
                    await pilot_karten_browser.run(b, PORT, OUT)
                if os.environ.get("SANJI_ABSCHLUSS_BILDER","1") == "1":
                    await abschluss_browser.run(b, PORT, OUT)
                await b.close()
        asyncio.run(alles())
    finally:
        srv.terminate()
    de_treffer = de_js_pruefen()
    befunde.append({"viewport": "-", "bildschirm": "js/lang/de.js", "regel": "verboten", "ok": not de_treffer, "ist": len(de_treffer), "soll": "0", "hinweis": "; ".join(f"Z. {t['zeile']} {t['wort']}" for t in de_treffer[:5])})
    verletzt = [b for b in befunde if not b["ok"]]
    neu = [b for b in verletzt if (b["bildschirm"], b["regel"]) not in bekannt]
    unnoetig = sorted(k for k in bekannt if not any((b["bildschirm"], b["regel"]) == k for b in verletzt))
    try: fassung = subprocess.run(["git", "rev-parse", "--short", "HEAD"], cwd=APP, capture_output=True, text=True).stdout.strip()
    except Exception: fassung = ""
    (TESTS / "regeln_stand.json").write_text(json.dumps({"datum": time.strftime("%Y-%m-%d %H:%M"), "fassung": fassung, "dauer_s": round(time.time() - t0, 1),
        "soll": {"woerter": WOERTER_SOLL, "knopfhoehe": KNOPF_SOLL, "schrift": SCHRIFT_SOLL, "tippflaeche": TIPP_SOLL, "kontrast": KONTRAST_SOLL, "absatzWoerter": ABSATZ_WOERTER},
        "bildschirme": stand, "befunde": befunde, "de_js": de_treffer, "neueVerletzungen": neu, "ausnahmenOhneBefund": unnoetig, "konsolenfehler": fehler}, ensure_ascii=False, indent=1), encoding="utf-8")
    # ---- Zusammenfassung
    print(f"Regelprüfung GastroCalc {fassung} · {len(VIEWPORTS)} Viewports · {time.time() - t0:.0f} s")
    for vp in [f"{b}x{h}" for b, h in VIEWPORTS]:
        print(f"\n[{vp}]")
        for b in befunde:
            if b["viewport"] != vp: continue
            lage = "BESTANDEN" if b["ok"] else ("VERLETZT (bekannt)" if (b["bildschirm"], b["regel"]) in bekannt else "VERLETZT (NEU)")
            print(f"  {b['bildschirm']:<12} {b['regel']:<11} {lage:<19} ist {b['ist']!s:<10} soll {b['soll']}" + (f"  – {b['hinweis']}" if b["hinweis"] and not b["ok"] else ""))
    d = befunde[-1]; print(f"\n  de.js        verboten    {'BESTANDEN' if d['ok'] else 'VERLETZT'}           ist {d['ist']} soll 0" + (f"  – {d['hinweis']}" if d["hinweis"] else ""))
    print(f"\nVerletzungen: {len(verletzt)} · davon bekannt (Ausnahmen): {len(verletzt) - len(neu)} · neu: {len(neu)}")
    if unnoetig: print("Ausnahmen ohne Befund (können raus):", ", ".join(f"{a}/{r}" for a, r in unnoetig))
    if fehler: print("Konsolenfehler:", fehler)
    print("Messwerte:", TESTS / "regeln_stand.json", "· Bilder:", OUT)
    if neu or fehler:
        for b in neu: print(f"NEU: {b['viewport']} {b['bildschirm']} {b['regel']} ist {b['ist']} soll {b['soll']}")
        sys.exit(1)


if __name__ == "__main__":
    main()
