// Gemeinsame Kleinigkeiten der Klick-, Eingabe- und Änderungs-Tabellen in js/bedienung/.
// Eine Tabelle ist ein Objekt { "data-a-Name": (el, kontext) => … }. Gibt ein Eintrag NICHT zurück, gilt der Tipp als nicht behandelt
// und die nächste Stufe in js/bedienung/klick.js ist dran; jeder andere Rückgabewert (auch undefined) heißt „behandelt“.
export const NICHT = Symbol("nicht behandelt");
// Eingabe-Tabellen: FERTIG heißt „früh zurück, nichts speichern“ (der Eintrag hat alles selbst erledigt).
export const FERTIG = Symbol("fertig");

// Führt mehrere Tabellen zu einer zusammen. Ein Name in zwei Tabellen wäre ein Fehler (der zweite würde den ersten verdecken) und wirft sofort.
export function zusammenfuehren(...tabellen) {
  const aus = {};
  for (const tab of tabellen) {
    for (const [name, fn] of Object.entries(tab)) {
      if (Object.hasOwn(aus, name)) throw new Error("Klick-Name doppelt: " + name);
      aus[name] = fn;
    }
  }
  return aus;
}
