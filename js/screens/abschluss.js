// Etappe 5: „Tag abschließen" – drei Haken (Umsatz, Müll, Kühlung), dann die Bilanz des Tages. Das Abendritual.
import { t } from "../i18n.js";
import { esc, fmtEuro, fmtZahl, heute as kalendertag, heuteGeschaeft as heute } from "../util.js"; // Paket 3 (16.10.2026), M7: Abschluss um 01:30 gehört zum Vortag (Geschäftstag); Kühlung bleibt am Kalendertag
import { tagAbschliessen } from "../zaehler.js";
import { abschlussHaken, tagesBilanz } from "../laden_zahlen.js"; // Trennung 2 (17.10.2026)
import { nav } from "./nav.js";
import { zeitKurz } from "./tag.js";

let bilanz = null; // nach dem Abschluss: die Bilanz-Ansicht (flüchtig)

export const abschlussKennung = () => (bilanz ? "bilanz" : "haken");
export function abschlussZuruecksetzen() { bilanz = null; }

// Laden-Umbau (20.10.2026): drei Zeilen (Umsatz aus der Kasse mit Betrag, Müll ✓/–, Kühlung x / y – rot, wenn offen) und ein Knopf.
// Jede Zeile ist antippbar (Umsatz → „Umsatz heute“, Müll → Müll, Kühlung → Rundgang). Was passiert, wenn etwas fehlt, steht hinter „?“.
export function abschlussView(stand) {
  const H = heute();
  if (bilanz) return bilanzView(stand, H);
  const hk = abschlussHaken(stand, H); const u = hk.umsatz; const ab = hk.schon; // Trennung 2 (17.10.2026): Haken aus js/laden_zahlen.js
  const k = hk.kuehl; const kuehlOffen = k.eingerichtet && !k.fertig;
  const zeile = (attr, titel, unter, wert, cls = "") => `<button type="button" class="zeileknopf ab-zeile ${cls}" ${attr}><span><b>${esc(titel)}</b>${unter ? `<small>${esc(unter)}</small>` : ""}</span><span class="ab-wert zahl">${wert}</span><span class="pfeil">›</span></button>`;
  return `
    <div class="kopfband ab-kopf"><h1>${esc(t("abschluss.titel"))}</h1></div>
    <div class="inhalt abschluss-laden">
      ${ab ? `<div class="tipp">${esc(t("abschluss.schon", zeitKurz(ab.erfasst)))}</div>` : ""}
      <div class="karte ab-liste" role="group" aria-label="${esc(t("abschluss.titel"))}">
        ${zeile('data-a="nav" data-wert="umsatzheute"', t("heute.kachel.umsatz"), t("abschluss.umsatzKurz"), u ? esc(fmtEuro(u.umsatz, { dezimal: 2 })) : "–", u ? "fertig" : "offen")}
        ${zeile('data-a="nav" data-wert="muell"', t("ebene.tabs.muell"), "", hk.muell.anzahl > 0 ? `<span class="gruen">✓</span>` : "–", hk.muell.anzahl > 0 ? "fertig" : "neutral")}
        ${zeile(`data-a="${k.eingerichtet ? "kuehl-rundgang-start" : "kuehl-einrichtung-oeffnen"}" data-offen="0"`, t("ebene.tabs.kuehl"), "", k.eingerichtet ? `<span class="${kuehlOffen ? "rot" : "gruen"}">\u2066${k.gemessen} / ${k.stellen}\u2069</span>` : "–", kuehlOffen ? "warn" : k.fertig ? "fertig" : "neutral")}
      </div>
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
    <div class="kopfband ab-kopf ab-ergebnis-kopf"><h1>${esc(t("abschluss.geschafft"))}</h1><div class="unter">${esc(stand.betrieb.name)} · ${esc(H.split("-").reverse().join("."))}</div></div>
    <div class="inhalt ab-bilanz">
      <div class="karte dunkel zaehler ab-hero ${nach >= 0 ? "plus" : "minus"}">
        <small class="lbl">${esc(t("abschluss.zaehlerHeute"))}</small>
        <span class="bewegung"><span class="alt">${vor >= 0 ? "+" : "−"} ${fmtEuro(Math.abs(vor))}</span><span class="pfeil" aria-hidden="true">→</span><span class="riesig">${nach >= 0 ? "+" : "−"} ${fmtEuro(Math.abs(nach))}</span></span>
        <small class="ab-verlauf ${besser >= 0 ? "positiv" : "negativ"}">${esc(besser >= 0 ? t("abschluss.naeher", fmtEuro(besser), restTage !== null ? t("abschluss.nochTage", restTage) : null) : t("abschluss.weiterWeg", fmtEuro(-besser)))}</small>
        <small class="fein">${esc(t("cockpit.kalkulatorisch"))}</small>
      </div>
      <div class="karte ab-zahlen">
        <div class="summenzeile"><span>${esc(t("abschluss.umsatzNetto"))}</span><span class="wert">${u ? fmtEuro(netto) : "–"}</span></div>
        <div class="summenzeile"><span>${esc(t("abschluss.bleibt"))}</span><span class="wert">${u ? fmtEuro(bleibt) : "–"}</span></div>
        <details class="ab-details">
          <summary>${esc(t("start.mehr"))}<span aria-hidden="true">⌄</span></summary>
        <div class="summenzeile"><span>${esc(t("abschluss.fixTag"))}</span><span class="wert">− ${fmtEuro(z.tageskosten)}</span></div>
        <div class="summenzeile"><span>${esc(t("abschluss.tonne"))}</span><span class="wert rot">${sw.anzahl ? "− " + fmtEuro(sw.muellwert, { dezimal: 2 }) : "–"}</span></div>
        <div class="summenzeile"><span>${esc(t("abschluss.kuehl"))}</span><span class="wert ${ks.eingerichtet && ks.heuteGemessen >= ks.stellen ? "gruen" : ""}">${ks.eingerichtet ? `${ks.heuteGemessen}/${ks.stellen} · ${esc(t("abschluss.rundgaenge", rundgaenge))}` : "–"}</span></div>
        </details>
      </div>
      <div class="jetzt still ab-vergleich ${v.art}"><span><b>${esc(vergleich)}</b>${tonne ? `<small>${esc(tonne)}</small>` : ""}</span></div>
      <button type="button" class="knopf glut ab-zurueck" data-a="nav" data-wert="start">${esc(t("abschluss.zumCockpit"))}</button>
    </div>
    ${nav("start")}`;
}

export function abschlussAktion(name, el, stand, wurzel) {
  if (name === "abschluss-fertig") { tagAbschliessen(stand, { datum: heute(), geraet: wurzel?.geraet || null }); bilanz = true; return "abgeschlossen"; }
  return false;
}
