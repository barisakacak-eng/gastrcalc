// Etappe 5: „Tag abschließen" – drei Haken (Umsatz, Müll, Kühlung), dann die Bilanz des Tages. Das Abendritual.
import { t } from "../i18n.js";
import { esc, fmtEuro, fmtZahl, heute as kalendertag, heuteGeschaeft as heute, wertAnzeige } from "../util.js"; // Paket 3 (16.10.2026), M7: Abschluss um 01:30 gehört zum Vortag (Geschäftstag); Kühlung bleibt am Kalendertag
import { tagAbschliessen } from "../zaehler.js";
import { abschlussHaken, tagesBilanz } from "../laden_zahlen.js"; // Trennung 2 (17.10.2026)
import { nav } from "./nav.js";
import { zeitKurz } from "./tag.js";

let bilanz = null; // nach dem Abschluss: die Bilanz-Ansicht (flüchtig)

export const abschlussKennung = () => (bilanz ? "bilanz" : "haken");
export function abschlussZuruecksetzen() { bilanz = null; }

export function abschlussView(stand) {
  const H = heute();
  if (bilanz) return bilanzView(stand, H);
  const hk = abschlussHaken(stand, H); const u = hk.umsatz; const ab = hk.schon; // Trennung 2 (17.10.2026): Haken aus js/laden_zahlen.js
  const sw = { anzahl: hk.muell.anzahl, muellwert: hk.muell.wert, ohneWert: hk.muell.ohneWert }; const ks = { eingerichtet: hk.kuehl.eingerichtet, heuteGemessen: hk.kuehl.gemessen, stellen: hk.kuehl.stellen };
  const hak = (ok, n) => `<span class="hak ${ok ? "" : "offen"}">${ok ? "✓" : n}</span>`;
  return `
    <div class="kopfband"><h1>${esc(t("abschluss.titel"))}</h1><div class="unter">${esc(stand.betrieb.name)} · ${esc(H.split("-").reverse().join("."))}</div></div>
    <div class="inhalt">
      ${ab ? `<div class="tipp">${esc(t("abschluss.schon", zeitKurz(ab.erfasst)))}</div>` : ""}
      <div class="karte">
        <div class="hakzeile">${hak(!!u, 1)}<div><b>${esc(t("abschluss.umsatz"))}</b><small class="marke">${esc(t("abschluss.umsatzKurz"))} · ${esc(t("zaehler.umsatzBasis.brutto"))}</small></div></div>
        <div class="zahlfeld klein"><input inputmode="decimal" data-f="umsatz" value="${esc(wertAnzeige(u?.umsatz ?? null))}" placeholder="" aria-label="${esc(t("tag.umsatz"))}"><span class="einheit">€</span></div>
        ${u ? "" : `<small class="marke">${esc(t("abschluss.ohneUmsatz"))}</small>`}
      </div>
      <button type="button" class="zeileknopf" data-a="nav" data-wert="muell"><span class="hakzeile">${hak(sw.anzahl > 0, 2)}<span><b>${esc(t("abschluss.muell"))}: ${sw.anzahl ? fmtEuro(sw.muellwert, { dezimal: 2 }) : esc(t("abschluss.muellLeer"))}</b><small>${sw.ohneWert ? esc(t("listen.ohneWert", sw.ohneWert)) : ""}</small></span></span><span class="pfeil">›</span></button>
      <button type="button" class="zeileknopf ${ks.eingerichtet && ks.heuteGemessen < ks.stellen ? "warn" : ""}" data-a="${ks.eingerichtet ? "kuehl-rundgang-start" : "kuehl-einrichtung-oeffnen"}" data-offen="0"><span class="hakzeile">${hak(ks.eingerichtet && ks.heuteGemessen >= ks.stellen, 3)}<span><b>${esc(ks.eingerichtet ? (ks.heuteGemessen >= ks.stellen ? t("abschluss.kuehlOk") : t("abschluss.kuehlFehlt", ks.heuteGemessen, ks.stellen)) : t("abschluss.kuehlNicht"))}</b></span></span><span class="pfeil">›</span></button>
      <p class="hinweis">${esc(t("abschluss.hinweis"))}</p>
      <button type="button" class="knopf glut" data-a="abschluss-fertig">${esc(t("abschluss.knopf"))}</button>
    </div>
    ${nav("start")}`;
}

function bilanzView(stand, H) {
  const b = tagesBilanz(stand, H, kalendertag()); // Trennung 2 (17.10.2026): alle Zahlen aus js/laden_zahlen.js, hier nur Texte
  const { z, vor, nach, besser, netto, bleibt, rundgaenge, restTage } = b; const u = b.umsatz;
  const sw = { anzahl: b.muell.anzahl, muellwert: b.muell.wert }; const ks = { eingerichtet: b.kuehl.eingerichtet, heuteGemessen: b.kuehl.gemessen, stellen: b.kuehl.stellen };
  const tag = t("abschluss.tage." + b.vergleich.wochentag);
  const v = b.vergleich;
  const vergleich = v.art === "kein" ? t("abschluss.keinVergleich") : v.art === "gleich" ? t("abschluss.gleich", tag) : v.art === "besser" ? t("abschluss.besser", tag, fmtEuro(v.differenz)) : t("abschluss.schlechter", tag, fmtEuro(v.differenz));
  const tn = b.tonne;
  const tonne = !tn ? "" : tn.art === "gleich" ? t("abschluss.tonneGleich") : tn.art === "mehr" ? t("abschluss.tonneMehr", fmtEuro(tn.differenz, { dezimal: 2 })) : t("abschluss.tonneWeniger", fmtEuro(tn.differenz, { dezimal: 2 }));
  return `
    <div class="kopfband"><h1>${esc(t("abschluss.geschafft"))}</h1><div class="unter">${esc(stand.betrieb.name)} · ${esc(H.split("-").reverse().join("."))}</div></div>
    <div class="inhalt">
      <img class="abschluss-pokal" src="bilder/ui/pokal.svg" alt="" aria-hidden="true">
      <div class="karte dunkel zaehler ${nach >= 0 ? "plus" : "minus"}">
        <small class="lbl">${esc(t("abschluss.zaehlerHeute"))}</small>
        <span class="bewegung"><span class="alt">${vor >= 0 ? "+" : "−"} ${fmtEuro(Math.abs(vor))}</span><span class="pfeil">→</span><span class="riesig">${nach >= 0 ? "+" : "−"} ${fmtEuro(Math.abs(nach))}</span></span>
        <small>${esc(besser >= 0 ? t("abschluss.naeher", fmtEuro(besser), restTage !== null ? t("abschluss.nochTage", restTage) : null) : t("abschluss.weiterWeg", fmtEuro(-besser)))}</small>
        <small class="fein">${esc(t("cockpit.kalkulatorisch"))}</small>
      </div>
      <div class="karte">
        <div class="summenzeile"><span>${esc(t("abschluss.umsatzNetto"))}</span><span class="wert">${u ? fmtEuro(netto) : "–"}</span></div>
        <div class="summenzeile"><span>${esc(t("abschluss.bleibt"))}</span><span class="wert">${u ? fmtEuro(bleibt) : "–"}</span></div>
        <div class="summenzeile"><span>${esc(t("abschluss.fixTag"))}</span><span class="wert">− ${fmtEuro(z.tageskosten)}</span></div>
        <div class="summenzeile"><span>${esc(t("abschluss.tonne"))}</span><span class="wert rot">${sw.anzahl ? "− " + fmtEuro(sw.muellwert, { dezimal: 2 }) : "–"}</span></div>
        <div class="summenzeile"><span>${esc(t("abschluss.kuehl"))}</span><span class="wert ${ks.eingerichtet && ks.heuteGemessen >= ks.stellen ? "gruen" : ""}">${ks.eingerichtet ? `${ks.heuteGemessen}/${ks.stellen} · ${esc(t("abschluss.rundgaenge", rundgaenge))}` : "–"}</span></div>
      </div>
      <div class="jetzt still"><span><b>${esc(vergleich)}</b>${tonne ? `<small>${esc(tonne)}</small>` : ""}</span></div>
      <button type="button" class="knopf" data-a="nav" data-wert="start">${esc(t("abschluss.zumCockpit"))}</button>
    </div>
    ${nav("start")}`;
}

export function abschlussAktion(name, el, stand, wurzel) {
  if (name === "abschluss-fertig") { tagAbschliessen(stand, { datum: heute(), geraet: wurzel?.geraet || null }); bilanz = true; return "abgeschlossen"; }
  return false;
}
