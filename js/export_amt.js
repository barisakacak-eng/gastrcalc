// Büro-Ordner „Gesundheitsamt“ (Drei Ebenen, 15.10.2026): Eigenkontrollen als reine Daten, CSV und druckbares Dokument.
// Teile: Kühlprotokoll, Putzplan-Liste, Belehrungen (§ 43 IfSG), Geräte und Grenzen (Übersicht, kein HACCP-Konzept),
// Weggeworfene Ware, Zurückgenommen / geändert (Welle 2, p03). Gezählt für „x von y vollständig“ werden nur die drei Pflichtlisten.
// Keine Oberfläche, keine Übersetzung – die Ansicht (screens/ordner.js) gibt Texte hinein. Testbar in node (tests/export.test.mjs, tests/h.test.mjs).
//
// Belehrungen je Person. Gelesen aus person.belehrungen = [{ datum, art }] UND aus dem Journal stand.belehrungen =
// [{ id, person, datum: "JJJJ-MM-TT", art: "erst" | "folge", erfasst, storniert }]. Geschrieben wird ins Journal am Laden, weil
// migrierenBetrieb (store.js) Personen auf wenige Felder zurechtschneidet – person.belehrungen ginge beim Laden verloren.
// Erstbelehrung macht das Gesundheitsamt (oder ein beauftragter Arzt), danach belehrt der Arbeitgeber alle zwei Jahre (§ 43 Abs. 4 IfSG).
import { aktiveStellen, grenzenVon, monatsblatt, nachkontrolleStand, abweichungStand, wareEntscheidung, tagPlus, ruhetageAm, ruhetageVerlauf, MASSNAHMEN } from "./engine.js";
import { aufgabenFuer, nachweis, planAm, putzplanVerlauf, zurueckgenommen } from "./putzplan.js";
import { AUFGABEN } from "./data/putzplan.js";
import { ladenArtVon } from "./profil.js";
import { esc, heute, uid } from "./util.js"; // W2-D: uid für Belehrungen
import { csvText, datumDe, schwund } from "./export_steuer.js";

export const BELEHRUNG_MONATE = 24;  // Folgebelehrung alle zwei Jahre
export const BELEHRUNG_BALD_TAGE = 60; // ab zwei Monaten vorher: „bald fällig“ (Erinnerung im Büro, nicht im Laden)
const ISO = /^\d{4}-\d{2}-\d{2}$/;
const gueltig = (d) => typeof d === "string" && ISO.test(d) && !Number.isNaN(Date.parse(d + "T12:00:00"));
const tageZwischen = (a, b) => Math.round((Date.parse(b + "T12:00:00") - Date.parse(a + "T12:00:00")) / 86400e3);
const min = (a, b) => (a < b ? a : b), max = (a, b) => (a > b ? a : b);
const zeitAus = (iso) => { if (!iso) return ""; const d = new Date(iso); return Number.isNaN(d.getTime()) ? "" : `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`; };
const tagAus = (iso) => { if (!iso) return ""; const d = new Date(iso); return Number.isNaN(d.getTime()) ? "" : heute(d); };
const person = (stand, id) => (stand.personen || []).find((p) => p.id === id) || null;
const personName = (stand, id) => person(stand, id)?.kuerzel || "";
// W2-H (p03 H3): ausgeschiedene Personen bleiben mit Kürzel sichtbar, gekennzeichnet
const istAus = (p) => !!p && (p.entfernt || p.aktiv === false);
const personInfo = (stand, id) => { const p = person(stand, id); return { von: p?.kuerzel || "", vonAus: istAus(p), vonAusAm: p?.ausgeschieden || null }; };

// ---------- Zeitraum: Monat | Quartal | Frei ----------
export function zeitraumFuer(art, { datum = heute(), von = null, bis = null } = {}) {
  const [j, m] = datum.split("-").map(Number);
  const ende = (jj, mm) => heute(new Date(jj, mm, 0)); // letzter Tag des Monats mm (1–12)
  if (art === "quartal") { const q0 = Math.floor((m - 1) / 3) * 3 + 1; return { art, von: `${j}-${String(q0).padStart(2, "0")}-01`, bis: ende(j, q0 + 2), quartal: (q0 + 2) / 3 }; }
  if (art === "frei" && gueltig(von) && gueltig(bis)) return { art, von: min(von, bis), bis: max(von, bis) };
  if (art === "frei") { const mo = zeitraumFuer("monat", { datum }); return { art, von: gueltig(von) ? von : mo.von, bis: gueltig(bis) ? bis : mo.bis }; }
  return { art: "monat", von: `${datum.slice(0, 7)}-01`, bis: ende(j, m), monat: datum.slice(0, 7) };
}

// ---------- Kühlprotokoll ----------
// Je Zeile: nacherfasst + erfasst (wann nachgetragen; die Uhrzeit bleibt bei Nachträgen leer, außer sie wurde eingegeben),
// status der Abweichung (behoben | verspaetet | massnahmeOffen | ohneMassnahme), Nachkontrolle mit Zeitfenster.
export function kuehlprotokoll(stand, z, { datum = heute() } = {}) {
  const stellen = stand.kuehlstellen || [];
  const stelle = (id) => stellen.find((k) => k.id === id);
  const ms = (stand.messungen || []).filter((m) => !m.storniert && typeof m.datum === "string" && m.datum >= z.von && m.datum <= z.bis)
    .sort((a, b) => a.datum.localeCompare(b.datum) || String(a.zeit).localeCompare(String(b.zeit)));
  const zeilen = ms.map((m) => {
    const nks = m.abweichung ? nachkontrolleStand(stand, m) : null;
    const nk = m.abweichung && m.nachkontrolle ? nks.status : null;
    const status = abweichungStand(stand, m);
    const zeit = m.nacherfasst ? (typeof m.zeitEingabe === "string" ? zeitAus(m.zeitEingabe) : "") : zeitAus(m.zeit); // alte Nachträge: gespeicherte Zeit war die Erfassungszeit
    return { datum: m.datum, zeit, stelle: stelle(m.stelle)?.name || "?", art: stelle(m.stelle)?.art || "kuehl", wert: typeof m.wert === "number" ? m.wert : null,
      grund: m.grund || null, min: m.min ?? null, max: m.max ?? null, abweichung: !!m.abweichung, massnahmen: m.massnahmen || [], nachkontrolle: nk, nkStunden: nks?.stunden ?? null,
      ware: m.abweichung ? wareEntscheidung(m) : null, status, behoben: m.abweichung ? status === "behoben" : null, ...personInfo(stand, m.von),
      nacherfasst: !!m.nacherfasst, erfasst: m.nacherfasst ? m.erfasst || null : null, lfd: m.lfd ?? null, notiz: m.notiz || "",
      wareGrund: m.abweichung && m.ware?.art === "behalten" ? m.ware.grund || null : null }; // Trennung (17.10.2026), Punkt 4: Begründung „Ware behalten“
  });
  const abweichungen = zeilen.filter((x) => x.abweichung).length;
  const behoben = zeilen.filter((x) => x.abweichung && x.behoben).length;
  // Lücken bis gestern: fehlt (ohne Eintrag), teilweise (weniger als der Takt), aus (Gerät aus). Ruhetage und Tage vor der Einrichtung zählen nicht.
  const aktiv = aktiveStellen(stand); const bisGestern = min(z.bis, tagPlus(datum, -1));
  const fehlt = new Set(), teilweise = new Set(), aus = new Set();
  if (aktiv.length && z.von <= bisGestern) for (const k of aktiv) for (const t of monatsblatt(stand, k.id, { von: z.von, bis: bisGestern }).tage) {
    if (t.status === "fehlt") fehlt.add(t.datum); else if (t.status === "teilweise") teilweise.add(t.datum); else if (t.status === "aus") aus.add(t.datum);
  }
  const luecken = [...fehlt].sort();
  const lueckenAlle = [...new Set([...fehlt, ...teilweise, ...aus])].sort();
  return { zeilen, anzahl: zeilen.filter((x) => x.wert !== null).length, eintraege: zeilen.length, abweichungen, behoben, offen: abweichungen - behoben, luecken,
    teilweise: [...teilweise].sort(), aus: [...aus].sort(), lueckenAlle, nachgetragen: zeilen.filter((x) => x.nacherfasst).length, stellen: aktiv.length,
    vollstaendig: aktiv.length > 0 && zeilen.length > 0 && abweichungen === behoben && lueckenAlle.length === 0 };
}

// ---------- Putzplan-Liste ----------
// Ein Tag gilt als abgehakt, wenn alle Tagesaufgaben des an DIESEM Tag gültigen Plans einen Haken haben (Gültig-ab, W2-H).
// Heute zählt erst mit, wenn er schon vollständig ist.
export function putznachweis(stand, z, { datum = heute() } = {}) {
  const plan = stand.putzplan;
  if (!plan?.aktiv) return { aktiv: false, aufgaben: [], tage: 0, tageGesamt: 0, luecken: [], eintraege: [], vollstaendig: false };
  const aufgaben = aufgabenFuer(plan).filter((a) => a.takt !== "nach");
  const log = nachweis(stand, z.von, z.bis);
  const jeTag = {}; for (const e of log) (jeTag[e.datum] ??= new Set()).add(e.aufgabe);
  const tagIdsCache = new Map();
  const tagIdsAm = (d) => { const p = planAm(stand, d); const key = p.geraete.join(",") + "|" + p.aus.join(",");
    if (!tagIdsCache.has(key)) tagIdsCache.set(key, aufgabenFuer(p).filter((a) => a.takt === "tag").map((a) => a.id)); return tagIdsCache.get(key); };
  const start = max(z.von, plan.seit && gueltig(plan.seit) ? plan.seit : z.von); const ende = min(z.bis, datum);
  let tage = 0, tageGesamt = 0; const luecken = [];
  for (let d = start; d <= ende; d = tagPlus(d, 1)) {
    if (ruhetageAm(stand, d).includes(new Date(d + "T12:00:00").getDay()) && !jeTag[d]) continue;
    const tagIds = tagIdsAm(d);
    const voll = tagIds.length > 0 && tagIds.every((id) => jeTag[d]?.has(id));
    if (d === datum && !voll) continue; // heute ist noch nicht vorbei
    tageGesamt += 1; if (voll) tage += 1; else luecken.push(d);
  }
  const text = Object.fromEntries(AUFGABEN.map((a) => [a.id, a.text]));
  const eintraege = log.slice().reverse().map((e) => ({ datum: e.datum, zeit: e.zeit || "", aufgabe: e.aufgabe, text: text[e.aufgabe] || null, ...personInfo(stand, e.von) }));
  return { aktiv: true, aufgaben: aufgaben.map((a) => ({ id: a.id, takt: a.takt, text: a.text, stufe: a.stufe })), tage, tageGesamt, luecken, eintraege,
    vollstaendig: tageGesamt > 0 && luecken.length === 0 };
}

// ---------- Belehrungen (§ 43 IfSG) ----------
export function faelligAm(iso, monate = BELEHRUNG_MONATE) {
  const [j, m, d] = iso.split("-").map(Number);
  const x = new Date(j, m - 1 + monate, 1); const letzter = new Date(x.getFullYear(), x.getMonth() + 1, 0).getDate();
  x.setDate(Math.min(d, letzter)); return heute(x); // 29.02. → 28.02. bzw. Monatsende statt Sprung in den Folgemonat
}
export function belehrungStatus(person, datum = heute()) {
  const liste = (person?.belehrungen || []).filter((b) => b && gueltig(b.datum)).slice().sort((a, b) => a.datum.localeCompare(b.datum));
  const erst = liste.find((b) => b.art === "erst") || null;
  const letzte = liste[liste.length - 1] || null;
  if (!letzte) return { status: "fehlt", erst: null, letzte: null, faellig: null, tage: null };
  const faellig = faelligAm(letzte.datum); const tage = tageZwischen(datum, faellig);
  return { status: tage < 0 ? "ueberfaellig" : tage <= BELEHRUNG_BALD_TAGE ? "bald" : "ok", erst: erst?.datum || null, letzte: letzte.datum, letzteArt: letzte.art, faellig, tage };
}
export const belehrungenVon = (stand, p) => [...(p?.belehrungen || []), ...(stand?.belehrungen || []).filter((b) => b && !b.storniert && b.person === p?.id)];
export const aktivePersonen = (stand) => (stand.personen || []).filter((p) => p && p.aktiv !== false && !p.entfernt);
// W2-H (p03 H3): Ausgeschiedene bleiben im Ordner, wenn sie Belehrungen haben oder in Einträgen stehen – mit Status „ausgeschieden“,
// ohne in die Zählung (vollständig, fällig) einzugehen.
export function ausgeschiedenePersonen(stand) {
  const benutzt = new Set([...(stand.messungen || []).map((m) => m.von), ...(stand.putzlog || []).map((e) => e.von)].filter(Boolean));
  return (stand.personen || []).filter((p) => p && istAus(p) && (benutzt.has(p.id) || belehrungenVon(stand, p).length));
}
export function belehrungen(stand, { datum = heute() } = {}) {
  const zeilen = aktivePersonen(stand).map((p) => ({ id: p.id, name: p.kuerzel || "?", ...belehrungStatus({ belehrungen: belehrungenVon(stand, p) }, datum) }));
  const zaehl = { ok: 0, bald: 0, ueberfaellig: 0, fehlt: 0 }; for (const x of zeilen) zaehl[x.status] += 1;
  const naechste = zeilen.filter((x) => x.status !== "ok").sort((a, b) => (a.tage ?? -1e9) - (b.tage ?? -1e9))[0] || null;
  const ausgeschieden = ausgeschiedenePersonen(stand).map((p) => { const s = belehrungStatus({ belehrungen: belehrungenVon(stand, p) }, datum);
    return { id: p.id, name: p.kuerzel || "?", ...s, status: "ausgeschieden", stand: s.status, ausgeschieden: p.ausgeschieden || null }; });
  return { zeilen, ausgeschieden, zaehl, naechste, vollstaendig: zeilen.length > 0 && zaehl.ok === zeilen.length };
}
// Eintragen: Datum nicht in der Zukunft, Art erst | folge, gleicher Eintrag nicht doppelt. Rückgabe: der Eintrag oder null.
export function belehrungEintragen(stand, personId, { datum, art = "folge", jetzt = new Date().toISOString(), bisHeute = heute() } = {}) {
  const p = (stand.personen || []).find((x) => x.id === personId);
  if (!p || !gueltig(datum) || datum > bisHeute || !["erst", "folge"].includes(art)) return null;
  if (belehrungenVon(stand, p).some((b) => b.datum === datum && b.art === art)) return null;
  stand.belehrungen ??= [];
  const e = { id: "bel-" + uid(), person: personId, // W2-D: eindeutige Kennung (Storno + neu am selben Tag darf nach dem Zusammenführen nicht „fehlt“ ergeben)
     datum, art, erfasst: jetzt, storniert: false }; stand.belehrungen.push(e); return e;
}
// Rücknahme: nur kennzeichnen (Journal), nie löschen
export function belehrungEntfernen(stand, personId, datum, art) {
  const e = (stand.belehrungen || []).find((b) => !b.storniert && b.person === personId && b.datum === datum && b.art === art); if (!e) return false;
  e.storniert = true; e.storniertZeit = new Date().toISOString(); return true;
}

// ---------- Geräte und Grenzen (Übersicht, kein HACCP-Konzept) ----------
// W2-H (p03 H7): kein „vollständig“ mehr – nur „Geräteliste vorhanden“. vollstaendig bleibt null (neutral, kein grüner Haken).
export function eigenkontrolle(stand) {
  const plan = stand.putzplan?.aktiv ? stand.putzplan : null;
  const kuehlstellen = aktiveStellen(stand).map((k) => { const g = grenzenVon(k); return { name: k.name || "?", art: k.art || "kuehl", ware: k.ware || null, min: g.min, max: g.max, standard: g.standard, wareOhneGrenze: !!g.wareOhneGrenze }; });
  const aufgaben = plan ? aufgabenFuer(plan) : [];
  const jeTakt = {}; for (const a of aufgaben) jeTakt[a.takt] = (jeTakt[a.takt] || 0) + 1;
  return { ladenArt: ladenArtVon(stand), geraete: plan?.geraete || [], kuehlstellen, takt: stand.kuehl?.takt === 2 ? 2 : 1, ruhetage: stand.kuehl?.ruhetage || [],
    putzplan: !!plan, aufgaben: aufgaben.length, jeTakt, massnahmen: MASSNAHMEN, personen: aktivePersonen(stand).length,
    geraeteliste: kuehlstellen.length > 0 || (plan?.geraete || []).length > 0, vollstaendig: null };
}

// ---------- Weggeworfene Ware (W2-H, p03 M3) ----------
// Müll und Verderb (Vorgang 1) ohne Euro – die Werte gehören ins Steuerpaket. Herkunft „kuehl“ = aus einer Kühl-Abweichung.
export function muellAmt(stand, z) {
  const zeilen = schwund(stand, z).zeilen.filter((x) => x.vorgang === 1).map((x) => ({ datum: x.datum, art: x.art, name: x.name, menge: x.menge, einheit: x.einheit, grund: x.grund }));
  const kuehl = new Set((stand.schwund || []).filter((e) => !e.storniert && e.quelle === "kuehl").map((e) => e.datum + "|" + (e.ref?.name || "")));
  for (const x of zeilen) x.ausKuehlung = kuehl.has(x.datum + "|" + x.name);
  return { zeilen, anzahl: zeilen.length, vollstaendig: null };
}

// ---------- Zurückgenommen / geändert (W2-H, p03 K3) ----------
// Stornierte Messungen, Putz-Haken und Belehrungen, geänderte Ruhetage und Putzpläne, ausgeschiedene Personen – mit Zeitpunkt und (wo bekannt) Person.
export function ruecknahmen(stand, z) {
  const imZ = (d) => typeof d === "string" && d >= z.von && d <= z.bis;
  const out = [];
  const stelle = (id) => (stand.kuehlstellen || []).find((k) => k.id === id)?.name || "?";
  for (const m of stand.messungen || []) if (m.storniert && (imZ(m.datum) || imZ(tagAus(m.storniertZeit))))
    out.push({ bereich: "kuehl", wann: m.storniertZeit || null, datum: m.datum, stelle: stelle(m.stelle), wert: typeof m.wert === "number" ? m.wert : null, ...personInfo(stand, m.storniertVon || null) });
  for (const e of zurueckgenommen(stand, z.von, z.bis))
    out.push({ bereich: "putz", wann: e.storniertZeit || null, datum: e.datum, aufgabe: e.aufgabe, text: AUFGABEN.find((a) => a.id === e.aufgabe)?.text || null, ...personInfo(stand, e.storniertVon || null) });
  for (const b of stand.belehrungen || []) if (b.storniert && (imZ(b.datum) || imZ(tagAus(b.storniertZeit))))
    out.push({ bereich: "belehrung", wann: b.storniertZeit || null, datum: b.datum, art: b.art, person: personName(stand, b.person), von: "", vonAus: false });
  for (const e of ruhetageVerlauf(stand)) if (e.ab && imZ(e.ab)) out.push({ bereich: "ruhetage", wann: e.erfasst || null, datum: e.ab, tage: e.tage, von: "", vonAus: false });
  for (const e of putzplanVerlauf(stand)) if (e.ab && imZ(e.ab)) out.push({ bereich: "putzplan", wann: e.erfasst || null, datum: e.ab, anzahl: aufgabenFuer({ geraete: e.geraete, aus: e.aus }).length, von: "", vonAus: false });
  for (const p of stand.personen || []) if (istAus(p) && p.ausgeschieden && imZ(p.ausgeschieden)) out.push({ bereich: "person", wann: null, datum: p.ausgeschieden, person: p.kuerzel || "?", von: "", vonAus: false });
  out.sort((a, b) => String(a.wann || a.datum).localeCompare(String(b.wann || b.datum)));
  return { zeilen: out, anzahl: out.length, vollstaendig: null };
}

// ---------- Der Ordner ----------
export const AMT_TEILE = ["kuehl", "putz", "belehrung", "konzept", "muell", "rueck"];
export const AMT_PFLICHT = ["kuehl", "putz", "belehrung"]; // nur diese zählen für „x von y vollständig“ (W2-H, p03 H7)
export function ordnerAmt(stand, z, { datum = heute() } = {}) {
  const teile = { kuehl: kuehlprotokoll(stand, z, { datum }), putz: putznachweis(stand, z, { datum }), belehrung: belehrungen(stand, { datum }), konzept: eigenkontrolle(stand),
    muell: muellAmt(stand, z), rueck: ruecknahmen(stand, z) };
  const vollstaendig = AMT_PFLICHT.filter((t) => teile[t].vollstaendig).length;
  return { zeitraum: z, teile, vollstaendig, gesamt: AMT_PFLICHT.length, prozent: Math.round(vollstaendig / AMT_PFLICHT.length * 100) };
}

// CSV je Teil; kopf und namen (Übersetzer für Kennungen) kommen von der Ansicht.
// Kühlung: nach den bisherigen Spalten zusätzlich „Nachgetragen am“ (echter Erfassungszeitpunkt), laufende Nummer und Stand der Abweichung.
const stempel = (iso) => (iso ? `${datumDe(tagAus(iso))} ${zeitAus(iso)}` : "");
export function amtCsv(o, teil, kopf, namen = {}) {
  const n = (f, k) => (namen[f] ? namen[f](k) : k);
  const wer = (x) => (x.von && x.vonAus ? n("ausgeschieden", x.von) : x.von);
  if (teil === "kuehl") return csvText(kopf, o.teile.kuehl.zeilen.map((x) => [datumDe(x.datum), x.zeit, x.stelle, x.wert ?? n("grund", x.grund), x.min, x.max, x.abweichung ? n("ja", "x") : "", x.massnahmen.map((m) => n("massnahme", m)).join(", "), x.nachkontrolle ? n("nachkontrolle", x) : "", wer(x), x.nacherfasst ? n("ja", "x") : "",
    x.nacherfasst ? stempel(x.erfasst) : "", x.lfd === null ? "" : String(x.lfd), x.status ? n("abwStatus", x.status) : ""]), { dezimal: [0, 0, 0, 1, 1, 1] });
  if (teil === "putz") return csvText(kopf, o.teile.putz.eintraege.map((x) => [datumDe(x.datum), x.zeit, n("aufgabe", x), wer(x)]));
  if (teil === "belehrung") return csvText(kopf, [...o.teile.belehrung.zeilen, ...o.teile.belehrung.ausgeschieden].map((x) => [x.status === "ausgeschieden" ? n("ausgeschieden", x.name) : x.name, datumDe(x.erst), datumDe(x.letzte), datumDe(x.faellig), n("status", x.status)]));
  if (teil === "konzept") return csvText(kopf, o.teile.konzept.kuehlstellen.map((k) => [k.name, n("kuehlart", k.art), k.min, k.max, k.standard ? n("ja", "x") : ""]), { dezimal: [0, 0, 1, 1] });
  if (teil === "muell") return csvText(kopf, o.teile.muell.zeilen.map((x) => [datumDe(x.datum), n("art", x.art), x.name, x.menge, x.einheit, x.grund]), { dezimal: [0, 0, 0, 2] });
  if (teil === "rueck") return csvText(kopf, o.teile.rueck.zeilen.map((x) => [x.wann ? stempel(x.wann) : datumDe(x.datum), n("bereich", x.bereich), n("rueckText", x), wer(x)]));
  return csvText(kopf, []);
}

// ---------- Druckdokument ----------
// Beispiel-Laden (17.10.2026): dok.beispiel = Kennzeichnung („BEISPIEL – keine echten Daten“) in Kopf, Titel und Fußzeile, sonst leer.
// dok = { titel, laden, zeitraum, erstellt, sprache, seite: ["Seite", "von"], abschnitte: [{ titel, info, kopf: [..], zeilen: [[..] | { zellen, warn, klasse }], rechts, leer, warn }], unterschrift, fuss }
// Alle Zellen sind schon fertige Texte; hier wird nur escaped und gesetzt. Eigenes CSS, A4, ohne App-Stile, ohne Verbindung nach außen.
// W2-H (p03 M2): Seitenzahlen über @page-Ränder (Chrome ab 131, Safari ab 18.2 – andere Browser lassen sie weg) und Laden/Zeitraum unten links.
const cssText = (s) => `"${String(s ?? "").replace(/[\\"]/g, "\\$&").replace(/[\n\r<>]/g, " ")}"`;
export function druckHtml(dok) {
  const klasse = (z) => [z.warn ? "warn" : "", z.klasse || ""].filter(Boolean).join(" ");
  const abschnitt = (a) => `<section><h2>${esc(a.titel)}</h2>${a.info ? `<p class="info${a.warn ? " warn" : ""}">${esc(a.info)}</p>` : ""}
    ${a.zeilen?.length ? `<div class="tab"><table><thead><tr>${a.kopf.map((k, i) => `<th${(a.rechts || []).includes(i) ? ' class="r"' : ""}>${esc(k)}</th>`).join("")}</tr></thead>
    <tbody>${a.zeilen.map((z) => `<tr${klasse(z) ? ` class="${klasse(z)}"` : ""}>${(z.zellen || z).map((c, i) => `<td${(a.rechts || []).includes(i) ? ' class="r"' : ""}>${esc(c)}</td>`).join("")}</tr>`).join("")}</tbody>
    ${a.summe ? `<tfoot><tr>${a.summe.map((c, i) => `<td${(a.rechts || []).includes(i) ? ' class="r"' : ""}>${esc(c)}</td>`).join("")}</tr></tfoot>` : ""}</table></div>` : a.leer ? `<p class="leer">${esc(a.leer)}</p>` : ""}</section>`;
  const seite = Array.isArray(dok.seite) && dok.seite.length === 2 ? dok.seite : null;
  const rand = seite ? ` @bottom-right { content: ${cssText(seite[0] + " ")} counter(page) ${cssText(" " + seite[1] + " ")} counter(pages); font-size: 8pt; color: #55604F; }
  @bottom-left { content: ${cssText(`${dok.beispiel ? dok.beispiel + " · " : ""}${dok.laden || ""} · ${dok.zeitraum || ""}`)}; font-size: 8pt; color: #55604F; }` : "";
  return `<!doctype html><html lang="${esc(dok.sprache || "de")}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${dok.beispiel ? esc(dok.beispiel) + " – " : ""}${esc(dok.titel)} – ${esc(dok.laden)} – ${esc(dok.zeitraum)}</title>
<style>
@page { size: A4; margin: 16mm 14mm 18mm;${rand} }
* { box-sizing: border-box; }
html { -webkit-text-size-adjust: 100%; }
body { margin: 0; padding: 20px; font: 10.5pt/1.4 system-ui, -apple-system, "Segoe UI", Arial, sans-serif; color: #1F2A24; background: #fff; }
header { border-bottom: 2px solid #2E4034; padding-bottom: 10px; margin-bottom: 14px; display: flex; justify-content: space-between; gap: 16px; align-items: flex-end; flex-wrap: wrap; }
h1 { font-size: 17pt; margin: 0 0 2px; letter-spacing: -.01em; }
header .laden { font-size: 12pt; font-weight: 700; }
header .meta { color: #55604F; font-size: 9.5pt; text-align: right; }
section { margin: 0 0 16px; break-inside: auto; }
h2 { font-size: 12pt; margin: 0 0 4px; color: #2E4034; break-after: avoid; }
p.info { margin: 0 0 6px; color: #55604F; } p.info.warn { color: #8A4C20; font-weight: 600; }
p.leer { margin: 0; color: #55604F; font-style: italic; }
table { width: 100%; border-collapse: collapse; font-size: 9.5pt; }
th, td { text-align: left; padding: 4px 6px; border-bottom: 1px solid #E9DDCB; vertical-align: top; overflow-wrap: break-word; }
.tab { width: 100%; overflow-x: auto; -webkit-overflow-scrolling: touch; }
@media screen and (max-width: 640px) { body { padding: 14px; font-size: 10pt; } table { min-width: 560px; } h1 { font-size: 15pt; } }
th { background: #F5EBDD; font-weight: 700; border-bottom: 1px solid #C9A87C; }
thead { display: table-header-group; } tr { break-inside: avoid; }
td.r, th.r { text-align: right; font-variant-numeric: tabular-nums; white-space: nowrap; }
tr.warn td { background: #FBE9E6; }
tr.spaet td { background: #FCEBD6; }
tr.nach td { background: #EFEFEC; color: #5E625C; }
tr.warn.nach td { background: #F3E2DE; }
tfoot td { font-weight: 700; border-top: 2px solid #C9A87C; border-bottom: 0; }
.unterschrift { margin-top: 28px; display: flex; gap: 32px; flex-wrap: wrap; }
.unterschrift div { flex: 1; min-width: 200px; border-top: 1px solid #1F2A24; padding-top: 4px; color: #55604F; font-size: 9pt; }
footer { margin-top: 18px; color: #55604F; font-size: 8.5pt; }
@media screen { body { max-width: 900px; margin: 0 auto; } }
@media print { body { padding: 0; } tr.warn td, tr.spaet td, tr.nach td { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
</style></head><body>
<header><div><h1>${esc(dok.titel)}</h1><div class="laden">${esc(dok.laden)}${dok.beispiel ? ` · ${esc(dok.beispiel)}` : ""}</div></div><div class="meta">${esc(dok.zeitraum)}<br>${esc(dok.erstellt)}</div></header>
${(dok.abschnitte || []).map(abschnitt).join("\n")}
${dok.unterschrift ? `<div class="unterschrift">${dok.unterschrift.map((u) => `<div>${esc(u)}</div>`).join("")}</div>` : ""}
${dok.fuss ? `<footer>${esc(dok.fuss)}</footer>` : ""}
</body></html>`;
}
