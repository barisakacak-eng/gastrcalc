// Etappe 3/5: die Listen (Schwund, Müll je Fraktion, Personalessen) und gemeinsame Helfer für Datum und Einträge.
// Die Eingabe selbst liegt seit Etappe 5 in muell.js (Müll) und umsatz.js (Tagesumsatz). Einträge werden nur angehängt; Rücknahme = storniert.
import { t, einheitLabel, sprache } from "../i18n.js";
import { esc, parseZahl, fmtEuro, fmtZahl, heute } from "../util.js";
import { wertEintrag, schwundAuswertung, zeitraumTage, monatsZeitraum, schwundWertSetzen, SCHWUND_ARTEN, SVEV_2026 } from "../engine.js";
import { nav } from "./nav.js";

let listenZeitraum = "woche"; // "woche" | "monat"
let tagDatum = null;          // gewählter Tag auf „Heute" (null = heute); Vergangenheit = Nacherfassung, gekennzeichnet
export const tagGewaehlt = () => tagDatum || heute();
export function tagZuruecksetzen() { tagDatum = null; }

// Name des Eintrags: zuerst der gemerkte Name (überlebt das Löschen des Gerichts), sonst aus der Karte.
export function eintragName(e, stand) {
  if (e.art === "eimer") return t("muell.eimer") + (e.ref?.name ? " " + e.ref.name : "");
  if (e.ref?.typ === "gericht") return stand.gerichte.find((g) => g.id === e.ref.id)?.name || e.ref.name || "?";
  return e.ref?.name || "?";
}
export function eintragMenge(e) {
  if (e.art === "eimer") return t("tag.eimerZeile", fmtZahl(e.gewogen, 1), fmtZahl(e.menge, 1));
  if (e.ref?.typ === "gericht") return `${fmtZahl(e.menge, Number.isInteger(e.menge) ? 0 : 1)} ${t("tag.portionen")}`;
  return `${fmtZahl(e.menge, e.einheit === "stk" ? 0 : 2)} ${einheitLabel(e.einheit)}`;
}
// Was ein Eintrag „wert" ist: Vorgang 1 zum Einkaufspreis, Personalessen zum Sachbezugswert (mit Wareneinsatz als Nebensatz), Eigenverbrauch zum Wareneinsatz.
function eintragBetrag(e, stand) {
  const waren = "wert" in e ? (typeof e.wert === "number" ? e.wert : null) : wertEintrag(e, stand);
  if (e.wertOffen && waren === null && !e.storniert) return `<span class="packung"><input inputmode="decimal" data-f="wert:${esc(e.id)}" placeholder="${esc(t("tag.wertNachtragen"))}" aria-label="${esc(t("tag.wertNachtragen"))}"><span class="einheit">€</span></span>`;
  if (e.art === "personal") return `<b>${fmtEuro((Number(e.menge) || 0) * (SVEV_2026[e.mahlzeit] ?? SVEV_2026.mittag), { dezimal: 2 })}</b><small class="marke">${esc(t("tag.sachbezug"))}${waren !== null ? ` · ${esc(t("tag.warenKurz"))} ${fmtEuro(waren, { dezimal: 2 })}` : ""}</small>`;
  return `<b>${waren === null ? `<span class="marke offen">${esc(t("tag.keinPreis"))}</span>` : fmtEuro(waren, { dezimal: 2 })}</b>`;
}

export function listenView(stand) {
  const z = listenZeitraum === "monat" ? monatsZeitraum() : zeitraumTage(7);
  const a = schwundAuswertung(stand, z);
  const eintraege = (stand.schwund || []).filter((e) => e.datum >= z.von && e.datum <= z.bis).slice().reverse();
  return `
    <div class="kopfband"><h1>${esc(t("listen.titel"))}</h1><div class="unter">${esc(stand.betrieb.name)}</div></div>
    <div class="inhalt">
      <div class="chips"><button type="button" class="chip ${listenZeitraum === "woche" ? "an" : ""}" data-a="listen-zeitraum" data-wert="woche">${esc(t("listen.woche"))}</button><button type="button" class="chip ${listenZeitraum === "monat" ? "an" : ""}" data-a="listen-zeitraum" data-wert="monat">${esc(t("listen.monat"))}</button></div>
      <div class="karte">
        <h2>${esc(t("listen.muell"))}</h2>
        <div class="gross">${fmtEuro(a.muellwert, { dezimal: 2 })}</div>
        ${a.portionen !== null ? `<div class="hinweis">${esc(t("listen.portionen", fmtZahl(a.portionen, a.portionen < 10 ? 1 : 0), fmtEuro(a.dbJePortion, { dezimal: 2 })))}</div>` : `<div class="hinweis">${esc(t("listen.portionenFehlen"))}</div>`}
        ${a.ohneWert ? `<span class="marke offen">${esc(t("listen.ohneWert", a.ohneWert))}</span>` : ""}
        ${Object.keys(a.jeArt).map((k) => `<div class="summenzeile"><span>${esc(t("tag.arten." + k))}</span><span class="wert">${fmtEuro(a.jeArt[k], { dezimal: 2 })}</span></div>`).join("")}
      </div>
      <div class="karte">
        <h2>${esc(t("listen.fraktionen"))}</h2>
        ${Object.keys(a.jeFraktion).length ? Object.keys(a.jeFraktion).map((k) => `<div class="summenzeile"><span>${esc(t("tag.fraktionen." + k))} <span class="marke">(${a.jeFraktion[k].anzahl})</span></span><span class="wert">${fmtEuro(a.jeFraktion[k].wert, { dezimal: 2 })}</span></div>`).join("") : `<div class="hinweis">${esc(t("listen.leer"))}</div>`}
      </div>
      <div class="karte">
        <h2>${esc(t("listen.personal"))}</h2>
        <div class="summenzeile"><span>${esc(t("listen.personalAnzahl"))}</span><span class="wert">${fmtZahl(a.personal.anzahl)}</span></div>
        <div class="summenzeile"><span>${esc(t("listen.personalSvev"))}</span><span class="wert">${fmtEuro(a.personal.svev, { dezimal: 2 })}</span></div>
        <div class="summenzeile"><span>${esc(t("listen.personalWaren"))}</span><span class="wert">${fmtEuro(a.personal.waren, { dezimal: 2 })}</span></div>
        <span class="marke">${esc(t("listen.svevStand", fmtEuro(SVEV_2026.tag, { dezimal: 2 })))}</span>
        ${a.eigen.anzahl ? `<div class="summenzeile"><span>${esc(t("listen.eigen"))}</span><span class="wert">${fmtZahl(a.eigen.anzahl)} · ${fmtEuro(a.eigen.waren, { dezimal: 2 })}</span></div><span class="marke">${esc(t("listen.eigenHinweis"))}</span>` : ""}
      </div>
      <div class="karte">
        <h2>${esc(t("listen.schwundliste"))}</h2>
        ${eintraege.length ? `<div class="liste eng">${eintraege.map((e) => `<div class="zeile ${e.storniert ? "storno" : ""}"><div class="oben"><div class="name">${esc(datumLesbar(e.datum))}<small>${esc(eintragText(e, stand))}</small></div><div style="text-align:right">${eintragBetrag(e, stand)}${e.storniert ? "" : `<button type="button" class="leise klein" data-a="schwund-storno" data-id="${esc(e.id)}">${esc(t("muell.rueckgaengig"))}</button>`}</div></div></div>`).join("")}</div>` : `<div class="hinweis">${esc(t("listen.leer"))}</div>`}
        <span class="marke">${esc(t("listen.amtHinweis"))}</span>
      </div>
    </div>
    ${nav("umsatz")}`;
}

function eintragText(e, stand) {
  const name = eintragName(e, stand); const menge = eintragMenge(e);
  return `${t("tag.arten." + e.art)}${e.art === "eimer" ? "" : ` · ${name}`} · ${menge}${e.storniert ? ` · ${t("tag.storniert")}` : ""}`;
}

export function datumLesbar(iso) {
  const [j, m, d] = iso.split("-"); return `${d}.${m}.${j}`;
}
// Monatsname und Wochentag in der Sprache der App (für Zähler und Cockpit).
const LOCALE = { de: "de-DE", tr: "tr-TR", en: "en-GB", bs: "bs-BA", ku: "ku" }; // sonst gilt der Sprachcode selbst (ar, ru, vi …)
const loc = () => LOCALE[sprache()] || sprache();
export function monatName(iso) { const [j, m] = iso.split("-").map(Number); return new Date(j, m - 1, 1).toLocaleDateString(loc(), { month: "long" }); }
export function tagLesbar(iso) { const [j, m, d] = iso.split("-").map(Number); return new Date(j, m - 1, d).toLocaleDateString(loc(), { weekday: "long", day: "numeric", month: "long" }); }
export const zeitKurz = (iso) => { const d = new Date(iso); if (Number.isNaN(d.getTime())) return "–"; return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`; };

// ---------- Aktionen und Eingaben (von app.js aufgerufen) ----------
export function tagAktion(name, el, stand) {
  if (name === "tag-datum") { tagDatum = el.dataset.wert === heute() ? null : el.dataset.wert; return true; }
  if (name === "listen-zeitraum") { listenZeitraum = el.dataset.wert; return true; }
  if (name === "schwund-storno") {
    const e = stand.schwund.find((x) => x.id === el.dataset.id); if (!e || e.storniert) return false;
    if (!confirm(t("tag.stornoFrage"))) return false;
    e.storniert = true; e.storniertZeit = new Date().toISOString(); return true; // nie löschen, nur kennzeichnen
  }
  return false;
}

// Wert eines offenen Schwund-Eintrags nachtragen – beim Verlassen des Feldes, einmalig.
export function tagWertUebernehmen(feld, wert, stand) {
  if (!feld.startsWith("wert:")) return false;
  const e = stand.schwund.find((x) => x.id === feld.slice(5)); const n = parseZahl(wert);
  if (e && n !== null && n > 0) return schwundWertSetzen(e, n);
  return false;
}
