// Stufe 1 (17.10.2026): Haltbarkeit und Abverkauf. Reine Funktionen, keine Oberfläche, keine Speicherung (außer den Setzern unten), kein Netz.
// Belegzeilen tragen optional haltbar {art: "mhd"|"verbrauch", datum: "JJJJ-MM-TT"}. Mit dem laufenden Bestand (js/bestand.js) und dem
// Ø-Verbrauch (bedarfAm) rechnet die App je Lieferung mit Datum, wie viel bis zum Datum voraussichtlich NICHT verbraucht ist.
// FIFO: die älteste Lieferung wird zuerst verbraucht. Der Bestand heute steckt also in den jüngsten Lieferungen (von hinten aufgefüllt),
// was älter ist als alle Lieferungen, ist „ohne Datum“ und wird als Erstes verbraucht.
// Verbrauchsdatum: nur der Hinweis „nicht mehr verwenden ab …“ – NIE ein Abverkaufs-Vorschlag. MHD: Abverkaufs-Kandidat bis 7 Tage vor Ablauf.
// Außen steht nur ein Satz (haltbarUhrzeit), im Laden nichts.
import { EINHEITEN } from "./data/katalog.js";
import { kalkulation, tagPlus, wochentag } from "./engine.js";
import { bestandStand, bedarfAm, datumKurzDe } from "./bestand.js";
import { einkaufMengen, bedarfGericht } from "./verkauf.js";
import { heute, heuteGeschaeft } from "./util.js";
import { fmtEuro } from "./util.js";
import { tagGewicht } from "./zaehler.js";
import { t, artikelText } from "./i18n.js";
import { imTakt } from "./takt.js";
import { nameMitMenge } from "./getraenk_feld.js"; // Getränke (18.10.2026): Aushang mit Ausschankmenge

export const HALTBAR_ARTEN = ["mhd", "verbrauch"];
export const ABVERKAUF_TAGE = 7;   // Stufe 1 (17.10.2026): MHD-Ware ist Abverkaufs-Kandidat, wenn sie in höchstens 7 Tagen abläuft (Auftrag)
export const VORLAUF_TAGE = 7;     // Verbrauchsdatum: so weit voraus zeigt „Läuft ab“ (Annahme Stufe 1)
export const RUECKBLICK_TAGE = 7;  // abgelaufene Ware mit Rest: so lange zurück wird noch erinnert, danach gilt sie als erledigt (Annahme)
// Stufe 1 (17.10.2026): Preisstufe für Aktionspreise. Die App rundet Zielpreise sonst nur auf 10 Cent (engine.js aufrunden10Cent);
// eine Regel ,00/,50/,90 gibt es nicht – deshalb wie im Auftrag 50-Cent-Schritte.
export const PREIS_SCHRITT = 0.5;
const DATUM = /^\d{4}-\d{2}-\d{2}$/;
const EPS = 1e-9;

// ---------- Artikel-Merkmal haltbarArt ----------
// Vorschlag je Ware (Annahme, keine Rechtsauskunft): rohes Hackfleisch, frisches Geflügel, roher Dönerspieß und frischer Fisch tragen
// meist ein Verbrauchsdatum, Konserven, Getränke, Trockenware und alles andere ein MHD. Gilt nur als änderbarer Vorschlag –
// maßgeblich ist, was auf der Packung steht.
const VERBRAUCH_FLEISCH = /hack|faschiert|döner|doener|gyros|spie(ß|ss)|adana|k(ö|oe)fte|h(ä|ae)hnchen|huhn|h(ü|ue)hn|gefl(ü|ue)gel|pute|chicken|ente\b|geschnetzelt|frischfleisch|karkasse/i;
const NICHT_FRISCH = /schinken|salami|wurst|w(ü|ue)rst|sucuk|nugget|patty|\btk\b|tiefk(ü|ue)hl|paniert|dose|konserve|gew(ü|ue)rz|sauce|so(ß|ss)e|br(ü|ue)he|fond/i;
const FISCH_HALTBAR = /thunfisch|sardelle|dose|konserve|\btk\b|tiefk(ü|ue)hl|st(ä|ae)bchen|surimi|paniert/i;
export function haltbarVorschlag(a) {
  const n = String(a?.name || "");
  if (a?.gruppe === "fleisch" && VERBRAUCH_FLEISCH.test(n) && !NICHT_FRISCH.test(n)) return "verbrauch";
  if (a?.gruppe === "fisch" && !FISCH_HALTBAR.test(n)) return "verbrauch";
  return "mhd";
}
export const haltbarArtVon = (a) => (HALTBAR_ARTEN.includes(a?.haltbarArt) ? a.haltbarArt : haltbarVorschlag(a));
// Für store.js (Migration): nur gültige Angaben bleiben, sonst null
export function haltbarSauber(h) {
  if (!h || typeof h !== "object" || !HALTBAR_ARTEN.includes(h.art) || typeof h.datum !== "string" || !DATUM.test(h.datum)) return null;
  return { art: h.art, datum: h.datum, ...(typeof h.erfasst === "string" ? { erfasst: h.erfasst } : {}) };
}

// Haltbarkeit von Belegzeilen setzen: angaben = { zeilenIndex: { art, datum } | null (= entfernen) }. Der Beleg wird als NEUES Objekt
// eingesetzt (Journal-Regel in store.js: geänderte Einträge sind neue Objekte, dann wird sofort gespeichert). Merkt die Art am Artikel,
// wenn sie vom Vorschlag abweicht (gilt dann als Vorschlag beim nächsten Beleg). Rückgabe: der neue Beleg oder null (nichts geändert).
export function haltbarSetzen(stand, lieferungId, angaben, { jetzt = new Date().toISOString() } = {}) {
  const k = (stand.lieferungen || []).findIndex((x) => x.id === lieferungId); const l = stand.lieferungen?.[k];
  if (!l || l.storniert) return null;
  let zeilen = null;
  for (const [i, wert] of Object.entries(angaben || {})) {
    const z = l.zeilen?.[Number(i)]; if (!z) continue;
    const alt = haltbarSauber(z.haltbar);
    if (wert === null) { if (!z.haltbar) continue; zeilen ??= l.zeilen.slice(); const { haltbar: _weg, ...rest } = z; zeilen[Number(i)] = rest; continue; }
    const h = haltbarSauber({ ...wert, erfasst: jetzt }); if (!h || (alt && alt.art === h.art && alt.datum === h.datum)) continue;
    zeilen ??= l.zeilen.slice(); zeilen[Number(i)] = { ...z, haltbar: h };
    const a = z.artikel ? (stand.artikel || []).find((x) => x.name === z.artikel) : null;
    if (a) { if (h.art === haltbarVorschlag(a)) delete a.haltbarArt; else a.haltbarArt = h.art; }
  }
  if (!zeilen) return null;
  const neu = { ...l, zeilen }; stand.lieferungen[k] = neu; return neu;
}

// ---------- Hilfen ----------
const tageZwischen = (von, bis) => Math.round((Date.parse(bis + "T12:00:00Z") - Date.parse(von + "T12:00:00Z")) / 86400e3);
// Menge einer Belegzeile in der Grundeinheit – über einkaufMengen (js/verkauf.js), keine eigene Umrechnung. null = Menge unklar.
function zeileMenge(l, z) {
  const e = einkaufMengen({ lieferungen: [{ datum: l.datum, zeilen: [z] }] }, { von: l.datum, bis: l.datum })[z.artikel];
  return e && !e.unklar && e.menge > 0 ? { menge: e.menge, basis: e.basis } : null;
}
// Verbrauch von `start` bis einschließlich `bis` (Ø je Öffnungstag, Wochentage und Ruhetage wie im Bestand). null = Verbrauch unbekannt.
export function verbrauchBis(stand, s, start, bis) {
  if (!s || s.schnitt === null || s.schnitt === undefined) return null;
  if (bis < start || !(s.schnitt > 0)) return 0;
  let summe = 0; for (let d = start; d <= bis; d = tagPlus(d, 1)) summe += bedarfAm(stand, s, d).menge;
  return summe;
}

// ---------- 1. Chargen je Ware (FIFO) ----------
// Rückgabe je Ware mit mindestens einer Lieferung mit Datum: { name, basis, bestand, ohneDatum, chargen: [{ lieferung, zeile, geliefert, haltbar, menge, jetzt, rest, … }] }
export function chargenStand(stand, { heuteTag = heuteGeschaeft(), bs = bestandStand(stand, { heuteTag }) } = {}) {
  const jeWare = new Map();
  for (const l of stand.lieferungen || []) {
    if (l.storniert || typeof l.datum !== "string" || l.datum > heuteTag) continue;
    (l.zeilen || []).forEach((z, i) => {
      if (!z?.artikel) return; const m = zeileMenge(l, z);
      const c = { lieferung: l.id, zeile: i, geliefert: l.datum, erfasst: String(l.erfasst || ""), haltbar: haltbarSauber(z.haltbar), menge: m?.menge ?? null, basis: m?.basis || null };
      const liste = jeWare.get(z.artikel) || []; liste.push(c); jeWare.set(z.artikel, liste);
    });
  }
  const idx = Object.fromEntries((stand.artikel || []).map((a) => [a.name, a]));
  const waren = [];
  for (const [name, liste] of jeWare) {
    if (!liste.some((c) => c.haltbar && c.haltbar.datum >= tagPlus(heuteTag, -RUECKBLICK_TAGE))) continue; // nur Waren mit (jüngerem) Datum
    const a = idx[name]; if (!a || a.herkunft === "selbst") continue;
    liste.sort((x, y) => x.geliefert.localeCompare(y.geliefert) || x.erfasst.localeCompare(y.erfasst) || x.zeile - y.zeile);
    const w = bs.waren?.find((x) => x.name === name) || null;
    const bestand = w ? w.bestand : null;
    const s = w ? { schnitt: w.schnitt, jeWochentag: w.jeWochentag } : null;
    // Bestand von der jüngsten Lieferung her verteilen (FIFO: was noch da ist, kam zuletzt)
    let rest = bestand;
    for (let k = liste.length - 1; k >= 0; k--) { const c = liste[k]; if (rest === null || c.menge === null) { c.jetzt = null; continue; } c.jetzt = Math.min(c.menge, rest); rest -= c.jetzt; }
    const ohneDatum = rest === null ? null : Math.max(0, rest);
    // Verbrauch: zuerst „ohne Datum“, dann die Lieferungen der Reihe nach
    let vorher = ohneDatum;
    for (const c of liste) {
      if (c.haltbar) {
        const v = verbrauchBis(stand, s, bs.start || heuteTag, c.haltbar.datum);
        c.verbrauch = v;
        c.rest = c.jetzt === null || vorher === null ? null : v === null ? c.jetzt : Math.min(c.jetzt, Math.max(0, vorher + c.jetzt - v));
        c.verbrauchUnbekannt = v === null;
      }
      vorher = vorher === null || c.jetzt === null ? null : vorher + c.jetzt;
    }
    waren.push({ name, basis: w?.basis || liste.find((c) => c.basis)?.basis || EINHEITEN[a.packung?.einheit || a.einheit]?.basis || null, bestand, ohneDatum, schnitt: s?.schnitt ?? null,
      preisJeBasis: w?.preisJeBasis ?? null, geschaetzt: !!w?.geschaetzt, sicherheit: w?.sicherheit || null, chargen: liste });
  }
  return { heute: heuteTag, start: bs.start || heuteTag, ohneInventur: !!bs.ohneInventur, waren };
}

// ---------- 2. Ablauf-Warnung ----------
// laeuftAb: Verbrauchsdatum (art "verbrauch") mit Rest > 0 oder unbekannt, von 7 Tagen zurück bis 7 Tage voraus; dazu MHD-Ware, die schon
//   abgelaufen ist und noch da sein dürfte („prüfen“, kein Abverkauf). kandidaten: MHD-Ware mit Rest > 0, Ablauf heute bis in 7 Tagen.
// Prüfgremium 17.10.2026 (2): Bestand und Verbrauch rechnen mit dem Geschäftstag (heuteTag, bis 4 Uhr = Vortag), das Datum auf der Packung
// ist ein Kalendertag – „vorbei/heute/morgen“ zählt deshalb ab dem Kalendertag (kalenderTag). Um 01:30 ist Freitags-Ware schon vorbei.
// Ohne Angabe: Kalendertag = heute, wenn heuteTag der laufende Geschäftstag ist, sonst = heuteTag (fester Tag, z. B. in Tests).
const kalenderVon = (heuteTag, kalenderTag) => kalenderTag || (heuteTag === heuteGeschaeft() ? heute() : heuteTag);
export function haltbarStand(stand, { heuteTag = heuteGeschaeft(), kalenderTag = null } = {}) {
  const k = kalenderVon(heuteTag, kalenderTag);
  return imTakt(stand, "haltbar:" + heuteTag + "|" + k, () => haltbarRechnen(stand, heuteTag, k));
}
function haltbarRechnen(stand, heuteTag, kalenderTag = heuteTag) {
  const cs = chargenStand(stand, { heuteTag });
  const laeuftAb = [], kandidaten = [];
  for (const w of cs.waren) for (const c of w.chargen) {
    if (!c.haltbar) continue;
    const tage = tageZwischen(kalenderTag, c.haltbar.datum); if (tage < -RUECKBLICK_TAGE) continue;
    const wert = c.rest !== null && w.preisJeBasis !== null ? c.rest * w.preisJeBasis : null;
    const e = { name: w.name, art: c.haltbar.art, ablauf: c.haltbar.datum, tage, rest: c.rest, basis: w.basis, wert, geschaetzt: w.geschaetzt, verbrauchUnbekannt: !!c.verbrauchUnbekannt,
      lieferung: c.lieferung, zeile: c.zeile, geliefert: c.geliefert, ab: tagPlus(c.haltbar.datum, 1) };
    if (c.haltbar.art === "verbrauch") { if (tage <= VORLAUF_TAGE && (c.rest === null || c.rest > EPS)) laeuftAb.push({ ...e, status: tage < 0 ? "vorbei" : "verbrauchen" }); continue; }
    if (!(c.rest > EPS)) continue; // MHD ohne Rest oder Rest unbekannt: nichts zu tun
    if (tage < 0) laeuftAb.push({ ...e, status: "mhdVorbei" });
    else if (tage <= ABVERKAUF_TAGE) kandidaten.push(e);
  }
  laeuftAb.sort((a, b) => a.ablauf.localeCompare(b.ablauf) || a.name.localeCompare(b.name, "de"));
  kandidaten.sort((a, b) => a.ablauf.localeCompare(b.ablauf) || (b.wert ?? 0) - (a.wert ?? 0));
  const k = (stand.gerichte || []).length ? kalkulation(stand) : { zeilen: [] };
  const abverkauf = kandidaten.map((x) => { const v = abverkaufVorschlaege(stand, x, { k }); return { ...x, vorschlaege: v, bester: v.find((y) => y.art === "aktion") || null }; });
  return { heute: heuteTag, kalenderTag, start: cs.start, ohneInventur: cs.ohneInventur, laeuftAb, abverkauf };
}

// ---------- 3. Abverkaufs-Vorschlag ----------
// Für eine MHD-Ware mit Rest R (Grundeinheit) und Wert V (R × Einkaufspreis netto) bis Datum d, je Gericht, das die Ware nutzt:
//   Portionen N = ⌈R / Menge je Portion⌉
//   Nachlass: höchstens so viel, wie die Ware sonst kostet – N × (Preis netto − Aktionspreis netto) ≤ V
//   Untergrenze: Aktionspreis netto ≥ Wareneinsatz des Gerichts (kein Verkauf unter Einkauf)
//   Aktionspreis brutto = max(beides) × (1 + USt), aufgerundet auf 50 Cent. Liegt er nicht unter dem Kartenpreis: kein Vorschlag (lohnt nicht).
//   Vergleich mit Wegwerfen (Annahme: die Aktion bringt N zusätzliche Portionen): Ergebnis = N × (Aktionspreis netto − Wareneinsatz) + V
//   (die Ware ist schon bezahlt; ohne Aktion gehen V verloren).
export const preisStufeAuf = (x, schritt = PREIS_SCHRITT) => Math.ceil(x / schritt - EPS) * schritt;
export const preisStufeNah = (x, schritt = PREIS_SCHRITT) => Math.round(x / schritt) * schritt;
export function abverkaufVorschlaege(stand, kandidat, { k = kalkulation(stand), idx = Object.fromEntries((stand.artikel || []).map((a) => [a.name, a])) } = {}) {
  const out = []; const R = kandidat.rest, V = kandidat.wert;
  if (!(R > EPS)) return out;
  const zeilen = new Map(k.zeilen.map((z) => [z.id, z]));
  for (const g of stand.gerichte || []) {
    const m = bedarfGericht(g, idx).bedarf.filter((x) => x.name === kandidat.name).reduce((s, x) => s + x.menge, 0);
    if (!(m > EPS)) continue;
    const z = zeilen.get(g.id); const P = z?.preisBrutto ?? null;
    const basis = { gericht: g.id, name: g.name, aushang: nameMitMenge(g, kurzName(g.name)), jePortion: m, portionen: Math.ceil(R / m - EPS), preis: P, bis: kandidat.ablauf, ware: kandidat.name };
    if (!(P > 0)) { out.push({ ...basis, art: "ohnePreis" }); continue; }
    if (z.waren === null) { out.push({ ...basis, art: "ohneWareneinsatz" }); continue; }
    if (V === null) { out.push({ ...basis, art: "ohneEinkaufspreis" }); continue; }
    const N = basis.portionen, mwst = z.mwst, Pnet = P / (1 + mwst), w = z.waren;
    const untergrenze = Math.max(w, Pnet - V / N);
    const A = Math.round(preisStufeAuf(untergrenze * (1 + mwst)) * 100) / 100;
    const geschaetzt = !!(kandidat.geschaetzt || z.warenGeschaetzt);
    if (A >= P - EPS) { out.push({ ...basis, art: "lohntNicht", geschaetzt, verlust: V }); continue; }
    const Anet = A / (1 + mwst);
    out.push({ ...basis, art: "aktion", aktionspreis: A, nachlass: P - A, nachlassGesamtNetto: N * (Pnet - Anet), rohertragJePortion: Anet - w, wareneinsatz: w,
      verlust: V, vorteil: N * (Anet - w) + V, geschaetzt, untergrenzeWare: untergrenze === w });
  }
  // zuerst die echten Aktionen, darin die mit den wenigsten Portionen (schaffbar), dann das bessere Ergebnis
  const rang = { aktion: 0, lohntNicht: 1, ohneWareneinsatz: 2, ohnePreis: 3, ohneEinkaufspreis: 4 };
  return out.sort((a, b) => rang[a.art] - rang[b.art] || a.portionen - b.portionen || (b.vorteil ?? 0) - (a.vorteil ?? 0) || a.name.localeCompare(b.name, "de"));
}
// Text zum Teilen (Aushang/WhatsApp-Status) – auf Deutsch wie der Bestelltext, Gerichtname wie auf der Karte
export const abverkaufText = (v) => `${v.aushang || kurzName(v.name)} nur ${fmtEuro(v.aktionspreis, { dezimal: 2 })} statt ${fmtEuro(v.preis, { dezimal: 2 })} – bis ${datumKurzDe(v.bis)}`;
export const kurzName = (n) => String(n || "").replace(/\s*\([^)]*\)\s*$/, "").trim(); // „Pommes frites (Beilage)“ → „Pommes frites“

// ---------- 4. „Die Uhrzeit“ ----------
// Höchstens EIN Satz für den Büro-Hinweis. Reihenfolge: Verbrauchsdatum heute/morgen/vorbei (rot) → lohnende Aktion (gelb) →
// Verbrauchsdatum in 2–3 Tagen (gelb) → MHD vorbei (gelb). Im Laden steht nichts.
export const wtKurz = (iso) => { const l = t("aktionen.wt"); return (Array.isArray(l) && l[wochentag(iso)]) || iso.slice(5); };
export const datumKurz = (iso) => (typeof iso === "string" && /^\d{4}-\d{2}-\d{2}$/.test(iso) ? `${wtKurz(iso)} ${iso.slice(8, 10)}.${iso.slice(5, 7)}.` : ""); // „Mo 20.10.“ in der Sprache der App; Prüfgremium 18.10.2026 (H1): ohne Datum leer statt Absturz
// Prüfgremium 17.10.2026 (4): Letzter Öffnungstag bis zum Ablauf (einschließlich). Ist der Ablauftag ein Ruhetag, muss die Ware vorher weg –
// „bis morgen“ wäre dann falsch. Gibt es keinen Öffnungstag dazwischen (heute zu, morgen Ablauf und zu), gilt heute.
export function letzterOffenTag(stand, von, ablauf) {
  for (let d = ablauf; d > von; d = tagPlus(d, -1)) if (tagGewicht(stand, d) > 0) return d;
  return von;
}
export function haltbarUhrzeit(stand, { heuteTag = heuteGeschaeft(), kalenderTag = null } = {}) {
  const hs = haltbarStand(stand, { heuteTag, kalenderTag }); const K = hs.kalenderTag || heuteTag;
  const ziel = { aktion: "nav", wert: "aktionen" }; const knopf = t("aktionen.uhr.knopf");
  const satz = (ton, text, art) => ({ id: "haltbar", art, ton, text, knopf, ziel });
  const verbrauch = hs.laeuftAb.filter((x) => x.art === "verbrauch");
  // Prüfgremium 17.10.2026 (3): abgelaufen heißt „nicht mehr verwenden“ – eigener Satz, Vorrang vor allem anderen
  const vorbei = verbrauch.filter((x) => x.tage < 0);
  if (vorbei.length > 1) return satz("rot", t("aktionen.uhr.vorbeiMehrere", vorbei.length), "verbrauch");
  if (vorbei.length === 1) return satz("rot", t("aktionen.uhr.vorbei", artikelText(vorbei[0].name)), "verbrauch");
  // Frist = letzter Öffnungstag bis zum Ablauf (Ruhetage zählen nicht als Verbrauchstag)
  const offen = verbrauch.map((x) => ({ ...x, frist: letzterOffenTag(stand, K, x.ablauf) })).map((x) => ({ ...x, fristTage: tageZwischen(K, x.frist) }));
  const dringend = offen.filter((x) => x.fristTage <= 1);
  if (dringend.length > 1) return satz("rot", dringend.some((x) => x.fristTage <= 0) ? t("aktionen.uhr.mehrereHeute", dringend.length) : t("aktionen.uhr.mehrere", dringend.length), "verbrauch");
  if (dringend.length === 1) { const x = dringend[0]; const n = artikelText(x.name);
    return satz("rot", x.fristTage <= 0 ? t("aktionen.uhr.heute", n) : t("aktionen.uhr.morgen", n), "verbrauch"); }
  const aktion = hs.abverkauf.find((x) => x.bester);
  if (aktion) return satz("gelb", t("aktionen.uhr.aktion", artikelText(aktion.name), wtKurz(aktion.ablauf)), "aktion");
  const bald = offen.find((x) => x.tage <= 3);
  if (bald) return satz("gelb", t("aktionen.uhr.bis", artikelText(bald.name), wtKurz(bald.frist)), "verbrauch");
  const mhd = hs.laeuftAb.find((x) => x.status === "mhdVorbei");
  if (mhd) return satz("gelb", t("aktionen.uhr.mhdVorbei", artikelText(mhd.name)), "mhd");
  return null;
}
