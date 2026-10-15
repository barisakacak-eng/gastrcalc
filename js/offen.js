// „Offen im Büro“ (Drei Ebenen 15.10.2026): was nicht mehr im Laden meldet, steht als Chip auf der Büro-Startseite.
// Kleine Fassung von Entwickler C – die Datei gehört Entwickler B und wird beim Zusammenführen durch dessen Fassung ersetzt.
// Rückgabe: [{ id, text, ziel: { aktion, wert?, schritt?, bis? }, farbe?: "rot"|"gelb", prozent? }] – Reihenfolge = Wichtigkeit.
import { t } from "./i18n.js";
import { kalkulation } from "./engine.js";
import { einrichtungStand } from "./einrichtung.js";
import { sicherungStufe } from "./screens/nav.js";
import { wareneinsatzSicherheit } from "./rezept_quelle.js";
import { heute } from "./util.js";

export function offenImBuero(stand, wurzel) {
  if (!stand) return [];
  const out = []; const e = einrichtungStand(stand, wurzel);
  if (e.prozent < 100 && e.naechster) out.push({ id: "einrichtung", text: t("buero.offen.einrichtung"), prozent: e.prozent, ziel: { ...e.naechster.ziel } });
  const kosten = e.schritte.find((s) => s.id === "kosten");
  if (kosten && !kosten.fertig) out.push({ id: "kosten", text: t("buero.offen.kosten", kosten.rest), farbe: "gelb", ziel: { aktion: "bearbeiten", schritt: "kosten-miete", bis: "kosten-sonstiges" } });
  if ((stand.gerichte || []).length) {
    const z = kalkulation(stand).zaehl;
    if (z.rot) out.push({ id: "billig", text: t("buero.offen.billig", z.rot), farbe: "rot", ziel: { aktion: "nav", wert: "vergleich" } });
    if (z.grau) out.push({ id: "ohneZahlen", text: t("buero.offen.ohneZahlen", z.grau), farbe: "gelb", ziel: { aktion: "bearbeiten", schritt: "rezepte" } });
  }
  const s = sicherungStufe(wurzel);
  if (s?.stufe) out.push({ id: "sicherung", text: s.tage === null ? t("buero.offen.sicherungNie") : t("buero.offen.sicherung", s.tage), farbe: s.stufe === "rot" ? "rot" : "gelb", ziel: { aktion: "export" } });
  if (stand.waageVorschlag !== heute() && (stand.gerichte || []).length && wareneinsatzSicherheit(stand).zaehl.schaetzung > 0) out.push({ id: "waage", text: t("buero.offen.waage"), farbe: "gelb", ziel: { aktion: "waage-vorschlag" } });
  return out;
}
