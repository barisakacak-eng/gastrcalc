// Trennung 2 (17.10.2026): die drei Ordner als Daten – Kachelstand, Zeilen-Texte, Hinweis, Druckmodelle (amtDokument, paketDokument) und CSV-Dateien.
// Rechnet nur aus js/export_amt.js und js/export_steuer.js, kein HTML außer dem fertigen Druckdokument (druckHtml). Sprache aus i18n.js.
// Vorher in js/screens/ordner.js; der Bildschirm behält Aufbau, Zeitraum-Wahl, Drucken und Teilen.
import { t, sprache } from "./i18n.js";
import { fmtEuro, fmtZahl, heute } from "./util.js";
import { ordnerAmt, amtCsv, druckHtml, zeitraumFuer, AMT_TEILE } from "./export_amt.js";
import { monatsPaket, teilCsv, monatVon, monatPlus, datumDe, zeitDe } from "./export_steuer.js";
import de from "./lang/de.js"; // W2-T: feste deutsche Kennzeichnung der Umsatz-Notizen in jeder App-Sprache
import { imTakt } from "./takt.js";
import { monatName } from "./anzeige_text.js";

// Beispiel-Laden (17.10.2026): Kennzeichnung in Druck- und CSV-Kopf (null = echter Laden) – immer auch deutsch, wie die Umsatz-Kennung
export const beispielKopf = (stand) => (stand?.beispiel ? de.beispiel.export + (sprache() !== "de" ? ` / ${t("beispiel.export")}` : "") : null);
const mitBeispiel = (stand, text) => (stand?.beispiel && text.startsWith("\ufeff") ? `\ufeff${beispielKopf(stand)}\r\n${text.slice(1)}` : text);
export const monatLang = (iso) => `${monatName(iso)} ${iso.slice(0, 4)}`;
const datum = (iso) => (iso ? datumDe(iso) : "–");
const euro = (n) => fmtEuro(n, { dezimal: 2 });
const grad = (n) => (typeof n === "number" ? `${fmtZahl(n, 1)} °C` : "–");
const aufgabeText = (a) => (a?.text ? a.text[sprache()] || a.text.de : a?.aufgabe || "?");
const monatKurz = (iso) => new Date(iso + "T12:00:00").toLocaleDateString(sprache() === "de" ? "de-DE" : sprache() === "tr" ? "tr-TR" : sprache() === "en" ? "en-GB" : sprache(), { month: "short", year: "numeric" });


// Zeitraum des Amt-Ordners aus der Wahl { art: "monat"|"quartal"|"frei", von, bis }
export function amtZeitraumVon(amtZeit = { art: "monat", von: null, bis: null }, H = heute()) { return zeitraumFuer(amtZeit.art, { datum: H, von: amtZeit.von, bis: amtZeit.bis }); }
export function zeitraumText(z) {
  if (z.art === "monat") return monatLang(z.von);
  if (z.art === "quartal") return t("ordner.zeit.quartalLang", z.quartal, z.von.slice(0, 4));
  return `${datumDe(z.von)} – ${datumDe(z.bis)}`;
}
// Monat des Steuer-/Buchhalter-Pakets: gewählter Monat ("JJJJ-MM") oder der Vormonat
export const paketZeitVon = (paketMonat = {}, art, H = heute()) => monatVon((paketMonat?.[art] || monatPlus(H.slice(0, 7), -1)) + "-01");


// ---------- Kachelstand für die Büro-Startseite ----------
export function ordnerKachelStand(stand, { datum: H = heute() } = {}) {
  const a = ordnerAmt(stand, zeitraumFuer("monat", { datum: H }), { datum: H });
  const vm = monatVon(monatPlus(H.slice(0, 7), -1) + "-01");
  const s = imTakt(stand, "paket:steuer:" + vm.von, () => monatsPaket(stand, vm, "steuer")); const b = imTakt(stand, "paket:buch:" + vm.von, () => monatsPaket(stand, vm, "buch")); // W2-T-Regeln, je Bild einmal gerechnet
  return {
    amt: { farbe: a.vollstaendig === a.gesamt ? "gruen" : a.vollstaendig ? "gelb" : "rot", text: t("ordner.kachelVon", a.vollstaendig, a.gesamt) },
    // W2-T: grün nur durch Belege, Kosten und Listen – getippte Umsätze machen keinen Ordner fertig (Prüfung p04 Nr. 2)
    steuer: { farbe: s.vollstaendig === s.pruefTeile.length ? "gruen" : s.vollstaendig || s.umsatz.tage ? "gelb" : "grau", text: monatName(vm.von) },
    buch: { farbe: b.vollstaendig === b.pruefTeile.length ? "gruen" : b.vollstaendig || b.umsatz.tage ? "gelb" : "grau",
      text: b.vollstaendig === b.pruefTeile.length ? t("ordner.bereit") : b.vollstaendig || b.umsatz.tage || b.belege.anzahl ? t("ordner.kachelVon", b.vollstaendig, b.pruefTeile.length) : t("ordner.leer") },
  };
}

export function amtUnter(teil, x) {
  if (teil === "kuehl") return !x.stellen ? t("ordner.zeile.kuehlKeine") : x.offen ? t("amtW2.abwOffen", x.offen) : x.lueckenAlle.length ? t("amtW2.kuehlLuecken", x.anzahl, x.lueckenAlle.length) : t("ordner.zeile.kuehl", x.anzahl, x.behoben);
  if (teil === "muell") return x.anzahl ? t("amtW2.muellZeile", x.anzahl) : t("ordner.zeile.keine");
  if (teil === "konzept") return x.geraeteliste ? t("amtW2.geraeteliste") : t("amtW2.geraetelisteFehlt"); // W2-H: kein „Konzept vollständig“
  if (teil === "putz") return !x.aktiv ? t("ordner.zeile.putzAus") : t("ordner.zeile.putz", x.tage, x.tageGesamt);
  if (teil === "belehrung") {
    if (!x.zeilen.length) return t("ordner.zeile.belehrungKeine");
    const n = x.naechste; if (!n) return t("ordner.zeile.belehrungOk", x.zeilen.length);
    return n.status === "fehlt" ? t("ordner.zeile.belehrungFehlt", n.name) : n.status === "ueberfaellig" ? t("ordner.zeile.belehrungUeber", n.name) : t("ordner.zeile.belehrungBald", n.name, monatKurz(n.faellig));
  }
  return x.vollstaendig ? t("ordner.zeile.konzept") : t("ordner.zeile.konzeptFehlt");
}
export function amtHinweis(o) {
  const b = o.teile.belehrung.zaehl;
  if (b.bald) return t("ordner.hinweis.belehrungBald", b.bald);
  if (b.ueberfaellig || b.fehlt) return t("ordner.hinweis.belehrungFehlt", b.ueberfaellig + b.fehlt);
  if (o.teile.kuehl.offen) return t("amtW2.abwOffen", o.teile.kuehl.offen);
  if (o.teile.kuehl.luecken.length) return t("ordner.hinweis.luecken", o.teile.kuehl.luecken.length);
  if (o.teile.kuehl.lueckenAlle.length) return t("amtW2.kuehlLuecken", o.teile.kuehl.anzahl, o.teile.kuehl.lueckenAlle.length);
  return o.vollstaendig === o.gesamt ? t("ordner.hinweis.fertig") : "";
}


export function paketUnter(teil, p) {
  if (teil === "umsatz") return p.umsatz.tage ? t("ordnerT.umsatzZeile", p.umsatz.tage, fmtEuro(p.umsatz.summe.brutto)) : t("ordner.zeile.umsatzKeine"); // W2-T
  if (teil === "personal") return p.personal.zeilen.length ? t("ordner.zeile.personal", fmtZahl(p.personal.anzahl), euro(p.personal.sachbezug)) + (p.personal.ohnePerson ? " · " + t("ordnerT.personalOhne", p.personal.ohnePerson) : "") : t("ordner.zeile.keine");
  if (teil === "schwund") return p.schwund.zeilen.length ? (p.schwund.ohneWert ? t("ordner.zeile.schwundOffen", euro(p.schwund.muellwert), p.schwund.ohneWert) : t("ordner.zeile.schwund", euro(p.schwund.muellwert))) : t("ordner.zeile.keine");
  if (teil === "belege") return p.belege.anzahl ? t("ordner.zeile.belege", p.belege.anzahl, fmtEuro(p.belege.netto)) : t("ordner.zeile.belegeKeine");
  if (teil === "inventur") { const l = p.inventur.zeilen.filter((x) => !x.vorher).pop(); if (!l) return t("ordner.zeile.inventurKeine"); // W2-T: 0 € oder ohne Preis = prüfen
    return `${datumDe(l.datum)} · ${l.wert === null ? t("ordnerT.wertFehlt") : euro(l.wert)}${l.ohnePreis ? " · " + t("ordnerT.inventurPruefen", l.ohnePreis) : !(l.wert > 0) && l.wert !== null ? " · " + t("ordnerT.status.pruefen") : ""}`; }
  if (teil === "reinigung") return p.reinigung.zeilen.length ? t("ordner.zeile.reinigung", euro(p.reinigung.netto)) : t("ordner.zeile.keine");
  if (teil === "kosten") return p.kosten.zeilen.length ? t("ordnerT.kostenZeile", p.kosten.zeilen.length) : t("ordner.zeile.kostenKeine"); // W2-T: ohne eigenen Lohn
  return "";
}

// ---------- Dokumente (übersetzt) ----------
const NAMEN = () => ({ kleinbetrag: () => t("ordnerC.kleinbetrag"), nachgetragen: (d) => t("ordnerC.nachgetragen", d),
  ja: () => t("allgemein.ja"),
  grund: (g) => (!g ? "" : GRUENDE.includes(g) ? t("amtW2.nichtGemessen", t("kuehl.gruende." + g)) : t("ordner.dok.nichtGemessen")),
  massnahme: (m) => t("kuehl.massnahmen." + m),
  nachkontrolle: (x) => nkText(typeof x === "string" ? { nachkontrolle: x, nkStunden: null } : x),
  ausgeschieden: (k) => t("amtW2.ausgeschieden", k),
  ausgeschiedenAm: (k, d) => t("amtW2.ausgeschiedenAm", k, datumDe(d)), // Kürzel ausgeschiedener Mitarbeiter (18.10.2026)
  abwStatus: (s) => t("amtW2.abw." + s),
  bereich: (b) => t("amtW2.bereich." + b),
  rueckText: (x) => rueckText(x),
  aufgabe: (x) => aufgabeText(x),
  status: (s) => t("ordner.belehrung.status." + s),
  kuehlart: (a) => t("kuehl.arten." + a),
  art: (a) => t("tag.arten." + a),
  mahlzeit: (m) => t("tag.mahlzeiten." + m),
  stelle: (s) => { if (s === "ware") return t("ordner.dok.ware"); const v = t("kosten.posten." + s); return Array.isArray(v) ? v[0] : s; },
  posten: (s) => { if (s === "lohn") return t("ordnerT.lohn"); const v = t("kosten.posten." + s); return Array.isArray(v) ? v[0] : s; },
  periode: (p) => t(p === "jahr" ? "allgemein.proJahr" : "allgemein.proMonat"),
  basis: (b) => (b === "lohn" ? t("ordnerT.basisLohn") : t("ordner.dok.basis." + (b === "brutto" ? "brutto" : "netto"))),
  // W2-T
  kennung: () => kennung(),
  hinweis: (h) => t("ordnerT.hinweis." + h),
  pstatus: (s) => (s === "geschaetzt" ? t("ordnerT.statusPosten.geschaetzt") : t("ordnerT.statusPosten.bekannt")),
  aart: (a) => t("ordnerT.aart." + a),
  vorgang: (v) => t("ordnerT.vorgang." + v),
});
// Feste Kennzeichnung der Umsatz-Notizen (W2-T): in der App-Sprache, und für den deutschen Steuerberater immer auch auf Deutsch
const kennung = () => (sprache() === "de" ? t("ordnerT.kennung") : `${t("ordnerT.kennung")} / ${de.ordnerT.kennung}`);
// W2-H: Texte für Nachkontrolle mit Zeitfenster, Rücknahmen und Kopfzeilen der neuen Teile
const GRUENDE = ["geschlossen", "geraetAus", "leer"];
const nkText = (x) => x.nachkontrolle === "verspaetet" ? (x.nkStunden ? t("amtW2.nkVerspaetet", x.nkStunden) : t("amtW2.nkVerspaetetKurz")) : t("ordner.dok.nk." + x.nachkontrolle);
const stempelText = (iso) => { const d = new Date(iso); return Number.isNaN(d.getTime()) ? "" : `${datumDe(heute(d))} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`; };
const tageText = (l) => (l?.length ? [1, 2, 3, 4, 5, 6, 0].filter((d) => l.includes(d)).map((d) => t("kuehl.tage." + d)).join(", ") : t("amtW2.keine"));
function rueckText(x) {
  if (x.bereich === "kuehl") return t("amtW2.rueck.kuehl", x.stelle, typeof x.wert === "number" ? grad(x.wert) : t("ordner.dok.nichtGemessen"));
  if (x.bereich === "putz") return t("amtW2.rueck.putz", aufgabeText(x), datumDe(x.datum));
  if (x.bereich === "belehrung") return t("amtW2.rueck.belehrung", x.person || "?", datumDe(x.datum));
  if (x.bereich === "ruhetage") return t("amtW2.rueck.ruhetage", tageText(x.tage));
  if (x.bereich === "putzplan") return t("amtW2.rueck.putzplan", x.anzahl);
  if (x.bereich === "person") return t("amtW2.rueck.person", x.person || "?");
  return "";
}
const KOPF_W2 = { muell: () => t("amtW2.muellKopfCsv"), rueck: () => t("amtW2.rueckKopfCsv"), kuehl: () => [...t("ordner.dok.kopf.kuehl"), t("amtW2.nachgetragenAm"), t("amtW2.lfd"), t("amtW2.abwStand")] };
const kopfVon = (teil) => (KOPF_W2[teil] ? KOPF_W2[teil]() : teil === "belege" ? [t("ordnerC.belegNr"), ...t("ordnerT.kopf.belege")] : ["umsatz", "kosten", "aenderungen"].includes(teil) ? t("ordnerT.kopf." + teil) : t("ordner.dok.kopf." + teil)); // W2-H + W2-T; Paket C: Beleg-Nr.

// Paket C (19.10.2026): Was der Inhaber selbst beilegt (Originale aus Kasse, Bank, Lieferant, Amt) – je Ordner.
// Grundlage: Kanzlei-Pendelordner und Behörden-Merkblätter (Recherche 19.10.2026, Projekt-Dokument „GastroCalc Recherche 1“).
export const BEILAGEN = { steuer: ["zbon", "karten", "bank", "fapost"], buch: ["rechnungen", "ausgang", "vertraege"], amt: ["lieferscheine", "ifsg", "schaedling", "haccp"] };
// Erster Abschnitt jedes Ordners: Inhalt (was die App liefert, mit Stand) und Beilagen (was du beilegst). dok = fertiges Druckmodell.
export function inhaltAbschnitt(dok, art) {
  const zeilen = []; let nr = 0;
  for (const a of dok.abschnitte) zeilen.push({ warn: !!a.warn, zellen: [String(++nr), a.titel, t("ordnerC.app"), a.warn ? t(a.notiz ? "ordnerC.notiz" : "ordnerC.pruefen") : t("ordnerC.liegtBei")] });
  for (const b of BEILAGEN[art] || []) zeilen.push({ warn: false, zellen: [String(++nr), t("ordnerC.teile." + b), t("ordnerC.du"), t("ordnerC.beilegen")] });
  return { titel: t("ordnerC.titel"), info: art === "amt" ? "" : t("ordnerC.hinweis"), kopf: t("ordnerC.kopf"), rechts: [0], zeilen };
}
const mitInhalt = (dok, art) => ({ ...dok, abschnitte: [inhaltAbschnitt(dok, art), ...dok.abschnitte] });
const dateiTeil = (teil) => (teil === "muell" ? t("amtW2.muellDatei") : teil === "rueck" ? t("amtW2.rueckDatei") : t("ordner.datei." + teil));
const erstelltText = () => t("ordner.dok.erstellt", datumDe(heute()), new Date().toTimeString().slice(0, 5));

export function amtDokument(stand, o) {
  const n = NAMEN(); const k = o.teile.kuehl, p = o.teile.putz, b = o.teile.belehrung, c = o.teile.konzept, mu = o.teile.muell, r = o.teile.rueck;
  const nr = (i) => String(i + 1); // W2-H: laufende Nummer je Eintrag im Druck
  const wer = (x) => (x.von && x.vonAus ? (x.vonAusAm ? n.ausgeschiedenAm(x.von, x.vonAusAm) : n.ausgeschieden(x.von)) : x.von); // Kürzel ausgeschiedener Mitarbeiter (18.10.2026): mit Datum
  const grenze = (x) => (typeof x.min === "number" && typeof x.max === "number" ? `${fmtZahl(x.min, 1)} … ${fmtZahl(x.max, 1)} °C` : typeof x.max === "number" ? `≤ ${grad(x.max)}` : typeof x.min === "number" ? `≥ ${grad(x.min)}` : "–");
  const massnahme = (x) => {
    if (!x.abweichung) return "";
    const teile = [x.massnahmen.map(n.massnahme).join(", ")];
    if (x.ware && !(x.ware === "weggeworfen" && x.massnahmen.includes("weggeworfen"))) teile.push(t("amtW2.ware." + x.ware) + (x.wareGrund ? `: ${x.wareGrund}` : "")); // Trennung (17.10.2026): Begründung bei „behalten“
    if (x.nachkontrolle) teile.push(nkText(x));
    if (x.status === "massnahmeOffen") teile.push(t("amtW2.abw.massnahmeOffen"));
    if (x.status === "verspaetet" && !x.nachkontrolle) teile.push(t("amtW2.abw.verspaetet"));
    return teile.filter(Boolean).join(" · ") || t("ordner.dok.keineMassnahme");
  };
  const kuehlInfo = [amtUnter("kuehl", k), k.luecken.length ? t("ordner.dok.ohneMessung", k.luecken.map(datumDe).join(", ")) : "", k.teilweise.length ? t("amtW2.teilweise", k.teilweise.map(datumDe).join(", ")) : "",
    k.aus.length ? t("amtW2.aus", k.aus.map(datumDe).join(", ")) : "", k.nachgetragen ? t("amtW2.nachgetragenN", k.nachgetragen) : ""].filter(Boolean).join(" · ");
  const belZeilen = [...b.zeilen.map((x) => ({ warn: x.status !== "ok", zellen: [x.name, datum(x.erst), datum(x.letzte), datum(x.faellig), n.status(x.status)] })),
    ...b.ausgeschieden.map((x) => ({ klasse: "nach", zellen: [x.ausgeschieden ? t("amtW2.ausgeschiedenAm", x.name, datumDe(x.ausgeschieden)) : n.ausgeschieden(x.name), datum(x.erst), datum(x.letzte), "–", t("amtW2.statusAusgeschieden")] }))];
  return {
    titel: t("ordner.amt.titel"), laden: stand.betrieb?.name || "", beispiel: beispielKopf(stand), zeitraum: zeitraumText(o.zeitraum), erstellt: erstelltText(), sprache: sprache(), seite: t("amtW2.seite"),
    abschnitte: [
      { titel: t("ordner.teil.kuehl"), info: kuehlInfo, warn: !k.vollstaendig, kopf: [t("amtW2.spalteNr"), ...t("ordner.dok.druck.kuehl"), t("amtW2.nachgetragenAm")], rechts: [0, 4, 5],
        zeilen: k.zeilen.map((x, i) => ({ warn: x.abweichung && x.status !== "verspaetet", klasse: [x.status === "verspaetet" ? "spaet" : "", x.nacherfasst ? "nach" : ""].filter(Boolean).join(" "),
          zellen: [nr(i), datumDe(x.datum) + (x.nacherfasst ? " *" : ""), x.zeit, x.stelle, x.wert === null ? n.grund(x.grund || "x") : grad(x.wert), grenze(x), massnahme(x), wer(x), x.nacherfasst && x.erfasst ? stempelText(x.erfasst) : ""] })), leer: t("ordner.zeile.keine") },
      { titel: t("ordner.teil.putz"), info: amtUnter("putz", p) + (p.luecken.length ? ` · ${t("ordner.dok.offeneTage", p.luecken.map(datumDe).join(", "))}` : ""), warn: !p.vollstaendig, kopf: [t("amtW2.spalteNr"), ...kopfVon("putz")], rechts: [0],
        zeilen: p.eintraege.map((x, i) => [nr(i), datumDe(x.datum), x.zeit, aufgabeText(x), wer(x)]), leer: t("ordner.zeile.keine") },
      { titel: t("ordner.teil.belehrung"), info: t("ordner.belehrung.hinweis"), kopf: kopfVon("belehrung"), zeilen: belZeilen, leer: t("ordner.zeile.belehrungKeine") },
      { titel: t("amtW2.konzeptTitel"), info: [t("amtW2.keinKonzept"), c.ladenArt ? t("ordner.dok.ladenArt", t("schnell.arten." + c.ladenArt)) : "", c.geraete.length ? t("ordner.dok.geraete", c.geraete.map((g) => t("putzplan.geraete." + g)).join(", ")) : "", t("ordner.dok.takt", c.takt), c.putzplan ? t("ordner.dok.aufgaben", c.aufgaben) : t("ordner.zeile.putzAus")].filter(Boolean).join(" · "),
        kopf: kopfVon("konzept"), rechts: [2, 3], zeilen: c.kuehlstellen.map((x) => [x.name, n.kuehlart(x.art), typeof x.min === "number" ? grad(x.min) : "–", typeof x.max === "number" ? grad(x.max) : "–", x.wareOhneGrenze ? t("amtW2.wareOhneGrenze") : x.standard ? t("ordner.dok.standardGrenze") : t("ordner.dok.eigeneGrenze")]), leer: t("ordner.zeile.kuehlKeine") },
      { titel: t("amtW2.muellTitel"), info: t("amtW2.muellInfo"), kopf: t("amtW2.muellKopf"), rechts: [0, 4],
        zeilen: mu.zeilen.map((x, i) => [nr(i), datumDe(x.datum), n.art(x.art), x.name || "–", `${fmtZahl(x.menge, x.einheit === "stk" || x.einheit === "portion" ? 0 : 2)} ${x.einheit === "portion" ? t("tag.portionen") : x.einheit === "stk" ? t("allgemein.stueck") : x.einheit}`, [x.grund, x.ausKuehlung ? t("amtW2.ausKuehlung") : ""].filter(Boolean).join(" · ")]), leer: t("ordner.zeile.keine") },
      { titel: t("amtW2.rueckTitel"), kopf: t("amtW2.rueckKopf"), rechts: [0],
        zeilen: r.zeilen.map((x, i) => ({ klasse: "nach", zellen: [nr(i), x.wann ? stempelText(x.wann) : datumDe(x.datum), n.bereich(x.bereich), rueckText(x), wer(x) || "–"] })), leer: t("amtW2.rueckLeer") },
    ],
    unterschrift: t("ordner.dok.unterschrift"), fuss: t("ordner.dok.fussAmt"),
  };
}

// W2-T (Prüfung p04): Umsätze nur als Brutto-Notiz mit Kennzeichnung, keine Steuer aus dem Mischsatz; Belege mit USt je Satz und Pfand;
// Inventur ohne Haken bei 0 € oder fehlenden Preisen; feste Kosten ohne eigenen Lohn; alle Änderungen des Monats als eigener Abschnitt.
export function paketDokument(stand, p) {
  const n = NAMEN(); const a = [];
  const art = p.art; const leerOder = (v) => (v === null || v === undefined ? "–" : euro(v));
  if (p.umsatz) a.push({ titel: t("ordner.teil.umsatz"), info: `${kennung()} · ${t("ordnerT.steuerZbon")}`, warn: true, notiz: true, kopf: t("ordnerT.druck.umsatz"), rechts: [1, 2],
    zeilen: p.umsatz.zeilen.map((x) => [datumDe(x.datum) + (x.nacherfasst ? " *" : ""), euro(x.brutto), x.geaendert === null ? "" : euro(x.geaendert)]), summe: p.umsatz.tage ? [t("ordner.dok.summe"), euro(p.umsatz.summe.brutto), ""] : null, leer: t("ordner.zeile.umsatzKeine") });
  if (p.personal) { const je = Object.entries(p.personal.jePerson).map(([k, v]) => `${k || "–"}: ${fmtZahl(v.anzahl)} · ${euro(v.sachbezug)}`).join(" · ");
    a.push({ titel: t("ordner.teil.personal"), info: [t("ordner.dok.svev"), je, p.personal.ohnePerson ? t("ordnerT.personalOhne", p.personal.ohnePerson) : ""].filter(Boolean).join(" · "), warn: !!p.personal.ohnePerson, kopf: kopfVon("personal").slice(0, 7), rechts: [4, 5, 6],
      zeilen: p.personal.zeilen.map((x) => ({ warn: !x.person, zellen: [datumDe(x.datum), !x.person ? "–" : !x.personAus ? x.person : x.personAusAm ? n.ausgeschiedenAm(x.person, x.personAusAm) : n.ausgeschieden(x.person), x.gericht, n.mahlzeit(x.mahlzeit), fmtZahl(x.menge), euro(x.je), euro(x.sachbezug)] })), summe: p.personal.zeilen.length ? [t("ordner.dok.summe"), "", "", "", fmtZahl(p.personal.anzahl), "", euro(p.personal.sachbezug)] : null, leer: t("ordner.zeile.keine") }); }
  if (p.schwund) a.push({ titel: t("ordner.teil.schwund"), info: [t("ordner.dok.netto"), p.schwund.eigen?.anzahl ? t("ordnerT.eigen", euro(p.schwund.eigen.waren)) : ""].filter(Boolean).join(" · "), warn: !!p.schwund.ohneWert, kopf: t("ordnerT.druck.schwund"), rechts: [3, 4],
    zeilen: p.schwund.zeilen.map((x) => [datumDe(x.datum), n.art(x.art), x.name || "–", `${fmtZahl(x.menge, x.einheit === "stk" || x.einheit === "portion" ? 0 : 2)} ${x.einheit === "portion" ? t("tag.portionen") : x.einheit === "stk" ? t("allgemein.stueck") : x.einheit}`, x.wert === null ? t("tag.keinPreis") : euro(x.wert)]),
    summe: p.schwund.zeilen.length ? [t("ordner.dok.summe"), "", "", "", (p.schwund.ohneWert ? `${euro(p.schwund.summeMuell)} (${t("ordnerT.schwundOffen", p.schwund.ohneWert)})` : euro(p.schwund.summeMuell)) + (p.schwund.summeEigen ? ` · ${t("ordnerT.eigen", euro(p.schwund.summeEigen))}` : "")] : null, leer: t("ordner.zeile.keine") });
  if (p.belege) a.push({ titel: t("ordner.teil.belege"), info: t("ordnerT.belegeInfo"), warn: !!p.belege.pruefen, kopf: [t("ordnerC.belegNr"), ...t("ordnerT.druck.belege")], rechts: [4, 5, 6, 7, 8],
    zeilen: p.belege.zeilen.map((x) => ({ warn: !!x.hinweis, zellen: [x.belegNr, datumDe(x.datum), x.rechnungNr || "", `${x.lieferant || "–"} · ${n.stelle(x.stelle)}${x.hinweis ? " · " + n.hinweis(x.hinweis) : x.klein ? " · " + t("ordnerC.kleinbetrag") : ""}${x.nachgetragen ? " · " + t("ordnerC.nachgetragen", datumDe(x.nachgetragen)) : ""}`, leerOder(x.netto), leerOder(x.ust7), leerOder(x.ust19), x.pfand ? euro(x.pfand) : "", leerOder(x.brutto)] })),
    summe: p.belege.anzahl ? [t("ordner.dok.summe"), "", "", "", euro(p.belege.netto), euro(p.belege.ust7), euro(p.belege.ust19), euro(p.belege.pfand), euro(p.belege.brutto)] : null, leer: t("ordner.zeile.belegeKeine") });
  if (p.inventur) a.push({ titel: t("ordner.teil.inventur"), kopf: kopfVon("inventur"), rechts: [1, 2, 3],
    zeilen: p.inventur.zeilen.map((x) => ({ warn: !x.vorher && (x.ohnePreis > 0 || !(x.wert > 0)), zellen: [datumDe(x.datum) + (x.vorher ? ` (${t("ordner.dok.vormonat")})` : ""), x.wert === null ? t("ordnerT.wertFehlt") : euro(x.wert), fmtZahl(x.gezaehlt), fmtZahl(x.ohnePreis)] })), leer: t("ordner.zeile.inventurKeine") });
  if (p.reinigung) a.push({ titel: t("ordner.teil.reinigung"), kopf: kopfVon("reinigung"), rechts: [3],
    zeilen: p.reinigung.zeilen.map((x) => [datumDe(x.datum), x.lieferant || "–", x.artikel, euro(x.netto)]), summe: p.reinigung.zeilen.length ? [t("ordner.dok.summe"), "", "", euro(p.reinigung.netto)] : null, leer: t("ordner.zeile.keine") });
  if (p.kosten) a.push({ titel: t("ordner.teil.kosten"), info: t("ordnerT.kostenInfo", euro(p.kosten.netto), euro(p.kosten.brutto), euro(p.kosten.lohn)), warn: !!(p.kosten.offen || p.kosten.geschaetzt), kopf: t("ordnerT.druck.kosten"), rechts: [1, 4],
    zeilen: p.kosten.zeilen.map((x) => ({ warn: x.status === "geschaetzt", zellen: [n.posten(x.posten) + (x.status === "geschaetzt" ? ` (${n.pstatus(x.status)})` : ""), euro(x.betrag), n.periode(x.periode), n.basis(x.basis), euro(x.jeMonat)] })), leer: t("ordner.zeile.kostenKeine") });
  a.push({ titel: t("ordnerT.aenderungen"), info: t("ordnerT.aenderungenInfo"), kopf: t("ordnerT.druck.aenderungen"), rechts: [4, 5],
    zeilen: p.aenderungen.zeilen.map((x) => [datumDe(x.datum), n.aart(x.art), n.vorgang(x.vorgang), x.art === "kosten" ? [n.stelle(x.stelle), x.text].filter(Boolean).join(" · ") : (x.text || "–"), x.alt === null ? "–" : `${euro(x.alt)} ${n.basis(x.basis)}`, x.neu === null ? "–" : euro(x.neu), zeitDe(x.zeit)]), leer: t("ordnerT.aenderungenKeine") });
  return { titel: t(`ordner.${art}.titel`), laden: stand.betrieb?.name || "", beispiel: beispielKopf(stand), zeitraum: monatLang(p.zeitraum.von), erstellt: erstelltText(), sprache: sprache(), abschnitte: a, fuss: t("ordnerT.fuss") };
}

// Dateien (CSV) je Teil
export const dateiName = (stand, teil, z) => `${(stand.betrieb?.name || "laden").replace(/ı/g, "i").replace(/ß/g, "ss").normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^\w-]+/g, "_").replace(/_+/g, "_").slice(0, 30)}_${teil}_${z.von}_${z.bis}.csv`;
// wahl = { amtZeit, paketMonat } (Auswahl auf dem Bildschirm); ohne Angabe: dieser Monat bzw. Vormonat.
export function csvDateien(stand, ansicht, nurTeil = null, wahl = {}) { // Beispiel-Laden (17.10.2026): exportiert für tests/beispiel.test.mjs
  const H = heute(); const n = NAMEN();
  if (ansicht === "ordner-amt") { const z = amtZeitraumVon(wahl.amtZeit, H); const o = ordnerAmt(stand, z, { datum: H });
    return AMT_TEILE.filter((x) => !nurTeil || x === nurTeil).map((teil) => ({ name: dateiName(stand, dateiTeil(teil), z), text: mitBeispiel(stand, amtCsv(o, teil, kopfVon(teil), n)) })); }
  const art = ansicht === "ordner-steuer" ? "steuer" : "buch"; const z = paketZeitVon(wahl.paketMonat, art, H); const p = monatsPaket(stand, z, art);
  const teile = nurTeil ? p.teile.filter((x) => x === nurTeil) : [...p.teile, "aenderungen"]; // W2-T: Aenderungen.csv gehört zu jedem Monatspaket
  return teile.map((teil) => ({ name: dateiName(stand, teil === "aenderungen" ? t("ordnerT.datei") : t("ordner.datei." + teil), z), text: mitBeispiel(stand, teilCsv(p, teil, kopfVon(teil), n)) }));
}
export function dokumentFuer(stand, ansicht, wahl = {}) {
  const H = heute();
  if (ansicht === "ordner-amt") return druckHtml(mitInhalt(amtDokument(stand, ordnerAmt(stand, amtZeitraumVon(wahl.amtZeit, H), { datum: H })), "amt"));
  const art = ansicht === "ordner-steuer" ? "steuer" : "buch";
  return druckHtml(mitInhalt(paketDokument(stand, monatsPaket(stand, paketZeitVon(wahl.paketMonat, art, H), art)), art));
}

