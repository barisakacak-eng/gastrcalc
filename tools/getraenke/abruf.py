"""Getränkefotos aus Open Food Facts (19.10.2026, Baris „Go alle“).
Läuft auf GitHub (Workflow getraenke_fotos.yml), weil Zoros Arbeitsrechner openfoodfacts.org nicht erreicht.
Liest tools/getraenke/liste.csv (marke;sorte;groesse;gebinde;ean), sucht je Zeile das deutsche Produkt mit Frontfoto,
lädt das Frontfoto in voller Größe und schreibt tools/getraenke/ergebnis.csv mit Barcode, Name, Menge, Bildlink, Urheber, Lizenz.
Lizenz der Fotos: Open Food Facts, Creative Commons Attribution-ShareAlike 3.0 (https://world.openfoodfacts.org/terms-of-use).
Nichts wird erfunden: kein Treffer = Zeile mit status „nicht gefunden“."""
import csv, json, pathlib, re, time, urllib.parse, urllib.request

ORDNER = pathlib.Path(__file__).resolve().parent
ROH = ORDNER / "roh"; ROH.mkdir(exist_ok=True)
UA = {"User-Agent": "GastroCalc/1.0 (https://github.com/barisakacak-eng/gastrcalc; Bildabruf fuer Getraenke-Fotos)"}
FELDER = "code,product_name,product_name_de,brands,quantity,countries_tags,selected_images,images,unique_scans_n"
LIZENZ = "CC BY-SA 3.0 (Open Food Facts)"


def hole(url, roh=False, versuche=2):
    for i in range(versuche):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=20) as r:
                d = r.read(); return d if roh else json.loads(d)
        except Exception as e:  # Ratenbegrenzung oder Netz: kurz warten
            if i == versuche - 1: print("  Fehler", url[:90], e); return None
            time.sleep(5)


def ml(text):
    """„330 ml“, „0,33 l“, „33 cl“, „1.5L“ → Milliliter (oder None)."""
    m = re.search(r"(\d+(?:[.,]\d+)?)\s*(ml|cl|l)\b", (text or "").lower())
    if not m: return None
    w = float(m.group(1).replace(",", ".")); return round(w * {"ml": 1, "cl": 10, "l": 1000}[m.group(2)])


def frontbild(p):
    sel = (p.get("selected_images") or {}).get("front") or {}
    disp = sel.get("display") or {}
    for lang in ("de", "en", "tr", "fr"):
        if disp.get(lang):
            schluessel = f"front_{lang}"; info = (p.get("images") or {}).get(schluessel) or {}
            url = re.sub(r"\.\d+\.jpg$", ".full.jpg", disp[lang])
            uploader = ((p.get("images") or {}).get(str(info.get("imgid"))) or {}).get("uploader") or "Open Food Facts contributors"
            return url, uploader, lang
    return None, None, None


def produkt(code):
    d = hole(f"https://world.openfoodfacts.org/api/v2/product/{code}.json?fields={FELDER}")
    return d["product"] if d and d.get("status") == 1 else None


def kandidaten(z):
    """Erst der bekannte Barcode, sonst die schnelle Suche (search.openfoodfacts.org), dann je Treffer die Produktdaten."""
    if z["ean"]:
        p = produkt(z["ean"])
        if p: return [p]
    suche = f"{z['marke']} {z['sorte']}".replace("Original", "").strip()
    q = urllib.parse.urlencode({"q": f'{suche} countries_tags:"en:germany"', "page_size": 20, "fields": "code,product_name,brands,quantity"})
    d = hole("https://search.openfoodfacts.org/search?" + q) or {}
    treffer = sorted(d.get("hits") or [], key=lambda p: -passt(p, z))[:4]
    out = []
    for t in treffer:
        if passt(t, z) < 0: continue
        p = produkt(t["code"]); time.sleep(0.7)
        if p: out.append(p)
    return out


def passt(p, z):
    name = f"{p.get('product_name_de') or p.get('product_name') or ''} {p.get('brands') or ''}".lower()
    marke = z["marke"].lower().replace("ı", "i").replace("ğ", "g").replace("ş", "s").split()[0]
    if marke not in name.replace("ı", "i").replace("ğ", "g").replace("ş", "s"): return -1
    punkte = 0
    soll = round(float(z["groesse"].replace(",", ".")) * 1000) if z["groesse"] else None
    ist = ml(p.get("quantity"))
    if soll and ist == soll: punkte += 5
    elif soll and ist and abs(ist - soll) > 1: punkte -= 3
    for w in re.findall(r"\w{4,}", z["sorte"].lower()):
        if w in name: punkte += 2
    if z["sorte"].lower() in ("original",) and re.search(r"zero|light|sugarfree|ohne zucker", name): punkte -= 4
    return punkte


def main():
    zeilen = list(csv.DictReader(open(ORDNER / "liste.csv", encoding="utf-8"), delimiter=";"))
    out = []
    for z in zeilen:
        print(z["marke"], z["sorte"], z["groesse"], z["gebinde"])
        best = None
        for p in kandidaten(z):
            url, uploader, lang = frontbild(p)
            if not url: continue
            s = passt(p, z) if not z["ean"] else 10
            if s >= 0 and (best is None or s > best[0]): best = (s, p, url, uploader, lang)
        zeile = {**z, "status": "nicht gefunden", "ean_gefunden": "", "name_off": "", "menge_off": "", "produktseite": "", "bild": "", "datei": "", "urheber": "", "lizenz": "", "punkte": ""}
        if best:
            s, p, url, uploader, lang = best
            datei = f"{p['code']}.jpg"; bild = hole(url, roh=True)
            if bild:
                (ROH / datei).write_bytes(bild)
                zeile.update(status="gefunden", ean_gefunden=p["code"], name_off=p.get("product_name_de") or p.get("product_name") or "", menge_off=p.get("quantity") or "",
                             produktseite=f"https://world.openfoodfacts.org/product/{p['code']}", bild=url, datei=datei, urheber=uploader, lizenz=LIZENZ, punkte=s)
        print("  →", zeile["status"], zeile["ean_gefunden"], zeile["name_off"], zeile["menge_off"])
        out.append(zeile)
        with open(ORDNER / "ergebnis.csv", "w", encoding="utf-8", newline="") as f:  # nach jeder Zeile sichern
            w = csv.DictWriter(f, fieldnames=list(zeile.keys()), delimiter=";"); w.writeheader(); w.writerows(out)
    with open(ORDNER / "ergebnis.csv", "w", encoding="utf-8", newline="") as f:
        w = csv.DictWriter(f, fieldnames=list(out[0].keys()), delimiter=";"); w.writeheader(); w.writerows(out)
    print(sum(1 for x in out if x["status"] == "gefunden"), "von", len(out), "gefunden")


main()
