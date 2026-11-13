# Alle 25 Bewegungen als Funktion: Bild 0..24 -> Haltung. Dazu die 24 Bühnen-Haltungen.
import math
N = 25
def sm(x): x = max(0.0, min(1.0, x)); return x * x * (3 - 2 * x)
def halt(u, a=0.25, b=0.75):
    """0 -> 1 (bis a), bleibt 1, 1 -> 0 (ab b)."""
    return sm(u / a) if u < a else (1.0 if u <= b else sm((1 - u) / (1 - b)))
def welle(u, n=1): return math.sin(2 * math.pi * n * u)
def H(**k): return dict(hand='offen', **k)
def mix(a, b, t): return a + (b - a) * t

def lidschlag(i, mitte, breit=1):
    d = abs(i - mitte)
    return 1.0 if d <= breit - 1 else (0.55 if d == breit else 0.0)

# Griffe (beide Seiten gleich aufgebaut): Arm vor dem Körper
def griff(t, heben=12, beugen=-108, **k): return H(heben=heben * t, beugen=beugen * t, vorn=t > 0.15, **k) if t > 0.02 else {}

def warten(i):
    u = i / 24; z = lidschlag(i, 12)
    return dict(koerper_dy=-1.3 * math.sin(math.pi * u) ** 2, kopf=(0, -0.6 * math.sin(math.pi * u) ** 2, 0), lid=(z, z))
def zwinkern(i):
    u = i / 24; t = halt(u, .3, .7); z = 1.0 if 8 <= i <= 15 else (0.55 if i in (7, 16) else 0)
    return dict(miene='hilfe' if t > .3 else 'neutral', lid=(0, z), kopf=(0, 0, 3 * t), gesicht=dict(mund=('bogen', mix(24, 32, t), mix(2.2, 9, t))))
def grinsen(i):
    u = i / 24; t = halt(u, .3, .75)
    return dict(miene='neutral', kopf=(0, -1.5 * t, 0), gesicht=dict(auge=(mix(8.2, 9.2, t), mix(12.4, 13.8, t)), mund=('bogen', mix(24, 42, t), mix(2.2, 15, t))))
def hand(i):
    u = i / 24; t = halt(u, .22, .8); w = welle((u - .22) / .58, 2) if .22 < u < .8 else 0
    return dict(miene='hilfe' if t > .2 else 'neutral', kopf=(0, 0, 2.5 * t), R=H(heben=100 * t, beugen=52 * t + 16 * w, hand_dreh=10 * w) if t > .02 else {})
def nicken(i):
    u = i / 24; n = max(0, -welle(u, 2)) if u < 1 else 0; n = abs(math.sin(2 * math.pi * u)) * (1 if u < 1 else 0)
    return dict(kopf=(0, 4.5 * n, 0), blick=(0, 3.5 * n), miene='hilfe')
def kopfschuetteln(i):
    u = i / 24; w = welle(u, 2) * halt(u, .12, .88)
    return dict(miene='warnung', kopf=(3.2 * w, 0, 1.5 * w), blick=(6.5 * w, 0))
def pruefen(i):
    u = i / 24; t = halt(u, .2, .82); w = welle((u - .2) / .62, 1) if .2 < u < .82 else 0
    return dict(miene='import' if t > .25 else 'neutral', kopf=(0, 0, -4 * t), blick=(7 * w, 1.5 * t))
def preis(i):
    u = i / 24; t = halt(u, .2, .82); w = welle((u - .2) / .62, 1) if .2 < u < .82 else 0
    return dict(miene='preis' if t > .25 else 'neutral', kopf=(0, 0, 5 * w * t), blick=(6 * w, 3 * t), R=H(heben=22 * t, beugen=-158 * t, vorn=t > .15) if t > .02 else {})
def zeigen(seite, heben, beugen, blick, kopfw):
    def f(i):
        u = i / 24; t = halt(u, .25, .78)
        p = dict(blick=(blick[0] * t, blick[1] * t), kopf=(0, 1.2 * t if blick[1] > 0 else 0, kopfw * t))
        p[seite] = H(heben=heben * t, beugen=beugen * t + 3 * welle(u, 2) * t) if t > .02 else {}
        return p
    return f
def kopf_drehen(i):
    u = i / 24; w = welle(u, 1) * halt(u, .1, .9)
    return dict(kopf=(3.5 * w, 0, 2.5 * w), blick=(9 * w, 0))
def auftreten(i):
    u = i / 24; t = sm(u / .8); x = 250 * (1 - t); schritt = abs(math.sin(math.pi * 4 * u)) * (1 - t) * 7
    sw = welle(u, 2) * (1 - t) * 22
    return dict(alles=(x, -schritt), blick=(-6 * (1 - t), 0), miene='hilfe', L=dict(heben=max(0, sw)), R=dict(heben=max(0, -sw)), kopf=(0, 0, -3 * (1 - t)))
def abgehen(i):
    u = i / 24; t = sm((u - .15) / .85); x = 250 * t; schritt = abs(math.sin(math.pi * 4 * u)) * t * 7
    sw = welle(u, 2) * t * 22
    return dict(alles=(x, -schritt), blick=(7 * min(1, t * 3), 0), miene='hilfe', L=dict(heben=max(0, sw)), R=dict(heben=max(0, -sw)), kopf=(0, 0, 3 * min(1, t * 3)))
def schuerze(i):
    u = i / 24
    t = sm(u / .25) if u < .25 else (1 if u < .7 else sm((1 - u) / .3))          # Hand zur Tasche und zurück
    heb = sm((u - .3) / .2) if u < .5 else 1                                        # Karte anheben
    fall = sm((u - .55) / .4)                                                       # Karte fällt nach unten
    p = dict(blick=(0, 5 * t * (1 - heb * .5) + 4 * fall), kopf=(0, 2 * t, 0), R=H(heben=14 * t, beugen=(-100 - 22 * heb * (1 - fall)) * t, vorn=t > .15) if t > .02 else {})
    if u > .28:
        p['requisit'] = dict(art='karte', x=150 - 6 * heb, y=215 - 26 * heb + 190 * fall ** 1.6, w=-8 + 30 * fall, deck=1 - sm((fall - .75) / .25), vor_hand=fall > .1)
    return p
def daumen(i):
    u = i / 24; t = halt(u, .25, .8); h = math.sin(math.pi * min(1, max(0, (u - .25) / .3))) * 3
    return dict(miene='bestaetigt' if t > .3 else 'neutral', kopf=(0, -h * .4, 2.5 * t), R=dict(heben=30 * t, beugen=-128 * t, vorn=t > .15, hand='daumen' if t > .5 else 'offen') if t > .02 else {})
def nachdenken(i):
    u = i / 24; t = halt(u, .22, .82); w = welle((u - .22) / .6, 1) if .22 < u < .82 else 0
    return dict(miene='frage' if t > .3 else 'neutral', kopf=(0, 0, 5 * t), blick=(-5 * t + 2 * w, -5 * t), R=H(heben=22 * t, beugen=-158 * t, vorn=t > .15) if t > .02 else {})
def schreiben(i):
    u = i / 24; t = halt(u, .22, .82); w = welle((u - .22) / .6, 3) if .22 < u < .82 else 0
    p = dict(blick=(-3 * t, 6 * t), kopf=(0, 2.5 * t, -2 * t), L=griff(t, 16, -100), R=griff(t, 10, -112 + 5 * w) )
    if t > .2: p['requisit'] = dict(art='klemmbrett', x=104, y=214, w=-6, deck=sm((t - .2) / .3))
    return p
def suchen(i):
    u = i / 24; t = halt(u, .22, .82); w = welle((u - .22) / .6, 1) if .22 < u < .82 else 0
    import rig
    arm = dict(heben=(24 + 4 * w) * t, beugen=-156 * t, vorn=t > .15)
    p = dict(miene='import' if t > .3 else 'neutral', blick=(5 * w, 2 * t), kopf=(0, 0, -3 * t), R=H(**arm) if t > .02 else {})
    if t > .2:
        W = rig.arm('R', hand='offen', **arm)['hand']
        p['requisit'] = dict(art='lupe', x=W[0] - 20, y=W[1] - 40, w=0, deck=sm((t - .2) / .3))
    return p
def zahlen_zeigen(i):
    u = i / 24; t = halt(u, .22, .82); w = welle((u - .22) / .6, 2) if .22 < u < .82 else 0
    p = dict(miene='hilfe' if t > .3 else 'neutral', blick=(-5 * t, 5 * t), kopf=(0, 1.5 * t, -2.5 * t), L=griff(t, 16, -100), R=griff(t, 8, -118 + 4 * w))
    if t > .2: p['requisit'] = dict(art='diagramm', x=102, y=212, w=-5, deck=sm((t - .2) / .3))
    return p
def papier_zeigen(i):
    u = i / 24; t = halt(u, .22, .82); hoch = sm((u - .3) / .2) * (1 if u < .8 else sm((1 - u) / .2))
    p = dict(miene='hilfe' if t > .3 else 'neutral', blick=(0, 3 * t), L=griff(t, 14 + 6 * hoch, -104 - 14 * hoch), R=griff(t, 14 + 6 * hoch, -104 - 14 * hoch))
    if t > .2: p['requisit'] = dict(art='papier', x=118.5, y=212 - 12 * hoch, w=0, deck=sm((t - .2) / .3))
    return p
def jubeln(i):
    u = i / 24; t = halt(u, .2, .82); h = abs(math.sin(math.pi * 2 * (u - .2) / .62)) if .2 < u < .82 else 0
    a = H(heben=128 * t, beugen=22 * t + 10 * h) if t > .02 else {}
    return dict(miene='freude' if t > .3 else 'hilfe', koerper_dy=-5 * h * t, kopf=(0, -1.5 * h, 0), L=dict(a), R=dict(a))
def foto(i):
    u = i / 24; t = halt(u, .22, .82); hoch = sm((u - .32) / .18) * (1 if u < .75 else sm((.9 - u) / .15))
    p = dict(blick=(0, 4 * t), L=griff(t, 16 + 8 * hoch, -104 - 30 * hoch), R=griff(t, 16 + 8 * hoch, -104 - 30 * hoch))
    if t > .2: p['requisit'] = dict(art='kamera', x=118.5, y=208 - 62 * hoch, w=0, deck=sm((t - .2) / .3))
    if hoch > .9: p['lid'] = (0, 0)
    return p
def muenze(i):
    u = i / 24; t = halt(u, .25, .8); h = math.sin(math.pi * min(1, max(0, (u - .25) / .55)))
    return dict(miene='bestaetigt' if t > .3 else 'neutral', blick=(0, 5 * t), kopf=(0, 1.5 * t, 0), muenze=max(0.01, 17 * t + 2 * h),
                R=H(heben=20 * t, beugen=-96 * t, vorn=t > .15) if t > .02 else {})

BEWEGUNGEN = {
    'warten': (warten, 4200, 'neutral'), 'zwinkern': (zwinkern, 720, 'hilfe'), 'grinsen': (grinsen, 720, 'freude'),
    'hand': (hand, 1200, 'hilfe'), 'nicken': (nicken, 1200, 'hilfe'), 'kopfschuetteln': (kopfschuetteln, 1200, 'warnung'),
    'pruefen': (pruefen, 1200, 'import'), 'preis': (preis, 1200, 'preis'),
    'zeigen-links': (zeigen('L', 84, 0, (-7, 0), -3), 1400, 'neutral'), 'zeigen-rechts': (zeigen('R', 84, 0, (7, 0), 3), 1400, 'neutral'),
    'zeigen-oben': (zeigen('R', 132, 24, (3, -6), 2), 1400, 'aufmerksam'), 'zeigen-unten': (zeigen('R', 38, -8, (4, 6), 3), 1400, 'neutral'),
    'kopf-drehen': (kopf_drehen, 1600, 'neutral'), 'auftreten': (auftreten, 2400, 'hilfe'), 'abgehen': (abgehen, 2400, 'hilfe'),
    'schuerze': (schuerze, 1800, 'neutral'), 'daumen': (daumen, 1400, 'bestaetigt'), 'nachdenken': (nachdenken, 1800, 'frage'),
    'schreiben': (schreiben, 1800, 'neutral'), 'suchen': (suchen, 1800, 'import'), 'zahlen-zeigen': (zahlen_zeigen, 1800, 'hilfe'),
    'papier-zeigen': (papier_zeigen, 1800, 'hilfe'), 'jubeln': (jubeln, 1400, 'freude'), 'foto': (foto, 1800, 'neutral'), 'muenze': (muenze, 1600, 'bestaetigt'),
}
# Bühne: Bauart/Ansicht -> (Bewegung, Bild, Miene). Immer zwei offene Augen.
BUEHNE = {
    'start': ('hand', 12, 'hilfe'), 'foto-auswahl': ('zeigen-unten', 12, 'neutral'), 'zahl-eingeben': ('schreiben', 12, 'neutral'),
    'rundgang': ('schreiben', 12, 'import'), 'abhak-liste': ('zeigen-unten', 12, 'hilfe'), 'geschafft': ('jubeln', 9, 'freude'),
    'buero': ('warten', 0, 'hilfe'), 'eintragsliste': ('suchen', 12, 'import'), 'eintrag-aendern': ('schreiben', 12, 'hilfe'),
    'zahlen-verlauf': ('zahlen-zeigen', 12, 'hilfe'), 'papier-aushang': ('papier-zeigen', 12, 'hilfe'), 'blatt-sperre': ('warten', 0, 'warnung'),
    'intro': ('warten', 0, 'hilfe'), 'sprache': ('hand', 12, 'hilfe'), 'laden': ('zeigen-links', 12, 'hilfe'),
    'karte-fotografieren': ('foto', 9, 'neutral'), 'kuehlgeraete': ('pruefen', 9, 'import'), 'kosten': ('nachdenken', 12, 'frage'),
    'fertig': ('jubeln', 9, 'freude'), 'fuehrung': ('zeigen-oben', 12, 'aufmerksam'), 'heute-morgen': ('hand', 12, 'hilfe'),
    'heute-mittendrin': ('zeigen-unten', 12, 'neutral'), 'heute-abend': ('daumen', 12, 'bestaetigt'), 'menue-blatt': ('zeigen-links', 12, 'neutral'),
}
def haltung(name):
    b, i, miene = BUEHNE[name]; p = BEWEGUNGEN[b][0](i); p['miene'] = miene; p['lid'] = (0, 0); p.pop('gesicht', None)
    return p
