// Test-Haken: kleine Schalter am window-Objekt, mit denen Browser-Tests die App in einen bestimmten Zustand versetzen.
// Sie wirken nur am eigenen Rechner (localhost, 127.0.0.1, [::1]) – in der echten App und in Node gibt es sie nicht.
// Liste und Zweck: docs/architektur.md, Abschnitt „Test-Haken“.
const LOKAL = ["localhost", "127.0.0.1", "[::1]"];

export function nurLokal() {
  try { return LOKAL.includes(globalThis.location?.hostname); } catch { return false; }
}

// Wert eines Test-Hakens oder undefined (außerhalb von localhost immer undefined).
export function testHaken(name) {
  if (!nurLokal()) return undefined;
  try { return globalThis[name]; } catch { return undefined; }
}
