// Trennung 2 (17.10.2026): Büro „Gerichte im Vergleich“ – Deckungsbeitrag und Marge je Gericht (ohne Getränke), sortiert.
// Zahlen aus kalkulation() (netto). Vorher mitten im HTML-Aufbau von js/screens/vergleich.js.
import { kalkulation, wareneinsatzWarnung } from "./engine.js";
import { rezeptStempel } from "./rezept_quelle.js";

// modus: "db" (größter Deckungsbeitrag zuerst) | "marge" (größte Marge zuerst).
// Rückgabe: { mit: [...], ohne: [...], geschaetzt } – je Zeile { z (Kalkulationszeile), g (Gericht), db, marge, geschaetzt, wareHoch, balken (0–100) }.
export function gerichteVergleich(stand, modus = "db") {
  const k = kalkulation(stand);
  const zeilen = k.zeilen.filter((z) => z.klasse !== "getraenk").map((z) => {
    const g = stand.gerichte.find((x) => x.id === z.id);
    const db = z.preisNetto !== null && z.waren !== null ? z.preisNetto - z.waren : null;
    const marge = db !== null && z.preisNetto > 0 ? db / z.preisNetto : null;
    return { z, g, db, marge, geschaetzt: rezeptStempel(g).stufe === "schaetzung" || !!z.warenRichtpreis, // Richtpreise (17.10.2026): Wareneinsatz mit Richtpreis = ≈
      wareHoch: !!wareneinsatzWarnung(z.wareneinsatzAnteil), balken: Math.max(0, Math.min(100, Math.round(marge * 100))) };
  });
  const mit = zeilen.filter((x) => x.db !== null).sort((a, b) => (modus === "db" ? b.db - a.db : b.marge - a.marge));
  const ohne = zeilen.filter((x) => x.db === null);
  return { mit, ohne, geschaetzt: mit.some((x) => x.geschaetzt) };
}
