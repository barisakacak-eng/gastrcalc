// Geld-Eigenschaften: Cent-Rundung, Summen der Teile, Brutto/Netto. Seed fest, je >= 5000 Fälle.
import { property, ri, pick, cents, rund2, rng } from "./lib.mjs";
import * as E from "../js/engine.js";
import { umsatzAnzeigeWert, umsatzAusEingabe } from "../js/zaehler.js";
import { steuerTopf, ustImUmsatz } from "../js/steuertopf.js";
import { parseZahl, fmtEuro } from "../js/util.js";
import { liquiditaet } from "../js/liquiditaet.js";
import { schichtStunden, schichtZaehler } from "../js/schichten.js";
import { belege } from "../js/export_steuer.js";
const N = 6000; let fails = 0; const F = (...a) => { fails += property(...a); };
const cent = (x) => Math.round(x * 100);

console.log("== 1. Float-Drift: 1000 Buchungen à 0,10 EUR");
{ let s = 0; for (let i = 0; i < 1000; i++) s += 0.10; console.log("   Summe roh:", s, " Differenz zu 100:", s - 100, " exakt gleich 100?", s === 100);
  // über die App: Schwund-Einträge à 0,10 € (Feld wert) ->  schwundAuswertung.muellwert
  const stand = { schwund: Array.from({ length: 1000 }, (_, i) => ({ id: "x" + i, datum: "2026-11-05", art: "verderb", wert: 0.10, menge: 1, einheit: "stk" })), artikel: [], gerichte: [], kosten: [], team: {}, betrieb: {}, verkauf: {}, tagesnotizen: [] };
  const a = E.schwundAuswertung(stand, { von: "2026-11-01", bis: "2026-11-30" }); console.log("   schwundAuswertung.muellwert:", a.muellwert, "=== 100?", a.muellwert === 100);
  const st2 = { tagesnotizen: Array.from({ length: 31 }, (_, i) => ({ id: "t" + i, datum: `2026-10-${String(i + 1).padStart(2, "0")}`, umsatz: 0.10, erfasst: "2026-10-31T20:00:00Z", storniert: false })) };
  const u = E.umsatzZeitraum(st2, { von: "2026-10-01", bis: "2026-10-31" }); console.log("   umsatzZeitraum.summe (31 x 0,10):", u.summe, "=== 3.1?", u.summe === 3.1);
  let t = 0; for (let i = 0; i < 31; i++) t += 0.1; }

console.log("== 2. aufrunden10Cent: Ergebnis auf 10 Cent, nie unter dem Wert, Aufschlag < 10 Cent");
F("aufrunden10Cent (Cent-Beträge bis 100.000 EUR)", N, 11, (r) => { const b = cents(r, 10000000); const x = E.aufrunden10Cent(b); const c = cent(x.gerundet);
  if (c % 10 !== 0) return `brutto=${b} -> ${x.gerundet} nicht auf 10 Cent`; if (x.gerundet < b - 1e-9) return `brutto=${b} -> ${x.gerundet} UNTER dem Preis`; if (x.aufschlag >= 0.1 + 1e-9 || x.aufschlag < -1e-9) return `Aufschlag ${x.aufschlag} bei ${b}`; return null; });
F("aufrunden10Cent (unrunde Rechenwerte netto*(1+mwst))", N, 12, (r) => { const n = r() * 50; const m = pick(r, [0.07, 0.19]); const b = n * (1 + m); const x = E.aufrunden10Cent(b); if (x.gerundet < b - 1e-9) return `${b} -> ${x.gerundet}`; return cent(x.gerundet) % 10 ? `${b} -> ${x.gerundet} nicht auf 10 Cent` : null; });
F("aufrunden10Cent bei Großwerten >= 1e7 (Epsilon 1e-9 kleiner als Float-Abstand)", N, 13, (r) => { const b = 1e7 + ri(r, 0, 99999999) / 100; const x = E.aufrunden10Cent(b); return x.gerundet < b - 1e-9 || x.gerundet - b >= 0.1 + 1e-6 ? `${b} -> ${x.gerundet}` : null; });

console.log("== 3. Brutto <-> Netto");
F("nettoVonBrutto -> *(1+satz) ergibt dasselbe Brutto (ungerundet, Toleranz 1e-9)", N, 21, (r) => { const b = cents(r, 1e6), s = pick(r, [0, 0.07, 0.19]); const n = E.nettoVonBrutto(b, s); return Math.abs(n * (1 + s) - b) > 1e-9 ? `${b}/${s}` : null; });
F("Cent-Rundung: round2(netto) + round2(MwSt) == Brutto (Netto und MwSt einzeln gerundet, 7 %)", N, 22, (r) => { const b = cents(r, 100000); const n = E.nettoVonBrutto(b, 0.07); const ust = b * 0.07 / 1.07; return cent(rund2(n) + rund2(ust)) !== cent(b) ? `brutto ${b}: netto ${rund2(n)} + ust ${rund2(ust)} = ${rund2(n) + rund2(ust)}` : null; });
F("Cent-Rundung: round2(netto) + round2(MwSt) == Brutto (19 %)", N, 23, (r) => { const b = cents(r, 100000); const n = E.nettoVonBrutto(b, 0.19); const ust = b * 0.19 / 1.19; return cent(rund2(n) + rund2(ust)) !== cent(b) ? `brutto ${b}: netto ${rund2(n)} + ust ${rund2(ust)}` : null; });
F("umsatzAusEingabe(umsatzAnzeigeWert(b,'netto'),'netto') == b (Hin und zurück brutto->netto->brutto)", N, 24, (r) => { const b = cents(r, 300000), s = pick(r, [0.07, 0.19]); const n = umsatzAnzeigeWert(b, "netto", s); const back = umsatzAusEingabe(n, "netto", s); return cent(back) !== cent(b) ? `brutto ${b} -> netto ${n} -> brutto ${back}` : null; });

console.log("== 4. steuerTopf: Summe der Teile = Ganzes (Cent)");
const mkStand = (r, tage, satz) => ({ betrieb: { steuerSatz: satz, kleinunternehmer: false }, tagesnotizen: tage.map((d, i) => ({ id: "t" + i, datum: d, umsatz: cents(r, 300000), erfasst: "2026-11-30T20:00:00Z", storniert: false })), lieferungen: [], kostenbelege: [], kosten: [], gerichte: [], team: {}, verkauf: {}, artikel: [] });
const tageNov = Array.from({ length: 30 }, (_, i) => `2026-11-${String(i + 1).padStart(2, "0")}`);
F("steuerTopf: round2(ust7)+round2(ust19) == ust", N, 31, (r) => { const s = mkStand(r, tageNov.filter(() => r() < 0.8), pick(r, [0.07, 0.1, 0.13, 0.19])); const t = steuerTopf(s, "2026-11"); return cent(t.ust7 + t.ust19) !== cent(t.ust) ? `ust7 ${t.ust7} + ust19 ${t.ust19} = ${rund2(t.ust7 + t.ust19)} aber ust ${t.ust}` : null; });
F("steuerTopf: Summe Tages-ust == ust und Summe Tages-umsatz == umsatzBrutto", N, 32, (r) => { const s = mkStand(r, tageNov.filter(() => r() < 0.8), pick(r, [0.07, 0.1, 0.13, 0.19])); const t = steuerTopf(s, "2026-11"); const su = t.tage.reduce((a, x) => a + x.ust, 0), sm = t.tage.reduce((a, x) => a + x.umsatz, 0); return cent(su) !== cent(t.ust) || cent(sm) !== cent(t.umsatzBrutto) ? `Σust ${su} vs ${t.ust}; Σumsatz ${sm} vs ${t.umsatzBrutto}` : null; });
F("steuerTopf: Summe Tages-topf == zahllast (mit Vorsteuer-Belegen)", N, 33, (r) => { const s = mkStand(r, tageNov.filter(() => r() < 0.8), pick(r, [0.07, 0.19]));
  s.lieferungen = Array.from({ length: ri(r, 1, 6) }, (_, i) => { const n = cents(r, 80000) + 1; const u = rund2(n * 0.07); return { id: "l" + i, datum: pick(r, tageNov), erfasst: "2026-11-30T10:00:00Z", summeNetto: n, summeBrutto: rund2(n + u), zeilen: [{ netto: n, steuersatz: 0.07, artikel: "Ware" }], storniert: false }; });
  const t = steuerTopf(s, "2026-11"); const st = t.tage.reduce((a, x) => a + x.topf, 0); return cent(st) !== cent(t.zahllast) ? `Σtopf ${rund2(st)} vs zahllast ${t.zahllast}` : null; });

console.log("== 5. fixkostenJeGericht / mitSchwund / nettoPreis");
F("fixkostenJeGericht: Σ menge*k_i == K (Summe der Teile = Ganzes)", N, 41, (r) => { const g = Array.from({ length: ri(r, 1, 15) }, () => ({ menge: ri(r, 0, 3000) / 10, klasse: pick(r, ["getraenk", "kleinigkeit", "haupt", "gross", "x"]) })); const K = cents(r, 5000000); const f = E.fixkostenJeGericht(g, K); if (g.every((x) => !(x.menge > 0))) return f(g[0]) === null ? null : "kein null bei Menge 0"; const s = g.reduce((a, x) => a + x.menge * f(x), 0); return Math.abs(s - K) > 1e-6 * Math.max(1, K) ? `K=${K} Summe=${s}` : null; });
F("fixkostenJeGericht leere Liste -> null statt NaN", 1, 42, () => { const f = E.fixkostenJeGericht([], 1000); return f({}) === null ? null : "kein null"; });
F("nettoPreis: netto*(1-last) == Selbstkosten, nie negativ / NaN", N, 43, (r) => { const sk = cents(r, 100000), g = r() * 0.5, p = r() * 0.4; const x = E.nettoPreis(sk, g, p, { basis: pick(r, ["netto", "brutto", "unbekannt"]), mwst: pick(r, [0.07, 0.19]) }); if (x.netto === null) return x.stufe === "sperre" ? null : "null ohne Sperre"; return !Number.isFinite(x.netto) || x.netto < 0 || Math.abs(x.netto * (1 - x.last) - sk) > 1e-6 * Math.max(1, sk) ? `sk ${sk} g ${g} p ${p} -> ${x.netto}` : null; });
F("preisAmpel: gewinn == round2(netto) - round2(sk) und Quote endlich", N, 44, (r) => { const sk = cents(r, 5000), b = cents(r, 6000) + 0.01, m = pick(r, [0.07, 0.19]); const a = E.preisAmpel({ sk, mwst: m, waren: sk / 2 }, b); const soll = rund2(b / (1 + m)) - rund2(sk); return Math.abs(a.gewinn - soll) > 1e-9 || !Number.isFinite(a.quote) ? `${a.gewinn} vs ${soll}` : null; });
F("rohmengeFuer / mitSchwund liefern bei Randwerten nie NaN, nie Infinity", N, 45, (r) => { const v = pick(r, [0, 0.5, 0.89, 0.8999999, 0.9, 1, 2, -1, NaN, "0,5", "abc", null, undefined, Infinity]); const a = E.rohmengeFuer(ri(r, 0, 5000) / 10, v), b = E.mitSchwund(ri(r, 0, 5000) / 10, v); const bad = (x) => x !== null && !Number.isFinite(x); return bad(a) || bad(b) ? `v=${v}: rohmenge ${a}, mitSchwund ${b}` : null; });
F("rohmengeFuer mit NEGATIVEM Garverlust (z. B. -1) ergibt weniger Rohware als Fertigware", N, 46, (r) => { const f = ri(r, 1, 1000); const x = E.rohmengeFuer(f, -ri(r, 1, 50) / 10); return x < f ? `fertig ${f} -> roh ${x}` : null; });

console.log("== 6. Eingaben (parseZahl) und Anzeige");
F("parseZahl(fmt) Hin und zurück: Euro-Text -> Zahl == Zahl", N, 51, (r) => { const v = cents(r, 9999999); const txt = v.toFixed(2).replace(".", ","); const back = parseZahl(txt); return back !== v ? `${txt} -> ${back}` : null; });
F("parseZahl mit Tausenderpunkt: '1.234,56' und '1,234.56'", N, 52, (r) => { const v = ri(r, 1000, 9999999) / 100; const de = new Intl.NumberFormat("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2, useGrouping: true }).format(v); const en = new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v); const a = parseZahl(de), b = parseZahl(en); return a !== v || b !== v ? `de ${de}->${a}; en ${en}->${b}` : null; });
F("parseZahl: nie NaN/Infinity/negativ bei beliebigem Text", N, 53, (r) => { const al = "0123456789.,-+eE€% abc٣"; let s = ""; for (let i = ri(r, 0, 9); i > 0; i--) s += al[ri(r, 0, al.length - 1)]; const x = parseZahl(s); return x !== null && (!Number.isFinite(x) || x < 0 || x > 1e7) ? `"${s}" -> ${x}` : null; });
console.log("   Kenntnisse (Eingabe-Mehrdeutigkeit):", ["3,5", "3.5", "3.500", "1.500", "2.250", "0,10", "1e3", "-5", "", "12,", ",5", "1,234", "1.234.567"].map((s) => `"${s}"->${parseZahl(s)}`).join("  "));
F("fmtEuro/fmtZahl bei Randwerten: nie 'NaN'/'Infinity'", N, 54, (r) => { const v = pick(r, [0, -0, 1e21, -1e21, Number.MAX_VALUE, 1e-12, NaN, Infinity, "3,5", null, undefined]); const t = fmtEuro(v, { dezimal: ri(r, 0, 2) }); return /NaN|Infinity|∞/.test(t) ? `${v} -> ${t}` : null; });

console.log("== 7. liquiditaet (Cent-Ganzzahlen)");
F("liquiditaet: Endstand == Start + Σ Buchungen (Cent-genau)", N, 61, (r) => { const posten = Array.from({ length: ri(r, 0, 8) }, () => ({ betrag: (r() < 0.5 ? -1 : 1) * cents(r, 500000), datum: `2026-11-${String(ri(r, 1, 30)).padStart(2, "0")}` })); const start = cents(r, 1000000); const x = liquiditaet({ start, ab: "2026-11-01", wochen: 8, posten }); const soll = Math.round(start * 100) + posten.reduce((a, p) => a + Math.round(p.betrag * 100), 0); return Math.round(x.ende * 100) !== soll ? `${x.ende} vs ${soll / 100}` : null; });
F("liquiditaet: Posten mit Text-/leerem Betrag vergiftet NICHT die ganze Prognose (NaN)", 1000, 62, (r) => { const bad = pick(r, ["12,5", "abc", undefined, null, NaN]); const x = liquiditaet({ start: 1000, ab: "2026-11-01", posten: [{ betrag: bad, datum: "2026-11-03" }, { betrag: -100, datum: "2026-11-04" }] }); return !Number.isFinite(x.ende) || !x.tage.every((t) => Number.isFinite(t.stand)) ? `betrag=${String(bad)} -> ende ${x.ende}, reicht ${x.reicht}` : null; });
F("liquiditaet: Monatsposten am 29./30./31. werden in kurzen Monaten gebucht", 3, 63, (r, i) => { const tag = [29, 30, 31][i]; const x = liquiditaet({ start: 0, ab: "2027-02-01", wochen: 8, posten: [{ betrag: -1000, tagImMonat: tag }] }); const n = x.tage.filter((t) => t.raus > 0).length; const monate = new Set(x.tage.map((t) => t.datum.slice(0, 7))).size; return n < monate - (i === 0 ? 1 : 0) ? `tagImMonat ${tag}: ${n} Buchungen in ${monate} Monaten (Feb 2027: ${x.tage.filter((t) => t.datum.startsWith("2027-02") && t.raus > 0).length})` : null; });

console.log("== 8. Schichten (§ 3b-Zähler)");
F("schichtZaehler: gesamt == schichtStunden, Nacht-Anteile <= gesamt", N, 71, (r) => { const hh = () => String(ri(r, 0, 23)).padStart(2, "0") + ":" + pick(r, ["00", "15", "30", "45"]); const von = hh(), bis = hh(); const d = schichtStunden(von, bis); const z = schichtZaehler("2026-11-" + String(ri(r, 1, 28)).padStart(2, "0"), von, bis); return d === null ? null : Math.abs(z.gesamt - d) > 0.011 || z.nacht25 + z.nacht40 > z.gesamt + 0.011 ? `${von}-${bis}: ${JSON.stringify(z)} vs ${d}` : null; });
console.log("   gleiche Zeiten 08:00-08:00 ->", schichtStunden("08:00", "08:00"), "Stunden;  00:00-24:00 ->", schichtStunden("00:00", "24:00"));
console.log("   Zeitumstellung 25.10.2026 22:00-06:00 (echt 9 h):", schichtZaehler("2026-10-24", "22:00", "06:00").gesamt, "h;  29.03.2026 22:00-06:00 (echt 7 h):", schichtZaehler("2026-03-28", "22:00", "06:00").gesamt, "h");

console.log("== 9. export_steuer.belege: Netto + USt7 + USt19 + Pfand == Brutto je Zeile");
F("belege() Lieferung mit 1-2 Sätzen und Pfand", N, 81, (r) => { const zl = Array.from({ length: ri(r, 1, 6) }, (_, i) => ({ artikel: "W" + i, name: "W" + i, netto: cents(r, 20000) + 0.01, steuersatz: pick(r, [0.07, 0.19]) })); const netto = rund2(zl.reduce((a, z) => a + z.netto, 0)); const ust = zl.reduce((a, z) => a + z.netto * z.steuersatz, 0); const pfand = r() < 0.3 ? cents(r, 2000) : 0; const brutto = rund2(netto + ust + pfand);
  const s = { lieferungen: [{ id: "l1", datum: "2026-11-05", erfasst: "2026-11-05T10:00:00Z", summeNetto: netto, summeBrutto: brutto, pfand, zeilen: zl, storniert: false }], kostenbelege: [] }; const b = belege(s, { von: "2026-11-01", bis: "2026-11-30" }); const z = b.zeilen[0]; if (z.hinweis) return null; const sum = (z.netto || 0) + (z.ust7 || 0) + (z.ust19 || 0) + (z.pfand || 0); return cent(sum) !== cent(z.brutto) ? `Zeile: ${z.netto}+${z.ust7}+${z.ust19}+${z.pfand}=${rund2(sum)} vs brutto ${z.brutto}` : null; });
F("belege() Kostenbeleg brutto/netto, 7 %/19 %", N, 82, (r) => { const satz = pick(r, [0.07, 0.19]); const k = { id: "k1", datum: "2026-11-05", erfasst: "2026-11-05T10:00:00Z", stelle: "energie", betrag: cents(r, 500000) + 0.01, basis: pick(r, ["brutto", "netto"]), satz, storniert: false }; const z = belege({ lieferungen: [], kostenbelege: [k] }, { von: "2026-11-01", bis: "2026-11-30" }).zeilen[0]; const ust = z.ust7 ?? z.ust19 ?? 0; return cent(z.netto + ust) !== cent(z.brutto) ? `${JSON.stringify({ n: z.netto, u: ust, b: z.brutto })}` : null; });
console.log(fails ? `\nGESAMT: ${fails} Eigenschaften verletzt` : "\nGESAMT: alle Eigenschaften erfüllt");
