// Eigentümer-Ebene (18.10.2026): ein Blick über alle Läden auf diesem Handy – je Laden und Zeitraum Umsatz, Wareneinsatz, Müll,
// Schwund-Verdacht, Personalessen, offene Pflichten, Stand „bis null“, Lager und Bestellbedarf, laufende Aktionen; dazu Rang je Kennzahl,
// Abstand zum besten Laden und Trend gegenüber dem Vorzeitraum. Reine Funktionen, keine Oberfläche, nichts wird geschrieben.
// Alles kommt aus den vorhandenen Rechenwerken (engine, zaehler, export_amt, verkauf, bestand, aktion_plan) – keine zweite Rechnung.
// Ohne Server: nur Läden, die auf diesem Handy liegen (oder per Sicherung eingespielt wurden). Der Beispiel-Laden zählt nie mit –
// außer es gibt sonst nur leere eigene Läden: dann wird er mit Kennzeichnung gezeigt, damit man die Ebene sehen kann.
// Ehrlichkeit: unvollständige Daten werden benannt (fehlt-Liste je Laden), Schätzungen tragen geschaetzt: true (Anzeige „≈“),
// verglichen wird nur zwischen Läden mit gleicher Datenbasis – sonst steht ein Hinweis statt eines Rangs.
import { t, sprache } from "./i18n.js";
import { heute, heuteGeschaeft, fmtEuro, fmtZahl } from "./util.js";
import { tagPlus, umsatzEintrag, umsatzZeitraum, schwundAuswertung } from "./engine.js";
import { zaehler, wareneinsatzQuote, tagGewicht } from "./zaehler.js";
import { ordnerAmt, druckHtml } from "./export_amt.js";
import { abgleichInventur, verkaeufeImZeitraum } from "./verkauf.js";
import { bestandStand, bestellVorschlag } from "./bestand.js";
import { aktionUhrzeit } from "./aktion_plan.js";
import { imTakt } from "./takt.js";
import { csvText, datumDe } from "./export_steuer.js";

export const EIG_ZEITRAEUME = ["woche", "monat", "frei"];
export const WARE_PUNKTE_SATZ = 3;        // ab 3 Prozentpunkten Unterschied im Wareneinsatz sagt der Satz es (Annahme der App, kein Branchenwert)
export const KENNZAHLEN = ["umsatz", "ware", "muell", "pflichten", "bisNull"]; // nur diese bekommen Rang und Abstand
const ISO = /^\d{4}-\d{2}-\d{2}$/;
const gueltig = (d) => typeof d === "string" && ISO.test(d);
const tageZwischen = (a, b) => Math.round((Date.parse(b + "T12:00:00") - Date.parse(a + "T12:00:00")) / 86400e3);

// ---------- Zeitraum ----------
// wahl = { art: "woche" | "monat" | "frei", von?, bis? }. Woche = die letzten 7 Geschäftstage bis heute, Monat = 1. bis heute,
// frei = von–bis (verdreht wird geordnet, Zukunft bis heute gekappt). vorher = gleich langer Zeitraum unmittelbar davor.
export function eigentuemerZeitraum(wahl = { art: "woche" }, H = heuteGeschaeft()) {
  let art = EIG_ZEITRAEUME.includes(wahl?.art) ? wahl.art : "woche";
  let von, bis = H;
  if (art === "woche") von = tagPlus(H, -6);
  else if (art === "monat") von = H.slice(0, 8) + "01";
  else {
    von = gueltig(wahl.von) ? wahl.von : H.slice(0, 8) + "01"; bis = gueltig(wahl.bis) ? wahl.bis : H;
    if (von > bis) [von, bis] = [bis, von];
    if (bis > H) bis = H; if (von > H) von = H;
  }
  const tage = tageZwischen(von, bis) + 1;
  return { art, von, bis, tage, vorher: { von: tagPlus(von, -tage), bis: tagPlus(von, -1), tage } };
}

// ---------- je Laden ----------
// Öffnungstage im Zeitraum (gewichtet wie im Zähler: Ruhetage 0, sonst tageProWoche/7) – gerundet, mindestens 1 bei Tagen ≥ 1
function erwarteteTage(stand, z) {
  let g = 0; for (let d = z.von; d <= z.bis; d = tagPlus(d, 1)) g += tagGewicht(stand, d);
  return Math.max(1, Math.round(g));
}
// Umsatz im Zeitraum mit Herkunft: die Tagesnotiz (vom Wirt getippt) ist die Zahl, mit der die App rechnet. Daneben zählt, an wie vielen
// Tagen Kassendaten (DSFinV-K/Kasse), Z-Bon oder Handeingabe als Verkauf je Gericht vorliegen – je Tag nur die beste Herkunft (verkauf.js).
function umsatzTeil(stand, z) {
  const u = umsatzZeitraum(stand, z);
  const vk = verkaeufeImZeitraum(stand, z);
  const herkunft = { notiz: u.tage, kasse: 0, zbon: 0, hand: 0 }; const jeTag = new Map();
  for (const v of vk.eintraege) jeTag.set(v.datum, v.herkunft === "dsfinvk" || v.herkunft === "kasse" ? "kasse" : v.herkunft);
  for (const h of jeTag.values()) herkunft[h] = (herkunft[h] || 0) + 1;
  let kasseUmsatz = 0, kasseTage = 0; const tageMit = new Set();
  for (const v of vk.eintraege) if (typeof v.umsatzBrutto === "number") { kasseUmsatz += v.umsatzBrutto; tageMit.add(v.datum); }
  kasseTage = tageMit.size;
  const erwartet = erwarteteTage(stand, z);
  return { summe: u.summe, tage: u.tage, erwartet, vollstaendig: u.tage >= erwartet, herkunft, kasseUmsatz: kasseTage ? kasseUmsatz : null, kasseTage,
    basis: u.tage === 0 ? "keine" : u.tage >= erwartet ? "voll" : "teil" };
}
const laufendeAktionen = (stand, H) => (stand.aktionen || []).filter((a) => !a.entfernt && a.von <= H && (!a.bis || a.bis >= H)).length;

// Die Kennzahlen eines Ladens für einen Zeitraum. H = Geschäftstag, K = Kalendertag (Kühlung, Putzen, Belehrungen zählen nach dem Kalender).
export function ladenKennzahlen(stand, z, { H = heuteGeschaeft(), K = heute(), nr = 1 } = {}) {
  const name = stand.betrieb?.name || t("eigentuemer.ladenNr", nr);
  const eingerichtet = stand.phase === "app";
  const fehlt = [];
  const umsatz = umsatzTeil(stand, z);
  if (!umsatz.tage) fehlt.push("umsatz"); else if (!umsatz.vollstaendig) fehlt.push("umsatzTage");
  // Wareneinsatz: die Quote des Monats, in dem der Zeitraum endet (Belege, Karte, eigener Wert oder Richtwert) – wie im Zähler, keine zweite Rechnung
  const zl = imTakt(stand, "eig:zaehler:" + z.bis, () => zaehler(stand, { datum: z.bis }));
  const q = wareneinsatzQuote(stand, zl);
  const ware = { quote: q.quote, quelle: q.quelle, geschaetzt: !!q.geschaetzt, richtpreis: !!q.richtpreis, unplausibel: !!q.unplausibel, basis: q.quote === null ? "keine" : q.quelle === "richtwert" ? "richtwert" : q.quelle === "belege" ? "belege" : "karte" };
  if (ware.richtpreis) fehlt.push("richtpreise"); if (ware.quelle === "richtwert") fehlt.push("richtwert");
  const sw = schwundAuswertung(stand, z);
  const muell = { wert: sw.muellwert, portionen: sw.portionen, ohneWert: sw.ohneWert, anzahl: sw.anzahl, geschaetzt: sw.portionen !== null && !!zl.quoteGeschaetzt,
    anteil: umsatz.summe > 0 ? sw.muellwert / umsatz.summe : null, basis: sw.anzahl === 0 ? "keine" : umsatz.summe <= 0 ? "ohneUmsatz" : sw.ohneWert ? "teil" : "voll" };
  if (muell.ohneWert) fehlt.push("muellOhneWert");
  const personal = { anzahl: sw.personal.anzahl, svev: sw.personal.svev, waren: sw.personal.waren };
  // Schwund-Verdacht: nur zwischen zwei abgeschlossenen Inventuren (verkauf.js), der Zeitraum steht dabei
  const ab = imTakt(stand, "eig:abgleich", () => abgleichInventur(stand));
  const schwund = ab && !ab.gleicherTag ? { anzahl: ab.schwund.anzahl, wert: ab.schwund.wert, ohneWert: ab.schwund.ohneWert, geschaetzt: ab.schwund.geschaetzt, von: ab.von, bis: ab.bis, tageOhneVerkauf: ab.tageOhneVerkauf.length } : null;
  const vkTage = umsatz.herkunft.kasse + umsatz.herkunft.zbon + umsatz.herkunft.hand;
  if (!vkTage) fehlt.push("verkaeufe");
  // Pflichten aus dem Amt-Ordner für den Zeitraum
  const o = imTakt(stand, "eig:amt:" + z.von + z.bis, () => ordnerAmt(stand, { art: "frei", von: z.von, bis: z.bis }, { datum: K }));
  const k = o.teile.kuehl, p = o.teile.putz, b = o.teile.belehrung;
  const pflichten = { kuehlEingerichtet: k.stellen > 0, kuehlFehlt: k.luecken.length, kuehlOffen: k.offen, putzAktiv: p.aktiv, putzFehlt: p.luecken.length,
    belehrungFaellig: b.zaehl.ueberfaellig + b.zaehl.fehlt, belehrungBald: b.zaehl.bald, personen: b.zeilen.length };
  pflichten.offen = pflichten.kuehlFehlt + pflichten.kuehlOffen + pflichten.putzFehlt + pflichten.belehrungFaellig;
  pflichten.basis = pflichten.kuehlEingerichtet || pflichten.putzAktiv || pflichten.personen ? "voll" : "keine";
  if (pflichten.basis === "keine") fehlt.push("pflichten");
  // Bis null: der Zähler des laufenden Monats (Stand heute)
  const zh = z.bis === H ? zl : imTakt(stand, "eig:zaehler:" + H, () => zaehler(stand, { datum: H }));
  const bisNull = { stand: zh.stand, imPlus: zh.imPlus, keinUmsatz: zh.keinUmsatz, geschaetzt: zh.geschaetzt, kostenOffen: zh.unvollstaendig, nullTag: zh.nullTag, stufe: zh.stufe,
    basis: zh.keinUmsatz ? "keine" : zh.unvollstaendig ? "teil" : "voll" };
  if (zh.unvollstaendig) fehlt.push("kosten");
  // Lager und Bestellbedarf (bestand.js)
  const bs = bestandStand(stand, { heuteTag: H });
  let lager;
  if (bs.ohneInventur) { lager = { ohneInventur: true, wert: null, geschaetzt: false, ohnePreis: 0, inventur: null, alter: null, bestellenJetzt: 0, bestellenMorgen: 0, basis: "keine" }; fehlt.push("inventur"); }
  else {
    const v = bestellVorschlag(stand, { heuteTag: H, bs });
    const mitWert = bs.waren.filter((w) => w.wert !== null);
    lager = { ohneInventur: false, wert: mitWert.reduce((s, w) => s + w.wert, 0), geschaetzt: mitWert.some((w) => w.geschaetzt), ohnePreis: bs.waren.length - mitWert.length,
      inventur: bs.inventur.datum, alter: bs.inventur.alter, bestellenJetzt: v.zeilen.filter((x) => x.dringend === "jetzt" || x.dringend === "leer").length,
      bestellenMorgen: v.zeilen.filter((x) => x.dringend === "morgen").length, basis: bs.waren.length - mitWert.length ? "teil" : "voll" };
  }
  const aktionen = { laufend: laufendeAktionen(stand, H), satz: imTakt(stand, "eig:aktion:" + H, () => aktionUhrzeit(stand, { heuteTag: H }))?.text || null };
  return { id: stand.id, name, beispiel: !!stand.beispiel, eingerichtet, umsatz, ware, muell, personal, schwund, pflichten, bisNull, lager, aktionen, fehlt, vollstaendig: fehlt.length === 0 };
}

// Die leichten Zahlen eines Zeitraums (für den Trend gegen den Vorzeitraum)
function zeitraumZahlen(stand, z) {
  const u = umsatzZeitraum(stand, z); const sw = schwundAuswertung(stand, z);
  return { umsatz: u.summe, umsatzTage: u.tage, muell: sw.muellwert, muellAnzahl: sw.anzahl, personal: sw.personal.anzahl };
}
const trendVon = (jetzt, vorher, vorherDa) => {
  if (!vorherDa) return { vorher: null, aenderung: null, richtung: null };
  if (!(vorher > 0)) return { vorher, aenderung: null, richtung: jetzt > 0 ? "hoch" : "gleich" };
  const a = (jetzt - vorher) / vorher;
  return { vorher, aenderung: a, richtung: Math.abs(a) < 0.02 ? "gleich" : a > 0 ? "hoch" : "runter" };
};
export function ladenTrend(stand, z) {
  const j = zeitraumZahlen(stand, z), v = zeitraumZahlen(stand, z.vorher);
  return { umsatz: trendVon(j.umsatz, v.umsatz, v.umsatzTage > 0 && j.umsatzTage > 0), muell: trendVon(j.muell, v.muell, v.muellAnzahl > 0 || j.muellAnzahl > 0), personal: trendVon(j.personal, v.personal, v.personal > 0 || j.personal > 0) };
}

// ---------- welche Läden ----------
const hatDaten = (s) => !!((s.tagesnotizen || []).some((n) => !n.storniert && typeof n.umsatz === "number") || (s.schwund || []).some((e) => !e.storniert) || (s.verkaeufe || []).some((v) => !v.storniert) || (s.messungen || []).length || (s.lieferungen || []).some((l) => !l.storniert));
// Gezeigt werden die eingerichteten eigenen Läden. Der Beispiel-Laden nur, wenn kein eigener Laden Daten hat (dann mit Kennzeichnung).
export function eigentuemerLaeden(wurzel) {
  const alle = wurzel?.betriebe || [];
  const eigene = alle.filter((b) => !b.beispiel && b.phase === "app");
  const beispiel = alle.find((b) => b.beispiel && b.phase === "app") || null;
  const beispielZeigen = !!beispiel && !eigene.some(hatDaten);
  return { laeden: beispielZeigen ? [beispiel, ...eigene] : eigene, beispielZeigen, uebrige: alle.filter((b) => !(beispielZeigen ? [beispiel, ...eigene] : eigene).includes(b)) };
}

// ---------- Vergleich ----------
// Je Kennzahl: Wert, Datenbasis und Richtung (hoch = besser). Rang nur innerhalb der größten Gruppe gleicher Datenbasis (mindestens zwei Läden);
// Läden außerhalb bekommen rang null und einen Grund. Abstand = Wert − bester Wert (Umsatz/Bis null in €, Ware/Müll in Prozentpunkten, Pflichten als Zahl).
const WERT = {
  umsatz: { von: (l) => l.umsatz.summe, basis: (l) => l.umsatz.basis, hoch: true, ordnung: ["voll", "teil"], einheit: "euro" },
  ware: { von: (l) => l.ware.quote, basis: (l) => (l.ware.unplausibel ? "unplausibel" : l.ware.basis), hoch: false, ordnung: ["belege", "karte"], einheit: "punkte" },
  muell: { von: (l) => l.muell.anteil, basis: (l) => l.muell.basis, hoch: false, ordnung: ["voll", "teil"], einheit: "punkte" },
  pflichten: { von: (l) => l.pflichten.offen, basis: (l) => l.pflichten.basis, hoch: false, ordnung: ["voll"], einheit: "zahl" },
  bisNull: { von: (l) => l.bisNull.stand, basis: (l) => l.bisNull.basis, hoch: true, ordnung: ["voll", "teil"], einheit: "euro" },
};
export function eigentuemerVergleich(laeden) {
  const out = {};
  for (const kz of KENNZAHLEN) {
    const w = WERT[kz]; const je = {};
    const gruppen = new Map();
    for (const l of laeden) { const b = w.basis(l); const v = w.von(l); je[l.id] = { wert: v, basis: b, rang: null, abstand: null, grund: null }; if (w.ordnung.includes(b) && typeof v === "number") (gruppen.get(b) || gruppen.set(b, []).get(b)).push(l); }
    let basis = null, gruppe = [];
    for (const b of w.ordnung) { const g = gruppen.get(b) || []; if (g.length > gruppe.length) { basis = b; gruppe = g; } }
    const vergleichbar = gruppe.length >= 2;
    if (vergleichbar) {
      const sortiert = gruppe.slice().sort((a, b) => (w.hoch ? w.von(b) - w.von(a) : w.von(a) - w.von(b)));
      const bester = w.von(sortiert[0]);
      let rang = 0, vorher = null;
      sortiert.forEach((l, i) => { const v = w.von(l); if (v !== vorher) { rang = i + 1; vorher = v; } je[l.id].rang = rang; je[l.id].abstand = w.einheit === "punkte" ? (v - bester) * 100 : v - bester; });
    }
    for (const l of laeden) if (je[l.id].rang === null) je[l.id].grund = typeof w.von(l) !== "number" || !w.ordnung.includes(w.basis(l)) ? "fehlt" : vergleichbar ? "andereBasis" : "zuWenig";
    out[kz] = { je, vergleichbar, basis, anzahl: gruppe.length, bester: vergleichbar ? gruppe.slice().sort((a, b) => (w.hoch ? w.von(b) - w.von(a) : w.von(a) - w.von(b)))[0].id : null, einheit: w.einheit };
  }
  return out;
}

// ---------- die Übersicht ----------
export function eigentuemerUebersicht(wurzel, wahl = { art: "woche" }, { H = heuteGeschaeft(), K = heute() } = {}) {
  const z = eigentuemerZeitraum(wahl, H);
  const { laeden: liste, beispielZeigen, uebrige } = eigentuemerLaeden(wurzel);
  const laeden = liste.map((s, i) => ({ ...ladenKennzahlen(s, z, { H, K, nr: i + 1 }), trend: ladenTrend(s, z) }));
  const vergleich = eigentuemerVergleich(laeden);
  const mitUmsatz = laeden.filter((l) => !l.beispiel && l.umsatz.tage > 0);
  const summe = { umsatz: mitUmsatz.reduce((s, l) => s + l.umsatz.summe, 0), umsatzLaeden: mitUmsatz.length, muell: laeden.filter((l) => !l.beispiel).reduce((s, l) => s + l.muell.wert, 0),
    pflichten: laeden.filter((l) => !l.beispiel).reduce((s, l) => s + l.pflichten.offen, 0), laeden: laeden.filter((l) => !l.beispiel).length };
  return { zeitraum: z, laeden, vergleich, summe, beispielZeigen, uebrige: uebrige.map((b) => b.id), satz: satzAus(laeden, vergleich) };
}

// ---------- die Uhrzeit: höchstens ein Satz ----------
// Reihenfolge: Pflichten (Belehrung fällig → Kühl-Abweichung offen → Kühlrundgänge fehlen → Putztage fehlen) vor Geld (Wareneinsatz über
// dem besten Laden → im Minus bis null → Umsatz-Tage fehlen) vor Lager (heute bestellen → keine Inventur). Sonst „nichts offen“.
const maxVon = (liste, f) => liste.reduce((best, l) => (f(l) > (best ? f(best) : 0) ? l : best), null);
const minVon = (liste, f) => liste.reduce((best, l) => (best === null || f(l) < f(best) ? l : best), null);
function satzAus(laeden, vergleich) {
  if (!laeden.length) return null;
  const satz = (art, ton, text, l) => ({ id: "eigentuemer", art, ton, text, laden: l?.id || null, ziel: l ? { aktion: "laden-wechseln", id: l.id } : null });
  let l;
  if ((l = maxVon(laeden, (x) => x.pflichten.belehrungFaellig))) return satz("belehrung", "rot", t("eigentuemer.satz.belehrung", l.name, l.pflichten.belehrungFaellig), l);
  if ((l = maxVon(laeden, (x) => x.pflichten.kuehlOffen))) return satz("kuehlAbw", "rot", t("eigentuemer.satz.kuehlAbw", l.name, l.pflichten.kuehlOffen), l);
  if ((l = maxVon(laeden, (x) => x.pflichten.kuehlFehlt))) return satz("kuehl", "rot", t("eigentuemer.satz.kuehl", l.name, l.pflichten.kuehlFehlt), l);
  if ((l = maxVon(laeden, (x) => x.pflichten.putzFehlt))) return satz("putz", "gelb", t("eigentuemer.satz.putz", l.name, l.pflichten.putzFehlt), l);
  const vw = vergleich.ware;
  if (vw.vergleichbar) { const schlecht = laeden.filter((x) => vw.je[x.id].rang !== null && vw.je[x.id].abstand >= WARE_PUNKTE_SATZ).sort((a, b) => vw.je[b.id].abstand - vw.je[a.id].abstand)[0];
    if (schlecht) { const best = laeden.find((x) => x.id === vw.bester); return satz("ware", "gelb", t("eigentuemer.satz.wareUeber", schlecht.name, fmtZahl(vw.je[schlecht.id].abstand, 0), best.name) + (schlecht.ware.geschaetzt || best.ware.geschaetzt ? " ≈" : ""), schlecht); } }
  if ((l = minVon(laeden.filter((x) => !x.bisNull.keinUmsatz && x.bisNull.stand < 0), (x) => x.bisNull.stand))) return satz("minus", "gelb", t("eigentuemer.satz.minus", l.name, (l.bisNull.geschaetzt ? "≈ " : "") + fmtEuro(-l.bisNull.stand)), l);
  if ((l = maxVon(laeden.filter((x) => x.umsatz.tage > 0), (x) => x.umsatz.erwartet - x.umsatz.tage))) return satz("umsatzFehlt", "gelb", t("eigentuemer.satz.umsatzFehlt", l.name, l.umsatz.erwartet - l.umsatz.tage), l);
  if ((l = maxVon(laeden, (x) => x.lager.bestellenJetzt))) return satz("bestellen", "gelb", t("eigentuemer.satz.bestellen", l.name, l.lager.bestellenJetzt), l);
  if ((l = laeden.find((x) => x.lager.ohneInventur && x.umsatz.tage > 0))) return satz("inventur", "gelb", t("eigentuemer.satz.inventurFehlt", l.name), l);
  if ((l = maxVon(laeden, (x) => (x.umsatz.tage === 0 ? 1 : 0)))) return satz("umsatzKeiner", "gelb", t("eigentuemer.satz.umsatzKeiner", l.name), l);
  return satz("gut", "gruen", t("eigentuemer.satz.gut"), null);
}
export function eigentuemerUhrzeit(wurzel, wahl = { art: "woche" }, opt = {}) { return eigentuemerUebersicht(wurzel, wahl, opt).satz; }

// ---------- Texte für Anzeige und Export ----------
const euro = (n) => fmtEuro(n, { dezimal: 2 });
const prozent = (q) => `${fmtZahl(q * 100, 0)} %`;
const ca = (geschaetzt, text) => (geschaetzt ? `≈ ${text}` : text);
const FEHLT = () => t("eigentuemer.fehlt");
// Fertige Zellen je Laden (dieselben in Karte, Druck und CSV)
export function ladenZellen(l) {
  const u = l.umsatz, w = l.ware, m = l.muell, s = l.schwund, p = l.pflichten, n = l.bisNull, g = l.lager;
  const quelle = [u.herkunft.notiz ? t("eigentuemer.quelle.notiz") : "", u.herkunft.kasse ? t("eigentuemer.quelle.kasse") : "", u.herkunft.zbon ? t("eigentuemer.quelle.zbon") : "", u.herkunft.hand ? t("eigentuemer.quelle.hand") : ""].filter(Boolean).join(", ");
  const pfl = [p.belehrungFaellig ? t("eigentuemer.pflicht.belehrung", p.belehrungFaellig) : "", p.kuehlOffen ? t("eigentuemer.pflicht.kuehlAbw", p.kuehlOffen) : "", p.kuehlFehlt ? t("eigentuemer.pflicht.kuehl", p.kuehlFehlt) : "", p.putzFehlt ? t("eigentuemer.pflicht.putz", p.putzFehlt) : ""].filter(Boolean);
  return {
    umsatz: u.tage ? euro(u.summe) : FEHLT(),
    umsatzTage: t("eigentuemer.umsatzTage", u.tage, u.erwartet) + (quelle ? ` · ${quelle}` : ""),
    ware: w.unplausibel ? t("eigentuemer.wareUnplausibel") : w.quote === null ? FEHLT() : ca(w.geschaetzt, prozent(w.quote)),
    wareQuelle: w.quote === null ? "" : t("eigentuemer.wareQuelle." + (w.quelle === "belege" ? "belege" : w.quelle === "richtwert" ? "richtwert" : w.quelle === "eigen" ? "eigen" : "karte")),
    muell: m.anzahl ? euro(m.wert) + (m.ohneWert ? ` (${t("listen.ohneWert", m.ohneWert)})` : "") : FEHLT(),
    muellPortionen: m.portionen === null || !m.anzahl ? "" : t("eigentuemer.portionen", fmtZahl(m.portionen, m.portionen < 10 ? 1 : 0)),
    schwund: !s ? t("eigentuemer.schwundKeine") : !s.anzahl ? t("eigentuemer.schwundNichts") : ca(s.geschaetzt, euro(s.wert)) + (s.ohneWert ? ` (${t("listen.ohneWert", s.ohneWert)})` : ""),
    schwundZeitraum: s ? t("eigentuemer.schwundZeitraum", datumDe(s.von), datumDe(s.bis)) : "",
    personal: l.personal.anzahl ? `${fmtZahl(l.personal.anzahl)} · ${euro(l.personal.svev)}` : "–",
    pflichten: p.basis === "keine" ? t("eigentuemer.pflicht.keineDaten") : pfl.length ? pfl.join(" · ") : t("eigentuemer.pflicht.keine"),
    pflichtenZahl: p.basis === "keine" ? FEHLT() : String(p.offen),
    bisNull: n.keinUmsatz ? FEHLT() : ca(n.geschaetzt, (n.stand >= 0 ? "+ " : "− ") + fmtEuro(Math.abs(n.stand))),
    lager: g.ohneInventur ? t("eigentuemer.keineInventur") : ca(g.geschaetzt, euro(g.wert)) + (g.ohnePreis ? ` (${t("eigentuemer.ohnePreis", g.ohnePreis)})` : ""),
    bestellen: g.ohneInventur ? "" : g.bestellenJetzt ? t("eigentuemer.bestellen.jetzt", g.bestellenJetzt) : g.bestellenMorgen ? t("eigentuemer.bestellen.morgen", g.bestellenMorgen) : t("eigentuemer.bestellen.keine"),
    aktionen: l.aktionen.laufend ? t("eigentuemer.aktionenLaufend", l.aktionen.laufend) : t("eigentuemer.aktionenKeine"),
    fehlt: l.fehlt.length ? t("eigentuemer.unvollstaendig", l.fehlt.map((f) => t("eigentuemer.fehltWas." + f)).join(", ")) : "",
  };
}
export function trendText(tr) {
  if (!tr || tr.richtung === null) return t("eigentuemer.trend.keine");
  if (tr.richtung === "gleich") return t("eigentuemer.trend.gleich");
  if (tr.aenderung === null) return t("eigentuemer.trend." + tr.richtung + "Neu");
  return t("eigentuemer.trend." + tr.richtung, fmtZahl(Math.abs(tr.aenderung) * 100, 0));
}
export function rangText(v, kz, id) {
  const e = v?.[kz]?.je?.[id]; if (!e) return "";
  if (e.rang === null) return t("eigentuemer.rang." + (e.grund || "fehlt"));
  const d = Math.abs(e.abstand); const klein = v[kz].einheit === "euro" ? d < 0.005 : v[kz].einheit === "punkte" ? d < 0.05 : d < 1; // gerundet null = kein Abstand
  const ab = klein ? "" : v[kz].einheit === "euro" ? euro(d) : v[kz].einheit === "punkte" ? t("eigentuemer.punkte", fmtZahl(d, d < 1 ? 1 : 0)) : fmtZahl(d);
  return t("eigentuemer.rang.platz", e.rang, v[kz].anzahl) + (ab ? ` · ${t("eigentuemer.rang.abstand", ab)}` : "");
}

// ---------- Export: Druck (wie die Ordner) und CSV ----------
// Nichts Vertrauliches über die Läden hinaus: keine Büro-Codes, keine Lieferanten-Nummern, keine Kontakte – nur Kennzahlen je Laden.
export function eigentuemerDokument(ue) {
  const z = ue.zeitraum; const zr = `${datumDe(z.von)} – ${datumDe(z.bis)}`;
  const name = (l) => l.name + (l.beispiel ? ` (${t("eigentuemer.beispiel")})` : "");
  const v = ue.vergleich;
  return {
    titel: t("eigentuemer.bericht"), laden: t("eigentuemer.laedenAnzahl", ue.laeden.length), beispiel: ue.beispielZeigen ? t("beispiel.export") : null, zeitraum: zr,
    erstellt: t("ordner.dok.erstellt", datumDe(heute()), new Date().toTimeString().slice(0, 5)), sprache: sprache(), seite: t("amtW2.seite"),
    abschnitte: [
      { titel: t("eigentuemer.dok.zahlen"), info: t("eigentuemer.dok.hinweis"), kopf: t("eigentuemer.dok.kopf"), rechts: [1, 2, 3, 4, 6, 7],
        zeilen: ue.laeden.map((l) => { const c = ladenZellen(l); return { warn: !l.vollstaendig, zellen: [name(l), c.umsatz, c.ware, c.muell, c.schwund, c.pflichtenZahl, c.bisNull, c.lager, c.bestellen || "–"] }; }), leer: t("eigentuemer.keineLaeden") },
      { titel: t("eigentuemer.dok.vergleich"), info: t("eigentuemer.dok.vergleichInfo"), kopf: [t("eigentuemer.dok.laden"), ...KENNZAHLEN.map((k) => t("eigentuemer.kennzahl." + k))],
        zeilen: ue.laeden.map((l) => [name(l), ...KENNZAHLEN.map((k) => rangText(v, k, l.id))]), leer: t("eigentuemer.vergleichAb") },
      { titel: t("eigentuemer.dok.trend"), kopf: [t("eigentuemer.dok.laden"), t("eigentuemer.kennzahl.umsatz"), t("eigentuemer.kennzahl.muell"), t("eigentuemer.kennzahl.personal")],
        zeilen: ue.laeden.map((l) => [name(l), trendText(l.trend?.umsatz), trendText(l.trend?.muell), trendText(l.trend?.personal)]), leer: t("eigentuemer.keineLaeden") },
      { titel: t("eigentuemer.dok.daten"), kopf: [t("eigentuemer.dok.laden"), t("eigentuemer.kennzahl.umsatz"), t("eigentuemer.kennzahl.ware"), t("eigentuemer.kennzahl.pflichten"), t("eigentuemer.dok.fehlt")],
        zeilen: ue.laeden.map((l) => { const c = ladenZellen(l); return { warn: !l.vollstaendig, zellen: [name(l), c.umsatzTage, c.wareQuelle, c.pflichten, c.fehlt || t("eigentuemer.vollstaendig")] }; }), leer: t("eigentuemer.keineLaeden") },
    ],
    fuss: t("eigentuemer.dok.fuss"),
  };
}
export function eigentuemerHtml(ue) { return druckHtml(eigentuemerDokument(ue)); }
export function eigentuemerCsv(ue) {
  const z = ue.zeitraum;
  const kopf = [...t("eigentuemer.dok.kopf"), `${t("eigentuemer.kennzahl.umsatz")} (${t("eigentuemer.dok.tage")})`, t("eigentuemer.dok.quelle"), t("eigentuemer.kennzahl.personal"), t("eigentuemer.kennzahl.aktionen"), t("eigentuemer.dok.fehlt")];
  const zeilen = ue.laeden.map((l) => { const c = ladenZellen(l); return [l.name + (l.beispiel ? ` (${t("eigentuemer.beispiel")})` : ""), c.umsatz, c.ware, c.muell, c.schwund, c.pflichtenZahl, c.bisNull, c.lager, c.bestellen, `${l.umsatz.tage}/${l.umsatz.erwartet}`, c.wareQuelle, c.personal, c.aktionen, c.fehlt]; });
  const text = csvText(kopf, zeilen, { dezimal: [] });
  const bom = text.startsWith("﻿") ? "﻿" : "";
  return { name: `${t("eigentuemer.datei")}_${z.von}_${z.bis}.csv`, text: `${bom}${t("eigentuemer.bericht")} ${datumDe(z.von)} – ${datumDe(z.bis)}${ue.beispielZeigen ? ` · ${t("beispiel.export")}` : ""}\r\n${bom ? text.slice(1) : text}` };
}
