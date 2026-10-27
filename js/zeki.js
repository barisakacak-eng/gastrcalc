// Zekis Kopf (Kurswechsel 24.10.2026): Welche Lage ist jetzt die wichtigste, welcher Satz passt, welche Bewegung macht Zeki?
// Rein: liest den Stand, schreibt nichts, gibt kein HTML zurück. Darstellung und Animation macht die Oberfläche (zekiSpielen, Sanji PR #16).
// Regeln: höchstens ein Satz je Moment; jede Lage höchstens einmal je Geschäftstag (gesehen); Reihenfolge = ZEKI_AUSLOESER (Gefahr vor Geld vor Pflege).
// Sätze aus js/data/zeki_saetze.js (Frankys Format). Platzhalter werden hier gefüllt; fehlt ein Wert, fällt der Satz weg (kein „{betrag}“ auf dem Schirm).
import { ZEKI_AUSLOESER, ZEKI_SAETZE } from "./data/zeki_saetze.js";
import { ZEKI_SAETZE_MEHR } from "./data/zeki_mehrsprachig.js";
import { offeneNachkontrollen, kuehlStatus, umsatzEintrag, schwundAuswertung, tagPlus, SCHWUND_ARTEN } from "./engine.js";
import { zaehler } from "./zaehler.js";
import { inventurenFertig } from "./inventur.js";
import { hinweiseFuer } from "./hinweis.js";
import { planGruppen } from "./putzplan.js";
import { fmtEuro } from "./util.js";

const tageZwischen = (a, b) => Math.round((Date.parse(b + "T12:00:00") - Date.parse(a + "T12:00:00")) / 86400000);
const stelleName = (stand, id) => (stand.kuehlstellen || []).find((k) => k.id === id)?.name || "";
const istMuell = (e) => e && !e.storniert && (SCHWUND_ARTEN[e.art] || 1) === 1;

// Jede Prüfung liefert null (Lage trifft nicht zu) oder die Werte für die Platzhalter.
export const ZEKI_PRUEFUNGEN = {
  kuehl_abweichung: (s) => { const nk = offeneNachkontrollen(s); return nk.length ? { stelle: stelleName(s, nk[0].messung.stelle) || "1" } : null; },
  kuehl_offen: (s) => { const k = kuehlStatus(s); return k.eingerichtet && k.heuteGemessen < k.stellen ? { tage: String(k.stellen - k.heuteGemessen) } : null; },
  putzen_offen: (s, H) => { if (!s.putzplan?.aktiv) return null; const n = planGruppen(s, H).ueberfaellig; return n > 0 ? { anzahl: String(n) } : null; },
  umsatz_fehlt: (s, H) => ((s.tagesnotizen || []).length && !umsatzEintrag(s, tagPlus(H, -1)) && !umsatzEintrag(s, H) ? {} : null),
  karte_leer: (s) => ((s.gerichte || []).length ? null : {}),
  preis_fehlt: (s) => { const g = (s.gerichte || []).find((x) => x.klasse !== "getraenk" && typeof x.preis !== "number"); return g ? { gericht: g.name } : null; },
  erster_muell: (s, H) => { const m = (s.schwund || []).filter(istMuell); return m.length === 1 && m[0].datum === H ? {} : null; },
  muell_hoch: (s, H) => {
    const heute = schwundAuswertung(s, { von: H, bis: H }).muellwert; if (!(heute > 0)) return null;
    const vor = schwundAuswertung(s, { von: tagPlus(H, -14), bis: tagPlus(H, -1) });
    const tage = new Set((s.schwund || []).filter((e) => istMuell(e) && e.datum >= tagPlus(H, -14) && e.datum < H).map((e) => e.datum)).size;
    if (tage < 7) return null; // erst ab einer Woche mit Einträgen gibt es ein „sonst“
    return heute > 1.5 * (vor.muellwert / tage) ? { betrag: fmtEuro(heute, { dezimal: 2 }) } : null;
  },
  ziel_erreicht: (s, H) => { const z = zaehler(s, { datum: H }); return z.kippTag === H && !z.keinUmsatz ? {} : null; },
  tag_abgeschlossen: (s, H) => {
    if (!(s.abschluesse || []).some((a) => a && !a.storniert && a.datum === H)) return null;
    const z = zaehler(s, { datum: H }); return typeof z.stand === "number" && z.stand < 0 ? { betrag: fmtEuro(-z.stand, { dezimal: 0 }) } : null;
  },
  inventur_faellig: (s, H) => { const f = inventurenFertig(s); if (!f.length) return null; const t = tageZwischen(f[f.length - 1].datum, H); return t >= 30 ? { tage: String(t) } : null; },
  sicherung_alt: (s, H, o) => (typeof o.sicherungTage === "number" && o.sicherungTage >= 7 ? { tage: String(o.sicherungTage) } : null),
  hinweis_neu: (s) => (hinweiseFuer(s).some((h) => h.status === "neu") ? {} : null),
};

// Zeki auf jedem Bildschirm (Baris 26.10.2026): welche Lagen auf welchem Bildschirm zählen. Heute nimmt alle (zekiReihe in screens/home.js).
export const ZEKI_BILDSCHIRM = {
  muell: ["erster_muell", "muell_hoch"],
  kuehl: ["kuehl_abweichung", "kuehl_offen"],
  putzplan: ["putzen_offen"],
  karte: ["karte_leer", "preis_fehlt"],
  abschluss: ["umsatz_fehlt", "tag_abgeschlossen", "ziel_erreicht"],
  umsatzheute: ["umsatz_fehlt"],
  buero: ["hinweis_neu", "inventur_faellig", "sicherung_alt"],
  hinweise: ["hinweis_neu"],
  inventur: ["inventur_faellig"],
  einstellungen: ["sicherung_alt"],
};

const fuellen = (text, w) => { let fehlt = false; const t = String(text || "").replace(/\{(\w+)\}/g, (_, k) => (w[k] != null && w[k] !== "" ? w[k] : ((fehlt = true), ""))); return fehlt ? null : t; };

// Der eine Moment: { id, ausloeser, art, bewegung, text } oder null.
// opts: H (Geschäftstag), sprache ("de"|"tr"|"en"), gesehen (Set „ausloeser:H“ schon gezeigt), sicherungTage, nur (Liste erlaubter Auslöser)
export function zekiMoment(stand, { H, sprache = "de", gesehen = new Set(), sicherungTage = null, nur = null } = {}) {
  if (!stand || !H) return null;
  for (const a of ZEKI_AUSLOESER) {
    if (nur && !nur.includes(a)) continue;
    if (gesehen.has(`${a}:${H}`)) continue;
    let werte = null; try { werte = ZEKI_PRUEFUNGEN[a](stand, H, { sicherungTage }); } catch { werte = null; }
    if (!werte) continue;
    const saetze = ZEKI_SAETZE.filter((x) => x.ausloeser === a);
    // gleichbleibend je Tag, wechselt von Tag zu Tag (keine Zufallszahl → testbar)
    const start = [...H].reduce((n, c) => n + c.charCodeAt(0), 0) % (saetze.length || 1);
    for (let i = 0; i < saetze.length; i++) {
      const x = saetze[(start + i) % saetze.length];
      const text = fuellen(x[sprache] || ZEKI_SAETZE_MEHR[sprache]?.[x.id] || (sprache === "de" ? x.de : x.en || x.de), werte); // 27.10.2026: sonst Englisch statt Deutsch
      if (text) return { id: x.id, ausloeser: a, art: x.art, bewegung: x.bewegung, text };
    }
  }
  return null;
}
