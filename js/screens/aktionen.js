// Stufe 1 (17.10.2026): Büro-Bereich „Aktionen & Haltbarkeit“. Oben ein Satz (haltbarUhrzeit), darunter „Läuft ab“ (Verbrauchsdatum, MHD vorbei),
// „Abverkauf“ (Vorschläge mit Teilen-Text) und „Kombi-Angebot“ (Gerichte per Chips, drei Stufen, Teilen-Text für Aushang/WhatsApp-Status).
// Rechnen tun nur js/haltbar.js und js/deal.js; hier stehen Aufbau, Texte und data-Attribute. Nur vorhandene Klassen, kein eigenes CSS.
// Personal-Modus: nicht erreichbar (modus.js lässt nur Personal, Müll, Kühlung, Putzen zu). Im Laden steht nichts davon.
import { t, artikelText } from "../i18n.js";
import { esc, fmtEuro, fmtZahl } from "../util.js";
import { haltbarStand, haltbarUhrzeit, abverkaufText, datumKurz } from "../haltbar.js";
import { kombiTeileSortiert, kombiAuswahlBereinigt, kombiRechnen, kombiVorschlaege, kombiText, KOMBI_MAX } from "../deal.js";
import { kalkulation } from "../engine.js";
import { mengeBasisText as mengeText, textTeilen } from "./bausteine.js"; // Trennung (17.10.2026)
import { nav } from "./nav.js";

let auswahl = [];   // Kombi: gewählte Gericht-Kennungen (2–4)

export const aktionenKennung = () => auswahl.join(",");
export function aktionenZuruecksetzen() { auswahl = []; }
// Zurück-Geste: erst die Kombi-Auswahl leeren; false = den Bereich verlassen
export function aktionenZurueck() { if (!auswahl.length) return false; auswahl = []; return true; }

const was = (text) => `<p class="inv-was"><b>${esc(t("inventur.wasHeisst"))}</b> ${esc(text)}</p>`;
const euro = (v, ca = false) => (v === null || v === undefined ? "–" : (ca ? "≈ " : "") + fmtEuro(v, { dezimal: 2 }));
const menge = (m, basis) => (m === null || m === undefined ? t("aktionen.mengeUnbekannt") : "≈ " + mengeText(m, basis));

export function aktionenView(stand) {
  const kopf = `<div class="kopfband"><h1>${esc(t("aktionen.titel"))}</h1><div class="unter">${esc(t("aktionen.unter"))}</div></div>`;
  const hs = haltbarStand(stand); const uhr = haltbarUhrzeit(stand);
  const oben = uhr ? `<div class="karte ${uhr.ton === "rot" ? "hinweisrot" : "hinweisgelb"}"><h2>${esc(uhr.text)}</h2></div>` : `<div class="karte"><h2>${esc(t("aktionen.allesGut"))}</h2></div>`;
  return `${kopf}<div class="inhalt">${oben}${laeuftView(hs)}${abverkaufView(hs)}${kombiView(stand, hs)}</div>${nav("aktionen", { schnell: false })}`;
}

// ---------- Läuft ab ----------
function laeuftView(hs) {
  const ue = `<h2 class="inv-ue">${esc(t("aktionen.laeuftTitel"))}</h2>`;
  if (!hs.laeuftAb.length) return `${ue}<div class="karte leer"><div>${esc(t("aktionen.laeuftLeer"))}</div></div><p class="hinweis">${esc(t("aktionen.datumHinweis"))}</p>`;
  const zeile = (x) => {
    const st = x.status === "verbrauchen" ? t("aktionen.status.verbrauchen", datumKurz(x.ab)) : x.status === "vorbei" ? t("aktionen.status.vorbei", datumKurz(x.ablauf)) : t("aktionen.status.mhdVorbei", datumKurz(x.ablauf));
    return `<div class="summenzeile"><span><b>${esc(artikelText(x.name))}</b><br><small>${esc(st)}</small></span><span class="wert">${esc(menge(x.rest, x.basis))}</span></div>`;
  };
  return `${ue}<div class="karte ${hs.laeuftAb.some((x) => x.art === "verbrauch" && x.tage <= 1) ? "hinweisrot" : ""}">${hs.laeuftAb.map(zeile).join("")}</div>${was(t("aktionen.wasLaeuft"))}`;
}

// ---------- Abverkauf ----------
function abverkaufView(hs) {
  const ue = `<h2 class="inv-ue">${esc(t("aktionen.abverkaufTitel"))}</h2>`;
  if (!hs.abverkauf.length) return `${ue}<div class="karte leer"><div>${esc(t("aktionen.abverkaufLeer"))}</div></div>`;
  const karte = (x, i) => {
    const v = x.bester; const ware = artikelText(x.name);
    const rest = `${t("aktionen.rest", menge(x.rest, x.basis).replace(/^≈ /, ""), datumKurz(x.ablauf))}`;
    if (!v) { const lohnt = x.vorschlaege.some((y) => y.art === "lohntNicht");
      return `<div class="karte"><h2>${esc(ware)}</h2><p class="hinweis">${esc(rest)}</p><p>${esc(lohnt ? t("aktionen.lohntNicht", ware) : t("aktionen.ohneGericht", ware))}</p></div>`; }
    const ca = v.geschaetzt;
    return `<div class="karte" data-abverkauf="${i}"><h2>${esc(t("aktionen.aktion", v.name, fmtEuro(v.aktionspreis, { dezimal: 2 }), fmtEuro(v.preis, { dezimal: 2 })))}</h2>
      <p class="hinweis">${esc(t("aktionen.aktionUnter", datumKurz(v.bis), v.portionen))}</p>
      <div class="summenzeile"><span>${esc(t("aktionen.wegwerfen"))}</span><span class="wert">${esc(euro(v.verlust, true))}</span></div>
      <div class="summenzeile gesamt"><span>${esc(t("aktionen.bringt"))}</span><span class="wert">${esc(euro(v.vorteil, true))}</span></div>
      ${ca ? `<small class="marke">${esc(t("aktionen.geschaetzt"))}</small>` : ""}
      <button type="button" class="knopf zweit" data-a="akt-teilen" data-art="abverkauf" data-wert="${i}">${esc(t("aktionen.teilen"))}</button></div>`;
  };
  return `${ue}${hs.abverkauf.map(karte).join("")}${was(t("aktionen.wasAbverkauf"))}`;
}

// ---------- Kombi-Angebot ----------
function kombiView(stand, hs) {
  const ue = `<h2 class="inv-ue">${esc(t("aktionen.kombiTitel"))}</h2>`;
  const k = (stand.gerichte || []).length ? kalkulation(stand) : { zeilen: [] };
  const teile = kombiTeileSortiert(stand, k); // Trennung 2 (17.10.2026): Reihenfolge und Bereinigung in js/deal.js
  const kasse = `<p class="hinweis">${esc(t("aktionen.kasse"))}</p>`;
  if (teile.length < 2) return `${ue}<div class="karte leer"><div>${esc(t("aktionen.kombiLeer"))}</div></div>${kasse}`;
  auswahl = kombiAuswahlBereinigt(auswahl, teile); // flüchtiger Bildschirmzustand, kein Laden-Datum
  const vorschlaege = auswahl.length ? [] : kombiVorschlaege(stand, { k, hs });
  const vorschlagView = vorschlaege.length ? `<div class="karte"><h2>${esc(t("aktionen.kombiVorschlaege"))}</h2>${vorschlaege.map((v, i) => { const n = v.kombi.stufen.find((s) => s.stufe === "normal");
      return `<div class="summenzeile"><span><b>${esc(v.kombi.teile.map((x) => x.name).join(" + "))}</b><br><small>${esc(v.grund === "abverkauf" ? t("aktionen.grund.abverkauf", artikelText(v.ware)) : t("aktionen.grund." + v.grund))} · ${esc(fmtEuro(n.preis, { dezimal: 2 }))}</small></span><span class="wert"><button type="button" class="leise klein" data-a="akt-kombi-vorschlag" data-wert="${i}">${esc(t("aktionen.rechnen"))}</button></span></div>`; }).join("")}</div>` : "";
  const chips = `<p class="hinweis">${esc(t("aktionen.kombiWahl"))}</p><div class="chips">${teile.map((x) => { const an = auswahl.includes(x.id);
    return `<button type="button" class="chip klein ${an ? "an" : ""}" data-a="akt-kombi" data-wert="${esc(x.id)}" aria-pressed="${an}" ${!an && auswahl.length >= KOMBI_MAX ? "disabled" : ""}>${esc(x.name)}</button>`; }).join("")}</div>`;
  const ergebnis = auswahl.length >= 2 ? kombiErgebnis(stand, k) : "";
  return `${ue}${vorschlagView}${chips}${ergebnis}${kasse}${was(t("aktionen.wasKombi"))}`;
}
function kombiErgebnis(stand, k) {
  const kb = kombiRechnen(stand, auswahl, { k }); if (kb.ungueltig) return "";
  const ca = kb.geschaetzt;
  const stufe = (s) => {
    if (!s.moeglich) return `<div class="summenzeile"><span><b>${esc(t("aktionen.stufen." + s.stufe))}</b><br><small>${esc(t("aktionen.nichtMoeglich"))}</small></span><span class="wert">–</span></div>`;
    const teile = [t("aktionen.rabatt", fmtZahl(s.rabattProzent * 100, 0), fmtEuro(s.rabatt, { dezimal: 2 })), t("aktionen.rohertrag", euro(s.rohertrag, ca)), s.jeZehn === null ? t("aktionen.mehrNie") : t("aktionen.mehr", s.jeZehn)];
    return `<div class="summenzeile" data-stufe="${s.stufe}"><span><b>${esc(t("aktionen.stufen." + s.stufe))}: ${esc(fmtEuro(s.preis, { dezimal: 2 }))}</b><br><small>${esc(teile.join(" · "))}</small>
      ${s.amBoden ? `<br><small class="marke">${esc(t("aktionen.amBoden"))}</small>` : ""}${s.warnung ? `<br><small class="marke offen">${esc(t("aktionen.warnung", fmtZahl(s.warnung.quote * 100, 0), fmtZahl(s.warnung.grenze * 100, 0)) + (s.warnung.quelle === "richtwert" ? " (≈)" : ""))}</small>` : ""}</span></div>
      <button type="button" class="leise klein" data-a="akt-teilen" data-art="kombi" data-wert="${s.stufe}">${esc(t("aktionen.teilen"))}</button>`;
  };
  return `<div class="karte" data-kombi="1"><h2>${esc(kb.teile.map((x) => x.name).join(" + "))}</h2>
    <p class="hinweis">${esc(t("aktionen.einzeln", fmtEuro(kb.summe, { dezimal: 2 })))} · ${esc(t("aktionen.ware", euro(kb.waren, ca), fmtZahl(kb.quoteEinzeln * 100, 0)))}</p>
    ${kb.stufen.map(stufe).join("")}
    ${kb.fehlt.length ? `<small class="marke">${esc(t("aktionen.fehlt"))}</small>` : ""}
    <button type="button" class="leise" data-a="akt-kombi-leeren">${esc(t("aktionen.leeren"))}</button></div>`;
}

// ---------- Teilen ----------
// Wie „Lager & Bestellen“: navigator.share, sonst Kopieren, sonst zum Abschreiben zeigen.
export function aktionenTextFuer(stand, art, wert) {
  if (art === "abverkauf") { const x = haltbarStand(stand).abverkauf[Number(wert)]; return x?.bester ? abverkaufText(x.bester) : null; }
  if (art === "kombi") { const kb = kombiRechnen(stand, auswahl); const s = kb.stufen?.find((y) => y.stufe === wert); return s?.moeglich ? kombiText(kb, s) : null; }
  return null;
}
const teilen = (text) => textTeilen(text, t("aktionen.teilen")); // Trennung (17.10.2026): gemeinsames Teilen (./bausteine.js)

// ---------- Aktionen ----------
// Rückgabe: false (nicht meine) | true (neu zeichnen) | { meldung }
export async function aktionenAktion(name, el, stand) {
  if (name === "akt-kombi") { const id = el.dataset.wert; if (auswahl.includes(id)) auswahl = auswahl.filter((x) => x !== id); else if (auswahl.length < KOMBI_MAX) auswahl = [...auswahl, id]; return true; }
  if (name === "akt-kombi-leeren") { auswahl = []; return true; }
  if (name === "akt-kombi-vorschlag") { const v = kombiVorschlaege(stand)[Number(el.dataset.wert)]; if (!v) return false; auswahl = v.kombi.teile.map((x) => x.id); return true; }
  if (name === "akt-teilen") {
    const text = aktionenTextFuer(stand, el.dataset.art, el.dataset.wert); if (!text) return false;
    const weg = await teilen(text); if (weg === "abgebrochen") return false;
    return { meldung: t(weg === "kopiert" ? "aktionen.kopiert" : "aktionen.geteilt") };
  }
  return false;
}
