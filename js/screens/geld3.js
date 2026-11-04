// Welle 3 (Hochtouren 03.11.2026, Bildpaket W3): Büro-Bildschirm „Geld & Finanzamt“ – Baris Ja am 04.11.2026; live nach dem Prüfungsausschuss (06.11.).
// Je Thema eine aufklappbare Karte (Überschrift + eine Zahl), Inhalt auf Tipp – Büro-Maß 120 Wörter. Nur Anzeige; Zahlen aus den Rechenkernen.
import { t } from "../i18n.js";
import { esc, fmtEuro, fmtZahl, heute, heuteGeschaeft, parseZahl, wertAnzeige } from "../util.js";
import { datumLesbar } from "../anzeige_text.js";
import { steuerTopf, steuerTopfTag, kleinunternehmer, wasBleibt, prueferBlick } from "../steuertopf.js";
import { termineLaden, liquiditaetLaden, monatPlus, ustRhythmusSetzen, dauerfristUmschalten, chefStundenSetzen, geldHeuteSetzen, svLandSetzen } from "../welle3.js";
import { monatEinfrieren, eingefroren, monatVergleich } from "../monatsabschluss.js";
import { BUNDESLAENDER } from "../feiertage.js";
const w3b = () => typeof globalThis !== "undefined" && globalThis.__gcW3b === true; // W3b (04.11.2026): Monat abschließen, Sitz der Krankenkasse – Entwurf hinter Schalter
import { schichtenAusLaden, zaehlerSumme, minijobGrenzeStunden, eintragStunden, schichtEintragen, schichtStunden } from "../schichten.js";
let schichtEntwurf = { person: null, datum: null, von: "", bis: "" }; // W3b: Formular „Schicht eintragen“ (Entwurf bis zum Tipp)

// Setzung 03.11.2026: unter 15 % Wareneinsatz aus Belegen fehlen vermutlich Belege (Richtsatz Imbiss ≈ 32 %) – dann keine Kennzahlen, nur dieser Hinweis
const PLAUSIBEL_AB = 0.15;
export const geld3An = () => true; // Baris Ja zu Bildpaket W3 (04.11.2026): kein Schalter mehr
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
  // 3.4/3.5 auf dem letzten vollen Monat (mitten im Monat stünden volle Monatskosten gegen halben Umsatz); ohne Vormonat mit Umsatz: noch nichts
  const vm = monatPlus(monat, -1); const vmDa = (stand.tagesnotizen || []).some((n) => !n.storniert && typeof n.umsatz === "number" && n.umsatz > 0 && n.datum.startsWith(vm));
  const pb = vmDa ? prueferBlick(stand, vm) : { quote: null }; const unplausibel = pb.quote !== null && pb.quote < PLAUSIBEL_AB;
  const wb = vmDa ? wasBleibt(stand, vm) : null; const std = stand.chef?.stundenMonat || null;
  const bleibt = unplausibel ? karte("bleibt", t("w3.bleibt.titel"), "", `<p class="minus">${esc(t("w3.pruefer.belegeFehlen", fmtZahl(pb.quote * 100, 1)))}</p>`) : !wb ? karte("bleibt", t("w3.bleibt.titel"), "", `<p>${esc(t("w3.bleibt.ersterMonat"))}</p>`) : karte("bleibt", t("w3.bleibt.titel"), wb.jeStunde !== null ? `≈ ${esc(fmtEuro(wb.jeStunde, { dezimal: 2 }))} / h` : "",
    `<small>${esc(t("w3.pruefer.monat", vm.split("-").reverse().join(".")))}</small>${z(t("w3.bleibt.ergebnis"), `≈ ${esc(fmtEuro(wb.ergebnis))}`)}<div class="feldzeile"><label>${esc(t("w3.bleibt.stunden"))}</label><div class="betrag klein"><input inputmode="decimal" data-f="g3-stunden" value="${std ? esc(wertAnzeige(std)) : ""}" placeholder="260"><span class="einheit">h</span></div></div>
    <small class="marke">${esc(t("w3.bleibt.muss"))}</small>`);
  // 3.5 Prüfer-Blick
  const pruefer = karte("pruefer", t("w3.pruefer.titel"), pb.quote !== null && !unplausibel ? `${esc(fmtZahl(pb.quote * 100, 1))} %` : "",
    pb.quote === null ? `<p>${esc(t(vmDa ? "w3.pruefer.leer" : "w3.bleibt.ersterMonat"))}</p>` : pb.quote < PLAUSIBEL_AB ? `<p class="minus">${esc(t("w3.pruefer.belegeFehlen", fmtZahl(pb.quote * 100, 1)))}</p>` : `<small>${esc(t("w3.pruefer.monat", vm.split("-").reverse().join(".")))}</small>${z(t("w3.pruefer.quote"), `${esc(fmtZahl(pb.quote * 100, 1))} %`)}${z(t("w3.pruefer.aufschlag"), `${esc(fmtZahl(pb.rohaufschlag * 100, 0))} %`)}
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
  // W3b: Schicht im Büro eintragen (Beginn/Ende je Person) – die Laden-Eingabe „Mitarbeiter heute“ bleibt, wie sie ist
  const se = schichtEntwurf; const sp = se.person || pers[0]?.id || ""; const sd = se.datum || H;
  const form = !w3b() || !pers.length ? "" : `<div class="g3-schicht-form"><b>${esc(t("w3b.schicht.titel"))}</b>
    <select data-f="g3-s-person" aria-label="${esc(t("w3b.schicht.person"))}">${pers.map((p) => `<option value="${esc(p.id)}" ${p.id === sp ? "selected" : ""}>${esc(p.kuerzel || p.name || "?")}</option>`).join("")}</select>
    <input type="date" data-f="g3-s-datum" value="${esc(sd)}" aria-label="${esc(t("w3b.schicht.datum"))}">
    <div class="g3-zeiten"><input type="time" data-f="g3-s-von" value="${esc(se.von)}" aria-label="${esc(t("teamTag.von"))}"><span aria-hidden="true">–</span><input type="time" data-f="g3-s-bis" value="${esc(se.bis)}" aria-label="${esc(t("teamTag.bis"))}"></div>
    <button type="button" class="knopf zweit" data-a="g3-schicht">${esc(t("w3b.schicht.knopf"))}</button></div>`;
  const letzte = !w3b() ? "" : (stand.schichten || []).filter((x) => !x.storniert && x.datum >= von).slice(-5).reverse().map((x) => z(`${datumLesbar(x.datum).slice(0, 6)} · ${(pers.find((p) => p.id === x.person) || {}).kuerzel || "?"}`, `${esc(x.von)}–${esc(x.bis)} · ${esc(t("w3b.schicht.std", fmtZahl(schichtStunden(x.von, x.bis), 2)))}`)).join("");
  const schicht = karte("schicht", t("w3.schicht.titel"), "", (zeilen || `<p>${esc(t("w3.schicht.leer"))}</p>`) + letzte + form) ;
  // W3b: Sitz der Krankenkasse (nur mit Personal) und Monat abschließen
  const kasse = !w3b() || !(stand.personen || []).some((p) => !p.entfernt) ? "" : `<label class="feldzeile g3-kasse"><span>${esc(t("w3b.kasse.frage"))}</span><select data-f="g3-svland"><option value="">${esc(t("w3b.kasse.weissNicht"))}</option>${BUNDESLAENDER.map((l) => `<option value="${l.code}" ${stand.betrieb?.svLand === l.code ? "selected" : ""}>${esc(l.name)}</option>`).join("")}</select></label>`;
  const termine2 = kasse ? termine.replace("</details>", kasse + "</details>") : termine;
  let monatKarte = "";
  if (w3b()) { const ab = eingefroren(stand, vm); const vgl = ab ? monatVergleich(stand, vm) : null; const mname = vm.split("-").reverse().join(".");
    monatKarte = karte("monat", t("w3b.monat.titel"), ab ? esc(t("w3b.monat.zu")) : vmDa ? esc(t("w3b.monat.offen")) : "",
      ab ? `<p>${esc(t("w3b.monat.abgeschlossen", mname, datumLesbar(ab.eingefroren.slice(0, 10)).slice(0, 6)))}</p>${z(t("w3b.monat.umsatz"), esc(fmtEuro(ab.umsatzBrutto)))}${vgl?.zumVormonat ? z(t("w3b.monat.zumVormonat"), `${vgl.zumVormonat.umsatz >= 0 ? "+" : "−"} ${esc(fmtEuro(Math.abs(vgl.zumVormonat.umsatz)))}`) : ""}${vgl?.zumVorjahr ? z(t("w3b.monat.zumVorjahr"), `${vgl.zumVorjahr.umsatz >= 0 ? "+" : "−"} ${esc(fmtEuro(Math.abs(vgl.zumVorjahr.umsatz)))}`) : ""}`
        : vmDa ? `<p>${esc(t("w3b.monat.satz"))}</p><button type="button" class="knopf" data-a="g3-monat-zu">${esc(t("w3b.monat.knopf", mname))}</button>` : `<p>${esc(t("w3.bleibt.ersterMonat"))}</p>`); }
  return `<div class="kopfband"><h1>${esc(t("w3.titel"))}</h1><div class="unter">${esc(t("w3.unter"))}</div></div>
    <div class="inhalt buero g3">${topf}${termine2}${bleibt}${pruefer}${monatKarte}${liq}${schicht}<p class="hinweis">${esc(t("w3.fuss"))}</p></div>`;
}

export function geld3Aktion(name, el, stand) {
  if (name === "g3-rhythmus") { ustRhythmusSetzen(stand, stand.betrieb.ustRhythmus === el.dataset.wert ? null : el.dataset.wert); return true; }
  if (name === "g3-dauerfrist") { dauerfristUmschalten(stand); return true; }
  if (name === "g3-schicht" && w3b()) { const pers = (stand.personen || []).filter((p) => !p.entfernt);
    const e = schichtEintragen(stand, { datum: schichtEntwurf.datum || heuteGeschaeft(), person: schichtEntwurf.person || pers[0]?.id, von: schichtEntwurf.von, bis: schichtEntwurf.bis });
    if (e) schichtEntwurf = { person: e.person, datum: e.datum, von: "", bis: "" }; return true; }
  if (name === "g3-monat-zu" && w3b()) { monatEinfrieren(stand, monatPlus(heuteGeschaeft().slice(0, 7), -1)); return true; }
  return false;
}
export function geld3Eingabe(feld, wert, stand) {
  if (feld === "g3-stunden") { chefStundenSetzen(stand, parseZahl(wert)); return true; }
  const sm = /^g3-s-(person|datum|von|bis)$/.exec(feld); if (sm) { schichtEntwurf = { ...schichtEntwurf, [sm[1]]: wert }; return false; } // Entwurf, nicht neu zeichnen
  if (feld === "g3-svland" && w3b()) { svLandSetzen(stand, wert || null); return true; }
  if (feld === "g3-geld") { geldHeuteSetzen(stand, parseZahl(wert), heute()); return true; }
  return false;
}
export const geld3Stunden = eintragStunden; // für spätere Anzeige der Stunden je Eintrag
