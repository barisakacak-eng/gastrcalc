# Gleiche Bildvorbereitung wie auswertung.js/bildVorbereiten (lange Seite 2400, Graustufen, Kontrast 1,25) – für Tests mit echten Fotos in Node.
import sys, numpy as np
from PIL import Image
src, out, art = sys.argv[1], sys.argv[2], sys.argv[3]
im = Image.open(src).convert("RGB")
f = min(1, 2400/max(im.size)); im = im.resize((round(im.width*f), round(im.height*f)), Image.LANCZOS)
a = np.asarray(im).astype(float)
y = 0.299*a[...,0]+0.587*a[...,1]+0.114*a[...,2]
if art == "app": k = np.clip((y-128)*1.25+128,0,255)
elif art == "invert": k = 255-np.clip((y-128)*1.25+128,0,255)
Image.fromarray(k.astype(np.uint8)).save(out)
