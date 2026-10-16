// Blätter über dem Bildschirm (15.10.2026, Entwickler A): Menü-Blatt mit vier Kacheln, Sprache, Laden wechseln, Hilfe „?", Büro-Code.
// Leistung (Stresstest 15.10.): Die Blätter wohnen in einer eigenen Hülle außerhalb von #app. Öffnen und Schließen zeichnet den
// Bildschirm darunter NICHT neu; teure Zahlen werden erst beim Öffnen gerechnet.
// „personal" (Entwickler D, screens/personal.js) und „buero" (Entwickler C, screens/buero.js) haben eigene Bildschirme.
import { t, sprache, SPRACHEN, SPRACH_NAMEN } from "../i18n.js";
import { esc } from "../util.js";
import { sym } from "../symbole.js";
import { ladenArtVon } from "../profil.js";
import { pinGesetzt, pinPruefen, pinSetzen, pinGueltig, sperreRest, fehlversuch, sperreLoesen, restText } from "../modus.js";
import { nav, sicherungStufe } from "./nav.js";
import { PASSWORT_MIN } from "../schluessel.js"; // E5 (16.10.2026): Passwort der Sicherung

let huelle = null;
let offen = null;     // "menue" | "sprache" | "laeden" | "hilfe" | "pin" | "passwort"
let pin = null;       // { zweck: "buero" | "personal" | "setzen" | "loeschen" | "ladenLoeschen", ziel, eingabe, erste, meldung, fehler, wurzel }
let uhr = null;       // Restzeit der Wartezeit sekündlich nachführen (W2-S)
let pw = null;        // E5 (16.10.2026): { zweck: "teilen" | "einlesen", sichtbar } – das Passwort selbst steht nur im Feld, nie hier

// Die Hülle hängt direkt am <body>; app.js hängt seine Klick-Weiche auch hier ein.
export function ebeneHuelle() {
  if (!huelle && typeof document !== "undefined") {
    huelle = document.getElementById("ebene-huelle");
    if (!huelle) { huelle = document.createElement("div"); huelle.id = "ebene-huelle"; document.body.appendChild(huelle); }
  }
  return huelle;
}
export const blattOffen = () => offen;
export const pinOffen = () => offen === "pin";

function zeigen(art, html) {
  const h = ebeneHuelle(); const neu = offen !== art && !offen;
  h.innerHTML = `<div class="ebene-dimmer" data-a="blatt-zu"></div><div class="ebene-blatt blatt-${art}${neu ? " rein" : ""}" role="dialog" aria-modal="true" aria-label="${esc(art === "pin" ? t("ebene.pin.titel") : art === "passwort" ? t("passwort.titel") : art === "hilfe" ? t("ebene.hilfeAuf") : t("ebene.menueAuf"))}"><div class="griff" aria-hidden="true"></div>${html}</div>`;
  h.classList.add("da"); document.body.classList.add("blatt-da"); offen = art;
  h.querySelector(".ebene-blatt button")?.focus({ preventScroll: true });
}
export function blattSchliessen() {
  if (!huelle || !offen) return false;
  huelle.classList.remove("da"); huelle.innerHTML = ""; document.body.classList.remove("blatt-da"); offen = null; pin = null; pw = null; uhrStop();
  return true;
}

const ladenBild = (stand) => { const art = ladenArtVon(stand); return `bilder/laden-${["doener", "pizza", "burger", "asia", "baeckerei", "cafe", "foodtruck"].includes(art) ? art : "anders"}.svg`; };

// ---------- Menü-Blatt (Laden) ----------
export function menueZeigen(stand, wurzel) {
  const mehrere = (wurzel?.betriebe || []).filter((b) => b.phase === "app").length > 1;
  const punktBuero = sicherungStufe(wurzel)?.stufe === "rot"; // erst beim Öffnen gerechnet
  const kachel = (a, wert, symName, text, klasse = "", extra = "") => `<button type="button" class="karte grosskachel ${klasse}" data-a="${a}"${wert ? ` data-wert="${wert}"` : ""}><span class="ks">${sym(symName)}${extra}</span><b>${esc(text)}</b></button>`;
  zeigen("menue", `
    <div class="blattkopf"><img class="ladenbild" src="${ladenBild(stand)}" alt=""><div><b>${esc(stand?.betrieb?.name || t("ebene.deinLaden"))}</b><small>${esc(t("ebene.deinLaden"))}</small></div>
      <button type="button" class="ikonknopf zu" data-a="blatt-zu" aria-label="${esc(t("ebene.schliessen"))}">${sym("x")}</button></div>
    <div class="grosskacheln${mehrere ? "" : " drei"}">
      ${kachel("nav", "abschluss", "moon", t("ebene.abschluss"), "dunkel")}
      ${kachel("modus", "personal", "users", t("ebene.personal"), "k-personal")}
      ${kachel("modus", "buero", "lock", t("ebene.buero"), "k-buero", punktBuero ? '<i class="punkt" aria-hidden="true"></i>' : "")}
      ${mehrere ? kachel("blatt-laeden", "", "store", t("ebene.ladenWechseln"), "k-laeden") : ""}
    </div>
    <button type="button" class="karte sprachzeile" data-a="blatt-sprache">${sym("languages")}<span class="sz-text">${esc(t("ebene.sprache"))}</span><span class="sz-wert">${esc(SPRACH_NAMEN[sprache()] || sprache())}${sym("chevron-right")}</span></button>`);
}

export function spracheZeigen() {
  zeigen("sprache", `<div class="blattkopf nur"><button type="button" class="ikonknopf" data-a="menue-zurueck" aria-label="${esc(t("allgemein.zurueck"))}">${sym("chevron-left")}</button><b>${esc(t("ebene.sprache"))}</b></div>
    <div class="blattliste">${SPRACHEN.map((c) => `<button type="button" class="blattzeile ${sprache() === c ? "an" : ""}" data-a="sprache" data-wert="${c}" lang="${c}"><span>${esc(SPRACH_NAMEN[c] || c)}</span>${sprache() === c ? sym("check") : ""}</button>`).join("")}</div>`);
}

export function laedenZeigen(wurzel) {
  zeigen("laeden", `<div class="blattkopf nur"><button type="button" class="ikonknopf" data-a="menue-zurueck" aria-label="${esc(t("allgemein.zurueck"))}">${sym("chevron-left")}</button><b>${esc(t("ebene.ladenWechseln"))}</b></div>
    <div class="blattliste">${wurzel.betriebe.filter((b) => b.phase === "app").map((b) => `<button type="button" class="blattzeile laden ${b.id === wurzel.aktiv ? "an" : ""}" data-a="laden-wechseln" data-id="${esc(b.id)}"><img src="${ladenBild(b)}" alt=""><span>${esc(b.betrieb.name || t("ebene.deinLaden"))}</span>${b.id === wurzel.aktiv ? sym("check") : ""}</button>`).join("")}</div>`);
}

// ---------- Hilfe „?" ----------
const HILFE = ["start", "muell", "kuehl", "putzplan", "karte", "abschluss", "laeden", "personal", "buero"];
export function hilfeZeigen(ansicht) {
  const k = HILFE.includes(ansicht) ? ansicht : "allgemein";
  const titel = ["start", "muell", "kuehl", "putzplan", "karte"].includes(k) ? t("ebene.tabs." + k) : k === "abschluss" ? t("ebene.abschluss") : k === "personal" ? t("ebene.personal") : k === "buero" ? t("ebene.buero") : k === "laeden" ? t("ebene.ladenWechseln") : t("ebene.hilfeAuf");
  zeigen("hilfe", `<div class="hilfe-inhalt"><span class="ks">${sym("circle-help")}</span><b>${esc(titel)}</b><p>${esc(t("ebene.hilfeText." + k))}</p></div>
    <button type="button" class="knopf" data-a="blatt-zu">OK</button>`);
}

// ---------- Büro-Code (4 Ziffern) ----------
// zweck "buero": Laden → Büro. zweck "personal": Personal → Laden. zweck "setzen": neuen Code wählen (zweimal; ziel "personal" = danach in Personal).
// zweck "loeschen" / "ladenLoeschen": Löschen nur mit Code (W2-S, p07 M6). Nach 5 Fehlversuchen Wartezeit mit sichtbarer Restzeit (W2-S, p07 M4).
export function pinStarten(zweck, ziel = null, wurzel = null, meldung = null) {
  pin = { zweck, ziel, eingabe: "", erste: null, meldung, fehler: false, wurzel }; pinZeichnen();
}
function uhrStop() { if (uhr) { clearInterval(uhr); uhr = null; } }
function warteText(rest) { return t("sicherheit.warten", restText(rest)); }
function uhrStarten() {
  uhrStop(); if (!pin?.wurzel || typeof setInterval === "undefined") return;
  uhr = setInterval(() => {
    if (!pin || offen !== "pin") return uhrStop();
    const rest = sperreRest(pin.wurzel);
    if (!rest) { uhrStop(); pin.meldung = null; pin.fehler = false; pinZeichnen(); return; }
    const m = huelle?.querySelector(".pin-meldung"); if (m) m.textContent = warteText(rest);
  }, 1000);
}
function pinZeichnen() {
  const p = pin; const titel = p.zweck === "setzen" ? t(p.erste ? "ebene.pin.nochmal" : "ebene.pin.neu") : t("ebene.pin.titel");
  const rest = p.zweck === "setzen" ? 0 : sperreRest(p.wurzel);
  if (rest) { p.meldung = warteText(rest); p.fehler = true; }
  const taste = (z) => `<button type="button" class="pintaste" data-a="pin-taste" data-wert="${z}"${rest ? " disabled" : ""}>${z}</button>`;
  zeigen("pin", `<div class="pin-kopf"><span class="ks">${sym("lock")}</span><b>${esc(titel)}</b><small class="pin-meldung${p.fehler ? " fehler" : ""}" role="status" aria-live="polite">${esc(p.meldung || "")}</small></div>
    <div class="pin-punkte${p.fehler && !rest ? " wackeln" : ""}" aria-hidden="true">${[0, 1, 2, 3].map((i) => `<i class="${i < p.eingabe.length ? "voll" : ""}"></i>`).join("")}</div>
    <div class="pin-tasten">${[1, 2, 3, 4, 5, 6, 7, 8, 9].map(taste).join("")}<button type="button" class="pintaste leer" data-a="blatt-zu">${esc(t("allgemein.abbrechen"))}</button>${taste(0)}<button type="button" class="pintaste weg" data-a="pin-weg" aria-label="${esc(t("ebene.pin.loeschen"))}"${rest ? " disabled" : ""}>${sym("delete")}</button></div>`);
  if (rest) uhrStarten(); else uhrStop();
}

// Eine Taste. Rückgabe: null (weiter tippen), { fehler: true } (falscher Code – Zähler in der Wurzel, bitte speichern)
// oder { zweck, ziel } wenn der Code stimmt / gesetzt ist.
export async function pinTaste(wert, wurzel) {
  if (!pin) return null;
  pin.wurzel = wurzel;
  if (pin.zweck !== "setzen" && sperreRest(wurzel)) { pin.eingabe = ""; pinZeichnen(); return null; } // Wartezeit läuft: keine Eingabe
  if (wert === "weg") { pin.eingabe = pin.eingabe.slice(0, -1); pin.fehler = false; pinZeichnen(); return null; }
  if (pin.eingabe.length >= 4 || !/^[0-9]$/.test(wert)) return null;
  pin.eingabe += wert; pin.fehler = false; pin.meldung = null; pinZeichnen();
  if (pin.eingabe.length < 4) return null;
  const p = pin; const e = p.eingabe;
  if (p.zweck === "setzen") {
    if (!p.erste) { p.erste = e; p.eingabe = ""; pinZeichnen(); return null; }
    if (p.erste !== e || !pinGueltig(e)) { p.erste = null; p.eingabe = ""; p.fehler = true; p.meldung = t("ebene.pin.ungleich"); pinZeichnen(); return null; }
    await pinSetzen(wurzel, e); blattSchliessen(); return { zweck: "setzen", ziel: p.ziel };
  }
  if (p.pruefend) return null; p.pruefend = true; // die Prüfung dauert (PBKDF2) – keine zweite gleichzeitig
  let ok = false; try { ok = await pinPruefen(wurzel, e); } finally { p.pruefend = false; }
  if (ok) { sperreLoesen(wurzel); if (pin === p) blattSchliessen(); return { zweck: p.zweck, ziel: p.ziel }; }
  const dauer = fehlversuch(wurzel);
  if (pin !== p) return { fehler: true }; // inzwischen geschlossen
  p.eingabe = ""; p.fehler = true; p.meldung = dauer ? warteText(dauer) : t("ebene.pin.falsch"); pinZeichnen(); return { fehler: true };
}

// ---------- Passwort der Sicherung (E5, 16.10.2026) ----------
// zweck "teilen": Blatt vor dem Teilen (Hauptknopf „Sicherung teilen“, leiser Knopf „Ohne Passwort teilen“).
// zweck "einlesen": Datei ist verschlüsselt, Passwort abfragen (Knopf „Einlesen“). Das Passwort wird nie gespeichert – es steht nur im Feld.
export const passwortOffen = () => offen === "passwort";
export function passwortStarten(zweck) {
  pw = { zweck, sichtbar: false };
  const einlesen = zweck === "einlesen";
  zeigen("passwort", `<div class="blattkopf nur"><span class="ks pw-ks">${sym("key-round")}</span><b>${esc(t(einlesen ? "passwort.titelEinlesen" : "passwort.titel"))}</b>
      <button type="button" class="ikonknopf zu" data-a="blatt-zu" aria-label="${esc(t("ebene.schliessen"))}">${sym("x")}</button></div>
    <form class="pw-form" autocomplete="off">
      <div class="pw-feld"><input class="textfeld" type="password" inputmode="text" minlength="${PASSWORT_MIN}" autocomplete="${einlesen ? "current-password" : "new-password"}" data-f="passwort" placeholder="${esc(t("passwort.feld"))}" aria-label="${esc(t("passwort.feld"))}">
        <button type="button" class="ikonknopf pw-auge" data-a="passwort-zeigen" aria-label="${esc(t("passwort.zeigen"))}" aria-pressed="false">${sym("eye")}</button></div>
      <small class="pin-meldung" role="status" aria-live="polite"></small>
      ${einlesen ? "" : `<p class="hinweis pw-hinweis">${esc(t("passwort.hinweis"))}</p>`}
      <button type="submit" class="knopf" data-a="${einlesen ? "sicherung-einlesen" : "sicherung-teilen"}">${esc(t(einlesen ? "passwort.einlesen" : "passwort.teilen"))}</button>
      ${einlesen ? "" : `<button type="button" class="leise" data-a="sicherung-ohne">${esc(t("passwort.ohne"))}</button>`}
    </form>`);
  const f = huelle.querySelector(".pw-form"); f.addEventListener("submit", (ev) => ev.preventDefault()); // Enter = Hauptknopf (Klick-Weiche in app.js)
  f.querySelector('[data-f="passwort"]').focus({ preventScroll: true });
}
// Wert aus dem Feld (nur im Moment des Teilens/Einlesens gelesen)
export const passwortWert = () => (offen === "passwort" ? huelle?.querySelector('[data-f="passwort"]')?.value ?? "" : "");
// Sichtbar-Umschalter: nur das Feld und das Symbol wechseln, kein Neuzeichnen (Tastatur bleibt)
export function passwortZeigen() {
  if (!pw || offen !== "passwort") return;
  pw.sichtbar = !pw.sichtbar;
  const feld = huelle.querySelector('[data-f="passwort"]'); const k = huelle.querySelector(".pw-auge");
  if (feld) feld.type = pw.sichtbar ? "text" : "password";
  if (k) { k.innerHTML = sym(pw.sichtbar ? "eye-off" : "eye"); k.setAttribute("aria-label", t(pw.sichtbar ? "passwort.verbergen" : "passwort.zeigen")); k.setAttribute("aria-pressed", String(pw.sichtbar)); }
  feld?.focus({ preventScroll: true });
}
// Meldung unter dem Feld („Passwort falsch“, „Mindestens 6 Zeichen“); Blatt bleibt offen. laeuft: Knöpfe sperren, solange PBKDF2 rechnet.
export function passwortMeldung(text, { laeuft = false } = {}) {
  if (offen !== "passwort") return;
  const m = huelle.querySelector(".pin-meldung"); if (m) { m.textContent = text || ""; m.classList.toggle("fehler", !!text); }
  for (const k of huelle.querySelectorAll(".pw-form .knopf, .pw-form .leise")) k.disabled = laeuft;
  if (text && !laeuft) { const feld = huelle.querySelector('[data-f="passwort"]'); feld?.focus({ preventScroll: true }); feld?.select?.(); }
}

// Karte „Büro-Code" für Büro-Start und Einstellungen
export function bueroCodeKarte(wurzel) {
  const da = pinGesetzt(wurzel);
  return `<div class="karte buerocode"><h2>${sym("lock")} ${esc(t("ebene.pin.titel"))}</h2><p class="hinweis">${esc(t(da ? "ebene.pin.mit" : "sicherheit.ohneCode"))}</p>
    <button type="button" class="knopf zweit" data-a="pin-setzen">${esc(t(da ? "ebene.pin.aendern" : "ebene.pin.setzen"))}</button>
    ${da ? `<button type="button" class="leise" data-a="pin-entfernen">${esc(t("ebene.pin.entfernen"))}</button>` : ""}</div>`;
}

