"""Wiege-Bögen zum Ausdrucken (Baris 12.11.2026): je Gericht und selbst gemachtem Teil eine A4-Seite, Zutaten links, Gramm rechts.
Aufruf: python3 tools/wiege_boegen.py  →  druck/wiege-boegen.pdf (liest die Rezepte aus js/data/katalog.js und js/data/zwischen.js)"""
import json, subprocess, pathlib
APP = pathlib.Path(__file__).resolve().parent.parent
JS = r'''Promise.all([import("./js/data/katalog.js"),import("./js/data/zwischen.js")]).then(([k,z])=>{
 const out={gruppen:[]}; const T={doener:"Döner & Türkisch",pizza:"Pizza & Pasta",beilagen:"Beilagen",salat:"Salate"};
 for (const b of Object.keys(T)) out.gruppen.push({titel:T[b],art:"gericht",liste:k.VORLAGEN[b].map(v=>({name:v.name,zutaten:v.zutaten.map(x=>[x[0],x[2]])}))});
 out.gruppen.push({titel:"Selbst gemacht",art:"selbst",liste:z.ZWISCHENREZEPTE.filter(r=>r.name!=="Rinderpatty 150 g").map(r=>({name:r.name,zutaten:(r.zutaten||[]).map(x=>[x.name||x[0],x.einheit||x[2]||"g"])}))});
 process.stdout.write(JSON.stringify(out)); })'''
daten = subprocess.run(["node", "-e", JS], cwd=APP, capture_output=True, text=True, check=True).stdout
from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas
from reportlab.lib.units import mm
from reportlab.lib.colors import HexColor
D = json.loads(daten)
OUT = str(APP / "druck" / "wiege-boegen.pdf")

GRUEN = HexColor("#0F3D2E"); KUPFER = HexColor("#C8692E"); GRAU = HexColor("#5A6670"); LINIE = HexColor("#9AA5AD"); HELL = HexColor("#EEF3EF")
W, H = A4
VERPACKUNG = ("tüte", "folie", "schale", "karton", "box", "becher", "deckel", "spieß")  # Stück-Zählware

# Vorschläge für selbst gemachte Teile, die es in der App noch nicht als Rezept gibt (Baris 12.11.: Yufka-Teig usw.)
NEU = [
    ("Yufka- / Dürüm-Teig", [["Weizenmehl", "g"], ["Wasser", "ml"], ["Salz", "g"], ["Öl", "ml"]]),
    ("Joghurtsauce", [["Joghurt natur", "g"], ["Salz", "g"]]),
    ("Scharfe Sauce", []),
    ("Weißkrautsalat", [["Weißkohl", "g"], ["Salz", "g"], ["Essig", "ml"], ["Öl", "ml"]]),
    ("Rotkrautsalat", [["Rotkohl", "g"], ["Salz", "g"], ["Essig", "ml"], ["Öl", "ml"]]),
    ("Falafel-Masse", [["Kichererbsen (getrocknet)", "g"], ["Zwiebeln", "g"], ["Knoblauch", "g"], ["Petersilie", "g"], ["Kreuzkümmel", "g"], ["Salz", "g"]]),
    ("Hähnchenspieß (mariniert)", [["Hähnchenfleisch", "g"], ["Joghurt natur", "g"], ["Gewürze", "g"]]),
    ("Ayran", [["Joghurt natur", "g"], ["Wasser", "ml"], ["Salz", "g"]]),
]
TEIG_WASSER = ("teig", "fladen")  # In der App fehlt beim Teig das Wasser – auf dem Bogen ergänzt

seiten = []
for g in D["gruppen"]:
    for p in g["liste"]:
        z = [list(x) for x in p["zutaten"]]
        if g["art"] == "selbst" and any(w in p["name"].lower() for w in TEIG_WASSER) and not any(x[0] == "Wasser" for x in z):
            z.insert(1, ["Wasser", "ml"])
        seiten.append({"gruppe": g["titel"], "art": g["art"], "name": p["name"], "zutaten": z, "neu": False})
for n, z in NEU:
    seiten.append({"gruppe": "Selbst gemacht", "art": "selbst", "name": n, "zutaten": z, "neu": True})
seiten.append({"gruppe": "Leerer Bogen", "art": "leer", "name": "", "zutaten": [], "neu": False})
seiten.append({"gruppe": "Leerer Bogen", "art": "leer_selbst", "name": "", "zutaten": [], "neu": False})

def einheit(name, e):
    if e == "stk": return "Stück"
    if e == "ml": return "ml"
    return "g"

def fuss(c, nr, gesamt):
    c.setFont("Helvetica", 8); c.setFillColor(GRAU)
    c.drawString(18*mm, 10*mm, "GastroCash · Wiege-Bogen · Werte danach in der App eintragen: Büro, dann Rezepte")
    c.drawRightString(W-18*mm, 10*mm, f"Seite {nr} von {gesamt}")

gesamt = len(seiten) + 2  # + Übersicht (2 Seiten)
c = canvas.Canvas(OUT, pagesize=A4)
c.setTitle("GastroCash Wiege-Bögen Dönerladen"); c.setAuthor("Zoro für Baris")

# Übersicht zum Abhaken
eintraege = [(i+3, s) for i, s in enumerate(seiten) if s["art"] in ("gericht", "selbst")]
proseite = 48
for teil in range(2):
    c.setFillColor(GRUEN); c.setFont("Helvetica-Bold", 22); c.drawString(18*mm, H-25*mm, "Wiege-Bögen · Übersicht" + ("" if teil == 0 else " (Fortsetzung)"))
    c.setFillColor(GRAU); c.setFont("Helvetica", 10)
    if teil == 0:
        c.drawString(18*mm, H-32*mm, "So geht's: Bogen ausdrucken, jede Zutat einzeln auf die Waage, Gramm eintragen. Fertig? Hier abhaken.")
        c.drawString(18*mm, H-37*mm, "Tipp: Dieselbe Portion an zwei, drei Tagen wiegen – der Mittelwert ist ehrlicher als ein einzelner Wurf.")
    y = H-48*mm; spalte = 0; zuletzt = None
    for idx, (nr, s) in enumerate(eintraege[teil*proseite:(teil+1)*proseite]):
        x = 18*mm + spalte*90*mm
        if s["gruppe"] != zuletzt:
            c.setFillColor(KUPFER); c.setFont("Helvetica-Bold", 10); c.drawString(x, y, s["gruppe"].upper()); y -= 5.5*mm; zuletzt = s["gruppe"]
        c.setStrokeColor(LINIE); c.rect(x, y-0.8*mm, 3.6*mm, 3.6*mm)
        c.setFillColor(HexColor("#111111")); c.setFont("Helvetica", 10.5)
        c.drawString(x+6*mm, y, s["name"] + (" (neu)" if s["neu"] else ""))
        c.setFillColor(GRAU); c.drawRightString(x+84*mm, y, f"S. {nr}")
        y -= 5.5*mm
        if y < 22*mm and spalte == 0:
            spalte = 1; y = H-48*mm; zuletzt = None
    fuss(c, teil+1, gesamt); c.showPage()

for i, s in enumerate(seiten):
    nr = i + 3
    leer = s["art"].startswith("leer"); selbst = s["art"] in ("selbst", "leer_selbst")
    c.setFillColor(KUPFER); c.setFont("Helvetica-Bold", 11)
    c.drawString(18*mm, H-18*mm, ("SELBST GEMACHT" if selbst else "GERICHT") + ("  ·  NEU – NOCH NICHT IN DER APP" if s["neu"] else ""))
    c.setFillColor(GRUEN)
    if leer:
        c.setFont("Helvetica", 12); c.setFillColor(GRAU); c.drawString(18*mm, H-31*mm, "Name:")
        c.setStrokeColor(LINIE); c.line(34*mm, H-31*mm, W-18*mm, H-31*mm)
    else:
        size = 34 if len(s["name"]) <= 22 else 26 if len(s["name"]) <= 30 else 21
        c.setFont("Helvetica-Bold", size); c.drawString(18*mm, H-33*mm, s["name"])
    c.setFillColor(GRAU); c.setFont("Helvetica", 11)
    c.drawString(18*mm, H-44*mm, "Datum ____________   Gewogen von ____________" + ("" if selbst else "   Größe / Variante ____________"))

    top = H-54*mm; rowh = 13.5*mm
    links, mitte, rechts = 18*mm, 120*mm, W-18*mm
    c.setFillColor(GRUEN); c.rect(links, top-9*mm, rechts-links, 9*mm, fill=1, stroke=0)
    c.setFillColor(HexColor("#FFFFFF")); c.setFont("Helvetica-Bold", 12)
    c.drawString(links+3*mm, top-6*mm, "Zutat"); c.drawString(mitte+3*mm, top-6*mm, "Menge")
    unten = 70*mm if selbst else 52*mm
    zeilen = int((top-9*mm-unten)//rowh)
    z = s["zutaten"]
    y = top-9*mm
    for r in range(zeilen):
        if r % 2 == 1:
            c.setFillColor(HELL); c.rect(links, y-rowh, rechts-links, rowh, fill=1, stroke=0)
        c.setStrokeColor(LINIE); c.line(links, y-rowh, rechts, y-rowh)
        if r < len(z):
            name, e = z[r]
            c.setFillColor(HexColor("#111111")); c.setFont("Helvetica", 14); c.drawString(links+3*mm, y-rowh+4.6*mm, name)
            c.setFillColor(GRAU); c.setFont("Helvetica", 11); c.drawRightString(rechts-3*mm, y-rowh+4.6*mm, einheit(name, e))
        else:
            c.setFillColor(GRAU); c.setFont("Helvetica", 9)
            if r == len(z): c.drawString(links+3*mm, y-rowh+4.6*mm, "weitere Zutat …")
        y -= rowh
    c.setStrokeColor(LINIE); c.line(mitte, top-9*mm, mitte, y); c.rect(links, y, rechts-links, top-y)

    if selbst:
        bx = 18*mm; by = 24*mm; bw = W-36*mm; bh = 40*mm
        c.setStrokeColor(KUPFER); c.setLineWidth(1.4); c.rect(bx, by, bw, bh); c.setLineWidth(1)
        c.setFillColor(GRUEN); c.setFont("Helvetica-Bold", 12); c.drawString(bx+4*mm, by+bh-8*mm, "Nach dem Machen wiegen")
        c.setFillColor(HexColor("#111111")); c.setFont("Helvetica", 12.5)
        c.drawString(bx+4*mm, by+bh-18*mm, "Ganze Menge fertig (Teig / Sauce / Masse):  ____________ g")
        c.drawString(bx+4*mm, by+bh-27*mm, "Ein Stück / eine Kugel / eine Portion:  ____________ g")
        c.drawString(bx+4*mm, by+bh-36*mm, "Ergibt:  ____________ Stück / Portionen")
    else:
        c.setFillColor(HexColor("#111111")); c.setFont("Helvetica", 12.5)
        c.drawString(18*mm, 38*mm, "Verkaufspreis:  ____________ €")
        c.drawString(18*mm, 26*mm, "Notiz:  ______________________________________________________________")
    fuss(c, nr, gesamt); c.showPage()
c.save()
print(len(seiten) + 2, "Seiten")
