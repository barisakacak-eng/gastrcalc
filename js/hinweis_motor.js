// Hinweis-Motor „Was dir zusteht“ (Lauf 3, Phase 5, 09.11.2026). Rechenteil, Klasse A. Anzeige live seit Baris' Ja 09.11.2026 17:21.
// Grundlage: Projekt-Dokument „GastroCash Hinweis-Katalog Was dir zusteht 28.10.2026“, Abschnitt 3 (Top 15) mit den Änderungen aus Abschnitt 6.
// Regeln:
//   - Auslöser nur aus Daten, die die App hat (Personen, Schichten, Abwesenheit, Monatsabschluss, Kanäle, Karte, Rechtsform) und aus vier
//     Büro-Fragen, die nur dieser Motor stellt (stand.betrieb.hmAngaben). Kein Auslöser schätzt etwas über den Wirt.
//   - Jeder Hinweis: Quelle mit Abrufdatum, Satz ≤ 25 Wörter, endet mit „Mit deinem Steuerberater klären.“ Nie „absetzen“, nie „sparst“.
//   - Euro nur als Betrag aus der Quelle (Bußgeld-Höchstrahmen, Tarif, Grenze) – nie eine Ersparnis für diesen Laden (§ 5 UWG, § 5 StBerG).
//   - Weggelassen, weil die Quelle im Katalog nicht belegt ist: B_mehrweg (VerpackDG-Fassung nur über eine kommerzielle Seite),
//     B_indexmiete (BGH-Urteil nicht im Volltext gelesen). Sie stehen im Bericht Lauf 3 und kommen erst mit nachgezogener Quelle.
//   - Takt: höchstens ein neuer Hinweis je 7 Tage. Fristen (Sofortmeldung, Ausweis-Hinweis, Arbeitszeit, Minijob-Grenze) kommen sofort.
//   - Büro zeigt höchstens 3, nach Nutzen sortiert. Laden: höchstens eine Zeki-Zeile je 7 Tage, nie in der Stoßzeit.
// Rein: schreibt nur stand.betrieb.hmAngaben (Bereich betrieb) über die Funktionen unten.
import { aktivePersonen, belehrungen } from "./export_amt.js";
import { arbeitszeitListe, schichtStunden } from "./schichten.js";
import { mindestlohnAm } from "./data/mindestlohn.js";
import { monatsZahlen, eingefroren } from "./monatsabschluss.js";
import { PERSONEN, rechtsform } from "./rechtsform.js";
import { istHauptzeit } from "./offen.js";
import { HM_FRAGEN, HM_STATUS, HM_ID_LISTE, hmAngabenSauber } from "./hm_angaben.js";
export { HM_FRAGEN, HM_STATUS, hmAngabenSauber };

export const HM_TAKT_TAGE = 7;
export const HM_MAX_BUERO = 3;
export const HM_NAHE_GRENZE = 0.9;      // Setzung Bau-Chat: „nahe an der Minijob-Grenze“ = ab 90 % (Katalog nennt keine Zahl)
export const HM_ELEKTRO_MONATE = 6;     // BGN ASI 3.10 Abschnitt 7: Orientierungswert 6 Monate
export const HM_ABWESEND_MONATE = 3;    // Abwesenheit der letzten 3 Monate zählt für U1
export const HM_PFLICHT = "Mit deinem Steuerberater klären.";

const z2 = (n) => String(n).padStart(2, "0");
const tagPlus = (tag, n) => { const [j, m, d] = tag.split("-").map(Number); const x = new Date(Date.UTC(j, m - 1, d + n)); return `${x.getUTCFullYear()}-${z2(x.getUTCMonth() + 1)}-${z2(x.getUTCDate())}`; };
const monatPlus = (m, n) => { const [j, mm] = m.split("-").map(Number); const x = j * 12 + (mm - 1) + n; return `${Math.floor(x / 12)}-${z2((x % 12) + 1)}`; };
const monatePlus = (tag, n) => { const [j, m, d] = tag.split("-").map(Number); const x = new Date(Date.UTC(j, m - 1 + n, 1)); const letzter = new Date(Date.UTC(x.getUTCFullYear(), x.getUTCMonth() + 1, 0)).getUTCDate(); return `${x.getUTCFullYear()}-${z2(x.getUTCMonth() + 1)}-${z2(Math.min(d, letzter))}`; };
const gueltigTag = (x) => typeof x === "string" && /^\d{4}-\d{2}-\d{2}$/.test(x);
const istJa = (x) => x === true;

// ---------- Angaben (Büro-Fragen und Status) ----------
// stand.betrieb.hmAngaben = { musik: true|false|null, schwanger: true|false|null, elektroGeprueft: "JJJJ-MM-TT"|null,
//   status: { [id]: { status, datum } }, quittiert: { [id]: [personId…] }, gezeigt: { [id]: "JJJJ-MM-TT" }, ladenZuletzt: "JJJJ-MM-TT"|null }
export const hmAngaben = (stand) => hmAngabenSauber(stand?.betrieb?.hmAngaben);
function schreiben(stand, f) { stand.betrieb ??= {}; const a = hmAngaben(stand); f(a); stand.betrieb.hmAngaben = a; return a; }

// Eine Büro-Frage beantworten. musik/schwanger: true|false; elektroGeprueft: Datum (nicht in der Zukunft), "nie" oder null. Rückgabe true bei Änderung.
export function hmFrageSetzen(stand, frage, wert, { bisHeute = null } = {}) {
  if (!HM_FRAGEN.includes(frage)) return false;
  if (frage === "elektroGeprueft") { if (wert !== null && wert !== "nie" && (!gueltigTag(wert) || (bisHeute && wert > bisHeute))) return false; }
  else if (wert !== true && wert !== false && wert !== null) return false;
  if (hmAngaben(stand)[frage] === wert) return false;
  schreiben(stand, (a) => { a[frage] = wert; }); return true;
}

// ---------- Hilfen für Auslöser ----------
const angestellte = (stand) => aktivePersonen(stand).filter((p) => p.lohnArt !== "minijob");
// Lohn einer Person im Monat aus „Mitarbeiter heute“ und Schichten (je Tag ein Eintrag, Schicht geht vor). Monatslohn-Modell: monatsBrutto.
export function monatsLohn(stand, person, monat) {
  if (person?.lohnModell === "monat" && person.monatsBrutto > 0) return person.monatsBrutto;
  const satzVon = (x) => (x?.satz > 0 ? x.satz : person?.stundenlohn > 0 ? person.stundenlohn : 0);
  const tage = new Map();
  for (const e of stand?.teamTage || []) if (e && typeof e.datum === "string" && e.datum.startsWith(monat) && !e.keine)
    for (const x of e.eintraege || []) if (x && x.person === person.id && x.stunden > 0) tage.set(e.datum, x.stunden * satzVon(x));
  for (const x of stand?.schichten || []) if (x && !x.storniert && x.person === person.id && typeof x.datum === "string" && x.datum.startsWith(monat))
    tage.set(x.datum, (schichtStunden(x.von, x.bis) || 0) * satzVon(null));
  return Math.round([...tage.values()].reduce((s, v) => s + v, 0) * 100) / 100;
}
const minijobNahe = (stand, datum) => {
  const grenze = mindestlohnAm(datum).minijob; const monat = datum.slice(0, 7);
  return aktivePersonen(stand).filter((p) => p.lohnArt === "minijob").some((p) => monatsLohn(stand, p, monat) >= grenze * HM_NAHE_GRENZE);
};
const abwesendKuerzlich = (stand, datum) => {
  const ab = monatPlus(datum.slice(0, 7), -(HM_ABWESEND_MONATE - 1));
  return (stand?.abwesend || []).some((e) => e && typeof e.monat === "string" && e.monat >= ab && e.monat <= datum.slice(0, 7) && (e.eintraege || []).some((x) => x && x.tage > 0));
};
const ergebnisVon = (stand, monat) => { const e = eingefroren(stand, monat); if (e) return e.umsatzBrutto > 0 ? e.ergebnis : null; const z = monatsZahlen(stand, monat); return z.umsatzBrutto > 0 ? z.ergebnis : null; };
const zweiMonateMinus = (stand, datum) => { const m = datum.slice(0, 7); const a = ergebnisVon(stand, monatPlus(m, -1)), b = ergebnisVon(stand, monatPlus(m, -2)); return a !== null && b !== null && a < 0 && b < 0; };
const ausserHaus = (stand) => { const k = stand?.kanaele || {}; return k.abholung === true || k.eigeneLieferung === true || (Array.isArray(k.portale) && k.portale.length > 0); };
const nichtQuittiert = (stand, id) => { const q = new Set(hmAngaben(stand).quittiert[id] || []); return aktivePersonen(stand).filter((p) => !q.has(p.id)); };

// ---------- Die Hinweise ----------
// nutzen: Rang für die Reihenfolge (1 = zuerst). Geld zurück vor hohen Bußgeld-Rahmen vor Pflichten ohne Betrag.
// frist: true = kommt sofort, ohne Wochen-Takt. proPerson: „Erledigt“ gilt für die Personen, die heute da sind; ein neuer Mitarbeiter löst neu aus.
// geld: true = es kann Geld zurückkommen (für die Zeki-Zeile im Laden). euro: Betrag aus der Quelle, nie für diesen Laden gerechnet.
export const HM_HINWEISE = [
  { id: "hm_u2", katalog: "H2-02", nutzen: 1, geld: true, frage: "schwanger",
    titel: "Mutterschutz: Lohn zurück",
    satz: "Bei Mutterschutz oder Beschäftigungsverbot erstattet die Umlagekasse U2 den Lohn zu 100 %, in jedem Betrieb. Antrag stellen. Mit deinem Steuerberater klären.",
    genau: "Erstattet werden Mutterschutzlohn und Zuschuss zum Mutterschaftsgeld, auch die Arbeitgeberanteile. Antrag bei der Kasse der Mitarbeiterin. Überweisung ohne Namen im Verwendungszweck.",
    quelle: "Haufe, Minijob-Umlage U2 (16.12.2025); Informationsportal Steckbrief U2-Verfahren", abruf: "2026-10-28",
    url: "https://www.haufe.de/personal/entgelt/minijob-umlage-u2_78_432388.html",
    ausloeser: (s) => istJa(hmAngaben(s).schwanger) && aktivePersonen(s).length > 0 },
  { id: "hm_u1", katalog: "H2-01", nutzen: 2, geld: true,
    titel: "Lohn bei Krankheit zurück",
    satz: "War ein Mitarbeiter krank, erstattet die Umlagekasse U1 meist bis 80 % des weitergezahlten Lohns. Antrag selbst stellen. Mit deinem Steuerberater klären.",
    genau: "Gilt für Betriebe bis 30 Beschäftigte. Erstattet wird höchstens für 42 Tage derselben Krankheit, nicht in den ersten 28 Tagen eines neuen Arbeitsverhältnisses. Der Satz hängt von der Kasse ab. Minijobber: Antrag bei der Minijob-Zentrale.",
    quelle: "Haufe, Entgeltfortzahlung im Minijob, Umlage U1; DAK Arbeitgeberportal U1; § 3 Abs. 3 EFZG", abruf: "2026-10-28",
    url: "https://www.dak.de/arbeitgeber-portal/sozialversicherung/u1-umlagepflicht-fuer-den-krankheitsfall_55922",
    ausloeser: (s, d) => abwesendKuerzlich(s, d) && aktivePersonen(s).length <= 30 },
  { id: "hm_vz", katalog: "kl_est_vz_senken", nutzen: 3, geld: true, rechtsformen: PERSONEN,
    titel: "Vorauszahlung anpassen",
    satz: "Fällt dein Gewinn, kann das Finanzamt die Vorauszahlungen zur Einkommensteuer anpassen. Die Steuer am Ende bleibt gleich. Mit deinem Steuerberater klären.",
    genau: "Ausgelöst, weil die letzten zwei Monate mit Minus endeten. Anpassen geht bis zum Ende des 15. Monats nach dem Jahr. Kein Anspruch: Das Finanzamt entscheidet. Zu niedrig angesetzt heißt später Nachzahlung.",
    quelle: "§ 37 Abs. 3 EStG", abruf: "2026-10-28", url: "https://www.gesetze-im-internet.de/estg/__37.html",
    ausloeser: (s, d) => zweiMonateMinus(s, d) },
  { id: "hm_arbeitszeit", katalog: "H2-05", nutzen: 4, frist: true, euro: "Bußgeld bis 30.000 €",
    titel: "Arbeitszeit aufschreiben",
    satz: "Beginn, Ende und Dauer jeder Schicht müssen spätestens am 7. Tag notiert sein. In der App fehlen Zeiten. Mit deinem Steuerberater klären.",
    genau: "Gilt auch für Minijobber. Die Liste zwei Jahre aufheben. Im Büro unter Geld & Finanzamt siehst du, welche Tage fehlen.",
    quelle: "§ 17 Abs. 1 MiLoG; Bußgeld laut Senatsverwaltung Berlin, Schwarzarbeitsbekämpfung", abruf: "2026-10-28",
    url: "https://www.gesetze-im-internet.de/milog/__17.html",
    ausloeser: (s, d) => { const a = arbeitszeitListe(s, tagPlus(d, -13), d); return a.ohneZeiten > 0 || a.spaet > 0; } },
  { id: "hm_sofortmeldung", katalog: "H2-03", nutzen: 5, frist: true, proPerson: true, euro: "Bußgeld bis 25.000 €",
    titel: "Sofortmeldung vor dem Start",
    satz: "Neue Leute, auch Aushilfen, müssen spätestens beim ersten Arbeitstag gemeldet sein. Das gilt im Gastgewerbe. Mit deinem Steuerberater klären.",
    genau: "Die Sofortmeldung geht an die Rentenversicherung und ersetzt die normale Anmeldung nicht. „Erledigt“ gilt für alle, die heute im Team stehen.",
    quelle: "§ 28a Abs. 4 SGB IV laut Informationsportal Steckbrief Sofortmeldung (Stand 04.07.2022) und DRV-Lexikon", abruf: "2026-10-28",
    url: "https://www.deutsche-rentenversicherung.de/DRV/DE/Experten/Arbeitgeber-und-Steuerberater/summa-summarum/Lexikon/S/sofortmeldung.html",
    ausloeser: (s) => nichtQuittiert(s, "hm_sofortmeldung").length > 0 },
  { id: "hm_ausweis", katalog: "H2-04", nutzen: 6, frist: true, proPerson: true, euro: "Bußgeld bis 5.000 €",
    titel: "Ausweis-Hinweis schriftlich",
    satz: "Sag neuen Leuten vor dem ersten Tag schriftlich, dass sie den Ausweis mitführen müssen. Nachweis aufheben. Mit deinem Steuerberater klären.",
    genau: "Den Nachweis so lange aufheben, wie die Person bei dir arbeitet. Kopie in die Personalakte. „Erledigt“ gilt für alle, die heute im Team stehen.",
    quelle: "§ 2a Abs. 1 Nr. 2 und Abs. 2 SchwarzArbG; Bußgeld laut Senatsverwaltung Berlin", abruf: "2026-10-28",
    url: "https://www.gesetze-im-internet.de/schwarzarbg_2004/__2a.html",
    ausloeser: (s) => nichtQuittiert(s, "hm_ausweis").length > 0 },
  { id: "hm_midijob", katalog: "H2-07", nutzen: 7, frist: true,
    titel: "Minijob-Grenze erreicht",
    satz: "Ein Minijob-Lohn liegt nahe an der Grenze von {grenze} € im Monat. Darüber wird es ein Midijob mit Beiträgen. Mit deinem Steuerberater klären.",
    genau: "Übergangsbereich (Midijob) bis 2.000 € im Monat. Grenze 2026: 603 €, ab 2027: 633 €.",
    quelle: "Deutsche Rentenversicherung, Pressemeldung 23.02.2026; Grenze 2027 laut Haufe Gesetzesradar", abruf: "2026-10-28",
    url: "https://www.deutsche-rentenversicherung.de/DRV/DE/Ueber-uns-und-Presse/Presse/Meldungen/2026/260223-minijob-midijob-verdienstgrenzen-steigen.html",
    ausloeser: (s, d) => minijobNahe(s, d), werte: (s, d) => ({ grenze: mindestlohnAm(d).minijob }) },
  { id: "hm_gema", katalog: "B_gema", nutzen: 8, frage: "musik", euro: "Tarif 2026: 395,90 € netto im Jahr (Gaststätte bis 100 m², Radio)",
    titel: "Musik braucht Lizenz",
    satz: "Hören Gäste Radio oder Musik, brauchst du vorher eine GEMA-Lizenz. Der Rundfunkbeitrag ersetzt sie nicht. Mit deinem Steuerberater klären.",
    genau: "Mit Gesamtvertrag über einen Verband gibt es 20 % Nachlass. Welcher Verband, steht nicht in der Quelle.",
    quelle: "GEMA Tarifübersicht Gaststätten 2026; IHK Konstanz", abruf: "2026-10-28",
    url: "https://www.gema.de/documents/d/guest/user_upload-dokumente-musiknutzer-tarife-tarife_ad-tarifuebersicht_gaststaetten-pdf",
    ausloeser: (s) => istJa(hmAngaben(s).musik) },
  { id: "hm_rundfunk", katalog: "B_rundfunk", nutzen: 9, euro: "18,36 € statt 6,12 € im Monat je Laden",
    titel: "Rundfunkbeitrag prüfen",
    satz: "Ab 9 Beschäftigten mit Sozialversicherung steigt der Rundfunkbeitrag je Laden. Minijobber und du zählen nicht. Mit deinem Steuerberater klären.",
    genau: "Stufe 0 bis 8 Beschäftigte: 6,12 € im Monat, 9 bis 19: 18,36 €. Änderungen bis 31. März melden. Erstes Auto je Laden frei.",
    quelle: "Bayernportal Rundfunkbeitrag für Betriebsstätten (ohne Seitendatum); IHK München", abruf: "2026-10-28",
    url: "https://www.bayernportal.de/dokumente/leistung/6293692188184",
    ausloeser: (s) => angestellte(s).length >= 9 },
  { id: "hm_lucid", katalog: "B_lucid", nutzen: 10,
    titel: "Verpackungsregister LUCID",
    satz: "Gibst du Essen in Kartons, Bechern oder Tüten mit, musst du dich vorher im Verpackungsregister LUCID eintragen. Mit deinem Steuerberater klären.",
    genau: "Gilt auch, wenn der Lieferant die Verpackung schon lizenziert hat. Das Register ist öffentlich. Bußgeld: Höhe im neuen Gesetz (VerpackDG) nicht belegt.",
    quelle: "Zentrale Stelle Verpackungsregister, Service-Verpackungen (12.08.2026); Gleiss Lutz zum VerpackDG", abruf: "2026-10-28",
    url: "https://www.verpackungsregister.org/en/knowledge-bases/service-packaging",
    ausloeser: (s) => ausserHaus(s) },
  { id: "hm_belehrung", katalog: "H2-06", nutzen: 11,
    titel: "Belehrung erneuern",
    satz: "Wer mit Lebensmitteln arbeitet, braucht alle zwei Jahre eine Folgebelehrung. Bei mindestens einer Person ist sie bald fällig oder fehlt. Mit deinem Steuerberater klären.",
    genau: "Die Folgebelehrung darfst du selbst machen. Die Erstbelehrung kommt vom Gesundheitsamt. Daten trägst du im Amt-Ordner ein.",
    quelle: "§ 43 Abs. 4 IfSG laut IHK Karlsruhe, Pflichtschulungen im Lebensmittelbereich", abruf: "2026-10-28",
    url: "https://www.ihk.de/karlsruhe/fachthemen/tourismus-gastronomie/pflichtschulungen-im-lebensmittelbereich-4175492",
    ausloeser: (s, d) => { const b = belehrungen(s, { datum: d }); return b.zeilen.length > 0 && b.zaehl.ok < b.zeilen.length; } },
  { id: "hm_allergene", katalog: "B_allergene", nutzen: 12,
    titel: "Allergene angeben",
    satz: "Auch bei loser Ware müssen die 14 Allergene je Gericht schriftlich stehen oder mündlich mit Liste und Hinweisschild. Mit deinem Steuerberater klären.",
    genau: "Auskunft vor dem Kauf. Neuer Lieferant für Soße, Brot oder Fleisch: Allergene neu prüfen.",
    quelle: "IHK Schwerin, Kennzeichnung von Allergenen in der Gastronomie (Seitenstand nicht ausgewiesen)", abruf: "2026-10-28",
    url: "https://www.ihk.de/schwerin/standort-westmecklenburg/tourismus-und-gastgewerbe/rechtsfragen/kennzeichnung-von-allergenen-stoffen-in-der-gastronomie-6200314",
    ausloeser: (s) => (s?.gerichte || []).some((g) => g && !g.entfernt) },
  { id: "hm_elektro", katalog: "H4-01", nutzen: 13, frage: "elektroGeprueft",
    titel: "Elektrogeräte prüfen lassen",
    satz: "Mixer, Toaster, Kabel und Kochplatten soll eine Elektrofachkraft prüfen, laut BGN etwa alle 6 Monate, bei wenigen Mängeln jährlich. Mit deinem Steuerberater klären.",
    genau: "Die genaue Frist legst du in deiner Gefährdungsbeurteilung fest. Prüfbericht aufheben. Trag das Datum der letzten Prüfung ein, dann meldet sich die App erst wieder nach 6 Monaten.",
    quelle: "BGN ASI 3.10, Abschnitt 7; BGN Prüffristen", abruf: "2026-10-28",
    url: "https://vorschriften.bgn-branchenwissen.de/daten/asi/a3_10_0/7.htm",
    ausloeser: (s, d) => { if (!aktivePersonen(s).length) return false; const g = hmAngaben(s).elektroGeprueft; return !gueltigTag(g) || monatePlus(g, HM_ELEKTRO_MONATE) <= d; } },
];
const HM_IDS = new Set(HM_ID_LISTE);
if (HM_HINWEISE.some((h) => !HM_IDS.has(h.id)) || HM_ID_LISTE.length !== HM_HINWEISE.length) throw new Error("HM_ID_LISTE (js/hm_angaben.js) passt nicht zu HM_HINWEISE");
export const hmMitId = (id) => HM_HINWEISE.find((h) => h.id === id) || null;
export const HM_WEGGELASSEN = [
  { katalog: "B_mehrweg", grund: "VerpackDG-Fassung (§§ 60, 61, 66) nur über eine kommerzielle Seite belegt, Gesetzestext nicht gelesen" },
  { katalog: "B_indexmiete", grund: "BGH 11.03.2026, XII ZR 51/25 nur über Kanzleiseiten, Urteilstext nicht gelesen; Auslöser-Schwelle 3 % ohne Quelle" },
];

const passtRechtsform = (h, stand) => !h.rechtsformen || h.rechtsformen.includes(rechtsform(stand));
const satzMitWerten = (h, s, d) => { const w = h.werte ? h.werte(s, d) : {}; return h.satz.replace(/\{(\w+)\}/g, (_, k) => (w[k] ?? "")); };

// Alle Hinweise, deren Auslöser heute greift, mit Status. Ohne Takt, ohne Begrenzung (für Tests und das Büro-Archiv).
export function hmAusgeloest(stand, { datum }) {
  const a = hmAngaben(stand); const out = [];
  for (const h of HM_HINWEISE) {
    if (!passtRechtsform(h, stand)) continue;
    let an = false; try { an = !!h.ausloeser(stand, datum); } catch { an = false; } // kaputte Daten: Hinweis bleibt aus
    if (!an) continue;
    const st = a.status[h.id]?.status || "offen";
    // Pro-Person-Hinweise: „erledigt“ gilt nur für quittierte Personen; der Auslöser greift nur bei neuen. Darum hier wieder „offen“.
    const status = h.proPerson && st === "erledigt" ? "offen" : st;
    out.push({ id: h.id, katalog: h.katalog, nutzen: h.nutzen, frist: !!h.frist, geld: !!h.geld, titel: h.titel, satz: satzMitWerten(h, stand, datum),
      genau: h.genau, euro: h.euro || null, werte: h.werte ? h.werte(stand, datum) : {}, quelle: h.quelle, abruf: h.abruf, url: h.url, status, gezeigt: a.gezeigt[h.id] || null });
  }
  return out.sort((x, y) => x.nutzen - y.nutzen);
}

// Büro „Hinweise“: höchstens 3 offene, nach Nutzen. Takt: ein noch nie gezeigter Nicht-Frist-Hinweis kommt nur dazu, wenn in den letzten
// 7 Tagen kein anderer zum ersten Mal gezeigt wurde. Fristen kommen immer. Rückgabe: { karten, neu } – neu = ids, die heute zum ersten Mal kommen.
export function hmFuerBuero(stand, { datum }) {
  const a = hmAngaben(stand); const offen = hmAusgeloest(stand, { datum }).filter((h) => h.status === "offen");
  const vorTakt = tagPlus(datum, -(HM_TAKT_TAGE - 1));
  let taktFrei = !Object.entries(a.gezeigt).some(([id, d]) => d >= vorTakt && d <= datum && !hmMitId(id)?.frist);
  const karten = [], neu = [];
  for (const h of offen) {
    if (karten.length >= HM_MAX_BUERO) break;
    if (h.gezeigt || h.frist) { karten.push(h); if (!h.gezeigt) neu.push(h.id); continue; }
    if (taktFrei) { karten.push(h); neu.push(h.id); taktFrei = false; }
  }
  return { karten, neu };
}
// Fragen, die ein Hinweis braucht und die noch offen sind (nur diese zeigt das Büro). Schwangerschaft nur, wenn Personen da sind.
export function hmOffeneFragen(stand) {
  const a = hmAngaben(stand); const out = [];
  if (a.musik === null) out.push("musik");
  if (a.schwanger === null && aktivePersonen(stand).length) out.push("schwanger");
  if (a.elektroGeprueft === null && aktivePersonen(stand).length) out.push("elektroGeprueft");
  return out;
}
export function hmGezeigtMerken(stand, ids, datum) {
  const neu = (ids || []).filter((id) => HM_IDS.has(id) && !hmAngaben(stand).gezeigt[id]);
  if (!neu.length || !gueltigTag(datum)) return false;
  schreiben(stand, (a) => { for (const id of neu) a.gezeigt[id] = datum; }); return true;
}
// Status setzen. Pro-Person-Hinweis + „erledigt“: merkt die Personen, die heute aktiv sind.
export function hmStatusSetzen(stand, id, status, { datum }) {
  const h = hmMitId(id); if (!h || !HM_STATUS.includes(status) || !gueltigTag(datum)) return false;
  schreiben(stand, (a) => {
    a.status[id] = { status, datum };
    if (h.proPerson && status === "erledigt") a.quittiert[id] = [...new Set([...(a.quittiert[id] || []), ...aktivePersonen(stand).map((p) => p.id)])];
  });
  return true;
}
// „Was dir zusteht“-Zähler: Anzahl erledigter oder mit dem Steuerberater geklärter Hinweise. Kein Euro (§ 5 UWG).
export const hmErledigtZahl = (stand) => Object.values(hmAngaben(stand).status).filter((e) => e.status === "erledigt" || e.status === "geklaert").length;

// Laden: höchstens eine Zeki-Zeile je 7 Tage, nie in der Stoßzeit, nur wenn im Büro ein Hinweis offen ist.
// Rückgabe: Text-Schlüssel ("hm.zeki.geld" | "hm.zeki.pflicht") oder null. Gemerkt wird erst mit hmLadenGezeigt.
export function hmLadenZeile(stand, { jetzt }) {
  const datum = `${jetzt.getFullYear()}-${z2(jetzt.getMonth() + 1)}-${z2(jetzt.getDate())}`;
  if (istHauptzeit(jetzt.getHours() + jetzt.getMinutes() / 60, stand)) return null;
  const z = hmAngaben(stand).ladenZuletzt; if (z && z > tagPlus(datum, -HM_TAKT_TAGE)) return null;
  const { karten } = hmFuerBuero(stand, { datum }); if (!karten.length) return null;
  return karten.some((h) => h.geld) ? "hm.zeki.geld" : "hm.zeki.pflicht";
}
export function hmLadenGezeigt(stand, datum) { if (!gueltigTag(datum)) return false; schreiben(stand, (a) => { a.ladenZuletzt = datum; }); return true; }

// ---------- Prüfer (Tests, Regelprüfung) ----------
const VERBOTEN = /revolutionär|disruptiv|marktführer|gobd-konform|betriebsprüfungsfest|steuersicher|rechtssicher|absetzen|sparst|garantiert|zertifiziert/i;
const woerter = (x) => String(x).split(/\s+/).filter((w) => /[A-Za-zÄÖÜäöüß]/.test(w)).length;
export function hmPruefen(h) {
  const f = [];
  if (!h.quelle || !h.url || !/^https:\/\//.test(h.url)) f.push("quelle");
  if (!gueltigTag(h.abruf)) f.push("abruf");
  if (woerter(h.satz) > 25) f.push("satz>25");
  if (woerter(h.titel) > 4) f.push("titel>4");
  if (!h.satz.endsWith(HM_PFLICHT)) f.push("pflichtsatz");
  for (const feld of ["titel", "satz", "genau", "euro", "quelle"]) if (h[feld] && VERBOTEN.test(h[feld])) f.push("verboten:" + feld);
  if (h.euro && !/bis|Tarif|statt/.test(h.euro)) f.push("euro-ohne-quelle");
  return f;
}
