// Etappe 6, Punkt 1 und 4: Müll-Zentrale und Menü-Zahlen
import test from "node:test";
import assert from "node:assert/strict";
import { leererBetrieb, leereWurzel } from "../js/store.js";
import { gerichtWeg, rohwareWeg, muellWoche, muellMonatVergleich, haeufigsteMuell } from "../js/muell.js";
import { menueZaehler, sicherungStufe } from "../js/screens/nav.js";

const laden = () => {
  const s = leererBetrieb(); s.phase = "app";
  s.gerichte = [{ id: "d", name: "Döner", klasse: "haupt", zeit: 4, preis: 7.5, steuer: 0.07, zutaten: [{ name: "Dönerspieß Kalb/Pute", menge: 180, einheit: "g" }] },
    { id: "p", name: "Pide", klasse: "haupt", zeit: 8, preis: 9, steuer: 0.07, zutaten: [{ name: "Pide-Teig", menge: 250, einheit: "g" }] },
    { id: "a", name: "Ayran", klasse: "getraenk", zeit: 0, preis: 2, steuer: 0.19, zutaten: [{ name: "Ayran", menge: 1, einheit: "stk" }] }];
  s.artikel = [{ name: "Dönerspieß Kalb/Pute", gruppe: "fleisch", einheit: "kg", packung: { menge: 10, einheit: "kg" }, preis: 80, preisBasis: "netto", benutzt: true },
    { name: "Tomaten", gruppe: "gemuese", einheit: "kg", packung: { menge: 6, einheit: "kg" }, preis: 12, preisBasis: "netto", benutzt: true },
    { name: "Pide-Teig", gruppe: "teig", einheit: "kg", packung: { menge: null, einheit: "kg" }, preis: null, benutzt: true }];
  return s;
};

test("Woche in der Tonne: Summe, kg, je Tag, Top 3 nach Euro, Storno zählt nicht", () => {
  const s = laden();
  gerichtWeg(s, s.gerichte[0], { datum: "2026-10-14", anzahl: 2 });
  rohwareWeg(s, s.artikel[1], { datum: "2026-10-12", menge: 1.5, einheit: "kg" });
  const x = gerichtWeg(s, s.gerichte[1], { datum: "2026-10-13" }); // ohne Preis
  gerichtWeg(s, s.gerichte[0], { datum: "2026-10-01" }); // außerhalb der 7 Tage
  const st = gerichtWeg(s, s.gerichte[0], { datum: "2026-10-14" }); st.storniert = true;
  const w = muellWoche(s, "2026-10-14");
  assert.equal(w.tage.length, 7); assert.equal(w.tage[6].datum, "2026-10-14");
  assert.ok(Math.abs(w.summe - (2 * 0.18 * 8 + 1.5 * 2)) < 1e-9, String(w.summe));
  assert.ok(Math.abs(w.kg - (0.36 + 1.5 + 0.25)) < 1e-9, String(w.kg));
  assert.equal(w.top[0].ref.name, "Tomaten"); assert.equal(w.top[w.top.length - 1].ohneWert, 1); assert.equal(x.wert, null);
});

test("Monatstonne: Vergleich nur mit Vormonatsdaten, bis zum selben Tag", () => {
  const s = laden();
  gerichtWeg(s, s.gerichte[0], { datum: "2026-10-05" });
  assert.equal(muellMonatVergleich(s, "2026-10-14").vormonat, null);
  gerichtWeg(s, s.gerichte[0], { datum: "2026-09-10", anzahl: 3 }); gerichtWeg(s, s.gerichte[0], { datum: "2026-09-20", anzahl: 5 });
  const v = muellMonatVergleich(s, "2026-10-14");
  assert.ok(Math.abs(v.vormonat - 3 * 1.44) < 1e-9); assert.ok(Math.abs(v.monat - 1.44) < 1e-9);
});

test("Kacheln: nach Häufigkeit, ohne Verlauf erst Gerichte, keine Getränke, höchstens 12", () => {
  const s = laden();
  let k = haeufigsteMuell(s, { datum: "2026-10-14" });
  assert.deepEqual(k.slice(0, 2).map((x) => x.name), ["Döner", "Pide"]); assert.ok(!k.some((x) => x.name === "Ayran"));
  rohwareWeg(s, s.artikel[1], { datum: "2026-10-12", menge: 1, einheit: "kg" }); rohwareWeg(s, s.artikel[1], { datum: "2026-10-13", menge: 1, einheit: "kg" });
  k = haeufigsteMuell(s, { datum: "2026-10-14" }); assert.equal(k[0].name, "Tomaten");
  for (let i = 0; i < 20; i++) s.gerichte.push({ id: "x" + i, name: "G" + i, klasse: "haupt", zutaten: [] });
  assert.equal(haeufigsteMuell(s, { datum: "2026-10-14" }).length, 12);
});

test("Menü-Zahlen: Einrichtung in Prozent, Sicherung „!“, roter Punkt ab 7 Tagen", () => {
  const s = laden(); const w = leereWurzel();
  const z = menueZaehler(s, w); assert.match(String(z.start), /%$/);
  w.letzteSicherung = new Date(Date.now() - 8 * 86400e3).toISOString();
  assert.equal(sicherungStufe(w).stufe, "rot"); const z2 = menueZaehler(s, w); assert.equal(z2.sicherung, "!"); assert.equal(z2.punkt, true);
});
