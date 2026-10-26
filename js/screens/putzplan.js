// Putzplan-Bildschirm (Baris 15.10.2026, 12:43: HACCP-Grundreinigung als Empfehlung, wenn die Einrichtung fertig ist).
// Drei Ansichten: einrichten (Geräte und Aufgaben wählen), plan (heute abhaken), nachweis (Liste für die Kontrolle, druckbar).
import { PUTZ_TEXTE } from "../data/putzplan_texte.js";
import { PUTZ_KURZ } from "../data/putzplan_kurz.js"; // Baris 20.10.2026: „Putzen kurz“ im Laden
import { t, sprache } from "../i18n.js";
import { esc, heute } from "../util.js";
import { AUFGABEN, GERAETE, TAKT_TAGE } from "../data/putzplan.js";
import { planVon, planVorschlag, aufgabenFuer, planGruppen, abhaken, zuruecknehmen, nachweis, planUebernehmen } from "../putzplan.js"; // W2-H: planUebernehmen
import { datumLesbar } from "./tag.js";
import { sym } from "../symbole.js";
import { nav } from "./nav.js";
import { putzplanSpaeterSetzen } from "../stamm.js"; // Trennung (17.10.2026)
import { personalAktiv } from "./personal.js";
import { FOTOS } from "../data/fotos.js"; // W2-S: Einrichten nur außerhalb des Personal-Modus

let ansicht = "plan"; // plan | einrichten | nachweis
let entwurf = null;   // Plan während des Einrichtens
let offen = null;     // Laden: Aufgabe, deren voller Text aufgeklappt ist (Details per Tipp)
// Wer hakt ab (Nachtester 15.10.: Nachweis ohne Person zählt für den Kontrolleur nicht). Pro Gerät gemerkt.
let werId = (() => { try { return localStorage.getItem("gc-putz-wer") || null; } catch { return null; } })();
const aktivePersonen = (stand) => (stand.personen || []).filter((p) => !p.entfernt && p.aktiv !== false);
const kuerzel = (stand, id) => { const p = (stand.personen || []).find((x) => x.id === id); return p ? p.kuerzel || p.name || "" : ""; };
// Laden-Umbau (20.10.2026): gewählte Person, sonst bei genau einer Person diese (keine Auswahl nötig), sonst ohne
const werFuer = (stand) => { const ps = aktivePersonen(stand); return ps.some((p) => p.id === werId) ? werId : ps.length === 1 ? ps[0].id : null; };
export const putzplanZuruecksetzen = () => { ansicht = "plan"; entwurf = null; offen = null; };
export const putzplanZurueck = (stand) => { if (ansicht !== "plan" && planVon(stand)?.aktiv) { ansicht = "plan"; entwurf = null; return true; } return false; };

const text = (a) => a.text[sprache()] || PUTZ_TEXTE[sprache()]?.[a.id] || a.text.de; // 20.10.2026: 15 weitere Sprachen
// Paket 6 (17.10.2026): Begründung wie der Titel in der aktiven Sprache (sonst Deutsch); alte Form (Text) bleibt lesbar
const kurz = (a) => PUTZ_KURZ[sprache()]?.[a.id] || text(a); // Laden: 2–3 Wörter; ohne Übersetzung der volle Text der Sprache
const warum = (a) => (typeof a.warum === "string" ? a.warum : a.warum?.[sprache()] || a.warum?.de || "");
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
        ${xs.map((a) => `<button type="button" class="pwahl ${entwurf.aus.includes(a.id) ? "" : "an"}" data-a="pp-aufgabe" data-id="${a.id}" aria-pressed="${!entwurf.aus.includes(a.id)}"><span class="knebel" aria-hidden="true"></span><span class="ptext"><b>${esc(text(a))}</b><small>${esc(warum(a))}</small>${stufeMarke(a)}</span></button>`).join("")}` : ""; }).join("")}
      ${planVon(stand)?.aktiv ? `<button type="button" class="leise" data-a="pp-ansicht" data-wert="plan">${esc(t("allgemein.zurueck"))}</button>` : `<button type="button" class="leise" data-a="pp-spaeter">${esc(t("putzplan.spaeter"))}</button>`}
    </div>`;
}

const statusText = (a) => {
  if (a.status === "erledigt") return a.letzte.datum === heute() ? t("putzplan.erledigtUm", a.letzte.zeit) : t("putzplan.erledigtAm", datumLesbar(a.letzte.datum).slice(0, 6));
  if (a.status === "ueberfaellig") return a.letzte ? t("putzplan.ueberfaelligSeit", a.alter - TAKT_TAGE[a.takt]) : t("putzplan.nochNie");
  return a.letzte ? t("putzplan.zuletzt", datumLesbar(a.letzte.datum).slice(0, 6)) : t("putzplan.faellig");
};

// Laden-Umbau (20.10.2026): im Laden Kopf „Putzen x / y“ und die Liste zum Abhaken – ohne Ring, Status-Unterzeilen und Stufen-Marken.
// Rot (überfällig) zeigt die Zeile selbst. Wer abhakt (Kürzel), Nachweis und Anpassen bleiben; im Büro (buero: true) wie bisher mit Status.
// Laden-Schablone (27.10.2026, Baris: „Kein einziges Bild, AB/CD versteht keiner, 0/20 erschlägt“): Zeki sagt in einem Satz, was dran ist;
// nur Fälliges, jede Aufgabe mit Bild; Erledigtes klappt zusammen. Bilder: Sanjis p-*-Fotos, sonst passendes vorhandenes Foto, sonst Piktogramm.
const PUTZ_BILD = { R01: ["p-arbeitsflaechen"], R02: ["p-arbeitsflaechen"], R03: ["p-spuele"], R04: ["p-boden-ablauf"], R05: ["p-handwaschbecken"],
  R07: ["p-doenergrill", "hero-doenergrill"], R08: ["p-doenergrill", "hero-doenergrill"], R09: ["u-spiess-rest", "hero-doenergrill"], R10: ["p-doenergrill", "hero-doenergrill"],
  R11: ["p-fritteuse", "g-pommes"], R13: ["p-fritteuse", "g-pommes"], R14: ["p-pizzaofen", "laden-pizza"], R15: ["p-dunstabzug"], R16: ["p-dunstabzug"], R17: ["p-dunstabzug"],
  R19: ["k-saladette-foto"], R20: ["k-saladette-foto"], R21: ["p-kuehlschrank-innen", "k-kuehlschrank-lebensmittel-foto"], R22: ["p-kuehlschrank-innen", "k-kuehlschrank-lebensmittel-foto"],
  R23: ["k-tiefkuehler-foto"], R32: ["p-lager"], R33: ["p-muelltonnen", "m-eimer-foto"], R34: ["p-muelltonnen", "m-biotonne-foto"] };
const putzBild = (a) => { const f = (PUTZ_BILD[a.id] || []).find((n) => FOTOS.has(n));
  return f ? `<img class="pbild" src="foto/${f}.webp" alt="" loading="lazy">` : `<span class="pbild pikto" aria-hidden="true">${sym("spray-can")}</span>`; };
function ladenPlanView(stand) {
  const g = planGruppen(stand); const personen = aktivePersonen(stand);
  const faellig = [...g.tag, ...g.woche, ...g.monat].filter((a) => a.status !== "spaeter");
  const auf = faellig.filter((a) => a.status !== "erledigt");
  const fertig = faellig.filter((a) => a.status === "erledigt" && a.letzte?.datum === heute());
  const zeile = (a) => `<div class="pzeile p2">
      <button type="button" class="aufgabe ${a.status}" data-a="pp-haken" data-id="${a.id}" aria-pressed="${a.status === "erledigt"}" aria-label="${esc(text(a))}">
        ${putzBild(a)}<span class="atext"><b>${esc(kurz(a))}</b></span><span class="box">${a.status === "erledigt" ? sym("check") : ""}</span></button>
      <button type="button" class="pmehr" data-a="pp-mehr" data-id="${a.id}" aria-expanded="${offen === a.id}" aria-label="${esc(text(a))}">${sym("circle-help")}</button>
      ${offen === a.id ? `<p class="pwarum">${esc(text(a))}${warum(a) ? " – " + esc(warum(a)) : ""}</p>` : ""}</div>`;
  const satz = auf.length ? t("putzplan.zeki.offen", auf.length, kurz(auf[0])) : t("putzplan.zeki.fertig");
  return `<div class="kopfband putzkopf"><h1>${esc(t("ebene.tabs.putzplan"))}</h1></div>
    <div class="inhalt putzplan p-schablone">
      <p class="zeki-zeile ${auf.length ? "" : "a-gruen"}" role="status">${esc(satz)}</p>
      ${personen.length > 1 ? `<div class="werabhakt"><span class="wer-titel">${esc(t("putzplan.werKurz"))}</span><div class="chips">${personen.map((p) => `<button type="button" class="chip klein ${werId === p.id ? "an" : ""}" data-a="pp-wer" data-id="${esc(p.id)}">${esc(p.name || p.kuerzel || "")}</button>`).join("")}</div></div>` : ""}
      ${auf.length ? `<div class="planliste">${auf.map(zeile).join("")}</div>` : ""}
      ${fertig.length ? `<details class="p-fertig"><summary>${esc(t("putzplan.zeki.erledigt", fertig.length))}</summary><div class="planliste">${fertig.map(zeile).join("")}</div></details>` : ""}
    </div>${nav("putzplan")}`;
}

function planView(stand, { buero = false } = {}) {
  if (!buero) return ladenPlanView(stand);
  const g = planGruppen(stand); const personen = aktivePersonen(stand);
  const haken = (a) => `<button type="button" class="aufgabe ${a.status}" data-a="pp-haken" data-id="${a.id}" aria-pressed="${a.status === "erledigt"}" aria-label="${esc(text(a))} · ${esc(statusText(a))}">
      <span class="box">${a.status === "erledigt" ? sym("check") : ""}</span><span class="atext"><b>${esc(buero ? text(a) : kurz(a))}</b>${buero ? `<small>${esc(statusText(a))}</small>${a.stufe === "pflicht" ? stufeMarke(a) : ""}` : ""}</span></button>`;
  // Laden (20.10.2026, „Putzen kurz“): kurze Aufgabe zum Abhaken, daneben ein Pfeil – Tipp klappt den vollen Text auf
  const zeile = (a) => buero ? haken(a) : `<div class="pzeile">${haken(a)}<button type="button" class="pmehr" data-a="pp-mehr" data-id="${a.id}" aria-expanded="${offen === a.id}" aria-label="${esc(text(a))}">${sym(offen === a.id ? "chevron-up" : "chevron-down")}</button></div>${offen === a.id ? `<p class="pdetail">${esc(text(a))}</p>` : ""}`;
  const block = (key, xs, nurFaellig) => { const zeig = xs.filter((a) => a.status !== "spaeter" && (!nurFaellig || a.status !== "erledigt" || a.letzte?.datum === heute())); return zeig.length ? `${key === "tag" && !buero ? "" : `<h2 class="pptakt">${esc(t("putzplan.gruppe." + key))}</h2>`}<div class="planliste">${zeig.map(zeile).join("")}</div>` : ""; };
  return `<div class="kopfband putzkopf"><h1>${esc(t(buero ? "putzplan.titel" : "ebene.tabs.putzplan"))} <span class="zahl">\u2066${g.erledigt} / ${g.gesamt}\u2069</span></h1></div>
    <div class="inhalt putzplan">
      ${personen.length > 1 ? `<div class="werabhakt"><div class="chips">${personen.map((p) => `<button type="button" class="chip klein ${werId === p.id ? "an" : ""}" data-a="pp-wer" data-id="${esc(p.id)}" aria-label="${esc(t("putzplan.wer"))} ${esc(p.kuerzel || p.name || "?")}">${esc(p.kuerzel || p.name || "?")}</button>`).join("")}</div></div>` : ""}
      ${block("tag", g.tag, false)}${block("woche", g.woche, true)}${block("monat", g.monat, true)}${block("spaeter", g.spaeter, true)}
      ${buero && g.hinweise.length ? `<div class="karte"><h2>${esc(t("putzplan.gruppe.nach"))}</h2>${g.hinweise.map((a) => `<p class="phinweis">• ${esc(text(a))}</p>`).join("")}</div>` : ""}
      ${buero ? `<button type="button" class="knopf zweit" data-a="pp-ansicht" data-wert="nachweis">${esc(t("putzplan.nachweis"))}</button>` : ""}
      ${buero && !personalAktiv() ? `<button type="button" class="leise" data-a="pp-ansicht" data-wert="einrichten">${esc(t("putzplan.anpassen"))}</button>` : ""}
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

// buero: true = Büro-Modus (Einrichten, Anpassen, Status je Aufgabe). Im Laden gibt es keine Einrichtung: app.js legt beim Betreten still den
// Vorschlag nach Laden-Art an (putzplan.js planSicherstellen); fehlt er trotzdem (Personal, alter Stand), zeigt der Laden nur den Chef-Hinweis.
export function putzplanView(stand, { buero = false } = {}) {
  if (!buero && ansicht === "einrichten") { ansicht = "plan"; entwurf = null; }
  if (!buero && !planVon(stand)?.aktiv) return `<div class="kopfband"><h1>${esc(t("ebene.tabs.putzplan"))}</h1></div><div class="inhalt putzplan"><div class="karte"><p class="hinweis">${sym("lock")} ${esc(t("sicherheit.chefRichtetEin"))}</p></div></div>${nav("putzplan")}`;
  if (personalAktiv()) { // W2-S (p02 K2): kein Einrichten im Personal-Modus – ohne Plan nur der Hinweis
    if (ansicht === "einrichten") { ansicht = "plan"; entwurf = null; }
    if (!planVon(stand)?.aktiv) return `<div class="kopfband"><h1>${esc(t("putzplan.titel"))}</h1></div><div class="inhalt putzplan"><div class="karte"><p class="hinweis">${sym("lock")} ${esc(t("sicherheit.chefRichtetEin"))}</p></div></div>${nav("putzplan")}`;
  }
  if (!planVon(stand)?.aktiv || ansicht === "einrichten") return einrichtenView(stand) + nav("putzplan");
  if (ansicht === "nachweis" && !buero) ansicht = "plan"; // „Putzen kurz“: Liste für die Kontrolle nur im Büro
  if (ansicht === "nachweis") return nachweisView(stand) + nav("putzplan");
  return planView(stand, { buero });
}

// true = neu zeichnen, "speichern" = sofort sichern
export function putzplanAktion(name, el, stand) {
  if (name === "pp-ansicht") { ansicht = el.dataset.wert; if (ansicht !== "einrichten") entwurf = null; return true; }
  if (name === "pp-geraet") { const g = el.dataset.wert; entwurf.geraete = entwurf.geraete.includes(g) ? entwurf.geraete.filter((x) => x !== g) : [...entwurf.geraete, g]; return true; }
  if (name === "pp-aufgabe") { const id = el.dataset.id; entwurf.aus = entwurf.aus.includes(id) ? entwurf.aus.filter((x) => x !== id) : [...entwurf.aus, id]; return true; }
  if (name === "pp-uebernehmen") { planUebernehmen(stand, entwurf); entwurf = null; /* W2-H: Änderung gilt ab heute (Verlauf) */ ansicht = "plan"; return "speichern"; }
  if (name === "pp-haken") { const a = planGruppen(stand); const x = [...a.tag, ...a.woche, ...a.monat, ...a.spaeter].find((y) => y.id === el.dataset.id); if (!x) return false;
    if (x.status === "erledigt" && x.letzte?.datum === heute()) zuruecknehmen(stand, x.id, heute(), { von: werFuer(stand) }); /* W2-H: wer zurücknimmt */ else abhaken(stand, x.id, { von: werFuer(stand) }); return "speichern"; }
  if (name === "pp-mehr") { offen = offen === el.dataset.id ? null : el.dataset.id; return true; }
  if (name === "pp-wer") { werId = el.dataset.id; try { localStorage.setItem("gc-putz-wer", werId); } catch { /* egal */ } return true; }
  if (name === "pp-spaeter") { putzplanSpaeterSetzen(stand, heute()); return "zurueck"; }
  if (name === "pp-drucken") { setTimeout(() => window.print(), 50); return false; }
  return false;
}
export { aufgabenFuer };
