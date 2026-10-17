// Trennung 2 (17.10.2026): Texte aus Daten – Datum, Monat, Uhrzeit, Name/Menge eines Schwund-Eintrags, Gebinde-Satz, Bruchzahl.
// Rechnen nur aus den übergebenen Werten, kein HTML; die Sprache kommt aus i18n.js. Vorher in js/screens/tag.js, karte.js, inventur.js.
import { t, einheitLabel, sprache, artikelText } from "./i18n.js";
import { fmtZahl } from "./util.js";
import { gebindeKette } from "./engine.js";
import { ganzTeil } from "./inventur.js";

export function datumLesbar(iso) {
  const [j, m, d] = iso.split("-"); return `${d}.${m}.${j}`;
}
// Monatsname und Wochentag in der Sprache der App (für Zähler und Cockpit).
const LOCALE = { de: "de-DE", tr: "tr-TR", en: "en-GB", bs: "bs-BA", ku: "ku" }; // sonst gilt der Sprachcode selbst (ar, ru, vi …)
const loc = () => LOCALE[sprache()] || sprache();
const monatNamen = new Map(); // W2-D (Leistung): Monatsnamen je Sprache merken – das Formatieren kostet auf dem Handy spürbar
export function monatName(iso) { const [j, m] = iso.split("-").map(Number); const k = loc() + "|" + j + "-" + m; let n = monatNamen.get(k); if (n === undefined) { n = new Date(j, m - 1, 1).toLocaleDateString(loc(), { month: "long" }); monatNamen.set(k, n); } return n; }
export function tagLesbar(iso) { const [j, m, d] = iso.split("-").map(Number); return new Date(j, m - 1, d).toLocaleDateString(loc(), { weekday: "long", day: "numeric", month: "long" }); }
export const zeitKurz = (iso) => { const d = new Date(iso); if (Number.isNaN(d.getTime())) return "–"; return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`; };

// Name des Eintrags: zuerst der gemerkte Name (überlebt das Löschen des Gerichts), sonst aus der Karte.
export function eintragName(e, stand) {
  if (e.art === "eimer") return t("muell.eimer") + (e.ref?.name ? " " + e.ref.name : "");
  if (e.ref?.typ === "gericht") return stand.gerichte.find((g) => g.id === e.ref.id)?.name || e.ref.name || "?";
  return e.ref?.name ? artikelText(e.ref.name) : "?"; // Paket 6 (17.10.2026): Artikel in der aktiven Sprache, gespeichert bleibt Deutsch
}
export function eintragMenge(e) {
  if (e.art === "eimer") return t("tag.eimerZeile", fmtZahl(e.gewogen, 1), fmtZahl(e.menge, 1));
  if (e.ref?.typ === "gericht") return `${fmtZahl(e.menge, Number.isInteger(e.menge) ? 0 : 1)} ${t("tag.portionen")}`;
  return `${fmtZahl(e.menge, e.einheit === "stk" ? 0 : 2)} ${einheitLabel(e.einheit)}`;
}

// Gebinde in einem Satz („Karton mit 6 Flaschen à 1 l“) – Speisekarte/Einkaufspreise (vorher screens/karte.js).
const zahlKurz = (n) => new Intl.NumberFormat("de-DE", { maximumFractionDigits: 2 }).format(n);
export function gebindeSatz(a) {
  const k = gebindeKette(a); const art = t("gebinde.arten." + (k[0].art || "packung"));
  const einheit = einheitLabel(k[0].einheit);
  if (!k[0].inhalt) return art;
  return k[1] ? t("gebinde.satz", art, k[1].anzahl, t("gebinde.arten." + k[1].art), zahlKurz(k[1].inhalt), einheit) : t("gebinde.satz", art, null, null, zahlKurz(k[0].inhalt), einheit);
}
// Inventur-Fassung: Gebindeart aus der Inventurzeile, ohne Packungsinhalt nur die Art (vorher screens/inventur.js gebindeZeile).
export const gebindeName = (z) => t("gebinde.arten." + (z.gebinde || "packung"));
export function gebindeZeile(z) {
  const a = z.artikel; const art = gebindeName(z);
  if (!a || !(a.packung?.menge > 0)) return art;
  const k = gebindeKette(a);
  return k[1] ? t("gebinde.satz", art, k[1].anzahl, t("gebinde.arten." + k[1].art), zahlKurz(k[1].inhalt), einheitLabel(k[0].einheit)) : t("gebinde.satz", art, null, null, zahlKurz(k[0].inhalt), einheitLabel(k[0].einheit));
}

// 1,5 → „1 ½", 0,75 → „¾", null → „–" (vorher screens/inventur.js)
export const TEIL = { 0.25: "¼", 0.5: "½", 0.75: "¾" };
export function zahlText(v) {
  if (v === null || v === undefined) return "–";
  const { ganz, teil } = ganzTeil(v);
  if (!teil) return String(ganz);
  return ganz ? `${ganz} ${TEIL[teil]}` : TEIL[teil];
}
