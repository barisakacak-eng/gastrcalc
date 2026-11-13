// Dateien und Fotos: ein Feld mit type="file" meldet „change“. AENDERUNG[data-f](el, dateien) entscheidet je Feld, was mit den Dateien
// geschieht. Alles bleibt auf dem Gerät – gesendet wird nichts.
import { bueroPaket } from "./nachladen.js";
import { Z } from "../bedienung/zustand.js";
import { meldung } from "./meldung.js";
import { t } from "../i18n.js";
import { zeichne } from "./zeichnen.js";
import { modus } from "../modus.js";
import { ereignis } from "../store.js";
import { speichern } from "./speichern.js";
import { ablegen, bildFuerAblage } from "../ablage.js";
import { gerichtFotoSetzen } from "../karte_daten.js";
import { muellFotoSetzen } from "../screens/muell.js";
import { uploadAnlegen } from "../stamm.js";
import { fotosHinzufuegen, fotoVerarbeiten, fotoLauf } from "../screens/foto.js";
import { sicherungEinlesen } from "./sicherung.js";

// Kassen-Export lesen.
async function verkaufDateiAenderung(el, dateien) {
  try { await bueroPaket().verkaufDatei(Z.stand, dateien); } catch (e) { console.warn(e); meldung(t("verkaeufe.vorschau.fehlerDatei")); }
  return zeichne();
}
// Z-Bon per Foto: ablegen und auf dem Handy lesen wie ein Belegfoto; nur im Büro.
async function zbonFotoAenderung(el, dateien) {
  const datei = dateien[0];
  if (Z.ansicht !== "verkauf" || modus(Z.wurzel) === "personal") return;
  ereignis("foto", { laden: Z.stand.id, zweck: "zbon", art: datei.type || "?", anzahl: 1 });
  try { await bueroPaket().verkaufZbonFoto(Z.stand, datei, () => zeichne(), { geraet: Z.wurzel.geraet }); } catch (e) { console.warn(e); meldung(t("verkaeufe.zbon.nichts")); }
  speichern(Z.wurzel); return zeichne();
}
// Eigenes Foto je Gericht (ersetzt das Standardbild).
async function gerichtFotoAenderung(el, dateien) {
  const datei = dateien[0];
  const g = Z.stand.gerichte.find((x) => x.id === el.dataset.id); if (!g) return;
  try {
    const meta = await ablegen(await bildFuerAblage(datei, 800), { name: datei.name || "", zweck: "gericht", laden: Z.stand.id });
    gerichtFotoSetzen(Z.stand, g.id, meta, { geraet: Z.wurzel.geraet }); speichern(Z.wurzel); meldung(t("vergleich.fotoGespeichert"));
  } catch (e) { console.warn(e); meldung(t("muell.fotoFehler")); }
  return zeichne();
}
// Foto (optional) beim Müll – nur ablegen, nicht lesen; hängt am nächsten Eintrag.
async function muellFotoAenderung(el, dateien) {
  const datei = dateien[0];
  if (!/^image\//i.test(String(datei?.type || ""))) return; // nur Bilddateien; anderes wird still abgewiesen
  const kopf = { id: "u-" + Date.now().toString(36), zweck: "muell", erfasst: new Date().toISOString(), geraet: Z.wurzel.geraet, status: "abgelegt" };
  try {
    const abgelegt = await ablegen(await bildFuerAblage(datei, 1200), { name: datei.name || "", zweck: "muell", laden: Z.stand.id });
    muellFotoSetzen(uploadAnlegen(Z.stand, { ...kopf, datei: abgelegt, auswertung: null, ergebnis: null })); speichern(Z.wurzel);
  } catch (e) { console.warn(e); meldung(t("muell.fotoFehler")); }
  return zeichne();
}
// Foto oder Datei: ablegen, lesen, Ergebnis zeigen. Speisekarte → Prüfliste, Rechnung → Zuweisung im Beleg-Bildschirm.
async function fotoAenderung(el, dateien) {
  const datei = dateien[0];
  const zweck = el.dataset.zweck || "rechnung";
  ereignis("foto", { laden: Z.stand.id, zweck, art: datei.type || "?", anzahl: dateien.length });
  if (zweck === "speisekarte") { // alle Fotos in die Warteschlange (Serie), gelesen wird nacheinander im Hintergrund
    await fotosHinzufuegen(Z.stand, dateien, zweck, () => zeichne(), { geraet: Z.wurzel.geraet, fertig: !el.hasAttribute("capture") });
    speichern(Z.wurzel); zeichne(); return;
  }
  const lauf = await fotoVerarbeiten(Z.stand, datei, zweck, () => zeichne(), { geraet: Z.wurzel.geraet });
  if (lauf && lauf === fotoLauf() && lauf.status === "fertig" && Z.ansicht === "beleg") bueroPaket().belegTextVonFoto(lauf.text, lauf.upload);
  speichern(Z.wurzel); zeichne();
}

export const AENDERUNG = {
  import: (el, dateien) => sicherungEinlesen(dateien[0], null, { ersetzen: el.dataset.ersetzen === "1" }), // die Fehlerseite ersetzt den Stand
  "verkauf-datei": verkaufDateiAenderung,
  "zbon-foto": zbonFotoAenderung,
  "gericht-foto": gerichtFotoAenderung,
  "muell-foto": muellFotoAenderung,
  foto: fotoAenderung,
};

export async function aufAenderung(ev) {
  const el = ev.target; if (!el.files?.[0]) return;
  if (modus(Z.wurzel) === "personal" && el.dataset.f !== "muell-foto") return; // Personal-Modus: nur das Müll-Foto, nichts einlesen, nichts ablegen
  const dateien = [...el.files]; el.value = "";
  if (Object.hasOwn(AENDERUNG, el.dataset.f)) return AENDERUNG[el.dataset.f](el, dateien);
}
