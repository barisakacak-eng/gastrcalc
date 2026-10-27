"""Gemeinsame Wege für die Durchläufe (drei Ebenen, 15.10.2026):
Laden-Reiter über die Leiste unten, „Tag abschließen" über das Menü-Blatt, alle anderen Bildschirme über das Büro
(Menü-Blatt → Büro → Zeile mit data-a="nav" data-wert="<ziel>"). Zurück in den Laden über „‹ Laden"."""

LADEN_TABS = ("start", "muell", "kuehl", "putzplan", "karte")
BLATT = ("abschluss",)


async def modus(pg):
    # 20.10.2026: nach einem Sprachwechsel lädt die App sich teils ein zweites Mal neu – erst fragen, wenn sie wieder bereit ist
    await pg.wait_for_function("() => window.__gastrocalc && window.__gastrocalc.wurzel", timeout=15000)
    return await pg.evaluate("window.__gastrocalc.wurzel.modus || 'laden'")


OEFFNEN = "s => { for (const e of document.querySelectorAll(s)) { const d = e.closest('details'); if (d && !d.open) d.open = true; } }"


async def rundgang_weg(pg):
    """Rundgang mit Zeki (27.10.2026) wie ein Mensch durchklicken: Weiter … bis „Ja, alles klar“."""
    await pg.wait_for_timeout(450)
    for _ in range(12):
        if await pg.locator(".rg-huelle").count() == 0: return False
        if await pg.locator('.rg-huelle [data-rg="ja"]').count(): await pg.click('.rg-huelle [data-rg="ja"]'); await pg.wait_for_timeout(150); return True
        if await pg.locator(".rg-huelle .rg-weiter").count(): await pg.click(".rg-huelle .rg-weiter"); await pg.wait_for_timeout(120)
        else: await pg.wait_for_timeout(150)
    return True


async def _tipp(pg, sel, warte):
    if await pg.locator(".rg-huelle").count(): await rundgang_weg(pg)
    await pg.evaluate(OEFFNEN, sel)  # Büro-Bereiche (19.10.2026) sind aufklappbar – Ziel vorher aufklappen, wie ein Mensch es täte
    await pg.locator(sel).first.click(); await pg.wait_for_timeout(warte)


async def zum_laden(pg, warte=420):
    if await modus(pg) != "buero": return
    if await pg.locator('.ebene-kopf [data-a="modus"][data-wert="laden"]').count() == 0:
        await _tipp(pg, '.ebene-kopf [data-a="nav"][data-wert="buero"]', warte)
    await _tipp(pg, '.ebene-kopf [data-a="modus"][data-wert="laden"]', warte)


async def menue(pg, warte=200):
    """Menü-Blatt öffnen (☰ oben links)."""
    await _tipp(pg, '[data-a="menue-auf"]', warte); await pg.wait_for_selector("#ebene-huelle .blatt-menue")


async def ins_buero(pg, warte=420):
    """In den Büro-Start (ohne Büro-Code)."""
    m = await modus(pg)
    if m == "buero":
        if await pg.locator('.ebene-kopf [data-a="nav"][data-wert="buero"]').count():
            await _tipp(pg, '.ebene-kopf [data-a="nav"][data-wert="buero"]', warte)
        return
    await menue(pg)
    await _tipp(pg, '#ebene-huelle [data-a="modus"][data-wert="buero"]', warte)


async def geh(pg, ziel, warte=420):
    if await pg.locator(".rg-huelle").count(): await rundgang_weg(pg)
    if ziel in LADEN_TABS or ziel in BLATT:
        await zum_laden(pg, warte)
        if ziel in LADEN_TABS:
            await _tipp(pg, f'.tableiste [data-a="nav"][data-wert="{ziel}"]', warte)
        else:
            await menue(pg); await _tipp(pg, f'#ebene-huelle [data-a="nav"][data-wert="{ziel}"]', warte)
        return
    await ins_buero(pg, warte)
    if ziel != "buero":
        await _tipp(pg, f'#app [data-a="nav"][data-wert="{ziel}"]', warte)


async def nach_sprache(pg):
    """27.10.2026: nach der Sprache kommt der Schloss-Schritt (Code/Face ID) – im Test „Später“ (Weiter)."""
    for _ in range(150):
        if await pg.locator('[data-a="laden-art"]').count(): return True
        if await pg.locator('[data-a="bio-einrichten"]').count():
            try: await pg.click('[data-a="weiter"]', timeout=3000)
            except Exception: pass
        await pg.wait_for_timeout(120)
    return False
