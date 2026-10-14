// Aus der Texterkennung (TSV mit Wort-Positionen) wieder Zeilen machen, wie ein Mensch die Karte liest.
// Problem: Tesseract trennt Speisekarten oft in Blöcke – links die Namen, rechts die Preise („Döner Kebab …… 7,50").
// Lösung: Zeilen je Block bilden; Blöcke, die fast nur aus Preisen bestehen, den Namenszeilen links daneben zuordnen –
// in Reihenfolge und nach Höhe, mit Ausgleich für ein schräg gehaltenes Handy. Reine Funktion, läuft im Handy und im Test.

const NUR_PREIS = /^[\s€]*(\d{1,3}\s?[.,]\s?\d{2}\s*(€|eur|euro)?[\s€]*)+$/i;
// Preis = Zahl mit zwei Nachkommastellen, die KEINE Menge ist („0,33 l", OCR liest l oft als 1 | ) !)
const HAT_PREIS = /\d{1,3}\s?[.,]\s?\d{2}(?!\d)(?!\s?(l|1|\||\)|!|ml|cl|kg|g)(\s|$))/i;

export function zeilenAusTsv(tsv) {
  const woerter = [];
  for (const z of String(tsv || "").split("\n")) {
    const f = z.split("\t"); if (f.length < 12 || f[0] !== "5") continue;
    const text = f.slice(11).join("\t").trim(); if (!text) continue;
    const [block, absatz, zeile, left, top, width, height, conf] = [f[2], f[3], f[4], f[6], f[7], f[8], f[9], f[10]].map(Number);
    if (conf < 0) continue;
    woerter.push({ block, schluessel: `${block}.${absatz}.${zeile}`, x: left, y: top, b: width, h: height, text });
  }
  // Zeilen, wie Tesseract sie sieht
  const zmap = new Map();
  for (const w of woerter) { if (!zmap.has(w.schluessel)) zmap.set(w.schluessel, { block: w.block, w: [] }); zmap.get(w.schluessel).w.push(w); }
  const zeilen = [...zmap.values()].map((z) => {
    z.w.sort((a, b) => a.x - b.x);
    const x0 = Math.min(...z.w.map((w) => w.x)), x1 = Math.max(...z.w.map((w) => w.x + w.b));
    const y0 = Math.min(...z.w.map((w) => w.y)), y1 = Math.max(...z.w.map((w) => w.y + w.h));
    const text = z.w.map((w) => w.text).join(" ");
    return { block: z.block, x0, x1, ym: (y0 + y1) / 2, h: y1 - y0, text, preisNur: NUR_PREIS.test(text), hatPreis: HAT_PREIS.test(text), partner: null };
  });
  const hoehe = median(zeilen.map((z) => z.h)) || 20;
  // Preisblöcke: Blöcke, in denen mindestens 70 % der Zeilen nur Preise sind
  const bloecke = new Map(); for (const z of zeilen) { if (!bloecke.has(z.block)) bloecke.set(z.block, []); bloecke.get(z.block).push(z); }
  const preisZeilen = [], namenZeilen = [];
  for (const l of bloecke.values()) {
    const anteil = l.filter((z) => z.preisNur).length / l.length;
    if (anteil >= 0.7) preisZeilen.push(...l.filter((z) => z.preisNur));
    else namenZeilen.push(...l.filter((z) => !z.hatPreis));
  }
  // Preise den Namen links daneben zuordnen: geordnet von oben nach unten, mit laufender Schräglage (Versatz)
  preisZeilen.sort((a, b) => a.ym - b.ym);
  const frei = namenZeilen.slice().sort((a, b) => a.ym - b.ym);
  let versatz = 0; const versaetze = [];
  for (const p of preisZeilen) {
    let best = null;
    for (const n of frei) {
      if (n.partner || n.x1 > p.x0 + hoehe) continue; // Name muss links vom Preis enden
      const d = Math.abs(p.ym - n.ym - versatz);
      if (d < 1.6 * hoehe && (!best || d < best.d)) best = { n, d };
    }
    if (best) { best.n.partner = p; p.verbraucht = true; versaetze.push(p.ym - best.n.ym); versatz = median(versaetze.slice(-5)); }
  }
  // Ausgabe in Lesereihenfolge: Blöcke von oben links, Zeilen von oben; zugeordnete Preise hinten an den Namen
  const aus = zeilen.filter((z) => !z.verbraucht).sort((a, b) => a.block - b.block || a.ym - b.ym);
  return aus.map((z) => (z.partner ? `${z.text} ${z.partner.text}` : z.text)).join("\n");
}

function median(a) { if (!a.length) return 0; const s = a.slice().sort((x, y) => x - y); return s[Math.floor(s.length / 2)]; }
