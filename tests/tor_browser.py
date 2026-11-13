"""Das „Tor“ (13.11.2026): Zählung über ALLE Bildschirme der App (dieselbe Liste wie tools/bildschirm_zaehlung.py: Einrichtung, Laden, Personal, Büro,
jeweils mit dem Beispiel-Laden und allen Unterseiten/Blättern, die das Werkzeug durch Klicken erreicht) nach den Regeln des Aussehens „Salbei & Papier“.
Die Liste kommt aus dem Ordner TOR_QUELLE (daten.json des Zählwerkzeugs; die Wege werden in jeder Sprache/Größe nachgespielt, die Einrichtung läuft als Durchgang).
Je Bildschirm wird gemessen – Rückgabecode 1 bei Verstoß:
  a  Zeki-Figuren sichtbar ≤ 1 (Bühne .gc-figur, vorn .gc-zeki-vorn / mascotMarkup, Folgen-Überzug .gc-zeki-folge, alte Figuren .zeki; sichtbar = im Bild, nicht hidden/none/opacity 0)
  b  kein Zeki in der Kopfzeile (.gc-kopf, .ebene-kopf, header außerhalb der Bühne)
  c  keine Sprechblase (sichtbares Element mit „blase“ in der Klasse UND Hintergrund, Rahmen oder Schatten)
  d  höchstens ein offenes Blatt (#ebene-huelle .ebene-blatt)
  e  kein doppeltes Feld (gleiches data-f; gleiches data-a + data-wert + Text; Listenzeilen mit data-id / data-i ausgenommen)
  f  kein Überlauf: waagrecht nirgends; senkrecht nicht in Laden und Personal bei 390 × 844 (Ausnahmen wie in tests/laden_aussehen_browser.py, siehe AUSNAHMEN)
  g  Personal: kein „€“ im sichtbaren Text
  h  Arabisch: Code-Tasten 1, 2, 3 von links nach rechts (Büro-Code-Blatt wird dafür eigens geöffnet)
  i  Weinrot (--weinrot / --muell) nur in Müll-Ansichten; Glut (--glut) höchstens an EINEM sichtbaren Element je Bildschirm (Strich am aktiven Reiter zählt nicht)
  j  mit reduced_motion="reduce": nichts an der Figur läuft (keine CSS-Animation/Transition > 0 s, kein Folgen-Überzug)
  k  Dunkel (color_scheme="dark") für Laden und Büro-Start: dieselben Zählungen a–f
Läufe: de, tr, ar bei 390 × 844 (hell); Laden und Personal zusätzlich bei 360 × 740; Dunkel (de): Laden + Büro; reduzierte Bewegung (de): Laden, Personal, Büro.
Dazu die Sonderbildschirme aus tools/uebersichtsbild.py (Führung, Intro, Menü-Blatt, Hilfe-Blatt, Büro-Code-Blatt).
Umgebung: DURCHLAUF_PORT (Standard 9020; jeder Lauf nutzt bis zu 4 Ports ab dort) · TOR_SPRACHEN=de,tr,ar · TOR_QUELLE=<Ordner mit daten.json> · TOR_TEIL=<name> (Teil-Lauf, danach --zusammen) · TOR_LAEUFE=hell,klein,dunkel,reduziert · TOR_OUT=/home/claude/uebersicht
Aufruf: python3 tools/sw_liste.py && DURCHLAUF_PORT=9020 python3 tests/tor_browser.py"""
import asyncio, json, os, pathlib, sys, time

from playwright.async_api import async_playwright

HIER = pathlib.Path(__file__).resolve().parent
sys.path.insert(0, str(HIER)); sys.path.insert(0, str(HIER.parent / "tools"))
import nav_hilfe, schnellstart  # noqa: E402
import bildschirm_zaehlung as Z  # noqa: E402
import uebersichtsbild as U  # noqa: E402

OUT = pathlib.Path(os.environ.get("TOR_OUT", "/home/claude/uebersicht")); OUT.mkdir(parents=True, exist_ok=True)
PORT = int(os.environ.get("DURCHLAUF_PORT", "9020"))
SPRACHEN = os.environ.get("TOR_SPRACHEN", "de,tr,ar").split(",")
LAEUFE = os.environ.get("TOR_LAEUFE", "hell,klein,dunkel,reduziert").split(",")
Z.TIEFE = int(os.environ.get("TOR_TIEFE", "1"))
NUR_EBENEN = [x for x in os.environ.get("TOR_EBENEN", "").split(",") if x]  # zum Ausprobieren: nur diese Ebenen
Z.KEIN_FOTO = True
QUELLE = pathlib.Path(os.environ.get("TOR_QUELLE", "/home/claude/uebersicht/zaehlung-de"))  # Liste der Bildschirme (daten.json) aus tools/bildschirm_zaehlung.py

REGELN = {"a": "Zeki-Figuren > 1", "b": "Zeki in der Kopfzeile", "c": "Sprechblase", "d": "mehr als ein Blatt offen", "e": "doppeltes Feld/Knopf",
          "f": "Überlauf", "g": "Euro im Personal", "h": "Code-Tasten nicht 1-2-3 links→rechts (ar)", "i": "Weinrot/Glut", "j": "Bewegung trotz „reduzieren“", "k": "Dunkel (a–f)"}

# Ausnahmen für senkrechtes Scrollen (aus tests/laden_aussehen_browser.py übernommen; Schlüssel = Teil des Bildschirmnamens)
AUSNAHMEN_SCROLL = {
    "karte": "Karte mit mehr als 8 Gerichten: die Liste darf wachsen (Regel in tests/regeln.py)",
    "putzplan": "Putzliste mit mehr als 6 Aufgaben (Regel in tests/regeln.py)",
    "andere": "Suchblatt „Andere“ ist ein Blatt von unten über allen Waren und scrollt in sich",
    "kuehl-warnung": "nur 360 × 740: Warnzustand mit 7 Maßnahmen-Chips (Wunsch an buehne.css: niedrigere Bühne)",
}

TOR_JS = r"""
() => {
  const W = innerWidth, H = innerHeight;
  const stil = (e) => getComputedStyle(e);
  const sichtbar = (e) => { const s = stil(e); if (s.display === 'none' || s.visibility === 'hidden' || Number(s.opacity) < 0.05) return false;
    if (e.closest('details:not([open])') && !e.closest('summary')) return false;
    if (e.closest('[hidden], .nur-druck, template, script, style')) return false;
    for (let p = e.parentElement; p; p = p.parentElement) { const ps = stil(p); if (ps.display === 'none' || ps.visibility === 'hidden' || Number(ps.opacity) < 0.05) return false; }
    const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0; };
  const imBild = (e) => { const r = e.getBoundingClientRect(); return r.right > 0 && r.left < W && r.bottom > 0 && r.top < H; };
  const nm = (e) => (e.tagName.toLowerCase() + (e.className && typeof e.className === 'string' ? '.' + e.className.trim().split(/\s+/).slice(0, 2).join('.') : '') + (e.getAttribute('data-a') ? '[' + e.getAttribute('data-a') + ']' : '')).slice(0, 70);
  const rgb = (s) => { const m = /rgba?\(([^)]+)\)/.exec(s || ''); if (!m) return null; const p = m[1].split(/[ ,\/]+/).filter(Boolean).map(Number); return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 }; };
  const probe = document.createElement('i'); document.body.appendChild(probe);
  const token = (n) => { probe.style.color = 'var(' + n + ')'; return rgb(stil(probe).color); };
  const glut = token('--glut'), wein = token('--weinrot'), muell = token('--muell'); probe.remove();
  const gleich = (c, t) => c && t && c.a > 0.99 && Math.abs(c.r - t.r) < 1.5 && Math.abs(c.g - t.g) < 1.5 && Math.abs(c.b - t.b) < 1.5;

  // a) Zeki-Figuren: Behälter (.gc-figur, [data-zeki-vorn]) oder freie Zeki-Bilder / alte Figuren; ein Behälter zählt einmal, auch mit Folgen-Überzug
  const FIG = '.gc-figur, [data-zeki-vorn], .gc-zeki-vorn, .h-zeki-figur, svg.zeki, .zeki-figur, img.gc-zeki, img[src*="zeki"], .gc-zeki-folge';
  const behaelter = (e) => e.closest('.gc-figur, [data-zeki-vorn], .gc-zeki-vorn, .h-zeki-figur') || e;
  const zeigt = (e) => { // zeigt der Behälter wirklich eine Figur? (Bild sichtbar ODER Überzug an)
    const b = behaelter(e);
    const bilder = [...b.querySelectorAll('img.gc-zeki, img[src*="zeki"], svg.zeki, .zeki')].filter((x) => sichtbar(x) && imBild(x));
    const folge = [...b.querySelectorAll('.gc-zeki-folge')].filter((x) => stil(x).display !== 'none' && sichtbar(x) && imBild(x));
    if (e.matches('img, svg, .gc-zeki-folge, .zeki')) return (e.matches('.gc-zeki-folge') ? folge.includes(e) : bilder.includes(e));
    return bilder.length + folge.length > 0 && sichtbar(b) && imBild(b); };
  const figSet = new Set();
  for (const e of document.querySelectorAll(FIG)) if (zeigt(e)) figSet.add(behaelter(e));
  const figuren = [...figSet];
  const figNamen = figuren.map(nm);
  // b) Kopfzeile
  const kopfFig = [];
  for (const k of document.querySelectorAll('.gc-kopf, .ebene-kopf, header.kopf, .kopf')) if (sichtbar(k)) for (const f of k.querySelectorAll(FIG)) if (zeigt(f)) kopfFig.push(nm(f));
  // c) Sprechblasen
  const blasen = [];
  for (const e of document.querySelectorAll('[class*="blase"]')) {
    if (!sichtbar(e) || !imBild(e)) continue; const s = stil(e);
    const bg = rgb(s.backgroundColor), hatBg = (bg && bg.a > 0.05) || (s.backgroundImage && s.backgroundImage !== 'none');
    const hatRand = ['Top', 'Right', 'Bottom', 'Left'].some((k) => parseFloat(s['border' + k + 'Width']) > 0 && s['border' + k + 'Style'] !== 'none' && (rgb(s['border' + k + 'Color']) || { a: 0 }).a > 0.05);
    const hatSchatten = s.boxShadow && s.boxShadow !== 'none';
    if (hatBg || hatRand || hatSchatten) blasen.push(nm(e));
  }
  // d) Blätter
  const blaetter = [...document.querySelectorAll('#ebene-huelle .ebene-blatt')].filter(sichtbar).length;
  // e) Doppelte Felder und Knöpfe
  const felderN = {}; for (const e of document.querySelectorAll('input[data-f], select[data-f], textarea[data-f]')) if (sichtbar(e) && e.type !== 'hidden') felderN[e.dataset.f] = (felderN[e.dataset.f] || 0) + 1;
  const doppeltF = Object.entries(felderN).filter(([, n]) => n > 1).map(([k, n]) => k + ' ×' + n);
  const knN = {};
  for (const e of document.querySelectorAll('[data-a]')) {
    if (!sichtbar(e) || e.dataset.id !== undefined || e.dataset.i !== undefined || e.closest('[aria-hidden="true"]')) continue;
    if (e.matches('input, select, textarea')) continue;
    const t = (e.innerText || e.getAttribute('aria-label') || '').replace(/\s+/g, ' ').trim();
    const k = e.dataset.a + '|' + (e.dataset.wert ?? '') + '|' + t; knN[k] = (knN[k] || 0) + 1;
  }
  const doppeltK = Object.entries(knN).filter(([, n]) => n > 1).map(([k, n]) => k.split('|').filter(Boolean).join(' / ') + ' ×' + n);
  // f) Überlauf
  const de = document.documentElement, app = document.querySelector('#app');
  const ueberX = Math.max(de.scrollWidth, document.body.scrollWidth) > W + 1;
  const ueberEl = [];
  for (const e of document.querySelectorAll('#app *, #ebene-huelle *')) {
    if (!sichtbar(e)) continue; const r = e.getBoundingClientRect(); if (r.right <= W + 1 && r.left >= -1) continue;
    let p = e.parentElement, scr = false; while (p && p !== document.body) { const o = stil(p).overflowX; if (o === 'auto' || o === 'scroll' || o === 'hidden' || o === 'clip') { scr = true; break; } p = p.parentElement; }
    if (!scr) ueberEl.push(nm(e) + ' (rechts ' + Math.round(r.right) + ')');
  }
  const ueberY = Math.max(0, de.scrollHeight - H), appY = app ? Math.max(0, app.scrollHeight - app.clientHeight) : 0;
  // g) Euro im sichtbaren Text
  const wurzeln = [app, document.querySelector('#ebene-huelle')].filter(Boolean); let euro = false;
  for (const w of wurzeln) { const tw = document.createTreeWalker(w, NodeFilter.SHOW_TEXT); for (let n = tw.nextNode(); n; n = tw.nextNode()) { if (n.textContent.includes('€') && n.parentElement && sichtbar(n.parentElement) && !n.parentElement.closest('[aria-hidden="true"]')) { euro = true; break; } } }
  // h) Code-Tasten
  const tasten = ['1', '2', '3'].map((z) => { const k = document.querySelector('[data-a="pin-taste"][data-wert="' + z + '"]'); return k && sichtbar(k) ? Math.round(k.getBoundingClientRect().left) : null; });
  const tastenDa = tasten.every((x) => x !== null);
  // i) Farben
  const farbig = (e, t) => { const s = stil(e); const pr = [s.color, s.backgroundColor, s.fill, s.stroke];
    for (const k of ['Top', 'Right', 'Bottom', 'Left']) if (parseFloat(s['border' + k + 'Width']) > 0 && s['border' + k + 'Style'] !== 'none') pr.push(s['border' + k + 'Color']);
    if (s.outlineStyle !== 'none' && parseFloat(s.outlineWidth) > 0) pr.push(s.outlineColor);
    return pr.some((c, i) => { if (!gleich(rgb(c), t)) return false; if (i === 0) return [...e.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim()) || e.matches('svg, svg *'); return true; }); };
  const alle = [...document.querySelectorAll('body *')].filter((e) => !e.closest('script,style') && sichtbar(e) && imBild(e));
  const glutEl = alle.filter((e) => !e.closest('.tableiste') && farbig(e, glut)).map(nm);
  const weinEl = alle.filter((e) => farbig(e, wein) || farbig(e, muell)).map(nm);
  // j) Bewegung an der Figur
  const lauf = [];
  for (const f of document.querySelectorAll(FIG + ', .gc-figur *, [data-zeki-vorn] *')) {
    if (!sichtbar(f)) continue; const s = stil(f); const dauer = (x) => Math.max(0, ...String(x).split(',').map((v) => parseFloat(v) * (/ms$/.test(v.trim()) ? 0.001 : 1)).filter((v) => !isNaN(v)));
    if (s.animationName !== 'none' && dauer(s.animationDuration) > 0) lauf.push(nm(f) + ' Animation ' + s.animationName);
    if (dauer(s.transitionDuration) > 0 && s.transitionProperty !== 'none') lauf.push(nm(f) + ' Übergang ' + s.transitionProperty);
  }
  const ueberzug = [...document.querySelectorAll('.gc-zeki-folge')].filter((x) => stil(x).display !== 'none' && sichtbar(x)).map(nm);
  const gc = window.__gastrocalc; const st = gc && gc.stand;
  return { figuren: figuren.length, figNamen, kopfFig, blasen, blaetter, doppeltF, doppeltK, ueberX, ueberEl: [...new Set(ueberEl)].slice(0, 6), ueberY, appY, euro,
    tasten, tastenDa, glutEl: [...new Set(glutEl)], weinEl: [...new Set(weinEl)], lauf: [...new Set(lauf)].slice(0, 6), ueberzug,
    ebene: (gc && gc.wurzel && gc.wurzel.modus) || 'laden', ansicht: (st && st.ansicht) || '', rtl: document.documentElement.dir === 'rtl' || getComputedStyle(document.body).direction === 'rtl' };
}
"""


def verstoesse(m, ctx, name, modus):
    """Aus den Messwerten eines Bildschirms die Verstöße (Regel → Text) bestimmen."""
    v = []
    hell_dunkel = ctx["farbe"] == "dark"
    if m["figuren"] > 1: v.append(("a", f"{m['figuren']} sichtbare Figuren: {', '.join(m['figNamen'])[:160]}"))
    if m["kopfFig"]: v.append(("b", "Figur in der Kopfzeile: " + ", ".join(m["kopfFig"])[:120]))
    if m["blasen"]: v.append(("c", "Sprechblase: " + ", ".join(m["blasen"])[:120]))
    if m["blaetter"] > 1: v.append(("d", f"{m['blaetter']} Blätter offen"))
    if m["doppeltF"] or m["doppeltK"]: v.append(("e", "doppelt: " + "; ".join(m["doppeltF"] + m["doppeltK"])[:160]))
    if m["ueberX"] or m["ueberEl"]: v.append(("f", "waagrechter Überlauf" + (": " + "; ".join(m["ueberEl"])[:120] if m["ueberEl"] else "")))
    laden_personal = modus in ("laden", "personal") and m["ebene"] in ("laden", "personal")
    if laden_personal and ctx["groesse"] == (390, 844) and (m["ueberY"] > 1 or m["appY"] > 1):
        grund = next((g for k, g in AUSNAHMEN_SCROLL.items() if k in name), None)
        if grund: ctx["ausnahmen"].add((name, grund))
        else: v.append(("f", f"senkrechtes Scrollen (Dokument +{m['ueberY']}, #app +{m['appY']})"))
    if modus == "personal" and m["ebene"] == "personal" and m["euro"]: v.append(("g", "„€“ im sichtbaren Text"))
    if ctx["sprache"] == "ar" and m["tastenDa"] and not (m["tasten"][0] < m["tasten"][1] < m["tasten"][2]): v.append(("h", f"Tasten 1,2,3 bei x = {m['tasten']}"))
    muell = "muell" in name
    if m["weinEl"] and not muell: v.append(("i", "Weinrot außerhalb von Müll: " + ", ".join(m["weinEl"])[:120]))
    if len(m["glutEl"]) > 1: v.append(("i", f"Glut an {len(m['glutEl'])} Elementen: " + ", ".join(m["glutEl"])[:140]))
    if ctx["reduziert"] and (m["lauf"] or m["ueberzug"]): v.append(("j", "Bewegung: " + "; ".join(m["lauf"] + m["ueberzug"])[:140]))
    return v


async def messen_haken(lauf, eintrag, zustand):
    m = await lauf.pg.evaluate(TOR_JS)
    ctx = lauf.tor
    zeile = {"sprache": ctx["sprache"], "groesse": f"{ctx['groesse'][0]}x{ctx['groesse'][1]}", "farbe": ctx["farbe"], "bewegung": "reduziert" if ctx["reduziert"] else "normal",
             "ebene": lauf.modus, "name": eintrag["name"], "titel": eintrag["titel"], "blatt": eintrag["blatt"], "messwerte": m}
    zeile["verstoesse"] = [{"regel": r, "text": t} for r, t in verstoesse(m, ctx, f"{lauf.modus}-{eintrag['name']}", lauf.modus)]
    if ctx["farbe"] == "dark":
        for x in zeile["verstoesse"]:
            if x["regel"] in "abcdef": x["dunkel"] = True
    ctx["zeilen"].append(zeile)
    return {"figuren": m["figuren"], "verstoesse": len(zeile["verstoesse"])}


async def lauf_gruppe(b, ctx, modi, port):
    """Ein Satz Läufe (je Ebene ein eigener Kontext und Server): die Wege der Liste aus tools/bildschirm_zaehlung.py (daten.json, Ordner QUELLE) werden
    nachgespielt und an jedem Bildschirm gemessen. Die Einrichtung läuft als eigener Durchgang mit Messung je Schritt."""
    async def messen(l, e, z):
        await messen_haken(l, e, z)
    neu, notizen = await U.nachspielen(b, QUELLE, None, ctx["sprache"], ctx["farbe"], port, modi=modi, groesse=ctx["groesse"], reduziert=ctx["reduziert"], messen=messen, lauf_ctx=ctx)
    return notizen


async def sonderlauf(b, ctx, port):
    """Führung, Intro, Menü-Blatt, Hilfe-Blatt, Büro-Code-Blatt (tools/uebersichtsbild.py) und Regel h (Tasten im Arabischen)."""
    Z.SPRACHE = ctx["sprache"]; os.environ["SCHNELLSTART_SPRACHE"] = ctx["sprache"]
    async def haken(name, pg):
        m = await pg.evaluate(TOR_JS)
        v = verstoesse(m, ctx, "sonder-" + name, "laden")
        ctx["zeilen"].append({"sprache": ctx["sprache"], "groesse": f"{ctx['groesse'][0]}x{ctx['groesse'][1]}", "farbe": ctx["farbe"], "bewegung": "reduziert" if ctx["reduziert"] else "normal",
                              "ebene": "sonder", "name": name, "titel": "", "blatt": "", "messwerte": m, "verstoesse": [{"regel": r, "text": t} for r, t in v]})
    await U.sonderschirme(b, port, ctx["sprache"], ctx["farbe"], ctx["groesse"], haken, reduziert=ctx["reduziert"])


async def main():
    t0 = time.time(); zeilen = []; ausnahmen = set(); notizen = []
    plan = []  # (Name, sprache, groesse, farbe, reduziert, ebenen)
    for sp in SPRACHEN:
        if "hell" in LAEUFE: plan.append(("hell", sp, (390, 844), "light", False, ["einrichtung", "laden", "personal", "buero"]))
        if "klein" in LAEUFE: plan.append(("klein", sp, (360, 740), "light", False, ["laden", "personal"]))
    if "dunkel" in LAEUFE and "de" in SPRACHEN: plan.append(("dunkel", "de", (390, 844), "dark", False, ["laden", "buero"]))
    if "reduziert" in LAEUFE and "de" in SPRACHEN: plan.append(("reduziert", "de", (390, 844), "light", True, ["laden", "personal", "buero"]))
    Z.NACH_FOTO = messen_haken  # gilt nur für die Einrichtung (Z.einrichtung ruft foto auf)
    async with async_playwright() as p:
        b = await p.chromium.launch(args=["--no-sandbox"])
        for name, sp, gr, farbe, red, ebenen in plan:
            if NUR_EBENEN: ebenen = [e for e in ebenen if e in NUR_EBENEN]
            ctx = {"lauf": name, "sprache": sp, "groesse": gr, "farbe": farbe, "reduziert": red, "zeilen": zeilen, "ausnahmen": ausnahmen}
            t1 = time.time()
            print(f"== Lauf {name}: {sp} {gr[0]}x{gr[1]} {farbe}{' reduziert' if red else ''} – Ebenen {','.join(ebenen)}", flush=True)
            nz = await lauf_gruppe(b, ctx, ebenen, PORT)
            notizen += [f"{name}/{sp}: {n}" for n in dict.fromkeys(nz)]
            if name in ("hell", "dunkel", "reduziert"):
                try: await sonderlauf(b, ctx, PORT)
                except Exception as e: notizen.append(f"{name}/{sp}/sonder: {e!r}"[:300])
            print(f"   {sum(1 for z in zeilen if z['sprache'] == sp)} Messungen bisher ({time.time() - t1:.0f} s)", flush=True)
        await b.close()
    Z.NACH_FOTO = None
    teil = os.environ.get("TOR_TEIL")
    if teil:  # Teil-Lauf (parallel mit anderen Sprachen): Rohdaten ablegen, ausgewertet wird mit --zusammen
        (OUT / f"tor-teil-{teil}.json").write_text(json.dumps({"zeilen": zeilen, "ausnahmen": sorted(ausnahmen), "notizen": notizen, "dauer": time.time() - t0}, ensure_ascii=False), encoding="utf-8")
        print(f"Teil {teil}: {len(zeilen)} Messungen → tor-teil-{teil}.json"); return
    auswerten(zeilen, ausnahmen, notizen, time.time() - t0)


def zusammen():
    zeilen, ausnahmen, notizen, dauer = [], set(), [], 0
    for f in sorted(OUT.glob("tor-teil-*.json")):
        d = json.loads(f.read_text(encoding="utf-8")); zeilen += d["zeilen"]; ausnahmen |= {tuple(x) for x in d["ausnahmen"]}; notizen += d["notizen"]; dauer = max(dauer, d["dauer"])
    auswerten(zeilen, ausnahmen, notizen, dauer)


def auswerten(zeilen, ausnahmen, notizen, dauer):
    # ---- Auswertung
    je_regel = {r: [] for r in REGELN}
    for z in zeilen:
        for x in z["verstoesse"]:
            je_regel[x["regel"]].append(f"{z['sprache']}/{z['groesse']}/{z['farbe']}{'/red' if z['bewegung'] == 'reduziert' else ''} {z['ebene']}-{z['name']}: {x['text']}")
            if x.get("dunkel"): je_regel["k"].append(f"{z['sprache']} {z['ebene']}-{z['name']} [{x['regel']}]: {x['text']}")
    zaehl = {}
    for z in zeilen:
        k = (z["ebene"], z["sprache"], z["groesse"], z["farbe"], z["bewegung"]); zaehl[k] = zaehl.get(k, 0) + 1
    ergebnis = {"stand": time.strftime("%d.%m.%Y %H:%M"), "dauer_min": round(dauer / 60, 1), "regeln": REGELN,
                "verstoesse_je_regel": {r: len(v) for r, v in je_regel.items()}, "ausnahmen": sorted(f"{n}: {g}" for n, g in ausnahmen), "notizen": notizen,
                "bildschirme_je_lauf": [{"ebene": k[0], "sprache": k[1], "groesse": k[2], "farbe": k[3], "bewegung": k[4], "anzahl": n} for k, n in sorted(zaehl.items())],
                "tabelle": zeilen}
    (OUT / "tor.json").write_text(json.dumps(ergebnis, ensure_ascii=False, indent=1), encoding="utf-8")
    # ---- Konsole
    print("\nTOR – Bildschirme je Lauf:")
    for e in ergebnis["bildschirme_je_lauf"]: print(f"  {e['ebene']:13s} {e['sprache']} {e['groesse']} {e['farbe']:5s} {e['bewegung']:9s} {e['anzahl']:3d}")
    print("\nTOR – Verstöße je Regel:")
    for r, text in REGELN.items(): print(f"  {r}) {text}: {len(je_regel[r])}")
    for r in REGELN:
        if je_regel[r]:
            print(f"\n{r}) {REGELN[r]}")
            for t in je_regel[r][:40]: print("   -", t)
            if len(je_regel[r]) > 40: print(f"   … und {len(je_regel[r]) - 40} weitere (siehe tor.json)")
    if ausnahmen:
        print("\nAusnahmen (Scrollen, mit Grund):")
        for n, g in sorted(ausnahmen): print(f"   - {n}: {g}")
    if notizen:
        print("\nNotizen des Werkzeugs:")
        for n in notizen[:30]: print("   -", n)
    print("\nErgebnis:", OUT / "tor.json")
    schlecht = sum(len(v) for r, v in je_regel.items() if r != "k")
    sys.exit(1 if schlecht else 0)


if __name__ == "__main__":
    if "--zusammen" in sys.argv: zusammen()
    else: asyncio.run(main())
