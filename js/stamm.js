import { kostenJeStunde } from "./data/lohnkosten.js";
// Trennung (17.10.2026): Schreib-Funktionen für die Stammdaten eines Ladens (Betrieb, Team, Kosten, Kanäle, Reinigung,
// Kühlstellen, Personen, Einrichtungs-Schalter). Vorher schrieben die Bildschirme (js/screens/*.js, app.js) diese Felder selbst.
// Regel: die Bildschirme fragen nach (confirm), lesen Eingaben und rufen eine dieser Funktionen; danach speichert app.js.
// Inhalt und Reihenfolge der Felder sind genau wie vorher – nur der Ort ist neu. Kein HTML, keine Texte außer übergebenen Namen.
import { uid, heute } from "./util.js";
import { basisStandard, satzStandard } from "./data/kosten.js";
import { REINIGUNG_LEER } from "./reinigung.js";
import { VORSTEUER_SAETZE, aktiveStellen } from "./engine.js";
import { TYP_AUS_ART } from "./kuehlname.js";

// ---------- Ablauf der Einrichtung (gespeichert am Laden) ----------
export function schrittSetzen(stand, nummer, id) { stand.schritt = nummer; stand.schrittId = id; }
export function einrichtungWegSetzen(stand, weg, nummer, id) { stand.weg = weg; schrittSetzen(stand, nummer, id); }
export function schnellErgebnisSetzen(stand, ergebnis) { stand.schnellErgebnis = ergebnis; }
// Fertig-Schritt des Schnellwegs: Ergebnis vergessen; pin = „Büro-Code festlegen“ gewünscht (app.js öffnet dann das Code-Blatt)
export function schnellFertig(stand, { pin = false } = {}) { delete stand.schnellErgebnis; delete stand.karteWeg; if (pin) stand.pinFestlegen = true; }
export const karteWegSetzen = (stand, weg) => { if (weg) stand.karteWeg = weg; else delete stand.karteWeg; }; // Gremium 1 (24.10.2026): Wunsch „Aus Vorlagen wählen“ bis zum Ende der Einrichtung merken
export const einrichtungFertigSetzen = (stand) => { stand.einrichtungFertig = true; };
export const kuehlKeineSetzen = (stand) => { stand.kuehl.keine = true; };
export const branchenMeldungQuittieren = (stand) => { delete stand.branchenMeldung; };
export const abgleichHinweisQuittieren = (stand) => { delete stand.abgleichHinweis; }; // W2-D: Hinweis „Beim Zusammenführen …“ gelesen
export const waageVorschlagGesehen = (stand, datum) => { stand.waageVorschlag = datum; };
export const putzplanSpaeterSetzen = (stand, datum = heute()) => { stand.putzplanSpaeter = datum; };

// ---------- Betrieb ----------
export const betriebNameSetzen = (stand, name) => { stand.betrieb.name = name; };
export const betriebFormatSetzen = (stand, format) => { stand.betrieb.format = format; };
export function kuecheUmschalten(stand, id) { const k = stand.betrieb.kuechen; const i = k.indexOf(id); if (i >= 0) k.splice(i, 1); else k.push(id); }
export function betriebTageAendern(stand, d) { stand.betrieb.tageProWoche = Math.min(7, Math.max(1, stand.betrieb.tageProWoche + d)); }
export function betriebMonateAendern(stand, d) { stand.betrieb.monate = Math.min(12, Math.max(1, stand.betrieb.monate + d)); }
export function ladenArtSetzen(stand, art) { stand.ladenArt = art.id; stand.betrieb.format = art.format; stand.betrieb.kuechen = [...art.kuechen]; }
export const kleinunternehmerUmschalten = (stand) => { stand.betrieb.kleinunternehmer = !stand.betrieb.kleinunternehmer; };
// Einstellungen: eigene Warenquote / eigener Steuersatz in Prozent (null = Feld leer → Rechenwerk nimmt seinen Wert)
export function warenQuoteSetzen(stand, prozent) { stand.verkauf.warenQuote = prozent !== null && prozent < 90 ? prozent / 100 : null; }
export function steuerSatzSetzen(stand, prozent) { stand.betrieb.steuerSatz = prozent !== null && prozent < 100 ? prozent / 100 : null; }

// ---------- Team und Lohn ----------
// feld: "personen" | "stundenProPerson" | "lohnkosten" (ohne „offen“-Kennzeichen, wie im Schnellweg)
export function teamFeldSetzen(stand, feld, wert) { if (["personen", "stundenProPerson", "lohnkosten"].includes(feld)) stand.team[feld] = wert; }
export function lohnkostenSetzen(stand, wert) { stand.team.lohnkosten = wert; stand.team.lohnOffen = false; }
export function lohnkostenOffen(stand) { stand.team.lohnkosten = null; stand.team.lohnOffen = true; }
export function eigenerLohnSetzen(stand, wert) { stand.team.eigenerLohn = wert; stand.team.eigenerLohnStatus = wert === null ? "geschaetzt" : "eigen"; }
export function eigenerLohnOffen(stand) { stand.team.eigenerLohn = null; stand.team.eigenerLohnStatus = "offen"; }

// ---------- Kosten ----------
// Kostenposten eines Betriebs holen oder anlegen (vorher postenEintrag in screens/onboarding.js)
export function kostenPosten(stand, postenId, kat) {
  let e = stand.kosten.find((k) => k.posten === postenId);
  if (!e) { e = { id: uid(), posten: postenId, kategorie: kat, betrag: null, status: "aus", periode: "monat", basis: basisStandard(postenId), satz: satzStandard(postenId) }; stand.kosten.push(e); }
  return e;
}
export function kostenBetragSetzen(stand, postenId, kat, betrag) { const e = kostenPosten(stand, postenId, kat); e.betrag = betrag; e.status = e.betrag === null ? "offen" : "bekannt"; return e; }
// Schalter des Postens: an → Richtwert (geschätzt) oder offen; aus → Betrag weg
export function kostenPostenUmschalten(stand, postenId, kat, richtwert) {
  const e = kostenPosten(stand, postenId, kat);
  if (e.status !== "aus") { e.status = "aus"; e.betrag = null; }
  else if (richtwert) { e.betrag = richtwert; e.status = "geschaetzt"; e.periode = "monat"; } else { e.betrag = null; e.status = "offen"; }
  return e;
}
// Monat ↔ Jahr; ein Richtwert wird mitgenommen. false = keine Änderung
export function kostenPeriodeSetzen(stand, postenId, kat, periode) {
  const e = kostenPosten(stand, postenId, kat); if (e.periode === periode) return false;
  if (e.status === "geschaetzt" && e.betrag !== null) e.betrag = periode === "jahr" ? e.betrag * 12 : e.betrag / 12;
  e.periode = periode; return true;
}
export function kostenPostenOffen(stand, postenId, kat) { const e = kostenPosten(stand, postenId, kat); e.betrag = null; e.status = "offen"; }
export function kostenBasisSetzen(stand, postenId, kat, basis) { const e = kostenPosten(stand, postenId, kat); e.basis = basis === "brutto" ? "brutto" : "netto"; }
export function kostenSatzSetzen(stand, postenId, kat, satz) { const e = kostenPosten(stand, postenId, kat); e.satz = VORSTEUER_SAETZE.includes(satz) ? satz : satzStandard(postenId); } // Paket 3, M1
export function kostenKategorieGeprueft(stand, kat) { if (!stand.kostenKategorienGeprueft.includes(kat)) stand.kostenKategorienGeprueft.push(kat); }
// Schnellweg „Geld“: Miete und Strom (Sammelposten Strom & Gas, brutto) – leer = Posten aus
export function kostenSchnellSetzen(stand, postenId, kat, betrag) {
  const e = kostenPosten(stand, postenId, kat);
  e.betrag = betrag; e.status = betrag === null ? "aus" : "bekannt"; e.periode = "monat";
  if (postenId === "strom") { e.sammel = "strom-gas"; e.basis = "brutto"; }
  return e;
}

// ---------- Verkaufswege ----------
const portalNeu = () => ({ id: uid(), name: "", provision: null, basis: "unbekannt" });
export function kanalUmschalten(stand, kanal) {
  const k = stand.kanaele;
  if (kanal === "portale") { if (k.portale.length) k.portale = []; else k.portale.push(portalNeu()); }
  else k[kanal] = !k[kanal];
}
export const portalAnlegen = (stand) => { stand.kanaele.portale.push(portalNeu()); };
export const portalEntfernen = (stand, i) => { stand.kanaele.portale.splice(i, 1); };
export function portalBasisSetzen(stand, i, basis) { const p = stand.kanaele.portale[i]; if (p) p.basis = basis; }
// feld: "name" | "provision"
export function portalFeldSetzen(stand, i, feld, wert) { const p = stand.kanaele.portale[i]; if (!p) return; if (feld === "name") p.name = wert; if (feld === "provision") p.provision = wert; }

// ---------- Reinigung ----------
// Legt stand.betrieb.reinigung an (wie bisher bei jeder Eingabe im Schritt) und übernimmt die genannten Felder.
export function reinigungAendern(stand, felder = {}) { const r = (stand.betrieb.reinigung ??= { ...REINIGUNG_LEER }); Object.assign(r, felder); return r; }
export function reinigungMinutenAendern(stand, d) { const r = reinigungAendern(stand); r.minutenTag = Math.min(240, Math.max(15, (Number(r.minutenTag) || 45) + d)); }

// ---------- Kühlstellen ----------
// felder: { name, art, typ? } – neue Stelle hinten, ohne eigene Grenzen (Standard gilt)
export function kuehlstelleAnlegen(stand, { name, art = "kuehl", typ } = {}) {
  if (!stand.kuehl.seit) stand.kuehl.seit = heute();
  const k = { id: uid(), name, art, ...(typ !== undefined ? { typ } : {}), min: null, max: null, reihe: stand.kuehlstellen.length, archiviert: false };
  stand.kuehlstellen.push(k); return k;
}
const stelle = (stand, id) => stand.kuehlstellen.find((x) => x.id === id) || null;
// Laden-Kühlung: Art wechseln, die nicht passende Grenze fällt weg
export function kuehlstelleArtSetzen(stand, id, art) { const k = stelle(stand, id); if (!k) return false; k.art = art; if (k.art === "warm") k.max = null; if (k.art === "tk") k.min = null; return true; }
// Einrichtung: Art wählen – Grenzen zurück auf Standard, Typ aus der Art, Standardname folgt (namen: { tk, warm } in der aktiven Sprache)
export function kuehlstelleArtWaehlen(stand, id, art, namen = {}) {
  const k = stelle(stand, id); if (!k) return false;
  k.art = art; k.min = null; k.max = null; k.typ = TYP_AUS_ART[k.art];
  if (k.art === "tk" && /^Kühlschrank|^Fridge|^Buzdolabı/.test(k.name)) k.name = namen.tk;
  if (k.art === "warm" && /^Kühlschrank|^Fridge|^Buzdolabı|^Tiefkühler|^Freezer|^Derin/.test(k.name)) k.name = namen.warm;
  return true;
}
export function kuehlstelleNameSetzen(stand, id, name) { const k = stelle(stand, id); if (k) k.name = String(name).slice(0, 40); }
// grenze: "min" | "max"; wert: Zahl oder null (Standard)
export function kuehlstelleGrenzeSetzen(stand, id, grenze, wert) { const k = stelle(stand, id); if (!k || !["min", "max"].includes(grenze)) return false; k[grenze] = wert; return true; }
// nie löschen – alte Messungen behalten ihre Stelle
export function kuehlstelleArchivieren(stand, id) { const k = stelle(stand, id); if (!k) return false; k.archiviert = true; return true; }
// Stelle wegnehmen (Anzahl −1): mit Messungen archivieren, sonst ganz entfernen
export function kuehlstelleWegnehmen(stand, id) {
  const k = stelle(stand, id); if (!k) return false;
  if (stand.messungen.some((m) => m.stelle === k.id)) k.archiviert = true; else stand.kuehlstellen = stand.kuehlstellen.filter((x) => x.id !== k.id);
  return true;
}
// richtung: -1 (hoch) | +1 (runter) in der Reihe der aktiven Stellen
export function kuehlstelleVerschieben(stand, id, richtung) {
  const liste = aktiveStellen(stand); const i = liste.findIndex((x) => x.id === id); const j = i + (richtung < 0 ? -1 : 1);
  if (i < 0 || j < 0 || j >= liste.length) return false;
  const a = liste[i].reihe; liste[i].reihe = liste[j].reihe; liste[j].reihe = a; if (liste[i].reihe === liste[j].reihe) { liste[i].reihe = j; liste[j].reihe = i; }
  return true;
}
// eingerichtet = mindestens eine aktive Stelle
export const kuehlEingerichtetSetzen = (stand) => { stand.kuehl.eingerichtet = stand.kuehlstellen.some((k) => !k.archiviert); };
export const kuehlTaktSetzen = (stand, takt) => { stand.kuehl.takt = Number(takt) === 2 ? 2 : 1; };

// ---------- Personen (Kürzel für Kühlung, Putzen, Belehrungen) ----------
export function personAnlegen(stand, kuerzel) { stand.personen ??= []; const p = { id: uid(), kuerzel, aktiv: true, entfernt: false }; stand.personen.push(p); return p; }
// W2-H (p03 H3): Kürzel bleibt in alten Einträgen, gekennzeichnet „ausgeschieden“
// Kürzel ausgeschiedener Mitarbeiter (18.10.2026): wer ausgeschieden ist (für den Hinweis im Büro) – Kürzel und Datum, ältestes zuerst
export const personenAusgeschieden = (stand) => (stand.personen || []).filter((p) => p && (p.entfernt || p.aktiv === false)).map((p) => ({ id: p.id, kuerzel: p.kuerzel || "?", ausgeschieden: p.ausgeschieden || null }))
  .sort((a, b) => String(a.ausgeschieden || "").localeCompare(String(b.ausgeschieden || "")) || a.kuerzel.localeCompare(b.kuerzel, "de"));
export function personEntfernen(stand, id, datum = heute()) { const p = stand.personen.find((x) => x.id === id); if (!p) return false; p.entfernt = true; p.aktiv = false; p.ausgeschieden = datum; return true; }

// ---------- Personal-Modus: Person an neue Einträge (vorher screens/personal.js) ----------
// Einträge ab „ab“ ohne Person bekommen die Schicht-Person (Kühlrundgang, Messungen, Putzhaken, Müll). Rein und gezielt: nur Einträge ohne von.
export function vonNachtragen(stand, von, ab) {
  if (!von || !ab || !stand) return 0;
  let n = 0;
  const setze = (e, zeit) => { if (e && !e.von && String(zeit || "") >= ab) { e.von = von; n += 1; } };
  for (const e of stand.schwund || []) setze(e, e.erfasst);
  for (const e of stand.putzlog || []) setze(e, e.erfasst);
  for (const r of stand.rundgaenge || []) { setze(r, r.gestartet); for (const m of r.messungen || []) setze(m, m.erfasst || r.gestartet); }
  for (const m of stand.messungen || []) setze(m, m.erfasst);
  return n;
}

// ---------- Uploads (Journal der abgelegten Fotos/Dateien) ----------
export function uploadAnlegen(stand, eintrag) { stand.uploads.push(eintrag); return eintrag; }
// Stand eines Uploads fortschreiben (status, auswertung, ergebnis, zweck) – nur diese Felder
export function uploadAendern(u, felder) { if (!u) return null; for (const k of ["status", "auswertung", "ergebnis", "zweck"]) if (k in felder) u[k] = felder[k]; return u; }

// Ordner (26.10.2026): „Legst du selbst dazu“ – abgehakt heißt nur „liegt bereit“. Schlüssel art:zeitraum (z. B. "buch:2026-09", "steuer:2026").
export function beilageBereitSchalten(stand, art, zeitraum, id) {
  if (!stand?.betrieb || !art || !zeitraum || !id) return false;
  const k = `${art}:${zeitraum}`; const alle = (stand.betrieb.beilagenBereit ??= {}); const liste = new Set(alle[k] || []);
  if (liste.has(id)) liste.delete(id); else liste.add(id);
  alle[k] = [...liste]; return liste.has(id);
}
export const beilagenBereit = (stand, art, zeitraum) => new Set(stand?.betrieb?.beilagenBereit?.[`${art}:${zeitraum}`] || []);

// Zeki lernt mit (Baris 26.10.2026): Fragen, getippte Antworten und das Ende des Rundgangs bleiben lokal im Laden.
// Grundlage für den späteren KI-Zeki; verlässt das Gerät nur über die Sicherung oder einen ausdrücklichen Export (DSGVO).
// Datenschutz (27.10.2026): Zeki-Verlauf auf Wunsch löschen – gibt zurück, wie viele Einträge weg sind
export function zekiLogLoeschen(stand) { const n = (stand?.zekiLog || []).length; if (stand) stand.zekiLog = []; return n; }
export function zekiLogAnhaengen(stand, eintrag) {
  if (!stand || !eintrag?.art) return 0;
  const l = (stand.zekiLog ??= []);
  l.push({ t: new Date().toISOString(), ...eintrag });
  if (l.length > 1000) l.splice(0, l.length - 1000);
  return l.length;
}
export function rundgangAbschliessen(stand, ergebnis) {
  if (!stand) return false;
  stand.fuehrung = { ergebnis: String(ergebnis || "fertig"), t: new Date().toISOString(), mal: (stand.fuehrung?.mal || 0) + 1 };
  return true;
}

// Mitmach-Rundgang (28.10.2026): Übungsmodus. Vor dem Rundgang wird der ganze Stand gemerkt (alle Läden, Journale, laufende Nummer, Modus).
// Am Ende wird er an Ort und Stelle zurückgelegt – dieselben Objekte, dieselbe Reihenfolge der Felder, damit der gespeicherte Stand
// Byte für Byte gleich bleibt. Speichern ist in der Zwischenzeit pausiert (store.js speichernPausieren).
export const uebungStarten = (wurzel) => structuredClone(wurzel);
export function uebungZuruecknehmen(wurzel, gemerkt) {
  if (!wurzel || !gemerkt) return false;
  const alt = structuredClone(gemerkt);
  const da = new Map((wurzel.betriebe || []).map((b) => [b.id, b]));
  const betriebe = (alt.betriebe || []).map((a) => { const b = da.get(a.id); if (!b) return a; for (const k of Object.keys(b)) delete b[k]; return Object.assign(b, a); });
  for (const k of Object.keys(wurzel)) delete wurzel[k];
  Object.assign(wurzel, alt, { betriebe });
  return true;
}
// Ausnahme Station 9: der Chef hat im Rundgang ein echtes Rezept abgewogen und will es behalten – nur die Gerichte kommen zurück.
export const uebungRezepteMerken = (stand) => structuredClone(stand?.gerichte || []);
export function uebungRezepteBehalten(stand, gerichte) {
  if (!stand || !Array.isArray(gerichte)) return false;
  stand.gerichte = structuredClone(gerichte); return true;
}

// E-Mail von Steuerberater/Buchhalter (Baris 26.10.2026 23:56): freiwillig, nur zum Vorbelegen der Vorlage.
export function kontaktSetzen(stand, art, email) {
  if (!stand?.betrieb || !["steuer", "buch"].includes(art)) return false;
  const e = String(email || "").trim().slice(0, 120);
  const k = (stand.betrieb.kontakte ??= {});
  if (!e) { delete k[art]; return true; }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) return false;
  k[art] = e; return true;
}

// Mitarbeiter heute (Baris 27.10.2026, 11:14): beim Tagesumsatz „Waren heute Mitarbeiter da?“ – bis eine Personalanbindung kommt, von Hand.
// stand.teamTage = [{ datum, eintraege: [{ person (id | null), name, stunden, satz }], keine, erfasst }] – je Datum gilt der jüngste Eintrag.
export const teamTag = (stand, datum) => [...(stand?.teamTage || [])].reverse().find((x) => x.datum === datum) || null;
export function teamTagSetzen(stand, datum, eintraege) {
  stand.teamTage ??= [];
  // Fester Monatslohn: wird an der Person gemerkt und zählt nicht als Tageseintrag
  for (const x of eintraege || []) { const p = (stand.personen || []).find((q) => q.id === x.person); if (p && x.modell === "monat" && x.monatsBrutto > 0) { p.lohnModell = "monat"; p.monatsBrutto = Math.round(x.monatsBrutto * 100) / 100; p.lohnArt = x.art === "minijob" ? "minijob" : "angestellt"; } else if (p && x.modell === "stunde") p.lohnModell = "stunde"; }
  eintraege = (eintraege || []).filter((x) => x.modell !== "monat");
  const e = { datum, eintraege: (eintraege || []).filter((x) => x.stunden > 0).map((x) => ({ person: x.person || null, name: String(x.name || "").slice(0, 20), ...(x.kompakt ? { kompakt: true, personen: Math.max(1, Math.round(Number(x.personen) || 1)) } : {}), stunden: Math.round(Math.min(400, x.stunden) * 4) / 4, satz: x.satz > 0 ? Math.round(x.satz * 100) / 100 : null, art: x.art === "minijob" ? "minijob" : "angestellt" })), keine: !(eintraege || []).some((x) => x.stunden > 0), erfasst: new Date().toISOString() };
  stand.teamTage.push(e);
  for (const x of e.eintraege) { const p = (stand.personen || []).find((q) => q.id === x.person); if (p && x.satz) { p.stundenlohn = x.satz; p.lohnArt = x.art; } }
  return e;
}
// Lieferdienst (Baris 27.10.2026, 15:32): unter dem Tagesumsatz „davon Lieferdienst“. stand.lieferTage = [{ datum, betrag (brutto), erfasst }],
// je Datum gilt der jüngste Eintrag. Die Provision ist der Durchschnitt der eingerichteten Portale mit Provision (Anteil 0..1).
export const lieferTag = (stand, datum) => [...(stand?.lieferTage || [])].reverse().find((x) => x.datum === datum) || null;
export function lieferTagSetzen(stand, datum, betrag) {
  stand.lieferTage ??= [];
  const e = { datum, betrag: Math.max(0, Math.round((Number(betrag) || 0) * 100) / 100), erfasst: new Date().toISOString() };
  // Tippen im Büro (jede Taste): der eigene Eintrag der letzten Minute wird ersetzt statt eine lange Liste zu bauen
  const i = stand.lieferTage.length - 1; const l = stand.lieferTage[i];
  if (l && l.datum === datum && Date.now() - Date.parse(l.erfasst) < 60000) { stand.lieferTage[i] = e; return e; }
  stand.lieferTage.push(e); return e;
}
export function lieferProvision(stand) {
  const p = (stand?.kanaele?.portale || []).filter((x) => Number(x.provision) > 0);
  if (!p.length) return null;
  const satz = p.reduce((a, x) => a + Number(x.provision), 0) / p.length / 100;
  return { satz, basis: p.every((x) => x.basis === "netto") ? "netto" : "brutto", anzahl: p.length };
}
// Provision eines Betrags (brutto eingegeben); bei Netto-Basis vom Netto-Betrag.
export const lieferKosten = (betrag, prov, mwst) => !prov || !(betrag > 0) ? 0 : (prov.basis === "netto" ? betrag / (1 + (mwst || 0)) : betrag) * prov.satz;
// satz = Brutto-Stundenlohn; art = "angestellt" | "minijob". Kosten = Brutto × Arbeitgeber-Aufschlag (js/data/lohnkosten.js)
// Baris 27.10.2026 (B): nach den ersten Stunden einmal „Ist das ein normaler Tag?“ – nur ohne Monatssumme für Löhne und nur einmal je Laden.
export const normalFrageNoetig = (stand, datum) => { const e = teamTag(stand, datum); return !!e && !e.keine && e.eintraege.length > 0 && !(Number(stand?.team?.lohnkosten) > 0) && !stand?.team?.normalGefragt; };
export function normalTagSetzen(stand, datum, normal) { const e = teamTag(stand, datum); if (e && !normal) e.untypisch = true; stand.team ??= {}; stand.team.normalGefragt = true; }
export function teamStundenlohnSetzen(stand, satz) { stand.team ??= {}; stand.team.stundenlohn = Math.round(satz * 100) / 100; } // Lohn je Stunde für „Mitarbeiter heute“ kompakt (27.10.2026)
export const teamTagLohn = (e) => (e?.eintraege || []).reduce((s, x) => s + (x.satz ? x.stunden * x.satz : 0), 0);
export const teamTagKosten = (e) => (e?.eintraege || []).reduce((s, x) => s + (x.satz ? x.stunden * kostenJeStunde(x.satz, x.art) : 0), 0);

// Urlaub und Krankheit (Baris 27.10.2026, 12:25): gegen Monatsende einmal „Waren diesen Monat Mitarbeiter krank oder im Urlaub?“.
// Bei Stundenlohn zahlt der Chef diese Tage trotzdem (Lohnfortzahlung/Urlaubsentgelt) – Tage × übliche Stunden × Brutto × Arbeitgeberanteil.
// stand.abwesend = [{ monat: "JJJJ-MM", datum, eintraege: [{ person, name, tage, stundenTag, satz, art }], erfasst }] – je Monat der jüngste.
export const abwesendMonat = (stand, monat) => [...(stand?.abwesend || [])].reverse().find((x) => x.monat === monat) || null;
export function abwesendSetzen(stand, datum, eintraege) {
  stand.abwesend ??= [];
  const e = { monat: datum.slice(0, 7), datum, eintraege: (eintraege || []).filter((x) => x.tage > 0 && x.satz > 0).map((x) => ({ person: x.person || null, name: String(x.name || "").slice(0, 20), tage: Math.round(x.tage), stundenTag: x.stundenTag > 0 ? x.stundenTag : 8, satz: x.satz, art: x.art === "minijob" ? "minijob" : "angestellt" })), erfasst: new Date().toISOString() };
  stand.abwesend.push(e); return e;
}
export const abwesendKosten = (e) => (e?.eintraege || []).reduce((s, x) => s + x.tage * x.stundenTag * kostenJeStunde(x.satz, x.art), 0);
// Übliche Stunden je Arbeitstag einer Person im Monat (aus „Mitarbeiter heute“), sonst 8
export function stundenJeTag(stand, person, monat) {
  const tage = (stand?.teamTage || []).filter((x) => x.datum.startsWith(monat)).flatMap((x) => x.eintraege.filter((y) => y.person === person));
  return tage.length ? tage.reduce((s, y) => s + y.stunden, 0) / tage.length : 8;
}
