// E7 (17.10.2026): Büro-Bereich „Verkauf je Gericht“ – Kassen-Export einlesen (Vorschau, Zuordnung per Chips, Übernehmen),
// Handeingabe für einen Tag und die Auswertung (Rang, Abgleich mit der Inventur, Ladenhüter, totes Lager, was noch fehlt).
// Nur im Büro und nur sichtbar mit Schalter (?verkauf=1 oder Beispiel-Laden) – Entwurf, bis der Eigentümer ihn freigibt.
// Rechnen tut nur js/verkauf.js; hier stehen Aufbau, Texte und data-Attribute. Nur vorhandene Klassen, kein eigenes CSS.
import { t, einheitLabel } from "../i18n.js";
import { esc, fmtEuro, fmtZahl, heuteGeschaeft, parseZahl, wertAnzeige } from "../util.js";
import { tagPlus } from "../engine.js";
import { exportEinlesen, importVorschau, importUebernehmen, importZuruecknehmen, importe, zuordnungLernen, handVerkaufSetzen, handTag, verkaufAuswertung } from "../verkauf.js";
import { datumLesbar } from "./tag.js";
import { gebindeAnzahl, mengeBasisText } from "./bausteine.js"; // Prüfgremium 17.10.2026 (8); Trennung (17.10.2026): aus ./bausteine.js
import { nav } from "./nav.js";
import { zbonLesen, zbonAendern, zbonVorschau, zbonUebernehmen } from "../zbon.js"; // Z-Bon per Foto (18.10.2026)
import { fotoVerarbeiten } from "./foto.js"; // Z-Bon per Foto: derselbe Weg wie Belegfotos (ablegen → Texterkennung)

let modus = "start";       // "start" | "vorschau" | "hand" | "zbon"
let ergebnis = null;       // gelesener Export (dsfinvkLesen)
let alleFuer = null;       // Kassentext, bei dem alle Gerichte als Chips stehen
let handDatum = null;      // gewählter Tag der Handeingabe
let entwurf = {};          // Handeingabe: gerichtId → getippter Text
// Z-Bon per Foto (18.10.2026): flüchtiger Zustand bis „Übernehmen“ – die Lesung ist ein Entwurf, nichts davon steht im Laden
let zbStatus = null;       // "lesen" | "pruefen" | "fehler"
let zbLesung = null;       // Ergebnis von zbonLesen, bearbeitet mit zbonAendern
let zbUpload = null;       // Beschreibung des abgelegten Fotos (stand.uploads)
let zbFehler = null;
let zbLauf = 0;            // jede neue Aufnahme macht ältere Ergebnisse ungültig

export const verkaufKennung = () => `${modus}:${modus === "hand" ? handDatum : modus === "zbon" ? zbStatus : ""}`;
function zbLeeren() { zbStatus = null; zbLesung = null; zbUpload = null; zbFehler = null; zbLauf += 1; }
export function verkaufZuruecksetzen() { modus = "start"; ergebnis = null; alleFuer = null; handDatum = null; entwurf = {}; zbLeeren(); }
// Zurück-Geste: aus Vorschau, Handeingabe oder Z-Bon zur Übersicht; false = den Bereich verlassen
export function verkaufZurueck() { if (modus === "start") return false; modus = "start"; ergebnis = null; entwurf = {}; zbLeeren(); return true; }

const stueck = (m) => t("verkaeufe.stueck", fmtZahl(m, Number.isInteger(m) ? 0 : 1));
const euro = (v, ca = false) => (v === null || v === undefined ? "–" : (ca ? "≈ " : "") + fmtEuro(v, { dezimal: Math.abs(v) < 100 ? 2 : 0 }));
// Trennung (17.10.2026): gemeinsame Mengen-Schreibweise (./bausteine.js), Stück wie bisher als „N Stück“
const mengeText = (menge, basis) => mengeBasisText(menge, basis, { stueck });
const was = (text) => `<p class="inv-was"><b>${esc(t("inventur.wasHeisst"))}</b> ${esc(text)}</p>`;

export function verkaufView(stand) {
  const inhalt = modus === "vorschau" && ergebnis ? vorschauView(stand) : modus === "hand" ? handView(stand) : modus === "zbon" ? zbonView(stand) : startView(stand);
  return inhalt + nav("verkauf", { schnell: false });
}

// ---------- Übersicht mit Auswertung ----------
function startView(stand) {
  const a = verkaufAuswertung(stand); const z = a.zeitraum; const vk = a.verkauf;
  const kopf = `<div class="kopfband"><h1>${esc(t("verkaeufe.titel"))}</h1><div class="unter">${esc(t("verkaeufe.unter"))}</div></div>`;
  const einlesen = `<div class="karte"><h2>${esc(t("verkaeufe.import.titel"))}</h2><p class="hinweis">${esc(t("verkaeufe.import.text"))}</p>
      <label class="knopf glut">${esc(t("verkaeufe.import.knopf"))}<input type="file" accept=".zip,.csv,.xml,application/zip,text/csv" multiple data-f="verkauf-datei" class="versteckt"></label>
      <label class="knopf zweit">${esc(t("verkaeufe.zbon.knopf"))}<input type="file" accept="image/*" capture="environment" data-f="zbon-foto" class="versteckt"></label>
      <label class="leise">${esc(t("verkaeufe.zbon.galerie"))}<input type="file" accept="image/*" data-f="zbon-foto" class="versteckt"></label>
      <p class="hinweis klein">${esc(t("verkaeufe.zbon.text"))}</p>
      <button type="button" class="knopf zweit" data-a="vk-hand">${esc(t("verkaeufe.hand.knopf"))}</button></div>`;
  const zr = `<p class="hinweis">${esc(t("verkaeufe.zeitraum", datumLesbar(z.von), datumLesbar(z.bis)))}${z.quelle === "inventur" ? " · " + esc(t("verkaeufe.zeitraumInventur")) : ""}</p>`;
  if (!(vk.menge > 0) && !vk.ohneZuordnung.menge) return `${kopf}<div class="inhalt">${einlesen}${zr}<div class="karte leer"><div>${esc(t("verkaeufe.keine"))}</div></div>${importListe(stand)}</div>`;
  // (a) Rang
  const rang = `<div class="karte"><h2>${esc(t("verkaeufe.rangTitel"))}</h2>
      ${vk.zeilen.filter((r) => r.menge > 0).map((r) => `<div class="summenzeile"><span>${r.rang}. ${esc(r.name)}</span><span class="wert">${esc(stueck(r.menge))}</span></div>`).join("")}
      ${vk.ohneZuordnung.menge ? `<div class="summenzeile"><span>${esc(t("verkaeufe.ohneGericht"))}</span><span class="wert">${esc(stueck(vk.ohneZuordnung.menge))}</span></div>` : ""}
      <div class="summenzeile gesamt"><span>${esc(t("verkaeufe.summe", vk.tage))}</span><span class="wert">${esc(stueck(vk.menge))}</span></div></div>`;
  return `${kopf}<div class="inhalt">${zr}${ehrlichView(a)}${rang}${abgleichView(a)}${ladenhueterView(a)}${einlesen}${importListe(stand)}</div>`;
}

// (c) Abgleich mit der Inventur
function abgleichView(a) {
  const g = a.abgleich;
  if (!g || g.gleicherTag) return `<div class="karte hinweisgelb"><p>${esc(t("verkaeufe.ohneInventur"))}</p><button type="button" class="knopf zweit" data-a="nav" data-wert="inventur">${esc(t("verkaeufe.inventurKnopf"))}</button></div>`;
  const zeile = (x, text) => `<div class="summenzeile"><span><b>${esc(x.name)}</b><br><small>${esc(text)}</small></span><span class="wert">${esc(x.diffWert === null ? t("inventur.preisFehlt") : euro(Math.abs(x.diffWert), x.geschaetzt))}</span></div>`;
  const gruppe = (status, klasse, titel, erkl) => { const l = g.zeilen.filter((x) => x.status === status); if (!l.length) return "";
    return `<div class="karte ${klasse}"><h2>${esc(titel)}</h2>${l.map((x) => zeile(x, t("verkaeufe.abgleichZeile", mengeText(x.ist, x.basis), mengeText(x.erwartet, x.basis), mengeText(x.diff, x.basis)))).join("")}</div>${was(erkl)}`; };
  return `<h2 class="inv-ue">${esc(t("verkaeufe.abgleichTitel"))}</h2>
    ${was(t("verkaeufe.abgleichText"))}
    ${gruppe("schwund", "hinweisrot", t("verkaeufe.schwundTitel"), t("verkaeufe.schwundText"))}
    ${gruppe("einkaufFehlt", "hinweisgelb", t("verkaeufe.einkaufFehltTitel"), t("verkaeufe.einkaufFehltText"))}
    ${gruppe("weniger", "hinweisgelb", t("verkaeufe.wenigerTitel"), t("verkaeufe.wenigerText"))}
    ${g.zaehl.unklar ? `<p class="hinweis">${esc(t("verkaeufe.unklar", g.zaehl.unklar))}</p>` : ""}
    ${g.zaehl.nichtGezaehlt ? `<p class="hinweis">${esc(t("verkaeufe.nichtGezaehlt", g.zaehl.nichtGezaehlt))}</p>` : ""}
    ${g.eimerKg > 0 ? `<p class="hinweis">${esc(t("verkaeufe.eimer", fmtZahl(g.eimerKg, 1)))}</p>` : ""}
    <div class="karte"><div class="summenzeile"><span>${esc(t("verkaeufe.alleOk", g.zaehl.ok))}</span><span class="wert">${g.zaehl.ok}</span></div></div>`;
}

// (d) Ladenhüter und totes Lager
function ladenhueterView(a) {
  const l = a.ladenhueter; if (l.ohneDaten) return "";
  const ger = l.gerichte.length ? `<div class="karte"><h2>${esc(t("verkaeufe.ladenhueterTitel"))}</h2>${l.gerichte.map((x) => `<div class="summenzeile"><span>${esc(x.name)}</span><span class="wert">${esc(x.art === "keinVerkauf" ? t("verkaeufe.keinVerkauf") : t("verkaeufe.wenig", stueck(x.menge)))}</span></div>`).join("")}</div>${was(t("verkaeufe.ladenhueterText"))}` : "";
  const tot = l.totesLager.length ? `<div class="karte"><h2>${esc(t("verkaeufe.totTitel"))}</h2>${l.totesLager.map((x) => `<div class="summenzeile"><span>${esc(x.name)}<br><small>${esc(gebindeAnzahl(x.menge, x.gebinde))}</small></span><span class="wert">${esc(x.wert === null ? t("inventur.preisFehlt") : euro(x.wert, x.geschaetzt))}</span></div>`).join("")}
      <div class="summenzeile gesamt"><span>${esc(t("verkaeufe.totSumme"))}</span><span class="wert">${esc(euro(l.gebunden, l.geschaetzt))}</span></div></div>${was(t("verkaeufe.totText"))}` : "";
  return ger + tot;
}

// (e) Was noch fehlt – ausdrücklich
function ehrlichView(a) {
  const e = a.ehrlich; const zeilen = [];
  if (e.mengeOhneZuordnung > 0) zeilen.push(t("verkaeufe.ohneZuordnung", fmtZahl(e.anteilMengeOhne * 100, 0), e.texteOhne.slice(0, 4).map((x) => x.text).join(", ")));
  if (e.ohneRezept.length) zeilen.push(t("verkaeufe.ohneRezept", e.ohneRezept.map((x) => x.name).join(", ")));
  if (e.probleme.length) zeilen.push(t("verkaeufe.probleme", [...new Set(e.probleme.map((x) => x.name).filter(Boolean))].slice(0, 6).join(", ")));
  if (e.ohnePreis.length) zeilen.push(t("verkaeufe.ohnePreis", e.ohnePreis.slice(0, 6).join(", ")));
  if (e.geschaetzt.length) zeilen.push(t("verkaeufe.geschaetzt", e.geschaetzt.length));
  if (e.tageOhneVerkauf.length) zeilen.push(t("verkaeufe.tageOhne", e.tageOhneVerkauf.length));
  if (e.tageDoppelt) zeilen.push(t("verkaeufe.doppelt", e.tageDoppelt));
  if (!zeilen.length) return `<p class="hinweis">${esc(t("verkaeufe.allesDa"))}</p>`;
  return `<div class="karte hinweisgelb"><h2>${esc(t("verkaeufe.ehrlichTitel"))}</h2>${zeilen.map((x) => `<p>${esc(x)}</p>`).join("")}</div>`;
}

function importListe(stand) {
  const l = importe(stand).filter((x) => x.herkunft !== "hand").slice(0, 5); if (!l.length) return "";
  return `<div class="karte"><h2>${esc(t("verkaeufe.importeTitel"))}</h2>${l.map((x) => `<div class="summenzeile"><span>${esc(t("verkaeufe.herkunft." + x.herkunft))}<br><small>${esc(t("verkaeufe.importZeile", x.tage.length, datumLesbar(x.tage[0]), datumLesbar(x.tage[x.tage.length - 1])))}</small></span>
      <button type="button" class="leise" data-a="vk-import-zurueck" data-id="${esc(x.importId)}">${esc(t("verkaeufe.zuruecknehmen"))}</button></div>`).join("")}</div>`;
}

// ---------- Vorschau nach dem Einlesen ----------
function vorschauView(stand) {
  const v = importVorschau(stand, ergebnis); const b = v.bericht || {};
  const kopf = `<div class="kopfband"><h1>${esc(t("verkaeufe.vorschau.titel"))}</h1><div class="unter">${esc(stand.betrieb.name || "")}</div></div>`;
  if (!v.positionen.length) {
    const grund = (b.fehler || []).some((f) => f === "datei:gepackt") ? t("verkaeufe.vorschau.gepackt") : (b.fehler || []).includes("keineLines") ? t("verkaeufe.vorschau.fehlerLines") : t("verkaeufe.vorschau.leer");
    return `${kopf}<div class="inhalt"><div class="karte hinweisrot"><p>${esc(grund)}</p></div><button type="button" class="knopf zweit" data-a="vk-abbrechen">${esc(t("verkaeufe.vorschau.abbrechen"))}</button></div>`;
  }
  const nicht = Object.entries(b.nichtArtikel || {}); const artNicht = nicht.filter(([k]) => !k.startsWith("bonTyp:")); const bonNicht = nicht.filter(([k]) => k.startsWith("bonTyp:"));
  const sumZeilen = (l) => l.reduce((s, [, x]) => s + x.zeilen, 0);
  const bericht = [
    b.stornoZeilen ? t("verkaeufe.vorschau.storno", b.stornoZeilen) : "", b.positionsStorno ? t("verkaeufe.vorschau.posStorno", b.positionsStorno) : "",
    bonNicht.length ? t("verkaeufe.vorschau.bonNicht", sumZeilen(bonNicht)) : "", artNicht.length ? t("verkaeufe.vorschau.artNicht", sumZeilen(artNicht), fmtEuro(artNicht.reduce((s, [, x]) => s + x.betrag, 0), { dezimal: 2 })) : "",
    b.ohneBonkopf ? t("verkaeufe.vorschau.ohneBonkopf") : "", b.punktStattKomma ? t("verkaeufe.vorschau.punkt") : "", b.ohneMenge ? t("verkaeufe.vorschau.ohneMenge", b.ohneMenge) : "", b.ohneDatum ? t("verkaeufe.vorschau.ohneDatum", b.ohneDatum) : "",
  ].filter(Boolean);
  const chipsFuer = (o) => chipsZuordnen(stand, o);
  const offen = v.offen.length ? `<h2 class="inv-ue">${esc(t("verkaeufe.vorschau.offenTitel"))}</h2><p class="hinweis">${esc(t("verkaeufe.vorschau.offenText"))}</p>
      ${v.offen.map((o) => `<div class="zeile offen"><div class="oben"><div class="name">${esc(o.text)}<small>${esc(stueck(o.menge))}${o.plu ? ` · ${esc(t("verkaeufe.vorschau.nummer", o.plu))}` : ""}</small></div><b>${esc(o.umsatzBrutto ? fmtEuro(o.umsatzBrutto, { dezimal: 2 }) : "")}</b></div>${chipsFuer(o)}</div>`).join("")}` : "";
  return `${kopf}<div class="inhalt">
    <div class="karte"><div class="summenzeile"><span>${esc(t("verkaeufe.vorschau.tage", v.tage.length))}</span><span class="wert">${esc(datumLesbar(v.von))} – ${esc(datumLesbar(v.bis))}</span></div>
      <div class="summenzeile"><span>${esc(t("verkaeufe.vorschau.positionen"))}</span><span class="wert">${v.positionen.length}</span></div>
      <div class="summenzeile"><span>${esc(t("verkaeufe.vorschau.zugeordnet"))}</span><span class="wert">${v.zugeordnet}</span></div>
      <div class="summenzeile"><span>${esc(t("verkaeufe.vorschau.offen"))}</span><span class="wert">${v.offenAnzahl}</span></div></div>
    ${v.gleich ? `<p class="hinweis">${esc(t("verkaeufe.vorschau.gleich", v.gleich))}</p>` : ""}${v.ersetzt ? `<p class="hinweis">${esc(t("verkaeufe.vorschau.ersetzt", v.ersetzt))}</p>` : ""}
    ${bericht.length ? `<div class="karte"><h2>${esc(t("verkaeufe.vorschau.nichtGezaehlt"))}</h2>${bericht.map((x) => `<p class="hinweis">${esc(x)}</p>`).join("")}</div>` : ""}
    ${offen}
    <button type="button" class="knopf glut" data-a="vk-uebernehmen">${esc(t("verkaeufe.vorschau.uebernehmen"))}</button>
    <button type="button" class="leise" data-a="vk-abbrechen">${esc(t("verkaeufe.vorschau.abbrechen"))}</button></div>`;
}

// Chips zum Zuordnen eines Kassentexts (E7, gleiche Lern-Logik für Kassen-Export und Z-Bon)
function chipsZuordnen(stand, o) {
  const gerichte = stand.gerichte || []; const key = (o.plu || "") + "|" + o.text; const ids = alleFuer === key ? gerichte.map((g) => g.id) : o.vorschlaege;
  return `<div class="chips">${ids.map((id) => { const g = gerichte.find((x) => x.id === id); return g ? `<button type="button" class="chip klein" data-a="vk-zuordnen" data-text="${esc(o.text)}" data-plu="${esc(o.plu || "")}" data-id="${esc(id)}">${esc(g.name)}</button>` : ""; }).join("")}
      ${alleFuer === key ? "" : `<button type="button" class="chip klein leise" data-a="vk-alle" data-text="${esc(o.text)}" data-plu="${esc(o.plu || "")}">${esc(t("verkaeufe.vorschau.alle"))}</button>`}</div>`;
}

// ---------- Z-Bon per Foto (18.10.2026) ----------
// Foto → erkannte Zeilen (änderbar, entfernbar, unsicher markiert) → Zuordnung per Chips → Übernehmen als Herkunft "zbon" für den Tag.
const GRUND = { ocr: "lesefehler", preis: "preis", menge: "menge", mengeVorn: "menge", name: "name", geteilt: "geteilt", ohneBetrag: "ohneBetrag", neu: "neu" };
function zbonView(stand) {
  const kopf = `<div class="kopfband"><h1>${esc(t("verkaeufe.zbon.titel"))}</h1><div class="unter">${esc(t("verkaeufe.zbon.unter"))}</div></div>`;
  if (zbStatus === "lesen") return `${kopf}<div class="inhalt"><div class="fotolauf" role="status" aria-live="polite"><div class="kreisel" aria-hidden="true"></div><h2 class="frage">${esc(t("verkaeufe.zbon.lesen"))}</h2><p class="hinweis">${esc(t("verkaeufe.zbon.lesenHinweis"))}</p>
      <button type="button" class="leise" data-a="vk-abbrechen">${esc(t("verkaeufe.vorschau.abbrechen"))}</button></div></div>`;
  if (zbStatus === "fehler" || !zbLesung) return `${kopf}<div class="inhalt"><div class="karte hinweisrot"><p>${esc(zbFehler || t("verkaeufe.zbon.nichts"))}</p></div>
      <label class="knopf glut">${esc(t("verkaeufe.zbon.nochmal"))}<input type="file" accept="image/*" capture="environment" data-f="zbon-foto" class="versteckt"></label>
      <button type="button" class="leise" data-a="vk-abbrechen">${esc(t("verkaeufe.vorschau.abbrechen"))}</button></div>`;
  const L = zbLesung; const v = zbonVorschau(stand, L); const H = heuteGeschaeft();
  const tag = `<div class="karte"><div class="feldzeile"><label for="vk-zb-datum">${esc(t("verkaeufe.zbon.tag"))}</label><input id="vk-zb-datum" class="textfeld" type="date" data-f="zb-datum" value="${esc(L.datum || "")}" max="${esc(H)}"></div>
      ${!L.datum ? `<p class="hinweis">${esc(t("verkaeufe.zbon.ohneDatum"))}</p>` : L.vortag && !L.datumVonHand ? `<p class="hinweis">${esc(t("verkaeufe.zbon.vortag"))}</p>` : ""}
      ${L.zNr ? `<div class="summenzeile"><span>${esc(t("verkaeufe.zbon.zNr"))}</span><span class="wert">${esc(L.zNr)}</span></div>` : ""}</div>`;
  const pruef = L.pruefung === "passt" ? `<p class="hinweis">✓ ${esc(t("verkaeufe.zbon.passt"))}</p>`
    : L.pruefung === "passtMitPfand" ? `<p class="hinweis">✓ ${esc(t("verkaeufe.zbon.passtPfand", fmtEuro(L.pfand, { dezimal: 2 })))}</p>`
    : L.pruefung === "abweichung" ? `<div class="karte hinweisrot"><p>${esc(t("verkaeufe.zbon.abweichung", fmtEuro(Math.abs(L.abweichung), { dezimal: 2 }), L.abweichung > 0))}</p></div>`
    : `<div class="karte hinweisgelb"><p>${esc(t("verkaeufe.zbon.ohneSumme"))}</p></div>`;
  const summe = `<div class="karte"><div class="summenzeile"><span>${esc(t("verkaeufe.zbon.summeZeilen"))}</span><span class="wert">${esc(fmtEuro(L.summePositionen, { dezimal: 2 }))}</span></div>
      <div class="summenzeile"><span>${esc(t("verkaeufe.zbon.summeBon"))}</span><div class="betrag klein"><input inputmode="decimal" data-f="zb-bonsumme" value="${esc(L.bonSumme === null ? "" : fmtZahl(L.bonSumme, 2))}" placeholder="0,00" aria-label="${esc(t("verkaeufe.zbon.summeBon"))}"><span class="einheit">€</span></div></div></div>${pruef}`;
  const unsicher = L.zeilen.filter((z) => z.unsicher).length;
  const zeilen = L.zeilen.map((z) => `<div class="zeile ${z.unsicher ? "offen" : ""}">
      <div class="oben"><div class="name"><input class="textfeld" data-f="zb:${esc(z.id)}:text" value="${esc(z.text)}" maxlength="120" aria-label="${esc(t("verkaeufe.zbon.kassentext"))}">
        <small>${z.storno ? esc(t("verkaeufe.zbon.storno")) + " · " : ""}${z.unsicher ? `<b>${esc(t("verkaeufe.zbon.pruefen", [...new Set(z.gruende.map((g) => GRUND[g]).filter(Boolean))].map((g) => t("verkaeufe.zbon.grund." + g)).join(", ")))}</b>` : ""}${z.roh ? `${z.unsicher ? " · " : ""}${esc(t("verkaeufe.zbon.gelesen", z.roh.trim().slice(0, 60)))}` : ""}</small></div>
        <button type="button" class="fvx" data-a="vk-zb-weg" data-id="${esc(z.id)}" aria-label="${esc(t("verkaeufe.zbon.entfernen"))}: ${esc(z.text)}">✕</button></div>
      <div class="fvreihe"><div class="betrag klein"><input inputmode="decimal" data-f="zb:${esc(z.id)}:menge" value="${esc(z.menge === null ? "" : wertAnzeige(Math.abs(z.menge)))}" placeholder="0" aria-label="${esc(t("verkaeufe.zbon.menge"))}"><span class="einheit">${esc(t("verkaeufe.zbon.stk"))}</span></div>
        <div class="betrag klein"><input inputmode="decimal" data-f="zb:${esc(z.id)}:betrag" value="${esc(z.betrag === null ? "" : fmtZahl(Math.abs(z.betrag), 2))}" placeholder="0,00" aria-label="${esc(t("verkaeufe.zbon.betrag"))}"><span class="einheit">€</span></div></div></div>`).join("");
  const offen = v.offen.length ? `<h2 class="inv-ue">${esc(t("verkaeufe.vorschau.offenTitel"))}</h2><p class="hinweis">${esc(t("verkaeufe.vorschau.offenText"))}</p>
      ${v.offen.map((o) => `<div class="zeile offen"><div class="oben"><div class="name">${esc(o.text)}<small>${esc(stueck(o.menge))}${o.plu ? ` · ${esc(t("verkaeufe.vorschau.nummer", o.plu))}` : ""}</small></div><b>${esc(o.umsatzBrutto ? fmtEuro(o.umsatzBrutto, { dezimal: 2 }) : "")}</b></div>${chipsZuordnen(stand, o)}</div>`).join("")}` : "";
  const frage = v.frage ? `<div class="karte hinweisgelb"><p>${esc(t("verkaeufe.zbon.frage"))}</p><div class="chips">
      <button type="button" class="chip klein ${v.zweite ? "an" : ""}" data-a="vk-zb-zweite" data-wert="1" aria-pressed="${v.zweite}">${esc(t("verkaeufe.zbon.fragJa"))}</button>
      <button type="button" class="chip klein ${v.zweite ? "" : "an"}" data-a="vk-zb-zweite" data-wert="0" aria-pressed="${!v.zweite}">${esc(t("verkaeufe.zbon.fragNein"))}</button></div></div>` : "";
  const hinweise = [v.addiert ? t("verkaeufe.zbon.addiert") : "", v.ersetzt && !v.addiert ? t("verkaeufe.zbon.ersetzt") : "", v.gleich ? t("verkaeufe.zbon.gleich") : "", v.kasseDa ? t("verkaeufe.zbon.kasseZaehlt") : ""].filter(Boolean);
  const geht = !!L.datum && v.positionen.length > 0;
  return `${kopf}<div class="inhalt">${tag}${summe}
    <h2 class="inv-ue">${esc(t("verkaeufe.zbon.zeilenTitel", L.zeilen.length))}</h2>${unsicher ? `<p class="hinweis">${esc(t("verkaeufe.zbon.unsicher", unsicher))}</p>` : ""}
    ${zeilen}<button type="button" class="leise" data-a="vk-zb-neu">${esc(t("verkaeufe.zbon.zeileDazu"))}</button>
    ${offen}
    ${frage}${hinweise.map((x) => `<p class="hinweis">${esc(x)}</p>`).join("")}
    <p class="hinweis klein">${esc(t("verkaeufe.zbon.keineBuchhaltung"))}</p>
    <button type="button" class="knopf glut" data-a="vk-zb-uebernehmen" ${geht ? "" : "disabled"}>${esc(t("verkaeufe.vorschau.uebernehmen"))}</button>
    <button type="button" class="leise" data-a="vk-abbrechen">${esc(t("verkaeufe.vorschau.abbrechen"))}</button></div>`;
}
// Foto gewählt: ablegen und lesen (screens/foto.js fotoVerarbeiten – Ablage Zweck "zbon", Texterkennung im Arbeitsfaden), dann zerlegen
export async function verkaufZbonFoto(stand, datei, neuZeichnen, { geraet = null } = {}) {
  const mein = ++zbLauf; modus = "zbon"; zbStatus = "lesen"; zbLesung = null; zbUpload = null; zbFehler = null; alleFuer = null; neuZeichnen();
  const lauf = await fotoVerarbeiten(stand, datei, "zbon", () => { if (mein === zbLauf) neuZeichnen(); }, { geraet });
  if (mein !== zbLauf || modus !== "zbon") return null; // abgebrochen oder neues Foto
  return verkaufZbonText(lauf?.status === "fertig" ? lauf.text : null, lauf?.upload || null, lauf?.status === "fehler" ? lauf.fehler : null);
}
// Text (aus der Texterkennung) → Vorschau. Auch für den Browser-Durchlauf, wenn die echte Erkennung zu langsam ist.
export function verkaufZbonText(text, upload = null, fehler = null) {
  modus = "zbon"; zbUpload = upload;
  if (fehler || !text || !String(text).trim()) { zbStatus = "fehler"; zbFehler = fehler || t("verkaeufe.zbon.nichts"); zbLesung = null; return null; }
  zbLesung = zbonLesen(text, { heuteTag: heuteGeschaeft() });
  if (!zbLesung.zeilen.length) { zbStatus = "fehler"; zbFehler = t("verkaeufe.zbon.keineZeilen"); return zbLesung; }
  zbStatus = "pruefen"; return zbLesung;
}

// ---------- Handeingabe ----------
function handView(stand) {
  const H = heuteGeschaeft(); const d = handDatum || tagPlus(H, -1);
  const da = handTag(stand, d);
  const tage = [0, 1, 2, 3, 4, 5, 6].map((n) => tagPlus(H, -n));
  return `<div class="kopfband"><h1>${esc(t("verkaeufe.hand.titel"))}</h1><div class="unter">${esc(t("verkaeufe.hand.text"))}</div></div>
    <div class="inhalt">
      <div class="feldzeile"><label for="vk-hand-datum">${esc(t("verkaeufe.hand.tag"))}</label><input id="vk-hand-datum" class="textfeld" type="date" data-f="vk-hand-datum" value="${esc(d)}" max="${esc(H)}"></div>
      <div class="chips">${tage.map((x) => `<button type="button" class="chip klein ${x === d ? "an" : ""}" data-a="vk-hand-tag" data-wert="${esc(x)}" aria-pressed="${x === d}">${esc(datumLesbar(x))}</button>`).join("")}</div>
      ${(stand.gerichte || []).map((g) => { const wert = g.id in entwurf ? entwurf[g.id] : da[g.id] ? wertAnzeige(da[g.id]) : "";
        return `<div class="zeile ${da[g.id] ? "an" : ""}"><div class="oben"><div class="name">${esc(g.name)}</div><div class="betrag klein"><input inputmode="decimal" data-f="vk-hand:${esc(g.id)}" value="${esc(wert)}" placeholder="0" aria-label="${esc(t("verkaeufe.stueck", g.name))}"></div></div></div>`; }).join("")}
      <button type="button" class="knopf glut" data-a="vk-hand-speichern">${esc(t("verkaeufe.hand.speichern"))}</button>
      <button type="button" class="leise" data-a="vk-abbrechen">${esc(t("verkaeufe.vorschau.abbrechen"))}</button>
    </div>`;
}

// ---------- Aktionen ----------
// Rückgabe: false (nicht meine) | true (neu zeichnen) | { speichern: true, meldung? }
export function verkaufAktion(name, el, stand, wurzel, { frage = (x) => confirm(x) } = {}) {
  if (name === "vk-hand") { modus = "hand"; handDatum = tagPlus(heuteGeschaeft(), -1); entwurf = {}; return true; }
  if (name === "vk-abbrechen") { modus = "start"; ergebnis = null; entwurf = {}; alleFuer = null; zbLeeren(); return true; }
  if (name === "vk-zb-weg") { zbLesung = zbonAendern(zbLesung, el.dataset.id, "weg"); return true; }
  if (name === "vk-zb-zweite") { zbLesung = zbonAendern(zbLesung, null, "zweite", el.dataset.wert === "1"); return true; }
  if (name === "vk-zb-neu") { zbLesung = zbonAendern(zbLesung, null, "neu"); return true; }
  if (name === "vk-zb-uebernehmen") {
    if (!zbLesung || modus !== "zbon") return false;
    const r = zbonUebernehmen(stand, zbLesung, { upload: zbUpload, geraet: wurzel?.geraet || null });
    if (!r.neu && !r.gleich) return { speichern: false, meldung: t(r.fehler.includes("datum") ? "verkaeufe.zbon.ohneDatum" : "verkaeufe.zbon.keineZeilen") };
    modus = "start"; zbLeeren(); alleFuer = null;
    return { speichern: true, meldung: r.neu ? t("verkaeufe.zbon.uebernommen", r.neu) : t("verkaeufe.vorschau.nichtsNeu") };
  }
  if (name === "vk-hand-tag") { handDatum = el.dataset.wert; entwurf = {}; return true; }
  if (name === "vk-alle") { alleFuer = (el.dataset.plu || "") + "|" + el.dataset.text; return true; }
  if (name === "vk-zuordnen") { zuordnungLernen(stand, { text: el.dataset.text, plu: el.dataset.plu || null }, el.dataset.id || null); alleFuer = null; return { speichern: true, meldung: t("verkaeufe.vorschau.gelernt") }; }
  if (name === "vk-uebernehmen") {
    if (!ergebnis) return false;
    const r = importUebernehmen(stand, ergebnis, { herkunft: "dsfinvk", geraet: wurzel?.geraet || null });
    modus = "start"; ergebnis = null; alleFuer = null;
    return { speichern: true, meldung: r.neu ? t("verkaeufe.vorschau.uebernommen", r.neu, r.tage) : t("verkaeufe.vorschau.nichtsNeu") };
  }
  if (name === "vk-import-zurueck") { if (!frage(t("verkaeufe.zurueckFrage"))) return false; const n = importZuruecknehmen(stand, el.dataset.id); return n ? { speichern: true, meldung: t("verkaeufe.zurueckGemacht") } : false; }
  if (name === "vk-hand-speichern") {
    const d = handDatum || tagPlus(heuteGeschaeft(), -1); let n = 0;
    for (const [id, text] of Object.entries(entwurf)) { const m = String(text).trim() === "" ? null : parseZahl(text); if (m === null && String(text).trim() !== "") continue; if (handVerkaufSetzen(stand, d, id, m, { geraet: wurzel?.geraet || null })) n += 1; }
    entwurf = {}; modus = "start";
    return { speichern: true, meldung: n ? t("verkaeufe.hand.gespeichert", n) : t("verkaeufe.hand.leer") };
  }
  return false;
}
export function verkaufEingabe(feld, wert) {
  if (feld === "zb-datum") { if (/^\d{4}-\d{2}-\d{2}$/.test(String(wert)) && String(wert) <= heuteGeschaeft()) { zbLesung = zbonAendern(zbLesung, null, "datum", String(wert)); return "zeichnen"; } return false; }
  if (feld === "zb-bonsumme") { zbLesung = zbonAendern(zbLesung, null, "bonSumme", wert); return "entwurf"; }
  { const m = /^zb:([^:]+):(text|menge|betrag)$/.exec(String(feld)); if (m) { zbLesung = zbonAendern(zbLesung, m[1], m[2], wert); return "entwurf"; } }
  if (feld === "vk-hand-datum") { if (/^\d{4}-\d{2}-\d{2}$/.test(String(wert)) && String(wert) <= heuteGeschaeft()) { handDatum = String(wert); entwurf = {}; return "zeichnen"; } return false; }
  if (String(feld).startsWith("vk-hand:")) { entwurf[String(feld).slice(8)] = String(wert || "").slice(0, 8); return "entwurf"; }
  return false;
}
// Datei(en) gewählt: lesen und die Vorschau zeigen
export async function verkaufDatei(stand, dateien) {
  ergebnis = await exportEinlesen(dateien); modus = "vorschau"; alleFuer = null;
  return ergebnis;
}
