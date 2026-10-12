// Etappe 5: „Tag abschließen" – drei Haken (Umsatz, Müll, Kühlung), dann die Bilanz des Tages. Das Abendritual.
import { t } from "../i18n.js";
import { esc, fmtEuro, fmtZahl, heute, wertAnzeige } from "../util.js";
import { umsatzEintrag, schwundAuswertung, kuehlStatus, umsatzSteuerSatz, tagPlus, wochentag } from "../engine.js";
import { zaehler, tagAbschliessen, abschlussVon } from "../zaehler.js";
import { nav } from "./nav.js";
import { zeitKurz } from "./tag.js";

let bilanz = null; // nach dem Abschluss: die Bilanz-Ansicht (flüchtig)

export const abschlussKennung = () => (bilanz ? "bilanz" : "haken");
export function abschlussZuruecksetzen() { bilanz = null; }

export function abschlussView(stand) {
  const H = heute();
  if (bilanz) return bilanzView(stand, H);
  const u = umsatzEintrag(stand, H); const sw = schwundAuswertung(stand, { von: H, bis: H }); const ks = kuehlStatus(stand); const ab = abschlussVon(stand, H);
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
  const z = zaehler(stand, { datum: H }); const st = umsatzSteuerSatz(stand);
  const u = umsatzEintrag(stand, H); const sw = schwundAuswertung(stand, { von: H, bis: H }); const ks = kuehlStatus(stand);
  const vor = z.standGestern; const nach = z.stand; const besser = nach - vor;
  const netto = u ? u.umsatz / (1 + st.satz) : 0; const bleibt = z.quote !== null ? netto * (1 - z.quote) : netto;
  const rundgaenge = (stand.rundgaenge || []).filter((r) => r.abgeschlossen && r.datum === H).length;
  // Vergleich mit demselben Wochentag der Vorwoche
  const V = tagPlus(H, -7); const uv = umsatzEintrag(stand, V); const swv = schwundAuswertung(stand, { von: V, bis: V });
  const tag = t("abschluss.tage." + wochentag(H));
  const vergleich = u && uv ? (Math.abs(u.umsatz - uv.umsatz) < 1 ? t("abschluss.gleich", tag) : u.umsatz > uv.umsatz ? t("abschluss.besser", tag, fmtEuro(u.umsatz - uv.umsatz)) : t("abschluss.schlechter", tag, fmtEuro(uv.umsatz - u.umsatz))) : t("abschluss.keinVergleich");
  const tonne = u && uv && (sw.anzahl || swv.anzahl) ? (Math.abs(sw.muellwert - swv.muellwert) < 0.5 ? t("abschluss.tonneGleich") : sw.muellwert > swv.muellwert ? t("abschluss.tonneMehr", fmtEuro(sw.muellwert - swv.muellwert, { dezimal: 2 })) : t("abschluss.tonneWeniger", fmtEuro(swv.muellwert - sw.muellwert, { dezimal: 2 }))) : "";
  const restTage = z.nullTag && !z.imPlus ? Math.round(z.tage.filter((x) => x.datum > H && x.datum <= z.nullTag).reduce((s, x) => s + x.gewicht, 0)) : null;
  return `
    <div class="kopfband"><h1>${esc(t("abschluss.geschafft"))}</h1><div class="unter">${esc(stand.betrieb.name)} · ${esc(H.split("-").reverse().join("."))}</div></div>
    <div class="inhalt">
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
