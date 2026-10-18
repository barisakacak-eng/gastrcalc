// Stufe 1 (17.10.2026): Büro-Bereich „Aktionen & Haltbarkeit“. Oben ein Satz (haltbarUhrzeit), darunter „Läuft ab“ (Verbrauchsdatum, MHD vorbei),
// „Abverkauf“ (Vorschläge mit Teilen-Text) und „Kombi-Angebot“ (Gerichte per Chips, drei Stufen, Teilen-Text für Aushang/WhatsApp-Status).
// Rechnen tun nur js/haltbar.js und js/deal.js; hier stehen Aufbau, Texte und data-Attribute. Nur vorhandene Klassen, kein eigenes CSS.
// Personal-Modus: nicht erreichbar (modus.js lässt nur Personal, Müll, Kühlung, Putzen zu). Im Laden steht nichts davon.
import { t, artikelText } from "../i18n.js";
import { esc, fmtEuro, fmtZahl } from "../util.js";
import { haltbarStand, haltbarUhrzeit, abverkaufText, datumKurz } from "../haltbar.js";
import { kombiTeileSortiert, kombiAuswahlBereinigt, kombiRechnen, kombiVorschlaege, kombiText, KOMBI_MAX } from "../deal.js";
import { kalkulation } from "../engine.js";
import { aktionUebernehmen, aktiveAktionen, aktionName, aktionZeitraumSetzen, aktionBeenden } from "../tafel.js"; // Menütafel (18.10.2026): „Auf die Tafel“
import { aktionVorschlag, aktionFortschritt, fortschrittZeilen, aktionUhrzeit, aktionBilanz, bilanzText, aktionVorbei, aktionZeitraumText } from "../aktion_plan.js"; // Aktion planen (18.10.2026)
import { heuteGeschaeft } from "../util.js";
import { mengeBasisText as mengeText, textTeilen } from "./bausteine.js"; // Trennung (17.10.2026)
import { nav } from "./nav.js";

let auswahl = [];   // Kombi: gewählte Gericht-Kennungen (2–4)
// Aktion planen (18.10.2026): offener Plan (flüchtiger Bildschirmzustand) – { angaben, vorschlag, entwurf: { von, bis, ende }, aktion? (Zeitraum ändern) }
let plan = null;

export const aktionenKennung = () => auswahl.join(",") + (plan ? "|plan:" + (plan.aktion || plan.angaben?.art) : "");
export function aktionenZuruecksetzen() { auswahl = []; plan = null; }
// Zurück-Geste: erst den Plan schließen, dann die Kombi-Auswahl leeren; false = den Bereich verlassen
export function aktionenZurueck() { if (plan) { plan = null; return true; } if (!auswahl.length) return false; auswahl = []; return true; }

const was = (text) => `<p class="inv-was"><b>${esc(t("inventur.wasHeisst"))}</b> ${esc(text)}</p>`;
const euro = (v, ca = false) => (v === null || v === undefined ? "–" : (ca ? "≈ " : "") + fmtEuro(v, { dezimal: 2 }));
const menge = (m, basis) => (m === null || m === undefined ? t("aktionen.mengeUnbekannt") : "≈ " + mengeText(m, basis));

export function aktionenView(stand) {
  const kopf = `<div class="kopfband"><h1>${esc(t("aktionen.titel"))}</h1><div class="unter">${esc(t("aktionen.unter"))}</div></div>`;
  const hs = haltbarStand(stand); const uhr = haltbarUhrzeit(stand) || aktionUhrzeit(stand); // Aktion planen (18.10.2026): sonst der Satz zur laufenden Aktion
  const oben = uhr ? `<div class="karte ${uhr.ton === "rot" ? "hinweisrot" : "hinweisgelb"}"><h2>${esc(uhr.text)}</h2></div>` : `<div class="karte"><h2>${esc(t("aktionen.allesGut"))}</h2></div>`;
  if (plan) return `${kopf}<div class="inhalt">${planView(stand)}</div>${nav("aktionen", { schnell: false })}`; // Aktion planen: eine Handlung – bestätigen oder ändern
  return `${kopf}<div class="inhalt">${oben}${laufendView(stand)}${laeuftView(hs)}${abverkaufView(hs)}${kombiView(stand, hs)}${vorbeiView(stand)}</div>${nav("aktionen", { schnell: false })}`;
}

// ---------- Aktion planen (18.10.2026) ----------
// Vorschlag der App (Zeitraum + ein Satz Begründung aus Ware, Haltbarkeit, Interesse), darunter änderbar: ab sofort / von, bis Datum / bis Ware weg.
function planView(stand) {
  const H = heuteGeschaeft(); const v = plan.vorschlag; const e = plan.entwurf;
  const name = plan.aktion ? aktionName(stand, (stand.aktionen || []).find((a) => a.id === plan.aktion) || { gerichte: [] }) : aktionName(stand, plan.angaben);
  const preis = plan.angaben?.preis ? ` · ${fmtEuro(plan.angaben.preis, { dezimal: 2 })}` : "";
  const titel = `<h2 class="inv-ue">${esc(t(plan.aktion ? "plan.aendernTitel" : "plan.titel"))}</h2>`;
  if (!plan.aktion && !v.moeglich) return `${titel}<div class="karte hinweisrot" data-plan="nein"><h2>${esc(name)}</h2><p>${esc(v.satz)}</p>
    <button type="button" class="knopf zweit" data-a="akt-plan-zu">${esc(t("plan.abbrechen"))}</button></div>`;
  const vorschlagText = v?.moeglich ? `<p class="hinweis"><b>${esc(t("plan.vorschlag"))}:</b> ${esc(aktionZeitraumText({ von: v.von, bis: v.bis, ende: v.ende }))}</p><p data-plan-satz="1">${esc(v.satz)}</p>` : "";
  const geaendert = !plan.aktion && v?.moeglich && (e.von !== v.von || e.bis !== v.bis || e.ende !== v.ende); // Zeitraum ändern: der Vorschlag von heute steht nur daneben
  const chip = (aktion, wert, an, text) => `<button type="button" class="chip klein ${an ? "an" : ""}" data-a="${aktion}" data-wert="${esc(wert)}" aria-pressed="${an}">${esc(text)}</button>`;
  const startGesperrt = plan.aktion && ((stand.aktionen || []).find((a) => a.id === plan.aktion)?.von || H) <= H;
  return `${titel}<div class="karte" data-plan="${plan.aktion ? "aendern" : "neu"}"><h2>${esc(name)}${esc(preis)}</h2>${vorschlagText}
    <div class="chips">${startGesperrt ? "" : chip("akt-plan-von", "sofort", e.von === H, t("plan.abSofort"))}${chip("akt-plan-ende", "datum", e.ende === "datum", t("plan.bisDatum"))}${chip("akt-plan-ende", "ware", e.ende === "ware", t("plan.bisWare"))}</div>
    <div class="b-frei"><label><span>${esc(t("plan.von"))}</span><input type="date" class="textfeld" data-f="akt-von" value="${esc(e.von)}" min="${esc(H)}"${startGesperrt ? " disabled" : ""}></label>
      <label><span>${esc(t(e.ende === "ware" ? "plan.laengstens" : "plan.bis"))}</span><input type="date" class="textfeld" data-f="akt-bis" value="${esc(e.bis || "")}" min="${esc(e.von > H ? e.von : H)}"></label></div>
    ${geaendert ? `<small class="marke">${esc(t("plan.geaendert"))}</small>` : ""}
    <p class="hinweis">${esc(t("plan.dein"))}</p>
    <button type="button" class="knopf glut" data-a="${plan.aktion ? "akt-zeit-ok" : "akt-plan-ok"}">${esc(t(plan.aktion ? "plan.speichern" : "tafel.uebernehmen"))}</button>
    <button type="button" class="leise" data-a="akt-plan-zu">${esc(t("plan.abbrechen"))}</button></div>${was(t("plan.was"))}`;
}

// Laufende Aktionen: Zeitraum, Fortschritt in einfachen Worten, geplante Begründung, ändern/beenden
function laufendView(stand) {
  const liste = aktiveAktionen(stand); if (!liste.length) return "";
  const zeile = (a) => {
    const f = aktionFortschritt(stand, a);
    return `<div class="karte" data-aktion-lauf="${esc(a.id)}"><h2>${esc(aktionName(stand, a))} · ${esc(fmtEuro(a.preis, { dezimal: 2 }))}</h2>
      <p class="hinweis">${esc(aktionZeitraumText(a))}</p>${fortschrittZeilen(f).map((x) => `<p>${esc(x)}</p>`).join("")}
      ${a.plan?.satz ? `<small class="marke">${esc(t("plan.geplant", a.plan.satz))}</small>` : ""}
      <button type="button" class="leise klein" data-a="akt-zeit" data-wert="${esc(a.id)}">${esc(t("plan.aendern"))}</button>
      <button type="button" class="leise klein" data-a="akt-beenden" data-wert="${esc(a.id)}">${esc(t("tafel.beenden"))}</button></div>`;
  };
  return `<h2 class="inv-ue">${esc(t("plan.laufendTitel"))}</h2>${liste.map(zeile).join("")}`;
}
// Beendete Aktionen (die letzten 3): kurze Bilanz – gespeichert oder, solange noch nicht gespeichert, gerechnet
function vorbeiView(stand) {
  const H = heuteGeschaeft();
  const liste = (stand.aktionen || []).filter((a) => aktionVorbei(a, H) && !a.doppelt).sort((x, y) => String(y.bis || y.entferntZeit || "").localeCompare(String(x.bis || x.entferntZeit || ""))).slice(0, 3);
  if (!liste.length) return "";
  return `<h2 class="inv-ue">${esc(t("plan.vorbeiTitel"))}</h2><div class="karte">${liste.map((a) => `<div class="summenzeile" data-aktion-bilanz="${esc(a.id)}"><span><b>${esc(aktionName(stand, a))}</b><br><small>${esc(bilanzText(a.bilanz || aktionBilanz(stand, a)))}</small></span></div>`).join("")}</div>`;
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
      <button type="button" class="knopf zweit" data-a="akt-teilen" data-art="abverkauf" data-wert="${i}">${esc(t("aktionen.teilen"))}</button>
      <button type="button" class="knopf weich" data-a="akt-tafel" data-art="abverkauf" data-wert="${i}">${esc(t("tafel.uebernehmen"))}</button></div>`;
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
      <button type="button" class="leise klein" data-a="akt-teilen" data-art="kombi" data-wert="${s.stufe}">${esc(t("aktionen.teilen"))}</button>
      <button type="button" class="leise klein" data-a="akt-tafel" data-art="kombi" data-wert="${s.stufe}">${esc(t("tafel.uebernehmen"))}</button>`;
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
// Menütafel (18.10.2026): Angaben für „Auf die Tafel“ aus dem gezeigten Vorschlag (Abverkauf: ein Gericht, Ware mit MHD; Kombi: Stufe).
// Aktion planen (18.10.2026): den Zeitraum schlägt aktionVorschlag vor, der Wirt bestätigt oder ändert ihn (planView).
export function aktionTafelAngaben(stand, art, wert) {
  if (art === "abverkauf") { const x = haltbarStand(stand).abverkauf[Number(wert)]; const v = x?.bester; return v ? { art, gerichte: [v.gericht], preis: v.aktionspreis, statt: v.preis, ware: x.name } : null; }
  if (art === "kombi") { const kb = kombiRechnen(stand, auswahl); const s = kb.stufen?.find((y) => y.stufe === wert); return s?.moeglich ? { art, gerichte: kb.teile.map((x) => x.id), preis: s.preis, statt: kb.summe } : null; }
  return null;
}
const teilen = (text) => textTeilen(text, t("aktionen.teilen")); // Trennung (17.10.2026): gemeinsames Teilen (./bausteine.js)

// ---------- Aktionen ----------
// Rückgabe: false (nicht meine) | true (neu zeichnen) | { meldung }
export async function aktionenAktion(name, el, stand) {
  if (name === "akt-kombi") { const id = el.dataset.wert; if (auswahl.includes(id)) auswahl = auswahl.filter((x) => x !== id); else if (auswahl.length < KOMBI_MAX) auswahl = [...auswahl, id]; return true; }
  if (name === "akt-kombi-leeren") { auswahl = []; return true; }
  if (name === "akt-kombi-vorschlag") { const v = kombiVorschlaege(stand)[Number(el.dataset.wert)]; if (!v) return false; auswahl = v.kombi.teile.map((x) => x.id); return true; }
  if (name === "akt-tafel") { // Aktion planen (18.10.2026): erst der Vorschlag mit Begründung – „Auf die Tafel“ im Plan übernimmt (akt-plan-ok)
    const angaben = aktionTafelAngaben(stand, el.dataset.art, el.dataset.wert); if (!angaben) return false;
    const vorschlag = aktionVorschlag(stand, angaben);
    plan = { angaben, vorschlag, entwurf: vorschlag.moeglich ? { von: vorschlag.von, bis: vorschlag.bis, ende: vorschlag.ende } : { von: heuteGeschaeft(), bis: null, ende: "datum" } };
    return true;
  }
  if (name === "akt-plan-zu") { plan = null; return true; }
  if (name === "akt-plan-von") { if (!plan) return false; const H = heuteGeschaeft(); plan = { ...plan, entwurf: { ...plan.entwurf, von: H, bis: plan.entwurf.bis && plan.entwurf.bis < H ? H : plan.entwurf.bis } }; return true; }
  if (name === "akt-plan-ende") { if (!plan) return false; const ende = el.dataset.wert === "ware" ? "ware" : "datum";
    plan = { ...plan, entwurf: { ...plan.entwurf, ende, bis: plan.entwurf.bis || (ende === "datum" ? (plan.vorschlag?.bis || plan.entwurf.von) : null) } }; return true; }
  if (name === "akt-plan-ok") {
    if (!plan || !plan.vorschlag?.moeglich) return false;
    const e = plan.entwurf; if (e.ende === "datum" && !e.bis) return { meldung: t("plan.ungueltig") }; if (e.bis && e.bis < e.von) return { meldung: t("plan.ungueltig") };
    const v = plan.vorschlag;
    const vorher = (stand.aktionen || []).length;
    const a = aktionUebernehmen(stand, { ...plan.angaben, von: e.von, bis: e.ende === "ware" && !e.bis ? "" : e.bis, ende: e.ende,
      plan: { von: v.von, bis: v.bis, ende: v.ende, satz: v.satz, erwartung: Math.round(v.erwartung.mehrAnteil * 10000) / 10000, quelle: v.erwartung.quelle } });
    if (!a) return { meldung: t("plan.ungueltig") };
    plan = null;
    return (stand.aktionen || []).length > vorher ? { speichern: true, meldung: t("tafel.uebernommen") } : { meldung: t("tafel.uebernommen") };
  }
  if (name === "akt-zeit") { // laufende Aktion: Zeitraum ändern – Vorschlag der App von heute daneben
    const a = aktiveAktionen(stand).find((x) => x.id === el.dataset.wert); if (!a) return false;
    plan = { aktion: a.id, angaben: { art: a.art, gerichte: a.gerichte, preis: a.preis, ware: a.ware || null }, vorschlag: aktionVorschlag(stand, a), entwurf: { von: a.von, bis: a.bis, ende: a.ende || "datum" } };
    return true;
  }
  if (name === "akt-zeit-ok") {
    if (!plan?.aktion) return false;
    const neu = aktionZeitraumSetzen(stand, plan.aktion, plan.entwurf);
    if (!neu) { const alt = (stand.aktionen || []).find((x) => x.id === plan.aktion); const gleich = alt && alt.von === plan.entwurf.von && alt.bis === plan.entwurf.bis && alt.ende === plan.entwurf.ende;
      if (gleich) { plan = null; return { meldung: t("aktionen.beleg.nichts") }; } return { meldung: t("plan.ungueltig") }; }
    plan = null; return { speichern: true, meldung: t("plan.gespeichert") };
  }
  if (name === "akt-beenden") return aktionBeenden(stand, el.dataset.wert) ? { speichern: true, meldung: t("tafel.beendet") } : true;
  if (name === "akt-teilen") {
    const text = aktionenTextFuer(stand, el.dataset.art, el.dataset.wert); if (!text) return false;
    const weg = await teilen(text); if (weg === "abgebrochen") return false;
    return { meldung: t(weg === "kopiert" ? "aktionen.kopiert" : "aktionen.geteilt") };
  }
  return false;
}
// Aktion planen (18.10.2026): Datumsfelder des Plans – nur Entwurf, gespeichert wird erst mit „Auf die Tafel“ / „Speichern“
export function aktionenEingabe(feld, wert) {
  if (!plan || (feld !== "akt-von" && feld !== "akt-bis")) return false;
  const d = /^\d{4}-\d{2}-\d{2}$/.test(String(wert || "")) ? String(wert) : null;
  if (feld === "akt-von") { if (!d) return "entwurf"; plan = { ...plan, entwurf: { ...plan.entwurf, von: d } }; return "zeichnen"; }
  plan = { ...plan, entwurf: { ...plan.entwurf, bis: d } }; return "zeichnen";
}
