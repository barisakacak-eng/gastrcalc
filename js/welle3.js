// Welle 3 (Hochtouren 03.11.2026): Einstellungen und Laden-Anbindung der Rechenkerne für den Büro-Bildschirm „Geld & Finanzamt“
// (Bildpaket W3, Baris Ja 04.11.2026). Schreibt nur hier ins Laden-Objekt (Trennung Rechenwerk/Bildschirm).
// Felder: betrieb.ustRhythmus ("monat" | "quartal" | null), betrieb.dauerfrist (bool), betrieb.svLand (Land der Krankenkasse oder null),
//         chef.stundenMonat (Zahl), liquiditaet = { betrag, datum }.
import { heute } from "./util.js";
import { umsatzEintrag, fixkosten, monatsLast, tagPlus } from "./engine.js";
import { warenQuote } from "./zaehler.js";
import { steuerTopf, kleinunternehmer } from "./steuertopf.js";
import { pflichtTermine, ERINNERUNG_TAGE, lstRhythmusVorschlag } from "./fristen.js";
import { istPersonen } from "./rechtsform.js";
import { LAND_CODES } from "./feiertage.js";
import { liquiditaet, nachfragen } from "./liquiditaet.js";
import { plusMonate, wochentag } from "./zeit.js";
import { rund2 } from "./geld.js";

export function ustRhythmusSetzen(stand, w) { stand.betrieb.ustRhythmus = w === "monat" || w === "quartal" ? w : null; }
// Lohnsteuer-Anmeldung: Rhythmus nach § 41a Abs. 2 EStG, wird abgefragt (nie geraten). lstVorjahr = Lohnsteuer des Vorjahres in Euro, nur für den Vorschlag.
export function lstRhythmusSetzen(stand, w) { stand.betrieb.lstRhythmus = ["monat", "quartal", "jahr"].includes(w) ? w : null; }
export function lstVorjahrSetzen(stand, n) { stand.betrieb.lstVorjahr = Number.isFinite(n) && n >= 0 && n < 1e7 ? rund2(n) : null; }
export const lstVorschlag = (stand, tag = heute()) => lstRhythmusVorschlag(stand.betrieb?.lstVorjahr ?? NaN, tag);
// Einkommensteuer-Vorauszahlung: nur wer einen Bescheid hat, bekommt die vier Termine (§ 37 Abs. 3 EStG); nur Einzelunternehmen und Personengesellschaft.
export function estBescheidUmschalten(stand) { stand.betrieb.estBescheid = !stand.betrieb.estBescheid; }
export const estTermineAn = (stand) => istPersonen(stand) && !!stand.betrieb?.estBescheid;
export function dauerfristUmschalten(stand) { stand.betrieb.dauerfrist = !stand.betrieb.dauerfrist; }
export function chefStundenSetzen(stand, n) { stand.chef ??= {}; stand.chef.stundenMonat = Number.isFinite(n) && n > 0 && n <= 744 ? Math.round(n) : null; stand.chef.geaendert = new Date().toISOString(); } // Lauf 6, E5-Draht (3): Zeitstempel – beim Abgleich zweier Handys gilt der jüngere Wert (js/abgleich_felder.js, juengererWert)
// W3b (04.11.2026): Land, in dem die Krankenkasse sitzt (SV-Termin Mai 2027 hängt daran); null = weiß nicht → früherer Termin
export function svLandSetzen(stand, code) { stand.betrieb.svLand = LAND_CODES.includes(code) ? code : null; }
export function geldHeuteSetzen(stand, betrag, datum = heute()) { stand.liquiditaet = Number.isFinite(betrag) ? { betrag: rund2(betrag), datum, erfasst: new Date().toISOString() } : null; } // erfasst (E11, B2): beim Abgleich am selben Tag gewinnt die spätere Erfassung


// Pflichttermine der nächsten 60 Tage für diesen Laden
export function termineLaden(stand, ab = heute(), tage = 60) {
  return pflichtTermine(ab, tagPlus(ab, tage), { rhythmus: stand.betrieb?.ustRhythmus || null, dauerfrist: !!stand.betrieb?.dauerfrist,
    kleinunternehmer: kleinunternehmer(stand), personal: (stand.personen || []).some((p) => !p.entfernt), lstRhythmus: stand.betrieb?.lstRhythmus || null, est: estTermineAn(stand), landKasse: stand.betrieb?.svLand || null, land: stand.betrieb?.bundesland || "BW" });
}

// Lauf 3, Phase 6 (09.11.2026): Erinnerung auf Heute, 5 Tage vor einem Pflichttermin (ERINNERUNG_TAGE). Der früheste Termin, dessen Erinnerung
// erreicht ist und der noch nicht vorbei ist; sonst null. Die Oberfläche sagt einen Satz (Zeki), höchstens einmal am Tag.
export function fristErinnerungHeute(stand, tag = heute()) {
  const f = termineLaden(stand, tag, ERINNERUNG_TAGE).filter((x) => (x.erinnerung || x.datum) <= tag && x.datum >= tag); if (!f.length) return null;
  const datum = f[0].datum; return { datum, arten: [...new Set(f.filter((x) => x.datum === datum).map((x) => x.art))] }; // { datum, arten: ["est", "ust", …] }
}

// Liquidität 8 Wochen aus dem Laden (≈): Einnahmen = Schnitt der letzten 28 Tage mit Umsatz je Öffnungstag (Mo–Sa bzw. tageProWoche ab Montag),
// Ware wöchentlich am Montag (Umsatz × Warenquote ÷ 1 + USt ≈ brutto), feste Kosten am 1., Lohn am 28., Steuer-Topf des Vormonats am Termin der USt-VA.
// Alles Schätzung aus den eigenen Zahlen; ohne Eingabe „Geld heute“ keine Rechnung.
export function liquiditaetLaden(stand, H = heute()) {
  const e = stand.liquiditaet; if (!e || typeof e.betrag !== "number") return { fehlt: "geld", nachfragen: true };
  let summe = 0, n = 0; for (let i = 0; i < 28; i++) { const u = umsatzEintrag(stand, tagPlus(H, -i)); if (u && u.umsatz > 0) { summe += u.umsatz; n += 1; } }
  if (!n) return { fehlt: "umsatz", nachfragen: nachfragen(e, H) };
  const schnitt = summe / n; const tpw = Math.min(7, Math.max(1, Number(stand.betrieb?.tageProWoche) || 6));
  const offen = [1, 2, 3, 4, 5, 6, 0].slice(0, tpw); const q = warenQuote(stand).quote || 0;
  const fk = fixkosten(stand); const ml = monatsLast(stand, H);
  const posten = [{ betrag: schnitt, wochentage: offen }, { betrag: -(schnitt * tpw * q), wochentage: [1] }, { betrag: -(fk.gesamt || 0), tagImMonat: 1 }];
  if (ml.lohn) posten.push({ betrag: -ml.lohn, tagImMonat: 28 });
  if (!kleinunternehmer(stand) && stand.betrieb?.ustRhythmus) {
    for (const t of termineLaden(stand, e.datum, 56).filter((x) => x.art === "ust")) { const st = /^\d{4}-\d{2}$/.test(t.zeitraum) ? steuerTopf(stand, t.zeitraum) : null; if (st && st.zahllast > 0) posten.push({ betrag: -st.zahllast, datum: t.datum }); }
  }
  const l = liquiditaet({ start: e.betrag, ab: e.datum, posten });
  return { ...l, geschaetzt: true, nachfragen: nachfragen(e, H), schnitt: rund2(schnitt) };
}
export { plusMonate as monatPlus, wochentag };
