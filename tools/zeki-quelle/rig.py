# Zeki-Gliederfigur aus gemalten Teilen. Eine Quelle für alles: Grundfigur, Mienen, Bewegungen, Bühnen-Haltungen.
# Koordinaten: viewBox 0 0 237 328 (wie die bisherige Figur). Filmfenster je Zelle: -80 -45 420 521.71875.
import math, json, os
T = os.path.dirname(os.path.abspath(__file__)) + '/teile'
P, TI, SA, GL, HO, WE = '#F5EDE2', '#22301F', '#4C6B55', '#E8763A', '#E2CDB2', '#8B3A2E'
MX = 118.5
# Platzierung der gemalten Teile
HELM = dict(s=0.426, tx=MX - 239.5 * 0.426, ty=8 - 30 * 0.426)          # Helm 176 breit, Oberkante y 8
RUMPF = dict(s=0.44, sx=0.475, tx=MX - 176 * 0.475, ty=318 - 442 * 0.44)             # Unterkante der Füße y 318
HALS = (MX, 150)                                                          # Drehpunkt Kopf
SCHULTER = {'L': (57.0, 181.0), 'R': (180.0, 181.0)}
ARM = dict(sx=0.34, sy=0.34)
ARMPKT = {'L': dict(p0=(134, 66), pe=(82, 192), pw=(80, 264)), 'R': dict(p0=(86, 66), pe=(138, 192), pw=(140, 264))}
AUGE_Y, AUGE_DX, MUND_Y = 88.0, 27.0, 109.0
MUENZE = json.load(open(T + '/info.json'))['muenze']

def rot(p, a):
    c, s = math.cos(math.radians(a)), math.sin(math.radians(a)); return (p[0] * c - p[1] * s, p[0] * s + p[1] * c)

def bild(name, w, h, trans, href=None):
    return '<g transform="%s"><image href="%s" width="%d" height="%d"/></g>' % (trans, href or ('teile/%s.png' % name), w, h)

# ---------- Gesicht ----------
MIENEN = {
    # auge: (rx, ry) · brauen: None oder (innen_dy, aussen_dy, hoehe) · mund: ('bogen', breite, tiefe) | ('o', r)
    'neutral':     dict(auge=(8.2, 12.4), mund=('bogen', 24, 2.2)),
    'hilfe':       dict(auge=(8.2, 12.4), mund=('bogen', 30, 7.5)),            # freundlich
    'aufmerksam':  dict(auge=(8.8, 13.6), brauen=(0, 0, -21), mund=('bogen', 28, 6.0)),
    'import':      dict(auge=(8.2, 5.6), brauen=(1.5, 0, -12), mund=('bogen', 20, 0.0)),   # prüfend
    'staunt':      dict(auge=(8.4, 13.2), brauen=(0, 0, -22), mund=('o', 5.2)),
    'warnung':     dict(auge=(7.5, 10.2), brauen=(0, 0, -16), mund=('bogen', 26, 0.0)),    # ernst
    'fehler':      dict(auge=(7.5, 10.8), brauen=(-5, 3, -18), mund=('bogen', 24, -6.5)),  # Sorge
    'freude':      dict(auge=(9.2, 13.8), mund=('bogen', 42, 15.0)),
    'bestaetigt':  dict(auge=(7.8, 11.8), mund=('bogen', 34, 10.5)),
    'erleichtert': dict(auge=(7.5, 10.4), brauen=(2, -2, -19), mund=('bogen', 32, 9.0)),
    'frage':       dict(auge=(7.8, 12.0), brauen=(0, 0, -17), braue_r_hoch=5, mund=('bogen', 16, 1.0), mund_dx=3),
    'preis':       dict(auge=(8.0, 8.4), brauen=(1, 0, -14), mund=('bogen', 18, 2.0), mund_dx=-3),
}

def gesicht(miene='neutral', blick=(0, 0), lid=(0, 0), ueber=None):
    """lid: Schließgrad je Auge 0..1 (links, rechts im Bild). ueber: Werte, die die Miene überschreiben."""
    m = dict(MIENEN[miene]); m.update(ueber or {})
    rx, ry = m['auge']; bx, by = blick; o = []
    for i, (seite, cx) in enumerate((('l', MX - AUGE_DX), ('r', MX + AUGE_DX))):
        zu = lid[i]; x, y = cx + bx, AUGE_Y + by
        o.append('<g id="auge-%s">' % seite)
        if zu < 0.999:
            o.append('<ellipse cx="%.2f" cy="%.2f" rx="%.2f" ry="%.2f" fill="%s"/>' % (x, y + ry * zu * 0.35, rx, max(0.9, ry * (1 - zu)), P))
        o.append('</g><g id="lid-%s">' % seite)
        if zu >= 0.999:
            o.append('<path d="M%.2f %.2f Q%.2f %.2f %.2f %.2f" fill="none" stroke="%s" stroke-width="3.6" stroke-linecap="round"/>' % (x - rx - 1, y + 2, x, y + 7, x + rx + 1, y + 2, P))
        o.append('</g><g id="braue-%s">' % seite)
        if m.get('brauen'):
            inn, aus, h = m['brauen']; h = h - (m.get('braue_r_hoch', 0) if seite == 'r' else 0)
            xi, xa = (x + rx + 1.5, x - rx - 1.5) if seite == 'l' else (x - rx - 1.5, x + rx + 1.5)
            o.append('<path d="M%.2f %.2f Q%.2f %.2f %.2f %.2f" fill="none" stroke="%s" stroke-width="3.2" stroke-linecap="round"/>' % (xi, y + h + inn, x, y + h - 2.2 + (inn + aus) / 2, xa, y + h + aus, P))
        o.append('</g>')
    mx, my = MX + bx * 0.55 + m.get('mund_dx', 0), MUND_Y + by * 0.5
    art = m['mund']
    if art[0] == 'o':
        o.append('<g id="mund-o"><ellipse cx="%.2f" cy="%.2f" rx="%.2f" ry="%.2f" fill="none" stroke="%s" stroke-width="3.4"/></g>' % (mx, my + 2, art[1], art[1] * 1.2, P))
    else:
        b, t = art[1], art[2]
        gid = 'mund-grinsen' if t >= 5 else 'mund-neutral'
        o.append('<g id="%s"><path d="M%.2f %.2f Q%.2f %.2f %.2f %.2f" fill="none" stroke="%s" stroke-width="5" stroke-linecap="round"/></g>' % (gid, mx - b / 2, my - t * 0.25, mx, my + t * 1.5, mx + b / 2, my - t * 0.25, P))
    return ''.join(o)

# ---------- Requisiten (in der Hand) ----------
def requisit(art, x, y, w=0, deck=1.0):
    g = '<g transform="translate(%.2f %.2f) rotate(%.2f)" opacity="%.2f">' % (x, y, w, deck)
    if art == 'klemmbrett':
        g += ('<rect x="-19" y="-27" width="38" height="52" rx="4" fill="#C9AE8C"/><rect x="-19" y="-27" width="38" height="52" rx="4" fill="none" stroke="#A98F6F" stroke-width="1.2"/>'
              '<rect x="-15" y="-20" width="30" height="41" rx="2" fill="%s"/><rect x="-8" y="-31" width="16" height="8" rx="3" fill="%s"/>'
              '<path d="M-10 -11h20M-10 -3h20M-10 5h13" stroke="%s" stroke-width="2" stroke-linecap="round" opacity=".55"/>'
              '<path d="M-10 13l3 3 6-7" stroke="%s" stroke-width="2.4" fill="none" stroke-linecap="round" stroke-linejoin="round"/>') % (P, TI, TI, SA)
    elif art == 'lupe':
        g = g[:-1] + ' transform="scale(1.25)">' if False else g
        g += ('<path d="M9 9l15 15" stroke="#A98F6F" stroke-width="7" stroke-linecap="round"/><circle r="15" fill="#DDE6DC" opacity=".55"/>'
              '<circle r="15" fill="none" stroke="%s" stroke-width="4.5"/><path d="M-8 -6a10 10 0 0 1 7 -5" stroke="%s" stroke-width="2.4" fill="none" stroke-linecap="round" opacity=".9"/>') % (TI, P)
    elif art == 'diagramm':
        g += ('<rect x="-22" y="-19" width="44" height="38" rx="5" fill="%s"/><rect x="-22" y="-19" width="44" height="38" rx="5" fill="none" stroke="%s" stroke-width="1.2"/>'
              '<rect x="-15" y="0" width="7" height="12" rx="1.5" fill="%s"/><rect x="-4.5" y="-6" width="7" height="18" rx="1.5" fill="%s"/><rect x="6" y="-12" width="7" height="24" rx="1.5" fill="%s"/>') % (P, HO, SA, SA, GL)
    elif art == 'papier':
        g += ('<rect x="-17" y="-23" width="34" height="46" rx="3" fill="%s"/><rect x="-17" y="-23" width="34" height="46" rx="3" fill="none" stroke="%s" stroke-width="1.2"/>'
              '<path d="M-11 -14h22M-11 -6h22M-11 2h22M-11 10h14" stroke="%s" stroke-width="2" stroke-linecap="round" opacity=".5"/>') % (P, HO, TI)
    elif art == 'kamera':
        g += ('<rect x="-22" y="-13" width="44" height="29" rx="6" fill="%s"/><rect x="-13" y="-18" width="14" height="8" rx="3" fill="%s"/>'
              '<circle cx="2" cy="2" r="9.5" fill="%s"/><circle cx="2" cy="2" r="5.5" fill="%s"/><circle cx="15" cy="-7" r="2.2" fill="%s"/>') % (TI, TI, P, TI, GL)
    elif art == 'karte':
        g += ('<rect x="-15" y="-10" width="30" height="20" rx="3.5" fill="%s"/><rect x="-15" y="-10" width="30" height="20" rx="3.5" fill="none" stroke="%s" stroke-width="1.2"/>'
              '<path d="M-9 -2h18M-9 4h10" stroke="%s" stroke-width="2.2" stroke-linecap="round"/>') % (P, HO, SA)
    return g + '</g>'

# ---------- Arm ----------
def arm(seite, heben=0, beugen=0, hand=None, vorn=False, hand_dreh=0):
    """heben: Oberarm nach außen (Grad). beugen: Unterarm weiter nach außen (+) oder nach innen vor den Körper (−).
    hand: None = runde dunkle Manschette · 'offen' = Fäustling · vorn: Unterarm und Hand liegen vor dem Körper."""
    vz = 1 if seite == 'L' else -1
    S = SCHULTER[seite]; pk = ARMPKT[seite]; sx, sy = ARM['sx'], ARM['sy']; n = 'arm_l' if seite == 'L' else 'arm_r'
    a1 = vz * heben; a2 = a1 + vz * beugen
    de = rot(((pk['pe'][0] - pk['p0'][0]) * sx, (pk['pe'][1] - pk['p0'][1]) * sy), a1); E = (S[0] + de[0], S[1] + de[1])
    dw = rot(((pk['pw'][0] - pk['pe'][0]) * sx, (pk['pw'][1] - pk['pe'][1]) * sy), a2); W = (E[0] + dw[0], E[1] + dw[1])
    ober = bild(n + '_ober', 220, 368, 'translate(%.2f %.2f) rotate(%.2f) scale(%.4f %.4f) translate(%d %d)' % (S[0], S[1], a1, sx, sy, -pk['p0'][0], -pk['p0'][1]))
    gelenk = bild('kugel', 275, 275, 'translate(%.2f %.2f) scale(0.150) translate(-137 -138)' % E) if abs(beugen) > 12 else ''
    unter = bild(n + ('_unter_kurz' if hand else '_unter'), 220, 368, 'translate(%.2f %.2f) rotate(%.2f) scale(%.4f %.4f) translate(%d %d)' % (E[0], E[1], a2, sx, sy, -pk['pe'][0], -pk['pe'][1]))
    h = ''
    if hand == 'daumen':
        h = ('<g transform="translate(%.2f %.2f) scale(1.55)"><rect x="-6.5" y="-27" width="12" height="22" rx="6" fill="#2C3D2B"/><rect x="-14" y="-14" width="27" height="25" rx="10.5" fill="#263626"/>'
             '<path d="M-8 -5.5h16M-8 0.5h16M-8 6.5h14" stroke="#1A271B" stroke-width="1.5" stroke-linecap="round" opacity=".55"/>'
             '<path d="M-3.5 -23.5q3 -2.2 6 0" stroke="#465F4A" stroke-width="1.5" fill="none" stroke-linecap="round" opacity=".7"/></g>') % (W[0] - vz * 4, W[1] - 6)
    elif hand:
        hn = 'hand_l' if seite == 'R' else 'hand_r'          # Daumen zeigt zum Körper
        ax = 160 if hn == 'hand_l' else 115
        h = bild(hn, 275, 275, 'translate(%.2f %.2f) rotate(%.2f) scale(0.172) translate(%d -228)' % (W[0], W[1], a2 + 180 + vz * hand_dreh, -ax))
    hinten = ober + ('' if vorn else gelenk + unter + h)
    davor = (gelenk + unter + h) if vorn else ''
    return dict(hinten='<g id="arm-%s">%s</g>' % (seite.lower(), hinten), vorn=davor, hand=W, ellbogen=E, winkel=a2)

# ---------- ganze Figur ----------
RUHE = dict(miene='neutral', blick=(0, 0), lid=(0, 0), kopf=(0, 0, 0), koerper_dy=0, alles=(0, 0), deck=1,
            L=dict(), R=dict(), muenze=0, requisit=None, gesicht=None)

def figur(pose=None, ids=True):
    p = dict(RUHE); p.update(pose or {})
    aL, aR = arm('L', **p['L']), arm('R', **p['R'])
    kx, ky, kw = p['kopf']; dy = p['koerper_dy']
    o = ['<g id="zeki" transform="translate(%.2f %.2f)" opacity="%.3f">' % (p['alles'][0], p['alles'][1], p['deck'])]
    o.append('<g transform="translate(0 %.2f)">' % dy)
    o.append(aL['hinten']); o.append(aR['hinten'])
    o.append('<g id="koerper">' + bild('rumpf', 350, 460, 'translate(%.3f %.3f) scale(%.4f %.4f)' % (RUMPF['tx'], RUMPF['ty'], RUMPF['sx'], RUMPF['s'])) + '</g>')
    mo = p['muenze']
    if mo:
        s = RUMPF['s']; sx = RUMPF['sx']
        o.append('<g id="muenze">' + bild('muenze', MUENZE['gross'], MUENZE['gross'], 'translate(%.3f %.3f) scale(%.4f %.4f)' % (RUMPF['tx'] + MUENZE['ox'] * sx, RUMPF['ty'] + MUENZE['oy'] * s - mo, sx, s))
                 + bild('taschenrand', 350, 460, 'translate(%.3f %.3f) scale(%.4f %.4f)' % (RUMPF['tx'], RUMPF['ty'], sx, s)) + '</g>')
    else:
        o.append('<g id="muenze"></g>')
    o.append('<g id="kopf" transform="translate(%.2f %.2f) rotate(%.2f %.1f %.1f)">' % (kx, ky, kw, HALS[0], HALS[1]))
    o.append(bild('helm', 480, 440, 'translate(%.3f %.3f) scale(%.4f)' % (HELM['tx'], HELM['ty'], HELM['s'])))
    o.append(gesicht(p['miene'], p['blick'], p['lid'], p['gesicht']))
    o.append('</g>')
    req = p['requisit']
    if req and not req.get('vor_hand'):
        o.append(requisit(req['art'], req['x'], req['y'], req.get('w', 0), req.get('deck', 1)))
    o.append(aL['vorn']); o.append(aR['vorn'])
    if req and req.get('vor_hand'):
        o.append(requisit(req['art'], req['x'], req['y'], req.get('w', 0), req.get('deck', 1)))
    o.append('</g></g>')
    return ''.join(o), dict(L=aL, R=aR)
