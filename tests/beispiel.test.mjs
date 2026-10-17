// Beispiel-Laden (17.10.2026): beispielLaden() ist deterministisch, alle Kennzahlen liefern Zahlen, der eigene Laden bleibt unberührt,
// Exporte tragen „BEISPIEL“, Sicherung und Einlesen behalten das Merkmal, Sicherungs-Erinnerung und Läden-Summen zählen ihn nicht.
import test from "node:test";
import assert from "node:assert/strict";
import { leererBetrieb, leereWurzel, migrierenWurzel, zusammenfuehren, eintraegeZaehlen } from "../js/store.js";
import { beispielLaden, BEISPIEL_NAME } from "../js/beispiel.js";
import { zaehler } from "../js/zaehler.js";
import { kalkulation, schwundAuswertung, ladenUebersicht } from "../js/engine.js";
import { inventurenFertig, inventurVergleich } from "../js/inventur.js";
import { ordnerAmt, zeitraumFuer, druckHtml } from "../js/export_amt.js";
import { monatsPaket, monatVon } from "../js/export_steuer.js";
import { heuteGeschaeft } from "../js/util.js";
import { sicherungStufe } from "../js/sicherung_stufe.js"; // Trennung (17.10.2026)

const H = "2026-10-17";
const deutsch = async () => { const i18n = await import("../js/i18n.js"); if (i18n.setzeSprache) await i18n.setzeSprache("de"); };

test("Beispiel-Laden: gleiches Datum ergibt denselben Laden (ohne Zufall), anderes Datum verschiebt nur die Tage", () => {
  const a = beispielLaden(H), b = beispielLaden(H);
  assert.equal(JSON.stringify(a), JSON.stringify(b));
  assert.equal(a.beispiel, true); assert.equal(a.betrieb.name, BEISPIEL_NAME); assert.equal(a.phase, "app"); assert.equal(a.ladenArt, "doener");
  const c = beispielLaden("2026-11-03");
  assert.notEqual(c.id, a.id, "Kennung hängt am Datum");
  assert.ok(c.tagesnotizen.every((n) => n.datum < "2026-11-03" && n.datum >= "2026-10-04"), "Tage relativ zum Datum");
  // eindeutige Kennungen in jedem Journal
  for (const j of ["schwund", "tagesnotizen", "messungen", "rundgaenge", "putzlog", "lieferungen", "inventuren", "belehrungen"]) {
    const ids = a[j].map((e) => e.id); assert.equal(new Set(ids).size, ids.length, j); assert.ok(ids.every((x) => /^bsp-/.test(x)), j);
  }
});

test("Beispiel-Laden: Inhalt wie bestellt (Karte, Kosten, 30 Tage, Ruhetag Sonntag, Kühlung mit einer behobenen Abweichung)", () => {
  const s = beispielLaden(H);
  assert.ok(s.gerichte.length >= 12 && s.gerichte.length <= 15, s.gerichte.length);
  assert.ok(s.gerichte.every((g) => typeof g.preis === "number" && (g.zutaten || []).length), "jedes Gericht hat Preis und Rezept");
  assert.deepEqual(s.kosten.map((k) => k.posten).sort(), ["miete", "strom", "versicherungen"]);
  assert.equal(typeof s.team.lohnkosten, "number"); assert.equal(s.team.eigenerLohnStatus, "eigen");
  assert.equal(s.betrieb.tageProWoche, 6); assert.deepEqual(s.kuehl.ruhetage, [0]);
  const tage = new Set(s.tagesnotizen.map((n) => n.datum));
  assert.ok(tage.size >= 25 && tage.size <= 26, tage.size);
  assert.ok([...tage].every((d) => new Date(d + "T12:00").getDay() !== 0), "kein Umsatz am Ruhetag");
  assert.ok(!tage.has(H), "heute ist noch offen");
  const muellTage = new Set(s.schwund.filter((e) => e.art !== "personal").map((e) => e.datum)); assert.ok(muellTage.size >= 7 && muellTage.size <= 11, muellTage.size);
  assert.ok(s.schwund.some((e) => e.art === "personal" && e.von), "Personalessen mit Person");
  assert.deepEqual(s.personen.map((p) => p.kuerzel), ["AB", "CD"]);
  assert.equal(s.kuehlstellen.length, 4);
  const abw = s.messungen.filter((m) => m.abweichung); assert.equal(abw.length, 1);
  assert.ok(abw[0].massnahmen.length && abw[0].nachkontrolle, "Maßnahme und Nachkontrolle");
  assert.ok(s.putzplan?.aktiv && s.putzlog.length > 100);
  assert.equal(inventurenFertig(s).length, 2); assert.ok(s.lieferungen.length >= 1);
  const tag = (iso) => { const d = new Date(iso); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };
  for (const j of ["messungen", "tagesnotizen", "schwund", "putzlog"]) assert.ok(s[j].every((e) => !e.nacherfasst && tag(e.erfasst) === e.datum), `${j}: erfasst am selben Tag, nicht nachgetragen`);
});

test("Beispiel-Laden: Zähler, Monatsziel, Vergleich, Inventur und Müll liefern Zahlen", () => {
  const s = beispielLaden(H);
  const z = zaehler(s, { datum: H });
  assert.ok(z.tageMitUmsatz > 0 && z.umsatzBrutto > 0 && Number.isFinite(z.stand) && z.stand !== 0, "Zähler");
  assert.ok(Number.isFinite(z.monatsende) && z.quoteEff > 0.1 && z.quoteEff < 0.6, `Quote ${z.quoteEff}`);
  assert.equal(z.unvollstaendig, false, "Kosten vollständig");
  const k = kalkulation(s); assert.ok(k.zaehl.gruen + k.zaehl.gelb + k.zaehl.rot >= 8, JSON.stringify(k.zaehl));
  assert.equal(k.zaehl.grau, 0, "seit dem Richtpreis-Nachtrag 17.10. haben alle Gerichte einen Preis");
  const sw = schwundAuswertung(s, { von: "2026-09-17", bis: H }); assert.ok(sw.muellwert > 0 && sw.ohneWert === 0, JSON.stringify(sw.muellwert));
  const [i1, i2] = inventurenFertig(s); const v = inventurVergleich(s, i2, i1);
  assert.ok(v && v.anfang > 0 && v.ende > 0 && v.einkauf > 0 && v.echteQuote > 0.1 && v.echteQuote < 0.6, JSON.stringify(v && { a: v.anfang, e: v.ende, q: v.echteQuote }));
  assert.ok(Array.isArray(s._ohnePreis), "Liste der Zutaten ohne Preis vorhanden");
});

test("Beispiel-Laden: Amt-Ordner vollständig ohne Nachträge; Exporte tragen BEISPIEL (Druck und CSV)", async () => {
  await deutsch();
  const { amtDokument, paketDokument, csvDateien, dokumentFuer } = await import("../js/ordner_text.js"); // Trennung 2 (17.10.2026)
  const s = beispielLaden(H);
  const o = ordnerAmt(s, zeitraumFuer("monat", { datum: H }), { datum: H });
  assert.ok(o.teile.kuehl.anzahl > 50 && o.teile.kuehl.nachgetragen === 0 && o.teile.kuehl.abweichungen === 1 && o.teile.kuehl.behoben === 1, JSON.stringify({ n: o.teile.kuehl.anzahl, nach: o.teile.kuehl.nachgetragen }));
  assert.ok(o.teile.putz.tage > 0);
  const html = druckHtml(amtDokument(s, o));
  assert.match(html, /BEISPIEL – keine echten Daten/);
  const p = monatsPaket(s, monatVon("2026-09-01"), "steuer");
  assert.ok(p.umsatz.tage > 0 && p.personal.zeilen.length > 0 && p.belege.anzahl > 0, "Vormonat mit Zahlen");
  assert.match(druckHtml(paketDokument(s, p)), /BEISPIEL – keine echten Daten/);
  // Dateien so, wie die App sie teilt (Datum = heute): jede CSV beginnt mit der Kennzeichnung
  const t = beispielLaden(heuteGeschaeft());
  for (const a of ["ordner-amt", "ordner-steuer", "ordner-buch"]) {
    const d = csvDateien(t, a); assert.ok(d.length > 0, a);
    for (const f of d) assert.ok(f.text.startsWith("﻿BEISPIEL – keine echten Daten\r\n"), `${a} ${f.name}`);
    assert.match(dokumentFuer(t, a), /BEISPIEL – keine echten Daten/);
  }
  // echter Laden: keine Kennzeichnung
  const eigen = leererBetrieb(); eigen.phase = "app"; eigen.betrieb.name = "Mein Laden";
  for (const f of csvDateien(eigen, "ordner-amt")) assert.ok(!f.text.includes("BEISPIEL"));
  assert.ok(!dokumentFuer(eigen, "ordner-steuer").includes("BEISPIEL"));
});

test("Beispiel-Laden: eigener Laden bleibt unverändert (Anlegen, Rechnen, Exporte, Löschen)", async () => {
  await deutsch();
  const { csvDateien, dokumentFuer } = await import("../js/ordner_text.js"); // Trennung 2 (17.10.2026)
  const w = leereWurzel(); const eigen = leererBetrieb(); eigen.phase = "app"; eigen.betrieb.name = "Mein Laden"; eigen.ladenArt = "doener";
  eigen.tagesnotizen.push({ id: "n1", datum: "2026-10-10", umsatz: 500, erfasst: "2026-10-10T20:00:00.000Z", nacherfasst: false, storniert: false });
  w.betriebe.push(eigen); w.aktiv = eigen.id;
  const vorher = JSON.stringify(eigen);
  const b = beispielLaden(H); w.betriebe.push(b); w.aktiv = b.id; // wie app.js: anlegen und wechseln
  zaehler(b, { datum: H }); kalkulation(b); csvDateien(b, "ordner-amt"); dokumentFuer(b, "ordner-steuer"); ladenUebersicht(b);
  assert.equal(JSON.stringify(eigen), vorher, "nach Anlegen und Rechnen");
  assert.notEqual(b.id, eigen.id);
  w.betriebe = w.betriebe.filter((x) => x.id !== b.id); w.aktiv = (w.betriebe.find((x) => x.phase === "app" && !x.beispiel) || w.betriebe[0]).id; // wie ladenLoeschenJetzt
  assert.equal(w.aktiv, eigen.id); assert.equal(JSON.stringify(w.betriebe[0]), vorher, "nach Löschen");
});

test("Beispiel-Laden: Sicherung behält das Merkmal; Sicherungs-Erinnerung zählt ihn nicht", () => {
  const w = leereWurzel(); const eigen = leererBetrieb(); eigen.phase = "app"; w.betriebe.push(eigen); w.aktiv = eigen.id;
  w.letzteSicherung = new Date().toISOString(); w.sicherungZaehler = eintraegeZaehlen(w);
  const vorher = sicherungStufe(w);
  w.betriebe.push(beispielLaden(H));
  assert.equal(eintraegeZaehlen(w), 0, "Beispiel-Einträge zählen nicht");
  assert.deepEqual(sicherungStufe(w), vorher, "Erinnerung unverändert");
  // Sicherung schreiben und auf einem leeren Handy einlesen
  const datei = migrierenWurzel(JSON.parse(JSON.stringify(w)));
  assert.equal(datei.betriebe.find((x) => x.id !== eigen.id).beispiel, true);
  const neu = leereWurzel(); zusammenfuehren(neu, datei);
  assert.equal(neu.betriebe.filter((x) => x.beispiel).length, 1, "Merkmal nach dem Einlesen");
  // zweimal einlesen: kein zweiter Beispiel-Laden, Merkmal bleibt
  zusammenfuehren(neu, migrierenWurzel(JSON.parse(JSON.stringify(w))));
  assert.equal(neu.betriebe.filter((x) => x.beispiel).length, 1);
  // nur echtes true zählt
  const x = migrierenWurzel({ betriebe: [{ ...leererBetrieb(), beispiel: "ja" }], schema: 6 }); assert.equal(x.betriebe[0].beispiel, undefined);
});

test("Beispiel-Laden: Inventur von heute liegt nie in der Zukunft (Anlegen zwischen 4 und 8:30 Uhr)", () => {
  const heute = "2026-10-17";
  const jetzt = new Date(2026, 9, 17, 5, 10).toISOString();
  const b = beispielLaden(heute, { jetzt });
  const zeiten = JSON.stringify(b).match(/"\d{4}-\d{2}-\d{2}T[^"]+"/g).map((z) => new Date(JSON.parse(z)));
  assert.ok(zeiten.every((z) => z <= new Date(jetzt)), "kein Zeitstempel nach dem Anlegen");
  const spaet = beispielLaden(heute, { jetzt: new Date(2026, 9, 17, 14, 0).toISOString() });
  assert.deepEqual(spaet, beispielLaden(heute), "nach 8:30 Uhr wie ohne Uhrzeit");
});
