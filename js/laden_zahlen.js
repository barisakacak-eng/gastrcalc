// Trennung 2 (17.10.2026): Zahlen für die Laden-Bildschirme „Heute“ und „Tag abschließen“ – ohne Text und ohne HTML.
// Vorher in js/screens/home.js (heuteZielWerte, heuteKachelWerte) und js/screens/abschluss.js (Haken, Bilanz, Vergleiche).
import { heute, heuteGeschaeft, parseZahl } from "./util.js";
import { tagesnotizSetzen, tagesnotizenFestschreiben, aktiveStellen } from "./engine.js"; // Laden-Umbau (20.10.2026): „Umsatz heute“ und Kühl-Rundgang im Laden
import { umsatzEintrag, schwundAuswertung, kuehlStatus, kuehlSchlimmsteAbweichung, tagPlus, wochentag, ruhetageAm } from "./engine.js";
import { zaehler, monatsZiel, abschlussVon } from "./zaehler.js";
import { planGruppen } from "./putzplan.js";

// Zielkarte im Laden. stufe: "bisNull" | "bisZiel" | "ueberZiel" (ohne Ziel = "bisNull"); zahl = die große Zahl (null = keine Kosten);
// marke = Zielmarke des Balkens (bis null: Umsatz + was fehlt, danach das Monatsziel); anteil 0–1;
// tempo: { art: "gut", am } (Ziel erreicht am …) | { art: "knapp", proTag } (so viel pro Tag nötig) | null. m = monatsZiel().
export function heuteZiel(stand, z, H) {
  const m = monatsZiel(stand, z, H);
  // Baris 24.10.2026, Variante A: immer der Monatsblick. Erst „bis null“ (Umsatz bis zum Monats-Nullpunkt), dann „zum Ziel“, dann „über Ziel“.
  // Vorher wechselte die Zahl am Tag zwischen Monats- und Tagesstand (Gremium 1, Blocker 3).
  const u = m.umsatz || 0;
  const stufe = m.ziel === null ? "bisNull" : u < m.nullpunkt ? "bisNull" : u < m.ziel ? "bisZiel" : "ueberZiel";
  const zahl = m.ziel === null ? null : stufe === "bisNull" ? m.nullpunkt - u : stufe === "bisZiel" ? m.ziel - u : u - m.ziel;
  const marke = m.ziel === null ? null : stufe === "bisNull" ? m.nullpunkt : m.ziel;
  const anteil = marke ? Math.max(0, Math.min(1, m.umsatz / marke)) : 0;
  const tempo = m.erreichtAm ? { art: "gut", am: m.erreichtAm } : m.proTagNoetig ? { art: "knapp", proTag: m.proTagNoetig } : null;
  return { m, stufe, zahl, marke, anteil, tempo };
}

// Vier Kacheln. Umsatz und Müll nach Geschäftstag H, Kühlung und Putzen nach Kalendertag K (Paket 3, M7).
// kuehl: null (nicht eingerichtet) | { art: "abweichung", wert (°C), alarm: true } | { art: "ok" } | { art: "offen", anzahl, offen: true }
//   | { art: "ruhetag" } (Schwadron 18.10.2026, N2: heute ist laut Kühlkontrolle Ruhetag – nichts offen, solange nichts abweicht);
// putz: null (kein Putzplan) | { erledigt, gesamt, alarm (etwas überfällig) }.
export function heuteKachelZahlen(stand, ks, H, K = heute()) {
  const u = umsatzEintrag(stand, H); const sw = schwundAuswertung(stand, { von: H, bis: H });
  let kuehl = null;
  if (ks.eingerichtet) {
    const schlimm = kuehlSchlimmsteAbweichung(stand, K);
    if (schlimm) kuehl = { art: "abweichung", wert: schlimm.wert, alarm: true };
    else if (ks.heuteGemessen >= ks.stellen) kuehl = { art: "ok", alarm: false };
    else if (istRuhetag(stand, K)) kuehl = { art: "ruhetag", alarm: false };
    else kuehl = { art: "offen", anzahl: ks.stellen - ks.heuteGemessen, alarm: false, offen: true };
  }
  let putz = null;
  if (stand.putzplan?.aktiv) { const pg = planGruppen(stand, K); putz = { erledigt: pg.erledigt, gesamt: pg.gesamt, alarm: pg.ueberfaellig > 0 }; }
  return { umsatz: u ? u.umsatz : null, muell: sw.anzahl ? sw.muellwert : null, kuehl, putz };
}

// Schwadron 18.10.2026, N2: Kalendertag K ist ein Ruhetag (Ruhetage der Kühlkontrolle, mit Gültig-ab-Verlauf)
export const istRuhetag = (stand, K = heute()) => ruhetageAm(stand, K).includes(wochentag(K));

// „Tag abschließen“ – die drei Haken. H = Geschäftstag. umsatz: Notiz oder null; muell: Auswertung des Tages;
// kuehl: { eingerichtet, gemessen, stellen, fertig }; schon: letzter Abschluss dieses Tages oder null.
export function abschlussHaken(stand, H) {
  const u = umsatzEintrag(stand, H); const sw = schwundAuswertung(stand, { von: H, bis: H }); const ks = kuehlStatus(stand);
  return { umsatz: u, muell: { anzahl: sw.anzahl, wert: sw.muellwert, ohneWert: sw.ohneWert },
    kuehl: { eingerichtet: ks.eingerichtet, gemessen: ks.heuteGemessen, stellen: ks.stellen, nachkontrollen: ks.nachkontrollen || 0, fertig: ks.eingerichtet && ks.heuteGemessen >= ks.stellen && !(ks.nachkontrollen > 0) }, // Gremium 1 (24.10.2026): offene Nachkontrolle = nicht fertig
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

// ---------- Laden-Umbau (20.10.2026): „Umsatz heute“ im Laden ----------
// Eine Zahl aus der Kasse (brutto, wie die Kasse sie druckt), ein Knopf. Gespeichert wird genau wie die Tagesumsatz-Eingabe im Büro
// (tagesnotizSetzen + festschreiben, Geschäftstag bis 4 Uhr). Über UMSATZ_RUECKFRAGE_AB fragt der Bildschirm einmal nach (Tippfehler-Schutz),
// statt still zu speichern – die Grenze ist eine Plausibilitätsgrenze für einen Imbiss-Tag, keine Rechenregel.
export const UMSATZ_RUECKFRAGE_AB = 100000;
// Rückgabe: { status: "leer" | "ungueltig" | "rueckfrage" | "ok", betrag }
export function umsatzHeutePruefen(eingabe, { bestaetigt = false } = {}) {
  if (eingabe === null || eingabe === undefined || String(eingabe).trim() === "") return { status: "leer", betrag: null };
  const n = parseZahl(eingabe);
  if (n === null) return { status: "ungueltig", betrag: null };
  if (n > UMSATZ_RUECKFRAGE_AB && !bestaetigt) return { status: "rueckfrage", betrag: n };
  return { status: "ok", betrag: n };
}
// Speichert den Tagesumsatz für den Geschäftstag (Standard: heute bis 4 Uhr). Rückgabe: der gültige Eintrag.
export function umsatzHeuteSpeichern(stand, betrag, { datum = heuteGeschaeft(), geraet = null } = {}) {
  tagesnotizSetzen(stand, datum, betrag, { nacherfasst: datum !== heuteGeschaeft(), geraet });
  tagesnotizenFestschreiben(stand);
  return umsatzEintrag(stand, datum);
}

// Kühl-Rundgang im Laden: wer misst, ist vorbelegt – die Person des letzten Rundgangs, sonst die erste aktive Person (in der Regel
// der Inhaber, der beim Einrichten zuerst eingetragen wird), ohne Personen null. Ausgeschiedene und entfernte zählen nie.
export function kuehlWerVorschlag(stand) {
  const aktiv = (stand.personen || []).filter((p) => !p.entfernt && p.aktiv !== false && !p.ausgeschieden);
  if (!aktiv.length) return null;
  const letzte = [...(stand.rundgaenge || [])].filter((r) => r.von && !r.verworfen).sort((a, b) => String(a.gestartet || "").localeCompare(String(b.gestartet || ""))).pop();
  return letzte && aktiv.some((p) => p.id === letzte.von) ? letzte.von : aktiv[0].id;
}
// Erste Stelle im Rundgang, die noch keinen Wert hat (in der Reihenfolge der Einrichtung); alle gemessen = null.
export function kuehlNaechsteStelle(stand, r) {
  if (!r) return null;
  const k = aktiveStellen(stand).find((x) => !r.messungen.some((m) => m.stelle === x.id));
  return k ? k.id : null;
}
// Wer misst, lässt sich im offenen Rundgang ändern (nur aktive Personen; nach dem Abschluss nicht mehr). Rückgabe: true = geändert.
export function rundgangVonSetzen(stand, r, von) {
  if (!r || r.abgeschlossen || !(stand.rundgaenge || []).includes(r)) return false;
  if (von !== null && !(stand.personen || []).some((p) => p.id === von && !p.entfernt && p.aktiv !== false)) return false;
  r.von = von; return true;
}
