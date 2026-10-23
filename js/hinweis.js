// Hinweis-Karten im Büro (Vertrag docs/vertraege.md Abschnitt 2, Zoro 23.10.2026).
// Allgemeine Hinweise aus dem Steuer-Register (Franky, 22.10.2026), ausgelöst durch Daten, die die App ohnehin hat.
// Keine Einzelfallberatung, keine Ersparnis-Rechnung (§ 5 StBerG). Die App zeigt nur Karten mit geprueft: true –
// das setzt Zoro erst nach Prüfung an der Primärquelle (Quellenprüfung 24.10.2026). Bis dahin ist die Liste in der App leer.
// Rein: schreibt nur über hinweisStatusSetzen in stand.betrieb.hinweise (Bereich betrieb).
import { SCHWUND_ARTEN } from "./engine.js";

export const HINWEIS_STATUS = ["neu", "erledigt", "spaeter"];
export const KNOPF = "Belege bereitlegen";

// Auslöser: nur aus vorhandenen App-Daten (Vertrag). Jede Funktion liefert true/false, nie einen Betrag.
export const AUSLOESER = {
  mitarbeiter: (s) => (s.personen || []).some((p) => p && p.aktiv !== false && !p.entfernt),
  personalessen: (s) => (s.schwund || []).some((e) => e && !e.storniert && SCHWUND_ARTEN[e.art] === 2),
  menue: (s) => (s.kassenKombis || []).some((k) => k && (k.teile || []).length > 1),
  inventur: (s) => (s.inventuren || []).some((i) => i && i.abgeschlossen),
  abschluesse5: (s) => (s.abschluesse || []).filter((a) => a && !a.storniert).length >= 5,
  belege: (s) => (s.lieferungen || []).some((l) => l && !l.storniert) || (s.kostenbelege || []).some((k) => k && !k.storniert),
  manuell: () => true,
};

// Inhalt: Register-Einträge v1 (Franky 22.10.2026). geprueft bleibt false, bis Zoro die Primärquelle gelesen hat.
export const HINWEISE = [
  { id: "berufskleidung", titel: "Berufskleidung absetzen", satz: "Kochjacke, Schürze und Sicherheitsschuhe können Betriebsausgaben sein, normale Kleidung nicht. Belege sammeln und mit deinem Steuerberater klären.", quelle: "§ 4 Abs. 4, § 12 Nr. 1 EStG", gilt_fuer: "beide", spur: "hinten", versprechen: 3, ausloeser: "mitarbeiter", belege: ["Kochjacke", "Schürze", "Sicherheitsschuhe"], geprueft: false, register: "12.05" },
  { id: "personalessen", titel: "Personalessen erfassen", satz: "Kostenloses Essen fürs Personal zählt mit dem amtlichen Sachbezugswert. Mahlzeiten täglich erfassen und mit deinem Steuerberater klären.", quelle: "§ 2 SvEV, § 8 Abs. 2 EStG", gilt_fuer: "beide", spur: "hinten", versprechen: 3, ausloeser: "mitarbeiter", belege: ["Personalessen-Liste"], geprueft: false, register: "04.01" },
  { id: "menue_aufteilen", titel: "Menüs aufteilen", satz: "Menü mit Getränk: Speise 7 %, Getränk 19 %, aufgeteilt nach Einzelpreisen. Einzelpreise hinterlegen und mit deinem Steuerberater klären.", quelle: "UStAE 10.1 Abs. 11", gilt_fuer: "beide", spur: "vorne", versprechen: 1, ausloeser: "menue", belege: ["Preisliste"], geprueft: false, register: "01.03" },
  { id: "gwg", titel: "Kleine Geräte sofort", satz: "Geräte bis 800 € netto können im Kaufjahr voll abgesetzt werden. Rechnung aufheben und mit deinem Steuerberater klären.", quelle: "§ 6 Abs. 2 EStG", gilt_fuer: "beide", spur: "hinten", versprechen: 3, ausloeser: "belege", belege: ["Geräterechnung"], geprueft: false, register: "12.02" },
  { id: "belehrung", titel: "Belehrung absetzen", satz: "Gebühren für Hygienebelehrung und Schulungen sind Betriebsausgaben und Nachweis fürs Amt. Quittung in beide Ordner und mit deinem Steuerberater klären.", quelle: "§ 43 IfSG, § 4 Abs. 4 EStG", gilt_fuer: "beide", spur: "hinten", versprechen: 3, ausloeser: "mitarbeiter", belege: ["Belehrung Gesundheitsamt", "Schulung"], geprueft: false, register: "12.09" },
  { id: "aufbewahrung", titel: "Belege aufheben", satz: "Belege und Tagesabschlüsse müssen acht bis zehn Jahre lesbar bleiben. Monatspaket sichern und mit deinem Steuerberater klären.", quelle: "§ 147 AO", gilt_fuer: "beide", spur: "hinten", versprechen: 3, ausloeser: "abschluesse5", belege: ["Tagesabschluss", "Z-Bon"], geprueft: false, register: "03.01" },
  { id: "inventur_schwund", titel: "Schwund nachweisen", satz: "Erfasster Müll und Inventur belegen, dass fehlende Ware nicht verkauft wurde. Beides weiterführen und mit deinem Steuerberater klären.", quelle: "§ 162 AO, § 17 UStG", gilt_fuer: "beide", spur: "hinten", versprechen: 2, ausloeser: "inventur", belege: ["Müll-Liste", "Inventur"], geprueft: false, register: "06.01" },
];

export const hinweisMitId = (id) => HINWEISE.find((h) => h.id === id) || null;

function statusVon(stand, id) {
  const e = (stand.betrieb?.hinweise || []).find((x) => x && x.id === id);
  return HINWEIS_STATUS.includes(e?.status) ? e.status : "neu";
}

// Karten für den Büro-Bildschirm: nur geprüfte, ausgelöste, nicht erledigte. Reihenfolge: neu vor später, dann Register-Nummer.
export function hinweiseFuer(stand, { nurGeprueft = true, mitErledigt = false, betriebsart = null } = {}) {
  const out = [];
  for (const h of HINWEISE) {
    if (nurGeprueft && !h.geprueft) continue;
    if (betriebsart && h.gilt_fuer !== "beide" && h.gilt_fuer !== betriebsart) continue;
    const f = AUSLOESER[h.ausloeser] || AUSLOESER.manuell;
    if (!f(stand)) continue;
    const status = statusVon(stand, h.id);
    if (status === "erledigt" && !mitErledigt) continue;
    out.push({ ...h, knopf: KNOPF, status });
  }
  const rang = { neu: 0, spaeter: 1, erledigt: 2 };
  return out.sort((a, b) => rang[a.status] - rang[b.status] || String(a.register).localeCompare(String(b.register)));
}

export const hinweiseAnzahl = (stand, opt) => hinweiseFuer(stand, opt).filter((h) => h.status === "neu").length;

// Status setzen (einzige schreibende Funktion). Rückgabe true bei Änderung. Unbekannte Karte oder Status: false.
export function hinweisStatusSetzen(stand, id, status, { jetzt = new Date().toISOString() } = {}) {
  if (!hinweisMitId(id) || !HINWEIS_STATUS.includes(status)) return false;
  stand.betrieb ??= {}; stand.betrieb.hinweise ??= [];
  const e = stand.betrieb.hinweise.find((x) => x && x.id === id);
  if (e) { if (e.status === status) return false; e.status = status; e.zeit = jetzt; return true; }
  stand.betrieb.hinweise.push({ id, status, zeit: jetzt }); return true;
}

// Wächter für Tests und Regelprüfung: Satzlänge, Pflichtwörter, verbotene Wörter.
const VERBOTEN = /rechtssicher|steuersicher|betriebsprüfungsfest|gobd-konform|revolutionär|disruptiv|marktführer|ki-steuerberater|so sparst/i;
export function hinweisPruefen(h) {
  const fehler = [];
  const woerter = String(h.satz || "").trim().split(/\s+/).filter(Boolean).length;
  if (woerter > 25) fehler.push(`satz ${woerter} Wörter`);
  if (String(h.titel || "").trim().split(/\s+/).length > 4) fehler.push("titel > 4 Wörter");
  if (!/steuerberater klären/i.test(h.satz || "")) fehler.push("Steuerberater-Hinweis fehlt");
  if (VERBOTEN.test([h.titel, h.satz, h.quelle].join(" "))) fehler.push("verbotenes Wort");
  if (!h.quelle) fehler.push("quelle fehlt");
  if (!AUSLOESER[h.ausloeser]) fehler.push("auslöser unbekannt");
  if (!["doener", "burger", "beide"].includes(h.gilt_fuer)) fehler.push("gilt_fuer");
  return fehler;
}
