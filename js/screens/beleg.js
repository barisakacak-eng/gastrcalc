// Etappe 5: Beleg einlesen – Text aus Livetext einfügen, zerlegen, nur das Unklare fragen, Summe prüfen, übernehmen, Preisänderungen zeigen.
import { FOTOS } from "../data/fotos.js";
import { t } from "../i18n.js";
import { esc, fmtEuro, fmtZahl, heute, uid } from "../util.js";
import { PRODUKT_INDEX } from "../data/katalog.js";
import { belegZerlegen, zeileAnwenden } from "../beleg.js";
import { lieferungAnlegen, preiseUebernehmen, lieferungDoppelt, preisSprung, gebindeArtApp } from "../lieferung.js";
import { preisJeBasis } from "../engine.js";
import { nav } from "./nav.js";
import { datumLesbar } from "./tag.js";
import { fotoKnoepfe, fotoLauf, fotoVorbereiten, rechnungsLaufZuruecksetzen } from "./foto.js";
import { STELLEN, VERTEILUNGEN, stelleRaten, kostenbelegLesen, kostenbelegAnlegen, kostenbelegDoppelt, kostenbelegStornieren, postenVorher } from "../kostenbeleg.js";
import { basisStandard } from "../data/kosten.js";
import { parseZahl, wertAnzeige } from "../util.js";

let text = "";
let beleg = null;        // Ergebnis des Zerlegers (flüchtig)
let zeilen = [];         // Arbeitskopie der Zeilen (Antworten eingetragen)
let zuordnung = {};      // i → Artikelname | "neu" | "weg" | undefined
let basisWahl = null;    // "netto" | "brutto" wenn der Beleg unklar ist
let zeigeAlle = false;
let datumWahl = null;    // "beleg" | "heute" (Review Etappe 5, Punkt 5)
let fertig = null;       // { lieferung, aenderungen, anzahl }
let zuweisung = null;    // nach Foto/PDF: { stelle, betrag, basis, datum, verteilung, monate, lieferant, upload } (Etappe 6a)
let kostenFertig = null; // gespeicherter Kostenbeleg
let zeigeText = false;
const istLieferschein = () => beleg && (beleg.typ === "lieferschein" || !zeilen.some((z) => z.gesamt !== null));
const belegDatum = () => (datumWahl === "heute" || !beleg?.datum || beleg.datum > heute() ? heute() : beleg.datum);

export const belegKennung = () => `${fertig ? "fertig" : kostenFertig ? "kfertig" : beleg ? "pruefen" : zuweisung ? "zuweisen" : "text"}:${fotoLauf()?.status || ""}`;
export function belegZuruecksetzen() { rechnungsLaufZuruecksetzen(); text = ""; beleg = null; zeilen = []; zuordnung = {}; basisWahl = null; zeigeAlle = false; datumWahl = null; fertig = null; zuweisung = null; kostenFertig = null; zeigeText = false; }
export function belegZurueck() { if (fertig || kostenFertig) { belegZuruecksetzen(); return true; } if (beleg) { beleg = null; zeilen = []; return true; } if (zuweisung) { zuweisung = null; text = ""; return true; } return false; }

// Nach dem Foto: Text übernehmen und fragen, wofür die Rechnung ist. Kostenstelle und Betrag sind vorbelegt, nie still gespeichert.
export function belegTextVonFoto(ocrText, upload) {
  text = ocrText; beleg = null; fertig = null; kostenFertig = null;
  const k = kostenbelegLesen(ocrText);
  const stelle = stelleRaten(ocrText) || "ware";
  // Basis: steht ein Netto auf der Rechnung, nehmen wir das. Sonst die übliche Basis der Stelle (Versicherung: ohne Vorsteuer, Review 6a)
  zuweisung = { stelle, betrag: k.netto ?? k.brutto, basis: k.netto !== null ? "netto" : (stelle === "ware" ? "brutto" : basisStandard(stelle)), basisVonHand: k.netto !== null, satz: k.satz, datum: k.datum && k.datum <= heute() ? k.datum : heute(), verteilung: stelle === "versicherungen" ? "jaehrlich" : "monatlich", monate: 3, lieferant: ocrText.split(/\r?\n/).map((z) => z.trim()).find((z) => z.length > 3) || "", upload };
}

export function belegView(stand) {
  const kopf = `<div class="kopfband"><h1>${esc(t("beleg.titel"))}</h1><div class="unter">${esc(stand.betrieb.name)}</div></div>`;
  if (fertig) return kopf + fertigView(stand) + nav("umsatz");
  if (kostenFertig) return kopf + kostenFertigView() + nav("umsatz");
  if (beleg) return kopf + pruefView(stand) + nav("umsatz");
  const lauf = fotoLauf();
  if (lauf && lauf.status === "lesen" && lauf.zweck !== "speisekarte") return kopf + `<div class="inhalt"><div class="fotolauf" role="status" aria-live="polite"><div class="kreisel" aria-hidden="true"></div><h1 class="frage">${esc(t(lauf.schritt === "seite" ? "foto.seite" : "foto.lesenRechnung", lauf.seite, lauf.von))}</h1><p class="hinweis">${esc(t("foto.lesenHinweis"))}</p><button type="button" class="leise" data-a="foto-abbrechen">${esc(t("allgemein.abbrechen"))}</button></div></div>` + nav("umsatz");
  if (zuweisung) return kopf + zuweisungView(stand) + nav("umsatz");
  fotoVorbereiten();
  const letzte = (stand.lieferungen || []).filter((l) => !l.storniert).slice(-6).reverse();
  return `${kopf}
    <div class="inhalt">
      ${FOTOS.has("b-rechnung-foto") ? `<img class="titelbild" src="foto/b-rechnung-foto.webp" alt="">` : ""}
      <p class="hinweis">${esc(t("foto.rechnungHinweis"))}</p>
      ${lauf?.status === "fehler" && lauf.zweck !== "speisekarte" ? `<div class="tipp warnband">${esc(lauf.fehler)}</div>` : ""}
      <div class="fotofeld">${fotoKnoepfe("rechnung", { kamera: "foto.rechnungKamera", datei: "foto.rechnungDatei" })}</div>
      <button type="button" class="leise" data-a="beleg-text-zeigen">${esc(t(zeigeText ? "beleg.textAus" : "beleg.textEinfuegen"))}</button>
      ${zeigeText || text.trim() ? `
      <p class="hinweis">${esc(t("beleg.anleitung"))}</p>
      <textarea class="textfeld belegtext" data-f="beleg-text" rows="7" placeholder="${esc(t("beleg.einfuegen"))}">${esc(text)}</textarea>
      <button type="button" class="knopf glut" data-a="beleg-zerlegen" ${text.trim() ? "" : "disabled"}>${esc(t("beleg.zerlegen"))}</button>` : ""}
      <p class="tipp">${esc(t("beleg.hinweisEcht"))}</p>
      <p class="hinweis">${esc(t("beleg.datenschutz"))}</p>
      ${kostenListe(stand)}
      <div class="karte"><h2>${esc(t("beleg.letzte"))}</h2>
        ${letzte.length ? letzte.map((l) => `<div class="summenzeile"><span>${esc(datumLesbar(l.datum))} · ${esc(l.lieferant || "–")}<small class="marke block">${esc(t("beleg.zeilen", l.zeilen.length))}${l.typ === "lieferschein" ? ` · ${esc(t("kuehl.quellen.zettel"))}` : ""}</small></span><span class="wert">${l.summeNetto !== null ? fmtEuro(l.summeNetto, { dezimal: 2 }) : "–"}<button type="button" class="leise klein" data-a="lieferung-storno" data-id="${esc(l.id)}">${esc(t("foto.zuruecknehmen"))}</button></span></div>`).join("") : `<div class="hinweis">${esc(t("beleg.leer"))}</div>`}
      </div>
    </div>
    ${nav("umsatz")}`;
}

// Die letzten Kostenbelege mit Rücknahme (Review 6a: falsch gelesene Belege müssen weg können)
function kostenListe(stand) {
  const l = (stand.kostenbelege || []).filter((e) => !e.storniert).slice(-6).reverse();
  if (!l.length) return "";
  return `<div class="karte"><h2>${esc(t("foto.kostenbelege"))}</h2>${l.map((e) => `<div class="summenzeile"><span>${esc(datumLesbar(e.datum))} · ${esc(t("kosten.posten." + e.stelle)[0])}<small class="marke block">${esc(t("foto.verteilungen." + e.verteilung))}${e.monate > 1 ? ` · ${esc(t("foto.monate", e.monate))}` : ""}</small></span><span class="wert">${fmtEuro(e.betrag, { dezimal: 2 })}<button type="button" class="leise" data-a="kb-storno" data-id="${esc(e.id)}">${esc(t("foto.zuruecknehmen"))}</button></span></div>`).join("")}</div>`;
}

function zuweisungView(stand) {
  const z = zuweisung; const ware = z.stelle === "ware";
  const vorher = ware ? { posten: null, sammel: null } : postenVorher(stand, z.stelle);
  const H = heute(); const andererMonat = z.datum.slice(0, 7) !== H.slice(0, 7);
  const name = (st) => st === "ware" ? t("foto.stelleWare") : t("kosten.posten." + st)[0];
  return `<div class="inhalt">
    <h2 class="frage titel-klein">${esc(t("foto.zuweisenFrage"))}</h2>
    <p class="hinweis">${esc(z.lieferant)}</p>
    <div class="chips">${STELLEN.map((st) => `<button type="button" class="chip ${z.stelle === st ? "an" : ""}" aria-pressed="${z.stelle === st}" data-a="zw-stelle" data-wert="${st}">${esc(name(st))}</button>`).join("")}</div>
    ${ware ? `<p class="hinweis">${esc(t("foto.wareHinweis"))}</p><button type="button" class="knopf glut" data-a="beleg-zerlegen">${esc(t("foto.wareWeiter"))}</button>` : `
    <div class="karte">
      <div class="feldzeile"><label>${esc(t("foto.betrag"))}</label>
        <div class="betrag"><input inputmode="decimal" data-f="zw-betrag" value="${esc(wertAnzeige(z.betrag))}" aria-label="${esc(t("foto.betrag"))}"><span class="einheit">€</span></div>
        <div class="seg klein"><button type="button" class="${z.basis === "brutto" ? "an" : ""}" aria-pressed="${z.basis === "brutto"}" data-a="zw-basis" data-wert="brutto">${esc(t("gebinde.brutto"))}</button><button type="button" class="${z.basis === "netto" ? "an" : ""}" aria-pressed="${z.basis === "netto"}" data-a="zw-basis" data-wert="netto">${esc(t("gebinde.netto"))}</button></div>
        ${z.betrag === null ? `<small class="marke offen">${esc(t("foto.betragFehlt"))}</small>` : `<small class="marke">${esc(t("foto.betragErkannt"))}</small>`}</div>
      <div class="feldzeile"><label for="zw-datum">${esc(t("foto.datum"))}</label><input id="zw-datum" class="textfeld" type="date" data-f="zw-datum" value="${esc(z.datum)}" max="${esc(H)}">
        ${andererMonat && (z.verteilung === "einmalig" || z.verteilung === "verteilt") ? `<small class="marke offen">${esc(t("foto.andererMonat", datumLesbar(z.datum)))}</small>` : ""}</div>
      <div class="feldzeile"><label>${esc(t("foto.verteilung"))}</label>
        <div class="chips">${VERTEILUNGEN.map((v) => `<button type="button" class="chip ${z.verteilung === v ? "an" : ""}" aria-pressed="${z.verteilung === v}" data-a="zw-verteilung" data-wert="${v}">${esc(t("foto.verteilungen." + v))}</button>`).join("")}</div>
        ${z.verteilung === "verteilt" ? `<div class="stepper"><button type="button" data-a="zw-monate" data-wert="-1" aria-label="−">−</button><div class="wert">${esc(t("foto.monate", z.monate))}</div><button type="button" data-a="zw-monate" data-wert="1" aria-label="+">+</button></div>` : ""}
        <small class="marke">${esc(t("foto.verteilungHinweis." + z.verteilung, fmtEuro(z.betrag || 0, { dezimal: 2 }), z.monate))}</small>
        ${(z.verteilung === "monatlich" || z.verteilung === "jaehrlich") && vorher.posten ? `<div class="tipp">${esc(t("foto.ersetzt", fmtEuro(vorher.posten.betrag, { dezimal: 2 }), t(vorher.posten.periode === "jahr" ? "allgemein.proJahr" : "allgemein.proMonat")))}</div>` : ""}
        ${z.verteilung === "einmalig" && vorher.posten ? `<div class="tipp">${esc(t("foto.zusaetzlich", fmtEuro(vorher.posten.betrag, { dezimal: 2 })))}</div>` : ""}
        ${vorher.sammel ? `<div class="tipp">${esc(t("foto.stromGasSammel"))}</div>` : ""}</div>
    </div>
    <button type="button" class="knopf glut" data-a="zw-speichern" ${z.betrag > 0 && z.basis ? "" : "disabled"}>${esc(t("foto.kostenSpeichern"))}</button>`}
    <button type="button" class="leise" data-a="zw-text">${esc(t(zeigeText ? "foto.textAus" : "foto.textZeigen"))}</button>
    ${zeigeText ? `<pre class="ocrtext">${esc(text)}</pre>` : ""}
    <button type="button" class="leise" data-a="beleg-neu">${esc(t("allgemein.abbrechen"))}</button>
  </div>`;
}

function kostenFertigView() {
  const e = kostenFertig;
  return `<div class="inhalt"><div class="karte gruenrand"><h2>${esc(t("foto.kostenGespeichert"))}</h2>
    <div class="mid">${esc(t("kosten.posten." + e.stelle)[0])} · ${fmtEuro(e.betrag, { dezimal: 2 })} ${esc(t("gebinde." + e.basis))}</div>
    <small class="marke">${esc(t("foto.verteilungHinweis." + e.verteilung, fmtEuro(e.betrag, { dezimal: 2 }), e.monate))}</small></div>
    <p class="hinweis">${esc(t("foto.zaehlerAktuell"))}</p>
    <button type="button" class="knopf" data-a="nav" data-wert="start">${esc(t("beleg.zumCockpit"))}</button>
    <button type="button" class="knopf zweit" data-a="beleg-neu">${esc(t("beleg.nochmal"))}</button></div>`;
}

// Kandidaten aus der Artikelliste: Wortüberlappung, bis zu vier.
function kandidaten(stand, name) {
  const w = name.toLowerCase().split(/[^a-zäöüß0-9]+/).filter((x) => x.length > 2);
  return (stand.artikel || []).map((a) => { const an = a.name.toLowerCase(); const s = w.filter((x) => an.includes(x)).length + (w.some((x) => an.startsWith(x)) ? 1 : 0); return { a, s }; })
    .filter((x) => x.s > 0).sort((x, y) => y.s - x.s).slice(0, 4).map((x) => x.a.name);
}

function pruefView(stand) {
  const fragen = zeilen.map((z, i) => ({ z, i })).filter((x) => x.z.frage);
  const offen = zeilen.map((z, i) => ({ z, i })).filter((x) => !x.z.frage && !x.z.bekannt && zuordnung[x.i] === undefined);
  const sicher = zeilen.filter((z, i) => !z.frage && (z.bekannt || typeof zuordnung[i] === "string"));
  const ls = istLieferschein();
  const basis = ls ? "netto" : beleg.basis === "unklar" ? basisWahl : beleg.basis;
  const pfandSumme = (beleg.pfand || []).reduce((s, p) => s + (Number(p.betrag) || 0), 0);
  const summe = zeilen.reduce((s, z) => s + (z.gesamt || 0), 0) + pfandSumme;
  const nFragen = fragen.length + offen.length + (!ls && beleg.basis === "unklar" && !basisWahl ? 1 : 0);
  const kannUebernehmen = nFragen === 0 && zeilen.some((z, i) => zuordnung[i] !== "weg");
  const H = heute(); const datumChips = beleg.datum && beleg.datum !== H && beleg.datum <= H;
  let nr = 0;
  return `<div class="inhalt">
    <h2 class="frage titel-klein">${esc(t("beleg.erkannt", zeilen.length, nFragen))}</h2>
    <p class="hinweis">${esc(beleg.lieferant || t("beleg.lieferant"))} · ${esc(datumLesbar(belegDatum()))}${pfandSumme ? ` · ${esc(t("beleg.pfand", fmtEuro(pfandSumme, { dezimal: 2 })))}` : ""}</p>
    ${datumChips ? `<div class="chips"><button type="button" class="chip klein ${datumWahl !== "heute" ? "an" : ""}" data-a="beleg-datum" data-wert="beleg">${esc(t("beleg.datum"))} ${esc(datumLesbar(beleg.datum))}</button><button type="button" class="chip klein ${datumWahl === "heute" ? "an" : ""}" data-a="beleg-datum" data-wert="heute">${esc(t("tag.titel"))}</button></div>` : ""}
    ${ls ? `<div class="tipp">${esc(t("beleg.lieferschein"))}</div>` : ""}
    ${!ls && beleg.basis === "unklar" ? `<div class="karte ${basisWahl ? "gruenrand" : "hinweisgelb"}"><h2>${esc(t("beleg.frageVon", ++nr, nFragen + (basisWahl ? 1 : 0)))}</h2><b>${esc(t("beleg.basisFrage"))}</b><small class="marke">${esc(t("beleg.basisHinweis"))}</small>
      <div class="chips">${["netto", "brutto"].map((b) => `<button type="button" class="chip ${basisWahl === b ? "an" : ""}" data-a="beleg-basis" data-wert="${b}">${esc(t("gebinde." + b))}</button>`).join("")}</div></div>` : ""}
    ${sicher.length ? `<div class="karte gruenrand"><h2>${esc(t("beleg.passt"))}</h2><div class="mid">${esc(ls ? t("beleg.zeilen", sicher.length) : t("beleg.passtText", sicher.length, fmtEuro(sicher.reduce((s, z) => s + (z.gesamt || 0), 0), { dezimal: 2 })))}</div>
      <button type="button" class="leise" data-a="beleg-alle">${esc(zeigeAlle ? t("beleg.ausblenden") : t("beleg.anzeigen"))}</button>
      ${zeigeAlle ? `<div class="liste eng">${zeilen.map((z, i) => zeileView(stand, z, i)).join("")}</div>` : ""}</div>` : ""}
    ${fragen.map(({ z, i }) => `<div class="karte hinweisgelb"><h2>${esc(t("beleg.frageVon", ++nr, nFragen))}</h2><b>„${esc(z.roh.split("\n")[0].slice(0, 60))}“</b><small class="marke">${esc(z.frage.text)}</small>
      <div class="chips">${z.frage.optionen.map((o, k) => `<button type="button" class="chip klein" data-a="beleg-antwort" data-i="${i}" data-o="${k}">${esc(o.text)}</button>`).join("")}<button type="button" class="chip klein" data-a="beleg-weg" data-i="${i}">${esc(t("beleg.nichtUebernehmen"))}</button></div></div>`).join("")}
    ${offen.map(({ z, i }) => `<div class="karte hinweisgelb"><h2>${esc(t("beleg.frageVon", ++nr, nFragen))}</h2><b>${esc(z.name)}</b><small class="marke">${esc(t("beleg.zuordnen"))} ${z.menge !== null ? `· ${fmtZahl(z.menge, 0)} × ${z.einzelpreis !== null ? fmtEuro(z.einzelpreis, { dezimal: 2 }) : "–"}` : ""}</small>
      <div class="chips">${[...new Set([z.vorschlag, ...kandidaten(stand, z.name)].filter(Boolean))].map((n) => `<button type="button" class="chip klein" data-a="beleg-zuordnen" data-i="${i}" data-name="${esc(n)}">${esc(n)}</button>`).join("")}<button type="button" class="chip klein" data-a="beleg-zuordnen" data-i="${i}" data-name="neu">${esc(t("beleg.neuAnlegen"))}</button><button type="button" class="chip klein" data-a="beleg-weg" data-i="${i}">${esc(t("beleg.nichtUebernehmen"))}</button></div></div>`).join("")}
    ${ls ? "" : `<div class="karte"><h2>${esc(t("beleg.pruefung"))}</h2>
      ${beleg.summeNetto !== null || beleg.summeBrutto !== null ? `<div class="summenzeile"><span>${esc(t("beleg.summeBeleg"))}${basis ? ` (${esc(t("gebinde." + basis))})` : ""}</span><span class="wert">${fmtEuro(basis === "brutto" && beleg.summeBrutto !== null ? beleg.summeBrutto : (beleg.summeNetto ?? beleg.summeBrutto), { dezimal: 2 })}</span></div>
      <div class="summenzeile"><span>${esc(t("beleg.summeErkannt"))}</span><span class="wert ${beleg.summeStimmt ? "gruen" : "rot"}">${fmtEuro(summe, { dezimal: 2 })} · ${esc(beleg.summeStimmt ? t("beleg.stimmt") : t("beleg.stimmtNicht"))}</span></div>
      ${pfandSumme ? `<small class="marke">${esc(t("beleg.pfand", fmtEuro(pfandSumme, { dezimal: 2 })))}</small>` : ""}` : `<div class="hinweis">${esc(t("beleg.keineSumme"))}</div>`}
    </div>`}
    <button type="button" class="knopf glut" data-a="beleg-uebernehmen" ${kannUebernehmen ? "" : "disabled"}>${esc(t("beleg.uebernehmen"))}</button>
    <button type="button" class="leise" data-a="beleg-zurueck">${esc(t("allgemein.zurueck"))}</button>
  </div>`;
}

function zeileView(stand, z, i) {
  const zu = zuordnung[i] === "weg" ? t("beleg.nichtUebernehmen") : zuordnung[i] === "neu" ? t("beleg.neuAnlegen") : (zuordnung[i] || z.bekannt || t("beleg.unbekannt"));
  return `<div class="zeile ${zuordnung[i] === "weg" ? "storno" : z.frage ? "offen" : "an"}"><div class="oben"><div class="name">${esc(z.name)}<small>${z.menge !== null ? `${fmtZahl(z.menge, 0)} × ` : ""}${z.inhalt?.groesse ? `${z.inhalt.anzahl && z.inhalt.anzahl > 1 ? z.inhalt.anzahl + " × " : ""}${fmtZahl(z.inhalt.groesse, 2)} ${esc(z.inhalt.einheit)}` : z.inhalt?.anzahl ? `${z.inhalt.anzahl} ${esc(t("allgemein.stueck"))}` : ""} → ${esc(zu)}</small></div><div style="text-align:right"><b>${z.gesamt !== null ? fmtEuro(z.gesamt, { dezimal: 2 }) : "–"}</b></div></div></div>`;
}

function fertigView(stand) {
  const einheit = (e) => e === "g" ? "kg" : e === "ml" ? "l" : t("allgemein.stueck");
  const jeBasis = (p, e) => e === "g" || e === "ml" ? p * 1000 : p;
  return `<div class="inhalt">
    <div class="karte gruenrand"><h2>${esc(t("beleg.titel"))}</h2><div class="mid">${esc(t("beleg.fertig", fertig.anzahl, fertig.aenderungen.length))}</div>
      <small class="marke">${esc(fertig.lieferung.lieferant || "")} · ${esc(datumLesbar(fertig.lieferung.datum))}${fertig.lieferung.summeNetto !== null ? ` · ${fmtEuro(fertig.lieferung.summeNetto, { dezimal: 2 })} ${esc(t("gebinde.netto"))}` : ""}</small></div>
    <div class="karte"><h2>${esc(t("beleg.preiseNeu"))}</h2>
      ${fertig.aenderungen.length ? fertig.aenderungen.map((x) => `<div class="summenzeile"><span>${esc(x.name)}<small class="marke block">${x.alt !== null ? `${fmtEuro(jeBasis(x.alt, x.einheit), { dezimal: 2 })} → ` : `${esc(t("beleg.neuerPreis"))}: `}${fmtEuro(jeBasis(x.neu, x.einheit), { dezimal: 2 })} / ${esc(einheit(x.einheit))}</small></span><span class="wert ${x.prozent === null ? "" : x.prozent > 0 ? "rot" : "gruen"}">${x.prozent === null ? "" : `${x.prozent > 0 ? "+" : ""}${fmtZahl(x.prozent * 100, 0)} %`}</span></div>`).join("") : `<div class="hinweis">${esc(t("beleg.keinePreise"))}</div>`}
    </div>
    ${fertig.lieferung.summeNetto ? `<p class="hinweis">${esc(t("beleg.zaehlerRoter", fmtEuro(fertig.lieferung.summeNetto, { dezimal: 2 })))}</p>` : ""}
    <button type="button" class="knopf" data-a="nav" data-wert="start">${esc(t("beleg.zumCockpit"))}</button>
    <button type="button" class="knopf zweit" data-a="beleg-neu">${esc(t("beleg.nochmal"))}</button>
  </div>`;
}

// ---------- Aktionen ----------
export function belegAktion(name, el, stand, wurzel) {
  if (name === "beleg-zerlegen") {
    if (!text.trim()) return false;
    beleg = belegZerlegen(text, { bekannt: (stand.artikel || []).map((a) => a.name) });
    zeilen = beleg.zeilen.map((z) => ({ ...z })); zuordnung = {}; basisWahl = null; zeigeAlle = false; datumWahl = null;
    if (!zeilen.length) { beleg = null; return { meldung: t("beleg.nichtsErkannt") }; }
    // Trifft ein Artikel mehrere Zeilen, ist die Zuordnung unsicher: alle diese Zeilen werden gefragt (Nachtest Etappe 5, Punkt 1)
    const treffer = {}; for (const z of zeilen) if (z.bekannt) treffer[z.bekannt] = (treffer[z.bekannt] || 0) + 1;
    for (const z of zeilen) if (z.bekannt && treffer[z.bekannt] > 1) { z.vorschlag = z.bekannt; z.bekannt = null; }
    // Preissprung über 40 %: nachfragen statt durchwinken (Nachtest Etappe 5, Punkt 8)
    const basis = beleg.basis === "unklar" ? "netto" : beleg.basis;
    for (const z of zeilen) {
      if (!z.bekannt || z.frage) continue;
      const sp = preisSprung(stand, z, basis);
      if (sp && Math.abs(sp.prozent) > 0.4) z.frage = { art: "preis", text: t("beleg.preisSprungText", z.bekannt, fmtEuro(sp.alt * (sp.einheit === "stk" ? 1 : 1000), { dezimal: 2 }), fmtEuro(sp.neu * (sp.einheit === "stk" ? 1 : 1000), { dezimal: 2 }), fmtZahl(sp.prozent * 100, 0)), optionen: [{ text: t("beleg.uebernehmen"), wert: {} }] };
    }
    return true;
  }
  if (name === "beleg-zurueck") { beleg = null; zeilen = []; return true; }
  if (name === "beleg-text-zeigen") { zeigeText = !zeigeText; return true; }
  if (name === "zw-text") { zeigeText = !zeigeText; return true; }
  if (name === "lieferung-storno") { const l = (stand.lieferungen || []).find((x) => x.id === el.dataset.id); if (!l || l.storniert || !confirm(t("beleg.stornoFrage"))) return false; l.storniert = true; l.storniertZeit = new Date().toISOString(); return { meldung: t("foto.zurueckgenommen") }; } // nie löschen, nur kennzeichnen (Prüfung 15.10.)
  if (name === "kb-storno") { if (!confirm(t("foto.zuruecknehmenFrage"))) return false; return kostenbelegStornieren(stand, el.dataset.id) ? { meldung: t("foto.zurueckgenommen") } : false; }
  if (name === "zw-stelle" && zuweisung) { zuweisung.stelle = el.dataset.wert; if (!zuweisung.basisVonHand && zuweisung.stelle !== "ware") zuweisung.basis = basisStandard(zuweisung.stelle); if (zuweisung.stelle === "versicherungen" && zuweisung.verteilung === "monatlich") zuweisung.verteilung = "jaehrlich"; return true; }
  if (name === "zw-basis" && zuweisung) { zuweisung.basis = el.dataset.wert; zuweisung.basisVonHand = true; return true; }
  if (name === "zw-verteilung" && zuweisung) { zuweisung.verteilung = el.dataset.wert; return true; }
  if (name === "zw-monate" && zuweisung) { zuweisung.monate = Math.min(24, Math.max(2, zuweisung.monate + Number(el.dataset.wert))); return true; }
  if (name === "zw-speichern" && zuweisung) {
    const z = zuweisung; if (!(z.betrag > 0) || !z.basis) return false;
    if (kostenbelegDoppelt(stand, { stelle: z.stelle, betrag: z.betrag, datum: z.datum > heute() ? heute() : z.datum }) && !confirm(t("foto.doppeltFrage"))) return false;
    const e = kostenbelegAnlegen(stand, { stelle: z.stelle, betrag: z.betrag, basis: z.basis, satz: z.satz, datum: z.datum, verteilung: z.verteilung, monate: z.monate, upload: z.upload?.id || null, lieferant: z.lieferant });
    if (z.upload) { z.upload.status = "uebernommen"; z.upload.ergebnis = { kostenbeleg: e.id }; z.upload.zweck = "kosten"; }
    kostenFertig = e; zuweisung = null; text = "";
    return "uebernommen";
  }
  if (name === "beleg-neu") { belegZuruecksetzen(); return true; }
  if (name === "beleg-alle") { zeigeAlle = !zeigeAlle; return true; }
  if (name === "beleg-basis") { basisWahl = el.dataset.wert; return true; }
  if (name === "beleg-datum") { datumWahl = el.dataset.wert; return true; }
  if (name === "beleg-antwort") { const i = Number(el.dataset.i); const z = zeilen[i]; const o = z?.frage?.optionen[Number(el.dataset.o)]; if (!z || !o) return false; zeilen[i] = zeileAnwenden(z, o.wert); return true; }
  if (name === "beleg-weg") { zuordnung[Number(el.dataset.i)] = "weg"; const z = zeilen[Number(el.dataset.i)]; if (z) zeilen[Number(el.dataset.i)] = { ...z, frage: null }; return true; }
  if (name === "beleg-zuordnen") { zuordnung[Number(el.dataset.i)] = el.dataset.name; return true; }
  if (name === "beleg-uebernehmen") {
    if (!beleg) return false;
    const basis = istLieferschein() ? "netto" : beleg.basis === "unklar" ? basisWahl : beleg.basis; if (!basis) return false;
    const datum = belegDatum();
    if (lieferungDoppelt(stand, beleg, datum) && !confirm(t("beleg.doppeltFrage"))) return false;
    const genommen = []; let weggelassen = 0;
    zeilen.forEach((z, i) => {
      if (zuordnung[i] === "weg" || z.frage) { weggelassen += 1; return; }
      let name = z.bekannt; if (typeof zuordnung[i] === "string" && zuordnung[i] !== "neu") name = zuordnung[i];
      if (zuordnung[i] === "neu" && !name) {
        const kat = PRODUKT_INDEX[z.name]; const einheit = z.inhalt?.einheit === "kg" || z.inhalt?.einheit === "g" ? "kg" : z.inhalt?.einheit === "l" || z.inhalt?.einheit === "ml" || z.inhalt?.einheit === "cl" ? "l" : "stk";
        const a = { name: z.name.slice(0, 60), gruppe: kat?.g || "gewuerz", einheit, packung: { menge: null, einheit }, gebinde: { art: gebindeArtApp(z.gebinde), zwischen: null }, preis: null, preisBasis: "netto", preisHistorie: [], status: "offen", benutzt: false };
        if (!stand.artikel.some((x) => x.name === a.name)) stand.artikel.push(a); name = a.name;
      }
      genommen.push({ ...z, bekannt: name || null });
    });
    if (!genommen.length) return false;
    const l = lieferungAnlegen(stand, beleg, { zeilen: genommen, geraet: wurzel?.geraet || null, basis, datum, alleZeilen: weggelassen === 0 });
    const ae = preiseUebernehmen(stand, l);
    fertig = { lieferung: l, aenderungen: ae, anzahl: genommen.length }; beleg = null; zeilen = []; text = "";
    if (zuweisung?.upload) { zuweisung.upload.status = "uebernommen"; zuweisung.upload.ergebnis = { lieferung: l.id }; l.upload = zuweisung.upload.id; }
    zuweisung = null;
    return "uebernommen";
  }
  return false;
}
export function belegEingabe(feld, wert) {
  if (feld === "beleg-text") { text = wert; return "knopf"; }
  if (feld === "zw-betrag" && zuweisung) { zuweisung.betrag = parseZahl(wert); return "knopf-zw"; }
  if (feld === "zw-datum" && zuweisung) { if (/^\d{4}-\d{2}-\d{2}$/.test(wert)) zuweisung.datum = wert > heute() ? heute() : wert; return false; }
  return false;
}
export const belegTextDa = () => !!text.trim();
