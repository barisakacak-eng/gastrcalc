"""Misst an den echten Bildern, welches Bild jeder Folge dem ruhenden Bühnen-Bild einer Haltung entspricht (Umriss der Figur, oberer Teil bis zur Bühnenkante).
Aufruf: python3 tools/zeki_deckung.py            prüft assets/brand/zeki-buehne/haltebild.json gegen die Bilder
        python3 tools/zeki_deckung.py --schreiben  schreibt haltebild.json neu
Ergebnis: Das Bühnen-Bild einer Haltung ist die GEHALTENE Pose (Höhepunkt der Folge, z. B. Hand oben), nicht die Ruhe (Bild 0). Es liegt oben links bündig auf der Zelle
(Überdeckung ≈ 0,998, Verschiebung 0/0): „frame“ ist das erste Bild der Folge, das dem Bühnen-Bild entspricht. js/zeki_figur.js spielt Ankunft bis dorthin und tauscht dann
unsichtbar gegen das Bühnen-Bild. Braucht Pillow und numpy."""
import pathlib, sys, json
from PIL import Image
import numpy as np
APP = pathlib.Path(__file__).resolve().parent.parent
DATEI = APP / "assets/brand/zeki-buehne/haltebild.json"
zu = json.loads((APP / "assets/brand/zeki-buehne/zuordnung.json").read_text())

def messen():
    erg = {}
    for h in sorted({e["haltung"] for e in zu}):
        sheet = Image.open(APP / "assets/brand/zeki-klein" / (h + ".webp")).convert("RGBA")
        masken = []
        for i in range(25):
            c = sheet.crop(((i % 5) * 256, (i // 5) * 318, (i % 5) * 256 + 256, (i // 5) * 318 + 318)).resize((512, 636), Image.LANCZOS)
            masken.append((np.array(c)[:, :, 3] > 128)[:354])
        # alle Bühnen-Bilder dieser Haltung (gleiche Pose, andere Miene) gegen alle 25 Bilder; Mittelwert je Bild
        bilder = [np.array(Image.open(APP / e["datei"]).convert("RGBA"))[:, :, 3] > 128 for e in zu if e["haltung"] == h]
        iou = [float(np.mean([(b & m).sum() / max(1, (b | m).sum()) for b in bilder])) for m in masken]
        bestes = max(iou); frame = next(i for i, v in enumerate(iou) if v >= bestes - 0.0005)
        b0, m0 = bilder[0], masken[frame]
        verschiebung = max(((((b0 & np.roll(np.roll(m0, dy, 0), dx, 1)).sum() / max(1, (b0 | np.roll(np.roll(m0, dy, 0), dx, 1)).sum())), dx, dy) for dy in range(-3, 4) for dx in range(-3, 4)))
        erg[h] = {"frame": frame, "ueberdeckung": round(bestes, 4), "verschiebung": [verschiebung[1], verschiebung[2]], "ruhe_ueberdeckung": round(iou[0], 4)}
    return erg

erg = messen(); fehler = 0
for h, e in erg.items():
    ok = e["ueberdeckung"] > 0.98 and e["verschiebung"] == [0, 0]; fehler += not ok
    print(f"{h:14s} Bild {e['frame']:2d}  Überdeckung {e['ueberdeckung']:.4f}  (Bild 0: {e['ruhe_ueberdeckung']:.4f})  Verschiebung {e['verschiebung']}  {'ok' if ok else 'ABWEICHUNG'}")
if "--schreiben" in sys.argv:
    DATEI.write_text(json.dumps({h: e["frame"] for h, e in erg.items()}, indent=1, ensure_ascii=False) + "\n"); print("geschrieben:", DATEI)
else:
    alt = json.loads(DATEI.read_text()); abw = [h for h in erg if alt.get(h) != erg[h]["frame"]]
    print("haltebild.json stimmt" if not abw else "haltebild.json weicht ab: " + ", ".join(abw)); fehler += bool(abw)
sys.exit(1 if fehler else 0)
