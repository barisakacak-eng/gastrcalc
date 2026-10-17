// E7 (17.10.2026): Büro-Bereich „Verkauf je Gericht“ – Kassen-Export einlesen (Vorschau, Zuordnung per Chips, Übernehmen),
// Handeingabe für einen Tag und die Auswertung (Rang, Abgleich mit der Inventur, Ladenhüter, totes Lager, was noch fehlt).
// Nur im Büro und nur sichtbar mit Schalter (?verkauf=1 oder Beispiel-Laden) – Entwurf, bis der Eigentümer ihn freigibt.
// Rechnen tut nur js/verkauf.js; hier stehen Aufbau, Texte und data-Attribute. Nur vorhandene Klassen, kein eigenes CSS.
import { t, einheitLabel } from "../i18n.js";
import { esc, fmtEuro, fmtZahl, heuteGeschaeft, parseZahl, wertAnzeige } from "../util.js";
import { tagPlus } from "../engine.js";
import { exportEinlesen, importVorschau, importUebernehmen, importZuruecknehmen, importe, zuordnungLernen, handVerkaufSetzen, handTag, verkaufAuswertung } from "../verkauf.js";
import { datumLesbar } from "./tag.js";
import { nav } from "./nav.js";

let modus = "start";       // "start" | "vorschau" | "hand"
let ergebnis = null;       // gelesener Export (dsfinvkLesen)
let alleFuer = null;       // Kassentext, bei dem alle Gerichte als Chips stehen
let handDatum = null;      // gewählter Tag der Handeingabe
let entwurf = {};          // Handeingabe: gerichtId → getippter Text

export const verkaufKennung = () => `${modus}:${modus === "hand" ? handDatum : ""}`;
export function verkaufZuruecksetzen() { modus = "start"; ergebnis = null; alleFuer = null; handDatum = null; entwurf = {}; }
// Zurück-Geste: aus Vorschau oder Handeingabe zur Übersicht; false = den Bereich verlassen
export function verkaufZurueck() { if (modus === "start") return false; modus = "start"; ergebnis = null; entwurf = {}; return true; }

const stueck = (m) => t("verkaeufe.stueck", fmtZahl(m, Number.isInteger(m) ? 0 : 1));
const euro = (v, ca = false) => (v === null || v === undefined ? "–" : (ca ? "≈ " : "") + fmtEuro(v, { dezimal: Math.abs(v) < 100 ? 2 : 0 }));
// Menge in der Basiseinheit lesbar: ab 1000 g → kg, ab 1000 ml → l
function mengeText(menge, basis) {
  const m = Math.abs(menge);
  if (basis === "g") return m >= 1000 ? `${fmtZahl(m / 1000, 1)} ${einheitLabel("kg")}` : `${fmtZahl(m, 0)} ${einheitLabel("g")}`;
  if (basis === "ml") return m >= 1000 ? `${fmtZahl(m / 1000, 1)} ${einheitLabel("l")}` : `${fmtZahl(m, 0)} ${einheitLabel("ml")}`;
  return stueck(Math.round(m * 10) / 10);
}
const was = (text) => `<p class="inv-was"><b>${esc(t("inventur.wasHeisst"))}</b> ${esc(text)}</p>`;

export function verkaufView(stand) {
  const inhalt = modus === "vorschau" && ergebnis ? vorschauView(stand) : modus === "hand" ? handView(stand) : startView(stand);
  return inhalt + nav("verkauf", { schnell: false });
}

// ---------- Übersicht mit Auswertung ----------
function startView(stand) {
  const a = verkaufAuswertung(stand); const z = a.zeitraum; const vk = a.verkauf;
  const kopf = `<div class="kopfband"><h1>${esc(t("verkaeufe.titel"))}</h1><div class="unter">${esc(t("verkaeufe.unter"))}</div></div>`;
  const einlesen = `<div class="karte"><h2>${esc(t("verkaeufe.import.titel"))}</h2><p class="hinweis">${esc(t("verkaeufe.import.text"))}</p>
      <label class="knopf glut">${esc(t("verkaeufe.import.knopf"))}<input type="file" accept=".zip,.csv,.xml,application/zip,text/csv" multiple data-f="verkauf-datei" class="versteckt"></label>
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
  const tot = l.totesLager.length ? `<div class="karte"><h2>${esc(t("verkaeufe.totTitel"))}</h2>${l.totesLager.map((x) => `<div class="summenzeile"><span>${esc(x.name)}<br><small>${esc(fmtZahl(x.menge, Number.isInteger(x.menge) ? 0 : 2) + " " + t("gebinde.arten." + x.gebinde))}</small></span><span class="wert">${esc(x.wert === null ? t("inventur.preisFehlt") : euro(x.wert, x.geschaetzt))}</span></div>`).join("")}
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
  const gerichte = stand.gerichte || [];
  const chipsFuer = (o) => { const key = (o.plu || "") + "|" + o.text; const ids = alleFuer === key ? gerichte.map((g) => g.id) : o.vorschlaege;
    return `<div class="chips">${ids.map((id) => { const g = gerichte.find((x) => x.id === id); return g ? `<button type="button" class="chip klein" data-a="vk-zuordnen" data-text="${esc(o.text)}" data-plu="${esc(o.plu || "")}" data-id="${esc(id)}">${esc(g.name)}</button>` : ""; }).join("")}
      ${alleFuer === key ? "" : `<button type="button" class="chip klein leise" data-a="vk-alle" data-text="${esc(o.text)}" data-plu="${esc(o.plu || "")}">${esc(t("verkaeufe.vorschau.alle"))}</button>`}</div>`; };
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
  if (name === "vk-abbrechen") { modus = "start"; ergebnis = null; entwurf = {}; alleFuer = null; return true; }
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
  if (feld === "vk-hand-datum") { if (/^\d{4}-\d{2}-\d{2}$/.test(String(wert)) && String(wert) <= heuteGeschaeft()) { handDatum = String(wert); entwurf = {}; return "zeichnen"; } return false; }
  if (String(feld).startsWith("vk-hand:")) { entwurf[String(feld).slice(8)] = String(wert || "").slice(0, 8); return "entwurf"; }
  return false;
}
// Datei(en) gewählt: lesen und die Vorschau zeigen
export async function verkaufDatei(stand, dateien) {
  ergebnis = await exportEinlesen(dateien); modus = "vorschau"; alleFuer = null;
  return ergebnis;
}
