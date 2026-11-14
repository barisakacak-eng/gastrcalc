// Getränke (18.10.2026): Büro-Bereich „Getränke“ – je Getränk Größe/Ausschank, wie verkauft (Dose, Glasflasche, PET, Glas offen, Becher), Marke,
// Pfand (nur Info), Lieferant; offene Getränke mit Großgebinde und Schankverlust; „Neues Getränk“ mit markenneutralen Katalog-Vorlagen.
// Rechnen und Schreiben: js/getraenk.js und js/getraenk_feld.js. Hier nur Aufbau, Texte, data-Attribute und vorhandene CSS-Klassen.
// Personal-Modus: nicht erreichbar (modus.js), Handlungen „gt-…“ sind dort zusätzlich gesperrt.
import { t, artikelText } from "../i18n.js";
import { esc, fmtEuro, fmtZahl, parseZahl } from "../util.js";
import { getraenkeListe, getraenkHinweise, getraenkSetzen, getraenkAnlegen, grossgebindeWahl, GETRAENK_VORLAGEN } from "../getraenk.js";
import { GEBINDE_VERKAUF, GROESSEN, literText, literEingabe } from "../getraenk_feld.js";
import { nav } from "./nav.js";

// flüchtiger Bildschirmzustand: offenes Formular { id | "neu", werte: { … als Text } }
let form = null;
export const getraenkeKennung = () => (form ? form.id : "");
export function getraenkeZuruecksetzen() { form = null; }
export function getraenkeZurueck() { if (!form) return false; form = null; return true; }

const was = (text) => `<p class="inv-was"><b>${esc(t("inventur.wasHeisst"))}</b> ${esc(text)}</p>`;
const ue = (text) => `<h2 class="inv-ue">${esc(text)}</h2>`;
const euro = (x, ca) => (ca ? "≈ " : "") + fmtEuro(x, { dezimal: 2 });
const eingabeZahl = (x, d = 2) => (x === null || x === undefined ? "" : fmtZahl(x, d).replace(/,?0+$/, "").replace(/,$/, ""));

export function getraenkeView(stand) {
  const kopf = `<div class="kopfband"><h1>${esc(t("getraenke.titel"))}</h1><div class="unter">${esc(t("getraenke.unter"))}</div></div>`;
  const liste = getraenkeListe(stand);
  if (form) return `${kopf}<div class="inhalt">${formView(stand, liste)}</div>${nav("getraenke", { schnell: false })}`;
  const hinweise = getraenkHinweise(liste);
  const hinweisView = hinweise.length ? `<div class="karte hinweisgelb" data-gt-hinweise="${hinweise.length}"><h2>${esc(t("getraenke.hinweisTitel"))}</h2>${hinweise.flatMap((h) => h.fehlt.map((f) => `<p>${esc(t("getraenke.fehlt." + f, h.name))}</p>`)).join("")}</div>` : "";
  const zeile = (x) => {
    const teile = [x.offen ? "" : x.mengeText || t("getraenke.ohneGroesse"), x.gebinde ? t("getraenke.art." + x.gebinde) : "", x.offen ? t("getraenke.offenAus", x.mengeText, artikelText(x.quelle)) : "", x.marke].filter(Boolean);
    const ware = x.waren !== null ? t(x.offen ? "getraenke.jeGlas" : "getraenke.jeStueck", euro(x.waren, x.warenGeschaetzt)) : t("getraenke.warePreisFehlt");
    const zusatz = [x.pfand ? t("getraenke.pfandKurz", euro(x.pfand)) : "", x.lieferant ? x.lieferant : "", x.offen && x.schankverlust ? t("getraenke.schankKurz", Math.round(x.schankverlust * 100)) : ""].filter(Boolean);
    return `<div class="summenzeile" data-getraenk="${esc(x.id)}"><span><b>${esc(x.name)}</b><br><small>${esc(teile.join(" · "))}</small><br><small>${esc([ware, ...zusatz].join(" · "))}</small></span>
      <span class="wert"><button type="button" class="leise klein" data-a="gt-auf" data-wert="${esc(x.id)}">${esc(t("getraenke.aendern"))}</button></span></div>`;
  };
  const listeView = liste.length ? `<div class="karte">${liste.map(zeile).join("")}</div>` : `<div class="karte leer"><div>${esc(t("getraenke.leer"))}</div></div>`;
  return `${kopf}<div class="inhalt">${hinweisView}${ue(t("getraenke.listeTitel"))}${listeView}
    <button type="button" class="knopf zweit" data-a="gt-neu">${esc(t("getraenke.neu"))}</button>${was(t("getraenke.was"))}</div>${nav("getraenke", { schnell: false })}`;
}

// Formular: ändern (id) oder neu ("neu"). Werte als Text bis „Speichern“; Chips setzen Werte direkt im Entwurf.
function formView(stand, liste) {
  const neu = form.id === "neu"; const w = form.werte; const x = neu ? null : liste.find((y) => y.id === form.id);
  const chip = (aktion, wert, an, text) => `<button type="button" class="chip klein ${an ? "an" : ""}" data-a="${aktion}" data-wert="${esc(wert)}" aria-pressed="${an}">${esc(text)}</button>`;
  const feld = (f, label, wert, { dezimal = false, platz = "" } = {}) => `<div class="feldzeile"><label for="gt-${f}">${esc(label)}</label><input id="gt-${f}" class="textfeld" type="text"${dezimal ? ' inputmode="decimal"' : ""} data-f="gt-${f}" value="${esc(wert ?? "")}"${platz ? ` placeholder="${esc(platz)}"` : ""}></div>`;
  const offen = w.gebinde === "offen" || (w.gebinde === "becher" && !!w.quelle);
  const gross = grossgebindeWahl(stand);
  const vorlagen = neu ? `<div class="feldzeile"><label>${esc(t("getraenke.ausKatalog"))}</label><div class="chips">${GETRAENK_VORLAGEN.map((v) => chip("gt-vorlage", v.name, w.vorlage === v.name, v.name)).join("")}</div></div>` : "";
  const quelleFeld = w.gebinde === "offen" || w.gebinde === "becher" ? `<div class="feldzeile"><label for="gt-quelle">${esc(t("getraenke.quelle"))}</label>
      <select id="gt-quelle" class="textfeld" data-f="gt-quelle"><option value="">${esc(w.gebinde === "becher" ? t("getraenke.quelleFertig") : "–")}</option>${[...new Set([...gross, ...(w.quelle ? [w.quelle] : [])])].map((n) => `<option value="${esc(n)}"${n === w.quelle ? " selected" : ""}>${esc(artikelText(n))}</option>`).join("")}</select></div>
      ${!gross.length && !w.quelle ? `<p class="hinweis">${esc(t("getraenke.quelleKeine"))}</p>` : ""}` : "";
  const offenFelder = offen ? `${feld("flasche", t("getraenke.flasche"), w.flasche, { dezimal: true, platz: "1,5" })}${feld("schank", t("getraenke.schankverlust"), w.schank, { dezimal: true, platz: "0" })}<p class="hinweis">${esc(t("getraenke.schankHinweis"))}</p>` : "";
  return `${ue(t(neu ? "getraenke.neuTitel" : "getraenke.aendernTitel"))}<div class="karte" data-gt-form="${esc(form.id)}"><h2>${esc(neu ? t("getraenke.neuTitel") : x?.name || "")}</h2>
    ${vorlagen}${neu ? feld("name", t("getraenke.name"), w.name) + feld("preis", t("getraenke.preis"), w.preis, { dezimal: true }) : ""}
    <div class="feldzeile"><label>${esc(t("getraenke.gebinde"))}</label><div class="chips">${GEBINDE_VERKAUF.map((g) => chip("gt-gebinde", g, w.gebinde === g, t("getraenke.art." + g))).join("")}</div></div>
    <div class="feldzeile"><label for="gt-menge">${esc(t("getraenke.groesse"))}</label><div class="chips">${GROESSEN.map((l) => chip("gt-groesse", String(l), literEingabe(w.menge) === l, literText(l))).join("")}</div>
      <input id="gt-menge" class="textfeld" type="text" inputmode="decimal" data-f="gt-menge" value="${esc(w.menge ?? "")}" placeholder="0,33"></div>
    ${quelleFeld}${offenFelder}
    ${feld("marke", t("getraenke.marke"), w.marke, { platz: t("getraenke.markePlatz") })}
    ${feld("pfand", t("getraenke.pfand"), w.pfand, { dezimal: true, platz: "0,15" })}<p class="hinweis">${esc(t("getraenke.pfandHinweis"))}</p>
    ${feld("lieferant", t("getraenke.lieferant"), w.lieferant)}${!neu && x?.lieferantAusBeleg ? `<small class="marke">${esc(t("getraenke.lieferantBeleg"))}</small>` : ""}
    <button type="button" class="knopf glut" data-a="${neu ? "gt-anlegen" : "gt-speichern"}">${esc(t(neu ? "getraenke.anlegen" : "getraenke.speichern"))}</button>
    <button type="button" class="leise" data-a="gt-zu">${esc(t("getraenke.abbrechen"))}</button></div>`;
}

const werteVon = (x) => ({ menge: x.menge ? eingabeZahl(x.menge, 3) : "", gebinde: x.gebinde, quelle: x.quelle || "", flasche: x.flasche ? eingabeZahl(x.flasche, 3) : "", schank: x.schankverlust ? eingabeZahl(x.schankverlust * 100, 1) : "",
  marke: x.marke || "", pfand: x.pfand ? eingabeZahl(x.pfand, 2) : "", lieferant: x.lieferantAusBeleg ? "" : x.lieferant || "" });
// Text → Felder für getraenkSetzen/getraenkAnlegen. undefined = ungültig (Meldung), null = leer
function felderAus(w) {
  const zahl = (s) => { const v = String(s ?? "").trim(); if (!v) return null; const n = parseZahl(v); return n === null ? undefined : n; };
  const menge = literEingabe(w.menge); const flasche = literEingabe(w.flasche); const pfand = zahl(w.pfand); const schank = zahl(w.schank);
  const offen = w.gebinde === "offen" || w.gebinde === "becher";
  const quelle = offen ? w.quelle || null : null;
  const f = { menge, gebinde: w.gebinde || null, marke: w.marke || "", pfand, lieferant: w.lieferant || "", quelle,
    ...(quelle ? { flasche, schankverlust: schank === null ? 0 : schank === undefined ? undefined : schank / 100 } : {}) };
  const falsch = Object.entries(f).find(([, v]) => v === undefined);
  return falsch ? { falsch: falsch[0] === "schankverlust" ? "schankverlust" : falsch[0] } : { f };
}

// Handlungen. Rückgabe: false (nicht meine) | true (neu zeichnen) | { speichern?, meldung? }
export function getraenkeAktion(name, el, stand) {
  if (name === "gt-auf") { const x = getraenkeListe(stand).find((y) => y.id === el.dataset.wert); if (!x) return false; form = { id: x.id, werte: werteVon(x) }; return true; }
  if (name === "gt-neu") { form = { id: "neu", werte: { name: "", preis: "", menge: "", gebinde: null, quelle: "", flasche: "", schank: "", marke: "", pfand: "", lieferant: "", vorlage: null } }; return true; }
  if (name === "gt-zu") { form = null; return true; }
  if (!form) return false;
  if (name === "gt-gebinde") { form = { ...form, werte: { ...form.werte, gebinde: el.dataset.wert } }; return true; }
  if (name === "gt-groesse") { form = { ...form, werte: { ...form.werte, menge: eingabeZahl(Number(el.dataset.wert), 3) } }; return true; }
  if (name === "gt-vorlage") { const v = GETRAENK_VORLAGEN.find((x) => x.name === el.dataset.wert); if (!v) return false;
    form = { ...form, werte: { ...form.werte, vorlage: v.name, name: v.name, menge: eingabeZahl(v.menge, 3), gebinde: v.gebinde, quelle: v.quelle || "" } }; return true; }
  if (name === "gt-speichern" || name === "gt-anlegen") {
    const r0 = felderAus(form.werte); if (r0.falsch) return { meldung: t("getraenke.fehler." + (r0.falsch in FEHLER ? r0.falsch : "menge")) };
    if (name === "gt-speichern") { const r = getraenkSetzen(stand, form.id, r0.f); if (!r.ok) return { meldung: t("getraenke.fehler." + r.grund) }; form = null; return { speichern: true, meldung: t("getraenke.gespeichert") }; }
    const preisText = String(form.werte.preis || "").trim(); const preis = preisText ? parseZahl(preisText) : null; if (preisText && preis === null) return { meldung: t("getraenke.fehler.preis") };
    const r = getraenkAnlegen(stand, { ...r0.f, name: form.werte.name, preis, ...(r0.f.quelle ? {} : { quelle: null }) });
    if (!r.ok) return { meldung: t("getraenke.fehler." + r.grund) }; form = null; return { speichern: true, meldung: t("getraenke.angelegt") };
  }
  return false;
}
const FEHLER = { name: 1, doppelt: 1, menge: 1, quelle: 1, quelleEinheit: 1, schankverlust: 1, pfand: 1, flasche: 1, gericht: 1, preis: 1 };
// Eingaben: nur Entwurf (kein Neuzeichnen beim Tippen); die Auswahl des Großgebindes zeichnet neu (Felder für offen)
export function getraenkeEingabe(feld, wert) {
  if (!form || !String(feld).startsWith("gt-")) return false;
  const k = String(feld).slice(3); if (!["name", "preis", "menge", "quelle", "flasche", "schank", "marke", "pfand", "lieferant"].includes(k)) return false;
  form = { ...form, werte: { ...form.werte, [k]: String(wert ?? "").slice(0, 80) } };
  return k === "quelle" ? "zeichnen" : "entwurf";
}
