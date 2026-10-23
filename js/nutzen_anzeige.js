// Anschluss für Zoros Nutzen-Vertrag. Keine Einsparung, Summe oder Vergleichsbasis berechnen.
// Noch nicht an L1 angeschlossen: Quelle, Zeitraum und Doppelzählung muss der Rechenkern belegen.
const ARTEN = new Set(["muell", "preis", "lager", "papier"]);
const betrag = (x) => typeof x === "number" && Number.isFinite(x) && x >= 0 ? x : null;
const datum = (x) => typeof x === "string" && /^\d{4}-\d{2}-\d{2}$/.test(x) &&
  Number.isFinite(Date.parse(x + "T12:00:00Z")) && new Date(x + "T12:00:00Z").toISOString().slice(0, 10) === x ? x : null;

export function nutzenAnzeige(daten) {
  const posten = (Array.isArray(daten?.posten) ? daten.posten : []).filter((p) => p && ARTEN.has(p.art)).map((p) => {
    const quelle = typeof p.quelle === "string" ? p.quelle.trim() : "";
    const euro = betrag(p.euro);
    const status = euro === null || !quelle || typeof p.gemessen !== "boolean" ? "nicht-verfuegbar" : p.gemessen ? "gemessen" : "schaetzung";
    return { art: p.art, euro: status === "nicht-verfuegbar" ? null : euro, quelle, status,
      bereich: p.art === "lager" ? "lagerkapital" : "nutzen" };
  });
  return {
    ab: datum(daten?.ab), posten,
    status: posten.some((p) => p.status !== "nicht-verfuegbar") ? "vorhanden" : "nicht-verfuegbar",
    // Nur zur Übergabe an Zoro, ausdrücklich KEINE freigegebene Anzeige-Summe.
    // Der alte Vertrag enthält noch keinen Nachweis für Zeitraum oder Überschneidungen.
    summeVomKern: betrag(daten?.summe), summeAnzeigbar: false,
  };
}
