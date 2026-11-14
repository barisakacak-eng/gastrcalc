// Büro „Ware & Schwund“ (Masterauftrag „Gehirn“ Welle 2, 28.10.2026): eine Seite, je Baustein eine Karte mit einer Euro-Zahl und einer Handlung.
// 2.7 Einkauf nächste Woche · 2.4 Müll nach Gruppe · 2.3 Wochenzählung der teuersten Waren mit Soll-Ist · 2.2 Spieß-Bilanz · 2.5 Lieferanten · 2.6 selbst oder kaufen.
// Gerechnet wird in js/ware.js (und bestand.js, verkauf.js); hier nur Anzeige und Entwurf (Trennung 2, 17.10.2026).
import { t } from "../i18n.js";
import { esc, fmtEuro, fmtEuroGeschaetzt, fmtZahl, parseZahl, wertAnzeige } from "../util.js";
import { aArtikel, muellRangliste, zuVielVorbereitet, spiessBilanz, spiessVergleich, lieferantenVergleich, selbstOderKaufen, einkaufNaechsteWoche, wochenSollIst, wochenZaehlungen } from "../ware.js";
import { abgleichInventur } from "../verkauf.js";
import { bestellVorschlag } from "../bestand.js";
import { wochenZaehlungSpeichern, spiessSpeichern, spiessLoeschen, zukaufPreisSetzen } from "../stamm.js";
import { nav } from "./nav.js";
import { kalkulation } from "../engine.js";

let zaehlen = null; // { posten: { name: Text } } während der Wochenzählung
let spiess = { rohKg: "", preisKg: "", restKg: "", portionen: "", lieferant: "" };
export const wareZuruecksetzen = () => { zaehlen = null; spiess = { rohKg: "", preisKg: "", restKg: "", portionen: "", lieferant: "" }; };
const kg = (g) => fmtZahl(g / 1000, 1);

export function wareView(stand, { datum, minutensatz = kalkulation(stand).minutensatz ?? null } = {}) {
  const kopf = `<div class="kopfband"><h1>${esc(t("gehirn.ware.titel"))}</h1><div class="unter">${esc(t("gehirn.ware.unter"))}</div></div>`;
  if (zaehlen) return kopf + zaehlView(stand) + nav("ware");
  const karten = [];
  // 2.7 Einkauf nächste Woche
  let ek = null; try { ek = einkaufNaechsteWoche(bestellVorschlag(stand, { heuteTag: datum })); } catch { ek = null; }
  if (ek && ek.anzahl) karten.push(`<div class="karte wa-karte"><h2>${esc(t("gehirn.ware.einkaufTitel"))}</h2><b class="wa-zahl">${esc(fmtEuroGeschaetzt(ek.summe, ek.geschaetzt || ek.ohneWert > 0))}</b>
    <p>${esc(t("gehirn.ware.einkaufSatz", ek.anzahl))}</p><button type="button" class="knopf zweit" data-a="nav" data-wert="bestand">${esc(t("gehirn.ware.einkaufKnopf"))}</button></div>`);
  // 2.4 Müll nach Gruppe
  const mr = muellRangliste(stand, datum); const zv = zuVielVorbereitet(stand, datum);
  karten.push(`<div class="karte wa-karte"><h2>${esc(t("gehirn.ware.muellTitel"))}</h2>${mr.summe > 0 ? `<b class="wa-zahl">≈ ${esc(fmtEuro(mr.summe))}</b>
    ${mr.groesste ? `<p>${esc(t("gehirn.ware.muellSatz", t("gehirn.ware.gruppe." + mr.groesste.gruppe), fmtEuroGeschaetzt(mr.groesste.wert, true)))}</p>` : ""}
    <div class="wa-balken">${mr.rang.map((x) => `<div class="summenzeile"><span>${esc(t("gehirn.ware.gruppe." + x.gruppe))}</span><span class="wert">≈ ${esc(fmtEuro(x.wert))}</span></div>`).join("")}</div>
    ${zv.map((x) => `<p class="wa-hinweis">${esc(t("gehirn.ware.zuViel", x.name, fmtZahl(x.anteil * 100, 0)))}</p>`).join("")}`
    : `<p>${esc(t("gehirn.ware.muellLeer"))}</p>`}</div>`);
  // 2.3 Wochenzählung
  const aa = aArtikel(stand); const wz = wochenZaehlungen(stand); const letzte = wz[wz.length - 1], davor = wz[wz.length - 2];
  let si = null; if (letzte && davor) { try { si = wochenSollIst(stand, letzte, davor, abgleichInventur); } catch { si = null; } }
  const siZeilen = si?.zeilen?.length ? si.zeilen.filter((z) => z.ist !== null).map((z) => `<div class="summenzeile wa-${z.ampel}"><span><b>${esc(z.name)}</b><br><small>${esc(t("gehirn.ware.sollIst", kg(z.erwartet), kg(z.ist)))}</small></span>
      <span class="wert">${z.ampel === "ohneVerkauf" ? esc(t("gehirn.ware.ohneVerkauf")) : z.diffWert !== null && z.diff > 0 ? `≈ ${esc(fmtEuro(z.diffWert))}` : "✓"}</span></div>`).join("") : "";
  karten.push(`<div class="karte wa-karte"><h2>${esc(t("gehirn.ware.zaehlTitel"))}</h2>
    ${si?.melden?.length ? `<p class="minus">${esc(t("gehirn.ware.zuVielWeg", si.melden[0].name, fmtEuroGeschaetzt(si.melden[0].diffWert, true)))}</p>` : ""}
    ${siZeilen}
    <p>${esc(aa.artikel.length ? t("gehirn.ware.zaehlSatz", aa.artikel.length, fmtZahl(aa.anteil * 100, 0)) : t("gehirn.ware.zaehlLeer"))}</p>
    ${aa.artikel.length ? `<p class="wa-liste">${esc(aa.artikel.map((x) => x.name).join(" · "))}</p><button type="button" class="knopf" data-a="wa-zaehlen">${esc(t("gehirn.ware.zaehlKnopf"))}</button>` : ""}
    ${letzte ? `<small>${esc(t("gehirn.ware.zaehlLetzte", letzte.datum.split("-").reverse().join(".")))}</small>` : ""}</div>`);
  // 2.2 Spieß-Bilanz
  const sp = (stand.spiesse || []).filter((x) => !x.verworfen).slice(-3).reverse();
  const sb = sp.map((x) => ({ x, b: spiessBilanz(x) })).filter((y) => y.b);
  const vg = sp.length >= 2 ? spiessVergleich(sp[1], sp[0]) : null;
  const neuB = spiessBilanz({ rohKg: parseZahl(spiess.rohKg), preisKg: parseZahl(spiess.preisKg), restKg: parseZahl(spiess.restKg) || 0, portionen: parseZahl(spiess.portionen) });
  karten.push(`<div class="karte wa-karte wa-spiess"><h2>${esc(t("gehirn.ware.spiessTitel"))}</h2>
    ${sb.map(({ x, b }) => `<div class="summenzeile"><span><b>${esc(x.lieferant || t("gehirn.ware.spiess"))}</b> · ${esc(x.datum.split("-").reverse().join("."))}<br><small>${esc(t("gehirn.ware.spiessZeile", fmtZahl(b.portionen, 0), fmtEuro(b.jePortion, { dezimal: 2 }), fmtZahl(x.restKg || 0, 1), fmtEuro(b.restEuro)))}</small></span>
      <button type="button" class="leise klein" data-a="wa-spiess-weg" data-wert="${esc(x.id)}">${esc(t("gehirn.extra.weg"))}</button></div>`).join("")}
    ${vg && vg.jePortion !== 0 ? `<p class="wa-hinweis">${esc(t("gehirn.ware.spiessVergleich", fmtEuro(Math.abs(vg.jePortion), { dezimal: 2 }), vg.jePortion > 0 ? t("gehirn.ware.teurer") : t("gehirn.ware.billiger")))}</p>` : ""}
    <div class="pr-extra-neu wa-form">
      <input type="text" inputmode="decimal" data-f="wa-sp-rohKg" value="${esc(spiess.rohKg)}" placeholder="${esc(t("gehirn.ware.spRoh"))}">
      <input type="text" inputmode="decimal" data-f="wa-sp-preisKg" value="${esc(spiess.preisKg)}" placeholder="${esc(t("gehirn.ware.spPreis"))}">
      <input type="text" inputmode="decimal" data-f="wa-sp-restKg" value="${esc(spiess.restKg)}" placeholder="${esc(t("gehirn.ware.spRest"))}">
      <input type="text" inputmode="numeric" data-f="wa-sp-portionen" value="${esc(spiess.portionen)}" placeholder="${esc(t("gehirn.ware.spPortionen"))}">
      <input type="text" data-f="wa-sp-lieferant" value="${esc(spiess.lieferant)}" placeholder="${esc(t("gehirn.ware.spLieferant"))}" maxlength="40">
      <button type="button" class="knopf zweit" data-a="wa-spiess"${neuB ? "" : " disabled"}>${esc(neuB ? t("gehirn.ware.spSpeichern", fmtEuro(neuB.jePortion, { dezimal: 2 })) : t("gehirn.ware.spLeer"))}</button>
    </div><small>${esc(t("gehirn.ware.spHinweis"))}</small></div>`);
  // 2.5 Lieferanten
  const lv = lieferantenVergleich(stand).slice(0, 5);
  if (lv.length) karten.push(`<div class="karte wa-karte"><h2>${esc(t("gehirn.ware.lieferTitel"))}</h2>${lv.map((x) => `<div class="summenzeile"><span><b>${esc(x.ware)}</b><br><small>${esc(x.vergleichbar ? t("gehirn.ware.lieferSatz", x.guenstig.lieferant, x.teuer.lieferant) : t("gehirn.ware.lieferNicht"))}</small></span>
    <span class="wert">${x.jahr !== null && x.jahr >= 1 ? esc(t("gehirn.ware.imJahr", fmtEuroGeschaetzt(x.jahr, true))) : "–"}</span></div>`).join("")}<small>${esc(t("gehirn.ware.lieferHinweis"))}</small></div>`);
  // 2.6 Selbst oder kaufen
  const selbst = (stand.artikel || []).filter((a) => a.herkunft === "selbst" && a.rezept);
  if (selbst.length) karten.push(`<div class="karte wa-karte"><h2>${esc(t("gehirn.ware.selbstTitel"))}</h2>${selbst.map((a) => { const r = selbstOderKaufen(stand, a.name, minutensatz);
    return `<div class="wa-selbst"><div class="summenzeile"><span><b>${esc(a.name)}</b><br><small>${esc(!r ? t("gehirn.ware.selbstFehlt") : r.besser === "selbst" ? t("gehirn.ware.selbstBesser", fmtEuroGeschaetzt(Math.abs(r.jahr), true)) : t("gehirn.ware.kaufenBesser", fmtEuroGeschaetzt(Math.abs(r.jahr), true)))}</small></span></div>
      <label class="wa-zukauf"><span>${esc(t("gehirn.ware.zukauf", a.rezept.ausbeute?.einheit === "stk" ? t("gehirn.ware.jeStueck") : a.rezept.ausbeute?.einheit === "l" || a.rezept.ausbeute?.einheit === "ml" ? t("gehirn.ware.jeLiter") : t("gehirn.ware.jeKg")))}</span>
      <input type="text" inputmode="decimal" data-f="wa-zukauf" data-name="${esc(a.name)}" value="${esc(a.rezept.zukaufPreis ? wertAnzeige(a.rezept.zukaufPreis) : "")}" placeholder="€"></label></div>`; }).join("")}
    ${minutensatz === null ? `<small>${esc(t("gehirn.ware.ohneArbeit"))}</small>` : ""}</div>`);
  return `${kopf}<div class="inhalt pr wa">${karten.join("")}</div>${nav("ware")}`;
}

function zaehlView(stand) {
  const aa = aArtikel(stand).artikel; const idx = Object.fromEntries((stand.artikel || []).map((a) => [a.name, a]));
  return `<div class="inhalt pr wa"><div class="karte wa-karte"><h2>${esc(t("gehirn.ware.zaehlJetzt"))}</h2><p>${esc(t("gehirn.ware.zaehlWie"))}</p>
    ${aa.map((x) => { const a = idx[x.name]; const g = a?.gebinde?.art || "packung"; const inhalt = a?.packung?.menge ? `${fmtZahl(a.packung.menge)} ${a.packung.einheit}` : "";
      return `<label class="wa-zaehlzeile"><span><b>${esc(x.name)}</b><small>${esc(t("gehirn.ware.zaehlEinheit", t("gebinde.arten." + g), inhalt))}</small></span>
      <input type="text" inputmode="decimal" data-f="wa-zp" data-name="${esc(x.name)}" value="${esc(zaehlen.posten[x.name] ?? "")}" placeholder="0"></label>`; }).join("")}
    <button type="button" class="knopf" data-a="wa-zaehlen-fertig">${esc(t("gehirn.ware.zaehlFertig"))}</button>
    <button type="button" class="leise" data-a="wa-zaehlen-ab">${esc(t("allgemein.abbrechen"))}</button></div></div>`;
}

export function wareAktion(name, el, stand, { datum, jetzt } = {}) {
  if (name === "wa-zaehlen") { zaehlen = { posten: {} }; return true; }
  if (name === "wa-zaehlen-ab") { zaehlen = null; return true; }
  if (name === "wa-zaehlen-fertig") {
    const posten = {}; for (const [n, v] of Object.entries(zaehlen?.posten || {})) { const m = parseZahl(v); if (m !== null && m >= 0) posten[n] = m; }
    zaehlen = null; if (!Object.keys(posten).length) return true;
    wochenZaehlungSpeichern(stand, { datum, posten, jetzt }); return { speichern: true, meldung: t("gehirn.ware.zaehlGespeichert") };
  }
  if (name === "wa-spiess") {
    const w = { rohKg: parseZahl(spiess.rohKg), preisKg: parseZahl(spiess.preisKg), restKg: parseZahl(spiess.restKg) || 0, portionen: parseZahl(spiess.portionen) };
    if (!spiessBilanz(w)) return true;
    spiessSpeichern(stand, { datum, ...w, lieferant: spiess.lieferant }); spiess = { rohKg: "", preisKg: "", restKg: "", portionen: "", lieferant: "" }; return { speichern: true };
  }
  if (name === "wa-spiess-weg") return spiessLoeschen(stand, el.dataset.wert) ? { speichern: true } : null;
  return null;
}

// Eingaben: Spieß- und Zählfelder sind Entwurf (Knopf schalten), Zukaufpreis speichert sofort
export function wareEingabe(feld, wert, stand, el) {
  const m = /^wa-sp-(rohKg|preisKg|restKg|portionen|lieferant)$/.exec(feld || "");
  if (m) { spiess[m[1]] = String(wert); const b = spiessBilanz({ rohKg: parseZahl(spiess.rohKg), preisKg: parseZahl(spiess.preisKg), restKg: parseZahl(spiess.restKg) || 0, portionen: parseZahl(spiess.portionen) });
    return { knopf: !!b, text: b ? t("gehirn.ware.spSpeichern", fmtEuro(b.jePortion, { dezimal: 2 })) : t("gehirn.ware.spLeer") }; }
  if (feld === "wa-zp" && zaehlen) { zaehlen.posten[el.dataset.name] = String(wert); return "entwurf"; }
  if (feld === "wa-zukauf") { zukaufPreisSetzen(stand, el.dataset.name, parseZahl(wert)); return "speichern"; }
  return null;
}
