// Laden-Profil (Etappe 6, Punkt 9): welche Bereiche ein Laden zuerst sieht.
// Profil = Laden-Art (feste Ringe) + was die Speisekarte zeigt + was der Wirt selbst hoch- oder weggeklappt hat.
import { KATALOG, VORLAGEN } from "./data/katalog.js";
import { PROFILE, GRUNDBEDARF, ART_JE_KUECHE, ART_JE_FORMAT, KARTE_SCHWELLE } from "./data/register.js";
import { BEREICH_JE_FAMILIE } from "./rezept_baukasten.js";
import { normalisieren, suchRang } from "./data/suchnamen.js";

const ALLE_BEREICHE = Object.keys(KATALOG);

// Laden-Art des Ladens: Schnellstart setzt sie direkt, die genaue Einrichtung über Format und Küche.
export function ladenArtVon(stand) {
  if (stand?.ladenArt && PROFILE[stand.ladenArt]) return stand.ladenArt;
  const b = stand?.betrieb || {};
  if (ART_JE_FORMAT[b.format]) return ART_JE_FORMAT[b.format];
  for (const k of b.kuechen || []) if (ART_JE_KUECHE[k]) return ART_JE_KUECHE[k];
  return "anders";
}

// Bereiche der Gerichte auf der Karte mit ihrem Anteil (Getränke zählen nicht mit).
export function profilAusKarte(stand) {
  const gerichte = (stand?.gerichte || []).filter((g) => g.klasse !== "getraenk");
  const zahl = {};
  for (const g of gerichte) {
    const b = g.bereich || BEREICH_JE_FAMILIE[g.rezeptFamilie] || null;
    if (b && KATALOG[b]) zahl[b] = (zahl[b] || 0) + 1;
  }
  const n = gerichte.length;
  return Object.entries(zahl).map(([bereich, k]) => ({ bereich, anteil: n ? k / n : 0 }))
    .filter((x) => x.anteil >= KARTE_SCHWELLE).sort((a, b) => b.anteil - a.anteil).map((x) => x.bereich);
}

// Das wirksame Profil. quelle: "art" | "karte" | "wirt" (was zuletzt etwas geändert hat).
export function profilFuer(stand) {
  const art = ladenArtVon(stand);
  const basis = PROFILE[art];
  let kern = [...basis.kern], oft = [...basis.oft], quelle = "art";
  const ausKarte = profilAusKarte(stand);
  if (art === "anders") {
    if (ausKarte.length) { kern = ausKarte; quelle = "karte"; }
    else kern = ALLE_BEREICHE.filter((b) => !GRUNDBEDARF.includes(b)); // ohne Karte: alles wie bisher
  } else {
    for (const b of ausKarte) if (!kern.includes(b) && !oft.includes(b)) { oft.push(b); quelle = "karte"; }
  }
  const wirt = stand?.profilWirt || {};
  for (const b of wirt.hoch || []) if (KATALOG[b] && !kern.includes(b)) { kern.push(b); oft = oft.filter((x) => x !== b); quelle = "wirt"; }
  for (const b of wirt.weg || []) if (oft.includes(b)) { oft = oft.filter((x) => x !== b); quelle = "wirt"; }
  for (const b of GRUNDBEDARF) if (!kern.includes(b)) kern.push(b);
  oft = oft.filter((b) => !kern.includes(b));
  return { art, kern, oft, quelle };
}

// { kern, oft, weitere } – alle Katalog-Bereiche genau einmal.
export function bereicheSortiert(stand) {
  const p = profilFuer(stand);
  const weitere = ALLE_BEREICHE.filter((b) => !p.kern.includes(b) && !p.oft.includes(b));
  return { kern: p.kern.filter((b) => KATALOG[b]), oft: p.oft.filter((b) => KATALOG[b]), weitere };
}

export const imProfil = (stand, bereich) => { const p = profilFuer(stand); return p.kern.includes(bereich) || p.oft.includes(bereich); };

// Alle Vorlagen mit Bereich, nach Profil geordnet (Kern, Oft, Weitere).
export function vorlagenSortiert(stand) {
  const s = bereicheSortiert(stand);
  const mit = (liste) => liste.flatMap((b) => (VORLAGEN[b] || []).map((v) => ({ ...v, bereich: b })));
  return { kern: mit(s.kern), oft: mit(s.oft), weitere: mit(s.weitere) };
}

// Produkt → Bereiche, in denen es im Katalog steht (für die Zutatensuche „aus: Burger“).
export const PRODUKT_BEREICHE = (() => {
  const m = {};
  for (const b of ALLE_BEREICHE) for (const p of KATALOG[b].produkte) (m[p.n] ||= []).push(b);
  return m;
})();

// Zutatensuche: Treffer aus dem Profil zuerst; nur wenn dort nichts passt, Weitere mit Bereichsname.
export function zutatenSuchen(stand, q, { ohne = [], max = 8 } = {}) {
  q = normalisieren(q);
  if (!q) return [];
  const p = profilFuer(stand); const profil = new Set([...p.kern, ...p.oft]);
  // Deutscher Name oder türkischer/englischer Suchname (js/data/suchnamen.js); Treffer im deutschen Namen zuerst
  const treffer = Object.keys(PRODUKT_BEREICHE).filter((n) => suchRang(n, q) >= 0 && !ohne.includes(n))
    .sort((a, b) => suchRang(a, q) - suchRang(b, q));
  const drin = treffer.filter((n) => PRODUKT_BEREICHE[n].some((b) => profil.has(b)));
  if (drin.length) return drin.slice(0, max).map((n) => ({ name: n, aus: null }));
  return treffer.slice(0, max).map((n) => ({ name: n, aus: PRODUKT_BEREICHE[n][0] }));
}
