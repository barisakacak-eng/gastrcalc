// Drei Ebenen (15.10.2026, Entwickler B): Laden „Karte“ – Fotoraster der Gerichte (2 Spalten): Foto, Name, Preis, Ampelpunkt.
// Oben „Alle | Zu billig · n“. Tipp auf ein Gericht → Preis-Blatt: alter Preis durchgestrichen, großer neuer Preis mit −/+ in 10-Cent-Schritten
// (Tipp auf die Zahl = tippen), „Bleibt dir“ = Deckungsbeitrag je Stück mit Ampelpunkt, „Speichern“.
// Kein Rezept, kein Wareneinsatz, keine Kosten – das wohnt im Büro (Ansicht „kartebuero“, karte.js-Schritte). Gerechnet wird nur im Rechenwerk.
import { t } from "../i18n.js";
import { esc, fmtEuro, fmtZahl, parseZahl, wertAnzeige } from "../util.js";
import { kalkulation, preisAmpel, preisAufteilung } from "../engine.js";
import { verkaufspreisSetzen } from "../karte_daten.js"; // Trennung (17.10.2026)
import { gerichtBild } from "./vergleich.js";
import { nav } from "./nav.js";
import { sym } from "../symbole.js";

const ERSTE = 60; // so viele Kacheln sofort; der Rest auf Tipp („Alle zeigen“) – lange Karten bleiben schnell
const PUNKT = { gruen: "g", gelb: "y", rot: "r", grau: "grau" };
// Zwei Linien-Symbole, die symbole.js (noch) nicht hat – gleiche Machart (Lucide, 24er Raster)
const PFAD = { minus: '<path d="M5 12h14"/>', plus: '<path d="M5 12h14"/><path d="M12 5v14"/>' };
const zeichen = (n) => `<svg class="sym" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${PFAD[n]}</svg>`;

let filter = "alle";      // "alle" | "billig"
let alle = false;         // mehr als ERSTE Kacheln zeigen
let blatt = null;         // { id, preis (Entwurf, brutto), alt }
export const karteLadenKennung = () => filter; // Blatt auf/zu ändert die Kennung nicht – die Scrollposition im Raster bleibt
export function karteLadenZuruecksetzen() { filter = "alle"; alle = false; blatt = null; }
export const karteLadenBlattOffen = () => !!blatt;
// Zurück-Geste: erst das Blatt schließen
export function karteLadenZurueck() { if (blatt) { blatt = null; return true; } return false; }

const lastVon = (stand) => kalkulation(stand).last;
const zeilenVon = (stand) => { const k = kalkulation(stand); const m = new Map(k.zeilen.map((z) => [z.id, z])); return stand.gerichte.map((g) => ({ g, z: m.get(g.id) })).filter((x) => x.z); };
const zuBillig = (x) => x.z.ampel === "rot";
const cent = (v) => Math.round(v * 100) / 100;
// Eine Zahl nach allen Kosten, mit Vorzeichen (Baris 27.10.2026, B): „+ 2,10 €“ oder „− 0,80 €“
const vorzeichen = (v) => v > 0.004 ? "+ " : v < -0.004 ? "− " : "";

export function karteLadenView(stand) {
  const liste = zeilenVon(stand); const billig = liste.filter(zuBillig).length;
  if (filter === "billig" && !billig) filter = "alle";
  const sicht = filter === "billig" ? liste.filter(zuBillig) : liste;
  const zeig = alle ? sicht : sicht.slice(0, ERSTE);
  // Facelift 1.0: das eigentliche Versprechen direkt sichtbar – was nach ALLEN Kosten je Portion bleibt.
  // Gewinn, Quote und Ampel stammen vollständig aus engine.preisAmpel, niemals aus eigenem Bildschirm-Rechnen.
  // Grau bleibt grau, wenn die Kalkulationsgrundlage fehlt; fremde Schätzwerte werden mit ≈ markiert.
  const unsicher = kalkulation(stand).geschaetzt;
  const kachel = (x) => {
    const a = preisAmpel(x.z, x.z.preisBrutto);
    const valid = a.gewinn !== null && a.quote !== null;
    const unscharf = unsicher || x.z.warenGeschaetzt || x.z.warenRichtpreis;
    const betrag = valid ? `${unscharf ? "≈ " : ""}${vorzeichen(a.gewinn)}${fmtEuro(Math.abs(a.gewinn), { dezimal: 2 })}` : "–";
    const prozent = valid ? `${fmtZahl(Math.round(a.quote * 100), 0)} %` : "–"; // nur für Vorlesehilfe; sichtbar ist eine Zahl (Baris 27.10.2026, B)
    return `<button type="button" class="karte kl-gericht a-${a.ampel} ${a.ampel === "rot" ? "rotrand" : ""}" data-a="kl-auf" data-id="${esc(x.g.id)}" aria-label="${esc(x.g.name)}, ${esc(t("kartelaeden.preis"))} ${x.z.preisBrutto === null ? "–" : fmtEuro(x.z.preisBrutto, { dezimal: 2 })}, ${esc(t("kartelaeden.bleibt"))} ${betrag}, ${prozent}, ${esc(t("kartelaeden.ampel." + a.ampel))}">
      ${gerichtBild(x.g)}<span class="kl-gt">
        <span class="kl-gn">${esc(x.g.name)}</span>
        <span class="kl-gp"><b>${x.z.preisBrutto === null ? "–" : fmtEuro(x.z.preisBrutto, { dezimal: 2 })}</b><i class="kl-punkt ${PUNKT[a.ampel]}" aria-label="${esc(t("kartelaeden.ampel." + a.ampel))}"></i></span>
        <span class="kl-nutzen ${valid ? "hat-wert" : "ohne-wert"}"><b>${betrag}</b></span>
      </span></button>`;
  };
  return `
    <div class="inhalt kartelaeden">
      <div class="kl-kopf"><h1>${esc(t("kartelaeden.titel"))}</h1><small>${esc(t("kartelaeden.anzahl", liste.length))}</small></div>
      ${!liste.length ? "" : liste.every((x) => x.z.sk === null) ? `<p class="kl-legende">${esc(t("kartelaeden.ohnePreise"))}</p><button type="button" class="knopf zweit" data-a="nav" data-wert="kartebuero">${esc(t("kartelaeden.rezeptKnopf"))}</button>` : `<p class="kl-legende">${esc(t("kartelaeden.legende"))}</p>`}${""/* Persona-Test Vater 27.10.: ohne Preise nur „–“ ohne Grund */}
      ${zekiZeile(liste, unsicher)}
      ${!liste.length ? `<div class="karte kl-leer"><b>${esc(t("kartelaeden.leer"))}</b><button type="button" class="knopf glut" data-a="nav" data-wert="kartefoto">${sym("camera")} ${esc(t("kartelaeden.fotografieren"))}</button></div>` : `
      <div class="kl-segment" role="tablist">
        <button type="button" role="tab" aria-selected="${filter === "alle"}" class="${filter === "alle" ? "an" : ""}" data-a="kl-filter" data-wert="alle">${esc(t("kartelaeden.alle"))}</button>
        <button type="button" role="tab" aria-selected="${filter === "billig"}" class="${filter === "billig" ? "an" : ""}" data-a="kl-filter" data-wert="billig" ${billig ? "" : "disabled"}><i class="kl-punkt r klein" aria-hidden="true"></i>${esc(t("kartelaeden.zuBillig", billig))}</button>
      </div>
      <div class="kl-raster">${zeig.map(kachel).join("")}</div>
      ${zeig.length < sicht.length ? `<button type="button" class="knopf zweit" data-a="kl-alle">${esc(t("kartelaeden.mehr", sicht.length - zeig.length))}</button>` : ""}`}
    </div>
    ${blatt ? karteLadenBlatt(stand) : ""}
    ${nav("karte")}`;
}

// Zeki in einem Satz (Baris 26.10.2026 23:52): Grün ruhig, Gelb leise, Rot hervorgehoben mit „Anschauen?“ – nicht bei jedem Gericht.
function zekiZeile(liste, unsicher) {
  const mit = liste.map((x) => ({ x, a: preisAmpel(x.z, x.z.preisBrutto) })).filter((y) => y.a.gewinn !== null && y.a.quote !== null);
  if (!mit.length) return "";
  const rot = mit.filter((y) => y.a.ampel === "rot").sort((p, q) => p.a.gewinn - q.a.gewinn)[0];
  const gelb = mit.filter((y) => y.a.ampel === "gelb").sort((p, q) => p.a.quote - q.a.quote)[0];
  const gut = [...mit].sort((p, q) => q.a.gewinn - p.a.gewinn)[0];
  const y = rot || gelb || gut; const art = rot ? "rot" : gelb ? "gelb" : "gruen";
  const betrag = `${unsicher || y.x.z.warenGeschaetzt || y.x.z.warenRichtpreis ? "≈\u00a0" : ""}${fmtEuro(Math.abs(y.a.gewinn), { dezimal: 2 })}`;
  const satz = t("kartelaeden.zeki." + (art === "rot" && y.a.gewinn >= 0 ? "gelb" : art), y.x.g.name, betrag); // Persona-Test Vater 27.10.: „Minus“ nur bei echtem Verlust
  return art === "gruen" ? `<p class="kl-zeki a-gruen" role="status">${esc(satz)}</p>`
    : `<button type="button" class="kl-zeki a-${art}" data-a="kl-auf" data-id="${esc(y.x.g.id)}">${esc(satz)}</button>`;
}

// „Bleibt dir“-Zeile (19.10.2026): Gewinn nach allen Kosten je Stück und in %, Punkt in Ampelfarbe (engine.preisAmpel);
// darunter „Wohin geht dein Preis?“ – Balken aus Ware, Personal, Miete, Nebenkosten, Steuer, Gewinn (engine.preisAufteilung).
const TEILE = ["ware", "personal", "miete", "neben", "steuer", "gewinn"];
// 27.10.2026 Fehler (Baris-Foto 23:49): Beim Tippen wurde nur „Bleibt dir“ ersetzt, „Wohin geht dein Preis?“ blieb stehen → dreifach. Jetzt eine Hülle für beides.
function bleibtZeile(z, preis, last) { return `<div class="kl-bleibt-teil">${bleibtInnen(z, preis, last)}</div>`; }
function bleibtInnen(z, preis, last) {
  const a = preisAmpel(z, preis);
  const zeile = `<div class="kl-bleibt a-${a.ampel}"><span>${esc(t("kartelaeden.bleibt"))}<small>${esc(t("kartelaeden.nachAllem"))}</small></span><b>${a.gewinn === null ? "–" : vorzeichen(a.gewinn) + fmtEuro(Math.abs(a.gewinn), { dezimal: 2 })}<i class="kl-punkt ${PUNKT[a.ampel]}" aria-label="${esc(t("kartelaeden.ampel." + a.ampel))}"></i></b></div>`;
  const tl = preisAufteilung(z, last, preis);
  if (!tl || !(preis > 0)) return zeile;
  const breite = (v) => Math.max(0, v) / preis * 100;
  // Details nur auf Tipp (Baris 27.10.2026, B): zu, bis der Chef „Wohin geht dein Preis?“ antippt
  return zeile + `<details class="kl-wohin"><summary>${esc(t("kartelaeden.wohin"))}</summary>
    <div class="kl-balken" aria-hidden="true">${TEILE.map((k) => breite(tl[k]) > 0.4 ? `<i class="t-${k}" style="width:${breite(tl[k]).toFixed(1)}%"></i>` : "").join("")}</div>
    <ul class="kl-teile">${TEILE.map((k) => `<li class="t-${k}${k === "gewinn" && tl.gewinn < 0 ? " minus" : ""}"><i></i><span>${esc(t("kartelaeden.teil." + k))}</span><b>${fmtEuro(tl[k], { dezimal: 2 })}</b></li>`).join("")}</ul></details>`;
}
export function karteLadenBlatt(stand) {
  if (!blatt) return "";
  const x = zeilenVon(stand).find((y) => y.g.id === blatt.id); if (!x) { blatt = null; return ""; }
  const geaendert = blatt.alt === null || cent(blatt.alt) !== cent(blatt.preis);
  return `<div class="kl-dimmer" data-a="kl-zu"></div>
    <div class="kl-blatt" role="dialog" aria-modal="true" aria-label="${esc(x.g.name)}">
      <span class="kl-griff" aria-hidden="true"></span>
      <div class="kl-preiskopf">${gerichtBild(x.g)}<div><b>${esc(x.g.name)}</b>${geaendert && blatt.alt !== null ? `<s>${fmtEuro(blatt.alt, { dezimal: 2 })}</s>` : ""}</div>
        <button type="button" class="kl-x" data-a="kl-zu" aria-label="${esc(t("kartelaeden.schliessen"))}">${sym("x")}</button></div>
      <div class="kl-preisrad">
        <button type="button" class="kl-rund" data-a="kl-minus" aria-label="−0,10 €" ${blatt.preis <= 0 ? "disabled" : ""}>${zeichen("minus")}</button>
        <label class="kl-gross"><input inputmode="decimal" data-f="kl-preis" value="${esc(wertAnzeige(blatt.preis.toFixed(2)))}" aria-label="${esc(t("kartelaeden.preis"))}" autocomplete="off"><span>€</span></label>
        <button type="button" class="kl-rund" data-a="kl-plus" aria-label="+0,10 €">${zeichen("plus")}</button>
      </div>
      ${bleibtZeile(x.z, blatt.preis, lastVon(stand))}
      ${x.z.sk === null ? `<p class="kl-ohne">${esc(t(x.z.warenFehlt?.[0] === "rezept" ? "kartelaeden.ohneRezept" : "kartelaeden.ohnePreise"))}</p><button type="button" class="knopf zweit" data-a="nav" data-wert="kartebuero">${esc(t("kartelaeden.rezeptKnopf"))}</button>` : ""}
      <button type="button" class="knopf glut kl-speichern" data-a="kl-speichern" ${geaendert && blatt.preis > 0 ? "" : "disabled"}>${esc(t("kartelaeden.speichern"))}</button>
    </div>`;
}

// Aktionen: true = neu zeichnen, "blatt" = nur das Blatt neu, { gespeichert } = Preis übernommen (app.js speichert und meldet)
export function karteLadenAktion(name, el, stand) {
  if (name === "kl-filter") { filter = el.dataset.wert === "billig" ? "billig" : "alle"; return true; }
  if (name === "kl-alle") { alle = true; return true; }
  if (name === "kl-auf") {
    const g = stand.gerichte.find((x) => x.id === el.dataset.id); if (!g) return false;
    const z = zeilenVon(stand).find((y) => y.g.id === g.id)?.z;
    const alt = typeof g.preis === "number" ? g.preis : null;
    blatt = { id: g.id, alt, preis: alt ?? (z?.zielBrutto ?? 0) }; return true;
  }
  if (name === "kl-zu") { blatt = null; return true; }
  if (!blatt) return false;
  if (name === "kl-minus") { blatt.preis = Math.max(0, cent(blatt.preis - 0.1)); return "blatt"; }
  if (name === "kl-plus") { blatt.preis = Math.min(999, cent(blatt.preis + 0.1)); return "blatt"; }
  if (name === "kl-speichern") {
    const g = stand.gerichte.find((x) => x.id === blatt.id); if (!g || !(blatt.preis > 0)) return false;
    const vorher = g.preis; verkaufspreisSetzen(stand, g.id, cent(blatt.preis)); blatt = null;
    return { gespeichert: true, id: g.id, vorher, preis: g.preis };
  }
  return false;
}
// Tippen in die große Zahl: nur den Entwurf ändern; app.js tauscht danach die „Bleibt dir“-Zeile und den Knopf aus (Fokus bleibt).
export function karteLadenEingabe(feld, wert) {
  if (feld !== "kl-preis" || !blatt) return false;
  const n = parseZahl(wert); if (n === null || n < 0 || n > 999) return false;
  blatt.preis = cent(n); return "teil";
}
// Teile des Blatts, die sich beim Tippen ändern (ohne das Eingabefeld)
export function karteLadenTeile(stand) {
  if (!blatt) return null;
  const x = zeilenVon(stand).find((y) => y.g.id === blatt.id); if (!x) return null;
  const geaendert = blatt.alt === null || cent(blatt.alt) !== cent(blatt.preis);
  return { bleibt: bleibtZeile(x.z, blatt.preis, lastVon(stand)), speichernAn: geaendert && blatt.preis > 0 };
}
