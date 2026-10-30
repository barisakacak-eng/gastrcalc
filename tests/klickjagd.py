"""Klick-Crawler (Klickjagd, 30.10.2026): besucht in Laden, Personal und Büro jeden erreichbaren Bildschirm, tippt jedes Bedienelement
einmal kurz an und einmal lang (850 ms) und misst nur – er prüft kein Soll-Verhalten und ändert nichts an der App.

Je Lauf-Variante: frischer Browser-Kontext (Handy-Format, Touch) → Schnellstart (Dönerladen) → Rundgang weg → Sprache → Büro-Code 1234 → Laden → Personal → Büro.
Gemessen wird je Geste (Touch über CDP, Tippen oder Drücken):
  tot          innerhalb 600 ms nach dem Loslassen keine Änderung (und kein Download, Systemdialog oder neues Fenster) an document.body.innerHTML (Länge und Prüfsumme, Zeki-Figur ausgenommen, weil sie sich von selbst bewegt),
               an der Ansicht (#app erstes Kind), am Fokus-Element oder an den offenen Blättern/Overlays
  lang/haenger lange Aufgabe > 300 ms bzw. > 2000 ms (PerformanceObserver "longtask")
  konsole      console.error und pageerror
  abgeschnitten  nowrap-Elemente mit scrollWidth > clientWidth + 1 und Zahlenfelder mit "1234", "120,5", "38,5", "12" (wie zahlfelder_browser.py)
  overlay      Blatt/Overlay bleibt nach dem Schließen-Versuch offen
  zurueck      der erste Zurück-Knopf führt nicht auf den vorigen Bildschirm (oder es gibt keinen)

Auslassen: zerstörende Aktionen, Systemdialoge, Datei-Felder (nur gezählt) – siehe AUSLASSEN. Zusätzlich ausgelassen, weil sie den Lauf selbst verändern:
Laden anlegen/wechseln, Beispiel-Laden anlegen, die Sprachen außer der eingestellten.

Start:  python3 tests/klickjagd.py
Umgebung: DURCHLAUF_PORT (Standard 8820) · KLICK_SCHNELL=1 (nur de 390×844) · KLICK_MAX=60 (nur die ersten N Elemente je Bildschirm)
          KLICK_MINUTEN (Zeitgrenze je Variante, Standard 15) · KLICK_NUR=heute,menue (nur diese Bildschirme, zum Üben) · KLICK_VARIANTE=2 (nur diese Nummer, 1-basiert)
Ergebnis: .claude/tmp/klickjagd/ergebnis.json und Bilder der Befunde. Exit 1 bei Befunden der Arten tot, haenger, konsole."""
import asyncio, json, os, pathlib, re, sys, time
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from playwright.async_api import async_playwright
import nav_hilfe, schnellstart

APP = schnellstart.APP
OUT = APP / ".claude" / "tmp" / "klickjagd"
PORT = int(os.environ.get("DURCHLAUF_PORT", "8820"))
CODE = "1234"
VARIANTEN = [  # (Name, Sprache, Breite, Höhe, CPU-Drossel)
    ("de-390x844", "de", 390, 844, 1), ("tr-390x844", "tr", 390, 844, 1), ("ar-390x844", "ar", 390, 844, 1),
    ("de-360x780", "de", 360, 780, 1), ("tr-360x780", "tr", 360, 780, 1), ("de-390x844-cpu4x", "de", 390, 844, 4)]
AUSLASSEN = {"laden-loeschen", "loeschen", "beispiel-loeschen", "export", "ordner-schicken", "akt-teilen", "best-teilen", "tf-teilen", "ordner-teilen",
             "eig-druck", "pp-drucken", "blatt-drucken", "aktualisieren", "pin-entfernen", "zeki-log-loeschen"}
AUSLASSEN_LAUF = {"laden-neu": "legt einen neuen Laden an und wechselt ihn", "laden-wechseln": "wechselt den Laden", "beispiel-anlegen": "legt den Beispiel-Laden an und wechselt ihn",
                  "aktualisieren-oder-neu": "lädt die App neu"}
DEBUG = bool(os.environ.get("KLICK_DEBUG"))
KAPPUNG_MINUTEN = 45
HALTEN_MS, FENSTER_MS, LANG_MS, HAENGER_MS = 850, 600, 300, 2000

# ---------------------------------------------------------------- Seiten-Hilfen (laufen im Browser)
INIT_JS = r"""
window.__longtasks = [];
try { new PerformanceObserver((l) => { for (const e of l.getEntries()) window.__longtasks.push({ s: e.startTime, d: e.duration }); }).observe({ type: "longtask", buffered: true }); } catch (_) {}
"""
HILFEN_JS = r"""
(() => {
  const AUS = ".zeki-lebt, .zeki-knopf, .h-zeki, .zeki-sprech";
  const UEBER = '#ebene-huelle.da, .rg-huelle, [role="dialog"], dialog[open], [data-a$="-zu"], .kl-dimmer, .ebene-dimmer';
  const sichtbar = (e) => { const r = e.getBoundingClientRect(); if (!r.width || !r.height) return false; const s = getComputedStyle(e); return s.visibility !== "hidden" && s.display !== "none" && Number(s.opacity) !== 0; };
  const SEL = "[data-a], button, [role=tab], summary, input, select";
  const key = (e) => [e.tagName, e.dataset.a || "", e.dataset.wert || "", e.dataset.schritt || "", e.dataset.bis || "", e.dataset.id || "", e.dataset.f || "", e.type || "",
    ((e.textContent || "").trim() || e.getAttribute("aria-label") || e.getAttribute("placeholder") || "").replace(/\s+/g, " ").slice(0, 40)].join("§");
  const oeffnen = (root) => { for (const d of root.querySelectorAll("details:not([open])")) d.open = true; };
  const liste = (root) => {
    const alle = [...root.querySelectorAll(SEL)].filter((e) => !e.closest(".rg-huelle") && sichtbar(e));
    const zaehler = new Map();
    return alle.map((e) => { const k = key(e); const o = zaehler.get(k) || 0; zaehler.set(k, o + 1); return { e, k, o }; });
  };
  const nameVon = (e) => (e.dataset.a || e.id || e.className || e.tagName).toString().slice(0, 40);
  const ueberlagerungen = (nurHuelle) => [...document.querySelectorAll(UEBER)].filter((e) => (e.matches("#ebene-huelle.da") || sichtbar(e)) && (!nurHuelle || e.matches("#ebene-huelle.da, .rg-huelle") || e.closest("#ebene-huelle, .rg-huelle"))).map(nameVon);
  const anker = () => {
    const app = document.querySelector("#app"); const k = app && app.firstElementChild; const kopf = document.querySelector(".ebene-kopf");
    const titel = app ? ((app.querySelector("h1, h2, .frage, .kopftitel") || {}).textContent || "").trim().slice(0, 40) : "";
    const tab = document.querySelector(".tableiste .tab.an"); const bl = document.querySelector("#ebene-huelle .ebene-blatt");
    const w = window.__gastrocalc && window.__gastrocalc.wurzel;
    return [(w && w.modus) || "laden", k ? k.className : "", kopf ? kopf.className.replace(/\s+/g, " ") : "", titel, tab ? tab.dataset.wert : "",
      bl ? [...bl.classList].filter((c) => c.startsWith("blatt-")).join(",") : "", document.querySelector(".rg-huelle") ? "rg" : ""].join("|");
  };
  window.__kl = {
    sig() {
      let h = document.body.innerHTML;
      for (const e of document.querySelectorAll(AUS)) { const o = e.outerHTML; const i = h.indexOf(o); if (i >= 0) h = h.slice(0, i) + h.slice(i + o.length); }
      let x = 5381; for (let i = 0; i < h.length; i++) x = ((x << 5) + x + h.charCodeAt(i)) | 0;
      const app = document.querySelector("#app"); const a = document.activeElement;
      return JSON.stringify([h.length, x, app && app.firstElementChild ? app.firstElementChild.className : "", a && a !== document.body ? [a.tagName, a.dataset.a || "", a.dataset.f || "", a.id || ""].join(".") : "", ueberlagerungen().join(",")]);
    },
    anker, ueberlagerungen,
    // ein Schließen-Element tippen, das nicht zum Grundzustand des Bildschirms gehört (basis = Namen der Overlay-Elemente bei der Ankunft)
    schliessen(basis, nurHuelle) {
      const zaehl = {}; for (const b of basis) zaehl[b] = (zaehl[b] || 0) + 1;
      const w = ['#ebene-huelle button[data-a="blatt-zu"]', '#ebene-huelle [data-a="blatt-zu"]', ".kl-dimmer", '[data-a$="-zu"]'];
      for (const s of w) for (const x of document.querySelectorAll(s)) {
        if (!sichtbar(x) || (nurHuelle && !x.closest("#ebene-huelle, .rg-huelle"))) continue;
        const n = nameVon(x); if (zaehl[n] > 0) { zaehl[n]--; continue; } x.click(); return n;
      }
      return null;
    },
    elemente(wurzel) {
      const root = document.querySelector(wurzel) || document.body; oeffnen(root);
      return liste(root).map(({ e, k, o }) => ({ k, o, tag: e.tagName.toLowerCase(), a: e.dataset.a || "", wert: e.dataset.wert || "", typ: e.type || "", aus: !!e.disabled, aktuell: e.getAttribute("aria-current") === "page" || e.getAttribute("aria-pressed") === "true" || e.getAttribute("aria-selected") === "true" || e.classList.contains("an"),
        text: ((e.textContent || "").trim() || e.getAttribute("aria-label") || e.getAttribute("placeholder") || e.value || "").replace(/\s+/g, " ").slice(0, 40), datei: e.matches('input[type="file"]') }));
    },
    // Element finden, aufklappen (Büro-Gruppen), in den Blick rollen und die Mitte liefern; null = nicht tippbar (Grund im zweiten Feld)
    finde(wurzel, k, o) {
      const root = document.querySelector(wurzel) || document.body; oeffnen(root);
      const t = liste(root).find((x) => x.k === k && x.o === o); if (!t) return { grund: "nicht mehr da" };
      const e = t.e; if (document.activeElement && document.activeElement !== document.body) document.activeElement.blur(); // jede Geste startet ohne Fokus
      for (const pos of ["center", "end", "start"]) {
        e.scrollIntoView({ block: pos, inline: "center" });
        const r = e.getBoundingClientRect(); const x = Math.min(Math.max(r.left + r.width / 2, 1), innerWidth - 1), y = Math.min(Math.max(r.top + r.height / 2, 1), innerHeight - 1);
        const z = document.elementFromPoint(x, y);
        if (z && (z === e || e.contains(z) || z.contains(e) || (e.closest("label") && e.closest("label").contains(z)))) return { x, y, w: Math.round(r.width), h: Math.round(r.height) };
      }
      return { grund: "verdeckt" };
    },
    abgeschnitten() {
      const aus = []; const tx = (e) => (e.textContent || e.value || "").replace(/\s+/g, " ").trim().slice(0, 30);
      const beschr = (e) => e.tagName.toLowerCase() + (e.dataset && e.dataset.a ? `[${e.dataset.a}${e.dataset.wert ? "=" + e.dataset.wert : ""}]` : "") + (typeof e.className === "string" && e.className ? "." + e.className.trim().split(/\s+/)[0] : "") + (tx(e) ? ` "${tx(e)}"` : "");
      for (const e of document.body.querySelectorAll("*")) {
        if (e.closest("svg") || e.closest(".rg-huelle")) continue;
        const s = getComputedStyle(e); if (s.whiteSpace !== "nowrap" || s.display === "inline" || s.display === "none" || !e.clientWidth) continue;
        if (e.scrollWidth > e.clientWidth + 1 && sichtbar(e)) aus.push({ el: beschr(e), text: `nowrap ${e.clientWidth}px sichtbar, Inhalt ${e.scrollWidth}px` + (s.overflowX !== "visible" ? ` (${s.overflowX}, abgeschnitten)` : " (ragt hinaus)") });
      }
      for (const w of ["1234", "120,5", "38,5", "12"]) {
        for (const e of document.querySelectorAll('input[inputmode="decimal"], input[inputmode="numeric"], input[type="number"]')) {
          const r = e.getBoundingClientRect(); if (!r.width) continue;
          const alt = e.value; e.value = w; const zu = e.scrollWidth > e.clientWidth + 1; const cw = e.clientWidth, sw = e.scrollWidth; e.value = alt;
          if (zu) aus.push({ el: beschr(e) + " " + (e.dataset.f || ""), text: `Zahlenfeld mit "${w}": ${cw}px sichtbar, Inhalt ${sw}px` });
        }
      }
      return aus;
    },
    details() { const d = [...document.querySelectorAll("#app details, #ebene-huelle details")]; return { gesamt: d.length, zu: d.filter((x) => !x.open && sichtbar(x)).length }; },
  };
})();
"""

# ---------------------------------------------------------------- Messung
class Zeitgrenze(Exception):
    pass


class Lauf:
    """Eine Variante: Browser-Kontext, Messwerte, Befunde."""

    def __init__(self, b, name, sprache, breite, hoehe, cpu, kappung, minuten, nur):
        self.b, self.name, self.sprache, self.breite, self.hoehe, self.cpu = b, name, sprache, breite, hoehe, cpu
        self.kappung, self.nur = kappung, nur
        self.ende = time.monotonic() + minuten * 60
        self.befunde, self.bildschirme, self.entdeckt, self.fehler = [], [], {}, []
        self.tipps = self.druecke = self.bildnr = 0
        self.modus_jetzt = ""; self.bild_gesamt = 0
        self.gesehen = set(); self.notizen = []; self.ereignis = 0  # Downloads, Systemdialoge und neue Fenster zählen als Reaktion der App

    # ----- Kontext
    async def start(self):
        ctx = await self.b.new_context(viewport={"width": self.breite, "height": self.hoehe}, device_scale_factor=2, is_mobile=True, has_touch=True, locale="de-DE")
        await ctx.add_init_script(INIT_JS)
        pg = await ctx.new_page(); pg.set_default_timeout(10000)
        await pg.add_init_script(HILFEN_JS)  # dieses Skript braucht document; es läuft in jedem neuen Dokument
        pg.on("console", lambda m: self.fehler.append(("konsole", m.text)) if m.type == "error" and "ERR_TUNNEL" not in m.text else None)
        pg.on("pageerror", lambda e: self.fehler.append(("pageerror", str(e))))
        def dialog(d): self.ereignis += 1; asyncio.ensure_future(d.dismiss())  # Systemdialog: abbrechen (confirm → Nein)
        def neue_seite(p):
            if p != pg: self.ereignis += 1; asyncio.ensure_future(p.close())
        pg.on("dialog", dialog); pg.on("download", lambda d: setattr(self, "ereignis", self.ereignis + 1)); ctx.on("page", neue_seite)
        self.ctx, self.pg = ctx, pg
        self.cdp = await ctx.new_cdp_session(pg)

    async def ende_kontext(self):
        try: await self.ctx.close()
        except Exception: pass

    def pruefe_zeit(self):
        if time.monotonic() > self.ende: raise Zeitgrenze()

    # ----- Befund
    async def befund(self, scr, element, art, dauer_ms, text, geste="", bild=True):
        schluessel = (scr["name"], art, element, text[:80], geste)
        if schluessel in self.gesehen: return
        self.gesehen.add(schluessel)
        datei = ""
        if bild and self.bild_gesamt < 300:
            self.bild_gesamt += 1
            datei = f"{self.name}_{self.bild_gesamt:03d}_{art}.png"
            try: await self.pg.screenshot(path=str(OUT / datei))
            except Exception: datei = ""
        self.befunde.append({"variante": self.name, "modus": scr["modus"], "bildschirm": scr["name"], "element": element, "art": art, "dauer_ms": int(dauer_ms),
                             "text": text + (f" [{geste}]" if geste else ""), "bild": datei})

    async def fehler_pruefen(self, scr, element, ab, geste=""):
        neu = self.fehler[ab:]
        for art, text in neu:
            await self.befund(scr, element, "konsole", 0, f"{art}: {text[:300]}", geste)
        return len(self.fehler)

    # ----- Wege
    async def modus(self):
        return await nav_hilfe.modus(self.pg)

    async def alles_zu(self, basis=(), nur_huelle=False):
        """Blätter und Overlays schließen wie ein Mensch (Schließen-Knopf, Hintergrund). basis = Overlay-Elemente, die zum Bildschirm gehören.
        Rückgabe: was danach noch offen ist."""
        pg = self.pg; basis = list(basis)
        def neu(liste):
            rest = list(liste)
            for b in basis:
                if b in rest: rest.remove(b)
            return rest
        for _ in range(5):
            if await pg.locator(".rg-huelle").count(): await nav_hilfe.rundgang_weg(pg)
            rest = neu(await pg.evaluate("(h) => window.__kl.ueberlagerungen(h)", nur_huelle))
            if not rest: return []
            await pg.evaluate("([b, h]) => window.__kl.schliessen(b, h)", [basis, nur_huelle])
            await pg.wait_for_timeout(350)
        return neu(await pg.evaluate("(h) => window.__kl.ueberlagerungen(h)", nur_huelle))

    async def fluss_verlassen(self):
        """Einrichtungs-Wege (bearbeiten …, Rundgänge) haben weder Leiste noch Kopf, nur „‹ Zurück“: wie ein Mensch zurückgehen."""
        pg = self.pg
        for _ in range(8):
            if await pg.locator(".tableiste, .ebene-kopf").count(): return
            z = pg.locator('[data-a="zurueck"]:visible')
            if await z.count() == 0: break
            await z.first.click(timeout=4000); await pg.wait_for_timeout(350)
            if await pg.locator(".rg-huelle").count(): await nav_hilfe.rundgang_weg(pg)
        if not await pg.locator(".tableiste, .ebene-kopf").count(): await self.neu_laden()

    async def zu_modus(self, ziel):
        pg = self.pg
        await self.alles_zu(); await self.fluss_verlassen()
        m = await self.modus()
        if m == ziel and ziel != "buero": return
        if m == "personal":
            await pg.click('[data-a="schloss"]'); await pg.wait_for_selector("#ebene-huelle .blatt-pin"); await schnellstart.code_tippen(pg, CODE)
            await pg.locator("#ebene-huelle .blatt-pin").wait_for(state="detached", timeout=30000); await pg.wait_for_timeout(350); m = await self.modus()
        if m == "buero":
            if ziel == "buero": return
            await nav_hilfe.zum_laden(pg); m = await self.modus()
        if ziel == "laden": return
        await nav_hilfe.menue(pg)
        await nav_hilfe._tipp(pg, f'#ebene-huelle [data-a="modus"][data-wert="{ziel}"]', 300)
        if ziel == "personal": await pg.wait_for_selector(".riesenkachel", timeout=15000)
        else:
            try: await pg.wait_for_selector("#ebene-huelle .blatt-pin, .ebene-kopf.buero", timeout=10000)
            except Exception:
                st = await pg.evaluate("(() => { const w = window.__gastrocalc.wurzel; return JSON.stringify({modus: w.modus, pin: !!w.bueroPin, blatt: document.querySelector('#ebene-huelle').innerHTML.slice(0, 200), anker: window.__kl.anker()}); })()")
                self.notizen.append(f"Büro-Eintritt: weder Code-Blatt noch Büro sichtbar: {st}"); raise
            if await pg.locator("#ebene-huelle .blatt-pin").count():
                await schnellstart.code_tippen(pg, CODE)
                await pg.locator("#ebene-huelle .blatt-pin").wait_for(state="detached", timeout=30000)
            else: self.notizen.append("Büro ohne Code-Abfrage betreten (Code war gesetzt, bueroPin=" + str(await pg.evaluate("!!window.__gastrocalc.wurzel.bueroPin")) + ")")
            await pg.wait_for_selector(".ebene-kopf.buero", timeout=15000)
        await pg.wait_for_timeout(300)
        if await pg.locator(".rg-huelle").count(): await nav_hilfe.rundgang_weg(pg)

    async def sprache_setzen(self, code):
        pg = self.pg
        if code == "de": return
        await nav_hilfe.menue(pg); await pg.click('#ebene-huelle [data-a="blatt-sprache"]'); await pg.click(f'#ebene-huelle [data-a="sprache"][data-wert="{code}"]')
        await pg.wait_for_timeout(1500); await nav_hilfe.modus(pg); await self.alles_zu(); await pg.wait_for_timeout(500)
        lang = await pg.evaluate("document.documentElement.lang")
        if not lang.startswith(code): self.notizen.append(f"Sprache {code} nicht bestätigt (html lang={lang})")

    async def neu_laden(self):
        await self.pg.reload(); await self.pg.wait_for_selector("#app .schirm, #app .tableiste, .ebene-kopf", timeout=20000); await self.pg.wait_for_timeout(600)
        await nav_hilfe.modus(self.pg)

    # ----- Gesten
    async def geste(self, x, y, druck):
        """Touch über CDP. Rückgabe: (geändert_nach_ms oder None, längste lange Aufgabe in ms)."""
        pg, cdp = self.pg, self.cdp
        sig0 = await pg.evaluate("window.__kl.sig()"); tp0 = await pg.evaluate("performance.now()")
        t0 = time.monotonic(); geaendert = None; ev0 = self.ereignis
        async def pruefen():
            nonlocal geaendert
            if geaendert is None and (self.ereignis != ev0 or await pg.evaluate("window.__kl.sig()") != sig0): geaendert = (time.monotonic() - t0) * 1000
        await cdp.send("Input.dispatchTouchEvent", {"type": "touchStart", "touchPoints": [{"x": x, "y": y}]})
        if druck:
            while (time.monotonic() - t0) * 1000 < HALTEN_MS:
                await asyncio.sleep(0.1); await pruefen()
        await cdp.send("Input.dispatchTouchEvent", {"type": "touchEnd", "touchPoints": []})
        t_los = time.monotonic()
        while True:
            await asyncio.sleep(0.08); await pruefen()
            seit = (time.monotonic() - t_los) * 1000
            if seit >= FENSTER_MS or (geaendert is not None and seit >= 200): break
        lt = await pg.evaluate("(t) => Math.max(0, ...window.__longtasks.filter((e) => e.s >= t - 1).map((e) => e.d))", tp0)
        return geaendert, lt

    async def abgeschnitten_pruefen(self, scr, element=""):
        try: funde = await self.pg.evaluate("window.__kl.abgeschnitten()")
        except Exception: return
        for f in funde: await self.befund(scr, element or f["el"], "abgeschnitten", 0, f"{f['el']}: {f['text']}")

    async def zurueck_auf(self, scr, element, geste):
        """Zurück auf den Bildschirm: Overlays schließen, Anker prüfen, sonst den Weg neu gehen. Rückgabe: True, wenn der Bildschirm wieder steht."""
        pg = self.pg
        for versuch in range(3):
            try:
                if await pg.locator(".rg-huelle").count(): await nav_hilfe.rundgang_weg(pg)
                anker = await pg.evaluate("window.__kl.anker()")
                gleich = anker == scr["anker"] and not scr["immer_neu"]
                if scr["blatt"]:
                    if scr["immer_neu"]: await self.alles_zu()  # sonst tippt der Weg ins Leere und Ziffern sammeln sich (Fehlversuche)
                elif gleich or not scr["blatt"]:
                    rest = await self.alles_zu(basis=scr["basis"] if gleich else (), nur_huelle=not gleich)
                    if rest:
                        await self.befund(scr, element, "overlay", 0, f"Overlay offen nach Schließen-Versuch: {', '.join(rest)}", geste)
                        await self.neu_laden()
                    anker = await pg.evaluate("window.__kl.anker()"); gleich = anker == scr["anker"] and not scr["immer_neu"]
                if gleich: return True
                if not scr["immer_neu"]:  # Einrichtungs-Wege (bearbeiten …) haben „‹ Zurück“: wie ein Mensch zurückgehen
                    for _ in range(8):
                        zk = pg.locator('[data-a="zurueck"]:visible')
                        if await zk.count() == 0: break
                        await zk.first.click(timeout=4000); await pg.wait_for_timeout(400)
                        if await pg.locator(".rg-huelle").count(): await nav_hilfe.rundgang_weg(pg)
                        if await pg.evaluate("window.__kl.anker()") == scr["anker"]: return True
                await scr["route"](); await pg.wait_for_timeout(250)
                jetzt = await pg.evaluate("window.__kl.anker()")
                if scr["immer_neu"] or jetzt == scr["anker"]: return True
                if jetzt.split("|")[0] == scr["modus"]:  # Weg gelungen, Inhalt hat sich durch die Eingabe geändert (z. B. „Tag geschafft“): neuer Grundzustand
                    scr["anker"] = jetzt; scr["basis"] = await pg.evaluate("window.__kl.ueberlagerungen(false)"); return True
            except Exception as e:
                self.notizen.append(f"Rückweg {scr['name']} Versuch {versuch + 1}: {str(e)[:100]}")
                try: await self.neu_laden()
                except Exception: pass
        return False

    # ----- Ein Bildschirm
    async def besuche(self, scr):
        pg = self.pg; t0 = time.monotonic(); self.pruefe_zeit()
        info = {"name": scr["name"], "modus": scr["modus"], "elemente": 0, "getippt": 0, "gedrueckt": 0, "datei_felder": 0, "ausgelassen": {}, "nicht_tippbar": {}, "details": 0,
                "gekappt": False, "ruhe_longtask_ms": 0, "fehler": ""}
        self.bildschirme.append(info)
        try:
            fehl0 = len(self.fehler)
            await scr["route"]()
            await pg.wait_for_timeout(450)
            if await pg.locator(".rg-huelle").count(): await nav_hilfe.rundgang_weg(pg)
            # Details-Gruppen aufklappen wie ein Mensch (Tipp auf die Überschrift)
            d = await pg.evaluate("window.__kl.details()"); info["details"] = d["gesamt"]
            for i in range(d["zu"]):
                try:
                    pos = await pg.evaluate("""() => { const s = [...document.querySelectorAll('#app details:not([open]) > summary, #ebene-huelle details:not([open]) > summary')].find((x) => { const r = x.getBoundingClientRect(); return r.width && r.height; });
                        if (!s) return null; s.scrollIntoView({ block: "center" }); const r = s.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; }""")
                    if not pos: break
                    await self.cdp.send("Input.dispatchTouchEvent", {"type": "touchStart", "touchPoints": [{"x": pos["x"], "y": pos["y"]}]}); await self.cdp.send("Input.dispatchTouchEvent", {"type": "touchEnd", "touchPoints": []})
                    await pg.wait_for_timeout(120)
                except Exception: break
            await pg.evaluate("window.scrollTo(0, 0)")
            scr["anker"] = await pg.evaluate("window.__kl.anker()"); self.gesehen_anker.add(scr["anker"]); scr["basis"] = await pg.evaluate("window.__kl.ueberlagerungen(false)")
            await self.fehler_pruefen(scr, "(Ankunft)", fehl0)
            await self.abgeschnitten_pruefen(scr)
            # Ruhe-Messung: lange Aufgaben ohne Eingabe
            tp = await pg.evaluate("performance.now()"); await pg.wait_for_timeout(1000)
            info["ruhe_longtask_ms"] = int(await pg.evaluate("(t) => Math.max(0, ...window.__longtasks.filter((e) => e.s >= t).map((e) => e.d))", tp))
            elemente = await pg.evaluate("(w) => window.__kl.elemente(w)", scr["wurzel"])
            info["elemente"] = len(elemente)
            if not elemente:
                a = await pg.evaluate("window.__kl.anker()"); self.notizen.append(f"{scr['name']}: keine Elemente gefunden, Anker {a}")
                try: await pg.screenshot(path=str(OUT / f"{self.name}_leer_{scr['name'].replace(':', '_')}.png"))
                except Exception: pass
            todo = []
            for el in elemente:
                if el["datei"] or el["typ"] == "file": info["datei_felder"] += 1; continue
                if el["a"] in AUSLASSEN: info["ausgelassen"][el["a"]] = info["ausgelassen"].get(el["a"], 0) + 1; continue
                if el["a"] in AUSLASSEN_LAUF: info["ausgelassen"][el["a"]] = info["ausgelassen"].get(el["a"], 0) + 1; continue
                if el["a"] == "sprache" and el["wert"] != self.sprache: info["ausgelassen"]["sprache(andere)"] = info["ausgelassen"].get("sprache(andere)", 0) + 1; continue
                if el["aus"]: info["nicht_tippbar"]["deaktiviert"] = info["nicht_tippbar"].get("deaktiviert", 0) + 1; continue
                todo.append(el)
            if self.kappung and len(todo) > self.kappung:
                info["gekappt"] = True; info["uebrig_ungeprueft"] = len(todo) - self.kappung; todo = todo[:self.kappung]
            for el in todo:
                self.pruefe_zeit()
                beschr = (el["a"] + (f"[{el['wert']}]" if el["wert"] else "") + (f' "{el["text"]}"' if el["text"] else "")) if el["a"] else f'{el["tag"]} "{el["text"]}"'
                tipp_wirkte = False
                for druck in (False, True):
                    gname = "druck" if druck else "tipp"
                    try:
                        if not await self.zurueck_auf(scr, beschr, gname):
                            info["fehler"] = "Bildschirm nicht wieder erreichbar"; self.notizen.append(f"{scr['name']}: Bildschirm nicht wieder erreichbar, Rest ausgelassen"); return
                        pos = await pg.evaluate("([w, k, o]) => window.__kl.finde(w, k, o)", [scr["wurzel"], el["k"], el["o"]])
                        if "grund" in pos:
                            info["nicht_tippbar"][pos["grund"]] = info["nicht_tippbar"].get(pos["grund"], 0) + 1; break
                        f0 = len(self.fehler)
                        geaendert, lt = await self.geste(pos["x"], pos["y"], druck)
                        if DEBUG: print(f"    {gname} {beschr}: geändert {geaendert} lang {lt:.0f} anker {await pg.evaluate('window.__kl.anker()')}", file=sys.stderr, flush=True)
                        if druck: info["gedrueckt"] += 1; self.druecke += 1
                        else: info["getippt"] += 1; self.tipps += 1
                        # Fable 30.10.2026 (Prüfung des Agenten-Ergebnisses): „tot“ nur für den kurzen Tipp auf ein Element, das noch nicht aktiv ist.
                        # Langes Drücken (850 ms) darf laut Soll-Liste 7.2 gerade NICHTS auslösen – keine Änderung ist dort das richtige Verhalten;
                        # ein Tipp auf den schon gewählten Reiter/Chip ändert ebenfalls nichts. Beides wird gezählt, nicht gemeldet.
                        if geaendert is None and druck: info["druck_ohne_wirkung"] = info.get("druck_ohne_wirkung", 0) + 1
                        elif geaendert is None and el["aktuell"]: info["tipp_auf_aktives"] = info.get("tipp_auf_aktives", 0) + 1
                        elif geaendert is None:
                            await self.befund(scr, beschr, "tot", FENSTER_MS, f"keine Änderung in {FENSTER_MS} ms nach dem Loslassen (Länge, Ansicht, Fokus, Blatt)", gname)
                        if not druck: tipp_wirkte = geaendert is not None
                        if lt > HAENGER_MS: await self.befund(scr, beschr, "haenger", lt, f"lange Aufgabe {int(lt)} ms (> {HAENGER_MS} ms)", gname)
                        elif lt > LANG_MS: await self.befund(scr, beschr, "lang", lt, f"lange Aufgabe {int(lt)} ms (> {LANG_MS} ms)", gname)
                        await self.fehler_pruefen(scr, beschr, f0, gname)
                        if geaendert is not None:
                            await self.abgeschnitten_pruefen(scr, "")
                            a = await pg.evaluate("window.__kl.anker()")
                            if a != scr["anker"] and a not in self.gesehen_anker and a not in self.entdeckt:
                                self.entdeckt[a] = {"von": scr["name"], "element": beschr}
                    except Zeitgrenze: raise
                    except Exception as e:
                        info["nicht_tippbar"]["Fehler"] = info["nicht_tippbar"].get("Fehler", 0) + 1; self.notizen.append(f"{scr['name']} {beschr} {gname}: {str(e)[:120]}")
                        try: await self.neu_laden()
                        except Exception: pass
            # Ende des Besuchs: Blätter schließen, dann Zurück-Weg prüfen
            await self.zurueck_auf(scr, "(Ende)", "")
            if scr["blatt"]:
                rest = await self.alles_zu()
                if rest: await self.befund(scr, "(Schließen)", "overlay", 0, f"Blatt bleibt nach dem Schließen offen: {', '.join(rest)}")
            else:
                await self.zurueck_weg(scr)
        finally:
            info["dauer_s"] = round(time.monotonic() - t0, 1)
            print(f"  [{self.name}] {scr['name']}: {info['elemente']} Elemente, {info['getippt']} Tipps, {info['gedrueckt']} Drücke, {info['dauer_s']} s, Befunde bisher {len(self.befunde)}", file=sys.stderr, flush=True)

    async def zurueck_weg(self, scr):
        """(f) Der erste Zurück-Knopf führt auf den vorigen Bildschirm."""
        vor = scr.get("vorher")
        if vor is None: return
        pg = self.pg
        await scr["route"](); await pg.wait_for_timeout(250)
        z = await pg.evaluate("""() => { const w = ['.zurueckzeile', '.zurueckknopf', '[data-a="nav"][data-wert="buero"]', '.zurueck[data-a="zurueck"]'];
            for (const s of w) { const e = [...document.querySelectorAll(s)].find((x) => { const r = x.getBoundingClientRect(); return r.width && r.height; });
                if (e) { e.scrollIntoView({ block: "center" }); const r = e.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2, sel: s, text: (e.textContent || "").trim().slice(0, 20) }; } } return null; }""")
        if not z:
            await self.befund(scr, "(Zurück)", "zurueck", 0, "kein Zurück-Element gefunden (.zurueckzeile, .zurueckknopf, nav→buero, .zurueck); vorheriger Bildschirm wäre nur über die Leiste unten/Menü erreichbar"); return
        f0 = len(self.fehler)
        await self.cdp.send("Input.dispatchTouchEvent", {"type": "touchStart", "touchPoints": [{"x": z["x"], "y": z["y"]}]}); await self.cdp.send("Input.dispatchTouchEvent", {"type": "touchEnd", "touchPoints": []})
        await pg.wait_for_timeout(700)
        if await pg.locator(".rg-huelle").count(): await nav_hilfe.rundgang_weg(pg)
        ok = await vor(self)
        if not ok:
            a = await pg.evaluate("window.__kl.anker()")
            await self.befund(scr, f'Zurück "{z["text"]}" ({z["sel"]})', "zurueck", 0, f"erster Zurück-Knopf führt nicht auf den vorigen Bildschirm; stattdessen: {a}")
        await self.fehler_pruefen(scr, "(Zurück)", f0)

    # ----- Bildschirm-Liste
    def schirm(self, name, modus, route, wurzel="#app", blatt=False, vorher=None, immer_neu=False):
        return {"name": name, "modus": modus, "route": route, "wurzel": wurzel, "blatt": blatt, "vorher": vorher, "immer_neu": immer_neu, "anker": "", "basis": []}

    async def alle_bildschirme(self):
        pg = self.pg
        async def laden(ziel):
            await self.zu_modus("laden"); await nav_hilfe.geh(pg, ziel)
        def r_laden(ziel):
            async def f(): await laden(ziel)
            return f
        async def r_umsatzheute():
            await laden("start"); await nav_hilfe._tipp(pg, '#app [data-a="nav"][data-wert="umsatzheute"]', 420)
        async def r_menue():
            await self.zu_modus("laden"); await nav_hilfe.geh(pg, "start"); await nav_hilfe.menue(pg)
        async def r_sprache():
            await r_menue(); await pg.click('#ebene-huelle [data-a="blatt-sprache"]'); await pg.wait_for_selector("#ebene-huelle .blatt-sprache")
        async def r_hilfe():
            await laden("start"); await nav_hilfe._tipp(pg, '#app [data-a="hilfe-auf"]', 300); await pg.wait_for_selector("#ebene-huelle .blatt-hilfe")
        async def r_personal():
            await self.zu_modus("personal")
            if await pg.locator(".riesenkachel").count() == 0:
                await nav_hilfe._tipp(pg, '[data-a="nav"][data-wert="personal"]', 400)
            await pg.wait_for_selector(".riesenkachel", timeout=10000)
        def r_personal_ziel(ziel):
            async def f():
                await r_personal(); await nav_hilfe._tipp(pg, f'#app [data-a="personal-ziel"][data-wert="{ziel}"]', 420)
            return f
        async def r_pin():
            await r_personal(); await pg.click('[data-a="schloss"]'); await pg.wait_for_selector("#ebene-huelle .blatt-pin")
        async def r_buero():
            await self.zu_modus("buero")
            start = '.ebene-kopf.buero .zurueckzeile[data-a="modus"]'
            for _ in range(8):
                if await pg.locator(start).count(): return
                if await pg.locator('.ebene-kopf.buero .zurueckzeile[data-a="nav"][data-wert="buero"]').count():
                    await nav_hilfe._tipp(pg, '.ebene-kopf [data-a="nav"][data-wert="buero"]', 350)
                else:
                    await self.neu_laden(); await self.zu_modus("buero")
                await pg.wait_for_timeout(200)
            await pg.wait_for_selector(start, timeout=5000)
        def r_buero_nav(ziel):
            async def f():
                await r_buero(); await nav_hilfe._tipp(pg, f'#app [data-a="nav"][data-wert="{ziel}"]', 300)
            return f
        def r_buero_bearbeiten(schritt, bis):
            async def f():
                await r_buero(); await nav_hilfe._tipp(pg, f'#app [data-a="bearbeiten"][data-schritt="{schritt}"]' + (f'[data-bis="{bis}"]' if bis else ":not([data-bis])"), 450)
            return f
        # Prüfungen „vorher“: kommt der Zurück-Knopf auf dem richtigen Bildschirm an?
        async def vor_heute(l): return await l.modus() == "laden" and await l.pg.locator('.tableiste .tab.an[data-wert="start"]').count() == 1
        async def vor_laden(l): return await l.modus() == "laden"
        async def vor_personal(l): return await l.modus() == "personal" and await l.pg.locator(".riesenkachel").count() > 0
        async def vor_buero(l): return await l.modus() == "buero" and await l.pg.locator('.ebene-kopf.buero .zurueckzeile[data-a="modus"]').count() == 1
        S = self.schirm; liste = []
        liste += [S("laden:heute", "laden", r_laden("start")), S("laden:muell", "laden", r_laden("muell")), S("laden:kuehl", "laden", r_laden("kuehl")), S("laden:putzplan", "laden", r_laden("putzplan")),
                  S("laden:karte", "laden", r_laden("karte")), S("laden:umsatzheute", "laden", r_umsatzheute, vorher=vor_heute), S("laden:abschluss", "laden", r_laden("abschluss"), vorher=vor_heute),
                  S("laden:menue-blatt", "laden", r_menue, "#ebene-huelle", blatt=True), S("laden:sprache-blatt", "laden", r_sprache, "#ebene-huelle", blatt=True),
                  S("laden:hilfe-blatt", "laden", r_hilfe, "#ebene-huelle", blatt=True)]
        liste += [S("personal:start", "personal", r_personal), S("personal:pin-blatt", "personal", r_pin, "#ebene-huelle", blatt=True, immer_neu=True)]
        for z in ("muell", "kuehl", "putzplan"): liste.append(S(f"personal:{z}", "personal", r_personal_ziel(z), vorher=vor_personal))
        # Büro: Ziele vom Büro-Start lesen
        await r_buero()
        await pg.wait_for_timeout(300)
        ziele = await pg.evaluate("""() => { const nav = [], bea = [], sn = new Set(), sb = new Set();
            for (const d of document.querySelectorAll("#app details:not([open])")) d.open = true;
            for (const e of document.querySelectorAll('#app [data-a="nav"], #app [data-a="bearbeiten"]')) { const r = e.getBoundingClientRect(); if (!r.width || !r.height) continue;
                if (e.dataset.a === "nav") { if (e.dataset.wert !== "buero" && !sn.has(e.dataset.wert)) { sn.add(e.dataset.wert); nav.push(e.dataset.wert); } }
                else { const k = (e.dataset.schritt || "") + "|" + (e.dataset.bis || ""); if (!sb.has(k)) { sb.add(k); bea.push([e.dataset.schritt || "", e.dataset.bis || "", (e.textContent || "").trim().slice(0, 30)]); } } }
            return { nav, bea }; }""")
        liste.append(S("buero:start", "buero", r_buero, vorher=vor_laden))
        for z in ziele["nav"]: liste.append(S(f"buero:nav:{z}", "buero", r_buero_nav(z), vorher=vor_buero))
        for sch, bis, txt in ziele["bea"]: liste.append(S(f"buero:bearbeiten:{sch}" + (f">{bis}" if bis else ""), "buero", r_buero_bearbeiten(sch, bis), vorher=vor_buero))
        self.buero_ziele = ziele
        return liste

    async def ablauf(self):
        self.gesehen_anker = set()
        await self.start(); pg = self.pg
        await schnellstart.schnellstart(pg, PORT)
        await nav_hilfe.rundgang_weg(pg)
        await self.sprache_setzen(self.sprache)
        # wie schnellstart.code_setzen, aber ohne die Testhilfe aufklappen.js: Büro-Gruppen werden hier wie sonst auch von Hand aufgeklappt
        await nav_hilfe.ins_buero(pg); await pg.wait_for_timeout(300)
        await nav_hilfe._tipp(pg, '#app [data-a="pin-setzen"]', 100); await pg.wait_for_selector("#ebene-huelle .blatt-pin")
        await schnellstart.code_tippen(pg, CODE); await pg.wait_for_timeout(300); await schnellstart.code_tippen(pg, CODE)
        await pg.locator("#ebene-huelle .blatt-pin").wait_for(state="detached", timeout=30000)
        await schnellstart.rettungscode_quittieren(pg); await pg.wait_for_timeout(400)
        assert await pg.evaluate("!!window.__gastrocalc.wurzel.bueroPin"), "Büro-Code nicht gesetzt"
        await nav_hilfe.rundgang_weg(pg)
        if self.cpu > 1: await self.cdp.send("Emulation.setCPUThrottlingRate", {"rate": self.cpu})  # erst nach der Einrichtung, sonst reißen die festen Wartezeiten des Schnellstarts
        liste = await self.alle_bildschirme()
        if self.nur: liste = [s for s in liste if any(n in s["name"] for n in self.nur)]
        for scr in liste:
            self.pruefe_zeit()
            try: await self.besuche(scr)
            except Zeitgrenze: raise
            except Exception as e:  # ein Bildschirm, der sich nicht erreichen lässt, bricht nicht die Variante ab
                self.notizen.append(f"{scr['name']}: Besuch abgebrochen: {type(e).__name__} {str(e)[:150]}")
                for info in self.bildschirme[-1:]:
                    if info["name"] == scr["name"]: info["fehler"] = f"Besuch abgebrochen: {type(e).__name__}"
                try: await self.neu_laden()
                except Exception: pass
        await self.alles_zu()
        # Fehler, die zwischen den Bildschirmen auftraten (Wegwechsel) und noch nicht zugeordnet sind, sind schon in fehler_pruefen erfasst


async def variante(b, v, kappung, minuten, nur):
    name, sprache, br, ho, cpu = v
    l = Lauf(b, name, sprache, br, ho, cpu, kappung, minuten, nur); t0 = time.monotonic(); abgebrochen = ""
    try:
        await l.ablauf()
    except Zeitgrenze:
        abgebrochen = f"nach {minuten} Minuten abgebrochen (Teilergebnis)"
    except Exception as e:
        abgebrochen = f"Abbruch durch Fehler: {type(e).__name__}: {str(e)[:200]}"
    finally:
        await l.ende_kontext()
    dauer = time.monotonic() - t0
    art = {}
    for bf in l.befunde: art[bf["art"]] = art.get(bf["art"], 0) + 1
    return l, {"name": name, "sprache": sprache, "viewport": f"{br}x{ho}", "cpu_drossel": cpu, "laufzeit_s": round(dauer, 1), "bildschirme": len([s for s in l.bildschirme if s.get("elemente") is not None]),
               "tipps": l.tipps, "druecke": l.druecke, "befunde_je_art": art, "abgebrochen": abgebrochen, "kappung_je_bildschirm": kappung, "notizen": l.notizen[:40],
               "entdeckt_nicht_besucht": [{"anker": k, **w} for k, w in l.entdeckt.items()], "buero_ziele": getattr(l, "buero_ziele", None), "bildschirm_liste": l.bildschirme}


def main():
    if "--kurz" in sys.argv:  # Wächter (E1): eine Variante, 40 Elemente je Bildschirm, 12 Minuten
        os.environ.setdefault("KLICK_SCHNELL", "1"); os.environ.setdefault("KLICK_MAX", "40"); os.environ.setdefault("KLICK_MINUTEN", "12")
    t0 = time.time(); OUT.mkdir(parents=True, exist_ok=True)
    for alt in OUT.glob("*.png"): alt.unlink()
    kappung = int(os.environ["KLICK_MAX"]) if os.environ.get("KLICK_MAX") else None
    minuten = float(os.environ.get("KLICK_MINUTEN", "15"))
    nur = [n for n in os.environ.get("KLICK_NUR", "").split(",") if n]
    parallel = int(os.environ.get("KLICK_PARALLEL", "2"))
    varianten = VARIANTEN[:1] if os.environ.get("KLICK_SCHNELL") == "1" else VARIANTEN
    if os.environ.get("KLICK_VARIANTE"): varianten = [VARIANTEN[int(os.environ["KLICK_VARIANTE"]) - 1]]
    srv = schnellstart.server(PORT); ergebnis = {"datum": time.strftime("%Y-%m-%d %H:%M"), "port": PORT, "varianten": [], "befunde": []}; ausgabe = []
    def ablegen(l, info):
        ergebnis["varianten"].append(info); ergebnis["befunde"] += l.befunde; ausgabe.append(info)
        (OUT / "ergebnis.json").write_text(json.dumps(ergebnis, ensure_ascii=False, indent=1), encoding="utf-8")  # nach jeder Variante sichern
    try:
        async def alles():
            nonlocal kappung, minuten
            async with async_playwright() as p:
                b = await p.chromium.launch()
                # Die erste Variante läuft allein und mit der Zeitgrenze (Standard 15 Minuten). Reicht die Zeit nicht: Teilergebnis behalten, notieren,
                # danach alle Läufe mit den ersten 60 Elementen je Bildschirm. Die Kappung spart bei kleinen Bildschirmen kaum etwas, deshalb bekommt der
                # gekappte Lauf mehr Zeit (KAPPUNG_MINUTEN).
                l, info = await variante(b, varianten[0], kappung, minuten, nur); rest = varianten[1:]
                if info["abgebrochen"].startswith("nach") and kappung is None:
                    alt = info["name"]; info["name"] += " (ungekappt, abgebrochen)"
                    for datei in OUT.glob(f"{alt}_*.png"): datei.rename(OUT / datei.name.replace(f"{alt}_", f"{alt}-ungekappt_", 1))  # die gekappte Wiederholung nummeriert neu
                    for bf in l.befunde:
                        bf["variante"] = info["name"]; bf["bild"] = bf["bild"].replace(f"{alt}_", f"{alt}-ungekappt_", 1) if bf["bild"] else ""
                    ablegen(l, info); kappung = 60; minuten = max(minuten, KAPPUNG_MINUTEN); rest = list(varianten)
                else: ablegen(l, info)
                sem = asyncio.Semaphore(max(1, parallel))
                async def eins(v):
                    async with sem: return await variante(b, v, kappung, minuten, nur)
                for l, info in await asyncio.gather(*(eins(v) for v in rest if v[4] == 1)): ablegen(l, info)
                for v in rest:  # CPU-Drossel läuft allein, damit die Messung nicht von einem zweiten Lauf gestört wird
                    if v[4] > 1: ablegen(*await variante(b, v, kappung, minuten, nur))
                await b.close()
        asyncio.run(alles())
    finally:
        srv.terminate()
    ordnung = {v[0]: i for i, v in enumerate(VARIANTEN)}
    ergebnis["varianten"].sort(key=lambda i: (ordnung.get(i["name"].split(" ")[0], 99), i["name"])); ausgabe.sort(key=lambda i: (ordnung.get(i["name"].split(" ")[0], 99), i["name"]))
    ergebnis["laufzeit_s"] = round(time.time() - t0, 1)
    (OUT / "ergebnis.json").write_text(json.dumps(ergebnis, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"Klickjagd GastroCash · {len(ausgabe)} Läufe · {ergebnis['laufzeit_s']:.0f} s · {OUT / 'ergebnis.json'}")
    summe = {}
    for i in ausgabe:
        print(f"\n[{i['name']}] {i['laufzeit_s']:.0f} s · Bildschirme {i['bildschirme']} · Tipps {i['tipps']} · Drücke {i['druecke']}" + (f" · {i['abgebrochen']}" if i["abgebrochen"] else "") + (f" · gekappt auf {i['kappung_je_bildschirm']}" if i["kappung_je_bildschirm"] else ""))
        print("  Befunde:", ", ".join(f"{k} {n}" for k, n in sorted(i["befunde_je_art"].items())) or "keine")
        for k, n in i["befunde_je_art"].items(): summe[k] = summe.get(k, 0) + n
    print("\nBefunde gesamt:", ", ".join(f"{k} {n}" for k, n in sorted(summe.items())) or "keine")
    if any(summe.get(k) for k in ("tot", "haenger", "konsole")): sys.exit(1)


if __name__ == "__main__":
    main()
