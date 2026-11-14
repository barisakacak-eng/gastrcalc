#!/usr/bin/env python3
"""Übersichtsbild (13.11.2026): baut aus den Bildschirm-Fotos EIN Kontaktbogen-Bild (Kacheln 195 × 422 mit Namen darunter), nach Ebenen gruppiert:
Einrichtung · Start/Heute · Laden · Personal · Büro · Blätter/Menü/Führung. JPEG, Qualität 80, Breite höchstens 4.000 px; bei mehr als 120 Kacheln mehrere Bögen.

Vier Fassungen: de-hell, de-dunkel, ar-hell, tr-hell → /home/claude/uebersicht/uebersicht-<fassung>[-<n>].jpg
Woher die Fotos kommen:
  de-hell    voller Lauf von tools/bildschirm_zaehlung.py (Ordner zaehlung-de/, wird wiederverwendet, wenn daten.json da ist; UEBERSICHT_NEU=1 erzwingt einen neuen Lauf)
  de-dunkel, ar-hell, tr-hell
             „Nachspielen“: dieselben Wege (Ansicht + Klickfolge) aus zaehlung-de/daten.json noch einmal gehen, in der anderen Sprache bzw. mit color_scheme="dark",
             und nur fotografieren – kein erneutes Durchklicken (schnell). Die Einrichtung läuft dabei als eigener Durchgang.
  Sonderbildschirme (alle Fassungen): Führung (erster Besuch auf Heute, Station 1 und 2), Intro (Zekis Auftritt), Menü-Blatt, Hilfe-Blatt, Büro-Code-Blatt.
Aufruf:  DURCHLAUF_PORT=9020 python3 tools/uebersichtsbild.py [de-hell de-dunkel ar-hell tr-hell]      (Fassungen wählen; Standard alle vier)
         python3 tools/uebersichtsbild.py --bogen <Ordner mit daten.json> <Ausgabename>   (nur den Bogen aus vorhandenen Fotos bauen)
Ändert keine App-Datei."""
import asyncio, json, math, os, pathlib, sys, time

from PIL import Image, ImageDraw, ImageFont
from playwright.async_api import async_playwright

APP = pathlib.Path(__file__).resolve().parent.parent
sys.path.insert(0, str(APP / "tests")); sys.path.insert(0, str(APP / "tools"))
import nav_hilfe, schnellstart  # noqa: E402
import bildschirm_zaehlung as Z  # noqa: E402

BASIS = pathlib.Path(os.environ.get("UEBERSICHT_OUT", "/home/claude/uebersicht")); BASIS.mkdir(parents=True, exist_ok=True)
PORT = int(os.environ.get("DURCHLAUF_PORT", "9020"))
KACHEL = (195, 422); ABSTAND = 12; RAND = 24; BESCHRIFTUNG = 44; KOPF = 46
MAX_BREITE = 4000; MAX_KACHELN = 120
GRUPPEN = [("einrichtung", "Einrichtung"), ("start", "Start / Heute"), ("laden", "Laden"), ("personal", "Personal"), ("buero", "Büro"), ("blaetter", "Blätter · Menü · Führung")]
FASSUNGEN = {"de-hell": ("de", "light"), "de-dunkel": ("de", "dark"), "ar-hell": ("ar", "light"), "tr-hell": ("tr", "light")}


# ---------------------------------------------------------------- Sonderbildschirme
async def sonderschirme(b, port, sprache, farbe, groesse, haken=None, reduziert=False, ziel=None):
    """Führung (Station 1 und 2), Intro, Menü-Blatt, Hilfe-Blatt, Büro-Code-Blatt. haken(name, page) misst (tests/tor_browser.py); ziel = Ordner für Fotos.
    Gibt die Liste der Bilddateien zurück."""
    os.environ["SCHNELLSTART_SPRACHE"] = sprache
    locale = {"de": "de-DE", "tr": "tr-TR", "ar": "ar-SA"}.get(sprache, sprache)
    srv = schnellstart.server(port); dateien = []; fehler = []
    ctx = await b.new_context(viewport={"width": groesse[0], "height": groesse[1]}, device_scale_factor=1 if ziel is None else 2, is_mobile=True, has_touch=True,
                              locale=locale, color_scheme=farbe, **({"reduced_motion": "reduce"} if reduziert else {}))
    await ctx.add_init_script(path=str(APP / "tests" / "hilfe" / "aufklappen.js"))
    pg = await ctx.new_page(); pg.on("pageerror", lambda e: fehler.append(str(e)))

    async def schuss(name, warte=350):
        await pg.wait_for_timeout(warte)
        if haken:
            try: await haken(name, pg)
            except Exception as e: fehler.append(f"{name}: Messung {e!r}"[:200])
        if ziel:
            datei = pathlib.Path(ziel) / f"sonder-{name}.png"
            try: await pg.screenshot(path=str(datei), timeout=15000); dateien.append(datei)
            except Exception as e: fehler.append(f"{name}: Foto {e!r}"[:200])

    orig = nav_hilfe.rundgang_weg
    async def fuehrung(pg_):
        """Statt den Rundgang wegzutippen: Station 1 und 2 ansehen, dann wie sonst beenden."""
        await pg_.wait_for_timeout(900)
        if await pg_.locator(".rg-huelle").count():
            await schuss("fuehrung-1", 1200)
            k = pg_.locator('.rg-huelle [data-rk="weiter"]')
            if await k.count():
                try: await k.first.click(timeout=2500)
                except Exception: pass
                await schuss("fuehrung-2", 1400)
        else:
            fehler.append("Führung (erster Besuch auf Heute) erschien nicht")
        return await orig(pg_)
    nav_hilfe.rundgang_weg = fuehrung
    try:
        await schnellstart.schnellstart(pg, port)
    finally:
        nav_hilfe.rundgang_weg = orig
    try:
        # Intro: Zekis Auftritt (läuft in der App nur einmal je Sitzung, schon beim ersten Start) – hier frisch und von Hand angestoßen (neue Modul-Instanz)
        if not reduziert:
            await nav_hilfe.rundgang_weg(pg); await nav_hilfe.geh(pg, "start"); await pg.wait_for_timeout(500)
            if await pg.evaluate("async () => { const m = await import('./js/intro.js?uebersicht=' + Date.now()); return m.introStarten(document, { speicher: null }); }"):
                await pg.wait_for_selector(".zeki-intro", timeout=3000); await schuss("intro", 1500)
            else: fehler.append("Intro (Zekis Auftritt) startete nicht (introStarten gibt false zurück)")
            await pg.wait_for_timeout(1500)
        await nav_hilfe.rundgang_weg(pg); await pg.evaluate("document.querySelectorAll('.zeki-erst').forEach(e => e.remove())")
        await nav_hilfe.geh(pg, "start")
        await nav_hilfe.menue(pg); await schuss("menue-blatt")
        await pg.evaluate("() => document.querySelector('#ebene-huelle .ebene-dimmer')?.click()"); await pg.wait_for_timeout(350)
        if await pg.locator('[data-a="hilfe-auf"]').count():
            await pg.locator('[data-a="hilfe-auf"]').first.click(); await pg.wait_for_timeout(500); await schuss("hilfe-blatt")
            await pg.evaluate("() => document.querySelector('#ebene-huelle .ebene-dimmer')?.click()"); await pg.wait_for_timeout(350)
        else: fehler.append("kein Hilfe-Knopf auf Heute")
        await nav_hilfe.ins_buero(pg); await pg.click('#app [data-a="pin-setzen"]'); await pg.wait_for_selector("#ebene-huelle .blatt-pin"); await schuss("buero-code-blatt", 500)
    except Exception as e:
        fehler.append(f"Sonderbildschirme: {e!r}"[:300])
    finally:
        await ctx.close(); srv.terminate()
    if fehler: print("  Sonderbildschirme – Hinweise:", " | ".join(fehler[:6]), flush=True)
    return dateien


# ---------------------------------------------------------------- Fotos holen
async def lauf_voll(ordner, sprache="de", farbe="light"):
    """Voller Lauf des Zählwerkzeugs in diesem Ordner (Fotos + daten.json)."""
    Z.OUT = pathlib.Path(ordner); Z.OUT.mkdir(parents=True, exist_ok=True)
    Z.SPRACHE = sprache; Z.FARBE = farbe; Z.LOCALE = {"de": "de-DE", "tr": "tr-TR", "ar": "ar-SA"}.get(sprache, sprache)
    os.environ["SCHNELLSTART_SPRACHE"] = sprache
    await Z.main()


async def nachspielen(b, quelle, ziel, sprache, farbe, port, modi=("einrichtung", "laden", "buero", "personal"), groesse=(390, 844), reduziert=False, messen=None, lauf_ctx=None):
    """Die Wege aus quelle/daten.json noch einmal gehen und nur fotografieren. Einrichtung: eigener Durchgang.
    messen(Lauf, Eintrag) statt Foto (tests/tor_browser.py): misst nach jedem Weg; lauf_ctx wird dem Lauf als .tor mitgegeben."""
    daten = json.loads((pathlib.Path(quelle) / "daten.json").read_text(encoding="utf-8"))["schirme"]
    if ziel:
        ziel = pathlib.Path(ziel); ziel.mkdir(parents=True, exist_ok=True)
        for p in ziel.glob("*.png"): p.unlink()
        Z.OUT = ziel
    Z.SPRACHE = sprache; Z.FARBE = farbe; Z.LOCALE = {"de": "de-DE", "tr": "tr-TR", "ar": "ar-SA"}.get(sprache, sprache); Z.GROESSE = groesse; Z.REDUZIERT = reduziert
    Z.KEIN_FOTO = messen is not None
    os.environ["SCHNELLSTART_SPRACHE"] = sprache
    _, je_modus, _ = Z.ansichten_aus_code(); notizen = []; neu = []
    async def eine_ebene(modus, i):
        l = Z.Lauf(b, modus, port + i, je_modus); l.tor = lauf_ctx
        try:
            await l.start()
            if modus == "einrichtung":
                await Z.einrichtung(l); neu.extend(l.schirme)
            else:
                for versuch in (1, 2):  # der erste Start fängt manchmal ein Rundgang-Fenster ein: einmal neu beginnen
                    try: await Z.vorbereiten(l); break
                    except Exception as ex:
                        if versuch == 2: raise
                        notizen.append(f"{modus}: Vorbereitung beim ersten Versuch gescheitert ({ex!r})"[:140])
                        await l.ende(); l = Z.Lauf(b, modus, port + i, je_modus); l.tor = lauf_ctx; await l.start()
                for e in [x for x in daten if x["modus"] == modus and x.get("datei")]:
                    ansicht = e.get("ansicht") or (e["weg"][0][4:] if e["weg"] and e["weg"][0].startswith("nav:") else None)
                    weg = [w for w in e["weg"] if not w.startswith("nav:")]
                    if not ansicht: continue
                    try:
                        ok = await l.hin(ansicht, weg)
                        if not ok: notizen.append(f"{modus}-{e['name']}: Weg nicht nachspielbar"); continue
                        await l.pg.wait_for_timeout(300)
                        z = await l.z()
                        if messen: await messen(l, e, z); neu.append(e); continue
                        datei = ziel / f"{modus}-{e['name']}.png"
                        await l.pg.screenshot(path=str(datei), full_page=True, timeout=15000)
                        neu.append({"modus": modus, "name": e["name"], "datei": datei.name, "titel": z["titel"], "blatt": z["blatt"], "ansicht": ansicht, "phase": z["phase"]})
                    except Exception as ex:
                        notizen.append(f"{modus}-{e['name']}: {ex!r}"[:150])
            notizen.extend(f"{modus}: {n}" for n in l.notizen)
        except Exception as ex:
            notizen.append(f"{modus}: Abbruch {ex!r}"[:200])
        finally:
            await l.ende()
    await asyncio.gather(*[eine_ebene(m, i) for i, m in enumerate(modi)])
    if ziel: (ziel / "daten.json").write_text(json.dumps({"schirme": neu, "notizen": notizen}, ensure_ascii=False, indent=1), encoding="utf-8")
    return neu, notizen


def zusammenfuehren(teile, ziel):
    """Läufe je Ebene (jeder mit eigenem daten.json) zu einem Ordner mit einem daten.json zusammenlegen."""
    ziel = pathlib.Path(ziel); ziel.mkdir(parents=True, exist_ok=True); alle = []; notizen = []
    for t in teile:
        t = pathlib.Path(t)
        if not (t / "daten.json").exists(): continue
        d = json.loads((t / "daten.json").read_text(encoding="utf-8"))
        for e in d["schirme"]:
            if e.get("datei") and (t / e["datei"]).exists():
                if t != ziel: (ziel / e["datei"]).write_bytes((t / e["datei"]).read_bytes())
            alle.append(e)
        notizen += d.get("notizen", [])
    (ziel / "daten.json").write_text(json.dumps({"schirme": alle, "notizen": notizen}, ensure_ascii=False, indent=1), encoding="utf-8")
    return len(alle)


# ---------------------------------------------------------------- Bogen bauen
def schrift(gr, fett=False):
    for p in (f"/usr/share/fonts/truetype/dejavu/DejaVuSans{'-Bold' if fett else ''}.ttf", "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf"):
        try: return ImageFont.truetype(p, gr)
        except Exception: pass
    return ImageFont.load_default()


def gruppe_von(e):
    if e["modus"] == "einrichtung" or e.get("phase") == "onboarding": return "einrichtung"
    if e["modus"] == "sonder" or e.get("blatt"): return "blaetter"
    if e["modus"] == "laden" and (e.get("ansicht") == "start" or e["name"].split("-")[0] == "start"): return "start"
    return e["modus"]


def bogen_bauen(ordner, ausgabe, titel):
    """Kacheln aus ordner (daten.json + PNG, dazu sonder-*.png) zu einem oder mehreren JPEG-Bögen. Gibt die Dateinamen zurück."""
    ordner = pathlib.Path(ordner)
    daten = json.loads((ordner / "daten.json").read_text(encoding="utf-8"))["schirme"]
    eintraege = [e for e in daten if e.get("datei") and (ordner / e["datei"]).exists()]
    for f in sorted(ordner.glob("sonder-*.png")):
        eintraege.append({"modus": "sonder", "name": f.stem[7:], "datei": f.name, "titel": "", "blatt": "x"})
    gruppen = {k: [] for k, _ in GRUPPEN}
    for e in eintraege: gruppen[gruppe_von(e)].append(e)
    spalten = max(1, (MAX_BREITE - 2 * RAND + ABSTAND) // (KACHEL[0] + ABSTAND))
    breite = 2 * RAND + spalten * KACHEL[0] + (spalten - 1) * ABSTAND
    # Kacheln der Reihe nach auf Bögen verteilen (höchstens MAX_KACHELN je Bogen, Gruppenköpfe bei jedem Bogen neu)
    boegen, aktuell, n = [], [], 0
    for k, name in GRUPPEN:
        liste = gruppen[k]; teil = 0
        while liste:
            frei = MAX_KACHELN - n
            if frei <= 0: boegen.append(aktuell); aktuell, n = [], 0; frei = MAX_KACHELN
            stueck, liste = liste[:frei], liste[frei:]
            aktuell.append((name + (" (Fortsetzung)" if teil else ""), stueck)); n += len(stueck); teil += 1
    if aktuell: boegen.append(aktuell)
    f_kopf, f_gruppe, f_name = schrift(22, True), schrift(20, True), schrift(11)
    ergebnis = []
    gesamt = sum(len(e) for e in gruppen.values())
    for bi, bogen in enumerate(boegen, 1):
        hoehen = KOPF
        for name, stueck in bogen: hoehen += 40 + math.ceil(len(stueck) / spalten) * (KACHEL[1] + BESCHRIFTUNG + ABSTAND) + 10
        bild = Image.new("RGB", (breite, hoehen + RAND), (236, 232, 222)); d = ImageDraw.Draw(bild)
        d.text((RAND, 12), f"{titel} – {gesamt} Bildschirme" + (f" · Bogen {bi} von {len(boegen)}" if len(boegen) > 1 else ""), font=f_kopf, fill=(34, 48, 31))
        y = KOPF
        for name, stueck in bogen:
            d.text((RAND, y + 6), f"{name} ({len(stueck)})", font=f_gruppe, fill=(76, 107, 85)); y += 40
            for i, e in enumerate(stueck):
                x = RAND + (i % spalten) * (KACHEL[0] + ABSTAND); yy = y + (i // spalten) * (KACHEL[1] + BESCHRIFTUNG + ABSTAND)
                try:
                    im = Image.open(ordner / e["datei"]).convert("RGB")
                    sk = KACHEL[0] / im.width; ganz = im.resize((KACHEL[0], max(1, round(im.height * sk))), Image.LANCZOS)
                    kachel = ganz.crop((0, 0, KACHEL[0], KACHEL[1]))
                    bild.paste(kachel, (x, yy))
                    d.rectangle([x - 1, yy - 1, x + KACHEL[0], yy + KACHEL[1]], outline=(160, 150, 130))
                    if ganz.height > KACHEL[1] + 4:  # Bild ist länger als ein Handy-Schirm: Marke „weiter unten“
                        d.rectangle([x, yy + KACHEL[1] - 16, x + KACHEL[0], yy + KACHEL[1]], fill=(34, 48, 31)); d.text((x + 6, yy + KACHEL[1] - 15), f"scrollt: ×{ganz.height / KACHEL[1]:.1f}", font=f_name, fill=(245, 237, 226))
                except Exception as ex:
                    d.rectangle([x, yy, x + KACHEL[0], yy + KACHEL[1]], outline=(180, 0, 0)); d.text((x + 6, yy + 6), "Bild fehlt", font=f_name, fill=(180, 0, 0))
                beschr = e["name"].replace("-", " ")
                zeilen = []; zeile = ""
                for w in beschr.split():
                    if d.textlength((zeile + " " + w).strip(), font=f_name) > KACHEL[0]: zeilen.append(zeile); zeile = w
                    else: zeile = (zeile + " " + w).strip()
                zeilen.append(zeile)
                for j, t in enumerate(zeilen[:3]): d.text((x, yy + KACHEL[1] + 4 + j * 13), t, font=f_name, fill=(34, 48, 31))
            y += math.ceil(len(stueck) / spalten) * (KACHEL[1] + BESCHRIFTUNG + ABSTAND) + 10
        pfad = BASIS / (f"{ausgabe}.jpg" if len(boegen) == 1 else f"{ausgabe}-{bi}.jpg")
        bild.save(pfad, "JPEG", quality=80, optimize=True); ergebnis.append(str(pfad))
    return ergebnis, gesamt, {k: len(v) for k, v in gruppen.items()}


# ---------------------------------------------------------------- Ablauf
async def main():
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    if "--bogen" in sys.argv:
        pfade, n, je = bogen_bauen(args[0], args[1], args[1]); print(pfade, n, je); return
    wahl = args or list(FASSUNGEN)
    quelle = BASIS / "zaehlung-de"; zusammen = {}
    async with async_playwright() as p:
        b = await p.chromium.launch(args=["--no-sandbox"])
        if (not (quelle / "daten.json").exists()) or os.environ.get("UEBERSICHT_NEU") == "1":
            print("== voller Lauf de-hell", flush=True); await lauf_voll(quelle)
            for k in (quelle / "daten.json", ): pass
        for fassung in wahl:
            sp, farbe = FASSUNGEN[fassung]; t0 = time.time()
            if fassung == "de-hell": ordner = quelle
            else:
                ordner = BASIS / f"zaehlung-{fassung}"
                print(f"== Nachspielen {fassung}", flush=True)
                neu, notizen = await nachspielen(b, quelle, ordner, sp, farbe, PORT)
                print(f"   {len(neu)} Fotos, {len(notizen)} Hinweise", flush=True)
                for n in notizen[:8]: print("   -", n)
            for f in ordner.glob("sonder-*.png"): f.unlink()
            await sonderschirme(b, PORT, sp, farbe, (390, 844), ziel=ordner)
            pfade, n, je = bogen_bauen(ordner, f"uebersicht-{fassung}", f"GastroCash {fassung}")
            zusammen[fassung] = {"bilder": pfade, "bildschirme": n, "je_gruppe": je}
            print(f"   {fassung}: {n} Bildschirme {je} → {pfade} ({time.time() - t0:.0f} s)", flush=True)
        await b.close()
    (BASIS / "uebersicht.json").write_text(json.dumps(zusammen, ensure_ascii=False, indent=1), encoding="utf-8")


if __name__ == "__main__":
    asyncio.run(main())
