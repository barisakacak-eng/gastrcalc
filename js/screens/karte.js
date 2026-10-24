// Etappe 2: Karte wählen, Rezepte prüfen, Einkaufspreise, Verkaufspreise, Ergebnis.
// Grundsatz wie überall: Vorlagen sind Schätzungen, der Betrieb korrigiert nur. Nichts blockiert.
import { sym, SYMBOLE } from "../symbole.js";
import { wareBildQuelle } from "../bilder.js"; // Einkaufspreise als Bilderwand (20.10.2026): dieselbe Fotozuordnung wie Müll und Inventur
import { gerichtBild } from "./vergleich.js";
import { reinigungZeile } from "./reinigung_zeile.js";
import { t, einheitLabel, artikelText, gerichtText } from "../i18n.js"; // Paket 6 (17.10.2026): artikelText = Katalogname in der aktiven Sprache (nur Anzeige)
import { esc, parseZahl, fmtEuro, fmtZahl, wertAnzeige, heute } from "../util.js";
import { KATALOG, WARENGRUPPEN, PRODUKT_INDEX, EINHEITEN } from "../data/katalog.js";
import { vorlagenSortiert, zutatenSuchen, ladenArtVon } from "../profil.js";
import { zwischenrezept } from "../data/zwischen.js";
import { rezeptStempel, quelleVon, waageFragen, schnellwahl, familieAnpassen, geldSatz } from "../rezept_quelle.js";
import { kalkulation, garverlustAnteil, preisJeBasis, gebindePreise, istRichtpreis, preisGeschaetzt, selbstWerte } from "../engine.js";
import { einklappen } from "./bausteine.js";
// Trennung (17.10.2026): alle Schreibvorgänge dieser Schritte laufen über js/karte_daten.js
import { gerichtAusVorlage, gerichtAusVorlageAnlegen, gerichtEigenAnlegen, gerichtEntfernen, gerichtNameSetzen, gerichtKlasseSetzen, gerichtZeitSchritt, rezeptAngepasst,
  zutatMengeSetzen, zutatEntfernen, zutatEinheitSetzen, zutatAusKatalog, zutatFrei, verkaufspreisSetzen, mengeTagSetzen, bestellungenTagSetzen, zielgewinnSetzen,
  artikelAbgleichen, artikelVorschau, artikelFeldSetzen, packungEinheitSetzen, gebindeArtSetzen, preisBasisSetzen, zwischenEntfernen, garverlustMessenUmschalten, selbstUmschalten,
  selbstFeldSetzen, selbstZutatEntfernen, selbstZutatTauschen, adanaBrotOffen, adanaBrotSetzen, ADANA_BROT, selbstAusbeuteArt, selbstEigenUmschalten, zwischenArtSetzen } from "../karte_daten.js";
import { richtpreiseEinsetzen, richtpreiseEntfernen, richtpreiseAktiv, richtpreiseMoeglich } from "../richtpreise.js"; // Richtpreise (17.10.2026)

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
export function karteZuruecksetzen() { suche = ""; offenesGericht = null; zutatSuche = ""; eigenesText = ""; waage = null; stempelInfo = false; weitereOffen = false; zwischenOffen = new Set(); mehrArten = new Set(); rpQuelleOffen = false; offeneWare = null; filterWahl = null; }

const knopfWeiter = (text = t("allgemein.weiter"), extra = "") => `<button type="button" class="knopf ${extra}" data-a="weiter">${esc(text)}</button>`;

export { gerichtAusVorlage }; // Trennung (17.10.2026): wohnt jetzt in js/karte_daten.js (Verweis für ältere Aufrufer)

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
      const l = liste.filter((v) => v.bereich === b && (!q || v.name.toLowerCase().includes(q) || gerichtText(v.name).toLowerCase().includes(q)));
      if (!l.length) return "";
      return `<div class="gruppe">${esc(t("bereiche." + b))}</div><div class="liste eng">${l.map((v) => `
          <button type="button" class="wahl ${gewaehlt.has(v.name) ? "an" : ""}" data-a="vorlage" data-name="${esc(v.name)}" data-bereich="${esc(b)}">
            <span class="haken" aria-hidden="true">${gewaehlt.has(v.name) ? "✓" : ""}</span><span>${esc(gerichtText(v.name))}</span></button>`).join("")}</div>`;
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
      if (i >= 0) { if (gerichtHatEingaben(stand.gerichte[i]) && !confirm(t("karte.wegFrage", stand.gerichte[i].name))) return false; gerichtEntfernen(stand, stand.gerichte[i].id); }
      else { const so = vorlagenSortiert(stand); const v = [...so.kern, ...so.oft, ...so.weitere].find((x) => x.name === el.dataset.name); if (v) gerichtAusVorlageAnlegen(stand, v); }
      return true;
    }
    if (name === "eigenes-neu") {
      const n = eigenesText.trim(); if (!n) return false;
      gerichtEigenAnlegen(stand, n);
      eigenesText = ""; return true;
    }
    if (name === "eigenes-weg") { const g = stand.gerichte.find((x) => x.id === el.dataset.id); if (!g) return false; if (gerichtHatEingaben(g) && !confirm(t("karte.wegFrage", g.name))) return false; gerichtEntfernen(stand, g.id); return true; }
  },
  beimVerlassen(stand) { suche = ""; eigenesText = ""; weitereOffen = false; artikelAbgleichen(stand); },
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
    <h1 class="frage">${esc(t("waage.frage", artikelText(f.name), g.name))}</h1>
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
        return `<div class="zeile ${offen ? "offen" : "an"} quelle-${q}"><div class="oben"><div class="name"><span class="pkt ${PKT[q]}" aria-hidden="true"></span> ${esc(artikelText(z.name))}${gruppe === "verpackung" ? `<small>${esc(t("rezepte.verpackung"))}</small>` : `<small>${esc(t("stempel.kurz." + q))}${offen ? "" : " · " + esc(mengeText(z, g))}</small>`}</div>
          <button type="button" class="leise" data-a="zutat-weg" data-i="${i}">${esc(t("allgemein.loeschen"))}</button></div>
          <div class="betrag"><input inputmode="decimal" data-f="zutat:${i}" value="${esc(wertAnzeige(z.menge))}" aria-label="${esc(artikelText(z.name))}">
            <div class="periode">${EINHEITEN_JE_BASIS[basis].map((e) => `<button type="button" class="${z.einheit === e ? "an" : ""}" data-a="einheit" data-i="${i}" data-wert="${e}">${esc(einheitLabel(e))}</button>`).join("")}</div></div></div>`;
      }).join("")}
    </div>
    <input class="textfeld" data-f="zutat-suche" value="${esc(zutatSuche)}" placeholder="${esc(t("rezepte.zutatSuchen"))}" autocomplete="off">
    ${treffer.length ? `<div class="liste eng">${treffer.map((p) => `<button type="button" class="wahl" data-a="zutat-neu" data-name="${esc(p.n)}"><span class="haken"></span><span>${esc(artikelText(p.n))} <small>${esc(p.aus ? t("profil.aus", t("bereiche." + p.aus)) : p.g ? t("warengruppen." + p.g) : "")}</small></span></button>`).join("")}</div>` : ""}
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
      ${adanaBrotOffen(stand) ? `<div class="karte adanabrot"><b>${esc(t("adanaBrot.frage"))}</b>
        <div class="chips">${Object.keys(ADANA_BROT).map((w) => `<button type="button" class="chip" data-a="adana-brot" data-wert="${w}">${esc(t("adanaBrot." + w))}</button>`).join("")}</div></div>` : ""}
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
    if (feld === "gericht-name") gerichtNameSetzen(stand, g.id, wert);
    else if (feld === "zutat-suche") { zutatSuche = wert; return true; }
    else if (feld.startsWith("zutat:")) zutatMengeSetzen(stand, g.id, Number(feld.slice(6)), parseZahl(wert), heute());
  },
  aktion(name, el, stand) {
    if (name === "adana-brot") { adanaBrotSetzen(stand, el.dataset.wert); artikelAbgleichen(stand); return true; } // 20.10.2026: einmal fragen
    if (name === "rezept-auf") { offenesGericht = el.dataset.id; zutatSuche = ""; waage = null; stempelInfo = false; return true; }
    if (name === "rezept-zu") { offenesGericht = null; zutatSuche = ""; waage = null; stempelInfo = false; artikelAbgleichen(stand); return true; }
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
          waage.meldungen.push(t("waage.gelernt", artikelText(f.name), r.geaendert.length + 1));
          if (geld !== null && Math.abs(geld) >= 0.01) waage.meldungen.push(t(geld > 0 ? "waage.geldMehr" : "waage.geldWeniger", fmtEuro(Math.abs(geld), { dezimal: 2 }), g.name));
        }
        waage.k += 1;
        if (waage.k >= waage.fragen.length) { waage.fertig = true; artikelAbgleichen(stand); }
        else waage.wert = waage.fragen[waage.k].menge;
        return true;
      }
    }
    if (name === "klasse") { gerichtKlasseSetzen(stand, g.id, el.dataset.wert); return true; }
    if (name === "zeit") { gerichtZeitSchritt(stand, g.id, Number(el.dataset.d)); return true; }
    if (["zutat-weg", "zutat-neu", "zutat-frei", "einheit"].includes(name)) rezeptAngepasst(stand, g.id); // vom Wirt angepasst
    if (name === "zutat-weg") { zutatEntfernen(stand, g.id, Number(el.dataset.i)); return true; }
    if (name === "einheit") { zutatEinheitSetzen(stand, g.id, Number(el.dataset.i), el.dataset.wert); return true; }
    if (name === "zutat-neu") { zutatAusKatalog(stand, g.id, el.dataset.name); zutatSuche = ""; return true; }
    if (name === "zutat-frei") { zutatFrei(stand, g.id, el.dataset.name); zutatSuche = ""; return true; }
    if (name === "gericht-weg") { if (!confirm(t("karte.wegFrage", g.name))) return false; gerichtEntfernen(stand, g.id); offenesGericht = null; return true; }
  },
  beimVerlassen(stand) { offenesGericht = null; waage = null; artikelAbgleichen(stand); },
  // Zurück-Geste im Detail: nur das Detail schließen, nicht den Schritt verlassen
  zurueck(stand) { if (waage && !waage.fertig) { waage = null; return true; } if (!offenesGericht) return false; offenesGericht = null; zutatSuche = ""; artikelAbgleichen(stand); return true; },
};

// ---------- Schritt: Einkaufspreise als Bilderwand (20.10.2026, Entwurf „Bilder-Raster“ von Baris freigegeben) ----------
// Liste = Fotos der Waren, drei je Reihe, rot = Preis fehlt. Antippen öffnet unter dem Raster ein Blatt mit drei Fragen
// (Wie kommt es? Wie viel ist drin? Was kostet es?). Felder und data-f/data-a-Namen sind dieselben wie vorher (Variante C) –
// Tests und Belegübernahme hängen daran. Geändert ist nur die Darstellung, nicht die Daten oder die Rechnung.
const GEBINDE_WAHL = ["karton", "kiste", "beutel", "packung", "kanister", "eimer", "sack", "flasche", "dose", "lose"];
const GEBINDE_KURZ = ["karton", "kiste", "sack", "beutel"]; // vier Bild-Kacheln; der Rest hinter „…"
let zwischenOffen = new Set(); // Artikel, bei denen die Zwischengröße eingeblendet ist (flüchtig)
let mehrArten = new Set();     // Artikel, bei denen alle Gebindearten gezeigt werden (flüchtig)
let rpQuelleOffen = false;     // Richtpreise (17.10.2026): Satz zu Quelle und Methode aufgeklappt (flüchtig)
let offeneWare = null;         // Name der Ware im Blatt (flüchtig)
let filterWahl = null;         // "fehlt" | "alle" | null = Start: „Fehlt“, wenn etwas fehlt, sonst „Alle“ (flüchtig)
// Trennung 2 (17.10.2026): gebindeSatz wohnt in js/anzeige_text.js
import { gebindeSatz } from "../anzeige_text.js";

// Gebinde als Linien-Symbole (Lucide-Stil: 24er Raster, runde Enden). Karton = Lucide „package“, die anderen schlicht gezeichnet.
const GEBINDE_SYM = {
  karton: SYMBOLE.package,
  kiste: '<rect x="3" y="7" width="18" height="12" rx="1.5"/><path d="M3 11h18"/><path d="M8 7v4"/><path d="M16 7v4"/>',
  sack: '<path d="M9 4h6l-1.5 3.2c3 1.8 4.5 4.8 4.5 8.3 0 3.3-2.7 5.5-6 5.5s-6-2.2-6-5.5c0-3.5 1.5-6.5 4.5-8.3z"/><path d="M10.5 7.2h3"/>',
  beutel: '<path d="M6 6h12v13a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2z"/><path d="M6 10h12"/><path d="M6 3h12v3H6z"/>',
  packung: '<rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 9h6"/><path d="M9 13h6"/>',
  kanister: '<path d="M7 7h7l4 4v9a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1z"/><path d="M14 3h3v4"/><path d="M10 11h4"/>',
  eimer: '<path d="M5 9h14l-1.6 11.1a1 1 0 0 1-1 .9H7.6a1 1 0 0 1-1-.9z"/><path d="M5 9a7 6 0 0 1 14 0"/>',
  flasche: '<path d="M10 2h4v4l2 3v12a1 1 0 0 1-1 1H9a1 1 0 0 1-1-1V9l2-3z"/><path d="M8 13h8"/>',
  dose: '<ellipse cx="12" cy="5" rx="6" ry="2"/><path d="M6 5v14c0 1.1 2.7 2 6 2s6-.9 6-2V5"/><path d="M6 12c0 1.1 2.7 2 6 2s6-.9 6-2"/>',
  lose: '<circle cx="8" cy="16" r="3"/><circle cx="16" cy="16" r="3"/><circle cx="12" cy="8.5" r="3"/>',
};
const gebindeSym = (art) => `<svg class="sym ep-gsym" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${GEBINDE_SYM[art] || GEBINDE_SYM.packung}</svg>`;
// Foto der Ware aus der vorhandenen Zuordnung (js/bilder.js). Ohne Foto: neutrale Fläche mit dem Linien-Piktogramm, kein Text.
function wareBild(x, klasse) {
  const q = wareBildQuelle(x);
  return q.foto ? `<img class="${klasse}" src="foto/${q.foto}.webp" alt="" loading="lazy" decoding="async">`
    : `<span class="${klasse} ep-ohne" aria-hidden="true"><img src="bilder/${q.pikto}.svg" alt="" loading="lazy" decoding="async"></span>`;
}

// Selbst gemachtes Teil (Punkt 2; 19.10.2026 echtes Unterrezept). „Machen wir selbst“ auch ohne Vorlage: Soßen und Dips, Patties/Köfte/Falafel – nicht Mehl, Dosen, Essig oder Würste
const ZWISCHEN_ARTEN = ["beutel", "packung", "dose", "flasche", "karton"]; // Teil 2: Art der inneren Packung wählbar
const SELBST_NICHT = new Set(["Pizzatomaten (Dose)", "Tomatenmark", "Kokosmilch", "Balsamico", "Weinessig", "Worcestersauce", "Sojasauce", "Currypaste", "Bratenfond", "Senf", "Ketchup"]);
// 20.10.2026 (Baris): jede Teigsorte und jedes Brot ist selbst herstellbar (Dürüm, Fladen, Pide, Buns, Brötchen …) – Rohstoffe und TK-Ware nicht
const TEIG_SELBST = /teig|brot|fladen|wrap|bun\b|brötchen|baguette|brezel|yufka|knödel|spätzle|gnocchi/i, TEIG_NICHT = /mehl|hefe|\bTK\b|pulver|stärke|grieß|teigling|teigtaschen/i;
const selbstMoeglich = (a) => !SELBST_NICHT.has(a.name) && ((a.gruppe === "teig" && TEIG_SELBST.test(a.name) && !TEIG_NICHT.test(a.name)) || a.gruppe === "sauce" || (a.gruppe === "fleisch" && /patty|frikadell|adana|falafel|schnitzel|köfte|kofte|quiche/i.test(a.name)));
const geld = (x) => fmtEuro(x, { dezimal: x < 0.095 ? 3 : 2 });
const istSelbst = (a) => a.herkunft === "selbst" && !!a.rezept;

// Preis je Basiseinheit für Kachel und Ergebnis: { wert, einheit: "stk" | "kg" | "l" } oder null (= fehlt).
// Selbst gemacht in Stück (Pizzaballen): je Stück; sonst je kg / je Liter / je Stück nach der Packung (Rechnung aus engine.js).
function preisJe(a) {
  const pj = preisJeBasis(a); if (pj === null) return null;
  if (istSelbst(a) && a.rezept.stueck?.anzahl > 0) { const w = selbstWerte(a); if (w?.jeStueck !== null && w?.jeStueck !== undefined) return { wert: w.jeStueck, einheit: "stk" }; }
  const basis = EINHEITEN[a.packung?.einheit]?.basis || basisVon(a.einheit);
  return basis === "stk" ? { wert: pj, einheit: "stk" } : { wert: pj * 1000, einheit: basis === "ml" ? "l" : "kg" };
}
const einheitWort = (e) => (e === "stk" ? t("allgemein.stueck") : einheitLabel(e));
const geldGenau = (x) => fmtEuro(x, { dezimal: x < 0.1 ? 3 : 2 });
const ergebnisEinheit = (a) => { const b = basisVon(a.einheit); return b === "g" ? "kg" : b === "ml" ? "l" : "stk"; };

function kachel(a) {
  const p = preisJe(a); const fehlt = p === null; const ca = !fehlt && preisGeschaetzt(a); const auf = offeneWare === a.name;
  return `<button type="button" class="ep-kachel${fehlt ? " fehlt" : ""}${auf ? " auf" : ""}" data-a="ep-auf" data-name="${esc(a.name)}" aria-expanded="${auf}">
    ${wareBild(a, "ep-bild")}${istSelbst(a) ? `<span class="ep-marke selbst">${esc(t("pw.selbst"))}</span>` : ""}${ca ? `<span class="ep-marke ca" aria-label="${esc(t("allgemein.schaetzung"))}">≈</span>` : ""}
    <span class="ep-n">${esc(artikelText(a.name))}</span><span class="ep-p">${fehlt ? esc(t("pw.fehlt")) : `<bdi dir="ltr">${esc(`${geldGenau(p.wert)}/${einheitWort(p.einheit)}`)}</bdi>`}</span></button>`;
}

// Großes Ergebnis im Blatt („Ein Stück 0,53 €“). Wird beim Tippen an Ort und Stelle ersetzt (Feld behält den Fokus).
function ergebnisGekauft(a) {
  const p = preisJe(a); const rp = p !== null && istRichtpreis(a);
  const basis = basisVon(a.einheit); const g = a.gebinde || { art: "packung", zwischen: null };
  const pz = gebindePreise(a); const sg = Number(a.stueckGewicht) > 0 ? Number(a.stueckGewicht) : null;
  const neben = p === null || !sg ? "" : basis === "stk" ? t("gebinde.jeEinheit", fmtEuro(p.wert / sg * 1000, { dezimal: 2 }), "kg").replace(/^=\s*/, "") : t("selbst.jeStueck", fmtEuro(preisJeBasis(a) * sg, { dezimal: preisJeBasis(a) * sg < 0.1 ? 3 : 2 }));
  const unter = p === null ? "" : [gebindeSatz(a), neben, pz.zwischen !== null && g.zwischen ? t("gebinde.jeZwischen", fmtEuro(pz.zwischen, { dezimal: 2 }), t("gebinde.arten." + g.zwischen.art)) : ""].filter(Boolean).join(" · ");
  return `<div class="ep-ergebnis${p === null ? " leer" : ""}" aria-live="polite"><span>${esc(t("pw.ergebnis." + (p ? p.einheit : ergebnisEinheit(a))))}</span><b>${p === null ? "–" : `<bdi dir="ltr">${rp ? "≈ " : ""}${esc(fmtEuro(p.wert, { dezimal: p.wert < 0.1 ? 4 : p.wert < 1 ? 3 : 2 }))}</bdi>`}</b>${unter ? `<small>${esc((rp ? "≈ " : "") + unter)}</small>` : ""}</div>`;
}
function ergebnisSelbst(a) {
  const r = a.rezept; const p = preisJe(a); const ca = p !== null && preisGeschaetzt(a);
  const st = r.stueck; const anzahl = st?.anzahl > 0 ? st.anzahl : null;
  const links = anzahl && st.gewicht > 0 ? t("selbst.ergibtStueck", anzahl, Math.round((st.masse ?? anzahl * st.gewicht) - anzahl * st.gewicht)) : t("pw.ergebnis." + (p ? p.einheit : ergebnisEinheit(a)));
  const fehlt = (a.zwischenFehlt || []).filter((x) => x !== "rezept");
  const warum = p !== null ? "" : !(r.ausbeute?.menge > 0) ? t("selbst.ausbeuteFehlt") : fehlt.length ? t("selbst.fehlt", fehlt.map(artikelText).join(", ")) : t("selbst.mengeFehlt");
  return `<div class="ep-ergebnis${p === null ? " leer" : ""}" aria-live="polite"><span>${esc(links)}</span><b>${p === null ? "–" : `<bdi dir="ltr">${ca ? "≈ " : ""}${esc(geld(p.wert))}</bdi>`}</b>${warum ? `<small>${esc(warum)}</small>` : ""}</div>`;
}
function selbstWerteText(a) {
  const w = selbstWerte(a); if (!w) return "";
  const rp = a.zwischenRichtpreis ? "≈ " : "";
  return rp + [t("selbst.jeAnsatz", geld(w.ansatz)), w.jeKg !== null ? t("gebinde.jeEinheit", geld(w.jeKg), w.basis === "ml" ? "l" : "kg").replace(/^=\s*/, "") : null,
    w.jeStueck !== null ? t("selbst.jeStueck", geld(w.jeStueck)) : null, w.je50 !== null ? t("selbst.je50", geld(w.je50)) : null].filter(Boolean).join(" · ");
}
const frage = (nr, text) => `<h2 class="ep-frage"><i aria-hidden="true">${nr}</i>${esc(text)}</h2>`;
function blattKopf(a, unter) {
  return `<div class="ep-kopf">${wareBild(a, "ep-kopfbild")}<div><b>${esc(artikelText(a.name))}</b>${unter ? `<small>${unter}</small>` : ""}</div></div>`;
}

function blattGekauft(a) {
  const n = esc(a.name); const basis = basisVon(a.einheit); const gv = a.garverlust ? garverlustAnteil(a) : null;
  const g = a.gebinde || { art: "packung", zwischen: null }; const artName = t("gebinde.arten." + g.art);
  const st = basis !== "stk" ? g.stueck || null : null; // Teil 2 (19.10.2026): Gebinde in Stück („Karton 40 Stück à 250 g“)
  const rp = preisJeBasis(a) !== null && istRichtpreis(a);
  const alleArten = mehrArten.has(a.name);
  const arten = alleArten ? GEBINDE_WAHL : [...GEBINDE_KURZ, ...(GEBINDE_KURZ.includes(g.art) ? [] : [g.art])];
  const zArt = g.zwischen?.art || g.zwischenArt || "beutel"; const zOffen = zwischenOffen.has(a.name) || !!g.zwischen;
  const selbstKnopf = zwischenrezept(a.name) ? "selbst-an" : selbstMoeglich(a) ? "selbst-eigen-an" : null;
  const einheiten = basis === "stk" ? EINHEITEN_JE_BASIS.stk : [...EINHEITEN_JE_BASIS[basis], "stk"];
  const mehr = `
    ${basis === "stk" ? `<div class="feldzeile"><label>${esc(t("gebinde.stueckGewichtFrage"))}</label><div class="packung"><input inputmode="decimal" data-f="stueckGewicht:${n}" value="${esc(wertAnzeige(a.stueckGewicht ?? null))}" placeholder="${esc(t("gebinde.optional"))}" aria-label="${esc(t("selbst.gewicht"))}"><span class="einheit">${esc(t("selbst.gJeStueck"))}</span></div></div>` : ""}
    ${zOffen ? `<div class="feldzeile"><label>${esc(t("gebinde.zwischenAnzahl", artName, t("gebinde.arten." + zArt)))}</label>
      <div class="chips">${ZWISCHEN_ARTEN.map((x) => `<button type="button" class="chip klein ${zArt === x ? "an" : ""}" data-a="zwischen-art" data-name="${n}" data-wert="${x}">${esc(t("gebinde.arten." + x))}</button>`).join("")}</div>
      <div class="packung"><input inputmode="decimal" data-f="zwischen:${n}" value="${esc(wertAnzeige(g.zwischen?.anzahl ?? null))}" placeholder="4" aria-label="${esc(t("gebinde.zwischen"))}"><span class="einheit">${esc(t("gebinde.arten." + zArt))}</span>
      <button type="button" class="leise" data-a="zwischen-weg" data-name="${n}">${esc(t("gebinde.zwischenWeg"))}</button></div></div>`
      : `<button type="button" class="leise" data-a="zwischen-auf" data-name="${n}">${esc(t("gebinde.zwischen"))}</button>`}
    ${gv ? `<div class="unterzeile"><span class="marke ${gv.status === "geschaetzt" ? "geschaetzt" : ""}">${esc(t("preise.garverlust", fmtZahl(gv.wert * 100, 0), t(gv.status === "gemessen" ? "preise.gemessen" : "allgemein.schaetzung")))}</span>
      <button type="button" class="leise" data-a="messen" data-name="${n}">${esc(t("preise.messen"))}</button></div>
      ${a.garverlust.messen ? `<div class="packung"><input inputmode="decimal" data-f="roh:${n}" value="${esc(wertAnzeige(a.garverlust.roh))}" placeholder="${esc(t("preise.roh"))}"><span class="einheit">g</span>
        <span class="einheit">→</span><input inputmode="decimal" data-f="gar:${n}" value="${esc(wertAnzeige(a.garverlust.gar))}" placeholder="${esc(t("preise.gar"))}"><span class="einheit">g</span></div>` : ""}` : ""}
    <p class="hinweis">${esc(t("pw.mwstHinweis"))}</p>`;
  return `<section class="ep-blatt" aria-label="${n}">
    ${blattKopf(a, rp ? `<span class="marke geschaetzt">${esc(t("preise.richtpreis.marke"))}</span>` : "")}
    ${a.preis === 0 ? `<p class="tipp">${esc(t("preise.preisNull"))}</p>` : ""}
    ${frage(1, t("pw.frage1"))}
    <div class="ep-gebinde">${arten.map((x) => `<button type="button" class="ep-geb${g.art === x ? " an" : ""}" data-a="gebinde-art" data-name="${n}" data-wert="${x}" aria-pressed="${g.art === x}">${gebindeSym(x)}<span>${esc(t("gebinde.arten." + x))}</span></button>`).join("")}${alleArten ? "" : `<button type="button" class="ep-geb ep-geb-mehr" data-a="gebinde-mehr" data-name="${n}" aria-label="${esc(t("pw.mehrArten"))}"><span aria-hidden="true">…</span></button>`}</div>
    ${frage(2, t("pw.frage2"))}
    <div class="ep-reihe">
      ${st ? `<span class="stk-reihe"><input class="ep-zahl" inputmode="decimal" data-f="stk-anzahl:${n}" value="${esc(wertAnzeige(st.anzahl))}" placeholder="40" aria-label="${esc(t("selbst.anzahl"))}"><span class="einheit">${esc(t("allgemein.stueck"))} ×</span>
        <input class="ep-zahl" inputmode="decimal" data-f="stk-gewicht:${n}" value="${esc(wertAnzeige(st.gewicht))}" placeholder="250" aria-label="${esc(t("selbst.gewicht"))}"><span class="einheit">${esc(basis === "ml" ? t("gebinde.mlJeStueck") : t("selbst.gJeStueck"))}</span></span>`
        : `<input class="ep-zahl" inputmode="decimal" data-f="packung:${n}" value="${esc(wertAnzeige(a.packung?.menge))}" placeholder="0" aria-label="${esc(t("pw.frage2"))}">`}
      <div class="seg">${einheiten.map((e) => { const an = e === "stk" && basis !== "stk" ? !!st : !st && a.packung?.einheit === e; return `<button type="button" class="${an ? "an" : ""}" aria-pressed="${an}" data-a="packung-einheit" data-name="${n}" data-wert="${e}">${esc(einheitLabel(e))}</button>`; }).join("")}</div>
    </div>
    ${frage(3, t("pw.kostet." + g.art))}
    <div class="ep-reihe">
      <span class="ep-euro"><input class="ep-zahl" inputmode="decimal" data-f="preis:${n}" value="${esc(wertAnzeige(a.preis))}" placeholder="0,00" aria-label="${esc(t("pw.kostet." + g.art))}"><span class="einheit">€</span></span>
      <div class="seg">${["netto", "brutto"].map((b) => { const an = (a.preisBasis || "netto") === b; return `<button type="button" class="${an ? "an" : ""}" aria-pressed="${an}" data-a="preis-basis" data-name="${n}" data-wert="${b}">${esc(t(b === "netto" ? "pw.ohneMwst" : "pw.mitMwst"))}</button>`; }).join("")}</div>
    </div>
    ${ergebnisGekauft(a)}
    ${einklappen("ep-mehr:" + a.name, t("pw.mehr"), mehr)}
    ${selbstKnopf ? `<button type="button" class="leise" data-a="${selbstKnopf}" data-name="${n}">${esc(t("selbst.machenSelbst"))}</button>` : ""}
  </section>`;
}

function blattSelbst(a, alle) {
  const r = a.rezept; const n = esc(a.name); const eigen = r.quelle === "eigen"; const vorlage = !!zwischenrezept(a.name);
  const stueck = !!r.stueck; const gEinheit = r.ausbeute?.einheit === "ml" || r.ausbeute?.einheit === "l" ? r.ausbeute.einheit : "g";
  const index = Object.fromEntries(alle.map((x) => [x.name, x]));
  const schon = new Set(r.zutaten.map((x) => x.name));
  const opt = (x) => `<option value="${esc(x)}">${esc(artikelText(x))}</option>`;
  const eigene = alle.filter((x) => x.herkunft !== "selbst" && !schon.has(x.name) && x.name !== a.name).map((x) => x.name).sort((p, q) => artikelText(p).localeCompare(artikelText(q)));
  const katalog = [...new Set(Object.values(KATALOG).flatMap((k) => k.produkte.map((p) => p.n)))].filter((x) => !schon.has(x) && !eigene.includes(x) && x !== a.name && PRODUKT_INDEX[x]?.g !== "verpackung" && PRODUKT_INDEX[x]?.g !== "getraenk").sort((p, q) => artikelText(p).localeCompare(artikelText(q)));
  const gruppen = `${eigene.length ? `<optgroup label="${esc(t("selbst.deineWaren"))}">${eigene.map(opt).join("")}</optgroup>` : ""}<optgroup label="${esc(t("selbst.alleWaren"))}">${katalog.map(opt).join("")}</optgroup>`;
  const zutatBild = (name) => wareBild({ name, gruppe: index[name]?.gruppe || PRODUKT_INDEX[name]?.g || "" }, "ep-zbild");
  const werte = selbstWerteText(a);
  const mehr = `
    <div class="packung"><input inputmode="decimal" data-f="sz-arbeit:${n}" value="${esc(wertAnzeige(r.arbeitMin || null))}" placeholder="20" aria-label="${esc(t("selbst.arbeit"))}"><span class="einheit">${esc(t("selbst.arbeit"))}</span></div>
    ${werte ? `<p class="ep-werte">${esc(werte)}</p>` : ""}
    ${eigen ? "" : `<p class="hinweis">${esc(t("selbst.einmalWiegen"))}</p>`}
    <button type="button" class="leise" data-a="${vorlage ? "selbst-aus" : "selbst-eigen-aus"}" data-name="${n}">${esc(t("selbst.dochKaufen"))}</button>`;
  return `<section class="ep-blatt sz" aria-label="${n}">
    ${blattKopf(a, esc(t("selbst.gemacht")) + " · " + esc(t(eigen ? "selbst.deinAnsatz" : "rezepte.startwerte")))}
    ${frage(1, t("selbst.zutaten"))}
    <div class="ep-zutaten">
      ${r.zutaten.length ? r.zutaten.map((x, i) => `<div class="ep-zut">${zutatBild(x.name)}
        <label class="sz-name sz-tauschbar"><span>${esc(artikelText(x.name))} <span class="sz-pfeil" aria-hidden="true">▾</span></span>${i === 0 ? `<small>${esc(t("pw.tauschen"))}</small>` : ""}<select class="sz-tausch" data-f="sz-tausch#${i}:${n}" aria-label="${esc(t("selbst.tauschen") + ": " + artikelText(x.name))}"><option value="${esc(x.name)}" selected>${esc(artikelText(x.name))}</option>${gruppen}</select></label>
        <span class="ep-zmenge"><input inputmode="decimal" data-f="sz-menge#${i}:${n}" value="${esc(wertAnzeige(x.menge))}" placeholder="0" aria-label="${esc(t("preise.menge") + " " + artikelText(x.name))}"><span class="einheit">${esc(einheitLabel(x.einheit))}</span></span>
        <button type="button" class="sz-weg" data-a="sz-weg" data-name="${n}" data-i="${i}" aria-label="${esc(t("selbst.weg"))}">×</button></div>`).join("") : `<p class="hinweis">${esc(t("selbst.leer"))}</p>`}
      <label class="ep-plus"><span>${esc(t("selbst.zutatDazu"))}</span><select class="sz-neu" data-f="sz-neu:${n}" aria-label="${esc(t("selbst.zutatDazu"))}"><option value="">${esc(t("selbst.zutatDazu"))}</option>${gruppen}</select></label>
    </div>
    ${frage(2, t("pw.raus"))}
    <div class="seg">${["gewicht", "stueck"].map((x) => { const an = (x === "stueck") === stueck; return `<button type="button" class="${an ? "an" : ""}" aria-pressed="${an}" data-a="sz-art" data-name="${n}" data-wert="${x}">${esc(t("selbst.als." + x))}</button>`; }).join("")}</div>
    ${stueck ? `<div class="ep-teig">
        <label><span>${esc(t("pw.masse"))}</span><span class="ep-tfeld"><input inputmode="decimal" data-f="sz-masse:${n}" value="${esc(wertAnzeige(r.stueck.masse ?? (r.stueck.anzahl > 0 && r.stueck.gewicht > 0 ? r.stueck.anzahl * r.stueck.gewicht : null)))}" placeholder="1650"><span class="einheit">g</span></span></label>
        <label><span>${esc(t("pw.einStueck"))}</span><span class="ep-tfeld"><input inputmode="decimal" data-f="sz-gewicht:${n}" value="${esc(wertAnzeige(r.stueck.gewicht))}" placeholder="275"><span class="einheit">g</span></span></label></div>`
      : `<div class="ep-reihe"><input class="ep-zahl" inputmode="decimal" data-f="sz-ausbeute:${n}" value="${esc(wertAnzeige(r.ausbeute?.menge))}" placeholder="1650" aria-label="${esc(t("pw.raus"))}"><span class="einheit">${esc(einheitLabel(gEinheit))}</span></div>`}
    ${ergebnisSelbst(a)}
    ${einklappen("ep-mehr:" + a.name, t("pw.mehr"), mehr)}
  </section>`;
}

// Blatt-Ergebnis nach einer Eingabe neu setzen, ohne den Bildschirm neu zu zeichnen (Tastatur bleibt, Fokus bleibt).
function ergebnisNeu(stand, name) {
  if (typeof document === "undefined") return;
  const alt = document.querySelector("#app .ep-blatt .ep-ergebnis"); const a = (stand.artikel || []).find((x) => x.name === name);
  if (!alt || !a || name !== offeneWare) return;
  alt.insertAdjacentHTML("afterend", istSelbst(a) ? ergebnisSelbst(a) : ergebnisGekauft(a)); alt.remove();
}
// Nach dem Zeichnen sanft zum Blatt bzw. zurück zur Kachel scrollen
const hinScrollen = (sel) => { if (typeof document !== "undefined") setTimeout(() => document.querySelector(sel)?.scrollIntoView({ block: sel.includes("ep-blatt") ? "start" : "center", behavior: "smooth" }), 30); };

export const preise = {
  id: "preise",
  view(stand) {
    // Trennung (17.10.2026): Zeichnen schreibt nicht mehr – gespeichert wird beim Betreten des Schritts (beimBetreten) und bei jeder Eingabe
    const artikel = artikelVorschau(stand).filter((a) => a.benutzt !== false);
    const rpAktiv = richtpreiseAktiv({ artikel }); // Richtpreise (17.10.2026)
    const rpMoeglich = richtpreiseMoeglich({ artikel });
    const fehlend = artikel.filter((a) => preisJe(a) === null);
    const fertig = artikel.length - fehlend.length; const pct = artikel.length ? Math.round(fertig / artikel.length * 100) : 0;
    const filter = fehlend.length && filterWahl !== "alle" ? "fehlt" : "alle";
    const offen = offeneWare ? artikel.find((a) => a.name === offeneWare) || null : null;
    const raster = (liste) => `<div class="ep-raster">${liste.map(kachel).join("")}</div>`;
    const gruppen = [...new Set(artikel.map((a) => a.gruppe))];
    // Gruppen nur in „Alle“ (lange Liste zum Überfliegen); „Fehlt“ ist eine kurze Aufgabenliste ohne Überschriften
    const wand = filter === "fehlt" ? raster(fehlend) : gruppen.length > 1 ? gruppen.map((gr) => `<h2 class="ep-gruppe">${esc(t("warengruppen." + gr))}</h2>${raster(artikel.filter((a) => a.gruppe === gr))}`).join("") : raster(artikel);
    // Richtpreise (17.10.2026) stehen seit 20.10.2026 unter der Bilderwand: auf kleinen Handys sind sonst keine Fotos im ersten Blick
    const rpBlock = `
      ${rpMoeglich ? `<button type="button" class="knopf zweit" data-a="richtpreise-ein">${esc(t("preise.richtpreis.knopf"))}</button>
      <p class="hinweis">${esc(t("preise.richtpreis.satz"))}</p>` : ""}
      ${rpAktiv ? `<button type="button" class="leise" data-a="richtpreise-weg">${esc(t("preise.richtpreis.entfernen"))}</button>` : ""}
      ${rpMoeglich || rpAktiv ? `<button type="button" class="leise" data-a="richtpreise-quelle" aria-expanded="${rpQuelleOffen}">${esc(t("preise.richtpreis.quelleAuf"))}</button>${rpQuelleOffen ? `<p class="hinweis">${esc(t("preise.richtpreis.quelle"))}</p>` : ""}` : ""}
`;
    const chip = (wert, text, aus) => `<button type="button" class="chip klein${filter === wert ? " an" : ""}" data-a="ep-filter" data-wert="${wert}" aria-pressed="${filter === wert}"${aus ? " disabled" : ""}>${esc(text)}</button>`;
    return `
      <h1 class="frage">${esc(t("preise.frage"))}</h1>
      ${artikel.length ? `<div class="ep-fort"><div class="ep-fort-zeile"><b>${esc(t("pw.fortschritt", fertig, artikel.length))}</b><span>${pct} %</span></div><div class="ep-balken" aria-hidden="true"><i style="width:${pct}%"></i></div>${rpAktiv ? `<small>${esc(t("preise.richtpreis.aktiv", rpAktiv))}</small>` : ""}</div>` : `<p class="hinweis">${esc(t("pw.keineWaren"))}</p>`}
      ${artikel.length ? `<div class="ep-filter" role="group">${chip("fehlt", t("pw.filterFehlt", fehlend.length), !fehlend.length)}${chip("alle", t("pw.filterAlle", artikel.length), false)}</div>
      <p class="hinweis ep-tipp">${esc(t("pw.hinweis"))}</p>
      <div class="ep-wand${offen ? " gedimmt" : ""}">${wand}</div>` : ""}
      ${offen ? "" : `<div class="ep-rp">${rpBlock}</div>`}
      ${offen ? (istSelbst(offen) ? blattSelbst(offen, artikel) : blattGekauft(offen)) : ""}`;
  },
  fuss(stand) { return offeneWare && (stand.artikel || []).some((a) => a.name === offeneWare) ? `<button type="button" class="knopf" data-a="ep-zu">${esc(t("allgemein.fertig"))}</button>` : knopfWeiter(); },
  beimBetreten(stand) { artikelAbgleichen(stand); }, // Trennung (17.10.2026): vorher im Zeichnen
  // Trennung (17.10.2026): vorher glich das Zeichnen die Artikelliste ab und speicherte sie. Jetzt geschieht das vor und nach jeder
  // Eingabe und Handlung dieses Schritts – gespeichert wird also dasselbe wie vorher, nur nicht mehr beim Anzeigen.
  eingabe(feld, wert, stand) {
    const [art, ...rest] = feld.split(":"); const name = rest.join(":");
    artikelAbgleichen(stand);
    if (art.startsWith("sz-tausch#")) { selbstZutatTauschen(stand, name, Number(art.split("#")[1]), wert, heute()); artikelAbgleichen(stand); return true; } // 20.10.2026: Zutat tauschen
    if (art.startsWith("sz-")) { // Selbst gemacht (19.10.2026): Ansatz bearbeiten; neue Zutat zeichnet neu, Zahlen nicht (Fokus bleibt)
      const neu = art === "sz-neu"; selbstFeldSetzen(stand, name, art.slice(3), neu ? wert : parseZahl(wert), heute());
      artikelAbgleichen(stand); if (!neu) ergebnisNeu(stand, name); return neu;
    }
    artikelFeldSetzen(stand, name, art, parseZahl(wert), heute());
    artikelAbgleichen(stand); ergebnisNeu(stand, name);
  },
  aktion(name, el, stand, ctx) { artikelAbgleichen(stand); const r = preisAktion(name, el, stand, ctx); artikelAbgleichen(stand); return r; },
  zurueck() { if (!offeneWare) return false; const war = offeneWare; offeneWare = null; hinScrollen(`.ep-kachel[data-name="${cssName(war)}"]`); return true; }, // Zurück-Geste schließt zuerst das Blatt
  beimVerlassen() { zwischenOffen = new Set(); mehrArten = new Set(); rpQuelleOffen = false; offeneWare = null; filterWahl = null; },
};
const cssName = (n) => (typeof CSS !== "undefined" && CSS.escape ? CSS.escape(n) : String(n).replace(/["\\]/g, "\\$&"));
function preisAktion(name, el, stand, ctx) {
    if (name === "richtpreise-ein") { const r = richtpreiseEinsetzen(stand); ctx?.meldung?.(t("preise.richtpreis.meldung", r.gesetzt, r.ohneRichtpreis.length)); return true; } // Richtpreise (17.10.2026)
    if (name === "richtpreise-weg") { const r = richtpreiseEntfernen(stand); ctx?.meldung?.(t("preise.richtpreis.entfernt", r.entfernt)); return true; }
    if (name === "richtpreise-quelle") { rpQuelleOffen = !rpQuelleOffen; return true; }
    if (name === "ep-filter") { filterWahl = el.dataset.wert === "fehlt" ? "fehlt" : "alle"; return true; }
    if (name === "ep-zu") { const war = offeneWare; offeneWare = null; if (war) hinScrollen(`.ep-kachel[data-name="${cssName(war)}"]`); return true; }
    const a = stand.artikel.find((x) => x.name === el.dataset.name); if (!a) return false;
    if (name === "ep-auf") { offeneWare = a.name; hinScrollen(".ep-blatt"); return true; }
    if (name === "selbst-an" || name === "selbst-aus") {
      const kachel = zwischenrezept(a.name)?.kachel; if (!kachel) return false;
      selbstUmschalten(stand, kachel, name === "selbst-an"); return true;
    }
    if (name === "selbst-eigen-an" || name === "selbst-eigen-aus") return selbstEigenUmschalten(stand, a.name, name === "selbst-eigen-an");
    if (name === "sz-weg") return selbstZutatEntfernen(stand, a.name, Number(el.dataset.i), heute());
    if (name === "sz-art") return selbstAusbeuteArt(stand, a.name, el.dataset.wert, heute());
    if (name === "packung-einheit") return packungEinheitSetzen(stand, a.name, el.dataset.wert);
    if (name === "gebinde-art") return gebindeArtSetzen(stand, a.name, el.dataset.wert);
    if (name === "preis-basis") return preisBasisSetzen(stand, a.name, el.dataset.wert);
    if (name === "zwischen-art") return zwischenArtSetzen(stand, a.name, el.dataset.wert);
    if (name === "zwischen-auf") { zwischenOffen.add(a.name); return true; }
    if (name === "gebinde-mehr") { mehrArten.add(a.name); return true; }
    if (name === "zwischen-weg") { zwischenOffen.delete(a.name); zwischenEntfernen(stand, a.name); return true; }
    if (name === "messen") return garverlustMessenUmschalten(stand, a.name);
}

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
    if (feld === "bestellungenTag") bestellungenTagSetzen(stand, parseZahl(wert));
    else if (feld === "zielgewinn") zielgewinnSetzen(stand, parseZahl(wert));
    else { const [art, id] = feld.split(":");
      if (art === "preis") verkaufspreisSetzen(stand, id, parseZahl(wert)); if (art === "menge") mengeTagSetzen(stand, id, parseZahl(wert)); }
  },
  aktion(name, el, stand) {
    if (name === "bestseller") { const g = stand.gerichte.find((x) => x.id === el.dataset.id); if (!g) return false; if (g.mengeTag === null || g.mengeTag === undefined) mengeTagSetzen(stand, g.id, 0); else if (!(g.mengeTag > 0) || confirm(t("karte.bestsellerWeg"))) mengeTagSetzen(stand, g.id, null); return true; }
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
        ${z.sk === null ? `<span class="marke offen">${esc(z.warenFehlt[0] === "rezept" ? t("rezepte.leer") : z.warenFehlt.length ? t("ergebnis.fehlt", z.warenFehlt.slice(0, 3).map(artikelText).join(", ")) : t("ergebnis.preisFehlt"))}</span>` : `
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
      <button type="button" class="summenzeile zeilentipp" data-a="bearbeiten" data-schritt="lohn"><span>${esc(t("start.eigenerLohn"))}</span><span class="wert">${k.last.eigen.betrag === null ? `<span class="marke offen">${esc(t("allgemein.offen"))}</span>` : `${k.last.eigen.status === "geschaetzt" ? "≈ " : ""}${fmtEuro(k.last.eigen.betrag)}${k.last.eigen.status === "geschaetzt" ? ` <span class="marke geschaetzt">${esc(t("allgemein.schaetzung"))}</span>` : ""}`} ›</span></button>
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
