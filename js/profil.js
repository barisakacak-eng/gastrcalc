// Laden-Profil (Etappe 6, Punkt 9): welche Bereiche ein Laden zuerst sieht.
// Profil = Laden-Art (feste Ringe) + was die Speisekarte zeigt + was der Wirt selbst hoch- oder weggeklappt hat.
import { KATALOG, VORLAGEN } from "./data/katalog.js";
import { PROFILE, GRUNDBEDARF, ART_JE_KUECHE, ART_JE_FORMAT, KARTE_SCHWELLE, VORLAGEN_ENGE } from "./data/register.js";
import { BEREICH_JE_FAMILIE } from "./rezept_baukasten.js";
import { normalisieren, suchRang } from "./data/suchnamen.js";

const ALLE_BEREICHE = Object.keys(KATALOG);

// Laden-Art des Ladens: Schnellstart setzt sie direkt, die genaue Einrichtung über Format und Küche.
export function ladenArtVon(stand) {
  if (Array.isArray(stand?.ladenArten) && stand.ladenArten.length && PROFILE[stand.ladenArten[0]]) return stand.ladenArten[0]; // Pilotfest P6 (1): erste = Hauptart
  if (stand?.ladenArt && PROFILE[stand.ladenArt]) return stand.ladenArt;
  const b = stand?.betrieb || {};
  if (ART_JE_FORMAT[b.format]) return ART_JE_FORMAT[b.format];
  for (const k of b.kuechen || []) if (ART_JE_KUECHE[k]) return ART_JE_KUECHE[k];
  return "anders";
}

// Pilotfest P6 (1), 30.10.2026: ein Laden kann mehrere Arten zugleich sein (Döner + Pizza). Erste Art = Hauptart (Bild, Format, Amt-Dokument),
// Profil, Vorlagen-Enge und Putzplan-Geräte sind die Vereinigung aller gewählten Arten. Alte Stände ohne ladenArten: genau die eine ladenArt.
export function ladenArtenVon(stand) {
  const l = Array.isArray(stand?.ladenArten) ? stand.ladenArten.filter((a) => PROFILE[a]) : [];
  if (l.length) return [...new Set(l)];
  const eine = ladenArtVon(stand); return eine ? [eine] : [];
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
  const arten = ladenArtenVon(stand).filter((a) => a !== "anders"); // „Etwas anderes“ neben einer echten Art bringt kein eigenes Profil
  const basis = PROFILE[art];
  let kern = [...basis.kern], oft = [...basis.oft], quelle = "art";
  for (const a of arten.slice(1)) { for (const b of PROFILE[a].kern) if (!kern.includes(b)) { kern.push(b); oft = oft.filter((x) => x !== b); } for (const b of PROFILE[a].oft) if (!kern.includes(b) && !oft.includes(b)) oft.push(b); }
  const ausKarte = profilAusKarte(stand);
  if (art === "anders" && !arten.length) {
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

// Enge je Bereich bei mehreren Arten: Vereinigung der Listen; hat eine Art für einen Bereich keine Enge, gilt dort keine.
export function vorlagenEngeFuer(stand) {
  const arten = ladenArtenVon(stand); if (arten.length <= 1) return VORLAGEN_ENGE[arten[0]] || {};
  const out = {}; const bereiche = new Set(arten.flatMap((a) => Object.keys(VORLAGEN_ENGE[a] || {})));
  for (const b of bereiche) { if (arten.some((a) => !(VORLAGEN_ENGE[a] || {})[b])) continue; out[b] = [...new Set(arten.flatMap((a) => VORLAGEN_ENGE[a][b]))]; }
  return out;
}

// Alle Vorlagen mit Bereich, nach Profil geordnet (Kern, Oft, Weitere).
// Engere Auswahl je Laden-Art (VORLAGEN_ENGE): Gerichte außerhalb der Liste rutschen aus Kern/Oft nach „Weitere“ (zugeklappt, per Suche auffindbar).
export function vorlagenSortiert(stand) {
  const s = bereicheSortiert(stand);
  const enge = vorlagenEngeFuer(stand);
  const mit = (liste) => liste.flatMap((b) => (VORLAGEN[b] || []).filter((v) => !enge[b] || enge[b].includes(v.name)).map((v) => ({ ...v, bereich: b })));
  const draussen = Object.keys(enge).flatMap((b) => (VORLAGEN[b] || []).filter((v) => !enge[b].includes(v.name)).map((v) => ({ ...v, bereich: b })));
  return { kern: mit(s.kern), oft: mit(s.oft), weitere: [...mit(s.weitere), ...draussen] };
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
