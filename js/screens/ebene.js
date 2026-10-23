// Blätter über dem Bildschirm (15.10.2026, Entwickler A): Menü-Blatt mit vier Kacheln, Sprache, Laden wechseln, Hilfe „?", Büro-Code.
// Leistung (Stresstest 15.10.): Die Blätter wohnen in einer eigenen Hülle außerhalb von #app. Öffnen und Schließen zeichnet den
// Bildschirm darunter NICHT neu; teure Zahlen werden erst beim Öffnen gerechnet.
// „personal" (Entwickler D, screens/personal.js) und „buero" (Entwickler C, screens/buero.js) haben eigene Bildschirme.
import { t, sprache, SPRACHEN, SPRACH_NAMEN } from "../i18n.js";
import { esc } from "../util.js";
import { sym } from "../symbole.js";
import { ladenArtVon } from "../profil.js";
import { pinGesetzt, pinPruefen, pinSetzen, pinGueltig, sperreRest, fehlversuch, sperreLoesen, restText } from "../modus.js";
import { rettungGesetzt, rettungErlaubt, rettungAnlegen, rettungBloecke, RETTUNG_LAENGE } from "../rettung.js"; // Rettung (17.10.2026)
import { nav } from "./nav.js";
import { sicherungStufe } from "../sicherung_stufe.js"; // Trennung (17.10.2026)
import { PASSWORT_MIN } from "../schluessel.js";
import { mascotMarkup } from "../gastrocash-brand.js"; // E5 (16.10.2026): Passwort der Sicherung

let huelle = null;
let offen = null;     // "menue" | "sprache" | "laeden" | "hilfe" | "pin" | "passwort" | "rettung" | "rettungscode" | "sicherungort" (Laden-Umbau 20.10.2026)
let pin = null;       // { zweck: "buero" | "personal" | "setzen" | "loeschen" | "ladenLoeschen", ziel, eingabe, erste, meldung, fehler, wurzel }
let uhr = null;       // Restzeit der Wartezeit sekündlich nachführen (W2-S)
let rett = null;      // Rettung (17.10.2026): { ziel } – wohin es nach dem Rettungscode geht. Der Code selbst steht nur im Blatt, nie hier
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
  h.innerHTML = `<div class="ebene-dimmer" data-a="blatt-zu"></div><div class="ebene-blatt blatt-${art}${neu ? " rein" : ""}" role="dialog" aria-modal="true" aria-label="${esc(art === "pin" ? t("ebene.pin.titel") : art === "passwort" ? t("passwort.titel") : art === "sicherungort" ? t("ladenSchirm.sicherung.woFrage") : art === "rettung" || art === "rettungscode" ? t("rettung.titel") : art === "hilfe" ? t("ebene.hilfeAuf") : t("ebene.menueAuf"))}"><div class="griff" aria-hidden="true"></div>${html}</div>`;
  h.classList.add("da"); document.body.classList.add("blatt-da"); offen = art;
  h.querySelector(".ebene-blatt button")?.focus({ preventScroll: true });
}
export function blattSchliessen() {
  if (!huelle || !offen) return false;
  huelle.classList.remove("da"); huelle.innerHTML = ""; document.body.classList.remove("blatt-da"); offen = null; pin = null; pw = null; rett = null; uhrStop();
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
// Laden-Umbau (20.10.2026): was im Laden nicht mehr dauernd steht, steht hier hinter „?“ (vorhandene Texte, nichts gelöscht)
const HILFE_MEHR = {
  muell: ["muell1.anleitung"],
  kuehl: ["kuehl.stellenTippen", "kuehl.einrichtenText", "kuehl.haftung"],
  putzplan: ["putzplan.erklaerung", "putzplan.quellenHinweis"],
  abschluss: ["abschluss.ohneUmsatz", "abschluss.hinweis"],
};
const HILFE = ["start", "muell", "kuehl", "putzplan", "karte", "abschluss", "laeden", "personal", "buero"];
export function hilfeZeigen(ansicht) {
  const k = HILFE.includes(ansicht) ? ansicht : "allgemein";
  const titel = ["start", "muell", "kuehl", "putzplan", "karte"].includes(k) ? t("ebene.tabs." + k) : k === "abschluss" ? t("ebene.abschluss") : k === "personal" ? t("ebene.personal") : k === "buero" ? t("ebene.buero") : k === "laeden" ? t("ebene.ladenWechseln") : t("ebene.hilfeAuf");
  const mehr = (HILFE_MEHR[k] || []).map((key) => `<p class="hilfe-mehr">${esc(t(key))}</p>`).join("");
  zeigen("hilfe", `<div class="hilfe-inhalt"><span class="gc-help-bot">${mascotMarkup(k === "start" || k === "karte" ? "freundlich" : "neutral", k === "start" || k === "karte" ? "thumb" : "idle")}</span><b>${esc(titel)}</b><p>${esc(t("ebene.hilfeText." + k))}</p>${mehr}</div>
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
    <div class="pin-tasten">${[1, 2, 3, 4, 5, 6, 7, 8, 9].map(taste).join("")}<button type="button" class="pintaste leer" data-a="blatt-zu">${esc(t("allgemein.abbrechen"))}</button>${taste(0)}<button type="button" class="pintaste weg" data-a="pin-weg" aria-label="${esc(t("ebene.pin.loeschen"))}"${rest ? " disabled" : ""}>${sym("delete")}</button></div>
    ${vergessenErlaubt(p) ? `<button type="button" class="leise" data-a="rettung-start">${esc(t("rettung.vergessen"))}</button>` : ""}`);
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
    await pinSetzen(wurzel, e); const rettungscode = await rettungAnlegen(wurzel); // Rettung (17.10.2026): zu jedem neuen Code ein neuer Rettungscode
    blattSchliessen(); return { zweck: "setzen", ziel: p.ziel, rettungscode };
  }
  if (p.pruefend) return null; p.pruefend = true; // die Prüfung dauert (PBKDF2) – keine zweite gleichzeitig
  let ok = false; try { ok = await pinPruefen(wurzel, e); } finally { p.pruefend = false; }
  if (ok) { sperreLoesen(wurzel); if (pin === p) blattSchliessen(); return { zweck: p.zweck, ziel: p.ziel }; }
  const dauer = fehlversuch(wurzel);
  if (pin !== p) return { fehler: true }; // inzwischen geschlossen
  p.eingabe = ""; p.fehler = true; p.meldung = dauer ? warteText(dauer) : t("ebene.pin.falsch"); pinZeichnen(); return { fehler: true };
}

// ---------- Rettungscode (17.10.2026) ----------
// „Code vergessen?“ nur an der Code-Abfrage, nur wenn ein Rettungscode angelegt ist; im Personal-Modus nur am Schloss (rettung.js).
function vergessenErlaubt(p) { return !!p.wurzel && rettungErlaubt(p.wurzel, p.zweck); }
export const pinZweck = () => (pin ? { zweck: pin.zweck, ziel: pin.ziel } : null);
// Eingabe des Rettungscodes. ziel: was nach dem neuen Büro-Code passieren soll ({ zweck, ziel } der Code-Abfrage)
export function rettungStarten(ziel, wurzel) {
  rett = { ziel };
  const rest = sperreRest(wurzel);
  zeigen("rettung", `<div class="blattkopf nur"><span class="ks pw-ks">${sym("key-round")}</span><b>${esc(t("rettung.titel"))}</b>
      <button type="button" class="ikonknopf zu" data-a="blatt-zu" aria-label="${esc(t("ebene.schliessen"))}">${sym("x")}</button></div>
    <form class="pw-form" autocomplete="off">
      <p class="hinweis">${esc(t("rettung.eingeben"))}</p>
      <input class="textfeld gross" type="text" inputmode="text" autocapitalize="characters" autocorrect="off" spellcheck="false" autocomplete="off" maxlength="${RETTUNG_LAENGE + 6}" data-f="rettungscode" placeholder="XXXX-XXXX-XXXX" aria-label="${esc(t("rettung.titel"))}"${rest ? " disabled" : ""}>
      <small class="pin-meldung${rest ? " fehler" : ""}" role="status" aria-live="polite">${rest ? esc(warteText(rest)) : ""}</small>
      <button type="submit" class="knopf" data-a="rettung-pruefen"${rest ? " disabled" : ""}>${esc(t("allgemein.weiter"))}</button>
    </form>`);
  const f = huelle.querySelector(".pw-form"); f.addEventListener("submit", (ev) => ev.preventDefault());
  if (!rest) f.querySelector('[data-f="rettungscode"]').focus({ preventScroll: true });
}
export const rettungOffen = () => offen === "rettung";
export const rettungZiel = () => rett?.ziel || null;
export const rettungWert = () => (offen === "rettung" ? huelle?.querySelector('[data-f="rettungscode"]')?.value ?? "" : "");
// Meldung unter dem Feld; laeuft: Knopf sperren, solange PBKDF2 rechnet; gesperrt: Feld und Knopf zu (Wartezeit)
export function rettungMeldung(text, { laeuft = false, gesperrt = false } = {}) {
  if (offen !== "rettung") return;
  const m = huelle.querySelector(".pin-meldung"); if (m) { m.textContent = text || ""; m.classList.toggle("fehler", !!text); }
  const k = huelle.querySelector('[data-a="rettung-pruefen"]'); const feld = huelle.querySelector('[data-f="rettungscode"]');
  if (k) k.disabled = laeuft || gesperrt; if (feld) feld.disabled = gesperrt;
  if (text && !laeuft && !gesperrt) { feld?.focus({ preventScroll: true }); feld?.select?.(); }
}
export const rettungWarteText = (ms) => warteText(ms);
// Neuer Rettungscode: einmal zeigen. Der Klartext steht nur in diesem Blatt; „Aufgeschrieben“ schließt es, danach ist er weg.
export function rettungscodeZeigen(code, ziel = null) {
  rett = { ziel };
  zeigen("rettungscode", `<div class="hilfe-inhalt"><span class="ks">${sym("key-round")}</span><b>${esc(t("rettung.neuTitel"))}</b>
      <p>${esc(t("rettung.aufschreiben"))}</p></div>
    <input class="textfeld gross" type="text" readonly value="${esc(rettungBloecke(code))}" aria-label="${esc(t("rettung.titel"))}" data-rettungscode="1">
    <p class="hinweis">${esc(t("rettung.nurEinmal"))}</p>
    <button type="button" class="knopf" data-a="rettung-ok">${esc(t("rettung.aufgeschrieben"))}</button>`);
}

// ---------- Passwort der Sicherung (E5, 16.10.2026) ----------
// zweck "teilen": Blatt vor dem Teilen (Hauptknopf „Sicherung teilen“, leiser Knopf „Ohne Passwort teilen“).
// zweck "einlesen": Datei ist verschlüsselt, Passwort abfragen (Knopf „Einlesen“). Das Passwort wird nie gespeichert – es steht nur im Feld.
export const passwortOffen = () => offen === "passwort";
// Laden-Umbau (20.10.2026), zweck "teilen": Kopf „Sicherung“, „Letzte vom Handy weg: vor n Tagen“, Schalter „Mit Passwort“ (vorgewählt –
// wer ihn ausschaltet, teilt ohne Passwort), Schalter „Ohne Fotos (klein, für Mail)“, ein Knopf „Sicherung verschicken“.
// extra.tage: Tage seit der letzten Sicherung, die vom Handy weg ist (null = noch nie).
export function passwortStarten(zweck, extra = {}) {
  pw = { zweck, sichtbar: false, mitPasswort: true, ohneFotos: false };
  const einlesen = zweck === "einlesen";
  const schalter = (a, an, text) => `<div class="zeile pw-schalter"><div class="oben"><div class="name">${esc(text)}</div><button type="button" class="schalter ${an ? "an" : ""}" data-a="${a}" aria-pressed="${an}" aria-label="${esc(text)}"></button></div></div>`;
  const feld = `<div class="pw-feld"><input class="textfeld" type="password" inputmode="text" minlength="${PASSWORT_MIN}" autocomplete="${einlesen ? "current-password" : "new-password"}" data-f="passwort" placeholder="${esc(t("passwort.feld"))}" aria-label="${esc(t("passwort.feld"))}">
        <button type="button" class="ikonknopf pw-auge" data-a="passwort-zeigen" aria-label="${esc(t("passwort.zeigen"))}" aria-pressed="false">${sym("eye")}</button></div>`;
  zeigen("passwort", `<div class="blattkopf nur"><span class="ks pw-ks">${sym("key-round")}</span><b>${esc(t(einlesen ? "passwort.titelEinlesen" : "passwort.titel"))}</b>
      <button type="button" class="ikonknopf zu" data-a="blatt-zu" aria-label="${esc(t("ebene.schliessen"))}">${sym("x")}</button></div>
    <form class="pw-form" autocomplete="off">
      ${einlesen ? feld : `<p class="pw-letzte ${extra.tage === null || extra.tage >= 7 ? "rot" : ""}">${esc(extra.tage === null || extra.tage === undefined ? t("ladenSchirm.sicherung.nieWeg") : t("ladenSchirm.sicherung.letzteWeg", extra.tage))}</p>
      ${schalter("sicherung-pw-schalter", true, t("ladenSchirm.sicherung.mitPasswort"))}
      <div class="pw-mit">${feld}</div>`}
      <small class="pin-meldung" role="status" aria-live="polite"></small>
      ${einlesen ? "" : `<p class="hinweis pw-hinweis">${esc(t("passwort.hinweis"))}</p>
      ${schalter("sicherung-fotos-schalter", false, t("ladenSchirm.sicherung.ohneFotos"))}`}
      <button type="submit" class="knopf" data-a="${einlesen ? "sicherung-einlesen" : "sicherung-teilen"}">${esc(t(einlesen ? "passwort.einlesen" : "ladenSchirm.sicherung.verschicken"))}</button>
    </form>`);
  const f = huelle.querySelector(".pw-form"); f.addEventListener("submit", (ev) => ev.preventDefault()); // Enter = Hauptknopf (Klick-Weiche in app.js)
  f.querySelector('[data-f="passwort"]').focus({ preventScroll: true });
}
// Schalter im Sicherungs-Blatt: nur Knopf und Feld umstellen, kein Neuzeichnen. Rückgabe: Zustand { mitPasswort, ohneFotos }.
export function sicherungSchalter(art) {
  if (!pw || offen !== "passwort" || pw.zweck !== "teilen") return null;
  if (art === "passwort") pw.mitPasswort = !pw.mitPasswort; else if (art === "fotos") pw.ohneFotos = !pw.ohneFotos;
  const k = huelle.querySelector(`[data-a="${art === "passwort" ? "sicherung-pw-schalter" : "sicherung-fotos-schalter"}"]`);
  const an = art === "passwort" ? pw.mitPasswort : pw.ohneFotos;
  if (k) { k.classList.toggle("an", an); k.setAttribute("aria-pressed", String(an)); }
  if (art === "passwort") { const m = huelle.querySelector(".pw-mit"); if (m) m.classList.toggle("versteckt", !pw.mitPasswort); passwortMeldung(""); if (pw.mitPasswort) huelle.querySelector('[data-f="passwort"]')?.focus({ preventScroll: true }); }
  return { mitPasswort: pw.mitPasswort, ohneFotos: pw.ohneFotos };
}
export const sicherungWahl = () => (pw && pw.zweck === "teilen" ? { mitPasswort: pw.mitPasswort, ohneFotos: pw.ohneFotos } : { mitPasswort: true, ohneFotos: false });
// Nach dem Teilen/Herunterladen: einmal fragen, wo die Datei jetzt liegt. Nur „Anderes Gerät, Mail, Cloud“ zählt als Sicherung (app.js).
export const ortFrageOffen = () => offen === "sicherungort";
export function ortFrageZeigen() {
  zeigen("sicherungort", `<div class="hilfe-inhalt"><span class="ks">${sym("package")}</span><b>${esc(t("ladenSchirm.sicherung.woFrage"))}</b></div>
    <button type="button" class="knopf" data-a="sicherung-ort" data-wert="woanders">${esc(t("ladenSchirm.sicherung.woanders"))}</button>
    <button type="button" class="knopf zweit" data-a="sicherung-ort" data-wert="handy">${esc(t("ladenSchirm.sicherung.nurHandy"))}</button>`);
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
    ${da ? `<button type="button" class="leise" data-a="rettung-neu">${esc(t(rettungGesetzt(wurzel) ? "rettung.neuAnlegen" : "rettung.anlegen"))}</button>` : ""}
    ${da ? `<button type="button" class="leise" data-a="pin-entfernen">${esc(t("ebene.pin.entfernen"))}</button>` : ""}</div>`;
}

