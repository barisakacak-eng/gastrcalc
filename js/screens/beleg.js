// Etappe 5: Beleg einlesen – Text aus Livetext einfügen, zerlegen, nur das Unklare fragen, Summe prüfen, übernehmen, Preisänderungen zeigen.
import { t } from "../i18n.js";
import { esc, fmtEuro, fmtZahl, heute, uid } from "../util.js";
import { PRODUKT_INDEX } from "../data/katalog.js";
import { belegZerlegen, zeileAnwenden } from "../beleg.js";
import { lieferungAnlegen, preiseUebernehmen, lieferungDoppelt, preisSprung, gebindeArtApp } from "../lieferung.js";
import { preisJeBasis } from "../engine.js";
import { nav } from "./nav.js";
import { datumLesbar } from "./tag.js";

let text = "";
let beleg = null;        // Ergebnis des Zerlegers (flüchtig)
let zeilen = [];         // Arbeitskopie der Zeilen (Antworten eingetragen)
let zuordnung = {};      // i → Artikelname | "neu" | "weg" | undefined
let basisWahl = null;    // "netto" | "brutto" wenn der Beleg unklar ist
let zeigeAlle = false;
let datumWahl = null;    // "beleg" | "heute" (Review Etappe 5, Punkt 5)
let fertig = null;       // { lieferung, aenderungen, anzahl }
const istLieferschein = () => beleg && (beleg.typ === "lieferschein" || !zeilen.some((z) => z.gesamt !== null));
const belegDatum = () => (datumWahl === "heute" || !beleg?.datum || beleg.datum > heute() ? heute() : beleg.datum);

export const belegKennung = () => `${fertig ? "fertig" : beleg ? "pruefen" : "text"}`;
export function belegZuruecksetzen() { text = ""; beleg = null; zeilen = []; zuordnung = {}; basisWahl = null; zeigeAlle = false; datumWahl = null; fertig = null; }
export function belegZurueck() { if (fertig) { belegZuruecksetzen(); return true; } if (beleg) { beleg = null; zeilen = []; return true; } return false; }

export function belegView(stand) {
  const kopf = `<div class="kopfband"><h1>${esc(t("beleg.titel"))}</h1><div class="unter">${esc(stand.betrieb.name)}</div></div>`;
  if (fertig) return kopf + fertigView(stand) + nav("umsatz");
  if (beleg) return kopf + pruefView(stand) + nav("umsatz");
  const letzte = (stand.lieferungen || []).filter((l) => !l.storniert).slice(-6).reverse();
  return `${kopf}
    <div class="inhalt">
      <p class="hinweis">${esc(t("beleg.anleitung"))}</p>
      <textarea class="textfeld belegtext" data-f="beleg-text" rows="7" placeholder="${esc(t("beleg.einfuegen"))}">${esc(text)}</textarea>
      <button type="button" class="knopf glut" data-a="beleg-zerlegen" ${text.trim() ? "" : "disabled"}>${esc(t("beleg.zerlegen"))}</button>
      <p class="tipp">${esc(t("beleg.hinweisEcht"))}</p>
      <p class="hinweis">${esc(t("beleg.datenschutz"))}</p>
      <div class="karte"><h2>${esc(t("beleg.letzte"))}</h2>
        ${letzte.length ? letzte.map((l) => `<div class="summenzeile"><span>${esc(datumLesbar(l.datum))} · ${esc(l.lieferant || "–")}<small class="marke" style="display:block">${esc(t("beleg.zeilen", l.zeilen.length))}${l.typ === "lieferschein" ? ` · ${esc(t("kuehl.quellen.zettel"))}` : ""}</small></span><span class="wert">${l.summeNetto !== null ? fmtEuro(l.summeNetto, { dezimal: 2 }) : "–"}</span></div>`).join("") : `<div class="hinweis">${esc(t("beleg.leer"))}</div>`}
      </div>
    </div>
    ${nav("umsatz")}`;
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
    <h2 class="frage" style="font-size:1.3rem">${esc(t("beleg.erkannt", zeilen.length, nFragen))}</h2>
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
      ${fertig.aenderungen.length ? fertig.aenderungen.map((x) => `<div class="summenzeile"><span>${esc(x.name)}<small class="marke" style="display:block">${x.alt !== null ? `${fmtEuro(jeBasis(x.alt, x.einheit), { dezimal: 2 })} → ` : `${esc(t("beleg.neuerPreis"))}: `}${fmtEuro(jeBasis(x.neu, x.einheit), { dezimal: 2 })} / ${esc(einheit(x.einheit))}</small></span><span class="wert ${x.prozent === null ? "" : x.prozent > 0 ? "rot" : "gruen"}">${x.prozent === null ? "" : `${x.prozent > 0 ? "+" : ""}${fmtZahl(x.prozent * 100, 0)} %`}</span></div>`).join("") : `<div class="hinweis">${esc(t("beleg.keinePreise"))}</div>`}
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
    return "uebernommen";
  }
  return false;
}
export function belegEingabe(feld, wert) {
  if (feld === "beleg-text") { text = wert; return "knopf"; }
  return false;
}
export const belegTextDa = () => !!text.trim();
