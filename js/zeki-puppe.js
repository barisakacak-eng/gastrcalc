// Zeki als Gliederpuppe (Baris 28.10.2026: „besser, schneller, effizienter – einfach machen“).
// Statt 25 gemalter Bilder je Bewegung bewegt sich die vorhandene Vektorfigur an Gelenken:
// Kopf am Hals, Arme an der Schulter, Hand am Handgelenk, Füße am Knöchel. Gleiche Figur in jeder Bewegung, kein Springen,
// keine Bilddateien, offline. Neue Bewegung = ein Eintrag in BEWEGUNGEN.
// Nur Darstellung. Bei „reduzierte Bewegung“ spielt nichts (prüft der Aufrufer, siehe gastrocash-brand.js).

const NS = "http://www.w3.org/2000/svg";
// Gelenke in Einheiten der viewBox (0 0 237 328), gemessen an den Clip-Formen der Figur.
export const GELENKE = {
  zeki: [118, 318], kopf: [118, 146], "arm-l": [48, 160], "arm-r": [189, 160],
  "fuss-l": [86, 290], "fuss-r": [150, 290], "auge-l": [88, 82], "auge-r": [140, 82],
};
const FUSS_OBEN = 286; // ab hier sind die Füße eigene Teile (Überlappung bis 278 liegt hinter dem Körper)

const teil = (svg, id) => svg.querySelector(`[data-zeki-teil="${id}"]`);

// Einmal je Figur: Arme und Füße als eigene Teile aus der Figur schneiden, Gelenkpunkte setzen.
// Schnittlinien liegen genau auf der dunklen Kontur zwischen Arm und Körper; Arme und Füße liegen hinter dem Körper,
// darum sieht man die Schnittkante nicht, wenn sie sich drehen.
const L = 44.5, M = 118.5, R = 2 * M - L; // linke und rechte Kante des Rumpfs, Mitte
const FORMEN = {
  "arm-l": `M-60 135 L52 135 L47 165 L${L} 175 L${L} 290 L-60 290 Z`,
  "arm-r": `M297 135 L${2 * M - 52} 135 L${2 * M - 47} 165 L${R} 175 L${R} 290 L297 290 Z`,
  rumpf: `M${L} 400 L${L} 175 L47 165 L52 135 L-60 135 L-60 -60 L297 -60 L297 135 L${2 * M - 52} 135 L${2 * M - 47} 165 L${R} 175 L${R} 400 Z`,
  ober: `M-60 -60 L297 -60 L297 ${FUSS_OBEN} L-60 ${FUSS_OBEN} Z`,
  "fuss-l": `M-60 ${FUSS_OBEN - 8} L${M} ${FUSS_OBEN - 8} L${M} 420 L-60 420 Z`,
  "fuss-r": `M${M} ${FUSS_OBEN - 8} L297 ${FUSS_OBEN - 8} L297 420 L${M} 420 Z`,
};
export function zekiPuppeVorbereiten(svg) {
  if (!svg || svg.dataset.zekiPuppe === "1") return !!svg;
  const doc = svg.ownerDocument, koerper = teil(svg, "koerper"), use = koerper?.querySelector("use");
  const m = (use?.getAttribute("clip-path") || "").match(/url\(#(.*)clip-koerper\)/);
  const defs = svg.querySelector("defs"), href = use?.getAttribute("href") || use?.getAttribute("xlink:href");
  if (koerper && use && m && defs && href) {
    const prefix = m[1];
    const el = (tag, attrs = {}) => { const e = doc.createElementNS(NS, tag); for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v); return e; };
    for (const [id, d] of Object.entries(FORMEN)) { const c = el("clipPath", { id: prefix + "puppe-" + id }); c.appendChild(el("path", { d })); defs.appendChild(c); }
    const stueck = (id, innenId) => {
      const g = el("g", { "data-zeki-teil": id }), clip = el("g", { "clip-path": `url(#${prefix}puppe-${innenId})` });
      clip.appendChild(el("use", { href })); g.appendChild(clip); return g;
    };
    // alte, zu schmale Arm-Ausschnitte stilllegen (Körper malte die Ärmel mit)
    for (const alt of ["arm-l", "arm-r"]) { const a = teil(svg, alt); if (a) { a.setAttribute("data-zeki-teil", alt + "-alt"); a.style.display = "none"; } }
    const vorn = koerper; // Reihenfolge hinten → vorn: Arme, Füße, Rumpf, Münze, Kopf
    const fl = stueck("fuss-l", "fuss-l"), fr = stueck("fuss-r", "fuss-r");
    for (const f of [fl, fr]) { const bild = f.firstChild; bild.setAttribute("data-zeki-teil", f.getAttribute("data-zeki-teil") + "-bild"); }
    // Füße nur aus dem Körperausschnitt (sonst Reste anderer Teile)
    for (const f of [fl, fr]) f.firstChild.firstChild.setAttribute("clip-path", use.getAttribute("clip-path"));
    vorn.parentNode.insertBefore(stueck("arm-l", "arm-l"), vorn);
    vorn.parentNode.insertBefore(stueck("arm-r", "arm-r"), vorn);
    vorn.parentNode.insertBefore(fl, vorn);
    vorn.parentNode.insertBefore(fr, vorn);
    const h1 = el("g", { "clip-path": `url(#${prefix}puppe-rumpf)` }), h2 = el("g", { "clip-path": `url(#${prefix}puppe-ober)` });
    while (koerper.firstChild) h2.appendChild(koerper.firstChild);
    h1.appendChild(h2); koerper.appendChild(h1);
  }
  for (const [id, [x, y]] of Object.entries(GELENKE)) {
    const el = id === "fuss-l" || id === "fuss-r" ? teil(svg, id + "-bild") : teil(svg, id);
    if (!el) continue;
    el.style.transformBox = "view-box";
    el.style.transformOrigin = `${x}px ${y}px`;
  }
  svg.dataset.zekiPuppe = "1";
  return true;
}

// Bausteine
const r = (g) => ({ transform: `rotate(${g}deg)` });
const ty = (y) => ({ transform: `translateY(${y}px)` });
const t = (x, y = 0, g = 0) => ({ transform: `translate(${x}px, ${y}px) rotate(${g}deg)` });
const weich = "cubic-bezier(.45,.05,.35,1)";

// Jede Bewegung: { dauer, mimik (Zustand während der Bewegung), teile: { teil: [Keyframes, Optionen?] } }
export const BEWEGUNGEN = {
  winken: { dauer: 2000, mimik: "freude", teile: {
    "arm-r": [[r(0), { ...r(-135), offset: 0.18 }, { ...r(-112), offset: 0.32 }, { ...r(-138), offset: 0.46 }, { ...r(-112), offset: 0.6 }, { ...r(-135), offset: 0.74 }, r(0)]],
    kopf: [[r(0), { ...r(4), offset: 0.3 }, { ...r(4), offset: 0.75 }, r(0)]],
  } },
  nicken: { dauer: 1000, mimik: "bestaetigt", teile: {
    kopf: [[ty(0), { ...ty(5), offset: 0.25 }, { ...ty(-1), offset: 0.5 }, { ...ty(4), offset: 0.72 }, ty(0)]],
  } },
  kopfschuetteln: { dauer: 1100, mimik: "fehler", teile: {
    kopf: [[r(0), { ...r(-7), offset: 0.2 }, { ...r(7), offset: 0.42 }, { ...r(-6), offset: 0.62 }, { ...r(5), offset: 0.8 }, r(0)]],
  } },
  nachdenken: { dauer: 2600, mimik: "import", vorne: ["arm-r"], teile: {
    "arm-r": [[r(0), { ...r(118), offset: 0.22 }, { ...r(118), offset: 0.78 }, r(0)]],
    kopf: [[r(0), { ...r(-8), offset: 0.25 }, { ...r(-8), offset: 0.75 }, r(0)]],
    "auge-l": [[t(0), { ...t(-3, -2), offset: 0.25 }, { ...t(-3, -2), offset: 0.75 }, t(0)]],
    "auge-r": [[t(0), { ...t(-3, -2), offset: 0.25 }, { ...t(-3, -2), offset: 0.75 }, t(0)]],
  } },
  "zeigen-rechts": { dauer: 1800, mimik: "hilfe", teile: {
    "arm-r": [[r(0), { ...r(-78), offset: 0.2 }, { ...r(-74), offset: 0.5 }, { ...r(-78), offset: 0.8 }, r(0)]],
    kopf: [[r(0), { ...r(5), offset: 0.2 }, { ...r(5), offset: 0.8 }, r(0)]],
    "auge-l": [[t(0), { ...t(3), offset: 0.2 }, { ...t(3), offset: 0.8 }, t(0)]],
    "auge-r": [[t(0), { ...t(3), offset: 0.2 }, { ...t(3), offset: 0.8 }, t(0)]],
  } },
  "zeigen-links": { dauer: 1800, mimik: "hilfe", teile: {
    "arm-l": [[r(0), { ...r(78), offset: 0.2 }, { ...r(74), offset: 0.5 }, { ...r(78), offset: 0.8 }, r(0)]],
    kopf: [[r(0), { ...r(-5), offset: 0.2 }, { ...r(-5), offset: 0.8 }, r(0)]],
    "auge-l": [[t(0), { ...t(-3), offset: 0.2 }, { ...t(-3), offset: 0.8 }, t(0)]],
    "auge-r": [[t(0), { ...t(-3), offset: 0.2 }, { ...t(-3), offset: 0.8 }, t(0)]],
  } },
  "zeigen-oben": { dauer: 1800, mimik: "hilfe", teile: {
    "arm-r": [[r(0), { ...r(-150), offset: 0.22 }, { ...r(-146), offset: 0.5 }, { ...r(-150), offset: 0.78 }, r(0)]],
    "auge-l": [[t(0), { ...t(1, -3), offset: 0.2 }, { ...t(1, -3), offset: 0.8 }, t(0)]],
    "auge-r": [[t(0), { ...t(1, -3), offset: 0.2 }, { ...t(1, -3), offset: 0.8 }, t(0)]],
  } },
  "zeigen-unten": { dauer: 1800, mimik: "hilfe", teile: {
    "arm-r": [[r(0), { ...r(-38), offset: 0.2 }, { ...r(-34), offset: 0.5 }, { ...r(-38), offset: 0.8 }, r(0)]],
    kopf: [[t(0), { ...t(0, 3, 4), offset: 0.2 }, { ...t(0, 3, 4), offset: 0.8 }, t(0)]],
    "auge-l": [[t(0), { ...t(2, 3), offset: 0.2 }, { ...t(2, 3), offset: 0.8 }, t(0)]],
    "auge-r": [[t(0), { ...t(2, 3), offset: 0.2 }, { ...t(2, 3), offset: 0.8 }, t(0)]],
  } },
  freuen: { dauer: 1100, mimik: "freude", teile: {
    zeki: [[ty(0), { ...ty(-12), offset: 0.3, easing: "ease-out" }, { ...ty(0), offset: 0.55, easing: "ease-in" }, { ...ty(-5), offset: 0.75 }, ty(0)]],
    "arm-l": [[r(0), { ...r(35), offset: 0.3 }, { ...r(10), offset: 0.7 }, r(0)]],
    "arm-r": [[r(0), { ...r(-35), offset: 0.3 }, { ...r(-10), offset: 0.7 }, r(0)]],
  } },
  zwinkern: { dauer: 700, mimik: "freude", lid: "r", teile: {
    kopf: [[r(0), { ...r(5), offset: 0.4 }, r(0)]],
  } },
  auftreten: { dauer: 2400, mimik: "neutral", teile: schritte(4, 150, 0) },
  abgehen: { dauer: 2400, mimik: "neutral", teile: schritte(4, 0, 170) },
};

// Laufen: Figur zieht von x0 nach x1, je Schritt wippt der Körper, Füße heben sich abwechselnd, Arme pendeln gegengleich.
function schritte(n, x0, x1) {
  const zk = [], fl = [], fr = [], al = [], ar = [], kp = [];
  for (let i = 0; i <= n * 2; i++) {
    const o = i / (n * 2), x = x0 + (x1 - x0) * o, oben = i % 2 === 1, links = Math.floor(i / 2) % 2 === 0;
    zk.push({ transform: `translate(${x}px, ${oben ? -5 : 0}px)`, offset: o });
    fl.push({ transform: oben && links ? "translateY(-7px) rotate(-8deg)" : "none", offset: o });
    fr.push({ transform: oben && !links ? "translateY(-7px) rotate(8deg)" : "none", offset: o });
    const s = i === 0 || i === n * 2 ? 0 : (links ? 12 : -12);
    al.push({ transform: `rotate(${s}deg)`, offset: o });
    ar.push({ transform: `rotate(${s}deg)`, offset: o });
    kp.push({ transform: `rotate(${i === n * 2 ? 0 : (oben ? 2 : -2) * (links ? 1 : -1)}deg)`, offset: o });
  }
  return { zeki: [zk, { easing: "linear" }], "fuss-l-bild": [fl], "fuss-r-bild": [fr], "arm-l": [al], "arm-r": [ar], kopf: [kp] };
}

// Ältere Namen aus Sätzen und Bildfolgen zeigen auf die Puppe.
export const ALIAS = { hand: "winken", thumb: "freuen", daumen: "freuen", grinsen: "freuen", laecheln: "freuen", celebrate: "freuen", pruefen: "nachdenken", turn: "nachdenken", preis: "zeigen-rechts", zeigen: "zeigen-rechts" };
export const zekiPuppeName = (b) => (BEWEGUNGEN[b] ? b : ALIAS[b] && BEWEGUNGEN[ALIAS[b]] ? ALIAS[b] : null);

// Spielt eine Bewegung. Gibt eine Abbruch-Funktion zurück (oder null, wenn es die Bewegung nicht gibt).
export function zekiPuppeSpielen(svg, bewegung, { fertig } = {}) {
  const name = zekiPuppeName(bewegung); if (!svg || !name || typeof svg.animate !== "function") return null;
  zekiPuppeVorbereiten(svg);
  const b = BEWEGUNGEN[name], laufend = [], vorher = svg.dataset.zekiZustand;
  if (b.mimik && vorher !== "warnung" && vorher !== "fehler") svg.dataset.zekiZustand = b.mimik;
  if (b.lid) svg.classList.add("zeki--zwinkern-" + b.lid);
  svg.classList.add("zeki--puppe");
  const zurueck = (b.vorne || []).map((id) => { const el = teil(svg, id), platz = el?.nextSibling; if (el) el.parentNode.appendChild(el); return () => el?.parentNode.insertBefore(el, platz); });
  for (const [id, [frames, opt]] of Object.entries(b.teile)) {
    const el = teil(svg, id); if (!el) continue;
    laufend.push(el.animate(frames, { duration: b.dauer, easing: weich, fill: "none", ...(opt || {}) }));
  }
  let aus = false;
  const ende = () => {
    if (aus) return; aus = true;
    laufend.forEach((a) => { try { a.cancel(); } catch { /* schon weg */ } });
    zurueck.forEach((f) => f());
    svg.dataset.zekiZustand = vorher || "neutral";
    svg.classList.remove("zeki--puppe", "zeki--zwinkern-l", "zeki--zwinkern-r");
  };
  Promise.all(laufend.map((a) => a.finished)).then(() => { ende(); fertig?.(); }).catch(() => {});
  return ende;
}
