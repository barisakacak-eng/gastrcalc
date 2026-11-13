"""Gemeinsame Wege für die Büro-Aussehen-Prüfungen (Bilder und Browser-Lauf): Schnellstart, Beispiel-Laden, alle Büro-Ziele."""
import pathlib, sys
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
import nav_hilfe, schnellstart

# Alle Büro-Ansichten (Ziele von data-a="nav"): Name → (Bauart, Ziel)
ZIELE = [
    ("buero", 7), ("kartebuero", 8), ("getraenke", 8), ("lieferanten", 8), ("bestand", 8), ("ware", 8), ("kuehlware", 8), ("laeden", 8), ("listen", 8), ("aktionen", 8),
    ("einstellungen", 9), ("umsatz", 10), ("vergleich", 10), ("verkauf", 10), ("preisrunde", 10), ("geld3", 10),
    ("hinweise", 11), ("ordner-amt", 11), ("ordner-steuer", 11), ("ordner-buch", 11), ("beleg", 11), ("tafel", 11), ("inventur", 4), ("kuehl", 4), ("putzplan", 5),
]


async def beispiel_laden(pg):
    """Standard-Laden → Büro → Läden → Beispiel-Laden anlegen (alle Zahlen erfunden)."""
    await nav_hilfe.geh(pg, "laeden")
    await pg.click('#app [data-a="beispiel-anlegen"]'); await pg.wait_for_timeout(800)


async def zu_ziel(pg, ziel):
    if ziel == "buero":
        await nav_hilfe.ins_buero(pg)
    elif ziel == "kuehlware":  # nur über einen offenen Kühl-Hinweis erreichbar: Tipp wie vom Büro aus einsetzen
        await nav_hilfe.ins_buero(pg)
        await pg.evaluate("() => { const b = document.createElement('button'); b.dataset.a = 'nav'; b.dataset.wert = 'kuehlware'; document.querySelector('#app').appendChild(b); b.click(); }")
    else:
        await nav_hilfe.geh(pg, ziel)
    await pg.wait_for_timeout(450)
    for _ in range(4):  # Zekis erster Besuch (zeki_erst) wie ein Mensch wegtippen
        if not await pg.locator('.zeki-erst [data-ze="ok"]').count(): break
        await pg.locator('.zeki-erst [data-ze="ok"]').first.click(); await pg.wait_for_timeout(350)
