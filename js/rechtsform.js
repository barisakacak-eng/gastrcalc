// Rechtsform des Betriebs (Baris 23.10.2026): Steuer-Hinweise passen nur, wenn die App weiß, ob der Laden ein
// Einzelunternehmen, eine GbR, eine GmbH, eine UG oder eine KG/OHG ist. Die fünf gängigsten Formen der kleinen
// Gastronomie plus „unbekannt“ – nicht mehr (Verteilung belegt Franky, Doc „GastroCash Rechtsformen Imbiss 23.10.2026“).
// Rein: liest und schreibt nur stand.betrieb.rechtsform (Bereich betrieb).
export const RECHTSFORMEN = ["einzel", "gbr", "gmbh", "ug", "kg_ohg", "unbekannt"];
// GmbH & Co. KG ist für Einkommen- und Gewerbesteuer Personengesellschaft (§ 11 Abs. 1 Satz 3 Nr. 1 GewStG) und wird als kg_ohg geführt; e.K. als einzel (Gremium 3, 24.10.2026).
export const PERSONEN = ["einzel", "gbr", "kg_ohg"]; // Inhaber versteuert selbst: Sachentnahme, Gewerbesteuer-Freibetrag (§ 11 GewStG) – Belege Franky
export const KAPITAL = ["gmbh", "ug"];               // eigene Steuerpflicht der Gesellschaft: Geschäftsführergehalt statt Entnahme

export const rechtsform = (stand) => (RECHTSFORMEN.includes(stand?.betrieb?.rechtsform) ? stand.betrieb.rechtsform : "unbekannt");
export const rechtsformBekannt = (stand) => rechtsform(stand) !== "unbekannt";
export const istPersonen = (stand) => PERSONEN.includes(rechtsform(stand));
export const istKapital = (stand) => KAPITAL.includes(rechtsform(stand));

// Setzen: nur bekannte Werte. Rückgabe true bei Änderung.
export function rechtsformSetzen(stand, wert) {
  if (!stand || !RECHTSFORMEN.includes(wert)) return false;
  stand.betrieb ??= {};
  if (stand.betrieb.rechtsform === wert) return false;
  stand.betrieb.rechtsform = wert; return true;
}

// Passt eine Karte (rechtsformen: "alle" | Liste) zum Betrieb? „unbekannt“ bekommt nur Karten für alle.
export const passtZurRechtsform = (karte, stand) => karte?.rechtsformen === "alle" || !Array.isArray(karte?.rechtsformen) ? true : karte.rechtsformen.includes(rechtsform(stand));
