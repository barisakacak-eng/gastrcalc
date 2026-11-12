import { property, ri, pick, cents, rund2 } from "./lib.mjs";
import { schichtEintragen, schichtStunden, eintragStunden } from "../js/schichten.js";
import { dsfinvkLesen } from "../js/verkauf.js";
import * as E from "../js/engine.js";
import { heuteGeschaeft } from "../js/util.js";
let fails = 0; const F = (...a) => { fails += property(...a); };
console.log("== Schicht mit gleichem Beginn und Ende");
{ const st = { personen: [{ id: "p1" }], schichten: [] }; const e = schichtEintragen(st, { datum: "2026-11-05", person: "p1", von: "08:00", bis: "08:00" }); console.log("   schichtEintragen(08:00-08:00) ->", e ? `Eintrag angelegt, zählt ${schichtStunden(e.von, e.bis)} Stunden` : "abgelehnt"); }
console.log("== Geschäftstag hängt an der Zeitzone des Geräts (TZ=" + (process.env.TZ || "?") + "), Zeitpunkt 11.11.2026 01:30 UTC:", heuteGeschaeft(new Date("2026-11-11T01:30:00Z")));
console.log("== Schwund-Summen: Zeilen einzeln gerundet vs Summe gerundet (Muster export_steuer.js schwund())");
F("Σ round2(wert) == round2(Σ wert) bei 40 Müll-Einträgen mit Cent-Bruchteilen (Zutatenmengen)", 6000, 201, (r) => { const w = Array.from({ length: 40 }, () => ri(r, 1, 4000) / 1000); const a = rund2(w.reduce((s, x) => s + rund2(x), 0)), b = rund2(w.reduce((s, x) => s + x, 0)); return Math.abs(a - b) > 0.0051 ? `Zeilensumme ${a} vs Summe ${b}` : null; });
console.log("== DSFinV-K: Rabatt-Verteilung, Summe der Positionen == Summe der Bons (Cent)");
const enc = (t) => new TextEncoder().encode(t);
const dsf = (name, mitRabatt) => F(name, 3000, 301, (r) => { const L = ["Z_KASSE_ID;Z_ERSTELLUNG;Z_NR;BON_ID;POS_ZEILE;ARTIKELTEXT;GV_TYP;P_STORNO;ART_NR;MENGE;FAKTOR;EINHEIT;STK_BR"]; let soll = 0; const z = (n) => String(n).replace(".", ",");
  const bons = ri(r, 1, 6); for (let b = 1; b <= bons; b++) { let n = 0; const pos = ri(r, 1, 4); const betraege = []; for (let p = 1; p <= pos; p++) { const preis = ri(r, 50, 2500) / 100, menge = ri(r, 1, 4); betraege.push(preis * menge); L.push(`K1;2026-11-05T10:00:00+01:00;1;${b};${p};Artikel${ri(r, 1, 5)};Umsatz;0;${ri(r, 1, 5)};${menge};1;;${z(preis)}`); }
    soll += betraege.reduce((a, x) => a + x, 0); if (mitRabatt && r() < 0.5) { const rab = -ri(r, 1, 300) / 100; L.push(`K1;2026-11-05T10:00:00+01:00;1;${b};${pos + 1};Rabatt;Rabatt;0;;1;1;;${z(rab)}`); soll += rab; } }
  const x = dsfinvkLesen([{ name: "lines.csv", bytes: enc(L.join("\n")) }]); const ist = x.positionen.reduce((a, p) => a + (p.umsatzBrutto ?? 0), 0); return Math.abs(ist - soll) > 0.0051 ? `Positionen ${rund2(ist)} vs Bons ${rund2(soll)}` : null; });
dsf("DSFinV-K-Import OHNE Rabatt: Σ Positionen == Σ Zeilen", false); dsf("DSFinV-K-Import MIT Rabatt-Zeilen: Σ Positionen == Σ Zeilen + Rabatt", true);
console.log(fails ? `GESAMT: ${fails} verletzt` : "GESAMT: alle erfüllt");
