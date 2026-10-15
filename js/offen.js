// Drei Ebenen (15.10.2026), Entwickler B: was darf im Laden melden – und was wartet im Büro.
// Laden „Heute“ zeigt höchstens EINE Aufgabe („Jetzt dran“) aus einer festen Liste (jetztDran). Alles andere, was früher das Cockpit
// gefüllt hat (Einrichtungsring, Kostenlücken, Waage-Vorschlag, graue Gerichte, Hinweise, neue Fassung …), liefert offenImBuero()
// als Liste für die Büro-Startseite. Reine Logik, kein HTML (außer dem kleinen Helfer zielAttr für data-Attribute).
import { t } from "./i18n.js";
import { heute } from "./util.js";
import { kuehlStatus, offeneNachkontrollen, kalkulation, schwundOhneWert, aktiveStellen, letzteMessung, tagPlus, rundgangAbweichungen, abweichungStand } from "./engine.js"; // W2-H: rundgangAbweichungen, abweichungStand
import { zaehler, abschlussVon } from "./zaehler.js";
import { planGruppen } from "./putzplan.js";
import { einrichtungStand } from "./einrichtung.js";
import { wareneinsatzSicherheit } from "./rezept_quelle.js";
import { sicherungStufe } from "./screens/nav.js";

// Hauptzeiten im Laden: da stört keine Erinnerung, die warten kann (Sicherung).
export const istHauptzeit = (h) => (h >= 11.5 && h < 14) || (h >= 17.5 && h < 20.5);
const stunde = (d) => d.getHours() + d.getMinutes() / 60;

// ziel → data-Attribute für einen Knopf ({ aktion: "nav", wert } | { aktion: "bearbeiten", schritt, bis } | { aktion: "<name>" })
export function zielAttr(z) {
  if (!z) return "";
  const q = (v) => String(v).replace(/"/g, "&quot;");
  if (z.aktion === "nav") return `data-a="nav" data-wert="${q(z.wert)}"${z.anker ? ` data-anker="${q(z.anker)}"` : ""}`;
  if (z.aktion === "bearbeiten") return `data-a="bearbeiten" data-schritt="${q(z.schritt)}"${z.bis ? ` data-bis="${q(z.bis)}"` : ""}`;
  return `data-a="${q(z.aktion)}"${z.offen !== undefined ? ` data-offen="${q(z.offen)}"` : ""}`;
}

// „Jetzt dran“ im Laden – nur diese Fälle, in dieser Reihenfolge, immer nur einer:
//  1. Kühlwert außerhalb der Grenze / Nachkontrolle offen → rot, „Nachmessen“
//  2. Kühlrundgang offen (angefangen; oder heute noch nicht gemessen: morgens bis 15 Uhr, abends ab 17 Uhr)
//  3. Putzaufgabe überfällig
//  4. Sicherung älter als 7 Tage – nur außerhalb der Hauptzeiten (11:30–14:00, 17:30–20:30)
//  5. ab 18 Uhr: Tag abschließen (wenn noch nicht abgeschlossen)
// Rückgabe: null oder { id, ton: "rot" | "normal", symbol, titel, knopf, ziel }
export function jetztDran(stand, wurzel, { jetzt = new Date() } = {}) {
  const h = stunde(jetzt); const H = heute(jetzt);
  const ks = kuehlStatus(stand);
  if (ks.eingerichtet) {
    const nk = offeneNachkontrollen(stand);
    const jetzt_ = rundgangAbweichungen(stand)[0]; // W2-H (p01 K3): Wert außerhalb der Grenze im offenen Rundgang → sofort rot
    const abw = (jetzt_ ? { k: aktiveStellen(stand).find((k) => k.id === jetzt_.stelle), m: jetzt_ } : null) || aktiveStellen(stand).map((k) => ({ k, m: letzteMessung(stand, k.id) })).find((x) => x.m && x.m.abweichung);
    const stelle = abw?.k || (nk.length ? aktiveStellen(stand).find((k) => k.id === nk[0].messung.stelle) : null);
    if (abw || nk.length) {
      const m = abw?.m || nk[0].messung; const zuKalt = typeof m.min === "number" && typeof m.wert === "number" && m.wert < m.min;
      return { id: "kuehlAlarm", ton: "rot", symbol: "thermometer", titel: t(zuKalt ? "heute.dran.zuKalt" : "heute.dran.zuWarm", stelle?.name || t("heute.kachel.kuehlung")), knopf: t("heute.dran.nachmessen"), ziel: { aktion: "nav", wert: "kuehl" } };
    }
    if (ks.offenerRundgang) return { id: "rundgangOffen", ton: "normal", symbol: "snowflake", titel: t("heute.dran.rundgangWeiter"), knopf: t("heute.dran.los"), ziel: { aktion: "kuehl-rundgang-start", offen: "0" } };
    if (ks.heuteGemessen < ks.stellen && (h < 15 || h >= 17)) return { id: "rundgang", ton: "normal", symbol: "snowflake", titel: t("heute.dran.rundgang"), knopf: t("heute.dran.los"), ziel: { aktion: "kuehl-rundgang-start", offen: "0" } };
  }
  if (stand.putzplan?.aktiv) { const pg = planGruppen(stand, H); if (pg.ueberfaellig) return { id: "putzen", ton: "normal", symbol: "spray-can", titel: t("heute.dran.putzen", pg.ueberfaellig), knopf: t("heute.dran.los"), ziel: { aktion: "nav", wert: "putzplan" } }; }
  if (!istHauptzeit(h) && sicherungStufe(wurzel, jetzt.getTime())?.stufe === "rot") return { id: "sicherung", ton: "normal", symbol: "package", titel: t("heute.dran.sicherung"), knopf: t("heute.dran.sichern"), ziel: { aktion: "export" } };
  if (h >= 18 && !abschlussVon(stand, H)) return { id: "abschluss", ton: "dunkel", symbol: "check", titel: t("heute.dran.abschluss"), knopf: t("heute.dran.los"), ziel: { aktion: "nav", wert: "abschluss" } };
  return null;
}

// „Offen im Büro“: alles, was früher im Laden gemeldet hat und jetzt warten darf. Reihenfolge = Wichtigkeit.
// Rückgabe: [{ id, text, ziel }] – ziel wie oben (zielAttr macht daraus data-Attribute). Developer C zeigt die Liste im Büro.
export function offenImBuero(stand, wurzel, { jetzt = new Date(), aktualisierung = false } = {}) {
  const out = []; const H = heute(jetzt);
  const add = (id, text, ziel) => out.push({ id, text, ziel });
  if (aktualisierung) add("fassung", t("heute.offen.fassung"), { aktion: "aktualisieren" });
  const e = einrichtungStand(stand, wurzel);
  if (e.prozent < 100 && e.naechster) add("einrichtung", t("heute.offen.einrichtung", e.prozent, t("einrichtung.schritte." + e.naechster.id)), e.naechster.ziel);
  const z = zaehler(stand, { datum: H });
  if (z.unvollstaendig) add("kosten", t("heute.offen.kosten"), z.last?.fix?.offen ? { aktion: "bearbeiten", schritt: "kosten-miete", bis: "kosten-sonstiges" } : { aktion: "bearbeiten", schritt: "lohn" });
  if (stand.gerichte?.length) { const grau = kalkulation(stand).zaehl.grau; if (grau) add("karteGrau", t("heute.offen.karteGrau", grau), { aktion: "nav", wert: "kartebuero" }); }
  const schaetz = wareneinsatzSicherheit(stand).zaehl?.schaetzung || 0;
  if (schaetz > 0 && stand.waageVorschlag !== H) add("waage", t("heute.offen.waage", schaetz), { aktion: "waage-vorschlag" });
  if (!stand.putzplan?.aktiv && !(stand.putzplanSpaeter && stand.putzplanSpaeter > tagPlus(H, -7))) add("putzplan", t("heute.offen.putzplan"), { aktion: "nav", wert: "putzplan" });
  const s = sicherungStufe(wurzel, jetzt.getTime());
  if (s?.stufe) add("sicherung", s.tage === null ? t("heute.offen.sicherungNie") : t("heute.offen.sicherung", s.tage), { aktion: "nav", wert: "einstellungen", anker: "sicherung" });
  // W2-H (p03 H1/H2): Abweichungen der letzten 30 Tage ohne Abschluss (Ware-Entscheidung oder pünktliche Nachkontrolle fehlt; auch „verspätet“)
  const abwOffen = (stand.messungen || []).filter((m) => !m.storniert && m.abweichung && m.datum >= tagPlus(H, -30) && ["massnahmeOffen", "verspaetet", "ohneMassnahme"].includes(abweichungStand(stand, m))).length;
  if (abwOffen) add("kuehlMassnahme", t("amtW2.buero", abwOffen), { aktion: "nav", wert: "ordner-amt" });
  const ohneWert = schwundOhneWert(stand).length;
  if (ohneWert) add("muellOhneWert", t("heute.offen.muellOhneWert", ohneWert), { aktion: "nav", wert: "listen" });
  if (stand.branchenMeldung) add("branche", t("cockpit.branchenMeldung", stand.branchenMeldung.geaendert), { aktion: "branchen-ok" });
  if (e.prozent >= 100 && !stand.einrichtungFertig) add("einrichtungFertig", t("einrichtung.fertig"), { aktion: "einrichtung-fertig-ok" });
  return out;
}
