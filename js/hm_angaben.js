// Angaben des Hinweis-Motors (Lauf 3, Phase 5, 09.11.2026): stand.betrieb.hmAngaben säubern. Ohne Importe, damit store.js es beim Laden
// fremder Dateien nutzen kann (Migration). Inhalt der Hinweise: js/hinweis_motor.js.
export const HM_STATUS = ["offen", "erledigt", "geklaert", "passt_nicht"];
export const HM_ID_LISTE = ["hm_u2", "hm_u1", "hm_vz", "hm_arbeitszeit", "hm_sofortmeldung", "hm_ausweis", "hm_midijob", "hm_gema", "hm_rundfunk", "hm_lucid", "hm_belehrung", "hm_allergene", "hm_elektro"];
const IDS = new Set(HM_ID_LISTE);
const gueltigTag = (x) => typeof x === "string" && /^\d{4}-\d{2}-\d{2}$/.test(x);
export const HM_FRAGEN = ["musik", "schwanger", "elektroGeprueft"];
export function hmAngabenSauber(a) {
  const o = a && typeof a === "object" && !Array.isArray(a) ? a : {};
  const bool = (x) => (x === true || x === false ? x : null);
  const status = {}, quittiert = {}, gezeigt = {};
  for (const [id, e] of Object.entries(o.status && typeof o.status === "object" ? o.status : {}))
    if (IDS.has(id) && e && HM_STATUS.includes(e.status)) status[id] = { status: e.status, datum: gueltigTag(e.datum) ? e.datum : null };
  for (const [id, l] of Object.entries(o.quittiert && typeof o.quittiert === "object" ? o.quittiert : {}))
    if (IDS.has(id) && Array.isArray(l)) quittiert[id] = [...new Set(l.filter((x) => typeof x === "string" && x.length <= 64))].slice(0, 200);
  for (const [id, d] of Object.entries(o.gezeigt && typeof o.gezeigt === "object" ? o.gezeigt : {}))
    if (IDS.has(id) && gueltigTag(d)) gezeigt[id] = d;
  return { musik: bool(o.musik), schwanger: bool(o.schwanger), elektroGeprueft: gueltigTag(o.elektroGeprueft) || o.elektroGeprueft === "nie" ? o.elektroGeprueft : null, // "nie" = noch nie geprüft (Frage beantwortet)
    status, quittiert, gezeigt, ladenZuletzt: gueltigTag(o.ladenZuletzt) ? o.ladenZuletzt : null };
}
