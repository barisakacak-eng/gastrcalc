// Schnellweg 2 (Entwickler E): Schritt nach Kennung speichern, alte Stände sanft umziehen,
// „Geld“ schreibt dieselben Daten wie die alten Bildschirme „Kosten“ + „Reinigung“, Kühlung zählt je Gerät, „selbst“ still nach Laden-Art.
import { test } from "node:test";
import assert from "node:assert/strict";
import { leererBetrieb, migrierenBetrieb } from "../js/store.js";
import { SCHNELL, SCHRITTE, schritteFuer, schrittWiederherstellen, schrittIdMerken, kostenSchnell, reinigungSchritt, kuehlAnzahlAendern, kuehlTyp, selbstStandard, ALT_SCHNELL } from "../js/screens/onboarding.js";
import { vorauswahlFuer } from "../js/data/zwischen.js";
import de from "../js/lang/de.js";

const schritt = (id) => SCHNELL.find((s) => s.id === id);
const ladenSchnell = (art = "doener") => {
  const s = leererBetrieb(); s.phase = "onboarding"; s.weg = "schnell";
  schritt("laden-schnell").aktion("laden-art", { dataset: { wert: art } }, s);
  return s;
};

test("Schnellweg hat höchstens 6 Bildschirme in fester Reihenfolge", () => {
  assert.deepEqual(SCHNELL.map((s) => s.id), ["sprache", "laden-schnell", "karte-foto", "kuehl-schnell", "geld", "fertig-schnell"]);
  assert.ok(SCHNELL.length <= 6);
  assert.equal(schritteFuer({ weg: "genau" }), SCHRITTE, "genauer Weg unverändert erreichbar");
  assert.ok(SCHRITTE.some((s) => s.id === "format") && SCHRITTE.some((s) => s.id === "ergebnis"));
});

test("Schritt wird mit Kennung gemerkt und nach Kennung wiederhergestellt", () => {
  const s = ladenSchnell(); s.schritt = 4; schrittIdMerken(s);
  assert.equal(s.schrittId, "geld");
  s.schritt = 1; // Nummer veraltet (z. B. ein Schritt kam dazu) – die Kennung gewinnt
  schrittWiederherstellen(s);
  assert.equal(s.schritt, 4); assert.equal(SCHNELL[s.schritt].id, "geld");
});

test("Unbekannte Kennung bleibt bei der Nummer, Nummer wird begrenzt", () => {
  const s = ladenSchnell(); s.schrittId = "gibt-es-nicht"; s.schritt = 99;
  schrittWiederherstellen(s);
  assert.equal(s.schritt, SCHNELL.length - 1); assert.equal(s.schrittId, "fertig-schnell");
});

test("Alte Stände (7 Schritte, nur Nummer) ziehen auf den passenden neuen Schritt um", () => {
  const erwartet = { sprache: "sprache", "laden-schnell": "laden-schnell", selbst: "karte-foto", "karte-foto": "karte-foto", "kosten-schnell": "geld", reinigung: "geld", "fertig-schnell": "fertig-schnell" };
  ALT_SCHNELL.forEach((altId, i) => {
    const s = ladenSchnell(); s.schritt = i; delete s.schrittId;
    schrittWiederherstellen(s);
    assert.equal(SCHNELL[s.schritt].id, erwartet[altId], `alter Schritt ${i} (${altId})`);
    assert.equal(s.schrittId, erwartet[altId]);
  });
});

test("Migration über den Speicher behält schrittId (store.js wirft unbekannte Felder nicht weg)", () => {
  const s = migrierenBetrieb({ id: "x", phase: "onboarding", weg: "schnell", schritt: 2, schrittId: "kuehl-schnell" });
  schrittWiederherstellen(s);
  assert.equal(SCHNELL[s.schritt].id, "kuehl-schnell");
});

test("Genauer Weg: Nummer bleibt, Kennung wird ergänzt", () => {
  const s = leererBetrieb(); s.phase = "onboarding"; s.weg = "genau"; s.schritt = 5; delete s.schrittId;
  schrittWiederherstellen(s);
  assert.equal(s.schritt, 5); assert.equal(s.schrittId, SCHRITTE[5].id);
});

test("App-Phase: nichts wird verändert", () => {
  const s = leererBetrieb(); s.phase = "app"; s.schritt = 3;
  schrittWiederherstellen(s);
  assert.equal(s.schritt, 3); assert.equal(s.schrittId, undefined);
});

test("Alter Stand auf „Was macht ihr selbst?“: getroffene Auswahl wird übernommen", () => {
  const s = ladenSchnell("pizza"); s.selbst = ["teig"]; s.schritt = 2; delete s.schrittId;
  schrittWiederherstellen(s);
  assert.equal(SCHNELL[s.schritt].id, "karte-foto");
  assert.ok(s.artikel.some((a) => a.herkunft === "selbst"), "selbst gemachter Teig angelegt");
});

// ---------- Geld = alte Kosten + Reinigung ----------
function fuelle(eingabe, aktion) {
  const s = ladenSchnell();
  for (const [f, w] of [["ks:miete", "1800"], ["ks:personal", "6000"], ["ks:eigen", "2500"], ["ks:energie", "450"]]) eingabe.kosten(f, w, s);
  aktion.reinigung("rein-wer", { dataset: { wert: "beides" } }, s);
  eingabe.reinigung("rein-firma", "300", s);
  return s;
}
const ohneIds = (s) => JSON.parse(JSON.stringify({ kosten: s.kosten.map(({ id, ...k }) => k), team: s.team, reinigung: s.betrieb.reinigung }));

test("Geld schreibt dieselben Daten wie die alten Bildschirme (Kostenposten, Team, Reinigung)", () => {
  const g = schritt("geld");
  const neu = fuelle({ kosten: g.eingabe, reinigung: g.eingabe }, { reinigung: g.aktion });
  const alt = fuelle({ kosten: kostenSchnell.eingabe, reinigung: reinigungSchritt.eingabe }, { reinigung: reinigungSchritt.aktion });
  assert.deepEqual(ohneIds(neu), ohneIds(alt));
  const miete = neu.kosten.find((k) => k.posten === "miete"), strom = neu.kosten.find((k) => k.posten === "strom");
  assert.equal(miete.betrag, 1800); assert.equal(miete.status, "bekannt"); assert.equal(miete.periode, "monat"); assert.equal(miete.kategorie, "miete");
  assert.equal(strom.betrag, 450); assert.equal(strom.basis, "brutto"); assert.equal(strom.sammel, "strom-gas"); assert.equal(strom.kategorie, "energie");
  assert.equal(neu.team.lohnkosten, 6000); assert.equal(neu.team.eigenerLohn, 2500); assert.equal(neu.team.eigenerLohnStatus, "eigen");
  assert.equal(neu.betrieb.reinigung.wer, "beides"); assert.equal(neu.betrieb.reinigung.firmaBetrag, 300);
});

test("Geld: leeres Feld schaltet den Posten aus, eigener Lohn fällt auf den Richtwert zurück", () => {
  const g = schritt("geld"); const s = ladenSchnell();
  g.eingabe("ks:miete", "1200", s); g.eingabe("ks:miete", "", s);
  g.eingabe("ks:eigen", "3000", s); g.eingabe("ks:eigen", "", s);
  assert.equal(s.kosten.find((k) => k.posten === "miete").status, "aus");
  assert.equal(s.team.eigenerLohnStatus, "geschaetzt");
});

test("Geld: Firmenbetrag erscheint erst nach Wahl „Firma“ oder „Beides“", () => {
  const g = schritt("geld"); const s = ladenSchnell();
  assert.ok(!g.view(s).includes('data-f="rein-firma"'));
  g.aktion("rein-wer", { dataset: { wert: "selbst" } }, s); assert.ok(!g.view(s).includes('data-f="rein-firma"'));
  g.aktion("rein-wer", { dataset: { wert: "firma" } }, s); assert.ok(g.view(s).includes('data-f="rein-firma"'));
  assert.equal((g.view(s).match(/data-f="ks:/g) || []).length, 4, "vier Zahlenfelder");
});

// ---------- Kühlung ----------
test("Kühlung: Anzahl je Gerät, Art und Typ stimmen, Messungen bleiben beim Entfernen erhalten", () => {
  const s = ladenSchnell();
  kuehlAnzahlAendern(s, "kuehlschrank", 1); kuehlAnzahlAendern(s, "kuehlschrank", 1); kuehlAnzahlAendern(s, "tiefkuehler", 1); kuehlAnzahlAendern(s, "saladette", 1);
  const aktiv = s.kuehlstellen.filter((k) => !k.archiviert);
  assert.equal(aktiv.length, 4);
  assert.deepEqual(aktiv.map((k) => [k.typ, k.art]), [["kuehlschrank", "kuehl"], ["kuehlschrank", "kuehl"], ["tiefkuehler", "tk"], ["saladette", "kuehl"]]);
  assert.equal(aktiv[1].name, "Kühlschrank 2");
  s.messungen.push({ id: "m1", stelle: aktiv[1].id, wert: 5 });
  kuehlAnzahlAendern(s, "kuehlschrank", -1);
  assert.equal(s.kuehlstellen.find((k) => k.id === aktiv[1].id).archiviert, true, "mit Messung: archiviert statt gelöscht");
  kuehlAnzahlAendern(s, "tiefkuehler", -1);
  assert.ok(!s.kuehlstellen.some((k) => k.id === aktiv[2].id), "ohne Messung: gelöscht");
  schritt("kuehl-schnell").beimVerlassen(s); assert.equal(s.kuehl.eingerichtet, true);
});

test("Kühlung: alte Stellen ohne Typ werden nach Art zugeordnet", () => {
  assert.equal(kuehlTyp({ art: "tk" }), "tiefkuehler"); assert.equal(kuehlTyp({ art: "warm" }), "warmhalter"); assert.equal(kuehlTyp({ art: "kuehl" }), "kuehlschrank");
});

// ---------- „Was macht ihr selbst?“ ohne Frage ----------
test("Selbst gemacht: Vorauswahl nach Laden-Art wird beim Verlassen des Laden-Schritts still angewendet", () => {
  const s = ladenSchnell("doener");
  schritt("laden-schnell").beimVerlassen(s);
  assert.deepEqual([...s.selbst].sort(), [...vorauswahlFuer("doener")].sort());
  // Laden-Art geändert, keine eigene Antwort → neue Vorauswahl
  schritt("laden-schnell").aktion("laden-art", { dataset: { wert: "pizza" } }, s); schritt("laden-schnell").beimVerlassen(s);
  assert.deepEqual([...s.selbst].sort(), [...vorauswahlFuer("pizza")].sort());
  // eigene Antwort (im Büro geändert) bleibt
  s.selbst = []; assert.equal(selbstStandard(s), false); assert.deepEqual(s.selbst, []);
});

// ---------- Texte ----------
test("Texte schnell2: „?“-Erklärungen höchstens zwei Sätze", () => {
  for (const k of ["ladenHilfe", "karteHilfe", "kuehlHilfe", "geldHilfe"]) {
    const saetze = de.schnell2[k].split(/[.!?](\s|$)/).filter((x) => x && x.trim()).length;
    assert.ok(saetze <= 2, `${k}: ${saetze} Sätze`);
  }
});

// Baris 26.10.2026 („Ja“): Zeki begrüßt und stellt auf jedem Schritt die Frage selbst; Tipp auf Zeki = kurze Erklärung.
test("Zeki führt durch den Schnellweg: Begrüßung, Frage je Schritt, kein ?-Knopf mehr", async () => {
  const fs = await import("node:fs");
  const s = ladenSchnell();
  const hallo = schritt("sprache").view(s);
  assert.match(hallo, /s2zeki-intro/); assert.match(hallo, new RegExp(de.schnell2.zeki.hallo.replace(/[!?.]/g, ".")));
  for (const id of ["laden-schnell", "karte-foto", "kuehl-schnell", "geld"]) {
    const html = schritt(id).view(s);
    assert.match(html, /class="s2zeki-figur zeki-lebt"/, id);
    assert.ok(!html.includes("s2fragezeichen"), id);
    assert.ok(de.schnell2.zeki[id], id);
    assert.ok(de.schnell2.zeki[id].split(/\s+/).length <= 10, `${id}: Zeki-Satz höchstens 10 Wörter`);
  }
  assert.match(schritt("fertig-schnell").view(s), /zeki/);
  for (const f of fs.readdirSync(new URL("../js/lang/", import.meta.url))) {
    const t = (await import(`../js/lang/${f}`)).default;
    for (const k of ["hallo", "rolle", "laden-schnell", "karte-foto", "kuehl-schnell", "geld", "fertig"]) assert.ok(t.schnell2?.zeki?.[k], `${f}: schnell2.zeki.${k}`);
  }
});
