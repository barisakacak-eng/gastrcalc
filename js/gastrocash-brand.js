// Darstellung von Zeki außerhalb der Bühne (Hilfe-Blatt, Erst-Hinweis, Abschluss, Einrichtung, Führung). Keine Sätze, Ereignisentscheidungen oder Speicherung.
// Salbei & Papier: Die Figur ist ein gemaltes Bild der passenden Miene (assets/brand/zeki-mienen/, js/zeki_figur.js vornHtml) – ohne Kreis, ohne Rahmen, mit festen Maßen.
// Die alte Vektorfigur (SVG-Text) und die Gliederpuppe gibt es nicht mehr. Bewegung kommt aus den Folgen in assets/brand/zeki-klein/ (js/zeki_figur.js zekiSpielen, gestartet von js/adapter/brand_start.js).
import { vornHtml } from "./zeki_figur.js";
const own = (o, k) => typeof k === "string" && Object.hasOwn(o, k);
// Zustand (alte und neue Namen) → Miene
const states = { neutral: "neutral", freude: "freude", nachdenklich: "import", warnung: "warnung", freundlich: "freude", ernst: "warnung", erfolg: "freude", frage: "frage", import: "import", preis: "preis", hilfe: "hilfe", bestaetigt: "bestaetigt", aufmerksam: "aufmerksam", erleichtert: "erleichtert", fehler: "fehler", staunt: "staunt" };
// Bewegung (alte und neue Namen) → Folge, die einmal läuft, sobald die Figur erscheint; "none" = ruhendes Bild. Zwinkern und Grinsen laufen nie von selbst beim Erscheinen (nur als Lob, siehe js/screens/zeki_takt.js).
const motions = { none: "none", idle: "none", atmen: "none", zwinkern: "none", grinsen: "none", laecheln: "none", hand: "hand", winken: "hand", nicken: "nicken", kopfschuetteln: "kopfschuetteln", pruefen: "pruefen", preis: "preis", thumb: "daumen", daumen: "daumen", celebrate: "jubeln", jubeln: "jubeln", turn: "pruefen", nachdenken: "nachdenken", freuen: "nicken",
  "zeigen-rechts": "zeigen-rechts", "zeigen-links": "zeigen-links", "zeigen-oben": "zeigen-oben", "zeigen-unten": "zeigen-unten", auftreten: "auftreten", abgehen: "abgehen" };
export function mascotMarkup(zustand = "neutral", bewegung = "none") {
  const s = own(states, zustand) ? zustand : "neutral", m = own(motions, bewegung) ? bewegung : "none";
  return vornHtml({ miene: states[s], start: motions[m] === "none" ? "" : motions[m], klasse: `gc-bot gc-bot--${s} gc-motion--${m}` });
}
export function mascotResultState({ aboveZero = false, delta = 0, incomplete = false } = {}) {
  if (incomplete) return "nachdenklich";
  if (aboveZero) return "erfolg";
  if (Number(delta) < 0) return "ernst";
  if (Number(delta) > 0) return "nachdenklich";
  return "neutral";
}
