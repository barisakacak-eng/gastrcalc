// Lieferanten (18.10.2026): Büro-Bereich „Lieferanten“ – Liste, Bearbeiten (Liefertage oder Abholung, Bestellschluss, Lieferzeit,
// Mindestbestellwert, Bestellweg mit Nummer/Adresse, Kundennummer, Notiz) und „Waren zuordnen“ (Haupt- und Zweitlieferant je Ware).
// Rechnen und Schreiben: js/lieferant.js (Stammdaten, Termine) und js/bestand.js (Sätze). Hier nur Aufbau, Texte, data-Attribute
// und vorhandene CSS-Klassen. Einstieg im Büro und aus „Lager & Bestellen“. Personal-Modus: nicht erreichbar, Handlungen „lf-…“ gesperrt.
// Datenschutz: Nummer/Adresse, Kundennummer und Notiz bleiben auf dem Gerät (js/lieferant.js) – der Bildschirm sagt das beim Feld.
import { sym } from "../symbole.js";
import { t, artikelText } from "../i18n.js";
import { esc, fmtEuro, parseZahl, heuteGeschaeft } from "../util.js";
import { LIEFERANT_ARTEN, LIEFER_MODI, BESTELLWEGE, WOCHE, VORHER_WAHL, lieferantenAktiv, lieferantMitId, liefertermine, lieferantWaren, lieferantZweitWaren,
  lieferantAnlegen, lieferantSetzen, lieferantEntfernen, artikelLieferantSetzen, hauptLieferant, zweitLieferant, lieferantVon } from "../lieferant.js";
import { lieferSaetze, uhrText } from "../bestand.js";
import { tagKurz as kurz } from "../anzeige_text.js";
import { nav } from "./nav.js";
import { BUNDESLAENDER, ladenLand, feiertagOffen, feiertagSetzen, naechsterFeiertag, landGeprueft } from "../feiertage.js"; // Feiertage (18.10.2026)
import { datumKurz } from "../haltbar.js";

// flüchtiger Bildschirmzustand: offenes Formular { id | "neu", werte } oder die Zuordnung der Waren
let form = null;
let zuordnen = false;
export const lieferantenKennung = () => (form ? "form:" + form.id : zuordnen ? "zuordnen" : "");
export function lieferantenZuruecksetzen() { form = null; zuordnen = false; }
export function lieferantenZurueck() { if (form) { form = null; return true; } if (zuordnen) { zuordnen = false; return true; } return false; }

const was = (text) => `<p class="inv-was"><b>${esc(t("inventur.wasHeisst"))}</b> ${esc(text)}</p>`;
const ue = (text) => `<h2 class="inv-ue">${esc(text)}</h2>`;
const tageText = (tage) => tage.map((d) => t("kuehl.tage." + d)).join(", ");
const vorherText = (n) => t("lieferanten.vorher." + Math.min(3, n));
// Rhythmus in einem Satz: „liefert Di, Fr · Bestellschluss am Vortag 18 Uhr“ / „Abholung Mi“ / „keine festen Liefertage“
export function rhythmusText(lf) {
  if (!lf.tage.length) return lf.lieferzeit ? t("lieferanten.ohneTageLieferzeit", lf.lieferzeit) : t("lieferanten.ohneTage");
  if (lf.modus === "abholung") return t("lieferanten.abholungAn", tageText(lf.tage));
  const schluss = lf.schluss ? t("lieferanten.schlussText", vorherText(lf.schluss.tageVorher), uhrText(lf.schluss.uhr)) : lf.lieferzeit ? t("lieferanten.lieferzeitText", lf.lieferzeit) : "";
  return [t("lieferanten.liefertAn", tageText(lf.tage)), schluss].filter(Boolean).join(" · ");
}
function naechsteText(stand, lf) {
  const tm = liefertermine(stand, lf, { anzahl: 1 }); const x = tm?.[0]; if (!x) return "";
  return lf.modus === "abholung" ? t("lieferanten.naechsteAbholung", kurz(x.tag)) : t("lieferanten.naechste", kurz(x.tag), kurz(x.schlussTag) + (x.uhr ? " " + uhrText(x.uhr) : ""));
}

export function lieferantenView(stand) {
  const kopf = `<div class="kopfband"><h1>${esc(t("lieferanten.titel"))}</h1><div class="unter">${esc(t("lieferanten.unter"))}</div></div>`;
  if (form) return `${kopf}<div class="inhalt">${formView(stand)}</div>${nav("lieferanten", { schnell: false })}`;
  if (zuordnen) return `${kopf}<div class="inhalt">${zuordnenView(stand)}</div>${nav("lieferanten", { schnell: false })}`;
  const saetze = lieferSaetze(stand);
  const oben = saetze.length ? `<div class="karte ${saetze[0].ton === "rot" ? "hinweisrot" : "hinweisgelb"}" data-lf-saetze="${saetze.length}">${saetze.slice(0, 3).map((x, i) => (i ? `<p>${esc(x.text)}</p>` : `<h2>${esc(x.text)}</h2>`)).join("")}</div>` : "";
  const liste = lieferantenAktiv(stand);
  // Prüfer 19.10.2026: statt Fließtext je Lieferant eine klare Karte – Name + „Ändern“, darunter drei Zeilen mit Symbol
  const zeile = (lf) => {
    const n = lieferantWaren(stand, lf.id).length; const naechste = naechsteText(stand, lf);
    const details = [lf.weg ? t("lieferanten.weg." + lf.weg) : "", lf.mindestwert ? t("lieferanten.mindestKurz", fmtEuro(lf.mindestwert)) : "", t("lieferanten.waren", n)].filter(Boolean).join(" · ");
    const z = (symbol, text) => (text ? `<div class="lf-z">${sym(symbol)}<span>${esc(text)}</span></div>` : "");
    return `<div class="lf-karte" data-lieferant-id="${esc(lf.id)}">
      <div class="lf-kopf"><b>${esc(lf.name)}</b><small>${esc(t("lieferanten.art." + lf.art))}</small><button type="button" class="leise klein" data-a="lf-auf" data-wert="${esc(lf.id)}">${esc(t("lieferanten.aendern"))}</button></div>
      ${z("truck", rhythmusText(lf))}${z("clock", naechste)}${z("package", details)}</div>`;
  };
  const listeView = liste.length ? `<div class="lf-liste">${liste.map(zeile).join("")}</div>` : `<div class="karte leer"><div>${esc(t("lieferanten.leer"))}</div></div>`;
  return `${kopf}<div class="inhalt">${oben}${ue(t("lieferanten.listeTitel"))}${listeView}
    <button type="button" class="knopf zweit" data-a="lf-neu">${esc(t("lieferanten.neu"))}</button>
    <button type="button" class="knopf zweit" data-a="lf-zuordnen">${esc(t("lieferanten.zuordnen"))}</button>
    <button type="button" class="leise" data-a="nav" data-wert="bestand">${esc(t("lieferanten.zumLager"))}</button>
    ${feiertageView(stand)}
    ${was(t("lieferanten.was"))}</div>${nav("lieferanten", { schnell: false })}`;
}
// Feiertage (18.10.2026): Bundesland (für landesweite Feiertage, nur geprüfte Länder haben eigene) und ob der Laden an Feiertagen zu hat.
// An Feiertagen liefert kein Lieferant – das rechnet js/lieferant.js; hier nur die Einstellung und der nächste Feiertag.
function feiertageView(stand) {
  const land = ladenLand(stand); const zu = !feiertagOffen(stand); const n = naechsterFeiertag(stand, heuteGeschaeft());
  return `${ue(t("lieferanten.feiertage.titel"))}<div class="karte" data-lf-feiertage="${esc(land || "")}">
    <div class="feldzeile"><label for="lf-land">${esc(t("lieferanten.feiertage.land"))}</label><select id="lf-land" class="textfeld" data-f="lf-land"><option value=""${land ? "" : " selected"}>${esc(t("lieferanten.feiertage.nurBund"))}</option>${BUNDESLAENDER.map((l) => `<option value="${l.code}"${l.code === land ? " selected" : ""}>${esc(l.name)}</option>`).join("")}</select></div>
    ${land && !landGeprueft(land) ? `<p class="hinweis">${esc(t("lieferanten.feiertage.ungeprueft"))}</p>` : ""}
    <div class="zeile"><div class="oben"><div class="name">${esc(t("lieferanten.feiertage.ladenZu"))}</div>
      <button type="button" class="schalter ${zu ? "an" : ""}" data-a="lf-feiertag-zu" aria-pressed="${zu}" aria-label="${esc(t("lieferanten.feiertage.ladenZu"))}"></button></div></div>
    <p class="hinweis">${esc(t("lieferanten.feiertage.liefern"))}${n ? " " + esc(t("lieferanten.feiertage.naechster", t("feiertage." + n.schluessel), datumKurz(n.datum))) : ""}</p></div>`;
}

// ---------- Formular ----------
const leer = () => ({ name: "", art: "sonstiges", modus: "lieferung", tage: [], uhr: "", vorher: null, lieferzeit: "", mindest: "", weg: null, kontakt: "", kundennummer: "", notiz: "" });
const werteVon = (lf) => ({ name: lf.name, art: lf.art, modus: lf.modus, tage: [...lf.tage], uhr: lf.schluss?.uhr || "", vorher: lf.schluss ? lf.schluss.tageVorher : null,
  lieferzeit: lf.lieferzeit === null ? "" : String(lf.lieferzeit), mindest: lf.mindestwert === null ? "" : String(lf.mindestwert).replace(".", ","), weg: lf.weg, kontakt: lf.kontakt, kundennummer: lf.kundennummer, notiz: lf.notiz });
function formView(stand) {
  const neu = form.id === "neu"; const w = form.werte; const lf = neu ? null : lieferantMitId(stand, form.id);
  const chip = (aktion, wert, an, text) => `<button type="button" class="chip klein ${an ? "an" : ""}" data-a="${aktion}" data-wert="${esc(wert)}" aria-pressed="${an}">${esc(text)}</button>`;
  const feld = (f, label, wert, { modus = "", platz = "", max = 80 } = {}) => `<div class="feldzeile"><label for="lf-${f}">${esc(label)}</label><input id="lf-${f}" class="textfeld" type="text"${modus ? ` inputmode="${modus}"` : ""} maxlength="${max}" data-f="lf-${f}" value="${esc(wert ?? "")}"${platz ? ` placeholder="${esc(platz)}"` : ""}></div>`;
  const abholung = w.modus === "abholung";
  const schluss = abholung ? "" : `<div class="feldzeile"><label for="lf-uhr">${esc(t("lieferanten.schluss"))}</label><div class="chips">${VORHER_WAHL.map((n) => chip("lf-vorher", String(n), w.vorher === n, vorherText(n))).join("")}</div>
      <input id="lf-uhr" class="textfeld" type="text" inputmode="numeric" maxlength="5" data-f="lf-uhr" value="${esc(w.uhr)}" placeholder="18:00"></div><p class="hinweis">${esc(t("lieferanten.schlussHinweis"))}</p>
    ${feld("lieferzeit", t("lieferanten.lieferzeit"), w.lieferzeit, { modus: "numeric", platz: "1", max: 2 })}`;
  const kontaktLabel = t("lieferanten.kontakt." + (w.weg || "leer"));
  const waren = lf ? lieferantWaren(stand, lf.id) : []; const zweit = lf ? lieferantZweitWaren(stand, lf.id) : [];
  return `${ue(t(neu ? "lieferanten.neuTitel" : "lieferanten.aendernTitel"))}<div class="karte" data-lf-form="${esc(form.id)}"><h2>${esc(neu ? t("lieferanten.neuTitel") : lf?.name || "")}</h2>
    ${feld("name", t("lieferanten.name"), w.name, { platz: t("lieferanten.namePlatz"), max: 40 })}
    <div class="feldzeile"><label>${esc(t("lieferanten.artFrage"))}</label><div class="chips">${LIEFERANT_ARTEN.map((a) => chip("lf-art", a, w.art === a, t("lieferanten.art." + a))).join("")}</div></div>
    <div class="feldzeile"><label>${esc(t("lieferanten.modusFrage"))}</label><div class="chips">${LIEFER_MODI.map((m) => chip("lf-modus", m, w.modus === m, t("lieferanten.modus." + m))).join("")}</div></div>
    <div class="feldzeile"><label>${esc(t(abholung ? "lieferanten.tageAbholung" : "lieferanten.tage"))}</label><div class="chips">${WOCHE.map((d) => chip("lf-tag", String(d), w.tage.includes(d), t("kuehl.tage." + d))).join("")}</div></div>
    <p class="hinweis">${esc(t(w.tage.length ? "lieferanten.tageHinweis" : "lieferanten.ohneTageHinweis"))}</p>
    ${schluss}
    ${feld("mindest", t("lieferanten.mindest"), w.mindest, { modus: "decimal", platz: "0", max: 10 })}
    <div class="feldzeile"><label>${esc(t("lieferanten.wegFrage"))}</label><div class="chips">${BESTELLWEGE.map((x) => chip("lf-weg", x, w.weg === x, t("lieferanten.weg." + x))).join("")}</div></div>
    ${w.weg && w.weg !== "vorort" ? feld("kontakt", kontaktLabel, w.kontakt, { modus: w.weg === "whatsapp" || w.weg === "telefon" ? "tel" : "", max: 80 }) : ""}
    ${feld("kundennummer", t("lieferanten.kundennummer"), w.kundennummer, { max: 30 })}
    ${feld("notiz", t("lieferanten.notiz"), w.notiz, { platz: t("lieferanten.notizPlatz"), max: 200 })}
    <p class="hinweis">${esc(t("lieferanten.datenschutz"))}</p>
    ${lf ? `<p class="hinweis" data-lf-waren="${waren.length}">${esc(waren.length ? t("lieferanten.warenListe", waren.map(artikelText).join(", ")) : t("lieferanten.keineWaren"))}${zweit.length ? " " + esc(t("lieferanten.zweitListe", zweit.map(artikelText).join(", "))) : ""}</p>` : ""}
    <button type="button" class="knopf glut" data-a="${neu ? "lf-anlegen" : "lf-speichern"}">${esc(t(neu ? "lieferanten.anlegen" : "lieferanten.speichern"))}</button>
    <button type="button" class="leise" data-a="lf-zu">${esc(t("lieferanten.abbrechen"))}</button>
    ${neu ? "" : `<button type="button" class="leise" data-a="lf-entfernen" data-wert="${esc(form.id)}">${esc(t("lieferanten.entfernen"))}</button>`}</div>`;
}

// ---------- Waren zuordnen ----------
function zuordnenView(stand) {
  const lfs = lieferantenAktiv(stand);
  const waren = (stand.artikel || []).filter((a) => a.herkunft !== "selbst" && a.benutzt !== false).map((a) => a.name).sort((x, y) => artikelText(x).localeCompare(artikelText(y), "de"));
  const opt = (id, name, an) => `<option value="${esc(id)}"${an ? " selected" : ""}>${esc(name)}</option>`;
  const zeile = (n) => {
    const a = (stand.artikel || []).find((x) => x.name === n); const beleg = lieferantVon(stand, n); const h = hauptLieferant(stand, n); const z = zweitLieferant(stand, n);
    const auto = t("lieferanten.wieBeleg", beleg || (h && !a?.lieferantId ? h.name : "–"));
    return `<div class="zeile" data-lf-ware="${esc(n)}"><div class="oben"><div class="name">${esc(artikelText(n))}<small>${esc(h ? t("lieferanten.jetzt", h.name) : t("lieferanten.ohne"))}</small></div></div>
      <div class="feldzeile"><label for="lfh-${esc(n)}">${esc(t("lieferanten.haupt"))}</label><select id="lfh-${esc(n)}" class="textfeld" data-f="lf-haupt:${esc(n)}">${opt("", auto, !a?.lieferantId)}${lfs.map((l) => opt(l.id, l.name, a?.lieferantId === l.id)).join("")}</select></div>
      <div class="feldzeile"><label for="lfz-${esc(n)}">${esc(t("lieferanten.zweit"))}</label><select id="lfz-${esc(n)}" class="textfeld" data-f="lf-zweit:${esc(n)}">${opt("", t("lieferanten.keiner"), !z)}${lfs.map((l) => opt(l.id, l.name, z?.id === l.id)).join("")}</select></div></div>`;
  };
  return `${ue(t("lieferanten.zuordnen"))}<p class="hinweis">${esc(t("lieferanten.zuordnenHinweis"))}</p>
    ${!lfs.length ? `<div class="karte leer"><div>${esc(t("lieferanten.leer"))}</div></div>` : waren.length ? waren.map(zeile).join("") : `<div class="karte leer"><div>${esc(t("lieferanten.keineWaren"))}</div></div>`}
    <button type="button" class="knopf zweit" data-a="lf-zuordnen-zu">${esc(t("lieferanten.fertig"))}</button>`;
}

// Text → Felder für lieferantAnlegen/lieferantSetzen. undefined-Zahl = ungültig (Meldung kommt vom Rechenwerk)
function felderAus(w) {
  const zahl = (s) => { const v = String(s ?? "").trim(); if (!v) return null; const n = parseZahl(v); return n === null ? "x" : n; };
  const ganz = (s) => { const v = String(s ?? "").trim(); if (!v) return null; return /^\d+$/.test(v) ? Number(v) : "x"; };
  return { name: w.name, art: w.art, modus: w.modus, tage: w.tage, uhr: w.modus === "abholung" ? "" : w.uhr, tageVorher: w.modus === "abholung" ? null : w.vorher,
    lieferzeit: ganz(w.lieferzeit), mindestwert: zahl(w.mindest), weg: w.weg, kontakt: w.weg && w.weg !== "vorort" ? w.kontakt : "", kundennummer: w.kundennummer, notiz: w.notiz };
}
const FEHLER = { name: 1, doppelt: 1, uhr: 1, tageVorher: 1, lieferzeit: 1, mindestwert: 1, art: 1, modus: 1, tage: 1, weg: 1, unbekannt: 1 };
const fehlerText = (g) => t("lieferanten.fehler." + (g in FEHLER ? g : "unbekannt"));

// Handlungen. Rückgabe: false (nicht meine) | true (neu zeichnen) | { speichern?, meldung? }
export function lieferantenAktion(name, el, stand) {
  if (name === "lf-neu") { form = { id: "neu", werte: leer() }; zuordnen = false; return true; }
  if (name === "lf-auf") { const lf = lieferantMitId(stand, el.dataset.wert); if (!lf) return false; form = { id: lf.id, werte: werteVon(lf) }; zuordnen = false; return true; }
  if (name === "lf-zu") { form = null; return true; }
  if (name === "lf-zuordnen") { zuordnen = true; form = null; return true; }
  if (name === "lf-zuordnen-zu") { zuordnen = false; return true; }
  if (name === "lf-feiertag-zu") return feiertagSetzen(stand, "offen", !feiertagOffen(stand)) ? { speichern: true } : true; // Feiertage (18.10.2026)
  if (name === "lf-entfernen") {
    const lf = lieferantMitId(stand, el.dataset.wert); if (!lf) return false;
    if (typeof confirm === "function" && !confirm(t("lieferanten.entfernenFrage", lf.name))) return false;
    lieferantEntfernen(stand, lf.id); form = null; return { speichern: true, meldung: t("lieferanten.entfernt") };
  }
  if (!form) return false;
  const setze = (k, v) => { form = { ...form, werte: { ...form.werte, [k]: v } }; return true; };
  if (name === "lf-art" && LIEFERANT_ARTEN.includes(el.dataset.wert)) return setze("art", el.dataset.wert);
  if (name === "lf-modus" && LIEFER_MODI.includes(el.dataset.wert)) return setze("modus", el.dataset.wert);
  if (name === "lf-weg" && BESTELLWEGE.includes(el.dataset.wert)) return setze("weg", form.werte.weg === el.dataset.wert ? null : el.dataset.wert);
  if (name === "lf-vorher") { const n = Number(el.dataset.wert); return setze("vorher", form.werte.vorher === n ? null : n); }
  if (name === "lf-tag") { const d = Number(el.dataset.wert); if (!WOCHE.includes(d)) return false; const tage = form.werte.tage.includes(d) ? form.werte.tage.filter((x) => x !== d) : [...form.werte.tage, d]; return setze("tage", tage); }
  if (name === "lf-anlegen" || name === "lf-speichern") {
    const f = felderAus(form.werte);
    const r = name === "lf-anlegen" ? lieferantAnlegen(stand, f) : lieferantSetzen(stand, form.id, f);
    if (!r.ok) return { meldung: fehlerText(r.grund) };
    form = null; return { speichern: true, meldung: t(name === "lf-anlegen" ? "lieferanten.angelegt" : "lieferanten.gespeichert") };
  }
  return false;
}
// Eingaben: Formular = Entwurf bis „Speichern“ (kein Neuzeichnen); Zuordnung (Auswahl) wird gleich geschrieben.
// Rückgabe: false | "entwurf" | "speichern" (gespeichert, neu zeichnen) | { meldung }
export function lieferantenEingabe(feld, wert, stand) {
  const f = String(feld || "");
  if (f.startsWith("lf-haupt:") || f.startsWith("lf-zweit:")) {
    const ware = f.slice(9); const id = String(wert || "") || null;
    const ok = artikelLieferantSetzen(stand, ware, f.startsWith("lf-haupt:") ? { haupt: id } : { zweit: id });
    return ok ? "speichern" : { meldung: t("lieferanten.fehler.unbekannt") };
  }
  if (f === "lf-land") return feiertagSetzen(stand, "land", String(wert || "") || null) ? "speichern" : false; // Feiertage (18.10.2026)
  if (!form || !f.startsWith("lf-")) return false;
  const k = f.slice(3); if (!["name", "uhr", "lieferzeit", "mindest", "kontakt", "kundennummer", "notiz"].includes(k)) return false;
  form = { ...form, werte: { ...form.werte, [k]: String(wert ?? "").slice(0, 200) } };
  return "entwurf";
}
