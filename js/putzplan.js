// Putzplan (Empfehlung nach HACCP, Baris 15.10.2026): Plan = Stammdaten, Abhaken = Protokoll (Liste für die Lebensmittelkontrolle).
// Protokoll wird nie gelöscht, nur storniert. Empfehlung der Recherche: mindestens 12, besser 24 Monate aufbewahren.
import { imTakt } from "./takt.js";
import { AUFGABEN, TAKT_TAGE, GERAETE_JE_ART, STANDARD_AUS } from "./data/putzplan.js";
import { heute, uid } from "./util.js";
import { ladenArtVon } from "./profil.js";

export const planVon = (stand) => stand.putzplan || null;

// Plan anlegen: Geräte aus Laden-Art und Kühlstellen vorschlagen
export function planVorschlag(stand) {
  const art = ladenArtVon(stand) || "anders";
  const g = new Set(GERAETE_JE_ART[art] || GERAETE_JE_ART.anders);
  for (const k of stand.kuehlstellen || []) { if (k.archiviert) continue;
    if (k.art === "tk") g.add("tiefkuehler"); else if (k.art === "kuehl") g.add(/theke|saladette|vitrine/i.test(k.name || "") ? "saladette" : "kuehlschrank"); }
  return { aktiv: false, geraete: [...g], aus: [...STANDARD_AUS], seit: null };
}

export const aufgabenFuer = (plan) => AUFGABEN.filter((a) => (a.gilt === "alle" || plan.geraete.includes(a.gilt)) && !plan.aus.includes(a.id));

const tageZwischen = (a, b) => Math.round((new Date(b + "T12:00") - new Date(a + "T12:00")) / 86400000);
export function letzteErledigung(stand, id) {
  const letzte = imTakt(stand, "putzLetzte", () => { const m = new Map();
    for (const e of stand.putzlog || []) { if (e.storniert) continue; const l = m.get(e.aufgabe); if (!l || e.datum > l.datum || (e.datum === l.datum && e.zeit > l.zeit)) m.set(e.aufgabe, e); }
    return m; });
  return letzte.get(id) || null;
}

// Stand je Aufgabe: erledigt (in diesem Takt schon gemacht), faellig, ueberfaellig (deutlich drüber), hinweis (nach Benutzung)
export function aufgabenStand(stand, datum = heute()) {
  const plan = planVon(stand); if (!plan?.aktiv) return [];
  return aufgabenFuer(plan).map((a) => {
    if (a.takt === "nach") return { ...a, status: "hinweis" };
    const l = letzteErledigung(stand, a.id); const takt = TAKT_TAGE[a.takt];
    const alter = l ? tageZwischen(l.datum, datum) : (plan.seit ? tageZwischen(plan.seit, datum) : 0);
    // Neu im Plan (Nachtester 15.10.): Tagesaufgaben sind sofort fällig, alles andere erst, wenn sein Takt seit Planbeginn um ist.
    const status = l && alter < takt ? "erledigt" : !l && takt > 1 && alter < takt ? "spaeter" : !l && alter < takt ? "faellig" : alter >= Math.max(takt + 1, Math.ceil(takt * 1.3)) ? "ueberfaellig" : "faellig";
    return { ...a, status, letzte: l, alter };
  });
}

// Gruppen für die Ansicht: heute (Tagesaufgaben), diese Woche, diesen Monat, später (Quartal/Jahr), nur Fälliges außer heute
export function planGruppen(stand, datum = heute()) {
  const alle = aufgabenStand(stand, datum);
  const tag = alle.filter((a) => a.takt === "tag");
  const woche = alle.filter((a) => a.takt === "woche"); const monat = alle.filter((a) => a.takt === "monat");
  const spaeter = alle.filter((a) => ["quartal", "jahr", "zweijahre"].includes(a.takt));
  const hinweise = alle.filter((a) => a.status === "hinweis");
  const zaehl = [...tag, ...woche, ...monat, ...spaeter];
  const heuteErledigt = zaehl.filter((a) => a.status === "erledigt" && a.letzte?.datum === datum).length;
  const offen = zaehl.filter((a) => a.status === "faellig" || a.status === "ueberfaellig").length;
  return { tag, woche, monat, spaeter, hinweise, erledigt: heuteErledigt, offen, gesamt: offen + heuteErledigt, ueberfaellig: zaehl.filter((a) => a.status === "ueberfaellig").length };
}

export function abhaken(stand, id, { datum = heute(), von = null } = {}) {
  stand.putzlog ??= [];
  const e = { id: uid(), aufgabe: id, datum, zeit: new Date().toTimeString().slice(0, 5), erfasst: new Date().toISOString(), von, storniert: false };
  stand.putzlog.push(e); return e;
}
// W2-H: wer zurücknimmt, wird mitgeschrieben (Amt-Druck „Zurückgenommen / geändert“)
export function zuruecknehmen(stand, id, datum = heute(), { von = null } = {}) {
  const e = (stand.putzlog || []).filter((x) => x.aufgabe === id && x.datum === datum && !x.storniert).pop();
  if (e) { e.storniert = true; e.storniertZeit = new Date().toISOString(); e.storniertVon = von; } return !!e;
}

// Liste für die Kontrolle: Einträge eines Zeitraums, neueste zuerst
export const nachweis = (stand, von, bis) => (stand.putzlog || []).filter((e) => !e.storniert && e.datum >= von && e.datum <= bis).sort((a, b) => (b.datum + b.zeit).localeCompare(a.datum + a.zeit));
export const zurueckgenommen = (stand, von, bis) => (stand.putzlog || []).filter((e) => e.storniert && e.datum >= von && e.datum <= bis);

// W2-H (p03 K2): Putzplan mit Gültig-ab. plan.verlauf = [{ ab, geraete, aus, erfasst }]; ab "" bzw. plan.seit = von Anfang an.
// Eine Änderung gilt ab heute; alte Tage werden nach dem alten Plan bewertet.
const planVerlauf = (plan) => (Array.isArray(plan?.verlauf) ? plan.verlauf : []).filter((e) => e && typeof e.ab === "string" && Array.isArray(e.geraete) && Array.isArray(e.aus)).slice().sort((a, b) => (a.ab < b.ab ? -1 : a.ab > b.ab ? 1 : 0));
export const putzplanVerlauf = (stand) => planVerlauf(planVon(stand));
export function planAm(stand, datum) {
  const plan = planVon(stand); if (!plan) return null;
  const v = planVerlauf(plan); if (!v.length) return plan;
  let x = v[0]; for (const e of v) { if (e.ab <= datum) x = e; else break; }
  return { ...plan, geraete: x.geraete, aus: x.aus };
}
export function planUebernehmen(stand, entwurf, datum = heute(), jetzt = new Date().toISOString()) {
  const alt = planVon(stand);
  const neu = { ...entwurf, geraete: [...entwurf.geraete], aus: [...entwurf.aus], aktiv: true, seit: alt?.seit || datum };
  delete neu.verlauf;
  if (alt?.aktiv) {
    const v = planVerlauf(alt);
    if (!v.length) v.push({ ab: "", geraete: [...alt.geraete], aus: [...alt.aus], erfasst: null });
    const e = { ab: datum, geraete: [...neu.geraete], aus: [...neu.aus], erfasst: jetzt };
    if (v[v.length - 1].ab === datum) v[v.length - 1] = e; else v.push(e);
    const gleich = (a, b) => a.length === b.length && a.every((x) => b.includes(x));
    const [p, q] = [v[v.length - 2], v[v.length - 1]];
    if (p && q.ab === datum && gleich(p.geraete, q.geraete) && gleich(p.aus, q.aus)) v.pop();
    neu.verlauf = v;
  }
  stand.putzplan = neu; return neu;
}
