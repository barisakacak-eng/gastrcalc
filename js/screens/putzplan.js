// Putzplan-Bildschirm (Baris 15.10.2026, 12:43: HACCP-Grundreinigung als Empfehlung, wenn die Einrichtung fertig ist).
// Drei Ansichten: einrichten (Geräte und Aufgaben wählen), plan (heute abhaken), nachweis (Liste für die Kontrolle, druckbar).
import { t, sprache } from "../i18n.js";
import { esc, heute } from "../util.js";
import { AUFGABEN, GERAETE, TAKT_TAGE } from "../data/putzplan.js";
import { planVon, planVorschlag, aufgabenFuer, planGruppen, abhaken, zuruecknehmen, nachweis } from "../putzplan.js";
import { datumLesbar } from "./tag.js";
import { sym } from "../symbole.js";
import { nav } from "./nav.js";
import { personalAktiv } from "./personal.js"; // W2-S: Einrichten nur außerhalb des Personal-Modus

let ansicht = "plan"; // plan | einrichten | nachweis
let entwurf = null;   // Plan während des Einrichtens
// Wer hakt ab (Nachtester 15.10.: Nachweis ohne Person zählt für den Kontrolleur nicht). Pro Gerät gemerkt.
let werId = (() => { try { return localStorage.getItem("gc-putz-wer") || null; } catch { return null; } })();
const aktivePersonen = (stand) => (stand.personen || []).filter((p) => !p.entfernt && p.aktiv !== false);
const kuerzel = (stand, id) => { const p = (stand.personen || []).find((x) => x.id === id); return p ? p.kuerzel || p.name || "" : ""; };
export const putzplanZuruecksetzen = () => { ansicht = "plan"; entwurf = null; };
export const putzplanZurueck = (stand) => { if (ansicht !== "plan" && planVon(stand)?.aktiv) { ansicht = "plan"; entwurf = null; return true; } return false; };

const text = (a) => a.text[sprache()] || a.text.de;
const stufeMarke = (a) => `<span class="pstufe ${a.stufe}">${esc(t("putzplan.stufe." + a.stufe))}</span>`;

function einrichtenView(stand) {
  entwurf ??= planVon(stand) ? { ...planVon(stand), geraete: [...planVon(stand).geraete], aus: [...planVon(stand).aus] } : planVorschlag(stand);
  const liste = AUFGABEN.filter((a) => a.gilt === "alle" || entwurf.geraete.includes(a.gilt));
  const an = liste.filter((a) => !entwurf.aus.includes(a.id));
  const zahl = (takt) => an.filter((a) => a.takt === takt).length;
  return `<div class="kopfband"><h1>${esc(t("putzplan.titel"))}</h1><div class="unter">${esc(t("putzplan.einrichtenUnter"))}</div></div>
    <div class="inhalt putzplan">
      <div class="karte"><p class="putzerklaerung">${esc(t("putzplan.erklaerung"))}</p><small class="fein">${esc(t("putzplan.quellenHinweis"))}</small></div>
      <h2>${esc(t("putzplan.geraeteFrage"))}</h2>
      <div class="chips">${GERAETE.map((g) => `<button type="button" class="chip ${entwurf.geraete.includes(g) ? "an" : ""}" data-a="pp-geraet" data-wert="${g}" aria-pressed="${entwurf.geraete.includes(g)}">${esc(t("putzplan.geraete." + g))}</button>`).join("")}</div>
      <p class="hinweis">${esc(t("putzplan.zusammen", zahl("tag"), zahl("woche"), zahl("monat"), zahl("quartal") + zahl("jahr") + zahl("zweijahre"), zahl("nach")))}</p>
      <button type="button" class="knopf glut" data-a="pp-uebernehmen">${esc(t(planVon(stand)?.aktiv ? "putzplan.speichern" : "putzplan.uebernehmen"))}</button>
      <h2>${esc(t("putzplan.aufgabenAnpassen"))}</h2>
      ${["tag", "woche", "monat", "quartal", "jahr", "zweijahre", "nach"].map((takt) => { const xs = liste.filter((a) => a.takt === takt); return xs.length ? `<h3 class="pptakt">${esc(t("putzplan.takt." + takt))}</h3>
        ${xs.map((a) => `<button type="button" class="pwahl ${entwurf.aus.includes(a.id) ? "" : "an"}" data-a="pp-aufgabe" data-id="${a.id}" aria-pressed="${!entwurf.aus.includes(a.id)}"><span class="knebel" aria-hidden="true"></span><span class="ptext"><b>${esc(text(a))}</b><small>${esc(a.warum)}</small>${stufeMarke(a)}</span></button>`).join("")}` : ""; }).join("")}
      ${planVon(stand)?.aktiv ? `<button type="button" class="leise" data-a="pp-ansicht" data-wert="plan">${esc(t("allgemein.zurueck"))}</button>` : `<button type="button" class="leise" data-a="pp-spaeter">${esc(t("putzplan.spaeter"))}</button>`}
    </div>`;
}

const statusText = (a) => {
  if (a.status === "erledigt") return a.letzte.datum === heute() ? t("putzplan.erledigtUm", a.letzte.zeit) : t("putzplan.erledigtAm", datumLesbar(a.letzte.datum).slice(0, 6));
  if (a.status === "ueberfaellig") return a.letzte ? t("putzplan.ueberfaelligSeit", a.alter - TAKT_TAGE[a.takt]) : t("putzplan.nochNie");
  return a.letzte ? t("putzplan.zuletzt", datumLesbar(a.letzte.datum).slice(0, 6)) : t("putzplan.faellig");
};

function planView(stand) {
  const g = planGruppen(stand); const personen = aktivePersonen(stand);
  const r = 24, u = 2 * Math.PI * r;
  const zeile = (a) => `<button type="button" class="aufgabe ${a.status}" data-a="pp-haken" data-id="${a.id}" aria-pressed="${a.status === "erledigt"}">
      <span class="box">${a.status === "erledigt" ? sym("check") : ""}</span><span class="atext"><b>${esc(text(a))}</b><small>${esc(statusText(a))}</small>${a.stufe === "pflicht" ? stufeMarke(a) : ""}</span></button>`;
  const block = (key, xs, nurFaellig) => { const zeig = xs.filter((a) => a.status !== "spaeter" && (!nurFaellig || a.status !== "erledigt" || a.letzte?.datum === heute())); return zeig.length ? `<h2 class="pptakt">${esc(t("putzplan.gruppe." + key))}</h2><div class="planliste">${zeig.map(zeile).join("")}</div>` : ""; };
  return `<div class="kopfband"><h1>${esc(t("putzplan.titel"))}</h1><div class="unter">${esc(stand.betrieb.name || "")}${stand.betrieb.name ? " · " : ""}${esc(datumLesbar(heute()))}</div></div>
    <div class="inhalt putzplan">
      <div class="karte ringkopf"><svg width="60" height="60" viewBox="0 0 60 60" aria-hidden="true"><circle cx="30" cy="30" r="${r}" fill="none" stroke="var(--papier-tief)" stroke-width="7"/><circle cx="30" cy="30" r="${r}" fill="none" stroke="var(--eigen)" stroke-width="7" stroke-linecap="round" stroke-dasharray="${(u * (g.gesamt ? g.erledigt / g.gesamt : 0)).toFixed(1)} ${u.toFixed(1)}" transform="rotate(-90 30 30)"/></svg>
        <div><b>${esc(g.offen ? t("putzplan.heuteOffen", g.offen) : t("putzplan.allesErledigt"))}</b><small>${esc(g.ueberfaellig ? t("putzplan.ueberfaelligZahl", g.ueberfaellig) : t("putzplan.stand", g.erledigt, g.gesamt))}</small></div></div>
      ${personen.length ? `<div class="werabhakt"><small>${esc(t("putzplan.wer"))}</small><div class="chips">${personen.map((p) => `<button type="button" class="chip ${werId === p.id ? "an" : ""}" data-a="pp-wer" data-id="${esc(p.id)}">${esc(p.kuerzel || p.name || "?")}</button>`).join("")}</div></div>` : ""}
      ${block("tag", g.tag, false)}${block("woche", g.woche, true)}${block("monat", g.monat, true)}${block("spaeter", g.spaeter, true)}
      ${g.hinweise.length ? `<div class="karte"><h2>${esc(t("putzplan.gruppe.nach"))}</h2>${g.hinweise.map((a) => `<p class="phinweis">• ${esc(text(a))}</p>`).join("")}</div>` : ""}
      <button type="button" class="knopf zweit" data-a="pp-ansicht" data-wert="nachweis">${esc(t("putzplan.nachweis"))}</button>
      ${personalAktiv() ? "" : `<button type="button" class="leise" data-a="pp-ansicht" data-wert="einrichten">${esc(t("putzplan.anpassen"))}</button>`}
    </div>${nav("putzplan")}`;
}

function nachweisView(stand) {
  const bis = heute(); const d = new Date(bis + "T12:00"); d.setDate(d.getDate() - 29); const von = d.toISOString().slice(0, 10);
  const es = nachweis(stand, von, bis); const tage = [...new Set(es.map((e) => e.datum))];
  const name = (id) => { const a = AUFGABEN.find((x) => x.id === id); return a ? text(a) : id; };
  return `<div class="kopfband"><h1>${esc(t("putzplan.nachweisTitel"))}</h1><div class="unter">${esc(stand.betrieb.name || "")} · ${esc(datumLesbar(von))} – ${esc(datumLesbar(bis))}</div></div>
    <div class="inhalt putzplan nachweis">
      <p class="hinweis">${esc(t("putzplan.nachweisHinweis"))}</p>
      ${tage.length ? tage.map((tg) => `<div class="karte"><h2>${esc(datumLesbar(tg))}</h2>${es.filter((e) => e.datum === tg).map((e) => `<div class="summenzeile"><span>${esc(name(e.aufgabe))}</span><span class="wert">${esc(e.zeit)}${e.von ? ` · ${esc(kuerzel(stand, e.von))}` : ""}</span></div>`).join("")}</div>`).join("") : `<div class="karte leer">${esc(t("putzplan.nachweisLeer"))}</div>`}
      <div class="unterschrift"><span>${esc(t("putzplan.kontrolliert"))}</span><span class="linie"></span></div>
      <button type="button" class="knopf zweit nichtdrucken" data-a="pp-drucken">${esc(t("putzplan.drucken"))}</button>
      <button type="button" class="leise nichtdrucken" data-a="pp-ansicht" data-wert="plan">${esc(t("allgemein.zurueck"))}</button>
    </div>`;
}

export function putzplanView(stand) {
  if (personalAktiv()) { // W2-S (p02 K2): kein Einrichten im Personal-Modus – ohne Plan nur der Hinweis
    if (ansicht === "einrichten") { ansicht = "plan"; entwurf = null; }
    if (!planVon(stand)?.aktiv) return `<div class="kopfband"><h1>${esc(t("putzplan.titel"))}</h1></div><div class="inhalt putzplan"><div class="karte"><p class="hinweis">${sym("lock")} ${esc(t("sicherheit.chefRichtetEin"))}</p></div></div>${nav("putzplan")}`;
  }
  if (!planVon(stand)?.aktiv || ansicht === "einrichten") return einrichtenView(stand) + nav("putzplan");
  if (ansicht === "nachweis") return nachweisView(stand) + nav("putzplan");
  return planView(stand);
}

// true = neu zeichnen, "speichern" = sofort sichern
export function putzplanAktion(name, el, stand) {
  if (name === "pp-ansicht") { ansicht = el.dataset.wert; if (ansicht !== "einrichten") entwurf = null; return true; }
  if (name === "pp-geraet") { const g = el.dataset.wert; entwurf.geraete = entwurf.geraete.includes(g) ? entwurf.geraete.filter((x) => x !== g) : [...entwurf.geraete, g]; return true; }
  if (name === "pp-aufgabe") { const id = el.dataset.id; entwurf.aus = entwurf.aus.includes(id) ? entwurf.aus.filter((x) => x !== id) : [...entwurf.aus, id]; return true; }
  if (name === "pp-uebernehmen") { stand.putzplan = { ...entwurf, aktiv: true, seit: planVon(stand)?.seit || heute() }; entwurf = null; ansicht = "plan"; return "speichern"; }
  if (name === "pp-haken") { const a = planGruppen(stand); const x = [...a.tag, ...a.woche, ...a.monat, ...a.spaeter].find((y) => y.id === el.dataset.id); if (!x) return false;
    if (x.status === "erledigt" && x.letzte?.datum === heute()) zuruecknehmen(stand, x.id); else abhaken(stand, x.id, { von: aktivePersonen(stand).some((p) => p.id === werId) ? werId : null }); return "speichern"; }
  if (name === "pp-wer") { werId = el.dataset.id; try { localStorage.setItem("gc-putz-wer", werId); } catch { /* egal */ } return true; }
  if (name === "pp-spaeter") { stand.putzplanSpaeter = heute(); return "zurueck"; }
  if (name === "pp-drucken") { setTimeout(() => window.print(), 50); return false; }
  return false;
}
export { aufgabenFuer };
