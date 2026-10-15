// Zeile „Reinigung & Betriebsmittel“ im Kostenzähler (Entscheidung Baris 15.10.: BZ wichtig).
// Sagt immer, woher die Zahl kommt: noch offen · ≈ geschätzt · aus Belegen · aus Inventur. Dazu die kleine Leiter „Wie sicher ist die Zahl?“.
import { t } from "../i18n.js";
import { esc, fmtEuro } from "../util.js";

const STUFEN = ["offen", "beleg", "inventur"];
export function reinigungZeile(r, { leiter = false } = {}) {
  if (!r) return "";
  const text = r.stufe === "beleg" ? t("reinigung.zeileText.beleg", r.belege) : t("reinigung.zeileText." + r.stufe);
  const teile = [r.firma ? t("reinigung.firmaTeil", fmtEuro(r.firma)) : "", r.mittel !== null && r.mittel !== undefined ? t("reinigung.mittelTeil", fmtEuro(r.mittel)) : ""].filter(Boolean).join(" · ");
  const wert = r.betrag === null ? `<span class="marke offen">${esc(t("allgemein.offen"))}</span>` : `${r.stufe === "schaetzung" || r.stufe === "offen" ? "≈ " : ""}${fmtEuro(r.betrag)}`;
  const aktiv = r.stufe === "schaetzung" ? 0 : STUFEN.indexOf(r.stufe);
  return `<div class="summenzeile reinigungzeile"><span>${esc(t("reinigung.zeile"))}<small class="block">${esc(teile ? teile + " · " : "")}${esc(text)}</small><span class="stufe ${esc(r.stufe)}">${esc(t("reinigung.stufe." + r.stufe))}</span></span><span class="wert">${wert}</span></div>
    ${leiter ? `<div class="stufenleiter"><small>${esc(t("reinigung.leiter"))}</small>${STUFEN.map((s, i) => `<span class="sprosse ${i <= aktiv ? "an" : ""}">${i + 1} · ${esc(t("reinigung.leiterText")[i])}</span>`).join("")}<small>${esc(t("reinigung.zeitHinweis"))}</small></div>` : ""}`;
}
