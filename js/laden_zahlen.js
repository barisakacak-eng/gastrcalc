// Trennung 2 (17.10.2026): Zahlen für die Laden-Bildschirme „Heute“ und „Tag abschließen“ – ohne Text und ohne HTML.
// Vorher in js/screens/home.js (heuteZielWerte, heuteKachelWerte) und js/screens/abschluss.js (Haken, Bilanz, Vergleiche).
import { heute } from "./util.js";
import { umsatzEintrag, schwundAuswertung, kuehlStatus, kuehlSchlimmsteAbweichung, tagPlus, wochentag } from "./engine.js";
import { zaehler, monatsZiel, abschlussVon } from "./zaehler.js";
import { planGruppen } from "./putzplan.js";

// Zielkarte im Laden. stufe: "bisNull" | "bisZiel" | "ueberZiel" (ohne Ziel = "bisNull"); zahl = die große Zahl (null = keine Kosten);
// marke = Zielmarke des Balkens (bis null: Umsatz + was fehlt, danach das Monatsziel); anteil 0–1;
// tempo: { art: "gut", am } (Ziel erreicht am …) | { art: "knapp", proTag } (so viel pro Tag nötig) | null. m = monatsZiel().
export function heuteZiel(stand, z, H) {
  const m = monatsZiel(stand, z, H);
  const stufe = m.stufe === "ohne" ? "bisNull" : m.stufe;
  const zahl = m.ziel === null ? null : m.stufe === "bisNull" ? m.fehltNull : m.stufe === "bisZiel" ? m.fehlt : m.darueber;
  const marke = m.ziel === null ? null : m.stufe === "bisNull" ? m.umsatz + (m.fehltNull || 0) : m.ziel;
  const anteil = marke ? Math.max(0, Math.min(1, m.umsatz / marke)) : 0;
  const tempo = m.erreichtAm ? { art: "gut", am: m.erreichtAm } : m.proTagNoetig ? { art: "knapp", proTag: m.proTagNoetig } : null;
  return { m, stufe, zahl, marke, anteil, tempo };
}

// Vier Kacheln. Umsatz und Müll nach Geschäftstag H, Kühlung und Putzen nach Kalendertag K (Paket 3, M7).
// kuehl: null (nicht eingerichtet) | { art: "abweichung", wert (°C), alarm: true } | { art: "ok" } | { art: "offen", anzahl, offen: true };
// putz: null (kein Putzplan) | { erledigt, gesamt, alarm (etwas überfällig) }.
export function heuteKachelZahlen(stand, ks, H, K = heute()) {
  const u = umsatzEintrag(stand, H); const sw = schwundAuswertung(stand, { von: H, bis: H });
  let kuehl = null;
  if (ks.eingerichtet) {
    const schlimm = kuehlSchlimmsteAbweichung(stand, K);
    if (schlimm) kuehl = { art: "abweichung", wert: schlimm.wert, alarm: true };
    else if (ks.heuteGemessen >= ks.stellen) kuehl = { art: "ok", alarm: false };
    else kuehl = { art: "offen", anzahl: ks.stellen - ks.heuteGemessen, alarm: false, offen: true };
  }
  let putz = null;
  if (stand.putzplan?.aktiv) { const pg = planGruppen(stand, K); putz = { erledigt: pg.erledigt, gesamt: pg.gesamt, alarm: pg.ueberfaellig > 0 }; }
  return { umsatz: u ? u.umsatz : null, muell: sw.anzahl ? sw.muellwert : null, kuehl, putz };
}

// „Tag abschließen“ – die drei Haken. H = Geschäftstag. umsatz: Notiz oder null; muell: Auswertung des Tages;
// kuehl: { eingerichtet, gemessen, stellen, fertig }; schon: letzter Abschluss dieses Tages oder null.
export function abschlussHaken(stand, H) {
  const u = umsatzEintrag(stand, H); const sw = schwundAuswertung(stand, { von: H, bis: H }); const ks = kuehlStatus(stand);
  return { umsatz: u, muell: { anzahl: sw.anzahl, wert: sw.muellwert, ohneWert: sw.ohneWert },
    kuehl: { eingerichtet: ks.eingerichtet, gemessen: ks.heuteGemessen, stellen: ks.stellen, fertig: ks.eingerichtet && ks.heuteGemessen >= ks.stellen },
    schon: abschlussVon(stand, H) };
}

// Bilanz nach dem Abschluss. H = Geschäftstag, K = Kalendertag (Rundgänge zählen nach Kalender).
// vergleich (gleicher Wochentag der Vorwoche): { art: "gleich"|"besser"|"schlechter"|"kein", differenz, wochentag };
// tonne: { art: "gleich"|"mehr"|"weniger", differenz } oder null; restTage: gewichtete Tage bis null (null = schon im Plus/kein Nulltag).
export function tagesBilanz(stand, H, K = heute()) {
  const z = zaehler(stand, { datum: H });
  const u = umsatzEintrag(stand, H); const sw = schwundAuswertung(stand, { von: H, bis: H }); const ks = kuehlStatus(stand);
  const vor = z.standGestern; const nach = z.stand;
  const V = tagPlus(H, -7); const uv = umsatzEintrag(stand, V); const swv = schwundAuswertung(stand, { von: V, bis: V });
  const vergleich = u && uv ? (Math.abs(u.umsatz - uv.umsatz) < 1 ? { art: "gleich", differenz: 0 } : u.umsatz > uv.umsatz ? { art: "besser", differenz: u.umsatz - uv.umsatz } : { art: "schlechter", differenz: uv.umsatz - u.umsatz }) : { art: "kein", differenz: null };
  vergleich.wochentag = wochentag(H);
  const tonne = u && uv && (sw.anzahl || swv.anzahl) ? (Math.abs(sw.muellwert - swv.muellwert) < 0.5 ? { art: "gleich", differenz: 0 } : sw.muellwert > swv.muellwert ? { art: "mehr", differenz: sw.muellwert - swv.muellwert } : { art: "weniger", differenz: swv.muellwert - sw.muellwert }) : null;
  const restTage = z.nullTag && !z.imPlus ? Math.round(z.tage.filter((x) => x.datum > H && x.datum <= z.nullTag).reduce((s, x) => s + x.gewicht, 0)) : null;
  return {
    z, vor, nach, besser: nach - vor, umsatz: u, netto: u ? z.nettoVon(u.umsatz) : 0, bleibt: u ? z.bleibtVon(u.umsatz) : 0, tageskosten: z.tageskosten,
    muell: { anzahl: sw.anzahl, wert: sw.muellwert },
    kuehl: { eingerichtet: ks.eingerichtet, gemessen: ks.heuteGemessen, stellen: ks.stellen, fertig: ks.eingerichtet && ks.heuteGemessen >= ks.stellen },
    rundgaenge: (stand.rundgaenge || []).filter((r) => r.abgeschlossen && r.datum === K).length,
    vergleich, tonne, restTage,
  };
}
