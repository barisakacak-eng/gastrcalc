// Preisrunden-Rechner im Büro (Masterauftrag „Gehirn“ 1.2, 1.3 und 1.6, 28.10.2026).
// Ein Gericht, ein neuer Preis: „Bis zu x von 100 Gästen dürfen wegbleiben, dann verdienst du gleich viel“ und Euro im Monat, wenn alle bleiben.
// Darunter die Extras dieses Gerichts („bringt dir ≈ x €“) und „Was bringen 30 Cent mehr?“ für die Gerichte mit dem größten Hebel.
// Gerechnet wird in js/preisrunde.js, js/hebel.js und js/extras.js; hier nur Anzeige und Entwurf (Trennung 2, 17.10.2026).
import { t } from "../i18n.js";
import { esc, fmtEuro, fmtEuroGeschaetzt, fmtZahl, parseZahl, uid } from "../util.js";
import { kalkulation } from "../engine.js";
import { preisRundeGericht } from "../preisrunde.js";
import { hebelJeGericht, HEBEL_MIN_EURO, HEBEL_LISTE } from "../hebel.js";
import { extrasVon } from "../extras.js";
import { nav } from "./nav.js";
import { preisRundeUebernehmen, extraDazu, extraWeg } from "../stamm.js";

export const PREIS_STUFE = 0.10; // Setzung 28.10.2026: Schritt der Knöpfe −/+ (10 Cent)
export const START_AUFSCHLAG = 0.50; // Setzung 28.10.2026: Rechner öffnet mit +0,50 € (Goldwert-Beispiel des Masterauftrags)
export const MIN_PREIS = 0.10; // Setzung 28.10.2026: kleinster Preis im Rechner
let gerichtId = null, preisNeu = null; let entwurf = { name: "", preis: "", zutat: "", menge: "" };
export const preisrundeZuruecksetzen = () => { gerichtId = null; preisNeu = null; entwurf = { name: "", preis: "", zutat: "", menge: "" }; };
const r2 = (x) => Math.round(x * 100) / 100;

// Rechenbare Gerichte: Preis und Ware bekannt (ohne Getränke)
const rechenbar = (stand) => kalkulation(stand).zeilen.filter((z) => z.klasse !== "getraenk" && z.preisBrutto > 0 && z.waren !== null);

// Öffnen mit Gericht (optional) und Aufschlag in Cent (optional). Ohne Gericht: das mit dem größten Hebel.
export function preisrundeOeffnen(stand, id, cent) {
  const zs = rechenbar(stand); const h = hebelJeGericht(stand).filter((x) => zs.some((z) => z.id === x.id));
  gerichtId = zs.some((z) => z.id === id) ? id : h[0]?.id || zs[0]?.id || null;
  const z = zs.find((x) => x.id === gerichtId);
  preisNeu = z ? r2(z.preisBrutto + (Number(cent) > 0 ? Number(cent) / 100 : START_AUFSCHLAG)) : null;
  entwurf = { name: "", preis: "", zutat: "", menge: "" };
}

export function preisrundeView(stand) {
  const zs = rechenbar(stand);
  if (!gerichtId || !zs.some((z) => z.id === gerichtId)) preisrundeOeffnen(stand, null);
  const kopf = `<div class="kopfband"><h1>${esc(t("gehirn.preisrunde.titel"))}</h1><div class="unter">${esc(t("gehirn.preisrunde.unter"))}</div></div>`;
  if (!zs.length) return `${kopf}<div class="inhalt pr"><div class="karte leer"><div>${esc(t("gehirn.preisrunde.leer"))}</div><button type="button" class="knopf zweit" data-a="nav" data-wert="kartebuero">${esc(t("menue.karte"))}</button></div></div>${nav("preisrunde")}`;
  const z = zs.find((x) => x.id === gerichtId);
  const r = preisRundeGericht(stand, gerichtId, preisNeu);
  const ca = !!r?.geschaetzt;
  let ergebnis;
  if (!r || Math.abs(preisNeu - z.preisBrutto) < 0.005) ergebnis = `<p class="pr-satz">${esc(t("gehirn.preisrunde.gleich"))}</p>`;
  else if (!(r.dbNeu > 0)) ergebnis = `<p class="pr-satz minus">${esc(t("gehirn.preisrunde.deckt"))}</p>`;
  else if (r.schwelle !== null) ergebnis = `<div class="pr-gross">${ca ? "≈ " : ""}${esc(t("gehirn.preisrunde.wegbleiben", fmtZahl(Math.floor(r.schwelle * 100), 0)))}</div>
      <p class="pr-satz">${esc(t("gehirn.preisrunde.wegSatz"))}</p>
      <p class="pr-euro">${esc(t("gehirn.preisrunde.alleBleiben", fmtEuroGeschaetzt(r.mehrJahr / 12, true)))}</p>`;
  else ergebnis = `<div class="pr-gross minus">${esc(r.mehrGaesteNoetig > 1 ? t("gehirn.preisrunde.doppelt") : t("gehirn.preisrunde.mehrGaeste", fmtZahl(Math.ceil(r.mehrGaesteNoetig * 100), 0)))}</div>
      <p class="pr-euro">${esc(t("gehirn.preisrunde.weniger", fmtEuroGeschaetzt(-r.mehrJahr / 12, true)))}</p>`;
  const wahl = `<label class="pr-wahl"><span>${esc(t("gehirn.preisrunde.gericht"))}</span><select data-f="pr-gericht">${zs.map((x) => `<option value="${esc(x.id)}"${x.id === gerichtId ? " selected" : ""}>${esc(x.name)}</option>`).join("")}</select></label>`;
  const schritt = `<div class="pr-schritt">
      <button type="button" class="knopf zweit" data-a="pr-preis" data-wert="-10" aria-label="${esc(t("gehirn.preisrunde.minus"))}">−</button>
      <div class="pr-preis"><b>${esc(fmtEuro(preisNeu, { dezimal: 2 }))}</b><small>${esc(t("gehirn.preisrunde.heute", fmtEuro(z.preisBrutto, { dezimal: 2 })))}</small></div>
      <button type="button" class="knopf zweit" data-a="pr-preis" data-wert="10" aria-label="${esc(t("gehirn.preisrunde.plus"))}">+</button></div>`;
  const darf = r && r.dbNeu > 0 && Math.abs(preisNeu - z.preisBrutto) >= 0.005;
  const rechner = `<div class="karte pr-karte">${wahl}${schritt}<div class="pr-ergebnis">${ergebnis}</div>
      ${darf ? `<small class="pr-grenze">${esc(t("gehirn.preisrunde.grenze"))}</small>` : ""}
      ${darf ? `<button type="button" class="knopf" data-a="pr-uebernehmen">${esc(t("gehirn.preisrunde.uebernehmen"))}</button>` : ""}</div>`;
  // Extras dieses Gerichts (1.6)
  const ex = extrasVon(stand, gerichtId); const g = stand.gerichte.find((x) => x.id === gerichtId);
  const artikel = (stand.artikel || []).filter((a) => a.gruppe !== "getraenk" && a.gruppe !== "spirituose").map((a) => a.name).sort((a, b) => a.localeCompare(b, "de"));
  const extras = `<div class="karte pr-extras"><h2>${esc(t("gehirn.extra.titel", z.name))}</h2>
      ${ex.map((x, i) => `<div class="summenzeile"><span><b>${esc(x.name)}</b> · ${esc(fmtEuro(x.preis, { dezimal: 2 }))}<br><small>${esc(x.bringt === null ? t("gehirn.extra.fehlt") : x.bringt < 0 ? t("gehirn.extra.kostet", fmtEuroGeschaetzt(-x.bringt, x.geschaetzt, { dezimal: 2 })) : t("gehirn.extra.bringt", fmtEuroGeschaetzt(x.bringt, x.geschaetzt, { dezimal: 2 })))}</small></span>
        <button type="button" class="leise klein" data-a="pr-extra-weg" data-wert="${esc(g.extras[i].id)}">${esc(t("gehirn.extra.weg"))}</button></div>`).join("")}
      <div class="pr-extra-neu">
        <input type="text" data-f="pr-ex-name" value="${esc(entwurf.name)}" placeholder="${esc(t("gehirn.extra.name"))}" maxlength="40">
        <input type="text" inputmode="decimal" data-f="pr-ex-preis" value="${esc(entwurf.preis)}" placeholder="${esc(t("gehirn.extra.preis"))}">
        <select data-f="pr-ex-zutat"><option value="">${esc(t("gehirn.extra.zutat"))}</option>${artikel.map((n) => `<option${n === entwurf.zutat ? " selected" : ""}>${esc(n)}</option>`).join("")}</select>
        <input type="text" inputmode="decimal" data-f="pr-ex-menge" value="${esc(entwurf.menge)}" placeholder="${esc(t("gehirn.extra.menge"))}">
        <button type="button" class="knopf zweit" data-a="pr-extra-dazu"${extraGueltig() ? "" : " disabled"}>${esc(t("gehirn.extra.dazu"))}</button>
      </div></div>`;
  // 30 Cent mehr (1.3): die drei Gerichte mit dem größten Hebel
  const h = hebelJeGericht(stand).filter((x) => x.euroMonat >= HEBEL_MIN_EURO && zs.some((z) => z.id === x.id)).slice(0, HEBEL_LISTE); // nur Gerichte, die der Rechner kennt (Burger-Test: Cola öffnete Pommes)
  const hebel = h.length ? `<div class="karte pr-hebel"><h2>${esc(t("gehirn.hebel.titel"))}</h2>${h.map((x) => `<button type="button" class="summenzeile pr-hebelzeile" data-a="pr-gericht" data-wert="${esc(x.id)}"><span>${esc(x.name)}</span><span class="wert">${esc(t("gehirn.hebel.zeile", fmtEuroGeschaetzt(x.euroMonat, true)))}</span></button>`).join("")}</div>` : "";
  return `${kopf}<div class="inhalt pr">${rechner}${hebel}${extras}</div>${nav("preisrunde")}`;
}

const extraGueltig = () => entwurf.name.trim() && parseZahl(entwurf.preis) > 0 && entwurf.zutat && parseZahl(entwurf.menge) > 0;
const einheitVon = (stand, name) => { const a = (stand.artikel || []).find((x) => x.name === name); return a?.einheit === "stk" ? "stk" : a?.einheit === "ml" || a?.einheit === "l" ? "ml" : "g"; };

// Klicks. Rückgabe { speichern, meldung } oder true (nur zeichnen) oder null (nicht von hier)
export function preisrundeAktion(name, el, stand, { datum } = {}) {
  if (name === "pr-preis") { preisNeu = Math.max(MIN_PREIS, r2(preisNeu + Number(el.dataset.wert) / 100)); return true; }
  if (name === "pr-gericht") { preisrundeOeffnen(stand, el.dataset.wert, 30); return true; }
  if (name === "pr-uebernehmen") {
    const g = stand.gerichte.find((x) => x.id === gerichtId); const z = rechenbar(stand).find((x) => x.id === gerichtId); if (!g || !z) return null;
    const r = preisRundeGericht(stand, gerichtId, preisNeu);
    preisRundeUebernehmen(stand, { gericht: g.id, alt: z.preisBrutto, neu: preisNeu, mwst: z.mwst, mengeMonat: r?.mengeMonat || 0, datum }); // Nutzen-Posten „preis“ (js/nutzen.js)
    return { speichern: true, meldung: t("gehirn.preisrunde.uebernommen", g.name, fmtEuro(preisNeu, { dezimal: 2 })) };
  }
  if (name === "pr-extra-dazu") {
    if (!extraGueltig()) return true;
    const g = stand.gerichte.find((x) => x.id === gerichtId); if (!g) return null;
    extraDazu(stand, g.id, { id: uid(), name: entwurf.name.trim().slice(0, 40), preis: parseZahl(entwurf.preis), zutaten: [{ name: entwurf.zutat, menge: parseZahl(entwurf.menge), einheit: einheitVon(stand, entwurf.zutat) }] });
    entwurf = { name: "", preis: "", zutat: "", menge: "" };
    return { speichern: true };
  }
  if (name === "pr-extra-weg") {
    return extraWeg(stand, gerichtId, el.dataset.wert) ? { speichern: true } : null;
  }
  return null;
}

// Eingaben: Gericht wechseln zeichnet neu, Extra-Felder sind Entwurf (nur den Knopf schalten)
export function preisrundeEingabe(feld, wert, stand) {
  if (feld === "pr-gericht") { preisrundeOeffnen(stand, wert, 30); return "zeichnen"; }
  const m = /^pr-ex-(name|preis|zutat|menge)$/.exec(feld || ""); if (!m) return null;
  entwurf[m[1]] = String(wert); return extraGueltig() ? "knopf-an" : "knopf-aus";
}
