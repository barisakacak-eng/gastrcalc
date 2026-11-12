import { ri, pick, cents, rng } from "./lib.mjs";
import { beispielLaden } from "../js/beispiel.js";
import * as E from "../js/engine.js";
import * as Z from "../js/zaehler.js";
const V = beispielLaden("2026-11-11"); const H = "2026-11-10";
const zufall = (r) => { const s = structuredClone(V);
  for (const g of s.gerichte) { if (r() < 0.8) g.preis = ri(r, 100, 2500) / 100; g.mengeTag = r() < 0.6 ? ri(r, 1, 120) : null; g.klasse = pick(r, ["getraenk", "kleinigkeit", "haupt", "gross"]); g.zeit = ri(r, 0, 12); }
  s.team.lohnkosten = r() < 0.9 ? ri(r, 0, 20000) : null; s.team.eigenerLohn = r() < 0.5 ? ri(r, 0, 5000) : null; s.team.personen = ri(r, 0, 9); s.team.stundenProPerson = ri(r, 0, 200);
  for (const k of s.kosten) k.betrag = ri(r, 0, 800000) / 100; s.verkauf.zielgewinn = ri(r, 0, 60); s.betrieb.tageProWoche = ri(r, 1, 7); s.betrieb.monate = ri(r, 1, 12);
  if (r() < 0.3) s.verkauf.warenQuote = ri(r, 0, 95) / 100; if (r() < 0.2) s.verkauf.bestellungenTag = ri(r, 0, 500);
  for (const n of s.tagesnotizen) n.umsatz = r() < 0.9 ? cents(r, 400000) : 0; return s; };
const r = rng(107); let n = 0;
for (let i = 0; i < 4000 && n < 4; i++) { const s = zufall(r); const z = Z.zaehler(s, { datum: H }); const m = Z.monatsZiel(s, z, H); if (m.nullpunkt === null || z.provision > 0) continue;
  const kosten = z.kosten + (z.tageskostenPrognose || 0) * (z.gewichtZukunft || 0) + (z.muell || 0) + (z.muellPrognose || 0) + (z.schwund || 0); const nenner = (1 - Math.min(0.9, z.quoteEff)) / (1 + z.steuer); if (!(nenner > 0.02)) continue;
  const bleibt = z.bleibtVon(m.nullpunkt); if (Math.abs(bleibt - kosten) > 1e-6 * Math.max(1, kosten)) { n++; console.log({ quoteEff: z.quoteEff, quote: z.quote, stufe: z.stufe, steuer: z.steuer, pJB: z.provisionJeBrutto, kosten, bleibt, np: m.nullpunkt, nennerMZ: (1 - Math.min(0.9, z.quoteEff)) / (1 + z.steuer) - Math.min(0.3, z.provisionJeBrutto || 0), tpw: s.betrieb.tageProWoche, wq: s.verkauf.warenQuote }); } }
