// Paket 6: Kühlstellen-Namen in der Anzeige.
// Standardnamen aus dem Schnellstart (Kühlschrank, Saladette, Tiefkühler, Warmhalter, ggf. mit Nummer „Kühlschrank 2“)
// folgen der aktuellen Sprache. Ein vom Wirt umbenannter Name bleibt, wie er ist.
// Gespeichert wird weiter der Name der Anlage (k.name) – Amt-Export und Ausdruck nutzen ihn unverändert.
// Rückwärtskompatibel: ein alter Standardname in Deutsch, Türkisch oder Englisch (auch aus dem alten Einrichten-Schritt) gilt als Standard.
import { t } from "./i18n.js";
import { KUEHL_ARTEN, KUEHL_ALT } from "./data/kuehl_namen.js";

const KUEHL_TYP_SCHLUESSEL = ["getraenke", "kuehlschrank", "saladette", "tiefkuehler", "warmhalter", "eistheke"]; // Baris: Getränkekühlschrank und Kühlschrank (Lebensmittel) getrennt
export const TYP_AUS_ART = { kuehl: "kuehlschrank", tk: "tiefkuehler", warm: "warmhalter", eis: "eistheke" };

// Alle bekannten Standardnamen je Typ (ohne Nummer), klein geschrieben.
const STANDARD = (() => {
  const m = {};
  for (const typ of KUEHL_TYP_SCHLUESSEL) m[typ] = new Set((KUEHL_ARTEN[typ] || []).map((s) => s.toLocaleLowerCase("de")));
  for (const [typ, namen] of Object.entries(KUEHL_ALT)) for (const n of namen) m[typ].add(n.toLocaleLowerCase("de")); // alter Einrichten-Schritt: kuehl.obName(n), obNameTk, obNameWarm
  return m;
})();

// Erkennt „Kühlschrank“, „Buzdolabı 2“, „Fridge 3“ … → { typ, nummer } oder null (eigener Name).
export function standardNameErkennen(name) {
  const s = String(name || "").trim().replace(/\s+/g, " ");
  const m = s.match(/^(.*?)(?: (\d{1,2}))?$/); if (!m) return null;
  const basis = m[1].toLocaleLowerCase("de"); const nummer = m[2] ? Number(m[2]) : null;
  for (const typ of KUEHL_TYP_SCHLUESSEL) if (STANDARD[typ].has(basis)) return { typ, nummer };
  return null;
}

// Typ-Schlüssel beim Anlegen: aus k.typ, sonst aus dem Standardnamen, sonst aus der Art.
export function kuehlTypVon(k) {
  if (KUEHL_TYP_SCHLUESSEL.includes(k?.typ)) return k.typ;
  return standardNameErkennen(k?.name)?.typ || TYP_AUS_ART[k?.art] || "kuehlschrank";
}

// Anzeige in der aktiven Sprache. Eigener Name → unverändert.
export function kuehlstelleAnzeige(k) {
  const name = k?.name || "";
  const s = standardNameErkennen(name);
  if (!s) return name;
  return t("schnell2.arten." + s.typ) + (s.nummer !== null ? " " + s.nummer : "");
}
