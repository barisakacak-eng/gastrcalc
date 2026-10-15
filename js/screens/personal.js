// Personal-Modus (Drei Ebenen, Punkt 9 – 15.10.2026): drei Fotokacheln Müll · Kühlung · Putzen, kein einziger Euro.
// Die Person wird einmal je Schicht gewählt (je Gerät gemerkt) und steht danach an jedem Eintrag (von: personId).
// Verlassen (Schloss) verdrahtet Entwickler A über data-a="ebene-verlassen".
import { t, sprache } from "../i18n.js";
import { esc, heute } from "../util.js";
import { sym } from "../symbole.js";
import { kuehlStatus, offeneNachkontrollen } from "../engine.js";
import { planVon, planGruppen } from "../putzplan.js";
import { modus } from "../modus.js";
import { nav } from "./nav.js";

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

// Einträge seit dem Eintritt in den Personal-Modus ohne Person bekommen die Schicht-Person (Kühlrundgang, Messungen, Putzhaken, Müll).
// Rein und gezielt: nur Einträge ohne von, nur ab „seit".
export function vonNachtragen(stand, von, ab = seit) {
  if (!von || !ab || !stand) return 0;
  let n = 0;
  const setze = (e, zeit) => { if (e && !e.von && String(zeit || "") >= ab) { e.von = von; n += 1; } };
  for (const e of stand.schwund || []) setze(e, e.erfasst);
  for (const e of stand.putzlog || []) setze(e, e.erfasst);
  for (const r of stand.rundgaenge || []) { setze(r, r.gestartet); for (const m of r.messungen || []) setze(m, m.erfasst || r.gestartet); }
  for (const m of stand.messungen || []) setze(m, m.erfasst);
  return n;
}
export function personalNachtragen(stand) { return personalAktiv() ? vonNachtragen(stand, schichtPerson(stand)) : 0; }

// ---------- Zahlen für die Kacheln (ohne Euro) ----------
export function personalZahlen(stand) {
  const ks = kuehlStatus(stand);
  const kuehlOffen = ks.eingerichtet ? Math.max(0, ks.stellen - ks.heuteGemessen) + offeneNachkontrollen(stand).length : null;
  const plan = planVon(stand)?.aktiv ? planGruppen(stand) : null;
  return { kuehlOffen, putzen: plan ? { erledigt: plan.erledigt, gesamt: plan.gesamt } : null };
}

const SCHLOSS = `<svg class="sym" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>`;
export const schlossKnopf = () => `<button type="button" class="schlossknopf" data-a="ebene-verlassen" aria-label="${esc(t("personal.verlassen"))}">${SCHLOSS}</button>`;
// Kopfleiste im Personal-Modus: links frei oder Zurück, Mitte Logo, rechts Schloss
// Kopf im Personal-Modus kommt aus nav.js (Entwickler A: Zurück, Logo, Schloss mit 2-s-Druck oder Code) – eine Leiste für alle Personal-Bildschirme.
export const personalLeiste = () => nav("personal");

// ---------- Ansicht ----------
export function personalView(stand) {
  const personen = aktive(stand); const wer = schichtPerson(stand);
  if (personen.length && wer === null) return personalLeiste() + werView(personen);
  const z = personalZahlen(stand);
  const name = wer ? nameVon(stand, wer) : "";
  const datum = new Date().toLocaleDateString(sprache(), { weekday: "long", day: "numeric", month: "long" });
  const kachel = (ziel, bild, symbol, farbe, titel, pille, klasse = "") => `<button type="button" class="riesenkachel ${klasse}" data-a="personal-ziel" data-wert="${ziel}">
      ${bild ? `<img src="foto/${bild}.webp" alt="">` : `<span class="putzmuster" aria-hidden="true">${sym("spray-can")}</span>`}
      <span class="rt"><span class="ks" style="color:var(${farbe})">${sym(symbol)}</span><b>${esc(titel)}</b>${pille || ""}</span></button>`;
  const kuehlPille = z.kuehlOffen === null ? "" : z.kuehlOffen > 0 ? `<span class="pille">${esc(t("personal.offen", z.kuehlOffen))}</span>` : `<span class="pille ruhig">${sym("check")}</span>`;
  const putzPille = z.putzen ? `<span class="pille ruhig zahl">${z.putzen.erledigt} / ${z.putzen.gesamt}</span>` : "";
  return `${personalLeiste()}<div class="inhalt personalstart">
    <div class="personalkopf"><span class="avatar">${esc((name || "?").slice(0, 1).toUpperCase())}</span><div><b>${esc(name ? t("personal.hallo", name) : t("personal.halloOhne"))}</b><small>${esc(datum)}</small></div>
      ${personen.length ? `<button type="button" class="leise personwechsel" data-a="personal-wechseln">${esc(t("personal.wechseln"))}</button>` : ""}</div>
    ${kachel("muell", "m-eimer-foto", "trash-2", "--muell", t("personal.muell"), "")}
    ${kachel("kuehl", "k-kuehlschrank-foto", "snowflake", "--branche", t("personal.kuehlung"), kuehlPille)}
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
