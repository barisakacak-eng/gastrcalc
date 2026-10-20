#!/usr/bin/env python3
"""Bildschirm-Zählung (20.10.2026): öffnet jeden erreichbaren Bildschirm der App im Handy-Format (390×844, Deutsch, Beispiel-Laden)
in allen Ebenen – Laden, Personal (mit Büro-Code), Büro – plus die Einrichtung (Schnellweg und „Alles genau einrichten“).

Woher die Bildschirme kommen:
  1. aus dem Code: alle Ansichten aus der Zeichen-Weiche in js/app.js (ansicht === "…" ? …View) und die erlaubten Ansichten je
     Ebene aus js/modus.js (LADEN_ANSICHTEN, PERSONAL_ANSICHTEN). Jede Ansicht wird über einen Nav-Knopf geöffnet, den das Werkzeug
     in die Seite legt (genau der Weg, den die App selbst für data-a="nav" nimmt).
  2. durch Klicken: auf jedem Bildschirm wird jeder sichtbare Knopf mit data-a einmal angetippt (bis Tiefe 2). Ändert sich danach
     der Bildschirm (andere Knöpfe/Felder, Titel oder ein Blatt geht auf), zählt das als eigener Bildschirm (Unterseite, Blatt, Dialog).
     Löschen, Verwerfen, Sprache, Code setzen, Einlesen usw. werden nicht angetippt (Liste SPERRE).
  3. Abdeckung: Chromium-Profiler (CDP, Precise Coverage) misst, welche Funktionen in js/screens/*.js wirklich liefen.

Je Bildschirm: Foto, sichtbarer Text, Wortzahl (ganzer Bildschirm und nur der sichtbare Ausschnitt), Laden-Regel (≤ 15 Wörter),
Konsolenfehler, waagerechter Überlauf (Seite und einzelne Elemente), abgeschnittene Texte.
Ausgabe (außerhalb des Repos): /tmp/zaehlung/<modus>-<name>.png, /tmp/zaehlung/bericht.md, /tmp/zaehlung/wand.html, /tmp/zaehlung/daten.json

Start:  python3 tools/bildschirm_zaehlung.py      (eigene Webserver auf DURCHLAUF_PORT … +3, Standard 8790)
Umgebung: ZAEHLUNG_OUT=/tmp/zaehlung  ZAEHLUNG_TIEFE=2  ZAEHLUNG_MAX=170 (Bildschirme je Ebene)  ZAEHLUNG_NUR=laden,buero,personal,einrichtung
Ändert keine App-Datei.
"""
import asyncio, hashlib, html, json, os, pathlib, re, sys, time, traceback

from playwright.async_api import async_playwright

APP = pathlib.Path(__file__).resolve().parent.parent
sys.path.insert(0, str(APP / "tests"))
import nav_hilfe, schnellstart  # noqa: E402  (Wege durch die Ebenen, Server, Code setzen)

OUT = pathlib.Path(os.environ.get("ZAEHLUNG_OUT", "/tmp/zaehlung")); OUT.mkdir(parents=True, exist_ok=True)
PORT = int(os.environ.get("DURCHLAUF_PORT", "8790"))
TIEFE = int(os.environ.get("ZAEHLUNG_TIEFE", "2"))
MAX_JE_EBENE = int(os.environ.get("ZAEHLUNG_MAX", "170"))
MAX_KNOEPFE = 45
NUR = [x for x in os.environ.get("ZAEHLUNG_NUR", "einrichtung,laden,buero,personal").split(",") if x]
CODE = "1234"
LADEN_GRENZE = 15

# Knöpfe, die nicht angetippt werden: zerstören Daten, wechseln Sprache/Ebene/Laden, setzen den Code, öffnen Dateiauswahl,
# oder sind bloß Ziffern/Schließen. nav wird nicht geklickt, sondern als Ziel gesammelt (siehe NAV_ZIELE).
SPERRE = re.compile(r"^(nav|modus|sprache|laden-wechseln|pin-taste|pin-zurueck|blatt-zu|menue-zurueck|ob-fertig|fertig|weiter|zurueck)$|"
                    r"loesch|entfern|verwerf|alles-|import|einlesen-datei|sicherung-teilen|rettung-neu|rettung-ok|pin-setzen|pin-entfernen|"
                    r"beispiel-|laden-neu|neu-laden|aktualisier|update|abmelden|zuruecksetzen|reset|speicher-dauerhaft")

# ---------------------------------------------------------------- Bildschirme aus dem Code
def ansichten_aus_code():
    app = (APP / "js" / "app.js").read_text(encoding="utf-8")
    weiche = re.findall(r'ansicht === "([a-z-]+)" \? (\w+)\(', app)
    imp = {}
    for namen, datei in re.findall(r'import \{([^}]*)\} from "\./screens/([a-z_]+)\.js"', app):
        for n in namen.split(","):
            n = n.strip().split(" as ")[0].strip()
            if n: imp[n] = datei
    ansichten, schon = [], set()
    for a, f in weiche:  # nur die Zeichen-Weiche (…View / …Schirm), nicht die Kennungs-Kette davor
        if f.endswith("Kennung") or a in schon: continue
        schon.add(a); ansichten.append({"ansicht": a, "funktion": f, "datei": imp.get(f, "app.js (eigene Funktion)")})
    ansichten.append({"ansicht": "start", "funktion": "startView", "datei": imp.get("startView", "home")})  # „sonst“-Zweig der Weiche
    modus = (APP / "js" / "modus.js").read_text(encoding="utf-8")
    tabs = re.findall(r'"([a-z]+)"', re.search(r"LADEN_TABS = \[([^\]]*)\]", modus).group(1))
    laden_extra = re.findall(r'"([a-z]+)"', re.search(r"LADEN_ANSICHTEN = \[\.\.\.LADEN_TABS, ([^\]]*)\]", modus).group(1))
    personal = re.findall(r'"([a-z]+)"', re.search(r"PERSONAL_ANSICHTEN = \[([^\]]*)\]", modus).group(1))
    alle = [a["ansicht"] for a in ansichten]
    je_modus = {
        "laden": tabs + laden_extra,
        "personal": personal,
        "buero": [a for a in alle if a not in ("personal", "start")],
    }
    return ansichten, je_modus, imp


def screens_dateien():
    return sorted(p.stem for p in (APP / "js" / "screens").glob("*.js"))


def exportierte_funktionen(datei):
    src = (APP / "js" / "screens" / f"{datei}.js").read_text(encoding="utf-8")
    return re.findall(r"^export (?:async )?function (\w+)", src, re.M) + re.findall(r"^export const (\w+) = (?:\([^)]*\)|\w+) =>", src, re.M)


# ---------------------------------------------------------------- Seite auslesen
LESEN_JS = r"""
() => {
  const blatt = document.querySelector('#ebene-huelle .ebene-blatt');
  const wurzel = blatt || document.querySelector('#app');
  const W = window.innerWidth, H = window.innerHeight;
  const sichtbar = (el) => { if (!el) return false; const cs = getComputedStyle(el); if (cs.visibility === 'hidden' || cs.display === 'none' || Number(cs.opacity) === 0) return false; return el.getClientRects().length > 0; };
  const voll = [], sicht = [], ohneLeiste = [];
  const tw = document.createTreeWalker(wurzel, NodeFilter.SHOW_TEXT);
  for (let n = tw.nextNode(); n; n = tw.nextNode()) {
    const t = n.textContent.replace(/\s+/g, ' ').trim(); if (!t) continue;
    const el = n.parentElement; if (!sichtbar(el) || el.closest('[aria-hidden="true"], script, style, template, .nur-druck, [hidden]')) continue;
    const r = document.createRange(); r.selectNodeContents(n); const rs = [...r.getClientRects()]; if (!rs.length) continue;
    voll.push(t);
    if (!el.closest('.tableiste')) ohneLeiste.push(t);
    if (rs.some((x) => x.bottom > 0 && x.top < H && x.right > 0 && x.left < W)) sicht.push(t);
  }
  // Knöpfe und Felder als Fingerabdruck
  const knoepfe = [], felder = new Set(), namen = new Set();
  for (const el of wurzel.querySelectorAll('[data-a]')) {
    if (!sichtbar(el) || el.disabled) continue;
    const a = el.dataset.a; namen.add(a);
    knoepfe.push({ a, wert: el.dataset.wert ?? null, id: el.dataset.id ?? null, text: (el.innerText || el.getAttribute('aria-label') || '').replace(/\s+/g, ' ').trim().slice(0, 60), imBlatt: !!blatt });
  }
  for (const el of wurzel.querySelectorAll('[data-f]')) if (sichtbar(el)) felder.add(el.dataset.f.replace(/[:].*$/, ':*'));
  const titel = (wurzel.querySelector('.kopftitel, h1, h2, .blattkopf b, .hilfe-inhalt b') || {}).innerText || '';
  // Überlauf
  const de = document.documentElement;
  const ueber = [];
  for (const el of document.querySelectorAll('#app *, #ebene-huelle *')) {
    if (!sichtbar(el)) continue; const r = el.getBoundingClientRect(); if (r.width === 0) continue;
    if (r.right > W + 1 || r.left < -1) {
      let p = el.parentElement, scroller = false;
      while (p && p !== document.body) { const o = getComputedStyle(p).overflowX; if (o === 'auto' || o === 'scroll' || o === 'hidden' || o === 'clip') { scroller = true; break; } p = p.parentElement; }
      if (!scroller) ueber.push((el.tagName.toLowerCase() + (el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\s+/).join('.') : '')).slice(0, 80) + ` (rechts ${Math.round(r.right)} px)`);
    }
  }
  const abgeschnitten = [];
  for (const el of wurzel.querySelectorAll('*')) {
    if (!sichtbar(el) || el.children.length > 2) continue; const cs = getComputedStyle(el);
    if ((cs.textOverflow === 'ellipsis' || cs.overflowX === 'hidden' || cs.overflow === 'hidden') && el.scrollWidth > el.clientWidth + 1 && (el.innerText || '').trim())
      abgeschnitten.push((el.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 50));
  }
  const s = window.__gastrocalc && window.__gastrocalc.stand;
  return {
    blatt: blatt ? [...blatt.classList].filter((c) => c.startsWith('blatt-')).join(' ') : '',
    schirm: (document.querySelector('#app .schirm') || {}).className || '',
    titel: titel.replace(/\s+/g, ' ').trim().slice(0, 80),
    voll: voll.join(' '), sicht: sicht.join(' '), ohneLeiste: ohneLeiste.join(' '),
    knoepfe, namen: [...namen].sort(), felder: [...felder].sort(),
    seiteBreit: de.scrollWidth > de.clientWidth ? de.scrollWidth - de.clientWidth : 0,
    ueber: [...new Set(ueber)].slice(0, 8), abgeschnitten: [...new Set(abgeschnitten)].slice(0, 8),
    modus: (window.__gastrocalc && window.__gastrocalc.wurzel && window.__gastrocalc.wurzel.modus) || 'laden',
    phase: s ? s.phase : null, schritt: s ? s.schrittId : null,
  };
}
"""
WORT = re.compile(r"[^\W\d_]", re.U)
def woerter(text):
    return [w for w in re.split(r"\s+", text) if WORT.search(w)]


def fingerabdruck(z):
    roh = json.dumps([z["blatt"], z["titel"], z["namen"], z["felder"], z["phase"], z["schritt"] if z["phase"] == "onboarding" else None])
    return hashlib.sha1(roh.encode()).hexdigest()[:12]


def dateiname(s):
    s = s.lower().replace("ä", "ae").replace("ö", "oe").replace("ü", "ue").replace("ß", "ss")
    return re.sub(r"[^a-z0-9]+", "-", s).strip("-")[:80]


# ---------------------------------------------------------------- Ein Durchgang je Ebene
class Lauf:
    def __init__(self, b, modus, port, ansichten_je_modus):
        self.b, self.modus, self.port = b, modus, port
        self.ziele = ansichten_je_modus.get(modus, [])
        self.schirme = []          # Ergebnisse
        self.gesehen = {}          # Fingerabdruck → Name
        self.fehler = []           # Konsolenfehler seit dem letzten Foto
        self.dialoge = []          # Texte nativer Dialoge (confirm/alert) seit dem letzten Foto
        self.nav_gefunden = set()  # nav-Ziele, die als echter Knopf auf einem Bildschirm standen
        self.coverage = {}         # url → set(Funktionsnamen, die liefen)
        self.notizen = []

    async def start(self):
        self.srv = schnellstart.server(self.port)
        self.ctx = await self.b.new_context(viewport={"width": 390, "height": 844}, device_scale_factor=2, is_mobile=True, has_touch=True, locale="de-DE")
        await self.ctx.add_init_script(path=str(APP / "tests" / "hilfe" / "aufklappen.js"))
        await self.ctx.add_init_script(script="window.print = () => { window.__druck = (window.__druck || 0) + 1; };")
        self.pg = pg = await self.ctx.new_page()
        self.ctx.on("page", lambda p: asyncio.ensure_future(p.close()) if p is not self.pg else None)  # WhatsApp/neue Fenster sofort zu
        pg.on("console", lambda m: self.fehler.append(m.text) if m.type == "error" and "ERR_TUNNEL" not in m.text and "ERR_PROXY" not in m.text else None)
        pg.on("pageerror", lambda e: self.fehler.append("pageerror: " + str(e)))
        pg.on("dialog", lambda d: (self.dialoge.append(f"{d.type}: {d.message}"), asyncio.ensure_future(d.dismiss())))
        pg.on("download", lambda d: asyncio.ensure_future(d.cancel()))
        pg.on("filechooser", lambda f: None)
        self.cdp = await self.ctx.new_cdp_session(pg)
        await self.cdp.send("Profiler.enable")
        await self.cdp.send("Profiler.startPreciseCoverage", {"callCount": True, "detailed": False})

    async def abdeckung(self):
        try:
            r = await self.cdp.send("Profiler.takePreciseCoverage")
        except Exception:
            return
        for s in r.get("result", []):
            url = s.get("url", "")
            if "/js/" not in url: continue
            pfad = "js/" + url.split("/js/", 1)[1].split("?")[0]
            liefen = self.coverage.setdefault(pfad, set())
            for f in s.get("functions", []):
                if f.get("functionName") and f["ranges"] and f["ranges"][0]["count"] > 0: liefen.add(f["functionName"])

    async def ende(self):
        await self.abdeckung()
        try: await self.ctx.close()
        except Exception: pass
        self.srv.terminate()

    # ---- Werkzeuge
    async def z(self):
        for _ in range(3):
            try: return await self.pg.evaluate(LESEN_JS)
            except Exception: await self.pg.wait_for_timeout(500)
        return await self.pg.evaluate(LESEN_JS)

    async def foto(self, name, weg, z=None):
        z = z or await self.z()
        fp = fingerabdruck(z)
        if fp in self.gesehen: return None
        name = dateiname(name)
        n = name; i = 2
        while any(s["name"] == n for s in self.schirme): n = f"{name}-{i}"; i += 1
        self.gesehen[fp] = n
        datei = OUT / f"{self.modus}-{n}.png"
        try:
            await self.pg.screenshot(path=str(datei), full_page=True, timeout=15000)
        except Exception as e:
            self.notizen.append(f"Foto {n}: {e}")
        for k in z["knoepfe"]:
            if k["a"] == "nav" and k["wert"]: self.nav_gefunden.add(k["wert"])
        v, s_, ol = woerter(z["voll"]), woerter(z["sicht"]), woerter(z["ohneLeiste"])
        eintrag = {"modus": self.modus, "name": n, "datei": datei.name, "weg": weg, "titel": z["titel"], "blatt": z["blatt"],
                   "phase": z["phase"], "schritt": z["schritt"], "ebeneIst": z["modus"],
                   "woerter": len(v), "woerterSicht": len(s_), "woerterOhneLeiste": len(ol), "text": z["voll"][:4000],
                   "seiteBreit": z["seiteBreit"], "ueber": z["ueber"], "abgeschnitten": z["abgeschnitten"],
                   "fehler": list(dict.fromkeys(self.fehler)), "dialoge": list(dict.fromkeys(self.dialoge)), "knoepfe": len(z["knoepfe"])}
        self.fehler.clear(); self.dialoge.clear()
        self.schirme.append(eintrag)
        return eintrag

    async def blatt_zu(self):
        for _ in range(4):
            if not await self.pg.locator("#ebene-huelle .ebene-blatt").count(): return True
            if await self.pg.locator("#ebene-huelle .blatt-pin, #ebene-huelle .blatt-rettung, #ebene-huelle .blatt-rettungscode").count():
                await self.pg.go_back(); await self.pg.wait_for_timeout(350)
                if await self.pg.locator("#ebene-huelle .ebene-blatt").count():
                    await self.pg.evaluate("() => { const h = document.querySelector('#ebene-huelle'); h.querySelector('.ebene-dimmer')?.click(); }")
            else:
                await self.pg.evaluate("() => { const d = document.querySelector('#ebene-huelle .ebene-dimmer'); if (d) d.click(); }")
            await self.pg.wait_for_timeout(250)
        return not await self.pg.locator("#ebene-huelle .ebene-blatt").count()

    async def aus_einrichtung(self):
        """Nach „Bearbeiten“ steht die App in einem Einrichtungs-Schritt – mit „Weiter“ zurück in die App."""
        for _ in range(25):
            if await self.pg.evaluate("window.__gastrocalc.stand.phase") != "onboarding": return True
            k = self.pg.locator('[data-a="weiter"], [data-a="ob-fertig"]')
            if await k.count():
                try: await k.first.click(timeout=2000)
                except Exception: pass
            await self.pg.wait_for_timeout(300)
        return False

    async def nav(self, ziel):
        await self.pg.evaluate("z => { const b = document.createElement('button'); b.type = 'button'; b.dataset.a = 'nav'; b.dataset.wert = z; b.hidden = true; (document.querySelector('#app') || document.body).appendChild(b); b.click(); b.remove(); }", ziel)
        await self.pg.wait_for_timeout(380)

    async def ebene_sichern(self):
        m = await nav_hilfe.modus(self.pg)
        if m == self.modus: return True
        if self.modus == "laden":
            await nav_hilfe.zum_laden(self.pg)
        elif self.modus == "buero":
            await nav_hilfe.ins_buero(self.pg)
            if await self.pg.locator("#ebene-huelle .blatt-pin").count():
                await schnellstart.code_tippen(self.pg, CODE); await self.pg.locator("#ebene-huelle .blatt-pin").wait_for(state="detached", timeout=25000)
        elif self.modus == "personal":
            if m == "buero": await nav_hilfe.zum_laden(self.pg)
            await nav_hilfe.menue(self.pg)
            await self.pg.click('#ebene-huelle [data-a="modus"][data-wert="personal"]'); await self.pg.wait_for_timeout(500)
        await self.pg.wait_for_timeout(300)
        return await nav_hilfe.modus(self.pg) == self.modus

    async def hin(self, ansicht, weg=()):
        """Basis-Ansicht frisch öffnen (erst woanders hin, damit Unterzustände zurückgesetzt sind), dann den Klickweg nachspielen."""
        await self.blatt_zu()
        if await self.pg.evaluate("window.__gastrocalc.stand.phase") == "onboarding": await self.aus_einrichtung()
        await self.ebene_sichern()
        anders = {"laden": "start", "buero": "buero", "personal": "personal"}[self.modus]
        if ansicht != anders: await self.nav(anders)
        else: await self.nav("muell" if self.modus != "buero" else "einstellungen")
        await self.nav(ansicht)
        for sel in weg:
            loc = self.pg.locator(sel)
            if not await loc.count(): return False
            try: await loc.first.click(timeout=3000)
            except Exception: return False
            await self.pg.wait_for_timeout(450)
        return True

    @staticmethod
    def selektor(k):
        s = f'[data-a="{k["a"]}"]'
        if k["wert"] is not None: s += f'[data-wert="{k["wert"]}"]'
        return ("#ebene-huelle .ebene-blatt " if k["imBlatt"] else "#app ") + s

    async def erkunden(self, basis, ansicht, weg, z, tiefe):
        if tiefe >= TIEFE: return
        # Kandidaten: je (data-a, data-wert) einmal; viele gleiche Zeilen (z. B. je Gericht) zählen nur einmal
        kand, schl = [], set()
        for k in z["knoepfe"]:
            if SPERRE.search(k["a"]): continue
            key = (k["a"], k["wert"], k["imBlatt"])
            if key in schl: continue
            schl.add(key); kand.append(k)
        for k in kand[:MAX_KNOEPFE]:
            if len(self.schirme) >= MAX_JE_EBENE: self.notizen.append(f"Obergrenze {MAX_JE_EBENE} Bildschirme erreicht"); return
            sel = self.selektor(k)
            ok = await self.hin(ansicht, weg)
            if not ok: continue
            loc = self.pg.locator(sel)
            if not await loc.count(): continue
            vorher = fingerabdruck(await self.z())
            try:
                await loc.first.click(timeout=2500)
            except Exception:
                continue
            await self.pg.wait_for_timeout(550)
            z2 = await self.z()
            if fingerabdruck(z2) == vorher and not self.dialoge: continue
            name = f"{basis}-{k['a']}" + (f"-{k['wert']}" if k["wert"] not in (None, "") else "")
            if self.dialoge and fingerabdruck(z2) == vorher:
                # nur ein nativer Dialog (confirm/alert): als eigener Eintrag ohne neues Bild
                self.schirme.append({"modus": self.modus, "name": dateiname(name + "-dialog"), "datei": None, "weg": list(weg) + [sel], "titel": "(Browser-Dialog)",
                                     "blatt": "dialog", "phase": z2["phase"], "schritt": None, "ebeneIst": z2["modus"], "woerter": sum(len(woerter(d)) for d in self.dialoge),
                                     "woerterSicht": 0, "woerterOhneLeiste": 0, "text": " | ".join(self.dialoge), "seiteBreit": 0, "ueber": [], "abgeschnitten": [],
                                     "fehler": list(self.fehler), "dialoge": list(self.dialoge), "knoepfe": 0})
                self.fehler.clear(); self.dialoge.clear(); continue
            e = await self.foto(name, list(weg) + [sel], z2)
            if e and z2["phase"] != "onboarding" and z2["modus"] == self.modus:
                await self.erkunden(e["name"], ansicht, list(weg) + [sel], z2, tiefe + 1)

    async def ebene_durchgehen(self):
        start = {"laden": "start", "buero": "buero", "personal": "personal"}[self.modus]
        await self.hin(start); z0 = await self.z(); fp_start = fingerabdruck(z0)
        ziele = [start] + [a for a in self.ziele if a != start]
        for ansicht in ziele:
            t0 = time.time()
            try:
                await self.hin(ansicht)
                z = await self.z()
                if ansicht != start and fingerabdruck(z) == fp_start:
                    self.notizen.append(f"Ansicht „{ansicht}“ fällt in dieser Ebene auf den Start zurück (nicht erreichbar)")
                    self.schirme.append({"modus": self.modus, "name": ansicht, "datei": None, "weg": ["nav:" + ansicht], "titel": "(fällt auf Start zurück)", "blatt": "",
                                         "phase": z["phase"], "schritt": None, "ebeneIst": z["modus"], "woerter": 0, "woerterSicht": 0, "woerterOhneLeiste": 0, "text": "",
                                         "seiteBreit": 0, "ueber": [], "abgeschnitten": [], "fehler": [], "dialoge": [], "knoepfe": 0, "zurueck": True})
                    continue
                e = await self.foto(ansicht, ["nav:" + ansicht], z)
                if e is None:
                    self.notizen.append(f"Ansicht „{ansicht}“ sieht aus wie ein schon fotografierter Bildschirm ({self.gesehen.get(fingerabdruck(z))})")
                    continue
                await self.erkunden(e["name"], ansicht, [], z, 0)
            except Exception as ex:
                self.notizen.append(f"Fehler bei {ansicht}: {ex!r}"[:300])
                try: await self.pg.reload(); await self.pg.wait_for_selector('[data-a="menue-auf"], .schirm', timeout=15000)
                except Exception: pass
            await self.abdeckung()
            print(f"  [{self.modus}] {ansicht}: {len(self.schirme)} Bildschirme bisher ({time.time() - t0:.0f} s)", flush=True)


# ---------------------------------------------------------------- Vorbereitung je Lauf
async def beispiel_laden(l):
    await nav_hilfe.geh(l.pg, "laeden")
    await l.pg.locator('#app [data-a="beispiel-anlegen"]').first.click(); await l.pg.wait_for_timeout(900)
    s = await l.pg.evaluate("window.__gastrocalc.stand.beispiel")
    assert s, "Beispiel-Laden nicht aktiv"


async def vorbereiten(l):
    await schnellstart.schnellstart(l.pg, l.port, name="Mein Laden")
    await beispiel_laden(l)
    if l.modus == "personal":
        await schnellstart.code_setzen(l.pg, CODE)
    l.fehler.clear(); l.dialoge.clear()


async def einrichtung(l):
    """Schnellweg (wie tests/schnellstart.py) mit Foto je Schritt, danach „Alles genau einrichten“ in einem frischen Kontext."""
    pg = l.pg
    await pg.goto(f"http://127.0.0.1:{l.port}/index.html"); await pg.wait_for_selector('.kachel, [data-f="sprache-wahl"]')
    for _ in range(240):
        if await pg.evaluate("!!navigator.serviceWorker.controller"): break
        await pg.wait_for_timeout(500)
    await l.foto("schnell-sprache", ["start"])
    await pg.select_option('[data-f="sprache-wahl"]', "de"); await pg.click('[data-a="sprache"][data-wert="de"]'); await pg.wait_for_selector('[data-a="laden-art"]')
    await l.foto("schnell-laden", ["sprache de"])
    # Hilfe „?“ des Schnellwegs
    if await pg.locator('[data-a="s2-hilfe"]').count():
        await pg.click('[data-a="s2-hilfe"]'); await pg.wait_for_timeout(400); await l.foto("schnell-hilfe", ["s2-hilfe"])
        await l.blatt_zu()
        if await pg.locator('[data-a="s2-hilfe"]').count() == 0: await pg.go_back(); await pg.wait_for_timeout(300)
    await pg.fill('[data-f="betrieb.name"]', "Mein Laden"); await pg.click('[data-a="laden-art"][data-wert="doener"]'); await pg.wait_for_timeout(200)
    async def weiter(id_):
        for _ in range(3):
            await pg.click('[data-a="weiter"]')
            for _ in range(30):
                await pg.wait_for_timeout(100)
                if await pg.evaluate("window.__gastrocalc.stand.schrittId") == id_: await pg.wait_for_timeout(200); return
        raise AssertionError(f"Schritt {id_} nicht erreicht")
    await weiter("karte-foto"); await l.foto("schnell-karte-foto", ["weiter"])
    await weiter("kuehl-schnell"); await l.foto("schnell-kuehl", ["weiter"])
    await pg.click('[data-a="s2-kuehl"][data-wert="kuehlschrank"][data-d="1"]'); await pg.wait_for_timeout(150)
    await weiter("geld"); await l.foto("schnell-geld", ["weiter"])
    await weiter("fertig-schnell"); await l.foto("schnell-fertig", ["weiter"])
    # „Alles genau einrichten“: neuer Kontext, jeder Schritt mit „Weiter“
    ctx2 = await l.b.new_context(viewport={"width": 390, "height": 844}, device_scale_factor=2, is_mobile=True, has_touch=True, locale="de-DE")
    await ctx2.add_init_script(path=str(APP / "tests" / "hilfe" / "aufklappen.js"))
    pg2 = await ctx2.new_page()
    pg2.on("console", lambda m: l.fehler.append(m.text) if m.type == "error" and "ERR_TUNNEL" not in m.text else None)
    pg2.on("pageerror", lambda e: l.fehler.append("pageerror: " + str(e)))
    pg2.on("dialog", lambda d: (l.dialoge.append(f"{d.type}: {d.message}"), asyncio.ensure_future(d.dismiss())))
    alt = l.pg; l.pg = pg2
    try:
        await pg2.goto(f"http://127.0.0.1:{l.port}/index.html"); await pg2.wait_for_selector('[data-f="sprache-wahl"]')
        await pg2.select_option('[data-f="sprache-wahl"]', "de"); await pg2.click('[data-a="sprache"][data-wert="de"]'); await pg2.wait_for_timeout(400)
        await pg2.click('[data-a="s2-hilfe"]'); await pg2.wait_for_timeout(300)
        await pg2.click('[data-a="weg-genau"]'); await pg2.wait_for_timeout(500)
        vorige = None; gleich = 0
        for i in range(60):
            sid = await pg2.evaluate("window.__gastrocalc.stand.schrittId || String(window.__gastrocalc.stand.schritt)")
            if await pg2.evaluate("window.__gastrocalc.stand.phase") != "onboarding": break
            if sid == vorige:
                gleich += 1
                if gleich > 2: l.notizen.append(f"Einrichtung „genau“ steckt bei Schritt {sid} fest – Rest nicht fotografiert"); break
            else:
                gleich = 0; await l.foto(f"genau-{i:02d}-{sid}", ["weg-genau", f"weiter ×{i}"])
            vorige = sid
            # Pflichtfelder grob füllen, damit „Weiter“ geht
            for sel, wert in (('[data-f="betrieb.name"]', "Mein Laden"), ('[data-f="team.personen"]', "2"), ('[data-f="team.stundenProPerson"]', "160")):
                if await pg2.locator(sel).count() and not await pg2.input_value(sel): await pg2.fill(sel, wert)
            for sel in ('[data-a="format"][data-wert="imbiss"]', '[data-a="kueche"][data-wert="doener"]'):
                if await pg2.locator(sel).count() and gleich == 0: await pg2.click(sel); await pg2.wait_for_timeout(150)
            if gleich and await pg2.locator('[data-a="vorlage"]').count(): await pg2.locator('[data-a="vorlage"]').first.click()
            k = pg2.locator('[data-a="weiter"], [data-a="ob-fertig"], [data-a="fertig"]')
            if not await k.count():  # Karte: „Weiter“ erscheint erst mit einem Gericht – zwei Vorlagen antippen
                for sel, nr in (('[data-a="vorlage"]', 0), ('[data-a="vorlage"]', 1), ('.fuss [data-a="ep-zu"]', 0)):
                    if await pg2.locator(sel).count() > nr:
                        try: await pg2.locator(sel).nth(nr).click(timeout=2000); await pg2.wait_for_timeout(250)
                        except Exception: pass
            if not await k.count(): l.notizen.append(f"Einrichtung „genau“: kein Weiter-Knopf bei {sid}"); break
            try: await k.first.click(timeout=3000)
            except Exception: pass
            await pg2.wait_for_timeout(500)
    finally:
        l.pg = alt
        await ctx2.close()


async def lauf(b, modus, port, je_modus, ergebnisse):
    l = Lauf(b, modus, port, je_modus)
    t0 = time.time()
    try:
        await l.start()
        if modus == "einrichtung":
            await einrichtung(l)
        else:
            await vorbereiten(l)
            await l.ebene_durchgehen()
    except Exception:
        l.notizen.append("Abbruch: " + traceback.format_exc()[-600:])
        print(f"[{modus}] ABBRUCH", traceback.format_exc()[-600:], flush=True)
    finally:
        await l.ende()
    print(f"[{modus}] fertig: {len(l.schirme)} Bildschirme in {time.time() - t0:.0f} s", flush=True)
    ergebnisse[modus] = l


# ---------------------------------------------------------------- Bericht
def bericht(ergebnisse, ansichten, je_modus, dauer):
    alle = [s for m in ("einrichtung", "laden", "personal", "buero") if m in ergebnisse for s in ergebnisse[m].schirme]
    fotos = [s for s in alle if s.get("datei")]
    cov = {}
    for l in ergebnisse.values():
        for k, v in l.coverage.items(): cov.setdefault(k, set()).update(v)
    nav_gef = set().union(*[l.nav_gefunden for l in ergebnisse.values()]) if ergebnisse else set()
    z = ["# Bildschirm-Zählung GastroCalc", "",
         f"Stand: {time.strftime('%d.%m.%Y %H:%M', time.localtime())} · Handy 390×844 · Deutsch · Beispiel-Laden · Klicktiefe {TIEFE} · Dauer {dauer / 60:.0f} min", "",
         f"**{len(fotos)} Bildschirme fotografiert** (davon {sum(1 for s in fotos if s['blatt'])} mit offenem Blatt), "
         f"{sum(1 for s in alle if s['blatt'] == 'dialog')} Browser-Dialoge, {sum(1 for s in alle if s.get('zurueck'))} Ansichten fallen in ihrer Ebene auf den Start zurück.", ""]
    for m in ("einrichtung", "laden", "personal", "buero"):
        if m in ergebnisse: z.append(f"- {m}: {sum(1 for s in ergebnisse[m].schirme if s.get('datei'))} Fotos")
    z.append("")
    # Laden-Regel
    z += ["## Laden-Regel: höchstens 15 Wörter je Bildschirm", "",
          "Gezählt werden Wörter mit mindestens einem Buchstaben (Zahlen, €, Symbole nicht). „ganz“ = ganzer Bildschirm samt Leiste unten und Scrollbereich, "
          "„sichtbar“ = nur, was ohne Scrollen im Bild ist, „ohne Leiste“ = ganz minus die fünf Reiter unten.", "",
          "| Bildschirm | ganz | ohne Leiste | sichtbar | Titel |", "|---|---|---|---|---|"]
    laden = [s for s in alle if s["modus"] in ("laden", "personal") and s.get("datei") and s["ebeneIst"] in ("laden", "personal")]
    for s in sorted(laden, key=lambda s: -s["woerterOhneLeiste"]):
        if s["woerterOhneLeiste"] > LADEN_GRENZE:
            z.append(f"| {s['modus']}-{s['name']} | {s['woerter']} | **{s['woerterOhneLeiste']}** | {s['woerterSicht']} | {s['titel']} |")
    z.append(f"\n{sum(1 for s in laden if s['woerterOhneLeiste'] > LADEN_GRENZE)} von {len(laden)} Laden-/Personal-Bildschirmen über {LADEN_GRENZE} Wörtern (ohne Leiste).\n")
    # Überlauf
    z += ["## Waagerechter Überlauf", ""]
    ue = [s for s in alle if s.get("seiteBreit") or s.get("ueber")]
    if not ue: z.append("Keiner gefunden (Seite und einzelne Elemente).")
    for s in ue: z.append(f"- **{s['modus']}-{s['name']}**: Seite {s['seiteBreit']} px breiter · Elemente: {'; '.join(s['ueber']) or '–'}")
    ab = [s for s in alle if s.get("abgeschnitten")]
    z += ["", "## Abgeschnittene Texte (Ellipse / overflow hidden)", ""]
    if not ab: z.append("Keine.")
    for s in ab: z.append(f"- {s['modus']}-{s['name']}: " + " · ".join(f"„{t}“" for t in s["abgeschnitten"]))
    # Konsolenfehler
    z += ["", "## Konsolenfehler", ""]
    kf = [s for s in alle if s.get("fehler")]
    if not kf: z.append("Keine.")
    for s in kf: z.append(f"- **{s['modus']}-{s['name']}**: " + " ⏐ ".join(f[:300] for f in s["fehler"]))
    for m, l in ergebnisse.items():
        if l.fehler: z.append(f"- {m} (nach dem letzten Foto): " + " ⏐ ".join(f[:300] for f in l.fehler))
    # Dialoge
    dl = [s for s in alle if s.get("dialoge")]
    if dl:
        z += ["", "## Browser-Dialoge (confirm/alert)", ""]
        for s in dl: z.append(f"- {s['modus']}-{s['name']}: " + " ⏐ ".join(d[:200] for d in s["dialoge"]))
    # Ansichten aus dem Code
    z += ["", "## Ansichten aus dem Code (js/app.js) – erreicht?", "", "| Ansicht | Funktion | Datei | Laden | Personal | Büro | als echter Knopf gesehen |", "|---|---|---|---|---|---|---|"]
    def status(m, a):
        if m not in ergebnisse: return "–"
        if a not in je_modus.get(m, []) and not (m == "laden" and a == "start") and not (m == "personal" and a == "personal"): return "·"
        for s in ergebnisse[m].schirme:
            if s["weg"] == ["nav:" + a]: return "zurück" if s.get("zurueck") else "ja"
        if any(f"„{a}“" in n for n in ergebnisse[m].notizen): return "doppelt"
        return "nein"
    for a in ansichten:
        z.append(f"| {a['ansicht']} | {a['funktion']} | {a['datei']} | {status('laden', a['ansicht'])} | {status('personal', a['ansicht'])} | {status('buero', a['ansicht'])} | {'ja' if a['ansicht'] in nav_gef or a['ansicht'] in ('start','buero','personal') else 'nein'} |")
    z.append("\n„·“ = gehört nicht in diese Ebene, „zurück“ = Ansicht fällt auf den Start zurück, „doppelt“ = sieht aus wie ein schon fotografierter Bildschirm.\n")
    # Dateien in js/screens
    z += ["## Dateien in js/screens/ – erreicht?", "",
          "Gemessen mit dem Chromium-Profiler: welche exportierten Funktionen beim Durchlauf mindestens einmal liefen.", "",
          "| Datei | Funktionen gelaufen | nie gelaufen (exportiert) |", "|---|---|---|"]
    nicht = []
    for d in screens_dateien():
        ex = exportierte_funktionen(d); liefen = cov.get(f"js/screens/{d}.js", set())
        nie = [f for f in ex if f not in liefen]
        if not liefen: nicht.append(d)
        z.append(f"| {d}.js | {len([f for f in ex if f in liefen])}/{len(ex)}{'' if liefen else ' **NICHT ERREICHT**'} | {', '.join(nie) or '–'} |")
    z.append("")
    z.append("Nicht erreichte Dateien: " + (", ".join(f"{d}.js" for d in nicht) if nicht else "keine") + "\n")
    # Notizen
    z += ["## Notizen des Werkzeugs", ""]
    for m, l in ergebnisse.items():
        for n in dict.fromkeys(l.notizen): z.append(f"- {m}: {n}")
    # Liste aller Bildschirme
    z += ["", "## Alle Bildschirme", "", "| # | Bildschirm | Titel | Blatt | Wörter (ganz/ohne Leiste/sichtbar) | Weg |", "|---|---|---|---|---|---|"]
    for i, s in enumerate(alle, 1):
        weg = " → ".join(w.replace("#app ", "").replace("#ebene-huelle .ebene-blatt ", "Blatt ") for w in s["weg"])
        z.append(f"| {i} | {s['modus']}-{s['name']} | {html.escape(s['titel'])} | {s['blatt']} | {s['woerter']}/{s['woerterOhneLeiste']}/{s['woerterSicht']} | `{weg[:160]}` |")
    (OUT / "bericht.md").write_text("\n".join(z), encoding="utf-8")
    (OUT / "daten.json").write_text(json.dumps({"schirme": alle, "abdeckung": {k: sorted(v) for k, v in cov.items()}, "nicht_erreicht": nicht}, ensure_ascii=False, indent=1), encoding="utf-8")
    # Bilderwand
    kacheln = []
    for s in fotos:
        rot = (s["modus"] in ("laden", "personal") and s["woerterOhneLeiste"] > LADEN_GRENZE)
        warn = []
        if rot: warn.append(f"{s['woerterOhneLeiste']} Wörter")
        if s["seiteBreit"] or s["ueber"]: warn.append("Überlauf")
        if s["fehler"]: warn.append("Konsolenfehler")
        kacheln.append(f'<figure class="{s["modus"]}{" warn" if warn else ""}"><a href="{html.escape(s["datei"])}" target="_blank"><img loading="lazy" src="{html.escape(s["datei"])}" alt=""></a>'
                       f'<figcaption><b>{html.escape(s["modus"])}-{html.escape(s["name"])}</b><span>{html.escape(s["titel"] or "")}</span>'
                       f'<small>{s["woerter"]} W. · ohne Leiste {s["woerterOhneLeiste"]}{" · " + html.escape(", ".join(warn)) if warn else ""}</small></figcaption></figure>')
    (OUT / "wand.html").write_text(f"""<!doctype html><html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Bilderwand GastroCalc</title><style>
:root{{--bg:#f6f4ef;--fg:#1f2a24;--karte:#fff;--rand:#d9d4c7;--warn:#b5532b}}
@media (prefers-color-scheme: dark){{:root{{--bg:#151a17;--fg:#e8e4da;--karte:#1f2622;--rand:#38423c;--warn:#e08a5e}}}}
body{{margin:0;padding:16px;background:var(--bg);color:var(--fg);font:14px/1.4 system-ui,sans-serif}}
h1{{font-size:20px;margin:0 0 4px}} p{{margin:0 0 16px;opacity:.8}}
.raster{{display:grid;grid-template-columns:repeat(auto-fill,minmax(170px,1fr));gap:14px}}
figure{{margin:0;background:var(--karte);border:1px solid var(--rand);border-radius:10px;overflow:hidden}}
figure.warn{{border-color:var(--warn);box-shadow:0 0 0 1px var(--warn)}}
img{{display:block;width:100%;height:340px;object-fit:cover;object-position:top;background:#ccc}}
figcaption{{padding:6px 8px;display:grid;gap:2px}} figcaption b{{font-size:12px;word-break:break-all}} figcaption span{{font-size:12px;opacity:.8}} figcaption small{{font-size:11px;opacity:.75}}
figure.warn small{{color:var(--warn);opacity:1}}
</style></head><body><h1>Bilderwand – {len(fotos)} Bildschirme</h1><p>Handy 390×844, Deutsch, Beispiel-Laden. Roter Rand = über {LADEN_GRENZE} Wörter im Laden/Personal, Überlauf oder Konsolenfehler. Antippen öffnet das Foto.</p>
<div class="raster">{''.join(kacheln)}</div></body></html>""", encoding="utf-8")


async def main():
    ansichten, je_modus, _ = ansichten_aus_code()
    for p in OUT.glob("*.png"): p.unlink()
    t0 = time.time(); ergebnisse = {}
    async with async_playwright() as p:
        b = await p.chromium.launch()
        await asyncio.gather(*[lauf(b, m, PORT + i, je_modus, ergebnisse) for i, m in enumerate(["einrichtung", "laden", "buero", "personal"]) if m in NUR])
        await b.close()
    bericht(ergebnisse, ansichten, je_modus, time.time() - t0)
    print("Bericht:", OUT / "bericht.md", "· Bilderwand:", OUT / "wand.html")


if __name__ == "__main__":
    asyncio.run(main())
