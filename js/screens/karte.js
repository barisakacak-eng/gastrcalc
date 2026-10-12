// Etappe 2: Karte wählen, Rezepte prüfen, Einkaufspreise, Verkaufspreise, Ergebnis.
// Grundsatz wie überall: Vorlagen sind Schätzungen, der Betrieb korrigiert nur. Nichts blockiert.
import { t, einheitLabel } from "../i18n.js";
import { esc, parseZahl, fmtEuro, fmtZahl, uid, wertAnzeige } from "../util.js";
import { KATALOG, WARENGRUPPEN, PRODUKT_INDEX, EINHEITEN, vorlagenFuer, bereicheFuer } from "../data/katalog.js";
import { klasseFuerBereich, artikelAusGerichten, kalkulation, garverlustAnteil, preisJeBasis, steuersatzAusZutaten, mengeUmrechnen, gebindeKette, gebindePreise } from "../engine.js";

const KLASSEN = ["getraenk", "kleinigkeit", "haupt", "gross"];
const EINHEITEN_JE_BASIS = { g: ["g", "kg"], ml: ["ml", "l"], stk: ["stk"] };
const basisVon = (einheit) => EINHEITEN[einheit]?.basis || "stk";

let suche = "";            // Suchtext auf dem Karten-Bildschirm (flüchtig)
let offenesGericht = null; // id des Gerichts im Rezept-Detail (flüchtig)
let zutatSuche = "";       // Suchtext im Rezept-Detail
let eigenesText = "";      // Text im Feld „eigenes Gericht" (flüchtig, überlebt das Neuzeichnen)

const knopfWeiter = (text = t("allgemein.weiter"), extra = "") => `<button type="button" class="knopf ${extra}" data-a="weiter">${esc(text)}</button>`;

function gerichtAusVorlage(v) {
  const zutaten = v.zutaten.map(([name, menge, einheit]) => ({ name, menge, einheit }));
  return { id: uid(), name: v.name, vorlageName: v.name, bereich: v.bereich, klasse: klasseFuerBereich(v.bereich), zeit: v.zeit, vorlage: true,
    zutaten, preis: null, mengeTag: null, steuer: steuersatzAusZutaten(zutaten) };
}

// ---------- Schritt: Karte ----------
export const karte = {
  id: "karte",
  view(stand) {
    const vorlagen = vorlagenFuer(stand.betrieb.format, stand.betrieb.kuechen);
    const gewaehlt = new Set(stand.gerichte.filter((g) => g.vorlage).map((g) => g.vorlageName || g.name));
    const gelistet = new Set(vorlagen.map((v) => v.name));
    const q = suche.trim().toLowerCase();
    const bereiche = bereicheFuer(stand.betrieb.format, stand.betrieb.kuechen).filter((b) => vorlagen.some((v) => v.bereich === b));
    const eigene = stand.gerichte.filter((g) => !g.vorlage || !gelistet.has(g.vorlageName || g.name));
    return `
      <h1 class="frage">${esc(t("karte.frage"))}</h1>
      <p class="hinweis">${esc(t("karte.hinweis"))}</p>
      <input class="textfeld" data-f="suche" value="${esc(suche)}" placeholder="${esc(t("karte.suchen"))}" autocomplete="off">
      ${bereiche.map((b) => {
        const liste = vorlagen.filter((v) => v.bereich === b && (!q || v.name.toLowerCase().includes(q)));
        if (!liste.length) return "";
        return `<div class="gruppe">${esc(t("bereiche." + b))}</div><div class="liste eng">${liste.map((v) => `
          <button type="button" class="wahl ${gewaehlt.has(v.name) ? "an" : ""}" data-a="vorlage" data-name="${esc(v.name)}" data-bereich="${esc(b)}">
            <span class="haken" aria-hidden="true">${gewaehlt.has(v.name) ? "✓" : ""}</span><span>${esc(v.name)}</span></button>`).join("")}</div>`;
      }).join("")}
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
    if (name === "vorlage") {
      const i = stand.gerichte.findIndex((g) => g.vorlage && (g.vorlageName || g.name) === el.dataset.name);
      if (i >= 0) { if (gerichtHatEingaben(stand.gerichte[i]) && !confirm(t("karte.wegFrage", stand.gerichte[i].name))) return false; stand.gerichte.splice(i, 1); }
      else { const v = vorlagenFuer(stand.betrieb.format, stand.betrieb.kuechen).find((x) => x.name === el.dataset.name); if (v) stand.gerichte.push(gerichtAusVorlage(v)); }
      return true;
    }
    if (name === "eigenes-neu") {
      const n = eigenesText.trim(); if (!n) return false;
      stand.gerichte.push({ id: uid(), name: n, bereich: null, klasse: "haupt", zeit: 5, vorlage: false, zutaten: [], preis: null, mengeTag: null, steuer: 0.07 });
      eigenesText = ""; return true;
    }
    if (name === "eigenes-weg") { const g = stand.gerichte.find((x) => x.id === el.dataset.id); if (!g) return false; if (gerichtHatEingaben(g) && !confirm(t("karte.wegFrage", g.name))) return false; stand.gerichte = stand.gerichte.filter((x) => x.id !== g.id); return true; }
  },
  beimVerlassen(stand) { suche = ""; eigenesText = ""; stand.artikel = artikelAusGerichten(stand); },
};

// Hat der Betrieb an diesem Gericht schon etwas eingetragen? Dann vor dem Löschen fragen.
const gerichtHatEingaben = (g) => typeof g.preis === "number" || g.mengeTag > 0 || !g.vorlage;

// ---------- Schritt: Rezepte ----------
function rezeptDetail(stand, g) {
  const q = zutatSuche.trim().toLowerCase();
  const treffer = q ? Object.values(PRODUKT_INDEX).filter((p) => p.n.toLowerCase().includes(q) && !g.zutaten.some((z) => z.name === p.n)).slice(0, 8) : [];
  return `
    <button type="button" class="leise" data-a="rezept-zu">‹ ${esc(t("rezepte.alle"))}</button>
    <input class="textfeld gross" data-f="gericht-name" value="${esc(g.name)}" autocomplete="off">
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
        return `<div class="zeile ${offen ? "offen" : "an"}"><div class="oben"><div class="name">${esc(z.name)}${gruppe === "verpackung" ? `<small>${esc(t("rezepte.verpackung"))}</small>` : ""}</div>
          <button type="button" class="leise" data-a="zutat-weg" data-i="${i}">${esc(t("allgemein.loeschen"))}</button></div>
          <div class="betrag"><input inputmode="decimal" data-f="zutat:${i}" value="${esc(wertAnzeige(z.menge))}" aria-label="${esc(z.name)}">
            <div class="periode">${EINHEITEN_JE_BASIS[basis].map((e) => `<button type="button" class="${z.einheit === e ? "an" : ""}" data-a="einheit" data-i="${i}" data-wert="${e}">${esc(einheitLabel(e))}</button>`).join("")}</div></div></div>`;
      }).join("")}
    </div>
    <input class="textfeld" data-f="zutat-suche" value="${esc(zutatSuche)}" placeholder="${esc(t("rezepte.zutatSuchen"))}" autocomplete="off">
    ${treffer.length ? `<div class="liste eng">${treffer.map((p) => `<button type="button" class="wahl" data-a="zutat-neu" data-name="${esc(p.n)}"><span class="haken"></span><span>${esc(p.n)} <small>${esc(p.g ? t("warengruppen." + p.g) : "")}</small></span></button>`).join("")}</div>` : ""}
    ${q && !treffer.length ? `<button type="button" class="knopf weich" data-a="zutat-frei" data-name="${esc(zutatSuche.trim())}">${esc(t("rezepte.zutatFrei", zutatSuche.trim()))}</button>` : ""}
    <button type="button" class="leise" data-a="gericht-weg">${esc(t("rezepte.gerichtWeg"))}</button>`;
}

export const rezepte = {
  id: "rezepte",
  view(stand) {
    const g = offenesGericht ? stand.gerichte.find((x) => x.id === offenesGericht) : null;
    if (g) return rezeptDetail(stand, g);
    return `
      <h1 class="frage">${esc(t("rezepte.frage"))}</h1>
      <p class="hinweis">${esc(t("rezepte.hinweis"))}</p>
      <div class="liste">
        ${stand.gerichte.map((x) => `<button type="button" class="zeileknopf" data-a="rezept-auf" data-id="${esc(x.id)}">
          <span><b>${esc(x.name)}</b><small>${esc(t("rezepte.zusammenfassung", x.zutaten.length, x.zeit))}${x.zutaten.length === 0 ? ` · ${esc(t("rezepte.leer"))}` : ""}</small></span><span class="pfeil">›</span></button>`).join("")}
      </div>`;
  },
  fuss() { return offenesGericht ? `<button type="button" class="knopf" data-a="rezept-zu">${esc(t("allgemein.fertig"))}</button>` : knopfWeiter(); },
  eingabe(feld, wert, stand) {
    const g = stand.gerichte.find((x) => x.id === offenesGericht); if (!g) return;
    if (feld === "gericht-name") g.name = wert;
    else if (feld === "zutat-suche") { zutatSuche = wert; return true; }
    else if (feld.startsWith("zutat:")) { const z = g.zutaten[Number(feld.slice(6))]; if (z) z.menge = parseZahl(wert); }
  },
  aktion(name, el, stand) {
    if (name === "rezept-auf") { offenesGericht = el.dataset.id; zutatSuche = ""; return true; }
    if (name === "rezept-zu") { offenesGericht = null; zutatSuche = ""; stand.artikel = artikelAusGerichten(stand); return true; }
    const g = stand.gerichte.find((x) => x.id === offenesGericht); if (!g) return false;
    if (name === "klasse") { g.klasse = el.dataset.wert; return true; }
    if (name === "zeit") { const d = Number(el.dataset.d); const z = Number(g.zeit) || 0; const schritt = (d > 0 ? z >= 5 : z > 5) ? 1 : 0.5; g.zeit = Math.max(0.5, Math.round((z + d * schritt) * 2) / 2); return true; }
    if (name === "zutat-weg") { g.zutaten.splice(Number(el.dataset.i), 1); return true; }
    if (name === "einheit") { const z = g.zutaten[Number(el.dataset.i)]; if (z && z.einheit !== el.dataset.wert) { z.menge = mengeUmrechnen(z.menge, z.einheit, el.dataset.wert); z.einheit = el.dataset.wert; } return true; }
    if (name === "zutat-neu") { const p = PRODUKT_INDEX[el.dataset.name]; if (p) g.zutaten.push({ name: p.n, menge: null, einheit: p.e === "kg" ? "g" : p.e === "l" ? "ml" : p.e }); zutatSuche = ""; return true; }
    if (name === "zutat-frei") { g.zutaten.push({ name: el.dataset.name, menge: null, einheit: "stk" }); zutatSuche = ""; return true; }
    if (name === "gericht-weg") { if (!confirm(t("karte.wegFrage", g.name))) return false; stand.gerichte = stand.gerichte.filter((x) => x.id !== g.id); offenesGericht = null; return true; }
  },
  beimVerlassen(stand) { offenesGericht = null; stand.artikel = artikelAusGerichten(stand); },
  // Zurück-Geste im Detail: nur das Detail schließen, nicht den Schritt verlassen
  zurueck(stand) { if (!offenesGericht) return false; offenesGericht = null; zutatSuche = ""; stand.artikel = artikelAusGerichten(stand); return true; },
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

function artikelZeile(a) {
  const ok = preisJeBasis(a) !== null; const basis = basisVon(a.einheit); const gv = a.garverlust ? garverlustAnteil(a) : null;
  const g = a.gebinde || { art: "packung", zwischen: null }; const artName = t("gebinde.arten." + g.art);
  const p = gebindePreise(a); const einheitBasis = basis === "g" ? "kg" : basis === "ml" ? "l" : t("allgemein.stueck");
  const jeBasis = p.jeEinheit === null ? null : basis === "stk" ? p.jeEinheit : preisJeBasis(a) * 1000;
  const zOffen = zwischenOffen.has(a.name) || !!g.zwischen;
  return `<div class="zeile ${ok ? "an" : "offen"}">
    <div class="oben"><div class="name">${esc(a.name)}<small>${esc(ok ? gebindeSatz(a) : t("allgemein.offen"))}</small></div><span class="marke ${ok ? "" : "offen"}">${esc(ok ? t("allgemein.bekannt") : t("allgemein.offen"))}</span></div>
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
    ${jeBasis !== null ? `<div class="ergebnis">${esc(t("gebinde.jeEinheit", fmtEuro(jeBasis, { dezimal: jeBasis < 1 ? 3 : 2 }), einheitBasis))}${p.zwischen !== null && g.zwischen ? ` · ${esc(t("gebinde.jeZwischen", fmtEuro(p.zwischen, { dezimal: 2 }), t("gebinde.arten." + g.zwischen.art)))}` : ""}</div>` : ""}
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
    if (art === "preis") a.preis = parseZahl(wert);
    if (art === "zwischen") { a.gebinde ??= { art: "packung", zwischen: null }; const n = parseZahl(wert); a.gebinde.zwischen = n > 0 ? { art: a.gebinde.zwischen?.art || "beutel", anzahl: Math.round(n) } : null; }
    if (art === "roh") { a.garverlust ??= {}; a.garverlust.roh = parseZahl(wert); }
    if (art === "gar") { a.garverlust ??= {}; a.garverlust.gar = parseZahl(wert); }
    a.status = preisJeBasis(a) !== null ? "bekannt" : "offen";
  },
  aktion(name, el, stand) {
    const a = stand.artikel.find((x) => x.name === el.dataset.name); if (!a) return false;
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
          <div class="oben"><div class="name">${esc(g.name)}</div>
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
export function ergebnisView(stand, { inApp = false } = {}) {
  const k = kalkulation(stand);
  const ampelWort = (a) => t("ergebnis.ampel." + a);
  return `
    ${inApp ? "" : `<h1 class="frage">${esc(t("ergebnis.titel"))}</h1><p class="hinweis">${esc(t("ergebnis.hinweis"))}</p>`}
    <div class="ampelzeile">${["gruen", "gelb", "rot", "grau"].map((a) => `<span class="ampel ${a}">${k.zaehl[a]} ${esc(ampelWort(a))}</span>`).join("")}</div>
    ${k.zielStufe !== "ok" ? `<p class="tipp">${esc(t(k.zielStufe === "sperre" ? "ergebnis.zielSperreAlle" : "ergebnis.zielWarnung"))}</p>` : ""}
    ${k.unvollstaendig ? `<p class="tipp">${esc(t("ergebnis.unvollstaendig"))}</p>` : ""}
    <div class="liste">
      ${k.zeilen.map((z) => `<div class="zeile ${z.ampel === "grau" ? "offen" : ""}">
        <div class="oben"><div class="name"><i class="punkt ${z.ampel}"></i>${esc(z.name)}<small>${esc(t("rezepte.klassen." + z.klasse))}${z.warenGeschaetzt ? ` · ${esc(t("ergebnis.garverlustGeschaetzt"))}` : ""}</small></div>
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
    </div>
    <p class="hinweis">${esc(t("ergebnis.lesehilfe"))}</p>`;
}

export const ergebnis = {
  id: "ergebnis",
  view: (stand) => ergebnisView(stand),
  fuss: () => `<button type="button" class="knopf glut" data-a="fertig">${esc(t("zusammenfassung.zurStartseite"))}</button>`,
  aktion(name, el, stand, ctx) { if (name === "fertig") { ctx.fertig(); return true; } },
};
