// Paket 6 (17.10.2026): Kühlstellen-Namen in der Anzeige.
// Standardnamen aus dem Schnellstart (Kühlschrank, Saladette, Tiefkühler, Warmhalter, ggf. mit Nummer „Kühlschrank 2“)
// folgen der aktuellen Sprache. Ein vom Wirt umbenannter Name bleibt, wie er ist.
// Gespeichert wird weiter der Name der Anlage (k.name) – Amt-Export und Ausdruck nutzen ihn unverändert.
// Rückwärtskompatibel: ein alter Standardname in Deutsch, Türkisch oder Englisch (auch aus dem alten Einrichten-Schritt) gilt als Standard.
import { t } from "./i18n.js";
import de from "./lang/de.js";
import tr from "./lang/tr.js";
import en from "./lang/en.js";

export const KUEHL_TYP_SCHLUESSEL = ["kuehlschrank", "saladette", "tiefkuehler", "warmhalter"];
export const TYP_AUS_ART = { kuehl: "kuehlschrank", tk: "tiefkuehler", warm: "warmhalter" };

// Alle bekannten Standardnamen je Typ (ohne Nummer), klein geschrieben.
const STANDARD = (() => {
  const m = {};
  for (const typ of KUEHL_TYP_SCHLUESSEL) m[typ] = new Set([de, tr, en].map((L) => L.schnell2?.arten?.[typ]).filter(Boolean).map((s) => s.toLocaleLowerCase("de")));
  for (const L of [de, tr, en]) { // alter Einrichten-Schritt: kuehl.obName(n), obNameTk, obNameWarm
    const k = L.kuehl || {};
    if (typeof k.obName === "function") m.kuehlschrank.add(String(k.obName("")).trim().toLocaleLowerCase("de"));
    if (k.obNameTk) m.tiefkuehler.add(k.obNameTk.toLocaleLowerCase("de"));
    if (k.obNameWarm) m.warmhalter.add(k.obNameWarm.toLocaleLowerCase("de"));
  }
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
