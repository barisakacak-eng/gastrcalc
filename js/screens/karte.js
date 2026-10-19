// Etappe 2: Karte wählen, Rezepte prüfen, Einkaufspreise, Verkaufspreise, Ergebnis.
// Grundsatz wie überall: Vorlagen sind Schätzungen, der Betrieb korrigiert nur. Nichts blockiert.
import { sym } from "../symbole.js";
import { gerichtBild } from "./vergleich.js";
import { reinigungZeile } from "./reinigung_zeile.js";
import { t, einheitLabel, artikelText } from "../i18n.js"; // Paket 6 (17.10.2026): artikelText = Katalogname in der aktiven Sprache (nur Anzeige)
import { esc, parseZahl, fmtEuro, fmtZahl, wertAnzeige, heute } from "../util.js";
import { KATALOG, WARENGRUPPEN, PRODUKT_INDEX, EINHEITEN } from "../data/katalog.js";
import { vorlagenSortiert, zutatenSuchen, ladenArtVon } from "../profil.js";
import { zwischenrezept } from "../data/zwischen.js";
import { rezeptStempel, quelleVon, waageFragen, schnellwahl, familieAnpassen, geldSatz } from "../rezept_quelle.js";
import { kalkulation, garverlustAnteil, preisJeBasis, gebindePreise, istRichtpreis, selbstWerte, zwischenpreis } from "../engine.js";
import { einklappen, offeneKlappen } from "./bausteine.js";
// Trennung (17.10.2026): alle Schreibvorgänge dieser Schritte laufen über js/karte_daten.js
import { gerichtAusVorlage, gerichtAusVorlageAnlegen, gerichtEigenAnlegen, gerichtEntfernen, gerichtNameSetzen, gerichtKlasseSetzen, gerichtZeitSchritt, rezeptAngepasst,
  zutatMengeSetzen, zutatEntfernen, zutatEinheitSetzen, zutatAusKatalog, zutatFrei, verkaufspreisSetzen, mengeTagSetzen, bestellungenTagSetzen, zielgewinnSetzen,
  artikelAbgleichen, artikelVorschau, artikelFeldSetzen, packungEinheitSetzen, gebindeArtSetzen, preisBasisSetzen, zwischenEntfernen, garverlustMessenUmschalten, selbstUmschalten,
  selbstFeldSetzen, selbstZutatEntfernen, selbstAusbeuteArt, selbstEigenUmschalten, zwischenArtSetzen } from "../karte_daten.js";
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
export function karteZuruecksetzen() { suche = ""; offenesGericht = null; zutatSuche = ""; eigenesText = ""; waage = null; stempelInfo = false; weitereOffen = false; zwischenOffen = new Set(); mehrArten = new Set(); }

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

// ---------- Schritt: Einkaufspreise mit Gebinde (Etappe 5, Variante C: was kaufst du, was ist drin, was kostet es) ----------
const GEBINDE_WAHL = ["karton", "kiste", "beutel", "packung", "kanister", "eimer", "sack", "flasche", "dose", "lose"];
const GEBINDE_KURZ = ["karton", "kiste", "beutel", "packung", "lose"]; // die fünf häufigsten; der Rest hinter „mehr"
let zwischenOffen = new Set(); // Artikel, bei denen die Zwischengröße eingeblendet ist (flüchtig)
let mehrArten = new Set();     // Artikel, bei denen alle Gebindearten gezeigt werden (flüchtig)
let rpQuelleOffen = false;     // Richtpreise (17.10.2026): Satz zu Quelle und Methode aufgeklappt (flüchtig)
// Trennung 2 (17.10.2026): gebindeSatz wohnt in js/anzeige_text.js
import { gebindeSatz } from "../anzeige_text.js";

// Selbst gemachtes Teil (Punkt 2; 19.10.2026 echtes Unterrezept): Warenwert je Ansatz, je kg, je Stück und je 50 g – und der Ansatz
// lässt sich hier selbst eintragen (Zutaten, Mengen, Ausbeute als Gewicht oder „6 Ballen à 275 g“, Minuten). Danach zählt er als „dein Ansatz“.
const ZWISCHEN_ARTEN = ["beutel", "packung", "dose", "flasche", "karton"]; // Teil 2: Art der inneren Packung wählbar
// „Machen wir selbst“ auch ohne Vorlage: Soßen und Dips, Patties/Köfte/Falafel – nicht Mehl, Dosen, Essig oder Würste
const SELBST_NICHT = new Set(["Pizzatomaten (Dose)", "Tomatenmark", "Kokosmilch", "Balsamico", "Weinessig", "Worcestersauce", "Sojasauce", "Currypaste", "Bratenfond", "Senf", "Ketchup"]);
const selbstMoeglich = (a) => !SELBST_NICHT.has(a.name) && (a.gruppe === "sauce" || (a.gruppe === "fleisch" && /patty|frikadell|adana|falafel|schnitzel|köfte|kofte|quiche/i.test(a.name)));
const geld = (x) => fmtEuro(x, { dezimal: x < 0.095 ? 3 : 2 });
function selbstWerteText(a) {
  const w = selbstWerte(a); if (!w) return "";
  const rp = a.zwischenRichtpreis ? "≈ " : "";
  return rp + [t("selbst.jeAnsatz", geld(w.ansatz)), w.jeKg !== null ? t("gebinde.jeEinheit", geld(w.jeKg), w.basis === "ml" ? "l" : "kg").replace(/^=\s*/, "") : null,
    w.jeStueck !== null ? t("selbst.jeStueck", geld(w.jeStueck)) : null, w.je50 !== null ? t("selbst.je50", geld(w.je50)) : null].filter(Boolean).join(" · ");
}
function selbstEditor(a, alle) {
  const r = a.rezept; const n = esc(a.name); const z = zwischenpreis(a, Object.fromEntries(alle.map((x) => [x.name, x])));
  const wertVon = Object.fromEntries((z.teile || []).map((x) => [x.name, x.wert]));
  const stueck = !!r.stueck; const gEinheit = r.ausbeute?.einheit === "ml" || r.ausbeute?.einheit === "l" ? r.ausbeute.einheit : "g";
  const schon = new Set(r.zutaten.map((x) => x.name));
  const eigene = alle.filter((x) => x.herkunft !== "selbst" && !schon.has(x.name) && x.name !== a.name).map((x) => x.name).sort((p, q) => artikelText(p).localeCompare(artikelText(q)));
  const katalog = [...new Set(Object.values(KATALOG).flatMap((k) => k.produkte.map((p) => p.n)))].filter((x) => !schon.has(x) && !eigene.includes(x) && x !== a.name && PRODUKT_INDEX[x]?.g !== "verpackung" && PRODUKT_INDEX[x]?.g !== "getraenk").sort((p, q) => artikelText(p).localeCompare(artikelText(q)));
  const opt = (x) => `<option value="${esc(x)}">${esc(artikelText(x))}</option>`;
  return `<div class="sz">
    <div class="sz-titel">${esc(t("selbst.zutaten"))}</div>
    ${r.zutaten.length ? r.zutaten.map((x, i) => `<div class="sz-zeile"><span class="sz-name">${esc(artikelText(x.name))}</span>
      <input inputmode="decimal" data-f="sz-menge#${i}:${n}" value="${esc(wertAnzeige(x.menge))}" placeholder="${esc(t("preise.menge"))}" aria-label="${esc(t("preise.menge") + " " + artikelText(x.name))}"><span class="einheit">${esc(einheitLabel(x.einheit))}</span>
      <span class="sz-wert">${wertVon[x.name] !== undefined ? esc(geld(wertVon[x.name])) : "–"}</span>
      <button type="button" class="sz-weg" data-a="sz-weg" data-name="${n}" data-i="${i}" aria-label="${esc(t("selbst.weg"))}">×</button></div>`).join("") : `<p class="hinweis">${esc(t("selbst.leer"))}</p>`}
    <select class="sz-neu" data-f="sz-neu:${n}" aria-label="${esc(t("selbst.zutatDazu"))}"><option value="">${esc(t("selbst.zutatDazu"))}</option>
      ${eigene.length ? `<optgroup label="${esc(t("selbst.deineWaren"))}">${eigene.map(opt).join("")}</optgroup>` : ""}<optgroup label="${esc(t("selbst.alleWaren"))}">${katalog.map(opt).join("")}</optgroup></select>
    <div class="sz-titel">${esc(t("selbst.ergibt"))}</div>
    <div class="seg klein">${["gewicht", "stueck"].map((x) => `<button type="button" class="${(x === "stueck") === stueck ? "an" : ""}" data-a="sz-art" data-name="${n}" data-wert="${x}">${esc(t("selbst.als." + x))}</button>`).join("")}</div>
    ${stueck ? `<div class="packung stk-reihe"><input inputmode="decimal" data-f="sz-anzahl:${n}" value="${esc(wertAnzeige(r.stueck.anzahl))}" placeholder="6" aria-label="${esc(t("selbst.anzahl"))}"><span class="einheit">${esc(t("allgemein.stueck"))} ×</span>
      <input inputmode="decimal" data-f="sz-gewicht:${n}" value="${esc(wertAnzeige(r.stueck.gewicht))}" placeholder="275" aria-label="${esc(t("selbst.gewicht"))}"><span class="einheit">${esc(t("selbst.gJeStueck"))}</span></div>`
      : `<div class="packung"><input inputmode="decimal" data-f="sz-ausbeute:${n}" value="${esc(wertAnzeige(r.ausbeute?.menge))}" placeholder="1650" aria-label="${esc(t("selbst.ergibt"))}"><span class="einheit">${esc(einheitLabel(gEinheit))}</span></div>`}
    <div class="packung"><input inputmode="decimal" data-f="sz-arbeit:${n}" value="${esc(wertAnzeige(r.arbeitMin || null))}" placeholder="20" aria-label="${esc(t("selbst.arbeit"))}"><span class="einheit">${esc(t("selbst.arbeit"))}</span></div>
  </div>`;
}
function selbstZeile(a, alle = []) {
  const r = a.rezept; const ok = preisJeBasis(a) !== null; const eigen = r.quelle === "eigen";
  const fehlt = (a.zwischenFehlt || []).filter((x) => x !== "rezept");
  const z = ok ? null : zwischenpreis(a, Object.fromEntries(alle.map((x) => [x.name, x])));
  const vorlage = !!zwischenrezept(a.name);
  return `<div class="zeile selbst ${ok ? "an" : "offen"}">
    <div class="oben"><div class="name">${esc(artikelText(a.name))}<small>${esc(t("selbst.gemacht"))} · ${esc(t(eigen ? "selbst.deinAnsatz" : "rezepte.startwerte"))}</small></div><span class="marke ${ok ? (eigen ? "" : "geschaetzt") : "offen"}">${esc(ok ? t("selbst.errechnet") : t("allgemein.offen"))}</span></div>
    ${ok ? `<div class="ergebnis">${esc(selbstWerteText(a))}</div>`
      : `<p class="tipp">${esc(!(r.ausbeute?.menge > 0) ? t("selbst.ausbeuteFehlt") : fehlt.length ? t("selbst.fehlt", fehlt.map(artikelText).join(", ")) : t("selbst.mengeFehlt"))}${z?.bisher > 0 ? " · " + esc(t("selbst.bisher", geld(z.bisher))) : ""}</p>`}
    ${eigen ? "" : `<p class="hinweis">${esc(t("selbst.einmalWiegen"))}</p>`}
    ${einklappen("selbst:" + a.name, t("selbst.bearbeiten"), selbstEditor(a, alle))}
    <button type="button" class="leise" data-a="${vorlage ? "selbst-aus" : "selbst-eigen-aus"}" data-name="${esc(a.name)}">${esc(t("selbst.dochKaufen"))}</button></div>`;
}

function artikelZeile(a, alle = []) {
  if (a.herkunft === "selbst" && a.rezept) return selbstZeile(a, alle);
  const ok = preisJeBasis(a) !== null; const basis = basisVon(a.einheit); const gv = a.garverlust ? garverlustAnteil(a) : null;
  const g = a.gebinde || { art: "packung", zwischen: null }; const artName = t("gebinde.arten." + g.art);
  const p = gebindePreise(a); const einheitBasis = basis === "g" ? "kg" : basis === "ml" ? "l" : t("allgemein.stueck");
  const jeBasis = p.jeEinheit === null ? null : basis === "stk" ? p.jeEinheit : preisJeBasis(a) * 1000;
  const zOffen = zwischenOffen.has(a.name) || !!g.zwischen;
  const st = basis !== "stk" ? g.stueck || null : null; const sg = Number(a.stueckGewicht) > 0 ? Number(a.stueckGewicht) : null; // Teil 2 (19.10.2026): Gebinde in Stück
  const neben = jeBasis === null || !sg ? "" : basis === "stk" ? t("gebinde.jeEinheit", fmtEuro(jeBasis / sg * 1000, { dezimal: 2 }), "kg") : t("selbst.jeStueck", fmtEuro(preisJeBasis(a) * sg, { dezimal: preisJeBasis(a) * sg < 0.1 ? 3 : 2 }));
  const rp = ok && istRichtpreis(a); // Richtpreise (17.10.2026): ≈ und Herkunft „Richtpreis“ (Marke wie bei Schätzungen)
  return `<div class="zeile ${ok ? "an" : "offen"}">
    <div class="oben"><div class="name">${esc(artikelText(a.name))}<small>${esc(ok ? (rp ? "≈ " : "") + gebindeSatz(a) + (rp ? " · " + t("preise.richtpreis.marke") : "") : a.preis === 0 ? t("preise.preisNull") : t("allgemein.offen"))}</small></div><span class="marke ${rp ? "geschaetzt" : ok ? "" : "offen"}">${esc(rp ? t("preise.richtpreis.marke") : ok ? t("allgemein.bekannt") : t("allgemein.offen"))}</span></div>
    ${zwischenrezept(a.name) ? `<button type="button" class="leise" data-a="selbst-an" data-name="${esc(a.name)}">${esc(t("selbst.machenSelbst"))}</button>` : selbstMoeglich(a) ? `<button type="button" class="leise" data-a="selbst-eigen-an" data-name="${esc(a.name)}">${esc(t("selbst.machenSelbst"))}</button>` : ""}
    <div class="chips">${(mehrArten.has(a.name) || !GEBINDE_KURZ.includes(g.art) ? GEBINDE_WAHL : GEBINDE_KURZ).map((x) => `<button type="button" class="chip klein ${g.art === x ? "an" : ""}" data-a="gebinde-art" data-name="${esc(a.name)}" data-wert="${x}">${esc(t("gebinde.arten." + x))}</button>`).join("")}${mehrArten.has(a.name) || !GEBINDE_KURZ.includes(g.art) ? "" : `<button type="button" class="chip klein" data-a="gebinde-mehr" data-name="${esc(a.name)}">…</button>`}</div>
    <div class="feldzeile"><label>${esc(t("gebinde.inhalt", artName))}</label>
      <div class="packung">
        <div class="periode">${(basis === "stk" ? EINHEITEN_JE_BASIS.stk : [...EINHEITEN_JE_BASIS[basis], "stk"]).map((e) => `<button type="button" class="${(e === "stk" && basis !== "stk" ? !!st : !st && a.packung?.einheit === e) ? "an" : ""}" data-a="packung-einheit" data-name="${esc(a.name)}" data-wert="${e}">${esc(einheitLabel(e))}</button>`).join("")}</div>
        ${st ? `<span class="stk-reihe"><input inputmode="decimal" data-f="stk-anzahl:${esc(a.name)}" value="${esc(wertAnzeige(st.anzahl))}" placeholder="40" aria-label="${esc(t("selbst.anzahl"))}"><span class="einheit">${esc(t("allgemein.stueck"))} ×</span>
        <input inputmode="decimal" data-f="stk-gewicht:${esc(a.name)}" value="${esc(wertAnzeige(st.gewicht))}" placeholder="250" aria-label="${esc(t("selbst.gewicht"))}"><span class="einheit">${esc(basis === "ml" ? t("gebinde.mlJeStueck") : t("selbst.gJeStueck"))}</span></span>`
        : `<input inputmode="decimal" data-f="packung:${esc(a.name)}" value="${esc(wertAnzeige(a.packung?.menge))}" placeholder="${esc(t("preise.menge"))}" aria-label="${esc(t("preise.menge"))}">`}
      </div></div>
    ${basis === "stk" ? `<div class="feldzeile"><label>${esc(t("gebinde.stueckGewichtFrage"))}</label><div class="packung"><input inputmode="decimal" data-f="stueckGewicht:${esc(a.name)}" value="${esc(wertAnzeige(a.stueckGewicht ?? null))}" placeholder="${esc(t("gebinde.optional"))}" aria-label="${esc(t("selbst.gewicht"))}"><span class="einheit">${esc(t("selbst.gJeStueck"))}</span></div></div>` : ""}
    <div class="feldzeile"><label>${esc(t("gebinde.preis", artName))}</label>
      <div class="packung">
        <input inputmode="decimal" data-f="preis:${esc(a.name)}" value="${esc(wertAnzeige(a.preis))}" placeholder="${esc(t("preise.preis"))}" aria-label="${esc(t("preise.preis"))}"><span class="einheit">€</span>
        <div class="seg klein">${["netto", "brutto"].map((b) => `<button type="button" class="${(a.preisBasis || "netto") === b ? "an" : ""}" data-a="preis-basis" data-name="${esc(a.name)}" data-wert="${b}">${esc(t("gebinde." + b))}</button>`).join("")}</div>
      </div></div>
    ${jeBasis !== null ? `<div class="ergebnis">${rp ? "≈ " : ""}${esc(t("gebinde.jeEinheit", fmtEuro(jeBasis, { dezimal: jeBasis < 0.1 ? 4 : jeBasis < 1 ? 3 : 2 }), einheitBasis))}${neben ? " · " + esc(neben) : ""}${p.zwischen !== null && g.zwischen ? ` · ${esc(t("gebinde.jeZwischen", fmtEuro(p.zwischen, { dezimal: 2 }), t("gebinde.arten." + g.zwischen.art)))}` : ""}</div>` : ""}
    ${zOffen ? `<div class="feldzeile"><label>${esc(t("gebinde.zwischenAnzahl", artName, t("gebinde.arten." + (g.zwischen?.art || g.zwischenArt || "beutel"))))}</label>
      <div class="chips">${ZWISCHEN_ARTEN.map((x) => `<button type="button" class="chip klein ${(g.zwischen?.art || g.zwischenArt || "beutel") === x ? "an" : ""}" data-a="zwischen-art" data-name="${esc(a.name)}" data-wert="${x}">${esc(t("gebinde.arten." + x))}</button>`).join("")}</div>
      <div class="packung"><input inputmode="decimal" data-f="zwischen:${esc(a.name)}" value="${esc(wertAnzeige(g.zwischen?.anzahl ?? null))}" placeholder="4" aria-label="${esc(t("gebinde.zwischen"))}"><span class="einheit">${esc(t("gebinde.arten." + (g.zwischen?.art || g.zwischenArt || "beutel")))}</span>
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
    // Trennung (17.10.2026): Zeichnen schreibt nicht mehr – gespeichert wird beim Betreten des Schritts (beimBetreten) und bei jeder Eingabe
    const artikel = artikelVorschau(stand).filter((a) => a.benutzt !== false);
    const gruppen = [...new Set(artikel.map((a) => a.gruppe))];
    const rpAktiv = richtpreiseAktiv({ artikel }); // Richtpreise (17.10.2026): zählen nicht als eingetragen
    const fertig = artikel.filter((a) => preisJeBasis(a) !== null).length - rpAktiv;
    const rpMoeglich = richtpreiseMoeglich({ artikel });
    return `
      <h1 class="frage">${esc(t("preise.frage"))}</h1>
      <p class="hinweis">${esc(t("preise.hinweis"))} ${esc(t("gebinde.basisHinweis"))}</p>
      <p class="tipp">${esc(t("preise.stand", fertig, artikel.length))}${rpAktiv ? " · " + esc(t("preise.richtpreis.aktiv", rpAktiv)) : ""}</p>
      ${rpMoeglich ? `<button type="button" class="knopf zweit" data-a="richtpreise-ein">${esc(t("preise.richtpreis.knopf"))}</button>
      <p class="hinweis">${esc(t("preise.richtpreis.satz"))}</p>` : ""}
      ${rpAktiv ? `<button type="button" class="leise" data-a="richtpreise-weg">${esc(t("preise.richtpreis.entfernen"))}</button>` : ""}
      ${rpMoeglich || rpAktiv ? `<button type="button" class="leise" data-a="richtpreise-quelle" aria-expanded="${rpQuelleOffen}">${esc(t("preise.richtpreis.quelleAuf"))}</button>${rpQuelleOffen ? `<p class="hinweis">${esc(t("preise.richtpreis.quelle"))}</p>` : ""}` : ""}
      ${gruppen.map((gr) => `<div class="gruppe">${esc(t("warengruppen." + gr))}</div><div class="liste">${artikel.filter((a) => a.gruppe === gr).map((a) => artikelZeile(a, artikel)).join("")}</div>`).join("")}
      <p class="hinweis">${esc(t("gebinde.lieferungSpaeter"))}</p>`;
  },
  fuss() { return knopfWeiter(); },
  beimBetreten(stand) { artikelAbgleichen(stand); }, // Trennung (17.10.2026): vorher im Zeichnen
  // Trennung (17.10.2026): vorher glich das Zeichnen die Artikelliste ab und speicherte sie. Jetzt geschieht das vor und nach jeder
  // Eingabe und Handlung dieses Schritts – gespeichert wird also dasselbe wie vorher, nur nicht mehr beim Anzeigen.
  eingabe(feld, wert, stand) {
    const [art, ...rest] = feld.split(":"); const name = rest.join(":");
    artikelAbgleichen(stand);
    if (art.startsWith("sz-")) { // Selbst gemacht (19.10.2026): Ansatz bearbeiten; neue Zutat zeichnet neu, Zahlen nicht (Fokus bleibt)
      const neu = art === "sz-neu"; selbstFeldSetzen(stand, name, art.slice(3), neu ? wert : parseZahl(wert), heute());
      artikelAbgleichen(stand); return neu;
    }
    artikelFeldSetzen(stand, name, art, parseZahl(wert), heute());
    artikelAbgleichen(stand);
  },
  aktion(name, el, stand, ctx) { artikelAbgleichen(stand); const r = preisAktion(name, el, stand, ctx); artikelAbgleichen(stand); return r; },
  beimVerlassen() { zwischenOffen = new Set(); mehrArten = new Set(); rpQuelleOffen = false; },
};
function preisAktion(name, el, stand, ctx) {
    if (name === "richtpreise-ein") { const r = richtpreiseEinsetzen(stand); ctx?.meldung?.(t("preise.richtpreis.meldung", r.gesetzt, r.ohneRichtpreis.length)); return true; } // Richtpreise (17.10.2026)
    if (name === "richtpreise-weg") { const r = richtpreiseEntfernen(stand); ctx?.meldung?.(t("preise.richtpreis.entfernt", r.entfernt)); return true; }
    if (name === "richtpreise-quelle") { rpQuelleOffen = !rpQuelleOffen; return true; }
    const a = stand.artikel.find((x) => x.name === el.dataset.name); if (!a) return false;
    if (name === "selbst-an" || name === "selbst-aus") {
      const kachel = zwischenrezept(a.name)?.kachel; if (!kachel) return false;
      selbstUmschalten(stand, kachel, name === "selbst-an"); return true;
    }
    if (name === "selbst-eigen-an" || name === "selbst-eigen-aus") { const an = name === "selbst-eigen-an"; const r = selbstEigenUmschalten(stand, a.name, an); if (an) offeneKlappen.add("selbst:" + a.name); return r; }
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
