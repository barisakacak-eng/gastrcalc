// Drei Ebenen (15.10.2026), Entwickler B: was darf im Laden melden – und was wartet im Büro.
// Laden „Heute“ zeigt höchstens EINE Aufgabe („Jetzt dran“) aus einer festen Liste (jetztDran). Alles andere, was früher das Cockpit
// gefüllt hat (Einrichtungsring, Kostenlücken, Waage-Vorschlag, graue Gerichte, Hinweise, neue Fassung …), liefert offenImBuero()
// als Liste für die Büro-Startseite. Reine Logik, kein HTML.
import { t } from "./i18n.js";
import { kuehlstelleAnzeige } from "./kuehlname.js"; // Paket 6 (17.10.2026)
import { heute, heuteGeschaeft } from "./util.js"; // Paket 3 (16.10.2026), M7
import { kuehlStatus, offeneNachkontrollen, kalkulation, schwundOhneWert, aktiveStellen, letzteMessung, tagPlus, rundgangAbweichungen, rundgangOffen, offeneWareEntscheidungen, ruhetageAm, wochentag } from "./engine.js"; // W2-H: rundgangAbweichungen, abweichungStand
import { zaehler, abschlussVon } from "./zaehler.js";
import { planGruppen } from "./putzplan.js";
import { einrichtungStand } from "./einrichtung.js";
import { wareneinsatzSicherheit } from "./rezept_quelle.js";
import { sicherungStufe } from "./sicherung_stufe.js"; // Trennung (17.10.2026): vorher aus einem Bildschirm (screens/nav.js)
import { imTakt } from "./takt.js";
import { rettungFehlt } from "./rettung.js"; // Rettung (17.10.2026)
import { haltbarUhrzeit } from "./haltbar.js"; // Stufe 1 (17.10.2026): Ablauf/Aktion als Büro-Hinweis (im Laden nichts)
import { bestandUhrzeit } from "./bestand.js"; // Bestand (17.10.2026): „die Uhrzeit“ als Büro-Hinweis (im Laden noch nicht – gibt der Eigentümer frei)
const JOURNAL_TEXT = { schwund: 1, tagesnotizen: 1, messungen: 1, lieferungen: 1, abschluesse: 1, kostenbelege: 1, putzlog: 1, belehrungen: 1, rundgaenge: 1, inventuren: 1, uploads: 1, artikel: 1, gerichte: 1 }; // W2-D
// W2-D (Leistung Büro): Zähler und Einrichtungsstand je Bild nur einmal rechnen – Büro-Start und „Offen“ fragen beide
export const zaehlerImTakt = (stand, H) => imTakt(stand, "zaehler:" + H, () => zaehler(stand, { datum: H }));
export const einrichtungImTakt = (stand, wurzel) => imTakt(stand, "einrichtung", () => einrichtungStand(stand, wurzel));

// Hauptzeiten im Laden: da stört keine Erinnerung, die warten kann (Sicherung).
export const istHauptzeit = (h) => (h >= 11.5 && h < 14) || (h >= 17.5 && h < 20.5);
const stunde = (d) => d.getHours() + d.getMinutes() / 60;

// Trennung (17.10.2026): zielAttr (ziel → data-Attribute) wohnt jetzt bei den Anzeige-Bausteinen (js/screens/bausteine.js).

// „Jetzt dran“ im Laden – nur diese Fälle, in dieser Reihenfolge, immer nur einer:
//  1. Kühlwert außerhalb der Grenze / Nachkontrolle offen → rot, „Nachmessen“
//  2. Kühlrundgang offen (angefangen; oder heute noch nicht gemessen: morgens bis 15 Uhr, abends ab 17 Uhr)
//  3. Putzaufgabe überfällig
//  4. Sicherung älter als 7 Tage – nur außerhalb der Hauptzeiten (11:30–14:00, 17:30–20:30)
//  5. ab 18 Uhr bis 4 Uhr früh: Tag abschließen (wenn der Geschäftstag noch nicht abgeschlossen ist; Paket 3, M7)
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
      return { id: "kuehlAlarm", ton: "rot", symbol: "thermometer", titel: t(zuKalt ? "heute.dran.zuKalt" : "heute.dran.zuWarm", (stelle && kuehlstelleAnzeige(stelle)) || t("heute.kachel.kuehlung")), knopf: t("heute.dran.nachmessen"), ziel: { aktion: "nav", wert: "kuehl" } };
    }
    if (ks.offenerRundgang) return { id: "rundgangOffen", ton: "normal", symbol: "snowflake", titel: t("heute.dran.rundgangWeiter"), knopf: t("heute.dran.los"), ziel: { aktion: "kuehl-rundgang-start", offen: "0" } };
    if (ks.heuteGemessen < ks.stellen && (h < 15 || h >= 17) && !ruhetageAm(stand, H).includes(wochentag(H))) return { id: "rundgang", ton: "normal", symbol: "snowflake", titel: t("heute.dran.rundgang"), knopf: t("heute.dran.los"), ziel: { aktion: "kuehl-rundgang-start", offen: "0" } }; // Schwadron 18.10.2026, N2: am Ruhetag kein Rundgang
  }
  if (stand.putzplan?.aktiv) { const pg = planGruppen(stand, H); if (pg.ueberfaellig) return { id: "putzen", ton: "normal", symbol: "spray-can", titel: t("heute.dran.putzen", pg.ueberfaellig), knopf: t("heute.dran.los"), ziel: { aktion: "nav", wert: "putzplan" } }; }
  if (!istHauptzeit(h) && sicherungStufe(wurzel, jetzt.getTime())?.stufe === "rot") return { id: "sicherung", ton: "normal", symbol: "package", titel: t("heute.dran.sicherung"), knopf: t("heute.dran.sichern"), ziel: { aktion: "export" } };
  if ((h >= 18 || h < 4) && !abschlussVon(stand, heuteGeschaeft(jetzt))) return { id: "abschluss", ton: "dunkel", symbol: "check", titel: t("heute.dran.abschluss"), knopf: t("heute.dran.los"), ziel: { aktion: "nav", wert: "abschluss" } };
  return null;
}

// „Offen im Büro“: alles, was früher im Laden gemeldet hat und jetzt warten darf. Reihenfolge = Wichtigkeit.
// Rückgabe: [{ id, text, ziel }] – ziel wie oben (zielAttr macht daraus data-Attribute). Developer C zeigt die Liste im Büro.
export function offenImBuero(stand, wurzel, { jetzt = new Date(), aktualisierung = false } = {}) {
  const out = []; const H = heute(jetzt);
  const add = (id, text, ziel) => out.push({ id, text, ziel });
  if (stand?.beispiel) add("beispiel", t("beispiel.chip"), { aktion: "nav", wert: "laeden" }); // Beispiel-Laden (17.10.2026): steht immer oben
  if (aktualisierung) add("fassung", t("heute.offen.fassung"), { aktion: "aktualisieren" });
  if (rettungFehlt(wurzel)) add("rettung", t("rettung.offen"), { aktion: "rettung-neu" }); // Rettung (17.10.2026): Büro-Code ohne Rettungscode (ältere Läden)
  // W2-D: übersprungene Speicherteile (welcher Monat, welches Journal) und Hinweise vom Zusammenführen
  for (const x of (wurzel?.ladeFehler || []).filter((x) => !x.laden || x.laden === stand.id).slice(0, 3))
    add("ladeFehler", x.journal === "kopf" ? t("w2d.offen.kopf") : t("w2d.offen.teil", t("w2d.journal." + (x.journal in JOURNAL_TEXT ? x.journal : "anderes")), x.monat && x.monat !== "alle" && x.monat !== "ohne" ? x.monat.slice(5, 7) + "/" + x.monat.slice(0, 4) : ""), { aktion: "nav", wert: "einstellungen", anker: "sicherung" });
  const ah = stand.abgleichHinweis;
  if (ah?.bereiche?.length) add("abgleich", t("w2d.offen.abgleich", ah.bereiche.map((b) => t("w2d.bereich." + b)).join(", ")), { aktion: "abgleich-ok" });
  if (ah?.zukunft) add("abgleichZukunft", t("w2d.offen.zukunft", ah.zukunft), { aktion: "abgleich-ok" });
  if (ah?.konflikte) add("abgleichKonflikt", t("w2d.offen.konflikt", ah.konflikte), { aktion: "abgleich-ok" });
  { const u = bestandUhrzeit(stand, { heuteTag: heuteGeschaeft(jetzt) }); if (u) out.push({ id: "bestand", text: u.text, ziel: u.ziel, farbe: u.ton === "rot" ? "rot" : "gelb" }); } // Bestand (17.10.2026)
  { const u = haltbarUhrzeit(stand, { heuteTag: heuteGeschaeft(jetzt), kalenderTag: heute(jetzt) }); if (u) out.push({ id: "haltbar", text: u.text, ziel: u.ziel, farbe: u.ton === "rot" ? "rot" : "gelb" }); } // Stufe 1 (17.10.2026)
  const e = einrichtungImTakt(stand, wurzel); // W2-D
  if (e.prozent < 100 && e.naechster) add("einrichtung", t("heute.offen.einrichtung", e.prozent, t("einrichtung.schritte." + e.naechster.id)), e.naechster.ziel);
  const z = zaehlerImTakt(stand, heuteGeschaeft(jetzt)); // W2-D; Paket 3, M7: Zähler nach Geschäftstag
  if (z.unvollstaendig) add("kosten", t("heute.offen.kosten"), z.last?.fix?.offen ? { aktion: "bearbeiten", schritt: "kosten-miete", bis: "kosten-sonstiges" } : { aktion: "bearbeiten", schritt: "lohn" });
  if (stand.gerichte?.length) { const grau = kalkulation(stand).zaehl.grau; if (grau) add("karteGrau", t("heute.offen.karteGrau", grau), { aktion: "nav", wert: "kartebuero" }); }
  const schaetz = wareneinsatzSicherheit(stand).zaehl?.schaetzung || 0;
  if (schaetz > 0 && stand.waageVorschlag !== H) add("waage", t("heute.offen.waage", schaetz), { aktion: "waage-vorschlag" });
  if (!stand.putzplan?.aktiv && !(stand.putzplanSpaeter && stand.putzplanSpaeter > tagPlus(H, -7))) add("putzplan", t("heute.offen.putzplan"), { aktion: "nav", wert: "putzplan" });
  const s = sicherungStufe(wurzel, jetzt.getTime());
  if (s?.stufe) add("sicherung", s.tage === null ? t("heute.offen.sicherungNie") : t("heute.offen.sicherung", s.tage), { aktion: "nav", wert: "einstellungen", anker: "sicherung" });
  // W2-H (p03 H1/H2): Abweichungen der letzten 30 Tage ohne Abschluss (Ware-Entscheidung oder pünktliche Nachkontrolle fehlt; auch „verspätet“)
  // Trennung (17.10.2026), Punkt 4: dieselbe Auswahl als Rechenwerk-Funktion; der Hinweis führt jetzt auf den Büro-Bildschirm „Ware nach Kühl-Abweichung“
  const abwOffen = offeneWareEntscheidungen(stand, { heuteTag: H }).length;
  if (abwOffen) add("kuehlMassnahme", t("amtW2.buero", abwOffen), { aktion: "nav", wert: "kuehlware" });
  const ohneWert = schwundOhneWert(stand).length;
  if (ohneWert) add("muellOhneWert", t("heute.offen.muellOhneWert", ohneWert), { aktion: "nav", wert: "listen" });
  if (stand.branchenMeldung) add("branche", t("cockpit.branchenMeldung", stand.branchenMeldung.geaendert), { aktion: "branchen-ok" });
  if (e.prozent >= 100 && !stand.einrichtungFertig) add("einrichtungFertig", t("einrichtung.fertig"), { aktion: "einrichtung-fertig-ok" });
  return out;
}

// ---------- Trennung (17.10.2026): aus js/screens/nav.js ins Rechenwerk verschoben (unverändert) ----------
// Zahlen für „Offen im Büro" (rein rechnend). Teuer (Kalkulation): wird nur auf Abruf gerechnet, nie beim Zeichnen des Ladens.
export function menueZaehler(stand, wurzel) {
  if (!stand) return {};
  const ks = kuehlStatus(stand); const nk = offeneNachkontrollen(stand);
  const kuehl = (ks.eingerichtet ? Math.max(0, ks.stellen - ks.heuteGemessen) : 0) + nk.length;
  const karte = stand.gerichte?.length ? kalkulation(stand).zaehl.grau : 0;
  const s = sicherungStufe(wurzel); const e = einrichtungStand(stand, wurzel);
  return { start: e.prozent < 100 ? `${e.prozent} %` : null, kuehl: kuehl || null, karte: karte || null, listen: schwundOhneWert(stand).length || null,
    sicherung: s?.stufe ? "!" : null, punkt: s?.stufe === "rot" || nk.some((m) => m.ueberfaellig) };
}

// Roter Punkt in der Leiste: höchstens einer gleichzeitig, Kühlung vor Putzen (Architektur „Jetzt dran").
// Kühlung: Nachkontrolle offen, letzter Wert einer Stelle außerhalb der Grenze oder Rundgang begonnen und nicht fertig. Putzen: Aufgabe überfällig.
export function ladenPunkt(stand) {
  if (!stand) return null;
  try {
    if (offeneNachkontrollen(stand).length || rundgangOffen(stand)) return "kuehl";
    if (aktiveStellen(stand).some((k) => letzteMessung(stand, k.id)?.abweichung)) return "kuehl";
    if (rundgangAbweichungen(stand).length) return "kuehl"; // W2-H (p01 K3): Abweichung im offenen Rundgang zählt sofort (bleibt rot, auch wenn der offene Rundgang allein später keinen Punkt mehr gibt)
    if (stand.putzplan?.aktiv && planGruppen(stand).ueberfaellig > 0) return "putzplan";
  } catch (e) { console.warn(e); }
  return null;
}

