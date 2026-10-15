// Büro-Ordner „Gesundheitsamt“ (Drei Ebenen, 15.10.2026): Eigenkontrollen als reine Daten, CSV und druckbares Dokument.
// Vier Teile: Kühlprotokoll, Putzplan-Nachweis, Belehrungen (§ 43 IfSG), Eigenkontroll-Konzept (Kurzfassung).
// Keine Oberfläche, keine Übersetzung – die Ansicht (screens/ordner.js) gibt Texte hinein. Testbar in node (tests/export.test.mjs).
//
// Neu: Belehrungen je Person. Gelesen aus person.belehrungen = [{ datum, art }] UND aus dem Journal stand.belehrungen =
// [{ id, person, datum: "JJJJ-MM-TT", art: "erst" | "folge", erfasst, storniert }]. Geschrieben wird ins Journal am Laden, weil
// migrierenBetrieb (store.js, Entwickler F) Personen auf { id, kuerzel, aktiv, entfernt } zurechtschneidet – person.belehrungen ginge beim Laden verloren.
// Erstbelehrung macht das Gesundheitsamt (oder ein beauftragter Arzt), danach belehrt der Arbeitgeber alle zwei Jahre (§ 43 Abs. 4 IfSG).
import { aktiveStellen, grenzenVon, monatsblatt, nachkontrolleErledigt, tagPlus, MASSNAHMEN } from "./engine.js";
import { aufgabenFuer, nachweis } from "./putzplan.js";
import { ladenArtVon } from "./profil.js";
import { esc, heute } from "./util.js";
import { csvText, datumDe } from "./export_steuer.js";

export const BELEHRUNG_MONATE = 24;  // Folgebelehrung alle zwei Jahre
export const BELEHRUNG_BALD_TAGE = 60; // ab zwei Monaten vorher: „bald fällig“ (Erinnerung im Büro, nicht im Laden)
const ISO = /^\d{4}-\d{2}-\d{2}$/;
const gueltig = (d) => typeof d === "string" && ISO.test(d) && !Number.isNaN(Date.parse(d + "T12:00:00"));
const tageZwischen = (a, b) => Math.round((Date.parse(b + "T12:00:00") - Date.parse(a + "T12:00:00")) / 86400e3);
const min = (a, b) => (a < b ? a : b), max = (a, b) => (a > b ? a : b);
const zeitAus = (iso) => { const d = new Date(iso); return Number.isNaN(d.getTime()) ? "" : `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`; };
const personName = (stand, id) => (stand.personen || []).find((p) => p.id === id)?.kuerzel || "";

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
export function kuehlprotokoll(stand, z, { datum = heute() } = {}) {
  const stellen = stand.kuehlstellen || [];
  const stelle = (id) => stellen.find((k) => k.id === id);
  const ms = (stand.messungen || []).filter((m) => !m.storniert && typeof m.datum === "string" && m.datum >= z.von && m.datum <= z.bis)
    .sort((a, b) => a.datum.localeCompare(b.datum) || String(a.zeit).localeCompare(String(b.zeit)));
  const zeilen = ms.map((m) => {
    const nk = m.abweichung && m.nachkontrolle ? (nachkontrolleErledigt(stand, m) ? "erledigt" : "offen") : null;
    const behoben = m.abweichung ? (m.massnahmen || []).length > 0 && nk !== "offen" : null;
    return { datum: m.datum, zeit: zeitAus(m.zeit), stelle: stelle(m.stelle)?.name || "?", art: stelle(m.stelle)?.art || "kuehl", wert: typeof m.wert === "number" ? m.wert : null,
      grund: m.grund || null, min: m.min ?? null, max: m.max ?? null, abweichung: !!m.abweichung, massnahmen: m.massnahmen || [], nachkontrolle: nk, behoben, von: personName(stand, m.von), nacherfasst: !!m.nacherfasst, notiz: m.notiz || "" };
  });
  const abweichungen = zeilen.filter((x) => x.abweichung).length;
  const behoben = zeilen.filter((x) => x.abweichung && x.behoben).length;
  // Lücken: Tage bis gestern, an denen eine aktive Stelle ohne Messung blieb (Ruhetage und Tage vor der Einrichtung zählen nicht)
  const aktiv = aktiveStellen(stand); const bisGestern = min(z.bis, tagPlus(datum, -1));
  const fehlt = new Set();
  if (aktiv.length && z.von <= bisGestern) for (const k of aktiv) for (const t of monatsblatt(stand, k.id, { von: z.von, bis: bisGestern }).tage) if (t.status === "fehlt") fehlt.add(t.datum);
  const luecken = [...fehlt].sort();
  return { zeilen, anzahl: zeilen.filter((x) => x.wert !== null).length, eintraege: zeilen.length, abweichungen, behoben, offen: abweichungen - behoben, luecken, stellen: aktiv.length,
    vollstaendig: aktiv.length > 0 && zeilen.length > 0 && abweichungen === behoben && luecken.length === 0 };
}

// ---------- Putzplan-Nachweis ----------
// Ein Tag gilt als abgehakt, wenn alle Tagesaufgaben einen Haken haben. Heute zählt erst mit, wenn er schon vollständig ist.
export function putznachweis(stand, z, { datum = heute() } = {}) {
  const plan = stand.putzplan;
  if (!plan?.aktiv) return { aktiv: false, aufgaben: [], tage: 0, tageGesamt: 0, luecken: [], eintraege: [], vollstaendig: false };
  const aufgaben = aufgabenFuer(plan).filter((a) => a.takt !== "nach");
  const tagIds = aufgaben.filter((a) => a.takt === "tag").map((a) => a.id);
  const log = nachweis(stand, z.von, z.bis);
  const jeTag = {}; for (const e of log) (jeTag[e.datum] ??= new Set()).add(e.aufgabe);
  const ruhetage = new Set(stand.kuehl?.ruhetage || []);
  const start = max(z.von, plan.seit && gueltig(plan.seit) ? plan.seit : z.von); const ende = min(z.bis, datum);
  let tage = 0, tageGesamt = 0; const luecken = [];
  for (let d = start; d <= ende; d = tagPlus(d, 1)) {
    if (ruhetage.has(new Date(d + "T12:00:00").getDay()) && !jeTag[d]) continue;
    const voll = tagIds.length > 0 && tagIds.every((id) => jeTag[d]?.has(id));
    if (d === datum && !voll) continue; // heute ist noch nicht vorbei
    tageGesamt += 1; if (voll) tage += 1; else luecken.push(d);
  }
  const text = Object.fromEntries(aufgaben.map((a) => [a.id, a.text]));
  const eintraege = log.slice().reverse().map((e) => ({ datum: e.datum, zeit: e.zeit || "", aufgabe: e.aufgabe, text: text[e.aufgabe] || null, von: personName(stand, e.von) }));
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
export function belehrungen(stand, { datum = heute() } = {}) {
  const zeilen = aktivePersonen(stand).map((p) => ({ id: p.id, name: p.kuerzel || "?", ...belehrungStatus({ belehrungen: belehrungenVon(stand, p) }, datum) }));
  const zaehl = { ok: 0, bald: 0, ueberfaellig: 0, fehlt: 0 }; for (const x of zeilen) zaehl[x.status] += 1;
  const naechste = zeilen.filter((x) => x.status !== "ok").sort((a, b) => (a.tage ?? -1e9) - (b.tage ?? -1e9))[0] || null;
  return { zeilen, zaehl, naechste, vollstaendig: zeilen.length > 0 && zaehl.ok === zeilen.length };
}
// Eintragen: Datum nicht in der Zukunft, Art erst | folge, gleicher Eintrag nicht doppelt. Rückgabe: der Eintrag oder null.
export function belehrungEintragen(stand, personId, { datum, art = "folge", jetzt = new Date().toISOString(), bisHeute = heute() } = {}) {
  const p = (stand.personen || []).find((x) => x.id === personId);
  if (!p || !gueltig(datum) || datum > bisHeute || !["erst", "folge"].includes(art)) return null;
  if (belehrungenVon(stand, p).some((b) => b.datum === datum && b.art === art)) return null;
  stand.belehrungen ??= [];
  const e = { id: `bel-${personId}-${datum}-${art}`, person: personId, datum, art, erfasst: jetzt, storniert: false }; stand.belehrungen.push(e); return e;
}
// Rücknahme: nur kennzeichnen (Journal), nie löschen
export function belehrungEntfernen(stand, personId, datum, art) {
  const e = (stand.belehrungen || []).find((b) => !b.storniert && b.person === personId && b.datum === datum && b.art === art); if (!e) return false;
  e.storniert = true; e.storniertZeit = new Date().toISOString(); return true;
}

// ---------- Eigenkontroll-Konzept (Kurzfassung) ----------
export function eigenkontrolle(stand) {
  const plan = stand.putzplan?.aktiv ? stand.putzplan : null;
  const kuehlstellen = aktiveStellen(stand).map((k) => { const g = grenzenVon(k); return { name: k.name || "?", art: k.art || "kuehl", min: g.min, max: g.max, standard: g.standard }; });
  const aufgaben = plan ? aufgabenFuer(plan) : [];
  const jeTakt = {}; for (const a of aufgaben) jeTakt[a.takt] = (jeTakt[a.takt] || 0) + 1;
  return { ladenArt: ladenArtVon(stand), geraete: plan?.geraete || [], kuehlstellen, takt: stand.kuehl?.takt === 2 ? 2 : 1, ruhetage: stand.kuehl?.ruhetage || [],
    putzplan: !!plan, aufgaben: aufgaben.length, jeTakt, massnahmen: MASSNAHMEN, personen: aktivePersonen(stand).length,
    vollstaendig: (kuehlstellen.length > 0 || stand.kuehl?.keine === true) && !!plan };
}

// ---------- Der Ordner ----------
export const AMT_TEILE = ["kuehl", "putz", "belehrung", "konzept"];
export function ordnerAmt(stand, z, { datum = heute() } = {}) {
  const teile = { kuehl: kuehlprotokoll(stand, z, { datum }), putz: putznachweis(stand, z, { datum }), belehrung: belehrungen(stand, { datum }), konzept: eigenkontrolle(stand) };
  const vollstaendig = AMT_TEILE.filter((t) => teile[t].vollstaendig).length;
  return { zeitraum: z, teile, vollstaendig, gesamt: AMT_TEILE.length, prozent: Math.round(vollstaendig / AMT_TEILE.length * 100) };
}

// CSV je Teil; kopf und namen (Übersetzer für Kennungen) kommen von der Ansicht
export function amtCsv(o, teil, kopf, namen = {}) {
  const n = (f, k) => (namen[f] ? namen[f](k) : k);
  if (teil === "kuehl") return csvText(kopf, o.teile.kuehl.zeilen.map((x) => [datumDe(x.datum), x.zeit, x.stelle, x.wert ?? n("grund", x.grund), x.min, x.max, x.abweichung ? n("ja", "x") : "", x.massnahmen.map((m) => n("massnahme", m)).join(", "), x.nachkontrolle ? n("nachkontrolle", x.nachkontrolle) : "", x.von, x.nacherfasst ? n("ja", "x") : ""]), { dezimal: [0, 0, 0, 1, 1, 1] });
  if (teil === "putz") return csvText(kopf, o.teile.putz.eintraege.map((x) => [datumDe(x.datum), x.zeit, n("aufgabe", x), x.von]));
  if (teil === "belehrung") return csvText(kopf, o.teile.belehrung.zeilen.map((x) => [x.name, datumDe(x.erst), datumDe(x.letzte), datumDe(x.faellig), n("status", x.status)]));
  if (teil === "konzept") return csvText(kopf, o.teile.konzept.kuehlstellen.map((k) => [k.name, n("kuehlart", k.art), k.min, k.max, k.standard ? n("ja", "x") : ""]), { dezimal: [0, 0, 1, 1] });
  return csvText(kopf, []);
}

// ---------- Druckdokument ----------
// dok = { titel, laden, zeitraum, erstellt, sprache, abschnitte: [{ titel, info, kopf: [..], zeilen: [[..]], rechts: [Spaltenindex], leer, warn }], unterschrift, fuss }
// Alle Zellen sind schon fertige Texte; hier wird nur escaped und gesetzt. Eigenes CSS, A4, ohne App-Stile, ohne Verbindung nach außen.
export function druckHtml(dok) {
  const abschnitt = (a) => `<section><h2>${esc(a.titel)}</h2>${a.info ? `<p class="info${a.warn ? " warn" : ""}">${esc(a.info)}</p>` : ""}
    ${a.zeilen?.length ? `<div class="tab"><table><thead><tr>${a.kopf.map((k, i) => `<th${(a.rechts || []).includes(i) ? ' class="r"' : ""}>${esc(k)}</th>`).join("")}</tr></thead>
    <tbody>${a.zeilen.map((z) => `<tr${z.warn ? ' class="warn"' : ""}>${(z.zellen || z).map((c, i) => `<td${(a.rechts || []).includes(i) ? ' class="r"' : ""}>${esc(c)}</td>`).join("")}</tr>`).join("")}</tbody>
    ${a.summe ? `<tfoot><tr>${a.summe.map((c, i) => `<td${(a.rechts || []).includes(i) ? ' class="r"' : ""}>${esc(c)}</td>`).join("")}</tr></tfoot>` : ""}</table></div>` : a.leer ? `<p class="leer">${esc(a.leer)}</p>` : ""}</section>`;
  return `<!doctype html><html lang="${esc(dok.sprache || "de")}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${esc(dok.titel)} – ${esc(dok.laden)} – ${esc(dok.zeitraum)}</title>
<style>
@page { size: A4; margin: 16mm 14mm 18mm; }
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
tfoot td { font-weight: 700; border-top: 2px solid #C9A87C; border-bottom: 0; }
.unterschrift { margin-top: 28px; display: flex; gap: 32px; flex-wrap: wrap; }
.unterschrift div { flex: 1; min-width: 200px; border-top: 1px solid #1F2A24; padding-top: 4px; color: #55604F; font-size: 9pt; }
footer { margin-top: 18px; color: #55604F; font-size: 8.5pt; }
@media screen { body { max-width: 900px; margin: 0 auto; } }
@media print { body { padding: 0; } }
</style></head><body>
<header><div><h1>${esc(dok.titel)}</h1><div class="laden">${esc(dok.laden)}</div></div><div class="meta">${esc(dok.zeitraum)}<br>${esc(dok.erstellt)}</div></header>
${(dok.abschnitte || []).map(abschnitt).join("\n")}
${dok.unterschrift ? `<div class="unterschrift">${dok.unterschrift.map((u) => `<div>${esc(u)}</div>`).join("")}</div>` : ""}
${dok.fuss ? `<footer>${esc(dok.fuss)}</footer>` : ""}
</body></html>`;
}
