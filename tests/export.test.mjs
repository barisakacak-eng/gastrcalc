// Büro-Ordner (Entwickler C, 15.10.2026): CSV-Format, Zeiträume, Belehrungen nach § 43 IfSG, Vollständigkeit, Monatspaket, Büro-Code.
import test from "node:test";
import assert from "node:assert/strict";
import { leererBetrieb } from "../js/store.js";
import * as A from "../js/export_amt.js";
import * as St from "../js/export_steuer.js";

test("CSV: BOM, Semikolon, CRLF, Dezimalkomma, Anführungszeichen, Formelschutz", () => {
  const csv = St.csvText(["Datum", "Text", "Betrag"], [["01.10.2026", 'Sagt "hallo"; ja', 1234.5], ["02.10.2026", "=SUMME(A1)", -3], ["", "-Rabatt", null]]);
  assert.ok(csv.startsWith("﻿"));
  const z = csv.slice(1).split("\r\n");
  assert.equal(z[0], "Datum;Text;Betrag");
  assert.equal(z[1], '01.10.2026;"Sagt ""hallo""; ja";1234,50');
  assert.equal(z[2], "02.10.2026;'=SUMME(A1);-3,00"); // Zahl bleibt Zahl, Text-Formel bekommt Hochkomma
  assert.equal(z[3], ";'-Rabatt;");
  assert.equal(z[4], ""); // abschließendes CRLF
  assert.equal(St.zahlDe(-0.001), "0,00");
  assert.equal(St.zahlDe(7, 1), "7,0");
  assert.equal(St.datumDe("2026-02-03"), "03.02.2026");
});

test("Zeiträume: Monat, Quartal, Frei (vertauscht, ungültig)", () => {
  assert.deepEqual(A.zeitraumFuer("monat", { datum: "2026-02-10" }), { art: "monat", von: "2026-02-01", bis: "2026-02-28", monat: "2026-02" });
  const q = A.zeitraumFuer("quartal", { datum: "2026-11-30" }); assert.equal(q.von, "2026-10-01"); assert.equal(q.bis, "2026-12-31"); assert.equal(q.quartal, 4);
  assert.equal(A.zeitraumFuer("quartal", { datum: "2026-01-01" }).bis, "2026-03-31");
  const f = A.zeitraumFuer("frei", { datum: "2026-10-15", von: "2026-10-12", bis: "2026-09-01" }); assert.deepEqual([f.von, f.bis], ["2026-09-01", "2026-10-12"]);
  const g = A.zeitraumFuer("frei", { datum: "2026-10-15", von: "kaputt", bis: null }); assert.deepEqual([g.von, g.bis], ["2026-10-01", "2026-10-31"]);
  assert.deepEqual(St.monatVon("2026-09-17"), { von: "2026-09-01", bis: "2026-09-30", monat: "2026-09" });
  assert.equal(St.monatPlus("2026-01", -1), "2025-12");
});

test("Belehrung: alle zwei Jahre fällig, 60 Tage vorher „bald“, Schaltjahr, fehlt", () => {
  assert.equal(A.faelligAm("2024-11-20"), "2026-11-20");
  assert.equal(A.faelligAm("2024-02-29"), "2026-02-28");
  const p = (l) => ({ belehrungen: l });
  assert.equal(A.belehrungStatus(p([]), "2026-10-15").status, "fehlt");
  assert.equal(A.belehrungStatus(p([{ datum: "2025-03-01", art: "erst" }]), "2026-10-15").status, "ok");
  const b = A.belehrungStatus(p([{ datum: "2022-11-03", art: "erst" }, { datum: "2024-11-20", art: "folge" }]), "2026-10-15");
  assert.equal(b.status, "bald"); assert.equal(b.erst, "2022-11-03"); assert.equal(b.letzte, "2024-11-20"); assert.equal(b.tage, 36);
  assert.equal(A.belehrungStatus(p([{ datum: "2024-10-14", art: "folge" }]), "2026-10-15").status, "ueberfaellig");
  assert.equal(A.belehrungStatus(p([{ datum: "2024-10-15", art: "folge" }]), "2026-10-15").status, "bald"); // am Fälligkeitstag noch nicht überfällig
});

test("Belehrung eintragen: Journal am Laden, keine Zukunft, keine Dublette, Rücknahme gekennzeichnet", () => {
  const s = leererBetrieb(); s.personen = [{ id: "a", kuerzel: "Ayşe", aktiv: true, entfernt: false }, { id: "x", kuerzel: "Weg", aktiv: false, entfernt: true }];
  assert.equal(A.belehrungen(s, { datum: "2026-10-15" }).vollstaendig, false);
  assert.equal(A.belehrungEintragen(s, "a", { datum: "2026-10-16", art: "folge", bisHeute: "2026-10-15" }), null);
  assert.equal(A.belehrungEintragen(s, "a", { datum: "2026-13-01", art: "folge", bisHeute: "2026-10-15" }), null);
  assert.equal(A.belehrungEintragen(s, "a", { datum: "2026-01-01", art: "quatsch", bisHeute: "2026-10-15" }), null);
  assert.ok(A.belehrungEintragen(s, "a", { datum: "2026-01-01", art: "erst", bisHeute: "2026-10-15" }));
  assert.equal(A.belehrungEintragen(s, "a", { datum: "2026-01-01", art: "erst", bisHeute: "2026-10-15" }), null);
  assert.equal(s.belehrungen.length, 1); assert.equal(s.belehrungen[0].person, "a");
  const b = A.belehrungen(s, { datum: "2026-10-15" });
  assert.equal(b.zeilen.length, 1); assert.equal(b.zeilen[0].status, "ok"); assert.equal(b.vollstaendig, true);
  assert.ok(A.belehrungEntfernen(s, "a", "2026-01-01", "erst")); assert.equal(s.belehrungen.length, 1); assert.equal(s.belehrungen[0].storniert, true);
  assert.equal(A.belehrungen(s, { datum: "2026-10-15" }).zeilen[0].status, "fehlt");
  // alte Schreibweise person.belehrungen wird mitgelesen
  s.personen[0].belehrungen = [{ datum: "2024-11-20", art: "folge" }];
  assert.equal(A.belehrungen(s, { datum: "2026-10-15" }).zeilen[0].status, "bald");
});

function amtLaden() {
  const s = leererBetrieb(); s.phase = "app"; s.betrieb.name = "Test";
  s.kuehl = { takt: 1, ruhetage: [], eingerichtet: true, seit: "2026-10-01" };
  s.kuehlstellen = [{ id: "k", name: "Theke", art: "kuehl", min: null, max: null, reihe: 0, archiviert: false }];
  s.personen = [{ id: "a", kuerzel: "Ayşe", aktiv: true, entfernt: false }];
  const m = (d, wert, extra = {}) => s.messungen.push({ id: "m" + d + wert, stelle: "k", datum: `2026-10-${String(d).padStart(2, "0")}`, zeit: `2026-10-${String(d).padStart(2, "0")}T09:00:00`, wert, min: null, max: 7, abweichung: wert > 7, massnahmen: [], nachkontrolle: null, von: "a", nacherfasst: false, storniert: false, ...extra });
  for (let d = 1; d <= 4; d++) m(d, 4);
  return { s, m };
}

test("Kühlprotokoll: Lücken bis gestern, Abweichung erst mit Maßnahme und erledigter Nachkontrolle behoben", () => {
  const { s, m } = amtLaden(); const z = A.zeitraumFuer("monat", { datum: "2026-10-05" });
  let k = A.kuehlprotokoll(s, z, { datum: "2026-10-05" });
  assert.equal(k.anzahl, 4); assert.deepEqual(k.luecken, []); assert.equal(k.vollstaendig, true); // heute (5.) ist noch offen, keine Lücke
  k = A.kuehlprotokoll(s, z, { datum: "2026-10-07" }); assert.deepEqual(k.luecken, ["2026-10-05", "2026-10-06"]); assert.equal(k.vollstaendig, false);
  m(5, 9.5, { zeit: "2026-10-05T10:00:00", massnahmen: [], nachkontrolle: null });
  m(6, 4);
  k = A.kuehlprotokoll(s, z, { datum: "2026-10-07" }); assert.equal(k.abweichungen, 1); assert.equal(k.offen, 1); assert.equal(k.vollstaendig, false);
  s.messungen.find((x) => x.wert === 9.5).massnahmen = ["tuer"]; s.messungen.find((x) => x.wert === 9.5).nachkontrolle = { art: "h1", faellig: null };
  // W2-H: ohne Fälligkeit gilt das Tagesende – die gute Messung am Folgetag ist „verspätet“, nicht „erledigt“
  k = A.kuehlprotokoll(s, z, { datum: "2026-10-07" }); assert.equal(k.behoben, 0); assert.equal(k.zeilen.find((x) => x.abweichung).nachkontrolle, "verspaetet");
  m(5, 5, { zeit: "2026-10-05T10:50:00" }); // pünktlich am selben Tag
  k = A.kuehlprotokoll(s, z, { datum: "2026-10-07" }); assert.equal(k.behoben, 1); assert.equal(k.zeilen.find((x) => x.abweichung).nachkontrolle, "erledigt"); assert.equal(k.vollstaendig, true);
  const csv = A.amtCsv(A.ordnerAmt(s, z, { datum: "2026-10-07" }), "kuehl", ["D", "U", "S", "W", "Mi", "Ma", "Ab", "M", "N", "Na", "Nt", "NA", "L", "St"], { ja: () => "ja", massnahme: (x) => x, nachkontrolle: (x) => x.nachkontrolle });
  assert.match(csv, /05\.10\.2026;10:00;Theke;9,5;;7,0;ja;tuer;erledigt;Ayşe;/);
});

test("Putznachweis und Vollständigkeit des Ordners", async () => {
  const { aufgabenFuer, abhaken } = await import("../js/putzplan.js");
  const { s } = amtLaden(); s.ladenArt = "doener";
  const z = A.zeitraumFuer("monat", { datum: "2026-10-03" });
  assert.equal(A.putznachweis(s, z, { datum: "2026-10-03" }).aktiv, false);
  s.putzplan = { aktiv: true, geraete: ["kuehlschrank", "lager", "muell"], aus: ["R36"], seit: "2026-10-01" };
  const tag = aufgabenFuer(s.putzplan).filter((a) => a.takt === "tag");
  for (const d of ["2026-10-01", "2026-10-02"]) for (const a of tag) abhaken(s, a.id, { datum: d });
  abhaken(s, tag[0].id, { datum: "2026-10-03" }); // heute halb: zählt noch nicht
  let p = A.putznachweis(s, z, { datum: "2026-10-03" });
  assert.deepEqual([p.tage, p.tageGesamt, p.vollstaendig], [2, 2, true]);
  p = A.putznachweis(s, z, { datum: "2026-10-04" }); assert.deepEqual(p.luecken, ["2026-10-03"]); assert.equal(p.vollstaendig, false);
  s.belehrungen = [{ id: "b", person: "a", datum: "2025-05-01", art: "erst", storniert: false }];
  const o = A.ordnerAmt(s, z, { datum: "2026-10-03" });
  assert.deepEqual(A.AMT_PFLICHT.map((t) => o.teile[t].vollstaendig), [true, true, true]); // W2-H: Geräteübersicht zählt nicht mehr als „Konzept vollständig“
  assert.equal(o.teile.konzept.vollstaendig, null); assert.equal(o.teile.konzept.geraeteliste, true);
  assert.equal(o.vollstaendig, 3); assert.equal(o.gesamt, 3); assert.equal(o.prozent, 100);
  assert.equal(o.teile.konzept.kuehlstellen[0].max, 7); assert.equal(o.teile.konzept.kuehlstellen[0].standard, true);
});

test("Monatspaket Steuerberater/Buchhalter: Umsatz netto, Sachbezug, Schwund, Belege, Reinigungsmittel, Inventur", () => {
  const s = leererBetrieb(); s.betrieb.steuerSatz = 0.07;
  s.tagesnotizen = [{ id: "1", datum: "2026-09-01", umsatz: 107, erfasst: "a", storniert: false }, { id: "2", datum: "2026-09-01", umsatz: 214, erfasst: "b", storniert: false }, { id: "3", datum: "2026-10-01", umsatz: 50, erfasst: "a", storniert: false }];
  s.schwund = [{ id: "p", datum: "2026-09-02", art: "personal", menge: 2, mahlzeit: "fruehstueck", ref: { name: "Döner" }, wert: 3, storniert: false, von: "a" },
    { id: "g", datum: "2026-09-03", art: "gericht", menge: 1, einheit: "portion", ref: { name: "Döner" }, wert: 2.5, storniert: false },
    { id: "o", datum: "2026-09-04", art: "rohware", menge: 1, einheit: "kg", ref: { name: "X" }, wert: null, wertOffen: true, storniert: false },
    { id: "s", datum: "2026-09-04", art: "gericht", menge: 1, einheit: "portion", ref: { name: "Döner" }, wert: 9, storniert: true }];
  s.personen = [{ id: "a", kuerzel: "Ayşe", aktiv: true, entfernt: false }];
  s.lieferungen = [{ id: "l", datum: "2026-09-05", lieferant: "Metro", summeNetto: 100, summeBrutto: 110, zeilen: [{ name: "Tomaten", netto: 80 }, { name: "Spülmittel 5 l", netto: 20 }], storniert: false }];
  s.kostenbelege = [{ id: "k", datum: "2026-09-06", stelle: "strom", betrag: 119, basis: "brutto", satz: 0.19, verteilung: "monatlich", lieferant: "SW", storniert: false }];
  s.inventuren = [{ id: "i", datum: "2026-09-30", abgeschlossen: "x", posten: {}, ausgeblendet: [], wert: 412.37 }];
  const z = St.monatVon("2026-09-01"); const p = St.monatsPaket(s, z, "steuer");
  assert.equal(p.umsatz.tage, 1); assert.equal(p.umsatz.zeilen[0].brutto, 214); assert.equal(p.umsatz.zeilen[0].netto, undefined, "W2-T: keine Steuer aus dem Mischsatz"); assert.equal(p.stand.umsatz, "notiz");
  assert.equal(p.personal.sachbezug, 4.74); assert.equal(p.personal.zeilen[0].person, "Ayşe");
  assert.equal(p.schwund.muellwert, 2.5); assert.equal(p.schwund.ohneWert, 1); assert.equal(p.stand.schwund, "luecke");
  assert.equal(p.belege.anzahl, 2); assert.equal(p.belege.netto, 200); assert.equal(p.stand.belege, "pruefen", "W2-T: Lieferung ohne erkannten Satz"); assert.equal(p.belege.zeilen[0].betriebsmittel, 20);
  assert.equal(p.reinigung.netto, 20); assert.equal(p.inventur.zeilen[0].wert, 412.37); assert.equal(p.stand.inventur, "ok");
  assert.equal(p.vollstaendig, 3); assert.deepEqual(p.pruefTeile, ["personal", "schwund", "belege", "inventur", "reinigung"]);
  const csv = St.teilCsv(p, "umsatz", ["Datum", "Brutto", "Nach", "Vorwert", "Kennung"]);
  assert.equal(csv, "﻿Datum;Brutto;Nach;Vorwert;Kennung\r\n01.09.2026;214,00;;;notiz\r\n");
  const b = St.monatsPaket(s, z, "buch"); assert.deepEqual(b.teile, ["umsatz", "belege", "kosten"]); assert.equal(b.personal, undefined);
  assert.equal(St.monatsPaket(s, St.monatVon("2026-08-01"), "steuer").stand.inventur, "luecke");
});

test("Druckdokument: escaped, Kopf, Tabellen, Unterschrift", () => {
  const h = A.druckHtml({ titel: "Ordner <Amt>", laden: "Döner & Co", zeitraum: "Oktober 2026", erstellt: "heute", abschnitte: [{ titel: "Kühl", kopf: ["A", "B"], rechts: [1], zeilen: [["x", "1,0 °C"], { warn: true, zellen: ["<b>", "9"] }], summe: ["S", "2"] }, { titel: "Leer", kopf: [], zeilen: [], leer: "Keine Einträge" }], unterschrift: ["U1", "U2"], fuss: "F" });
  assert.match(h, /^<!doctype html>/); assert.match(h, /Ordner &lt;Amt&gt;/); assert.match(h, /Döner &amp; Co/); assert.match(h, /<tr class="warn"><td>&lt;b&gt;<\/td><td class="r">9<\/td>/);
  assert.match(h, /<tfoot>/); assert.match(h, /Keine Einträge/); assert.match(h, /@page \{ size: A4/); assert.ok(!h.includes("<script"));
});

// Konkurrenz-Lehren 20.10.2026: Beleg-Nr. fest, Storno im Folgemonat sichtbar, Gutschrift mit negativer Steuer
const lief = (id, datum, erfasst, netto) => ({ id, datum, erfasst, lieferant: "L", rechnungNr: id, summeNetto: netto, summeBrutto: Math.round(netto * 107) / 100, zeilen: [{ name: "x", netto, steuersatz: 0.07 }], storniert: false });
test("Beleg-Nr. bleibt bei Nachtrag und Rücknahme fest", () => {
  const s = leererBetrieb(); const z = { von: "2026-09-01", bis: "2026-09-30" };
  s.lieferungen = [lief("a", "2026-09-03", "2026-09-03T10:00:00Z", 100), lief("b", "2026-09-10", "2026-09-10T10:00:00Z", 200)];
  const vorher = Object.fromEntries(St.belege(s, z).zeilen.map((x) => [x.id, x.belegNr]));
  s.lieferungen.push(lief("c", "2026-09-05", "2026-09-28T10:00:00Z", 50)); s.lieferungen[0].storniert = true;
  const nach = Object.fromEntries(St.belege(s, z).zeilen.map((x) => [x.id, x.belegNr]));
  assert.equal(nach.b, vorher.b); assert.equal(nach.c, "2026-09-003");
});
test("Rücknahme im Folgemonat steht im Paket des Folgemonats", () => {
  const s = leererBetrieb(); s.lieferungen = [{ ...lief("x", "2026-08-20", "2026-08-20T10:00:00Z", 100), storniert: true, storniertZeit: "2026-09-05T10:00:00Z" }];
  assert.equal(St.aenderungen(s, { von: "2026-09-01", bis: "2026-09-30" }).anzahl, 1);
  assert.equal(St.aenderungen(s, { von: "2026-08-01", bis: "2026-08-31" }).anzahl, 1);
});
test("Gutschrift trägt negative Umsatzsteuer und geht auf", () => {
  const s = leererBetrieb(); s.lieferungen = [lief("g", "2026-09-02", "2026-09-02T10:00:00Z", -100), lief("h", "2026-09-02", "2026-09-02T11:00:00Z", 100)];
  const b = St.belege(s, { von: "2026-09-01", bis: "2026-09-30" });
  assert.equal(b.zeilen.find((x) => x.id === "g").ust7, -7); assert.equal(b.ust7, 0); assert.equal(b.pruefen, 0);
});
