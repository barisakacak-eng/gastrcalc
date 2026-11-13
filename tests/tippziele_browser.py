"""Tippziele ≥ 44 px (Aussehen „Salbei & Papier“): misst in Einrichtung, Laden, Personal, Büro-Start und Einstellungen (de; 390 × 844 und 360 × 740)
alle sichtbaren Knöpfe, Links, Schalter, Felder und Zusammenklapper (button, a, [data-a], input, select, textarea, summary, [role=button|tab|switch])
auf Breite UND Höhe der TIPPFLÄCHE. Tippfläche = was der Finger trifft: der Kasten des Elements, bei kleinerer sichtbarer Form die zusammenhängende
Fläche rund um die Mitte, die noch zum Element (oder zu seinem Label) gehört (per elementFromPoint, so zählt auch padding und ::after).
Rückgabecode 1 bei Verstoß. Ausnahmen stehen in AUSNAHMEN, je mit Grund.
Umgebung: DURCHLAUF_PORT (Standard 8950) · TZ_SPRACHEN=de · TZ_GROESSEN=390x844,360x740 · TZ_LISTE=1 gibt auch die kleinste Fläche je Ansicht aus.
Aufruf: python3 tools/sw_liste.py && DURCHLAUF_PORT=8950 python3 tests/tippziele_browser.py"""
import asyncio, json, os, pathlib, sys
sys.path.insert(0, str(pathlib.Path(__file__).parent))
import schnellstart, nav_hilfe, au_buero_hilfe as H
from playwright.async_api import async_playwright

PORT = int(os.environ.get("DURCHLAUF_PORT", "8950"))
SPRACHEN = os.environ.get("TZ_SPRACHEN", "de").split(",")
GROESSEN = [tuple(int(x) for x in g.split("x")) for g in os.environ.get("TZ_GROESSEN", "390x844,360x740").split(",")]
LISTE = os.environ.get("TZ_LISTE") == "1"
OHNE_SW = "Object.defineProperty(navigator,'serviceWorker',{value:{controller:{},ready:Promise.resolve(),register:()=>Promise.resolve({}),addEventListener(){},getRegistrations:()=>Promise.resolve([])},configurable:true})"

# Ausnahmen (Selektor → Grund). Nur mit Grund.
AUSNAHMEN = [
    (".dateifeld, input[type=file]", "unsichtbares Dateifeld hinter einer Kachel; getippt wird die Kachel"),
    ("#app a[href]:not(.knopf):not(.zeile):not(.kachel):not([data-a])", "Text-Link im Fließtext (nur wenn im Satz eingebettet, siehe TEXTLINK)"),
]

MESSEN = r"""
(a) => {
  const sichtbar = (e) => { const s = getComputedStyle(e); if (s.display === "none" || s.visibility === "hidden" || Number(s.opacity) === 0) return false;
    for (let p = e; p && p.nodeType === 1; p = p.parentElement) { if (p.hidden) return false; if (p.tagName === "DETAILS" && !p.open && e.tagName !== "SUMMARY") { const sm = [...p.children].find((c) => c.tagName === "SUMMARY"); if (!sm || !sm.contains(e)) return false; } }
    const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0; };
  const nm = (e) => e.tagName.toLowerCase() + (e.className && typeof e.className === "string" ? "." + e.className.trim().split(/\s+/).slice(0, 2).join(".") : "") + (e.getAttribute("data-a") ? "[" + e.getAttribute("data-a") + "]" : (e.getAttribute("data-f") ? "[" + e.getAttribute("data-f") + "]" : ""));
  const sel = "button, a[href], [data-a], input:not([type=hidden]), select, textarea, summary, [role=button], [role=tab], [role=switch]";
  const aus = []; let geprueft = 0, klein = 999;
  for (const e of document.querySelectorAll(sel)) {
    if (!sichtbar(e) || a.ausnahme.some((x) => e.matches(x) && x.indexOf("#app a") < 0)) continue;
    // Text-Link im Fließtext: ein Link, dessen Elternblock noch anderen Text trägt
    if (e.tagName === "A" && !e.matches(".knopf, .zeile, .kachel, [data-a]") && e.parentElement && e.parentElement.textContent.trim() !== e.textContent.trim()) continue;
    if (e.closest("#ebene-huelle:empty")) continue;
    e.scrollIntoView({ block: "center", inline: "center" });
    const r = e.getBoundingClientRect(); geprueft++; klein = Math.min(klein, Math.round(Math.min(r.width, r.height)));
    if (r.width >= 43.5 && r.height >= 43.5) { continue; }
    // Tippfläche per Treffer-Probe: von der Mitte aus nach allen Seiten, solange der Treffer zum Element oder seinem Label gehört
    const lab = e.closest("label"); const gehoert = (x, y) => { if (x < 0 || y < 0 || x >= innerWidth || y >= innerHeight) return false; const h = document.elementFromPoint(x, y); return !!h && (e.contains(h) || (lab && lab.contains(h)) || (h.contains(e) && h.matches("label"))); };
    const cx = Math.round(r.left + r.width / 2), cy = Math.round(r.top + r.height / 2);
    if (!gehoert(cx, cy)) { aus.push({ el: nm(e), text: (e.textContent || e.getAttribute("aria-label") || "").replace(/\s+/g, " ").trim().slice(0, 24), w: Math.round(r.width * 10) / 10, h: Math.round(r.height * 10) / 10, probe: false }); continue; }
    const ausdehnung = (dx, dy) => { let n = 0; while (n < 60 && gehoert(cx + dx * (n + 1), cy + dy * (n + 1))) n++; return n; };
    const w = ausdehnung(-1, 0) + ausdehnung(1, 0) + 1, h = ausdehnung(0, -1) + ausdehnung(0, 1) + 1;
    if (w < 44 || h < 44) aus.push({ el: nm(e), text: (e.textContent || e.getAttribute("aria-label") || "").replace(/\s+/g, " ").trim().slice(0, 24), w: Math.round(r.width * 10) / 10, h: Math.round(r.height * 10) / 10, tippW: w, tippH: h });
  }
  window.scrollTo(0, 0);
  return { aus, geprueft, klein };
}
"""


async def main():
    verstoesse = []; fehler = []; kleinste = {}; n = 0; geprueft = [0]
    srv = schnellstart.server(PORT)
    try:
        async with async_playwright() as p:
            b = await p.chromium.launch(args=["--no-sandbox"])
            for sp in SPRACHEN:
                os.environ["SCHNELLSTART_SPRACHE"] = sp
                for (w, h) in GROESSEN:
                    kennung = f"{sp} {w}x{h}"

                    async def neu():
                        ctx = await b.new_context(viewport={"width": w, "height": h}, device_scale_factor=1, is_mobile=True, has_touch=True, locale="de-DE")
                        await ctx.add_init_script(path=str(pathlib.Path(__file__).resolve().parent / "hilfe" / "aufklappen.js"))
                        await ctx.add_init_script(OHNE_SW)
                        await ctx.add_init_script("try { localStorage.setItem('gc-zeki-erst', JSON.stringify(['muell','kuehl','putzplan','karte','umsatzheute','abschluss','personal','start','buero','einstellungen'])); } catch (e) {}")
                        pg = await ctx.new_page(); pg.on("pageerror", lambda e: fehler.append(str(e)))
                        return ctx, pg

                    async def messe(pg, name):
                        nonlocal n
                        await pg.wait_for_timeout(450)
                        await pg.evaluate("document.querySelectorAll('.zeki-erst').forEach(e => e.remove())")
                        r = await pg.evaluate(MESSEN, {"ausnahme": [x[0] for x in AUSNAHMEN]}); n += 1; m = r["aus"]; geprueft[0] += r["geprueft"]
                        if LISTE: print(f"{kennung} {name}: {r['geprueft']} geprüft, kleinster Kasten {r['klein']} px", flush=True)
                        k = min([min(x.get("tippW", x["w"]), x.get("tippH", x["h"])) for x in m] or [44]); kleinste[f"{kennung} {name}"] = k
                        for x in m:
                            text = f"{x['el']} „{x['text']}“ Kasten {x['w']}×{x['h']}" + (f", Tippfläche {x['tippW']}×{x['tippH']}" if "tippW" in x else ", von anderem Element verdeckt")
                            verstoesse.append(f"{kennung} {name}: {text}")
                            print("VERSTOSS", kennung, name, text, flush=True)

                    # ---------------- Einrichtung ----------------
                    ctx, pg = await neu()
                    await pg.goto(f"http://127.0.0.1:{PORT}/index.html"); await pg.wait_for_selector('[data-f="sprache-wahl"]')
                    await messe(pg, "einrichtung-sprache")
                    await pg.select_option('[data-f="sprache-wahl"]', sp); await pg.wait_for_timeout(300); await pg.click(f'[data-a="sprache"][data-wert="{sp}"]')
                    for _ in range(150):
                        if await pg.locator('[data-a="bio-einrichten"]').count(): break
                        await pg.wait_for_timeout(120)
                    await messe(pg, "einrichtung-schloss")
                    await nav_hilfe.nach_sprache(pg); await pg.wait_for_selector('[data-a="laden-art"]')
                    await messe(pg, "einrichtung-laden")

                    async def weiter(id_):
                        for _ in range(3):
                            await pg.click('[data-a="weiter"]')
                            for _ in range(30):
                                await pg.wait_for_timeout(100)
                                if await pg.evaluate("window.__gastrocalc.stand.schrittId") == id_: await pg.wait_for_timeout(150); return
                        raise AssertionError(f"Schritt {id_} nicht erreicht")
                    await pg.fill('[data-f="betrieb.name"]', "Imbiss Test"); await pg.click('[data-a="laden-art"][data-wert="doener"]'); await pg.wait_for_timeout(150)
                    await messe(pg, "einrichtung-laden-art")
                    await weiter("karte-foto"); await messe(pg, "einrichtung-karte")
                    await weiter("kuehl-schnell"); await messe(pg, "einrichtung-kuehl-leer")
                    await pg.click('[data-a="s2-kuehl"][data-wert="kuehlschrank"][data-d="1"]'); await pg.click('[data-a="s2-kuehl"][data-wert="tiefkuehler"][data-d="1"]'); await pg.wait_for_timeout(200)
                    await messe(pg, "einrichtung-kuehl")
                    await weiter("geld"); await messe(pg, "einrichtung-geld")
                    await pg.fill('input[data-f="ks:miete"]', "1500"); await pg.wait_for_timeout(200)
                    await weiter("fertig-schnell"); await messe(pg, "einrichtung-fertig")
                    await ctx.close()

                    # ---------------- Laden, Personal, Büro-Start, Einstellungen ----------------
                    ctx, pg = await neu()
                    await schnellstart.schnellstart(pg, PORT, name="Imbiss Test")
                    await nav_hilfe.geh(pg, "laeden"); await pg.click('#app [data-a="beispiel-anlegen"]'); await pg.wait_for_timeout(900)
                    klick = lambda sel: pg.evaluate("(s) => document.querySelector(s).click()", sel)
                    await nav_hilfe.geh(pg, "start"); await messe(pg, "laden-start")
                    await nav_hilfe.geh(pg, "muell"); await messe(pg, "laden-muell")
                    await klick('[data-a="muell-detail"]'); await pg.wait_for_timeout(350); await messe(pg, "laden-muell-menge")
                    await klick('[data-a="muell-auswahl"]'); await pg.wait_for_timeout(350); await messe(pg, "laden-muell-andere")
                    await klick('[data-a="muell-auswahl-zu"]'); await pg.wait_for_timeout(250)
                    await klick('[data-a="muell-start"]'); await pg.wait_for_timeout(300)
                    await klick('[data-a="muell-station-auf"]'); await pg.wait_for_timeout(350); await messe(pg, "laden-muell-uebrig")
                    await klick('[data-a="muell-station-zu"]'); await pg.wait_for_timeout(300)
                    await nav_hilfe.geh(pg, "kuehl"); await messe(pg, "laden-kuehl")
                    await klick('[data-a="kuehl-rundgang-los"]'); await pg.wait_for_selector('[data-f="station-wert"]'); await pg.wait_for_timeout(250); await messe(pg, "laden-kuehl-wert")
                    await pg.fill('[data-f="station-wert"]', "14"); await pg.wait_for_timeout(300); await messe(pg, "laden-kuehl-warnung")
                    await pg.fill('[data-f="station-wert"]', "4"); await klick('[data-a="station-speichern"]'); await pg.wait_for_timeout(450); await messe(pg, "laden-kuehl-rundgang")
                    await nav_hilfe.geh(pg, "putzplan"); await messe(pg, "laden-putzplan")
                    await nav_hilfe.geh(pg, "karte"); await messe(pg, "laden-karte")
                    await klick('[data-a="kl-auf"]'); await pg.wait_for_selector(".kl-blatt"); await pg.wait_for_timeout(300); await messe(pg, "laden-karte-preis")
                    await pg.click('button.kl-x[data-a="kl-zu"]'); await pg.wait_for_timeout(350)
                    gid = await pg.evaluate("(window.__gastrocalc.stand.gerichte.find((g) => (g.zutaten || []).length) || {}).id || null")
                    if gid:
                        await pg.evaluate("async (gid) => { const m = await import('./js/screens/karte_laden.js'); m.karteLadenRezeptBlatt(window.__gastrocalc.stand, gid); window.__gastrocalc.zeichne(); }", gid)
                        await pg.wait_for_selector(".kl-rezeptblatt"); await pg.wait_for_timeout(300); await messe(pg, "laden-karte-rezept")
                        await pg.click('#app .kl-rezeptblatt [data-a="kl-zu"].knopf'); await pg.wait_for_timeout(350)
                    pid = await pg.evaluate("""async () => { const W = await import('./js/ware.js'); const s = window.__gastrocalc.stand; return (s.gerichte.find((g) => W.hauptZutat(s, g)) || {}).id || null; }""")
                    if pid:
                        await pg.evaluate("(pid) => { const b = document.createElement('button'); b.dataset.a = 'nav'; b.dataset.wert = 'portion'; b.dataset.id = pid; b.id = 'testportion'; document.querySelector('#app').appendChild(b); }", pid)
                        await pg.evaluate("document.getElementById('testportion').click()"); await pg.wait_for_selector(".po"); await pg.wait_for_timeout(300); await messe(pg, "laden-portion")
                        await klick('[data-a="po-pruefen"]'); await pg.wait_for_timeout(400); await messe(pg, "laden-portion-ergebnis")
                        await klick('[data-a="po-fertig"]'); await pg.wait_for_timeout(300)
                    await nav_hilfe.geh(pg, "start"); await pg.click('#app [data-a="nav"][data-wert="umsatzheute"]'); await pg.wait_for_selector('[data-f="ul-umsatz"]'); await pg.wait_for_timeout(250); await messe(pg, "laden-umsatz-heute")
                    await nav_hilfe.geh(pg, "abschluss"); await messe(pg, "laden-abschluss")
                    if await pg.locator('[data-a="abschluss-fertig"]').count():
                        await klick('[data-a="abschluss-fertig"]'); await pg.wait_for_timeout(700); await messe(pg, "laden-geschafft")
                    await nav_hilfe.geh(pg, "start")
                    # Menü-Blatt und Hilfe-Blatt
                    await nav_hilfe.menue(pg); await messe(pg, "blatt-menue")
                    await pg.click('#ebene-huelle .ikonknopf.zu'); await pg.wait_for_timeout(300)
                    # Büro-Start und Einstellungen (zu und aufgeklappt)
                    await H.zu_ziel(pg, "buero"); await messe(pg, "buero-start")
                    await pg.evaluate(nav_hilfe.OEFFNEN, "details"); await pg.wait_for_timeout(200); await messe(pg, "buero-start-offen")
                    await H.zu_ziel(pg, "einstellungen"); await messe(pg, "einstellungen")
                    await pg.evaluate(nav_hilfe.OEFFNEN, "details"); await pg.wait_for_timeout(200); await messe(pg, "einstellungen-offen")
                    # Personal
                    await nav_hilfe.geh(pg, "start")
                    await schnellstart.code_setzen(pg, "1234"); await nav_hilfe.geh(pg, "start"); await nav_hilfe.menue(pg)
                    await pg.click('#ebene-huelle [data-a="modus"][data-wert="personal"]'); await pg.wait_for_selector(".riesenkachel, .personwahl"); await pg.wait_for_timeout(350)
                    if await pg.locator(".personwahl").count():
                        await messe(pg, "personal-wer"); await klick('.personwahl'); await pg.wait_for_selector(".riesenkachel")
                    await messe(pg, "personal")
                    for ziel in ("muell", "kuehl", "putzplan"):
                        await pg.click(f'[data-a="personal-ziel"][data-wert="{ziel}"]'); await pg.wait_for_timeout(500); await messe(pg, f"personal-{ziel}")
                        await pg.go_back(); await pg.wait_for_timeout(400)
                        if await pg.locator(".riesenkachel").count() != 3:
                            await pg.go_back(); await pg.wait_for_timeout(400)
                    await ctx.close()
            await b.close()
    finally:
        srv.terminate()
    print(f"\n{n} Messungen, {geprueft[0]} Elemente geprüft · JS-Fehler: {len(fehler)}")
    for f in sorted(set(fehler))[:5]: print("  JS", f[:200])
    for sel, grund in AUSNAHMEN: print(f"  ausgenommen: {sel} – {grund}")
    if LISTE: print("Kleinste Tippfläche je Ansicht (px):", json.dumps(kleinste, ensure_ascii=False, indent=0))
    print(f"VERSTÖSSE: {len(verstoesse)}")
    for v in verstoesse: print("  -", v)
    return 1 if verstoesse or fehler else 0


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
