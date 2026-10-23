// Hinweis-Karten im Büro (Vertrag docs/vertraege.md Abschnitt 2, Zoro 23.10.2026).
// Allgemeine Hinweise aus dem Steuer-Register (Franky, 22.10.2026, Quellenprüfung 23.10.2026), ausgelöst durch Daten, die die App ohnehin hat.
// Keine Einzelfallberatung, keine Ersparnis-Rechnung (§ 5 StBerG). Die App zeigt nur Karten mit geprueft: true –
// das setzt Zoro erst nach Prüfung an der Primärquelle. Jede Karte nennt die Quelle und das Prüfdatum.
// Rein: schreibt nur über hinweisStatusSetzen in stand.betrieb.hinweise (Bereich betrieb).
import { SCHWUND_ARTEN } from "./engine.js";
import { PERSONEN, passtZurRechtsform } from "./rechtsform.js"; // Rechtsform (23.10.2026)

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

// Inhalt: Register-Einträge (Franky) in einfacher Sprache. geprueft: true nur, wenn Zoro die Primärquelle gelesen hat (Datum in pruefung).
// Verboten: rechtssicher, steuersicher, GoBD-konform, „so sparst du“. Keine Beträge außer gesetzlichen Grenzen mit Quelle.
export const HINWEISE = [
  { id: "steuer_sieben", titel: "7 % auf Speisen", satz: "Seit 2026 gilt für Speisen 7 % Umsatzsteuer, für Getränke 19 %. Kasse so einstellen und mit deinem Steuerberater klären.", quelle: "§ 12 Abs. 2 Nr. 15 UStG", gilt_fuer: "beide", spur: "vorne", versprechen: 1, ausloeser: "abschluesse5", belege: ["Z-Bon", "Kassen-Einstellung"], rechtsformen: "alle", geprueft: true, pruefung: "2026-10-23 gesetze-im-internet.de, keine Befristung", register: "01.01" },
  { id: "menue_aufteilen", titel: "Menüs aufteilen", satz: "Menü mit Getränk: Speise 7 %, Getränk 19 %, aufgeteilt nach Einzelpreisen, nicht nach Wareneinsatz. Einzelpreise hinterlegen und mit deinem Steuerberater klären.", quelle: "BFH 22.01.2025 XI R 19/23, UStAE 10.1 Abs. 11", gilt_fuer: "beide", spur: "vorne", versprechen: 1, ausloeser: "menue", belege: ["Preisliste", "Menü-Preise"], rechtsformen: "alle", geprueft: true, pruefung: "2026-10-23 bundesfinanzhof.de über ZDH-Zusammenfassung", register: "01.03" },
  { id: "sachentnahme", titel: "Eigenes Essen pauschal", satz: "Was du selbst isst, zählt als Entnahme. Das Finanzamt nennt dafür feste Jahresbeträge, Kinder zählen halb. Monatlich buchen und mit deinem Steuerberater klären.", quelle: "BMF 23.12.2025, IV D 3 - S 1547/00006/007/021", gilt_fuer: "beide", spur: "hinten", versprechen: 3, ausloeser: "abschluesse5", belege: ["Pauschbeträge 2026"], rechtsformen: PERSONEN, geprueft: true, pruefung: "2026-10-23 BMF-PDF über IHK Darmstadt verlinkt, Werte über Abschrift geprüft", register: "04.02" },
  { id: "personalessen", titel: "Personalessen erfassen", satz: "Kostenloses Essen fürs Personal zählt als Lohn mit festem amtlichem Wert. Mahlzeiten täglich erfassen und mit deinem Steuerberater klären.", quelle: "§ 8 Abs. 2 EStG, § 2 SvEV", gilt_fuer: "beide", spur: "hinten", versprechen: 3, ausloeser: "mitarbeiter", belege: ["Personalessen-Liste"], rechtsformen: "alle", geprueft: true, pruefung: "2026-10-23 Gesetzestext, Werte stehen nicht auf der Karte", register: "04.01" },
  { id: "berufskleidung", titel: "Berufskleidung absetzen", satz: "Kochjacke, Schürze und Sicherheitsschuhe können Betriebsausgaben sein, normale Kleidung nicht. Belege sammeln und mit deinem Steuerberater klären.", quelle: "§ 4 Abs. 4, § 12 Nr. 1 EStG", gilt_fuer: "beide", spur: "hinten", versprechen: 3, ausloeser: "mitarbeiter", belege: ["Kochjacke", "Schürze", "Sicherheitsschuhe"], rechtsformen: "alle", geprueft: true, pruefung: "2026-10-23 Gesetzestext", register: "12.05" },
  { id: "gwg", titel: "Kleine Geräte sofort", satz: "Geräte bis 800 € netto können im Kaufjahr voll abgesetzt werden, teurere über mehrere Jahre. Rechnung aufheben und mit deinem Steuerberater klären.", quelle: "§ 6 Abs. 2, § 7 EStG", gilt_fuer: "beide", spur: "hinten", versprechen: 3, ausloeser: "belege", belege: ["Geräterechnung"], rechtsformen: "alle", geprueft: true, pruefung: "2026-10-23 Gesetzestext, Grenze 800 € seit 2018", register: "12.02" },
  { id: "belehrung", titel: "Belehrung absetzen", satz: "Gebühren für Hygienebelehrung und Schulungen sind Betriebsausgaben und Nachweis fürs Amt. Quittung in beide Ordner und mit deinem Steuerberater klären.", quelle: "§ 43 IfSG, § 4 Abs. 4 EStG", gilt_fuer: "beide", spur: "hinten", versprechen: 3, ausloeser: "mitarbeiter", belege: ["Belehrung Gesundheitsamt", "Schulung"], rechtsformen: "alle", geprueft: true, pruefung: "2026-10-23 Gesetzestext", register: "12.09" },
  { id: "aufbewahrung", titel: "Belege aufheben", satz: "Belege acht Jahre, Bücher und Abschlüsse zehn Jahre lesbar aufheben. Monatspaket sichern und mit deinem Steuerberater klären.", quelle: "§ 147 Abs. 3 AO", gilt_fuer: "beide", spur: "hinten", versprechen: 3, ausloeser: "abschluesse5", belege: ["Tagesabschluss", "Z-Bon"], rechtsformen: "alle", geprueft: true, pruefung: "2026-10-23 Gesetzestext, Belege 8 Jahre seit 2025", register: "03.01" },
  { id: "tagesabschluss", titel: "Kasse täglich abschließen", satz: "Jeder Tag braucht einen Kassenabschluss. Fehlt er, darf das Finanzamt deinen Gewinn schätzen. Z-Bons jeden Tag sichern und mit deinem Steuerberater klären.", quelle: "§ 146 AO, § 162 AO", gilt_fuer: "beide", spur: "hinten", versprechen: 3, ausloeser: "abschluesse5", belege: ["Z-Bon", "Kassenbuch"], rechtsformen: "alle", geprueft: true, pruefung: "2026-10-23 Gesetzestext", register: "03.02" },
  { id: "inventur_schwund", titel: "Schwund nachweisen", satz: "Erfasster Müll und Inventur belegen, dass fehlende Ware nicht verkauft wurde. Beides weiterführen und mit deinem Steuerberater klären.", quelle: "§ 162 AO", gilt_fuer: "beide", spur: "hinten", versprechen: 2, ausloeser: "inventur", belege: ["Müll-Liste", "Inventur"], rechtsformen: "alle", geprueft: true, pruefung: "2026-10-23 Gesetzestext", register: "06.01" },
  { id: "bewirtung", titel: "Bewirtungsbeleg ab 250 €", satz: "Gastbeleg über 250 €: Name des Gastes muss drauf, nur aus der Kasse mit TSE gültig, nichts von Hand ergänzen. Mit deinem Steuerberater klären.", quelle: "BMF 19.11.2025, IV C 6 - S 2145/00026/005/033", gilt_fuer: "beide", spur: "hinten", versprechen: 3, ausloeser: "abschluesse5", belege: ["Bewirtungsbeleg"], rechtsformen: "alle", geprueft: true, pruefung: "2026-10-23 Fachportale (Deloitte, Otto Schmidt) stimmen überein, BMF-PDF nicht selbst gelesen", register: "12.11" },
  // Noch ungeprüft (Franky 23.10.2026, Rückfragen offen): nicht in der App sichtbar, bis Quelle gelesen.
  { id: "trinkgeld", titel: "Trinkgeld für Personal", satz: "Trinkgeld, das Gäste deinem Personal geben, ist für das Personal steuerfrei, auch per Karte, wenn es weitergegeben wird. Mit deinem Steuerberater klären.", quelle: "§ 3 Nr. 51 EStG", gilt_fuer: "beide", spur: "hinten", versprechen: 3, ausloeser: "mitarbeiter", belege: ["Trinkgeld-Liste"], rechtsformen: "alle", geprueft: false, pruefung: "", register: "12.12" },
  { id: "gutschein", titel: "Gutscheine richtig buchen", satz: "Gutscheine für Speisen und Getränke werden meist erst beim Einlösen versteuert. Gutschein-Liste führen und mit deinem Steuerberater klären.", quelle: "§ 3 Abs. 13–15 UStG", gilt_fuer: "beide", spur: "hinten", versprechen: 3, ausloeser: "belege", belege: ["Gutschein-Liste"], rechtsformen: "alle", geprueft: false, pruefung: "", register: "01.05" },
  { id: "pfand", titel: "Pfand wie das Getränk", satz: "Pfand auf Flaschen bekommt denselben Steuersatz wie das Getränk darin, meist 19 %. In der Kasse trennen und mit deinem Steuerberater klären.", quelle: "UStAE 10.1 Abs. 8", gilt_fuer: "beide", spur: "hinten", versprechen: 3, ausloeser: "belege", belege: ["Pfand-Journal"], rechtsformen: "alle", geprueft: false, pruefung: "", register: "01.06" },
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
    if (!passtZurRechtsform(h, stand)) continue; // Rechtsform (23.10.2026): „unbekannt“ sieht nur Karten für alle
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

// Wächter für Tests und Regelprüfung: Satzlänge, Pflichtwörter, verbotene Wörter, Prüfdatum bei geprüften Karten.
const VERBOTEN = /rechtssicher|steuersicher|betriebsprüfungsfest|gobd-konform|revolutionär|disruptiv|marktführer|ki-steuerberater|so sparst|lückenlos|zertifiziert|manipulationssicher|haccp-konform/i; // wie tests/regeln.py
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
  if (!(h.rechtsformen === "alle" || (Array.isArray(h.rechtsformen) && h.rechtsformen.length))) fehler.push("rechtsformen fehlt");
  if (h.geprueft && !/^\d{4}-\d{2}-\d{2} /.test(h.pruefung || "")) fehler.push("geprüft ohne Prüfdatum");
  return fehler;
}
