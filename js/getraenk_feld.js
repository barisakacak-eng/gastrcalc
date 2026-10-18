// Getränke (18.10.2026): die Felder eines Getränks. Reine Funktionen, keine Oberfläche, keine Speicherung, kein Netz.
// Bewusst ohne Import aus engine.js oder verkauf.js – beide nutzen von hier den Schankverlust (sonst Kreis-Import).
//
// Vorgabe des Eigentümers (18.10.2026): Getränkegrößen gibt es von 0,2 bis 1,5 l, je nach Produkt; jede Gastronomie hat andere Lieferanten –
// nicht alle arbeiten mit Coca-Cola-Dosen, sondern teils mit Fritz-Kola oder mit offenen Getränken.
//
// Am GERICHT (was verkauft wird, klasse "getraenk"):   getraenk = { menge, gebinde, quelle, schankverlust }
//   menge          Größe bzw. Ausschankmenge in Litern (0,2–1,5 l üblich, frei 0,02–30 l) – Pflichtangabe nach § 13 PAngV auf Tafel und Aushang
//   gebinde        wie es über die Theke geht: dose | glas (Glasflasche) | pet (PET-Flasche) | offen (Glas, Ausschank) | becher | null (noch offen)
//   quelle         nur bei offenen Getränken: der Artikel (Großgebinde in Litern), aus dem ausgeschenkt wird – 1,0-/1,5-l-Flasche, Bag-in-Box, Fass
//   schankverlust  Anteil 0–0,5, Standard 0 (keine Branchenzahl – der Wirt trägt seinen Wert ein). Wirkt wie der Garverlust:
//                  gebraucht wird Ausschankmenge / (1 − Schankverlust) aus dem Großgebinde (Wareneinsatz, Soll-Verbrauch, Bestand, Bestellung).
// Am ARTIKEL (was gekauft wird, Warengruppe Getränke/Spirituosen): getraenk = { menge, gebinde, marke, pfand, lieferant }
//   menge          Inhalt einer Flasche/Dose in Litern (bei Großgebinden: die Flaschengröße, z. B. 1,5)
//   gebinde        dose | glas | pet | becher | box (Bag-in-Box/Postmix) | fass | null
//   marke          frei: „Fritz-Kola“, „Coca-Cola“, Hausmarke …  ·  lieferant frei (gilt im Bestellvorschlag, wenn noch kein Beleg einen nennt)
//   pfand          € je Flasche/Dose, nur zur Information: Pfand ist keine Ware (der Beleg führt ihn getrennt, js/beleg.js) und zählt nie im Wareneinsatz.
// Größe aus dem Namen („Cola 0,33 l“, „Ayran 0,2l“, „Wasser 1,5 L“, „Bier 500 ml“) liest nur die Migration (store.js) und ein Gericht, das noch
// kein Feld hat. Steht keine Menge im Namen, bleibt das Feld leer – die App rät nicht, das Büro zeigt einen Hinweis.

import { GETRAENK_EINKAUF } from "./data/katalog.js";

export const GEBINDE_VERKAUF = ["dose", "glas", "pet", "offen", "becher"];
export const GEBINDE_EINKAUF = ["dose", "glas", "pet", "becher", "box", "fass"];
export const GROSSGEBINDE = ["glas", "pet", "box", "fass"];           // daraus wird offen ausgeschenkt
export const GROESSEN = [0.2, 0.25, 0.3, 0.33, 0.4, 0.5, 1, 1.5];     // Auswahl im Büro (Vorgabe 0,2–1,5 l); frei bleibt jede Menge in MENGE_GRENZEN
export const MENGE_GRENZEN = [0.02, 30];                               // 2 cl Schnaps bis 30-l-Fass
export const SCHANKVERLUST_MAX = 0.5;
export const PFAND_MAX = 30;
const TEXT_MAX = 60;

const r4 = (x) => Math.round(x * 10000) / 10000;
const istObjekt = (x) => x && typeof x === "object" && !Array.isArray(x);
export const istGetraenkGericht = (g) => g?.klasse === "getraenk";
export const istGetraenkArtikel = (a) => a?.gruppe === "getraenk" || a?.gruppe === "spirituose";

// Liter aus Text: „0,33 l“, „0.5l“, „1,5 L“, „500 ml“, „20 cl“, „0,25 Liter“ → 0.33 / 0.5 / 1.5 / 0.5 / 0.2 / 0.25; sonst null
const MENGE_RE = /(\d+(?:[.,]\d+)?)\s*(ml|cl|liter|l)(?![a-zäöüß])/i;
export function literAusText(text) {
  const m = MENGE_RE.exec(String(text || "")); if (!m) return null;
  const zahl = Number(m[1].replace(",", ".")); if (!(zahl > 0)) return null;
  const e = m[2].toLowerCase(); const l = e === "ml" ? zahl / 1000 : e === "cl" ? zahl / 100 : zahl;
  return l >= MENGE_GRENZEN[0] - 1e-9 && l <= MENGE_GRENZEN[1] + 1e-9 ? r4(l) : null;
}
// „0,33 l“ (deutsche Schreibweise, auch auf der Tafel – Pflichtangabe) – bis 3 Nachkommastellen, ohne Nullen am Ende
export const literText = (l) => (typeof l === "number" && l > 0 ? `${String(r4(l)).replace(".", ",")} l` : "");
// Eingabe „0,4“, „0.4“, „0,4 l“, „400 ml“ → 0.4; leer → null; ungültig → undefined
export function literEingabe(wert) {
  const s = String(wert ?? "").trim(); if (!s) return null;
  if (/[a-z]/i.test(s)) { const l = literAusText(s); return l === null ? undefined : l; }
  const n = Number(s.replace(",", ".")); return Number.isFinite(n) && n >= MENGE_GRENZEN[0] - 1e-9 && n <= MENGE_GRENZEN[1] + 1e-9 ? r4(n) : undefined;
}

const menge = (x) => (typeof x === "number" && Number.isFinite(x) && x >= MENGE_GRENZEN[0] - 1e-9 && x <= MENGE_GRENZEN[1] + 1e-9 ? r4(x) : null);
const text = (x) => (typeof x === "string" ? x.trim().slice(0, TEXT_MAX) : "");
// Gericht: Felder prüfen – Ungültiges fällt weg (null / ""), schankverlust nur 0–0,5 und nur mit Großgebinde
export function getraenkGerichtSauber(x) {
  const o = istObjekt(x) ? x : {};
  const quelle = typeof o.quelle === "string" && o.quelle.trim() ? o.quelle.trim().slice(0, 120) : null;
  const v = typeof o.schankverlust === "number" && Number.isFinite(o.schankverlust) && o.schankverlust > 0 && o.schankverlust <= SCHANKVERLUST_MAX ? r4(o.schankverlust) : 0;
  return { menge: menge(o.menge), gebinde: GEBINDE_VERKAUF.includes(o.gebinde) ? o.gebinde : null, quelle, schankverlust: quelle ? v : 0 };
}
export function getraenkArtikelSauber(x) {
  const o = istObjekt(x) ? x : {};
  const pfand = typeof o.pfand === "number" && Number.isFinite(o.pfand) && o.pfand > 0 && o.pfand <= PFAND_MAX ? Math.round(o.pfand * 100) / 100 : null;
  return { menge: menge(o.menge), gebinde: GEBINDE_EINKAUF.includes(o.gebinde) ? o.gebinde : null, marke: text(o.marke), pfand, lieferant: text(o.lieferant) };
}
// Aus einem alten Feld „ausschank“ (Text, Tafel bis 18.10.2026) oder dem Namen – sonst null (nie raten)
const mengeAlt = (obj) => literAusText(obj?.name) ?? literAusText(obj?.ausschank);

// Migration (store.js): Gericht und Artikel bekommen ihr Getränke-Feld; vorhandene Angaben bleiben, fehlende Größe aus dem Namen.
// Idempotent: ein vorhandenes Feld wird nur geprüft, nicht neu aus dem Namen gelesen (der Wirt darf die Größe auch leeren).
export function getraenkGerichtMigrieren(g) {
  if (!istGetraenkGericht(g)) { if (g && "getraenk" in g) delete g.getraenk; return g; }
  g.getraenk = istObjekt(g.getraenk) ? getraenkGerichtSauber(g.getraenk) : getraenkGerichtSauber({ menge: mengeAlt(g) });
  delete g.ausschank; // Menütafel-Feld bis 18.10.2026 – steckt jetzt in getraenk.menge
  return g;
}
export function getraenkArtikelMigrieren(a) {
  if (!istGetraenkArtikel(a)) { if (a && "getraenk" in a) delete a.getraenk; return a; }
  a.getraenk = istObjekt(a.getraenk) ? getraenkArtikelSauber(a.getraenk) : getraenkArtikelSauber({ menge: literAusText(a.name), gebinde: GETRAENK_EINKAUF[a.name]?.gebinde }); // Katalog nennt das Gebinde
  return a;
}

// Lesen: das Feld, solange der Stand migriert ist; ein frisch angelegtes Gericht ohne Feld (vor dem nächsten Laden) wie bei der Migration
export const getraenkVon = (g) => (!istGetraenkGericht(g) ? null : istObjekt(g.getraenk) ? getraenkGerichtSauber(g.getraenk) : getraenkGerichtSauber({ menge: mengeAlt(g) }));
export const getraenkArtikelVon = (a) => (!istGetraenkArtikel(a) ? null : istObjekt(a.getraenk) ? getraenkArtikelSauber(a.getraenk) : getraenkArtikelSauber({ menge: literAusText(a.name), gebinde: GETRAENK_EINKAUF[a.name]?.gebinde }));
export const istOffen = (g) => !!getraenkVon(g)?.quelle;

// Schankverlust für eine Zutat des Gerichts: nur die Zutat aus dem Großgebinde (quelle) eines offenen Getränks, sonst 0
export function schankAnteil(g, zutatName) {
  const x = istGetraenkGericht(g) && istObjekt(g.getraenk) ? g.getraenk : null;
  if (!x || !x.quelle || x.quelle !== zutatName) return 0;
  const v = Number(x.schankverlust); return v > 0 && v <= SCHANKVERLUST_MAX ? v : 0;
}
// gebrauchte Menge aus dem Großgebinde: Ausschank / (1 − Verlust)
export const mitSchankverlust = (menge, v) => (v > 0 && v < 1 ? menge / (1 - v) : menge);
// Name für Tafel und Aushang (§ 13 PAngV): steht keine Menge im Namen, wird die Größe aus dem Feld angehängt („Ayran“ → „Ayran 0,25 l“)
export function nameMitMenge(g, name = g?.name) {
  const n = String(name || ""); const x = getraenkVon(g);
  return x?.menge && literAusText(n) === null ? `${n} ${literText(x.menge)}` : n;
}
