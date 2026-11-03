// Welle 3 (Hochtouren 03.11.2026, Bildpaket W3): Büro-Bildschirm „Geld & Finanzamt“ – nur hinter dem Schalter window.__gcW3, live erst nach Baris' Ja.
// Je Thema eine aufklappbare Karte (Überschrift + eine Zahl), Inhalt auf Tipp – Büro-Maß 120 Wörter. Nur Anzeige; Zahlen aus den Rechenkernen.
import { t } from "../i18n.js";
import { esc, fmtEuro, fmtZahl, heute, heuteGeschaeft, parseZahl, wertAnzeige } from "../util.js";
import { datumLesbar } from "../anzeige_text.js";
import { steuerTopf, steuerTopfTag, kleinunternehmer, wasBleibt, prueferBlick } from "../steuertopf.js";
import { termineLaden, liquiditaetLaden, ustRhythmusSetzen, dauerfristUmschalten, chefStundenSetzen, geldHeuteSetzen } from "../welle3.js";
import { schichtenAusLaden, zaehlerSumme, minijobGrenzeStunden, eintragStunden } from "../schichten.js";

export const geld3An = () => typeof globalThis !== "undefined" && globalThis.__gcW3 === true;
const karte = (id, titel, zahl, inhalt) => `<details class="karte auf g3-karte" data-g3="${id}"><summary><span><b>${esc(titel)}</b>${zahl ? `<small class="g3-zahl">${zahl}</small>` : ""}</span></summary>${inhalt}</details>`;
const z = (text, wert, cls = "") => `<div class="summenzeile"><span>${esc(text)}</span><span class="wert ${cls}">${wert}</span></div>`;

export function geld3View(stand) {
  const H = heuteGeschaeft(); const monat = H.slice(0, 7); const ku = kleinunternehmer(stand);
  // 3.1 Steuer-Topf
  const st = ku ? null : steuerTopf(stand, monat); const tag = ku ? null : steuerTopfTag(stand, H);
  const topf = ku ? karte("topf", t("w3.topf.titel"), "", `<p>${esc(t("w3.topf.klein"))}</p>`)
    : karte("topf", t("w3.topf.titel"), st ? `≈ ${esc(fmtEuro(Math.max(0, st.zahllast)))}` : "", `${z(t("w3.topf.monat"), `≈ ${esc(fmtEuro(Math.max(0, st?.zahllast || 0)))}`)}${z(t("w3.topf.heute"), `≈ ${esc(fmtEuro(tag?.topf || 0, { dezimal: 2 }))}`)}<small class="marke geschaetzt">${esc(t("w3.topf.schaetzung"))}</small>`);
  // 3.2 Termine
  const rh = stand.betrieb?.ustRhythmus || null; const tl = termineLaden(stand, H, 60).slice(0, 4);
  const rhChips = `<div class="chips">${["monat", "quartal"].map((w) => `<button type="button" class="chip klein ${rh === w ? "an" : ""}" data-a="g3-rhythmus" data-wert="${w}" aria-pressed="${rh === w}">${esc(t("w3.termine." + w))}</button>`).join("")}</div>`;
  const termine = karte("termine", t("w3.termine.titel"), tl[0] ? esc(datumLesbar(tl[0].datum).slice(0, 6)) : "", `${ku ? "" : `<p class="hinweis">${esc(t("w3.termine.rhythmusFrage"))}</p>${rhChips}`}
    ${tl.map((x) => z(t("w3.termine.art." + x.art), esc(datumLesbar(x.datum).slice(0, 6)) + (x.verschoben ? " *" : ""))).join("") || `<p>${esc(t("w3.termine.keine"))}</p>`}
    ${tl.some((x) => x.verschoben) ? `<small>${esc(t("w3.termine.verschoben"))}</small>` : ""}<small>${esc(t("w3.termine.erinnerung"))}</small>`);
  // 3.4 Was bleibt
  const wb = wasBleibt(stand, monat); const std = stand.chef?.stundenMonat || null;
  const bleibt = karte("bleibt", t("w3.bleibt.titel"), wb.jeStunde !== null ? `≈ ${esc(fmtEuro(wb.jeStunde, { dezimal: 2 }))} / h` : "",
    `${z(t("w3.bleibt.ergebnis"), `≈ ${esc(fmtEuro(wb.ergebnis))}`)}<div class="feldzeile"><label>${esc(t("w3.bleibt.stunden"))}</label><div class="betrag klein"><input inputmode="decimal" data-f="g3-stunden" value="${std ? esc(wertAnzeige(std)) : ""}" placeholder="260"><span class="einheit">h</span></div></div>
    <small class="marke">${esc(t("w3.bleibt.muss"))}</small>`);
  // 3.5 Prüfer-Blick
  const pb = prueferBlick(stand, monat);
  const pruefer = karte("pruefer", t("w3.pruefer.titel"), pb.quote !== null ? `${esc(fmtZahl(pb.quote * 100, 1))} %` : "",
    pb.quote === null ? `<p>${esc(t("w3.pruefer.leer"))}</p>` : `${z(t("w3.pruefer.quote"), `${esc(fmtZahl(pb.quote * 100, 1))} %`)}${z(t("w3.pruefer.aufschlag"), `${esc(fmtZahl(pb.rohaufschlag * 100, 0))} %`)}
    ${pb.abweichung !== null ? z(t("w3.pruefer.vormonat"), `${pb.abweichung > 0 ? "+" : ""}${esc(fmtZahl(pb.abweichung, 1))}`, pb.notizPflicht ? "rot" : "") : ""}
    ${pb.notizPflicht ? `<p class="minus">${esc(t("w3.pruefer.warum"))}</p>` : ""}<small class="marke">${esc(t("w3.pruefer.richtsatz", fmtZahl(pb.richtsatz.rohgewinn1 * 100, 0), fmtZahl(pb.richtsatz.rohaufschlag * 100, 0)))}</small>`);
  // 3.7 Liquidität
  const lq = liquiditaetLaden(stand, H); const geld = stand.liquiditaet;
  const lqZahl = lq.tiefster ? (lq.reicht ? esc(t("w3.geld.reicht")) : `≈ ${esc(fmtEuro(lq.fehlt))}`) : "";
  const liq = karte("geld", t("w3.geld.titel"), lqZahl, `<div class="feldzeile"><label>${esc(t("w3.geld.frage"))}</label><div class="betrag"><input inputmode="decimal" data-f="g3-geld" value="${geld ? esc(wertAnzeige(geld.betrag)) : ""}" placeholder="0"><span class="einheit">€</span></div></div>
    ${lq.tiefster ? `<p>${esc(lq.reicht ? t("w3.geld.reichtSatz", datumLesbar(lq.bis).slice(0, 6)) : t("w3.geld.fehltSatz", datumLesbar(lq.tiefster.datum).slice(0, 6), fmtEuro(lq.fehlt)))}</p>${z(t("w3.geld.tiefster"), `≈ ${esc(fmtEuro(lq.tiefster.betrag))} · ${esc(datumLesbar(lq.tiefster.datum).slice(0, 6))}`)}<small>${esc(t("w3.geld.knapper"))}</small>`
      : `<small>${esc(t(lq.fehlt === "umsatz" ? "w3.geld.ohneUmsatz" : "w3.geld.ohneGeld"))}</small>`}${lq.nachfragen && geld ? `<small class="marke offen">${esc(t("w3.geld.neu"))}</small>` : ""}`);
  // 3.8 Schichten
  const von = monat + "-01"; const pers = (stand.personen || []).filter((p) => !p.entfernt);
  const zeilen = pers.map((p) => { const s = schichtenAusLaden(stand, p.id, von, H); if (!s.length) return ""; const zs = zaehlerSumme(s, { land: stand.betrieb?.bundesland || "BW" });
    const mini = p.lohnArt === "minijob" ? ` · ${t("w3.schicht.minijob", fmtZahl(zs.gesamt, 1), fmtZahl(minijobGrenzeStunden(H), 2))}` : "";
    return z(p.kuerzel || p.name || "?", esc(t("w3.schicht.zeile", fmtZahl(zs.gesamt, 1), fmtZahl(zs.nacht25 + zs.nacht40, 1), fmtZahl(zs.sonntag + zs.feiertag125 + zs.feiertag150, 1)) + mini)); }).join("");
  const schicht = karte("schicht", t("w3.schicht.titel"), "", zeilen || `<p>${esc(t("w3.schicht.leer"))}</p>`) ;
  return `<div class="kopfband"><h1>${esc(t("w3.titel"))}</h1><div class="unter">${esc(t("w3.unter"))}</div></div>
    <div class="inhalt buero g3">${topf}${termine}${bleibt}${pruefer}${liq}${schicht}<p class="hinweis">${esc(t("w3.fuss"))}</p></div>`;
}

export function geld3Aktion(name, el, stand) {
  if (name === "g3-rhythmus") { ustRhythmusSetzen(stand, stand.betrieb.ustRhythmus === el.dataset.wert ? null : el.dataset.wert); return true; }
  if (name === "g3-dauerfrist") { dauerfristUmschalten(stand); return true; }
  return false;
}
export function geld3Eingabe(feld, wert, stand) {
  if (feld === "g3-stunden") { chefStundenSetzen(stand, parseZahl(wert)); return true; }
  if (feld === "g3-geld") { geldHeuteSetzen(stand, parseZahl(wert), heute()); return true; }
  return false;
}
export const geld3Stunden = eintragStunden; // für spätere Anzeige der Stunden je Eintrag
