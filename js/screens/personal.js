// Personal-Modus (Drei Ebenen, Punkt 9 – 15.10.2026): drei Fotokacheln Müll · Kühlung · Putzen, kein einziger Euro.
// Die Person wird einmal je Schicht gewählt (je Gerät gemerkt) und steht danach an jedem Eintrag (von: personId).
// Verlassen nur mit Büro-Code über das Schloss in der Kopfleiste (nav.js, data-a="schloss"); ohne Code gibt es keinen Personal-Modus (W2-S).
import { t, sprache, datumText } from "../i18n.js";
import { esc, heuteGeschaeft as heute } from "../util.js"; // Paket 3 (16.10.2026), M7: eine Schicht endet mit dem Geschäftstag (4 Uhr), nicht um Mitternacht
import { sym } from "../symbole.js";
import { personalZahlen } from "../personal.js"; // Trennung 2 (17.10.2026)
import { modus } from "../modus.js";
import { nav } from "./nav.js";
import { vonNachtragen as vonNachtragenR } from "../stamm.js"; // Trennung (17.10.2026)

// ---------- Kontext: ist gerade Personal-Modus? (app.js setzt die Wurzel bei jedem Zeichnen) ----------
let kontextWurzel = null;
let seit = null; // ab wann Einträge dieser Person zugeschrieben werden (Eintritt in den Personal-Modus)
export function personalKontext(wurzel) {
  const vorher = modus(kontextWurzel) === "personal" && kontextWurzel === wurzel;
  kontextWurzel = wurzel;
  if (modus(wurzel) === "personal" && !vorher) seit = new Date().toISOString();
}
export const personalAktiv = () => modus(kontextWurzel) === "personal";

// ---------- Wer arbeitet gerade? Einmal je Schicht (= Tag) und Laden, je Gerät gemerkt ----------
const SCHLUESSEL = "gc-schicht-person";
const lesen = () => { try { return JSON.parse(localStorage.getItem(SCHLUESSEL) || "{}") || {}; } catch { return {}; } };
let gemerkt = null; // Ersatz, wenn das Gerät keinen Speicher erlaubt
const aktive = (stand) => (stand?.personen || []).filter((p) => !p.entfernt && p.aktiv !== false);

export function schichtPerson(stand, datum = heute()) {
  const alle = { ...(gemerkt || {}), ...lesen() }; const x = alle[stand?.id];
  if (!x || x.datum !== datum) return null;
  if (x.id === "") return ""; // ausdrücklich ohne Namen
  return aktive(stand).some((p) => p.id === x.id) ? x.id : null;
}
export function schichtPersonSetzen(stand, id, datum = heute()) {
  const alle = lesen(); alle[stand.id] = { id: id || "", datum };
  gemerkt = alle;
  try { localStorage.setItem(SCHLUESSEL, JSON.stringify(alle)); } catch { /* ohne Speicher gilt die Wahl bis zum Neuladen */ }
  seit = new Date().toISOString();
}
export function schichtPersonVergessen(stand) {
  const alle = lesen(); delete alle[stand.id]; if (gemerkt) delete gemerkt[stand.id];
  try { localStorage.setItem(SCHLUESSEL, JSON.stringify(alle)); } catch { /* egal */ }
}
// Die Person, deren Name an neue Einträge kommt (nur im Personal-Modus)
export const personalVon = (stand) => (personalAktiv() ? schichtPerson(stand) || null : null);
const nameVon = (stand, id) => aktive(stand).find((p) => p.id === id)?.kuerzel || "";

// Einträge seit dem Eintritt in den Personal-Modus ohne Person bekommen die Schicht-Person. Trennung (17.10.2026): geschrieben wird in js/stamm.js.
export const vonNachtragen = (stand, von, ab = seit) => vonNachtragenR(stand, von, ab);
export function personalNachtragen(stand) { return personalAktiv() ? vonNachtragen(stand, schichtPerson(stand)) : 0; }

// Trennung 2 (17.10.2026): personalZahlen wohnt in js/personal.js

const SCHLOSS = `<svg class="sym" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>`;
export const schlossKnopf = () => `<button type="button" class="schlossknopf" data-a="ebene-verlassen" aria-label="${esc(t("personal.verlassen"))}">${SCHLOSS}</button>`;
// Kopfleiste im Personal-Modus: links frei oder Zurück, Mitte Logo, rechts Schloss
// Kopf im Personal-Modus kommt aus nav.js (Zurück, Logo, Schloss – fragt immer den Büro-Code) – eine Leiste für alle Personal-Bildschirme.
export const personalLeiste = () => nav("personal");

// ---------- Ansicht ----------
export function personalView(stand) {
  const personen = aktive(stand); const wer = schichtPerson(stand);
  if (personen.length && wer === null) return personalLeiste() + werView(personen);
  const z = personalZahlen(stand);
  const name = wer ? nameVon(stand, wer) : "";
  const datum = datumText(new Date(), { weekday: "long", day: "numeric", month: "long" });
  const kachel = (ziel, bild, symbol, farbe, titel, pille, klasse = "") => `<button type="button" class="riesenkachel ${klasse}" data-a="personal-ziel" data-wert="${ziel}">
      ${bild ? `<img src="foto/${bild}.webp" alt="">` : `<span class="putzmuster" aria-hidden="true">${sym("spray-can")}</span>`}
      <span class="rt"><span class="ks" style="color:var(${farbe})">${sym(symbol)}</span><b>${esc(titel)}</b>${pille || ""}</span></button>`;
  const kuehlPille = z.kuehlOffen === null ? "" : z.kuehlOffen > 0 ? `<span class="pille">${esc(t("personal.offen", z.kuehlOffen))}</span>` : `<span class="pille ruhig">${sym("check")}</span>`;
  const putzPille = z.putzen ? `<span class="pille ruhig zahl">${z.putzen.erledigt} / ${z.putzen.gesamt}</span>` : "";
  return `${personalLeiste()}<div class="inhalt personalstart">
    <div class="personalkopf"><span class="avatar">${esc((name || "?").slice(0, 1).toUpperCase())}</span><div><b>${esc(name ? t("personal.hallo", name) : t("personal.halloOhne"))}</b><small>${esc(datum)}</small></div>
      ${personen.length ? `<button type="button" class="leise personwechsel" data-a="personal-wechseln">${esc(t("personal.wechseln"))}</button>` : ""}</div>
    ${kachel("muell", "m-eimer-foto", "trash-2", "--muell", t("personal.muell"), "")}
    ${kachel("kuehl", "k-getraenke-foto", "snowflake", "--branche", t("personal.kuehlung"), kuehlPille)}
    ${kachel("putzplan", null, "spray-can", "--salbei-tief", t("personal.putzen"), putzPille, "putz")}
  </div>`;
}

function werView(personen) {
  return `<div class="inhalt personalstart">
    <h1 class="personalfrage">${esc(t("personal.werBistDu"))}</h1>
    <div class="personenraster">${personen.map((p) => `<button type="button" class="karte personwahl" data-a="personal-wer" data-id="${esc(p.id)}"><span class="avatar">${esc((p.kuerzel || "?").slice(0, 1).toUpperCase())}</span><b>${esc(p.kuerzel)}</b></button>`).join("")}</div>
    <button type="button" class="leise" data-a="personal-wer" data-id="">${esc(t("personal.ohneNamen"))}</button>
  </div>`;
}

// true = neu zeichnen; { ziel } = Bildschirm wechseln (app.js setzt die Ansicht)
export function personalAktion(name, el, stand) {
  if (name === "personal-wer") { schichtPersonSetzen(stand, el.dataset.id); return true; }
  if (name === "personal-wechseln") { schichtPersonVergessen(stand); return true; }
  if (name === "personal-ziel") return { ziel: el.dataset.wert };
  return false;
}

// Andere Anrede im Personal-Modus (Baris 27.10.2026, 10:51: „nur ne andere Anrede“): Zeki sagt dort nicht „Chef“,
// sondern spricht den Mitarbeiter mit seinem Namen an (ohne Namen: ohne Anrede). Gilt für alle 18 Sprachen.
const ANREDE = /^(Chef|Usta|Boss|يا معلّم|رئیس|Hosta|Szefie|Șefu'|Шефе|Šefe|Шеф|Shef|Αφεντικό|Capo|Jefe|Sếp ơi|Sếp)\s*[,،!]\s*/u;
export function anredeTeam(satz, stand) {
  if (!personalAktiv() || typeof satz !== "string" || !ANREDE.test(satz)) return satz;
  const rest = satz.replace(ANREDE, "").replace(/ Sếp kiểm/u, " Kiểm");
  const name = nameVon(stand, schichtPerson(stand));
  return name ? `\u2068${name}\u2069, ${rest}` : rest.charAt(0).toLocaleUpperCase() + rest.slice(1);
}
