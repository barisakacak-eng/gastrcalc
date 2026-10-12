// Etappe 5: „Müll" in zwei Tipps – drei Türen (Gericht weg, Rohware weg, Eimer gewogen), Personalessen extra.
// Dreisprachige Kacheln: die Sprache der App groß, die beiden anderen klein darunter – die Aushilfe erkennt ihre Sprache sofort.
import { t, tAlle, einheitLabel } from "../i18n.js";
import { esc, parseZahl, fmtEuro, fmtZahl, heute, wertAnzeige } from "../util.js";
import { EINHEITEN } from "../data/katalog.js";
import { schwundAuswertung, mengeUmrechnen, SCHWUND_ARTEN, SVEV_2026, preisJeBasis } from "../engine.js";
import { gerichtWeg, rohwareWeg, eimerEintragen, eimerVerrechnen, personalessen, heuteJeGericht, letzterEintrag, mahlzeitJetzt } from "../muell.js";
import { nav } from "./nav.js";
import { datumLesbar, tagGewaehlt, eintragName, eintragMenge } from "./tag.js";

let ansicht = "start";   // "start" | "gericht" | "rohware" | "eimer" | "personal"
let suche = "";          // Rohware: Suchtext
let wahl = null;         // Rohware: gewählter Artikel {name, menge, einheit}
let eimer = { kg: null, name: "" };
let mahlzeit = null;     // Personalessen: gewählte Mahlzeit (null = nach Uhrzeit)
let zeigeTage = false;   // Datumsleiste für Nachträge eingeblendet
let letzterTipp = { id: "", zeit: 0 }; // Doppeltipp-Schutz auf derselben Kachel (Review Etappe 5, Punkt 13)
const EINHEITEN_JE_BASIS = { g: ["g", "kg"], ml: ["ml", "l"], stk: ["stk"] };

export const muellKennung = () => `${ansicht}:${wahl ? wahl.name : ""}`;
export function muellZuruecksetzen() { ansicht = "start"; suche = ""; wahl = null; eimer = { kg: null, name: "" }; mahlzeit = null; zeigeTage = false; }
export function muellZurueck() { if (wahl) { wahl = null; return true; } if (ansicht !== "start") { ansicht = "start"; return true; } return false; }

// Kacheltext in drei Sprachen: aktive Sprache groß, die anderen klein.
function dreisprachig(key) {
  const alle = tAlle(key); const aktiv = t(key);
  const andere = Object.values(alle).filter((x) => x && x !== aktiv);
  return `<b>${esc(aktiv)}</b><small>${esc([...new Set(andere)].join(" · "))}</small>`;
}

export function muellView(stand) {
  const D = tagGewaehlt(); const nach = D !== heute();
  const kopf = (titel, unter = "") => `<div class="kopfband"><h1>${esc(titel)}</h1><div class="unter">${esc(unter || `${stand.betrieb.name} · ${datumLesbar(D)}`)}${nach ? ` · ${esc(t("kuehl.nacherfasst"))}` : ""}</div></div>`;
  if (ansicht === "gericht") return kopf(t("muell.gerichtWeg"), t("muell.tippen")) + gerichteView(stand, D, "gericht") + nav("muell");
  if (ansicht === "personal") return kopf(t("muell.personal"), t("muell.tippenPersonal")) + gerichteView(stand, D, "personal") + nav("muell");
  if (ansicht === "rohware") return kopf(t("muell.rohwareWeg")) + rohwareView(stand, D) + nav("muell");
  if (ansicht === "eimer") return kopf(t("muell.eimer")) + eimerView(stand, D) + nav("muell");
  const heuteEintraege = (stand.schwund || []).filter((e) => e.datum === D && !e.storniert).slice().reverse().slice(0, 8);
  const sw = schwundAuswertung(stand, { von: D, bis: D });
  return `${kopf(t("muell.titel"))}
    <div class="inhalt">
      ${nach ? `<div class="tipp">${esc(t("tag.nacherfassenHinweis"))}</div>` : ""}
      <div class="tueren3">
        <button type="button" class="kachel tuer" data-a="muell-weg" data-wert="gericht">${dreisprachig("muell.gerichtWeg")}<small class="fein">${esc(t("muell.gerichtWegKurz"))}</small></button>
        <button type="button" class="kachel tuer" data-a="muell-weg" data-wert="rohware">${dreisprachig("muell.rohwareWeg")}<small class="fein">${esc(t("muell.rohwareKurz"))}</small></button>
        <button type="button" class="kachel tuer" data-a="muell-weg" data-wert="eimer">${dreisprachig("muell.eimer")}<small class="fein">${esc(t("muell.eimerKurz"))}</small></button>
      </div>
      <button type="button" class="knopf zweit" data-a="muell-weg" data-wert="personal">${esc(t("muell.personal"))} · ${esc(Object.values(tAlle("muell.personal")).filter((x) => x !== t("muell.personal")).join(" · "))}</button>
      <div class="karte">
        <h2>${esc(t("muell.heuteSchon"))}</h2>
        ${heuteEintraege.length ? `<div class="liste eng">${heuteEintraege.map((e) => eintragZeile(e, stand)).join("")}</div>
          <div class="summenzeile"><span>${esc(t("tag.heuteWert"))}</span><span class="wert">${fmtEuro(sw.muellwert, { dezimal: 2 })}${sw.ohneWert ? ` <span class="marke offen">+${sw.ohneWert} ${esc(t("tag.ohneWert"))}</span>` : ""}</span></div>` : `<div class="hinweis">${esc(t("muell.leerHeute"))}</div>`}
      </div>
      ${nach || zeigeTage ? "" : `<button type="button" class="leise" data-a="muell-nachtragen">${esc(t("muell.nachtragen"))}</button>`}
      ${nach || zeigeTage ? `<div class="chips">${letzteTage(7).map((d, i) => `<button type="button" class="chip klein ${D === d ? "an" : ""}" data-a="tag-datum" data-wert="${d}">${esc(i === 0 ? t("tag.titel") : i === 1 ? t("tag.gestern") : datumLesbar(d).slice(0, 5))}</button>`).join("")}</div>` : ""}
      <button type="button" class="zeileknopf" data-a="nav" data-wert="listen"><span><b>${esc(t("listen.titel"))}</b><small>${esc(t("listen.unter"))}</small></span><span class="pfeil">›</span></button>
    </div>
    ${nav("muell")}`;
}
const letzteTage = (n) => { const out = []; for (let i = 0; i < n; i++) { const d = new Date(); d.setDate(d.getDate() - i); out.push(heute(d)); } return out; };

function eintragZeile(e, stand) {
  const wert = typeof e.wert === "number" ? fmtEuro(e.wert, { dezimal: 2 }) : `<span class="marke offen">${esc(t("tag.keinPreis"))}</span>`;
  const menge = e.art === "eimer" ? t("tag.eimerZeile", fmtZahl(e.gewogen, 1), fmtZahl(e.menge, 1)) : eintragMenge(e);
  const betrag = e.art === "personal" ? fmtEuro((Number(e.menge) || 0) * (SVEV_2026[e.mahlzeit] ?? SVEV_2026.mittag), { dezimal: 2 }) : wert;
  return `<div class="zeile"><div class="oben"><div class="name">${esc(e.art === "eimer" ? t("muell.eimer") + (e.ref?.name ? " " + e.ref.name : "") : eintragName(e, stand))}<small>${e.art === "eimer" ? esc(menge) : `${esc(t("tag.arten." + e.art))} · ${esc(menge)}`}</small></div>
    <div style="text-align:right"><b>${betrag}</b><button type="button" class="leise" data-a="schwund-storno" data-id="${esc(e.id)}">${esc(t("tag.zuruecknehmen"))}</button></div></div></div>`;
}

// Gericht-Kacheln mit Zähler: ein Tipp = ein Eintrag; „Rückgängig" nimmt den letzten zurück.
function gerichteView(stand, D, art) {
  const z = heuteJeGericht(stand, D, art); const sw = schwundAuswertung(stand, { von: D, bis: D });
  const m = mahlzeit || mahlzeitJetzt();
  return `<div class="inhalt">
    <button type="button" class="leise" data-a="muell-start">‹ ${esc(t("muell.zurueck"))}</button>
    ${art === "personal" ? `<div class="chips">${["fruehstueck", "mittag", "abend"].map((x) => `<button type="button" class="chip klein ${m === x ? "an" : ""}" data-a="muell-mahlzeit" data-wert="${x}">${esc(t("tag.mahlzeiten." + x))}</button>`).join("")}</div><span class="marke">${esc(t("tag.personalHinweis"))}</span>` : ""}
    ${stand.gerichte.length ? `<div class="zweier">${stand.gerichte.map((g) => `
      <div class="kachel zaehlkachel ${z[g.id] ? "an" : ""}">
        <button type="button" class="tipp-flaeche" data-a="muell-gericht" data-id="${esc(g.id)}" data-art="${art}"><b>${esc(g.name)}</b><span class="zaehl ${z[g.id] ? "" : "leer"}">${z[g.id] || 0}</span></button>
        <div class="unterzeile">${art === "gericht" ? `<button type="button" class="leise" data-a="muell-gericht" data-id="${esc(g.id)}" data-art="${art}" data-n="5">${esc(t("muell.fuenf"))}</button>` : "<span></span>"}${z[g.id] ? `<button type="button" class="leise" data-a="muell-rueck" data-id="${esc(g.id)}" data-art="${art}">${esc(t("muell.rueckgaengig"))}</button>` : ""}</div>
      </div>`).join("")}</div>` : `<div class="karte leer"><div>${esc(t("muell.keineGerichte"))}</div><button type="button" class="knopf zweit" data-a="bearbeiten" data-schritt="karte" data-bis="ergebnis">${esc(t("start.karteAnlegen"))}</button></div>`}
    ${art === "gericht" ? `<div class="karte"><h2>${esc(D === heute() ? t("muell.heuteWeg") : t("tag.eintraegeAm", datumLesbar(D)))}</h2><div class="gross">${fmtEuro(sw.muellwert, { dezimal: 2 })}</div><small class="marke">${sw.portionen !== null && sw.muellwert > 0 ? esc(t("cockpit.portionenKurz", fmtZahl(sw.portionen, sw.portionen < 10 ? 1 : 0))) : ""}${sw.ohneWert ? ` · ${esc(t("listen.ohneWert", sw.ohneWert))}` : ""}</small></div>` : ""}
  </div>`;
}

function rohwareView(stand, D) {
  const q = suche.trim().toLowerCase();
  const artikel = (stand.artikel || []).filter((a) => a.benutzt !== false || preisJeBasis(a) !== null);
  if (wahl) {
    const basis = EINHEITEN[wahl.einheit]?.basis || "stk";
    const a = artikel.find((x) => x.name === wahl.name);
    const probe = a && wahl.menge > 0 ? (() => { const kopie = structuredClone(stand); const e = rohwareWeg(kopie, a, { datum: D, menge: wahl.menge, einheit: wahl.einheit }); return e ? e.wert : null; })() : null;
    return `<div class="inhalt">
      <button type="button" class="leise" data-a="muell-rohware-zu">‹ ${esc(t("tag.andere"))}</button>
      <div class="karte formular">
        <h2>${esc(t("muell.wieViel", wahl.name))}</h2>
        <div class="betrag">
          <div class="periode">${EINHEITEN_JE_BASIS[basis].map((e) => `<button type="button" class="${wahl.einheit === e ? "an" : ""}" data-a="muell-einheit" data-wert="${e}">${esc(einheitLabel(e))}</button>`).join("")}</div>
          <input inputmode="decimal" data-f="muell-menge" value="${esc(wertAnzeige(wahl.menge))}" placeholder="" aria-label="${esc(t("tag.wieViel"))}">
        </div>
        ${probe !== null ? `<span class="marke">${esc(t("tag.wert"))} <b>${fmtEuro(probe, { dezimal: 2 })}</b></span>` : wahl.menge > 0 ? `<span class="marke offen">${esc(t("tag.keinPreisLang"))}</span>` : ""}
        <button type="button" class="knopf glut" data-a="muell-rohware-speichern" ${wahl.menge > 0 ? "" : "disabled"}>${esc(t("tag.speichern"))}</button>
      </div>
    </div>`;
  }
  const treffer = artikel.filter((a) => !q || a.name.toLowerCase().includes(q));
  const gruppen = [...new Set(treffer.map((a) => a.gruppe))];
  return `<div class="inhalt">
    <button type="button" class="leise" data-a="muell-start">‹ ${esc(t("muell.zurueck"))}</button>
    <input class="textfeld" data-f="muell-suche" value="${esc(suche)}" placeholder="${esc(t("muell.suchen"))}" autocomplete="off">
    ${artikel.length ? gruppen.map((g) => `<div class="gruppe">${esc(t("warengruppen." + g))}</div><div class="zweier">${treffer.filter((a) => a.gruppe === g).map((a) => `<button type="button" class="kachel klein" data-a="muell-artikel" data-name="${esc(a.name)}"><b>${esc(a.name)}</b></button>`).join("")}</div>`).join("") : `<div class="karte leer"><div>${esc(t("muell.keineArtikel"))}</div></div>`}
  </div>`;
}

function eimerView(stand, D) {
  const v = eimer.kg > 0 ? eimerVerrechnen(stand, D, eimer.kg) : null;
  const gemeldet = eimerVerrechnen(stand, D, 0).gemeldet;
  return `<div class="inhalt">
    <button type="button" class="leise" data-a="muell-start">‹ ${esc(t("muell.zurueck"))}</button>
    <div class="karte formular">
      <h2>${esc(t("muell.gewicht"))}</h2>
      <div class="zahlfeld"><input inputmode="decimal" data-f="eimer-kg" value="${esc(wertAnzeige(eimer.kg))}" placeholder="0,0" aria-label="kg" autocomplete="off"><span class="einheit">kg</span></div>
      ${gemeldet > 0 ? `<span class="marke">${esc(t("muell.eimerHinweis", fmtZahl(gemeldet, 1)))}</span>` : ""}
      ${v ? `<span class="marke ${v.wert === null && v.rest > 0 ? "offen" : ""}">${esc(v.wert === null ? t("muell.eimerOhnePreis", fmtZahl(v.rest, 1)) : t("muell.eimerErgebnis", fmtZahl(v.rest, 1), fmtEuro(v.wert, { dezimal: 2 })))}</span>` : ""}
      <input class="textfeld" data-f="eimer-name" value="${esc(eimer.name)}" maxlength="30" placeholder="${esc(t("muell.eimerName"))}" autocomplete="off">
      <button type="button" class="knopf glut" data-a="muell-eimer-speichern" ${eimer.kg > 0 ? "" : "disabled"}>${esc(t("tag.speichern"))}</button>
    </div>
  </div>`;
}

// ---------- Aktionen ----------
export function muellAktion(name, el, stand) {
  const D = tagGewaehlt();
  if (name === "muell-weg") { ansicht = el.dataset.wert; suche = ""; wahl = null; return true; }
  if (name === "muell-start") { ansicht = "start"; wahl = null; return true; }
  if (name === "muell-nachtragen") { zeigeTage = true; return true; }
  if (name === "muell-mahlzeit") { mahlzeit = el.dataset.wert; return true; }
  if (name === "muell-gericht") {
    const g = stand.gerichte.find((x) => x.id === el.dataset.id); if (!g) return false;
    const n = Number(el.dataset.n) || 1;
    const kennung = g.id + ":" + n; const jetzt = Date.now();
    if (letzterTipp.id === kennung && jetzt - letzterTipp.zeit < 250) return false; // zweiter Tipp eines Doppeltipps (Menschen tippen bewusst nicht schneller)
    letzterTipp = { id: kennung, zeit: jetzt };
    if (el.dataset.art === "personal") { personalessen(stand, g, { datum: D, mahlzeit: mahlzeit || mahlzeitJetzt() }); return { meldung: t("muell.personalEingetragen", g.name) }; }
    gerichtWeg(stand, g, { datum: D, anzahl: n });
    return { meldung: t("muell.eingetragen", g.name, heuteJeGericht(stand, D, "gericht")[g.id] || 0) };
  }
  if (name === "muell-rueck") { const e = letzterEintrag(stand, D, el.dataset.art, el.dataset.id); if (!e) return false; e.storniert = true; e.storniertZeit = new Date().toISOString(); return true; }
  if (name === "muell-artikel") { const a = stand.artikel.find((x) => x.name === el.dataset.name); if (!a) return false; wahl = { name: a.name, menge: null, einheit: a.packung?.einheit || a.einheit || "stk" }; suche = ""; return true; }
  if (name === "muell-rohware-zu") { wahl = null; return true; }
  if (name === "muell-einheit") { if (!wahl) return false; wahl.menge = mengeUmrechnen(wahl.menge, wahl.einheit, el.dataset.wert); wahl.einheit = el.dataset.wert; return true; }
  if (name === "muell-rohware-speichern") {
    const a = wahl && stand.artikel.find((x) => x.name === wahl.name); if (!a || !(wahl.menge > 0)) return false;
    const e = rohwareWeg(stand, a, { datum: D, menge: wahl.menge, einheit: wahl.einheit }); wahl = null; ansicht = "start";
    return e ? { meldung: t("tag.gespeichert") } : false;
  }
  if (name === "muell-eimer-speichern") {
    if (!(eimer.kg > 0)) return false;
    const e = eimerEintragen(stand, { datum: D, kg: eimer.kg, name: eimer.name.trim() }); const kg = eimer.kg; eimer = { kg: null, name: "" }; ansicht = "start";
    return e ? { meldung: t("muell.eimerEingetragen", fmtZahl(kg, 1)) } : false;
  }
  if (name === "schwund-storno") {
    const e = stand.schwund.find((x) => x.id === el.dataset.id); if (!e || e.storniert) return false;
    if (!confirm(t("tag.stornoFrage"))) return false;
    e.storniert = true; e.storniertZeit = new Date().toISOString(); return true;
  }
  return false;
}

export function muellEingabe(feld, wert) {
  if (feld === "muell-suche") { suche = wert; return true; }
  if (feld === "muell-menge") { if (wahl) { const n = parseZahl(wert); wahl.menge = n !== null && n <= 100000 ? n : null; } return "knopf"; }
  if (feld === "eimer-kg") { const n = parseZahl(wert); eimer.kg = n !== null && n <= 1000 ? n : null; return "knopf"; }
  if (feld === "eimer-name") { eimer.name = wert; return false; }
  return false;
}
export const muellFormGueltig = () => (ansicht === "rohware" ? !!(wahl && wahl.menge > 0) : ansicht === "eimer" ? eimer.kg > 0 : false);
export const muellAnsicht = () => ansicht;
