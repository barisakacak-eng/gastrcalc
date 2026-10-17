// Trennung (17.10.2026), Punkt 4: Büro-Bildschirm „Ware nach Kühl-Abweichung“. Für jede offene Abweichung der letzten 30 Tage
// entscheidet der Inhaber: weggeworfen (wird wie im Rundgang als Müll gebucht – Wert zum Einkaufspreis, Ware) oder behalten (mit Begründung).
// Erreichbar über den Büro-Hinweis „kuehlMassnahme“ (js/offen.js). Rechnen und Schreiben: js/engine.js (offeneWareEntscheidungen,
// wareWegZeile, wareWegwerfen, wareBehalten). Nur vorhandene Klassen, kein eigenes CSS. Personal-Modus: nicht erreichbar (modus.js), Handlungen gesperrt.
import { t, artikelText } from "../i18n.js";
import { esc, fmtEuro, fmtZahl, parseZahl, wertAnzeige, heute } from "../util.js";
import { offeneWareEntscheidungen, abweichungStand, wareWegZeile, wareWegwerfen, wareBehalten } from "../engine.js";
import { kuehlstelleAnzeige as kn } from "../kuehlname.js";
import { normalisieren, suchRang } from "../data/suchnamen.js";
import { datumLesbar, zeitKurz } from "./tag.js";
import { nav } from "./nav.js";

let offen = null;   // { id: Messung, art: "weg" | "behalten" } – die gerade geöffnete Entscheidung (flüchtig)
let weg = [];       // Entwurf „weggeworfen“: [{ name, ref, menge, einheit, wert }]
let wegName = "", wegMenge = null, grund = "";

export const kuehlWareKennung = () => (offen ? `${offen.id}:${offen.art}` : "");
export function kuehlWareZuruecksetzen() { offen = null; weg = []; wegName = ""; wegMenge = null; grund = ""; }
// Zurück-Geste: erst die offene Entscheidung schließen; false = den Bereich verlassen
export function kuehlWareZurueck() { if (!offen) return false; kuehlWareZuruecksetzen(); return true; }

const stelleName = (stand, id) => { const k = (stand.kuehlstellen || []).find((x) => x.id === id); return k ? kn(k) : "?"; };
const mengeText = (w) => `${fmtZahl(w.menge, w.einheit === "stk" ? 0 : 2)} ${w.einheit === "stk" ? t("allgemein.stueck") : w.einheit}`;

export function kuehlWareView(stand) {
  const kopf = `<div class="kopfband"><h1>${esc(t("kuehlWare.titel"))}</h1><div class="unter">${esc(t("kuehlWare.unter"))}</div></div>`;
  const liste = offeneWareEntscheidungen(stand, { heuteTag: heute() });
  if (offen && !liste.some((m) => m.id === offen.id)) kuehlWareZuruecksetzen();
  const inhalt = liste.length ? liste.map((m) => karte(stand, m)).join("") : `<div class="karte leer"><div>${esc(t("kuehlWare.leer"))}</div></div>`;
  return `${kopf}<div class="inhalt">${inhalt}</div>${nav("kuehlware", { schnell: false })}`;
}

function karte(stand, m) {
  const status = abweichungStand(stand, m);
  const kopf = `<h2>${esc(stelleName(stand, m.stelle))} · ${esc(fmtZahl(m.wert, Number.isInteger(m.wert) ? 0 : 1))} °C</h2>
    <p class="hinweis">${esc(datumLesbar(m.datum))}${m.zeit ? ` · ${esc(zeitKurz(m.zeit))}` : ""} · ${esc(t("amtW2.abw." + status))}</p>`;
  if (offen?.id !== m.id) return `<div class="karte hinweisrot">${kopf}
    <button type="button" class="knopf zweit" data-a="kw-weg" data-id="${esc(m.id)}">${esc(t("kuehlWare.wegwerfen"))}</button>
    <button type="button" class="knopf zweit" data-a="kw-behalten" data-id="${esc(m.id)}">${esc(t("kuehlWare.behalten"))}</button></div>`;
  return `<div class="karte">${kopf}${offen.art === "weg" ? wegForm(stand, m) : behaltenForm()}
    <button type="button" class="leise" data-a="kw-zu">${esc(t("kuehlWare.abbrechen"))}</button></div>`;
}

function wegForm(stand, m) {
  const summe = weg.reduce((s, w) => s + (w.wert || 0), 0);
  return `<p><b>${esc(t("kuehlWare.wegFrage"))}</b></p>
    ${weg.length ? `<div class="liste eng">${weg.map((w, i) => `<div class="zeile"><div class="oben"><div class="name">${esc(artikelText(w.name))}<small>${esc(mengeText(w))} · ${esc(w.wert === null ? t("tag.keinPreis") : fmtEuro(w.wert, { dezimal: 2 }))}</small></div><button type="button" class="leise" data-a="kw-zeile-weg" data-i="${i}">×</button></div></div>`).join("")}</div>`
      : `<p class="hinweis">${esc(t("kuehlWare.wegLeer"))}</p>`}
    <div class="neu"><input class="textfeld" data-f="kw-name" value="${esc(artikelText(wegName))}" maxlength="60" placeholder="${esc(t("kuehl.wegPlatzhalter"))}" autocomplete="off"><input class="textfeld" inputmode="decimal" data-f="kw-menge" value="${esc(wertAnzeige(wegMenge))}" placeholder="${esc(t("kuehl.menge"))}" autocomplete="off"></div>
    ${wegName.trim() ? `<div class="chips">${(stand.artikel || []).filter((a) => suchRang(a.name, normalisieren(wegName.trim())) >= 0).slice(0, 6).map((a) => `<button type="button" class="chip klein" data-a="kw-artikel" data-name="${esc(a.name)}">${esc(artikelText(a.name))}</button>`).join("")}</div>` : ""}
    <div class="chips"><button type="button" class="chip klein" data-a="kw-hinzu">${esc(t("allgemein.hinzufuegen"))}</button><button type="button" class="chip klein" data-a="kw-alles">${esc(t("kuehl.wegAlles", stelleName(stand, m.stelle)))}</button></div>
    ${summe > 0 ? `<div class="summenzeile gesamt"><span>${esc(t("kuehlWare.wert"))}</span><span class="wert">${esc(fmtEuro(summe, { dezimal: 2 }))}</span></div>` : ""}
    <button type="button" class="knopf" data-a="kw-weg-speichern" ${weg.length ? "" : "disabled"}>${esc(t("kuehlWare.wegSpeichern"))}</button>`;
}

function behaltenForm() {
  return `<div class="feldzeile"><label>${esc(t("kuehlWare.grundFrage"))}</label>
    <input class="textfeld" data-f="kw-grund" value="${esc(grund)}" maxlength="200" placeholder="${esc(t("kuehlWare.grundPlatzhalter"))}" autocomplete="off"></div>
    <button type="button" class="knopf" data-a="kw-behalten-speichern" ${grund.trim().length >= 3 ? "" : "disabled"}>${esc(t("kuehlWare.grundSpeichern"))}</button>`;
}

// ---------- Handlungen ----------
// Rückgabe: false (nicht meine) | true (neu zeichnen) | { speichern: true, meldung }
export function kuehlWareAktion(name, el, stand) {
  if (name === "kw-weg" || name === "kw-behalten") { kuehlWareZuruecksetzen(); offen = { id: el.dataset.id, art: name === "kw-weg" ? "weg" : "behalten" }; return true; }
  if (name === "kw-zu") { kuehlWareZuruecksetzen(); return true; }
  if (!offen) return false;
  if (name === "kw-artikel") { wegName = el.dataset.name; return true; }
  if (name === "kw-hinzu") { const z = wareWegZeile(stand, wegName, wegMenge); if (!z) return false; weg = [...weg, z]; wegName = ""; wegMenge = null; return true; }
  if (name === "kw-alles") {
    const m = (stand.messungen || []).find((x) => x.id === offen.id); if (!m) return false;
    const n = t("kuehl.inhaltVon", stelleName(stand, m.stelle)); weg = [...weg, wareWegZeile(stand, n, 1)]; return true;
  }
  if (name === "kw-zeile-weg") { weg = weg.filter((_, i) => i !== Number(el.dataset.i)); return true; }
  if (name === "kw-weg-speichern") {
    const m = (stand.messungen || []).find((x) => x.id === offen.id); if (!m) return false;
    const r = wareWegwerfen(stand, m.id, weg, { grund: t("kuehl.schwundGrund", stelleName(stand, m.stelle)) });
    if (!r) return false; kuehlWareZuruecksetzen(); return { speichern: true, meldung: t("kuehlWare.gebucht") };
  }
  if (name === "kw-behalten-speichern") {
    if (grund.trim().length < 3) return { meldung: t("kuehlWare.grundKurz") };
    const r = wareBehalten(stand, offen.id, grund); if (!r) return false;
    kuehlWareZuruecksetzen(); return { speichern: true, meldung: t("kuehlWare.behaltenOk") };
  }
  return false;
}
// Eingaben: nur der Entwurf. "knopf" = nur den Speichern-Knopf schalten (Fokus bleibt), true = neu zeichnen (Vorschläge zur Ware)
export function kuehlWareEingabe(feld, wert, stand) {
  if (feld === "kw-name") { const treffer = (stand?.artikel || []).find((x) => artikelText(x.name) === String(wert).trim()); wegName = treffer ? treffer.name : String(wert); return true; }
  if (feld === "kw-menge") { wegMenge = parseZahl(wert); return false; }
  if (feld === "kw-grund") { grund = String(wert).slice(0, 200); return "knopf"; }
  return false;
}
export const kuehlWareGrundGueltig = () => grund.trim().length >= 3;
