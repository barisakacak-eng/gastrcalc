// Etappe 2: Karte wählen, Rezepte prüfen, Einkaufspreise, Verkaufspreise, Ergebnis.
// Grundsatz wie überall: Vorlagen sind Schätzungen, der Betrieb korrigiert nur. Nichts blockiert.
import { sym } from "../symbole.js";
import { gerichtBild } from "./vergleich.js";
import { reinigungZeile } from "./reinigung_zeile.js";
import { t, einheitLabel } from "../i18n.js";
import { esc, parseZahl, fmtEuro, fmtZahl, uid, wertAnzeige, heute } from "../util.js";
import { KATALOG, WARENGRUPPEN, PRODUKT_INDEX, EINHEITEN } from "../data/katalog.js";
import { vorlagenSortiert, zutatenSuchen, ladenArtVon } from "../profil.js";
import { zwischenrezept } from "../data/zwischen.js";
import { rezeptBauen } from "../rezept_baukasten.js";
import { rezeptStempel, quelleVon, waageFragen, schnellwahl, familieAnpassen, geldSatz } from "../rezept_quelle.js";
import { selbstAnwenden, selbstGewaehlt } from "../selbst.js";
import { klasseFuerBereich, artikelAusGerichten, kalkulation, garverlustAnteil, preisJeBasis, steuersatzAusZutaten, mengeUmrechnen, gebindeKette, gebindePreise, preisMerken } from "../engine.js";

const KLASSEN = ["getraenk", "kleinigkeit", "haupt", "gross"];
const EINHEITEN_JE_BASIS = { g: ["g", "kg"], ml: ["ml", "l"], stk: ["stk"] };
const basisVon = (einheit) => EINHEITEN[einheit]?.basis || "stk";

let suche = "";            // Suchtext auf dem Karten-Bildschirm (flüchtig)
let offenesGericht = null; // id des Gerichts im Rezept-Detail (flüchtig)
let zutatSuche = "";       // Suchtext im Rezept-Detail
let eigenesText = "";      // Text im Feld „eigenes Gericht" (flüchtig, überlebt das Neuzeichnen)
let waage = null;          // Waage-Check (Punkt 7): { gid, fragen[], k, wert, meldungen[] }
let stempelInfo = false;   // Erklärung zum Stempel aufgeklappt
let weitereOffen = false;  // „Weitere Bereiche“ aufgeklappt (Punkt 9)
// Paket 2 (16.10.2026): Ladenwechsel, Einlesen, „Alles löschen“ – der flüchtige Zustand gehört zum alten Laden (zentrale Liste in app.js)
export function karteZuruecksetzen() { suche = ""; offenesGericht = null; zutatSuche = ""; eigenesText = ""; waage = null; stempelInfo = false; weitereOffen = false; zwischenOffen = new Set(); mehrArten = new Set(); }

const knopfWeiter = (text = t("allgemein.weiter"), extra = "") => `<button type="button" class="knopf ${extra}" data-a="weiter">${esc(text)}</button>`;

function gerichtAusVorlage(v) {
  const zutaten = v.zutaten.map(([name, menge, einheit]) => ({ name, menge, einheit }));
  return { id: uid(), name: v.name, vorlageName: v.name, bereich: v.bereich, klasse: klasseFuerBereich(v.bereich), zeit: v.zeit, vorlage: true,
    zutaten, preis: null, mengeTag: null, steuer: steuersatzAusZutaten(zutaten), rezeptFamilie: rezeptBauen(v.name)?.familie || null };
}

// ---------- Schritt: Karte ----------
export const karte = {
  id: "karte",
  view(stand) {
    // Laden-Profil (Punkt 9): erst „Für deinen Laden“, dann „Auch oft dabei“, „Weitere Bereiche“ eingeklappt. Die Suche findet alles.
    const sortiert = vorlagenSortiert(stand);
    const alle = [...sortiert.kern, ...sortiert.oft, ...sortiert.weitere];
    const gewaehlt = new Set(stand.gerichte.filter((g) => g.vorlage).map((g) => g.vorlageName || g.name));
    const gelistet = new Set(alle.map((v) => v.name));
    const q = suche.trim().toLowerCase();
    const eigene = stand.gerichte.filter((g) => !g.vorlage || !gelistet.has(g.vorlageName || g.name));
    const gruppen = (liste) => [...new Set(liste.map((v) => v.bereich))].map((b) => {
      const l = liste.filter((v) => v.bereich === b && (!q || v.name.toLowerCase().includes(q)));
      if (!l.length) return "";
      return `<div class="gruppe">${esc(t("bereiche." + b))}</div><div class="liste eng">${l.map((v) => `
          <button type="button" class="wahl ${gewaehlt.has(v.name) ? "an" : ""}" data-a="vorlage" data-name="${esc(v.name)}" data-bereich="${esc(b)}">
            <span class="haken" aria-hidden="true">${gewaehlt.has(v.name) ? "✓" : ""}</span><span>${esc(v.name)}</span></button>`).join("")}</div>`;
    }).join("");
    const art = ladenArtVon(stand);
    const kernHtml = gruppen(sortiert.kern), oftHtml = gruppen(sortiert.oft);
    const weitereZeigen = weitereOffen || !!q;
    const weitereHtml = weitereZeigen ? gruppen(sortiert.weitere) : "";
    const nWeitere = new Set(sortiert.weitere.map((v) => v.bereich)).size;
    return `
      <h1 class="frage">${esc(t("karte.frage"))}</h1>
      <p class="hinweis">${esc(t("karte.hinweis"))}</p>
      <input class="textfeld" data-f="suche" value="${esc(suche)}" placeholder="${esc(t("karte.suchen"))}" autocomplete="off">
      ${kernHtml ? `<div class="ring ring-kern"><h2 class="ring-titel">${esc(art === "anders" ? t("profil.kernAllgemein") : t("profil.kern", t("schnell.arten." + art)))}</h2>${kernHtml}</div>` : ""}
      ${oftHtml ? `<div class="ring ring-oft"><h2 class="ring-titel">${esc(t("profil.oft"))}</h2>${oftHtml}</div>` : ""}
      ${nWeitere && (!q || weitereHtml) ? `<div class="ring ring-weitere">${q ? `<h2 class="ring-titel">${esc(t("profil.weitere"))}</h2>` : `<button type="button" class="knopf zweit" data-a="weitere" aria-expanded="${weitereOffen}">${esc(weitereOffen ? t("profil.weitereZu") : t("profil.weitereAuf", nWeitere))}</button>`}${weitereHtml}</div>` : ""}
      <div class="gruppe">${esc(t("karte.eigene"))}</div>
      ${eigene.length ? `<div class="liste eng">${eigene.map((g) => `<button type="button" class="wahl an" data-a="eigenes-weg" data-id="${esc(g.id)}"><span class="haken">✓</span><span>${esc(g.name)}</span></button>`).join("")}</div>` : ""}
      <div class="neu"><input class="textfeld" data-f="eigenes" maxlength="60" value="${esc(eigenesText)}" placeholder="${esc(t("karte.eigenesPlatzhalter"))}" autocomplete="off" enterkeyhint="done"><button type="button" class="knopf weich schmal" data-a="eigenes-neu">${esc(t("allgemein.hinzufuegen"))}</button></div>`;
  },
  fuss(stand) {
    const n = stand.gerichte.length;
    return `<p class="hinweis mitte">${esc(t("karte.gewaehlt", n))}${n > 0 && n < 10 ? ` · ${esc(t("karte.wenige"))}` : ""}</p>` + (n ? knopfWeiter() : "");
  },
  eingabe(feld, wert, stand) { if (feld === "suche") { suche = wert; return true; } if (feld === "eigenes") eigenesText = wert; },
  aktion(name, el, stand) {
    if (name === "weitere") { weitereOffen = !weitereOffen; return true; }
    if (name === "vorlage") {
      const i = stand.gerichte.findIndex((g) => g.vorlage && (g.vorlageName || g.name) === el.dataset.name);
      if (i >= 0) { if (gerichtHatEingaben(stand.gerichte[i]) && !confirm(t("karte.wegFrage", stand.gerichte[i].name))) return false; stand.gerichte.splice(i, 1); }
      else { const so = vorlagenSortiert(stand); const v = [...so.kern, ...so.oft, ...so.weitere].find((x) => x.name === el.dataset.name); if (v) stand.gerichte.push(gerichtAusVorlage(v)); }
      return true;
    }
    if (name === "eigenes-neu") {
      const n = eigenesText.trim(); if (!n) return false;
      stand.gerichte.push({ id: uid(), name: n, bereich: null, klasse: "haupt", zeit: 5, vorlage: false, zutaten: [], preis: null, mengeTag: null, steuer: 0.07 });
      eigenesText = ""; return true;
    }
    if (name === "eigenes-weg") { const g = stand.gerichte.find((x) => x.id === el.dataset.id); if (!g) return false; if (gerichtHatEingaben(g) && !confirm(t("karte.wegFrage", g.name))) return false; stand.gerichte = stand.gerichte.filter((x) => x.id !== g.id); return true; }
  },
  beimVerlassen(stand) { suche = ""; eigenesText = ""; weitereOffen = false; stand.artikel = artikelAusGerichten(stand); },
};

// Hat der Betrieb an diesem Gericht schon etwas eingetragen? Dann vor dem Löschen fragen.
const gerichtHatEingaben = (g) => typeof g.preis === "number" || g.mengeTag > 0 || !g.vorlage;

// ---------- Schritt: Rezepte ----------
// ---------- Punkt 7: Stempel und Waage-Check ----------
const PKT = { schaetzung: "gelb", pilot: "blau", branche: "blau", "eigen-abgeleitet": "gruen", eigen: "gruen" };
function stempelHtml(st, { info = false } = {}) {
  if (!st?.stufe) return "";
  const text = st.stufe === "branche" ? t("stempel.branche", (st.quellen || []).length) : st.stufe === "eigen" && st.datum ? t("stempel.eigenAm", datumKurz(st.datum)) : t("stempel." + st.stufe);
  return `<button type="button" class="stempel stempel-${st.stufe}" data-a="stempel-info" aria-expanded="${info}">${esc(text)}</button>${info ? `<p class="hinweis stempel-erklaerung">${esc(t("stempel.erklaerung." + st.stufe))}</p>` : ""}`;
}
const datumKurz = (iso) => { const [, m, d] = String(iso).split("-"); return `${Number(d)}.${Number(m)}.`; };
const mengeText = (z, g) => `${quelleVon(z, g) === "schaetzung" ? "≈ " : ""}${fmtZahl(z.menge)} ${einheitLabel(z.einheit)}`;

function waageView(stand) {
  const g = stand.gerichte.find((x) => x.id === waage.gid); const f = waage.fragen[waage.k];
  if (!g || !f) return "";
  const chips = schnellwahl(f.menge, f.einheit);
  return `
    <p class="tipp">${esc(t("waage.schritt", waage.k + 1, waage.fragen.length))}</p>
    <h1 class="frage">${esc(t("waage.frage", f.name, g.name))}</h1>
    <p class="hinweis">${esc(t("waage.startwert", `${fmtZahl(f.menge)} ${einheitLabel(f.einheit)}`))}</p>
    <div class="stepper gross"><button type="button" data-a="waage-d" data-d="-1" aria-label="−">−</button><div class="wert">${esc(fmtZahl(waage.wert))} ${esc(einheitLabel(f.einheit))}</div><button type="button" data-a="waage-d" data-d="1" aria-label="+">+</button></div>
    <div class="chips">${chips.map((c) => `<button type="button" class="chip ${c === waage.wert ? "an" : ""}" data-a="waage-chip" data-wert="${c}">${esc(fmtZahl(c))} ${esc(einheitLabel(f.einheit))}</button>`).join("")}</div>
    ${waage.meldungen.map((m) => `<p class="tipp gruen">${esc(m)}</p>`).join("")}`;
}

function rezeptDetail(stand, g) {
  const q = zutatSuche.trim().toLowerCase();
  // Laden-Profil (Punkt 9): Zutaten aus dem eigenen Bereich zuerst; nur wenn dort nichts passt, andere mit „aus: …“
  const treffer = zutatenSuchen(stand, q, { ohne: g.zutaten.map((z) => z.name) }).map((x) => ({ ...PRODUKT_INDEX[x.name], aus: x.aus }));
  return `
    <button type="button" class="leise" data-a="rezept-zu">‹ ${esc(t("rezepte.alle"))}</button>
    <input class="textfeld gross" data-f="gericht-name" value="${esc(g.name)}" autocomplete="off">
    <div class="stempelzeile">${stempelHtml(rezeptStempel(g), { info: stempelInfo })}</div>
    ${waage && waage.fertig && waage.gid === g.id ? waage.meldungen.map((m) => `<p class="tipp gruen">${esc(m)}</p>`).join("") : ""}
    ${waageFragen(stand, g).length ? `<button type="button" class="knopf glut" data-a="waage-start">${sym("scale")} ${esc(t("waage.start"))}</button>` : ""}
    <div class="feldzeile"><label>${esc(t("rezepte.klasse"))}</label>
      <div class="chips">${KLASSEN.map((k) => `<button type="button" class="chip ${g.klasse === k ? "an" : ""}" data-a="klasse" data-wert="${k}">${esc(t("rezepte.klassen." + k))}</button>`).join("")}</div>
      <span class="marke">${esc(t("rezepte.klasseHinweis"))}</span></div>
    <div class="feldzeile"><label>${esc(t("rezepte.zeit"))}</label>
      <div class="stepper"><button type="button" data-a="zeit" data-d="-1">−</button><div class="wert">${esc(t("rezepte.minuten", g.zeit))}</div><button type="button" data-a="zeit" data-d="1">+</button></div></div>
    <div class="feldzeile"><label>${esc(t("rezepte.zutaten"))}</label><span class="marke">${esc(t("rezepte.zutatenHinweis"))}</span></div>
    <div class="liste">
      ${g.zutaten.map((z, i) => {
        const basis = basisVon(z.einheit); const gruppe = PRODUKT_INDEX[z.name]?.g;
        const offen = !(Number(z.menge) > 0);
        const q = quelleVon(z, g);
        return `<div class="zeile ${offen ? "offen" : "an"} quelle-${q}"><div class="oben"><div class="name"><span class="pkt ${PKT[q]}" aria-hidden="true"></span> ${esc(z.name)}${gruppe === "verpackung" ? `<small>${esc(t("rezepte.verpackung"))}</small>` : `<small>${esc(t("stempel.kurz." + q))}${offen ? "" : " · " + esc(mengeText(z, g))}</small>`}</div>
          <button type="button" class="leise" data-a="zutat-weg" data-i="${i}">${esc(t("allgemein.loeschen"))}</button></div>
          <div class="betrag"><input inputmode="decimal" data-f="zutat:${i}" value="${esc(wertAnzeige(z.menge))}" aria-label="${esc(z.name)}">
            <div class="periode">${EINHEITEN_JE_BASIS[basis].map((e) => `<button type="button" class="${z.einheit === e ? "an" : ""}" data-a="einheit" data-i="${i}" data-wert="${e}">${esc(einheitLabel(e))}</button>`).join("")}</div></div></div>`;
      }).join("")}
    </div>
    <input class="textfeld" data-f="zutat-suche" value="${esc(zutatSuche)}" placeholder="${esc(t("rezepte.zutatSuchen"))}" autocomplete="off">
    ${treffer.length ? `<div class="liste eng">${treffer.map((p) => `<button type="button" class="wahl" data-a="zutat-neu" data-name="${esc(p.n)}"><span class="haken"></span><span>${esc(p.n)} <small>${esc(p.aus ? t("profil.aus", t("bereiche." + p.aus)) : p.g ? t("warengruppen." + p.g) : "")}</small></span></button>`).join("")}</div>` : ""}
    ${q && !treffer.length ? `<button type="button" class="knopf weich" data-a="zutat-frei" data-name="${esc(zutatSuche.trim())}">${esc(t("rezepte.zutatFrei", zutatSuche.trim()))}</button>` : ""}
    <button type="button" class="leise" data-a="gericht-weg">${esc(t("rezepte.gerichtWeg"))}</button>`;
}

export const rezepte = {
  id: "rezepte",
  view(stand) {
    const g = offenesGericht ? stand.gerichte.find((x) => x.id === offenesGericht) : null;
    if (waage && !waage.fertig && g) return waageView(stand);
    if (g) return rezeptDetail(stand, g);
    return `
      <h1 class="frage">${esc(t("rezepte.frage"))}</h1>
      <p class="hinweis">${esc(t("rezepte.hinweis"))}</p>
      <div class="liste">
        ${stand.gerichte.map((x) => `<button type="button" class="zeileknopf" data-a="rezept-auf" data-id="${esc(x.id)}">${gerichtBild(x).replace('class="gerichtbild', 'class="gerichtbild mini')}
          <span><b>${esc(x.name)}</b><small>${esc(t("rezepte.zusammenfassung", x.zutaten.length, x.zeit))}${(() => { const st = rezeptStempel(x).stufe; return st ? ` · ${esc(t("stempel." + st))}` : ""; })()}${x.zutaten.length === 0 ? ` · ${esc(t("rezepte.leer"))}` : ""}</small></span><span class="pfeil">›</span></button>`).join("")}
      </div>`;
  },
  fuss() {
    if (waage && !waage.fertig) return `<button type="button" class="knopf" data-a="waage-ok">${esc(t("waage.ok"))}</button><button type="button" class="knopf zweit" data-a="waage-weiss-nicht">${esc(t("waage.weissNicht"))}</button>`;
    return offenesGericht ? `<button type="button" class="knopf" data-a="rezept-zu">${esc(t("allgemein.fertig"))}</button>` : knopfWeiter();
  },
  eingabe(feld, wert, stand) {
    const g = stand.gerichte.find((x) => x.id === offenesGericht); if (!g) return;
    if (feld === "gericht-name") g.name = wert;
    else if (feld === "zutat-suche") { zutatSuche = wert; return true; }
    else if (feld.startsWith("zutat:")) { const z = g.zutaten[Number(feld.slice(6))]; if (z) { const n = parseZahl(wert); if (n !== z.menge) { z.menge = n; z.quelle = "eigen"; z.quelleInfo = { datum: heute() }; } if (g.rezeptQuelle === "baukasten") g.rezeptQuelle = "eigen"; } }
  },
  aktion(name, el, stand) {
    if (name === "rezept-auf") { offenesGericht = el.dataset.id; zutatSuche = ""; waage = null; stempelInfo = false; return true; }
    if (name === "rezept-zu") { offenesGericht = null; zutatSuche = ""; waage = null; stempelInfo = false; stand.artikel = artikelAusGerichten(stand); return true; }
    const g = stand.gerichte.find((x) => x.id === offenesGericht); if (!g) return false;
    if (name === "stempel-info") { stempelInfo = !stempelInfo; return true; }
    if (name === "waage-start") { const fragen = waageFragen(stand, g); if (!fragen.length) return false; waage = { gid: g.id, fragen, k: 0, wert: fragen[0].menge, meldungen: [], fertig: false }; return true; }
    if (waage && !waage.fertig) {
      const f = waage.fragen[waage.k];
      const schritt = f.einheit === "stk" ? 1 : f.menge >= 150 ? 5 : f.menge >= 50 ? 5 : 1;
      if (name === "waage-d") { waage.wert = Math.max(schritt, Math.round((waage.wert + Number(el.dataset.d) * schritt) * 10) / 10); return true; }
      if (name === "waage-chip") { waage.wert = Number(el.dataset.wert); return true; }
      if (name === "waage-ok" || name === "waage-weiss-nicht") {
        if (name === "waage-ok") {
          const geld = geldSatz(stand, f.name, f.menge, waage.wert, f.einheit);
          const r = familieAnpassen(stand, { gerichtId: g.id, zutat: f.name, wert: waage.wert, datum: heute() });
          waage.meldungen.push(t("waage.gelernt", f.name, r.geaendert.length + 1));
          if (geld !== null && Math.abs(geld) >= 0.01) waage.meldungen.push(t(geld > 0 ? "waage.geldMehr" : "waage.geldWeniger", fmtEuro(Math.abs(geld), { dezimal: 2 }), g.name));
        }
        waage.k += 1;
        if (waage.k >= waage.fragen.length) { waage.fertig = true; stand.artikel = artikelAusGerichten(stand); }
        else waage.wert = waage.fragen[waage.k].menge;
        return true;
      }
    }
    if (name === "klasse") { g.klasse = el.dataset.wert; return true; }
    if (name === "zeit") { const d = Number(el.dataset.d); const z = Number(g.zeit) || 0; const schritt = (d > 0 ? z >= 5 : z > 5) ? 1 : 0.5; g.zeit = Math.max(0.5, Math.round((z + d * schritt) * 2) / 2); return true; }
    if (["zutat-weg", "zutat-neu", "zutat-frei", "einheit"].includes(name) && g.rezeptQuelle === "baukasten") g.rezeptQuelle = "eigen"; // vom Wirt angepasst
    if (name === "zutat-weg") { g.zutaten.splice(Number(el.dataset.i), 1); if (!g.zutaten.length) g.rezeptBewusstLeer = true; return true; }
    if (name === "einheit") { const z = g.zutaten[Number(el.dataset.i)]; if (z && z.einheit !== el.dataset.wert) { z.menge = mengeUmrechnen(z.menge, z.einheit, el.dataset.wert); z.einheit = el.dataset.wert; } return true; }
    if (name === "zutat-neu") { const p = PRODUKT_INDEX[el.dataset.name]; if (p) g.zutaten.push({ name: p.n, menge: null, einheit: p.e === "kg" ? "g" : p.e === "l" ? "ml" : p.e }); zutatSuche = ""; return true; }
    if (name === "zutat-frei") { g.zutaten.push({ name: el.dataset.name, menge: null, einheit: "stk" }); zutatSuche = ""; return true; }
    if (name === "gericht-weg") { if (!confirm(t("karte.wegFrage", g.name))) return false; stand.gerichte = stand.gerichte.filter((x) => x.id !== g.id); offenesGericht = null; return true; }
  },
  beimVerlassen(stand) { offenesGericht = null; waage = null; stand.artikel = artikelAusGerichten(stand); },
  // Zurück-Geste im Detail: nur das Detail schließen, nicht den Schritt verlassen
  zurueck(stand) { if (waage && !waage.fertig) { waage = null; return true; } if (!offenesGericht) return false; offenesGericht = null; zutatSuche = ""; stand.artikel = artikelAusGerichten(stand); return true; },
};

// ---------- Schritt: Einkaufspreise mit Gebinde (Etappe 5, Variante C: was kaufst du, was ist drin, was kostet es) ----------
const GEBINDE_WAHL = ["karton", "kiste", "beutel", "packung", "kanister", "eimer", "sack", "flasche", "dose", "lose"];
const GEBINDE_KURZ = ["karton", "kiste", "beutel", "packung", "lose"]; // die fünf häufigsten; der Rest hinter „mehr"
let zwischenOffen = new Set(); // Artikel, bei denen die Zwischengröße eingeblendet ist (flüchtig)
let mehrArten = new Set();     // Artikel, bei denen alle Gebindearten gezeigt werden (flüchtig)
const zahlKurz = (n) => new Intl.NumberFormat("de-DE", { maximumFractionDigits: 2 }).format(n);

export function gebindeSatz(a) {
  const k = gebindeKette(a); const art = t("gebinde.arten." + (k[0].art || "packung"));
  const einheit = einheitLabel(k[0].einheit);
  if (!k[0].inhalt) return art;
  return k[1] ? t("gebinde.satz", art, k[1].anzahl, t("gebinde.arten." + k[1].art), zahlKurz(k[1].inhalt), einheit) : t("gebinde.satz", art, null, null, zahlKurz(k[0].inhalt), einheit);
}

// Selbst gemachtes Teil (Punkt 2): kein Einkaufspreis, sondern Rezept und errechneter Preis. Wechsel auf „kaufen wir fertig" mit einem Tipp.
function selbstZeile(a) {
  const r = a.rezept; const ok = preisJeBasis(a) !== null; const basis = basisVon(r.ausbeute.einheit);
  const jeBasis = ok ? (basis === "stk" ? preisJeBasis(a) : preisJeBasis(a) * 1000) : null;
  const einheitBasis = basis === "g" ? "kg" : basis === "ml" ? "l" : t("allgemein.stueck");
  const fehlt = (a.zwischenFehlt || []).filter((x) => x !== "rezept");
  return `<div class="zeile selbst ${ok ? "an" : "offen"}">
    <div class="oben"><div class="name">${esc(a.name)}<small>${esc(t("selbst.gemacht"))}${r.quelle === "baukasten" ? " · " + esc(t("rezepte.startwerte")) : ""}</small></div><span class="marke ${ok ? "" : "offen"}">${esc(ok ? t("selbst.errechnet") : t("allgemein.offen"))}</span></div>
    <p class="hinweis">${esc(t("selbst.ansatz", r.zutaten.map((z) => `${fmtZahl(z.menge)} ${einheitLabel(z.einheit)} ${z.name}`).join(", "), `${fmtZahl(r.ausbeute.menge)} ${einheitLabel(r.ausbeute.einheit)}`, r.arbeitMin))}</p>
    ${ok ? `<div class="ergebnis">${esc(t("gebinde.jeEinheit", fmtEuro(jeBasis, { dezimal: jeBasis < 1 ? 3 : 2 }), einheitBasis))}</div>` : fehlt.length ? `<p class="tipp">${esc(t("selbst.fehlt", fehlt.join(", ")))}</p>` : ""}
    <button type="button" class="leise" data-a="selbst-aus" data-name="${esc(a.name)}">${esc(t("selbst.dochKaufen"))}</button></div>`;
}

function artikelZeile(a) {
  if (a.herkunft === "selbst" && a.rezept) return selbstZeile(a);
  const ok = preisJeBasis(a) !== null; const basis = basisVon(a.einheit); const gv = a.garverlust ? garverlustAnteil(a) : null;
  const g = a.gebinde || { art: "packung", zwischen: null }; const artName = t("gebinde.arten." + g.art);
  const p = gebindePreise(a); const einheitBasis = basis === "g" ? "kg" : basis === "ml" ? "l" : t("allgemein.stueck");
  const jeBasis = p.jeEinheit === null ? null : basis === "stk" ? p.jeEinheit : preisJeBasis(a) * 1000;
  const zOffen = zwischenOffen.has(a.name) || !!g.zwischen;
  return `<div class="zeile ${ok ? "an" : "offen"}">
    <div class="oben"><div class="name">${esc(a.name)}<small>${esc(ok ? gebindeSatz(a) : t("allgemein.offen"))}</small></div><span class="marke ${ok ? "" : "offen"}">${esc(ok ? t("allgemein.bekannt") : t("allgemein.offen"))}</span></div>
    ${zwischenrezept(a.name) ? `<button type="button" class="leise" data-a="selbst-an" data-name="${esc(a.name)}">${esc(t("selbst.machenSelbst"))}</button>` : ""}
    <div class="chips">${(mehrArten.has(a.name) || !GEBINDE_KURZ.includes(g.art) ? GEBINDE_WAHL : GEBINDE_KURZ).map((x) => `<button type="button" class="chip klein ${g.art === x ? "an" : ""}" data-a="gebinde-art" data-name="${esc(a.name)}" data-wert="${x}">${esc(t("gebinde.arten." + x))}</button>`).join("")}${mehrArten.has(a.name) || !GEBINDE_KURZ.includes(g.art) ? "" : `<button type="button" class="chip klein" data-a="gebinde-mehr" data-name="${esc(a.name)}">…</button>`}</div>
    <div class="feldzeile"><label>${esc(t("gebinde.inhalt", artName))}</label>
      <div class="packung">
        <div class="periode">${EINHEITEN_JE_BASIS[basis].map((e) => `<button type="button" class="${a.packung?.einheit === e ? "an" : ""}" data-a="packung-einheit" data-name="${esc(a.name)}" data-wert="${e}">${esc(einheitLabel(e))}</button>`).join("")}</div>
        <input inputmode="decimal" data-f="packung:${esc(a.name)}" value="${esc(wertAnzeige(a.packung?.menge))}" placeholder="${esc(t("preise.menge"))}" aria-label="${esc(t("preise.menge"))}">
      </div></div>
    <div class="feldzeile"><label>${esc(t("gebinde.preis", artName))}</label>
      <div class="packung">
        <input inputmode="decimal" data-f="preis:${esc(a.name)}" value="${esc(wertAnzeige(a.preis))}" placeholder="${esc(t("preise.preis"))}" aria-label="${esc(t("preise.preis"))}"><span class="einheit">€</span>
        <div class="seg klein">${["netto", "brutto"].map((b) => `<button type="button" class="${(a.preisBasis || "netto") === b ? "an" : ""}" data-a="preis-basis" data-name="${esc(a.name)}" data-wert="${b}">${esc(t("gebinde." + b))}</button>`).join("")}</div>
      </div></div>
    ${jeBasis !== null ? `<div class="ergebnis">${esc(t("gebinde.jeEinheit", fmtEuro(jeBasis, { dezimal: jeBasis < 0.1 ? 4 : jeBasis < 1 ? 3 : 2 }), einheitBasis))}${p.zwischen !== null && g.zwischen ? ` · ${esc(t("gebinde.jeZwischen", fmtEuro(p.zwischen, { dezimal: 2 }), t("gebinde.arten." + g.zwischen.art)))}` : ""}</div>` : ""}
    ${zOffen ? `<div class="feldzeile"><label>${esc(t("gebinde.zwischenAnzahl", artName, t("gebinde.arten." + (g.zwischen?.art || "beutel"))))}</label>
      <div class="packung"><input inputmode="decimal" data-f="zwischen:${esc(a.name)}" value="${esc(wertAnzeige(g.zwischen?.anzahl ?? null))}" placeholder="4" aria-label="${esc(t("gebinde.zwischen"))}"><span class="einheit">${esc(t("gebinde.arten." + (g.zwischen?.art || "beutel")))}</span>
      <button type="button" class="leise" data-a="zwischen-weg" data-name="${esc(a.name)}">${esc(t("gebinde.zwischenWeg"))}</button></div></div>`
      : `<button type="button" class="leise" data-a="zwischen-auf" data-name="${esc(a.name)}">${esc(t("gebinde.zwischen"))}</button>`}
    ${gv ? `<div class="unterzeile"><span class="marke ${gv.status === "geschaetzt" ? "geschaetzt" : ""}">${esc(t("preise.garverlust", fmtZahl(gv.wert * 100, 0), t(gv.status === "gemessen" ? "preise.gemessen" : "allgemein.schaetzung")))}</span>
      <button type="button" class="leise" data-a="messen" data-name="${esc(a.name)}">${esc(t("preise.messen"))}</button></div>
      ${a.garverlust.messen ? `<div class="packung"><input inputmode="decimal" data-f="roh:${esc(a.name)}" value="${esc(wertAnzeige(a.garverlust.roh))}" placeholder="${esc(t("preise.roh"))}"><span class="einheit">g</span>
        <span class="einheit">→</span><input inputmode="decimal" data-f="gar:${esc(a.name)}" value="${esc(wertAnzeige(a.garverlust.gar))}" placeholder="${esc(t("preise.gar"))}"><span class="einheit">g</span></div>` : ""}` : ""}
  </div>`;
}

export const preise = {
  id: "preise",
  view(stand) {
    stand.artikel = artikelAusGerichten(stand);
    const artikel = stand.artikel.filter((a) => a.benutzt !== false);
    const gruppen = [...new Set(artikel.map((a) => a.gruppe))];
    const fertig = artikel.filter((a) => preisJeBasis(a) !== null).length;
    return `
      <h1 class="frage">${esc(t("preise.frage"))}</h1>
      <p class="hinweis">${esc(t("preise.hinweis"))} ${esc(t("gebinde.basisHinweis"))}</p>
      <p class="tipp">${esc(t("preise.stand", fertig, artikel.length))}</p>
      ${gruppen.map((gr) => `<div class="gruppe">${esc(t("warengruppen." + gr))}</div><div class="liste">${artikel.filter((a) => a.gruppe === gr).map(artikelZeile).join("")}</div>`).join("")}
      <p class="hinweis">${esc(t("gebinde.lieferungSpaeter"))}</p>`;
  },
  fuss() { return knopfWeiter(); },
  eingabe(feld, wert, stand) {
    const [art, ...rest] = feld.split(":"); const name = rest.join(":");
    const a = stand.artikel.find((x) => x.name === name); if (!a) return;
    if (art === "packung") { a.packung ??= { menge: null, einheit: a.einheit }; a.packung.menge = parseZahl(wert); }
    if (art === "preis") { const n = parseZahl(wert); if (n !== a.preis) { preisMerken(a, heute()); a.preis = n; if (n !== null) a.preisDatum = heute(); } }
    if (art === "zwischen") { a.gebinde ??= { art: "packung", zwischen: null }; const n = parseZahl(wert); a.gebinde.zwischen = n > 0 ? { art: a.gebinde.zwischen?.art || "beutel", anzahl: Math.round(n) } : null; }
    if (art === "roh") { a.garverlust ??= {}; a.garverlust.roh = parseZahl(wert); }
    if (art === "gar") { a.garverlust ??= {}; a.garverlust.gar = parseZahl(wert); }
    a.status = preisJeBasis(a) !== null ? "bekannt" : "offen";
  },
  aktion(name, el, stand) {
    const a = stand.artikel.find((x) => x.name === el.dataset.name); if (!a) return false;
    if (name === "selbst-an" || name === "selbst-aus") {
      const kachel = zwischenrezept(a.name)?.kachel; if (!kachel) return false;
      const an = new Set(selbstGewaehlt(stand)); if (name === "selbst-an") an.add(kachel); else an.delete(kachel);
      selbstAnwenden(stand, [...an]); stand.artikel = artikelAusGerichten(stand); return true;
    }
    if (name === "packung-einheit") { a.packung ??= { menge: null, einheit: a.einheit }; if (a.packung.einheit !== el.dataset.wert) { a.packung.menge = mengeUmrechnen(a.packung.menge, a.packung.einheit, el.dataset.wert); a.packung.einheit = el.dataset.wert; } return true; }
    if (name === "gebinde-art") { a.gebinde ??= { art: "packung", zwischen: null }; a.gebinde.art = el.dataset.wert; if (el.dataset.wert === "lose") a.gebinde.zwischen = null; return true; }
    if (name === "preis-basis") { a.preisBasis = el.dataset.wert === "brutto" ? "brutto" : "netto"; return true; }
    if (name === "zwischen-auf") { zwischenOffen.add(a.name); return true; }
    if (name === "gebinde-mehr") { mehrArten.add(a.name); return true; }
    if (name === "zwischen-weg") { zwischenOffen.delete(a.name); if (a.gebinde) a.gebinde.zwischen = null; return true; }
    if (name === "messen") { a.garverlust ??= {}; a.garverlust.messen = !a.garverlust.messen; return true; }
  },
  beimVerlassen() { zwischenOffen = new Set(); mehrArten = new Set(); },
};

// ---------- Schritt: Verkaufspreise und Mengen ----------
export const verkauf = {
  id: "verkauf",
  view(stand) {
    const v = stand.verkauf;
    return `
      <h1 class="frage">${esc(t("verkauf.frage"))}</h1>
      <p class="hinweis">${esc(t("verkauf.hinweis"))}</p>
      <div class="liste">
        ${stand.gerichte.map((g) => `<div class="zeile ${typeof g.preis === "number" ? "an" : ""}">
          <div class="oben"><div class="name">${esc(g.name)}${g.preis === 0 ? `<small class="marke offen">${esc(t("verkauf.preisNull"))}</small>` : ""}${stand.gerichte.filter((x) => x.name.trim().toLowerCase() === g.name.trim().toLowerCase()).length > 1 ? `<small class="marke offen">${esc(t("verkauf.doppelt"))}</small>` : ""}</div>
            <button type="button" class="chip klein ${g.mengeTag !== null && g.mengeTag !== undefined ? "an" : ""}" data-a="bestseller" data-id="${esc(g.id)}">${esc(t("verkauf.bestseller"))}</button></div>
          <div class="betrag"><input inputmode="decimal" data-f="preis:${esc(g.id)}" value="${esc(wertAnzeige(g.preis))}" placeholder="${esc(t("verkauf.preisPlatzhalter"))}" aria-label="${esc(g.name)}"><span class="einheit">€</span>
            ${g.mengeTag !== null && g.mengeTag !== undefined ? `<span class="einheit">·</span><input inputmode="decimal" data-f="menge:${esc(g.id)}" value="${esc(wertAnzeige(g.mengeTag))}" placeholder="${esc(t("verkauf.amTag"))}" aria-label="${esc(t("verkauf.amTag"))}"><span class="einheit">${esc(t("verkauf.proTag"))}</span>` : ""}</div>
        </div>`).join("")}
      </div>
      <div class="feldzeile"><label>${esc(t("verkauf.bestellungen"))}</label><p class="hinweis">${esc(t("verkauf.bestellungenHinweis"))}</p>
        <div class="zahlfeld klein"><input inputmode="decimal" data-f="bestellungenTag" value="${esc(wertAnzeige(v.bestellungenTag))}" placeholder=""><span class="einheit">${esc(t("verkauf.proTag"))}</span></div></div>
      <div class="feldzeile"><label>${esc(t("verkauf.ziel"))}</label><p class="hinweis">${esc(t("verkauf.zielHinweis"))}</p>
        <div class="zahlfeld klein ${v.zielgewinnStatus === "vorschlag" ? "geschaetzt" : ""}"><input inputmode="decimal" data-f="zielgewinn" value="${esc(wertAnzeige(v.zielgewinn))}" placeholder=""><span class="einheit">%</span></div>
        ${v.zielgewinnStatus === "vorschlag" ? `<span class="marke geschaetzt">${esc(t("verkauf.zielVorschlag"))}</span>` : ""}</div>`;
  },
  fuss() { return knopfWeiter(t("verkauf.zeigen"), "glut"); },
  eingabe(feld, wert, stand) {
    if (feld === "bestellungenTag") stand.verkauf.bestellungenTag = parseZahl(wert);
    else if (feld === "zielgewinn") { stand.verkauf.zielgewinn = parseZahl(wert); stand.verkauf.zielgewinnStatus = "eigen"; }
    else { const [art, id] = feld.split(":"); const g = stand.gerichte.find((x) => x.id === id); if (!g) return;
      if (art === "preis") g.preis = parseZahl(wert); if (art === "menge") g.mengeTag = parseZahl(wert); }
  },
  aktion(name, el, stand) {
    if (name === "bestseller") { const g = stand.gerichte.find((x) => x.id === el.dataset.id); if (!g) return false; if (g.mengeTag === null || g.mengeTag === undefined) g.mengeTag = 0; else if (!(g.mengeTag > 0) || confirm(t("karte.bestsellerWeg"))) g.mengeTag = null; return true; }
  },
};

// ---------- Schritt: Ergebnis ----------
// Kleines Gerichtbild in Listen (Prüfung 15.10.: Speisekarte ohne Bilder)
const minibild = (stand, id) => { const g = stand.gerichte.find((x) => x.id === id); return g ? gerichtBild(g).replace('class="gerichtbild', 'class="gerichtbild mini') : ""; };
export function ergebnisView(stand, { inApp = false } = {}) {
  const k = kalkulation(stand);
  const ampelWort = (a) => t("ergebnis.ampel." + a);
  return `
    ${inApp ? "" : `<h1 class="frage">${esc(t("ergebnis.titel"))}</h1><p class="hinweis">${esc(t("ergebnis.hinweis"))}</p>`}
    <div class="ampelzeile">${["gruen", "gelb", "rot", "grau"].map((a) => `<span class="ampel ${a}">${k.zaehl[a]} ${esc(ampelWort(a))}</span>`).join("")}</div>
    ${k.zielStufe !== "ok" ? `<p class="tipp">${esc(t(k.zielStufe === "sperre" ? "ergebnis.zielSperreAlle" : "ergebnis.zielWarnung"))}</p>` : ""}
    ${k.unvollstaendig && !inApp ? `<p class="tipp">${esc(t("ergebnis.unvollstaendig"))}</p>` : ""}
    <div class="liste">
      ${k.zeilen.map((z) => `<div class="zeile ${z.ampel === "grau" ? "offen" : ""}">
        <div class="oben">${inApp ? minibild(stand, z.id) : ""}<div class="name"><i class="punkt ${z.ampel}"></i>${esc(z.name)}<small>${esc(t("rezepte.klassen." + z.klasse))}${z.warenGeschaetzt ? ` · ${esc(t("ergebnis.garverlustGeschaetzt"))}` : ""}</small></div>
          <div class="preisheute">${z.preisBrutto !== null ? fmtEuro(z.preisBrutto, { dezimal: 2 }) : "–"}</div></div>
        ${z.sk !== null && z.preisBrutto === null ? `<span class="marke offen">${esc(t("ergebnis.preisFehlt"))}</span>` : ""}
        ${z.sk === null ? `<span class="marke offen">${esc(z.warenFehlt[0] === "rezept" ? t("rezepte.leer") : z.warenFehlt.length ? t("ergebnis.fehlt", z.warenFehlt.slice(0, 3).join(", ")) : t("ergebnis.preisFehlt"))}</span>` : `
          <div class="kennzahlen">
            <span>${esc(t("ergebnis.waren"))} <b>${fmtEuro(z.waren, { dezimal: 2 })}</b>${z.wareneinsatzAnteil !== null ? ` (${fmtZahl(z.wareneinsatzAnteil * 100, 0)} % ${esc(t("ergebnis.vomNetto"))})` : ""}</span>
            <span>${esc(t("ergebnis.kosten"))} <b>${fmtEuro(z.sk * (1 + z.mwst), { dezimal: 2 })}</b></span>
            ${z.zielBrutto !== null ? `<span>${esc(t("ergebnis.ziel"))} <b>${fmtEuro(z.zielBrutto, { dezimal: 2 })}</b>${z.zielAufschlag > 0.004 ? ` <small>${esc(t("ergebnis.aufgerundet", fmtZahl(z.zielAufschlag * 100, 0)))}</small>` : ""}</span>` : `<span class="marke offen">${esc(t("ergebnis.zielSperre"))}</span>`}
            ${z.portalBrutto !== null ? `<span>${esc(t("ergebnis.portal", z.portalName))} <b>${fmtEuro(z.portalBrutto, { dezimal: 2 })}</b>${z.portalBasisUnbekannt ? ` <small>${esc(t("ergebnis.portalVorsichtig"))}</small>` : ""}</span>` : z.portalStufe === "sperre" ? `<span class="marke offen">${esc(t("ergebnis.portalSperre", z.portalName))}</span>` : ""}
          </div>`}
      </div>`).join("")}
    </div>
    <div class="karte">
      <h2>${esc(t("start.kostenTitel"))}</h2>
      <div class="gross">${fmtEuro(k.last.gesamt)}${k.last.offen ? `<span class="abzeichen">${esc(t("zusammenfassung.unvollstaendig"))}</span>` : ""}</div>
      <div class="summenzeile"><span>${esc(t("zusammenfassung.fix"))}</span><span class="wert">${fmtEuro(k.last.fixJeOffen)}</span></div>
      <div class="summenzeile"><span>${esc(t("zusammenfassung.loehne"))}</span><span class="wert">${k.last.lohnOffen ? `<span class="marke offen">${esc(t("allgemein.offen"))}</span>` : fmtEuro(k.last.lohn)}</span></div>
      ${reinigungZeile(k.last.reinigung)}
    </div>
    <p class="hinweis">${esc(t("ergebnis.lesehilfe"))}</p>`;
}

export const ergebnis = {
  id: "ergebnis",
  view: (stand) => ergebnisView(stand),
  fuss: () => `<button type="button" class="knopf glut" data-a="fertig">${esc(t("zusammenfassung.zurStartseite"))}</button>`,
  aktion(name, el, stand, ctx) { if (name === "fertig") { ctx.fertig(); return true; } },
};
